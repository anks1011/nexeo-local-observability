"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_1 = require("../index");
(0, globals_1.describe)('LogParser', () => {
    let parser;
    (0, globals_1.beforeEach)(() => {
        parser = new index_1.LogParser({ slowQueryThresholdMs: 200, slowRequestThresholdMs: 500 });
    });
    (0, globals_1.it)('should parse non-JSON text logs', () => {
        const event = parser.parseLine('○ Compiling /organisations ...', 'stdout');
        (0, globals_1.expect)(event).toBeDefined();
        (0, globals_1.expect)(event?.format).toBe('text');
        (0, globals_1.expect)(event?.message).toBe('○ Compiling /organisations ...');
        (0, globals_1.expect)(event?.level).toBe('info');
        (0, globals_1.expect)(event?.service).toBe('unknown');
    });
    (0, globals_1.it)('should extract service name from prefix', () => {
        const event = parser.parseLine('@nexeo/ops-service:dev: ○ Compiling /organisations ...', 'stdout');
        (0, globals_1.expect)(event?.service).toBe('ops-service');
        (0, globals_1.expect)(event?.message).toBe('○ Compiling /organisations ...');
    });
    (0, globals_1.it)('should parse JSON logs', () => {
        const log = JSON.stringify({ level: 'info', message: 'Hello world', reqId: '123' });
        const event = parser.parseLine(`@nexeo/identity-service:dev: ${log}`, 'stdout');
        (0, globals_1.expect)(event?.format).toBe('json');
        (0, globals_1.expect)(event?.service).toBe('identity-service');
        (0, globals_1.expect)(event?.message).toBe('Hello world');
        (0, globals_1.expect)(event?.requestId).toBe('123');
    });
    (0, globals_1.it)('should detect slow requests', () => {
        const log = JSON.stringify({ message: 'Request finished', responseTimeMs: 600 });
        const event = parser.parseLine(log, 'stdout');
        (0, globals_1.expect)(event?.slow).toBe(true);
        (0, globals_1.expect)(event?.durationMs).toBe(600);
    });
    (0, globals_1.it)('should detect slow queries', () => {
        const log = JSON.stringify({ message: 'DB Query', queryExecutionTimeMs: 260, stream: 'db' });
        const event = parser.parseLine(log, 'stdout');
        (0, globals_1.expect)(event?.slow).toBe(true);
        (0, globals_1.expect)(event?.logType).toBe('db');
        (0, globals_1.expect)(event?.queryDurationMs).toBe(260);
    });
    (0, globals_1.it)('should redact sensitive information', () => {
        const log = JSON.stringify({ message: 'Login', accessToken: 'super_secret_token', password: 'my_password' });
        const event = parser.parseLine(log, 'stdout');
        (0, globals_1.expect)(event?.metadata?.accessToken).toBe('[REDACTED]');
        (0, globals_1.expect)(event?.metadata?.password).toBe('[REDACTED]');
    });
});
