import { Express, Request, Response } from 'express';
import { db } from './db';
import { requireAuth } from './auth-middleware';
import {
  taskItems,
  taskParticipants,
  taskDependencies,
  taskSubtasks,
  taskActivityLog,
  userTaskTemplates,
  taskReminders,
  users,
  insertTaskItemSchema,
  insertTaskParticipantSchema,
  insertTaskActivityLogSchema,
  insertUserTaskTemplateSchema,
  insertTaskReminderSchema,
  type TaskItem,
  type InsertTaskItem,
} from '@shared/schema';
import { eq, and, or, desc, sql, asc } from 'drizzle-orm';
import { generateTaskId } from './services/id-generator';

// ============================================================================
// UNIVERSAL TASK MANAGEMENT SYSTEM API
// Task tracking, reminders, and closure workflow for all user types
// ============================================================================

export function registerTaskManagementRoutes(app: Express) {

  // ========== GET ALL TASKS (with filters) ==========
  app.get('/api/tasks', async (req: Request, res: Response) => {
    try {
      const { status, priority, assigneeId, initiatorId, taskType, dueFrom, dueTo, limit = 50 } = req.query;
      
      const initiatorAlias = sql`initiator`;
      const assigneeAlias = sql`assignee`;
      
      const tasksResult = await db
        .select()
        .from(taskItems)
        .orderBy(desc(taskItems.createdAt))
        .limit(Number(limit));

      res.json(tasksResult);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // ========== GET SINGLE TASK (with full details) ==========
  app.get('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);

      const [task] = await db
        .select()
        .from(taskItems)
        .where(eq(taskItems.id, taskId));

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Get participants
      const participants = await db
        .select({
          participant: taskParticipants,
          user: users,
        })
        .from(taskParticipants)
        .leftJoin(users, eq(taskParticipants.userId, users.id))
        .where(eq(taskParticipants.taskId, taskId));

      // Get dependencies
      const dependencies = await db
        .select({
          dependency: taskDependencies,
          dependentTask: taskItems,
        })
        .from(taskDependencies)
        .leftJoin(taskItems, eq(taskDependencies.dependsOnTaskId, taskItems.id))
        .where(eq(taskDependencies.taskId, taskId));

      // Get subtasks
      const subtasks = await db
        .select({
          subtask: taskSubtasks,
          childTask: taskItems,
        })
        .from(taskSubtasks)
        .leftJoin(taskItems, eq(taskSubtasks.childTaskId, taskItems.id))
        .where(eq(taskSubtasks.parentTaskId, taskId))
        .orderBy(asc(taskSubtasks.sortOrder));

      // Get activity log
      const activityLog = await db
        .select({
          log: taskActivityLog,
          user: users,
        })
        .from(taskActivityLog)
        .leftJoin(users, eq(taskActivityLog.userId, users.id))
        .where(eq(taskActivityLog.taskId, taskId))
        .orderBy(desc(taskActivityLog.createdAt))
        .limit(50);

      // Get reminders
      const reminders = await db
        .select()
        .from(taskReminders)
        .where(eq(taskReminders.taskId, taskId));

      res.json({
        ...task,
        participants: participants.map(p => ({
          ...p.participant,
          user: p.user ? { id: p.user.id, name: p.user.fullName, email: p.user.email } : null,
        })),
        dependencies: dependencies.map(d => ({
          ...d.dependency,
          task: d.dependentTask,
        })),
        subtasks: subtasks.map(s => ({
          ...s.subtask,
          task: s.childTask,
        })),
        activityLog: activityLog.map(a => ({
          ...a.log,
          user: a.user ? { id: a.user.id, name: a.user.fullName } : null,
        })),
        reminders,
      });
    } catch (error) {
      console.error('Error fetching task details:', error);
      res.status(500).json({ error: 'Failed to fetch task details' });
    }
  });

  // ========== CREATE NEW TASK ==========
  app.post('/api/tasks', async (req: Request, res: Response) => {
    try {
      const taskData = insertTaskItemSchema.parse(req.body);
      
      // Generate task number
      const taskNumber = await generateTaskId();

      const [newTask] = await db.insert(taskItems).values({
        ...taskData,
        taskNumber,
      }).returning();

      // Log creation activity
      await db.insert(taskActivityLog).values({
        taskId: newTask.id,
        userId: taskData.initiatorId,
        action: 'created',
        comment: `Task created: ${newTask.title}`,
      });

      // Create automatic reminders if dueDate is set
      if (newTask.dueDate) {
        const reminderOffsets = [-7, -3, -1, 0]; // T-7, T-3, T-1, Due Date
        
        for (const offset of reminderOffsets) {
          await db.insert(taskReminders).values({
            taskId: newTask.id,
            reminderType: offset === 0 ? 'due_date' : 'due_date',
            daysOffset: offset,
            channels: JSON.stringify(['email', 'in_app']),
          });
        }
      }

      // Assign participants if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        for (const participantId of req.body.participants) {
          await db.insert(taskParticipants).values({
            taskId: newTask.id,
            userId: participantId,
            role: 'watcher',
          });
        }
      }

      res.status(201).json(newTask);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(400).json({ error: 'Failed to create task' });
    }
  });

  // ========== UPDATE TASK ==========
  app.patch('/api/tasks/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      const updates = req.body;
      const userId = req.user!.id;

      const [existingTask] = await db
        .select()
        .from(taskItems)
        .where(eq(taskItems.id, taskId));

      if (!existingTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const [updatedTask] = await db
        .update(taskItems)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(taskItems.id, taskId))
        .returning();

      // Log each field change
      for (const [field, newValue] of Object.entries(updates)) {
        const oldValue = existingTask[field as keyof typeof existingTask];
        if (oldValue !== newValue) {
          await db.insert(taskActivityLog).values({
            taskId,
            userId,
            action: 'updated',
            fieldChanged: field,
            oldValue: String(oldValue),
            newValue: String(newValue),
          });
        }
      }

      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(400).json({ error: 'Failed to update task' });
    }
  });

  // ========== DELETE TASK ==========
  app.delete('/api/tasks/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      const userId = (req as any).user?.id;

      // Get the task first to check status
      const [existingTask] = await db
        .select()
        .from(taskItems)
        .where(eq(taskItems.id, taskId));

      if (!existingTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Only allow deletion of pending or draft tasks
      const deletableStatuses = ['pending', 'draft', 'not_started'];
      if (!deletableStatuses.includes(existingTask.status || '')) {
        return res.status(400).json({
          error: 'Cannot delete task',
          message: 'Only pending or draft tasks can be deleted. Consider closing the task instead.'
        });
      }

      // Delete related activity logs first
      await db
        .delete(taskActivityLog)
        .where(eq(taskActivityLog.taskId, taskId));

      // Delete the task
      const [deletedTask] = await db
        .delete(taskItems)
        .where(eq(taskItems.id, taskId))
        .returning();

      res.json({
        success: true,
        message: 'Task deleted successfully',
        deletedTask,
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  // ========== ASSIGN TASK ==========
  app.post('/api/tasks/:id/assign', async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      const { assigneeId, assigneeRole, userId } = req.body;

      const [task] = await db
        .update(taskItems)
        .set({
          assigneeId: assigneeId || null,
          assigneeRole: assigneeRole || null,
          status: 'in_progress',
          startDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(taskItems.id, taskId))
        .returning();

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Log assignment
      await db.insert(taskActivityLog).values({
        taskId,
        userId: userId || 1,
        action: 'assigned',
        comment: assigneeId ? `Assigned to user ${assigneeId}` : `Assigned to role ${assigneeRole}`,
      });

      res.json(task);
    } catch (error) {
      console.error('Error assigning task:', error);
      res.status(400).json({ error: 'Failed to assign task' });
    }
  });

  // ========== UPDATE TASK STATUS ==========
  app.patch('/api/tasks/:id/status', async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      const { status, userId, comment } = req.body;

      const [existingTask] = await db
        .select()
        .from(taskItems)
        .where(eq(taskItems.id, taskId));

      if (!existingTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Validate status transition
      const validStatuses = ['pending', 'in_progress', 'awaiting_verification', 'completed', 'reopened', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Check if checklist is required and completed before completion
      if (status === 'completed' && existingTask.requiresChecklist) {
        const checklist = existingTask.checklist as any[];
        if (checklist && !checklist.every(item => item.checked)) {
          return res.status(400).json({ error: 'All checklist items must be completed' });
        }
      }

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'completed') {
        updateData.completedAt = new Date();
        updateData.progress = 100;
      } else if (status === 'reopened') {
        updateData.reopenCount = sql`${taskItems.reopenCount} + 1`;
        updateData.completedAt = null;
      }

      const [updatedTask] = await db
        .update(taskItems)
        .set(updateData)
        .where(eq(taskItems.id, taskId))
        .returning();

      // Log status change
      await db.insert(taskActivityLog).values({
        taskId,
        userId: userId || 1,
        action: 'status_changed',
        fieldChanged: 'status',
        oldValue: existingTask.status,
        newValue: status,
        comment: comment || `Status changed from ${existingTask.status} to ${status}`,
      });

      res.json(updatedTask);
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(400).json({ error: 'Failed to update task status' });
    }
  });

  // ========== CLOSE/COMPLETE TASK WITH APPROVAL ==========
  app.post('/api/tasks/:id/close', requireAuth, async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      const { approvedBy, comment } = req.body;
      const userId = req.user!.id;

      const [task] = await db
        .select()
        .from(taskItems)
        .where(eq(taskItems.id, taskId));

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // If approval required, create verification subtask
      if (task.requiresApproval && !approvedBy) {
        return res.status(400).json({ 
          error: 'Task requires approval before closure',
          requiresApproval: true 
        });
      }

      const [closedTask] = await db
        .update(taskItems)
        .set({
          status: 'completed',
          completedAt: new Date(),
          approvedBy: approvedBy || null,
          approvedAt: approvedBy ? new Date() : null,
          progress: 100,
          updatedAt: new Date(),
        })
        .where(eq(taskItems.id, taskId))
        .returning();

      // Log closure
      await db.insert(taskActivityLog).values({
        taskId,
        userId: userId || 1,
        action: 'completed',
        comment: comment || 'Task closed and completed',
      });

      res.json(closedTask);
    } catch (error) {
      console.error('Error closing task:', error);
      res.status(400).json({ error: 'Failed to close task' });
    }
  });

  // ========== GET TASK ACTIVITY HISTORY ==========
  app.get('/api/tasks/:id/history', async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);

      const history = await db
        .select({
          log: taskActivityLog,
          user: users,
        })
        .from(taskActivityLog)
        .leftJoin(users, eq(taskActivityLog.userId, users.id))
        .where(eq(taskActivityLog.taskId, taskId))
        .orderBy(desc(taskActivityLog.createdAt));

      res.json(history.map(h => ({
        ...h.log,
        user: h.user ? { id: h.user.id, name: h.user.fullName, email: h.user.email } : null,
      })));
    } catch (error) {
      console.error('Error fetching task history:', error);
      res.status(500).json({ error: 'Failed to fetch task history' });
    }
  });

  // ========== BULK CREATE TASKS ==========
  app.post('/api/tasks/bulk', async (req: Request, res: Response) => {
    try {
      const { tasks, initiatorId } = req.body;

      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({ error: 'Tasks array required' });
      }

      const createdTasks = [];

      for (const taskData of tasks) {
        const taskNumber = await generateTaskId();
        
        const [newTask] = await db.insert(taskItems).values({
          ...taskData,
          taskNumber,
          initiatorId: taskData.initiatorId || initiatorId,
        }).returning();

        createdTasks.push(newTask);

        // Log creation
        await db.insert(taskActivityLog).values({
          taskId: newTask.id,
          userId: initiatorId,
          action: 'created',
          comment: `Bulk task created: ${newTask.title}`,
        });

        // Create reminders
        if (newTask.dueDate) {
          const reminderOffsets = [-7, -3, -1, 0];
          for (const offset of reminderOffsets) {
            await db.insert(taskReminders).values({
              taskId: newTask.id,
              reminderType: 'due_date',
              daysOffset: offset,
              channels: JSON.stringify(['email', 'in_app']),
            });
          }
        }
      }

      res.status(201).json({ 
        message: `${createdTasks.length} tasks created successfully`,
        tasks: createdTasks 
      });
    } catch (error) {
      console.error('Error bulk creating tasks:', error);
      res.status(400).json({ error: 'Failed to create tasks in bulk' });
    }
  });

  // ========== TASK TEMPLATES ==========
  app.get('/api/task-templates', async (req: Request, res: Response) => {
    try {
      const templates = await db
        .select()
        .from(userTaskTemplates)
        .where(eq(userTaskTemplates.isActive, true))
        .orderBy(desc(userTaskTemplates.createdAt));

      res.json(templates);
    } catch (error) {
      console.error('Error fetching task templates:', error);
      res.status(500).json({ error: 'Failed to fetch task templates' });
    }
  });

  app.post('/api/task-templates', async (req: Request, res: Response) => {
    try {
      const templateData = insertUserTaskTemplateSchema.parse(req.body);

      const [template] = await db.insert(userTaskTemplates).values(templateData).returning();

      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating task template:', error);
      res.status(400).json({ error: 'Failed to create task template' });
    }
  });

  // ========== CREATE TASK FROM TEMPLATE ==========
  app.post('/api/tasks/from-template/:templateId', async (req: Request, res: Response) => {
    try {
      const templateId = Number(req.params.templateId);
      const { initiatorId, assigneeId, dueDate, customData } = req.body;

      const [template] = await db
        .select()
        .from(userTaskTemplates)
        .where(eq(userTaskTemplates.id, templateId));

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const taskNumber = await generateTaskId();

      const [newTask] = await db.insert(taskItems).values({
        taskNumber,
        title: customData?.title || template.name,
        description: customData?.description || template.description,
        taskType: template.taskType,
        initiatorId,
        assigneeId: assigneeId || null,
        assigneeRole: template.defaultAssigneeRole,
        priority: template.defaultPriority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours: template.defaultDurationHours || null,
        requiresApproval: template.requiresApproval,
        requiresChecklist: !!template.checklist,
        checklist: template.checklist,
        tags: template.tags,
        templateId: template.id,
      }).returning();

      // Log creation
      await db.insert(taskActivityLog).values({
        taskId: newTask.id,
        userId: initiatorId,
        action: 'created',
        comment: `Task created from template: ${template.name}`,
      });

      res.status(201).json(newTask);
    } catch (error) {
      console.error('Error creating task from template:', error);
      res.status(400).json({ error: 'Failed to create task from template' });
    }
  });

  // ============================================================================
  // TIME TRACKING SYSTEM
  // Track time spent on tasks with start/stop and manual entry
  // ============================================================================

  // In-memory time tracking store (replace with database table in production)
  interface TimeEntry {
    id: string;
    taskId: number;
    userId: number;
    description?: string;
    startTime: Date;
    endTime?: Date;
    duration?: number; // in minutes
    isBillable: boolean;
    status: 'running' | 'stopped' | 'manual';
    createdAt: Date;
  }

  const timeEntries: TimeEntry[] = [];
  const activeTimers = new Map<string, TimeEntry>(); // key: `${userId}-${taskId}`

  // ========== START TIMER ==========
  app.post('/api/tasks/:id/time/start', async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      const { userId, description, isBillable = false } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Check if task exists
      const [task] = await db
        .select()
        .from(taskItems)
        .where(eq(taskItems.id, taskId));

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Check if timer already running for this user-task combination
      const timerKey = `${userId}-${taskId}`;
      if (activeTimers.has(timerKey)) {
        return res.status(400).json({
          error: 'Timer already running',
          activeEntry: activeTimers.get(timerKey)
        });
      }

      // Stop any other active timer for this user
      for (const [key, entry] of activeTimers.entries()) {
        if (key.startsWith(`${userId}-`) && entry.status === 'running') {
          entry.status = 'stopped';
          entry.endTime = new Date();
          entry.duration = Math.round((entry.endTime.getTime() - entry.startTime.getTime()) / 60000);
          timeEntries.push(entry);
          activeTimers.delete(key);
        }
      }

      // Create new time entry
      const timeEntry: TimeEntry = {
        id: `TE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        taskId,
        userId,
        description,
        startTime: new Date(),
        isBillable,
        status: 'running',
        createdAt: new Date()
      };

      activeTimers.set(timerKey, timeEntry);

      // Log activity
      await db.insert(taskActivityLog).values({
        taskId,
        userId,
        action: 'time_started',
        comment: 'Timer started'
      });

      res.json({
        success: true,
        message: 'Timer started',
        entry: timeEntry
      });

    } catch (error) {
      console.error('Error starting timer:', error);
      res.status(500).json({ error: 'Failed to start timer' });
    }
  });

  // ========== STOP TIMER ==========
  app.post('/api/tasks/:id/time/stop', async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      const { userId, notes } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const timerKey = `${userId}-${taskId}`;
      const activeEntry = activeTimers.get(timerKey);

      if (!activeEntry) {
        return res.status(404).json({ error: 'No active timer found for this task' });
      }

      // Stop the timer
      activeEntry.status = 'stopped';
      activeEntry.endTime = new Date();
      activeEntry.duration = Math.round((activeEntry.endTime.getTime() - activeEntry.startTime.getTime()) / 60000);
      if (notes) activeEntry.description = (activeEntry.description ? activeEntry.description + '. ' : '') + notes;

      // Save to entries and remove from active
      timeEntries.push(activeEntry);
      activeTimers.delete(timerKey);

      // Update task's actual hours
      const totalMinutes = timeEntries
        .filter(e => e.taskId === taskId)
        .reduce((sum, e) => sum + (e.duration || 0), 0);

      await db
        .update(taskItems)
        .set({
          actualHours: Math.round(totalMinutes / 6) / 10, // Convert to hours with 1 decimal
          updatedAt: new Date()
        })
        .where(eq(taskItems.id, taskId));

      // Log activity
      await db.insert(taskActivityLog).values({
        taskId,
        userId,
        action: 'time_stopped',
        comment: `Timer stopped. Duration: ${activeEntry.duration} minutes`
      });

      res.json({
        success: true,
        message: 'Timer stopped',
        entry: activeEntry,
        totalTimeMinutes: totalMinutes
      });

    } catch (error) {
      console.error('Error stopping timer:', error);
      res.status(500).json({ error: 'Failed to stop timer' });
    }
  });

  // ========== LOG MANUAL TIME ENTRY ==========
  app.post('/api/tasks/:id/time/log', async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      const { userId, duration, description, date, isBillable = false } = req.body;

      if (!userId || !duration) {
        return res.status(400).json({ error: 'User ID and duration required' });
      }

      // Check if task exists
      const [task] = await db
        .select()
        .from(taskItems)
        .where(eq(taskItems.id, taskId));

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Create manual time entry
      const entryDate = date ? new Date(date) : new Date();
      const timeEntry: TimeEntry = {
        id: `TE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        taskId,
        userId,
        description,
        startTime: entryDate,
        endTime: new Date(entryDate.getTime() + duration * 60000),
        duration, // duration in minutes
        isBillable,
        status: 'manual',
        createdAt: new Date()
      };

      timeEntries.push(timeEntry);

      // Update task's actual hours
      const totalMinutes = timeEntries
        .filter(e => e.taskId === taskId)
        .reduce((sum, e) => sum + (e.duration || 0), 0);

      await db
        .update(taskItems)
        .set({
          actualHours: Math.round(totalMinutes / 6) / 10,
          updatedAt: new Date()
        })
        .where(eq(taskItems.id, taskId));

      // Log activity
      await db.insert(taskActivityLog).values({
        taskId,
        userId,
        action: 'time_logged',
        comment: `Manual time entry: ${duration} minutes`
      });

      res.json({
        success: true,
        message: 'Time entry logged',
        entry: timeEntry,
        totalTimeMinutes: totalMinutes
      });

    } catch (error) {
      console.error('Error logging time:', error);
      res.status(500).json({ error: 'Failed to log time' });
    }
  });

  // ========== GET TIME ENTRIES FOR TASK ==========
  app.get('/api/tasks/:id/time', async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);

      // Get task details
      const [task] = await db
        .select()
        .from(taskItems)
        .where(eq(taskItems.id, taskId));

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Get all time entries for this task
      const entries = timeEntries.filter(e => e.taskId === taskId);

      // Get active timer if any
      const activeEntry = Array.from(activeTimers.values()).find(e => e.taskId === taskId);

      // Calculate totals
      const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
      const billableMinutes = entries.filter(e => e.isBillable).reduce((sum, e) => sum + (e.duration || 0), 0);

      // Group by user
      const byUser: Record<number, { entries: TimeEntry[]; totalMinutes: number }> = {};
      entries.forEach(e => {
        if (!byUser[e.userId]) byUser[e.userId] = { entries: [], totalMinutes: 0 };
        byUser[e.userId].entries.push(e);
        byUser[e.userId].totalMinutes += e.duration || 0;
      });

      res.json({
        taskId,
        taskTitle: task.title,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        totalTimeMinutes: totalMinutes,
        totalTimeHours: Math.round(totalMinutes / 6) / 10,
        billableMinutes,
        nonBillableMinutes: totalMinutes - billableMinutes,
        activeTimer: activeEntry || null,
        entries: entries.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
        byUser: Object.entries(byUser).map(([userId, data]) => ({
          userId: Number(userId),
          totalMinutes: data.totalMinutes,
          entryCount: data.entries.length
        }))
      });

    } catch (error) {
      console.error('Error fetching time entries:', error);
      res.status(500).json({ error: 'Failed to fetch time entries' });
    }
  });

  // ========== GET USER'S ACTIVE TIMER ==========
  app.get('/api/time/active/:userId', async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.userId);

      // Find active timer for this user
      const activeEntry = Array.from(activeTimers.values()).find(
        e => e.userId === userId && e.status === 'running'
      );

      if (!activeEntry) {
        return res.json({ active: false, entry: null });
      }

      // Get task details
      const [task] = await db
        .select()
        .from(taskItems)
        .where(eq(taskItems.id, activeEntry.taskId));

      res.json({
        active: true,
        entry: activeEntry,
        task: task ? {
          id: task.id,
          title: task.title,
          taskNumber: task.taskNumber
        } : null,
        elapsedMinutes: Math.round((Date.now() - activeEntry.startTime.getTime()) / 60000)
      });

    } catch (error) {
      console.error('Error fetching active timer:', error);
      res.status(500).json({ error: 'Failed to fetch active timer' });
    }
  });

  // ========== GET TIME REPORT ==========
  app.get('/api/time/report', async (req: Request, res: Response) => {
    try {
      const { userId, startDate, endDate, taskId } = req.query;

      let filteredEntries = [...timeEntries];

      if (userId) {
        filteredEntries = filteredEntries.filter(e => e.userId === Number(userId));
      }
      if (taskId) {
        filteredEntries = filteredEntries.filter(e => e.taskId === Number(taskId));
      }
      if (startDate) {
        const start = new Date(startDate as string);
        filteredEntries = filteredEntries.filter(e => new Date(e.startTime) >= start);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        filteredEntries = filteredEntries.filter(e => new Date(e.startTime) <= end);
      }

      // Calculate summary
      const totalMinutes = filteredEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
      const billableMinutes = filteredEntries.filter(e => e.isBillable).reduce((sum, e) => sum + (e.duration || 0), 0);

      // Group by date
      const byDate: Record<string, { entries: TimeEntry[]; totalMinutes: number }> = {};
      filteredEntries.forEach(e => {
        const dateKey = new Date(e.startTime).toISOString().split('T')[0];
        if (!byDate[dateKey]) byDate[dateKey] = { entries: [], totalMinutes: 0 };
        byDate[dateKey].entries.push(e);
        byDate[dateKey].totalMinutes += e.duration || 0;
      });

      // Group by task
      const byTask: Record<number, { totalMinutes: number; entryCount: number }> = {};
      filteredEntries.forEach(e => {
        if (!byTask[e.taskId]) byTask[e.taskId] = { totalMinutes: 0, entryCount: 0 };
        byTask[e.taskId].totalMinutes += e.duration || 0;
        byTask[e.taskId].entryCount++;
      });

      res.json({
        summary: {
          totalMinutes,
          totalHours: Math.round(totalMinutes / 6) / 10,
          billableMinutes,
          billableHours: Math.round(billableMinutes / 6) / 10,
          nonBillableMinutes: totalMinutes - billableMinutes,
          entryCount: filteredEntries.length
        },
        byDate: Object.entries(byDate).map(([date, data]) => ({
          date,
          totalMinutes: data.totalMinutes,
          totalHours: Math.round(data.totalMinutes / 6) / 10,
          entryCount: data.entries.length
        })).sort((a, b) => b.date.localeCompare(a.date)),
        byTask: Object.entries(byTask).map(([taskId, data]) => ({
          taskId: Number(taskId),
          totalMinutes: data.totalMinutes,
          totalHours: Math.round(data.totalMinutes / 6) / 10,
          entryCount: data.entryCount
        })).sort((a, b) => b.totalMinutes - a.totalMinutes)
      });

    } catch (error) {
      console.error('Error generating time report:', error);
      res.status(500).json({ error: 'Failed to generate time report' });
    }
  });

  // ========== DELETE TIME ENTRY ==========
  app.delete('/api/time/:entryId', async (req: Request, res: Response) => {
    try {
      const { entryId } = req.params;

      const entryIndex = timeEntries.findIndex(e => e.id === entryId);
      if (entryIndex === -1) {
        return res.status(404).json({ error: 'Time entry not found' });
      }

      const entry = timeEntries[entryIndex];
      timeEntries.splice(entryIndex, 1);

      // Update task's actual hours
      const totalMinutes = timeEntries
        .filter(e => e.taskId === entry.taskId)
        .reduce((sum, e) => sum + (e.duration || 0), 0);

      await db
        .update(taskItems)
        .set({
          actualHours: Math.round(totalMinutes / 6) / 10,
          updatedAt: new Date()
        })
        .where(eq(taskItems.id, entry.taskId));

      res.json({
        success: true,
        message: 'Time entry deleted',
        deletedEntry: entry
      });

    } catch (error) {
      console.error('Error deleting time entry:', error);
      res.status(500).json({ error: 'Failed to delete time entry' });
    }
  });

  console.log('✅ Task Management API routes registered (with Time Tracking)');
}
