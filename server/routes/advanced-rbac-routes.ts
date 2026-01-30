/**
 * Advanced RBAC Routes
 *
 * API endpoints for advanced role-based access control:
 * - Permission checks
 * - Permission overrides
 * - Permission groups
 * - Field-level security
 * - Access restrictions
 */

import { Router, Request, Response } from 'express';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from '../rbac-middleware';
import {
  advancedRbacService,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../services/advanced-rbac-service';
import { extractTenant, type TenantRequest } from '../middleware/tenant-middleware';
import { logger } from '../logger';

const router = Router();

// Apply tenant extraction
router.use(extractTenant);
router.use(sessionAuthMiddleware);

// ============================================================================
// PERMISSION CHECKS
// ============================================================================

/**
 * GET /api/rbac/permissions
 * Get all permissions for the current user
 */
router.get('/permissions', async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;

    const permissions = await advancedRbacService.getUserPermissions(user.id, req.tenantId);

    res.json({
      userId: user.id,
      roleLevel: user.roleLevel,
      permissions,
    });
  } catch (error) {
    logger.error('Error getting user permissions:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

/**
 * POST /api/rbac/check
 * Check if user has specific permission(s)
 */
router.post('/check', async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { permission, permissions, requireAll = true } = req.body;

    if (permission) {
      // Single permission check
      const result = await advancedRbacService.checkPermission(user.id, permission, {
        tenantId: req.tenantId,
        ipAddress: req.ip,
      });

      res.json({
        permission,
        ...result,
      });
    } else if (permissions && Array.isArray(permissions)) {
      // Multiple permissions check
      const result = await advancedRbacService.checkPermissions(user.id, permissions, {
        tenantId: req.tenantId,
        requireAll,
      });

      res.json(result);
    } else {
      res.status(400).json({ error: 'Either permission or permissions array is required' });
    }
  } catch (error) {
    logger.error('Error checking permissions:', error);
    res.status(500).json({ error: 'Failed to check permissions' });
  }
});

/**
 * GET /api/rbac/users/:userId/permissions
 * Get permissions for a specific user (admin only)
 */
router.get('/users/:userId/permissions', requireMinimumRole(USER_ROLES.ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const permissions = await advancedRbacService.getUserPermissions(
      parseInt(userId),
      req.tenantId
    );

    res.json({
      userId: parseInt(userId),
      permissions,
    });
  } catch (error) {
    logger.error('Error getting user permissions:', error);
    res.status(500).json({ error: 'Failed to get user permissions' });
  }
});

// ============================================================================
// PERMISSION OVERRIDES
// ============================================================================

/**
 * POST /api/rbac/users/:userId/overrides
 * Grant or revoke a permission for a user
 */
router.post('/users/:userId/overrides', requireMinimumRole(USER_ROLES.ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const adminUser = (req as any).user;
    const { userId } = req.params;
    const { permission, granted, reason, expiresAt } = req.body;

    if (!permission || granted === undefined) {
      return res.status(400).json({ error: 'Permission and granted are required' });
    }

    const override = await advancedRbacService.setUserPermissionOverride(
      parseInt(userId),
      permission,
      granted,
      {
        grantedBy: adminUser.id,
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      }
    );

    res.json({
      message: `Permission ${granted ? 'granted' : 'revoked'} successfully`,
      override,
    });
  } catch (error) {
    logger.error('Error setting permission override:', error);
    res.status(500).json({ error: 'Failed to set permission override' });
  }
});

/**
 * DELETE /api/rbac/users/:userId/overrides/:permission
 * Remove a permission override
 */
router.delete('/users/:userId/overrides/:permission', requireMinimumRole(USER_ROLES.ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const { userId, permission } = req.params;

    const removed = await advancedRbacService.removeUserPermissionOverride(
      parseInt(userId),
      permission
    );

    if (!removed) {
      return res.status(404).json({ error: 'Override not found' });
    }

    res.json({ message: 'Override removed successfully' });
  } catch (error) {
    logger.error('Error removing permission override:', error);
    res.status(500).json({ error: 'Failed to remove override' });
  }
});

// ============================================================================
// PERMISSION GROUPS
// ============================================================================

/**
 * GET /api/rbac/groups
 * List permission groups
 */
router.get('/groups', requireMinimumRole(USER_ROLES.ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const groups = await advancedRbacService.listPermissionGroups(req.tenantId);

    res.json({ groups });
  } catch (error) {
    logger.error('Error listing permission groups:', error);
    res.status(500).json({ error: 'Failed to list permission groups' });
  }
});

/**
 * POST /api/rbac/groups
 * Create a permission group
 */
router.post('/groups', requireMinimumRole(USER_ROLES.ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, description, permissions } = req.body;

    if (!name || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Name and permissions array are required' });
    }

    const group = await advancedRbacService.createPermissionGroup(name, permissions, {
      tenantId: req.tenantId,
      description,
      createdBy: user.id,
    });

    res.status(201).json({
      message: 'Permission group created successfully',
      group,
    });
  } catch (error) {
    logger.error('Error creating permission group:', error);
    res.status(500).json({ error: 'Failed to create permission group' });
  }
});

// ============================================================================
// FIELD-LEVEL SECURITY
// ============================================================================

/**
 * GET /api/rbac/field-access/:entityType
 * Get field access rules for an entity type
 */
router.get('/field-access/:entityType', async (req: TenantRequest, res: Response) => {
  try {
    const user = (req as any).user;
    const { entityType } = req.params;

    const fieldAccess = await advancedRbacService.getFieldAccess(
      entityType,
      user.roleLevel || 1,
      req.tenantId
    );

    res.json({
      entityType,
      roleLevel: user.roleLevel,
      fieldAccess,
    });
  } catch (error) {
    logger.error('Error getting field access:', error);
    res.status(500).json({ error: 'Failed to get field access' });
  }
});

/**
 * POST /api/rbac/field-rules
 * Create a field security rule
 */
router.post('/field-rules', requireMinimumRole(USER_ROLES.ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const { entityType, fieldName, roleLevel, accessType, conditions } = req.body;

    if (!entityType || !fieldName || roleLevel === undefined || !accessType) {
      return res.status(400).json({
        error: 'entityType, fieldName, roleLevel, and accessType are required',
      });
    }

    if (!['read', 'write', 'hidden'].includes(accessType)) {
      return res.status(400).json({
        error: 'accessType must be one of: read, write, hidden',
      });
    }

    const rule = await advancedRbacService.createFieldSecurityRule(
      entityType,
      fieldName,
      roleLevel,
      accessType,
      {
        tenantId: req.tenantId,
        conditions,
      }
    );

    res.status(201).json({
      message: 'Field security rule created successfully',
      rule,
    });
  } catch (error) {
    logger.error('Error creating field security rule:', error);
    res.status(500).json({ error: 'Failed to create field security rule' });
  }
});

// ============================================================================
// ACCESS RESTRICTIONS
// ============================================================================

/**
 * POST /api/rbac/restrictions
 * Create an access restriction
 */
router.post('/restrictions', requireMinimumRole(USER_ROLES.ADMIN), async (req: TenantRequest, res: Response) => {
  try {
    const { restrictionType, config, userId } = req.body;

    if (!restrictionType || !config) {
      return res.status(400).json({ error: 'restrictionType and config are required' });
    }

    if (!['ip', 'geo', 'time'].includes(restrictionType)) {
      return res.status(400).json({
        error: 'restrictionType must be one of: ip, geo, time',
      });
    }

    const restriction = await advancedRbacService.createAccessRestriction(
      restrictionType,
      config,
      {
        tenantId: req.tenantId,
        userId,
      }
    );

    res.status(201).json({
      message: 'Access restriction created successfully',
      restriction,
    });
  } catch (error) {
    logger.error('Error creating access restriction:', error);
    res.status(500).json({ error: 'Failed to create access restriction' });
  }
});

// ============================================================================
// METADATA
// ============================================================================

/**
 * GET /api/rbac/available-permissions
 * List all available permissions
 */
router.get('/available-permissions', async (req: Request, res: Response) => {
  try {
    const permissions = advancedRbacService.listAvailablePermissions();

    // Group by category
    const categories = permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, typeof permissions>);

    res.json({
      permissions,
      categories: Object.keys(categories),
      byCategory: categories,
    });
  } catch (error) {
    logger.error('Error listing available permissions:', error);
    res.status(500).json({ error: 'Failed to list permissions' });
  }
});

/**
 * GET /api/rbac/roles
 * List role levels and their default permissions
 */
router.get('/roles', async (req: Request, res: Response) => {
  try {
    const roles = Object.entries(ROLE_PERMISSIONS).map(([level, permissions]) => ({
      level: parseInt(level),
      name: getRoleName(parseInt(level)),
      permissions,
      permissionCount: permissions.length,
    }));

    res.json({ roles });
  } catch (error) {
    logger.error('Error listing roles:', error);
    res.status(500).json({ error: 'Failed to list roles' });
  }
});

// Helper function to get role name
function getRoleName(level: number): string {
  const names: Record<number, string> = {
    1: 'Client',
    2: 'Team Member',
    3: 'Agent',
    4: 'Operations Executive',
    5: 'Operations Manager',
    6: 'Finance',
    7: 'QC',
    8: 'Admin',
    9: 'Super Admin',
  };
  return names[level] || 'Unknown';
}

export default router;
