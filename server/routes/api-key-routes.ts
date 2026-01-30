/**
 * API Key Routes
 *
 * API endpoints for managing API keys:
 * - CRUD operations for API keys
 * - Usage statistics and monitoring
 * - Key rotation and revocation
 */

import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { apiKeys, apiUsageLogs } from '../../shared/enterprise-schema';
import { eq, desc, sql, gte, lte, and } from 'drizzle-orm';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from '../rbac-middleware';
import { apiKeyService, API_PERMISSIONS } from '../services/api-key-service';
import { logger } from '../logger';

const router = Router();

// ============================================================================
// API KEY AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Middleware to authenticate requests using API keys
 * Use this for API endpoints that should accept API key auth
 */
export async function apiKeyAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string;

  const rawKey = apiKeyHeader || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

  if (!rawKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  const result = await apiKeyService.validateKey(rawKey, [], ipAddress);

  if (!result.valid) {
    // Log failed attempt
    if (result.keyId) {
      await apiKeyService.logUsage(
        result.keyId,
        req.path,
        req.method,
        req.body,
        result.rateLimited ? 429 : 401,
        Date.now() - startTime,
        ipAddress,
        userAgent,
        result.error
      );
    }

    if (result.rateLimited) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    return res.status(401).json({ error: result.error || 'Invalid API key' });
  }

  // Attach API key info to request
  (req as any).apiKey = {
    id: result.keyId,
    tenantId: result.tenantId,
    permissions: result.permissions,
  };

  // Log usage after response
  res.on('finish', () => {
    if (result.keyId) {
      apiKeyService.logUsage(
        result.keyId,
        req.path,
        req.method,
        req.body,
        res.statusCode,
        Date.now() - startTime,
        ipAddress,
        userAgent
      ).catch(err => logger.error('Failed to log API usage:', err));
    }
  });

  next();
}

/**
 * Middleware to require specific API permissions
 */
export function requireApiPermissions(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = (req as any).apiKey;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const hasPermission = permissions.every(perm =>
      apiKey.permissions.includes(perm) || apiKey.permissions.includes('*')
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// ============================================================================
// API KEY MANAGEMENT ROUTES (Session Auth)
// ============================================================================

// All management routes require session auth
router.use(sessionAuthMiddleware);

/**
 * GET /api/api-keys
 * List all API keys for the current tenant
 */
router.get('/', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user?.tenantId || undefined;

    const keys = await apiKeyService.listKeys(tenantId);

    res.json({ apiKeys: keys });
  } catch (error) {
    logger.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/**
 * GET /api/api-keys/:id
 * Get a specific API key
 */
router.get('/:id', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const key = await apiKeyService.getKey(parseInt(id));

    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Get usage stats
    const stats = await apiKeyService.getUsageStats(parseInt(id), 30);

    res.json({ apiKey: key, stats });
  } catch (error) {
    logger.error('Error fetching API key:', error);
    res.status(500).json({ error: 'Failed to fetch API key' });
  }
});

/**
 * POST /api/api-keys
 * Create a new API key
 */
router.post('/', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      name,
      permissions = [],
      rateLimitPerMinute,
      rateLimitPerDay,
      allowedIps,
      expiresAt,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Validate permissions
    const validPermissions = Object.values(API_PERMISSIONS);
    const invalidPermissions = permissions.filter((p: string) =>
      !validPermissions.includes(p as any) && p !== '*' && !p.includes(':')
    );

    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        error: 'Invalid permissions',
        invalidPermissions,
        validPermissions,
      });
    }

    const { rawKey, keyInfo } = await apiKeyService.createKey({
      tenantId: user?.tenantId || undefined,
      name,
      permissions,
      rateLimitPerMinute,
      rateLimitPerDay,
      allowedIps,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: user?.id,
    });

    res.status(201).json({
      message: 'API key created successfully',
      apiKey: {
        ...keyInfo,
        rawKey, // Only shown once on creation
      },
      note: 'Save this key securely - it will not be shown again.',
    });
  } catch (error) {
    logger.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * PUT /api/api-keys/:id
 * Update an API key
 */
router.put('/:id', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      permissions,
      rateLimitPerMinute,
      rateLimitPerDay,
      allowedIps,
      expiresAt,
      isActive,
    } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (permissions !== undefined) updates.permissions = permissions;
    if (rateLimitPerMinute !== undefined) updates.rateLimitPerMinute = rateLimitPerMinute;
    if (rateLimitPerDay !== undefined) updates.rateLimitPerDay = rateLimitPerDay;
    if (allowedIps !== undefined) updates.allowedIps = allowedIps;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) updates.isActive = isActive;

    const key = await apiKeyService.updateKey(parseInt(id), updates);

    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({
      message: 'API key updated successfully',
      apiKey: key,
    });
  } catch (error) {
    logger.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

/**
 * DELETE /api/api-keys/:id
 * Revoke an API key
 */
router.delete('/:id', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const revoked = await apiKeyService.revokeKey(parseInt(id), user?.id);

    if (!revoked) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    logger.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * POST /api/api-keys/:id/regenerate
 * Regenerate an API key (creates new key, revokes old)
 */
router.post('/:id/regenerate', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const result = await apiKeyService.regenerateKey(parseInt(id), user?.id);

    if (!result) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({
      message: 'API key regenerated successfully',
      apiKey: {
        ...result.keyInfo,
        rawKey: result.rawKey, // Only shown once
      },
      note: 'Save this key securely - it will not be shown again. The old key has been revoked.',
    });
  } catch (error) {
    logger.error('Error regenerating API key:', error);
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
});

/**
 * POST /api/api-keys/:id/toggle
 * Toggle API key active status
 */
router.post('/:id/toggle', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const current = await apiKeyService.getKey(parseInt(id));
    if (!current) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const key = await apiKeyService.updateKey(parseInt(id), {
      isActive: !current.isActive,
    });

    res.json({
      message: `API key ${key?.isActive ? 'enabled' : 'disabled'} successfully`,
      isActive: key?.isActive,
    });
  } catch (error) {
    logger.error('Error toggling API key:', error);
    res.status(500).json({ error: 'Failed to toggle API key' });
  }
});

/**
 * GET /api/api-keys/:id/usage
 * Get detailed usage statistics for an API key
 */
router.get('/:id/usage', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { days = '30' } = req.query;

    const stats = await apiKeyService.getUsageStats(parseInt(id), parseInt(days as string));

    res.json({ usage: stats });
  } catch (error) {
    logger.error('Error fetching API key usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
});

/**
 * GET /api/api-keys/:id/logs
 * Get usage logs for an API key
 */
router.get('/:id/logs', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      startDate,
      endDate,
      status,
      limit = '100',
      offset = '0',
    } = req.query;

    const conditions = [eq(apiUsageLogs.apiKeyId, parseInt(id))];

    if (startDate) {
      conditions.push(gte(apiUsageLogs.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      conditions.push(lte(apiUsageLogs.createdAt, new Date(endDate as string)));
    }

    const logs = await db.select()
      .from(apiUsageLogs)
      .where(and(...conditions))
      .orderBy(desc(apiUsageLogs.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ logs });
  } catch (error) {
    logger.error('Error fetching API key logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * GET /api/api-keys/permissions
 * List available permissions
 */
router.get('/meta/permissions', async (req: Request, res: Response) => {
  try {
    const permissions = Object.entries(API_PERMISSIONS).map(([key, value]) => ({
      key,
      value,
      scope: value.split(':')[0],
      action: value.split(':')[1],
    }));

    // Group by scope
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.scope]) {
        acc[perm.scope] = [];
      }
      acc[perm.scope].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);

    res.json({
      permissions,
      scopes: Object.keys(grouped),
      grouped,
    });
  } catch (error) {
    logger.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * GET /api/api-keys/stats
 * Get overall API key statistics
 */
router.get('/meta/stats', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user?.tenantId || undefined;

    const keys = await apiKeyService.listKeys(tenantId);

    const activeKeys = keys.filter(k => k.isActive).length;
    const inactiveKeys = keys.length - activeKeys;
    const expiringSoon = keys.filter(k => {
      if (!k.expiresAt) return false;
      const daysUntilExpiry = (k.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    }).length;

    // Get total usage across all keys
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageLogs = await db.select({ count: sql<number>`count(*)` })
      .from(apiUsageLogs)
      .where(gte(apiUsageLogs.createdAt, thirtyDaysAgo));

    res.json({
      keys: {
        total: keys.length,
        active: activeKeys,
        inactive: inactiveKeys,
        expiringSoon,
      },
      usage: {
        last30Days: usageLogs[0]?.count || 0,
      },
    });
  } catch (error) {
    logger.error('Error fetching API key stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
