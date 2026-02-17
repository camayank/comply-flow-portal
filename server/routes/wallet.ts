/**
 * Wallet & Referral API Routes
 *
 * Endpoints for client wallet management and referral system
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { wallets, walletTransactions, referralCodes, referrals } from '../db/schema/wallet';
import { users } from '@shared/schema';
import { authenticate } from '../middleware/auth';
import crypto from 'crypto';
import { walletService } from '../services/wallet-service';

const router = Router();

// ============================================
// WALLET ENDPOINTS
// ============================================

/**
 * GET /api/wallet
 * Get user's wallet balance and recent transactions
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get or create wallet
    let wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) {
      // Create wallet on first access
      const [newWallet] = await db.insert(wallets)
        .values({ userId })
        .returning();
      wallet = newWallet;
    }

    // Get recent transactions
    const transactions = await db.query.walletTransactions.findMany({
      where: eq(walletTransactions.walletId, wallet.id),
      orderBy: desc(walletTransactions.createdAt),
      limit: 10,
    });

    res.json({
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
      isActive: wallet.isActive,
      isFrozen: wallet.isFrozen,
      dailyLimit: parseFloat(wallet.dailyLimit || '100000'),
      monthlyLimit: parseFloat(wallet.monthlyLimit || '500000'),
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        description: t.description,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

/**
 * GET /api/wallet/transactions
 * Get paginated transaction history
 */
router.get('/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit = '20', offset = '0', type } = req.query;

    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) {
      return res.json({ transactions: [], total: 0 });
    }

    const conditions = [eq(walletTransactions.walletId, wallet.id)];

    if (type && type !== 'all') {
      conditions.push(eq(walletTransactions.type, type as string));
    }

    const transactions = await db.query.walletTransactions.findMany({
      where: and(...conditions),
      orderBy: desc(walletTransactions.createdAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(walletTransactions)
      .where(and(...conditions));

    res.json({
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        balanceAfter: parseFloat(t.balanceAfter),
        description: t.description,
        category: t.category,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        status: t.status,
        createdAt: t.createdAt,
      })),
      total: countResult[0]?.count || 0,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * POST /api/wallet/add-funds (Admin only - for manual credits)
 */
router.post('/add-funds', authenticate, async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;

    // Check if admin
    if (!['admin', 'super_admin'].includes(adminUser.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, amount, description, category = 'manual' } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid userId and amount are required' });
    }

    // Use wallet service for the credit operation
    const result = await walletService.credit(
      userId,
      amount,
      description || 'Manual credit by admin',
      category,
      'manual',
      undefined,
      adminUser.id
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      newBalance: result.newBalance,
      transaction: {
        id: result.transactionId,
        amount,
        type: 'credit',
      },
    });
  } catch (error) {
    console.error('Add funds error:', error);
    res.status(500).json({ error: 'Failed to add funds' });
  }
});

// ============================================
// REFERRAL ENDPOINTS
// ============================================

/**
 * GET /api/referrals/stats
 * Get user's referral statistics
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get or create referral code
    let referralCode = await db.query.referralCodes.findFirst({
      where: eq(referralCodes.userId, userId),
    });

    if (!referralCode) {
      // Generate unique code
      const code = await generateUniqueReferralCode(userId);
      const [newCode] = await db.insert(referralCodes)
        .values({
          userId,
          code,
        })
        .returning();
      referralCode = newCode;
    }

    // Get referral stats
    const allReferrals = await db.query.referrals.findMany({
      where: eq(referrals.referrerId, userId),
    });

    const totalReferrals = allReferrals.length;
    const successfulReferrals = allReferrals.filter(r => r.status === 'rewarded').length;
    const pendingReferrals = allReferrals.filter(r => r.status === 'pending').length;
    const convertedReferrals = allReferrals.filter(r => r.status === 'converted').length;

    // Calculate total earnings
    const totalEarnings = allReferrals
      .filter(r => r.referrerRewardPaidAt)
      .reduce((sum, r) => sum + parseFloat(r.referrerRewardAmount || '0'), 0);

    res.json({
      referralCode: referralCode.code,
      referralLink: `${process.env.APP_URL || 'https://digicomply.in'}/register?ref=${referralCode.code}`,
      isActive: referralCode.isActive,
      stats: {
        totalReferrals,
        successfulReferrals,
        pendingReferrals,
        convertedReferrals,
        totalEarnings,
        rewardPerReferral: parseFloat(referralCode.referrerReward || '500'),
      },
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

/**
 * GET /api/referrals/history
 * Get detailed referral history
 */
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit = '20', offset = '0' } = req.query;

    const referralList = await db.query.referrals.findMany({
      where: eq(referrals.referrerId, userId),
      orderBy: desc(referrals.createdAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      with: {
        referred: {
          columns: { id: true, fullName: true, email: true, createdAt: true },
        },
      },
    });

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    res.json({
      referrals: referralList.map(r => ({
        id: r.id,
        referredUser: {
          name: r.referred?.fullName || 'Unknown',
          email: r.referred?.email ? maskEmail(r.referred.email) : null,
          joinedAt: r.referred?.createdAt,
        },
        status: r.status,
        rewardAmount: r.referrerRewardAmount ? parseFloat(r.referrerRewardAmount) : null,
        rewardPaidAt: r.referrerRewardPaidAt,
        createdAt: r.createdAt,
        convertedAt: r.convertedAt,
      })),
      total: countResult[0]?.count || 0,
    });
  } catch (error) {
    console.error('Get referral history error:', error);
    res.status(500).json({ error: 'Failed to fetch referral history' });
  }
});

/**
 * POST /api/referrals/apply
 * Apply a referral code (called during registration)
 */
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const { code, newUserId } = req.body;

    if (!code || !newUserId) {
      return res.status(400).json({ error: 'Referral code and user ID are required' });
    }

    // Find referral code
    const referralCode = await db.query.referralCodes.findFirst({
      where: and(
        eq(referralCodes.code, code.toUpperCase()),
        eq(referralCodes.isActive, true)
      ),
    });

    if (!referralCode) {
      return res.status(400).json({ error: 'Invalid or inactive referral code' });
    }

    // Check if code hasn't exceeded max uses
    if (referralCode.maxUses && referralCode.currentUses >= referralCode.maxUses) {
      return res.status(400).json({ error: 'Referral code has reached maximum uses' });
    }

    // Check validity period
    if (referralCode.validUntil && new Date() > referralCode.validUntil) {
      return res.status(400).json({ error: 'Referral code has expired' });
    }

    // Prevent self-referral
    if (referralCode.userId === newUserId) {
      return res.status(400).json({ error: 'Cannot use your own referral code' });
    }

    // Check if this user was already referred
    const existingReferral = await db.query.referrals.findFirst({
      where: eq(referrals.referredId, newUserId),
    });

    if (existingReferral) {
      return res.status(400).json({ error: 'User has already been referred' });
    }

    // Create referral record
    const [referral] = await db.insert(referrals).values({
      referralCodeId: referralCode.id,
      referrerId: referralCode.userId,
      referredId: newUserId,
      status: 'pending',
      referrerRewardAmount: referralCode.referrerReward,
      refereeRewardAmount: referralCode.refereeReward,
      referralSource: 'code',
    }).returning();

    // Increment usage count
    await db.update(referralCodes)
      .set({
        currentUses: sql`${referralCodes.currentUses} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(referralCodes.id, referralCode.id));

    res.json({
      success: true,
      message: 'Referral code applied successfully',
      referralId: referral.id,
    });
  } catch (error) {
    console.error('Apply referral error:', error);
    res.status(500).json({ error: 'Failed to apply referral code' });
  }
});

/**
 * POST /api/referrals/convert/:referralId
 * Mark referral as converted (called when user completes qualifying action)
 * Internal use - called by payment/service completion handlers
 */
router.post('/convert/:referralId', authenticate, async (req: Request, res: Response) => {
  try {
    const referralId = parseInt(req.params.referralId);
    const { qualifyingAction } = req.body;

    const referral = await db.query.referrals.findFirst({
      where: and(
        eq(referrals.id, referralId),
        eq(referrals.status, 'pending')
      ),
    });

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found or already processed' });
    }

    // Update referral status
    await db.update(referrals)
      .set({
        status: 'converted',
        convertedAt: new Date(),
        qualifyingAction: qualifyingAction || 'first_payment',
        updatedAt: new Date(),
      })
      .where(eq(referrals.id, referralId));

    // Process rewards (can be done async via queue)
    await processReferralRewards(referralId);

    res.json({
      success: true,
      message: 'Referral converted and rewards processed',
    });
  } catch (error) {
    console.error('Convert referral error:', error);
    res.status(500).json({ error: 'Failed to convert referral' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate unique referral code
 */
async function generateUniqueReferralCode(userId: number): Promise<string> {
  const prefix = 'DC';
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate code: DC + 6 random alphanumeric characters
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `${prefix}${randomPart}`;

    // Check if exists
    const existing = await db.query.referralCodes.findFirst({
      where: eq(referralCodes.code, code),
    });

    if (!existing) {
      return code;
    }

    attempts++;
  }

  // Fallback: include user ID
  return `${prefix}${userId}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

/**
 * Process referral rewards
 */
async function processReferralRewards(referralId: number): Promise<void> {
  const referral = await db.query.referrals.findFirst({
    where: eq(referrals.id, referralId),
  });

  if (!referral || referral.status !== 'converted') {
    return;
  }

  // Credit referrer
  if (referral.referrerRewardAmount && parseFloat(referral.referrerRewardAmount) > 0) {
    await creditWallet(
      referral.referrerId,
      parseFloat(referral.referrerRewardAmount),
      'Referral bonus',
      'referral_bonus',
      'referral',
      referralId
    );

    await db.update(referrals)
      .set({ referrerRewardPaidAt: new Date() })
      .where(eq(referrals.id, referralId));
  }

  // Credit referee
  if (referral.refereeRewardAmount && parseFloat(referral.refereeRewardAmount) > 0) {
    await creditWallet(
      referral.referredId,
      parseFloat(referral.refereeRewardAmount),
      'Welcome bonus from referral',
      'referral_bonus',
      'referral',
      referralId
    );

    await db.update(referrals)
      .set({ refereeRewardPaidAt: new Date() })
      .where(eq(referrals.id, referralId));
  }

  // Update status to rewarded
  await db.update(referrals)
    .set({
      status: 'rewarded',
      updatedAt: new Date(),
    })
    .where(eq(referrals.id, referralId));
}

/**
 * Credit wallet helper - delegates to walletService
 */
async function creditWallet(
  userId: number,
  amount: number,
  description: string,
  category: string,
  referenceType: string,
  referenceId: number
): Promise<void> {
  await walletService.credit(userId, amount, description, category, referenceType, referenceId);
}

/**
 * Mask email for privacy
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

export default router;
