import { useState, useMemo, useEffect } from 'react';
import { useLogs } from './hooks/useLogs';
import { LogViewer } from './components/LogViewer';
import { Dropdown } from './components/Dropdown';
import { DuplicateQueriesTable } from './components/DuplicateQueriesTable';
import { useDuplicateQueries } from './hooks/useDuplicateQueries';
import { interpolatePostgresQuery } from '@nexeo-local-observability/log-parser/src/query-interpolator';
import { Activity, Database, AlertTriangle, List, Pause, Play, Trash2, ShieldAlert, Palette, Copy } from 'lucide-react';
import './index.css';

type ViewMode = 'all' | 'errors' | 'warnings' | 'slow_queries' | 'slow_requests' | 'queries' | 'duplicate_queries';

function App() {
  const { events, isConnected, isLive, setIsLive, clear } = useLogs();
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const services = useMemo(() => {
    const s = new Set(events.map(e => e.service));
    return ['All', ...Array.from(s).sort()];
  }, [events]);

  const duplicateQueries = useDuplicateQueries(events);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    // View Mode Filter
    if (viewMode === 'errors') filtered = filtered.filter(e => e.level === 'error');
    if (viewMode === 'warnings') filtered = filtered.filter(e => e.level === 'warn');
    if (viewMode === 'slow_queries') filtered = filtered.filter(e => (e.logType === 'db' || e.query) && e.slow);
    if (viewMode === 'slow_requests') filtered = filtered.filter(e => e.durationMs !== undefined && e.slow);
    if (viewMode === 'queries') filtered = filtered.filter(e => (e.logType === 'db' || e.query));

    // Service Filter
    if (serviceFilter !== 'All') {
      filtered = filtered.filter(e => e.service === serviceFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e => {
        const rawQuery = e.databaseType === 'postgresql' && e.query 
          ? interpolatePostgresQuery(e.query, e.queryParams).toLowerCase() 
          : '';
        const esBody = e.elasticRequest?.body ? JSON.stringify(e.elasticRequest.body).toLowerCase() : '';
        
        return e.message.toLowerCase().includes(q) ||
          e.service.toLowerCase().includes(q) ||
          (e.requestId && e.requestId.toLowerCase().includes(q)) ||
          (e.correlationId && e.correlationId.toLowerCase().includes(q)) ||
          (e.query && e.query.toLowerCase().includes(q)) ||
          (e.database && e.database.toLowerCase().includes(q)) ||
          (e.schema && e.schema.toLowerCase().includes(q)) ||
          (rawQuery && rawQuery.includes(q)) ||
          (esBody && esBody.includes(q));
      });
    }

    return filtered;
  }, [events, viewMode, search, serviceFilter]);

  const stats = useMemo(() => {
    return {
      errors: events.filter(e => e.level === 'error').length,
      warnings: events.filter(e => e.level === 'warn').length,
      slowQueries: events.filter(e => (e.logType === 'db' || e.query) && e.slow).length,
      slowRequests: events.filter(e => e.durationMs !== undefined && e.slow).length,
      queries: events.filter(e => (e.logType === 'db' || e.query)).length,
    };
  }, [events]);

  return (
    <div className="layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <Activity size={20} color="var(--accent-primary)" />
            Nexeo Local Observability
          </div>
        </div>
        
        <div className="sidebar-nav">
          <button 
            className={`nav-item ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            <List size={18} /> All Logs
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.7 }}>{events.length}</span>
          </button>
          
          <button 
            className={`nav-item ${viewMode === 'errors' ? 'active' : ''}`}
            onClick={() => setViewMode('errors')}
          >
            <ShieldAlert size={18} color="var(--color-error)" /> Errors
            {stats.errors > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-error)' }}>{stats.errors}</span>}
          </button>
          
          <button 
            className={`nav-item ${viewMode === 'warnings' ? 'active' : ''}`}
            onClick={() => setViewMode('warnings')}
          >
            <AlertTriangle size={18} color="var(--color-warn)" /> Warnings
            {stats.warnings > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-warn)' }}>{stats.warnings}</span>}
          </button>

          <button 
            className={`nav-item ${viewMode === 'slow_requests' ? 'active' : ''}`}
            onClick={() => setViewMode('slow_requests')}
          >
            <Activity size={18} color="var(--color-info)" /> Slow Requests
            {stats.slowRequests > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>{stats.slowRequests}</span>}
          </button>
          
          <button 
            className={`nav-item ${viewMode === 'queries' ? 'active' : ''}`}
            onClick={() => setViewMode('queries')}
          >
            <Database size={18} color="var(--text-primary)" /> All Queries
            {stats.queries > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.7 }}>{stats.queries}</span>}
          </button>
          
          <button 
            className={`nav-item ${viewMode === 'slow_queries' ? 'active' : ''}`}
            onClick={() => setViewMode('slow_queries')}
          >
            <Database size={18} color="var(--color-warn)" /> Slow Queries
            {stats.slowQueries > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>{stats.slowQueries}</span>}
          </button>
          
          <button 
            className={`nav-item ${viewMode === 'duplicate_queries' ? 'active' : ''}`}
            onClick={() => setViewMode('duplicate_queries')}
          >
            <Copy size={18} color="var(--color-info)" /> Duplicate Queries
            {duplicateQueries.length > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>{duplicateQueries.length}</span>}
          </button>
        </div>

        <div className="status-bar">
          <div className="status-indicator">
            <div className={`dot ${isConnected ? (isLive ? '' : 'paused') : 'offline'}`}></div>
            <span style={{ color: isConnected ? 'inherit' : 'var(--color-error)' }}>
              {isConnected ? (isLive ? 'LIVE' : 'PAUSED') : 'OFFLINE'}
            </span>
          </div>
          <div>{events.length} / 10k</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <div className="header-title">
            {viewMode === 'all' && 'All Logs'}
            {viewMode === 'errors' && 'Errors'}
            {viewMode === 'warnings' && 'Warnings'}
            {viewMode === 'slow_requests' && 'Slow Requests'}
            {viewMode === 'slow_queries' && 'Slow DB Queries'}
            {viewMode === 'queries' && 'All Queries'}
          </div>
          
          <div className="toolbar">
            <Dropdown
              options={services.map(s => ({ label: s === 'All' ? 'All Services' : s, value: s }))}
              value={serviceFilter}
              onChange={setServiceFilter}
              width="200px"
            />
            
            <div className="theme-switcher">
              <Palette size={16} color="var(--text-secondary)" style={{ marginRight: '4px' }} />
              <button 
                className={`theme-swatch ${theme === 'dark' ? 'active' : ''}`}
                style={{ background: 'linear-gradient(135deg, #08090A 50%, #5E6AD2 50%)' }}
                onClick={() => setTheme('dark')}
                title="Linear Dark"
              />
              <button 
                className={`theme-swatch ${theme === 'vercel' ? 'active' : ''}`}
                style={{ background: 'linear-gradient(135deg, #000000 50%, #EDEDED 50%)' }}
                onClick={() => setTheme('vercel')}
                title="Vercel Dark"
              />
              <button 
                className={`theme-swatch ${theme === 'tokyo-night' ? 'active' : ''}`}
                style={{ background: 'linear-gradient(135deg, #1a1b26 50%, #7aa2f7 50%)' }}
                onClick={() => setTheme('tokyo-night')}
                title="Tokyo Night"
              />
              <button 
                className={`theme-swatch ${theme === 'vscode' ? 'active' : ''}`}
                style={{ background: 'linear-gradient(135deg, #1e1e1e 50%, #007acc 50%)' }}
                onClick={() => setTheme('vscode')}
                title="VS Code Dark"
              />
              <button 
                className={`theme-swatch ${theme === 'catppuccin' ? 'active' : ''}`}
                style={{ background: 'linear-gradient(135deg, #1e1e2e 50%, #cba6f7 50%)' }}
                onClick={() => setTheme('catppuccin')}
                title="Catppuccin Mocha"
              />
            </div>
            
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search logs, reqId, query..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            
            <button className={`btn ${isLive ? 'primary' : ''}`} onClick={() => setIsLive(!isLive)}>
              {isLive ? <Pause size={16} /> : <Play size={16} />}
              {isLive ? 'Pause' : 'Resume'}
            </button>
            
            <button className="btn danger" onClick={clear}>
              <Trash2 size={16} /> Clear
            </button>
          </div>
        </div>

        {viewMode === 'slow_queries' && (
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-title">Slow Queries (Last 10k events)</div>
              <div className="stat-value">{stats.slowQueries}</div>
            </div>
            {/* Add more stats as needed */}
          </div>
        )}

        {viewMode === 'duplicate_queries' ? (
          <DuplicateQueriesTable 
            queries={duplicateQueries} 
            searchQuery={search} 
            serviceFilter={serviceFilter} 
          />
        ) : (
          <LogViewer logs={filteredEvents} />
        )}
      </div>
    </div>
  );
}

export default App;
