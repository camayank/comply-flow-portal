import type { Express, Response } from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";

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

        const updatedUser = await storage.updateUser(userId, {
          email: email || user.email,
          fullName: fullName || user.fullName,
          phone: phone || user.phone,
          role: role || user.role,
          department: department !== undefined ? department : user.department,
        });

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

        await storage.deleteUser(userId);

        res.json({ success: true, message: "User deleted successfully" });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to delete user" });
      }
    }
  );

  // Get activity logs
  app.get(
    "/api/super-admin/activity-logs",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Placeholder for activity logging implementation
        // This would integrate with an audit log system
        res.json([
          {
            id: 1,
            action: "User created",
            user: "Admin User",
            timestamp: new Date().toISOString(),
            status: "success"
          }
        ]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch activity logs" });
      }
    }
  );

  console.log('✅ Super Admin routes registered');
}
