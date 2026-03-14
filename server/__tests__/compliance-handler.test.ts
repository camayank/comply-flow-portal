import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';
import { registerComplianceHandlers } from '../services/pipeline/handlers/compliance-handler';
import { PIPELINE_EVENTS } from '../services/pipeline/pipeline-events';

jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([{ id: 1, complianceInitialized: false }]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1 }]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  },
}));

const mockCalculateEntityState = jest.fn().mockResolvedValue({ overallState: 'GREEN', riskScore: 10 });
jest.mock('../compliance-state-engine', () => ({
  stateEngine: { calculateEntityState: mockCalculateEntityState },
}));

const mockRecalculate = jest.fn().mockResolvedValue(undefined);
jest.mock('../compliance-event-emitter', () => ({
  complianceEventEmitter: { recalculate: mockRecalculate },
}));

describe('Compliance Handler', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    registerComplianceHandlers(orchestrator);
    jest.clearAllMocks();
  });

  it('registers handlers for all 8 compliance events', () => {
    const events = [
      PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED,
      PIPELINE_EVENTS.COMPLIANCE_DEADLINE_APPROACHING,
      PIPELINE_EVENTS.COMPLIANCE_DEADLINE_OVERDUE,
      PIPELINE_EVENTS.COMPLIANCE_ACTION_COMPLETED,
      PIPELINE_EVENTS.COMPLIANCE_STATE_CHANGED,
      PIPELINE_EVENTS.COMPLIANCE_RENEWAL_DUE,
      PIPELINE_EVENTS.COMPLIANCE_GAP_DETECTED,
      PIPELINE_EVENTS.COMPLIANCE_PORTAL_SYNCED,
    ];
    for (const event of events) {
      expect(orchestrator.getHandlers(event).length).toBeGreaterThan(0);
    }
  });

  it('compliance.entity_initialized DELEGATES to stateEngine', async () => {
    const event = {
      id: 1, eventType: PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED,
      entityType: 'business_entity', entityId: 1,
      payload: { triggeredBy: 'lead_conversion' },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(mockCalculateEntityState).toHaveBeenCalledWith(1);
    expect(bufferedEvents.some(e => e.eventType === PIPELINE_EVENTS.COMPLIANCE_STATE_CHANGED)).toBe(true);
  });

  it('compliance.action_completed DELEGATES to complianceEventEmitter', async () => {
    const event = {
      id: 2, eventType: PIPELINE_EVENTS.COMPLIANCE_ACTION_COMPLETED,
      entityType: 'business_entity', entityId: 1,
      payload: { serviceRequestId: 10 },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    await orchestrator.processEvent(event as any);
    expect(mockRecalculate).toHaveBeenCalledWith(1);
  });

  it('compliance.renewal_due checks dedup before creating SR', async () => {
    const db = require('../db').db;
    // Mock: no existing service request with same dedup key
    db.limit.mockResolvedValueOnce([]); // dedup check returns empty

    const event = {
      id: 3, eventType: PIPELINE_EVENTS.COMPLIANCE_RENEWAL_DUE,
      entityType: 'business_entity', entityId: 1,
      payload: {
        serviceCode: 'GST_RETURN', businessEntityId: 1,
        fiscalYear: '2025-26', period: 'M03',
        renewalDueDate: '2026-03-31',
      },
      handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(bufferedEvents.some(e => e.eventType === PIPELINE_EVENTS.SERVICE_CREATED)).toBe(true);
  });
});
