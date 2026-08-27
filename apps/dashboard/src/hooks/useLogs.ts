import { useState, useEffect, useCallback, useRef } from 'react';
import type { LogEvent } from '@nexeo-local-observability/log-types';

export function useLogs() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  // We use a ref for isLive to access the latest value inside the WS event listener without re-binding
  const isLiveRef = useRef(isLive);
  useEffect(() => {
    isLiveRef.current = isLive;
  }, [isLive]);

  const connect = useCallback(() => {
    // If not in browser (e.g. SSR), don't connect
    if (typeof window === 'undefined') return;
    
    // Auto-detect host and port based on current window location
    // Default to 3013 if we're running Vite dev server on a different port
    const isDev = window.location.port === '5173';
    const port = isDev ? '3013' : window.location.port;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}${port ? `:${port}` : ''}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    
    ws.onclose = () => {
      setIsConnected(false);
      // Auto reconnect
      setTimeout(connect, 2000);
    };

    ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data.type === 'SNAPSHOT') {
          setEvents(data.events);
        } else if (data.type === 'EVENT') {
          if (isLiveRef.current) {
            setEvents((prev) => {
              const newEvents = [...prev, data.event];
              if (newEvents.length > 10000) {
                return newEvents.slice(newEvents.length - 10000);
              }
              return newEvents;
            });
          }
        } else if (data.type === 'CLEAR') {
          setEvents([]);
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const clear = async () => {
    try {
      const isDev = window.location.port === '5173';
      const port = isDev ? '3013' : window.location.port;
      const httpProtocol = window.location.protocol;
      await fetch(`${httpProtocol}//${window.location.hostname}${port ? `:${port}` : ''}/api/clear`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to clear logs', e);
    }
  };

  return {
    events,
    isConnected,
    isLive,
    setIsLive,
    clear,
  };
}
