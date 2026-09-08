#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const ring_buffer_1 = require("./ring-buffer");
const server_1 = require("./server");
const process_manager_1 = require("./process-manager");
const log_parser_1 = require("@nexeo-local-observability/log-parser");
const udp_collector_1 = require("./udp-collector");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const program = new commander_1.Command();
program
    .name('nexeo-observe')
    .description('Local Observability Dashboard for Nexeo')
    .version('1.0.0');
async function setupObservability(options) {
    const ringBuffer = new ring_buffer_1.RingBuffer(parseInt(options.maxEvents, 10));
    const server = new server_1.Server(ringBuffer);
    const parser = new log_parser_1.LogParser({
        slowQueryThresholdMs: parseInt(options.slowQuery, 10),
        slowRequestThresholdMs: parseInt(options.slowRequest, 10),
    });
    const boundPort = await server.start(parseInt(options.port, 10));
    console.log(`\nNexeo Local Observability\n──────────────────────────`);
    console.log(`\nDashboard:\n  http://localhost:${boundPort}`);
    console.log(`\nStatus:\n  LIVE\n`);
    return { server, parser };
}
program
    .command('dev', { isDefault: true })
    .description('Start the Nexeo dev server and attach the observability dashboard')
    .option('--repo <path>', 'Path to the Nexeo repository (default: current directory)', process.cwd())
    .option('--port <number>', 'Port for the dashboard', '3854')
    .option('--max-events <number>', 'Maximum events to keep in memory', '10000')
    .option('--slow-query <number>', 'Threshold for slow queries in ms', '200')
    .option('--slow-request <number>', 'Threshold for slow requests in ms', '500')
    .action(async (options) => {
    const repoPath = path_1.default.resolve(options.repo);
    if (!fs_1.default.existsSync(repoPath)) {
        console.error(`Error: Repository path does not exist: ${repoPath}`);
        process.exit(1);
    }
    const { server, parser } = await setupObservability(options);
    const manager = new process_manager_1.ProcessManager(server, parser);
    manager.start(repoPath, 'pnpm', ['dev']);
});
program
    .command('observe')
    .description('Start the observability dashboard in standalone mode, listening for UDP logs')
    .option('--port <number>', 'Port for the dashboard', '3854')
    .option('--udp-port <number>', 'UDP port to listen for piped logs', '3014')
    .option('--max-events <number>', 'Maximum events to keep in memory', '10000')
    .option('--slow-query <number>', 'Threshold for slow queries in ms', '200')
    .option('--slow-request <number>', 'Threshold for slow requests in ms', '500')
    .action(async (options) => {
    const { server, parser } = await setupObservability(options);
    const udpPort = parseInt(options.udpPort, 10);
    const collector = new udp_collector_1.UdpCollector(udpPort, parser, server);
    await collector.start();
    process.on('SIGINT', () => {
        collector.stop();
        process.exit(0);
    });
    process.on('SIGTERM', () => {
        collector.stop();
        process.exit(0);
    });
});
program.parse(process.argv);
