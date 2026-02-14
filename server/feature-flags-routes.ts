import type { Express, Response } from "express";
import { db } from "./db";
import {
  featureFlags,
  type FeatureFlagConditions
} from "@shared/super-admin-schema";
import { eq, desc, sql } from "drizzle-orm";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";

// Constants for validation
const MIN_KEY_LENGTH = 3;
const MIN_NAME_LENGTH = 3;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MIN_ROLLOUT_PERCENTAGE = 0;
const MAX_ROLLOUT_PERCENTAGE = 100;

/**
 * Check if a string is valid and can have .trim() called
 */
function isValidString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Runtime validation for feature flag conditions
 */
function isValidConditions(conditions: unknown): conditions is FeatureFlagConditions | null {
  if (conditions === null || conditions === undefined) return true;
  if (typeof conditions !== 'object') return false;

  const c = conditions as Record<string, unknown>;

  if (c.tenants !== undefined && !Array.isArray(c.tenants)) return false;
  if (c.users !== undefined && !Array.isArray(c.users)) return false;
  if (c.roles !== undefined && !Array.isArray(c.roles)) return false;

  return true;
}

/**
 * Evaluate if a feature flag is enabled for a specific user
 * Checks rollout percentage and conditions (tenants, users, roles)
 */
function evaluateFlagForUser(
  flag: {
    enabled: boolean | null;
    rolloutPercentage: number | null;
    conditions: FeatureFlagConditions | null;
  },
  user: {
    id: number;
    tenantId?: number | null;
    role?: string | null;
  }
): boolean {
  // If flag is disabled globally, return false
  if (!flag.enabled) {
    return false;
  }

  const rollout = flag.rolloutPercentage ?? 0;
  const conditions = flag.conditions;

  // Check rollout percentage using deterministic user-based calculation
  if (rollout < MAX_ROLLOUT_PERCENTAGE) {
    const userBucket = user.id % 100;
    if (userBucket >= rollout) {
      return false;
    }
  }

  // If no conditions, flag is enabled
  if (!conditions) {
    return true;
  }

  // Check tenant condition
  if (conditions.tenants && conditions.tenants.length > 0) {
    // tenantId may not exist on user object - skip tenant check if not available
    const tenantId = (user as any).tenantId;
    if (tenantId && !conditions.tenants.includes(tenantId)) {
      return false;
    }
    // If no tenantId on user, don't block - let other conditions apply
  }

  // Check user condition
  if (conditions.users && conditions.users.length > 0) {
    if (!conditions.users.includes(user.id)) {
      return false;
    }
  }

  // Check role condition
  if (conditions.roles && conditions.roles.length > 0) {
    if (!user.role || !conditions.roles.includes(user.role)) {
      return false;
    }
  }

  return true;
}

export function registerFeatureFlagsRoutes(app: Express) {
  // ============================================================================
  // FEATURE FLAGS ENDPOINTS
  // ============================================================================

  /**
   * GET /api/super-admin/operations/feature-flags
   * List all feature flags with pagination
   * Query params: page, limit
   */
  app.get(
    "/api/super-admin/operations/feature-flags",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { page = '1', limit = '20' } = req.query;

        // Validate and parse pagination
        const parsedPage = parseInt(page as string);
        const parsedLimit = parseInt(limit as string);

        const pageNum = isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
        const limitNum = isNaN(parsedLimit)
          ? DEFAULT_PAGE_SIZE
          : Math.max(1, Math.min(parsedLimit, MAX_PAGE_SIZE));
        const offset = (pageNum - 1) * limitNum;

        // Query feature flags
        const flags = await db
          .select()
          .from(featureFlags)
          .orderBy(desc(featureFlags.createdAt))
          .limit(limitNum)
          .offset(offset);

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(featureFlags);

        const total = Number(countResult[0]?.count || 0);

        res.json({
          featureFlags: flags,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 1,
          },
        });
      } catch (error: unknown) {
        console.error('Failed to fetch feature flags:', error);
        res.status(500).json({ error: "Failed to fetch feature flags" });
      }
    }
  );

  /**
   * POST /api/super-admin/operations/feature-flags
   * Create a new feature flag
   * Body: { key, name, description?, enabled?, rolloutPercentage?, conditions?, metadata? }
   */
  app.post(
    "/api/super-admin/operations/feature-flags",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          key,
          name,
          description,
          enabled,
          rolloutPercentage,
          conditions,
          metadata,
        } = req.body;

        // Validate key
        if (!key || !isValidString(key) || key.trim().length < MIN_KEY_LENGTH) {
          return res.status(400).json({
            error: `Key is required and must be at least ${MIN_KEY_LENGTH} characters`
          });
        }

        // Validate name
        if (!name || !isValidString(name) || name.trim().length < MIN_NAME_LENGTH) {
          return res.status(400).json({
            error: `Name is required and must be at least ${MIN_NAME_LENGTH} characters`
          });
        }

        const trimmedKey = key.trim();

        // Check for duplicate key
        const [existing] = await db
          .select({ id: featureFlags.id })
          .from(featureFlags)
          .where(eq(featureFlags.key, trimmedKey))
          .limit(1);

        if (existing) {
          return res.status(409).json({
            error: "A feature flag with this key already exists"
          });
        }

        // Validate rollout percentage if provided
        if (rolloutPercentage !== undefined) {
          const rollout = Number(rolloutPercentage);
          if (isNaN(rollout) || rollout < MIN_ROLLOUT_PERCENTAGE || rollout > MAX_ROLLOUT_PERCENTAGE) {
            return res.status(400).json({
              error: `Rollout percentage must be between ${MIN_ROLLOUT_PERCENTAGE} and ${MAX_ROLLOUT_PERCENTAGE}`
            });
          }
        }

        // Validate conditions format
        if (!isValidConditions(conditions)) {
          return res.status(400).json({ error: "Invalid conditions format" });
        }

        // Create feature flag
        const [created] = await db
          .insert(featureFlags)
          .values({
            key: trimmedKey,
            name: name.trim(),
            description: isValidString(description) ? description.trim() : null,
            enabled: enabled === true,
            rolloutPercentage: rolloutPercentage !== undefined ? Number(rolloutPercentage) : 0,
            conditions: conditions || null,
            metadata: metadata || null,
            createdBy: req.user?.id || null,
          })
          .returning();

        res.status(201).json(created);
      } catch (error: unknown) {
        console.error('Failed to create feature flag:', error);
        res.status(500).json({ error: "Failed to create feature flag" });
      }
    }
  );

  /**
   * PUT /api/super-admin/operations/feature-flags/:id
   * Update a feature flag
   * Body: { key?, name?, description?, enabled?, rolloutPercentage?, conditions?, metadata? }
   */
  app.put(
    "/api/super-admin/operations/feature-flags/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const flagId = parseInt(req.params.id);

        if (isNaN(flagId)) {
          return res.status(400).json({ error: "Invalid feature flag ID" });
        }

        const {
          key,
          name,
          description,
          enabled,
          rolloutPercentage,
          conditions,
          metadata,
        } = req.body;

        // Check if flag exists
        const [existing] = await db
          .select()
          .from(featureFlags)
          .where(eq(featureFlags.id, flagId))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: "Feature flag not found" });
        }

        // Validate key if provided
        if (key !== undefined) {
          if (!isValidString(key) || key.trim().length < MIN_KEY_LENGTH) {
            return res.status(400).json({
              error: `Key must be at least ${MIN_KEY_LENGTH} characters`
            });
          }

          // Check for duplicate key (excluding current flag)
          const trimmedKey = key.trim();
          const [duplicate] = await db
            .select({ id: featureFlags.id })
            .from(featureFlags)
            .where(eq(featureFlags.key, trimmedKey))
            .limit(1);

          if (duplicate && duplicate.id !== flagId) {
            return res.status(409).json({
              error: "A feature flag with this key already exists"
            });
          }
        }

        // Validate name if provided
        if (name !== undefined && (!isValidString(name) || name.trim().length < MIN_NAME_LENGTH)) {
          return res.status(400).json({
            error: `Name must be at least ${MIN_NAME_LENGTH} characters`
          });
        }

        // Validate rollout percentage if provided
        if (rolloutPercentage !== undefined) {
          const rollout = Number(rolloutPercentage);
          if (isNaN(rollout) || rollout < MIN_ROLLOUT_PERCENTAGE || rollout > MAX_ROLLOUT_PERCENTAGE) {
            return res.status(400).json({
              error: `Rollout percentage must be between ${MIN_ROLLOUT_PERCENTAGE} and ${MAX_ROLLOUT_PERCENTAGE}`
            });
          }
        }

        // Validate conditions format if provided
        if (conditions !== undefined && !isValidConditions(conditions)) {
          return res.status(400).json({ error: "Invalid conditions format" });
        }

        // Build update object
        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (key !== undefined && isValidString(key)) {
          updateData.key = key.trim();
        }
        if (name !== undefined && isValidString(name)) {
          updateData.name = name.trim();
        }
        if (description !== undefined) {
          updateData.description = isValidString(description) ? description.trim() : null;
        }
        if (enabled !== undefined) {
          updateData.enabled = enabled === true;
        }
        if (rolloutPercentage !== undefined) {
          updateData.rolloutPercentage = Number(rolloutPercentage);
        }
        if (conditions !== undefined) {
          updateData.conditions = conditions;
        }
        if (metadata !== undefined) {
          updateData.metadata = metadata;
        }

        const [updated] = await db
          .update(featureFlags)
          .set(updateData)
          .where(eq(featureFlags.id, flagId))
          .returning();

        res.json(updated);
      } catch (error: unknown) {
        console.error('Failed to update feature flag:', error);
        res.status(500).json({ error: "Failed to update feature flag" });
      }
    }
  );

  /**
   * POST /api/super-admin/operations/feature-flags/:id/toggle
   * Toggle the enabled state of a feature flag
   */
  app.post(
    "/api/super-admin/operations/feature-flags/:id/toggle",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const flagId = parseInt(req.params.id);

        if (isNaN(flagId)) {
          return res.status(400).json({ error: "Invalid feature flag ID" });
        }

        // Toggle the enabled state using SQL NOT to avoid race condition
        const [updated] = await db
          .update(featureFlags)
          .set({
            enabled: sql`NOT ${featureFlags.enabled}`,
            updatedAt: new Date(),
          })
          .where(eq(featureFlags.id, flagId))
          .returning();

        if (!updated) {
          return res.status(404).json({ error: "Feature flag not found" });
        }

        res.json(updated);
      } catch (error: unknown) {
        console.error('Failed to toggle feature flag:', error);
        res.status(500).json({ error: "Failed to toggle feature flag" });
      }
    }
  );

  /**
   * DELETE /api/super-admin/operations/feature-flags/:id
   * Delete a feature flag
   */
  app.delete(
    "/api/super-admin/operations/feature-flags/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const flagId = parseInt(req.params.id);

        if (isNaN(flagId)) {
          return res.status(400).json({ error: "Invalid feature flag ID" });
        }

        // Delete the flag using .returning() to check existence in one operation
        const [deleted] = await db
          .delete(featureFlags)
          .where(eq(featureFlags.id, flagId))
          .returning({ id: featureFlags.id });

        if (!deleted) {
          return res.status(404).json({ error: "Feature flag not found" });
        }

        res.json({ success: true, message: "Feature flag deleted successfully" });
      } catch (error: unknown) {
        console.error('Failed to delete feature flag:', error);
        res.status(500).json({ error: "Failed to delete feature flag" });
      }
    }
  );

  /**
   * GET /api/feature-flags/:key
   * Public endpoint to check if a feature is enabled for the current user
   * Returns { enabled: boolean, key: string }
   */
  app.get(
    "/api/feature-flags/:key",
    sessionAuthMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { key } = req.params;

        if (!key || !isValidString(key)) {
          return res.status(400).json({ error: "Invalid feature flag key" });
        }

        const trimmedKey = key.trim();

        // Look up the feature flag
        const [flag] = await db
          .select({
            enabled: featureFlags.enabled,
            rolloutPercentage: featureFlags.rolloutPercentage,
            conditions: featureFlags.conditions,
          })
          .from(featureFlags)
          .where(eq(featureFlags.key, trimmedKey))
          .limit(1);

        // If flag doesn't exist, return disabled
        if (!flag) {
          return res.json({ key: trimmedKey, enabled: false });
        }

        // Evaluate flag for current user
        const user = req.user;
        if (!user) {
          return res.json({ key: trimmedKey, enabled: false });
        }

        const isEnabled = evaluateFlagForUser(flag, {
          id: user.id,
          tenantId: (user as any).tenantId,
          role: user.role,
        });

        res.json({ key: trimmedKey, enabled: isEnabled });
      } catch (error: unknown) {
        console.error('Failed to check feature flag:', error);
        res.status(500).json({ error: "Failed to check feature flag" });
      }
    }
  );

  console.log('✅ Feature flags routes registered');
}
