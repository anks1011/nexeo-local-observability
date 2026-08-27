export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFormat = 'json' | 'text';

export interface LogError {
  type: string;
  message: string;
  operation?: string;
  code?: string;
  stack?: string;
}

export interface LogEvent {
  id: string; // Internal unique ID for the UI
  timestamp: number;
  service: string;
  level: LogLevel;
  stream: 'stdout' | 'stderr' | 'db' | 'unknown';
  logType: string;
  format: LogFormat;
  message: string;
  requestId?: string;
  correlationId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  durationMs?: number;
  tenantId?: string;
  tenantSlug?: string;
  database?: string;
  schema?: string;
  query?: string;
  queryDurationMs?: number;
  queryParams?: any[];
  databaseType?: 'postgresql' | 'elasticsearch' | 'unknown';
  elasticRequest?: { method?: string; path?: string; index?: string; body?: any };
  slow?: boolean;
  error?: LogError;
  metadata?: Record<string, any>;
}

export interface DashboardStats {
  totalEvents: number;
  errorCount: number;
  warningCount: number;
  slowQueryCount: number;
  slowRequestCount: number;
  services: string[];
}
