import type { Express, Response } from "express";
import { db } from "./db";
import { pricingRules, PRICING_RULE_TYPE, type PricingConditions, type PricingAdjustment } from "@shared/super-admin-schema";
import { services } from "@shared/schema";
import { eq, and, or, gte, lte, desc, isNull, sql } from "drizzle-orm";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";

// Valid rule types
const VALID_RULE_TYPES = ['base', 'volume', 'promo', 'seasonal', 'loyalty'] as const;
type RuleType = typeof VALID_RULE_TYPES[number];

// Validate rule type
function isValidRuleType(type: string): type is RuleType {
  return VALID_RULE_TYPES.includes(type as RuleType);
}

// Validate adjustment
function isValidAdjustment(adjustment: unknown): adjustment is PricingAdjustment {
  if (!adjustment || typeof adjustment !== 'object') return false;
  const adj = adjustment as Record<string, unknown>;
  if (adj.type !== 'percentage' && adj.type !== 'fixed') return false;
  if (typeof adj.value !== 'number' || isNaN(adj.value)) return false;
  return true;
}

// Helper to check conditions match
function conditionsMatch(
  conditions: PricingConditions | null | undefined,
  quantity: number,
  promoCode?: string
): boolean {
  if (!conditions) return true;

  // Check minQuantity
  if (conditions.minQuantity !== undefined && quantity < conditions.minQuantity) {
    return false;
  }

  // Check maxQuantity
  if (conditions.maxQuantity !== undefined && quantity > conditions.maxQuantity) {
    return false;
  }

  // Check promoCode
  if (conditions.promoCode !== undefined && conditions.promoCode !== promoCode) {
    return false;
  }

  return true;
}

// Apply adjustment to a price
function applyAdjustment(
  currentPrice: number,
  adjustment: PricingAdjustment
): { discount: number; newPrice: number } {
  let discount = 0;

  if (adjustment.type === 'percentage') {
    discount = (currentPrice * adjustment.value) / 100;
  } else if (adjustment.type === 'fixed') {
    discount = adjustment.value;
  }

  const newPrice = Math.max(0, currentPrice - discount);
  return { discount, newPrice };
}

export function registerPricingRoutes(app: Express) {
  // GET /api/super-admin/pricing-rules - List pricing rules
  app.get(
    "/api/super-admin/pricing-rules",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { serviceId, tenantId, ruleType, isActive } = req.query;

        const conditions = [];

        if (serviceId) {
          conditions.push(eq(pricingRules.serviceId, parseInt(serviceId as string)));
        }

        if (tenantId) {
          conditions.push(eq(pricingRules.tenantId, parseInt(tenantId as string)));
        }

        if (ruleType) {
          if (!isValidRuleType(ruleType as string)) {
            return res.status(400).json({
              error: "Invalid ruleType",
              validTypes: VALID_RULE_TYPES
            });
          }
          conditions.push(eq(pricingRules.ruleType, ruleType as string));
        }

        if (isActive !== undefined) {
          conditions.push(eq(pricingRules.isActive, isActive === 'true'));
        }

        const rules = await db
          .select()
          .from(pricingRules)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(pricingRules.priority), desc(pricingRules.createdAt));

        res.json({ rules });
      } catch (error: any) {
        console.error('Failed to fetch pricing rules:', error);
        res.status(500).json({ error: "Failed to fetch pricing rules" });
      }
    }
  );

  // POST /api/super-admin/pricing-rules - Create pricing rule
  app.post(
    "/api/super-admin/pricing-rules",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          serviceId,
          tenantId,
          ruleType,
          name,
          conditions,
          adjustment,
          priority,
          effectiveFrom,
          effectiveTo,
        } = req.body;

        // Validate required fields
        if (!ruleType || !name || !adjustment) {
          return res.status(400).json({
            error: "Missing required fields: ruleType, name, and adjustment are required"
          });
        }

        // Validate ruleType
        if (!isValidRuleType(ruleType)) {
          return res.status(400).json({
            error: "Invalid ruleType",
            validTypes: VALID_RULE_TYPES
          });
        }

        // Validate adjustment
        if (!isValidAdjustment(adjustment)) {
          return res.status(400).json({
            error: "Invalid adjustment: must have type ('percentage' or 'fixed') and numeric value"
          });
        }

        const [createdRule] = await db
          .insert(pricingRules)
          .values({
            serviceId: serviceId ? parseInt(serviceId) : null,
            tenantId: tenantId ? parseInt(tenantId) : null,
            ruleType,
            name,
            conditions: conditions || null,
            adjustment,
            priority: priority !== undefined ? parseInt(priority) : 0,
            effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
            effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
            isActive: true,
            createdBy: req.user?.id || null,
          })
          .returning();

        res.status(201).json(createdRule);
      } catch (error: any) {
        console.error('Failed to create pricing rule:', error);
        res.status(500).json({ error: "Failed to create pricing rule" });
      }
    }
  );

  // PUT /api/super-admin/pricing-rules/:id - Update pricing rule
  app.put(
    "/api/super-admin/pricing-rules/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);
        const {
          serviceId,
          tenantId,
          ruleType,
          name,
          conditions,
          adjustment,
          priority,
          effectiveFrom,
          effectiveTo,
          isActive,
        } = req.body;

        // Check if rule exists
        const [existingRule] = await db
          .select()
          .from(pricingRules)
          .where(eq(pricingRules.id, ruleId))
          .limit(1);

        if (!existingRule) {
          return res.status(404).json({ error: "Pricing rule not found" });
        }

        // Validate ruleType if provided
        if (ruleType !== undefined && !isValidRuleType(ruleType)) {
          return res.status(400).json({
            error: "Invalid ruleType",
            validTypes: VALID_RULE_TYPES
          });
        }

        // Validate adjustment if provided
        if (adjustment !== undefined && !isValidAdjustment(adjustment)) {
          return res.status(400).json({
            error: "Invalid adjustment: must have type ('percentage' or 'fixed') and numeric value"
          });
        }

        // Build update object
        const updateData: Record<string, any> = {
          updatedAt: new Date(),
        };

        if (serviceId !== undefined) updateData.serviceId = serviceId ? parseInt(serviceId) : null;
        if (tenantId !== undefined) updateData.tenantId = tenantId ? parseInt(tenantId) : null;
        if (ruleType !== undefined) updateData.ruleType = ruleType;
        if (name !== undefined) updateData.name = name;
        if (conditions !== undefined) updateData.conditions = conditions;
        if (adjustment !== undefined) updateData.adjustment = adjustment;
        if (priority !== undefined) {
          const parsedPriority = parseInt(priority, 10);
          if (isNaN(parsedPriority)) {
            return res.status(400).json({ error: "Invalid priority: must be an integer" });
          }
          updateData.priority = parsedPriority;
        }
        if (effectiveFrom !== undefined) updateData.effectiveFrom = effectiveFrom ? new Date(effectiveFrom) : null;
        if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;
        if (isActive !== undefined) updateData.isActive = isActive;

        const [updatedRule] = await db
          .update(pricingRules)
          .set(updateData)
          .where(eq(pricingRules.id, ruleId))
          .returning();

        res.json(updatedRule);
      } catch (error: any) {
        console.error('Failed to update pricing rule:', error);
        res.status(500).json({ error: "Failed to update pricing rule" });
      }
    }
  );

  // DELETE /api/super-admin/pricing-rules/:id - Delete pricing rule
  app.delete(
    "/api/super-admin/pricing-rules/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);

        const [deletedRule] = await db
          .delete(pricingRules)
          .where(eq(pricingRules.id, ruleId))
          .returning();

        if (!deletedRule) {
          return res.status(404).json({ error: "Pricing rule not found" });
        }

        res.json({ success: true, deletedId: deletedRule.id });
      } catch (error: any) {
        console.error('Failed to delete pricing rule:', error);
        res.status(500).json({ error: "Failed to delete pricing rule" });
      }
    }
  );

  // POST /api/super-admin/pricing/calculate - Calculate price for a service
  app.post(
    "/api/super-admin/pricing/calculate",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN), // ADMIN level access for calculate endpoint
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { serviceId, tenantId, quantity = 1, promoCode } = req.body;

        if (!serviceId) {
          return res.status(400).json({ error: "serviceId is required" });
        }

        // Get base service price from services table
        const [service] = await db
          .select()
          .from(services)
          .where(eq(services.id, parseInt(serviceId)))
          .limit(1);

        if (!service) {
          return res.status(404).json({ error: "Service not found" });
        }

        const basePrice = service.price;
        const serviceName = service.name;
        const now = new Date();

        // Find all active matching pricing rules
        // Rules where:
        // - isActive = true
        // - serviceId matches OR is null (global rules)
        // - tenantId matches OR is null (global rules)
        // - effectiveFrom <= now OR is null
        // - effectiveTo >= now OR is null
        const matchingRulesQuery = db
          .select()
          .from(pricingRules)
          .where(
            and(
              eq(pricingRules.isActive, true),
              or(
                eq(pricingRules.serviceId, parseInt(serviceId)),
                isNull(pricingRules.serviceId)
              ),
              tenantId
                ? or(
                    eq(pricingRules.tenantId, parseInt(tenantId)),
                    isNull(pricingRules.tenantId)
                  )
                : or(
                    isNull(pricingRules.tenantId),
                    sql`true` // Accept all rules if no tenantId specified
                  ),
              or(
                lte(pricingRules.effectiveFrom, now),
                isNull(pricingRules.effectiveFrom)
              ),
              or(
                gte(pricingRules.effectiveTo, now),
                isNull(pricingRules.effectiveTo)
              )
            )
          )
          .orderBy(desc(pricingRules.priority));

        const matchingRules = await matchingRulesQuery;

        // Calculate subtotal
        const subtotal = basePrice * quantity;
        let currentPrice = subtotal;
        const discounts: Array<{ rule: string; discount: number }> = [];

        // Apply each rule in priority order
        for (const rule of matchingRules) {
          // Check conditions (minQuantity, maxQuantity, promoCode)
          if (!conditionsMatch(rule.conditions as PricingConditions | null, quantity, promoCode)) {
            continue;
          }

          // Apply adjustment
          const adjustment = rule.adjustment as PricingAdjustment;
          const { discount, newPrice } = applyAdjustment(currentPrice, adjustment);

          if (discount > 0) {
            discounts.push({
              rule: rule.name,
              discount: Math.round(discount * 100) / 100, // Round to 2 decimal places
            });
            currentPrice = newPrice;
          }
        }

        // Final price (minimum 0)
        const finalPrice = Math.max(0, Math.round(currentPrice * 100) / 100);

        res.json({
          serviceId: parseInt(serviceId),
          serviceName,
          basePrice,
          quantity,
          subtotal,
          discounts,
          finalPrice,
          calculatedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('Failed to calculate price:', error);
        res.status(500).json({ error: "Failed to calculate price" });
      }
    }
  );

  console.log('✅ Pricing routes registered');
}
