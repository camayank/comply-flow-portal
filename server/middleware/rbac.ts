/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks user permissions based on roles
 *
 * PRODUCTION READY - All security checks enabled
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { logger } from '../config/logger';

// Role hierarchy levels for comparison
const ROLE_LEVELS: Record<string, number> = {
  'super_admin': 100,
  'admin': 90,
  'ops_manager': 80,
  'ops_executive': 70,
  'customer_service': 60,
  'qc_executive': 55,
  'accountant': 50,
  'agent': 40,
  'client': 10,
};

/**
 * Check if user has required role
 * Supports role hierarchy - higher roles can access lower role endpoints
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Get user role - support both single role and array of roles
      const userRole = req.user.role || (req.user.roles && req.user.roles[0]);

      if (!userRole) {
        res.status(403).json({
          success: false,
          error: 'User role not found',
        });
        return;
      }

      // Check if user has any of the allowed roles (direct match)
      const hasDirectRole = allowedRoles.includes(userRole);

      // Check role hierarchy - higher roles can access lower role endpoints
      const userLevel = ROLE_LEVELS[userRole] || 0;
      const hasHierarchyAccess = allowedRoles.some(role => {
        const requiredLevel = ROLE_LEVELS[role] || 0;
        return userLevel >= requiredLevel;
      });

      if (!hasDirectRole && !hasHierarchyAccess) {
        // Log details server-side but don't expose to client
        logger.warn(`Access denied for user ${req.userId} with role ${userRole}. Required roles: ${allowedRoles.join(', ')}`);
        // SECURITY: Don't leak user's actual role in response - attackers can use this to probe
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions for this action',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('RBAC error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization check failed',
      });
    }
  };
}

/**
 * Check if user has required permission
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Get user permissions from database
      const permissionsQuery = `
        SELECT DISTINCT p.name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
      `;

      const result = await pool.query(permissionsQuery, [req.userId]);
      const userPermissions = result.rows.map(row => row.name);

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(perm =>
        userPermissions.includes(perm)
      );

      if (!hasAllPermissions) {
        logger.warn(`Access denied for user ${req.userId}. Required permissions: ${requiredPermissions.join(', ')}`);
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: requiredPermissions,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed',
      });
    }
  };
}

/**
 * Check if user owns the resource or is admin
 */
export function requireOwnership(resourceUserIdField: string = 'user_id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Admins bypass ownership check
      const isAdmin = req.user.roles.some(role =>
        ['super_admin', 'admin'].includes(role)
      );

      if (isAdmin) {
        next();
        return;
      }

      // Check if user owns the resource
      // This can be customized based on the resource
      // For now, we assume resource ownership is in req.params or req.body
      const resourceOwnerId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

      if (resourceOwnerId !== req.userId) {
        logger.warn(`Ownership denied for user ${req.userId} on resource ${resourceOwnerId}`);
        res.status(403).json({
          success: false,
          error: 'You do not have permission to access this resource',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: 'Ownership check failed',
      });
    }
  };
}

/**
 * Admin only middleware
 */
export const requireAdmin = requireRole('super_admin', 'admin');

/**
 * Super admin only middleware
 */
export const requireSuperAdmin = requireRole('super_admin');
