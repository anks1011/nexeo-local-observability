import { readFileSync } from 'fs';

export class HostManager {
  public static checkLocalDomainExists(): boolean {
    try {
      const content = readFileSync('/etc/hosts', 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        // Strip comments
        const cleanLine = line.split('#')[0].trim();
        if (cleanLine.includes('nexeo-observability.local')) {
          const parts = cleanLine.split(/\s+/);
          // E.g., '127.0.0.1' and 'nexeo-observability.local'
          if (parts[0] === '127.0.0.1' && parts.includes('nexeo-observability.local')) {
            return true;
          }
        }
      }
    } catch (e) {
      // Ignored
    }
    return false;
  }
}
