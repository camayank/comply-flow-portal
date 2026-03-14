import type { NewPipelineEvent } from '@shared/pipeline-schema';

export const PIPELINE_EVENTS = {
  // Zone A: Sales (7)
  LEAD_CREATED: 'lead.created',
  LEAD_ASSIGNED: 'lead.assigned',
  LEAD_QUALIFIED: 'lead.qualified',
  LEAD_PROPOSAL_SENT: 'lead.proposal_sent',
  LEAD_PROPOSAL_APPROVED: 'lead.proposal_approved',
  LEAD_CONVERTED: 'lead.converted',
  LEAD_LOST: 'lead.lost',

  // Zone B: Execution (15)
  SERVICE_CREATED: 'service.created',
  SERVICE_PAYMENT_RECEIVED: 'service.payment_received',
  SERVICE_DOCS_UPLOADED: 'service.docs_uploaded',
  SERVICE_DOCS_VERIFIED: 'service.docs_verified',
  SERVICE_TASK_COMPLETED: 'service.task_completed',
  SERVICE_QC_SUBMITTED: 'service.qc_submitted',
  SERVICE_QC_APPROVED: 'service.qc_approved',
  SERVICE_QC_REJECTED: 'service.qc_rejected',
  SERVICE_DELIVERED: 'service.delivered',
  SERVICE_CONFIRMED: 'service.confirmed',
  SERVICE_PAYMENT_PENDING: 'service.payment_pending',
  SERVICE_SLA_WARNING: 'service.sla_warning',
  SERVICE_SLA_BREACHED: 'service.sla_breached',
  SERVICE_ESCALATED: 'service.escalated',
  SERVICE_CANCELLED: 'service.cancelled',

  // Zone C: Financial (6)
  FINANCE_INVOICE_CREATED: 'finance.invoice_created',
  FINANCE_INVOICE_SENT: 'finance.invoice_sent',
  FINANCE_PAYMENT_RECEIVED: 'finance.payment_received',
  FINANCE_COMMISSION_CALCULATED: 'finance.commission_calculated',
  FINANCE_COMMISSION_APPROVED: 'finance.commission_approved',
  FINANCE_COMMISSION_PAID: 'finance.commission_paid',

  // Zone D: Compliance (8)
  COMPLIANCE_ENTITY_INITIALIZED: 'compliance.entity_initialized',
  COMPLIANCE_DEADLINE_APPROACHING: 'compliance.deadline_approaching',
  COMPLIANCE_DEADLINE_OVERDUE: 'compliance.deadline_overdue',
  COMPLIANCE_ACTION_COMPLETED: 'compliance.action_completed',
  COMPLIANCE_STATE_CHANGED: 'compliance.state_changed',
  COMPLIANCE_RENEWAL_DUE: 'compliance.renewal_due',
  COMPLIANCE_GAP_DETECTED: 'compliance.gap_detected',
  COMPLIANCE_PORTAL_SYNCED: 'compliance.portal_synced',
} as const;

export type PipelineEventType = typeof PIPELINE_EVENTS[keyof typeof PIPELINE_EVENTS];

export interface HandlerResult {
  name: string;
  status: 'completed' | 'failed' | 'skipped';
  completedAt?: string;
  attemptedAt?: string;
  output?: Record<string, unknown>;
  error?: string;
}

export interface HandlerResults {
  handlers: HandlerResult[];
}

export function createPipelineEvent(params: {
  eventType: PipelineEventType;
  entityType: string;
  entityId: number;
  payload: Record<string, unknown>;
  triggeredBy?: number;
  previousState?: string;
  newState?: string;
}): NewPipelineEvent {
  return {
    eventType: params.eventType,
    entityType: params.entityType,
    entityId: params.entityId,
    payload: params.payload,
    triggeredBy: params.triggeredBy ?? null,
    previousState: params.previousState ?? null,
    newState: params.newState ?? null,
    processed: false,
    retryCount: 0,
    maxRetries: 3,
  };
}
