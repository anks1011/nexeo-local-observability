import { LogEvent } from '@nexeo-local-observability/log-types';

export class RingBuffer {
  private buffer: LogEvent[];
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.buffer = [];
    this.maxSize = maxSize;
  }

  public add(event: LogEvent): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(event);
  }

  public getAll(): LogEvent[] {
    return [...this.buffer];
  }

  public clear(): void {
    this.buffer = [];
  }

  public size(): number {
    return this.buffer.length;
  }
}
