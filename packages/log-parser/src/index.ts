import { LogEvent, LogLevel, LogFormat } from '@nexeo-local-observability/log-types';
import { v4 as uuidv4 } from 'uuid';
import { redactObject } from './redaction';
import { interpolatePostgresQuery as _interpolatePostgresQuery } from './query-interpolator';
import { parseLogError } from './error-parser';

export const interpolatePostgresQuery = _interpolatePostgresQuery;
export { normalizeSql, normalizeElasticsearch } from './query-normalizer';

const SERVICE_PREFIX_REGEX = /^@nexeo\/([a-zA-Z0-9_-]+)(?::dev)?:\s*/;
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export interface ParserOptions {
  slowQueryThresholdMs?: number;
  slowRequestThresholdMs?: number;
}

export class LogParser {
  private slowQueryThresholdMs: number;
  private slowRequestThresholdMs: number;

  constructor(options: ParserOptions = {}) {
    this.slowQueryThresholdMs = options.slowQueryThresholdMs || 200;
    this.slowRequestThresholdMs = options.slowRequestThresholdMs || 500;
  }

  public parseLine(line: string, stream: 'stdout' | 'stderr'): LogEvent | null {
    if (!line || line.trim() === '') return null;
    
    let cleanLine = line.replace(ANSI_REGEX, '');
    
    // Ignore node inspector noisy logs
    if (/Debugger attached/i.test(cleanLine) || /Waiting for the debugger to disconnect/i.test(cleanLine)) {
      return null;
    }

    let service = 'unknown';

    const serviceMatch = cleanLine.match(SERVICE_PREFIX_REGEX);
    if (serviceMatch) {
      service = serviceMatch[1];
      cleanLine = cleanLine.replace(SERVICE_PREFIX_REGEX, '').trim();
    } else {
      // Handle prefixes like `[staff] ` from pnpm/turbo
      const bracketMatch = cleanLine.match(/^\[([a-zA-Z0-9_-]+)\]\s*/);
      if (bracketMatch) {
        service = bracketMatch[1];
        cleanLine = cleanLine.replace(bracketMatch[0], '').trim();
      }
    }

    // Try parsing as JSON
    try {
      const parsed = JSON.parse(cleanLine);
      const redacted = redactObject(parsed);
      return this.normalizeJsonLog(redacted, service, stream);
    } catch (e) {
      // Not JSON, return as text log
      return {
        id: uuidv4(),
        timestamp: Date.now(),
        service,
        level: stream === 'stderr' ? 'error' : 'info',
        stream,
        logType: 'text',
        format: 'text',
        message: cleanLine,
      };
    }
  }

  private normalizeJsonLog(json: any, extractedService: string, defaultStream: 'stdout' | 'stderr'): LogEvent {
    const timestamp = json.timestamp || json.created || json.time || Date.now();
    const service = json.service || extractedService;
    let level: LogLevel = 'info';
    
    if (json.level) {
      const l = typeof json.level === 'string' ? json.level.toLowerCase() : '';
      if (['debug', 'info', 'warn', 'error'].includes(l)) {
        level = l as LogLevel;
      }
    } else if (defaultStream === 'stderr') {
      level = 'error';
    }

    const durationMs = typeof json.responseTimeMs === 'number' ? json.responseTimeMs : undefined;
    const slowRequest = durationMs !== undefined && durationMs >= this.slowRequestThresholdMs;

    const queryDurationMs = typeof json.queryExecutionTimeMs === 'number' ? json.queryExecutionTimeMs : undefined;
    const isDb = json.stream === 'db' || json.log_type === 'db' || json.query !== undefined;
    let slowQuery = !!json.slow;
    if (queryDurationMs !== undefined && queryDurationMs >= this.slowQueryThresholdMs) {
      slowQuery = true;
    }

    let message = json.message || json.msg || '';
    const logType = json.log_type || (isDb ? 'db' : 'app');
    const stream = json.stream || defaultStream;

    let databaseType: 'postgresql' | 'elasticsearch' | 'unknown' | undefined = undefined;
    let queryParams: any[] | undefined = undefined;
    let elasticRequest: { method?: string; path?: string; index?: string; body?: any } | undefined = undefined;

    if (isDb) {
      const isSql = typeof json.query === 'string' && /^(SELECT|INSERT|UPDATE|DELETE|WITH|BEGIN|COMMIT|ROLLBACK)\b/i.test(json.query.trim());
      if (json.component === 'prisma-factory' || json.dbName || json.schemaName || isSql) {
        databaseType = 'postgresql';
      } else if (
        json.component === 'elasticsearch' ||
        json.log_type === 'elasticsearch' ||
        (json.req?.url && typeof json.req.url === 'string' && json.req.url.includes('_search')) ||
        (json.index !== undefined && json.body !== undefined)
      ) {
        databaseType = 'elasticsearch';
        elasticRequest = {
          method: json.req?.method || json.method || 'GET',
          path: json.req?.url || json.url || json.path || '',
          index: json.index,
          body: json.body || json.req?.body || undefined,
        };
      } else {
        databaseType = 'unknown';
      }

      if (json.params !== undefined) {
        if (Array.isArray(json.params)) {
          queryParams = json.params;
        } else if (typeof json.params === 'string') {
          try {
            queryParams = JSON.parse(json.params);
          } catch (e) {
            queryParams = [json.params];
          }
        } else {
          queryParams = [json.params];
        }
      }
    }

    let parsedErrorObj: any = undefined;
    if (logType === 'error' || level === 'error') {
      const parsed = parseLogError(json);
      if (parsed.error) {
        parsedErrorObj = parsed.error;
      }
      if (parsed.message) {
        message = parsed.message;
      }
    }

    return {
      id: uuidv4(),
      timestamp,
      service,
      level,
      stream,
      logType,
      format: 'json',
      message,
      requestId: json.reqId || json.requestId,
      correlationId: json.correlationId,
      method: json.req?.method || json.method,
      url: json.req?.url || json.url,
      statusCode: json.res?.statusCode || json.statusCode,
      durationMs,
      tenantId: json.tenantId,
      tenantSlug: json.tenantSlug,
      database: json.dbName,
      schema: json.schemaName,
      query: json.query,
      queryDurationMs,
      queryParams,
      databaseType,
      elasticRequest,
      slow: isDb ? slowQuery : slowRequest,
      error: parsedErrorObj,
      metadata: json, // Store all remaining redacted fields
    };
  }
}
