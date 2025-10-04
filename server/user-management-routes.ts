import type { Express } from "express";
import { db } from './db';
import { users } from '@shared/schema';
import { eq, desc, or, like, and } from 'drizzle-orm';
import { insertUserSchema, updateUserSchema, USER_ROLES } from '@shared/schema';
import bcrypt from 'bcrypt';

export function registerUserManagementRoutes(app: Express) {

  // Middleware to check if user is super_admin
  const requireSuperAdmin = (req: any, res: any, next: any) => {
    // TODO: Implement proper session/auth middleware
    // For now, this is a placeholder - will be replaced with actual auth
    const userRole = req.headers['x-user-role']; // Temporary hack
    if (userRole !== USER_ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    }
    next();
  };

  // Get all users (Super Admin only)
  app.get('/api/admin/users', requireSuperAdmin, async (req, res) => {
    try {
      const { role, search, isActive } = req.query;

      let conditions = [];

      if (role) {
        conditions.push(eq(users.role, role as string));
      }

      if (search) {
        conditions.push(
          or(
            like(users.email, `%${search}%`),
            like(users.username, `%${search}%`),
            like(users.fullName, `%${search}%`)
          )
        );
      }

      if (isActive !== undefined) {
        conditions.push(eq(users.isActive, isActive === 'true'));
      }

      const allUsers = conditions.length > 0
        ? await db
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
            })
            .from(users)
            .where(and(...conditions))
            .orderBy(desc(users.createdAt))
        : await db
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
            })
            .from(users)
            .orderBy(desc(users.createdAt));

      res.json(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get single user by ID (Super Admin only)
  app.get('/api/admin/users/:id', requireSuperAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      const [user] = await db
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
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Create new user (Super Admin only)
  app.post('/api/admin/users', requireSuperAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Get creator ID from request (temporary hack)
      const creatorId = parseInt(req.headers['x-user-id'] as string) || null;

      const [newUser] = await db
        .insert(users)
        .values({
          ...validatedData,
          password: hashedPassword,
          createdBy: creatorId,
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

      res.status(201).json(newUser);
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Username or email already exists' });
      }

      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }

      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Update user (Super Admin only)
  app.patch('/api/admin/users/:id', requireSuperAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const validatedData = updateUserSchema.parse(req.body);

      const [updatedUser] = await db
        .update(users)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
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
          createdAt: users.createdAt,
        });

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(updatedUser);
    } catch (error: any) {
      console.error('Error updating user:', error);

      if (error.code === '23505') {
        return res.status(409).json({ error: 'Username or email already exists' });
      }

      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid data', details: error.errors });
      }

      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Deactivate user (Super Admin only)
  app.delete('/api/admin/users/:id', requireSuperAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

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

      if (!deactivatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User deactivated successfully', user: deactivatedUser });
    } catch (error) {
      console.error('Error deactivating user:', error);
      res.status(500).json({ error: 'Failed to deactivate user' });
    }
  });

  // Change user password (Super Admin only)
  app.patch('/api/admin/users/:id/password', requireSuperAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const [updatedUser] = await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          username: users.username,
          email: users.email,
        });

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'Password updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  // Get user statistics (Super Admin only)
  app.get('/api/admin/users/stats/summary', requireSuperAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);

      const stats = {
        total: allUsers.length,
        active: allUsers.filter(u => u.isActive).length,
        inactive: allUsers.filter(u => !u.isActive).length,
        byRole: {
          super_admin: allUsers.filter(u => u.role === USER_ROLES.SUPER_ADMIN).length,
          admin: allUsers.filter(u => u.role === USER_ROLES.ADMIN).length,
          ops_executive: allUsers.filter(u => u.role === USER_ROLES.OPS_EXECUTIVE).length,
          customer_service: allUsers.filter(u => u.role === USER_ROLES.CUSTOMER_SERVICE).length,
          client: allUsers.filter(u => u.role === USER_ROLES.CLIENT).length,
          agent: allUsers.filter(u => u.role === USER_ROLES.AGENT).length,
        },
        twoFactorEnabled: allUsers.filter(u => u.isTwoFactorEnabled).length,
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
  });

  console.log('✅ User Management routes registered');
}
