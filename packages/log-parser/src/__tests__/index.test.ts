import { describe, it, expect, beforeEach } from '@jest/globals';
import { LogParser } from '../index';

describe('LogParser', () => {
  let parser: LogParser;

  beforeEach(() => {
    parser = new LogParser({ slowQueryThresholdMs: 200, slowRequestThresholdMs: 500 });
  });

  it('should parse non-JSON text logs', () => {
    const event = parser.parseLine('○ Compiling /organisations ...', 'stdout');
    expect(event).toBeDefined();
    expect(event?.format).toBe('text');
    expect(event?.message).toBe('○ Compiling /organisations ...');
    expect(event?.level).toBe('info');
    expect(event?.service).toBe('unknown');
  });

  it('should extract service name from prefix', () => {
    const event = parser.parseLine('@nexeo/ops-service:dev: ○ Compiling /organisations ...', 'stdout');
    expect(event?.service).toBe('ops-service');
    expect(event?.message).toBe('○ Compiling /organisations ...');
  });

  it('should parse JSON logs', () => {
    const log = JSON.stringify({ level: 'info', message: 'Hello world', reqId: '123' });
    const event = parser.parseLine(`@nexeo/identity-service:dev: ${log}`, 'stdout');
    expect(event?.format).toBe('json');
    expect(event?.service).toBe('identity-service');
    expect(event?.message).toBe('Hello world');
    expect(event?.requestId).toBe('123');
  });

  it('should detect slow requests', () => {
    const log = JSON.stringify({ message: 'Request finished', responseTimeMs: 600 });
    const event = parser.parseLine(log, 'stdout');
    expect(event?.slow).toBe(true);
    expect(event?.durationMs).toBe(600);
  });

  it('should detect slow queries', () => {
    const log = JSON.stringify({ message: 'DB Query', queryExecutionTimeMs: 260, stream: 'db' });
    const event = parser.parseLine(log, 'stdout');
    expect(event?.slow).toBe(true);
    expect(event?.logType).toBe('db');
    expect(event?.queryDurationMs).toBe(260);
  });

  it('should redact sensitive information', () => {
    const log = JSON.stringify({ message: 'Login', accessToken: 'super_secret_token', password: 'my_password' });
    const event = parser.parseLine(log, 'stdout');
    expect(event?.metadata?.accessToken).toBe('[REDACTED]');
    expect(event?.metadata?.password).toBe('[REDACTED]');
  });
});
