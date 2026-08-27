import { LogEvent } from '@nexeo-local-observability/log-types';
import { interpolatePostgresQuery as _interpolatePostgresQuery } from './query-interpolator';
export declare const interpolatePostgresQuery: typeof _interpolatePostgresQuery;
export { normalizeSql, normalizeElasticsearch } from './query-normalizer';
export interface ParserOptions {
    slowQueryThresholdMs?: number;
    slowRequestThresholdMs?: number;
}
export declare class LogParser {
    private slowQueryThresholdMs;
    private slowRequestThresholdMs;
    constructor(options?: ParserOptions);
    parseLine(line: string, stream: 'stdout' | 'stderr'): LogEvent | null;
    private normalizeJsonLog;
}
