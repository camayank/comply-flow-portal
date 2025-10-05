import { db } from './db';
import { taskItems, taskReminders, users, notifications } from '@shared/schema';
import { eq, and, lte, gte, sql, isNull } from 'drizzle-orm';
import * as cron from 'node-cron';

// ============================================================================
// TASK REMINDER PROCESSOR
// Automated reminder system for task deadlines and overdue tasks
// Integrates with notification engine for multi-channel delivery
// ============================================================================

export class TaskReminderProcessor {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.initializeProcessor();
  }

  private initializeProcessor() {
    console.log('📋 Initializing Task Reminder Processor...');

    // Run every hour to check for due reminders
    this.scheduleReminderCheck();
    
    // Run daily at 9 AM IST for overdue task check
    this.scheduleOverdueCheck();

    console.log('✅ Task Reminder Processor initialized');
  }

  // Check for reminders every hour
  private scheduleReminderCheck() {
    const job = cron.schedule('0 * * * *', async () => {
      await this.processUpcomingReminders();
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    this.jobs.set('reminder_check', job);
    console.log('⏰ Scheduled hourly reminder check (every hour)');
  }

  // Check for overdue tasks daily
  private scheduleOverdueCheck() {
    const job = cron.schedule('0 9 * * *', async () => {
      await this.processOverdueTasks();
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    this.jobs.set('overdue_check', job);
    console.log('⏰ Scheduled daily overdue check (9 AM IST)');
  }

  // Process upcoming reminders based on due date and offset
  private async processUpcomingReminders() {
    try {
      console.log('📨 Processing upcoming task reminders...');

      // Get all tasks with due dates
      const tasksWithDueDates = await db
        .select({
          task: taskItems,
          initiator: users,
          assignee: users,
        })
        .from(taskItems)
        .leftJoin(users, eq(taskItems.initiatorId, users.id))
        .leftJoin(users, eq(taskItems.assigneeId, users.id))
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
          initiator: users,
          assignee: users,
        })
        .from(taskItems)
        .leftJoin(users, eq(taskItems.initiatorId, users.id))
        .leftJoin(users, eq(taskItems.assigneeId, users.id))
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
  public stopProcessor() {
    this.jobs.forEach((job, key) => {
      job.stop();
      console.log(`⏹️ Stopped job: ${key}`);
    });
    this.jobs.clear();
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
