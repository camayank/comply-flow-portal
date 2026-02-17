/**
 * Messaging System Database Schema
 *
 * Tables for message threads, messages, and participants
 */

import { pgTable, serial, integer, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// ============================================
// MESSAGE THREADS TABLE
// ============================================
export const messageThreads = pgTable('message_threads', {
  id: serial('id').primaryKey(),

  // Thread info
  subject: varchar('subject', { length: 255 }),
  type: varchar('type', { length: 30 }).notNull(), // support, internal, client_communication, service_discussion
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent

  // Related entity
  entityType: varchar('entity_type', { length: 50 }), // service_request, lead, client, ticket
  entityId: integer('entity_id'),

  // Status
  status: varchar('status', { length: 20 }).default('active'), // active, archived, closed, resolved

  // Metadata
  createdBy: integer('created_by').references(() => users.id).notNull(),
  lastMessageAt: timestamp('last_message_at'),
  messageCount: integer('message_count').default(0),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  typeIdx: index('idx_message_threads_type').on(table.type),
  statusIdx: index('idx_message_threads_status').on(table.status),
  entityIdx: index('idx_message_threads_entity').on(table.entityType, table.entityId),
  lastMessageAtIdx: index('idx_message_threads_last_message').on(table.lastMessageAt),
}));

// ============================================
// MESSAGE THREAD PARTICIPANTS TABLE
// ============================================
export const messageThreadParticipants = pgTable('message_thread_participants', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').references(() => messageThreads.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),

  // Role in thread
  role: varchar('role', { length: 20 }).default('member'), // owner, admin, member

  // Read tracking
  lastReadAt: timestamp('last_read_at'),
  lastReadMessageId: integer('last_read_message_id'),

  // User preferences for this thread
  isArchived: boolean('is_archived').default(false),
  isMuted: boolean('is_muted').default(false),
  isPinned: boolean('is_pinned').default(false),

  // Notification settings
  notifyOnMessage: boolean('notify_on_message').default(true),

  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at'),
}, (table) => ({
  threadUserIdx: index('idx_thread_participants_thread_user').on(table.threadId, table.userId),
  userIdIdx: index('idx_thread_participants_user_id').on(table.userId),
}));

// ============================================
// MESSAGES TABLE
// ============================================
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').references(() => messageThreads.id).notNull(),
  senderId: integer('sender_id').references(() => users.id).notNull(),

  // Content
  content: text('content').notNull(),
  contentType: varchar('content_type', { length: 20 }).default('text'), // text, html, markdown

  // Attachments
  attachments: jsonb('attachments').default([]), // [{id, name, url, type, size}]

  // Reply to
  replyToId: integer('reply_to_id'),

  // Edit tracking
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at'),
  originalContent: text('original_content'),

  // Status
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  deletedBy: integer('deleted_by').references(() => users.id),

  // Metadata
  metadata: jsonb('metadata'), // For system messages, mentions, etc.

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  threadIdIdx: index('idx_messages_thread_id').on(table.threadId),
  senderIdIdx: index('idx_messages_sender_id').on(table.senderId),
  createdAtIdx: index('idx_messages_created_at').on(table.createdAt),
}));

// ============================================
// MESSAGE READ RECEIPTS TABLE
// ============================================
export const messageReadReceipts = pgTable('message_read_receipts', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').references(() => messages.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  readAt: timestamp('read_at').defaultNow(),
}, (table) => ({
  messageUserIdx: index('idx_read_receipts_message_user').on(table.messageId, table.userId),
}));

// ============================================
// MESSAGE REACTIONS TABLE (Optional)
// ============================================
export const messageReactions = pgTable('message_reactions', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').references(() => messages.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  reaction: varchar('reaction', { length: 20 }).notNull(), // emoji code
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  messageUserIdx: index('idx_reactions_message_user').on(table.messageId, table.userId),
}));

// Type exports
export type MessageThread = typeof messageThreads.$inferSelect;
export type NewMessageThread = typeof messageThreads.$inferInsert;
export type MessageThreadParticipant = typeof messageThreadParticipants.$inferSelect;
export type NewMessageThreadParticipant = typeof messageThreadParticipants.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageReadReceipt = typeof messageReadReceipts.$inferSelect;
export type MessageReaction = typeof messageReactions.$inferSelect;
