import { db } from '../../../db';
import { businessEntities } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../../logger';

export interface ComplianceGuardResult {
  state: 'GREEN' | 'AMBER' | 'RED' | 'UNINITIALIZED';
  metadata: Record<string, boolean>;
  overdueRecords: Array<{ id: number; ruleName: string; status: string }>;
}

export async function runComplianceGuard(entityId: number): Promise<ComplianceGuardResult> {
  const [entity] = await db.select().from(businessEntities)
    .where(eq(businessEntities.id, entityId)).limit(1);

  if (!entity) {
    return { state: 'GREEN', metadata: {}, overdueRecords: [] };
  }

  if (!entity.complianceInitialized) {
    return { state: 'UNINITIALIZED', metadata: { compliance_uninitialized: true }, overdueRecords: [] };
  }

  // CALL EXISTING SERVICE — not reimplementing
  let stateEngine: any;
  try {
    const mod = await import('../../../compliance-state-engine');
    stateEngine = mod.stateEngine;
  } catch {
    logger.warn('Compliance state engine not available');
    return { state: 'GREEN', metadata: {}, overdueRecords: [] };
  }

  const complianceState = await stateEngine.calculateEntityState(entityId);
  const overallState = complianceState.overallState as 'GREEN' | 'AMBER' | 'RED';

  if (overallState === 'GREEN') {
    return { state: 'GREEN', metadata: {}, overdueRecords: [] };
  }

  if (overallState === 'AMBER') {
    logger.info(`Compliance guard: AMBER warning for entity ${entityId}`);
    return { state: 'AMBER', metadata: { compliance_warning: true }, overdueRecords: [] };
  }

  // RED — fetch overdue records for remediation tasks
  let overdueRecords: any[] = [];
  try {
    const { complianceTracking } = await import('@shared/schema');
    overdueRecords = await db.select().from(complianceTracking)
      .where(and(
        eq(complianceTracking.businessEntityId, entityId),
        eq(complianceTracking.status, 'overdue')
      ))
      .limit(200);
  } catch {
    logger.warn('Could not fetch overdue compliance records');
  }

  logger.warn(`Compliance guard: RED critical for entity ${entityId}, ${overdueRecords.length} overdue`);
  return {
    state: 'RED',
    metadata: { compliance_critical: true },
    overdueRecords: overdueRecords.map(r => ({ id: r.id, ruleName: r.serviceType || r.serviceId, status: r.status })),
  };
}
