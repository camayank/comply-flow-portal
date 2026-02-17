/**
 * Wallet & Referral System Database Schema
 *
 * Tables for client wallet, transactions, and referral tracking
 */

import { pgTable, serial, integer, varchar, text, boolean, timestamp, decimal, index, unique } from 'drizzle-orm/pg-core';
import { users } from '@shared/schema';

// ============================================
// WALLETS TABLE
// ============================================
export const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique().notNull(),

  // Balance
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0').notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),

  // Status
  isActive: boolean('is_active').default(true),
  isFrozen: boolean('is_frozen').default(false),
  frozenReason: text('frozen_reason'),
  frozenAt: timestamp('frozen_at'),

  // Limits
  dailyLimit: decimal('daily_limit', { precision: 12, scale: 2 }).default('100000'),
  monthlyLimit: decimal('monthly_limit', { precision: 12, scale: 2 }).default('500000'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// WALLET TRANSACTIONS TABLE
// ============================================
export const walletTransactions = pgTable('wallet_transactions', {
  id: serial('id').primaryKey(),
  walletId: integer('wallet_id').references(() => wallets.id).notNull(),

  // Transaction details
  type: varchar('type', { length: 20 }).notNull(), // credit, debit, refund, referral_bonus, cashback
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 12, scale: 2 }).notNull(),

  // Description
  description: text('description'),
  category: varchar('category', { length: 50 }), // service_payment, refund, bonus, withdrawal

  // Reference to source
  referenceType: varchar('reference_type', { length: 50 }), // payment, service_request, referral, manual
  referenceId: integer('reference_id'),

  // Status
  status: varchar('status', { length: 20 }).default('completed'), // pending, completed, failed, reversed

  // Metadata
  metadata: text('metadata'), // JSON string for additional info
  processedBy: integer('processed_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  walletIdIdx: index('idx_wallet_transactions_wallet_id').on(table.walletId),
  typeIdx: index('idx_wallet_transactions_type').on(table.type),
  createdAtIdx: index('idx_wallet_transactions_created_at').on(table.createdAt),
}));

// ============================================
// REFERRAL CODES TABLE
// ============================================
export const referralCodes = pgTable('referral_codes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique().notNull(),

  // Code
  code: varchar('code', { length: 20 }).unique().notNull(),

  // Settings
  isActive: boolean('is_active').default(true),
  maxUses: integer('max_uses'), // null = unlimited
  currentUses: integer('current_uses').default(0),

  // Reward settings (can be customized per user)
  referrerReward: decimal('referrer_reward', { precision: 10, scale: 2 }).default('500'),
  refereeReward: decimal('referee_reward', { precision: 10, scale: 2 }).default('250'),
  rewardType: varchar('reward_type', { length: 20 }).default('wallet_credit'), // wallet_credit, discount, service_credit

  // Validity
  validFrom: timestamp('valid_from').defaultNow(),
  validUntil: timestamp('valid_until'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================
// REFERRALS TABLE
// ============================================
export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referralCodeId: integer('referral_code_id').references(() => referralCodes.id).notNull(),
  referrerId: integer('referrer_id').references(() => users.id).notNull(),
  referredId: integer('referred_id').references(() => users.id).notNull(),

  // Status
  status: varchar('status', { length: 20 }).default('pending'), // pending, converted, rewarded, expired, cancelled

  // Conversion tracking
  convertedAt: timestamp('converted_at'), // When referred user completed qualifying action
  qualifyingAction: varchar('qualifying_action', { length: 50 }), // first_payment, first_service, registration

  // Rewards
  referrerRewardAmount: decimal('referrer_reward_amount', { precision: 10, scale: 2 }),
  refereeRewardAmount: decimal('referee_reward_amount', { precision: 10, scale: 2 }),
  referrerRewardPaidAt: timestamp('referrer_reward_paid_at'),
  refereeRewardPaidAt: timestamp('referee_reward_paid_at'),
  referrerTransactionId: integer('referrer_transaction_id').references(() => walletTransactions.id),
  refereeTransactionId: integer('referee_transaction_id').references(() => walletTransactions.id),

  // Metadata
  referralSource: varchar('referral_source', { length: 50 }), // link, email, whatsapp, manual
  ipAddress: varchar('ip_address', { length: 45 }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  referrerIdIdx: index('idx_referrals_referrer_id').on(table.referrerId),
  referredIdIdx: index('idx_referrals_referred_id').on(table.referredId),
  statusIdx: index('idx_referrals_status').on(table.status),
  uniqueReferral: unique('unique_referral').on(table.referrerId, table.referredId),
}));

// Type exports
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type NewWalletTransaction = typeof walletTransactions.$inferInsert;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type NewReferralCode = typeof referralCodes.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;
