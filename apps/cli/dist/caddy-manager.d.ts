export declare class CaddyManager {
    private caddyProcess;
    private readonly configPath;
    constructor();
    startProxy(targetPort: number): Promise<'SUCCESS' | 'PERMISSION_DENIED' | 'ALREADY_IN_USE' | 'TIMEOUT'>;
    cleanup(): void;
    private writeCaddyfile;
}
