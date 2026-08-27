"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RingBuffer = void 0;
class RingBuffer {
    buffer;
    maxSize;
    constructor(maxSize = 10000) {
        this.buffer = [];
        this.maxSize = maxSize;
    }
    add(event) {
        if (this.buffer.length >= this.maxSize) {
            this.buffer.shift();
        }
        this.buffer.push(event);
    }
    getAll() {
        return [...this.buffer];
    }
    clear() {
        this.buffer = [];
    }
    size() {
        return this.buffer.length;
    }
}
exports.RingBuffer = RingBuffer;
