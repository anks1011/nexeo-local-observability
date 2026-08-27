import { useMemo } from 'react';
import type { LogEvent } from '@nexeo-local-observability/log-types';
import { normalizeSql, normalizeElasticsearch } from '@nexeo-local-observability/log-parser/src/query-normalizer';

export interface QueryStats {
  queryPattern: string;
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  slowCount: number;
  service: string;
  database?: string;
  schema?: string;
  lastExecutedAt: number;
  recentExecutions: LogEvent[];
}

export function useDuplicateQueries(events: LogEvent[], slowQueryThresholdMs = 200) {
  return useMemo(() => {
    const statsMap = new Map<string, QueryStats>();

    // Only consider DB events or ES requests
    const dbEvents = events.filter(e => e.logType === 'db' || e.query || e.databaseType === 'elasticsearch');

    for (const event of dbEvents) {
      let pattern = '';
      if (event.databaseType === 'elasticsearch' && event.elasticRequest) {
        pattern = normalizeElasticsearch(event.elasticRequest);
      } else if (event.query) {
        pattern = normalizeSql(event.query);
      } else {
        continue; // Unrecognized
      }

      const latency = event.queryDurationMs ?? event.durationMs ?? 0;
      const isSlow = latency >= slowQueryThresholdMs;

      const existing = statsMap.get(pattern);
      if (existing) {
        existing.count++;
        existing.totalTime += latency;
        existing.minTime = Math.min(existing.minTime, latency);
        existing.maxTime = Math.max(existing.maxTime, latency);
        if (isSlow) existing.slowCount++;
        if (event.timestamp > existing.lastExecutedAt) {
          existing.lastExecutedAt = event.timestamp;
        }
        
        // Keep up to 10 recent executions
        existing.recentExecutions.unshift(event);
        if (existing.recentExecutions.length > 10) {
          existing.recentExecutions.pop();
        }
      } else {
        statsMap.set(pattern, {
          queryPattern: pattern,
          count: 1,
          totalTime: latency,
          minTime: latency,
          maxTime: latency,
          slowCount: isSlow ? 1 : 0,
          service: event.service,
          database: event.database,
          schema: event.schema,
          lastExecutedAt: event.timestamp,
          recentExecutions: [event]
        });
      }
    }

    // Convert map to array and sort by count descending
    return Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
  }, [events, slowQueryThresholdMs]);
}
