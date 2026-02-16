/**
 * Structured Logger
 *
 * Production-ready logging with structured output
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: number;
  tenantId?: number;
  action?: string;
  duration?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class StructuredLogger {
  private minLevel: LogLevel = 'info';
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && this.levelPriority[envLevel] !== undefined) {
      this.minLevel = envLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
      // JSON format for production (easy to parse by log aggregators)
      return JSON.stringify(entry);
    }

    // Human-readable format for development
    const timestamp = entry.timestamp.split('T')[1].replace('Z', '');
    const levelColor = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';

    let output = `${timestamp} ${levelColor[entry.level]}${entry.level.toUpperCase().padEnd(5)}${reset} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack && process.env.NODE_ENV !== 'production') {
        output += `\n${entry.error.stack.split('\n').slice(1).join('\n')}`;
      }
    }

    return output;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const output = this.formatEntry(entry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  // Request logging helper
  request(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `${method} ${path} ${statusCode}`, {
      ...context,
      duration,
      statusCode,
    });
  }

  // Database operation logging
  db(operation: string, table: string, duration: number, context?: LogContext): void {
    this.debug(`DB ${operation} ${table}`, { ...context, duration });
  }

  // Cache operation logging
  cache(operation: string, key: string, hit: boolean, context?: LogContext): void {
    this.debug(`Cache ${operation} ${hit ? 'HIT' : 'MISS'}`, { ...context, key });
  }

  // Queue operation logging
  queue(queue: string, operation: string, jobId?: string, context?: LogContext): void {
    this.info(`Queue ${queue} ${operation}`, { ...context, jobId });
  }

  // Security event logging
  security(event: string, context?: LogContext): void {
    this.warn(`Security: ${event}`, context);
  }

  // Audit logging (always logs regardless of level)
  audit(action: string, context: LogContext): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `AUDIT: ${action}`,
      context,
    };
    console.log(this.formatEntry(entry));
  }
}

// Singleton logger instance
export const logger = new StructuredLogger();

// Express request logging middleware
import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Capture original end
  const originalEnd = res.end.bind(res);

  // Override res.end to log request
  (res.end as any) = function(chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
    const duration = Date.now() - startTime;

    logger.request(req.method, req.path, res.statusCode, duration, {
      requestId: (req as any).requestId,
      userId: (req as any).user?.id,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });

    return originalEnd(chunk, encoding as BufferEncoding, cb);
  };

  next();
}
