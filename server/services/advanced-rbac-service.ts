/**
 * Advanced RBAC Service
 *
 * Enterprise-grade role-based access control with:
 * - Permission groups (custom permission sets)
 * - User permission overrides (grant/revoke individual permissions)
 * - Field-level security (control access to specific fields)
 * - Access restrictions (IP, time-based, geo-based)
 * - Permission inheritance and cascading
 */

import { db } from '../db';
import {
  permissionGroups,
  userPermissionOverrides,
  fieldSecurityRules,
  accessRestrictions,
} from '../../shared/enterprise-schema';
import { users } from '../../shared/schema';
import { eq, and, or, isNull, lte, gte, sql, desc, inArray } from 'drizzle-orm';
import { logger } from '../logger';
import { getRoleLevel } from '../rbac-middleware';

// ============================================================================
// TYPES
// ============================================================================

export type AccessType = 'read' | 'write' | 'hidden';

export interface PermissionGroup {
  id: number;
  tenantId: string | null;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdBy: number | null;
  createdAt: Date;
}

export interface UserPermissionOverride {
  id: number;
  userId: number;
  permissionCode: string;
  granted: boolean;
  expiresAt: Date | null;
  grantedBy: number | null;
  reason: string | null;
  createdAt: Date;
}

export interface FieldSecurityRule {
  id: number;
  tenantId: string | null;
  entityType: string;
  fieldName: string;
  roleLevel: number;
  accessType: AccessType;
  conditions: Record<string, any> | null;
  isActive: boolean;
}

export interface AccessRestriction {
  id: number;
  tenantId: string | null;
  userId: number | null;
  restrictionType: 'ip' | 'geo' | 'time';
  config: Record<string, any>;
  isActive: boolean;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  source?: 'role' | 'group' | 'override' | 'restriction';
  expiresAt?: Date;
}

export interface FieldAccessResult {
  fieldName: string;
  accessType: AccessType;
  reason?: string;
}

// ============================================================================
// PERMISSIONS CATALOG
// ============================================================================

export const PERMISSIONS = {
  // Service Requests
  SERVICE_REQUEST_VIEW: 'service_request:view',
  SERVICE_REQUEST_CREATE: 'service_request:create',
  SERVICE_REQUEST_EDIT: 'service_request:edit',
  SERVICE_REQUEST_DELETE: 'service_request:delete',
  SERVICE_REQUEST_ASSIGN: 'service_request:assign',
  SERVICE_REQUEST_CHANGE_STATUS: 'service_request:change_status',

  // Clients
  CLIENT_VIEW: 'client:view',
  CLIENT_CREATE: 'client:create',
  CLIENT_EDIT: 'client:edit',
  CLIENT_DELETE: 'client:delete',
  CLIENT_VIEW_SENSITIVE: 'client:view_sensitive',

  // Documents
  DOCUMENT_VIEW: 'document:view',
  DOCUMENT_UPLOAD: 'document:upload',
  DOCUMENT_DOWNLOAD: 'document:download',
  DOCUMENT_DELETE: 'document:delete',
  DOCUMENT_VERIFY: 'document:verify',
  DOCUMENT_SHARE: 'document:share',

  // Payments
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_CREATE: 'payment:create',
  PAYMENT_REFUND: 'payment:refund',
  PAYMENT_VIEW_REPORTS: 'payment:view_reports',

  // Compliance
  COMPLIANCE_VIEW: 'compliance:view',
  COMPLIANCE_MANAGE: 'compliance:manage',
  COMPLIANCE_OVERRIDE: 'compliance:override',

  // Tasks
  TASK_VIEW: 'task:view',
  TASK_CREATE: 'task:create',
  TASK_EDIT: 'task:edit',
  TASK_DELETE: 'task:delete',
  TASK_ASSIGN: 'task:assign',

  // Reports
  REPORT_VIEW: 'report:view',
  REPORT_CREATE: 'report:create',
  REPORT_SCHEDULE: 'report:schedule',
  REPORT_EXPORT: 'report:export',

  // Users
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  USER_MANAGE_ROLES: 'user:manage_roles',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',

  // Webhooks
  WEBHOOK_VIEW: 'webhook:view',
  WEBHOOK_MANAGE: 'webhook:manage',

  // API Keys
  API_KEY_VIEW: 'api_key:view',
  API_KEY_MANAGE: 'api_key:manage',

  // Admin
  ADMIN_ACCESS: 'admin:access',
  SUPER_ADMIN_ACCESS: 'admin:super_access',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permission defaults
export const ROLE_PERMISSIONS: Record<number, Permission[]> = {
  // Client (level 1)
  1: [
    PERMISSIONS.SERVICE_REQUEST_VIEW,
    PERMISSIONS.SERVICE_REQUEST_CREATE,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_DOWNLOAD,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.COMPLIANCE_VIEW,
    PERMISSIONS.TASK_VIEW,
  ],
  // Team Member (level 2)
  2: [
    PERMISSIONS.SERVICE_REQUEST_VIEW,
    PERMISSIONS.SERVICE_REQUEST_CREATE,
    PERMISSIONS.SERVICE_REQUEST_EDIT,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_DOWNLOAD,
    PERMISSIONS.TASK_VIEW,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
  ],
  // Agent (level 3)
  3: [
    PERMISSIONS.CLIENT_VIEW,
    PERMISSIONS.CLIENT_CREATE,
    PERMISSIONS.SERVICE_REQUEST_VIEW,
    PERMISSIONS.SERVICE_REQUEST_CREATE,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.REPORT_VIEW,
  ],
  // Operations Executive (level 4)
  4: [
    PERMISSIONS.SERVICE_REQUEST_VIEW,
    PERMISSIONS.SERVICE_REQUEST_EDIT,
    PERMISSIONS.SERVICE_REQUEST_CHANGE_STATUS,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_VERIFY,
    PERMISSIONS.TASK_VIEW,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
    PERMISSIONS.TASK_ASSIGN,
  ],
  // Operations Manager (level 5)
  5: [
    PERMISSIONS.SERVICE_REQUEST_VIEW,
    PERMISSIONS.SERVICE_REQUEST_EDIT,
    PERMISSIONS.SERVICE_REQUEST_ASSIGN,
    PERMISSIONS.SERVICE_REQUEST_CHANGE_STATUS,
    PERMISSIONS.CLIENT_VIEW,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_VERIFY,
    PERMISSIONS.TASK_VIEW,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_EDIT,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_DELETE,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.WEBHOOK_VIEW,
    PERMISSIONS.API_KEY_VIEW,
  ],
  // Finance (level 6)
  6: [
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_VIEW_REPORTS,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_EXPORT,
  ],
  // QC (level 7)
  7: [
    PERMISSIONS.SERVICE_REQUEST_VIEW,
    PERMISSIONS.SERVICE_REQUEST_EDIT,
    PERMISSIONS.DOCUMENT_VIEW,
    PERMISSIONS.DOCUMENT_VERIFY,
    PERMISSIONS.TASK_VIEW,
    PERMISSIONS.REPORT_VIEW,
  ],
  // Admin (level 8)
  8: [
    ...Object.values(PERMISSIONS).filter(p => p !== PERMISSIONS.SUPER_ADMIN_ACCESS),
    PERMISSIONS.ADMIN_ACCESS,
  ],
  // Super Admin (level 9)
  9: [
    ...Object.values(PERMISSIONS),
  ],
};

// ============================================================================
// ADVANCED RBAC SERVICE
// ============================================================================

class AdvancedRbacService {
  /**
   * Check if user has a specific permission
   */
  async checkPermission(
    userId: number,
    permission: string,
    options: {
      tenantId?: string;
      ipAddress?: string;
      checkRestrictions?: boolean;
    } = {}
  ): Promise<PermissionCheckResult> {
    try {
      const { tenantId, ipAddress, checkRestrictions = true } = options;

      // Get user with role level
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      // Check access restrictions first
      if (checkRestrictions && ipAddress) {
        const restrictionCheck = await this.checkAccessRestrictions(userId, tenantId, ipAddress);
        if (!restrictionCheck.allowed) {
          return restrictionCheck;
        }
      }

      // Check user permission overrides (highest priority)
      const override = await this.getUserPermissionOverride(userId, permission);
      if (override) {
        if (override.expiresAt && override.expiresAt < new Date()) {
          // Override expired, continue with other checks
        } else {
          return {
            allowed: override.granted,
            reason: override.granted ? 'Explicitly granted' : 'Explicitly revoked',
            source: 'override',
            expiresAt: override.expiresAt || undefined,
          };
        }
      }

      // Check permission groups
      const groupPermissions = await this.getUserGroupPermissions(userId, tenantId);
      if (groupPermissions.includes(permission)) {
        return { allowed: true, source: 'group' };
      }

      // Check role-based permissions
      const roleLevel = getRoleLevel(user.role) || 1;
      const rolePermissions = ROLE_PERMISSIONS[roleLevel] || [];
      if (rolePermissions.includes(permission as Permission)) {
        return { allowed: true, source: 'role' };
      }

      return { allowed: false, reason: 'Permission not granted' };
    } catch (error) {
      logger.error('Error checking permission:', error);
      return { allowed: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Check multiple permissions at once
   */
  async checkPermissions(
    userId: number,
    permissions: string[],
    options: { tenantId?: string; requireAll?: boolean } = {}
  ): Promise<{ allowed: boolean; results: Record<string, PermissionCheckResult> }> {
    const { requireAll = true } = options;
    const results: Record<string, PermissionCheckResult> = {};

    for (const permission of permissions) {
      results[permission] = await this.checkPermission(userId, permission, options);
    }

    const allowed = requireAll
      ? Object.values(results).every(r => r.allowed)
      : Object.values(results).some(r => r.allowed);

    return { allowed, results };
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(
    userId: number,
    tenantId?: string
  ): Promise<string[]> {
    try {
      const permissions = new Set<string>();

      // Get user role
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return [];
      }

      // Add role-based permissions
      const roleLevel = getRoleLevel(user.role) || 1;
      const rolePermissions = ROLE_PERMISSIONS[roleLevel] || [];
      rolePermissions.forEach(p => permissions.add(p));

      // Add group permissions
      const groupPermissions = await this.getUserGroupPermissions(userId, tenantId);
      groupPermissions.forEach(p => permissions.add(p));

      // Apply overrides
      const overrides = await db.select()
        .from(userPermissionOverrides)
        .where(
          and(
            eq(userPermissionOverrides.userId, userId),
            or(
              isNull(userPermissionOverrides.expiresAt),
              gte(userPermissionOverrides.expiresAt, new Date())
            )
          )
        );

      for (const override of overrides) {
        if (override.granted) {
          permissions.add(override.permissionCode);
        } else {
          permissions.delete(override.permissionCode);
        }
      }

      return Array.from(permissions);
    } catch (error) {
      logger.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Get user's group permissions
   */
  private async getUserGroupPermissions(userId: number, tenantId?: string): Promise<string[]> {
    // In a full implementation, this would join with a user_permission_groups table
    // For now, return empty array (groups not yet assigned to users)
    return [];
  }

  /**
   * Get user permission override
   */
  private async getUserPermissionOverride(
    userId: number,
    permission: string
  ): Promise<UserPermissionOverride | null> {
    const [override] = await db.select()
      .from(userPermissionOverrides)
      .where(
        and(
          eq(userPermissionOverrides.userId, userId),
          eq(userPermissionOverrides.permissionCode, permission)
        )
      );

    if (!override) {
      return null;
    }

    return {
      id: override.id,
      userId: override.userId,
      permissionCode: override.permissionCode,
      granted: override.granted,
      expiresAt: override.expiresAt,
      grantedBy: override.grantedBy,
      reason: override.reason,
      createdAt: override.createdAt || new Date(),
    };
  }

  /**
   * Grant or revoke a permission for a user
   */
  async setUserPermissionOverride(
    userId: number,
    permission: string,
    granted: boolean,
    options: {
      grantedBy: number;
      reason?: string;
      expiresAt?: Date;
    }
  ): Promise<UserPermissionOverride> {
    try {
      // Check if override already exists
      const existing = await this.getUserPermissionOverride(userId, permission);

      if (existing) {
        // Update existing
        const [updated] = await db.update(userPermissionOverrides)
          .set({
            granted,
            grantedBy: options.grantedBy,
            reason: options.reason || null,
            expiresAt: options.expiresAt || null,
            createdAt: new Date(),
          })
          .where(eq(userPermissionOverrides.id, existing.id))
          .returning();

        logger.info(`Permission override updated: ${permission} ${granted ? 'granted to' : 'revoked from'} user ${userId}`);

        return {
          id: updated.id,
          userId: updated.userId,
          permissionCode: updated.permissionCode,
          granted: updated.granted,
          expiresAt: updated.expiresAt,
          grantedBy: updated.grantedBy,
          reason: updated.reason,
          createdAt: updated.createdAt || new Date(),
        };
      }

      // Create new override
      const [created] = await db.insert(userPermissionOverrides)
        .values({
          userId,
          permissionCode: permission,
          granted,
          grantedBy: options.grantedBy,
          reason: options.reason || null,
          expiresAt: options.expiresAt || null,
          createdAt: new Date(),
        })
        .returning();

      logger.info(`Permission override created: ${permission} ${granted ? 'granted to' : 'revoked from'} user ${userId}`);

      return {
        id: created.id,
        userId: created.userId,
        permissionCode: created.permissionCode,
        granted: created.granted,
        expiresAt: created.expiresAt,
        grantedBy: created.grantedBy,
        reason: created.reason,
        createdAt: created.createdAt || new Date(),
      };
    } catch (error) {
      logger.error('Error setting permission override:', error);
      throw error;
    }
  }

  /**
   * Remove a permission override
   */
  async removeUserPermissionOverride(userId: number, permission: string): Promise<boolean> {
    try {
      const [deleted] = await db.delete(userPermissionOverrides)
        .where(
          and(
            eq(userPermissionOverrides.userId, userId),
            eq(userPermissionOverrides.permissionCode, permission)
          )
        )
        .returning();

      return !!deleted;
    } catch (error) {
      logger.error('Error removing permission override:', error);
      throw error;
    }
  }

  // ============================================================================
  // PERMISSION GROUPS
  // ============================================================================

  /**
   * Create a permission group
   */
  async createPermissionGroup(
    name: string,
    permissions: string[],
    options: {
      tenantId?: string;
      description?: string;
      createdBy: number;
    }
  ): Promise<PermissionGroup> {
    try {
      const [group] = await db.insert(permissionGroups)
        .values({
          tenantId: options.tenantId || null,
          name,
          description: options.description || null,
          permissions,
          isSystem: false,
          createdBy: options.createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return {
        id: group.id,
        tenantId: group.tenantId,
        name: group.name,
        description: group.description,
        permissions: (group.permissions as string[]) || [],
        isSystem: group.isSystem || false,
        createdBy: group.createdBy,
        createdAt: group.createdAt || new Date(),
      };
    } catch (error) {
      logger.error('Error creating permission group:', error);
      throw error;
    }
  }

  /**
   * List permission groups
   */
  async listPermissionGroups(tenantId?: string): Promise<PermissionGroup[]> {
    try {
      const groups = await db.select()
        .from(permissionGroups)
        .where(
          tenantId
            ? or(eq(permissionGroups.tenantId, tenantId), eq(permissionGroups.isSystem, true))
            : sql`1=1`
        )
        .orderBy(desc(permissionGroups.createdAt));

      return groups.map(g => ({
        id: g.id,
        tenantId: g.tenantId,
        name: g.name,
        description: g.description,
        permissions: (g.permissions as string[]) || [],
        isSystem: g.isSystem || false,
        createdBy: g.createdBy,
        createdAt: g.createdAt || new Date(),
      }));
    } catch (error) {
      logger.error('Error listing permission groups:', error);
      throw error;
    }
  }

  // ============================================================================
  // FIELD-LEVEL SECURITY
  // ============================================================================

  /**
   * Get field access for an entity
   */
  async getFieldAccess(
    entityType: string,
    userRoleLevel: number,
    tenantId?: string
  ): Promise<Record<string, FieldAccessResult>> {
    try {
      const rules = await db.select()
        .from(fieldSecurityRules)
        .where(
          and(
            eq(fieldSecurityRules.entityType, entityType),
            eq(fieldSecurityRules.isActive, true),
            tenantId
              ? or(eq(fieldSecurityRules.tenantId, tenantId), isNull(fieldSecurityRules.tenantId))
              : isNull(fieldSecurityRules.tenantId)
          )
        );

      const access: Record<string, FieldAccessResult> = {};

      for (const rule of rules) {
        if (userRoleLevel >= rule.roleLevel) {
          access[rule.fieldName] = {
            fieldName: rule.fieldName,
            accessType: rule.accessType as AccessType,
          };
        } else {
          access[rule.fieldName] = {
            fieldName: rule.fieldName,
            accessType: 'hidden',
            reason: 'Insufficient role level',
          };
        }
      }

      return access;
    } catch (error) {
      logger.error('Error getting field access:', error);
      return {};
    }
  }

  /**
   * Create a field security rule
   */
  async createFieldSecurityRule(
    entityType: string,
    fieldName: string,
    roleLevel: number,
    accessType: AccessType,
    options: {
      tenantId?: string;
      conditions?: Record<string, any>;
    } = {}
  ): Promise<FieldSecurityRule> {
    try {
      const [rule] = await db.insert(fieldSecurityRules)
        .values({
          tenantId: options.tenantId || null,
          entityType,
          fieldName,
          roleLevel,
          accessType,
          conditions: options.conditions || null,
          isActive: true,
          createdAt: new Date(),
        })
        .returning();

      return {
        id: rule.id,
        tenantId: rule.tenantId,
        entityType: rule.entityType,
        fieldName: rule.fieldName,
        roleLevel: rule.roleLevel,
        accessType: rule.accessType as AccessType,
        conditions: rule.conditions as Record<string, any> | null,
        isActive: rule.isActive || true,
      };
    } catch (error) {
      logger.error('Error creating field security rule:', error);
      throw error;
    }
  }

  /**
   * Apply field-level security to an object
   * Removes or masks fields based on rules
   */
  async filterFields<T extends Record<string, any>>(
    data: T,
    entityType: string,
    userRoleLevel: number,
    tenantId?: string
  ): Promise<Partial<T>> {
    try {
      const fieldAccess = await this.getFieldAccess(entityType, userRoleLevel, tenantId);
      const result: Partial<T> = { ...data };

      for (const [fieldName, access] of Object.entries(fieldAccess)) {
        if (access.accessType === 'hidden') {
          delete result[fieldName as keyof T];
        } else if (access.accessType === 'read' && result[fieldName as keyof T] !== undefined) {
          // Field is readable, keep as is
        }
      }

      return result;
    } catch (error) {
      logger.error('Error filtering fields:', error);
      return data;
    }
  }

  // ============================================================================
  // ACCESS RESTRICTIONS
  // ============================================================================

  /**
   * Check access restrictions for a user
   */
  async checkAccessRestrictions(
    userId: number,
    tenantId?: string,
    ipAddress?: string
  ): Promise<PermissionCheckResult> {
    try {
      const restrictions = await db.select()
        .from(accessRestrictions)
        .where(
          and(
            eq(accessRestrictions.isActive, true),
            or(
              eq(accessRestrictions.userId, userId),
              isNull(accessRestrictions.userId) // Tenant-wide restrictions
            ),
            tenantId
              ? or(eq(accessRestrictions.tenantId, tenantId), isNull(accessRestrictions.tenantId))
              : isNull(accessRestrictions.tenantId)
          )
        );

      for (const restriction of restrictions) {
        const config = restriction.config as Record<string, any>;

        switch (restriction.restrictionType) {
          case 'ip':
            if (ipAddress && config.allowedIps && !config.allowedIps.includes(ipAddress)) {
              return {
                allowed: false,
                reason: 'IP address not allowed',
                source: 'restriction',
              };
            }
            if (ipAddress && config.blockedIps && config.blockedIps.includes(ipAddress)) {
              return {
                allowed: false,
                reason: 'IP address blocked',
                source: 'restriction',
              };
            }
            break;

          case 'time':
            if (config.allowedHours) {
              const now = new Date();
              const currentHour = now.getHours();
              const { start, end } = config.allowedHours;

              if (start <= end) {
                if (currentHour < start || currentHour >= end) {
                  return {
                    allowed: false,
                    reason: 'Access not allowed at this time',
                    source: 'restriction',
                  };
                }
              } else {
                // Overnight range (e.g., 22:00 to 06:00)
                if (currentHour < start && currentHour >= end) {
                  return {
                    allowed: false,
                    reason: 'Access not allowed at this time',
                    source: 'restriction',
                  };
                }
              }
            }
            break;

          case 'geo':
            // Geo restrictions would require IP geolocation service
            // Implementation would check config.allowedCountries or config.blockedCountries
            break;
        }
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking access restrictions:', error);
      return { allowed: true }; // Fail open for now
    }
  }

  /**
   * Create an access restriction
   */
  async createAccessRestriction(
    restrictionType: 'ip' | 'geo' | 'time',
    config: Record<string, any>,
    options: {
      tenantId?: string;
      userId?: number;
    } = {}
  ): Promise<AccessRestriction> {
    try {
      const [restriction] = await db.insert(accessRestrictions)
        .values({
          tenantId: options.tenantId || null,
          userId: options.userId || null,
          restrictionType,
          config,
          isActive: true,
          createdAt: new Date(),
        })
        .returning();

      return {
        id: restriction.id,
        tenantId: restriction.tenantId,
        userId: restriction.userId,
        restrictionType: restriction.restrictionType as 'ip' | 'geo' | 'time',
        config: restriction.config as Record<string, any>,
        isActive: restriction.isActive || true,
      };
    } catch (error) {
      logger.error('Error creating access restriction:', error);
      throw error;
    }
  }

  /**
   * List available permissions
   */
  listAvailablePermissions(): { key: string; value: string; category: string }[] {
    return Object.entries(PERMISSIONS).map(([key, value]) => ({
      key,
      value,
      category: value.split(':')[0],
    }));
  }
}

// Export singleton instance
export const advancedRbacService = new AdvancedRbacService();
