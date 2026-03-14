import { pipelineEvents, invoices, pipelineAutomationConfig, approvalRequests } from '@shared/pipeline-schema';
import { getTableName } from 'drizzle-orm';

describe('Pipeline Schema', () => {
  it('pipelineEvents table has correct name and columns', () => {
    expect(getTableName(pipelineEvents)).toBe('pipeline_events');
    expect(pipelineEvents.eventType).toBeDefined();
    expect(pipelineEvents.entityType).toBeDefined();
    expect(pipelineEvents.entityId).toBeDefined();
    expect(pipelineEvents.payload).toBeDefined();
    expect(pipelineEvents.processed).toBeDefined();
    expect(pipelineEvents.handlerResults).toBeDefined();
    expect(pipelineEvents.retryCount).toBeDefined();
  });

  it('invoices has GST and unique serviceRequestId', () => {
    expect(invoices.cgstAmount).toBeDefined();
    expect(invoices.sgstAmount).toBeDefined();
    expect(invoices.igstAmount).toBeDefined();
    expect(invoices.serviceRequestId).toBeDefined();
  });

  it('pipelineAutomationConfig has service+event unique constraint', () => {
    expect(pipelineAutomationConfig.serviceCode).toBeDefined();
    expect(pipelineAutomationConfig.eventType).toBeDefined();
    expect(pipelineAutomationConfig.automationLevel).toBeDefined();
  });

  it('approvalRequests has expiry and escalation', () => {
    expect(approvalRequests.expiresAt).toBeDefined();
    expect(approvalRequests.escalated).toBeDefined();
    expect(approvalRequests.pipelineEventId).toBeDefined();
  });
});
