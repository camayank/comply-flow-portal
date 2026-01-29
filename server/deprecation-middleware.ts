/**
 * API Deprecation Middleware
 * 
 * Adds deprecation headers to V1 endpoints, guiding clients
 * to migrate to V2 before sunset date.
 */

import { Request, Response, NextFunction } from 'express';

interface DeprecationConfig {
  replacementUrl?: string;
  deprecationDate: string;
  sunsetDate: string;
  message?: string;
}

/**
 * Deprecation configurations for V1 endpoints
 */
const DEPRECATION_MAP: Record<string, DeprecationConfig> = {
  // Client Portal V1 → Lifecycle API V2
  '/api/v1/client/dashboard': {
    replacementUrl: '/api/v2/lifecycle/dashboard',
    deprecationDate: '2026-01-22',
    sunsetDate: '2026-06-01',
    message: 'Use the new Lifecycle Dashboard API for enhanced features'
  },
  '/api/v1/client/services': {
    replacementUrl: '/api/v2/lifecycle/services-detail',
    deprecationDate: '2026-01-22',
    sunsetDate: '2026-06-01',
    message: 'Use the new Services Detail API with 96-service catalog'
  },
  '/api/v1/client/documents': {
    replacementUrl: '/api/v2/lifecycle/documents-detail',
    deprecationDate: '2026-01-22',
    sunsetDate: '2026-06-01',
    message: 'Use the new Documents API with category management'
  },
  '/api/v1/client/compliance-calendar': {
    replacementUrl: '/api/v2/lifecycle/compliance-detail',
    deprecationDate: '2026-01-22',
    sunsetDate: '2026-06-01',
    message: 'Use the new Compliance Detail API with risk scoring'
  },
  
  // Catch-all for any V1 client endpoint
  '/api/v1/client/*': {
    replacementUrl: '/api/v2/lifecycle/',
    deprecationDate: '2026-01-22',
    sunsetDate: '2026-06-01',
    message: 'V1 Client Portal APIs are deprecated. Migrate to V2 Lifecycle APIs'
  }
};

/**
 * Middleware to add deprecation headers to responses
 */
export function deprecationMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  
  // Check for exact match first
  let config = DEPRECATION_MAP[path];
  
  // If no exact match, check for wildcard patterns
  if (!config) {
    const wildcardPattern = Object.keys(DEPRECATION_MAP).find(pattern => {
      if (pattern.endsWith('/*')) {
        const basePattern = pattern.slice(0, -2);
        return path.startsWith(basePattern);
      }
      return false;
    });
    
    if (wildcardPattern) {
      config = DEPRECATION_MAP[wildcardPattern];
    }
  }
  
  // If this endpoint is deprecated, add headers
  if (config) {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-Deprecation-Date', config.deprecationDate);
    res.setHeader('X-Sunset-Date', config.sunsetDate);
    
    if (config.replacementUrl) {
      res.setHeader('X-API-Replacement', config.replacementUrl);
    }
    
    if (config.message) {
      res.setHeader('X-Deprecation-Message', config.message);
    }
    
    // Add Link header following RFC 8288
    if (config.replacementUrl) {
      res.setHeader('Link', `<${config.replacementUrl}>; rel="successor-version"`);
    }
    
    // Log deprecation usage for monitoring
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  Deprecated API called', {
        path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        replacement: config.replacementUrl,
        sunsetDate: config.sunsetDate
      });
    }
  }
  
  next();
}

/**
 * Response interceptor to add deprecation warnings to JSON responses
 */
export function deprecationResponseInterceptor(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Check if this endpoint is deprecated
    const isDeprecated = res.getHeader('X-API-Deprecated') === 'true';
    
    if (isDeprecated && typeof data === 'object' && data !== null) {
      // Add deprecation warning to response body (non-intrusive)
      data._deprecation = {
        deprecated: true,
        deprecationDate: res.getHeader('X-Deprecation-Date'),
        sunsetDate: res.getHeader('X-Sunset-Date'),
        replacement: res.getHeader('X-API-Replacement'),
        message: res.getHeader('X-Deprecation-Message')
      };
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Helper to check if we're past sunset date (for automated blocking)
 */
export function isSunset(sunsetDate: string): boolean {
  return new Date() > new Date(sunsetDate);
}

/**
 * Middleware to block requests after sunset date
 */
export function sunsetEnforcer(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  const config = DEPRECATION_MAP[path];
  
  if (config && isSunset(config.sunsetDate)) {
    return res.status(410).json({
      error: 'Gone',
      message: `This API endpoint was sunset on ${config.sunsetDate}`,
      replacement: config.replacementUrl,
      documentation: 'https://docs.digicomply.io/migration/v1-to-v2'
    });
  }
  
  next();
}

/**
 * Get deprecation statistics (for monitoring dashboard)
 */
export function getDeprecationStats() {
  return {
    totalDeprecatedEndpoints: Object.keys(DEPRECATION_MAP).length,
    endpoints: Object.entries(DEPRECATION_MAP).map(([path, config]) => ({
      path,
      sunsetDate: config.sunsetDate,
      daysUntilSunset: Math.ceil(
        (new Date(config.sunsetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
      isSunset: isSunset(config.sunsetDate),
      replacement: config.replacementUrl
    }))
  };
}

export default deprecationMiddleware;
