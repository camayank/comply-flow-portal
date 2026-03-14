import { pgTable, serial, integer, varchar, text, boolean, timestamp, jsonb, index, unique, decimal, date } from 'drizzle-orm/pg-core';
import { users, businessEntities, serviceRequests, payments } from './schema';

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
  paymentId: integer('payment_id').references(() => payments.id),
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
  automationLevel: varchar('automation_level', { length: 10 }).notNull(),
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
