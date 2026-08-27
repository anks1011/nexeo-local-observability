import { LogParser } from '@nexeo-local-observability/log-parser';
import { Server } from './server';
export declare class ProcessManager {
    private childProcess;
    private parser;
    private server;
    constructor(server: Server, parser: LogParser);
    start(repoPath: string, command?: string, args?: string[]): void;
    private cleanup;
}
