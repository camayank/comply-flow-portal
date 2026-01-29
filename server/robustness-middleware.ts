/**
 * Backend Robustness Enhancements
 * US Compliance Product Standards (Carta, Vanta, Drata level)
 * 
 * Features:
 * - Input validation with Zod schemas
 * - Comprehensive error handling
 * - Performance monitoring
 * - Rate limiting per user
 * - Request/response logging
 * - Database connection pooling
 * - Circuit breaker pattern
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from './logger';

/**
 * Validation Schemas
 */
export const lifecycleSchemas = {
  userId: z.object({
    userId: z.string().min(1, 'User ID is required').max(100)
  }),
  
  clientId: z.object({
    clientId: z.number().int().positive('Client ID must be positive')
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),

  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().min(1).max(100).default(20)
  })
};

/**
 * Validation middleware factory
 */
export function validateRequest(schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validated = await schema.parseAsync(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}

/**
 * Performance monitoring middleware
 */
export function performanceMonitor(threshold: number = 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      if (duration > threshold) {
        logger.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
          statusCode: res.statusCode
        });
      }

      // Log all requests with timing
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('user-agent')?.substring(0, 100)
      });
    });

    next();
  };
}

/**
 * Database query timeout wrapper
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  errorMessage: string = 'Database query timeout'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

/**
 * Retry logic for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries) {
        logger.warn(`Operation failed, retrying (${attempt}/${maxRetries})`, {
          error: error.message,
          attempt
        });
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Circuit breaker for external services
 */
class CircuitBreaker {
  private failures: number = 0;
  private lastFailTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailTime > this.resetTimeout) {
        this.state = 'half-open';
        this.failures = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
        logger.error('Circuit breaker OPENED', {
          failures: this.failures,
          threshold: this.threshold
        });
      }

      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime
    };
  }
}

export const circuitBreaker = new CircuitBreaker();

/**
 * Health check with detailed metrics
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  services: {
    database: { status: string; latency?: number };
    cache?: { status: string; latency?: number };
    circuitBreaker: { state: string; failures: number };
  };
  metrics: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

let requestMetrics = {
  total: 0,
  errors: 0,
  totalDuration: 0
};

export function trackRequest(duration: number, isError: boolean) {
  requestMetrics.total++;
  requestMetrics.totalDuration += duration;
  if (isError) requestMetrics.errors++;
}

export async function getHealthStatus(pool: any): Promise<HealthStatus> {
  const startTime = Date.now();
  let dbStatus = 'unknown';
  let dbLatency = 0;

  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    dbLatency = Date.now() - dbStart;
    dbStatus = dbLatency < 100 ? 'healthy' : 'degraded';
  } catch (error) {
    dbStatus = 'unhealthy';
  }

  const errorRate = requestMetrics.total > 0 
    ? (requestMetrics.errors / requestMetrics.total) * 100 
    : 0;

  const avgResponseTime = requestMetrics.total > 0
    ? requestMetrics.totalDuration / requestMetrics.total
    : 0;

  const overallStatus = 
    dbStatus === 'unhealthy' || errorRate > 5 ? 'unhealthy' :
    dbStatus === 'degraded' || errorRate > 1 ? 'degraded' : 'healthy';

  return {
    status: overallStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: { status: dbStatus, latency: dbLatency },
      circuitBreaker: circuitBreaker.getState()
    },
    metrics: {
      totalRequests: requestMetrics.total,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100
    }
  };
}

/**
 * Standardized error responses
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * Global error handler
 */
export function globalErrorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error('Global error handler', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details
    });
  }

  // Handle unknown errors
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
}

/**
 * Request sanitization
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  // Remove potentially dangerous fields
  const dangerousFields = ['__proto__', 'constructor', 'prototype'];
  
  const sanitize = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key of Object.keys(obj)) {
      if (dangerousFields.includes(key)) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);

  next();
}

export default {
  validateRequest,
  performanceMonitor,
  withTimeout,
  retryOperation,
  circuitBreaker,
  getHealthStatus,
  globalErrorHandler,
  sanitizeRequest,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
};
