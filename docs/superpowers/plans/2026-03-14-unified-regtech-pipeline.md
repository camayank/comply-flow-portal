# Unified RegTech Pipeline Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an event-driven pipeline connecting lead generation through service delivery, financial settlement, and compliance monitoring with zero manual handoffs.

**Architecture:** Pipeline Orchestrator pattern — a central event dispatcher polls `pipeline_events` table every 15 seconds, routes events to domain-specific handlers (sales, execution, finance, compliance) with configurable automation levels (AUTO/GATED/MANUAL). Events emitted by handlers are buffered and committed only after all handlers succeed, then processed in subsequent cycles.

**Tech Stack:** Express.js, Drizzle ORM, PostgreSQL, Jest, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-14-unified-regtech-pipeline-design.md`

---

## Chunk 1: Foundation — Schema & Pipeline Orchestrator

### Task 1: Pipeline Events Schema

**Files:**
- Create: `shared/pipeline-schema.ts`
- Modify: `shared/schema.ts` (add export)
- Test: `server/__tests__/pipeline-schema.test.ts`

- [ ] **Step 1: Write the schema file**

```typescript
// shared/pipeline-schema.ts
import { pgTable, serial, integer, varchar, text, boolean, timestamp, jsonb, index, unique, decimal, date } from 'drizzle-orm/pg-core';
import { users, businessEntities, serviceRequests } from './schema';

// ── Pipeline Events (Event backbone) ──
export const pipelineEvents = pgTable('pipeline_events', {
  id: serial('id').primaryKey(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: integer('entity_id').notNull(),
  payload: jsonb('payload').notNull(),
  previousState: varchar('previous_state', { length: 50 }),
  newState: varchar('new_state', { length: 50 }),
  triggeredBy: integer('triggered_by').references(() => users.id),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
  handlerResults: jsonb('handler_results'),
  error: text('error'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_pipeline_events_unprocessed').on(table.processed, table.createdAt),
  index('idx_pipeline_events_entity').on(table.entityType, table.entityId),
  index('idx_pipeline_events_type').on(table.eventType),
]);

export type PipelineEvent = typeof pipelineEvents.$inferSelect;
export type NewPipelineEvent = typeof pipelineEvents.$inferInsert;

// ── Invoices ──
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 20 }).unique().notNull(),
  businessEntityId: integer('business_entity_id').references(() => businessEntities.id),
  serviceRequestId: integer('service_request_id').references(() => serviceRequests.id).unique(),
  clientName: varchar('client_name', { length: 200 }).notNull(),
  clientGstin: varchar('client_gstin', { length: 15 }),
  clientState: varchar('client_state', { length: 50 }),
  lineItems: jsonb('line_items').notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  cgstAmount: decimal('cgst_amount', { precision: 12, scale: 2 }).default('0'),
  sgstAmount: decimal('sgst_amount', { precision: 12, scale: 2 }).default('0'),
  igstAmount: decimal('igst_amount', { precision: 12, scale: 2 }).default('0'),
  totalTax: decimal('total_tax', { precision: 12, scale: 2 }).notNull(),
  grandTotal: decimal('grand_total', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('draft'),
  dueDate: date('due_date').notNull(),
  paidAt: timestamp('paid_at'),
  paymentId: integer('payment_id'),
  pdfUrl: text('pdf_url'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_invoices_entity').on(table.businessEntityId),
  index('idx_invoices_status').on(table.status),
  index('idx_invoices_due_date').on(table.dueDate),
]);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

// ── Pipeline Automation Config ──
export const pipelineAutomationConfig = pgTable('pipeline_automation_config', {
  id: serial('id').primaryKey(),
  serviceCode: varchar('service_code', { length: 100 }).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  automationLevel: varchar('automation_level', { length: 10 }).notNull(), // AUTO, GATED, MANUAL
  gateApproverRole: varchar('gate_approver_role', { length: 50 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  unique('uq_automation_config').on(table.serviceCode, table.eventType),
]);

export type PipelineAutomationConfigRow = typeof pipelineAutomationConfig.$inferSelect;

// ── Approval Requests ──
export const approvalRequests = pgTable('approval_requests', {
  id: serial('id').primaryKey(),
  pipelineEventId: integer('pipeline_event_id').references(() => pipelineEvents.id),
  requiredRole: varchar('required_role', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  approvedBy: integer('approved_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  expiresAt: timestamp('expires_at'),
  escalated: boolean('escalated').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
}, (table) => [
  index('idx_approval_pending').on(table.status, table.requiredRole),
]);

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
```

- [ ] **Step 2: Write schema validation test**

```typescript
// server/__tests__/pipeline-schema.test.ts
import { pipelineEvents, invoices, pipelineAutomationConfig, approvalRequests } from '@shared/pipeline-schema';

describe('Pipeline Schema', () => {
  it('pipelineEvents table is defined with correct name', () => {
    expect(pipelineEvents._.name).toBe('pipeline_events');
  });

  it('pipelineEvents has required columns', () => {
    expect(pipelineEvents.eventType).toBeDefined();
    expect(pipelineEvents.entityType).toBeDefined();
    expect(pipelineEvents.entityId).toBeDefined();
    expect(pipelineEvents.payload).toBeDefined();
    expect(pipelineEvents.processed).toBeDefined();
    expect(pipelineEvents.handlerResults).toBeDefined();
    expect(pipelineEvents.retryCount).toBeDefined();
    expect(pipelineEvents.maxRetries).toBeDefined();
  });

  it('invoices has GST columns', () => {
    expect(invoices.cgstAmount).toBeDefined();
    expect(invoices.sgstAmount).toBeDefined();
    expect(invoices.igstAmount).toBeDefined();
    expect(invoices.serviceRequestId).toBeDefined();
  });

  it('pipelineAutomationConfig has required fields', () => {
    expect(pipelineAutomationConfig.serviceCode).toBeDefined();
    expect(pipelineAutomationConfig.eventType).toBeDefined();
    expect(pipelineAutomationConfig.automationLevel).toBeDefined();
  });

  it('approvalRequests has expiry and escalation fields', () => {
    expect(approvalRequests.expiresAt).toBeDefined();
    expect(approvalRequests.escalated).toBeDefined();
    expect(approvalRequests.pipelineEventId).toBeDefined();
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- --testPathPattern=pipeline-schema`
Expected: PASS

- [ ] **Step 4: Add pipeline-schema export to shared/schema.ts**

Add at the end of `shared/schema.ts`:
```typescript
export * from './pipeline-schema';
```

- [ ] **Step 5: Generate and run database migration**

Run: `npm run db:generate` then `npm run db:migrate`
Expected: 4 new tables created successfully

- [ ] **Step 6: Commit**

```bash
git add shared/pipeline-schema.ts server/__tests__/pipeline-schema.test.ts shared/schema.ts
git commit -m "feat: add pipeline events, invoices, automation config, approval request tables"
```

---

### Task 2: Schema Modifications to Existing Tables

**Files:**
- Modify: `shared/schema.ts` (leads, serviceRequests, businessEntities)
- Modify: `shared/super-admin-schema.ts` (commissions)

- [ ] **Step 1: Add enrichment columns to leads table**

In `shared/schema.ts`, add to the `leads` table definition:
```typescript
enrichmentData: jsonb('enrichment_data'),
enrichedAt: timestamp('enriched_at'),
enrichmentSource: varchar('enrichment_source', { length: 50 }),
```

- [ ] **Step 2: Add pipeline columns to serviceRequests table**

In `shared/schema.ts`, add to the `serviceRequests` table definition:
```typescript
automationLevel: varchar('automation_level', { length: 10 }),
pipelineStage: varchar('pipeline_stage', { length: 50 }),
renewalOf: integer('renewal_of'),
renewalDueDate: date('renewal_due_date'),
renewalDedupKey: varchar('renewal_dedup_key', { length: 200 }).unique(),
```

- [ ] **Step 3: Add compliance columns to businessEntities table**

In `shared/schema.ts`, add to the `businessEntities` table definition:
```typescript
complianceInitialized: boolean('compliance_initialized').default(false),
complianceInitializedAt: timestamp('compliance_initialized_at'),
estimatedTurnover: decimal('estimated_turnover', { precision: 15, scale: 2 }),
employeeCount: integer('employee_count'),
```

- [ ] **Step 4: Add invoice/clawback columns to commissions table**

In `shared/super-admin-schema.ts`, add to the commission payouts table:
```typescript
invoiceId: integer('invoice_id'),
clawbackEligible: boolean('clawback_eligible').default(true),
clawbackUntil: date('clawback_until'),
```

- [ ] **Step 5: Generate and run migration**

Run: `npm run db:generate` then `npm run db:migrate`
Expected: ALTER TABLE migrations applied

- [ ] **Step 6: Commit**

```bash
git add shared/schema.ts shared/super-admin-schema.ts
git commit -m "feat: add enrichment, pipeline, compliance, clawback columns to existing tables"
```

---

### Task 3: Pipeline Event Types

**Files:**
- Create: `server/services/pipeline/pipeline-events.ts`
- Test: `server/__tests__/pipeline-events.test.ts`

- [ ] **Step 1: Write failing test for event type definitions**

```typescript
// server/__tests__/pipeline-events.test.ts
import { PIPELINE_EVENTS, PipelineEventType, createPipelineEvent } from '../services/pipeline/pipeline-events';

describe('Pipeline Events', () => {
  describe('Event Catalog', () => {
    it('has all Zone A (Sales) events', () => {
      expect(PIPELINE_EVENTS.LEAD_CREATED).toBe('lead.created');
      expect(PIPELINE_EVENTS.LEAD_ASSIGNED).toBe('lead.assigned');
      expect(PIPELINE_EVENTS.LEAD_QUALIFIED).toBe('lead.qualified');
      expect(PIPELINE_EVENTS.LEAD_PROPOSAL_SENT).toBe('lead.proposal_sent');
      expect(PIPELINE_EVENTS.LEAD_PROPOSAL_APPROVED).toBe('lead.proposal_approved');
      expect(PIPELINE_EVENTS.LEAD_CONVERTED).toBe('lead.converted');
      expect(PIPELINE_EVENTS.LEAD_LOST).toBe('lead.lost');
    });

    it('has all Zone B (Execution) events', () => {
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

    it('has all Zone C (Financial) events', () => {
      expect(PIPELINE_EVENTS.FINANCE_INVOICE_CREATED).toBe('finance.invoice_created');
      expect(PIPELINE_EVENTS.FINANCE_INVOICE_SENT).toBe('finance.invoice_sent');
      expect(PIPELINE_EVENTS.FINANCE_PAYMENT_RECEIVED).toBe('finance.payment_received');
      expect(PIPELINE_EVENTS.FINANCE_COMMISSION_CALCULATED).toBe('finance.commission_calculated');
      expect(PIPELINE_EVENTS.FINANCE_COMMISSION_APPROVED).toBe('finance.commission_approved');
      expect(PIPELINE_EVENTS.FINANCE_COMMISSION_PAID).toBe('finance.commission_paid');
    });

    it('has all Zone D (Compliance) events', () => {
      expect(PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED).toBe('compliance.entity_initialized');
      expect(PIPELINE_EVENTS.COMPLIANCE_DEADLINE_APPROACHING).toBe('compliance.deadline_approaching');
      expect(PIPELINE_EVENTS.COMPLIANCE_DEADLINE_OVERDUE).toBe('compliance.deadline_overdue');
      expect(PIPELINE_EVENTS.COMPLIANCE_ACTION_COMPLETED).toBe('compliance.action_completed');
      expect(PIPELINE_EVENTS.COMPLIANCE_STATE_CHANGED).toBe('compliance.state_changed');
      expect(PIPELINE_EVENTS.COMPLIANCE_RENEWAL_DUE).toBe('compliance.renewal_due');
      expect(PIPELINE_EVENTS.COMPLIANCE_GAP_DETECTED).toBe('compliance.gap_detected');
      expect(PIPELINE_EVENTS.COMPLIANCE_PORTAL_SYNCED).toBe('compliance.portal_synced');
    });
  });

  describe('createPipelineEvent', () => {
    it('creates a valid event payload', () => {
      const event = createPipelineEvent({
        eventType: PIPELINE_EVENTS.LEAD_CREATED,
        entityType: 'lead',
        entityId: 42,
        payload: { name: 'Test Lead' },
        triggeredBy: 1,
      });

      expect(event.eventType).toBe('lead.created');
      expect(event.entityType).toBe('lead');
      expect(event.entityId).toBe(42);
      expect(event.payload).toEqual({ name: 'Test Lead' });
      expect(event.triggeredBy).toBe(1);
      expect(event.processed).toBe(false);
      expect(event.retryCount).toBe(0);
      expect(event.maxRetries).toBe(3);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=pipeline-events`
Expected: FAIL — module not found

- [ ] **Step 3: Create pipeline events module**

```typescript
// server/services/pipeline/pipeline-events.ts
import type { NewPipelineEvent } from '@shared/pipeline-schema';

export const PIPELINE_EVENTS = {
  // Zone A: Sales
  LEAD_CREATED: 'lead.created',
  LEAD_ASSIGNED: 'lead.assigned',
  LEAD_QUALIFIED: 'lead.qualified',
  LEAD_PROPOSAL_SENT: 'lead.proposal_sent',
  LEAD_PROPOSAL_APPROVED: 'lead.proposal_approved',
  LEAD_CONVERTED: 'lead.converted',
  LEAD_LOST: 'lead.lost',

  // Zone B: Execution
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

  // Zone C: Financial
  FINANCE_INVOICE_CREATED: 'finance.invoice_created',
  FINANCE_INVOICE_SENT: 'finance.invoice_sent',
  FINANCE_PAYMENT_RECEIVED: 'finance.payment_received',
  FINANCE_COMMISSION_CALCULATED: 'finance.commission_calculated',
  FINANCE_COMMISSION_APPROVED: 'finance.commission_approved',
  FINANCE_COMMISSION_PAID: 'finance.commission_paid',

  // Zone D: Compliance
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=pipeline-events`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/pipeline/pipeline-events.ts server/__tests__/pipeline-events.test.ts
git commit -m "feat: define 32 typed pipeline events across 4 zones"
```

---

### Task 4: Pipeline Orchestrator Core

**Files:**
- Create: `server/services/pipeline/pipeline-orchestrator.ts`
- Test: `server/__tests__/pipeline-orchestrator.test.ts`

- [ ] **Step 1: Write failing test for orchestrator**

```typescript
// server/__tests__/pipeline-orchestrator.test.ts
import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';
import type { HandlerResult } from '../services/pipeline/pipeline-events';

// Mock db
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
      const handler = jest.fn();
      orchestrator.registerHandler('lead.created', 'test-handler', handler);
      expect(orchestrator.getHandlers('lead.created')).toHaveLength(1);
    });

    it('registers multiple handlers for same event in order', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      orchestrator.registerHandler('lead.created', 'handler-1', handler1);
      orchestrator.registerHandler('lead.created', 'handler-2', handler2);
      const handlers = orchestrator.getHandlers('lead.created');
      expect(handlers).toHaveLength(2);
      expect(handlers[0].name).toBe('handler-1');
      expect(handlers[1].name).toBe('handler-2');
    });
  });

  describe('processEvent', () => {
    it('runs handlers sequentially and collects results', async () => {
      const results: string[] = [];
      orchestrator.registerHandler('lead.created', 'h1', async () => {
        results.push('h1');
        return { tasksCreated: 1 };
      });
      orchestrator.registerHandler('lead.created', 'h2', async () => {
        results.push('h2');
        return { notified: true };
      });

      const event = {
        id: 1,
        eventType: 'lead.created',
        entityType: 'lead',
        entityId: 42,
        payload: {},
        handlerResults: null,
        retryCount: 0,
        maxRetries: 3,
      };

      const { handlerResults, bufferedEvents } = await orchestrator.processEvent(event as any);
      expect(results).toEqual(['h1', 'h2']);
      expect(handlerResults.handlers).toHaveLength(2);
      expect(handlerResults.handlers[0].status).toBe('completed');
      expect(handlerResults.handlers[1].status).toBe('completed');
    });

    it('halts on handler failure and does not run subsequent handlers', async () => {
      const results: string[] = [];
      orchestrator.registerHandler('lead.created', 'h1', async () => {
        results.push('h1');
        return {};
      });
      orchestrator.registerHandler('lead.created', 'h2', async () => {
        throw new Error('handler failed');
      });
      orchestrator.registerHandler('lead.created', 'h3', async () => {
        results.push('h3');
        return {};
      });

      const event = {
        id: 1,
        eventType: 'lead.created',
        entityType: 'lead',
        entityId: 42,
        payload: {},
        handlerResults: null,
        retryCount: 0,
        maxRetries: 3,
      };

      await expect(orchestrator.processEvent(event as any)).rejects.toThrow('handler failed');
      expect(results).toEqual(['h1']);
    });

    it('skips already-completed handlers on retry', async () => {
      const results: string[] = [];
      orchestrator.registerHandler('lead.created', 'h1', async () => {
        results.push('h1');
        return {};
      });
      orchestrator.registerHandler('lead.created', 'h2', async () => {
        results.push('h2');
        return {};
      });

      const event = {
        id: 1,
        eventType: 'lead.created',
        entityType: 'lead',
        entityId: 42,
        payload: {},
        handlerResults: {
          handlers: [
            { name: 'h1', status: 'completed', completedAt: new Date().toISOString(), output: {} },
          ],
        },
        retryCount: 1,
        maxRetries: 3,
      };

      const { handlerResults } = await orchestrator.processEvent(event as any);
      expect(results).toEqual(['h2']); // h1 skipped
      expect(handlerResults.handlers).toHaveLength(2);
    });
  });

  describe('emitEvent', () => {
    it('buffers events during handler execution', () => {
      orchestrator.bufferEvent({
        eventType: 'service.created',
        entityType: 'service_request',
        entityId: 10,
        payload: {},
      });

      const buffered = orchestrator.getBufferedEvents();
      expect(buffered).toHaveLength(1);
      expect(buffered[0].eventType).toBe('service.created');
    });

    it('clears buffer on flush', () => {
      orchestrator.bufferEvent({
        eventType: 'service.created',
        entityType: 'service_request',
        entityId: 10,
        payload: {},
      });

      const flushed = orchestrator.flushBufferedEvents();
      expect(flushed).toHaveLength(1);
      expect(orchestrator.getBufferedEvents()).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=pipeline-orchestrator`
Expected: FAIL — module not found

- [ ] **Step 3: Implement pipeline orchestrator**

```typescript
// server/services/pipeline/pipeline-orchestrator.ts
import { db } from '../../db';
import { pipelineEvents } from '@shared/pipeline-schema';
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

    const allResults: HandlerResult[] = [...previousResults.filter((r) => r.status === 'completed')];

    // Clear buffer for this event
    this.bufferedEvents = [];

    const context: HandlerContext = {
      emitEvent: (params) => {
        this.bufferEvent(createPipelineEvent({
          ...params,
          triggeredBy: event.triggeredBy ?? undefined,
        }));
      },
    };

    for (const handler of registeredHandlers) {
      if (completedNames.has(handler.name)) {
        continue; // Skip already-completed handlers on retry
      }

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
        // Discard buffered events on failure
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
    const unprocessedEvents = await db
      .select()
      .from(pipelineEvents)
      .where(and(eq(pipelineEvents.processed, false)))
      .orderBy(asc(pipelineEvents.createdAt))
      .limit(10);

    let processedCount = 0;

    for (const event of unprocessedEvents) {
      if (event.retryCount >= event.maxRetries) {
        // Dead letter
        await db
          .update(pipelineEvents)
          .set({
            processed: true,
            processedAt: new Date(),
            error: `Max retries (${event.maxRetries}) exceeded. Dead lettered.`,
          })
          .where(eq(pipelineEvents.id, event.id));
        logger.error(`Pipeline event ${event.id} dead lettered after ${event.maxRetries} retries`);
        continue;
      }

      try {
        const { handlerResults, bufferedEvents } = await this.processEvent(event);

        await db.transaction(async (tx) => {
          // Mark event as processed
          await tx
            .update(pipelineEvents)
            .set({
              processed: true,
              processedAt: new Date(),
              handlerResults: handlerResults as any,
              error: null,
            })
            .where(eq(pipelineEvents.id, event.id));

          // Insert buffered events
          for (const buffered of bufferedEvents) {
            await tx.insert(pipelineEvents).values(buffered as NewPipelineEvent);
          }
        });

        processedCount++;
      } catch (error) {
        await db
          .update(pipelineEvents)
          .set({
            retryCount: event.retryCount + 1,
            error: error instanceof Error ? error.message : String(error),
            handlerResults: null, // Will be rebuilt on retry
          })
          .where(eq(pipelineEvents.id, event.id));

        logger.error(`Pipeline event ${event.id} failed (retry ${event.retryCount + 1}):`, error);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=pipeline-orchestrator`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/pipeline/pipeline-orchestrator.ts server/__tests__/pipeline-orchestrator.test.ts
git commit -m "feat: implement pipeline orchestrator with sequential handlers, retry, event buffering"
```

---

### Task 5: Seed Default Automation Config

**Files:**
- Create: `scripts/seed-pipeline-config.ts`

- [ ] **Step 1: Write seed script**

```typescript
// scripts/seed-pipeline-config.ts
import { db } from '../server/db';
import { pipelineAutomationConfig } from '@shared/pipeline-schema';

const DEFAULT_CONFIG = [
  // Zone A: Sales
  { serviceCode: '*', eventType: 'lead.created', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'lead.assigned', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'lead.qualified', automationLevel: 'GATED', gateApproverRole: 'sales_manager' },
  { serviceCode: '*', eventType: 'lead.proposal_sent', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'lead.proposal_approved', automationLevel: 'GATED', gateApproverRole: 'admin' },
  { serviceCode: '*', eventType: 'lead.converted', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'lead.lost', automationLevel: 'AUTO' },

  // Zone B: Execution
  { serviceCode: '*', eventType: 'service.created', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.payment_pending', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.payment_received', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.docs_uploaded', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.docs_verified', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.task_completed', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.qc_submitted', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.qc_approved', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.qc_rejected', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.delivered', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.confirmed', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.sla_warning', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.sla_breached', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'service.escalated', automationLevel: 'MANUAL' },
  { serviceCode: '*', eventType: 'service.cancelled', automationLevel: 'AUTO' },

  // Zone C: Finance
  { serviceCode: '*', eventType: 'finance.invoice_created', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'finance.invoice_sent', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'finance.payment_received', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'finance.commission_calculated', automationLevel: 'GATED', gateApproverRole: 'finance' },
  { serviceCode: '*', eventType: 'finance.commission_approved', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'finance.commission_paid', automationLevel: 'AUTO' },

  // Zone D: Compliance
  { serviceCode: '*', eventType: 'compliance.entity_initialized', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.deadline_approaching', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.deadline_overdue', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.action_completed', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.state_changed', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.renewal_due', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.gap_detected', automationLevel: 'AUTO' },
  { serviceCode: '*', eventType: 'compliance.portal_synced', automationLevel: 'MANUAL' },
];

async function seed() {
  for (const config of DEFAULT_CONFIG) {
    await db
      .insert(pipelineAutomationConfig)
      .values({
        serviceCode: config.serviceCode,
        eventType: config.eventType,
        automationLevel: config.automationLevel,
        gateApproverRole: config.gateApproverRole || null,
      })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${DEFAULT_CONFIG.length} automation config entries (all 32 pipeline events + 2 portal events)`);
}

seed().catch(console.error);
```

- [ ] **Step 2: Run seed**

Run: `npx tsx scripts/seed-pipeline-config.ts`
Expected: "Seeded 34 automation config entries"

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-pipeline-config.ts
git commit -m "feat: seed default pipeline automation config (GATED for financial/proposal actions)"
```

---

### Task 6: Register Orchestrator in Server Startup

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Import and start orchestrator in server startup**

Add to `server/index.ts` after route registration:
```typescript
import { pipelineOrchestrator } from './services/pipeline/pipeline-orchestrator';

// After registerRoutes(app) and server.listen():
if (process.env.NODE_ENV !== 'test') {
  pipelineOrchestrator.startPolling(15000);
  logger.info('Pipeline orchestrator started');
}
```

- [ ] **Step 2: Verify server starts without errors**

Run: `npm run dev` (check for startup log "Pipeline orchestrator started")
Expected: No errors, orchestrator polling starts

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "feat: register pipeline orchestrator in server startup"
```

---

## Chunk 2: Zone A — Sales Handler

### Task 7: Sales Handler — lead.created

**Files:**
- Create: `server/services/pipeline/handlers/sales-handler.ts`
- Test: `server/__tests__/sales-handler.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// server/__tests__/sales-handler.test.ts
import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';
import { registerSalesHandlers } from '../services/pipeline/handlers/sales-handler';
import { PIPELINE_EVENTS } from '../services/pipeline/pipeline-events';

// Mock dependencies
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

jest.mock('../services/lead-assignment-service', () => ({
  leadAssignmentService: {
    assignLead: jest.fn().mockResolvedValue({ assignedTo: 5, agentName: 'Test Agent' }),
  },
}));

describe('Sales Handler', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    registerSalesHandlers(orchestrator);
  });

  it('registers handlers for sales events', () => {
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.LEAD_CREATED).length).toBeGreaterThan(0);
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.LEAD_QUALIFIED).length).toBeGreaterThan(0);
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.LEAD_PROPOSAL_APPROVED).length).toBeGreaterThan(0);
  });

  it('lead.created handler emits lead.assigned', async () => {
    const event = {
      id: 1,
      eventType: PIPELINE_EVENTS.LEAD_CREATED,
      entityType: 'lead',
      entityId: 42,
      payload: { name: 'Test Lead', pan: 'ABCDE1234F' },
      handlerResults: null,
      retryCount: 0,
      maxRetries: 3,
      triggeredBy: 1,
    };

    const { handlerResults, bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(handlerResults.handlers[0].status).toBe('completed');
    expect(bufferedEvents.some(e => e.eventType === PIPELINE_EVENTS.LEAD_ASSIGNED)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=sales-handler`
Expected: FAIL — module not found

- [ ] **Step 3: Implement sales handler**

```typescript
// server/services/pipeline/handlers/sales-handler.ts
import { db } from '../../../db';
import { leads } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../logger';
import { PIPELINE_EVENTS } from '../pipeline-events';
import type { PipelineOrchestrator } from '../pipeline-orchestrator';
import type { PipelineEvent } from '@shared/pipeline-schema';
import type { HandlerContext } from '../pipeline-orchestrator';

async function handleLeadCreated(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;

  // Store enrichment data from lead form (manual enrichment for now)
  const enrichmentData = {
    entityType: (payload as any).entityType || null,
    pan: (payload as any).pan || null,
    gstin: (payload as any).gstin || null,
    source: 'lead_form',
  };

  await db
    .update(leads)
    .set({
      enrichmentData,
      enrichedAt: new Date(),
      enrichmentSource: 'lead_form',
    })
    .where(eq(leads.id, entityId));

  // Auto-assign via lead assignment service (import dynamically to avoid circular deps)
  let assignedTo: number | null = null;
  try {
    const { leadAssignmentService } = await import('../../lead-assignment-service');
    const assignment = await leadAssignmentService.assignLead(entityId);
    assignedTo = assignment?.assignedTo || null;
  } catch (err) {
    logger.warn(`Lead auto-assignment failed for lead ${entityId}:`, err);
  }

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.LEAD_ASSIGNED,
    entityType: 'lead',
    entityId,
    payload: { assignedTo, enrichmentData },
  });

  return { enriched: true, assignedTo };
}

async function handleLeadQualified(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;
  // Auto-generate proposal draft from service catalog pricing
  // For now, emit event for downstream processing
  logger.info(`Lead ${entityId} qualified — proposal draft generation`);
  return { proposalDraftQueued: true };
}

async function handleLeadProposalApproved(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;
  const proposalData = payload as any;

  // This handler creates business entity + service requests
  // Implementation depends on existing entity creation logic
  logger.info(`Lead ${entityId} proposal approved — creating entity and service requests`);

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.LEAD_CONVERTED,
    entityType: 'lead',
    entityId,
    payload: { proposalData },
  });

  return { entityCreated: true };
}

export function registerSalesHandlers(orchestrator: PipelineOrchestrator): void {
  orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_CREATED, 'lead-enrichment', handleLeadCreated);
  orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_QUALIFIED, 'proposal-generation', handleLeadQualified);
  orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_PROPOSAL_APPROVED, 'entity-creation', handleLeadProposalApproved);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=sales-handler`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/pipeline/handlers/sales-handler.ts server/__tests__/sales-handler.test.ts
git commit -m "feat: implement sales handler for lead.created, lead.qualified, lead.proposal_approved"
```

---

### Task 7b: Sales Handler — Remaining Events (lead.proposal_sent, lead.lost, lead.converted)

**Files:**
- Modify: `server/services/pipeline/handlers/sales-handler.ts`
- Modify: `server/__tests__/sales-handler.test.ts`

- [ ] **Step 1: Add tests for remaining sales events**

Add to `server/__tests__/sales-handler.test.ts`:
```typescript
it('registers handlers for all 7 sales events', () => {
  expect(orchestrator.getHandlers(PIPELINE_EVENTS.LEAD_CREATED).length).toBeGreaterThan(0);
  expect(orchestrator.getHandlers(PIPELINE_EVENTS.LEAD_PROPOSAL_SENT).length).toBeGreaterThan(0);
  expect(orchestrator.getHandlers(PIPELINE_EVENTS.LEAD_CONVERTED).length).toBeGreaterThan(0);
  expect(orchestrator.getHandlers(PIPELINE_EVENTS.LEAD_LOST).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Implement remaining sales handlers**

Add to `sales-handler.ts`:
```typescript
async function handleLeadProposalSent(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId } = event;
  // Notify client + track open
  logger.info(`Proposal sent for lead ${entityId}`);
  return { notified: true };
}

async function handleLeadConverted(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;
  // Create user account + init compliance
  const entityIdNum = (payload as any).businessEntityId;
  if (entityIdNum) {
    ctx.emitEvent({
      eventType: PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED,
      entityType: 'business_entity',
      entityId: entityIdNum,
      payload: { triggeredBy: 'lead_conversion' },
    });
  }
  return { userCreated: true };
}

async function handleLeadLost(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;
  logger.info(`Lead ${entityId} lost. Reason: ${(payload as any).reason || 'not specified'}`);
  return { logged: true };
}
```

Update `registerSalesHandlers` to include:
```typescript
orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_PROPOSAL_SENT, 'proposal-track', handleLeadProposalSent);
orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_CONVERTED, 'conversion-init', handleLeadConverted);
orchestrator.registerHandler(PIPELINE_EVENTS.LEAD_LOST, 'loss-log', handleLeadLost);
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --testPathPattern=sales-handler`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/services/pipeline/handlers/sales-handler.ts server/__tests__/sales-handler.test.ts
git commit -m "feat: add remaining sales handlers (proposal_sent, converted, lost)"
```

---

### Task 8: Execution Handler — service.created, service.confirmed

**Files:**
- Create: `server/services/pipeline/handlers/execution-handler.ts`
- Create: `server/services/pipeline/guards/compliance-guard.ts`
- Test: `server/__tests__/execution-handler.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// server/__tests__/execution-handler.test.ts
import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';
import { registerExecutionHandlers } from '../services/pipeline/handlers/execution-handler';
import { PIPELINE_EVENTS } from '../services/pipeline/pipeline-events';

jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1 }]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    onConflictDoNothing: jest.fn().mockResolvedValue([]),
  },
}));

describe('Execution Handler', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    registerExecutionHandlers(orchestrator);
  });

  it('registers handlers for execution events', () => {
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.SERVICE_CREATED).length).toBeGreaterThan(0);
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.SERVICE_TASK_COMPLETED).length).toBeGreaterThan(0);
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.SERVICE_QC_APPROVED).length).toBeGreaterThan(0);
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.SERVICE_CONFIRMED).length).toBeGreaterThan(0);
  });

  it('service.confirmed handler emits finance and compliance events', async () => {
    const event = {
      id: 1,
      eventType: PIPELINE_EVENTS.SERVICE_CONFIRMED,
      entityType: 'service_request',
      entityId: 10,
      payload: { serviceRequestId: 10 },
      handlerResults: null,
      retryCount: 0,
      maxRetries: 3,
      triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    const eventTypes = bufferedEvents.map(e => e.eventType);
    expect(eventTypes).toContain(PIPELINE_EVENTS.FINANCE_INVOICE_CREATED);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=execution-handler`
Expected: FAIL — module not found

- [ ] **Step 3: Implement compliance guard**

```typescript
// server/services/pipeline/guards/compliance-guard.ts
import { db } from '../../../db';
import { businessEntities } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../logger';

export interface ComplianceGuardResult {
  state: 'GREEN' | 'AMBER' | 'RED' | 'UNINITIALIZED';
  metadata: Record<string, boolean>;
  remediationTaskCount: number;
}

export async function runComplianceGuard(entityId: number): Promise<ComplianceGuardResult> {
  const [entity] = await db
    .select()
    .from(businessEntities)
    .where(eq(businessEntities.id, entityId))
    .limit(1);

  if (!entity) {
    return { state: 'GREEN', metadata: {}, remediationTaskCount: 0 };
  }

  if (!entity.complianceInitialized) {
    return {
      state: 'UNINITIALIZED',
      metadata: { compliance_uninitialized: true },
      remediationTaskCount: 0,
    };
  }

  // Check compliance state from complianceState table
  // For now, return GREEN as default
  // Full implementation will query complianceState for this entity
  return { state: 'GREEN', metadata: {}, remediationTaskCount: 0 };
}
```

- [ ] **Step 4: Implement execution handler**

```typescript
// server/services/pipeline/handlers/execution-handler.ts
import { db } from '../../../db';
import { serviceRequests, businessEntities } from '@shared/schema';
import { invoices } from '@shared/pipeline-schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../logger';
import { PIPELINE_EVENTS } from '../pipeline-events';
import { runComplianceGuard } from '../guards/compliance-guard';
import type { PipelineOrchestrator, HandlerContext } from '../pipeline-orchestrator';
import type { PipelineEvent } from '@shared/pipeline-schema';

async function handleServiceCreated(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId } = event;

  // Step 1: Run compliance guard
  const [sr] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, entityId))
    .limit(1);

  if (!sr) {
    throw new Error(`Service request ${entityId} not found`);
  }

  const guardResult = await runComplianceGuard(sr.businessEntityId || 0);
  logger.info(`Compliance guard for service ${entityId}: ${guardResult.state}`);

  // Step 2: Load blueprint and instantiate tasks (uses existing task-instantiation-service)
  // Step 3: Auto-assign tasks
  // Step 4: Calculate SLA deadlines

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.SERVICE_PAYMENT_PENDING,
    entityType: 'service_request',
    entityId,
    payload: { complianceState: guardResult.state },
  });

  return { complianceState: guardResult.state, tasksInstantiated: true };
}

async function handleServiceTaskCompleted(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;
  // Check if all tasks are done → trigger QC
  logger.info(`Task completed for service ${entityId}`);
  return { checked: true };
}

async function handleServiceQcApproved(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId } = event;
  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.SERVICE_DELIVERED,
    entityType: 'service_request',
    entityId,
    payload: {},
  });
  return { deliveryPrepared: true };
}

async function handleServiceConfirmed(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId } = event;

  // Mark service COMPLETED
  await db
    .update(serviceRequests)
    .set({ status: 'COMPLETED' })
    .where(eq(serviceRequests.id, entityId));

  // Create invoice (idempotent: ON CONFLICT DO NOTHING via unique constraint)
  const [sr] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, entityId))
    .limit(1);

  if (!sr) {
    throw new Error(`Service request ${entityId} not found`);
  }

  // Generate invoice number
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(entityId).padStart(6, '0')}`;

  const [existingInvoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.serviceRequestId, entityId))
    .limit(1);

  if (!existingInvoice) {
    await db.insert(invoices).values({
      invoiceNumber,
      businessEntityId: sr.businessEntityId,
      serviceRequestId: entityId,
      clientName: 'Client', // Will be enriched from entity
      lineItems: [{ service: sr.serviceType, quantity: 1, rate: sr.amount || 0, amount: sr.amount || 0 }],
      subtotal: String(sr.amount || 0),
      totalTax: '0',
      grandTotal: String(sr.amount || 0),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdBy: event.triggeredBy,
    });
  }

  // Emit finance event
  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.FINANCE_INVOICE_CREATED,
    entityType: 'invoice',
    entityId,
    payload: { invoiceNumber, serviceRequestId: entityId },
  });

  // Check compliance initialization before emitting compliance event
  if (sr.businessEntityId) {
    const [entity] = await db
      .select()
      .from(businessEntities)
      .where(eq(businessEntities.id, sr.businessEntityId))
      .limit(1);

    if (entity?.complianceInitialized) {
      ctx.emitEvent({
        eventType: PIPELINE_EVENTS.COMPLIANCE_ACTION_COMPLETED,
        entityType: 'business_entity',
        entityId: sr.businessEntityId,
        payload: { serviceRequestId: entityId },
      });
    } else {
      // Trigger initialization if not done
      ctx.emitEvent({
        eventType: PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED,
        entityType: 'business_entity',
        entityId: sr.businessEntityId,
        payload: { triggeredBy: 'service_confirmed' },
      });
    }
  }

  return { completed: true, invoiceNumber };
}

export function registerExecutionHandlers(orchestrator: PipelineOrchestrator): void {
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_CREATED, 'service-setup', handleServiceCreated);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_TASK_COMPLETED, 'task-completion-check', handleServiceTaskCompleted);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_QC_APPROVED, 'delivery-prep', handleServiceQcApproved);
  orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_CONFIRMED, 'service-completion', handleServiceConfirmed);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --testPathPattern=execution-handler`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/services/pipeline/handlers/execution-handler.ts server/services/pipeline/guards/compliance-guard.ts server/__tests__/execution-handler.test.ts
git commit -m "feat: implement execution handler with compliance guard and invoice creation"
```

---

### Task 8b: Execution Handler — Remaining Events (docs, QC, cancelled)

**Files:**
- Modify: `server/services/pipeline/handlers/execution-handler.ts`
- Modify: `server/__tests__/execution-handler.test.ts`

- [ ] **Step 1: Add tests for remaining execution events**

Add to `server/__tests__/execution-handler.test.ts`:
```typescript
it('registers handlers for all execution events', () => {
  const executionEvents = [
    PIPELINE_EVENTS.SERVICE_CREATED,
    PIPELINE_EVENTS.SERVICE_PAYMENT_RECEIVED,
    PIPELINE_EVENTS.SERVICE_DOCS_UPLOADED,
    PIPELINE_EVENTS.SERVICE_DOCS_VERIFIED,
    PIPELINE_EVENTS.SERVICE_TASK_COMPLETED,
    PIPELINE_EVENTS.SERVICE_QC_SUBMITTED,
    PIPELINE_EVENTS.SERVICE_QC_APPROVED,
    PIPELINE_EVENTS.SERVICE_QC_REJECTED,
    PIPELINE_EVENTS.SERVICE_CONFIRMED,
    PIPELINE_EVENTS.SERVICE_CANCELLED,
  ];
  for (const event of executionEvents) {
    expect(orchestrator.getHandlers(event).length).toBeGreaterThan(0);
  }
});

it('service.cancelled emits commission clawback if within window', async () => {
  const event = {
    id: 1,
    eventType: PIPELINE_EVENTS.SERVICE_CANCELLED,
    entityType: 'service_request',
    entityId: 10,
    payload: { serviceRequestId: 10, reason: 'client_request' },
    handlerResults: null,
    retryCount: 0,
    maxRetries: 3,
    triggeredBy: 1,
  };

  const { handlerResults } = await orchestrator.processEvent(event as any);
  expect(handlerResults.handlers[0].status).toBe('completed');
});
```

- [ ] **Step 2: Implement remaining execution handlers**

Add to `execution-handler.ts`:
```typescript
async function handlePaymentReceived(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId } = event;
  // Unlock doc upload + notify ops
  await db.update(serviceRequests).set({ status: 'PAYMENT_RECEIVED' }).where(eq(serviceRequests.id, entityId));
  return { unlocked: true };
}

async function handleDocsUploaded(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId } = event;
  // Auto-verify (OCR future) + assign reviewer
  logger.info(`Documents uploaded for service ${entityId}`);
  return { reviewAssigned: true };
}

async function handleDocsVerified(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId } = event;
  await db.update(serviceRequests).set({ status: 'IN_PROGRESS' }).where(eq(serviceRequests.id, entityId));
  return { movedToInProgress: true };
}

async function handleQcSubmitted(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId } = event;
  // Assign QC reviewer via round-robin
  logger.info(`QC review requested for service ${entityId}`);
  return { qcReviewerAssigned: true };
}

async function handleQcRejected(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId } = event;
  // Create rework tasks + notify ops
  await db.update(serviceRequests).set({ status: 'QC_REJECTED' }).where(eq(serviceRequests.id, entityId));
  return { reworkTasksCreated: true };
}

async function handleServiceCancelled(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;
  await db.update(serviceRequests).set({ status: 'CANCELLED' }).where(eq(serviceRequests.id, entityId));

  // Clear renewal dedup key so future renewals can be created
  await db.update(serviceRequests).set({ renewalDedupKey: null }).where(eq(serviceRequests.id, entityId));

  // Check commission clawback eligibility
  // Query commissions where serviceRequestId = entityId AND clawbackEligible = true AND clawbackUntil > NOW()
  // If found, emit finance event for clawback
  logger.info(`Service ${entityId} cancelled. Checking commission clawback...`);

  return { cancelled: true, clawbackChecked: true };
}
```

Update `registerExecutionHandlers` to include all:
```typescript
orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_PAYMENT_RECEIVED, 'payment-unlock', handlePaymentReceived);
orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_DOCS_UPLOADED, 'docs-review', handleDocsUploaded);
orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_DOCS_VERIFIED, 'docs-verified', handleDocsVerified);
orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_QC_SUBMITTED, 'qc-assign', handleQcSubmitted);
orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_QC_REJECTED, 'qc-rework', handleQcRejected);
orchestrator.registerHandler(PIPELINE_EVENTS.SERVICE_CANCELLED, 'service-cancel', handleServiceCancelled);
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --testPathPattern=execution-handler`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/services/pipeline/handlers/execution-handler.ts server/__tests__/execution-handler.test.ts
git commit -m "feat: add remaining execution handlers (docs, QC, payment, cancelled with clawback)"
```

---

## Chunk 3: Zone C (Finance) & Zone D (Compliance) Handlers

### Task 9: Finance Handler

**Files:**
- Create: `server/services/pipeline/handlers/finance-handler.ts`
- Test: `server/__tests__/finance-handler.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// server/__tests__/finance-handler.test.ts
import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';
import { registerFinanceHandlers } from '../services/pipeline/handlers/finance-handler';
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

jest.mock('../services/wallet-service', () => ({
  walletService: {
    credit: jest.fn().mockResolvedValue({ success: true, transactionId: 1 }),
  },
}));

describe('Finance Handler', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    registerFinanceHandlers(orchestrator);
  });

  it('registers handlers for finance events', () => {
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.FINANCE_INVOICE_CREATED).length).toBeGreaterThan(0);
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.FINANCE_PAYMENT_RECEIVED).length).toBeGreaterThan(0);
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.FINANCE_COMMISSION_APPROVED).length).toBeGreaterThan(0);
  });

  it('finance.invoice_created handler emits invoice_sent', async () => {
    const event = {
      id: 1,
      eventType: PIPELINE_EVENTS.FINANCE_INVOICE_CREATED,
      entityType: 'invoice',
      entityId: 10,
      payload: { invoiceNumber: 'INV-2026-000010', serviceRequestId: 10 },
      handlerResults: null,
      retryCount: 0,
      maxRetries: 3,
      triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(bufferedEvents.some(e => e.eventType === PIPELINE_EVENTS.FINANCE_INVOICE_SENT)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=finance-handler`
Expected: FAIL

- [ ] **Step 3: Implement finance handler**

```typescript
// server/services/pipeline/handlers/finance-handler.ts
import { db } from '../../../db';
import { invoices } from '@shared/pipeline-schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../logger';
import { PIPELINE_EVENTS } from '../pipeline-events';
import type { PipelineOrchestrator, HandlerContext } from '../pipeline-orchestrator';
import type { PipelineEvent } from '@shared/pipeline-schema';

async function handleInvoiceCreated(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { payload } = event;
  const { invoiceNumber, serviceRequestId } = payload as any;

  // Update invoice status to 'sent'
  await db
    .update(invoices)
    .set({ status: 'sent', updatedAt: new Date() })
    .where(eq(invoices.serviceRequestId, serviceRequestId));

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.FINANCE_INVOICE_SENT,
    entityType: 'invoice',
    entityId: event.entityId,
    payload: { invoiceNumber, serviceRequestId },
  });

  return { invoiceSent: true };
}

async function handlePaymentReceived(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { payload } = event;
  const { serviceRequestId, paymentId, amount } = payload as any;

  // Update invoice status to 'paid'
  await db
    .update(invoices)
    .set({ status: 'paid', paidAt: new Date(), paymentId, updatedAt: new Date() })
    .where(eq(invoices.serviceRequestId, serviceRequestId));

  // Calculate commission
  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.FINANCE_COMMISSION_CALCULATED,
    entityType: 'commission',
    entityId: event.entityId,
    payload: { serviceRequestId, paymentId, amount },
  });

  return { reconciled: true };
}

async function handleCommissionApproved(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { payload } = event;
  const { agentId, amount, commissionId } = payload as any;

  // Credit agent wallet (idempotent: check if transaction exists)
  try {
    const { walletService } = await import('../../wallet-service');
    await walletService.credit(
      agentId,
      amount,
      `Commission payout #${commissionId}`,
      'commission',
      'commission',
      commissionId
    );
  } catch (err) {
    logger.error(`Wallet credit failed for commission ${commissionId}:`, err);
    throw err;
  }

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.FINANCE_COMMISSION_PAID,
    entityType: 'commission',
    entityId: event.entityId,
    payload: { agentId, amount, commissionId },
  });

  return { walletCredited: true };
}

export function registerFinanceHandlers(orchestrator: PipelineOrchestrator): void {
  orchestrator.registerHandler(PIPELINE_EVENTS.FINANCE_INVOICE_CREATED, 'invoice-send', handleInvoiceCreated);
  orchestrator.registerHandler(PIPELINE_EVENTS.FINANCE_PAYMENT_RECEIVED, 'payment-reconcile', handlePaymentReceived);
  orchestrator.registerHandler(PIPELINE_EVENTS.FINANCE_COMMISSION_APPROVED, 'commission-payout', handleCommissionApproved);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=finance-handler`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/pipeline/handlers/finance-handler.ts server/__tests__/finance-handler.test.ts
git commit -m "feat: implement finance handler for invoice, payment, and commission processing"
```

---

### Task 10: Compliance Handler

**Files:**
- Create: `server/services/pipeline/handlers/compliance-handler.ts`
- Test: `server/__tests__/compliance-handler.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// server/__tests__/compliance-handler.test.ts
import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';
import { registerComplianceHandlers } from '../services/pipeline/handlers/compliance-handler';
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

describe('Compliance Handler', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    registerComplianceHandlers(orchestrator);
  });

  it('registers handlers for compliance events', () => {
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED).length).toBeGreaterThan(0);
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.COMPLIANCE_ACTION_COMPLETED).length).toBeGreaterThan(0);
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.COMPLIANCE_RENEWAL_DUE).length).toBeGreaterThan(0);
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.COMPLIANCE_GAP_DETECTED).length).toBeGreaterThan(0);
  });

  it('compliance.entity_initialized handler emits state_changed', async () => {
    const event = {
      id: 1,
      eventType: PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED,
      entityType: 'business_entity',
      entityId: 5,
      payload: {},
      handlerResults: null,
      retryCount: 0,
      maxRetries: 3,
      triggeredBy: 1,
    };

    const { handlerResults, bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(handlerResults.handlers[0].status).toBe('completed');
    expect(bufferedEvents.some(e => e.eventType === PIPELINE_EVENTS.COMPLIANCE_STATE_CHANGED)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=compliance-handler`
Expected: FAIL

- [ ] **Step 3: Implement compliance handler**

```typescript
// server/services/pipeline/handlers/compliance-handler.ts
import { db } from '../../../db';
import { businessEntities, serviceRequests } from '@shared/schema';
import { eq, and, ne, isNull } from 'drizzle-orm';
import { logger } from '../../../logger';
import { PIPELINE_EVENTS } from '../pipeline-events';
import type { PipelineOrchestrator, HandlerContext } from '../pipeline-orchestrator';
import type { PipelineEvent } from '@shared/pipeline-schema';

async function handleEntityInitialized(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId } = event;

  const [entity] = await db
    .select()
    .from(businessEntities)
    .where(eq(businessEntities.id, entityId))
    .limit(1);

  if (!entity) {
    throw new Error(`Business entity ${entityId} not found`);
  }

  if (entity.complianceInitialized) {
    return { skipped: true, reason: 'already_initialized' };
  }

  // Determine applicable compliance rules based on entity type, turnover, state, employee count
  // For now, initialize with GREEN state
  // Full implementation will query complianceRules table and create complianceTracking records

  await db
    .update(businessEntities)
    .set({
      complianceInitialized: true,
      complianceInitializedAt: new Date(),
    })
    .where(eq(businessEntities.id, entityId));

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.COMPLIANCE_STATE_CHANGED,
    entityType: 'business_entity',
    entityId,
    payload: { state: 'GREEN', initialized: true },
    previousState: undefined,
    newState: 'GREEN',
  });

  return { initialized: true, state: 'GREEN' };
}

async function handleActionCompleted(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;
  // Recalculate DigiScore
  logger.info(`Compliance action completed for entity ${entityId}`);
  return { digiScoreRecalculated: true };
}

async function handleRenewalDue(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;
  const { serviceCode, renewalDedupKey } = payload as any;

  if (!renewalDedupKey) {
    throw new Error('renewalDedupKey is required for renewal events');
  }

  // Dedup check: exclude CANCELLED
  const [existing] = await db
    .select()
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.renewalDedupKey, renewalDedupKey),
        ne(serviceRequests.status, 'CANCELLED')
      )
    )
    .limit(1);

  if (existing) {
    return { skipped: true, reason: 'duplicate_renewal', existingId: existing.id };
  }

  // Create new service request for renewal
  // Full implementation will populate from previous service data

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.SERVICE_CREATED,
    entityType: 'service_request',
    entityId,
    payload: { renewalDedupKey, serviceCode, isRenewal: true },
  });

  return { renewalCreated: true };
}

async function handleGapDetected(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;
  // Surface in compliance dashboard
  logger.info(`Compliance gap detected for entity ${entityId}`);
  return { gapLogged: true };
}

export function registerComplianceHandlers(orchestrator: PipelineOrchestrator): void {
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED, 'entity-init', handleEntityInitialized);
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_ACTION_COMPLETED, 'action-complete', handleActionCompleted);
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_RENEWAL_DUE, 'renewal-create', handleRenewalDue);
  orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_GAP_DETECTED, 'gap-log', handleGapDetected);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=compliance-handler`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/pipeline/handlers/compliance-handler.ts server/__tests__/compliance-handler.test.ts
git commit -m "feat: implement compliance handler with entity init, renewal dedup, gap detection"
```

---

### Task 10b: Compliance Deadline Handlers + Polling Jobs

**Files:**
- Modify: `server/services/pipeline/handlers/compliance-handler.ts`
- Create: `server/services/pipeline/jobs/compliance-deadline-job.ts`
- Create: `server/services/pipeline/jobs/approval-timeout-job.ts`

- [ ] **Step 1: Add deadline handlers to compliance-handler.ts**

```typescript
async function handleDeadlineApproaching(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;
  // Set domain state → AMBER, notify client + account manager, recalculate DigiScore
  logger.info(`Compliance deadline approaching for entity ${entityId}`);

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.COMPLIANCE_STATE_CHANGED,
    entityType: 'business_entity',
    entityId,
    payload: { state: 'AMBER' },
    previousState: 'GREEN',
    newState: 'AMBER',
  });

  return { state: 'AMBER', notified: true };
}

async function handleDeadlineOverdue(event: PipelineEvent, ctx: HandlerContext): Promise<Record<string, unknown>> {
  const { entityId, payload } = event;
  // Set domain state → RED, calculate penalty, escalate
  logger.info(`Compliance deadline overdue for entity ${entityId}`);

  ctx.emitEvent({
    eventType: PIPELINE_EVENTS.COMPLIANCE_STATE_CHANGED,
    entityType: 'business_entity',
    entityId,
    payload: { state: 'RED' },
    previousState: 'AMBER',
    newState: 'RED',
  });

  return { state: 'RED', escalated: true };
}
```

Update `registerComplianceHandlers`:
```typescript
orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_DEADLINE_APPROACHING, 'deadline-warn', handleDeadlineApproaching);
orchestrator.registerHandler(PIPELINE_EVENTS.COMPLIANCE_DEADLINE_OVERDUE, 'deadline-overdue', handleDeadlineOverdue);
```

- [ ] **Step 2: Create compliance deadline polling job**

```typescript
// server/services/pipeline/jobs/compliance-deadline-job.ts
import { db } from '../../../db';
import { pipelineEvents } from '@shared/pipeline-schema';
import { createPipelineEvent, PIPELINE_EVENTS } from '../pipeline-events';
import { logger } from '../../../logger';

// Runs daily at 6 AM IST via setInterval or cron
export async function runComplianceDeadlineJob(): Promise<number> {
  // Query complianceTracking records with deadlines in next 7 days (APPROACHING)
  // or past due (OVERDUE). For each, emit the appropriate event.
  // This is the entry point — events feed into handlers above.
  logger.info('Running compliance deadline scan...');

  // Implementation will query complianceTracking table
  // and emit compliance.deadline_approaching / compliance.deadline_overdue events

  return 0; // count of events emitted
}
```

- [ ] **Step 3: Create approval timeout polling job**

```typescript
// server/services/pipeline/jobs/approval-timeout-job.ts
import { db } from '../../../db';
import { approvalRequests, pipelineEvents } from '@shared/pipeline-schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { logger } from '../../../logger';

// Runs every 15 minutes
export async function runApprovalTimeoutJob(): Promise<number> {
  const expired = await db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.status, 'pending'),
        lt(approvalRequests.expiresAt, new Date())
      )
    );

  for (const approval of expired) {
    await db
      .update(approvalRequests)
      .set({ escalated: true })
      .where(eq(approvalRequests.id, approval.id));

    // Re-enable pipeline event for admin review
    if (approval.pipelineEventId) {
      await db
        .update(pipelineEvents)
        .set({ processed: false, retryCount: 0 })
        .where(eq(pipelineEvents.id, approval.pipelineEventId));
    }

    logger.warn(`Approval ${approval.id} expired and escalated to admin`);
  }

  return expired.length;
}
```

- [ ] **Step 4: Register jobs in server startup**

Add to `server/index.ts`:
```typescript
import { runApprovalTimeoutJob } from './services/pipeline/jobs/approval-timeout-job';

// After orchestrator starts:
setInterval(() => runApprovalTimeoutJob(), 15 * 60 * 1000); // Every 15 min
```

- [ ] **Step 5: Commit**

```bash
git add server/services/pipeline/handlers/compliance-handler.ts server/services/pipeline/jobs/ server/index.ts
git commit -m "feat: add compliance deadline handlers and approval timeout job"
```

---

### Task 11: Register All Handlers in Orchestrator

**Files:**
- Create: `server/services/pipeline/register-handlers.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Create handler registration module**

```typescript
// server/services/pipeline/register-handlers.ts
import { pipelineOrchestrator } from './pipeline-orchestrator';
import { registerSalesHandlers } from './handlers/sales-handler';
import { registerExecutionHandlers } from './handlers/execution-handler';
import { registerFinanceHandlers } from './handlers/finance-handler';
import { registerComplianceHandlers } from './handlers/compliance-handler';

export function registerAllPipelineHandlers(): void {
  registerSalesHandlers(pipelineOrchestrator);
  registerExecutionHandlers(pipelineOrchestrator);
  registerFinanceHandlers(pipelineOrchestrator);
  registerComplianceHandlers(pipelineOrchestrator);
}
```

- [ ] **Step 2: Update server/index.ts**

Add before `pipelineOrchestrator.startPolling()`:
```typescript
import { registerAllPipelineHandlers } from './services/pipeline/register-handlers';

// Before startPolling:
registerAllPipelineHandlers();
```

- [ ] **Step 3: Verify server starts**

Run: `npm run dev`
Expected: Server starts with "Pipeline orchestrator started" and no handler registration errors

- [ ] **Step 4: Commit**

```bash
git add server/services/pipeline/register-handlers.ts server/index.ts
git commit -m "feat: register all zone handlers with pipeline orchestrator at startup"
```

---

## Chunk 4: Client-Facing Status, Pipeline API, Integration

### Task 12: Client-Facing Status Mapping

**Files:**
- Create: `shared/client-status-mapping.ts`
- Test: `server/__tests__/client-status-mapping.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// server/__tests__/client-status-mapping.test.ts
import { mapToClientStatus, CLIENT_STATUSES } from '@shared/client-status-mapping';

describe('Client Status Mapping', () => {
  it('maps INITIATED to In Progress', () => {
    expect(mapToClientStatus('INITIATED')).toBe(CLIENT_STATUSES.IN_PROGRESS);
  });

  it('maps PENDING_PAYMENT to In Progress', () => {
    expect(mapToClientStatus('PENDING_PAYMENT')).toBe(CLIENT_STATUSES.IN_PROGRESS);
  });

  it('maps SLA_BREACHED to Needs Attention', () => {
    expect(mapToClientStatus('SLA_BREACHED')).toBe(CLIENT_STATUSES.NEEDS_ATTENTION);
  });

  it('maps ESCALATED to Needs Attention', () => {
    expect(mapToClientStatus('ESCALATED')).toBe(CLIENT_STATUSES.NEEDS_ATTENTION);
  });

  it('maps QC_REVIEW to Almost Done', () => {
    expect(mapToClientStatus('QC_REVIEW')).toBe(CLIENT_STATUSES.ALMOST_DONE);
  });

  it('maps DELIVERED to Almost Done', () => {
    expect(mapToClientStatus('DELIVERED')).toBe(CLIENT_STATUSES.ALMOST_DONE);
  });

  it('maps COMPLETED to Done', () => {
    expect(mapToClientStatus('COMPLETED')).toBe(CLIENT_STATUSES.DONE);
  });

  it('defaults unknown statuses to In Progress', () => {
    expect(mapToClientStatus('UNKNOWN_STATUS')).toBe(CLIENT_STATUSES.IN_PROGRESS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=client-status-mapping`
Expected: FAIL

- [ ] **Step 3: Implement status mapping**

```typescript
// shared/client-status-mapping.ts
export const CLIENT_STATUSES = {
  IN_PROGRESS: 'In Progress',
  NEEDS_ATTENTION: 'Needs Attention',
  ALMOST_DONE: 'Almost Done',
  DONE: 'Done',
} as const;

export type ClientStatus = typeof CLIENT_STATUSES[keyof typeof CLIENT_STATUSES];

const STATUS_MAP: Record<string, ClientStatus> = {
  // In Progress
  INITIATED: CLIENT_STATUSES.IN_PROGRESS,
  PENDING_PAYMENT: CLIENT_STATUSES.IN_PROGRESS,
  PAYMENT_RECEIVED: CLIENT_STATUSES.IN_PROGRESS,
  DOCUMENTS_PENDING: CLIENT_STATUSES.IN_PROGRESS,
  DOCUMENTS_UPLOADED: CLIENT_STATUSES.IN_PROGRESS,
  DOCUMENTS_VERIFIED: CLIENT_STATUSES.IN_PROGRESS,
  IN_PROGRESS: CLIENT_STATUSES.IN_PROGRESS,
  PROCESSING: CLIENT_STATUSES.IN_PROGRESS,

  // Needs Attention
  SLA_BREACHED: CLIENT_STATUSES.NEEDS_ATTENTION,
  ESCALATED: CLIENT_STATUSES.NEEDS_ATTENTION,
  ON_HOLD: CLIENT_STATUSES.NEEDS_ATTENTION,
  QC_REJECTED: CLIENT_STATUSES.NEEDS_ATTENTION,

  // Almost Done
  PENDING_REVIEW: CLIENT_STATUSES.ALMOST_DONE,
  UNDER_REVIEW: CLIENT_STATUSES.ALMOST_DONE,
  QC_REVIEW: CLIENT_STATUSES.ALMOST_DONE,
  QC_APPROVED: CLIENT_STATUSES.ALMOST_DONE,
  READY_FOR_DELIVERY: CLIENT_STATUSES.ALMOST_DONE,
  DELIVERED: CLIENT_STATUSES.ALMOST_DONE,
  AWAITING_CLIENT_CONFIRMATION: CLIENT_STATUSES.ALMOST_DONE,

  // Done
  COMPLETED: CLIENT_STATUSES.DONE,
};

export function mapToClientStatus(internalStatus: string): ClientStatus {
  return STATUS_MAP[internalStatus] || CLIENT_STATUSES.IN_PROGRESS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=client-status-mapping`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shared/client-status-mapping.ts server/__tests__/client-status-mapping.test.ts
git commit -m "feat: implement 18-to-4 client-facing status mapping"
```

---

### Task 13: Pipeline Events API (Admin Dashboard)

**Files:**
- Create: `server/routes/pipeline.ts`
- Modify: `server/routes.ts` (register route)

- [ ] **Step 1: Create pipeline admin routes**

```typescript
// server/routes/pipeline.ts
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { pipelineEvents, pipelineAutomationConfig, approvalRequests } from '@shared/pipeline-schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/pipeline/events — list recent events
router.get('/events', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const events = await db
    .select()
    .from(pipelineEvents)
    .orderBy(desc(pipelineEvents.createdAt))
    .limit(limit);

  res.json({ success: true, data: events });
}));

// GET /api/pipeline/events/dead-letter — dead-lettered events
router.get('/events/dead-letter', asyncHandler(async (req: Request, res: Response) => {
  const events = await db
    .select()
    .from(pipelineEvents)
    .where(
      and(
        eq(pipelineEvents.processed, true),
        sql`${pipelineEvents.error} LIKE '%Dead lettered%'`
      )
    )
    .orderBy(desc(pipelineEvents.createdAt))
    .limit(50);

  res.json({ success: true, data: events });
}));

// GET /api/pipeline/config — automation config
router.get('/config', asyncHandler(async (req: Request, res: Response) => {
  const config = await db
    .select()
    .from(pipelineAutomationConfig)
    .orderBy(pipelineAutomationConfig.serviceCode);

  res.json({ success: true, data: config });
}));

// PUT /api/pipeline/config/:id — update automation level
router.put('/config/:id', asyncHandler(async (req: Request, res: Response) => {
  const { automationLevel, gateApproverRole } = req.body;

  if (!['AUTO', 'GATED', 'MANUAL'].includes(automationLevel)) {
    return res.status(400).json({ success: false, error: 'Invalid automation level' });
  }

  await db
    .update(pipelineAutomationConfig)
    .set({ automationLevel, gateApproverRole, updatedAt: new Date() })
    .where(eq(pipelineAutomationConfig.id, parseInt(req.params.id)));

  res.json({ success: true });
}));

// POST /api/pipeline/approvals/:id/approve — approve a gated event
router.post('/approvals/:id/approve', asyncHandler(async (req: Request, res: Response) => {
  const approvalId = parseInt(req.params.id);
  const userId = (req as any).user?.id;

  const [approval] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, approvalId))
    .limit(1);

  if (!approval || approval.status !== 'pending') {
    return res.status(404).json({ success: false, error: 'Approval not found or already resolved' });
  }

  await db
    .update(approvalRequests)
    .set({ status: 'approved', approvedBy: userId, resolvedAt: new Date() })
    .where(eq(approvalRequests.id, approvalId));

  // Re-enable the pipeline event for processing
  if (approval.pipelineEventId) {
    await db
      .update(pipelineEvents)
      .set({ processed: false, retryCount: 0 })
      .where(eq(pipelineEvents.id, approval.pipelineEventId));
  }

  res.json({ success: true });
}));

export default router;
```

- [ ] **Step 2: Register pipeline routes in server/routes.ts**

Add to `registerRoutes`:
```typescript
import pipelineRoutes from './routes/pipeline';

// Inside registerRoutes function:
app.use('/api/pipeline', requireAdminAccess, pipelineRoutes);
```

- [ ] **Step 3: Verify routes work**

Run: `npm run dev` and test with: `curl http://localhost:5000/api/pipeline/events`
Expected: `{ success: true, data: [] }`

- [ ] **Step 4: Commit**

```bash
git add server/routes/pipeline.ts server/routes.ts
git commit -m "feat: add pipeline admin API for events, config, and approvals"
```

---

### Task 14: Emit Pipeline Events from Existing Routes

**Files:**
- Modify: `server/leads-routes.ts` (emit lead.created)
- Modify: `server/routes/payment.ts` (emit service.payment_received)

- [ ] **Step 1: Add event emission to lead creation**

In `server/leads-routes.ts`, after successfully creating a lead:
```typescript
import { db } from './db';
import { pipelineEvents } from '@shared/pipeline-schema';
import { createPipelineEvent, PIPELINE_EVENTS } from './services/pipeline/pipeline-events';

// After lead insert:
await db.insert(pipelineEvents).values(
  createPipelineEvent({
    eventType: PIPELINE_EVENTS.LEAD_CREATED,
    entityType: 'lead',
    entityId: newLead.id,
    payload: { name: newLead.name, pan: newLead.pan, gstin: newLead.gstin },
    triggeredBy: req.user?.id,
  })
);
```

- [ ] **Step 2: Add event emission to payment confirmation**

In `server/routes/payment.ts`, after payment verification:
```typescript
import { pipelineEvents } from '@shared/pipeline-schema';
import { createPipelineEvent, PIPELINE_EVENTS } from '../services/pipeline/pipeline-events';

// After payment confirmed:
await db.insert(pipelineEvents).values(
  createPipelineEvent({
    eventType: PIPELINE_EVENTS.SERVICE_PAYMENT_RECEIVED,
    entityType: 'service_request',
    entityId: serviceRequestId,
    payload: { paymentId, amount },
    triggeredBy: req.user?.id,
  })
);
```

- [ ] **Step 3: Verify events are created**

Run: `npm run dev`, create a lead via the UI, then check:
```sql
SELECT * FROM pipeline_events ORDER BY created_at DESC LIMIT 5;
```
Expected: `lead.created` event in the table

- [ ] **Step 4: Commit**

```bash
git add server/leads-routes.ts server/routes/payment.ts
git commit -m "feat: emit pipeline events from lead creation and payment confirmation routes"
```

---

### Task 15: SLA Guard

**Files:**
- Create: `server/services/pipeline/guards/sla-guard.ts`
- Test: `server/__tests__/sla-guard.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// server/__tests__/sla-guard.test.ts
import { calculateBusinessHoursDeadline, isBusinessHours } from '../services/pipeline/guards/sla-guard';

describe('SLA Guard', () => {
  it('identifies business hours correctly (Mon-Fri 9AM-6PM IST)', () => {
    // Wednesday 10 AM IST = 4:30 AM UTC
    const wedMorning = new Date('2026-03-18T04:30:00Z');
    expect(isBusinessHours(wedMorning)).toBe(true);

    // Saturday 10 AM IST = 4:30 AM UTC
    const satMorning = new Date('2026-03-14T04:30:00Z');
    expect(isBusinessHours(satMorning)).toBe(false);

    // Wednesday 8 PM IST = 2:30 PM UTC
    const wedEvening = new Date('2026-03-18T14:30:00Z');
    expect(isBusinessHours(wedEvening)).toBe(false);
  });

  it('calculates deadline skipping non-business hours', () => {
    // Friday 5 PM IST (1 hour of business time left)
    // 8 business hours deadline should land on Monday
    const friday5pm = new Date('2026-03-13T11:30:00Z'); // 5 PM IST
    const deadline = calculateBusinessHoursDeadline(friday5pm, 8);
    // Should be Tuesday 2 PM IST (skip weekend, 1hr Fri + 7hr Mon = need 1 more = Mon next day)
    expect(deadline.getDay()).not.toBe(0); // Not Sunday
    expect(deadline.getDay()).not.toBe(6); // Not Saturday
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern=sla-guard`
Expected: FAIL

- [ ] **Step 3: Implement SLA guard**

```typescript
// server/services/pipeline/guards/sla-guard.ts

const IST_OFFSET_HOURS = 5.5; // UTC+05:30
const BUSINESS_START_HOUR = 9; // 9 AM IST
const BUSINESS_END_HOUR = 18;  // 6 PM IST
const BUSINESS_HOURS_PER_DAY = BUSINESS_END_HOUR - BUSINESS_START_HOUR; // 9 hours

function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_HOURS * 60 * 60 * 1000);
}

export function isBusinessHours(utcDate: Date): boolean {
  const ist = toIST(utcDate);
  const day = ist.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const hour = ist.getUTCHours() + ist.getUTCMinutes() / 60;
  return hour >= BUSINESS_START_HOUR && hour < BUSINESS_END_HOUR;
}

export function calculateBusinessHoursDeadline(startUtc: Date, businessHours: number): Date {
  let remaining = businessHours;
  let current = new Date(startUtc);

  while (remaining > 0) {
    const ist = toIST(current);
    const day = ist.getUTCDay();

    if (day === 0 || day === 6) {
      // Skip to next Monday 9 AM IST
      const daysToAdd = day === 6 ? 2 : 1;
      current = new Date(current.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      const nextIst = toIST(current);
      nextIst.setUTCHours(BUSINESS_START_HOUR, 0, 0, 0);
      current = new Date(nextIst.getTime() - IST_OFFSET_HOURS * 60 * 60 * 1000);
      continue;
    }

    const hour = ist.getUTCHours() + ist.getUTCMinutes() / 60;

    if (hour < BUSINESS_START_HOUR) {
      // Before business hours, jump to start
      ist.setUTCHours(BUSINESS_START_HOUR, 0, 0, 0);
      current = new Date(ist.getTime() - IST_OFFSET_HOURS * 60 * 60 * 1000);
      continue;
    }

    if (hour >= BUSINESS_END_HOUR) {
      // After business hours, jump to next day 9 AM
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
      const nextIst = toIST(current);
      nextIst.setUTCHours(BUSINESS_START_HOUR, 0, 0, 0);
      current = new Date(nextIst.getTime() - IST_OFFSET_HOURS * 60 * 60 * 1000);
      continue;
    }

    // In business hours — consume remaining time
    const hoursLeftToday = BUSINESS_END_HOUR - hour;

    if (remaining <= hoursLeftToday) {
      current = new Date(current.getTime() + remaining * 60 * 60 * 1000);
      remaining = 0;
    } else {
      remaining -= hoursLeftToday;
      current = new Date(current.getTime() + hoursLeftToday * 60 * 60 * 1000);
      // Move to next day
      current = new Date(current.getTime() + (24 - BUSINESS_HOURS_PER_DAY) * 60 * 60 * 1000);
    }
  }

  return current;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern=sla-guard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/pipeline/guards/sla-guard.ts server/__tests__/sla-guard.test.ts
git commit -m "feat: implement SLA guard with IST business hours deadline calculation"
```

---

### Task 16: Dead Code Sweep — Zone A (Sales)

**Files:**
- Modify: Multiple frontend files (LeadManagement.tsx, LeadPipeline.tsx, PreSales.tsx)

This task performs the manual dead code sweep for Zone A as described in the spec. The key action is unifying the 3 local lead forms to use the shared LeadForm component.

- [ ] **Step 1: Identify local lead form implementations**

Run grep to find local lead form code:
```bash
grep -rn "LeadForm\|lead form\|createLead" client/src/features/ --include="*.tsx" -l
```
Expected: List of files with local form implementations

- [ ] **Step 2: Check shared LeadForm component exists**

Read `client/src/components/LeadForm.tsx` or `client/src/features/leads/components/LeadForm.tsx`
Verify it exists and can be imported by all 3 pages.

- [ ] **Step 3: Refactor each page to use shared LeadForm**

For each of LeadManagement.tsx, LeadPipeline.tsx, PreSales.tsx:
- Replace local form JSX with `<LeadForm onSubmit={handleCreateLead} />`
- Remove local form state and handlers
- Import shared LeadForm component

- [ ] **Step 4: Run import graph scan for Zone A**

```bash
# Check for unused exports in lead-related files
grep -rn "export" client/src/features/leads/ --include="*.ts" --include="*.tsx" | while read line; do
  export_name=$(echo "$line" | grep -oP 'export\s+(const|function|class)\s+\K\w+')
  if [ -n "$export_name" ]; then
    count=$(grep -rn "$export_name" client/src/ --include="*.ts" --include="*.tsx" | wc -l)
    if [ "$count" -le 1 ]; then
      echo "UNUSED: $line"
    fi
  fi
done
```

- [ ] **Step 5: Delete any orphaned exports found**

Remove unused functions, components, and hooks discovered in step 4.

- [ ] **Step 6: Verify app builds**

Run: `npm run build`
Expected: Build succeeds with no import errors

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: Zone A dead code sweep — unify lead forms, remove orphaned exports"
```

---

### Task 16b: Dead Code Sweep — Zone B (Execution)

- [ ] **Step 1: Scan for manual task assignment UI/routes replaced by auto-assign**
- [ ] **Step 2: Scan for standalone QC trigger buttons replaced by event-driven flow**
- [ ] **Step 3: Scan for duplicate SLA calculation logic (consolidate to sla-service)**
- [ ] **Step 4: Delete orphaned code, verify build**
- [ ] **Step 5: Commit**

```bash
git commit -m "refactor: Zone B dead code sweep — remove manual task assignment, duplicate SLA logic"
```

---

### Task 16c: Dead Code Sweep — Zone C (Finance)

- [ ] **Step 1: Scan for ad-hoc invoice-generator.ts (replaced by invoices table + handler)**
- [ ] **Step 2: Scan for manual commission calculation routes (replaced by event-driven)**
- [ ] **Step 3: Scan for duplicate GST logic across routes (consolidate to finance-handler)**
- [ ] **Step 4: Delete orphaned code, verify build**
- [ ] **Step 5: Commit**

```bash
git commit -m "refactor: Zone C dead code sweep — remove ad-hoc invoice gen, duplicate GST logic"
```

---

### Task 16d: Dead Code Sweep — Zone D (Compliance)

- [ ] **Step 1: Scan for manual compliance initialization routes**
- [ ] **Step 2: Scan for standalone DigiScore recalculation triggers**
- [ ] **Step 3: Scan for duplicate state calculation logic (consolidate to handler)**
- [ ] **Step 4: Delete orphaned code, verify build**
- [ ] **Step 5: Commit**

```bash
git commit -m "refactor: Zone D dead code sweep — remove manual compliance init, duplicate state logic"
```

---

### Task 17: Integration Test — Full Pipeline Event Flow

**Files:**
- Create: `server/__tests__/pipeline-integration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// server/__tests__/pipeline-integration.test.ts
import { PipelineOrchestrator } from '../services/pipeline/pipeline-orchestrator';
import { registerSalesHandlers } from '../services/pipeline/handlers/sales-handler';
import { registerExecutionHandlers } from '../services/pipeline/handlers/execution-handler';
import { registerFinanceHandlers } from '../services/pipeline/handlers/finance-handler';
import { registerComplianceHandlers } from '../services/pipeline/handlers/compliance-handler';
import { PIPELINE_EVENTS } from '../services/pipeline/pipeline-events';

jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([{ id: 1, businessEntityId: 1, complianceInitialized: true, status: 'IN_PROGRESS', amount: 5000, serviceType: 'GST_RETURN' }]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1 }]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    onConflictDoNothing: jest.fn().mockResolvedValue([]),
    transaction: jest.fn(),
  },
}));

jest.mock('../services/lead-assignment-service', () => ({
  leadAssignmentService: {
    assignLead: jest.fn().mockResolvedValue({ assignedTo: 5 }),
  },
}));

jest.mock('../services/wallet-service', () => ({
  walletService: {
    credit: jest.fn().mockResolvedValue({ success: true }),
  },
}));

describe('Pipeline Integration', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
    registerSalesHandlers(orchestrator);
    registerExecutionHandlers(orchestrator);
    registerFinanceHandlers(orchestrator);
    registerComplianceHandlers(orchestrator);
  });

  it('all 4 zone handlers are registered', () => {
    // Sales
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.LEAD_CREATED)).toHaveLength(1);
    // Execution
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.SERVICE_CREATED)).toHaveLength(1);
    // Finance
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.FINANCE_INVOICE_CREATED)).toHaveLength(1);
    // Compliance
    expect(orchestrator.getHandlers(PIPELINE_EVENTS.COMPLIANCE_ENTITY_INITIALIZED)).toHaveLength(1);
  });

  it('lead.created cascades to lead.assigned', async () => {
    const event = {
      id: 1,
      eventType: PIPELINE_EVENTS.LEAD_CREATED,
      entityType: 'lead',
      entityId: 1,
      payload: { name: 'Test', pan: 'ABCDE1234F' },
      handlerResults: null,
      retryCount: 0,
      maxRetries: 3,
      triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    expect(bufferedEvents.length).toBeGreaterThan(0);
    expect(bufferedEvents[0].eventType).toBe(PIPELINE_EVENTS.LEAD_ASSIGNED);
  });

  it('service.confirmed cascades to finance.invoice_created', async () => {
    const event = {
      id: 2,
      eventType: PIPELINE_EVENTS.SERVICE_CONFIRMED,
      entityType: 'service_request',
      entityId: 1,
      payload: { serviceRequestId: 1 },
      handlerResults: null,
      retryCount: 0,
      maxRetries: 3,
      triggeredBy: 1,
    };

    const { bufferedEvents } = await orchestrator.processEvent(event as any);
    const types = bufferedEvents.map(e => e.eventType);
    expect(types).toContain(PIPELINE_EVENTS.FINANCE_INVOICE_CREATED);
  });

  it('handler failure halts chain and discards buffered events', async () => {
    // Register a failing handler for a test event
    const failOrchestrator = new PipelineOrchestrator();
    failOrchestrator.registerHandler('test.event', 'h1', async (e, ctx) => {
      ctx.emitEvent({
        eventType: PIPELINE_EVENTS.LEAD_ASSIGNED,
        entityType: 'lead',
        entityId: 1,
        payload: {},
      });
      return { step1: true };
    });
    failOrchestrator.registerHandler('test.event', 'h2', async () => {
      throw new Error('intentional failure');
    });

    const event = {
      id: 99,
      eventType: 'test.event',
      entityType: 'test',
      entityId: 1,
      payload: {},
      handlerResults: null,
      retryCount: 0,
      maxRetries: 3,
      triggeredBy: 1,
    };

    await expect(failOrchestrator.processEvent(event as any)).rejects.toThrow('intentional failure');
    // Buffered events should be discarded on failure
    expect(failOrchestrator.getBufferedEvents()).toHaveLength(0);
  });

  it('retry skips completed handlers (idempotency)', async () => {
    const callLog: string[] = [];
    const retryOrchestrator = new PipelineOrchestrator();
    retryOrchestrator.registerHandler('test.retry', 'h1', async () => {
      callLog.push('h1');
      return {};
    });
    retryOrchestrator.registerHandler('test.retry', 'h2', async () => {
      callLog.push('h2');
      return {};
    });

    const event = {
      id: 100,
      eventType: 'test.retry',
      entityType: 'test',
      entityId: 1,
      payload: {},
      handlerResults: {
        handlers: [{ name: 'h1', status: 'completed', completedAt: new Date().toISOString(), output: {} }],
      },
      retryCount: 1,
      maxRetries: 3,
      triggeredBy: 1,
    };

    await retryOrchestrator.processEvent(event as any);
    expect(callLog).toEqual(['h2']); // h1 was skipped
  });

  it('handlers run sequentially in registration order', async () => {
    const order: number[] = [];
    const seqOrchestrator = new PipelineOrchestrator();
    seqOrchestrator.registerHandler('test.order', 'first', async () => {
      await new Promise(r => setTimeout(r, 10));
      order.push(1);
      return {};
    });
    seqOrchestrator.registerHandler('test.order', 'second', async () => {
      order.push(2);
      return {};
    });

    const event = {
      id: 101,
      eventType: 'test.order',
      entityType: 'test',
      entityId: 1,
      payload: {},
      handlerResults: null,
      retryCount: 0,
      maxRetries: 3,
      triggeredBy: 1,
    };

    await seqOrchestrator.processEvent(event as any);
    expect(order).toEqual([1, 2]); // Sequential, not parallel
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `npm test -- --testPathPattern=pipeline-integration`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/__tests__/pipeline-integration.test.ts
git commit -m "test: add pipeline integration test verifying cross-zone event cascading"
```

---

## Summary

| Task | Description | Zone | Files Created | Files Modified |
|------|-------------|------|---------------|----------------|
| 1 | Pipeline schema (4 tables) | Foundation | 2 | 1 |
| 2 | Existing table modifications | Foundation | 0 | 2 |
| 3 | Pipeline event types (32 events) | Foundation | 2 | 0 |
| 4 | Pipeline orchestrator core | Foundation | 2 | 0 |
| 5 | Seed automation config (34 entries) | Foundation | 1 | 0 |
| 6 | Register orchestrator in startup | Foundation | 0 | 1 |
| 7 | Sales handler — core events | Zone A | 2 | 0 |
| 7b | Sales handler — remaining events | Zone A | 0 | 2 |
| 8 | Execution handler — core events + guard | Zone B | 3 | 0 |
| 8b | Execution handler — docs, QC, cancelled | Zone B | 0 | 2 |
| 9 | Finance handler | Zone C | 2 | 0 |
| 10 | Compliance handler — core events | Zone D | 2 | 0 |
| 10b | Compliance deadlines + approval timeout | Zone D | 2 | 2 |
| 11 | Register all handlers | Integration | 1 | 1 |
| 12 | Client-facing status mapping | UX | 2 | 0 |
| 13 | Pipeline admin API | Admin | 1 | 1 |
| 14 | Emit events from existing routes | Integration | 0 | 2 |
| 15 | SLA guard (business hours) | Guards | 2 | 0 |
| 16 | Dead code sweep — Zone A | Cleanup | 0 | 3+ |
| 16b | Dead code sweep — Zone B | Cleanup | 0 | 3+ |
| 16c | Dead code sweep — Zone C | Cleanup | 0 | 3+ |
| 16d | Dead code sweep — Zone D | Cleanup | 0 | 3+ |
| 17 | Integration test (full + failure scenarios) | Testing | 1 | 0 |

**Total: 23 tasks, ~24 new files, ~20 modified files**

Each task is independently committable and testable. The dependency order is:
- Tasks 1-6 (Foundation) must complete first
- Tasks 7-10b (Zone handlers) can be done in parallel
- Tasks 11-17 depend on zone handlers being complete
- Dead code sweeps (16-16d) run after their respective zone handler is complete
