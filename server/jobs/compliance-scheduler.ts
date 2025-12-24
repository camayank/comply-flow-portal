/**
 * COMPLIANCE SCHEDULER
 * File: server/jobs/compliance-scheduler.ts
 *
 * Automated compliance task generation, reminders, and SLA monitoring
 * Uses node-cron for scheduling
 */

import cron from 'node-cron';
import { db } from '../db';
import {
  complianceRules,
  complianceTracking,
  businessEntities,
  taskItems,
  serviceRequests,
  users,
  services
} from '../../shared/schema';
import { eq, and, gte, lte, lt, gt, sql, or, inArray, isNull, not } from 'drizzle-orm';
import { logger } from '../logger';
import { addDays, addMonths, format, differenceInDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

// ============ TYPES ============

interface NotificationData {
  type: string;
  userId: number;
  channels: string[];
  priority: string;
  data: Record<string, any>;
}

interface PenaltyResult {
  amount: number;
  description: string;
  daysOverdue?: number;
}

// ============ MAIN SCHEDULER INITIALIZATION ============

let schedulerInitialized = false;
const activeJobs: Map<string, cron.ScheduledTask> = new Map();

export function initializeComplianceScheduler() {
  if (schedulerInitialized) {
    logger.warn('Compliance scheduler already initialized, skipping...');
    return;
  }

  logger.info('🚀 Initializing compliance scheduler...');

  // Daily compliance check at 6:00 AM IST
  const dailyJob = cron.schedule('0 6 * * *', async () => {
    logger.info('🔄 Running daily compliance check...');
    const startTime = Date.now();
    try {
      await generateUpcomingTasks();
      await sendDeadlineReminders();
      await markOverdueTasks();
      await updateHealthScores();
      const duration = Date.now() - startTime;
      logger.info(`✅ Daily compliance check completed in ${duration}ms`);
    } catch (error: any) {
      logger.error('❌ Daily compliance check failed', { error: error.message, stack: error.stack });
      await notifyAdmins('Daily Compliance Check Failed', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });
  activeJobs.set('daily-compliance', dailyJob);

  // SLA check every 15 minutes
  const slaJob = cron.schedule('*/15 * * * *', async () => {
    try {
      await checkSlaBreaches();
    } catch (error: any) {
      logger.error('SLA check failed', { error: error.message });
    }
  });
  activeJobs.set('sla-check', slaJob);

  // Monthly task generation on 1st at 1:00 AM
  const monthlyJob = cron.schedule('0 1 1 * *', async () => {
    logger.info('🔄 Running monthly task generation...');
    const startTime = Date.now();
    try {
      await generateMonthlyTasks();
      const duration = Date.now() - startTime;
      logger.info(`✅ Monthly task generation completed in ${duration}ms`);
    } catch (error: any) {
      logger.error('Monthly task generation failed', { error: error.message });
      await notifyAdmins('Monthly Task Generation Failed', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });
  activeJobs.set('monthly-tasks', monthlyJob);

  // Weekly health score calculation on Sundays at 2:00 AM
  const weeklyHealthJob = cron.schedule('0 2 * * 0', async () => {
    logger.info('🔄 Running weekly health score calculation...');
    const startTime = Date.now();
    try {
      await calculateClientHealthScores();
      const duration = Date.now() - startTime;
      logger.info(`✅ Weekly health score calculation completed in ${duration}ms`);
    } catch (error: any) {
      logger.error('Health score calculation failed', { error: error.message });
    }
  }, {
    timezone: 'Asia/Kolkata'
  });
  activeJobs.set('weekly-health', weeklyHealthJob);

  // Commission processing on 5th of month at 10:00 AM
  const commissionJob = cron.schedule('0 10 5 * *', async () => {
    logger.info('🔄 Processing monthly commissions...');
    const startTime = Date.now();
    try {
      await processMonthlyCommissions();
      const duration = Date.now() - startTime;
      logger.info(`✅ Commission processing completed in ${duration}ms`);
    } catch (error: any) {
      logger.error('Commission processing failed', { error: error.message });
      await notifyAdmins('Commission Processing Failed', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });
  activeJobs.set('monthly-commission', commissionJob);

  // Overdue reminder escalation at 9:00 AM IST daily
  const overdueEscalationJob = cron.schedule('0 9 * * *', async () => {
    logger.info('🔄 Running overdue escalation check...');
    try {
      await escalateOverdueItems();
    } catch (error: any) {
      logger.error('Overdue escalation failed', { error: error.message });
    }
  }, {
    timezone: 'Asia/Kolkata'
  });
  activeJobs.set('overdue-escalation', overdueEscalationJob);

  schedulerInitialized = true;
  logger.info(`✅ Compliance scheduler initialized with ${activeJobs.size} jobs`);
}

/**
 * Gracefully stop all scheduled jobs
 */
export function stopComplianceScheduler() {
  logger.info('Stopping compliance scheduler...');
  for (const [name, job] of activeJobs) {
    job.stop();
    logger.info(`Stopped job: ${name}`);
  }
  activeJobs.clear();
  schedulerInitialized = false;
  logger.info('Compliance scheduler stopped');
}

/**
 * Get scheduler status for health checks
 */
export function getSchedulerStatus() {
  return {
    initialized: schedulerInitialized,
    activeJobs: Array.from(activeJobs.keys()),
    jobCount: activeJobs.size,
  };
}

// ============ TASK GENERATION ============

/**
 * Generate tasks for upcoming compliance deadlines
 * Looks 30 days ahead
 */
async function generateUpcomingTasks() {
  const lookAheadDays = 30;
  const today = new Date();
  const lookAheadDate = addDays(today, lookAheadDays);

  // Get all active clients
  const activeClients = await db.select()
    .from(businessEntities)
    .where(eq(businessEntities.isActive, true));

  if (activeClients.length === 0) {
    logger.info('No active clients found for task generation');
    return;
  }

  let tasksCreated = 0;
  let errors = 0;

  for (const client of activeClients) {
    try {
      // Get applicable compliance rules for this client
      const applicableRules = await getApplicableRules(client);

      for (const rule of applicableRules) {
        // Calculate next due date for this rule
        const nextDueDate = calculateNextDueDate(rule, client, today);

        if (!nextDueDate || nextDueDate > lookAheadDate) continue;

        // Calculate period string (e.g., "Dec 2024", "Q3 FY25")
        const period = getPeriodString(nextDueDate, rule.periodicity || 'monthly');

        // Check if tracking record already exists
        const [existing] = await db.select()
          .from(complianceTracking)
          .where(and(
            eq(complianceTracking.businessEntityId, client.id),
            eq(complianceTracking.complianceRuleId, rule.id),
            eq(complianceTracking.serviceType, period)
          ))
          .limit(1);

        if (existing) continue;

        const daysUntilDue = differenceInDays(nextDueDate, today);
        const priority = getPriorityFromDays(daysUntilDue);

        // Create compliance tracking record
        const [tracking] = await db.insert(complianceTracking).values({
          userId: client.ownerId,
          businessEntityId: client.id,
          complianceRuleId: rule.id,
          serviceId: rule.ruleCode,
          serviceType: period,
          entityName: client.name,
          complianceType: rule.periodicity || 'monthly',
          dueDate: nextDueDate,
          status: 'pending',
          priority,
          healthScore: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        // Create corresponding task
        const taskNumber = `TASK-${format(new Date(), 'yyyy')}-${String(tracking.id).padStart(6, '0')}`;

        await db.insert(taskItems).values({
          taskNumber,
          title: `${rule.complianceName} - ${period}`,
          description: rule.description || `Complete ${rule.complianceName} for ${client.name}`,
          taskType: 'compliance',
          initiatorId: 1, // System user
          businessEntityId: client.id,
          serviceRequestId: null,
          status: 'pending',
          priority,
          dueDate: nextDueDate,
          metadata: JSON.stringify({
            complianceTrackingId: tracking.id,
            ruleCode: rule.ruleCode,
            autoGenerated: true,
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        tasksCreated++;

        logger.debug('Created compliance task', {
          client: client.name,
          rule: rule.complianceName,
          dueDate: format(nextDueDate, 'yyyy-MM-dd'),
          period,
        });
      }
    } catch (error: any) {
      errors++;
      logger.error('Error generating tasks for client', {
        clientId: client.id,
        clientName: client.name,
        error: error.message
      });
    }
  }

  logger.info('Task generation complete', {
    tasksCreated,
    clientsProcessed: activeClients.length,
    errors
  });
}

/**
 * Generate monthly recurring tasks
 */
async function generateMonthlyTasks() {
  const currentMonth = new Date();
  const nextMonth = addMonths(currentMonth, 1);

  // Get all monthly compliance rules
  const monthlyRules = await db.select()
    .from(complianceRules)
    .where(and(
      eq(complianceRules.periodicity, 'monthly'),
      eq(complianceRules.isActive, true)
    ));

  if (monthlyRules.length === 0) {
    logger.info('No monthly compliance rules found');
    return;
  }

  // Get all active clients
  const activeClients = await db.select()
    .from(businessEntities)
    .where(eq(businessEntities.isActive, true));

  let tasksCreated = 0;

  for (const client of activeClients) {
    for (const rule of monthlyRules) {
      // Check if client needs this compliance
      const isApplicable = await checkRuleApplicability(rule, client);
      if (!isApplicable) continue;

      const dueDate = calculateMonthlyDueDate(rule, nextMonth);
      const period = format(nextMonth, 'MMM yyyy');

      // Check if already exists
      const [existing] = await db.select()
        .from(complianceTracking)
        .where(and(
          eq(complianceTracking.businessEntityId, client.id),
          eq(complianceTracking.complianceRuleId, rule.id),
          eq(complianceTracking.serviceType, period)
        ))
        .limit(1);

      if (!existing) {
        await db.insert(complianceTracking).values({
          userId: client.ownerId,
          businessEntityId: client.id,
          complianceRuleId: rule.id,
          serviceId: rule.ruleCode,
          serviceType: period,
          entityName: client.name,
          complianceType: 'monthly',
          dueDate,
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        tasksCreated++;
      }
    }
  }

  logger.info('Monthly tasks generated', { tasksCreated, clientCount: activeClients.length });
}

// ============ REMINDERS ============

/**
 * Send deadline reminders
 * Reminder schedule: 7 days, 3 days, 1 day, 0 days (due today)
 */
async function sendDeadlineReminders() {
  const reminderDays = [7, 3, 1, 0];
  const today = startOfDay(new Date());

  let remindersSent = 0;

  for (const days of reminderDays) {
    const targetDate = addDays(today, days);
    const targetStart = startOfDay(targetDate);
    const targetEnd = endOfDay(targetDate);

    // Find compliance items due on target date
    const upcomingItems = await db.select({
      tracking: complianceTracking,
      client: businessEntities,
      rule: complianceRules,
    })
      .from(complianceTracking)
      .innerJoin(businessEntities, eq(complianceTracking.businessEntityId, businessEntities.id))
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
      .where(and(
        eq(complianceTracking.status, 'pending'),
        gte(complianceTracking.dueDate, targetStart),
        lte(complianceTracking.dueDate, targetEnd)
      ));

    for (const { tracking, client, rule } of upcomingItems) {
      try {
        // Get primary contact (owner)
        const [user] = await db.select()
          .from(users)
          .where(eq(users.id, client.ownerId))
          .limit(1);

        if (!user) continue;

        // Determine notification urgency
        const notificationType = days === 0 ? 'COMPLIANCE_DUE_TODAY' :
                                days === 1 ? 'COMPLIANCE_DUE_TOMORROW' :
                                'COMPLIANCE_REMINDER';

        const channels = days <= 1 ? ['email', 'sms', 'whatsapp', 'in_app'] : ['email', 'in_app'];
        const priority = days === 0 ? 'urgent' : days <= 3 ? 'high' : 'normal';

        // Get penalty info
        const penaltyInfo = rule ? await getPenaltyInfo(rule.id, days) : null;

        await sendNotification({
          type: notificationType,
          userId: user.id,
          channels,
          priority,
          data: {
            complianceName: tracking.serviceId,
            ruleName: rule?.complianceName || tracking.serviceId,
            dueDate: tracking.dueDate ? format(tracking.dueDate, 'dd MMM yyyy') : 'N/A',
            daysRemaining: days,
            clientName: client.name,
            penalty: penaltyInfo,
            actionUrl: `${process.env.APP_URL || 'http://localhost:5000'}/compliance/${tracking.id}`,
          },
        });

        // Update reminder count
        await db.update(complianceTracking)
          .set({
            remindersSent: sql`COALESCE(${complianceTracking.remindersSent}, 0) + 1`,
            updatedAt: new Date(),
          })
          .where(eq(complianceTracking.id, tracking.id));

        remindersSent++;
      } catch (error: any) {
        logger.error('Failed to send reminder', {
          trackingId: tracking.id,
          error: error.message,
        });
      }
    }
  }

  logger.info('Reminders processing complete', { remindersSent });
}

// ============ OVERDUE HANDLING ============

/**
 * Mark overdue compliance items and calculate penalties
 */
async function markOverdueTasks() {
  const today = new Date();

  // Find items that are past due and not marked as overdue
  const overdueItems = await db.select({
    tracking: complianceTracking,
    client: businessEntities,
    rule: complianceRules,
  })
    .from(complianceTracking)
    .innerJoin(businessEntities, eq(complianceTracking.businessEntityId, businessEntities.id))
    .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
    .where(and(
      eq(complianceTracking.status, 'pending'),
      lt(complianceTracking.dueDate, today)
    ));

  let overdueMarked = 0;

  for (const { tracking, client, rule } of overdueItems) {
    try {
      // Calculate penalty
      const daysOverdue = tracking.dueDate ? differenceInDays(today, tracking.dueDate) : 0;
      const penalty = rule ? await calculatePenalty(rule, daysOverdue) : { amount: 0, description: 'Unknown' };

      // Update tracking status
      await db.update(complianceTracking)
        .set({
          status: 'overdue',
          priority: 'urgent',
          penaltyRisk: true,
          estimatedPenalty: penalty.amount,
          updatedAt: new Date(),
        })
        .where(eq(complianceTracking.id, tracking.id));

      // Update corresponding tasks
      await db.update(taskItems)
        .set({
          status: 'overdue',
          priority: 'urgent',
          updatedAt: new Date(),
        })
        .where(sql`metadata->>'complianceTrackingId' = ${String(tracking.id)}`);

      // Send overdue notification
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, client.ownerId))
        .limit(1);

      if (user) {
        await sendNotification({
          type: 'COMPLIANCE_OVERDUE',
          userId: user.id,
          channels: ['email', 'sms', 'whatsapp', 'in_app'],
          priority: 'urgent',
          data: {
            complianceName: rule?.complianceName || tracking.serviceId,
            dueDate: tracking.dueDate ? format(tracking.dueDate, 'dd MMM yyyy') : 'N/A',
            daysOverdue,
            penalty,
            clientName: client.name,
            actionUrl: `${process.env.APP_URL || 'http://localhost:5000'}/compliance/${tracking.id}`,
          },
        });
      }

      overdueMarked++;

      logger.warn('Compliance item marked overdue', {
        client: client.name,
        rule: rule?.complianceName || tracking.serviceId,
        daysOverdue,
        penalty: penalty.amount,
      });
    } catch (error: any) {
      logger.error('Error marking item overdue', {
        trackingId: tracking.id,
        error: error.message,
      });
    }
  }

  logger.info('Overdue processing complete', { overdueMarked });
}

/**
 * Escalate overdue items based on severity
 */
async function escalateOverdueItems() {
  const today = new Date();

  // Find items overdue by more than 7 days without recent escalation
  const criticalOverdue = await db.select({
    tracking: complianceTracking,
    client: businessEntities,
  })
    .from(complianceTracking)
    .innerJoin(businessEntities, eq(complianceTracking.businessEntityId, businessEntities.id))
    .where(and(
      eq(complianceTracking.status, 'overdue'),
      lt(complianceTracking.dueDate, addDays(today, -7))
    ));

  for (const { tracking, client } of criticalOverdue) {
    const daysOverdue = tracking.dueDate ? differenceInDays(today, tracking.dueDate) : 0;

    // Notify relationship manager if assigned
    if (client.relationshipManager) {
      const [manager] = await db.select()
        .from(users)
        .where(eq(users.email, client.relationshipManager))
        .limit(1);

      if (manager) {
        await sendNotification({
          type: 'COMPLIANCE_CRITICAL_OVERDUE',
          userId: manager.id,
          channels: ['email', 'in_app'],
          priority: 'urgent',
          data: {
            clientName: client.name,
            complianceName: tracking.serviceId,
            daysOverdue,
            estimatedPenalty: tracking.estimatedPenalty,
          },
        });
      }
    }

    // Also notify admins for critical cases (> 15 days overdue)
    if (daysOverdue > 15) {
      await notifyAdmins(
        'Critical Compliance Overdue',
        `${client.name}: ${tracking.serviceId} is ${daysOverdue} days overdue. Estimated penalty: ₹${tracking.estimatedPenalty}`
      );
    }
  }

  logger.info('Overdue escalation complete', { itemsEscalated: criticalOverdue.length });
}

// ============ SLA MONITORING ============

/**
 * Check for SLA breaches and escalate
 */
async function checkSlaBreaches() {
  const now = new Date();
  const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  // Find tasks at risk (due within 4 hours) that haven't been warned
  const atRiskTasks = await db.select({
    task: taskItems,
    client: businessEntities,
    assignee: users,
  })
    .from(taskItems)
    .leftJoin(businessEntities, eq(taskItems.businessEntityId, businessEntities.id))
    .leftJoin(users, eq(taskItems.assigneeId, users.id))
    .where(and(
      not(inArray(taskItems.status, ['completed', 'cancelled'])),
      gt(taskItems.dueDate, now),
      lt(taskItems.dueDate, fourHoursFromNow)
    ));

  for (const { task, client, assignee } of atRiskTasks) {
    // Check if already warned via metadata
    const metadata = task.metadata ? JSON.parse(task.metadata as string) : {};
    if (metadata.slaWarned) continue;

    // Mark as warned
    metadata.slaWarned = true;
    metadata.slaWarnedAt = now.toISOString();

    await db.update(taskItems)
      .set({
        metadata: JSON.stringify(metadata),
        updatedAt: new Date()
      })
      .where(eq(taskItems.id, task.id));

    // Notify assignee
    if (assignee) {
      const hoursRemaining = task.dueDate
        ? Math.round((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60))
        : 0;

      await sendNotification({
        type: 'SLA_WARNING',
        userId: assignee.id,
        channels: ['in_app', 'email'],
        priority: 'high',
        data: {
          taskName: task.title,
          taskNumber: task.taskNumber,
          dueDate: task.dueDate ? format(task.dueDate, 'dd MMM yyyy HH:mm') : 'N/A',
          timeRemaining: `${hoursRemaining} hours`,
          clientName: client?.name || 'N/A',
        },
      });
    }
  }

  // Find breached tasks
  const breachedTasks = await db.select({
    task: taskItems,
    client: businessEntities,
    assignee: users,
  })
    .from(taskItems)
    .leftJoin(businessEntities, eq(taskItems.businessEntityId, businessEntities.id))
    .leftJoin(users, eq(taskItems.assigneeId, users.id))
    .where(and(
      not(inArray(taskItems.status, ['completed', 'cancelled'])),
      lt(taskItems.dueDate, now)
    ));

  for (const { task, client, assignee } of breachedTasks) {
    const metadata = task.metadata ? JSON.parse(task.metadata as string) : {};
    if (metadata.slaBreached) continue;

    // Mark as breached
    metadata.slaBreached = true;
    metadata.slaBreachedAt = now.toISOString();

    await db.update(taskItems)
      .set({
        status: 'overdue',
        priority: 'urgent',
        metadata: JSON.stringify(metadata),
        updatedAt: new Date(),
      })
      .where(eq(taskItems.id, task.id));

    // Notify team lead/admin
    await notifyTeamLead(task, client, assignee, 'SLA_BREACH');

    logger.warn('SLA breached', {
      taskId: task.id,
      taskNumber: task.taskNumber,
      taskName: task.title,
      client: client?.name,
    });
  }
}

// ============ HEALTH SCORES ============

/**
 * Calculate and update client health scores
 */
async function calculateClientHealthScores() {
  const activeClients = await db.select()
    .from(businessEntities)
    .where(eq(businessEntities.isActive, true));

  let updated = 0;

  for (const client of activeClients) {
    try {
      // Get compliance stats
      const complianceStats = await db.select({
        total: sql<number>`COUNT(*)::int`,
        completed: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)::int`,
        overdue: sql<number>`COUNT(CASE WHEN status = 'overdue' THEN 1 END)::int`,
      })
        .from(complianceTracking)
        .where(eq(complianceTracking.businessEntityId, client.id));

      const stats = complianceStats[0] || { total: 0, completed: 0, overdue: 0 };

      // Calculate score components
      const complianceScore = stats.total > 0
        ? Math.round((stats.completed / stats.total) * 40)
        : 40;

      const overdueDeduction = Math.min(30, stats.overdue * 5);

      // Base score + compliance score - overdue deduction
      // Final score (0-100)
      const healthScore = Math.max(0, Math.min(100,
        30 + complianceScore + 30 - overdueDeduction
      ));

      // Update client
      await db.update(businessEntities)
        .set({
          complianceScore: healthScore,
          updatedAt: new Date(),
        })
        .where(eq(businessEntities.id, client.id));

      updated++;
    } catch (error: any) {
      logger.error('Error calculating health score', {
        clientId: client.id,
        error: error.message,
      });
    }
  }

  logger.info('Health scores updated', { clientsUpdated: updated, totalClients: activeClients.length });
}

async function updateHealthScores() {
  // Lightweight daily update (full calculation is weekly)
  await calculateClientHealthScores();
}

// ============ COMMISSION PROCESSING ============

async function processMonthlyCommissions() {
  // Get last month's period
  const lastMonth = addMonths(new Date(), -1);
  const period = format(lastMonth, 'yyyy-MM');

  logger.info('Processing commissions for period', { period });

  // This would integrate with your commission system
  // For now, just log that it would run

  // TODO: Implement actual commission calculation:
  // 1. Get all converted leads from last month
  // 2. Calculate commission based on service value and agent rates
  // 3. Create commission records
  // 4. Notify agents of pending payouts

  logger.info('Commission processing placeholder completed', { period });
}

// ============ HELPER FUNCTIONS ============

async function getApplicableRules(client: any) {
  // Get all active rules
  const rules = await db.select()
    .from(complianceRules)
    .where(eq(complianceRules.isActive, true));

  // Filter based on client entity type
  return rules.filter(rule => {
    // Check entity type applicability
    if (rule.applicableEntityTypes) {
      try {
        const types = typeof rule.applicableEntityTypes === 'string'
          ? JSON.parse(rule.applicableEntityTypes)
          : rule.applicableEntityTypes;
        if (Array.isArray(types) && !types.includes(client.entityType)) {
          return false;
        }
      } catch {
        // If parsing fails, include the rule
      }
    }
    return true;
  });
}

function calculateNextDueDate(rule: any, client: any, fromDate: Date): Date | null {
  let dueDateFormula: any = {};

  try {
    dueDateFormula = typeof rule.dueDateFormula === 'string'
      ? JSON.parse(rule.dueDateFormula)
      : rule.dueDateFormula || {};
  } catch {
    dueDateFormula = {};
  }

  const calculationType = rule.dueDateCalculationType || dueDateFormula.type || 'fixed';

  switch (calculationType) {
    case 'fixed_date':
    case 'fixed':
      // Fixed date (e.g., "15th October every year")
      const fixedDay = dueDateFormula.day || 15;
      const fixedMonth = dueDateFormula.month !== undefined ? dueDateFormula.month : 9; // 0-indexed, default October
      let fixedDate = new Date(fromDate.getFullYear(), fixedMonth, fixedDay);
      if (fixedDate < fromDate) {
        fixedDate = new Date(fromDate.getFullYear() + 1, fixedMonth, fixedDay);
      }
      return fixedDate;

    case 'relative_to_month_end':
    case 'relative':
      // Relative to month (e.g., "20th of next month")
      const relativeDay = dueDateFormula.day || 20;
      const monthOffset = dueDateFormula.month_offset || 1;
      return new Date(fromDate.getFullYear(), fromDate.getMonth() + monthOffset, relativeDay);

    case 'relative_to_fy_end':
    case 'fy_end':
      // Relative to financial year end (March 31 in India)
      const fyEndMonth = 2; // March (0-indexed)
      const fyEndYear = fromDate.getMonth() > 2 ? fromDate.getFullYear() + 1 : fromDate.getFullYear();
      const fyEnd = new Date(fyEndYear, fyEndMonth, 31);
      return addDays(fyEnd, dueDateFormula.days_after || 180);

    default:
      // Default to next month's 20th
      return new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 20);
  }
}

function calculateMonthlyDueDate(rule: any, month: Date): Date {
  let dueDateFormula: any = {};

  try {
    dueDateFormula = typeof rule.dueDateFormula === 'string'
      ? JSON.parse(rule.dueDateFormula)
      : rule.dueDateFormula || {};
  } catch {
    dueDateFormula = {};
  }

  const dayOfMonth = dueDateFormula.day || 20;
  return new Date(month.getFullYear(), month.getMonth(), dayOfMonth);
}

function getPeriodString(date: Date, periodicity: string): string {
  switch (periodicity?.toLowerCase()) {
    case 'monthly':
      return format(date, 'MMM yyyy');
    case 'quarterly':
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      const fy = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
      return `Q${quarter} FY${fy}-${(fy + 1) % 100}`;
    case 'annual':
    case 'yearly':
      const fyYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
      return `FY ${fyYear}-${(fyYear + 1) % 100}`;
    case 'half_yearly':
      const half = date.getMonth() < 6 ? 'H1' : 'H2';
      return `${half} ${date.getFullYear()}`;
    default:
      return format(date, 'MMM yyyy');
  }
}

function getPriorityFromDays(daysUntilDue: number): string {
  if (daysUntilDue <= 3) return 'urgent';
  if (daysUntilDue <= 7) return 'high';
  if (daysUntilDue <= 14) return 'medium';
  return 'low';
}

async function checkRuleApplicability(rule: any, client: any): Promise<boolean> {
  // Check entity type
  if (rule.applicableEntityTypes) {
    try {
      const types = typeof rule.applicableEntityTypes === 'string'
        ? JSON.parse(rule.applicableEntityTypes)
        : rule.applicableEntityTypes;
      if (Array.isArray(types) && !types.includes(client.entityType)) {
        return false;
      }
    } catch {
      // If parsing fails, include the rule
    }
  }

  // Check turnover threshold (if available on client)
  if (rule.turnoverThresholdMin && client.totalRevenue) {
    const turnover = parseFloat(client.totalRevenue);
    if (turnover < parseFloat(rule.turnoverThresholdMin)) {
      return false;
    }
  }

  return true;
}

async function calculatePenalty(rule: any, daysOverdue: number): Promise<PenaltyResult> {
  let amount = 0;
  let description = '';

  // Try to get penalty definition
  const penaltyDefs = await db.select()
    .from(sql`compliance_penalty_definitions`)
    .where(sql`compliance_rule_id = ${rule.id}`)
    .limit(1);

  if (penaltyDefs.length > 0) {
    const penaltyDef = penaltyDefs[0] as any;
    const formula = typeof penaltyDef.calculation_formula === 'string'
      ? JSON.parse(penaltyDef.calculation_formula)
      : penaltyDef.calculation_formula || {};

    switch (penaltyDef.calculation_type) {
      case 'per_day':
        const perDayRate = formula.per_day_rate || 50;
        amount = perDayRate * daysOverdue;
        if (formula.max_amount) amount = Math.min(amount, formula.max_amount);
        description = `₹${perDayRate}/day × ${daysOverdue} days`;
        break;

      case 'percentage_per_month':
        amount = formula.base_amount || 0;
        description = `${formula.percentage || 0}% penalty`;
        break;

      case 'fixed_amount':
      default:
        amount = formula.amount || 1000;
        description = 'Fixed penalty';
    }

    // Apply min/max
    if (penaltyDef.min_penalty) amount = Math.max(amount, parseFloat(penaltyDef.min_penalty));
    if (penaltyDef.max_penalty) amount = Math.min(amount, parseFloat(penaltyDef.max_penalty));
  } else {
    // Default penalty calculation
    amount = Math.min(daysOverdue * 50, 5000);
    description = `Default: ₹50/day × ${daysOverdue} days (max ₹5,000)`;
  }

  return { amount: Math.round(amount), description, daysOverdue };
}

async function getPenaltyInfo(ruleId: number, daysUntilDue: number) {
  if (daysUntilDue > 0) {
    return {
      warning: 'Late filing may attract penalty',
      estimatedPerDay: 50,
    };
  }
  return null;
}

async function sendNotification(data: NotificationData): Promise<void> {
  // Log the notification
  logger.info('Sending notification', {
    type: data.type,
    userId: data.userId,
    channels: data.channels,
    priority: data.priority,
  });

  // TODO: Integrate with actual notification service
  // For now, we'll create an in-app notification record
  try {
    await db.execute(sql`
      INSERT INTO notifications (user_id, type, title, message, priority, is_read, created_at)
      VALUES (
        ${data.userId},
        ${data.type},
        ${data.data.complianceName || data.data.taskName || 'Notification'},
        ${JSON.stringify(data.data)},
        ${data.priority},
        false,
        NOW()
      )
      ON CONFLICT DO NOTHING
    `);
  } catch (error: any) {
    // Table might not exist, just log
    logger.debug('Could not insert notification', { error: error.message });
  }
}

async function notifyTeamLead(task: any, client: any, assignee: any, type: string) {
  // Get team leads / admins
  const teamLeads = await db.select()
    .from(users)
    .where(inArray(users.role, ['admin', 'super_admin', 'ops_executive']))
    .limit(5);

  for (const lead of teamLeads) {
    await sendNotification({
      type: 'ESCALATION',
      userId: lead.id,
      channels: ['email', 'in_app'],
      priority: 'high',
      data: {
        escalationType: type,
        taskName: task.title,
        taskNumber: task.taskNumber,
        clientName: client?.name || 'N/A',
        assigneeName: assignee?.fullName || assignee?.username || 'Unassigned',
      },
    });
  }

  logger.info('Team lead notified', { task: task.title, type, leadCount: teamLeads.length });
}

async function notifyAdmins(subject: string, message: string) {
  // Get all admins
  const admins = await db.select()
    .from(users)
    .where(inArray(users.role, ['admin', 'super_admin']));

  for (const admin of admins) {
    await sendNotification({
      type: 'SYSTEM_ALERT',
      userId: admin.id,
      channels: ['email', 'in_app'],
      priority: 'high',
      data: { subject, message },
    });
  }

  logger.info('Admins notified', { subject, adminCount: admins.length });
}

export default initializeComplianceScheduler;
