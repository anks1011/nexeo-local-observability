import { LogEvent } from '@nexeo-local-observability/log-types';
export declare class RingBuffer {
    private buffer;
    private maxSize;
    constructor(maxSize?: number);
    add(event: LogEvent): void;
    getAll(): LogEvent[];
    clear(): void;
    size(): number;
}
