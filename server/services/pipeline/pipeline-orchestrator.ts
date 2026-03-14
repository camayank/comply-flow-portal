import { db } from '../../db';
import { pipelineEvents, pipelineAutomationConfig, approvalRequests } from '@shared/pipeline-schema';
import { eq, and, asc } from 'drizzle-orm';
import { logger } from '../../logger';
import type { PipelineEvent, NewPipelineEvent } from '@shared/pipeline-schema';
import type { PipelineEventType, HandlerResults, HandlerResult } from './pipeline-events';
import { createPipelineEvent } from './pipeline-events';

type HandlerFn = (event: PipelineEvent, context: HandlerContext) => Promise<Record<string, unknown>>;

interface RegisteredHandler {
  name: string;
  fn: HandlerFn;
}

export interface HandlerContext {
  emitEvent: (params: {
    eventType: PipelineEventType;
    entityType: string;
    entityId: number;
    payload: Record<string, unknown>;
    previousState?: string;
    newState?: string;
  }) => void;
}

export class PipelineOrchestrator {
  private handlers: Map<string, RegisteredHandler[]> = new Map();
  private bufferedEvents: Partial<NewPipelineEvent>[] = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  registerHandler(eventType: string, name: string, fn: HandlerFn): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push({ name, fn });
    this.handlers.set(eventType, existing);
  }

  getHandlers(eventType: string): RegisteredHandler[] {
    return this.handlers.get(eventType) || [];
  }

  bufferEvent(params: Partial<NewPipelineEvent>): void {
    this.bufferedEvents.push(params);
  }

  getBufferedEvents(): Partial<NewPipelineEvent>[] {
    return [...this.bufferedEvents];
  }

  flushBufferedEvents(): Partial<NewPipelineEvent>[] {
    const events = [...this.bufferedEvents];
    this.bufferedEvents = [];
    return events;
  }

  async processEvent(event: PipelineEvent): Promise<{
    handlerResults: HandlerResults;
    bufferedEvents: Partial<NewPipelineEvent>[];
  }> {
    const registeredHandlers = this.getHandlers(event.eventType);
    const previousResults: HandlerResult[] =
      (event.handlerResults as HandlerResults)?.handlers || [];
    const completedNames = new Set(
      previousResults.filter((r) => r.status === 'completed').map((r) => r.name)
    );

    const allResults: HandlerResult[] = [
      ...previousResults.filter((r) => r.status === 'completed'),
    ];

    this.bufferedEvents = [];

    const context: HandlerContext = {
      emitEvent: (params) => {
        this.bufferEvent(
          createPipelineEvent({
            ...params,
            triggeredBy: event.triggeredBy ?? undefined,
          })
        );
      },
    };

    for (const handler of registeredHandlers) {
      if (completedNames.has(handler.name)) continue;

      try {
        const output = await handler.fn(event, context);
        allResults.push({
          name: handler.name,
          status: 'completed',
          completedAt: new Date().toISOString(),
          output: output || {},
        });
      } catch (error) {
        allResults.push({
          name: handler.name,
          status: 'failed',
          attemptedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        });
        this.bufferedEvents = [];
        throw error;
      }
    }

    return {
      handlerResults: { handlers: allResults },
      bufferedEvents: this.flushBufferedEvents(),
    };
  }

  async pollAndProcess(): Promise<number> {
    return await db.transaction(async (tx) => {
      return await this._processWithinTransaction(tx);
    });
  }

  // @ts-ignore — tx type mismatch with PgTransaction vs NodePgDatabase
  private async _processWithinTransaction(tx: any): Promise<number> {
    const unprocessedEvents = await tx
      .select()
      .from(pipelineEvents)
      .where(and(eq(pipelineEvents.processed, false)))
      .orderBy(asc(pipelineEvents.createdAt))
      .limit(10)
      .for('update', { skipLocked: true });

    let processedCount = 0;

    for (const event of unprocessedEvents) {
      if ((event.retryCount ?? 0) >= (event.maxRetries ?? 3)) {
        await tx.update(pipelineEvents).set({
          processed: true,
          processedAt: new Date(),
          error: `Max retries (${event.maxRetries}) exceeded. Dead lettered.`,
        }).where(eq(pipelineEvents.id, event.id));
        logger.error(`Pipeline event ${event.id} dead lettered after ${event.maxRetries} retries`);
        continue;
      }

      const eventServiceCode = (event.payload as any)?.serviceCode || '*';
      let [config] = await tx.select().from(pipelineAutomationConfig)
        .where(and(
          eq(pipelineAutomationConfig.serviceCode, eventServiceCode),
          eq(pipelineAutomationConfig.eventType, event.eventType),
          eq(pipelineAutomationConfig.isActive, true),
        )).limit(1);

      if (!config && eventServiceCode !== '*') {
        [config] = await tx.select().from(pipelineAutomationConfig)
          .where(and(
            eq(pipelineAutomationConfig.serviceCode, '*'),
            eq(pipelineAutomationConfig.eventType, event.eventType),
            eq(pipelineAutomationConfig.isActive, true),
          )).limit(1);
      }

      const automationLevel = config?.automationLevel ?? 'AUTO';

      if (automationLevel === 'GATED') {
        const [existingApproval] = await tx.select().from(approvalRequests)
          .where(eq(approvalRequests.pipelineEventId, event.id)).limit(1);

        if (!existingApproval) {
          await tx.insert(approvalRequests).values({
            pipelineEventId: event.id,
            requiredRole: config.gateApproverRole || 'admin',
            status: 'pending',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });
          logger.info(`Pipeline event ${event.id} (${event.eventType}) gated — awaiting ${config.gateApproverRole} approval`);
          continue;
        }

        if (existingApproval.status === 'pending') continue;

        if (existingApproval.status === 'rejected') {
          await tx.update(pipelineEvents).set({
            processed: true,
            processedAt: new Date(),
            error: `Rejected by ${existingApproval.approvedBy}: ${existingApproval.rejectionReason || 'no reason'}`,
          }).where(eq(pipelineEvents.id, event.id));
          continue;
        }
      }

      if (automationLevel === 'MANUAL') {
        try {
          const { notificationHub } = await import('../notifications/notification-hub');
          await notificationHub.send({
            type: 'manual_pipeline_event',
            channels: ['in_app'],
            content: `Manual pipeline event ${event.eventType} for entity ${event.entityId}`,
            data: { eventId: event.id, eventType: event.eventType, entityId: event.entityId },
          });
        } catch (err) {
          logger.warn(`Manual event notification failed for ${event.id}:`, err);
        }
        await tx.update(pipelineEvents).set({
          processed: true,
          processedAt: new Date(),
          handlerResults: { handlers: [{ name: 'manual-notify', status: 'completed', completedAt: new Date().toISOString() }] } as any,
        }).where(eq(pipelineEvents.id, event.id));
        processedCount++;
        continue;
      }

      try {
        const { handlerResults, bufferedEvents } = await this.processEvent(event);

        await tx.update(pipelineEvents).set({
          processed: true,
          processedAt: new Date(),
          handlerResults: handlerResults as any,
          error: null,
        }).where(eq(pipelineEvents.id, event.id));

        for (const buffered of bufferedEvents) {
          await tx.insert(pipelineEvents).values(buffered as NewPipelineEvent);
        }

        processedCount++;
      } catch (error) {
        await tx.update(pipelineEvents).set({
          retryCount: (event.retryCount ?? 0) + 1,
          error: error instanceof Error ? error.message : String(error),
        }).where(eq(pipelineEvents.id, event.id));
        logger.error(`Pipeline event ${event.id} failed (retry ${(event.retryCount ?? 0) + 1}):`, error);
      }
    }

    return processedCount;
  }

  startPolling(intervalMs: number = 15000): void {
    if (this.pollingInterval) return;
    logger.info(`Pipeline orchestrator starting (polling every ${intervalMs}ms)`);
    this.pollingInterval = setInterval(() => this.pollAndProcess(), intervalMs);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('Pipeline orchestrator stopped');
    }
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();
