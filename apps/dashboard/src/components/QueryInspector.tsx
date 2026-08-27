import { useState } from 'react';
import type { LogEvent } from '@nexeo-local-observability/log-types';
import { interpolatePostgresQuery } from '@nexeo-local-observability/log-parser/src/query-interpolator';
import { Copy, Check } from 'lucide-react';
import { format } from 'sql-formatter';

interface QueryInspectorProps {
  event: LogEvent;
}

type TabType = 'postgresql' | 'elasticsearch' | 'raw' | 'json' | 'query';

export function QueryInspector({ event }: QueryInspectorProps) {
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);

  const getAvailableTabs = (): TabType[] => {
    switch (event.databaseType) {
      case 'postgresql':
        return ['raw', 'postgresql', 'json'];
      case 'elasticsearch':
        return ['elasticsearch', 'json'];
      default:
        return ['query', 'json'];
    }
  };

  const tabs = getAvailableTabs();
  const [activeTab, setActiveTab] = useState<TabType>(tabs[0]);

  let rawQuery = event.databaseType === 'postgresql' && event.query
    ? interpolatePostgresQuery(event.query, event.queryParams)
    : '';

  let displayQuery = event.query || '';

  try {
    if (rawQuery) {
      rawQuery = format(rawQuery, { language: 'postgresql' });
    }
    if (displayQuery && event.databaseType === 'postgresql') {
      displayQuery = format(displayQuery, { language: 'postgresql' });
    }
  } catch (e) {
    // If formatting fails, fallback to unformatted
  }

  const copyToClipboard = (text: string, type: 'raw' | 'original') => {
    navigator.clipboard.writeText(text);
    if (type === 'raw') {
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    } else {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    }
  };

  return (
    <div className="query-inspector">
      {/* Header Info */}
      <div className="query-inspector-header">
        <div className="query-inspector-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Database Query
            {event.slow && <span className="badge error">SLOW</span>}
          </span>
          <span style={{ color: event.slow ? 'var(--color-error)' : 'var(--text-muted)' }}>
            {event.queryDurationMs !== undefined ? `${event.queryDurationMs}ms` : ''}
          </span>
        </div>
        <div className="query-inspector-meta">
          {event.service} · {event.database || 'unknown_db'} · {event.schema || 'unknown_schema'}
        </div>
      </div>

      {/* Tabs */}
      <div className="query-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`query-tab ${activeTab === tab ? 'active' : ''}`}
          >
            {tab === 'postgresql' && 'PostgreSQL'}
            {tab === 'raw' && 'Raw Query'}
            {tab === 'elasticsearch' && 'Elasticsearch'}
            {tab === 'query' && 'Query'}
            {tab === 'json' && 'JSON'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="query-content">
        {activeTab === 'postgresql' && (
          <div className="query-section">
            <div>
              <div className="query-section-title">Query</div>
              <pre className="query-text">{displayQuery}</pre>
            </div>
            {event.queryParams && event.queryParams.length > 0 && (
              <div>
                <div className="query-section-title">Parameters</div>
                <pre className="query-params">{JSON.stringify(event.queryParams, null, 2)}</pre>
              </div>
            )}
            <div className="query-actions">
              <button
                onClick={() => copyToClipboard(event.query || '', 'original')}
                className="query-action-btn"
              >
                {copiedOriginal ? <Check size={14} style={{color: 'var(--color-success)'}} /> : <Copy size={14} />}
                {copiedOriginal ? 'Copied' : 'Copy Original SQL'}
              </button>
              <button
                onClick={() => copyToClipboard(rawQuery, 'raw')}
                className="query-action-btn"
              >
                {copiedRaw ? <Check size={14} style={{color: 'var(--color-success)'}} /> : <Copy size={14} />}
                {copiedRaw ? 'Copied' : 'Copy Query'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="query-section">
            <pre className="query-raw">{rawQuery}</pre>
            <div className="query-actions">
              <button
                onClick={() => copyToClipboard(rawQuery, 'raw')}
                className="query-action-btn"
              >
                {copiedRaw ? <Check size={14} style={{color: 'var(--color-success)'}} /> : <Copy size={14} />}
                {copiedRaw ? 'Copied' : 'Copy Query'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'elasticsearch' && (
          <div className="query-section">
            <div style={{color: 'var(--color-warn)', fontWeight: 'bold'}}>
              {event.elasticRequest?.method} {event.elasticRequest?.path}
            </div>
            {event.elasticRequest?.body && (
              <pre className="query-params">
                {JSON.stringify(event.elasticRequest.body, null, 2)}
              </pre>
            )}
            <div className="query-actions">
              <button
                onClick={() => copyToClipboard(JSON.stringify(event.elasticRequest?.body, null, 2), 'raw')}
                className="query-action-btn"
              >
                {copiedRaw ? <Check size={14} style={{color: 'var(--color-success)'}} /> : <Copy size={14} />}
                {copiedRaw ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'query' && (
          <div className="query-section">
            <div>
              <div className="query-section-title">Query</div>
              <pre className="query-text">{displayQuery}</pre>
            </div>
            {event.queryParams && event.queryParams.length > 0 && (
              <div>
                <div className="query-section-title">Parameters</div>
                <pre className="query-params">{JSON.stringify(event.queryParams, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'json' && (
          <pre style={{color: 'var(--text-secondary)', whiteSpace: 'pre-wrap'}}>{JSON.stringify(event, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
