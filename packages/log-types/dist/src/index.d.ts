export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFormat = 'json' | 'text';
export interface LogEvent {
    id: string;
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
    slow?: boolean;
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
