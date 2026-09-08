#!/usr/bin/env node
import { Command } from 'commander';
import { RingBuffer } from './ring-buffer';
import { Server } from './server';
import { ProcessManager } from './process-manager';
import { LogParser } from '@nexeo-local-observability/log-parser';
import { UdpCollector } from './udp-collector';
import path from 'path';
import fs from 'fs';

const program = new Command();

program
  .name('nexeo-observe')
  .description('Local Observability Dashboard for Nexeo')
  .version('1.0.0');

async function setupObservability(options: any) {
  const ringBuffer = new RingBuffer(parseInt(options.maxEvents, 10));
  const server = new Server(ringBuffer);
  const parser = new LogParser({
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
    const repoPath = path.resolve(options.repo);
    if (!fs.existsSync(repoPath)) {
      console.error(`Error: Repository path does not exist: ${repoPath}`);
      process.exit(1);
    }

    const { server, parser } = await setupObservability(options);

    const manager = new ProcessManager(server, parser);
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
    const collector = new UdpCollector(udpPort, parser, server);
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
