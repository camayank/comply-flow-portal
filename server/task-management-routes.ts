import { Express, Request, Response } from 'express';
import { db } from '../db';
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

// ============================================================================
// UNIVERSAL TASK MANAGEMENT SYSTEM API
// Task tracking, reminders, and closure workflow for all user types
// ============================================================================

export function registerTaskManagementRoutes(app: Express) {

  // ========== GET ALL TASKS (with filters) ==========
  app.get('/api/tasks', async (req: Request, res: Response) => {
    try {
      const { status, priority, assigneeId, initiatorId, taskType, dueFrom, dueTo, limit = 50 } = req.query;
      
      let query = db
        .select({
          task: taskItems,
          initiator: users,
          assignee: users,
        })
        .from(taskItems)
        .leftJoin(users, eq(taskItems.initiatorId, users.id))
        .leftJoin(users, eq(taskItems.assigneeId, users.id))
        .orderBy(desc(taskItems.createdAt))
        .limit(Number(limit));

      // Apply filters
      const conditions = [];
      
      if (status) conditions.push(eq(taskItems.status, status as string));
      if (priority) conditions.push(eq(taskItems.priority, priority as string));
      if (assigneeId) conditions.push(eq(taskItems.assigneeId, Number(assigneeId)));
      if (initiatorId) conditions.push(eq(taskItems.initiatorId, Number(initiatorId)));
      if (taskType) conditions.push(eq(taskItems.taskType, taskType as string));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const tasks = await query;
      
      // Format response
      const formattedTasks = tasks.map(t => ({
        ...t.task,
        initiator: t.initiator ? { id: t.initiator.id, name: t.initiator.fullName, email: t.initiator.email } : null,
        assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.fullName, email: t.assignee.email } : null,
      }));

      res.json(formattedTasks);
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
      const taskNumber = `TASK-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

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
  app.patch('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      const updates = req.body;
      const userId = req.body.userId || 1; // Should come from auth

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
  app.post('/api/tasks/:id/close', async (req: Request, res: Response) => {
    try {
      const taskId = Number(req.params.id);
      const { userId, approvedBy, comment } = req.body;

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
        const taskNumber = `TASK-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        
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

      const taskNumber = `TASK-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

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

  console.log('✅ Task Management API routes registered');
}
