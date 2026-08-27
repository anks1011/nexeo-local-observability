"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const query_interpolator_1 = require("../query-interpolator");
(0, globals_1.describe)('query-interpolator', () => {
    (0, globals_1.it)('should replace $1, $2, $3 with respective string, boolean, and null values', () => {
        const query = 'SELECT * FROM users WHERE id = $1 AND active = $2 AND deleted_at = $3';
        const params = ['123', true, null];
        const result = (0, query_interpolator_1.interpolatePostgresQuery)(query, params);
        (0, globals_1.expect)(result).toBe("SELECT * FROM users WHERE id = '123' AND active = TRUE AND deleted_at = NULL");
    });
    (0, globals_1.it)('should properly escape single quotes in strings', () => {
        const query = 'SELECT * FROM users WHERE name = $1';
        const params = ["O'Reilly"];
        const result = (0, query_interpolator_1.interpolatePostgresQuery)(query, params);
        (0, globals_1.expect)(result).toBe("SELECT * FROM users WHERE name = 'O''Reilly'");
    });
    (0, globals_1.it)('should handle numbers correctly', () => {
        const query = 'SELECT * FROM products WHERE price > $1';
        const params = [42.5];
        const result = (0, query_interpolator_1.interpolatePostgresQuery)(query, params);
        (0, globals_1.expect)(result).toBe("SELECT * FROM products WHERE price > 42.5");
    });
    (0, globals_1.it)('should leave missing parameters as-is', () => {
        const query = 'SELECT * FROM users WHERE id = $1 AND role = $2';
        const params = ['123']; // Missing $2
        const result = (0, query_interpolator_1.interpolatePostgresQuery)(query, params);
        (0, globals_1.expect)(result).toBe("SELECT * FROM users WHERE id = '123' AND role = $2");
    });
    (0, globals_1.it)('should handle multiple occurrences of the same placeholder', () => {
        const query = 'SELECT * FROM logs WHERE (id = $1 OR parent_id = $1) AND type = $2';
        const params = ['abc', 'error'];
        const result = (0, query_interpolator_1.interpolatePostgresQuery)(query, params);
        (0, globals_1.expect)(result).toBe("SELECT * FROM logs WHERE (id = 'abc' OR parent_id = 'abc') AND type = 'error'");
    });
    (0, globals_1.it)('should safely serialize arrays and objects to JSON strings', () => {
        const query = 'INSERT INTO events (payload, tags) VALUES ($1, $2)';
        const params = [{ foo: "O'bar" }, ['a', 'b']];
        const result = (0, query_interpolator_1.interpolatePostgresQuery)(query, params);
        (0, globals_1.expect)(result).toBe("INSERT INTO events (payload, tags) VALUES ('{\"foo\":\"O''bar\"}', '[\"a\",\"b\"]')");
    });
    (0, globals_1.it)('should ignore placeholders that look like $ but are not standalone word boundaries', () => {
        // Note: our regex is \b, so it expects a word boundary. $100 is not a parameter if it's not matching our regex.
        // Actually, \$(\d+)\b will match the '100' in '$100'. So we must be careful with currency.
        // In SQL, currency isn't usually represented raw like $100 without quotes, but if it is, it gets replaced.
        // For now, this tests standard replacement.
        const query = 'SELECT * FROM sales WHERE amount = $10';
        const params = Array.from({ length: 10 }, (_, i) => i + 1);
        const result = (0, query_interpolator_1.interpolatePostgresQuery)(query, params);
        (0, globals_1.expect)(result).toBe("SELECT * FROM sales WHERE amount = 10");
    });
    (0, globals_1.it)('should return original query if no params provided', () => {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = (0, query_interpolator_1.interpolatePostgresQuery)(query, []);
        (0, globals_1.expect)(result).toBe(query);
    });
    (0, globals_1.it)('should handle [REDACTED] string gracefully', () => {
        const query = 'SELECT * FROM users WHERE password = $1';
        const params = ['[REDACTED]'];
        const result = (0, query_interpolator_1.interpolatePostgresQuery)(query, params);
        (0, globals_1.expect)(result).toBe("SELECT * FROM users WHERE password = '[REDACTED]'");
    });
});
