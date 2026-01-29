import type { Express, Response } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { auditLogs, activityLogs, systemConfiguration, users } from "@shared/schema";
import { eq, desc, and, gte, lte, like, or, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, PERMISSIONS, type AuthenticatedRequest } from "./rbac-middleware";

// Helper to create audit log entry
async function createAuditLog(
  userId: number,
  action: string,
  entityType: string,
  entityId?: string,
  oldValue?: any,
  newValue?: any,
  req?: AuthenticatedRequest
) {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId: entityId || null,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      ipAddress: req?.ip || req?.headers['x-forwarded-for']?.toString() || null,
      userAgent: req?.headers['user-agent'] || null,
      sessionId: req?.sessionID || null,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// Role permissions matrix (can be stored in DB later)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.USER_MANAGEMENT_READ,
    PERMISSIONS.USER_MANAGEMENT_CREATE,
    PERMISSIONS.USER_MANAGEMENT_UPDATE,
    PERMISSIONS.CLIENT_MANAGEMENT_READ,
    PERMISSIONS.CLIENT_MANAGEMENT_CREATE,
    PERMISSIONS.CLIENT_MANAGEMENT_UPDATE,
    PERMISSIONS.CLIENT_MANAGEMENT_DELETE,
    PERMISSIONS.SERVICE_MANAGEMENT_READ,
    PERMISSIONS.SERVICE_MANAGEMENT_CREATE,
    PERMISSIONS.SERVICE_MANAGEMENT_UPDATE,
    PERMISSIONS.SERVICE_MANAGEMENT_ASSIGN,
    PERMISSIONS.SERVICE_MANAGEMENT_COMPLETE,
    PERMISSIONS.OPS_ASSIGN_TASK,
    PERMISSIONS.OPS_QC_REVIEW,
    PERMISSIONS.OPS_DELIVERY,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_EDIT,
    PERMISSIONS.SYSTEM_CONFIG_VIEW,
  ],
  ops_manager: [
    PERMISSIONS.CLIENT_MANAGEMENT_READ,
    PERMISSIONS.CLIENT_MANAGEMENT_UPDATE,
    PERMISSIONS.SERVICE_MANAGEMENT_READ,
    PERMISSIONS.SERVICE_MANAGEMENT_ASSIGN,
    PERMISSIONS.SERVICE_MANAGEMENT_COMPLETE,
    PERMISSIONS.OPS_ASSIGN_TASK,
    PERMISSIONS.OPS_QC_REVIEW,
    PERMISSIONS.OPS_DELIVERY,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.WORKFLOW_VIEW,
  ],
  ops_executive: [
    PERMISSIONS.CLIENT_MANAGEMENT_READ,
    PERMISSIONS.SERVICE_MANAGEMENT_READ,
    PERMISSIONS.SERVICE_MANAGEMENT_ASSIGN,
    PERMISSIONS.SERVICE_MANAGEMENT_COMPLETE,
    PERMISSIONS.OPS_ASSIGN_TASK,
    PERMISSIONS.OPS_QC_REVIEW,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  customer_service: [
    PERMISSIONS.CLIENT_MANAGEMENT_READ,
    PERMISSIONS.CLIENT_MANAGEMENT_UPDATE,
    PERMISSIONS.SERVICE_MANAGEMENT_READ,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  qc_executive: [
    PERMISSIONS.SERVICE_MANAGEMENT_READ,
    PERMISSIONS.OPS_QC_REVIEW,
    PERMISSIONS.OPS_DELIVERY,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  accountant: [
    PERMISSIONS.CLIENT_MANAGEMENT_READ,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,
  ],
  agent: [
    PERMISSIONS.CLIENT_MANAGEMENT_READ,
    PERMISSIONS.SERVICE_MANAGEMENT_READ,
  ],
  client: [
    PERMISSIONS.SERVICE_MANAGEMENT_READ,
  ],
};

export function registerSuperAdminRoutes(app: Express) {
  // Get system stats
  app.get(
    "/api/super-admin/stats",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const allUsers = await storage.getAllUsers();
        
        const activeUsers = allUsers.filter(u => u.isActive).length;
        const adminUsers = allUsers.filter(u => ['super_admin', 'admin'].includes(u.role)).length;
        const clientUsers = allUsers.filter(u => u.role === 'client').length;
        const agentUsers = allUsers.filter(u => u.role === 'agent').length;

        res.json({
          totalUsers: allUsers.length,
          activeUsers,
          adminUsers,
          clientUsers,
          agentUsers,
          recentActivity: 0, // To be implemented with activity logging
          systemHealth: 'Optimal',
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch system stats" });
      }
    }
  );

  // Get all users with optional filters
  app.get(
    "/api/super-admin/users",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { search, role } = req.query;
        let users = await storage.getAllUsers();

        if (search) {
          const searchLower = (search as string).toLowerCase();
          users = users.filter(u => 
            u.username?.toLowerCase().includes(searchLower) ||
            u.email?.toLowerCase().includes(searchLower) ||
            u.fullName?.toLowerCase().includes(searchLower)
          );
        }

        if (role) {
          users = users.filter(u => u.role === role);
        }

        // Remove sensitive data
        const sanitizedUsers = users.map(user => ({
          ...user,
          password: undefined,
          twoFactorSecret: undefined,
        }));

        res.json(sanitizedUsers);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch users" });
      }
    }
  );

  // Create new user
  app.post(
    "/api/super-admin/users",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { username, email, password, fullName, phone, role, department } = req.body;

        if (!username || !email || !password || !role) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        // Check if username or email already exists
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ error: "Username already exists" });
        }

        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await storage.createUser({
          username,
          email,
          password: hashedPassword,
          fullName,
          phone: phone || null,
          role,
          department: department || null,
          isActive: true,
          createdBy: req.user?.userId || null,
        });

        // Create audit log for user creation
        await createAuditLog(
          req.user?.userId || 0,
          'user_created',
          'user',
          String(newUser.id),
          null,
          { username, email, role, fullName, department },
          req
        );

        // Remove sensitive data
        const sanitizedUser = {
          ...newUser,
          password: undefined,
          twoFactorSecret: undefined,
        };

        res.status(201).json(sanitizedUser);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to create user" });
      }
    }
  );

  // Update user
  app.patch(
    "/api/super-admin/users/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { email, fullName, phone, role, department } = req.body;

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const oldValues = { email: user.email, fullName: user.fullName, phone: user.phone, role: user.role, department: user.department };

        const updatedUser = await storage.updateUser(userId, {
          email: email || user.email,
          fullName: fullName || user.fullName,
          phone: phone || user.phone,
          role: role || user.role,
          department: department !== undefined ? department : user.department,
        });

        const newValues = { email: updatedUser.email, fullName: updatedUser.fullName, phone: updatedUser.phone, role: updatedUser.role, department: updatedUser.department };

        // Create audit log for user update
        await createAuditLog(
          req.user?.userId || 0,
          'user_updated',
          'user',
          String(userId),
          oldValues,
          newValues,
          req
        );

        // Remove sensitive data
        const sanitizedUser = {
          ...updatedUser,
          password: undefined,
          twoFactorSecret: undefined,
        };

        res.json(sanitizedUser);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to update user" });
      }
    }
  );

  // Toggle user status (activate/deactivate)
  app.patch(
    "/api/super-admin/users/:id/status",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { isActive } = req.body;

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const updatedUser = await storage.updateUser(userId, {
          isActive,
        });

        // Create audit log for status change
        await createAuditLog(
          req.user?.userId || 0,
          isActive ? 'user_activated' : 'user_deactivated',
          'user',
          String(userId),
          { isActive: user.isActive },
          { isActive: updatedUser.isActive },
          req
        );

        res.json({ success: true, isActive: updatedUser.isActive });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to update user status" });
      }
    }
  );

  // Delete user
  app.delete(
    "/api/super-admin/users/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);

        // Prevent deleting own account
        if (req.user?.userId === userId) {
          return res.status(400).json({ error: "Cannot delete your own account" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Create audit log before deletion
        await createAuditLog(
          req.user?.userId || 0,
          'user_deleted',
          'user',
          String(userId),
          { username: user.username, email: user.email, role: user.role },
          null,
          req
        );

        await storage.deleteUser(userId);

        res.json({ success: true, message: "User deleted successfully" });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to delete user" });
      }
    }
  );

  // Get audit logs with filtering
  app.get(
    "/api/super-admin/audit-logs",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          page = '1',
          limit = '50',
          action,
          entityType,
          userId,
          startDate,
          endDate,
          search
        } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string), 100);
        const offset = (pageNum - 1) * limitNum;

        // Build query conditions
        const conditions = [];

        if (action) {
          conditions.push(eq(auditLogs.action, action as string));
        }
        if (entityType) {
          conditions.push(eq(auditLogs.entityType, entityType as string));
        }
        if (userId) {
          conditions.push(eq(auditLogs.userId, parseInt(userId as string)));
        }
        if (startDate) {
          conditions.push(gte(auditLogs.timestamp, new Date(startDate as string)));
        }
        if (endDate) {
          conditions.push(lte(auditLogs.timestamp, new Date(endDate as string)));
        }

        // Query audit logs with user info
        const logs = await db
          .select({
            id: auditLogs.id,
            userId: auditLogs.userId,
            action: auditLogs.action,
            entityType: auditLogs.entityType,
            entityId: auditLogs.entityId,
            oldValue: auditLogs.oldValue,
            newValue: auditLogs.newValue,
            ipAddress: auditLogs.ipAddress,
            userAgent: auditLogs.userAgent,
            timestamp: auditLogs.timestamp,
            userName: users.fullName,
            userEmail: users.email,
          })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.userId, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(auditLogs.timestamp))
          .limit(limitNum)
          .offset(offset);

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogs)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = Number(countResult[0]?.count || 0);

        res.json({
          logs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        });
      } catch (error: any) {
        console.error('Failed to fetch audit logs:', error);
        res.status(500).json({ error: error.message || "Failed to fetch audit logs" });
      }
    }
  );

  // Get activity logs (user actions)
  app.get(
    "/api/super-admin/activity-logs",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { page = '1', limit = '50', userId, action, entityType } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string), 100);
        const offset = (pageNum - 1) * limitNum;

        const conditions = [];
        if (userId) conditions.push(eq(activityLogs.userId, parseInt(userId as string)));
        if (action) conditions.push(eq(activityLogs.action, action as string));
        if (entityType) conditions.push(eq(activityLogs.entityType, entityType as string));

        const logs = await db
          .select({
            id: activityLogs.id,
            userId: activityLogs.userId,
            businessEntityId: activityLogs.businessEntityId,
            serviceRequestId: activityLogs.serviceRequestId,
            action: activityLogs.action,
            entityType: activityLogs.entityType,
            entityId: activityLogs.entityId,
            details: activityLogs.details,
            metadata: activityLogs.metadata,
            ipAddress: activityLogs.ipAddress,
            createdAt: activityLogs.createdAt,
            userName: users.fullName,
            userEmail: users.email,
          })
          .from(activityLogs)
          .leftJoin(users, eq(activityLogs.userId, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(activityLogs.createdAt))
          .limit(limitNum)
          .offset(offset);

        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(activityLogs)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        res.json({
          logs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: Number(countResult[0]?.count || 0),
            totalPages: Math.ceil(Number(countResult[0]?.count || 0) / limitNum),
          },
        });
      } catch (error: any) {
        console.error('Failed to fetch activity logs:', error);
        res.status(500).json({ error: error.message || "Failed to fetch activity logs" });
      }
    }
  );

  // Get system configuration
  app.get(
    "/api/super-admin/config",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { category } = req.query;

        const conditions = category
          ? [eq(systemConfiguration.category, category as string)]
          : [];

        const configs = await db
          .select()
          .from(systemConfiguration)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(systemConfiguration.category, systemConfiguration.configKey);

        // Group by category
        const grouped = configs.reduce((acc, config) => {
          if (!acc[config.category]) {
            acc[config.category] = [];
          }
          acc[config.category].push(config);
          return acc;
        }, {} as Record<string, typeof configs>);

        res.json({ configs, grouped });
      } catch (error: any) {
        console.error('Failed to fetch system configuration:', error);
        res.status(500).json({ error: error.message || "Failed to fetch system configuration" });
      }
    }
  );

  // Update system configuration
  app.put(
    "/api/super-admin/config/:key",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { key } = req.params;
        const { value, description } = req.body;

        // Get existing config
        const existing = await db
          .select()
          .from(systemConfiguration)
          .where(eq(systemConfiguration.configKey, key))
          .limit(1);

        if (existing.length === 0) {
          return res.status(404).json({ error: "Configuration not found" });
        }

        const oldValue = existing[0].configValue;

        // Update config
        const updated = await db
          .update(systemConfiguration)
          .set({
            configValue: value,
            description: description || existing[0].description,
            lastModifiedBy: req.user?.userId || null,
            lastModified: new Date(),
          })
          .where(eq(systemConfiguration.configKey, key))
          .returning();

        // Audit log
        await createAuditLog(
          req.user?.userId || 0,
          'config_updated',
          'system_configuration',
          key,
          { configValue: oldValue },
          { configValue: value },
          req
        );

        res.json(updated[0]);
      } catch (error: any) {
        console.error('Failed to update system configuration:', error);
        res.status(500).json({ error: error.message || "Failed to update system configuration" });
      }
    }
  );

  // Create system configuration
  app.post(
    "/api/super-admin/config",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { key, value, category, description, isEncrypted } = req.body;

        if (!key || !category) {
          return res.status(400).json({ error: "Key and category are required" });
        }

        // Check if key exists
        const existing = await db
          .select()
          .from(systemConfiguration)
          .where(eq(systemConfiguration.configKey, key))
          .limit(1);

        if (existing.length > 0) {
          return res.status(400).json({ error: "Configuration key already exists" });
        }

        const created = await db
          .insert(systemConfiguration)
          .values({
            configKey: key,
            configValue: value || {},
            category,
            description: description || null,
            isEncrypted: isEncrypted || false,
            lastModifiedBy: req.user?.userId || null,
          })
          .returning();

        await createAuditLog(
          req.user?.userId || 0,
          'config_created',
          'system_configuration',
          key,
          null,
          { configKey: key, category, configValue: value },
          req
        );

        res.status(201).json(created[0]);
      } catch (error: any) {
        console.error('Failed to create system configuration:', error);
        res.status(500).json({ error: error.message || "Failed to create system configuration" });
      }
    }
  );

  // Get role permissions
  app.get(
    "/api/super-admin/roles",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const roles = Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({
          role,
          displayName: getRoleDisplayName(role),
          level: getRoleLevel(role),
          permissions,
          permissionCount: permissions.length,
        }));

        res.json({
          roles: roles.sort((a, b) => b.level - a.level),
          allPermissions: Object.values(PERMISSIONS),
        });
      } catch (error: any) {
        console.error('Failed to fetch roles:', error);
        res.status(500).json({ error: error.message || "Failed to fetch roles" });
      }
    }
  );

  // Update role permissions
  app.put(
    "/api/super-admin/roles/:role/permissions",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { role } = req.params;
        const { permissions } = req.body;

        if (!ROLE_PERMISSIONS[role]) {
          return res.status(404).json({ error: "Role not found" });
        }

        if (role === 'super_admin') {
          return res.status(400).json({ error: "Cannot modify super_admin permissions" });
        }

        const oldPermissions = [...ROLE_PERMISSIONS[role]];
        ROLE_PERMISSIONS[role] = permissions;

        // Audit log
        await createAuditLog(
          req.user?.userId || 0,
          'role_permissions_updated',
          'role',
          role,
          { permissions: oldPermissions },
          { permissions },
          req
        );

        res.json({
          role,
          permissions: ROLE_PERMISSIONS[role],
          message: "Permissions updated successfully",
        });
      } catch (error: any) {
        console.error('Failed to update role permissions:', error);
        res.status(500).json({ error: error.message || "Failed to update role permissions" });
      }
    }
  );

  // Get system health
  app.get(
    "/api/super-admin/health",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Database check
        const dbCheck = await db.execute(sql`SELECT 1`);
        const dbStatus = dbCheck ? 'healthy' : 'unhealthy';

        // Get some metrics
        const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
        const recentAuditCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogs)
          .where(gte(auditLogs.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000)));

        const recentActivityCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(activityLogs)
          .where(gte(activityLogs.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

        res.json({
          status: dbStatus === 'healthy' ? 'Optimal' : 'Degraded',
          database: dbStatus,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          metrics: {
            totalUsers: Number(userCount[0]?.count || 0),
            auditLogsLast24h: Number(recentAuditCount[0]?.count || 0),
            activityLogsLast24h: Number(recentActivityCount[0]?.count || 0),
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('Health check failed:', error);
        res.status(500).json({
          status: 'Unhealthy',
          database: 'unhealthy',
          error: error.message,
        });
      }
    }
  );

  // Export audit logs
  app.get(
    "/api/super-admin/audit-logs/export",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { format = 'json', startDate, endDate, entityType } = req.query;

        const conditions = [];
        if (startDate) conditions.push(gte(auditLogs.timestamp, new Date(startDate as string)));
        if (endDate) conditions.push(lte(auditLogs.timestamp, new Date(endDate as string)));
        if (entityType) conditions.push(eq(auditLogs.entityType, entityType as string));

        const logs = await db
          .select({
            id: auditLogs.id,
            userId: auditLogs.userId,
            action: auditLogs.action,
            entityType: auditLogs.entityType,
            entityId: auditLogs.entityId,
            oldValue: auditLogs.oldValue,
            newValue: auditLogs.newValue,
            ipAddress: auditLogs.ipAddress,
            timestamp: auditLogs.timestamp,
            userName: users.fullName,
            userEmail: users.email,
          })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.userId, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(auditLogs.timestamp))
          .limit(10000);

        // Audit log the export
        await createAuditLog(
          req.user?.userId || 0,
          'audit_log_exported',
          'audit_logs',
          null,
          null,
          { format, recordCount: logs.length, startDate, endDate },
          req
        );

        if (format === 'csv') {
          const csvHeader = 'ID,User ID,User Name,User Email,Action,Entity Type,Entity ID,IP Address,Timestamp\n';
          const csvRows = logs.map(log =>
            `${log.id},${log.userId},"${log.userName || ''}","${log.userEmail || ''}","${log.action}","${log.entityType}","${log.entityId || ''}","${log.ipAddress || ''}","${log.timestamp}"`
          ).join('\n');

          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
          res.send(csvHeader + csvRows);
        } else {
          res.json({ logs, exportedAt: new Date().toISOString(), recordCount: logs.length });
        }
      } catch (error: any) {
        console.error('Failed to export audit logs:', error);
        res.status(500).json({ error: error.message || "Failed to export audit logs" });
      }
    }
  );

  // Password reset by admin
  app.post(
    "/api/super-admin/users/:id/reset-password",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
          return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await storage.updateUser(userId, { password: hashedPassword });

        // Audit log
        await createAuditLog(
          req.user?.userId || 0,
          'password_reset_by_admin',
          'user',
          String(userId),
          null,
          { targetUser: user.username },
          req
        );

        res.json({ success: true, message: "Password reset successfully" });
      } catch (error: any) {
        console.error('Failed to reset password:', error);
        res.status(500).json({ error: error.message || "Failed to reset password" });
      }
    }
  );

  console.log('✅ Super Admin routes registered');
}

// Helper functions
function getRoleDisplayName(role: string): string {
  const displayNames: Record<string, string> = {
    super_admin: 'Super Administrator',
    admin: 'Administrator',
    ops_manager: 'Operations Manager',
    ops_executive: 'Operations Executive',
    customer_service: 'Customer Service',
    qc_executive: 'QC Executive',
    accountant: 'Accountant',
    agent: 'Agent',
    client: 'Client',
  };
  return displayNames[role] || role;
}

function getRoleLevel(role: string): number {
  const levels: Record<string, number> = {
    super_admin: 100,
    admin: 90,
    ops_manager: 80,
    ops_executive: 70,
    customer_service: 60,
    qc_executive: 55,
    accountant: 50,
    agent: 40,
    client: 10,
  };
  return levels[role] || 0;
}
