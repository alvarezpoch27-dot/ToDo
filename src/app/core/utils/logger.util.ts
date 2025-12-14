/**
 * Logger con control por environment
 */

export interface LogLevel {
  error: number;
  warn: number;
  info: number;
  debug: number;
}

const LOG_LEVELS: LogLevel = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export class Logger {
  private minLevel: number;
  private prefix: string;

  constructor(prefix: string, debugEnabled: boolean = false) {
    this.prefix = `[${prefix}]`;
    this.minLevel = debugEnabled ? LOG_LEVELS.debug : LOG_LEVELS.info;
  }

  error(message: string, error?: unknown): void {
    if (this.minLevel >= LOG_LEVELS.error) {
      console.error(this.prefix, message, error);
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.minLevel >= LOG_LEVELS.warn) {
      console.warn(this.prefix, message, data);
    }
  }

  info(message: string, data?: unknown): void {
    if (this.minLevel >= LOG_LEVELS.info) {
      console.log(this.prefix, message, data);
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.minLevel >= LOG_LEVELS.debug) {
      console.debug(this.prefix, message, data);
    }
  }
}
