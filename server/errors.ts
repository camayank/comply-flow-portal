/**
 * Application Error Hierarchy
 *
 * Provides typed errors with proper HTTP status codes and error codes
 * for consistent error handling across the application.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, any>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
        ...(process.env.NODE_ENV !== 'production' && { stack: this.stack })
      }
    };
  }
}

// 400-level errors (Client errors)

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: Record<string, any>) {
    super(message, 400, 'BAD_REQUEST', true, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation Failed', details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', details?: Record<string, any>) {
    super(message, 401, 'UNAUTHORIZED', true, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', details?: Record<string, any>) {
    super(message, 403, 'FORBIDDEN', true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: Record<string, any>) {
    super(`${resource} not found`, 404, 'NOT_FOUND', true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests', details?: Record<string, any>) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, details);
  }
}

// 500-level errors (Server errors)

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: Record<string, any>) {
    super(message, 500, 'INTERNAL_ERROR', true, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', true, details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string, details?: Record<string, any>) {
    super(
      message || `External service ${service} failed`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      true,
      { service, ...details }
    );
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: Record<string, any>) {
    super(message, 503, 'SERVICE_UNAVAILABLE', true, details);
  }
}

// Helper function to determine if error is operational
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

// Error response formatter
export function formatErrorResponse(error: AppError | Error) {
  if (error instanceof AppError) {
    return error.toJSON();
  }

  // Unknown errors (non-AppError)
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    }
  };
}

// ============================================================================
// STANDARDIZED API RESPONSE HELPERS
// ============================================================================

/**
 * Standard success response format
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
}

/**
 * Standard error response format
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  meta?: ApiSuccessResponse['meta']
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Create a standardized paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): ApiSuccessResponse<T[]> {
  return {
    success: true,
    data: items,
    meta: {
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    },
  };
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, any>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

// Common error codes for consistency
export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // Authorization
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_EXISTS: 'RESOURCE_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
