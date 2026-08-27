/**
 * Normalizes SQL queries and Elasticsearch bodies to group similar query patterns.
 */
export declare function normalizeSql(query: string): string;
export declare function normalizeElasticsearch(request: {
    method?: string;
    path?: string;
    index?: string;
    body?: any;
}): string;
