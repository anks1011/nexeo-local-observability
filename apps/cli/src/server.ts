import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { RingBuffer } from './ring-buffer';
import { LogEvent } from '@nexeo-local-observability/log-types';
import path from 'path';

export class Server {
  private app: express.Application;
  private server: http.Server;
  private wss: WebSocketServer;
  private clients: Set<WebSocket>;
  private ringBuffer: RingBuffer;

  constructor(ringBuffer: RingBuffer) {
    this.ringBuffer = ringBuffer;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.clients = new Set();

    // Serve static files from dashboard build if exists
    this.app.use(express.static(path.join(__dirname, '../../dashboard/dist')));
    
    // API endpoint to clear
    this.app.post('/api/clear', (req, res) => {
      this.ringBuffer.clear();
      this.broadcast({ type: 'CLEAR' });
      res.sendStatus(200);
    });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      
      // Send initial snapshot
      ws.send(JSON.stringify({
        type: 'SNAPSHOT',
        events: this.ringBuffer.getAll()
      }));

      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });

    this.wss.on('error', (e: any) => {
      if (e.code !== 'EADDRINUSE') {
        console.error(`[Observability] WebSocketServer error:`, e);
      }
    });

    this.server.on('error', (e: any) => {
      // Error handling moved to start() method
      if (e.code !== 'EADDRINUSE') {
        console.error(`[Observability] Server error:`, e);
      }
    });
  }

  private boundPort: number | null = null;

  public async start(initialPort: number = 3001): Promise<number> {
    return new Promise((resolve) => {
      let currentPort = initialPort;

      const attemptListen = () => {
        this.server.listen(currentPort, () => {
          this.boundPort = currentPort;
          resolve(currentPort);
        });
      };

      this.server.on('error', (e: any) => {
        if (e.code === 'EADDRINUSE') {
          currentPort++;
          setTimeout(() => {
            this.server.close();
            attemptListen();
          }, 100);
        }
      });

      attemptListen();
    });
  }

  public getPort(): number | null {
    return this.boundPort;
  }

  public broadcastEvent(event: LogEvent): void {
    this.ringBuffer.add(event);
    this.broadcast({
      type: 'EVENT',
      event
    });
  }

  private broadcast(data: any): void {
    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  public close(): void {
    this.wss.close();
    this.server.close();
  }
}
