/**
 * Global Error Handling Middleware
 *
 * Catches all errors thrown in route handlers and formats them consistently.
 * Integrates with Winston logger for error tracking.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { AppError, formatErrorResponse, isOperationalError } from './errors';
import { ZodError } from 'zod';

// Global error handler
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = (req as any).requestId || 'unknown';

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(error => ({
      field: error.path.join('.'),
      message: error.message
    }));

    logger.warn('Validation error', {
      requestId,
      method: req.method,
      path: req.path,
      errors: formattedErrors
    });

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          errors: formattedErrors
        }
      }
    });
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    const logLevel = err.statusCode >= 500 ? 'error' : 'warn';

    logger[logLevel]('Application error', {
      requestId,
      method: req.method,
      path: req.path,
      errorCode: err.code,
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
      stack: err.stack
    });

    return res.status(err.statusCode).json(formatErrorResponse(err));
  }

  // Handle unknown errors
  logger.error('Unexpected error', {
    requestId,
    method: req.method,
    path: req.path,
    message: err.message,
    stack: err.stack,
    name: err.name
  });

  // Don't expose internal error details in production
  const response = {
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  };

  res.status(500).json(response);
}

// 404 handler (for routes that don't exist)
export function notFoundHandler(req: Request, res: Response) {
  const requestId = (req as any).requestId || 'unknown';

  logger.warn('Route not found', {
    requestId,
    method: req.method,
    path: req.path
  });

  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
}

// Async handler wrapper to catch promise rejections
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Unhandled rejection handler
export function handleUnhandledRejection(reason: any, promise: Promise<any>) {
  logger.error('Unhandled Promise Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });

  // In production, gracefully shutdown
  if (process.env.NODE_ENV === 'production') {
    logger.error('Shutting down due to unhandled rejection');
    process.exit(1);
  }
}

// Uncaught exception handler
export function handleUncaughtException(error: Error) {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });

  // Always exit on uncaught exception (non-recoverable)
  logger.error('Application must restart due to uncaught exception');
  process.exit(1);
}
