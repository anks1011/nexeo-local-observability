import { RingBuffer } from './ring-buffer';
import { LogEvent } from '@nexeo-local-observability/log-types';
export declare class Server {
    private app;
    private server;
    private wss;
    private clients;
    private ringBuffer;
    constructor(ringBuffer: RingBuffer);
    private boundPort;
    start(initialPort?: number): Promise<number>;
    getPort(): number | null;
    broadcastEvent(event: LogEvent): void;
    private broadcast;
    close(): void;
}
