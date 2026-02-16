/**
 * API Versioning Infrastructure
 *
 * Provides versioned API routes with:
 * - All new routes under /api/v1
 * - Backward compatibility for legacy /api/* routes
 * - Deprecation warnings via response headers
 * - Future-ready for /api/v2, /api/v3, etc.
 */

import { Request, Response, NextFunction, Router, Express } from 'express';
import { logger } from './logger';

export const CURRENT_API_VERSION = 'v1';
export const SUPPORTED_VERSIONS = ['v1', 'v2'] as const;
export type ApiVersion = typeof SUPPORTED_VERSIONS[number];

/**
 * Create a versioned router
 * Usage: const router = createVersionedRouter('v1');
 */
export function createVersionedRouter(version: ApiVersion = 'v1'): Router {
  const router = Router();

  // Add version metadata to all routes in this router
  router.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).apiVersion = version;
    res.setHeader('X-API-Version', version);
    next();
  });

  return router;
}

/**
 * Mount versioned routes on the app
 * This mounts routes under /api/v1, /api/v2, etc.
 */
export function mountVersionedRoutes(
  app: Express,
  version: ApiVersion,
  setupRoutes: (router: Router) => void | Promise<void>
) {
  const versionedRouter = createVersionedRouter(version);
  setupRoutes(versionedRouter);
  app.use(`/api/${version}`, versionedRouter);

  logger.info(`Mounted API version ${version}`, {
    basePath: `/api/${version}`
  });
}

/**
 * Backward compatibility middleware
 * Redirects /api/* requests to /api/v1/* with deprecation warning
 */
export function createBackwardCompatibilityMiddleware(targetVersion: ApiVersion = 'v1'): any {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;

    // Skip if already versioned (starts with /api/v1, /api/v2, etc.)
    if (/^\/api\/v\d+/.test(path)) {
      return next();
    }

    // Skip health checks and special endpoints
    if (path === '/health' || path === '/ready' || path === '/live' || path.startsWith('/health/')) {
      return next();
    }

    // Skip file management routes (already properly prefixed)
    if (path.startsWith('/api/files/')) {
      return next();
    }

    // Skip auth routes (not versioned)
    if (path.startsWith('/api/auth/')) {
      return next();
    }

    // Skip v2 routes (already versioned)
    if (path.startsWith('/api/v2/')) {
      return next();
    }

    // Skip ops routes (operations API)
    if (path.startsWith('/api/ops/')) {
      return next();
    }

    // Skip admin routes
    if (path.startsWith('/api/admin/')) {
      return next();
    }

    // Skip client registration routes
    if (path.startsWith('/api/client/register')) {
      return next();
    }

    // Skip payment routes
    if (path.startsWith('/api/payments/')) {
      return next();
    }

    // Skip referral and wallet routes
    if (path.startsWith('/api/referrals/') || path.startsWith('/api/wallet/')) {
      return next();
    }

    // Skip service request routes (main CRUD)
    if (path.startsWith('/api/service-requests')) {
      return next();
    }

    // Skip services routes (public catalog)
    if (path === '/api/services' || path.startsWith('/api/services/')) {
      return next();
    }

    // Only handle /api/* routes (not versioned yet)
    if (path.startsWith('/api/')) {
      // Add deprecation warning header
      res.setHeader('X-API-Deprecated', 'true');
      res.setHeader('X-API-Deprecation-Info', `Please migrate to /api/${targetVersion}${path.replace('/api', '')}`);
      res.setHeader('X-API-Sunset-Date', '2026-01-01'); // Example sunset date

      // Log deprecation usage for metrics
      logger.warn('Legacy API endpoint accessed', {
        path,
        method: req.method,
        userAgent: req.get('user-agent'),
        ip: req.ip,
        suggestedPath: `/api/${targetVersion}${path.replace('/api', '')}`,
        requestId: (req as any).requestId
      });

      // Rewrite URL to versioned endpoint
      req.url = `/api/${targetVersion}${path.replace('/api', '')}`;
      return next();
    }

    // Not an API route, pass through
    next();
  };
}

/**
 * Version-aware error response
 * Formats errors differently based on API version
 */
export function versionedErrorResponse(
  req: Request,
  error: any,
  defaultStatusCode: number = 500
) {
  const version = (req as any).apiVersion || 'legacy';

  // v1 format: Consistent error object
  if (version === 'v1') {
    return {
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An error occurred',
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      }
    };
  }

  // Legacy format: Simple error message
  return {
    success: false,
    error: error.message || 'An error occurred'
  };
}

/**
 * Get API version from request
 */
export function getApiVersion(req: Request): ApiVersion | 'legacy' {
  return (req as any).apiVersion || 'legacy';
}

/**
 * Check if client is using deprecated API
 */
export function isDeprecatedApiUsage(req: Request): boolean {
  const path = req.path;
  return path.startsWith('/api/') && !/^\/api\/v\d+/.test(path);
}

/**
 * API versioning middleware factory
 * Returns middleware that adds version info to requests
 */
export function apiVersionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;

    // Extract version from path (/api/v1, /api/v2, etc.)
    const versionMatch = path.match(/^\/api\/(v\d+)/);

    if (versionMatch) {
      const version = versionMatch[1] as ApiVersion;

      if (SUPPORTED_VERSIONS.includes(version)) {
        (req as any).apiVersion = version;
        res.setHeader('X-API-Version', version);
      } else {
        // Unsupported version
        return res.status(400).json({
          error: {
            code: 'UNSUPPORTED_API_VERSION',
            message: `API version ${version} is not supported`,
            supportedVersions: SUPPORTED_VERSIONS
          }
        });
      }
    }

    next();
  };
}

/**
 * Version compatibility check middleware
 * Ensures client's required version is supported
 */
export function requireApiVersion(minVersion: ApiVersion) {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentVersion = getApiVersion(req);

    if (currentVersion === 'legacy') {
      return res.status(400).json({
        error: {
          code: 'API_VERSION_REQUIRED',
          message: `This endpoint requires API version ${minVersion} or higher`,
          hint: `Use /api/${minVersion}/* instead of /api/*`
        }
      });
    }

    // Simple version comparison (works for v1, v2, v3, etc.)
    const current = parseInt(currentVersion.substring(1));
    const min = parseInt(minVersion.substring(1));

    if (current < min) {
      return res.status(400).json({
        error: {
          code: 'API_VERSION_TOO_OLD',
          message: `This endpoint requires API version ${minVersion} or higher`,
          currentVersion,
          minimumVersion: minVersion
        }
      });
    }

    next();
  };
}
