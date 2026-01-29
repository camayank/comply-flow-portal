/**
 * Admin User Management Routes
 *
 * These routes allow Admin users to manage non-admin users (delegated from Super Admin).
 * Admin can: create, edit, delete, reset password for ops/agent/client users
 * Admin CANNOT: manage super_admin or admin users
 */

import type { Express, Response } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { auditLogs, users } from "@shared/schema";
import bcrypt from "bcrypt";
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  requirePermission,
  USER_ROLES,
  PERMISSIONS,
  canManageUser,
  getManageableRoles,
  isAdminRole,
  type AuthenticatedRequest
} from "./rbac-middleware";

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

export function registerAdminUserRoutes(app: Express) {
  const adminAuth = [
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
  ] as const;

  // Get users that admin can manage
  app.get(
    "/api/admin/users",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { search, role } = req.query;
        const managerRole = req.user?.role || '';

        let allUsers = await storage.getAllUsers();

        // Filter to only show users that this admin can manage
        const manageableRoles = getManageableRoles(managerRole);
        let filteredUsers = allUsers.filter(u => manageableRoles.includes(u.role));

        // Apply search filter
        if (search) {
          const searchLower = (search as string).toLowerCase();
          filteredUsers = filteredUsers.filter(u =>
            u.username?.toLowerCase().includes(searchLower) ||
            u.email?.toLowerCase().includes(searchLower) ||
            u.fullName?.toLowerCase().includes(searchLower)
          );
        }

        // Apply role filter
        if (role) {
          filteredUsers = filteredUsers.filter(u => u.role === role);
        }

        // Remove sensitive data
        const sanitizedUsers = filteredUsers.map(user => ({
          ...user,
          password: undefined,
          twoFactorSecret: undefined,
        }));

        res.json({
          users: sanitizedUsers,
          manageableRoles,
          totalCount: sanitizedUsers.length,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch users" });
      }
    }
  );

  // Get stats for manageable users
  app.get(
    "/api/admin/users/stats",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const managerRole = req.user?.role || '';
        const manageableRoles = getManageableRoles(managerRole);

        const allUsers = await storage.getAllUsers();
        const manageableUsers = allUsers.filter(u => manageableRoles.includes(u.role));

        const stats = {
          total: manageableUsers.length,
          active: manageableUsers.filter(u => u.isActive).length,
          inactive: manageableUsers.filter(u => !u.isActive).length,
          byRole: manageableRoles.reduce((acc, role) => {
            acc[role] = manageableUsers.filter(u => u.role === role).length;
            return acc;
          }, {} as Record<string, number>),
        };

        res.json(stats);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch user stats" });
      }
    }
  );

  // Create new user (non-admin only)
  app.post(
    "/api/admin/users",
    ...adminAuth,
    requirePermission(PERMISSIONS.USER_MANAGEMENT.CREATE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { username, email, password, fullName, phone, role, department } = req.body;
        const managerRole = req.user?.role || '';

        // Validate required fields
        if (!username || !email || !password || !role) {
          return res.status(400).json({ error: "Missing required fields: username, email, password, role" });
        }

        // Check if admin can create this role
        if (!canManageUser(managerRole, role)) {
          return res.status(403).json({
            error: "You don't have permission to create users with this role",
            yourRole: managerRole,
            targetRole: role,
            allowedRoles: getManageableRoles(managerRole),
          });
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
          createdBy: req.user?.id || null,
        });

        // Create audit log
        await createAuditLog(
          req.user?.id || 0,
          'user_created_by_admin',
          'user',
          String(newUser.id),
          null,
          { username, email, role, fullName, department, createdBy: req.user?.username },
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

  // Update user (non-admin only)
  app.patch(
    "/api/admin/users/:id",
    ...adminAuth,
    requirePermission(PERMISSIONS.USER_MANAGEMENT.UPDATE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { email, fullName, phone, role, department } = req.body;
        const managerRole = req.user?.role || '';

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Check if admin can manage this user's current role
        if (!canManageUser(managerRole, user.role)) {
          return res.status(403).json({
            error: "You don't have permission to modify this user",
            reason: isAdminRole(user.role) ? "Cannot modify admin users" : "Insufficient permissions",
          });
        }

        // If changing role, check if admin can assign the new role
        if (role && role !== user.role && !canManageUser(managerRole, role)) {
          return res.status(403).json({
            error: "You don't have permission to assign this role",
            allowedRoles: getManageableRoles(managerRole),
          });
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

        // Create audit log
        await createAuditLog(
          req.user?.id || 0,
          'user_updated_by_admin',
          'user',
          String(userId),
          oldValues,
          { ...newValues, modifiedBy: req.user?.username },
          req
        );

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

  // Toggle user status
  app.patch(
    "/api/admin/users/:id/status",
    ...adminAuth,
    requirePermission(PERMISSIONS.USER_MANAGEMENT.UPDATE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { isActive } = req.body;
        const managerRole = req.user?.role || '';

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Check if admin can manage this user
        if (!canManageUser(managerRole, user.role)) {
          return res.status(403).json({
            error: "You don't have permission to modify this user's status",
          });
        }

        const updatedUser = await storage.updateUser(userId, { isActive });

        // Create audit log
        await createAuditLog(
          req.user?.id || 0,
          isActive ? 'user_activated_by_admin' : 'user_deactivated_by_admin',
          'user',
          String(userId),
          { isActive: user.isActive },
          { isActive: updatedUser.isActive, modifiedBy: req.user?.username },
          req
        );

        res.json({ success: true, isActive: updatedUser.isActive });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to update user status" });
      }
    }
  );

  // Reset password
  app.post(
    "/api/admin/users/:id/reset-password",
    ...adminAuth,
    requirePermission(PERMISSIONS.USER_MANAGEMENT.RESET_PASSWORD),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { newPassword } = req.body;
        const managerRole = req.user?.role || '';

        if (!newPassword || newPassword.length < 8) {
          return res.status(400).json({ error: "Password must be at least 8 characters" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Check if admin can manage this user
        if (!canManageUser(managerRole, user.role)) {
          return res.status(403).json({
            error: "You don't have permission to reset this user's password",
          });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await storage.updateUser(userId, { password: hashedPassword });

        // Create audit log
        await createAuditLog(
          req.user?.id || 0,
          'password_reset_by_admin',
          'user',
          String(userId),
          null,
          { targetUser: user.username, targetRole: user.role, resetBy: req.user?.username },
          req
        );

        res.json({ success: true, message: "Password reset successfully" });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to reset password" });
      }
    }
  );

  // Delete user (non-admin only)
  app.delete(
    "/api/admin/users/:id",
    ...adminAuth,
    requirePermission(PERMISSIONS.USER_MANAGEMENT.DELETE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const managerRole = req.user?.role || '';

        // Prevent deleting own account
        if (req.user?.id === userId) {
          return res.status(400).json({ error: "Cannot delete your own account" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Check if admin can manage this user
        if (!canManageUser(managerRole, user.role)) {
          return res.status(403).json({
            error: "You don't have permission to delete this user",
            reason: isAdminRole(user.role) ? "Cannot delete admin users" : "Insufficient permissions",
          });
        }

        // Create audit log before deletion
        await createAuditLog(
          req.user?.id || 0,
          'user_deleted_by_admin',
          'user',
          String(userId),
          { username: user.username, email: user.email, role: user.role },
          { deletedBy: req.user?.username },
          req
        );

        await storage.deleteUser(userId);

        res.json({ success: true, message: "User deleted successfully" });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to delete user" });
      }
    }
  );

  // Get manageable roles for current user
  app.get(
    "/api/admin/manageable-roles",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const managerRole = req.user?.role || '';
        const roles = getManageableRoles(managerRole);

        res.json({
          roles,
          canManageAdmins: managerRole === USER_ROLES.SUPER_ADMIN,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch roles" });
      }
    }
  );

  console.log('✅ Admin User Management routes registered');
}
