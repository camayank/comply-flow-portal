/**
 * Admin User Management Routes
 *
 * These routes allow Admin users to manage users with RESTRICTED permissions.
 * Admin users have limited capabilities compared to Super Admin.
 *
 * Restrictions:
 * - Can create users with roles UP TO ops_manager (cannot create admin or super_admin)
 * - Can edit user details (but cannot change role to admin/super_admin)
 * - Can activate/deactivate users (but NOT delete)
 * - Can reset passwords
 * - Can view user activity
 *
 * Endpoints:
 * 1. GET    /api/admin/manage/users           - List users in org (with filters)
 * 2. POST   /api/admin/manage/users           - Create user (restricted roles)
 * 3. GET    /api/admin/manage/users/:id       - Get single user details
 * 4. PUT    /api/admin/manage/users/:id       - Update user (restricted)
 * 5. POST   /api/admin/manage/users/:id/activate     - Activate user
 * 6. POST   /api/admin/manage/users/:id/deactivate   - Deactivate user
 * 7. POST   /api/admin/manage/users/:id/reset-password - Reset password
 * 8. GET    /api/admin/manage/users/:id/activity     - Get user activity
 */

import type { Express, Response } from "express";
import { db } from "./db";
import { users, activityLogs } from "@shared/schema";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  type AuthenticatedRequest
} from "./rbac-middleware";
import bcrypt from "bcrypt";

// Roles that Admin is ALLOWED to create/manage
// Admin CANNOT create/assign: super_admin, admin
const ADMIN_ALLOWED_ROLES = [
  'ops_manager',
  'ops_executive',
  'customer_service',
  'qc_executive',
  'accountant',
  'agent',
  'client'
] as const;

// Restricted roles that Admin CANNOT manage
const RESTRICTED_ROLES = ['super_admin', 'admin'] as const;

// Type guard to check if role is allowed for admin
function isAdminAllowedRole(role: string): boolean {
  return ADMIN_ALLOWED_ROLES.includes(role as typeof ADMIN_ALLOWED_ROLES[number]);
}

// Type guard to check if role is restricted
function isRestrictedRole(role: string): boolean {
  return RESTRICTED_ROLES.includes(role as typeof RESTRICTED_ROLES[number]);
}

// Helper to create activity log entry
async function createActivityLog(
  userId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  details: string,
  metadata: Record<string, any> | null,
  req?: AuthenticatedRequest
) {
  try {
    await db.insert(activityLogs).values({
      userId,
      action,
      entityType,
      entityId,
      details,
      metadata,
      ipAddress: req?.ip || req?.headers['x-forwarded-for']?.toString() || null,
      userAgent: req?.headers['user-agent'] || null,
      sessionId: req?.cookies?.sessionToken || null,
    });
  } catch (error) {
    console.error('Failed to create activity log:', error);
  }
}

// Sanitize error message to prevent information leakage
function sanitizeErrorMessage(error: any): string {
  // Only expose safe error messages
  if (error?.code === '23505') {
    return 'A user with this email or username already exists';
  }
  if (error?.name === 'ZodError') {
    return 'Invalid data provided';
  }
  // Default sanitized message
  return 'An error occurred while processing your request';
}

// Validate and parse user ID from params
function parseUserId(id: string): number | null {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function registerAdminUserManagementRoutes(app: Express) {
  // All routes require ADMIN role minimum
  const adminAuth = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN)] as const;

  /**
   * 1. GET /api/admin/manage/users - List users in org (with filters)
   *
   * Query parameters:
   * - page: number (default: 1)
   * - limit: number (default: 20, max: 100)
   * - search: string (searches name and email)
   * - role: string (filter by role)
   * - status: 'active' | 'inactive' (filter by status)
   */
  app.get(
    "/api/admin/manage/users",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          page = '1',
          limit = '20',
          search,
          role,
          status
        } = req.query;

        // Parse and validate pagination
        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        // Build query conditions
        const conditions = [];

        // Admin can only see allowed roles (exclude super_admin, admin)
        conditions.push(
          or(
            ...ADMIN_ALLOWED_ROLES.map(r => eq(users.role, r))
          )
        );

        // Search by name or email
        if (search && typeof search === 'string' && search.trim()) {
          const searchTerm = `%${search.trim()}%`;
          conditions.push(
            or(
              ilike(users.fullName, searchTerm),
              ilike(users.email, searchTerm),
              ilike(users.username, searchTerm)
            )
          );
        }

        // Filter by role (only if it's an allowed role)
        if (role && typeof role === 'string' && isAdminAllowedRole(role)) {
          conditions.push(eq(users.role, role));
        }

        // Filter by status
        if (status === 'active') {
          conditions.push(eq(users.isActive, true));
        } else if (status === 'inactive') {
          conditions.push(eq(users.isActive, false));
        }

        // Query users with pagination
        const usersList = await db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            phone: users.phone,
            fullName: users.fullName,
            role: users.role,
            department: users.department,
            isActive: users.isActive,
            lastLogin: users.lastLogin,
            isTwoFactorEnabled: users.isTwoFactorEnabled,
            createdBy: users.createdBy,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(and(...conditions))
          .orderBy(desc(users.createdAt))
          .limit(limitNum)
          .offset(offset);

        // Get total count for pagination
        const countResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(and(...conditions));

        const total = countResult[0]?.count || 0;

        res.json({
          users: usersList,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
          allowedRoles: [...ADMIN_ALLOWED_ROLES],
        });
      } catch (error: any) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: sanitizeErrorMessage(error) });
      }
    }
  );

  /**
   * 2. POST /api/admin/manage/users - Create user (restricted roles)
   *
   * Body:
   * - username: string (required)
   * - email: string (required)
   * - password: string (required, min 8 chars)
   * - fullName: string (optional)
   * - phone: string (optional)
   * - role: string (required, must be in ADMIN_ALLOWED_ROLES)
   * - department: string (optional)
   */
  app.post(
    "/api/admin/manage/users",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { username, email, password, fullName, phone, role, department } = req.body;

        // Validate required fields
        if (!username || typeof username !== 'string' || username.trim().length < 3) {
          return res.status(400).json({ error: "Username is required and must be at least 3 characters" });
        }

        if (!email || typeof email !== 'string' || !email.includes('@')) {
          return res.status(400).json({ error: "A valid email is required" });
        }

        if (!password || typeof password !== 'string' || password.length < 8) {
          return res.status(400).json({ error: "Password is required and must be at least 8 characters" });
        }

        if (!role || typeof role !== 'string') {
          return res.status(400).json({ error: "Role is required" });
        }

        // Validate role restriction - Admin CANNOT create admin/super_admin
        if (isRestrictedRole(role)) {
          return res.status(403).json({
            error: "You are not authorized to create users with this role",
            allowedRoles: [...ADMIN_ALLOWED_ROLES],
          });
        }

        if (!isAdminAllowedRole(role)) {
          return res.status(400).json({
            error: "Invalid role specified",
            allowedRoles: [...ADMIN_ALLOWED_ROLES],
          });
        }

        // Check if username already exists
        const existingUsername = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, username.trim().toLowerCase()))
          .limit(1);

        if (existingUsername.length > 0) {
          return res.status(409).json({ error: "Username already exists" });
        }

        // Check if email already exists
        const existingEmail = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email.trim().toLowerCase()))
          .limit(1);

        if (existingEmail.length > 0) {
          return res.status(409).json({ error: "Email already exists" });
        }

        // Hash password with bcrypt (10 rounds)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [newUser] = await db
          .insert(users)
          .values({
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            fullName: fullName?.trim() || null,
            phone: phone?.trim() || null,
            role,
            department: department?.trim() || null,
            isActive: true,
            createdBy: req.user?.id || null,
          })
          .returning({
            id: users.id,
            username: users.username,
            email: users.email,
            phone: users.phone,
            fullName: users.fullName,
            role: users.role,
            department: users.department,
            isActive: users.isActive,
            createdAt: users.createdAt,
          });

        // Log activity
        await createActivityLog(
          req.user?.id || null,
          'user_created',
          'user',
          newUser.id,
          `Created user ${newUser.username} with role ${newUser.role}`,
          {
            createdUserId: newUser.id,
            createdUsername: newUser.username,
            createdRole: newUser.role,
            createdBy: req.user?.username,
          },
          req
        );

        res.status(201).json({
          message: "User created successfully",
          user: newUser,
        });
      } catch (error: any) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: sanitizeErrorMessage(error) });
      }
    }
  );

  /**
   * 3. GET /api/admin/manage/users/:id - Get single user details
   */
  app.get(
    "/api/admin/manage/users/:id",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseUserId(req.params.id);

        if (userId === null) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        const [user] = await db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            phone: users.phone,
            fullName: users.fullName,
            role: users.role,
            department: users.department,
            businessEntityId: users.businessEntityId,
            isActive: users.isActive,
            lastLogin: users.lastLogin,
            isTwoFactorEnabled: users.isTwoFactorEnabled,
            createdBy: users.createdBy,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Admin cannot view admin/super_admin user details
        if (isRestrictedRole(user.role)) {
          return res.status(403).json({
            error: "You are not authorized to view this user's details",
          });
        }

        res.json({ user });
      } catch (error: any) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: sanitizeErrorMessage(error) });
      }
    }
  );

  /**
   * 4. PUT /api/admin/manage/users/:id - Update user (restricted)
   *
   * Body:
   * - email: string (optional)
   * - fullName: string (optional)
   * - phone: string (optional)
   * - role: string (optional, must be in ADMIN_ALLOWED_ROLES)
   * - department: string (optional)
   */
  app.put(
    "/api/admin/manage/users/:id",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseUserId(req.params.id);

        if (userId === null) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        const { email, fullName, phone, role, department } = req.body;

        // Get existing user
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!existingUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Admin cannot modify admin/super_admin users
        if (isRestrictedRole(existingUser.role)) {
          return res.status(403).json({
            error: "You are not authorized to modify this user",
          });
        }

        // If role is being changed, validate new role
        if (role !== undefined) {
          if (isRestrictedRole(role)) {
            return res.status(403).json({
              error: "You are not authorized to assign this role",
              allowedRoles: [...ADMIN_ALLOWED_ROLES],
            });
          }

          if (!isAdminAllowedRole(role)) {
            return res.status(400).json({
              error: "Invalid role specified",
              allowedRoles: [...ADMIN_ALLOWED_ROLES],
            });
          }
        }

        // Validate email if provided
        if (email !== undefined) {
          if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: "Invalid email format" });
          }

          // Check for duplicate email (excluding current user)
          const duplicateEmail = await db
            .select({ id: users.id })
            .from(users)
            .where(and(
              eq(users.email, email.trim().toLowerCase()),
              sql`${users.id} != ${userId}`
            ))
            .limit(1);

          if (duplicateEmail.length > 0) {
            return res.status(409).json({ error: "Email already in use by another user" });
          }
        }

        // Build update object
        const updateData: Record<string, any> = {
          updatedAt: new Date(),
        };

        if (email !== undefined) updateData.email = email.trim().toLowerCase();
        if (fullName !== undefined) updateData.fullName = fullName?.trim() || null;
        if (phone !== undefined) updateData.phone = phone?.trim() || null;
        if (role !== undefined) updateData.role = role;
        if (department !== undefined) updateData.department = department?.trim() || null;

        // Update user
        const [updatedUser] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, userId))
          .returning({
            id: users.id,
            username: users.username,
            email: users.email,
            phone: users.phone,
            fullName: users.fullName,
            role: users.role,
            department: users.department,
            isActive: users.isActive,
            updatedAt: users.updatedAt,
          });

        // Log activity
        await createActivityLog(
          req.user?.id || null,
          'user_updated',
          'user',
          userId,
          `Updated user ${updatedUser.username}`,
          {
            updatedUserId: userId,
            updatedFields: Object.keys(updateData).filter(k => k !== 'updatedAt'),
            updatedBy: req.user?.username,
            previousRole: existingUser.role,
            newRole: updatedUser.role,
          },
          req
        );

        res.json({
          message: "User updated successfully",
          user: updatedUser,
        });
      } catch (error: any) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: sanitizeErrorMessage(error) });
      }
    }
  );

  /**
   * 5. POST /api/admin/manage/users/:id/activate - Activate user
   */
  app.post(
    "/api/admin/manage/users/:id/activate",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseUserId(req.params.id);

        if (userId === null) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        // Get existing user
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!existingUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Admin cannot activate admin/super_admin users
        if (isRestrictedRole(existingUser.role)) {
          return res.status(403).json({
            error: "You are not authorized to activate this user",
          });
        }

        // Check if already active
        if (existingUser.isActive) {
          return res.status(400).json({ error: "User is already active" });
        }

        // Activate user
        const [activatedUser] = await db
          .update(users)
          .set({
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning({
            id: users.id,
            username: users.username,
            email: users.email,
            isActive: users.isActive,
          });

        // Log activity
        await createActivityLog(
          req.user?.id || null,
          'user_activated',
          'user',
          userId,
          `Activated user ${activatedUser.username}`,
          {
            activatedUserId: userId,
            activatedUsername: activatedUser.username,
            activatedBy: req.user?.username,
          },
          req
        );

        res.json({
          message: "User activated successfully",
          user: activatedUser,
        });
      } catch (error: any) {
        console.error('Error activating user:', error);
        res.status(500).json({ error: sanitizeErrorMessage(error) });
      }
    }
  );

  /**
   * 6. POST /api/admin/manage/users/:id/deactivate - Deactivate user
   */
  app.post(
    "/api/admin/manage/users/:id/deactivate",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseUserId(req.params.id);

        if (userId === null) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        // Prevent self-deactivation
        if (req.user?.id === userId) {
          return res.status(400).json({ error: "You cannot deactivate your own account" });
        }

        // Get existing user
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!existingUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Admin cannot deactivate admin/super_admin users
        if (isRestrictedRole(existingUser.role)) {
          return res.status(403).json({
            error: "You are not authorized to deactivate this user",
          });
        }

        // Check if already inactive
        if (!existingUser.isActive) {
          return res.status(400).json({ error: "User is already inactive" });
        }

        // Deactivate user
        const [deactivatedUser] = await db
          .update(users)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning({
            id: users.id,
            username: users.username,
            email: users.email,
            isActive: users.isActive,
          });

        // Log activity
        await createActivityLog(
          req.user?.id || null,
          'user_deactivated',
          'user',
          userId,
          `Deactivated user ${deactivatedUser.username}`,
          {
            deactivatedUserId: userId,
            deactivatedUsername: deactivatedUser.username,
            deactivatedBy: req.user?.username,
          },
          req
        );

        res.json({
          message: "User deactivated successfully",
          user: deactivatedUser,
        });
      } catch (error: any) {
        console.error('Error deactivating user:', error);
        res.status(500).json({ error: sanitizeErrorMessage(error) });
      }
    }
  );

  /**
   * 7. POST /api/admin/manage/users/:id/reset-password - Reset password
   *
   * Body:
   * - newPassword: string (required, min 8 chars)
   */
  app.post(
    "/api/admin/manage/users/:id/reset-password",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseUserId(req.params.id);

        if (userId === null) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        const { newPassword } = req.body;

        // Validate password
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
          return res.status(400).json({
            error: "Password must be at least 8 characters long",
          });
        }

        // Get existing user
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!existingUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Admin cannot reset password for admin/super_admin users
        if (isRestrictedRole(existingUser.role)) {
          return res.status(403).json({
            error: "You are not authorized to reset this user's password",
          });
        }

        // Hash new password with bcrypt (10 rounds)
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db
          .update(users)
          .set({
            password: hashedPassword,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        // Log activity (without logging the actual password)
        await createActivityLog(
          req.user?.id || null,
          'password_reset',
          'user',
          userId,
          `Password reset for user ${existingUser.username}`,
          {
            targetUserId: userId,
            targetUsername: existingUser.username,
            resetBy: req.user?.username,
          },
          req
        );

        res.json({
          message: "Password reset successfully",
          userId,
          username: existingUser.username,
        });
      } catch (error: any) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: sanitizeErrorMessage(error) });
      }
    }
  );

  /**
   * 8. GET /api/admin/manage/users/:id/activity - Get user activity
   *
   * Query parameters:
   * - page: number (default: 1)
   * - limit: number (default: 20, max: 100)
   * - action: string (filter by action type)
   */
  app.get(
    "/api/admin/manage/users/:id/activity",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseUserId(req.params.id);

        if (userId === null) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        const {
          page = '1',
          limit = '20',
          action
        } = req.query;

        // Verify user exists and admin can view them
        const [targetUser] = await db
          .select({
            id: users.id,
            username: users.username,
            role: users.role,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!targetUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Admin cannot view activity of admin/super_admin users
        if (isRestrictedRole(targetUser.role)) {
          return res.status(403).json({
            error: "You are not authorized to view this user's activity",
          });
        }

        // Parse and validate pagination
        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
        const offset = (pageNum - 1) * limitNum;

        // Build query conditions
        const conditions = [eq(activityLogs.userId, userId)];

        // Filter by action type
        if (action && typeof action === 'string' && action.trim()) {
          conditions.push(eq(activityLogs.action, action.trim()));
        }

        // Query activity logs
        const activities = await db
          .select({
            id: activityLogs.id,
            userId: activityLogs.userId,
            action: activityLogs.action,
            entityType: activityLogs.entityType,
            entityId: activityLogs.entityId,
            details: activityLogs.details,
            metadata: activityLogs.metadata,
            ipAddress: activityLogs.ipAddress,
            createdAt: activityLogs.createdAt,
          })
          .from(activityLogs)
          .where(and(...conditions))
          .orderBy(desc(activityLogs.createdAt))
          .limit(limitNum)
          .offset(offset);

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(activityLogs)
          .where(and(...conditions));

        const total = countResult[0]?.count || 0;

        res.json({
          user: {
            id: targetUser.id,
            username: targetUser.username,
          },
          activities,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        });
      } catch (error: any) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({ error: sanitizeErrorMessage(error) });
      }
    }
  );

  console.log('✅ Admin user management routes registered');
}
