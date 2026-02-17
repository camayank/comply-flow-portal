/**
 * Admin Portal Routes
 * User management, system settings, analytics
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin, requireSuperAdmin } from '../middleware/rbac';
import { apiLimiter } from '../middleware/rateLimiter';
import { asyncHandler, NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler';
import { getDeprecationStats } from '../deprecation-middleware';
import { userProvisioningService } from '../services/user-provisioning-service';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);
router.use(apiLimiter);

/**
 * GET /api/v1/admin/dashboard
 */
router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const usersCount = await pool.query('SELECT COUNT(*) FROM users');
  const clientsCount = await pool.query('SELECT COUNT(*) FROM clients');
  const servicesCount = await pool.query('SELECT COUNT(*) FROM services WHERE is_active = true');
  const tasksCount = await pool.query('SELECT COUNT(*) FROM tasks WHERE status != $1', ['completed']);

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers: parseInt(usersCount.rows[0].count),
        totalClients: parseInt(clientsCount.rows[0].count),
        activeServices: parseInt(servicesCount.rows[0].count),
        activeTasks: parseInt(tasksCount.rows[0].count),
      },
    },
  });
}));

/**
 * GET /api/v1/admin/users
 */
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, search } = req.query;

  let query = `
    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at,
           array_agg(r.name) as roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
  `;
  const params: any[] = [];
  let paramCount = 0;

  if (search) {
    paramCount++;
    query += ` WHERE (u.email ILIKE $${paramCount} OR u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  query += ' GROUP BY u.id ORDER BY u.created_at DESC';

  const offset = (Number(page) - 1) * Number(limit);
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  params.push(limit);
  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await pool.query(query, params);

  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * POST /api/v1/admin/users
 */
router.post('/users', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, phone, roles } = req.body;

  if (!email || !password || !firstName) {
    throw new ValidationError('Email, password, and first name are required');
  }

  // Check if user exists
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name`,
    [email, passwordHash, firstName, lastName, phone]
  );

  const user = userResult.rows[0];

  // Assign roles
  if (roles && Array.isArray(roles)) {
    for (const roleName of roles) {
      const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);
      if (roleResult.rows.length > 0) {
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [user.id, roleResult.rows[0].id]
        );
      }
    }
  }

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user,
  });
}));

/**
 * PATCH /api/v1/admin/users/:id
 */
router.patch('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, phone, isActive } = req.body;

  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 0;

  if (firstName) {
    paramCount++;
    updates.push(`first_name = $${paramCount}`);
    values.push(firstName);
  }

  if (lastName) {
    paramCount++;
    updates.push(`last_name = $${paramCount}`);
    values.push(lastName);
  }

  if (phone) {
    paramCount++;
    updates.push(`phone = $${paramCount}`);
    values.push(phone);
  }

  if (isActive !== undefined) {
    paramCount++;
    updates.push(`is_active = $${paramCount}`);
    values.push(isActive);
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update');
  }

  paramCount++;
  values.push(id);

  const result = await pool.query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('User');
  }

  res.json({
    success: true,
    message: 'User updated successfully',
    data: result.rows[0],
  });
}));

/**
 * GET /api/v1/admin/services
 */
router.get('/services', asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM services ORDER BY name ASC');

  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * POST /api/v1/admin/services
 */
router.post('/services', asyncHandler(async (req: Request, res: Response) => {
  const { name, description, category, basePrice } = req.body;

  if (!name || !category) {
    throw new ValidationError('Name and category are required');
  }

  const result = await pool.query(
    `INSERT INTO services (name, description, category, base_price)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, description, category, basePrice]
  );

  res.status(201).json({
    success: true,
    message: 'Service created successfully',
    data: result.rows[0],
  });
}));

/**
 * GET /api/v1/admin/audit-logs
 */
router.get('/audit-logs', asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  const result = await pool.query(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * GET /api/v1/admin/settings
 */
router.get('/settings', asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM settings ORDER BY category, key');

  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * PUT /api/v1/admin/settings/:key
 */
router.put('/settings/:key', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    throw new ValidationError('Value is required');
  }

  const result = await pool.query(
    `UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP
     WHERE key = $2 RETURNING *`,
    [value, key]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Setting');
  }

  res.json({
    success: true,
    message: 'Setting updated successfully',
    data: result.rows[0],
  });
}));

/**
 * GET /api/v1/admin/deprecation-stats
 * Get API deprecation statistics for monitoring
 */
router.get('/deprecation-stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = getDeprecationStats();

  res.json({
    success: true,
    data: stats,
    message: 'Deprecation statistics retrieved successfully'
  });
}));

// ==========================================
// User Provisioning Routes
// ==========================================

/**
 * GET /api/v1/admin/provisioning/templates
 * Get available role templates for provisioning
 */
router.get('/provisioning/templates', asyncHandler(async (req: Request, res: Response) => {
  const templates = userProvisioningService.getRoleTemplates();
  res.json({
    success: true,
    data: templates,
  });
}));

/**
 * GET /api/v1/admin/provisioning/stats
 * Get user provisioning statistics
 */
router.get('/provisioning/stats', asyncHandler(async (req: Request, res: Response) => {
  const stats = await userProvisioningService.getProvisioningStats();
  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * POST /api/v1/admin/provisioning/user
 * Provision a single user
 */
router.post('/provisioning/user', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { username, email, fullName, role, department, phone, password, sendWelcomeEmail, activateImmediately } = req.body;

  if (!username || !email || !fullName || !role) {
    throw new ValidationError('Username, email, fullName, and role are required');
  }

  const currentUser = (req as any).user;
  const result = await userProvisioningService.provisionUser({
    username,
    email,
    fullName,
    role,
    department,
    phone,
    password,
    sendWelcomeEmail,
    activateImmediately,
  }, currentUser.id);

  if (!result.success) {
    throw new ConflictError(result.error || 'Failed to provision user');
  }

  res.status(201).json({
    success: true,
    message: 'User provisioned successfully',
    data: {
      userId: result.userId,
      username: result.username,
      tempPassword: result.tempPassword,
    },
  });
}));

/**
 * POST /api/v1/admin/provisioning/bulk
 * Bulk provision multiple users
 */
router.post('/provisioning/bulk', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { users: usersList, defaultRole, defaultDepartment, sendWelcomeEmails } = req.body;

  if (!usersList || !Array.isArray(usersList) || usersList.length === 0) {
    throw new ValidationError('Users array is required and must not be empty');
  }

  if (usersList.length > 100) {
    throw new ValidationError('Cannot provision more than 100 users at once');
  }

  const currentUser = (req as any).user;
  const result = await userProvisioningService.bulkProvisionUsers({
    users: usersList,
    defaultRole,
    defaultDepartment,
    sendWelcomeEmails,
  }, currentUser.id);

  res.status(201).json({
    success: true,
    message: `Provisioned ${result.successful} of ${result.total} users`,
    data: result,
  });
}));

/**
 * POST /api/v1/admin/provisioning/deprovision/:userId
 * Deprovision (deactivate) a user
 */
router.post('/provisioning/deprovision/:userId', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { reason } = req.body;

  const currentUser = (req as any).user;
  const result = await userProvisioningService.deprovisionUser(
    parseInt(userId),
    currentUser.id,
    reason
  );

  if (!result.success) {
    throw new NotFoundError(result.error || 'User');
  }

  res.json({
    success: true,
    message: 'User deprovisioned successfully',
  });
}));

/**
 * POST /api/v1/admin/provisioning/reactivate/:userId
 * Reactivate a deprovisioned user
 */
router.post('/provisioning/reactivate/:userId', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const currentUser = (req as any).user;
  const result = await userProvisioningService.reactivateUser(
    parseInt(userId),
    currentUser.id
  );

  if (!result.success) {
    throw new NotFoundError(result.error || 'User');
  }

  res.json({
    success: true,
    message: 'User reactivated successfully',
  });
}));

/**
 * PUT /api/v1/admin/provisioning/role/:userId
 * Update user role
 */
router.put('/provisioning/role/:userId', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role) {
    throw new ValidationError('Role is required');
  }

  const currentUser = (req as any).user;
  const result = await userProvisioningService.updateUserRole(
    parseInt(userId),
    role,
    currentUser.id
  );

  if (!result.success) {
    throw new NotFoundError(result.error || 'User');
  }

  res.json({
    success: true,
    message: 'User role updated successfully',
  });
}));

/**
 * POST /api/v1/admin/provisioning/reset-password/:userId
 * Reset user password
 */
router.post('/provisioning/reset-password/:userId', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  const currentUser = (req as any).user;
  const result = await userProvisioningService.resetPassword(
    parseInt(userId),
    currentUser.id,
    newPassword
  );

  if (!result.success) {
    throw new NotFoundError(result.error || 'User');
  }

  res.json({
    success: true,
    message: 'Password reset successfully',
    data: {
      tempPassword: result.tempPassword,
    },
  });
}));

/**
 * GET /api/v1/admin/provisioning/onboarding/:userId
 * Get user onboarding status
 */
router.get('/provisioning/onboarding/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const status = await userProvisioningService.getOnboardingStatus(parseInt(userId));

  if (!status) {
    throw new NotFoundError('User');
  }

  res.json({
    success: true,
    data: status,
  });
}));

export default router;
