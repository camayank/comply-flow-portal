import { db } from './db';
import { taskItems, taskReminders, users, notifications } from '@shared/schema';
import { eq, and, lte, gte, sql, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as cron from 'node-cron';

// Create aliases for joining users table multiple times
const initiatorUser = alias(users, 'initiator');
const assigneeUser = alias(users, 'assignee');

// ============================================================================
// TASK REMINDER PROCESSOR
// Automated reminder system for task deadlines and overdue tasks
// Integrates with notification engine for multi-channel delivery
// ============================================================================

export class TaskReminderProcessor {
  constructor() {
    this.initializeProcessor();
  }

  private async initializeProcessor() {
    const { jobManager } = await import('./job-lifecycle-manager.js');

    console.log('📋 Initializing Task Reminder Processor...');

    // Run every hour to check for due reminders
    this.scheduleReminderCheck(jobManager);

    // Run daily at 9 AM IST for overdue task check
    this.scheduleOverdueCheck(jobManager);

    console.log('✅ Task Reminder Processor initialized with JobLifecycleManager');
  }

  // Check for reminders every hour
  private scheduleReminderCheck(jobManager: any) {
    const job = cron.schedule('0 * * * *', async () => {
      await this.processUpcomingReminders();
    }, {
      scheduled: false // Don't start automatically
    });

    jobManager.registerCron(
      'task-reminder-hourly',
      job,
      'Hourly task reminder check - sends T-7, T-3, T-1 day reminders'
    );

    job.start();
    console.log('⏰ Scheduled hourly reminder check (every hour) - managed by JobLifecycleManager');
  }

  // Check for overdue tasks daily (9 AM IST - adjust for your timezone)
  private scheduleOverdueCheck(jobManager: any) {
    const job = cron.schedule('0 9 * * *', async () => {
      await this.processOverdueTasks();
    }, {
      scheduled: false // Don't start automatically
    });

    jobManager.registerCron(
      'task-overdue-daily',
      job,
      'Daily overdue task check at 9 AM IST - sends overdue notifications'
    );

    job.start();
    console.log('⏰ Scheduled daily overdue check (9 AM IST) - managed by JobLifecycleManager');
  }

  // Process upcoming reminders based on due date and offset
  private async processUpcomingReminders() {
    try {
      console.log('📨 Processing upcoming task reminders...');

      // Get all tasks with due dates
      const tasksWithDueDates = await db
        .select({
          task: taskItems,
          initiator: initiatorUser,
          assignee: assigneeUser,
        })
        .from(taskItems)
        .leftJoin(initiatorUser, eq(taskItems.initiatorId, initiatorUser.id))
        .leftJoin(assigneeUser, eq(taskItems.assigneeId, assigneeUser.id))
        .where(
          and(
            isNull(taskItems.completedAt),
            sql`${taskItems.dueDate} IS NOT NULL`,
            sql`${taskItems.status} NOT IN ('completed', 'cancelled')`
          )
        );

      let remindersProcessed = 0;

      for (const { task, initiator, assignee } of tasksWithDueDates) {
        if (!task.dueDate) continue;

        const dueDate = new Date(task.dueDate);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Check for T-7, T-3, T-1 reminders
        const reminderOffsets = [-7, -3, -1, 0]; // negative means before, 0 means due date
        
        for (const offset of reminderOffsets) {
          if (daysUntilDue === Math.abs(offset)) {
            // Check if reminder already sent
            const [existingReminder] = await db
              .select()
              .from(taskReminders)
              .where(
                and(
                  eq(taskReminders.taskId, task.id),
                  eq(taskReminders.daysOffset, offset),
                  eq(taskReminders.sent, true)
                )
              )
              .limit(1);

            if (!existingReminder) {
              // Send reminder
              await this.sendTaskReminder(task, assignee || initiator, offset);
              
              // Mark reminder as sent
              await db
                .update(taskReminders)
                .set({
                  sent: true,
                  sentAt: new Date(),
                })
                .where(
                  and(
                    eq(taskReminders.taskId, task.id),
                    eq(taskReminders.daysOffset, offset)
                  )
                );

              // Update task reminder count
              await db
                .update(taskItems)
                .set({
                  reminderCount: sql`${taskItems.reminderCount} + 1`,
                  lastReminderSent: new Date(),
                })
                .where(eq(taskItems.id, task.id));

              remindersProcessed++;
            }
          }
        }
      }

      console.log(`✅ Processed ${remindersProcessed} task reminders`);
    } catch (error) {
      console.error('❌ Error processing task reminders:', error);
    }
  }

  // Process overdue tasks
  private async processOverdueTasks() {
    try {
      console.log('⚠️ Processing overdue tasks...');

      const overdueTasks = await db
        .select({
          task: taskItems,
          initiator: initiatorUser,
          assignee: assigneeUser,
        })
        .from(taskItems)
        .leftJoin(initiatorUser, eq(taskItems.initiatorId, initiatorUser.id))
        .leftJoin(assigneeUser, eq(taskItems.assigneeId, assigneeUser.id))
        .where(
          and(
            isNull(taskItems.completedAt),
            sql`${taskItems.dueDate} < NOW()`,
            sql`${taskItems.status} NOT IN ('completed', 'cancelled')`
          )
        );

      let overdueCount = 0;

      for (const { task, initiator, assignee } of overdueTasks) {
        // Check if overdue reminder sent in last 24 hours
        const [recentOverdueReminder] = await db
          .select()
          .from(taskReminders)
          .where(
            and(
              eq(taskReminders.taskId, task.id),
              eq(taskReminders.reminderType, 'overdue'),
              eq(taskReminders.sent, true),
              sql`${taskReminders.sentAt} > NOW() - INTERVAL '24 hours'`
            )
          )
          .limit(1);

        if (!recentOverdueReminder) {
          // Send overdue notification
          await this.sendOverdueNotification(task, assignee || initiator);

          // Create/update overdue reminder record
          const [existingOverdueReminder] = await db
            .select()
            .from(taskReminders)
            .where(
              and(
                eq(taskReminders.taskId, task.id),
                eq(taskReminders.reminderType, 'overdue')
              )
            )
            .limit(1);

          if (existingOverdueReminder) {
            await db
              .update(taskReminders)
              .set({
                sent: true,
                sentAt: new Date(),
              })
              .where(eq(taskReminders.id, existingOverdueReminder.id));
          } else {
            await db.insert(taskReminders).values({
              taskId: task.id,
              reminderType: 'overdue',
              sent: true,
              sentAt: new Date(),
              channels: JSON.stringify(['email', 'in_app']),
            });
          }

          overdueCount++;
        }
      }

      console.log(`⚠️ Sent ${overdueCount} overdue task notifications`);
    } catch (error) {
      console.error('❌ Error processing overdue tasks:', error);
    }
  }

  // Send task reminder notification
  private async sendTaskReminder(task: any, user: any, daysOffset: number) {
    try {
      const daysText = daysOffset === 0 ? 'today' : 
                       daysOffset === -1 ? 'tomorrow' :
                       `in ${Math.abs(daysOffset)} days`;

      const title = daysOffset === 0 ? 
        `Task Due Today: ${task.title}` :
        `Task Reminder: ${task.title}`;

      const message = `Your task "${task.title}" is due ${daysText}. Please ensure completion before the deadline.`;

      // Create in-app notification
      await db.insert(notifications).values({
        userId: user?.id || task.initiatorId,
        title,
        message,
        type: 'reminder',
        category: 'task',
        priority: daysOffset === 0 || daysOffset === -1 ? 'high' : 'normal',
        actionUrl: `/tasks/${task.id}`,
        actionText: 'View Task',
        metadata: JSON.stringify({
          taskId: task.id,
          taskNumber: task.taskNumber,
          dueDate: task.dueDate,
          daysOffset,
        }),
      });

      console.log(`📬 Sent reminder for task ${task.taskNumber} (${daysText})`);
    } catch (error) {
      console.error(`❌ Error sending task reminder for task ${task.id}:`, error);
    }
  }

  // Send overdue notification
  private async sendOverdueNotification(task: any, user: any) {
    try {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      const title = `⚠️ Task Overdue: ${task.title}`;
      const message = `Your task "${task.title}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. Please complete it urgently.`;

      // Create in-app notification
      await db.insert(notifications).values({
        userId: user?.id || task.initiatorId,
        title,
        message,
        type: 'sla_breach',
        category: 'task',
        priority: 'urgent',
        actionUrl: `/tasks/${task.id}`,
        actionText: 'Complete Task',
        metadata: JSON.stringify({
          taskId: task.id,
          taskNumber: task.taskNumber,
          dueDate: task.dueDate,
          daysOverdue,
        }),
      });

      console.log(`⚠️ Sent overdue notification for task ${task.taskNumber} (${daysOverdue} days overdue)`);
    } catch (error) {
      console.error(`❌ Error sending overdue notification for task ${task.id}:`, error);
    }
  }

  // Stop all scheduled jobs
  public async stopProcessor() {
    const { jobManager } = await import('./job-lifecycle-manager.js');

    // Stop both jobs using the centralized job manager
    jobManager.stopJob('task-reminder-hourly');
    jobManager.stopJob('task-overdue-daily');

    console.log('⏹️ Stopped task reminder processor jobs via JobLifecycleManager');
  }

  // Manual trigger for testing
  public async triggerReminderCheck() {
    console.log('🔧 Manually triggering reminder check...');
    await this.processUpcomingReminders();
  }

  public async triggerOverdueCheck() {
    console.log('🔧 Manually triggering overdue check...');
    await this.processOverdueTasks();
  }
}

// Export singleton instance
export const taskReminderProcessor = new TaskReminderProcessor();
