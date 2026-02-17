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
import { slaService } from '../services/sla-service';

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

// =====================================================
// TASK REASSIGNMENT & ESCALATION - CRITICAL APIS
// =====================================================

/**
 * PATCH /api/v1/operations/tasks/:id/reassign
 * Reassign task to different team member (Ops Manager only)
 */
router.patch('/tasks/:id/reassign', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newAssigneeId, newAssigneeName, reason, notifyPreviousAssignee = true } = req.body;

  if (!newAssigneeId) {
    throw new ValidationError('newAssigneeId is required');
  }

  // Get current task
  const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (taskResult.rows.length === 0) {
    throw new NotFoundError('Task');
  }

  const task = taskResult.rows[0];
  const previousAssignee = task.assigned_to;
  const previousAssigneeName = task.assigned_to_name;

  // Update task with new assignee
  const result = await pool.query(
    `UPDATE tasks SET
      assigned_to = $1,
      assigned_to_name = $2,
      reassigned_at = CURRENT_TIMESTAMP,
      reassigned_by = $3,
      reassignment_reason = $4,
      reassignment_count = COALESCE(reassignment_count, 0) + 1,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 RETURNING *`,
    [newAssigneeId, newAssigneeName, req.userId, reason, id]
  );

  // Log the reassignment in activity
  await pool.query(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      req.userId,
      'task_reassigned',
      'task',
      id,
      JSON.stringify({
        taskId: id,
        previousAssignee,
        previousAssigneeName,
        newAssigneeId,
        newAssigneeName,
        reason
      }),
      req.ip
    ]
  );

  res.json({
    success: true,
    message: 'Task reassigned successfully',
    data: result.rows[0],
    previousAssignee: {
      id: previousAssignee,
      name: previousAssigneeName,
      notified: notifyPreviousAssignee
    }
  });
}));

/**
 * POST /api/v1/operations/tasks/:id/escalate
 * Escalate task to manager (Ops Executive can escalate their own tasks)
 */
router.post('/tasks/:id/escalate', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, blockerType, urgency = 'high' } = req.body;

  if (!reason) {
    throw new ValidationError('Escalation reason is required');
  }

  // Get current task
  const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (taskResult.rows.length === 0) {
    throw new NotFoundError('Task');
  }

  const task = taskResult.rows[0];

  // Create escalation record
  const escalationResult = await pool.query(
    `INSERT INTO task_escalations (
      task_id, escalated_by, escalation_reason, blocker_type, urgency, status, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *`,
    [id, req.userId, reason, blockerType, urgency, 'pending']
  );

  // Update task with escalation flag
  await pool.query(
    `UPDATE tasks SET
      is_escalated = true,
      escalation_id = $1,
      escalated_at = CURRENT_TIMESTAMP,
      priority = CASE WHEN $2 = 'critical' THEN 'critical' ELSE priority END,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [escalationResult.rows[0].id, urgency, id]
  );

  // Log escalation
  await pool.query(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      req.userId,
      'task_escalated',
      'task',
      id,
      JSON.stringify({
        taskId: id,
        taskTitle: task.title,
        reason,
        blockerType,
        urgency,
        escalationId: escalationResult.rows[0].id
      }),
      req.ip
    ]
  );

  res.json({
    success: true,
    message: 'Task escalated to manager',
    escalation: escalationResult.rows[0]
  });
}));

/**
 * GET /api/v1/operations/escalations
 * Get all escalated tasks (Ops Manager)
 */
router.get('/escalations', asyncHandler(async (req: Request, res: Response) => {
  const { status = 'pending', urgency, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT e.*, t.title as task_title, t.description as task_description,
           t.client_id, t.service_request_id, t.due_date as task_due_date,
           u.full_name as escalated_by_name
    FROM task_escalations e
    JOIN tasks t ON e.task_id = t.id
    LEFT JOIN users u ON e.escalated_by = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramCount = 0;

  if (status && status !== 'all') {
    paramCount++;
    query += ` AND e.status = $${paramCount}`;
    params.push(status);
  }

  if (urgency) {
    paramCount++;
    query += ` AND e.urgency = $${paramCount}`;
    params.push(urgency);
  }

  query += ' ORDER BY CASE e.urgency WHEN \'critical\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, e.created_at DESC';

  const offset = (Number(page) - 1) * Number(limit);
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  params.push(limit);
  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await pool.query(query, params);

  // Get count
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM task_escalations WHERE status = $1`,
    [status]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit)
    }
  });
}));

/**
 * PATCH /api/v1/operations/escalations/:id/resolve
 * Resolve an escalation (Ops Manager)
 */
router.patch('/escalations/:id/resolve', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { resolution, actionTaken, reassignTo } = req.body;

  if (!resolution) {
    throw new ValidationError('Resolution is required');
  }

  // Get escalation
  const escResult = await pool.query('SELECT * FROM task_escalations WHERE id = $1', [id]);
  if (escResult.rows.length === 0) {
    throw new NotFoundError('Escalation');
  }

  const escalation = escResult.rows[0];

  // Update escalation
  const result = await pool.query(
    `UPDATE task_escalations SET
      status = 'resolved',
      resolution = $1,
      action_taken = $2,
      resolved_by = $3,
      resolved_at = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING *`,
    [resolution, actionTaken, req.userId, id]
  );

  // Update task
  const taskUpdates: string[] = ['is_escalated = false', 'updated_at = CURRENT_TIMESTAMP'];
  const taskParams: any[] = [];
  let taskParamCount = 0;

  if (reassignTo) {
    taskParamCount++;
    taskUpdates.push(`assigned_to = $${taskParamCount}`);
    taskParams.push(reassignTo);
  }

  taskParamCount++;
  taskParams.push(escalation.task_id);

  await pool.query(
    `UPDATE tasks SET ${taskUpdates.join(', ')} WHERE id = $${taskParamCount}`,
    taskParams
  );

  res.json({
    success: true,
    message: 'Escalation resolved',
    data: result.rows[0]
  });
}));

/**
 * GET /api/v1/operations/team-members
 * Get list of operations team members with workload
 */
router.get('/team-members', asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT
      u.id, u.full_name, u.email, u.role, u.is_active,
      COUNT(CASE WHEN t.status NOT IN ('completed', 'cancelled') THEN 1 END) as active_tasks,
      COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
      COUNT(CASE WHEN t.due_date < CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue_tasks,
      COUNT(CASE WHEN t.is_escalated = true AND t.status NOT IN ('completed', 'cancelled') THEN 1 END) as escalated_tasks,
      MAX(t.assigned_at) as last_task_assigned
    FROM users u
    LEFT JOIN tasks t ON u.id = t.assigned_to
    WHERE u.role IN ('operations_manager', 'operations_executive', 'ops_manager', 'ops_executive')
      AND u.is_active = true
    GROUP BY u.id, u.full_name, u.email, u.role, u.is_active
    ORDER BY active_tasks ASC
  `);

  // Calculate availability score for each member
  const teamMembers = result.rows.map(member => ({
    ...member,
    capacity: 12, // Max tasks per person
    utilization: Math.round((member.active_tasks / 12) * 100),
    available: member.active_tasks < 10,
    availabilityScore: Math.max(0, 100 - (member.active_tasks * 10) - (member.overdue_tasks * 20) - (member.escalated_tasks * 15))
  }));

  res.json({
    success: true,
    data: teamMembers
  });
}));

/**
 * GET /api/v1/operations/performance-snapshot
 * Get team performance metrics (Ops Manager)
 */
router.get('/performance-snapshot', asyncHandler(async (req: Request, res: Response) => {
  const { period = '7d' } = req.query;

  // Calculate date range
  let dateFilter = "CURRENT_DATE - INTERVAL '7 days'";
  if (period === '30d') dateFilter = "CURRENT_DATE - INTERVAL '30 days'";
  if (period === '90d') dateFilter = "CURRENT_DATE - INTERVAL '90 days'";

  // Get completion metrics
  const completionResult = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
      COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled')) as pending_tasks,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as overdue_tasks,
      COUNT(*) FILTER (WHERE is_escalated = true) as escalated_tasks,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) FILTER (WHERE status = 'completed') as avg_completion_hours
    FROM tasks
    WHERE created_at >= ${dateFilter}
  `);

  // Get per-person metrics
  const personResult = await pool.query(`
    SELECT
      u.id, u.full_name,
      COUNT(*) FILTER (WHERE t.status = 'completed') as completed,
      COUNT(*) FILTER (WHERE t.status NOT IN ('completed', 'cancelled')) as pending,
      COUNT(*) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled')) as overdue,
      AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 3600) FILTER (WHERE t.status = 'completed') as avg_hours
    FROM users u
    LEFT JOIN tasks t ON u.id = t.assigned_to AND t.created_at >= ${dateFilter}
    WHERE u.role IN ('operations_manager', 'operations_executive', 'ops_manager', 'ops_executive')
      AND u.is_active = true
    GROUP BY u.id, u.full_name
    ORDER BY completed DESC
  `);

  // Get SLA metrics
  const slaResult = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE completed_at <= due_date) as on_time,
      COUNT(*) FILTER (WHERE completed_at > due_date) as late,
      COUNT(*) FILTER (WHERE status = 'completed') as total_completed
    FROM tasks
    WHERE created_at >= ${dateFilter} AND status = 'completed' AND due_date IS NOT NULL
  `);

  const sla = slaResult.rows[0];
  const slaComplianceRate = sla.total_completed > 0
    ? Math.round((sla.on_time / sla.total_completed) * 100)
    : 100;

  res.json({
    success: true,
    data: {
      period,
      summary: {
        ...completionResult.rows[0],
        avg_completion_hours: completionResult.rows[0].avg_completion_hours
          ? Math.round(completionResult.rows[0].avg_completion_hours * 10) / 10
          : null
      },
      slaCompliance: {
        rate: slaComplianceRate,
        onTime: parseInt(sla.on_time),
        late: parseInt(sla.late),
        total: parseInt(sla.total_completed)
      },
      teamPerformance: personResult.rows.map(p => ({
        ...p,
        avg_hours: p.avg_hours ? Math.round(p.avg_hours * 10) / 10 : null
      }))
    }
  });
}));

/**
 * POST /api/v1/operations/tasks/bulk-assign
 * Bulk assign tasks to team members (Ops Manager)
 */
router.post('/tasks/bulk-assign', asyncHandler(async (req: Request, res: Response) => {
  const { taskIds, assigneeId, assigneeName, distributionType = 'manual' } = req.body;

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new ValidationError('taskIds array is required');
  }

  const results: { success: any[]; failed: any[] } = { success: [], failed: [] };

  // Get team members for distribution
  let teamMembers: any[] = [];
  if (distributionType !== 'manual') {
    const teamResult = await pool.query(`
      SELECT u.id, u.full_name, COUNT(t.id) as task_count
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to AND t.status NOT IN ('completed', 'cancelled')
      WHERE u.role IN ('operations_manager', 'operations_executive', 'ops_manager', 'ops_executive')
        AND u.is_active = true
      GROUP BY u.id, u.full_name
      ORDER BY task_count ASC
    `);
    teamMembers = teamResult.rows;
  }

  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    try {
      let targetAssignee = assigneeId;
      let targetAssigneeName = assigneeName;

      if (distributionType === 'round_robin' && teamMembers.length > 0) {
        const idx = i % teamMembers.length;
        targetAssignee = teamMembers[idx].id;
        targetAssigneeName = teamMembers[idx].full_name;
      } else if (distributionType === 'load_balanced' && teamMembers.length > 0) {
        const minLoad = teamMembers.reduce((min, m) =>
          (parseInt(m.task_count) || 0) < (parseInt(min.task_count) || 0) ? m : min
        , teamMembers[0]);
        targetAssignee = minLoad.id;
        targetAssigneeName = minLoad.full_name;
        minLoad.task_count = (parseInt(minLoad.task_count) || 0) + 1;
      }

      const result = await pool.query(
        `UPDATE tasks SET assigned_to = $1, assigned_to_name = $2,
         assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 RETURNING id`,
        [targetAssignee, targetAssigneeName, taskId]
      );

      if (result.rows.length > 0) {
        results.success.push({ taskId, assignedTo: targetAssignee, assignedToName: targetAssigneeName });
      } else {
        results.failed.push({ taskId, error: 'Task not found' });
      }
    } catch (err: any) {
      results.failed.push({ taskId, error: err.message });
    }
  }

  // Log bulk assignment
  await pool.query(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      req.userId,
      'tasks_bulk_assigned',
      'task',
      0,
      JSON.stringify({
        totalTasks: taskIds.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        distributionType
      }),
      req.ip
    ]
  );

  res.json({
    success: true,
    message: `Assigned ${results.success.length} of ${taskIds.length} tasks`,
    results
  });
}));

// =====================================================
// SLA MANAGEMENT ENDPOINTS
// =====================================================

/**
 * GET /api/v1/operations/sla/:requestId
 * Get SLA status for a specific service request
 */
router.get('/sla/:requestId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.requestId);

    if (isNaN(requestId)) {
      throw new ValidationError('Invalid request ID');
    }

    const status = await slaService.getStatus(requestId);

    if (!status) {
      throw new NotFoundError('Service request');
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    res.status(500).json({ error: 'Failed to get SLA status' });
  }
}));

/**
 * GET /api/v1/operations/sla/summary
 * Get SLA summary statistics for dashboard
 */
router.get('/sla/summary', asyncHandler(async (req: Request, res: Response) => {
  try {
    const summary = await slaService.getSLASummary();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get SLA summary' });
  }
}));

/**
 * POST /api/v1/operations/sla/check
 * Trigger SLA check manually (admin only)
 */
router.post('/sla/check', asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await slaService.checkBreachesAndEscalate();

    res.json({
      success: true,
      message: `SLA check completed: ${result.checked} checked, ${result.escalated} escalated, ${result.breached} breached`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: 'SLA check failed' });
  }
}));

/**
 * POST /api/v1/operations/sla/:requestId/escalate
 * Manually escalate a service request
 */
router.post('/sla/:requestId/escalate', asyncHandler(async (req: Request, res: Response) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const { level = 1, notifyRoles = ['ops_manager'] } = req.body;

    if (isNaN(requestId)) {
      throw new ValidationError('Invalid request ID');
    }

    const success = await slaService.escalate(requestId, level, notifyRoles);

    if (!success) {
      throw new NotFoundError('Service request');
    }

    res.json({
      success: true,
      message: `Service request escalated to level ${level}`
    });
  } catch (error: any) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    res.status(500).json({ error: 'Failed to escalate service request' });
  }
}));

export default router;
