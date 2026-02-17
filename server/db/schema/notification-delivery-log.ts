/**
 * Notification Delivery Log Schema
 *
 * Tracks notification delivery status per channel (email, SMS, push, WhatsApp).
 * Stores delivery attempts, provider message IDs, and error details.
 */

import { pgTable, serial, integer, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { notifications } from './notifications';

export const notificationDeliveryLog = pgTable('notification_delivery_log', {
  id: serial('id').primaryKey(),
  notificationId: integer('notification_id').references(() => notifications.id),
  channel: varchar('channel', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  deliveredAt: timestamp('delivered_at'),
  errorMessage: varchar('error_message', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  notificationIdx: index('delivery_notification_idx').on(table.notificationId),
  statusIdx: index('delivery_status_idx').on(table.status),
  channelStatusIdx: index('delivery_channel_status_idx').on(table.channel, table.status),
}));

export type NotificationDeliveryLog = typeof notificationDeliveryLog.$inferSelect;
export type NewNotificationDeliveryLog = typeof notificationDeliveryLog.$inferInsert;
