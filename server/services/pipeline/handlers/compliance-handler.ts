import { db } from '../../../db';
import { businessEntities, serviceRequests } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../../logger';
import { PIPELINE_EVENTS } from '../pipeline-events';
import type { PipelineOrchestrator, HandlerContext } from '../pipeline-orchestrator';
import type { PipelineEvent } from '@shared/pipeline-schema';

// ── compliance.entity_initialized: Calculate initial state ──
async function handleEntityInitialized(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;

  // 1. Mark entity as initialized
  await db.update(businessEntities).set({
    complianceInitialized: true,
    complianceInitializedAt: new Date(),
  }).where(eq(businessEntities.id, entityId));

  // 2. DELEGATE to existing state engine for initial score
  const { stateEngine } = await import('../../../compliance-state-engine');
  const state = await stateEngine.calculateEntityState(entityId);

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.COMPLIANCE_STATE_CHANGED,
    entityType: 'business_entity', entityId,
    payload: { overallState: state.overallState, riskScore: state.riskScore },
    newState: state.overallState,
  });

  return { initialized: true, state: state.overallState };
}

// ── compliance.deadline_approaching: AMBER alert ──
async function handleDeadlineApproaching(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId, payload } = event;

  try {
    const { notificationHub } = await import('../../../notification-engine');
    await notificationHub.emit('compliance_deadline_approaching', {
      entityId, ruleName: (payload as any).ruleName,
    });
  } catch (err) {
    logger.warn(`Deadline notification failed for entity ${entityId}:`, err);
  }

  const { stateEngine } = await import('../../../compliance-state-engine');
  await stateEngine.calculateEntityState(entityId);

  return { alerted: true };
}

// ── compliance.deadline_overdue: RED alert ──
async function handleDeadlineOverdue(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId, payload } = event;

  try {
    const { notificationHub } = await import('../../../notification-engine');
    await notificationHub.emit('compliance_deadline_overdue', {
      entityId, ruleName: (payload as any).ruleName,
    });
  } catch (err) {
    logger.warn(`Overdue notification failed for entity ${entityId}:`, err);
  }

  const { stateEngine } = await import('../../../compliance-state-engine');
  await stateEngine.calculateEntityState(entityId);

  return { escalated: true };
}

// ── compliance.action_completed: Recalculate state ──
async function handleActionCompleted(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;

  const { complianceEventEmitter } = await import('../../../compliance-event-emitter');
  await complianceEventEmitter.recalculate(entityId);

  return { recalculated: true };
}

// ── compliance.state_changed: Log + notify ──
async function handleStateChanged(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId, payload } = event;
  logger.info(`Entity ${entityId} compliance state: ${(payload as any).overallState}`);
  return { logged: true };
}

// ── compliance.renewal_due: Dedup check + create SR ──
async function handleRenewalDue(event: PipelineEvent, ctx: HandlerContext) {
  const { payload } = event;
  const { serviceCode, businessEntityId, fiscalYear, period, renewalDueDate } = payload as any;

  // Build dedup key
  const dedupKey = `${serviceCode}:${businessEntityId}:${fiscalYear}:${period}`;

  // Check if renewal already exists (excluding CANCELLED)
  const [existing] = await db.select().from(serviceRequests)
    .where(eq(serviceRequests.renewalDedupKey, dedupKey)).limit(1);

  if (existing && existing.status !== 'CANCELLED') {
    logger.info(`Renewal dedup: SR already exists for ${dedupKey}, skipping`);
    return { skipped: true, reason: 'duplicate', dedupKey };
  }

  // Create renewal service request
  const [newSr] = await db.insert(serviceRequests).values({
    businessEntityId,
    serviceType: serviceCode,
    status: 'INITIATED',
    renewalDedupKey: dedupKey,
    renewalDueDate,
  } as any).returning();

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.SERVICE_CREATED,
    entityType: 'service_request', entityId: newSr.id,
    payload: { serviceCode, isRenewal: true, dedupKey },
  });

  return { created: true, serviceRequestId: newSr.id, dedupKey };
}

// ── compliance.gap_detected: Surface in dashboard ──
async function handleGapDetected(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId, payload } = event;
  logger.warn(`Compliance gap for entity ${entityId}: ${(payload as any).description || 'missing coverage'}`);
  try {
    const { notificationHub } = await import('../../../notification-engine');
    await notificationHub.emit('compliance_gap', { entityId });
  } catch (err) {
    logger.warn(`Gap notification failed:`, err);
  }
  return { surfaced: true };
}

// ── compliance.portal_synced: Future phase (MANUAL) ──
async function handlePortalSynced(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  logger.info(`Portal sync for entity ${entityId} — future phase`);
  return { acknowledged: true };
}

export function registerComplianceHandlers(orchestrator: PipelineOrchestrator): void {
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED, 'compliance-init', handleEntityInitialized);
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_DEADLINE_APPROACHING, 'deadline-warn', handleDeadlineApproaching);
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_DEADLINE_OVERDUE, 'deadline-escalate', handleDeadlineOverdue);
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_ACTION_COMPLETED, 'action-recalc', handleActionCompleted);
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_STATE_CHANGED, 'state-log', handleStateChanged);
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_RENEWAL_DUE, 'renewal-create', handleRenewalDue);
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_GAP_DETECTED, 'gap-surface', handleGapDetected);
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_PORTAL_SYNCED, 'portal-ack', handlePortalSynced);
}
