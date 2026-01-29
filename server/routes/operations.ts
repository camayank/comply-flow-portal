/**
 * Operations Portal Routes
 * Task management, workflows, service delivery
 */

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { apiLimiter } from '../middleware/rateLimiter';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('operations_manager', 'operations_executive', 'admin', 'super_admin'));
router.use(apiLimiter);

/**
 * GET /api/v1/operations/dashboard
 */
router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  const tasksResult = await pool.query(
    'SELECT COUNT(*) FROM tasks WHERE assigned_to = $1 AND status != $2',
    [userId, 'completed']
  );

  res.json({
    success: true,
    data: {
      stats: {
        activeTasks: parseInt(tasksResult.rows[0].count),
      },
    },
  });
}));

/**
 * GET /api/v1/operations/tasks
 */
router.get('/tasks', asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, page = 1, limit = 20 } = req.query;

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params: any[] = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    params.push(status);
  }

  if (priority) {
    paramCount++;
    query += ` AND priority = $${paramCount}`;
    params.push(priority);
  }

  query += ' ORDER BY due_date ASC NULLS LAST, created_at DESC';

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
 * POST /api/v1/operations/tasks
 */
router.post('/tasks', asyncHandler(async (req: Request, res: Response) => {
  const { title, description, clientId, assignedTo, priority, dueDate } = req.body;

  if (!title) {
    throw new ValidationError('Title is required');
  }

  const result = await pool.query(
    `INSERT INTO tasks (title, description, client_id, assigned_to, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [title, description, clientId, assignedTo, priority || 'medium', dueDate]
  );

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: result.rows[0],
  });
}));

/**
 * GET /api/v1/operations/tasks/:id
 */
router.get('/tasks/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Task');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

/**
 * PATCH /api/v1/operations/tasks/:id
 */
router.patch('/tasks/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, status, priority, dueDate } = req.body;

  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 0;

  if (title) {
    paramCount++;
    updates.push(`title = $${paramCount}`);
    values.push(title);
  }

  if (description) {
    paramCount++;
    updates.push(`description = $${paramCount}`);
    values.push(description);
  }

  if (status) {
    paramCount++;
    updates.push(`status = $${paramCount}`);
    values.push(status);
  }

  if (priority) {
    paramCount++;
    updates.push(`priority = $${paramCount}`);
    values.push(priority);
  }

  if (dueDate) {
    paramCount++;
    updates.push(`due_date = $${paramCount}`);
    values.push(dueDate);
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update');
  }

  paramCount++;
  values.push(id);

  const result = await pool.query(
    `UPDATE tasks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Task');
  }

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: result.rows[0],
  });
}));

/**
 * POST /api/v1/operations/tasks/:id/complete
 */
router.post('/tasks/:id/complete', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    `UPDATE tasks SET status = $1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    ['completed', id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Task');
  }

  // TRIGGER: Task completed → recalculate compliance state
  const task = result.rows[0];
  if (task.client_id) {
    const { triggerEntityRecalculation } = require('../compliance-event-emitter');
    triggerEntityRecalculation(task.client_id, 'task_completed', {
      taskId: task.id,
      taskTitle: task.title,
      serviceId: task.service_id,
    });
  }

  res.json({
    success: true,
    message: 'Task marked as completed',
    data: result.rows[0],
  });
}));

export default router;
