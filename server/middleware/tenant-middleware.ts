/**
 * Tenant Middleware
 *
 * Middleware for multi-tenancy support:
 * - Tenant identification from request
 * - Tenant context injection
 * - Tenant status validation
 * - Feature gate checks
 * - Usage limit enforcement
 */

import { Request, Response, NextFunction } from 'express';
import { tenantService, type TenantInfo } from '../services/tenant-service';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  features: Record<string, boolean>;
  settings: Record<string, any>;
  limits: {
    maxUsers: number;
    maxEntities: number;
    maxStorageGb: number;
  };
}

export interface TenantRequest extends Request {
  tenant?: TenantContext;
  tenantId?: string;
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Extract tenant from request
 * Checks (in order):
 * 1. X-Tenant-ID header
 * 2. x-tenant-slug header
 * 3. Subdomain (for custom domains)
 * 4. Query parameter ?tenantId=
 * 5. User's associated tenant (from session)
 */
export async function extractTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let tenant: TenantInfo | null = null;

    // 1. Check X-Tenant-ID header
    const tenantIdHeader = req.headers['x-tenant-id'] as string;
    if (tenantIdHeader) {
      tenant = await tenantService.getTenant(tenantIdHeader);
    }

    // 2. Check x-tenant-slug header
    if (!tenant) {
      const tenantSlugHeader = req.headers['x-tenant-slug'] as string;
      if (tenantSlugHeader) {
        tenant = await tenantService.getTenantBySlug(tenantSlugHeader);
      }
    }

    // 3. Check subdomain
    if (!tenant) {
      const host = req.headers.host || '';
      const subdomain = extractSubdomain(host);
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        tenant = await tenantService.getTenantBySlug(subdomain);
      }
    }

    // 4. Check custom domain
    if (!tenant) {
      const host = req.headers.host || '';
      if (host && !host.includes('localhost') && !host.includes('digicomply')) {
        tenant = await tenantService.getTenantByDomain(host);
      }
    }

    // 5. Query parameter tenant selection - REMOVED FOR SECURITY
    // Query parameters are user-controlled and could allow cross-tenant access
    // Tenant should only come from authenticated session

    // 5. Check user session (moved from 6)
    if (!tenant) {
      const user = (req as any).user;
      if (user?.tenantId) {
        tenant = await tenantService.getTenant(user.tenantId);
      }
    }

    if (tenant) {
      req.tenant = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        features: tenant.features,
        settings: tenant.settings,
        limits: {
          maxUsers: tenant.maxUsers,
          maxEntities: tenant.maxEntities,
          maxStorageGb: tenant.maxStorageGb,
        },
      };
      req.tenantId = tenant.id;
    }

    next();
  } catch (error) {
    logger.error('Error extracting tenant:', error);
    next();
  }
}

/**
 * Require tenant context
 * Returns 400 if no tenant is identified
 */
export function requireTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant) {
    res.status(400).json({
      error: 'Tenant context required',
      hint: 'Provide X-Tenant-ID header, use tenant subdomain, or log in',
    });
    return;
  }

  next();
}

/**
 * Validate tenant status
 * Blocks requests to suspended/inactive tenants
 */
export async function validateTenantStatus(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.tenantId) {
    next();
    return;
  }

  try {
    const tenant = await tenantService.getTenant(req.tenantId);

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    if (tenant.status === 'suspended') {
      res.status(403).json({
        error: 'Tenant account suspended',
        reason: 'Please contact support to resolve this issue',
      });
      return;
    }

    if (tenant.status !== 'active') {
      res.status(403).json({
        error: 'Tenant account inactive',
        status: tenant.status,
      });
      return;
    }

    if (tenant.subscriptionStatus !== 'active') {
      // Allow read-only access for expired subscriptions
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        res.status(402).json({
          error: 'Subscription expired',
          hint: 'Please update your payment method to continue',
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Error validating tenant status:', error);
    res.status(500).json({ error: 'Failed to validate tenant status' });
  }
}

/**
 * Check if a feature is enabled for the tenant
 */
export function requireFeature(feature: string) {
  return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.tenantId) {
      next();
      return;
    }

    try {
      const isEnabled = await tenantService.isFeatureEnabled(req.tenantId, feature);

      if (!isEnabled) {
        res.status(403).json({
          error: 'Feature not available',
          feature,
          hint: 'Upgrade your plan to access this feature',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Error checking feature:', error);
      res.status(500).json({ error: 'Failed to check feature availability' });
    }
  };
}

/**
 * Enforce user limit
 */
export async function enforceUserLimit(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.tenantId) {
    next();
    return;
  }

  try {
    const canAdd = await tenantService.canAddUser(req.tenantId);

    if (!canAdd) {
      res.status(403).json({
        error: 'User limit reached',
        hint: 'Upgrade your plan to add more users',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error enforcing user limit:', error);
    res.status(500).json({ error: 'Failed to check user limit' });
  }
}

/**
 * Enforce entity limit
 */
export async function enforceEntityLimit(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.tenantId) {
    next();
    return;
  }

  try {
    const canAdd = await tenantService.canAddEntity(req.tenantId);

    if (!canAdd) {
      res.status(403).json({
        error: 'Entity limit reached',
        hint: 'Upgrade your plan to add more business entities',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error enforcing entity limit:', error);
    res.status(500).json({ error: 'Failed to check entity limit' });
  }
}

/**
 * Add tenant context to response headers
 */
export function addTenantHeaders(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.tenant) {
    res.setHeader('X-Tenant-ID', req.tenant.id);
    res.setHeader('X-Tenant-Slug', req.tenant.slug);
  }

  next();
}

/**
 * Log tenant context for debugging
 */
export function logTenantContext(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.tenant) {
    logger.debug(`Request with tenant context: ${req.tenant.slug} (${req.tenant.id})`);
  } else {
    logger.debug('Request without tenant context');
  }

  next();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract subdomain from host
 */
function extractSubdomain(host: string): string | null {
  // Remove port
  const hostname = host.split(':')[0];

  // Split by dots
  const parts = hostname.split('.');

  // Check for subdomain patterns
  // app.digicomply.com -> app
  // tenant-name.digicomply.io -> tenant-name
  if (parts.length >= 3) {
    return parts[0];
  }

  // For localhost or IP addresses, no subdomain
  return null;
}

/**
 * Composite middleware that applies all tenant checks
 */
export function tenantMiddleware() {
  return [
    extractTenant,
    addTenantHeaders,
    validateTenantStatus,
  ];
}

/**
 * Strict tenant middleware that requires tenant context
 */
export function strictTenantMiddleware() {
  return [
    extractTenant,
    requireTenant,
    addTenantHeaders,
    validateTenantStatus,
  ];
}
