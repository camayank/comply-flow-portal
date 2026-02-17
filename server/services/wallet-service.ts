/**
 * Wallet Service
 *
 * Business logic for wallet operations - credit, debit, balance, transactions
 */

import { db } from '../db';
import { wallets, walletTransactions } from '../db/schema/wallet';
import { eq, desc, and, sql } from 'drizzle-orm';
import { logger } from '../logger';

interface TransactionResult {
  success: boolean;
  transactionId?: number;
  newBalance?: number;
  error?: string;
}

interface TransactionOptions {
  limit?: number;
  offset?: number;
  type?: string;
}

class WalletService {
  /**
   * Get or create wallet for user
   */
  async getOrCreateWallet(userId: number) {
    let wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) {
      [wallet] = await db.insert(wallets)
        .values({ userId })
        .returning();
      logger.info(`Wallet created for user ${userId}`);
    }

    return wallet;
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: number): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return parseFloat(wallet.balance);
  }

  /**
   * Credit amount to wallet
   */
  async credit(
    userId: number,
    amount: number,
    description: string,
    category: string = 'credit',
    referenceType?: string,
    referenceId?: number,
    processedBy?: number
  ): Promise<TransactionResult> {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.isFrozen) {
        return { success: false, error: 'Wallet is frozen' };
      }

      const currentBalance = parseFloat(wallet.balance);
      const newBalance = currentBalance + amount;

      // Update wallet balance
      await db.update(wallets)
        .set({
          balance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      // Create transaction record
      const [transaction] = await db.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'credit',
        amount: amount.toFixed(2),
        balanceBefore: currentBalance.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        description,
        category,
        referenceType,
        referenceId,
        status: 'completed',
        processedBy,
      }).returning();

      logger.info(`Wallet credit: user ${userId} +${amount} (${category})`);

      return {
        success: true,
        transactionId: transaction.id,
        newBalance,
      };

    } catch (error: any) {
      logger.error('Wallet credit error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Debit amount from wallet
   */
  async debit(
    userId: number,
    amount: number,
    description: string,
    category: string = 'debit',
    referenceType?: string,
    referenceId?: number
  ): Promise<TransactionResult> {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.isFrozen) {
        return { success: false, error: 'Wallet is frozen' };
      }

      const currentBalance = parseFloat(wallet.balance);
      if (currentBalance < amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      const newBalance = currentBalance - amount;

      // Update wallet balance
      await db.update(wallets)
        .set({
          balance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      // Create transaction record
      const [transaction] = await db.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'debit',
        amount: (-amount).toFixed(2),
        balanceBefore: currentBalance.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        description,
        category,
        referenceType,
        referenceId,
        status: 'completed',
      }).returning();

      logger.info(`Wallet debit: user ${userId} -${amount}`);

      return {
        success: true,
        transactionId: transaction.id,
        newBalance,
      };

    } catch (error: any) {
      logger.error('Wallet debit error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(userId: number, options: TransactionOptions = {}) {
    const wallet = await this.getOrCreateWallet(userId);
    const { limit = 50, offset = 0, type } = options;

    const conditions = [eq(walletTransactions.walletId, wallet.id)];
    if (type && type !== 'all') {
      conditions.push(eq(walletTransactions.type, type as any));
    }

    const transactions = await db.query.walletTransactions.findMany({
      where: and(...conditions),
      orderBy: [desc(walletTransactions.createdAt)],
      limit,
      offset,
    });

    return transactions;
  }

  /**
   * Get transaction count
   */
  async getTransactionCount(userId: number, type?: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);

    const conditions = [eq(walletTransactions.walletId, wallet.id)];
    if (type && type !== 'all') {
      conditions.push(eq(walletTransactions.type, type as any));
    }

    const result = await db.select({ count: sql<number>`count(*)` })
      .from(walletTransactions)
      .where(and(...conditions));

    return result[0]?.count || 0;
  }

  /**
   * Freeze/unfreeze wallet
   */
  async setFrozen(userId: number, frozen: boolean): Promise<boolean> {
    const wallet = await this.getOrCreateWallet(userId);

    await db.update(wallets)
      .set({ isFrozen: frozen, updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id));

    logger.info(`Wallet ${frozen ? 'frozen' : 'unfrozen'} for user ${userId}`);
    return true;
  }

  /**
   * Check if wallet can perform transaction
   */
  async canTransact(userId: number, amount?: number): Promise<{ allowed: boolean; reason?: string }> {
    const wallet = await this.getOrCreateWallet(userId);

    if (!wallet.isActive) {
      return { allowed: false, reason: 'Wallet is inactive' };
    }

    if (wallet.isFrozen) {
      return { allowed: false, reason: 'Wallet is frozen' };
    }

    if (amount && parseFloat(wallet.balance) < amount) {
      return { allowed: false, reason: 'Insufficient balance' };
    }

    return { allowed: true };
  }
}

export const walletService = new WalletService();
