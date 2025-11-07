/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks user permissions based on roles
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { logger } from '../config/logger';

/**
 * Check if user has required role
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

      // Check if user has any of the allowed roles
      const userRoles = req.user.roles || [];
      const hasRole = allowedRoles.some(role => userRoles.includes(role));

      if (!hasRole) {
        logger.warn(`Access denied for user ${req.userId}. Required roles: ${allowedRoles.join(', ')}`);
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: allowedRoles,
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
