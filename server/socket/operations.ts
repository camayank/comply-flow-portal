/**
 * OPERATIONS SOCKET.IO HANDLERS
 * File: server/socket/operations.ts
 *
 * Real-time synchronization for Operations Panel
 * Handles task updates, SLA alerts, team notifications
 */

import { Server, Namespace } from 'socket.io';
import { db } from '../config/database';
import {
  taskItems,
  users,
  serviceRequests,
  businessEntities,
  taskActivityLog
} from '../../shared/schema';
import { eq, and, lt, gt, sql, desc } from 'drizzle-orm';
import { logger } from '../config/logger';
import { verifyToken } from '../config/jwt';
import {
  AuthenticatedSocket,
  SocketUser,
  TaskUpdateData,
  TaskData,
  SlaAlert,
  TaskFilters,
  TaskUpdatedPayload,
  CommentAddedPayload,
  ServerToClientEvents,
  ClientToServerEvents
} from './types';

// ============ CONNECTION TRACKING ============

const activeConnections = new Map<number, Set<string>>();
const userPresence = new Map<number, {
  status: 'online' | 'away' | 'busy';
  lastActivity: Date;
  currentView?: string;
}>();

// ============ NAMESPACE SETUP ============

/**
 * Initialize Operations Socket Namespace
 */
export function setupOperationsSocket(io: Server): Namespace {
  const opsNamespace = io.of('/operations');

  // Authentication middleware
  opsNamespace.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token ||
        socket.handshake.query.token as string;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      // Only allow Ops, Admin, Super Admin, Customer Service roles
      const allowedRoles = ['ops_executive', 'admin', 'super_admin', 'customer_service'];
      if (!allowedRoles.includes(decoded.role?.toLowerCase())) {
        return next(new Error('Insufficient permissions for operations panel'));
      }

      socket.user = {
        id: parseInt(decoded.userId),
        role: decoded.role,
        name: decoded.name || decoded.email || 'Unknown',
        email: decoded.email,
        teamId: decoded.teamId,
        department: decoded.department
      };

      next();
    } catch (error: any) {
      logger.warn('Operations socket auth failed', { error: error.message });
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  opsNamespace.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;

    logger.info('Operations socket connected', {
      userId: user.id,
      name: user.name,
      role: user.role,
      socketId: socket.id
    });

    // Track connection
    if (!activeConnections.has(user.id)) {
      activeConnections.set(user.id, new Set());
    }
    activeConnections.get(user.id)!.add(socket.id);

    // Set initial presence
    userPresence.set(user.id, {
      status: 'online',
      lastActivity: new Date()
    });

    // Join rooms based on role
    socket.join(`role:${user.role.toLowerCase()}`);
    socket.join(`user:${user.id}`);

    if (user.teamId) {
      socket.join(`team:${user.teamId}`);
    }

    if (user.department) {
      socket.join(`department:${user.department}`);
    }

    // Admin sees everything
    if (['admin', 'super_admin'].includes(user.role.toLowerCase())) {
      socket.join('admin');
      socket.join('all-tasks');
    }

    // Broadcast presence to admins
    opsNamespace.to('admin').emit('user:online', {
      userId: user.id,
      name: user.name,
      role: user.role,
      timestamp: new Date(),
    });

    // Send current online users to the connecting user
    sendOnlineUsers(socket);

    // ============ EVENT HANDLERS ============

    /**
     * Subscribe to specific task updates
     */
    socket.on('task:subscribe', (taskId: number) => {
      if (typeof taskId !== 'number' || taskId <= 0) return;
      socket.join(`task:${taskId}`);
      logger.debug('User subscribed to task', { userId: user.id, taskId });
    });

    /**
     * Unsubscribe from task
     */
    socket.on('task:unsubscribe', (taskId: number) => {
      if (typeof taskId !== 'number') return;
      socket.leave(`task:${taskId}`);
    });

    /**
     * Task status update
     */
    socket.on('task:update', async (data: TaskUpdateData, callback) => {
      try {
        // Validate input
        if (!data.taskId || typeof data.taskId !== 'number') {
          return callback?.({ success: false, error: 'Invalid task ID' });
        }

        const result = await handleTaskUpdate(data, user);

        // Broadcast to task subscribers
        opsNamespace.to(`task:${data.taskId}`).emit('task:updated', result);

        // Broadcast to admins
        opsNamespace.to('admin').emit('task:updated', result);

        // If assignee changed, notify new assignee
        if (data.assigneeId && data.assigneeId !== result.previousAssigneeId) {
          opsNamespace.to(`user:${data.assigneeId}`).emit('task:assigned', {
            task: result.task,
            assignedBy: user.name,
            message: `New task assigned: ${result.task.title}`,
          });
        }

        // Check SLA status and emit warnings
        if (result.task.slaStatus === 'AT_RISK') {
          emitSlaWarning(opsNamespace, result.task);
        }

        callback?.({ success: true, data: result.task });

      } catch (error: any) {
        logger.error('Task update failed', { error: error.message, data, userId: user.id });
        callback?.({ success: false, error: error.message });
      }
    });

    /**
     * Task assignment
     */
    socket.on('task:assign', async (data, callback) => {
      try {
        if (!data.taskId || !data.assigneeId) {
          return callback?.({ success: false, error: 'Task ID and Assignee ID required' });
        }

        const result = await handleTaskAssignment(data.taskId, data.assigneeId, user);

        // Notify new assignee
        opsNamespace.to(`user:${data.assigneeId}`).emit('task:assigned', {
          task: result.task,
          assignedBy: user.name,
          message: `You have been assigned: ${result.task.title}`,
        });

        // Notify previous assignee
        if (result.previousAssigneeId && result.previousAssigneeId !== data.assigneeId) {
          opsNamespace.to(`user:${result.previousAssigneeId}`).emit('task:reassigned', {
            task: result.task,
            reassignedBy: user.name,
            newAssignee: result.newAssigneeName || 'Unknown',
          });
        }

        // Broadcast update
        opsNamespace.to(`task:${data.taskId}`).emit('task:updated', {
          task: result.task,
          updatedBy: user,
          changes: { assigneeId: { old: result.previousAssigneeId, new: data.assigneeId } }
        });
        opsNamespace.to('admin').emit('task:updated', {
          task: result.task,
          updatedBy: user,
          changes: { assigneeId: { old: result.previousAssigneeId, new: data.assigneeId } }
        });

        callback?.({ success: true, data: result.task });

      } catch (error: any) {
        logger.error('Task assignment failed', { error: error.message, data, userId: user.id });
        callback?.({ success: false, error: error.message });
      }
    });

    /**
     * Add task comment
     */
    socket.on('task:comment', async (data, callback) => {
      try {
        if (!data.taskId || !data.comment?.trim()) {
          return callback?.({ success: false, error: 'Task ID and comment required' });
        }

        const comment = await addTaskComment(data.taskId, user, data.comment.trim());

        // Broadcast to task subscribers
        opsNamespace.to(`task:${data.taskId}`).emit('task:comment:added', comment);

        callback?.({ success: true, data: comment });

      } catch (error: any) {
        logger.error('Task comment failed', { error: error.message, userId: user.id });
        callback?.({ success: false, error: error.message });
      }
    });

    /**
     * Request task list refresh
     */
    socket.on('tasks:refresh', async (filters: TaskFilters, callback) => {
      try {
        const tasks = await getFilteredTasks(filters, user);
        callback?.({ success: true, data: tasks });
      } catch (error: any) {
        logger.error('Tasks refresh failed', { error: error.message, userId: user.id });
        callback?.({ success: false, error: error.message });
      }
    });

    /**
     * Typing indicator
     */
    socket.on('task:typing', (taskId: number) => {
      if (typeof taskId !== 'number') return;
      socket.to(`task:${taskId}`).emit('task:typing', {
        userId: user.id,
        name: user.name,
        taskId,
      });
    });

    /**
     * Presence update
     */
    socket.on('presence:update', (status: 'online' | 'away' | 'busy') => {
      if (!['online', 'away', 'busy'].includes(status)) return;

      userPresence.set(user.id, {
        ...userPresence.get(user.id),
        status,
        lastActivity: new Date()
      });

      opsNamespace.to('admin').emit('user:presence', getOnlineUsersList());
    });

    /**
     * View update (for presence)
     */
    socket.on('presence:view', (view: string) => {
      if (typeof view !== 'string') return;

      const presence = userPresence.get(user.id);
      if (presence) {
        presence.currentView = view;
        presence.lastActivity = new Date();
      }
    });

    /**
     * Notification read
     */
    socket.on('notification:read', async (notificationId: string) => {
      // Mark notification as read in database
      // Implementation depends on notifications table structure
      logger.debug('Notification marked as read', { userId: user.id, notificationId });
    });

    /**
     * Heartbeat / Ping-Pong
     */
    socket.on('ping', (callback) => {
      userPresence.set(user.id, {
        ...userPresence.get(user.id)!,
        lastActivity: new Date()
      });
      callback?.('pong');
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', (reason) => {
      logger.info('Operations socket disconnected', {
        userId: user.id,
        socketId: socket.id,
        reason
      });

      // Remove from tracking
      activeConnections.get(user.id)?.delete(socket.id);

      if (activeConnections.get(user.id)?.size === 0) {
        activeConnections.delete(user.id);
        userPresence.delete(user.id);

        // Broadcast offline status
        opsNamespace.to('admin').emit('user:offline', {
          userId: user.id,
          name: user.name,
          timestamp: new Date(),
        });
      }
    });

    /**
     * Error handler
     */
    socket.on('error', (error) => {
      logger.error('Socket error', { userId: user.id, error: error.message });
    });
  });

  // Start SLA monitoring
  startSlaMonitor(opsNamespace);

  logger.info('Operations socket namespace initialized');

  return opsNamespace;
}

// ============ DATABASE OPERATIONS ============

async function handleTaskUpdate(data: TaskUpdateData, user: SocketUser): Promise<{
  task: TaskData;
  previousAssigneeId?: number;
  changes: Record<string, { old: any; new: any }>;
}> {
  const [existingTask] = await db.select()
    .from(taskItems)
    .where(eq(taskItems.id, data.taskId))
    .limit(1);

  if (!existingTask) {
    throw new Error('Task not found');
  }

  const changes: Record<string, { old: any; new: any }> = {};
  const updateData: any = {
    updatedAt: new Date()
  };

  if (data.status && data.status !== existingTask.status) {
    changes.status = { old: existingTask.status, new: data.status };
    updateData.status = data.status;

    // Auto-update timestamps
    if (data.status === 'in_progress' && !existingTask.startDate) {
      updateData.startDate = new Date();
    }
    if (data.status === 'completed') {
      updateData.completedAt = new Date();
    }
  }

  if (data.progress !== undefined && data.progress !== existingTask.progress) {
    changes.progress = { old: existingTask.progress, new: data.progress };
    updateData.progress = data.progress;
  }

  if (data.priority && data.priority !== existingTask.priority) {
    changes.priority = { old: existingTask.priority, new: data.priority };
    updateData.priority = data.priority;
  }

  if (data.assigneeId && data.assigneeId !== existingTask.assigneeId) {
    changes.assigneeId = { old: existingTask.assigneeId, new: data.assigneeId };
    updateData.assigneeId = data.assigneeId;
  }

  // Update task
  await db.update(taskItems)
    .set(updateData)
    .where(eq(taskItems.id, data.taskId));

  // Log activity
  await logTaskActivity(data.taskId, user.id, 'UPDATED', changes, data.notes);

  // Fetch updated task with relations
  const task = await getTaskWithRelations(data.taskId);

  return {
    task,
    previousAssigneeId: existingTask.assigneeId || undefined,
    changes
  };
}

async function handleTaskAssignment(
  taskId: number,
  assigneeId: number,
  user: SocketUser
): Promise<{
  task: TaskData;
  previousAssigneeId?: number;
  newAssigneeName?: string;
}> {
  const [existingTask] = await db.select()
    .from(taskItems)
    .where(eq(taskItems.id, taskId))
    .limit(1);

  if (!existingTask) {
    throw new Error('Task not found');
  }

  const previousAssigneeId = existingTask.assigneeId || undefined;

  await db.update(taskItems)
    .set({
      assigneeId,
      updatedAt: new Date()
    })
    .where(eq(taskItems.id, taskId));

  // Log activity
  await logTaskActivity(taskId, user.id, 'ASSIGNED', {
    assigneeId: { old: previousAssigneeId, new: assigneeId }
  });

  // Get assignee name
  const [assignee] = await db.select({ name: users.fullName })
    .from(users)
    .where(eq(users.id, assigneeId))
    .limit(1);

  // Fetch updated task
  const task = await getTaskWithRelations(taskId);

  return {
    task,
    previousAssigneeId,
    newAssigneeName: assignee?.name || undefined
  };
}

async function addTaskComment(
  taskId: number,
  user: SocketUser,
  comment: string
): Promise<CommentAddedPayload> {
  const [task] = await db.select()
    .from(taskItems)
    .where(eq(taskItems.id, taskId))
    .limit(1);

  if (!task) {
    throw new Error('Task not found');
  }

  // Log as activity
  await logTaskActivity(taskId, user.id, 'COMMENTED', undefined, comment);

  const commentPayload: CommentAddedPayload = {
    id: Date.now(),
    taskId,
    userId: user.id,
    userName: user.name,
    comment,
    createdAt: new Date()
  };

  return commentPayload;
}

async function logTaskActivity(
  taskId: number,
  userId: number,
  action: string,
  changes?: Record<string, any>,
  comment?: string
): Promise<void> {
  try {
    await db.insert(taskActivityLog).values({
      taskId,
      userId,
      action,
      fieldChanged: changes ? Object.keys(changes).join(', ') : undefined,
      oldValue: changes ? JSON.stringify(Object.fromEntries(
        Object.entries(changes).map(([k, v]) => [k, (v as any).old])
      )) : undefined,
      newValue: changes ? JSON.stringify(Object.fromEntries(
        Object.entries(changes).map(([k, v]) => [k, (v as any).new])
      )) : undefined,
      comment,
      createdAt: new Date()
    });
  } catch (error: any) {
    logger.error('Failed to log task activity', { error: error.message, taskId });
  }
}

async function getTaskWithRelations(taskId: number): Promise<TaskData> {
  const [result] = await db.select({
    task: taskItems,
    assigneeName: users.fullName,
    clientName: businessEntities.name,
    serviceName: serviceRequests.serviceId
  })
    .from(taskItems)
    .leftJoin(users, eq(taskItems.assigneeId, users.id))
    .leftJoin(serviceRequests, eq(taskItems.serviceRequestId, serviceRequests.id))
    .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
    .where(eq(taskItems.id, taskId))
    .limit(1);

  if (!result) {
    throw new Error('Task not found');
  }

  return {
    id: result.task.id,
    taskNumber: result.task.taskNumber,
    title: result.task.title,
    description: result.task.description || undefined,
    status: result.task.status,
    priority: result.task.priority,
    progress: result.task.progress || 0,
    dueDate: result.task.dueDate || undefined,
    assigneeId: result.task.assigneeId || undefined,
    assigneeName: result.assigneeName || undefined,
    clientName: result.clientName || undefined,
    serviceName: result.serviceName || undefined,
    slaStatus: calculateSlaStatus(result.task)
  };
}

async function getFilteredTasks(filters: TaskFilters, user: SocketUser): Promise<TaskData[]> {
  let query = db.select({
    task: taskItems,
    assigneeName: users.fullName,
    clientName: businessEntities.name,
    serviceName: serviceRequests.serviceId
  })
    .from(taskItems)
    .leftJoin(users, eq(taskItems.assigneeId, users.id))
    .leftJoin(serviceRequests, eq(taskItems.serviceRequestId, serviceRequests.id))
    .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
    .orderBy(desc(taskItems.createdAt))
    .limit(100);

  // For non-admin users, filter to their assigned tasks
  if (!['admin', 'super_admin'].includes(user.role.toLowerCase())) {
    query = query.where(eq(taskItems.assigneeId, user.id)) as any;
  }

  const results = await query;

  return results.map(r => ({
    id: r.task.id,
    taskNumber: r.task.taskNumber,
    title: r.task.title,
    description: r.task.description || undefined,
    status: r.task.status,
    priority: r.task.priority,
    progress: r.task.progress || 0,
    dueDate: r.task.dueDate || undefined,
    assigneeId: r.task.assigneeId || undefined,
    assigneeName: r.assigneeName || undefined,
    clientName: r.clientName || undefined,
    serviceName: r.serviceName || undefined,
    slaStatus: calculateSlaStatus(r.task)
  }));
}

// ============ SLA MONITORING ============

function calculateSlaStatus(task: any): 'ON_TRACK' | 'AT_RISK' | 'BREACHED' {
  if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
    return 'ON_TRACK';
  }

  const now = new Date();
  const dueDate = new Date(task.dueDate);
  const hoursRemaining = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursRemaining < 0) {
    return 'BREACHED';
  } else if (hoursRemaining < 4) {
    return 'AT_RISK';
  }

  return 'ON_TRACK';
}

function emitSlaWarning(namespace: Namespace, task: TaskData): void {
  const alert: SlaAlert = {
    type: 'SLA_AT_RISK',
    task,
    timeRemaining: task.dueDate
      ? Math.max(0, (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60))
      : 0,
    message: `Task "${task.title}" is at SLA risk`,
    timestamp: new Date()
  };

  // Notify assignee
  if (task.assigneeId) {
    namespace.to(`user:${task.assigneeId}`).emit('sla:warning', alert);
  }

  // Notify admins
  namespace.to('admin').emit('sla:warning', alert);
}

function startSlaMonitor(namespace: Namespace): void {
  // Check SLA every 5 minutes
  const intervalId = setInterval(async () => {
    try {
      const now = new Date();
      const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

      // Find at-risk tasks (due within 4 hours, not completed)
      const atRiskTasks = await db.select({
        task: taskItems,
        assigneeName: users.fullName
      })
        .from(taskItems)
        .leftJoin(users, eq(taskItems.assigneeId, users.id))
        .where(and(
          sql`${taskItems.status} NOT IN ('completed', 'cancelled')`,
          lt(taskItems.dueDate, fourHoursFromNow),
          gt(taskItems.dueDate, now)
        ));

      for (const { task, assigneeName } of atRiskTasks) {
        const taskData: TaskData = {
          id: task.id,
          taskNumber: task.taskNumber,
          title: task.title,
          status: task.status,
          priority: task.priority,
          progress: task.progress || 0,
          dueDate: task.dueDate || undefined,
          assigneeId: task.assigneeId || undefined,
          assigneeName: assigneeName || undefined,
          slaStatus: 'AT_RISK'
        };
        emitSlaWarning(namespace, taskData);
      }

      // Find newly breached tasks
      const breachedTasks = await db.select({
        task: taskItems,
        assigneeName: users.fullName
      })
        .from(taskItems)
        .leftJoin(users, eq(taskItems.assigneeId, users.id))
        .where(and(
          sql`${taskItems.status} NOT IN ('completed', 'cancelled')`,
          lt(taskItems.dueDate, now)
        ));

      for (const { task, assigneeName } of breachedTasks) {
        const taskData: TaskData = {
          id: task.id,
          taskNumber: task.taskNumber,
          title: task.title,
          status: task.status,
          priority: task.priority,
          progress: task.progress || 0,
          dueDate: task.dueDate || undefined,
          assigneeId: task.assigneeId || undefined,
          assigneeName: assigneeName || undefined,
          slaStatus: 'BREACHED'
        };

        const alert: SlaAlert = {
          type: 'SLA_BREACHED',
          task: taskData,
          message: `SLA BREACHED: ${task.title}`,
          timestamp: new Date()
        };

        if (task.assigneeId) {
          namespace.to(`user:${task.assigneeId}`).emit('sla:alert', alert);
        }
        namespace.to('admin').emit('sla:alert', alert);

        logger.warn('SLA breached', { taskId: task.id, title: task.title });
      }

    } catch (error: any) {
      logger.error('SLA monitor error', { error: error.message });
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  // Cleanup on process exit
  process.on('SIGTERM', () => clearInterval(intervalId));
  process.on('SIGINT', () => clearInterval(intervalId));

  logger.info('SLA monitor started (5 minute interval)');
}

// ============ UTILITY FUNCTIONS ============

function sendOnlineUsers(socket: AuthenticatedSocket): void {
  const onlineUsers = getOnlineUsersList();
  socket.emit('user:presence', onlineUsers);
}

function getOnlineUsersList(): Array<{
  userId: number;
  status: string;
  lastActivity: Date;
  currentView?: string;
}> {
  return Array.from(userPresence.entries()).map(([userId, presence]) => ({
    userId,
    ...presence
  }));
}

export function getActiveUsers(): number[] {
  return Array.from(activeConnections.keys());
}

export function isUserOnline(userId: number): boolean {
  return activeConnections.has(userId);
}

export function getUserConnectionCount(userId: number): number {
  return activeConnections.get(userId)?.size || 0;
}

export function emitToUser(namespace: Namespace, userId: number, event: string, data: any): void {
  namespace.to(`user:${userId}`).emit(event, data);
}

export function emitToRole(namespace: Namespace, role: string, event: string, data: any): void {
  namespace.to(`role:${role}`).emit(event, data);
}

export function emitToAdmins(namespace: Namespace, event: string, data: any): void {
  namespace.to('admin').emit(event, data);
}

export function emitToTask(namespace: Namespace, taskId: number, event: string, data: any): void {
  namespace.to(`task:${taskId}`).emit(event, data);
}
