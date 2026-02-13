# Super Admin Control Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a comprehensive Super Admin Control Center with tenant management, pricing engine, commission configuration, integration hub, security incidents, feature flags, and analytics.

**Architecture:** Modular extension of existing `super-admin-routes.ts` and `SuperAdminPortal.tsx`. New database tables via Drizzle migrations. API-first development with TDD. Each domain gets its own route file and UI component.

**Tech Stack:** TypeScript, Express, Drizzle ORM, PostgreSQL, React, TanStack Query, shadcn/ui, Tailwind CSS

---

## Phase 1: Database Schema & Migrations

### Task 1: Create Tenants Table Migration

**Files:**
- Create: `shared/super-admin-schema.ts`
- Modify: `shared/schema.ts` (add export)

**Step 1: Write the schema file**

```typescript
// shared/super-admin-schema.ts
import { pgTable, serial, text, timestamp, boolean, integer, json, numeric } from "drizzle-orm/pg-core";
import { users } from "./schema";

// ============================================
// Tenant Management
// ============================================
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  status: text("status").default("trial"), // active, suspended, trial, churned
  plan: text("plan").default("starter"), // starter, professional, enterprise
  settings: json("settings").$type<{
    branding?: { logo?: string; primaryColor?: string };
    features?: { enabled: string[] };
    notifications?: { email: boolean; sms: boolean };
  }>(),
  limits: json("limits").$type<{
    maxUsers: number;
    maxServices: number;
    storageGb: number;
    apiCallsPerMonth: number;
  }>(),
  billingInfo: json("billing_info").$type<{
    contactEmail?: string;
    address?: string;
    gstNumber?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// Pricing Engine
// ============================================
export const pricingRules = pgTable("pricing_rules", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id"),
  tenantId: integer("tenant_id"),
  ruleType: text("rule_type").notNull(), // base, volume, promo, seasonal, loyalty
  name: text("name").notNull(),
  conditions: json("conditions").$type<{
    minQuantity?: number;
    maxQuantity?: number;
    userTier?: string;
    promoCode?: string;
    startDate?: string;
    endDate?: string;
  }>(),
  adjustment: json("adjustment").notNull().$type<{
    type: "percentage" | "fixed";
    value: number;
  }>(),
  priority: integer("priority").default(0),
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by"),
});

// ============================================
// Commission Configuration
// ============================================
export const commissionRules = pgTable("commission_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  agentTier: text("agent_tier"), // silver, gold, platinum, null for all
  serviceCategory: text("service_category"), // null for all categories
  serviceId: integer("service_id"), // null for category-wide
  basePercentage: numeric("base_percentage", { precision: 5, scale: 2 }).notNull(),
  volumeBonuses: json("volume_bonuses").$type<Array<{
    threshold: number;
    bonusPercentage: number;
  }>>(),
  clawbackRules: json("clawback_rules").$type<{
    period: string;
    conditions: string[];
  }>(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by"),
});

export const commissionPayouts = pgTable("commission_payouts", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalSales: numeric("total_sales", { precision: 12, scale: 2 }),
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }),
  bonusAmount: numeric("bonus_amount", { precision: 12, scale: 2 }),
  deductions: numeric("deductions", { precision: 12, scale: 2 }),
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }),
  status: text("status").default("pending"), // pending, approved, paid, disputed
  paymentReference: text("payment_reference"),
  paidAt: timestamp("paid_at"),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// Security Incidents
// ============================================
export const securityIncidents = pgTable("security_incidents", {
  id: serial("id").primaryKey(),
  incidentNumber: text("incident_number").unique().notNull(),
  severity: text("severity").notNull(), // low, medium, high, critical
  type: text("type").notNull(), // unauthorized_access, data_breach, suspicious_activity, policy_violation
  status: text("status").default("open"), // open, investigating, contained, resolved, closed
  title: text("title").notNull(),
  description: text("description"),
  affectedUsers: json("affected_users").$type<Array<{ userId: number; impact: string }>>(),
  affectedTenants: json("affected_tenants").$type<number[]>(),
  timeline: json("timeline").$type<Array<{
    timestamp: string;
    action: string;
    actor: string;
    notes?: string;
  }>>(),
  investigation: json("investigation"),
  rootCause: text("root_cause"),
  resolution: text("resolution"),
  lessonsLearned: text("lessons_learned"),
  reportedBy: integer("reported_by"),
  assignedTo: integer("assigned_to"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
});

// ============================================
// Feature Flags
// ============================================
export const featureFlags = pgTable("feature_flags", {
  id: serial("id").primaryKey(),
  key: text("key").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(false),
  rolloutPercentage: integer("rollout_percentage").default(0),
  conditions: json("conditions").$type<{
    tenants?: number[];
    users?: number[];
    plans?: string[];
    roles?: string[];
  }>(),
  metadata: json("metadata"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================
// Scheduled Reports
// ============================================
export const scheduledReports = pgTable("scheduled_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  reportType: text("report_type").notNull(),
  parameters: json("parameters"),
  schedule: text("schedule").notNull(), // cron expression
  recipients: json("recipients").$type<Array<{
    email: string;
    format: "pdf" | "csv" | "excel";
  }>>(),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Step 2: Update schema.ts to export new schema**

Add to end of `shared/schema.ts`:
```typescript
// Super Admin schema
export * from "./super-admin-schema";
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add shared/super-admin-schema.ts shared/schema.ts
git commit -m "feat(schema): add super admin tables for tenants, pricing, commissions, security, feature flags"
```

---

### Task 2: Run Database Migration

**Files:**
- Modify: Database (via drizzle-kit)

**Step 1: Generate migration**

Run: `npx drizzle-kit generate`
Expected: Migration files created in `drizzle/` folder

**Step 2: Push migration to database**

Run: `npx drizzle-kit push`
Expected: Tables created successfully

**Step 3: Verify tables exist**

Run: `psql -d complyflow_dev -c "\dt *tenants*; \dt *pricing*; \dt *commission*; \dt *security_incidents*; \dt *feature_flags*;"`
Expected: All tables listed

**Step 4: Commit migration files**

```bash
git add drizzle/
git commit -m "chore(db): add migration for super admin tables"
```

---

## Phase 2: Tenant Management API

### Task 3: Create Tenant Routes

**Files:**
- Create: `server/tenant-routes.ts`
- Modify: `server/routes/index.ts` (register routes)

**Step 1: Write tenant routes**

```typescript
// server/tenant-routes.ts
import type { Express, Response } from "express";
import { db } from "./db";
import { tenants } from "@shared/super-admin-schema";
import { users } from "@shared/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";

// Helper to generate unique slug
function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Audit log helper (reuse from super-admin-routes)
async function createAuditLog(
  userId: number,
  action: string,
  entityType: string,
  entityId?: string,
  oldValue?: any,
  newValue?: any,
  req?: AuthenticatedRequest
) {
  const { auditLogs } = await import("@shared/schema");
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
  // List all tenants
  app.get(
    "/api/super-admin/tenants",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { status, plan, search, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string), 100);
        const offset = (pageNum - 1) * limitNum;

        const conditions = [];
        if (status) conditions.push(eq(tenants.status, status as string));
        if (plan) conditions.push(eq(tenants.plan, plan as string));
        if (search) conditions.push(like(tenants.name, `%${search}%`));

        const results = await db
          .select()
          .from(tenants)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(tenants.createdAt))
          .limit(limitNum)
          .offset(offset);

        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(tenants)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = Number(countResult[0]?.count || 0);

        res.json({
          tenants: results,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch tenants" });
      }
    }
  );

  // Create tenant
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

        const slug = generateSlug(name);

        // Check if slug exists
        const existing = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
        if (existing.length > 0) {
          return res.status(400).json({ error: "A tenant with this name already exists" });
        }

        const defaultLimits = {
          maxUsers: plan === 'enterprise' ? 1000 : plan === 'professional' ? 100 : 10,
          maxServices: plan === 'enterprise' ? 500 : plan === 'professional' ? 50 : 10,
          storageGb: plan === 'enterprise' ? 100 : plan === 'professional' ? 20 : 5,
          apiCallsPerMonth: plan === 'enterprise' ? 1000000 : plan === 'professional' ? 100000 : 10000,
        };

        const newTenant = await db.insert(tenants).values({
          name,
          slug,
          plan: plan || 'starter',
          status: 'trial',
          settings: settings || {},
          limits: limits || defaultLimits,
          billingInfo: billingInfo || {},
        }).returning();

        await createAuditLog(
          req.user?.userId || 0,
          'tenant_created',
          'tenant',
          String(newTenant[0].id),
          null,
          { name, slug, plan },
          req
        );

        res.status(201).json(newTenant[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to create tenant" });
      }
    }
  );

  // Get single tenant
  app.get(
    "/api/super-admin/tenants/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);
        const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

        if (tenant.length === 0) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        // Get user count for this tenant (assuming tenantId on users table)
        const userCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.tenantId, tenantId));

        res.json({
          ...tenant[0],
          userCount: Number(userCount[0]?.count || 0),
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch tenant" });
      }
    }
  );

  // Update tenant
  app.put(
    "/api/super-admin/tenants/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);
        const { name, plan, settings, limits, billingInfo } = req.body;

        const existing = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const oldValue = existing[0];

        const updated = await db.update(tenants)
          .set({
            name: name || oldValue.name,
            plan: plan || oldValue.plan,
            settings: settings || oldValue.settings,
            limits: limits || oldValue.limits,
            billingInfo: billingInfo || oldValue.billingInfo,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenantId))
          .returning();

        await createAuditLog(
          req.user?.userId || 0,
          'tenant_updated',
          'tenant',
          String(tenantId),
          oldValue,
          updated[0],
          req
        );

        res.json(updated[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to update tenant" });
      }
    }
  );

  // Suspend tenant
  app.post(
    "/api/super-admin/tenants/:id/suspend",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);
        const { reason } = req.body;

        const existing = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const updated = await db.update(tenants)
          .set({
            status: 'suspended',
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenantId))
          .returning();

        await createAuditLog(
          req.user?.userId || 0,
          'tenant_suspended',
          'tenant',
          String(tenantId),
          { status: existing[0].status },
          { status: 'suspended', reason },
          req
        );

        res.json({ success: true, tenant: updated[0] });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to suspend tenant" });
      }
    }
  );

  // Activate tenant
  app.post(
    "/api/super-admin/tenants/:id/activate",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);

        const existing = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        const updated = await db.update(tenants)
          .set({
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenantId))
          .returning();

        await createAuditLog(
          req.user?.userId || 0,
          'tenant_activated',
          'tenant',
          String(tenantId),
          { status: existing[0].status },
          { status: 'active' },
          req
        );

        res.json({ success: true, tenant: updated[0] });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to activate tenant" });
      }
    }
  );

  // Delete tenant (soft delete)
  app.delete(
    "/api/super-admin/tenants/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);

        const existing = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        // Soft delete by setting status to 'churned'
        const updated = await db.update(tenants)
          .set({
            status: 'churned',
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenantId))
          .returning();

        await createAuditLog(
          req.user?.userId || 0,
          'tenant_deleted',
          'tenant',
          String(tenantId),
          existing[0],
          { status: 'churned' },
          req
        );

        res.json({ success: true, message: "Tenant deleted (soft)" });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to delete tenant" });
      }
    }
  );

  // Get tenant usage
  app.get(
    "/api/super-admin/tenants/:id/usage",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const tenantId = parseInt(req.params.id);

        const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        if (tenant.length === 0) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        // Get user count
        const userCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.tenantId, tenantId));

        // TODO: Add more usage metrics (services, storage, API calls)

        res.json({
          tenantId,
          usage: {
            users: Number(userCount[0]?.count || 0),
            services: 0, // To be implemented
            storageGb: 0, // To be implemented
            apiCalls: 0, // To be implemented
          },
          limits: tenant[0].limits,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch tenant usage" });
      }
    }
  );

  console.log('✅ Tenant routes registered');
}
```

**Step 2: Register routes in server**

Add to `server/routes/index.ts`:
```typescript
import { registerTenantRoutes } from "../tenant-routes";

// In registerAllRoutes function:
registerTenantRoutes(app);
```

**Step 3: Verify server starts**

Run: `npm run dev`
Expected: "✅ Tenant routes registered" in console

**Step 4: Test API with curl**

Run: `curl -X GET http://localhost:5000/api/super-admin/tenants -H "Cookie: session=..."`
Expected: JSON response with tenants array

**Step 5: Commit**

```bash
git add server/tenant-routes.ts server/routes/index.ts
git commit -m "feat(api): add tenant management CRUD endpoints"
```

---

### Task 4: Create Pricing Rules API

**Files:**
- Create: `server/pricing-routes.ts`
- Modify: `server/routes/index.ts`

**Step 1: Write pricing routes**

```typescript
// server/pricing-routes.ts
import type { Express, Response } from "express";
import { db } from "./db";
import { pricingRules } from "@shared/super-admin-schema";
import { services } from "@shared/schema";
import { eq, desc, and, sql, lte, gte, or, isNull } from "drizzle-orm";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";

export function registerPricingRoutes(app: Express) {
  // List pricing rules
  app.get(
    "/api/super-admin/pricing-rules",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { serviceId, tenantId, ruleType, isActive } = req.query;

        const conditions = [];
        if (serviceId) conditions.push(eq(pricingRules.serviceId, parseInt(serviceId as string)));
        if (tenantId) conditions.push(eq(pricingRules.tenantId, parseInt(tenantId as string)));
        if (ruleType) conditions.push(eq(pricingRules.ruleType, ruleType as string));
        if (isActive !== undefined) conditions.push(eq(pricingRules.isActive, isActive === 'true'));

        const rules = await db
          .select()
          .from(pricingRules)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(pricingRules.priority), desc(pricingRules.createdAt));

        res.json({ rules });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch pricing rules" });
      }
    }
  );

  // Create pricing rule
  app.post(
    "/api/super-admin/pricing-rules",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { serviceId, tenantId, ruleType, name, conditions, adjustment, priority, effectiveFrom, effectiveTo } = req.body;

        if (!ruleType || !name || !adjustment) {
          return res.status(400).json({ error: "ruleType, name, and adjustment are required" });
        }

        const newRule = await db.insert(pricingRules).values({
          serviceId: serviceId || null,
          tenantId: tenantId || null,
          ruleType,
          name,
          conditions: conditions || {},
          adjustment,
          priority: priority || 0,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
          isActive: true,
          createdBy: req.user?.userId || null,
        }).returning();

        res.status(201).json(newRule[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to create pricing rule" });
      }
    }
  );

  // Update pricing rule
  app.put(
    "/api/super-admin/pricing-rules/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);
        const { name, conditions, adjustment, priority, effectiveFrom, effectiveTo, isActive } = req.body;

        const existing = await db.select().from(pricingRules).where(eq(pricingRules.id, ruleId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Pricing rule not found" });
        }

        const updated = await db.update(pricingRules)
          .set({
            name: name !== undefined ? name : existing[0].name,
            conditions: conditions !== undefined ? conditions : existing[0].conditions,
            adjustment: adjustment !== undefined ? adjustment : existing[0].adjustment,
            priority: priority !== undefined ? priority : existing[0].priority,
            effectiveFrom: effectiveFrom !== undefined ? (effectiveFrom ? new Date(effectiveFrom) : null) : existing[0].effectiveFrom,
            effectiveTo: effectiveTo !== undefined ? (effectiveTo ? new Date(effectiveTo) : null) : existing[0].effectiveTo,
            isActive: isActive !== undefined ? isActive : existing[0].isActive,
          })
          .where(eq(pricingRules.id, ruleId))
          .returning();

        res.json(updated[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to update pricing rule" });
      }
    }
  );

  // Delete pricing rule
  app.delete(
    "/api/super-admin/pricing-rules/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);

        const existing = await db.select().from(pricingRules).where(eq(pricingRules.id, ruleId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Pricing rule not found" });
        }

        await db.delete(pricingRules).where(eq(pricingRules.id, ruleId));

        res.json({ success: true, message: "Pricing rule deleted" });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to delete pricing rule" });
      }
    }
  );

  // Calculate price for a service
  app.post(
    "/api/super-admin/pricing/calculate",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { serviceId, tenantId, quantity = 1, promoCode } = req.body;

        if (!serviceId) {
          return res.status(400).json({ error: "serviceId is required" });
        }

        // Get base service price
        const service = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
        if (service.length === 0) {
          return res.status(404).json({ error: "Service not found" });
        }

        const basePrice = parseFloat(service[0].price || '0');
        const now = new Date();

        // Get applicable rules (sorted by priority)
        const rules = await db
          .select()
          .from(pricingRules)
          .where(
            and(
              eq(pricingRules.isActive, true),
              or(eq(pricingRules.serviceId, serviceId), isNull(pricingRules.serviceId)),
              or(eq(pricingRules.tenantId, tenantId || 0), isNull(pricingRules.tenantId)),
              or(isNull(pricingRules.effectiveFrom), lte(pricingRules.effectiveFrom, now)),
              or(isNull(pricingRules.effectiveTo), gte(pricingRules.effectiveTo, now))
            )
          )
          .orderBy(desc(pricingRules.priority));

        let finalPrice = basePrice * quantity;
        const appliedDiscounts: Array<{ rule: string; discount: number }> = [];

        for (const rule of rules) {
          // Check conditions
          const conditions = rule.conditions as any;

          // Check quantity conditions
          if (conditions?.minQuantity && quantity < conditions.minQuantity) continue;
          if (conditions?.maxQuantity && quantity > conditions.maxQuantity) continue;

          // Check promo code
          if (conditions?.promoCode && conditions.promoCode !== promoCode) continue;

          // Apply adjustment
          const adjustment = rule.adjustment as { type: string; value: number };
          let discount = 0;

          if (adjustment.type === 'percentage') {
            discount = finalPrice * (adjustment.value / 100);
          } else if (adjustment.type === 'fixed') {
            discount = adjustment.value;
          }

          finalPrice -= discount;
          appliedDiscounts.push({ rule: rule.name, discount });
        }

        res.json({
          serviceId,
          serviceName: service[0].name,
          basePrice,
          quantity,
          subtotal: basePrice * quantity,
          discounts: appliedDiscounts,
          finalPrice: Math.max(0, finalPrice),
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to calculate price" });
      }
    }
  );

  console.log('✅ Pricing routes registered');
}
```

**Step 2: Register routes**

Add to `server/routes/index.ts`:
```typescript
import { registerPricingRoutes } from "../pricing-routes";
// In registerAllRoutes:
registerPricingRoutes(app);
```

**Step 3: Commit**

```bash
git add server/pricing-routes.ts server/routes/index.ts
git commit -m "feat(api): add pricing rules engine endpoints"
```

---

### Task 5: Create Commission API

**Files:**
- Create: `server/commission-routes.ts`
- Modify: `server/routes/index.ts`

**Step 1: Write commission routes**

```typescript
// server/commission-routes.ts
import type { Express, Response } from "express";
import { db } from "./db";
import { commissionRules, commissionPayouts } from "@shared/super-admin-schema";
import { users } from "@shared/schema";
import { eq, desc, and, sql, lte, gte, or, isNull } from "drizzle-orm";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";

export function registerCommissionRoutes(app: Express) {
  // List commission rules
  app.get(
    "/api/super-admin/commission-rules",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { agentTier, serviceCategory, isActive } = req.query;

        const conditions = [];
        if (agentTier) conditions.push(eq(commissionRules.agentTier, agentTier as string));
        if (serviceCategory) conditions.push(eq(commissionRules.serviceCategory, serviceCategory as string));
        if (isActive !== undefined) conditions.push(eq(commissionRules.isActive, isActive === 'true'));

        const rules = await db
          .select()
          .from(commissionRules)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(commissionRules.createdAt));

        res.json({ rules });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch commission rules" });
      }
    }
  );

  // Create commission rule
  app.post(
    "/api/super-admin/commission-rules",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { name, agentTier, serviceCategory, serviceId, basePercentage, volumeBonuses, clawbackRules, effectiveFrom, effectiveTo } = req.body;

        if (!name || basePercentage === undefined || !effectiveFrom) {
          return res.status(400).json({ error: "name, basePercentage, and effectiveFrom are required" });
        }

        const newRule = await db.insert(commissionRules).values({
          name,
          agentTier: agentTier || null,
          serviceCategory: serviceCategory || null,
          serviceId: serviceId || null,
          basePercentage: String(basePercentage),
          volumeBonuses: volumeBonuses || [],
          clawbackRules: clawbackRules || null,
          effectiveFrom: new Date(effectiveFrom),
          effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
          isActive: true,
          createdBy: req.user?.userId || null,
        }).returning();

        res.status(201).json(newRule[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to create commission rule" });
      }
    }
  );

  // Update commission rule
  app.put(
    "/api/super-admin/commission-rules/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);
        const updates = req.body;

        const existing = await db.select().from(commissionRules).where(eq(commissionRules.id, ruleId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Commission rule not found" });
        }

        const updated = await db.update(commissionRules)
          .set({
            ...updates,
            basePercentage: updates.basePercentage !== undefined ? String(updates.basePercentage) : existing[0].basePercentage,
            effectiveFrom: updates.effectiveFrom ? new Date(updates.effectiveFrom) : existing[0].effectiveFrom,
            effectiveTo: updates.effectiveTo !== undefined ? (updates.effectiveTo ? new Date(updates.effectiveTo) : null) : existing[0].effectiveTo,
          })
          .where(eq(commissionRules.id, ruleId))
          .returning();

        res.json(updated[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to update commission rule" });
      }
    }
  );

  // Delete commission rule
  app.delete(
    "/api/super-admin/commission-rules/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const ruleId = parseInt(req.params.id);

        await db.delete(commissionRules).where(eq(commissionRules.id, ruleId));

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to delete commission rule" });
      }
    }
  );

  // List commission payouts
  app.get(
    "/api/super-admin/commission-payouts",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { agentId, status, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string), 100);
        const offset = (pageNum - 1) * limitNum;

        const conditions = [];
        if (agentId) conditions.push(eq(commissionPayouts.agentId, parseInt(agentId as string)));
        if (status) conditions.push(eq(commissionPayouts.status, status as string));

        const payouts = await db
          .select({
            payout: commissionPayouts,
            agentName: users.fullName,
            agentEmail: users.email,
          })
          .from(commissionPayouts)
          .leftJoin(users, eq(commissionPayouts.agentId, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(commissionPayouts.createdAt))
          .limit(limitNum)
          .offset(offset);

        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(commissionPayouts)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        res.json({
          payouts: payouts.map(p => ({ ...p.payout, agentName: p.agentName, agentEmail: p.agentEmail })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: Number(countResult[0]?.count || 0),
            totalPages: Math.ceil(Number(countResult[0]?.count || 0) / limitNum),
          },
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch commission payouts" });
      }
    }
  );

  // Create commission payout
  app.post(
    "/api/super-admin/commission-payouts",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { agentId, periodStart, periodEnd, totalSales, commissionAmount, bonusAmount, deductions } = req.body;

        if (!agentId || !periodStart || !periodEnd) {
          return res.status(400).json({ error: "agentId, periodStart, and periodEnd are required" });
        }

        const netAmount = (parseFloat(commissionAmount || '0') + parseFloat(bonusAmount || '0')) - parseFloat(deductions || '0');

        const newPayout = await db.insert(commissionPayouts).values({
          agentId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          totalSales: totalSales || '0',
          commissionAmount: commissionAmount || '0',
          bonusAmount: bonusAmount || '0',
          deductions: deductions || '0',
          netAmount: String(netAmount),
          status: 'pending',
        }).returning();

        res.status(201).json(newPayout[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to create commission payout" });
      }
    }
  );

  // Approve payout
  app.put(
    "/api/super-admin/commission-payouts/:id/approve",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const payoutId = parseInt(req.params.id);

        const updated = await db.update(commissionPayouts)
          .set({
            status: 'approved',
            approvedBy: req.user?.userId || null,
          })
          .where(eq(commissionPayouts.id, payoutId))
          .returning();

        res.json(updated[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to approve payout" });
      }
    }
  );

  // Mark payout as paid
  app.put(
    "/api/super-admin/commission-payouts/:id/mark-paid",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const payoutId = parseInt(req.params.id);
        const { paymentReference } = req.body;

        const updated = await db.update(commissionPayouts)
          .set({
            status: 'paid',
            paymentReference: paymentReference || null,
            paidAt: new Date(),
          })
          .where(eq(commissionPayouts.id, payoutId))
          .returning();

        res.json(updated[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to mark payout as paid" });
      }
    }
  );

  console.log('✅ Commission routes registered');
}
```

**Step 2: Register and commit**

```bash
git add server/commission-routes.ts server/routes/index.ts
git commit -m "feat(api): add commission rules and payouts endpoints"
```

---

### Task 6: Create Security Incidents API

**Files:**
- Create: `server/security-incidents-routes.ts`

**Step 1: Write security incidents routes**

```typescript
// server/security-incidents-routes.ts
import type { Express, Response } from "express";
import { db } from "./db";
import { securityIncidents } from "@shared/super-admin-schema";
import { users } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";

// Generate incident number
async function generateIncidentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(securityIncidents);
  const count = Number(countResult[0]?.count || 0) + 1;
  return `INC-${year}-${String(count).padStart(4, '0')}`;
}

export function registerSecurityIncidentsRoutes(app: Express) {
  // List security incidents
  app.get(
    "/api/super-admin/security/incidents",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { status, severity, type, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string), 100);
        const offset = (pageNum - 1) * limitNum;

        const conditions = [];
        if (status) conditions.push(eq(securityIncidents.status, status as string));
        if (severity) conditions.push(eq(securityIncidents.severity, severity as string));
        if (type) conditions.push(eq(securityIncidents.type, type as string));

        const incidents = await db
          .select({
            incident: securityIncidents,
            reportedByName: users.fullName,
          })
          .from(securityIncidents)
          .leftJoin(users, eq(securityIncidents.reportedBy, users.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(securityIncidents.createdAt))
          .limit(limitNum)
          .offset(offset);

        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(securityIncidents)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        res.json({
          incidents: incidents.map(i => ({ ...i.incident, reportedByName: i.reportedByName })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: Number(countResult[0]?.count || 0),
            totalPages: Math.ceil(Number(countResult[0]?.count || 0) / limitNum),
          },
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch security incidents" });
      }
    }
  );

  // Create security incident
  app.post(
    "/api/super-admin/security/incidents",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { severity, type, title, description, affectedUsers, affectedTenants } = req.body;

        if (!severity || !type || !title) {
          return res.status(400).json({ error: "severity, type, and title are required" });
        }

        const incidentNumber = await generateIncidentNumber();
        const initialTimeline = [{
          timestamp: new Date().toISOString(),
          action: 'Incident created',
          actor: req.user?.fullName || 'System',
        }];

        const newIncident = await db.insert(securityIncidents).values({
          incidentNumber,
          severity,
          type,
          title,
          description: description || null,
          affectedUsers: affectedUsers || [],
          affectedTenants: affectedTenants || [],
          timeline: initialTimeline,
          status: 'open',
          reportedBy: req.user?.userId || null,
        }).returning();

        res.status(201).json(newIncident[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to create security incident" });
      }
    }
  );

  // Get single incident
  app.get(
    "/api/super-admin/security/incidents/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incidentId = parseInt(req.params.id);

        const incident = await db
          .select({
            incident: securityIncidents,
            reportedByName: users.fullName,
          })
          .from(securityIncidents)
          .leftJoin(users, eq(securityIncidents.reportedBy, users.id))
          .where(eq(securityIncidents.id, incidentId))
          .limit(1);

        if (incident.length === 0) {
          return res.status(404).json({ error: "Incident not found" });
        }

        res.json({ ...incident[0].incident, reportedByName: incident[0].reportedByName });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch incident" });
      }
    }
  );

  // Update incident
  app.put(
    "/api/super-admin/security/incidents/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incidentId = parseInt(req.params.id);
        const updates = req.body;

        const existing = await db.select().from(securityIncidents).where(eq(securityIncidents.id, incidentId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Incident not found" });
        }

        const updated = await db.update(securityIncidents)
          .set(updates)
          .where(eq(securityIncidents.id, incidentId))
          .returning();

        res.json(updated[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to update incident" });
      }
    }
  );

  // Assign incident
  app.post(
    "/api/super-admin/security/incidents/:id/assign",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incidentId = parseInt(req.params.id);
        const { assignedTo } = req.body;

        const existing = await db.select().from(securityIncidents).where(eq(securityIncidents.id, incidentId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Incident not found" });
        }

        const timeline = (existing[0].timeline as any[]) || [];
        timeline.push({
          timestamp: new Date().toISOString(),
          action: 'Incident assigned',
          actor: req.user?.fullName || 'System',
          notes: `Assigned to user ID: ${assignedTo}`,
        });

        const updated = await db.update(securityIncidents)
          .set({
            assignedTo,
            status: 'investigating',
            timeline,
          })
          .where(eq(securityIncidents.id, incidentId))
          .returning();

        res.json(updated[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to assign incident" });
      }
    }
  );

  // Resolve incident
  app.post(
    "/api/super-admin/security/incidents/:id/resolve",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incidentId = parseInt(req.params.id);
        const { resolution, rootCause, lessonsLearned } = req.body;

        const existing = await db.select().from(securityIncidents).where(eq(securityIncidents.id, incidentId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Incident not found" });
        }

        const timeline = (existing[0].timeline as any[]) || [];
        timeline.push({
          timestamp: new Date().toISOString(),
          action: 'Incident resolved',
          actor: req.user?.fullName || 'System',
          notes: resolution,
        });

        const updated = await db.update(securityIncidents)
          .set({
            status: 'resolved',
            resolution,
            rootCause: rootCause || null,
            lessonsLearned: lessonsLearned || null,
            resolvedAt: new Date(),
            timeline,
          })
          .where(eq(securityIncidents.id, incidentId))
          .returning();

        res.json(updated[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to resolve incident" });
      }
    }
  );

  // Add timeline entry
  app.post(
    "/api/super-admin/security/incidents/:id/timeline",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incidentId = parseInt(req.params.id);
        const { action, notes } = req.body;

        if (!action) {
          return res.status(400).json({ error: "action is required" });
        }

        const existing = await db.select().from(securityIncidents).where(eq(securityIncidents.id, incidentId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Incident not found" });
        }

        const timeline = (existing[0].timeline as any[]) || [];
        timeline.push({
          timestamp: new Date().toISOString(),
          action,
          actor: req.user?.fullName || 'System',
          notes: notes || undefined,
        });

        const updated = await db.update(securityIncidents)
          .set({ timeline })
          .where(eq(securityIncidents.id, incidentId))
          .returning();

        res.json(updated[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to add timeline entry" });
      }
    }
  );

  console.log('✅ Security incidents routes registered');
}
```

**Step 2: Commit**

```bash
git add server/security-incidents-routes.ts server/routes/index.ts
git commit -m "feat(api): add security incident management endpoints"
```

---

### Task 7: Create Feature Flags API

**Files:**
- Create: `server/feature-flags-routes.ts`

**Step 1: Write feature flags routes**

```typescript
// server/feature-flags-routes.ts
import type { Express, Response } from "express";
import { db } from "./db";
import { featureFlags } from "@shared/super-admin-schema";
import { eq, desc } from "drizzle-orm";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";

export function registerFeatureFlagsRoutes(app: Express) {
  // List all feature flags
  app.get(
    "/api/super-admin/operations/feature-flags",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const flags = await db
          .select()
          .from(featureFlags)
          .orderBy(desc(featureFlags.createdAt));

        res.json({ flags });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch feature flags" });
      }
    }
  );

  // Create feature flag
  app.post(
    "/api/super-admin/operations/feature-flags",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { key, name, description, enabled, rolloutPercentage, conditions, metadata } = req.body;

        if (!key || !name) {
          return res.status(400).json({ error: "key and name are required" });
        }

        // Check if key exists
        const existing = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).limit(1);
        if (existing.length > 0) {
          return res.status(400).json({ error: "Feature flag key already exists" });
        }

        const newFlag = await db.insert(featureFlags).values({
          key,
          name,
          description: description || null,
          enabled: enabled || false,
          rolloutPercentage: rolloutPercentage || 0,
          conditions: conditions || {},
          metadata: metadata || {},
          createdBy: req.user?.userId || null,
        }).returning();

        res.status(201).json(newFlag[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to create feature flag" });
      }
    }
  );

  // Update feature flag
  app.put(
    "/api/super-admin/operations/feature-flags/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const flagId = parseInt(req.params.id);
        const updates = req.body;

        const existing = await db.select().from(featureFlags).where(eq(featureFlags.id, flagId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Feature flag not found" });
        }

        const updated = await db.update(featureFlags)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(featureFlags.id, flagId))
          .returning();

        res.json(updated[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to update feature flag" });
      }
    }
  );

  // Toggle feature flag
  app.post(
    "/api/super-admin/operations/feature-flags/:id/toggle",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const flagId = parseInt(req.params.id);

        const existing = await db.select().from(featureFlags).where(eq(featureFlags.id, flagId)).limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: "Feature flag not found" });
        }

        const updated = await db.update(featureFlags)
          .set({
            enabled: !existing[0].enabled,
            updatedAt: new Date(),
          })
          .where(eq(featureFlags.id, flagId))
          .returning();

        res.json(updated[0]);
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to toggle feature flag" });
      }
    }
  );

  // Delete feature flag
  app.delete(
    "/api/super-admin/operations/feature-flags/:id",
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.SUPER_ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const flagId = parseInt(req.params.id);

        await db.delete(featureFlags).where(eq(featureFlags.id, flagId));

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to delete feature flag" });
      }
    }
  );

  // Check if feature is enabled (public API for frontend)
  app.get(
    "/api/feature-flags/:key",
    sessionAuthMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { key } = req.params;

        const flag = await db.select().from(featureFlags).where(eq(featureFlags.key, key)).limit(1);

        if (flag.length === 0) {
          return res.json({ enabled: false });
        }

        const flagData = flag[0];
        let enabled = flagData.enabled;

        // Check rollout percentage
        if (enabled && flagData.rolloutPercentage && flagData.rolloutPercentage < 100) {
          const userId = req.user?.userId || 0;
          const hash = userId % 100;
          enabled = hash < flagData.rolloutPercentage;
        }

        // Check conditions
        if (enabled && flagData.conditions) {
          const conditions = flagData.conditions as any;

          // Check tenant condition
          if (conditions.tenants?.length > 0 && req.user?.tenantId) {
            if (!conditions.tenants.includes(req.user.tenantId)) {
              enabled = false;
            }
          }

          // Check user condition
          if (conditions.users?.length > 0 && req.user?.userId) {
            if (!conditions.users.includes(req.user.userId)) {
              enabled = false;
            }
          }

          // Check role condition
          if (conditions.roles?.length > 0 && req.user?.role) {
            if (!conditions.roles.includes(req.user.role)) {
              enabled = false;
            }
          }
        }

        res.json({ key, enabled });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to check feature flag" });
      }
    }
  );

  console.log('✅ Feature flags routes registered');
}
```

**Step 2: Commit**

```bash
git add server/feature-flags-routes.ts server/routes/index.ts
git commit -m "feat(api): add feature flags management endpoints"
```

---

## Phase 3: Frontend Components

### Task 8: Update Routes Configuration

**Files:**
- Modify: `client/src/config/routes.ts`

**Step 1: Add new Super Admin routes**

Add to ROUTES object in `client/src/config/routes.ts`:
```typescript
// Super Admin Routes (add after existing SUPER_ADMIN)
SUPER_ADMIN_DASHBOARD: '/super-admin/dashboard',
SUPER_ADMIN_TENANTS: '/super-admin/tenants',
SUPER_ADMIN_SERVICES: '/super-admin/services',
SUPER_ADMIN_PRICING: '/super-admin/pricing',
SUPER_ADMIN_COMMISSIONS: '/super-admin/commissions',
SUPER_ADMIN_INTEGRATIONS: '/super-admin/integrations',
SUPER_ADMIN_SECURITY: '/super-admin/security',
SUPER_ADMIN_OPERATIONS: '/super-admin/operations',
SUPER_ADMIN_ANALYTICS: '/super-admin/analytics',
```

Add to ROUTE_GROUPS.superAdmin:
```typescript
superAdmin: [
  { path: ROUTES.SUPER_ADMIN, label: 'Overview', icon: 'Crown' },
  { path: ROUTES.SUPER_ADMIN_TENANTS, label: 'Tenants', icon: 'Building2' },
  { path: ROUTES.SUPER_ADMIN_SERVICES, label: 'Services', icon: 'Briefcase' },
  { path: ROUTES.SUPER_ADMIN_PRICING, label: 'Pricing', icon: 'DollarSign' },
  { path: ROUTES.SUPER_ADMIN_COMMISSIONS, label: 'Commissions', icon: 'Percent' },
  { path: ROUTES.SUPER_ADMIN_SECURITY, label: 'Security', icon: 'ShieldAlert' },
  { path: ROUTES.SUPER_ADMIN_OPERATIONS, label: 'Operations', icon: 'Settings' },
  { path: ROUTES.SUPER_ADMIN_ANALYTICS, label: 'Analytics', icon: 'BarChart3' },
],
```

**Step 2: Commit**

```bash
git add client/src/config/routes.ts
git commit -m "feat(routes): add super admin control center routes"
```

---

### Task 9: Create Tenant Management UI

**Files:**
- Create: `client/src/pages/super-admin/TenantManagement.tsx`

**Step 1: Write TenantManagement component**

```typescript
// client/src/pages/super-admin/TenantManagement.tsx
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Pause,
  Users,
  Settings,
  TrendingUp
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: string;
  plan: string;
  settings: any;
  limits: any;
  billingInfo: any;
  createdAt: string;
  userCount?: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  trial: 'bg-blue-500',
  suspended: 'bg-red-500',
  churned: 'bg-gray-500',
};

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-500',
  professional: 'bg-blue-500',
  enterprise: 'bg-purple-500',
};

export default function TenantManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const { toast } = useToast();

  // Fetch tenants
  const { data: tenantsData, isLoading } = useQuery<{ tenants: Tenant[]; pagination: any }>({
    queryKey: ['/api/super-admin/tenants', { search: searchTerm, status: statusFilter, plan: planFilter }],
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/super-admin/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      setIsCreateDialogOpen(false);
      toast({ title: 'Success', description: 'Tenant created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/super-admin/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      setIsEditDialogOpen(false);
      toast({ title: 'Success', description: 'Tenant updated successfully' });
    },
  });

  // Suspend/Activate mutations
  const suspendMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/super-admin/tenants/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin action' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      toast({ title: 'Success', description: 'Tenant suspended' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/super-admin/tenants/${id}/activate`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/super-admin/tenants'] });
      toast({ title: 'Success', description: 'Tenant activated' });
    },
  });

  const handleCreateTenant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTenantMutation.mutate({
      name: formData.get('name'),
      plan: formData.get('plan'),
    });
  };

  const handleUpdateTenant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTenant) return;
    const formData = new FormData(e.currentTarget);
    updateTenantMutation.mutate({
      id: selectedTenant.id,
      data: {
        name: formData.get('name'),
        plan: formData.get('plan'),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">Manage all tenants on the platform</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="churned">Churned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All plans</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tenant List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">Loading tenants...</CardContent>
          </Card>
        ) : tenantsData?.tenants.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">No tenants found</CardContent>
          </Card>
        ) : (
          tenantsData?.tenants.map((tenant) => (
            <Card key={tenant.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{tenant.name}</h3>
                      <p className="text-sm text-muted-foreground">Slug: {tenant.slug}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className={STATUS_COLORS[tenant.status] || 'bg-gray-500'}>
                          {tenant.status}
                        </Badge>
                        <Badge variant="outline" className={PLAN_COLORS[tenant.plan] || ''}>
                          {tenant.plan}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <Users className="h-5 w-5 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium">{tenant.userCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Users</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {tenant.status === 'suspended' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => activateMutation.mutate(tenant.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      ) : tenant.status !== 'churned' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => suspendMutation.mutate(tenant.id)}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>Add a new tenant to the platform</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tenant Name *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Select name="plan" defaultValue="starter">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTenantMutation.isPending}>
                {createTenantMutation.isPending ? 'Creating...' : 'Create Tenant'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>Update tenant information</DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <form onSubmit={handleUpdateTenant} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Tenant Name</Label>
                <Input id="edit-name" name="name" defaultValue={selectedTenant.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plan">Plan</Label>
                <Select name="plan" defaultValue={selectedTenant.plan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTenantMutation.isPending}>
                  {updateTenantMutation.isPending ? 'Updating...' : 'Update Tenant'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/pages/super-admin/TenantManagement.tsx
git commit -m "feat(ui): add tenant management page for super admin"
```

---

### Task 10: Create Enhanced Super Admin Dashboard

**Files:**
- Create: `client/src/pages/super-admin/SuperAdminDashboard.tsx`

**Step 1: Write enhanced dashboard**

```typescript
// client/src/pages/super-admin/SuperAdminDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Crown,
  Users,
  Building2,
  Activity,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react';
import { Link } from 'wouter';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalTenants: number;
  activeTenants: number;
  pendingIncidents: number;
  monthlyRevenue: number;
  systemHealth: string;
}

export default function SuperAdminDashboard() {
  // Fetch dashboard metrics
  const { data: stats } = useQuery<any>({
    queryKey: ['/api/super-admin/stats'],
  });

  const { data: health } = useQuery<any>({
    queryKey: ['/api/super-admin/health'],
    refetchInterval: 30000,
  });

  const { data: recentIncidents } = useQuery<any>({
    queryKey: ['/api/super-admin/security/incidents', { status: 'open', limit: 5 }],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold dark:text-white">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Platform overview and control center</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* System Health Banner */}
        {health && (
          <Card className={health.status === 'Optimal' ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {health.status === 'Optimal' ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  )}
                  <div>
                    <p className="font-semibold">System Status: {health.status}</p>
                    <p className="text-sm text-muted-foreground">
                      Database: {health.database} | Uptime: {Math.floor(health.uptime / 3600)}h
                    </p>
                  </div>
                </div>
                <Badge variant={health.status === 'Optimal' ? 'default' : 'secondary'}>
                  All Systems Operational
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.activeUsers || 0} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tenants</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
              <p className="text-xs text-muted-foreground">{stats?.activeTenants || 0} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{recentIncidents?.incidents?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{health?.status || 'Loading...'}</div>
              <p className="text-xs text-muted-foreground">All checks passing</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/super-admin/tenants">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <Building2 className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="font-semibold">Manage Tenants</h3>
                <p className="text-sm text-muted-foreground">Create, edit, suspend tenants</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/super-admin/pricing">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <DollarSign className="h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-semibold">Pricing Engine</h3>
                <p className="text-sm text-muted-foreground">Configure pricing rules</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/super-admin/security">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <ShieldAlert className="h-8 w-8 text-red-600 mb-2" />
                <h3 className="font-semibold">Security Center</h3>
                <p className="text-sm text-muted-foreground">View & manage incidents</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/super-admin/operations">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <Activity className="h-8 w-8 text-purple-600 mb-2" />
                <h3 className="font-semibold">Operations</h3>
                <p className="text-sm text-muted-foreground">Feature flags, jobs, cache</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Security Incidents */}
        {recentIncidents?.incidents?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                Open Security Incidents
              </CardTitle>
              <CardDescription>Incidents requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentIncidents.incidents.map((incident: any) => (
                  <div key={incident.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {incident.severity}
                        </Badge>
                        <span className="font-medium">{incident.incidentNumber}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{incident.title}</p>
                    </div>
                    <Link href={`/super-admin/security?incident=${incident.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/pages/super-admin/SuperAdminDashboard.tsx
git commit -m "feat(ui): add enhanced super admin dashboard"
```

---

### Task 11: Register Routes in App

**Files:**
- Modify: `client/src/App.tsx` (or main routing file)

**Step 1: Add route imports and definitions**

Add to App.tsx:
```typescript
import TenantManagement from '@/pages/super-admin/TenantManagement';
import SuperAdminDashboard from '@/pages/super-admin/SuperAdminDashboard';

// In route definitions:
<Route path="/super-admin/dashboard" component={SuperAdminDashboard} />
<Route path="/super-admin/tenants" component={TenantManagement} />
```

**Step 2: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat(routes): register super admin control center pages"
```

---

## Phase 4: Integration & Testing

### Task 12: Register All Backend Routes

**Files:**
- Modify: `server/routes/index.ts`

**Step 1: Import and register all new routes**

```typescript
// server/routes/index.ts
import { registerTenantRoutes } from "../tenant-routes";
import { registerPricingRoutes } from "../pricing-routes";
import { registerCommissionRoutes } from "../commission-routes";
import { registerSecurityIncidentsRoutes } from "../security-incidents-routes";
import { registerFeatureFlagsRoutes } from "../feature-flags-routes";

export function registerAllRoutes(app: Express) {
  // ... existing routes

  // Super Admin Control Center routes
  registerTenantRoutes(app);
  registerPricingRoutes(app);
  registerCommissionRoutes(app);
  registerSecurityIncidentsRoutes(app);
  registerFeatureFlagsRoutes(app);
}
```

**Step 2: Verify server starts**

Run: `npm run dev`
Expected: All route registration logs appear

**Step 3: Commit**

```bash
git add server/routes/index.ts
git commit -m "feat(api): register all super admin control center routes"
```

---

### Task 13: Final Integration Test

**Step 1: Start development server**

Run: `npm run dev`
Expected: Server starts without errors

**Step 2: Test API endpoints**

```bash
# Test tenant API
curl http://localhost:5000/api/super-admin/tenants

# Test pricing API
curl http://localhost:5000/api/super-admin/pricing-rules

# Test commission API
curl http://localhost:5000/api/super-admin/commission-rules

# Test security incidents API
curl http://localhost:5000/api/super-admin/security/incidents

# Test feature flags API
curl http://localhost:5000/api/super-admin/operations/feature-flags
```

**Step 3: Test UI pages**

1. Navigate to `/super-admin/dashboard`
2. Navigate to `/super-admin/tenants`
3. Create a test tenant
4. Edit the tenant
5. Suspend/activate the tenant

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete super admin control center implementation

- Add tenant management (CRUD, suspend, activate)
- Add pricing engine with dynamic rules
- Add commission configuration and payouts
- Add security incident management
- Add feature flags system
- Add enhanced super admin dashboard
- All endpoints secured with super_admin role requirement
- Full audit logging for compliance"
```

---

## Summary

This implementation plan covers:

1. **Database Schema** - 6 new tables for tenants, pricing, commissions, incidents, feature flags, scheduled reports
2. **Backend APIs** - CRUD endpoints for all entities with proper authentication and audit logging
3. **Frontend Components** - Dashboard, tenant management, and integration with existing Super Admin Portal
4. **Security** - All endpoints require super_admin role, audit logging for all actions

**Total Tasks:** 13
**Estimated Implementation:** 4-6 hours with TDD approach

**Post-Implementation:**
- Run full test suite
- Deploy to staging
- User acceptance testing
- Production deployment
