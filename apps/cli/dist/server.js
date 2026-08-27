"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
class Server {
    app;
    server;
    wss;
    clients;
    ringBuffer;
    constructor(ringBuffer) {
        this.ringBuffer = ringBuffer;
        this.app = (0, express_1.default)();
        this.server = http_1.default.createServer(this.app);
        this.wss = new ws_1.WebSocketServer({ server: this.server });
        this.clients = new Set();
        // Serve static files from dashboard build if exists
        this.app.use(express_1.default.static(path_1.default.join(__dirname, '../../dashboard/dist')));
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
        this.wss.on('error', (e) => {
            if (e.code !== 'EADDRINUSE') {
                console.error(`[Observability] WebSocketServer error:`, e);
            }
        });
        this.server.on('error', (e) => {
            // Error handling moved to start() method
            if (e.code !== 'EADDRINUSE') {
                console.error(`[Observability] Server error:`, e);
            }
        });
    }
    boundPort = null;
    async start(initialPort = 3001) {
        return new Promise((resolve) => {
            let currentPort = initialPort;
            const attemptListen = () => {
                this.server.listen(currentPort, () => {
                    this.boundPort = currentPort;
                    resolve(currentPort);
                });
            };
            this.server.on('error', (e) => {
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
    getPort() {
        return this.boundPort;
    }
    broadcastEvent(event) {
        this.ringBuffer.add(event);
        this.broadcast({
            type: 'EVENT',
            event
        });
    }
    broadcast(data) {
        const payload = JSON.stringify(data);
        for (const client of this.clients) {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(payload);
            }
        }
    }
    close() {
        this.wss.close();
        this.server.close();
    }
}
exports.Server = Server;
