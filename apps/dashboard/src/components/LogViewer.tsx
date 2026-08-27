import { useState } from 'react';
import type { LogEvent } from '@nexeo-local-observability/log-types';
import { Activity, Database } from 'lucide-react';
import { QueryInspector } from './QueryInspector';

interface LogViewerProps {
  logs: LogEvent[];
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  return (
    <div className="log-container">
      {logs.map((log) => {
        const isExpanded = expandedId === log.id;
        
        return (
          <div 
            key={log.id} 
            className="log-entry"
            onClick={() => setExpandedId(isExpanded ? null : log.id)}
          >
            <div className="log-meta">
              <span style={{ color: 'var(--text-muted)' }}>{formatTime(log.timestamp)}</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.service}</span>
              <span className={`badge ${log.level}`}>{log.level}</span>
              
              {log.durationMs !== undefined && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: log.slow ? 'var(--color-error)' : 'inherit' }}>
                  <Activity size={14} /> {log.durationMs}ms {log.slow && '🔴'}
                </span>
              )}

              {log.queryDurationMs !== undefined && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: log.slow ? 'var(--color-error)' : 'inherit' }}>
                  <Database size={14} /> {log.queryDurationMs}ms {log.slow && '🔴'}
                </span>
              )}

              {log.requestId && (
                <span style={{ color: 'var(--accent-primary)' }}>req: {log.requestId.slice(0, 8)}...</span>
              )}
            </div>
            
            <div className="log-message">
              {log.method && log.url ? (
                <span><strong>{log.method}</strong> {log.url} &rarr; {log.statusCode}</span>
              ) : log.query ? (
                <span style={{ color: 'var(--color-info)' }}>{log.query}</span>
              ) : (
                log.message
              )}
            </div>

            {isExpanded && (
              <div className="log-detail" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ID:</span>
                  <span>{log.id}</span>
                  
                  {log.requestId && (
                    <>
                      <span style={{ color: 'var(--text-muted)' }}>Request ID:</span>
                      <span>{log.requestId}</span>
                    </>
                  )}
                  
                  {log.correlationId && (
                    <>
                      <span style={{ color: 'var(--text-muted)' }}>Correlation ID:</span>
                      <span>{log.correlationId}</span>
                    </>
                  )}
                  
                  {log.tenantId && (
                    <>
                      <span style={{ color: 'var(--text-muted)' }}>Tenant ID:</span>
                      <span>{log.tenantId}</span>
                    </>
                  )}

                  {log.database && (
                    <>
                      <span style={{ color: 'var(--text-muted)' }}>Database:</span>
                      <span>{log.database}</span>
                    </>
                  )}
                </div>
                
                {(log.query || log.elasticRequest) ? (
                  <div className="mt-4">
                    <QueryInspector event={log} />
                  </div>
                ) : (
                  log.format === 'json' && log.metadata && (
                    <div className="mt-4">
                      {log.error && typeof log.error === 'object' && (
                        <div style={{ marginBottom: '1rem' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Error Details:</span>
                          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: '6px', marginTop: '0.5rem' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--color-error)', marginBottom: '0.5rem' }}>
                              {log.error.type} {log.error.code && `(${log.error.code})`}
                            </div>
                            {log.error.operation && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Operation: <span style={{ fontFamily: 'var(--font-mono)' }}>{log.error.operation}</span>
                              </div>
                            )}
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: log.error.stack ? '1rem' : 0 }}>
                              {log.error.message}
                            </div>
                            {log.error.stack && (
                              <pre style={{ margin: 0, padding: '0.75rem', backgroundColor: 'var(--bg-base)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {log.error.stack}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Raw JSON Data:</span>
                      <pre className="json-view">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
