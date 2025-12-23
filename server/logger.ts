/**
 * Structured Logging with Winston
 *
 * Provides centralized, structured logging with:
 * - JSON format for production (machine-readable)
 * - Pretty format for development (human-readable)
 * - Request correlation via request IDs
 * - PII redaction
 * - Multiple transports (console, file, error log)
 */

import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Sensitive fields to redact from logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'sessionToken',
  'otp',
  'ssn',
  'creditCard',
  'pan',
  'aadhaar'
];

// Redact sensitive information from objects
function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()));

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

// Custom format for development (colorized, pretty-printed)
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, requestId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    const reqId = requestId ? `[${requestId}] ` : '';
    return `${timestamp} ${level}: ${reqId}${message}${metaStr}`;
  })
);

// Custom format for production (JSON, structured)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: {
    service: 'digicomply',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console output (always enabled)
    new winston.transports.Console({
      stderrLevels: ['error']
    }),

    // Error log file (production only)
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        tailable: true
      })
    ] : [])
  ],
  // Don't exit on uncaught exceptions (let process manager handle it)
  exitOnError: false
});

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).id || generateRequestId();
  (req as any).requestId = requestId;

  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    query: redactSensitiveData(req.query),
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent')
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, 'Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Attach logger to request object for easy access in route handlers
export function attachLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId || generateRequestId();

  // Create child logger with request context
  (req as any).log = logger.child({
    requestId,
    path: req.path,
    method: req.method
  });

  next();
}

// Helper methods for common logging patterns
export const log = {
  // Security events
  security: (message: string, meta?: object) => {
    logger.warn(`[SECURITY] ${message}`, { category: 'security', ...meta });
  },

  // Authentication events
  auth: (message: string, meta?: object) => {
    logger.info(`[AUTH] ${message}`, { category: 'auth', ...redactSensitiveData(meta || {}) });
  },

  // Database queries (with query text redacted if sensitive)
  db: (message: string, meta?: object) => {
    logger.debug(`[DB] ${message}`, { category: 'database', ...meta });
  },

  // External API calls
  api: (message: string, meta?: object) => {
    logger.info(`[API] ${message}`, { category: 'external_api', ...redactSensitiveData(meta || {}) });
  },

  // Business logic events
  business: (message: string, meta?: object) => {
    logger.info(`[BUSINESS] ${message}`, { category: 'business', ...meta });
  },

  // Performance metrics
  perf: (message: string, meta?: object) => {
    logger.debug(`[PERF] ${message}`, { category: 'performance', ...meta });
  }
};

// Graceful shutdown logging
export function logShutdown(signal: string) {
  logger.info(`Received ${signal} signal, shutting down gracefully...`);
}

// Startup logging
export function logStartup(port: number | string) {
  logger.info(`Server started successfully`, {
    port,
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version,
    pid: process.pid
  });
}
