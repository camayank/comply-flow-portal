import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { users } from "./schema";

// ============================================================================
// SUPER ADMIN CONTROL CENTER SCHEMA
// ============================================================================

// Type definitions for JSON fields
export type TenantSettings = {
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  features?: {
    [key: string]: boolean;
  };
  notifications?: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
  };
};

export type TenantLimits = {
  maxUsers: number;
  maxServices: number;
  storageGb: number;
  apiCallsPerMonth: number;
};

export type TenantBillingInfo = {
  contactEmail: string;
  address?: string;
  gstNumber?: string;
};

export type PricingConditions = {
  minQuantity?: number;
  maxQuantity?: number;
  userTier?: string;
  promoCode?: string;
  dates?: {
    start?: string;
    end?: string;
  };
};

export type PricingAdjustment = {
  type: 'percentage' | 'fixed';
  value: number;
};

export type VolumeBonus = {
  threshold: number;
  bonusPercentage: number;
};

export type ClawbackRules = {
  period?: number; // days
  conditions?: string[];
  percentage?: number;
};

export type TimelineEntry = {
  timestamp: string;
  action: string;
  actor: string;
  notes?: string;
};

export type InvestigationData = {
  findings?: string[];
  evidence?: string[];
  interviews?: string[];
};

export type FeatureFlagConditions = {
  tenants?: number[];
  users?: number[];
  plans?: string[];
  roles?: string[];
};

export type ReportRecipient = {
  email: string;
  format: 'pdf' | 'csv' | 'xlsx';
};

// ============================================================================
// TENANTS - Multi-tenant management
// ============================================================================

export const TENANT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TRIAL: 'trial',
  CHURNED: 'churned'
} as const;

export const TENANT_PLAN = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
} as const;

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").default(TENANT_STATUS.TRIAL), // active, suspended, trial, churned
  plan: text("plan").default(TENANT_PLAN.STARTER), // starter, professional, enterprise
  settings: json("settings").$type<TenantSettings>(),
  limits: json("limits").$type<TenantLimits>(),
  billingInfo: json("billing_info").$type<TenantBillingInfo>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// PRICING RULES - Dynamic pricing engine
// ============================================================================

export const PRICING_RULE_TYPE = {
  BASE: 'base',
  VOLUME: 'volume',
  PROMO: 'promo',
  SEASONAL: 'seasonal',
  LOYALTY: 'loyalty'
} as const;

export const pricingRules = pgTable("pricing_rules", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id"),
  tenantId: integer("tenant_id").references(() => tenants.id),
  ruleType: text("rule_type").notNull(), // base, volume, promo, seasonal, loyalty
  name: text("name").notNull(),
  conditions: json("conditions").$type<PricingConditions>(),
  adjustment: json("adjustment").$type<PricingAdjustment>().notNull(),
  priority: integer("priority").default(0),
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// ============================================================================
// COMMISSION RULES - Agent commission configuration
// ============================================================================

export const AGENT_TIER = {
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum'
} as const;

export const commissionRules = pgTable("commission_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  agentTier: text("agent_tier"), // silver, gold, platinum, null for all
  serviceCategory: text("service_category"),
  serviceId: integer("service_id"),
  basePercentage: decimal("base_percentage", { precision: 5, scale: 2 }).notNull(),
  volumeBonuses: json("volume_bonuses").$type<VolumeBonus[]>(),
  clawbackRules: json("clawback_rules").$type<ClawbackRules>(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// ============================================================================
// COMMISSION PAYOUTS - Agent payout tracking
// ============================================================================

export const PAYOUT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  DISPUTED: 'disputed'
} as const;

export const commissionPayouts = pgTable("commission_payouts", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().references(() => users.id),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }),
  bonusAmount: decimal("bonus_amount", { precision: 12, scale: 2 }),
  deductions: decimal("deductions", { precision: 12, scale: 2 }),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }),
  status: text("status").default(PAYOUT_STATUS.PENDING), // pending, approved, paid, disputed
  paymentReference: text("payment_reference"),
  paidAt: timestamp("paid_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// SECURITY INCIDENTS - Security incident management
// ============================================================================

export const INCIDENT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const INCIDENT_TYPE = {
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  DATA_BREACH: 'data_breach',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  POLICY_VIOLATION: 'policy_violation'
} as const;

export const INCIDENT_STATUS = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  CONTAINED: 'contained',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
} as const;

export const securityIncidents = pgTable("security_incidents", {
  id: serial("id").primaryKey(),
  incidentNumber: text("incident_number").notNull().unique(), // INC-YYYY-NNNN format
  severity: text("severity").notNull(), // low, medium, high, critical
  type: text("type").notNull(), // unauthorized_access, data_breach, suspicious_activity, policy_violation
  status: text("status").default(INCIDENT_STATUS.OPEN), // open, investigating, contained, resolved, closed
  title: text("title").notNull(),
  description: text("description"),
  affectedUsers: json("affected_users").$type<number[]>(),
  affectedTenants: json("affected_tenants").$type<number[]>(),
  timeline: json("timeline").$type<TimelineEntry[]>(),
  investigation: json("investigation").$type<InvestigationData>(),
  rootCause: text("root_cause"),
  resolution: text("resolution"),
  lessonsLearned: text("lessons_learned"),
  reportedBy: integer("reported_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
});

// ============================================================================
// FEATURE FLAGS - Feature flag management
// ============================================================================

export const featureFlags = pgTable("feature_flags", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").default(false),
  rolloutPercentage: integer("rollout_percentage").default(0), // 0-100
  conditions: json("conditions").$type<FeatureFlagConditions>(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// SCHEDULED REPORTS - Scheduled report configuration
// ============================================================================

export const scheduledReports = pgTable("scheduled_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  reportType: text("report_type").notNull(),
  parameters: json("parameters").$type<Record<string, unknown>>(),
  schedule: text("schedule").notNull(), // cron expression
  recipients: json("recipients").$type<ReportRecipient[]>(),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// INSERT SCHEMAS
// ============================================================================

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPricingRuleSchema = createInsertSchema(pricingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

export const insertCommissionRuleSchema = createInsertSchema(commissionRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

export const insertCommissionPayoutSchema = createInsertSchema(commissionPayouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedBy: true,
});

export const insertSecurityIncidentSchema = createInsertSchema(securityIncidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reportedBy: true,
  assignedTo: true,
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

export const insertScheduledReportSchema = createInsertSchema(scheduledReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = typeof pricingRules.$inferInsert;

export type CommissionRule = typeof commissionRules.$inferSelect;
export type InsertCommissionRule = typeof commissionRules.$inferInsert;

export type CommissionPayout = typeof commissionPayouts.$inferSelect;
export type InsertCommissionPayout = typeof commissionPayouts.$inferInsert;

export type SecurityIncident = typeof securityIncidents.$inferSelect;
export type InsertSecurityIncident = typeof securityIncidents.$inferInsert;

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = typeof featureFlags.$inferInsert;

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type InsertScheduledReport = typeof scheduledReports.$inferInsert;
