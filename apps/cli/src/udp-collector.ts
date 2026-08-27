import dgram from 'dgram';
import { LogParser } from '@nexeo-local-observability/log-parser';
import { Server } from './server';

export class UdpCollector {
  private socket: dgram.Socket;

  constructor(
    private readonly port: number,
    private readonly parser: LogParser,
    private readonly server: Server
  ) {
    this.socket = dgram.createSocket('udp4');

    this.socket.on('error', (err) => {
      console.error(`[UDP Collector] Error: ${err.message}`);
      this.socket.close();
    });

    this.socket.on('message', (msg) => {
      const text = msg.toString('utf-8');
      const lines = text.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const result = this.parser.parseLine(line, 'stdout');
        if (result) {
          this.server.broadcastEvent(result);
        }
      }
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.socket.bind(this.port, '127.0.0.1', () => {
        console.log(`[UDP Collector] Listening for logs on udp://127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }

  public stop(): void {
    try {
      this.socket.close();
    } catch (e) {
      // ignore
    }
  }
}
