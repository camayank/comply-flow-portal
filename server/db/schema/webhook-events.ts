/**
 * Webhook Events Database Schema
 *
 * Table for tracking webhook events for idempotency and audit purposes.
 * Prevents duplicate processing of payment webhooks (Razorpay, etc.)
 */

import { pgTable, serial, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const webhookEvents = pgTable('webhook_events', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull(),
  eventId: varchar('event_id', { length: 255 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  processedAt: timestamp('processed_at'),
  errorMessage: varchar('error_message', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  providerEventIdx: index('webhook_provider_event_idx').on(table.provider, table.eventId),
  statusIdx: index('webhook_status_idx').on(table.status),
}));

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
