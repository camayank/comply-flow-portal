import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';

jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  },
}));

describe('PipelineOrchestrator', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
  });

  describe('registerHandler', () => {
    it('registers a handler for an event type', () => {
      orchestrator.registerHandler('lead.created', 'test-handler', jest.fn());
      expect(orchestrator.getHandlers('lead.created')).toHaveLength(1);
    });

    it('preserves registration order', () => {
      orchestrator.registerHandler('lead.created', 'first', jest.fn());
      orchestrator.registerHandler('lead.created', 'second', jest.fn());
      const handlers = orchestrator.getHandlers('lead.created');
      expect(handlers[0].name).toBe('first');
      expect(handlers[1].name).toBe('second');
    });
  });

  describe('processEvent', () => {
    it('runs handlers sequentially and collects results', async () => {
      const order: string[] = [];
      orchestrator.registerHandler('lead.created', 'h1', async () => {
        order.push('h1');
        return { step: 1 };
      });
      orchestrator.registerHandler('lead.created', 'h2', async () => {
        order.push('h2');
        return { step: 2 };
      });

      const event = {
        id: 1, eventType: 'lead.created', entityType: 'lead',
        entityId: 42, payload: {}, handlerResults: null,
        retryCount: 0, maxRetries: 3, triggeredBy: 1,
      };

      const { handlerResults } = await orchestrator.processEvent(event as any);
      expect(order).toEqual(['h1', 'h2']);
      expect(handlerResults.handlers).toHaveLength(2);
      expect(handlerResults.handlers[0].status).toBe('completed');
      expect(handlerResults.handlers[1].status).toBe('completed');
    });

    it('halts chain on failure — h3 never runs', async () => {
      const order: string[] = [];
      orchestrator.registerHandler('e', 'h1', async () => { order.push('h1'); return {}; });
      orchestrator.registerHandler('e', 'h2', async () => { throw new Error('boom'); });
      orchestrator.registerHandler('e', 'h3', async () => { order.push('h3'); return {}; });

      const event = { id: 1, eventType: 'e', entityType: 't', entityId: 1, payload: {}, handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1 };
      await expect(orchestrator.processEvent(event as any)).rejects.toThrow('boom');
      expect(order).toEqual(['h1']);
    });

    it('skips completed handlers on retry', async () => {
      const order: string[] = [];
      orchestrator.registerHandler('e', 'h1', async () => { order.push('h1'); return {}; });
      orchestrator.registerHandler('e', 'h2', async () => { order.push('h2'); return {}; });

      const event = {
        id: 1, eventType: 'e', entityType: 't', entityId: 1, payload: {},
        handlerResults: { handlers: [{ name: 'h1', status: 'completed', completedAt: new Date().toISOString(), output: {} }] },
        retryCount: 1, maxRetries: 3, triggeredBy: 1,
      };

      await orchestrator.processEvent(event as any);
      expect(order).toEqual(['h2']);
    });

    it('discards buffered events on failure', async () => {
      orchestrator.registerHandler('e', 'h1', async (_e, ctx) => {
        ctx.emitEvent({ eventType: 'lead.assigned' as any, entityType: 'lead', entityId: 1, payload: {} });
        return {};
      });
      orchestrator.registerHandler('e', 'h2', async () => { throw new Error('fail'); });

      const event = { id: 1, eventType: 'e', entityType: 't', entityId: 1, payload: {}, handlerResults: null, retryCount: 0, maxRetries: 3, triggeredBy: 1 };
      await expect(orchestrator.processEvent(event as any)).rejects.toThrow();
      expect(orchestrator.getBufferedEvents()).toHaveLength(0);
    });
  });

  describe('event buffering', () => {
    it('buffers and flushes events', () => {
      orchestrator.bufferEvent({ eventType: 'service.created', entityType: 'sr', entityId: 10, payload: {} });
      expect(orchestrator.getBufferedEvents()).toHaveLength(1);
      const flushed = orchestrator.flushBufferedEvents();
      expect(flushed).toHaveLength(1);
      expect(orchestrator.getBufferedEvents()).toHaveLength(0);
    });
  });
});
