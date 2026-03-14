import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';
import { registerFinanceHandlers } from '../services/pipeline/handlers/finance-handler';
import { PIPELINE_EVENTS } from '../services/pipeline/pipeline-events';

jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([{ id: 1, serviceRequestId: 10, status: 'draft' }]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  },
}));

const mockCalculateCommission = jest.fn().mockResolvedValue({ commissionId: 1, amount: 500 });
jest.mock('../services/commission-service', () => ({
  commissionService: { calculateCommission: mockCalculateCommission },
}));

const mockWalletCredit = jest.fn().mockResolvedValue({ success: true, transactionId: 1 });
jest.mock('../services/wallet-service', () => ({
  walletService: { credit: mockWalletCredit },
}));

describe('Finance Handler', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    registerFinanceHandlers(orchestrator);
    jest.clearAllMocks();
  });

  it('registers handlers for all 6 finance events', () => {
    const events = [
      PIPELINE_EVENTS.FINANCE_INVOICE_CREATED, PIPELINE_EVENTS.FINANCE_INVOICE_SENT,
      PIPELINE_EVENTS.FINANCE_PAYMENT_RECEIVED, PIPELINE_EVENTS.FINANCE_COMMISSION_CALCULATED,
      PIPELINE_EVENTS.FINANCE_COMMISSION_APPROVED, PIPELINE_EVENTS.FINANCE_COMMISSION_PAID,
    ];
    for (const event of events) {
      expect(orchestrator.getHandlers(event).length).toBeGreaterThan(0);
    }
  });

  it('finance.payment_received DELEGATES to commissionService.calculateCommission()', async () => {
    const event = {
      id: 1, eventType: PIPELINE_EVENTS.FINANCE_PAYMENT_RECEIVED,
      entityType: 'invoice', entityId: 1,
      payload: { serviceRequestId: 10, paymentId: 5, amount: 5000 },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(mockCalculateCommission).toHaveBeenCalledWith(10, 5000);
    expect(bufferedEvents.some(e => e.eventType === PIPELINE_EVENTS.FINANCE_COMMISSION_CALCULATED)).toBe(true);
  });

  it('finance.commission_approved DELEGATES to walletService.credit()', async () => {
    const event = {
      id: 2, eventType: PIPELINE_EVENTS.FINANCE_COMMISSION_APPROVED,
      entityType: 'commission', entityId: 1,
      payload: { agentId: 10, amount: 500, commissionId: 1 },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(mockWalletCredit).toHaveBeenCalledWith(10, 500, expect.any(String), 'commission', 'commission', 1);
    expect(bufferedEvents.some(e => e.eventType === PIPELINE_EVENTS.FINANCE_COMMISSION_PAID)).toBe(true);
  });
});
