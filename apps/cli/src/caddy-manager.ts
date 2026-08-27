import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class CaddyManager {
  private caddyProcess: ChildProcess | null = null;
  private readonly configPath: string;

  constructor() {
    const configDir = join(process.cwd(), '.nexeo-observability');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    this.configPath = join(configDir, 'Caddyfile');
  }

  public async startProxy(targetPort: number): Promise<'SUCCESS' | 'PERMISSION_DENIED' | 'ALREADY_IN_USE' | 'TIMEOUT'> {
    this.writeCaddyfile(targetPort);

    return new Promise((resolve) => {
      this.caddyProcess = spawn('caddy', ['run', '--config', this.configPath], {
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
        } else if (output.includes('bind: address already in use')) {
          this.cleanup();
          resolve('ALREADY_IN_USE');
        } else if (output.includes('serving initial configuration') || output.includes('successful')) {
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
        if (!started) resolve('TIMEOUT');
      });

      // Give it a timeout to start
      setTimeout(() => {
        if (!started) resolve('TIMEOUT');
      }, 3000);
    });
  }

  public cleanup() {
    if (this.caddyProcess) {
      try {
        this.caddyProcess.kill();
      } catch (e) {
        // Ignore kill errors
      }
      this.caddyProcess = null;
    }
  }

  private writeCaddyfile(targetPort: number) {
    const content = `
nexeo-observability.local {
  tls internal
  reverse_proxy 127.0.0.1:${targetPort}
}
`;
    writeFileSync(this.configPath, content.trim());
  }
}
