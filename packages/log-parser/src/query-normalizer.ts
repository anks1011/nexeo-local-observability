/**
 * Normalizes SQL queries and Elasticsearch bodies to group similar query patterns.
 */

export function normalizeSql(query: string): string {
  if (!query) return '';
  let normalized = query;

  // Replace parameterized positional variables: $1, $2, etc -> ?
  normalized = normalized.replace(/\$\d+\b/g, '?');

  // Replace UUIDs to avoid them being split by other rules
  normalized = normalized.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '?'
  );

  // Replace string literals: 'something' -> '?'
  // (handles basic cases, does not perfectly handle all nested quotes but good enough for grouping)
  normalized = normalized.replace(/'[^']*'/g, "'?'");

  // Replace numeric literals: 123 -> ?
  // Only if they are isolated (not part of table_name1)
  normalized = normalized.replace(/(?<![a-zA-Z_])\b\d+\b(?![a-zA-Z_])/g, '?');

  // Replace IN lists: IN (1, 2, 3) -> IN (?)
  normalized = normalized.replace(/\bIN\s*\([^)]+\)/gi, 'IN (?)');

  // Replace ANY(...) arrays: ANY(ARRAY[1,2]) -> ANY(?)
  normalized = normalized.replace(/\bANY\s*\([^)]+\)/gi, 'ANY(?)');

  // Normalize excessive whitespace to single spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

export function normalizeElasticsearch(request: { method?: string; path?: string; index?: string; body?: any }): string {
  const method = request.method || 'GET';
  let path = request.path || '';
  
  // Replace IDs in path (e.g., /index/_doc/123 -> /index/_doc/$ID)
  // Assuming paths with high entropy are document IDs
  path = path.replace(/\/[a-zA-Z0-9_-]{20,}/g, '/$ID');

  let bodyPattern = '';
  if (request.body) {
    if (typeof request.body === 'string') {
      try {
        const parsed = JSON.parse(request.body);
        bodyPattern = JSON.stringify(normalizeJsonShape(parsed));
      } catch (e) {
        bodyPattern = '{"type":"raw_string"}';
      }
    } else {
      bodyPattern = JSON.stringify(normalizeJsonShape(request.body));
    }
  }

  return `ES: ${method} ${path} ${bodyPattern}`;
}

function normalizeJsonShape(obj: any): any {
  if (obj === null || obj === undefined) return '?';
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') return '?';
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return [];
    // Just map the first element's shape to represent the array pattern
    return [normalizeJsonShape(obj[0])];
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      result[key] = normalizeJsonShape(obj[key]);
    }
    return result;
  }
  
  return '?';
}
