import type { Express } from "express";
import { db } from './db';
import { referralCodes, referrals, walletCredits, walletTransactions, users, businessEntities, payments } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export function registerReferralRoutes(app: Express) {

  // Generate referral code for a client
  app.post('/api/referrals/generate-code', async (req, res) => {
    try {
      const { clientId } = req.body;

      if (!clientId) {
        return res.status(400).json({ error: 'Client ID is required' });
      }

      // Check if client already has a code
      const existing = await db
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.clientId, clientId))
        .limit(1);

      if (existing.length > 0) {
        return res.json(existing[0]);
      }

      // Generate unique code (e.g., LEGAL2024XYZ)
      const code = `LEGAL${new Date().getFullYear()}${nanoid(6).toUpperCase()}`;

      const [newCode] = await db
        .insert(referralCodes)
        .values({
          clientId,
          code,
          isActive: true,
        })
        .returning();

      // Create wallet for client if doesn't exist
      const [existingWallet] = await db
        .select()
        .from(walletCredits)
        .where(eq(walletCredits.clientId, clientId))
        .limit(1);

      if (!existingWallet) {
        await db.insert(walletCredits).values({
          clientId,
          balance: "0.00",
        });
      }

      res.json(newCode);
    } catch (error) {
      console.error('Generate referral code error:', error);
      res.status(500).json({ error: 'Failed to generate referral code' });
    }
  });

  // Track referral click (when someone uses referral link)
  app.post('/api/referrals/track', async (req, res) => {
    try {
      const { code, email } = req.body;

      if (!code || !email) {
        return res.status(400).json({ error: 'Code and email are required' });
      }

      // Verify code exists and is active
      const [referralCode] = await db
        .select()
        .from(referralCodes)
        .where(and(
          eq(referralCodes.code, code),
          eq(referralCodes.isActive, true)
        ))
        .limit(1);

      if (!referralCode) {
        return res.status(404).json({ error: 'Invalid referral code' });
      }

      // Check if this email already used this code
      const [existing] = await db
        .select()
        .from(referrals)
        .where(and(
          eq(referrals.referralCode, code),
          eq(referrals.refereeEmail, email)
        ))
        .limit(1);

      if (existing) {
        return res.json({ message: 'Referral already tracked', referral: existing });
      }

      // Create referral tracking record (expires in 30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const [newReferral] = await db
        .insert(referrals)
        .values({
          referrerId: referralCode.clientId,
          referralCode: code,
          refereeEmail: email,
          status: 'pending',
          creditPercentage: 10, // 10% of first service as credit
          expiresAt,
        })
        .returning();

      // Update code stats
      await db
        .update(referralCodes)
        .set({
          totalReferrals: referralCode.totalReferrals + 1,
        })
        .where(eq(referralCodes.id, referralCode.id));

      res.json({ message: 'Referral tracked successfully', referral: newReferral });
    } catch (error) {
      console.error('Track referral error:', error);
      res.status(500).json({ error: 'Failed to track referral' });
    }
  });

  // Called when referred user registers
  app.post('/api/referrals/register', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Find pending referral for this email
      const [referral] = await db
        .select()
        .from(referrals)
        .where(and(
          eq(referrals.refereeEmail, email),
          eq(referrals.status, 'pending')
        ))
        .limit(1);

      if (referral) {
        // Update referral status
        await db
          .update(referrals)
          .set({
            status: 'registered',
            registeredAt: new Date(),
          })
          .where(eq(referrals.id, referral.id));

        return res.json({ message: 'Referral registration recorded', referral });
      }

      res.json({ message: 'No referral found' });
    } catch (error) {
      console.error('Register referral error:', error);
      res.status(500).json({ error: 'Failed to register referral' });
    }
  });

  // Called when referred user completes onboarding and makes first payment
  app.post('/api/referrals/complete', async (req, res) => {
    try {
      const { clientId, firstServiceAmount } = req.body;

      if (!clientId || !firstServiceAmount) {
        return res.status(400).json({ error: 'Client ID and service amount are required' });
      }

      // Get client's email
      const [client] = await db
        .select()
        .from(users)
        .where(eq(users.id, clientId))
        .limit(1);

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Find referral for this client
      const [referral] = await db
        .select()
        .from(referrals)
        .where(and(
          eq(referrals.refereeEmail, client.email),
          eq(referrals.status, 'registered')
        ))
        .limit(1);

      if (!referral) {
        return res.json({ message: 'No active referral for this client' });
      }

      // Calculate credit amount (10% of first service)
      const creditAmount = (parseFloat(firstServiceAmount) * referral.creditPercentage) / 100;

      // Update referral status
      await db
        .update(referrals)
        .set({
          status: 'onboarded',
          onboardedAt: new Date(),
          refereeClientId: clientId,
          firstServiceAmount: firstServiceAmount.toString(),
          creditAmount: creditAmount.toFixed(2),
        })
        .where(eq(referrals.id, referral.id));

      // Credit the referrer's wallet
      const [referrerWallet] = await db
        .select()
        .from(walletCredits)
        .where(eq(walletCredits.clientId, referral.referrerId))
        .limit(1);

      if (referrerWallet) {
        const newBalance = parseFloat(referrerWallet.balance) + creditAmount;
        const newTotalEarned = parseFloat(referrerWallet.totalEarned) + creditAmount;
        const newReferralEarnings = parseFloat(referrerWallet.totalReferralEarnings) + creditAmount;

        await db
          .update(walletCredits)
          .set({
            balance: newBalance.toFixed(2),
            totalEarned: newTotalEarned.toFixed(2),
            totalReferralEarnings: newReferralEarnings.toFixed(2),
            lifetimeReferrals: referrerWallet.lifetimeReferrals + 1,
            updatedAt: new Date(),
          })
          .where(eq(walletCredits.id, referrerWallet.id));

        // Record transaction
        await db.insert(walletTransactions).values({
          clientId: referral.referrerId,
          type: 'credit_referral',
          amount: creditAmount.toFixed(2),
          balanceBefore: referrerWallet.balance,
          balanceAfter: newBalance.toFixed(2),
          description: `Referral credit from ${client.email}`,
          relatedReferralId: referral.id,
        });

        // Update referral as credited
        await db
          .update(referrals)
          .set({
            status: 'credited',
            isCredited: true,
            creditedAt: new Date(),
          })
          .where(eq(referrals.id, referral.id));

        // Update referral code stats
        await db
          .update(referralCodes)
          .set({
            successfulReferrals: referralCode.successfulReferrals + 1,
            totalCreditsEarned: (parseFloat(referralCode.totalCreditsEarned) + creditAmount).toFixed(2),
          })
          .where(eq(referralCodes.code, referral.referralCode));

        res.json({
          message: 'Referral completed and credited',
          creditAmount: creditAmount.toFixed(2),
          newBalance: newBalance.toFixed(2),
        });
      } else {
        res.status(404).json({ error: 'Referrer wallet not found' });
      }
    } catch (error) {
      console.error('Complete referral error:', error);
      res.status(500).json({ error: 'Failed to complete referral' });
    }
  });

  // Get client's referral code and stats
  app.get('/api/referrals/my-code/:clientId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);

      const [code] = await db
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.clientId, clientId))
        .limit(1);

      if (!code) {
        return res.status(404).json({ error: 'No referral code found' });
      }

      // Get referral stats
      const referralsList = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referrerId, clientId))
        .orderBy(desc(referrals.referredAt));

      res.json({
        code: code.code,
        stats: {
          totalReferrals: code.totalReferrals,
          successfulReferrals: code.successfulReferrals,
          totalCreditsEarned: code.totalCreditsEarned,
        },
        referrals: referralsList,
      });
    } catch (error) {
      console.error('Get referral code error:', error);
      res.status(500).json({ error: 'Failed to fetch referral code' });
    }
  });

  // Get wallet balance and transaction history
  app.get('/api/wallet/:clientId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);

      const [wallet] = await db
        .select()
        .from(walletCredits)
        .where(eq(walletCredits.clientId, clientId))
        .limit(1);

      if (!wallet) {
        // Create wallet if doesn't exist
        const [newWallet] = await db
          .insert(walletCredits)
          .values({ clientId, balance: "0.00" })
          .returning();

        return res.json({
          wallet: newWallet,
          transactions: [],
        });
      }

      // Get transaction history
      const transactions = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.clientId, clientId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(50);

      res.json({
        wallet,
        transactions,
      });
    } catch (error) {
      console.error('Get wallet error:', error);
      res.status(500).json({ error: 'Failed to fetch wallet' });
    }
  });

  // Apply wallet credit to service payment
  app.post('/api/wallet/apply-credit', async (req, res) => {
    try {
      const { clientId, serviceRequestId, amount } = req.body;

      if (!clientId || !serviceRequestId || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const [wallet] = await db
        .select()
        .from(walletCredits)
        .where(eq(walletCredits.clientId, clientId))
        .limit(1);

      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const currentBalance = parseFloat(wallet.balance);
      const requestedAmount = parseFloat(amount);

      if (currentBalance < requestedAmount) {
        return res.status(400).json({ 
          error: 'Insufficient wallet balance',
          available: currentBalance,
          requested: requestedAmount,
        });
      }

      // Deduct from wallet
      const newBalance = currentBalance - requestedAmount;
      const newTotalSpent = parseFloat(wallet.totalSpent) + requestedAmount;

      await db
        .update(walletCredits)
        .set({
          balance: newBalance.toFixed(2),
          totalSpent: newTotalSpent.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(walletCredits.id, wallet.id));

      // Record transaction
      await db.insert(walletTransactions).values({
        clientId,
        type: 'debit_service',
        amount: requestedAmount.toFixed(2),
        balanceBefore: wallet.balance,
        balanceAfter: newBalance.toFixed(2),
        description: `Applied to service request #${serviceRequestId}`,
        relatedServiceRequestId: serviceRequestId,
      });

      res.json({
        message: 'Credit applied successfully',
        amountApplied: requestedAmount.toFixed(2),
        newBalance: newBalance.toFixed(2),
      });
    } catch (error) {
      console.error('Apply credit error:', error);
      res.status(500).json({ error: 'Failed to apply credit' });
    }
  });

  console.log('✅ Referral & Wallet Credit routes registered');
}
