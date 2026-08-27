import { LogParser } from '@nexeo-local-observability/log-parser';
import { Server } from './server';
export declare class UdpCollector {
    private readonly port;
    private readonly parser;
    private readonly server;
    private socket;
    constructor(port: number, parser: LogParser, server: Server);
    start(): Promise<void>;
    stop(): void;
}
