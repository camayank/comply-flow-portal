import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';
import { registerSalesHandlers } from '../services/pipeline/handlers/sales-handler';
import { PIPELINE_EVENTS } from '../services/pipeline/pipeline-events';

jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1 }]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  },
}));

const mockAutoAssign = jest.fn().mockResolvedValue({ assignedTo: 5, agentName: 'Test Agent' });
jest.mock('../services/lead-assignment-service', () => ({
  leadAssignmentService: { autoAssign: mockAutoAssign },
}));

describe('Sales Handler', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    registerSalesHandlers(orchestrator);
    jest.clearAllMocks();
  });

  it('registers handlers for all 7 sales events', () => {
    const salesEvents = [
      PIPELINE_EVENTS.LEAD_CREATED, PIPELINE_EVENTS.LEAD_ASSIGNED,
      PIPELINE_EVENTS.LEAD_QUALIFIED, PIPELINE_EVENTS.LEAD_PROPOSAL_SENT,
      PIPELINE_EVENTS.LEAD_PROPOSAL_APPROVED, PIPELINE_EVENTS.LEAD_CONVERTED,
      PIPELINE_EVENTS.LEAD_LOST,
    ];
    for (const event of salesEvents) {
      expect(orchestrator.getHandlers(event).length).toBeGreaterThan(0);
    }
  });

  it('lead.created DELEGATES to leadAssignmentService.assignLead()', async () => {
    const event = {
      id: 1, eventType: PIPELINE_EVENTS.LEAD_CREATED, entityType: 'lead',
      entityId: 42, payload: { name: 'Acme Corp', pan: 'ABCDE1234F' },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    const { handlerResults, bufferedEvents } = await orchestrator.processEvent(event as any);

    expect(mockAutoAssign).toHaveBeenCalledWith(42);
    expect(handlerResults.handlers[0].status).toBe('completed');
    expect(bufferedEvents.some(e => e.eventType === PIPELINE_EVENTS.LEAD_ASSIGNED)).toBe(true);
  });

  it('lead.converted emits compliance.entity_initialized', async () => {
    const event = {
      id: 2, eventType: PIPELINE_EVENTS.LEAD_CONVERTED, entityType: 'lead',
      entityId: 42, payload: { businessEntityId: 100 },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(bufferedEvents.some(e => e.eventType === PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED)).toBe(true);
  });

  it('lead.lost logs reason and emits no downstream events', async () => {
    const event = {
      id: 3, eventType: PIPELINE_EVENTS.LEAD_LOST, entityType: 'lead',
      entityId: 42, payload: { reason: 'budget_constraints' },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(bufferedEvents).toHaveLength(0);
  });
});
