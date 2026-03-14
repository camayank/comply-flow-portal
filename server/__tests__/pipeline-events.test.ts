import { PIPELINE_EVENTS, PipelineEventType, createPipelineEvent } from '../services/pipeline/pipeline-events';

describe('Pipeline Events', () => {
  it('has all 7 Zone A (Sales) events', () => {
    expect(PIPELINE_EVENTS.LEAD_CREATED).toBe('lead.created');
    expect(PIPELINE_EVENTS.LEAD_ASSIGNED).toBe('lead.assigned');
    expect(PIPELINE_EVENTS.LEAD_QUALIFIED).toBe('lead.qualified');
    expect(PIPELINE_EVENTS.LEAD_PROPOSAL_SENT).toBe('lead.proposal_sent');
    expect(PIPELINE_EVENTS.LEAD_PROPOSAL_APPROVED).toBe('lead.proposal_approved');
    expect(PIPELINE_EVENTS.LEAD_CONVERTED).toBe('lead.converted');
    expect(PIPELINE_EVENTS.LEAD_LOST).toBe('lead.lost');
  });

  it('has all 15 Zone B (Execution) events', () => {
    expect(PIPELINE_EVENTS.SERVICE_CREATED).toBe('service.created');
    expect(PIPELINE_EVENTS.SERVICE_PAYMENT_RECEIVED).toBe('service.payment_received');
    expect(PIPELINE_EVENTS.SERVICE_DOCS_UPLOADED).toBe('service.docs_uploaded');
    expect(PIPELINE_EVENTS.SERVICE_DOCS_VERIFIED).toBe('service.docs_verified');
    expect(PIPELINE_EVENTS.SERVICE_TASK_COMPLETED).toBe('service.task_completed');
    expect(PIPELINE_EVENTS.SERVICE_QC_SUBMITTED).toBe('service.qc_submitted');
    expect(PIPELINE_EVENTS.SERVICE_QC_APPROVED).toBe('service.qc_approved');
    expect(PIPELINE_EVENTS.SERVICE_QC_REJECTED).toBe('service.qc_rejected');
    expect(PIPELINE_EVENTS.SERVICE_DELIVERED).toBe('service.delivered');
    expect(PIPELINE_EVENTS.SERVICE_CONFIRMED).toBe('service.confirmed');
    expect(PIPELINE_EVENTS.SERVICE_PAYMENT_PENDING).toBe('service.payment_pending');
    expect(PIPELINE_EVENTS.SERVICE_SLA_WARNING).toBe('service.sla_warning');
    expect(PIPELINE_EVENTS.SERVICE_SLA_BREACHED).toBe('service.sla_breached');
    expect(PIPELINE_EVENTS.SERVICE_ESCALATED).toBe('service.escalated');
    expect(PIPELINE_EVENTS.SERVICE_CANCELLED).toBe('service.cancelled');
  });

  it('has all 6 Zone C (Financial) events', () => {
    expect(PIPELINE_EVENTS.FINANCE_INVOICE_CREATED).toBe('finance.invoice_created');
    expect(PIPELINE_EVENTS.FINANCE_INVOICE_SENT).toBe('finance.invoice_sent');
    expect(PIPELINE_EVENTS.FINANCE_PAYMENT_RECEIVED).toBe('finance.payment_received');
    expect(PIPELINE_EVENTS.FINANCE_COMMISSION_CALCULATED).toBe('finance.commission_calculated');
    expect(PIPELINE_EVENTS.FINANCE_COMMISSION_APPROVED).toBe('finance.commission_approved');
    expect(PIPELINE_EVENTS.FINANCE_COMMISSION_PAID).toBe('finance.commission_paid');
  });

  it('has all 8 Zone D (Compliance) events', () => {
    expect(PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED).toBe('compliance.entity_initialized');
    expect(PIPELINE_EVENTS.COMPLIANCE_DEADLINE_APPROACHING).toBe('compliance.deadline_approaching');
    expect(PIPELINE_EVENTS.COMPLIANCE_DEADLINE_OVERDUE).toBe('compliance.deadline_overdue');
    expect(PIPELINE_EVENTS.COMPLIANCE_ACTION_COMPLETED).toBe('compliance.action_completed');
    expect(PIPELINE_EVENTS.COMPLIANCE_STATE_CHANGED).toBe('compliance.state_changed');
    expect(PIPELINE_EVENTS.COMPLIANCE_RENEWAL_DUE).toBe('compliance.renewal_due');
    expect(PIPELINE_EVENTS.COMPLIANCE_GAP_DETECTED).toBe('compliance.gap_detected');
    expect(PIPELINE_EVENTS.COMPLIANCE_PORTAL_SYNCED).toBe('compliance.portal_synced');
  });

  it('createPipelineEvent produces valid payload', () => {
    const event = createPipelineEvent({
      eventType: PIPELINE_EVENTS.LEAD_CREATED,
      entityType: 'lead',
      entityId: 42,
      payload: { name: 'Test Lead' },
      triggeredBy: 1,
    });
    expect(event.eventType).toBe('lead.created');
    expect(event.processed).toBe(false);
    expect(event.retryCount).toBe(0);
    expect(event.maxRetries).toBe(3);
  });

  it('total event count is 36 (7 sales + 15 execution + 6 finance + 8 compliance)', () => {
    const allEvents = Object.values(PIPELINE_EVENTS);
    expect(allEvents.length).toBe(36);
    expect(new Set(allEvents).size).toBe(36);
  });
});
