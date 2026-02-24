/**
 * Task Routes
 *
 * API endpoints for managing order tasks:
 * - GET /api/orders/:id/tasks - List all tasks for an order
 * - GET /api/tasks/my-tasks - Get current user's assigned tasks
 * - GET /api/tasks/unassigned - Get unassigned tasks (for supervisors)
 * - GET /api/tasks/:id - Get single task details
 * - PATCH /api/tasks/:id/status - Update task status (with dependency cascade)
 * - POST /api/tasks/:id/assign - Assign task to user
 * - POST /api/tasks/:id/submit-qc - Submit task for QC review
 * - POST /api/tasks/:id/qc-result - Handle QC approval/rejection
 */

import { Express, Response } from 'express';
import { taskInstantiationService } from './services/task-instantiation-service';
import { ORDER_TASK_STATUS } from '@shared/schema';
import { logger } from './logger';

// Auth middleware type
interface AuthenticatedRequest {
  user?: {
    id: number;
    role: string;
    username: string;
  };
  params: any;
  body: any;
  query: any;
}

// Helper to parse ID that could be numeric or string (readable ID)
function parseTaskId(idParam: string): { type: 'numeric' | 'readable'; value: string | number } {
  if (/^\d+$/.test(idParam)) {
    return { type: 'numeric', value: parseInt(idParam, 10) };
  }
  return { type: 'readable', value: idParam };
}

export function registerTaskRoutes(app: Express, requireAuth: any[], requireOpsAccess: any[], requireQCAccess: any[]): void {

  // ==========================================================================
  // GET /api/orders/:id/tasks - List all tasks for an order
  // ==========================================================================
  app.get('/api/orders/:id/tasks', ...requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const serviceRequestId = parseInt(req.params.id, 10);

      if (isNaN(serviceRequestId)) {
        return res.status(400).json({
          error: { code: 'INVALID_ID', message: 'Invalid order ID' }
        });
      }

      const tasks = await taskInstantiationService.getTasksForOrder(serviceRequestId);

      // Enrich with progress info
      const completedCount = tasks.filter(t =>
        t.status === ORDER_TASK_STATUS.COMPLETED ||
        t.status === ORDER_TASK_STATUS.SKIPPED
      ).length;

      const inProgressCount = tasks.filter(t =>
        t.status === ORDER_TASK_STATUS.IN_PROGRESS ||
        t.status === ORDER_TASK_STATUS.QC_PENDING
      ).length;

      res.json({
        success: true,
        data: {
          tasks,
          summary: {
            total: tasks.length,
            completed: completedCount,
            inProgress: inProgressCount,
            pending: tasks.length - completedCount - inProgressCount,
            progressPercentage: tasks.length > 0
              ? Math.round((completedCount / tasks.length) * 100)
              : 0
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching order tasks:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch order tasks' }
      });
    }
  });

  // ==========================================================================
  // GET /api/tasks/my-tasks - Get current user's assigned tasks
  // ==========================================================================
  app.get('/api/tasks/my-tasks', ...requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
      }

      // Optional status filter
      const statusFilter = req.query.status
        ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) as string[]
        : undefined;

      const tasks = await taskInstantiationService.getTasksForUser(userId, statusFilter);

      // Group by status
      const tasksByStatus = {
        ready: tasks.filter(t => t.status === ORDER_TASK_STATUS.READY),
        inProgress: tasks.filter(t => t.status === ORDER_TASK_STATUS.IN_PROGRESS),
        qcPending: tasks.filter(t => t.status === ORDER_TASK_STATUS.QC_PENDING),
        qcRejected: tasks.filter(t => t.status === ORDER_TASK_STATUS.QC_REJECTED),
        completed: tasks.filter(t => t.status === ORDER_TASK_STATUS.COMPLETED),
      };

      res.json({
        success: true,
        data: {
          tasks,
          byStatus: tasksByStatus,
          counts: {
            total: tasks.length,
            actionRequired: tasksByStatus.ready.length + tasksByStatus.qcRejected.length,
            inProgress: tasksByStatus.inProgress.length,
            awaitingQc: tasksByStatus.qcPending.length,
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching user tasks:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user tasks' }
      });
    }
  });

  // ==========================================================================
  // GET /api/tasks/unassigned - Get unassigned tasks ready for pickup
  // ==========================================================================
  app.get('/api/tasks/unassigned', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const role = req.query.role as string | undefined;

      const tasks = await taskInstantiationService.getUnassignedReadyTasks(role);

      res.json({
        success: true,
        data: {
          tasks,
          count: tasks.length
        }
      });

    } catch (error) {
      logger.error('Error fetching unassigned tasks:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch unassigned tasks' }
      });
    }
  });

  // ==========================================================================
  // GET /api/tasks/:id - Get single task details
  // ==========================================================================
  app.get('/api/tasks/:id', ...requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = parseTaskId(req.params.id);

      let task;
      if (parsed.type === 'numeric') {
        task = await taskInstantiationService.getTask(parsed.value as number);
      } else {
        task = await taskInstantiationService.getTaskByReadableId(parsed.value as string);
      }

      if (!task) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Task not found' }
        });
      }

      res.json({
        success: true,
        data: task
      });

    } catch (error) {
      logger.error('Error fetching task:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch task' }
      });
    }
  });

  // ==========================================================================
  // PATCH /api/tasks/:id/status - Update task status (with dependency cascade)
  // ==========================================================================
  app.patch('/api/tasks/:id/status', ...requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = parseTaskId(req.params.id);
      const { status, notes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
      }

      if (!status) {
        return res.status(400).json({
          error: { code: 'MISSING_STATUS', message: 'Status is required' }
        });
      }

      // Validate status value
      const validStatuses = Object.values(ORDER_TASK_STATUS);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_STATUS',
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          }
        });
      }

      // Get task ID
      let taskId: number;
      if (parsed.type === 'numeric') {
        taskId = parsed.value as number;
      } else {
        const task = await taskInstantiationService.getTaskByReadableId(parsed.value as string);
        if (!task) {
          return res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Task not found' }
          });
        }
        taskId = task.id;
      }

      const result = await taskInstantiationService.updateTaskStatus(
        taskId,
        status,
        userId,
        notes
      );

      if (!result.success) {
        return res.status(400).json({
          error: { code: 'STATUS_UPDATE_FAILED', message: result.error }
        });
      }

      res.json({
        success: true,
        data: {
          task: result.task,
          unblockedTasks: result.unblockedTasks,
          orderCompleted: result.orderCompleted,
          orderProgress: result.orderProgress,
          qcReviewId: result.qcReviewId
        }
      });

    } catch (error) {
      logger.error('Error updating task status:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update task status' }
      });
    }
  });

  // ==========================================================================
  // POST /api/tasks/:id/assign - Assign task to user
  // ==========================================================================
  app.post('/api/tasks/:id/assign', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = parseTaskId(req.params.id);
      const { assignToUserId } = req.body;
      const assignedBy = req.user?.id;

      if (!assignedBy) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
      }

      if (!assignToUserId) {
        return res.status(400).json({
          error: { code: 'MISSING_USER', message: 'assignToUserId is required' }
        });
      }

      // Get task ID
      let taskId: number;
      if (parsed.type === 'numeric') {
        taskId = parsed.value as number;
      } else {
        const task = await taskInstantiationService.getTaskByReadableId(parsed.value as string);
        if (!task) {
          return res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Task not found' }
          });
        }
        taskId = task.id;
      }

      const task = await taskInstantiationService.assignTask(
        taskId,
        parseInt(assignToUserId, 10),
        assignedBy
      );

      if (!task) {
        return res.status(400).json({
          error: { code: 'ASSIGNMENT_FAILED', message: 'Failed to assign task' }
        });
      }

      res.json({
        success: true,
        data: task
      });

    } catch (error) {
      logger.error('Error assigning task:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to assign task' }
      });
    }
  });

  // ==========================================================================
  // POST /api/tasks/:id/auto-assign - Trigger auto-assignment
  // ==========================================================================
  app.post('/api/tasks/:id/auto-assign', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = parseTaskId(req.params.id);

      // Get task ID
      let taskId: number;
      if (parsed.type === 'numeric') {
        taskId = parsed.value as number;
      } else {
        const task = await taskInstantiationService.getTaskByReadableId(parsed.value as string);
        if (!task) {
          return res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Task not found' }
          });
        }
        taskId = task.id;
      }

      const result = await taskInstantiationService.autoAssignTask(taskId);

      res.json({
        success: result.success,
        data: result
      });

    } catch (error) {
      logger.error('Error auto-assigning task:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to auto-assign task' }
      });
    }
  });

  // ==========================================================================
  // POST /api/tasks/:id/submit-qc - Submit task for QC review
  // ==========================================================================
  app.post('/api/tasks/:id/submit-qc', ...requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = parseTaskId(req.params.id);
      const { notes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
      }

      // Get task ID
      let taskId: number;
      if (parsed.type === 'numeric') {
        taskId = parsed.value as number;
      } else {
        const task = await taskInstantiationService.getTaskByReadableId(parsed.value as string);
        if (!task) {
          return res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Task not found' }
          });
        }
        taskId = task.id;
      }

      const result = await taskInstantiationService.submitTaskForQc(taskId, userId, notes);

      if (!result.success) {
        return res.status(400).json({
          error: { code: 'QC_SUBMIT_FAILED', message: result.error }
        });
      }

      res.json({
        success: true,
        data: {
          task: result.task,
          qcReviewId: result.qcReviewId,
          orderProgress: result.orderProgress
        }
      });

    } catch (error) {
      logger.error('Error submitting task for QC:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to submit task for QC' }
      });
    }
  });

  // ==========================================================================
  // POST /api/tasks/:id/qc-result - Handle QC approval/rejection
  // ==========================================================================
  app.post('/api/tasks/:id/qc-result', ...requireQCAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = parseTaskId(req.params.id);
      const { approved, notes } = req.body;
      const reviewerId = req.user?.id;

      if (!reviewerId) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' }
        });
      }

      if (typeof approved !== 'boolean') {
        return res.status(400).json({
          error: { code: 'MISSING_APPROVAL', message: 'approved (boolean) is required' }
        });
      }

      // Get task ID
      let taskId: number;
      if (parsed.type === 'numeric') {
        taskId = parsed.value as number;
      } else {
        const task = await taskInstantiationService.getTaskByReadableId(parsed.value as string);
        if (!task) {
          return res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Task not found' }
          });
        }
        taskId = task.id;
      }

      const result = await taskInstantiationService.handleQcResult(
        taskId,
        approved,
        reviewerId,
        notes
      );

      if (!result.success) {
        return res.status(400).json({
          error: { code: 'QC_RESULT_FAILED', message: result.error }
        });
      }

      res.json({
        success: true,
        data: {
          task: result.task,
          unblockedTasks: result.unblockedTasks,
          orderCompleted: result.orderCompleted,
          orderProgress: result.orderProgress
        }
      });

    } catch (error) {
      logger.error('Error processing QC result:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process QC result' }
      });
    }
  });

  // ==========================================================================
  // POST /api/orders/:id/instantiate-tasks - Manually trigger task instantiation
  // ==========================================================================
  app.post('/api/orders/:id/instantiate-tasks', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const serviceRequestId = parseInt(req.params.id, 10);
      const { workflowTemplateId } = req.body;

      if (isNaN(serviceRequestId)) {
        return res.status(400).json({
          error: { code: 'INVALID_ID', message: 'Invalid order ID' }
        });
      }

      // Check if tasks already exist
      const existingTasks = await taskInstantiationService.getTasksForOrder(serviceRequestId);
      if (existingTasks.length > 0) {
        return res.status(400).json({
          error: {
            code: 'TASKS_EXIST',
            message: 'Tasks already exist for this order',
            existingCount: existingTasks.length
          }
        });
      }

      const result = await taskInstantiationService.instantiateTasksForOrder(
        serviceRequestId,
        workflowTemplateId
      );

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: 'INSTANTIATION_FAILED',
            message: 'Failed to instantiate tasks',
            details: result.errors
          }
        });
      }

      res.json({
        success: true,
        data: {
          serviceRequestId: result.serviceRequestId,
          tasksCreated: result.tasksCreated,
          tasks: result.tasks
        }
      });

    } catch (error) {
      logger.error('Error instantiating tasks:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to instantiate tasks' }
      });
    }
  });

  // ==========================================================================
  // GET /api/tasks/stats - Get task statistics (for dashboard)
  // ==========================================================================
  app.get('/api/tasks/stats', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { db } = await import('./db');
      const { orderTasks, ORDER_TASK_STATUS } = await import('@shared/schema');
      const { sql, eq, and, gte, lte, isNull, not } = await import('drizzle-orm');

      // Get counts by status
      const statusCounts = await db
        .select({
          status: orderTasks.status,
          count: sql<number>`count(*)::int`
        })
        .from(orderTasks)
        .groupBy(orderTasks.status);

      // Get unassigned count
      const [unassignedResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(orderTasks)
        .where(
          and(
            isNull(orderTasks.assignedTo),
            eq(orderTasks.status, ORDER_TASK_STATUS.READY)
          )
        );

      // Get overdue count
      const [overdueResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(orderTasks)
        .where(
          and(
            lte(orderTasks.dueDate, new Date()),
            not(eq(orderTasks.status, ORDER_TASK_STATUS.COMPLETED)),
            not(eq(orderTasks.status, ORDER_TASK_STATUS.SKIPPED)),
            not(eq(orderTasks.status, ORDER_TASK_STATUS.CANCELLED))
          )
        );

      // Transform to object
      const byStatus: Record<string, number> = {};
      statusCounts.forEach(row => {
        byStatus[row.status] = row.count;
      });

      res.json({
        success: true,
        data: {
          byStatus,
          total: Object.values(byStatus).reduce((a, b) => a + b, 0),
          unassigned: unassignedResult?.count || 0,
          overdue: overdueResult?.count || 0
        }
      });

    } catch (error) {
      logger.error('Error fetching task stats:', error);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch task statistics' }
      });
    }
  });

  logger.info('Task routes registered successfully');
}
