import { useState, useMemo } from 'react';
import type { QueryStats } from '../hooks/useDuplicateQueries';
import { interpolatePostgresQuery } from '@nexeo-local-observability/log-parser/src/query-interpolator';
import { format } from 'sql-formatter';
import { ChevronDown, ChevronUp, Clock, Database, Server, AlertTriangle } from 'lucide-react';

interface Props {
  queries: QueryStats[];
  searchQuery: string;
  serviceFilter: string;
}

export function DuplicateQueriesTable({ queries, searchQuery, serviceFilter }: Props) {
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [minCountFilter, setMinCountFilter] = useState(2);
  const [slowOnly, setSlowOnly] = useState(false);

  const filteredQueries = useMemo(() => {
    return queries.filter(q => {
      if (q.count < minCountFilter) return false;
      if (slowOnly && q.slowCount === 0) return false;
      if (serviceFilter !== 'All' && q.service !== serviceFilter) return false;
      if (searchQuery && !q.queryPattern.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [queries, searchQuery, serviceFilter, minCountFilter, slowOnly]);

  return (
    <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Filters:</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <input 
            type="checkbox" 
            checked={slowOnly} 
            onChange={e => setSlowOnly(e.target.checked)} 
          />
          Slow Only
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          Min Count:
          <input 
            type="number" 
            value={minCountFilter} 
            onChange={e => setMinCountFilter(parseInt(e.target.value) || 1)}
            style={{ width: '60px', padding: '0.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', borderRadius: '4px' }}
          />
        </label>
        <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Showing {filteredQueries.length} patterns
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filteredQueries.map(q => {
          const isExpanded = expandedPattern === q.queryPattern;
          const avgTime = Math.round(q.totalTime / q.count);
          const isEs = q.queryPattern.startsWith('ES:');

          return (
            <div key={q.queryPattern} style={{ 
              backgroundColor: 'var(--bg-surface)', 
              border: `1px solid ${isExpanded ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <div 
                style={{ padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
                onClick={() => setExpandedPattern(isExpanded ? null : q.queryPattern)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px', padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{q.count}</span>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Execs</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: isEs ? 'var(--color-debug)' : 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {q.queryPattern}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> Avg: {avgTime}ms (Min: {q.minTime}ms, Max: {q.maxTime}ms)
                    </span>
                    {q.slowCount > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-warn)' }}>
                        <AlertTriangle size={12} /> Slow: {q.slowCount}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Server size={12} /> {q.service}
                    </span>
                    {q.database && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Database size={12} /> {q.database}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ paddingTop: '0.5rem' }}>
                  {isExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-base)' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Normalized Pattern</h4>
                    <pre style={{ margin: 0, padding: '1rem', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                      {isEs ? q.queryPattern : format(q.queryPattern, { language: 'postgresql' })}
                    </pre>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Recent Executions ({q.recentExecutions.length})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {q.recentExecutions.map((e) => (
                        <div key={e.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <span>{new Date(e.timestamp).toLocaleTimeString()}</span>
                            <span>Latency: {e.queryDurationMs ?? e.durationMs}ms</span>
                          </div>
                          
                          {e.databaseType === 'postgresql' && e.query && (
                            <pre style={{ margin: 0, fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#86efac', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {e.queryParams ? interpolatePostgresQuery(e.query, e.queryParams) : e.query}
                            </pre>
                          )}

                          {e.databaseType === 'elasticsearch' && e.elasticRequest?.body && (
                            <pre style={{ margin: 0, fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#86efac', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {JSON.stringify(e.elasticRequest.body, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredQueries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No duplicate query patterns found matching the filters.
          </div>
        )}
      </div>
    </div>
  );
}
