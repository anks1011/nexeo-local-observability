"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdpCollector = void 0;
const dgram_1 = __importDefault(require("dgram"));
class UdpCollector {
    port;
    parser;
    server;
    socket;
    constructor(port, parser, server) {
        this.port = port;
        this.parser = parser;
        this.server = server;
        this.socket = dgram_1.default.createSocket('udp4');
        this.socket.on('error', (err) => {
            console.error(`[UDP Collector] Error: ${err.message}`);
            this.socket.close();
        });
        this.socket.on('message', (msg) => {
            const text = msg.toString('utf-8');
            const lines = text.split('\n');
            for (const line of lines) {
                if (!line.trim())
                    continue;
                const result = this.parser.parseLine(line, 'stdout');
                if (result) {
                    this.server.broadcastEvent(result);
                }
            }
        });
    }
    async start() {
        return new Promise((resolve) => {
            this.socket.bind(this.port, '127.0.0.1', () => {
                console.log(`[UDP Collector] Listening for logs on udp://127.0.0.1:${this.port}`);
                resolve();
            });
        });
    }
    stop() {
        try {
            this.socket.close();
        }
        catch (e) {
            // ignore
        }
    }
}
exports.UdpCollector = UdpCollector;
