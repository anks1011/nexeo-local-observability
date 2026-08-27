"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessManager = void 0;
const child_process_1 = require("child_process");
const readline_1 = __importDefault(require("readline"));
class ProcessManager {
    childProcess = null;
    parser;
    server;
    constructor(server, parser) {
        this.server = server;
        this.parser = parser;
    }
    start(repoPath, command = 'pnpm', args = ['dev']) {
        console.log(`[Observability] Starting process in ${repoPath}: ${command} ${args.join(' ')}`);
        const cleanEnv = { ...process.env };
        for (const key in cleanEnv) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.startsWith('npm_') || lowerKey.startsWith('pnpm_') || lowerKey === 'init_cwd') {
                delete cleanEnv[key];
            }
        }
        const port = this.server.getPort();
        if (port) {
            const fs = require('fs');
            const path = require('path');
            const os = require('os');
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexeo-obs-'));
            const fuserPath = path.join(tmpDir, 'fuser');
            // Workaround for nexeo-platform killing our dashboard port with fuser -k
            fs.writeFileSync(fuserPath, `#!/bin/bash\nif [[ "$*" == *"${port}/tcp"* ]]; then\n  echo "[Observability] Intercepted fuser call for our own port ${port}"\n  exit 0\nfi\nexport PATH="${cleanEnv.PATH || '/usr/bin:/bin'}"\nexec fuser "$@"\n`);
            fs.chmodSync(fuserPath, 0o755);
            cleanEnv.PATH = `${tmpDir}:${cleanEnv.PATH || ''}`;
        }
        this.childProcess = (0, child_process_1.spawn)(command, args, {
            cwd: repoPath,
            env: cleanEnv,
            stdio: ['inherit', 'pipe', 'pipe'] // Capture stdout/stderr, inherit stdin
        });
        if (this.childProcess.stdout) {
            const rlStdout = readline_1.default.createInterface({ input: this.childProcess.stdout });
            rlStdout.on('line', (line) => {
                console.log(line); // Forward to terminal
                const event = this.parser.parseLine(line, 'stdout');
                if (event) {
                    this.server.broadcastEvent(event);
                }
            });
        }
        if (this.childProcess.stderr) {
            const rlStderr = readline_1.default.createInterface({ input: this.childProcess.stderr });
            rlStderr.on('line', (line) => {
                console.error(line); // Forward to terminal
                const event = this.parser.parseLine(line, 'stderr');
                if (event) {
                    this.server.broadcastEvent(event);
                }
            });
        }
        this.childProcess.on('exit', (code, signal) => {
            console.log(`[Observability] Child process exited with code ${code} (signal ${signal})`);
            process.exit(code ?? 0);
        });
        this.childProcess.on('error', (err) => {
            console.error(`[Observability] Failed to start child process: ${err.message}`);
        });
        // Cleanup on exit
        process.on('SIGINT', () => this.cleanup());
        process.on('SIGTERM', () => this.cleanup());
    }
    cleanup() {
        if (this.childProcess && !this.childProcess.killed) {
            console.log('\n[Observability] Terminating child process...');
            this.childProcess.kill('SIGINT');
        }
    }
}
exports.ProcessManager = ProcessManager;
