import { db } from '../db';
import { pipelineEvents } from '@shared/pipeline-schema';
import { and, eq, gte, lte, lt, not } from 'drizzle-orm';
import { createPipelineEvent, PIPELINE_EVENTS } from '../services/pipeline/pipeline-events';
import { logger } from '../logger';

export async function checkComplianceDeadlines(): Promise<void> {
  logger.info('Running compliance deadline check');

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Derive current fiscal year: Apr 1 → Mar 31
  const month = now.getMonth();
  const year = now.getFullYear();
  const fiscalYear = month >= 3
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;

  const { complianceTracking } = await import('@shared/schema');

  // Find records approaching deadline (within 7 days, not yet overdue)
  const approaching = await db.select().from(complianceTracking)
    .where(and(
      eq(complianceTracking.status, 'pending'),
      lte(complianceTracking.dueDate, sevenDaysFromNow),
      gte(complianceTracking.dueDate, now),
    ));

  for (const record of approaching) {
    await db.update(complianceTracking)
      .set({ status: 'approaching' as any })
      .where(eq(complianceTracking.id, record.id));

    await db.insert(pipelineEvents).values(createPipelineEvent({
      eventType: PIPELINE_EVENTS.COMPLIANCE_DEADLINE_APPROACHING,
      entityType: 'business_entity',
      entityId: record.businessEntityId!,
      payload: { ruleName: record.serviceType || record.serviceId, dueDate: record.dueDate, fiscalYear },
    }));
  }

  // Find records past deadline
  const overdue = await db.select().from(complianceTracking)
    .where(and(
      not(eq(complianceTracking.status, 'completed')),
      not(eq(complianceTracking.status, 'overdue')),
      lt(complianceTracking.dueDate, now),
    ));

  for (const record of overdue) {
    await db.update(complianceTracking)
      .set({ status: 'overdue' })
      .where(eq(complianceTracking.id, record.id));

    await db.insert(pipelineEvents).values(createPipelineEvent({
      eventType: PIPELINE_EVENTS.COMPLIANCE_DEADLINE_OVERDUE,
      entityType: 'business_entity',
      entityId: record.businessEntityId!,
      payload: { ruleName: record.serviceType || record.serviceId, dueDate: record.dueDate, fiscalYear },
    }));
  }

  logger.info(`Deadline check complete: ${approaching.length} approaching, ${overdue.length} overdue`);
}
