import { db } from '../../../db';
import { serviceRequests, businessEntities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../logger';
import { PIPELINE_EVENTS } from '../pipeline-events';
import { runComplianceGuard } from '../guards/compliance-guard';
import type { PipelineOrchestrator, HandlerContext } from '../pipeline-orchestrator';
import type { PipelineEvent } from '@shared/pipeline-schema';

// ── service.created: Guard + instantiate tasks + calc SLA ──
async function handleServiceCreated(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;

  const [sr] = await db.select().from(serviceRequests)
    .where(eq(serviceRequests.id, entityId)).limit(1);
  if (!sr) throw new Error(`Service request ${entityId} not found`);

  // 1. DELEGATE compliance guard
  const guardResult = await runComplianceGuard(sr.businessEntityId || 0);
  logger.info(`Compliance guard for SR ${entityId}: ${guardResult.state}`);

  // 2. DELEGATE task instantiation (existing 3-tier fallback)
  const { taskInstantiationService } = await import('../../task-instantiation-service');
  const result = await taskInstantiationService.instantiateTasks(entityId);

  // 3. SLA calculation is already done inside taskInstantiationService
  // Just emit downstream
  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.SERVICE_PAYMENT_PENDING,
    entityType: 'service_request', entityId,
    payload: { complianceState: guardResult.state, tasksCreated: result.tasksCreated },
  });

  return { complianceState: guardResult.state, ...result };
}

// ── service.payment_pending: Notify client ──
async function handlePaymentPending(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  try {
    const { notificationHub } = await import('../../../notification-engine');
    await notificationHub.emit('payment_pending', { serviceRequestId: entityId });
  } catch (err) {
    logger.warn(`Payment pending notification failed for SR ${entityId}:`, err);
  }
  return { notified: true };
}

// ── service.payment_received: Unlock docs ──
async function handlePaymentReceived(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  const { stateMachine } = await import('../../service-request-state-machine');
  await stateMachine.transitionStatus(entityId, 'PAYMENT_RECEIVED', { triggeredBy: 'pipeline' });
  return { unlocked: true };
}

// ── service.docs_uploaded: Assign reviewer ──
async function handleDocsUploaded(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  logger.info(`Docs uploaded for SR ${entityId} — assigning reviewer`);
  return { reviewAssigned: true };
}

// ── service.docs_verified: Move to IN_PROGRESS ──
async function handleDocsVerified(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  const { stateMachine } = await import('../../service-request-state-machine');
  await stateMachine.transitionStatus(entityId, 'IN_PROGRESS', { triggeredBy: 'pipeline' });
  return { movedToInProgress: true };
}

// ── service.task_completed: Check all done → trigger QC ──
async function handleTaskCompleted(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;

  // DELEGATE to existing progress tracker
  const { taskInstantiationService } = await import('../../task-instantiation-service');
  const progress = await taskInstantiationService.updateOrderProgress(entityId);

  if (progress.allComplete) {
    ctx.emitEvent({
      eventType: PIPELINE_EVENTS.SERVICE_QC_SUBMITTED,
      entityType: 'service_request', entityId,
      payload: { progress: 100 },
    });
  }

  return { progress: progress.progress, allComplete: progress.allComplete };
}

// ── service.qc_submitted: Assign QC reviewer ──
async function handleQcSubmitted(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  // DELEGATE to existing QC workflow
  const { qcWorkflowService } = await import('../../qc-workflow-service');
  const review = await qcWorkflowService.createReview(entityId);
  return { reviewId: review?.id, qcReviewerAssigned: true };
}

// ── service.qc_approved: Prep delivery ──
async function handleQcApproved(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  // QC workflow already fixed (Task 4) to use state machine
  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.SERVICE_DELIVERED,
    entityType: 'service_request', entityId,
    payload: {},
  });
  return { deliveryPrepared: true };
}

// ── service.qc_rejected: Create rework tasks ──
async function handleQcRejected(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  const { stateMachine } = await import('../../service-request-state-machine');
  await stateMachine.transitionStatus(entityId, 'QC_REJECTED', { triggeredBy: 'pipeline' });
  return { reworkTasksCreated: true };
}

// ── service.delivered: Notify client ──
async function handleDelivered(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  try {
    const { notificationHub } = await import('../../../notification-engine');
    await notificationHub.emit('service_delivered', { serviceRequestId: entityId });
  } catch (err) {
    logger.warn(`Delivery notification failed for SR ${entityId}:`, err);
  }
  return { clientNotified: true };
}

// ── service.confirmed: COMPLETE + invoice + compliance ──
async function handleServiceConfirmed(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;

  // 1. DELEGATE status transition
  const { stateMachine } = await import('../../service-request-state-machine');
  await stateMachine.transitionStatus(entityId, 'COMPLETED', { triggeredBy: 'pipeline' });

  // 2. Find the payment linked to this SR (generateInvoiceData takes paymentId)
  const { payments } = await import('@shared/schema');
  const [payment] = await db.select().from(payments)
    .where(eq(payments.serviceRequestId, entityId)).limit(1);

  let invoiceId: number | null = null;
  if (payment) {
    // 3. DELEGATE invoice generation to EXISTING function (takes paymentId, not SR)
    const { generateInvoiceData, persistInvoice } = await import('../../invoice-generator');
    const invoiceData = await generateInvoiceData(payment.id);

    if (invoiceData) {
      // 4. DELEGATE persistence (standalone function added in Task 2)
      invoiceId = await persistInvoice(invoiceData, event.triggeredBy || 0);
    }
  }

  // 5. Emit downstream — ONLY after invoice persists
  if (invoiceId) {
    ctx.emitEvent({
      eventType: PIPELINE_EVENTS.FINANCE_INVOICE_CREATED,
      entityType: 'invoice', entityId: invoiceId,
      payload: { serviceRequestId: entityId },
    });
  }

  // 6. Compliance action — fetch entity once and check initialization guard
  const [sr] = await db.select().from(serviceRequests)
    .where(eq(serviceRequests.id, entityId)).limit(1);

  if (sr?.businessEntityId) {
    const [entity] = await db.select().from(businessEntities)
      .where(eq(businessEntities.id, sr.businessEntityId)).limit(1);

    if (entity?.complianceInitialized) {
      ctx.emitEvent({
        eventType: PIPELINE_EVENTS.COMPLIANCE_ACTION_COMPLETED,
        entityType: 'business_entity', entityId: sr.businessEntityId,
        payload: { serviceRequestId: entityId },
      });
    } else {
      ctx.emitEvent({
        eventType: PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED,
        entityType: 'business_entity', entityId: sr.businessEntityId,
        payload: { triggeredBy: 'service_confirmed' },
      });
    }
  }

  return { completed: true, invoiceId };
}

// ── service.sla_warning: Level 1 escalation ──
async function handleSlaWarning(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  try {
    const { notificationHub } = await import('../../../notification-engine');
    await notificationHub.emit('sla_breach', { serviceRequestId: entityId, level: 1 });
  } catch (err) {
    logger.warn(`SLA warning notification failed for SR ${entityId}:`, err);
  }
  return { escalationLevel: 1 };
}

// ── service.sla_breached: Level 2+3 escalation ──
async function handleSlaBreached(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  const { stateMachine } = await import('../../service-request-state-machine');
  await stateMachine.transitionStatus(entityId, 'SLA_BREACHED', { triggeredBy: 'sla_checker' });
  try {
    const { notificationHub } = await import('../../../notification-engine');
    await notificationHub.emit('sla_breach', { serviceRequestId: entityId, level: 2 });
  } catch (err) {
    logger.warn(`SLA breach notification failed for SR ${entityId}:`, err);
  }
  return { escalationLevel: 2 };
}

// ── service.escalated: Manual decision point — notify only ──
async function handleEscalated(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId, payload } = event;
  logger.warn(`SR ${entityId} escalated: ${(payload as any).reason || 'unknown'}`);
  try {
    const { notificationHub } = await import('../../../notification-engine');
    await notificationHub.emit('service_escalated', { serviceRequestId: entityId });
  } catch (err) {
    logger.warn(`Escalation notification failed for SR ${entityId}:`, err);
  }
  // No downstream events — ops manager resolves manually
  return { manualResolutionRequired: true };
}

// ── service.cancelled: Clawback + cleanup ──
async function handleServiceCancelled(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;

  // 1. DELEGATE status transition
  const { stateMachine } = await import('../../service-request-state-machine');
  await stateMachine.transitionStatus(entityId, 'CANCELLED', { triggeredBy: 'pipeline' });

  // 2. Clear renewal dedup key so future renewals can be created
  await db.update(serviceRequests)
    .set({ renewalDedupKey: null })
    .where(eq(serviceRequests.id, entityId));

  // 3. DELEGATE clawback check to existing commission service
  try {
    const { commissionService } = await import('../../commission-service');
    const { commissions } = await import('@shared/schema');
    // Find commissions linked to this SR
    const srCommissions = await db.select().from(commissions)
      .where(eq(commissions.serviceRequestId, entityId));
    for (const commission of srCommissions) {
      const result = await commissionService.applyClawback(
        commission.agentId,
        parseFloat(commission.baseAmount || '0'),
        `Service request ${entityId} cancelled`
      );
      logger.info(`Clawback for agent ${commission.agentId} (SR ${entityId}): ${result.success ? 'applied' : 'failed'}`);
    }
  } catch (err) {
    logger.warn(`Clawback check failed for SR ${entityId}:`, err);
  }

  return { cancelled: true, clawbackChecked: true };
}

export function registerExecutionHandlers(orchestrator: PipelineOrchestrator): void {
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_CREATED, 'service-setup', handleServiceCreated);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_PAYMENT_PENDING, 'payment-notify', handlePaymentPending);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_PAYMENT_RECEIVED, 'payment-unlock', handlePaymentReceived);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_DOCS_UPLOADED, 'docs-review', handleDocsUploaded);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_DOCS_VERIFIED, 'docs-verified', handleDocsVerified);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_TASK_COMPLETED, 'task-completion-check', handleTaskCompleted);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_QC_SUBMITTED, 'qc-assign', handleQcSubmitted);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_QC_APPROVED, 'delivery-prep', handleQcApproved);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_QC_REJECTED, 'qc-rework', handleQcRejected);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_DELIVERED, 'delivery-notify', handleDelivered);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_CONFIRMED, 'service-completion', handleServiceConfirmed);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_SLA_WARNING, 'sla-warn', handleSlaWarning);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_SLA_BREACHED, 'sla-breach', handleSlaBreached);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_ESCALATED, 'escalation-notify', handleEscalated);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_CANCELLED, 'service-cancel', handleServiceCancelled);
}
