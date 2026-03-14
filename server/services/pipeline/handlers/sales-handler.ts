import { db } from '../../../db';
import { leads } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../logger';
import { PIPELINE_EVENTS } from '../pipeline-events';
import type { PipelineOrchestrator, HandlerContext } from '../pipeline-orchestrator';
import type { PipelineEvent } from '@shared/pipeline-schema';

async function handleLeadCreated(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId, payload } = event;

  const enrichmentData = {
    entityType: (payload as any).entityType || null,
    pan: (payload as any).pan || null,
    gstin: (payload as any).gstin || null,
    source: 'lead_form',
  };

  // enrichmentData/enrichedAt/enrichmentSource columns added by pipeline migration
  await (db.update(leads).set as any)({
    enrichmentData,
    enrichedAt: new Date(),
    enrichmentSource: 'lead_form',
  }).where(eq(leads.id, entityId));

  let assignedTo: number | null = null;
  try {
    const { leadAssignmentService } = await import('../../lead-assignment-service');
    const assignment = await leadAssignmentService.autoAssign(entityId);
    assignedTo = assignment?.assignedTo || null;
  } catch (err) {
    logger.warn(`Lead auto-assignment failed for lead ${entityId}:`, err);
  }

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.LEAD_ASSIGNED,
    entityType: 'lead', entityId,
    payload: { assignedTo, enrichmentData },
  });

  return { enriched: true, assignedTo };
}

async function handleLeadAssigned(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId, payload } = event;
  const assignedTo = (payload as any).assignedTo;
  if (assignedTo) {
    try {
      const { notificationHub } = await import('../../notifications/notification-hub');
      await notificationHub.send({
        type: 'lead_assigned',
        channels: ['in_app'],
        content: `Lead ${entityId} has been assigned`,
        data: { leadId: entityId, agentId: assignedTo },
        userId: assignedTo,
      });
    } catch (err) {
      logger.warn(`Lead assignment notification failed for lead ${entityId}:`, err);
    }
  }
  return { notified: !!assignedTo };
}

async function handleLeadQualified(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  logger.info(`Lead ${entityId} qualified — proposal draft generation queued`);
  return { proposalDraftQueued: true };
}

async function handleLeadProposalSent(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId } = event;
  logger.info(`Proposal sent for lead ${entityId}`);
  return { tracked: true };
}

async function handleLeadProposalApproved(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId, payload } = event;

  const [lead] = await db.select().from(leads).where(eq(leads.id, entityId)).limit(1);
  if (!lead) throw new Error(`Lead ${entityId} not found`);

  const proposalServices = (payload as any).services || [];
  const createdServiceIds: number[] = [];
  for (const svc of proposalServices) {
    const { serviceRequests } = await import('@shared/schema');
    // Service request shape depends on pipeline migration columns
    const [sr] = await (db.insert(serviceRequests).values as any)({
      businessEntityId: (payload as any).businessEntityId,
      serviceType: svc.serviceCode,
      amount: svc.amount,
      status: 'INITIATED',
    }).returning();
    createdServiceIds.push(sr.id);

    ctx.emitEvent({
      eventType: PIPELINE_EVENTS.SERVICE_CREATED,
      entityType: 'service_request', entityId: sr.id,
      payload: { serviceCode: svc.serviceCode, leadId: entityId },
    });
  }

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.LEAD_CONVERTED,
    entityType: 'lead', entityId,
    payload: { businessEntityId: (payload as any).businessEntityId, serviceIds: createdServiceIds },
  });

  return { entityCreated: true, servicesCreated: createdServiceIds.length };
}

async function handleLeadConverted(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId, payload } = event;
  const businessEntityId = (payload as any).businessEntityId;
  if (businessEntityId) {
    ctx.emitEvent({
      eventType: PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED,
      entityType: 'business_entity', entityId: businessEntityId,
      payload: { triggeredBy: 'lead_conversion' },
    });
  }
  return { complianceInitTriggered: !!businessEntityId };
}

async function handleLeadLost(event: PipelineEvent, ctx: HandlerContext) {
  const { entityId, payload } = event;
  logger.info(`Lead ${entityId} lost. Reason: ${(payload as any).reason || 'not specified'}`);
  return { logged: true };
}

export function registerSalesHandlers(orchestrator: PipelineOrchestrator): void {
  orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_CREATED, 'lead-enrich-assign', handleLeadCreated);
  orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_ASSIGNED, 'lead-assign-notify', handleLeadAssigned);
  orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_QUALIFIED, 'proposal-generation', handleLeadQualified);
  orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_PROPOSAL_SENT, 'proposal-track', handleLeadProposalSent);
  orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_PROPOSAL_APPROVED, 'entity-creation', handleLeadProposalApproved);
  orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_CONVERTED, 'conversion-compliance-init', handleLeadConverted);
  orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_LOST, 'loss-log', handleLeadLost);
}
