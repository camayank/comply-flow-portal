import cron from 'node-cron';
import { db } from './db';
import { complianceTracking, complianceRules, complianceAlerts, notifications, businessEntities } from '@shared/schema';
import { and, eq, sql } from 'drizzle-orm';
import { logger } from './logger';
import { triggerWorkflowAutomation } from './workflow-automation-engine';

const UPCOMING_THRESHOLDS = [7, 3, 1, 0]; // days before due date

export class ComplianceAlertProcessor {
  constructor() {
    this.initializeProcessor();
  }

  private async initializeProcessor() {
    const { jobManager } = await import('./job-lifecycle-manager.js');

    logger.info('[ComplianceAlertProcessor] Initializing compliance alert processor...');

    const job = cron.schedule('0 9 * * *', async () => {
      await this.processComplianceAlerts();
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata',
    });

    jobManager.registerCron(
      'compliance-alerts-daily',
      job,
      'Daily compliance alert check at 9 AM IST (T-7, T-3, T-1, due-day, overdue)'
    );

    job.start();
    logger.info('[ComplianceAlertProcessor] Scheduled daily compliance alerts (9 AM IST)');
  }

  private async processComplianceAlerts(): Promise<void> {
    try {
      logger.info('[ComplianceAlertProcessor] Processing compliance alerts...');

      const trackingItems = await db
        .select({
          id: complianceTracking.id,
          userId: complianceTracking.userId,
          businessEntityId: complianceTracking.businessEntityId,
          serviceId: complianceTracking.serviceId,
          serviceType: complianceTracking.serviceType,
          complianceType: complianceTracking.complianceType,
          dueDate: complianceTracking.dueDate,
          status: complianceTracking.status,
          priority: complianceTracking.priority,
          remindersSent: complianceTracking.remindersSent,
          ruleCode: complianceRules.ruleCode,
          complianceName: complianceRules.complianceName,
          entityName: businessEntities.name,
        })
        .from(complianceTracking)
        .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
        .leftJoin(businessEntities, eq(complianceTracking.businessEntityId, businessEntities.id))
        .where(
          and(
            sql`${complianceTracking.dueDate} IS NOT NULL`,
            sql`LOWER(${complianceTracking.status}) NOT IN ('completed', 'not_applicable')`
          )
        );

      const today = new Date();
      let alertsSent = 0;

      for (const item of trackingItems) {
        if (!item.dueDate || !item.businessEntityId) continue;

        const dueDate = new Date(item.dueDate);
        const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const ruleId = item.ruleCode || item.serviceId || `COMPLIANCE-${item.id}`;
        const complianceName = item.complianceName || item.serviceType || item.serviceId || 'Compliance item';
        const entityName = item.entityName || 'Client';

        const remindersSent = item.remindersSent || 0;

        if (daysRemaining > UPCOMING_THRESHOLDS[0] && remindersSent > 0) {
          await db
            .update(complianceTracking)
            .set({
              remindersSent: 0,
              updatedAt: new Date(),
            })
            .where(eq(complianceTracking.id, item.id));
          continue;
        }

        if (daysRemaining < 0) {
          const existingOverdue = await db
            .select({ id: complianceAlerts.id })
            .from(complianceAlerts)
            .where(
              and(
                eq(complianceAlerts.entityId, item.businessEntityId),
                eq(complianceAlerts.ruleId, ruleId),
                eq(complianceAlerts.alertType, 'OVERDUE'),
                eq(complianceAlerts.isActive, true),
                sql`(metadata->>'trackingId')::int = ${item.id}`
              )
            )
            .limit(1);

          if (existingOverdue.length > 0) {
            continue;
          }

          await this.createAlertAndNotification({
            itemId: item.id,
            entityId: item.businessEntityId,
            userId: item.userId,
            ruleId,
            alertType: 'OVERDUE',
            severity: 'CRITICAL',
            title: `${complianceName} is overdue`,
            message: `${complianceName} for ${entityName} is overdue. Immediate action required to avoid penalties.`,
            actionRequired: 'Complete compliance filing and upload proof',
            metadata: {
              trackingId: item.id,
              dueDate: dueDate.toISOString(),
              daysRemaining,
              complianceName,
            },
          });

          alertsSent++;
          continue;
        }

        if (remindersSent >= UPCOMING_THRESHOLDS.length) {
          continue;
        }

        const nextThreshold = UPCOMING_THRESHOLDS[remindersSent];
        if (daysRemaining > nextThreshold) {
          continue;
        }

        const severity = daysRemaining <= 1 ? 'CRITICAL' : daysRemaining <= 3 ? 'WARNING' : 'INFO';
        const title = daysRemaining === 0
          ? `${complianceName} is due today`
          : `${complianceName} due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;

        const message = daysRemaining === 0
          ? `${complianceName} for ${entityName} is due today. Upload required documents to avoid penalties.`
          : `${complianceName} for ${entityName} is due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`;

        const existingUpcoming = await db
          .select({ id: complianceAlerts.id })
          .from(complianceAlerts)
          .where(
            and(
              eq(complianceAlerts.entityId, item.businessEntityId),
              eq(complianceAlerts.ruleId, ruleId),
              eq(complianceAlerts.alertType, 'UPCOMING'),
              eq(complianceAlerts.isActive, true),
              sql`(metadata->>'trackingId')::int = ${item.id}`,
              sql`(metadata->>'daysRemaining')::int = ${daysRemaining}`
            )
          )
          .limit(1);

        if (existingUpcoming.length > 0) {
          continue;
        }

        await this.createAlertAndNotification({
          itemId: item.id,
          entityId: item.businessEntityId,
          userId: item.userId,
          ruleId,
          alertType: 'UPCOMING',
          severity,
          title,
          message,
          actionRequired: 'Upload documents and confirm completion',
          metadata: {
            trackingId: item.id,
            dueDate: dueDate.toISOString(),
            daysRemaining,
            complianceName,
          },
        });

        await db
          .update(complianceTracking)
          .set({
            remindersSent: remindersSent + 1,
            updatedAt: new Date(),
          })
          .where(eq(complianceTracking.id, item.id));

        alertsSent++;
      }

      logger.info(`[ComplianceAlertProcessor] Alerts processed: ${alertsSent}`);
    } catch (error) {
      logger.error('[ComplianceAlertProcessor] Error processing compliance alerts:', error);
    }
  }

  private async createAlertAndNotification(payload: {
    itemId: number;
    entityId: number;
    userId: number;
    ruleId: string;
    alertType: string;
    severity: string;
    title: string;
    message: string;
    actionRequired: string;
    metadata: Record<string, unknown>;
  }) {
    await db.insert(complianceAlerts).values({
      entityId: payload.entityId,
      ruleId: payload.ruleId,
      alertType: payload.alertType,
      severity: payload.severity,
      title: payload.title,
      message: payload.message,
      actionRequired: payload.actionRequired,
      triggeredAt: new Date(),
      metadata: payload.metadata,
    });

    await db.insert(notifications).values({
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: 'reminder',
      category: 'compliance',
      priority: payload.severity === 'CRITICAL' ? 'urgent' : payload.severity === 'WARNING' ? 'high' : 'normal',
      actionUrl: '/lifecycle/compliance',
      actionText: 'View Compliance',
      metadata: {
        complianceTrackingId: payload.itemId,
        ruleId: payload.ruleId,
        alertType: payload.alertType,
      },
    });

    try {
      const daysUntilDue = typeof payload.metadata?.daysRemaining === 'number'
        ? payload.metadata.daysRemaining
        : undefined;

      await triggerWorkflowAutomation({
        trigger: payload.alertType === 'OVERDUE' ? 'compliance_overdue' : 'compliance_due_soon',
        entityType: 'compliance_tracking',
        entityId: payload.itemId,
        data: {
          ruleCode: payload.ruleId,
          complianceName: payload.metadata?.complianceName,
          dueDate: payload.metadata?.dueDate,
          daysUntilDue,
          businessEntityId: payload.entityId,
          userId: payload.userId,
        },
      });
    } catch (error) {
      logger.error('[ComplianceAlertProcessor] AutoComply trigger failed:', error);
    }
  }
}
