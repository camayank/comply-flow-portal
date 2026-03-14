import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';
import { registerExecutionHandlers } from '../services/pipeline/handlers/execution-handler';
import { PIPELINE_EVENTS } from '../services/pipeline/pipeline-events';
import { runComplianceGuard } from '../services/pipeline/guards/compliance-guard';

jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([{
      id: 1, businessEntityId: 1, complianceInitialized: true,
      status: 'IN_PROGRESS', amount: 5000, serviceType: 'GST_RETURN',
    }]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1 }]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  },
}));

jest.mock('../services/pipeline/guards/compliance-guard', () => ({
  runComplianceGuard: jest.fn().mockResolvedValue({
    state: 'GREEN', metadata: {}, overdueRecords: [],
  }),
}));

jest.mock('../services/task-instantiation-service', () => ({
  taskInstantiationService: {
    instantiateTasks: jest.fn().mockResolvedValue({ tasksCreated: 4 }),
    updateOrderProgress: jest.fn().mockResolvedValue({ allComplete: true, progress: 100 }),
  },
}));

jest.mock('../services/service-request-state-machine', () => ({
  stateMachine: { transitionStatus: jest.fn().mockResolvedValue({ success: true }) },
}));

jest.mock('../services/invoice-generator', () => ({
  generateInvoiceData: jest.fn().mockResolvedValue({
    invoiceNumber: 'INV-2026-000001',
    subtotal: 5000, cgst: 450, sgst: 450, igst: 0, total: 5900,
    lineItems: [], service: { id: 1 }, client: { companyName: 'TestCo' },
    dueDate: new Date(),
  }),
  persistInvoice: jest.fn().mockResolvedValue(1),
}));

// Import mocked modules to access the jest.fn() instances
const { taskInstantiationService } = jest.requireMock('../services/task-instantiation-service');
const { stateMachine } = jest.requireMock('../services/service-request-state-machine');
const { generateInvoiceData, persistInvoice } = jest.requireMock('../services/invoice-generator');

describe('Execution Handler', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    registerExecutionHandlers(orchestrator);
    jest.clearAllMocks();
  });

  it('registers handlers for all 15 execution events', () => {
    const events = [
      PIPELINE_EVENTS.SERVICE_CREATED, PIPELINE_EVENTS.SERVICE_PAYMENT_RECEIVED,
      PIPELINE_EVENTS.SERVICE_PAYMENT_PENDING, PIPELINE_EVENTS.SERVICE_DOCS_UPLOADED,
      PIPELINE_EVENTS.SERVICE_DOCS_VERIFIED, PIPELINE_EVENTS.SERVICE_TASK_COMPLETED,
      PIPELINE_EVENTS.SERVICE_QC_SUBMITTED, PIPELINE_EVENTS.SERVICE_QC_APPROVED,
      PIPELINE_EVENTS.SERVICE_QC_REJECTED, PIPELINE_EVENTS.SERVICE_DELIVERED,
      PIPELINE_EVENTS.SERVICE_CONFIRMED, PIPELINE_EVENTS.SERVICE_SLA_WARNING,
      PIPELINE_EVENTS.SERVICE_SLA_BREACHED, PIPELINE_EVENTS.SERVICE_ESCALATED,
      PIPELINE_EVENTS.SERVICE_CANCELLED,
    ];
    for (const event of events) {
      expect(orchestrator.getHandlers(event).length).toBeGreaterThan(0);
    }
  });

  it('service.created DELEGATES to complianceGuard + taskInstantiationService', async () => {
    const event = {
      id: 1, eventType: PIPELINE_EVENTS.SERVICE_CREATED,
      entityType: 'service_request', entityId: 1,
      payload: { serviceCode: 'GST_RETURN' },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    await orchestrator.processEvent(event as any);

    expect(runComplianceGuard).toHaveBeenCalledWith(1); // businessEntityId
    expect(taskInstantiationService.instantiateTasks).toHaveBeenCalledWith(1);   // serviceRequestId
  });

  it('service.task_completed DELEGATES to updateOrderProgress', async () => {
    const event = {
      id: 2, eventType: PIPELINE_EVENTS.SERVICE_TASK_COMPLETED,
      entityType: 'service_request', entityId: 1,
      payload: { taskId: 5 },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(taskInstantiationService.updateOrderProgress).toHaveBeenCalledWith(1);
    // allComplete=true → should emit service.qc_submitted
    expect(bufferedEvents.some((e: any) => e.eventType === PIPELINE_EVENTS.SERVICE_QC_SUBMITTED)).toBe(true);
  });

  it('service.confirmed DELEGATES to invoiceGenerator for persistence', async () => {
    const event = {
      id: 3, eventType: PIPELINE_EVENTS.SERVICE_CONFIRMED,
      entityType: 'service_request', entityId: 1,
      payload: {},
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);

    expect(stateMachine.transitionStatus).toHaveBeenCalledWith(1, 'COMPLETED', expect.any(Object));
    expect(generateInvoiceData).toHaveBeenCalled();
    expect(persistInvoice).toHaveBeenCalled();
    expect(bufferedEvents.some((e: any) => e.eventType === PIPELINE_EVENTS.FINANCE_INVOICE_CREATED)).toBe(true);
  });

  it('service.escalated is a manual decision point — no auto-action', async () => {
    const event = {
      id: 4, eventType: PIPELINE_EVENTS.SERVICE_ESCALATED,
      entityType: 'service_request', entityId: 1,
      payload: { reason: 'no_available_specialist' },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(bufferedEvents).toHaveLength(0); // No downstream events
  });
});
