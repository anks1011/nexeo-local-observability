"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaddyManager = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
class CaddyManager {
    caddyProcess = null;
    configPath;
    constructor() {
        const configDir = (0, path_1.join)(process.cwd(), '.nexeo-observability');
        if (!(0, fs_1.existsSync)(configDir)) {
            (0, fs_1.mkdirSync)(configDir, { recursive: true });
        }
        this.configPath = (0, path_1.join)(configDir, 'Caddyfile');
    }
    async startProxy(targetPort) {
        this.writeCaddyfile(targetPort);
        return new Promise((resolve) => {
            this.caddyProcess = (0, child_process_1.spawn)('caddy', ['run', '--config', this.configPath], {
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            let started = false;
            this.caddyProcess.stdout?.on('data', () => {
                if (!started) {
                    started = true;
                    resolve('SUCCESS');
                }
            });
            this.caddyProcess.stderr?.on('data', (data) => {
                const output = data.toString();
                if (output.includes('bind: permission denied')) {
                    this.cleanup();
                    resolve('PERMISSION_DENIED');
                }
                else if (output.includes('bind: address already in use')) {
                    this.cleanup();
                    resolve('ALREADY_IN_USE');
                }
                else if (output.includes('serving initial configuration') || output.includes('successful')) {
                    if (!started) {
                        started = true;
                        resolve('SUCCESS');
                    }
                }
            });
            this.caddyProcess.on('error', () => {
                // Caddy might not be installed or other error
                resolve('TIMEOUT');
            });
            this.caddyProcess.on('exit', () => {
                if (!started)
                    resolve('TIMEOUT');
            });
            // Give it a timeout to start
            setTimeout(() => {
                if (!started)
                    resolve('TIMEOUT');
            }, 3000);
        });
    }
    cleanup() {
        if (this.caddyProcess) {
            try {
                this.caddyProcess.kill();
            }
            catch (e) {
                // Ignore kill errors
            }
            this.caddyProcess = null;
        }
    }
    writeCaddyfile(targetPort) {
        const content = `
nexeo-observability.local {
  tls internal
  reverse_proxy 127.0.0.1:${targetPort}
}
`;
        (0, fs_1.writeFileSync)(this.configPath, content.trim());
    }
}
exports.CaddyManager = CaddyManager;
