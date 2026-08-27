#!/usr/bin/env node
import { Command } from 'commander';
import { RingBuffer } from './ring-buffer';
import { Server } from './server';
import { ProcessManager } from './process-manager';
import { LogParser } from '@nexeo-local-observability/log-parser';
import { HostManager } from './host-manager';
import { CaddyManager } from './caddy-manager';
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

  const hasLocalDomain = HostManager.checkLocalDomainExists();
  let proxyStarted = false;
  let proxyManager: CaddyManager | null = null;

  if (!hasLocalDomain) {
    console.log(`\n⚠️  Local domain not configured in /etc/hosts`);
    console.log(`To use https://nexeo-observability.local, run this one-time command:\n`);
    console.log(`  sudo sh -c 'echo "127.0.0.1 nexeo-observability.local" >> /etc/hosts'\n`);
  } else {
    proxyManager = new CaddyManager();
    const proxyResult = await proxyManager.startProxy(boundPort);
    
    if (proxyResult === 'SUCCESS') {
      proxyStarted = true;
    } else if (proxyResult === 'ALREADY_IN_USE') {
      const caddyfilePath = '/etc/caddy/Caddyfile';
      let isConfigured = false;
      try {
        if (fs.existsSync(caddyfilePath)) {
          const caddyConfig = fs.readFileSync(caddyfilePath, 'utf-8');
          if (caddyConfig.includes('nexeo-observability.local')) {
            isConfigured = true;
          }
        }
      } catch (e) {
        // ignore read errors
      }

      if (isConfigured) {
        proxyStarted = true; // Use the system caddy!
        console.log(`\n✅ Using System Caddy for https://nexeo-observability.local`);
      } else {
        console.log(`\n⚠️  System Caddy is already running on port 80/443.`);
        console.log(`To use https://nexeo-observability.local, append this to your global Caddyfile:\n`);
        console.log(`  sudo sh -c 'printf "nexeo-observability.local {\\n  tls internal\\n  reverse_proxy 127.0.0.1:${boundPort}\\n}\\n" >> /etc/caddy/Caddyfile'`);
        console.log(`  sudo systemctl reload caddy\n`);
      }
    } else if (proxyResult === 'PERMISSION_DENIED') {
      console.log(`\n⚠️  Caddy reverse proxy failed to bind to ports (permission denied).`);
      console.log(`To use https://nexeo-observability.local without a port, grant Caddy permission:\n`);
      console.log(`  sudo setcap cap_net_bind_service=+ep $(which caddy)\n`);
    } else {
      console.log(`\n⚠️  Caddy reverse proxy failed to start (timeout).`);
    }
  }

  if (proxyStarted) {
    console.log(`\nDashboard:\n  https://nexeo-observability.local`);
  } else {
    console.log(`\nDashboard:\n  http://localhost:${boundPort}`);
  }

  console.log(`\nInternal:\n  localhost:${boundPort}`);
  console.log(`\nStatus:\n  LIVE\n`);

  process.on('SIGINT', () => {
    if (proxyManager) proxyManager.cleanup();
  });
  process.on('SIGTERM', () => {
    if (proxyManager) proxyManager.cleanup();
  });

  return { server, parser, proxyManager };
}

program
  .command('dev', { isDefault: true })
  .description('Start the Nexeo dev server and attach the observability dashboard')
  .option('--repo <path>', 'Path to the Nexeo repository (default: current directory)', process.cwd())
  .option('--port <number>', 'Port for the dashboard', '3013')
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
  .option('--port <number>', 'Port for the dashboard', '3013')
  .option('--udp-port <number>', 'UDP port to listen for piped logs', '3014')
  .option('--max-events <number>', 'Maximum events to keep in memory', '10000')
  .option('--slow-query <number>', 'Threshold for slow queries in ms', '200')
  .option('--slow-request <number>', 'Threshold for slow requests in ms', '500')
  .action(async (options) => {
    const { server, parser, proxyManager } = await setupObservability(options);
    
    const udpPort = parseInt(options.udpPort, 10);
    const collector = new UdpCollector(udpPort, parser, server);
    await collector.start();

    process.on('SIGINT', () => {
      collector.stop();
      if (proxyManager) proxyManager.cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      collector.stop();
      if (proxyManager) proxyManager.cleanup();
      process.exit(0);
    });
  });

program.parse(process.argv);
