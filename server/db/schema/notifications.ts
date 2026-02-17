/**
 * Notifications Database Schema
 *
 * Tables for notification delivery, preferences, and OTP management
 */

import { pgTable, serial, integer, varchar, text, boolean, timestamp, jsonb, time, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// ============================================
// NOTIFICATIONS TABLE
// ============================================
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(), // otp, welcome, status_update, reminder, alert
  channel: varchar('channel', { length: 20 }).notNull(), // email, sms, whatsapp, push, in_app
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, sent, delivered, failed, read

  // Content
  subject: varchar('subject', { length: 255 }),
  content: text('content'),
  payload: jsonb('payload'), // Additional data for templates

  // Delivery tracking
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  failureReason: text('failure_reason'),
  retryCount: integer('retry_count').default(0),

  // Reference to what triggered this notification
  referenceType: varchar('reference_type', { length: 50 }), // service_request, payment, compliance
  referenceId: integer('reference_id'),

  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_notifications_user_id').on(table.userId),
  statusIdx: index('idx_notifications_status').on(table.status),
  typeIdx: index('idx_notifications_type').on(table.type),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
}));

// ============================================
// NOTIFICATION PREFERENCES TABLE
// ============================================
export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique().notNull(),

  // Channel preferences
  emailEnabled: boolean('email_enabled').default(true),
  smsEnabled: boolean('sms_enabled').default(true),
  pushEnabled: boolean('push_enabled').default(false),
  whatsappEnabled: boolean('whatsapp_enabled').default(false),
  inAppEnabled: boolean('in_app_enabled').default(true),

  // Quiet hours
  quietHoursEnabled: boolean('quiet_hours_enabled').default(false),
  quietHoursStart: time('quiet_hours_start'),
  quietHoursEnd: time('quiet_hours_end'),
  quietHoursTimezone: varchar('quiet_hours_timezone', { length: 50 }).default('Asia/Kolkata'),

  // Category preferences (which types of notifications to receive)
  categories: jsonb('categories').default({
    serviceUpdates: true,
    complianceReminders: true,
    paymentAlerts: true,
    marketing: false,
    systemAlerts: true,
  }),

  // Frequency settings
  digestEnabled: boolean('digest_enabled').default(false),
  digestFrequency: varchar('digest_frequency', { length: 20 }).default('daily'), // daily, weekly

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// OTP CODES TABLE
// ============================================
export const otpCodes = pgTable('otp_codes', {
  id: serial('id').primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(), // email or phone
  purpose: varchar('purpose', { length: 50 }).notNull(), // registration, login, password_reset, verification, transaction
  codeHash: varchar('code_hash', { length: 255 }).notNull(), // bcrypt hashed OTP

  // Tracking
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  isUsed: boolean('is_used').default(false),
  usedAt: timestamp('used_at'),
  expiresAt: timestamp('expires_at').notNull(),

  // Security metadata
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  identifierPurposeIdx: index('idx_otp_identifier_purpose').on(table.identifier, table.purpose),
  expiresAtIdx: index('idx_otp_expires_at').on(table.expiresAt),
}));

// ============================================
// PUSH NOTIFICATION TOKENS TABLE
// ============================================
export const pushTokens = pgTable('push_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  token: varchar('token', { length: 500 }).notNull(),
  platform: varchar('platform', { length: 20 }).notNull(), // ios, android, web
  deviceId: varchar('device_id', { length: 255 }),
  deviceName: varchar('device_name', { length: 255 }),
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_push_tokens_user_id').on(table.userId),
  tokenIdx: index('idx_push_tokens_token').on(table.token),
}));

// Type exports
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
export type OTPCode = typeof otpCodes.$inferSelect;
export type NewOTPCode = typeof otpCodes.$inferInsert;
export type PushToken = typeof pushTokens.$inferSelect;
export type NewPushToken = typeof pushTokens.$inferInsert;
