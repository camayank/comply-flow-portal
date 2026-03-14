import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';
import { registerSalesHandlers } from '../services/pipeline/handlers/sales-handler';
import { registerExecutionHandlers } from '../services/pipeline/handlers/execution-handler';
import { registerFinanceHandlers } from '../services/pipeline/handlers/finance-handler';
import { registerComplianceHandlers } from '../services/pipeline/handlers/compliance-handler';
import { PIPELINE_EVENTS } from '../services/pipeline/pipeline-events';

jest.mock('../db', () => ({ db: {
  select: jest.fn().mockReturnThis(), from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(), leftJoin: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([{
    id: 1, businessEntityId: 1, complianceInitialized: true,
    status: 'IN_PROGRESS', amount: 5000, serviceType: 'GST_RETURN', assignedAgentId: 10,
    baseAmount: '5000', agentId: 10, serviceRequestId: 1,
  }]),
  insert: jest.fn().mockReturnThis(), values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([{ id: 1 }]),
  update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(),
}}));

jest.mock('../services/lead-assignment-service', () => ({
  leadAssignmentService: { autoAssign: jest.fn().mockResolvedValue({ assignedTo: 5 }) },
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
    invoiceNumber: 'INV-2026-000001', subtotal: 5000, cgst: 450, sgst: 450, igst: 0, total: 5900,
    lineItems: [], service: { id: 1 }, client: { companyName: 'TestCo' }, dueDate: new Date(),
  }),
  persistInvoice: jest.fn().mockResolvedValue(1),
}));
jest.mock('../services/commission-service', () => ({
  commissionService: {
    calculateCommission: jest.fn().mockResolvedValue({ commissionId: 1, amount: 500, agentId: 10 }),
    applyClawback: jest.fn().mockResolvedValue({ success: false, deductionAmount: 0 }),
  },
}));
jest.mock('../services/wallet-service', () => ({
  walletService: { credit: jest.fn().mockResolvedValue({ success: true }) },
}));
jest.mock('../compliance-state-engine', () => ({
  stateEngine: { calculateEntityState: jest.fn().mockResolvedValue({ overallState: 'GREEN', riskScore: 10 }) },
}));
jest.mock('../compliance-event-emitter', () => ({
  complianceEventEmitter: { recalculate: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../services/pipeline/guards/compliance-guard', () => ({
  runComplianceGuard: jest.fn().mockResolvedValue({ state: 'GREEN', metadata: {}, overdueRecords: [] }),
}));
jest.mock('../services/qc-workflow-service', () => ({
  qcWorkflowService: { createReview: jest.fn().mockResolvedValue({ id: 1 }) },
}));
jest.mock('../services/notifications/notification-hub', () => ({
  notificationHub: { send: jest.fn().mockResolvedValue({ success: true }) },
}));

describe('Pipeline Integration', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    registerSalesHandlers(orchestrator);
    registerExecutionHandlers(orchestrator);
    registerFinanceHandlers(orchestrator);
    registerComplianceHandlers(orchestrator);
    jest.clearAllMocks();
  });

  it('all 36 events have at least one handler', () => {
    for (const eventType of Object.values(PIPELINE_EVENTS)) {
      expect(orchestrator.getHandlers(eventType).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('lead.created cascades: lead.created → lead.assigned', async () => {
    const event = {
      id: 1, eventType: PIPELINE_EVENTS.LEAD_CREATED, entityType: 'lead',
      entityId: 1, payload: { name: 'Test', pan: 'ABCDE1234F' },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };
    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(bufferedEvents[0].eventType).toBe(PIPELINE_EVENTS.LEAD_ASSIGNED);
  });

  it('service.confirmed cascades: COMPLETED → invoice → finance.invoice_created', async () => {
    const event = {
      id: 2, eventType: PIPELINE_EVENTS.SERVICE_CONFIRMED, entityType: 'service_request',
      entityId: 1, payload: {}, handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };
    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    const types = bufferedEvents.map(e => e.eventType);
    expect(types).toContain(PIPELINE_EVENTS.FINANCE_INVOICE_CREATED);
  });

  it('handler failure halts chain and discards buffered events', async () => {
    const failOrch = new PipelineOrchestrator();
    failOrch.registerHandler('test.event', 'h1', async (_, ctx) => {
      ctx.emitEvent({ eventType: PIPELINE_EVENTS.LEAD_ASSIGNED as any, entityType: 'lead', entityId: 1, payload: {} });
      return {};
    });
    failOrch.registerHandler('test.event', 'h2', async () => { throw new Error('boom'); });

    const event = { id: 99, eventType: 'test.event', entityType: 'test', entityId: 1, payload: {}, handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1 };
    await expect(failOrch.processEvent(event as any)).rejects.toThrow('boom');
    expect(failOrch.getBufferedEvents()).toHaveLength(0);
  });

  it('retry skips completed handlers', async () => {
    const log: string[] = [];
    const retryOrch = new PipelineOrchestrator();
    retryOrch.registerHandler('test.retry', 'h1', async () => { log.push('h1'); return {}; });
    retryOrch.registerHandler('test.retry', 'h2', async () => { log.push('h2'); return {}; });

    const event = {
      id: 100, eventType: 'test.retry', entityType: 'test', entityId: 1, payload: {},
      handlerResults: { handlers: [{ name: 'h1', status: 'completed', completedAt: new Date().toISOString(), output: {} }] },
      retryCount: 1, maxRetries: 3, triggeredBy: 1,
    };
    await retryOrch.processEvent(event as any);
    expect(log).toEqual(['h2']);
  });

  it('sequential handler order is preserved', async () => {
    const order: number[] = [];
    const seqOrch = new PipelineOrchestrator();
    seqOrch.registerHandler('test.order', 'first', async () => {
      await new Promise(r => setTimeout(r, 10));
      order.push(1);
      return {};
    });
    seqOrch.registerHandler('test.order', 'second', async () => { order.push(2); return {}; });

    const event = { id: 101, eventType: 'test.order', entityType: 'test', entityId: 1, payload: {}, handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1 };
    await seqOrch.processEvent(event as any);
    expect(order).toEqual([1, 2]);
  });
});
