import type { Express, Response } from "express";
import { db } from "./db";
import { tenants, TENANT_STATUS, TENANT_PLAN } from "@shared/super-admin-schema";
import { users, auditLogs } from "@shared/schema";
import { eq, desc, and, like, or, sql, count } from "drizzle-orm";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Helper to create audit log entry
async function createAuditLog(
  userId: number,
  action: string,
  entityType: string,
  entityId?: string,
  oldValue?: any,
  newValue?: any,
  req?: AuthenticatedRequest
) {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId: entityId || null,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      ipAddress: req?.ip || req?.headers['x-forwarded-for']?.toString() || null,
      userAgent: req?.headers['user-agent'] || null,
      sessionId: req?.sessionID || null,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export function registerTenantRoutes(app: Express) {
  // GET /api/super-admin/tenants - List all tenants with filtering and pagination
  app.get(
    "/api/super-admin/tenants",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          status,
          plan,
          search,
          page = '1',
          limit = '20'
        } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string), 100);
        const offset = (pageNum - 1) * limitNum;

        // Build query conditions
        const conditions = [];

        if (status) {
          conditions.push(eq(tenants.status, status as string));
        }
        if (plan) {
          conditions.push(eq(tenants.plan, plan as string));
        }
        if (search) {
          const searchTerm = `%${search}%`;
          conditions.push(
            or(
              like(tenants.name, searchTerm),
              like(tenants.slug, searchTerm)
            )
          );
        }

        // Query tenants
        const tenantsResult = await db
          .select()
          .from(tenants)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(tenants.createdAt))
          .limit(limitNum)
          .offset(offset);

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(tenants)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = Number(countResult[0]?.count || 0);

        res.json({
          tenants: tenantsResult,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        });
      } catch (error: any) {
        console.error('Failed to fetch tenants:', error);
        res.status(500).json({ error: error.message || "Failed to fetch tenants" });
      }
    }
  );

  // POST /api/super-admin/tenants - Create tenant
  app.post(
    "/api/super-admin/tenants",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { name, plan, settings, limits, billingInfo } = req.body;

        if (!name) {
          return res.status(400).json({ error: "Tenant name is required" });
        }

        // Generate slug from name
        const slug = generateSlug(name);

        // Check if slug already exists
        const existingTenant = await db
          .select()
          .from(tenants)
          .where(eq(tenants.slug, slug))
          .limit(1);

        if (existingTenant.length > 0) {
          return res.status(400).json({ error: "A tenant with this name already exists" });
        }

        // Create tenant
        const [newTenant] = await db
          .insert(tenants)
          .values({
            name,
            slug,
            plan: plan || TENANT_PLAN.STARTER,
            status: TENANT_STATUS.TRIAL,
            settings: settings || null,
            limits: limits || null,
            billingInfo: billingInfo || null,
          })
          .returning();

        // Create audit log
        await createAuditLog(
          req.user?.id || 0,
          'tenant_created',
          'tenant',
          String(newTenant.id),
          null,
          { name, slug, plan: newTenant.plan },
          req
        );

        res.status(201).json(newTenant);
      } catch (error: any) {
        console.error('Failed to create tenant:', error);
        res.status(500).json({ error: error.message || "Failed to create tenant" });
      }
    }
  );

  // GET /api/super-admin/tenants/:id - Get single tenant with user count
  app.get(
    "/api/super-admin/tenants/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);

        if (isNaN(tenantId)) {
          return res.status(400).json({ error: "Invalid tenant ID" });
        }

        // Get tenant
        const [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);

        if (!tenant) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        // Get user count for this tenant
        // Note: Users are associated with tenants via businessEntityId or a tenant field
        // For now, we'll return 0 until tenant-user association is fully implemented
        const userCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.businessEntityId, tenantId));

        const userCount = Number(userCountResult[0]?.count || 0);

        res.json({
          ...tenant,
          userCount,
        });
      } catch (error: any) {
        console.error('Failed to fetch tenant:', error);
        res.status(500).json({ error: error.message || "Failed to fetch tenant" });
      }
    }
  );

  // PUT /api/super-admin/tenants/:id - Update tenant
  app.put(
    "/api/super-admin/tenants/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);
        const { name, plan, settings, limits, billingInfo } = req.body;

        if (isNaN(tenantId)) {
          return res.status(400).json({ error: "Invalid tenant ID" });
        }

        // Get existing tenant
        const [existingTenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);

        if (!existingTenant) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const oldValues = {
          name: existingTenant.name,
          plan: existingTenant.plan,
          settings: existingTenant.settings,
          limits: existingTenant.limits,
          billingInfo: existingTenant.billingInfo,
        };

        // Build update object
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (name !== undefined) {
          updateData.name = name;
          // Update slug if name changes
          updateData.slug = generateSlug(name);
        }
        if (plan !== undefined) updateData.plan = plan;
        if (settings !== undefined) updateData.settings = settings;
        if (limits !== undefined) updateData.limits = limits;
        if (billingInfo !== undefined) updateData.billingInfo = billingInfo;

        // Update tenant
        const [updatedTenant] = await db
          .update(tenants)
          .set(updateData)
          .where(eq(tenants.id, tenantId))
          .returning();

        // Create audit log
        await createAuditLog(
          req.user?.id || 0,
          'tenant_updated',
          'tenant',
          String(tenantId),
          oldValues,
          {
            name: updatedTenant.name,
            plan: updatedTenant.plan,
            settings: updatedTenant.settings,
            limits: updatedTenant.limits,
            billingInfo: updatedTenant.billingInfo,
          },
          req
        );

        res.json(updatedTenant);
      } catch (error: any) {
        console.error('Failed to update tenant:', error);
        res.status(500).json({ error: error.message || "Failed to update tenant" });
      }
    }
  );

  // POST /api/super-admin/tenants/:id/suspend - Suspend tenant
  app.post(
    "/api/super-admin/tenants/:id/suspend",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);
        const { reason } = req.body;

        if (isNaN(tenantId)) {
          return res.status(400).json({ error: "Invalid tenant ID" });
        }

        // Get existing tenant
        const [existingTenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);

        if (!existingTenant) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        if (existingTenant.status === TENANT_STATUS.SUSPENDED) {
          return res.status(400).json({ error: "Tenant is already suspended" });
        }

        const oldStatus = existingTenant.status;

        // Update tenant status to suspended
        const [updatedTenant] = await db
          .update(tenants)
          .set({
            status: TENANT_STATUS.SUSPENDED,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenantId))
          .returning();

        // Create audit log
        await createAuditLog(
          req.user?.id || 0,
          'tenant_suspended',
          'tenant',
          String(tenantId),
          { status: oldStatus },
          { status: TENANT_STATUS.SUSPENDED, reason },
          req
        );

        res.json({
          ...updatedTenant,
          message: "Tenant suspended successfully",
        });
      } catch (error: any) {
        console.error('Failed to suspend tenant:', error);
        res.status(500).json({ error: error.message || "Failed to suspend tenant" });
      }
    }
  );

  // POST /api/super-admin/tenants/:id/activate - Activate tenant
  app.post(
    "/api/super-admin/tenants/:id/activate",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);

        if (isNaN(tenantId)) {
          return res.status(400).json({ error: "Invalid tenant ID" });
        }

        // Get existing tenant
        const [existingTenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);

        if (!existingTenant) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        if (existingTenant.status === TENANT_STATUS.ACTIVE) {
          return res.status(400).json({ error: "Tenant is already active" });
        }

        const oldStatus = existingTenant.status;

        // Update tenant status to active
        const [updatedTenant] = await db
          .update(tenants)
          .set({
            status: TENANT_STATUS.ACTIVE,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenantId))
          .returning();

        // Create audit log
        await createAuditLog(
          req.user?.id || 0,
          'tenant_activated',
          'tenant',
          String(tenantId),
          { status: oldStatus },
          { status: TENANT_STATUS.ACTIVE },
          req
        );

        res.json({
          ...updatedTenant,
          message: "Tenant activated successfully",
        });
      } catch (error: any) {
        console.error('Failed to activate tenant:', error);
        res.status(500).json({ error: error.message || "Failed to activate tenant" });
      }
    }
  );

  // DELETE /api/super-admin/tenants/:id - Soft delete tenant (set status to churned)
  app.delete(
    "/api/super-admin/tenants/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);

        if (isNaN(tenantId)) {
          return res.status(400).json({ error: "Invalid tenant ID" });
        }

        // Get existing tenant
        const [existingTenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);

        if (!existingTenant) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        if (existingTenant.status === TENANT_STATUS.CHURNED) {
          return res.status(400).json({ error: "Tenant is already churned/deleted" });
        }

        const oldStatus = existingTenant.status;

        // Soft delete - set status to churned
        const [updatedTenant] = await db
          .update(tenants)
          .set({
            status: TENANT_STATUS.CHURNED,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenantId))
          .returning();

        // Create audit log
        await createAuditLog(
          req.user?.id || 0,
          'tenant_deleted',
          'tenant',
          String(tenantId),
          { status: oldStatus, name: existingTenant.name },
          { status: TENANT_STATUS.CHURNED },
          req
        );

        res.json({
          success: true,
          message: "Tenant deleted successfully",
        });
      } catch (error: any) {
        console.error('Failed to delete tenant:', error);
        res.status(500).json({ error: error.message || "Failed to delete tenant" });
      }
    }
  );

  // GET /api/super-admin/tenants/:id/usage - Get tenant usage
  app.get(
    "/api/super-admin/tenants/:id/usage",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);

        if (isNaN(tenantId)) {
          return res.status(400).json({ error: "Invalid tenant ID" });
        }

        // Get tenant
        const [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);

        if (!tenant) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        // Get user count for this tenant
        const userCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.businessEntityId, tenantId));

        const userCount = Number(userCountResult[0]?.count || 0);

        // Usage data (services count would need a tenant association on services table)
        // For now, return placeholder data for services, storage, and API calls
        const usage = {
          users: userCount,
          services: 0, // To be implemented when services have tenant association
          storageGb: 0, // To be implemented with file storage tracking
          apiCalls: 0, // To be implemented with API rate limiting/tracking
        };

        // Get limits from tenant settings or use defaults
        const limits = tenant.limits || {
          maxUsers: 10,
          maxServices: 50,
          storageGb: 5,
          apiCallsPerMonth: 10000,
        };

        res.json({
          tenantId,
          usage,
          limits,
        });
      } catch (error: any) {
        console.error('Failed to fetch tenant usage:', error);
        res.status(500).json({ error: error.message || "Failed to fetch tenant usage" });
      }
    }
  );

  console.log('Tenant management routes registered');
}
