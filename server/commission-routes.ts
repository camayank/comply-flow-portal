import type { Express, Response } from "express";
import { db } from "./db";
import { commissionRules, commissionPayouts, AGENT_TIER, PAYOUT_STATUS } from "@shared/super-admin-schema";
import { users } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";

// Valid agent tiers for validation
const VALID_AGENT_TIERS = ['silver', 'gold', 'platinum'] as const;

// Helper function to validate agentTier
function isValidAgentTier(tier: string | null | undefined): tier is 'silver' | 'gold' | 'platinum' | null {
  if (tier === null || tier === undefined) return true;
  return VALID_AGENT_TIERS.includes(tier as any);
}

// Helper function to validate basePercentage is numeric
function isValidPercentage(value: any): boolean {
  if (value === null || value === undefined) return false;
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 100;
}

export function registerCommissionRoutes(app: Express) {
  // ============================================================================
  // COMMISSION RULES ENDPOINTS
  // ============================================================================

  /**
   * GET /api/super-admin/commission-rules
   * List commission rules with optional filtering
   * Query params: agentTier, serviceCategory, isActive
   */
  app.get(
    "/api/super-admin/commission-rules",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { agentTier, serviceCategory, isActive } = req.query;

        // Build query conditions
        const conditions = [];

        if (agentTier !== undefined) {
          if (!isValidAgentTier(agentTier as string)) {
            return res.status(400).json({ error: "Invalid agentTier. Must be 'silver', 'gold', 'platinum', or null" });
          }
          conditions.push(eq(commissionRules.agentTier, agentTier as string));
        }

        if (serviceCategory) {
          conditions.push(eq(commissionRules.serviceCategory, serviceCategory as string));
        }

        if (isActive !== undefined) {
          const activeValue = isActive === 'true';
          conditions.push(eq(commissionRules.isActive, activeValue));
        }

        const rules = await db
          .select()
          .from(commissionRules)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(commissionRules.createdAt));

        res.json({ rules });
      } catch (error: any) {
        console.error('Failed to fetch commission rules:', error);
        res.status(500).json({ error: "Failed to fetch commission rules" });
      }
    }
  );

  /**
   * POST /api/super-admin/commission-rules
   * Create a new commission rule
   * Body: { name, agentTier, serviceCategory, serviceId, basePercentage, volumeBonuses, clawbackRules, effectiveFrom, effectiveTo }
   */
  app.post(
    "/api/super-admin/commission-rules",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          name,
          agentTier,
          serviceCategory,
          serviceId,
          basePercentage,
          volumeBonuses,
          clawbackRules,
          effectiveFrom,
          effectiveTo,
        } = req.body;

        // Validate required fields
        if (!name) {
          return res.status(400).json({ error: "Name is required" });
        }

        if (!effectiveFrom) {
          return res.status(400).json({ error: "effectiveFrom date is required" });
        }

        // Validate agentTier
        if (agentTier !== null && agentTier !== undefined && !isValidAgentTier(agentTier)) {
          return res.status(400).json({ error: "Invalid agentTier. Must be 'silver', 'gold', 'platinum', or null" });
        }

        // Validate basePercentage
        if (!isValidPercentage(basePercentage)) {
          return res.status(400).json({ error: "basePercentage must be a valid numeric value between 0 and 100" });
        }

        // Validate date range
        if (effectiveTo && effectiveFrom && new Date(effectiveTo) <= new Date(effectiveFrom)) {
          return res.status(400).json({ error: "effectiveTo must be after effectiveFrom" });
        }

        // Validate volumeBonuses structure if provided
        if (volumeBonuses !== undefined && volumeBonuses !== null) {
          if (!Array.isArray(volumeBonuses)) {
            return res.status(400).json({ error: "volumeBonuses must be an array" });
          }
          for (const bonus of volumeBonuses) {
            if (typeof bonus.threshold !== 'number' || typeof bonus.bonusPercentage !== 'number') {
              return res.status(400).json({ error: "Each volumeBonus must have numeric threshold and bonusPercentage" });
            }
            if (bonus.threshold <= 0) {
              return res.status(400).json({ error: "Volume bonus threshold must be a positive number" });
            }
            if (bonus.bonusPercentage < 0 || bonus.bonusPercentage > 100) {
              return res.status(400).json({ error: "Volume bonus percentage must be between 0 and 100" });
            }
          }
        }

        const [created] = await db
          .insert(commissionRules)
          .values({
            name,
            agentTier: agentTier || null,
            serviceCategory: serviceCategory || null,
            serviceId: serviceId || null,
            basePercentage: basePercentage.toString(),
            volumeBonuses: volumeBonuses || null,
            clawbackRules: clawbackRules || null,
            effectiveFrom: new Date(effectiveFrom),
            effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
            isActive: true,
            createdBy: req.user?.id || null,
          })
          .returning();

        res.status(201).json(created);
      } catch (error: any) {
        console.error('Failed to create commission rule:', error);
        res.status(500).json({ error: "Failed to create commission rule" });
      }
    }
  );

  /**
   * PUT /api/super-admin/commission-rules/:id
   * Update an existing commission rule
   */
  app.put(
    "/api/super-admin/commission-rules/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);
        if (isNaN(ruleId)) {
          return res.status(400).json({ error: "Invalid rule ID" });
        }

        const {
          name,
          agentTier,
          serviceCategory,
          serviceId,
          basePercentage,
          volumeBonuses,
          clawbackRules,
          effectiveFrom,
          effectiveTo,
          isActive,
        } = req.body;

        // Check if rule exists
        const [existing] = await db
          .select()
          .from(commissionRules)
          .where(eq(commissionRules.id, ruleId))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: "Commission rule not found" });
        }

        // Validate agentTier if provided
        if (agentTier !== undefined && agentTier !== null && !isValidAgentTier(agentTier)) {
          return res.status(400).json({ error: "Invalid agentTier. Must be 'silver', 'gold', 'platinum', or null" });
        }

        // Validate basePercentage if provided
        if (basePercentage !== undefined && !isValidPercentage(basePercentage)) {
          return res.status(400).json({ error: "basePercentage must be a valid numeric value between 0 and 100" });
        }

        // Validate date range - need to consider both provided and existing values
        const finalEffectiveFrom = effectiveFrom !== undefined ? effectiveFrom : existing.effectiveFrom;
        const finalEffectiveTo = effectiveTo !== undefined ? effectiveTo : existing.effectiveTo;
        if (finalEffectiveTo && finalEffectiveFrom && new Date(finalEffectiveTo) <= new Date(finalEffectiveFrom)) {
          return res.status(400).json({ error: "effectiveTo must be after effectiveFrom" });
        }

        // Validate volumeBonuses structure if provided
        if (volumeBonuses !== undefined && volumeBonuses !== null) {
          if (!Array.isArray(volumeBonuses)) {
            return res.status(400).json({ error: "volumeBonuses must be an array" });
          }
          for (const bonus of volumeBonuses) {
            if (typeof bonus.threshold !== 'number' || typeof bonus.bonusPercentage !== 'number') {
              return res.status(400).json({ error: "Each volumeBonus must have numeric threshold and bonusPercentage" });
            }
            if (bonus.threshold <= 0) {
              return res.status(400).json({ error: "Volume bonus threshold must be a positive number" });
            }
            if (bonus.bonusPercentage < 0 || bonus.bonusPercentage > 100) {
              return res.status(400).json({ error: "Volume bonus percentage must be between 0 and 100" });
            }
          }
        }

        // Build update object with only provided fields
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (name !== undefined) updateData.name = name;
        if (agentTier !== undefined) updateData.agentTier = agentTier;
        if (serviceCategory !== undefined) updateData.serviceCategory = serviceCategory;
        if (serviceId !== undefined) updateData.serviceId = serviceId;
        if (basePercentage !== undefined) updateData.basePercentage = basePercentage.toString();
        if (volumeBonuses !== undefined) updateData.volumeBonuses = volumeBonuses;
        if (clawbackRules !== undefined) updateData.clawbackRules = clawbackRules;
        if (effectiveFrom !== undefined) updateData.effectiveFrom = new Date(effectiveFrom);
        if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;
        if (isActive !== undefined) updateData.isActive = isActive;

        const [updated] = await db
          .update(commissionRules)
          .set(updateData)
          .where(eq(commissionRules.id, ruleId))
          .returning();

        res.json(updated);
      } catch (error: any) {
        console.error('Failed to update commission rule:', error);
        res.status(500).json({ error: "Failed to update commission rule" });
      }
    }
  );

  /**
   * DELETE /api/super-admin/commission-rules/:id
   * Delete a commission rule
   */
  app.delete(
    "/api/super-admin/commission-rules/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);
        if (isNaN(ruleId)) {
          return res.status(400).json({ error: "Invalid rule ID" });
        }

        // Check if rule exists
        const [existing] = await db
          .select()
          .from(commissionRules)
          .where(eq(commissionRules.id, ruleId))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: "Commission rule not found" });
        }

        await db
          .delete(commissionRules)
          .where(eq(commissionRules.id, ruleId));

        res.json({ success: true });
      } catch (error: any) {
        console.error('Failed to delete commission rule:', error);
        res.status(500).json({ error: "Failed to delete commission rule" });
      }
    }
  );

  // ============================================================================
  // COMMISSION PAYOUTS ENDPOINTS
  // ============================================================================

  /**
   * GET /api/super-admin/commission-payouts
   * List payouts with optional filtering and pagination
   * Query params: agentId, status, page, limit
   */
  app.get(
    "/api/super-admin/commission-payouts",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { agentId, status, page = '1', limit = '50' } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string) || 50, 100); // Max limit of 100
        const offset = (pageNum - 1) * limitNum;

        // Build query conditions
        const conditions = [];

        if (agentId) {
          const agentIdNum = parseInt(agentId as string);
          if (!isNaN(agentIdNum)) {
            conditions.push(eq(commissionPayouts.agentId, agentIdNum));
          }
        }

        if (status) {
          conditions.push(eq(commissionPayouts.status, status as string));
        }

        // Query payouts with agent info
        const payouts = await db
          .select({
            id: commissionPayouts.id,
            agentId: commissionPayouts.agentId,
            agentName: users.fullName,
            agentEmail: users.email,
            periodStart: commissionPayouts.periodStart,
            periodEnd: commissionPayouts.periodEnd,
            totalSales: commissionPayouts.totalSales,
            commissionAmount: commissionPayouts.commissionAmount,
            bonusAmount: commissionPayouts.bonusAmount,
            deductions: commissionPayouts.deductions,
            netAmount: commissionPayouts.netAmount,
            status: commissionPayouts.status,
            paymentReference: commissionPayouts.paymentReference,
            paidAt: commissionPayouts.paidAt,
            approvedBy: commissionPayouts.approvedBy,
            createdAt: commissionPayouts.createdAt,
            updatedAt: commissionPayouts.updatedAt,
          })
          .from(commissionPayouts)
          .leftJoin(users, eq(commissionPayouts.agentId, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(commissionPayouts.createdAt))
          .limit(limitNum)
          .offset(offset);

        // Get total count for pagination (match main query structure)
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(commissionPayouts)
          .leftJoin(users, eq(commissionPayouts.agentId, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = Number(countResult[0]?.count || 0);

        res.json({
          payouts,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        });
      } catch (error: any) {
        console.error('Failed to fetch commission payouts:', error);
        res.status(500).json({ error: "Failed to fetch commission payouts" });
      }
    }
  );

  /**
   * POST /api/super-admin/commission-payouts
   * Create a new payout
   * Body: { agentId, periodStart, periodEnd, totalSales, commissionAmount, bonusAmount, deductions }
   * Calculates netAmount = commissionAmount + bonusAmount - deductions
   */
  app.post(
    "/api/super-admin/commission-payouts",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          agentId,
          periodStart,
          periodEnd,
          totalSales,
          commissionAmount,
          bonusAmount,
          deductions,
        } = req.body;

        // Validate required fields
        if (!agentId) {
          return res.status(400).json({ error: "agentId is required" });
        }

        if (!periodStart || !periodEnd) {
          return res.status(400).json({ error: "periodStart and periodEnd are required" });
        }

        // Validate period date range
        if (new Date(periodEnd) <= new Date(periodStart)) {
          return res.status(400).json({ error: "periodEnd must be after periodStart" });
        }

        // Verify agent exists
        const [agent] = await db
          .select()
          .from(users)
          .where(eq(users.id, agentId))
          .limit(1);

        if (!agent) {
          return res.status(404).json({ error: "Agent not found" });
        }

        // Calculate netAmount
        const commission = parseFloat(commissionAmount || '0');
        const bonus = parseFloat(bonusAmount || '0');
        const deduct = parseFloat(deductions || '0');
        const netAmount = commission + bonus - deduct;

        const [created] = await db
          .insert(commissionPayouts)
          .values({
            agentId,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            totalSales: totalSales?.toString() || null,
            commissionAmount: commissionAmount?.toString() || null,
            bonusAmount: bonusAmount?.toString() || null,
            deductions: deductions?.toString() || null,
            netAmount: netAmount.toString(),
            status: PAYOUT_STATUS.PENDING,
          })
          .returning();

        res.status(201).json(created);
      } catch (error: any) {
        console.error('Failed to create commission payout:', error);
        res.status(500).json({ error: "Failed to create commission payout" });
      }
    }
  );

  /**
   * PUT /api/super-admin/commission-payouts/:id/approve
   * Approve a payout
   * Sets status to 'approved' and records approvedBy
   */
  app.put(
    "/api/super-admin/commission-payouts/:id/approve",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const payoutId = parseInt(req.params.id);
        if (isNaN(payoutId)) {
          return res.status(400).json({ error: "Invalid payout ID" });
        }

        // Check if payout exists
        const [existing] = await db
          .select()
          .from(commissionPayouts)
          .where(eq(commissionPayouts.id, payoutId))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: "Commission payout not found" });
        }

        // Check if payout is in a state that can be approved
        if (existing.status !== PAYOUT_STATUS.PENDING) {
          return res.status(400).json({ error: `Cannot approve payout with status: ${existing.status}` });
        }

        const [updated] = await db
          .update(commissionPayouts)
          .set({
            status: PAYOUT_STATUS.APPROVED,
            approvedBy: req.user?.id || null,
            updatedAt: new Date(),
          })
          .where(eq(commissionPayouts.id, payoutId))
          .returning();

        res.json(updated);
      } catch (error: any) {
        console.error('Failed to approve commission payout:', error);
        res.status(500).json({ error: "Failed to approve commission payout" });
      }
    }
  );

  /**
   * PUT /api/super-admin/commission-payouts/:id/mark-paid
   * Mark a payout as paid
   * Body: { paymentReference }
   * Sets status to 'paid' and paidAt timestamp
   */
  app.put(
    "/api/super-admin/commission-payouts/:id/mark-paid",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const payoutId = parseInt(req.params.id);
        if (isNaN(payoutId)) {
          return res.status(400).json({ error: "Invalid payout ID" });
        }

        const { paymentReference } = req.body;

        // Check if payout exists
        const [existing] = await db
          .select()
          .from(commissionPayouts)
          .where(eq(commissionPayouts.id, payoutId))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: "Commission payout not found" });
        }

        // Check if payout is in a state that can be marked as paid
        if (existing.status !== PAYOUT_STATUS.APPROVED) {
          return res.status(400).json({ error: `Cannot mark as paid. Payout must be approved first. Current status: ${existing.status}` });
        }

        const [updated] = await db
          .update(commissionPayouts)
          .set({
            status: PAYOUT_STATUS.PAID,
            paymentReference: paymentReference || null,
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(commissionPayouts.id, payoutId))
          .returning();

        res.json(updated);
      } catch (error: any) {
        console.error('Failed to mark commission payout as paid:', error);
        res.status(500).json({ error: "Failed to mark commission payout as paid" });
      }
    }
  );

  console.log('✅ Commission routes registered');
}
