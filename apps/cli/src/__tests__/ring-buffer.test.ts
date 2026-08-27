import { describe, it, expect, beforeEach } from '@jest/globals';
import { RingBuffer } from '../ring-buffer';
import { LogEvent } from '@nexeo-local-observability/log-types';

describe('RingBuffer', () => {
  it('should store events up to max size', () => {
    const buffer = new RingBuffer(3);
    const mockEvent = (id: string): LogEvent => ({
      id, timestamp: Date.now(), service: 'test', level: 'info', stream: 'stdout', logType: 'app', format: 'text', message: 'test'
    });

    buffer.add(mockEvent('1'));
    buffer.add(mockEvent('2'));
    buffer.add(mockEvent('3'));
    
    expect(buffer.size()).toBe(3);
    expect(buffer.getAll()[0].id).toBe('1');

    // Add 4th event, should evict '1'
    buffer.add(mockEvent('4'));
    
    expect(buffer.size()).toBe(3);
    expect(buffer.getAll()[0].id).toBe('2');
    expect(buffer.getAll()[2].id).toBe('4');
  });

  it('should clear all events', () => {
    const buffer = new RingBuffer(3);
    const mockEvent = (id: string): LogEvent => ({
      id, timestamp: Date.now(), service: 'test', level: 'info', stream: 'stdout', logType: 'app', format: 'text', message: 'test'
    });

    buffer.add(mockEvent('1'));
    expect(buffer.size()).toBe(1);
    
    buffer.clear();
    expect(buffer.size()).toBe(0);
    expect(buffer.getAll()).toEqual([]);
  });
});
