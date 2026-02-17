/**
 * Commission Service
 *
 * Handles tier-based commission calculation and payout processing
 */
import { db } from '../db';
import { eq, and, desc, gte, lte, isNull, or, sql } from 'drizzle-orm';
import { commissionRules, commissionPayouts, PAYOUT_STATUS } from '@shared/super-admin-schema';
import { users, agents, serviceRequests, salesProposals } from '@shared/schema';
import { walletService } from './wallet-service';
import { logger } from '../logger';

// Types
interface CommissionRule {
  id: number;
  name: string;
  agentTier: string | null;
  serviceCategory: string | null;
  serviceId: number | null;
  basePercentage: string;
  volumeBonuses: Array<{ threshold: number; bonusPercentage: number }> | null;
  clawbackRules: Record<string, any> | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
}

interface CommissionCalculation {
  baseCommission: number;
  volumeBonus: number;
  totalCommission: number;
  appliedRule: CommissionRule | null;
  breakdown: {
    saleAmount: number;
    basePercentage: number;
    volumeBonusPercentage: number;
    agentTier: string;
  };
}

interface AgentSales {
  agentId: number;
  agentName: string;
  agentTier: string;
  totalSales: number;
  totalCommission: number;
  periodSales: Array<{
    serviceRequestId?: number;
    proposalId?: number;
    amount: number;
    date: Date;
  }>;
}

interface PayoutProcessResult {
  success: boolean;
  payoutId?: number;
  walletTransactionId?: number;
  error?: string;
}

class CommissionService {
  /**
   * Calculate commission for a single sale
   */
  async calculateCommission(
    agentId: number,
    saleAmount: number,
    serviceCategory?: string,
    serviceId?: number
  ): Promise<CommissionCalculation> {
    // Get agent info and tier
    const [agent] = await db
      .select({
        id: users.id,
        tier: agents.tier,
      })
      .from(users)
      .leftJoin(agents, eq(agents.userId, users.id))
      .where(eq(users.id, agentId))
      .limit(1);

    const agentTier = agent?.tier || 'silver';

    // Find applicable commission rule
    const rule = await this.findApplicableRule(agentTier, serviceCategory, serviceId);

    if (!rule) {
      // Default commission if no rule found
      return {
        baseCommission: saleAmount * 0.05, // 5% default
        volumeBonus: 0,
        totalCommission: saleAmount * 0.05,
        appliedRule: null,
        breakdown: {
          saleAmount,
          basePercentage: 5,
          volumeBonusPercentage: 0,
          agentTier,
        },
      };
    }

    // Calculate base commission
    const basePercentage = parseFloat(rule.basePercentage) / 100;
    const baseCommission = saleAmount * basePercentage;

    // Calculate volume bonus if applicable
    let volumeBonus = 0;
    let volumeBonusPercentage = 0;

    if (rule.volumeBonuses && rule.volumeBonuses.length > 0) {
      // Get agent's total sales for current period (month)
      const periodSales = await this.getAgentPeriodSales(agentId);
      const totalSalesWithCurrent = periodSales + saleAmount;

      // Find highest applicable bonus tier
      const sortedBonuses = [...rule.volumeBonuses].sort((a, b) => b.threshold - a.threshold);
      for (const bonus of sortedBonuses) {
        if (totalSalesWithCurrent >= bonus.threshold) {
          volumeBonusPercentage = bonus.bonusPercentage;
          volumeBonus = saleAmount * (bonus.bonusPercentage / 100);
          break;
        }
      }
    }

    const totalCommission = baseCommission + volumeBonus;

    return {
      baseCommission,
      volumeBonus,
      totalCommission,
      appliedRule: rule,
      breakdown: {
        saleAmount,
        basePercentage: parseFloat(rule.basePercentage),
        volumeBonusPercentage,
        agentTier,
      },
    };
  }

  /**
   * Find the most specific applicable commission rule
   */
  private async findApplicableRule(
    agentTier: string,
    serviceCategory?: string,
    serviceId?: number
  ): Promise<CommissionRule | null> {
    const now = new Date();

    // Try to find most specific rule first (serviceId match)
    if (serviceId) {
      const [serviceRule] = await db
        .select()
        .from(commissionRules)
        .where(
          and(
            eq(commissionRules.isActive, true),
            eq(commissionRules.serviceId, serviceId),
            or(
              eq(commissionRules.agentTier, agentTier),
              isNull(commissionRules.agentTier)
            ),
            lte(commissionRules.effectiveFrom, now),
            or(
              gte(commissionRules.effectiveTo, now),
              isNull(commissionRules.effectiveTo)
            )
          )
        )
        .orderBy(desc(commissionRules.agentTier)) // Prefer tier-specific rules
        .limit(1);

      if (serviceRule) return serviceRule as CommissionRule;
    }

    // Try category match
    if (serviceCategory) {
      const [categoryRule] = await db
        .select()
        .from(commissionRules)
        .where(
          and(
            eq(commissionRules.isActive, true),
            eq(commissionRules.serviceCategory, serviceCategory),
            isNull(commissionRules.serviceId),
            or(
              eq(commissionRules.agentTier, agentTier),
              isNull(commissionRules.agentTier)
            ),
            lte(commissionRules.effectiveFrom, now),
            or(
              gte(commissionRules.effectiveTo, now),
              isNull(commissionRules.effectiveTo)
            )
          )
        )
        .orderBy(desc(commissionRules.agentTier))
        .limit(1);

      if (categoryRule) return categoryRule as CommissionRule;
    }

    // Fall back to tier-only rule
    const [tierRule] = await db
      .select()
      .from(commissionRules)
      .where(
        and(
          eq(commissionRules.isActive, true),
          isNull(commissionRules.serviceCategory),
          isNull(commissionRules.serviceId),
          or(
            eq(commissionRules.agentTier, agentTier),
            isNull(commissionRules.agentTier)
          ),
          lte(commissionRules.effectiveFrom, now),
          or(
            gte(commissionRules.effectiveTo, now),
            isNull(commissionRules.effectiveTo)
          )
        )
      )
      .orderBy(desc(commissionRules.agentTier))
      .limit(1);

    return tierRule ? (tierRule as CommissionRule) : null;
  }

  /**
   * Get agent's total sales for current period (month)
   */
  private async getAgentPeriodSales(agentId: number): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Sum from converted proposals
    const [proposalSum] = await db
      .select({
        total: sql<string>`COALESCE(SUM(proposal_amount), 0)`,
      })
      .from(salesProposals)
      .where(
        and(
          eq(salesProposals.salesExecutive, String(agentId)),
          eq(salesProposals.proposalStatus, 'converted'),
          gte(salesProposals.createdAt, monthStart)
        )
      );

    return parseFloat(proposalSum?.total || '0');
  }

  /**
   * Get all agents' sales summary for a period
   */
  async getAgentsSalesSummary(periodStart: Date, periodEnd: Date): Promise<AgentSales[]> {
    // Get agents with converted proposals in period
    const agentProposals = await db
      .select({
        agentId: sql<number>`CAST(${salesProposals.salesExecutive} AS INTEGER)`,
        totalSales: sql<string>`COALESCE(SUM(${salesProposals.proposalAmount}), 0)`,
        proposalCount: sql<number>`COUNT(*)`,
      })
      .from(salesProposals)
      .where(
        and(
          eq(salesProposals.proposalStatus, 'converted'),
          gte(salesProposals.createdAt, periodStart),
          lte(salesProposals.createdAt, periodEnd)
        )
      )
      .groupBy(salesProposals.salesExecutive);

    const result: AgentSales[] = [];

    for (const ap of agentProposals) {
      if (!ap.agentId) continue;

      const [agent] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          tier: agents.tier,
        })
        .from(users)
        .leftJoin(agents, eq(agents.userId, users.id))
        .where(eq(users.id, ap.agentId))
        .limit(1);

      if (!agent) continue;

      const totalSales = parseFloat(ap.totalSales || '0');

      // Calculate commission for this agent
      const commission = await this.calculateCommission(
        ap.agentId,
        totalSales
      );

      result.push({
        agentId: ap.agentId,
        agentName: agent.fullName || `Agent ${ap.agentId}`,
        agentTier: agent.tier || 'silver',
        totalSales,
        totalCommission: commission.totalCommission,
        periodSales: [],
      });
    }

    return result;
  }

  /**
   * Generate payout for an agent
   */
  async generatePayout(
    agentId: number,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ payoutId: number; amount: number }> {
    // Get agent's sales in period
    const [salesSum] = await db
      .select({
        total: sql<string>`COALESCE(SUM(proposal_amount), 0)`,
      })
      .from(salesProposals)
      .where(
        and(
          eq(salesProposals.salesExecutive, String(agentId)),
          eq(salesProposals.proposalStatus, 'converted'),
          gte(salesProposals.createdAt, periodStart),
          lte(salesProposals.createdAt, periodEnd)
        )
      );

    const totalSales = parseFloat(salesSum?.total || '0');

    // Calculate commission
    const calculation = await this.calculateCommission(agentId, totalSales);

    // Create payout record
    const [payout] = await db
      .insert(commissionPayouts)
      .values({
        agentId,
        periodStart,
        periodEnd,
        totalSales: totalSales.toString(),
        commissionAmount: calculation.baseCommission.toString(),
        bonusAmount: calculation.volumeBonus.toString(),
        deductions: '0',
        netAmount: calculation.totalCommission.toString(),
        status: PAYOUT_STATUS.PENDING,
      })
      .returning();

    logger.info(`Generated payout for agent ${agentId}: Rs ${calculation.totalCommission}`);

    return {
      payoutId: payout.id,
      amount: calculation.totalCommission,
    };
  }

  /**
   * Process approved payout via wallet credit
   */
  async processPayout(payoutId: number): Promise<PayoutProcessResult> {
    try {
      // Get payout
      const [payout] = await db
        .select()
        .from(commissionPayouts)
        .where(eq(commissionPayouts.id, payoutId))
        .limit(1);

      if (!payout) {
        return { success: false, error: 'Payout not found' };
      }

      if (payout.status !== PAYOUT_STATUS.APPROVED) {
        return { success: false, error: `Payout must be approved first. Current status: ${payout.status}` };
      }

      const amount = parseFloat(payout.netAmount || '0');

      if (amount <= 0) {
        return { success: false, error: 'Invalid payout amount' };
      }

      // Credit agent's wallet
      const walletResult = await walletService.credit(
        payout.agentId,
        amount,
        'commission_payout',
        {
          payoutId: payout.id,
          periodStart: payout.periodStart,
          periodEnd: payout.periodEnd,
        },
        `Commission payout for period ${payout.periodStart?.toLocaleDateString()} - ${payout.periodEnd?.toLocaleDateString()}`
      );

      // Update payout status
      await db
        .update(commissionPayouts)
        .set({
          status: PAYOUT_STATUS.PAID,
          paymentReference: `WALLET-${walletResult.transactionId}`,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(commissionPayouts.id, payoutId));

      logger.info(`Processed payout ${payoutId}: Rs ${amount} credited to agent ${payout.agentId}`);

      return {
        success: true,
        payoutId,
        walletTransactionId: walletResult.transactionId,
      };

    } catch (error: any) {
      logger.error('Process payout error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get commission statistics
   */
  async getStats(): Promise<{
    totalPaidOut: number;
    pendingPayouts: number;
    averageCommissionRate: number;
    topEarners: Array<{ agentId: number; name: string; totalEarned: number }>;
  }> {
    // Total paid out
    const [paidSum] = await db
      .select({
        total: sql<string>`COALESCE(SUM(net_amount), 0)`,
      })
      .from(commissionPayouts)
      .where(eq(commissionPayouts.status, PAYOUT_STATUS.PAID));

    // Pending payouts
    const [pendingSum] = await db
      .select({
        total: sql<string>`COALESCE(SUM(net_amount), 0)`,
      })
      .from(commissionPayouts)
      .where(
        or(
          eq(commissionPayouts.status, PAYOUT_STATUS.PENDING),
          eq(commissionPayouts.status, PAYOUT_STATUS.APPROVED)
        )
      );

    // Average commission rate from active rules
    const [avgRate] = await db
      .select({
        avg: sql<string>`COALESCE(AVG(CAST(base_percentage AS DECIMAL)), 5)`,
      })
      .from(commissionRules)
      .where(eq(commissionRules.isActive, true));

    // Top earners (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const topEarners = await db
      .select({
        agentId: commissionPayouts.agentId,
        name: users.fullName,
        totalEarned: sql<string>`COALESCE(SUM(${commissionPayouts.netAmount}), 0)`,
      })
      .from(commissionPayouts)
      .leftJoin(users, eq(commissionPayouts.agentId, users.id))
      .where(
        and(
          eq(commissionPayouts.status, PAYOUT_STATUS.PAID),
          gte(commissionPayouts.paidAt, ninetyDaysAgo)
        )
      )
      .groupBy(commissionPayouts.agentId, users.fullName)
      .orderBy(desc(sql`SUM(${commissionPayouts.netAmount})`))
      .limit(10);

    return {
      totalPaidOut: parseFloat(paidSum?.total || '0'),
      pendingPayouts: parseFloat(pendingSum?.total || '0'),
      averageCommissionRate: parseFloat(avgRate?.avg || '5'),
      topEarners: topEarners.map(e => ({
        agentId: e.agentId,
        name: e.name || `Agent ${e.agentId}`,
        totalEarned: parseFloat(e.totalEarned || '0'),
      })),
    };
  }

  /**
   * Apply clawback for refunded/cancelled sale
   */
  async applyClawback(
    agentId: number,
    originalSaleAmount: number,
    reason: string
  ): Promise<{ success: boolean; deductionAmount: number }> {
    // Get applicable rule for clawback calculation
    const rule = await this.findApplicableRule('silver'); // Use base tier for clawback

    let clawbackPercentage = 100; // Default: full commission clawback

    if (rule?.clawbackRules) {
      clawbackPercentage = rule.clawbackRules.percentage || 100;
    }

    // Calculate original commission
    const commission = await this.calculateCommission(agentId, originalSaleAmount);
    const deductionAmount = (commission.totalCommission * clawbackPercentage) / 100;

    // Debit from wallet
    try {
      await walletService.debit(
        agentId,
        deductionAmount,
        'commission_clawback',
        {
          originalSaleAmount,
          reason,
          clawbackPercentage,
        },
        `Commission clawback: ${reason}`
      );

      logger.info(`Clawback applied for agent ${agentId}: Rs ${deductionAmount}`);

      return { success: true, deductionAmount };
    } catch (error: any) {
      logger.error('Clawback error:', error);
      return { success: false, deductionAmount: 0 };
    }
  }
}

export const commissionService = new CommissionService();
