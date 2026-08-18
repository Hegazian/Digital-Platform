import crypto from 'crypto';

export interface LogPayload {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  requestId?: string;
  timestamp: string;
  context?: Record<string, any>;
}

export class Logger {
  static format(level: LogPayload['level'], message: string, requestId?: string, context?: Record<string, any>): string {
    const payload: LogPayload = {
      level,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
    };

    return JSON.stringify(payload);
  }

  static info(message: string, requestId?: string, context?: Record<string, any>) {
    console.log(this.format('info', message, requestId, context));
  }

  static warn(message: string, requestId?: string, context?: Record<string, any>) {
    console.warn(this.format('warn', message, requestId, context));
  }

  static error(message: string, requestId?: string, context?: Record<string, any>) {
    console.error(this.format('error', message, requestId, context));
  }

  static debug(message: string, requestId?: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.format('debug', message, requestId, context));
    }
  }
}
