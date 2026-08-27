"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ring_buffer_1 = require("../ring-buffer");
(0, globals_1.describe)('RingBuffer', () => {
    (0, globals_1.it)('should store events up to max size', () => {
        const buffer = new ring_buffer_1.RingBuffer(3);
        const mockEvent = (id) => ({
            id, timestamp: Date.now(), service: 'test', level: 'info', stream: 'stdout', logType: 'app', format: 'text', message: 'test'
        });
        buffer.add(mockEvent('1'));
        buffer.add(mockEvent('2'));
        buffer.add(mockEvent('3'));
        (0, globals_1.expect)(buffer.size()).toBe(3);
        (0, globals_1.expect)(buffer.getAll()[0].id).toBe('1');
        // Add 4th event, should evict '1'
        buffer.add(mockEvent('4'));
        (0, globals_1.expect)(buffer.size()).toBe(3);
        (0, globals_1.expect)(buffer.getAll()[0].id).toBe('2');
        (0, globals_1.expect)(buffer.getAll()[2].id).toBe('4');
    });
    (0, globals_1.it)('should clear all events', () => {
        const buffer = new ring_buffer_1.RingBuffer(3);
        const mockEvent = (id) => ({
            id, timestamp: Date.now(), service: 'test', level: 'info', stream: 'stdout', logType: 'app', format: 'text', message: 'test'
        });
        buffer.add(mockEvent('1'));
        (0, globals_1.expect)(buffer.size()).toBe(1);
        buffer.clear();
        (0, globals_1.expect)(buffer.size()).toBe(0);
        (0, globals_1.expect)(buffer.getAll()).toEqual([]);
    });
});
