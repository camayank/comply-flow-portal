# Super Admin Control Center - Design Document

**Date:** 2026-02-14
**Status:** Approved for Implementation
**Author:** Claude (AI Assistant)

## Executive Summary

Comprehensive Super Admin Control Center for DigiComply platform providing full operational control over tenants, services, pricing, commissions, integrations, security, and analytics. Production-ready design following existing codebase patterns.

## Goals

1. Provide Super Admins complete platform oversight and control
2. Enable multi-tenant management with impersonation capability
3. Implement flexible pricing and commission engines
4. Centralize security incident management
5. Deliver actionable analytics and reporting

## Architecture

### Module Structure

```
/super-admin
├── Dashboard (system overview, health, alerts)
├── /tenants (multi-tenant management)
├── /services (service catalog + pricing engine)
├── /compliance (rules engine, automation)
├── /integrations (API keys, webhooks, partners)
├── /financial (commissions, billing, revenue)
├── /security (incidents, access reviews, audit)
├── /operations (jobs, queues, feature flags)
└── /analytics (reports, exports, BI)
```

### Design Decision: Modular Dashboard Architecture

Selected over unified control panel or micro-frontend approaches for:
- Clean separation of concerns
- Alignment with existing `/admin`, `/operations` patterns
- Better code splitting and maintainability
- Easier testing and deployment

## Database Schema

### New Tables

#### 1. Tenants

```sql
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'trial', -- active, suspended, trial, churned
  plan TEXT DEFAULT 'starter', -- starter, professional, enterprise
  settings JSONB,
  limits JSONB,
  billing_info JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Pricing Rules

```sql
CREATE TABLE pricing_rules (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id),
  tenant_id INTEGER REFERENCES tenants(id), -- NULL for global rules
  rule_type TEXT NOT NULL, -- base, volume, promo, seasonal, loyalty
  name TEXT NOT NULL,
  conditions JSONB, -- { minQuantity, maxQuantity, userTier, etc }
  adjustment JSONB NOT NULL, -- { type: 'percentage'|'fixed', value: number }
  priority INTEGER DEFAULT 0,
  effective_from TIMESTAMP,
  effective_to TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. Commission Rules

```sql
CREATE TABLE commission_rules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  agent_tier TEXT, -- silver, gold, platinum, NULL for all
  service_category TEXT, -- NULL for all categories
  service_id INTEGER REFERENCES services(id), -- NULL for category-wide
  base_percentage NUMERIC(5,2) NOT NULL,
  volume_bonuses JSONB, -- [{ threshold: 10, bonus: 2 }, { threshold: 50, bonus: 5 }]
  clawback_rules JSONB, -- { period: '90d', conditions: [...] }
  effective_from TIMESTAMP NOT NULL,
  effective_to TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. Commission Payouts

```sql
CREATE TABLE commission_payouts (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES users(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sales NUMERIC(12,2),
  commission_amount NUMERIC(12,2),
  bonus_amount NUMERIC(12,2),
  deductions NUMERIC(12,2),
  net_amount NUMERIC(12,2),
  status TEXT DEFAULT 'pending', -- pending, approved, paid, disputed
  payment_reference TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. Security Incidents

```sql
CREATE TABLE security_incidents (
  id SERIAL PRIMARY KEY,
  incident_number TEXT UNIQUE NOT NULL, -- INC-2024-0001
  severity TEXT NOT NULL, -- low, medium, high, critical
  type TEXT NOT NULL, -- unauthorized_access, data_breach, suspicious_activity, policy_violation
  status TEXT DEFAULT 'open', -- open, investigating, contained, resolved, closed
  title TEXT NOT NULL,
  description TEXT,
  affected_users JSONB, -- [{ userId, impact }]
  affected_tenants JSONB,
  timeline JSONB, -- [{ timestamp, action, actor }]
  investigation JSONB,
  root_cause TEXT,
  resolution TEXT,
  lessons_learned TEXT,
  reported_by INTEGER REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP
);
```

#### 6. Feature Flags

```sql
CREATE TABLE feature_flags (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0, -- 0-100
  conditions JSONB, -- { tenants: [], users: [], plans: [] }
  metadata JSONB,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. Scheduled Reports

```sql
CREATE TABLE scheduled_reports (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  parameters JSONB,
  schedule TEXT NOT NULL, -- cron expression
  recipients JSONB, -- [{ email, format }]
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Dashboard APIs

```
GET  /api/super-admin/dashboard/health
     Returns: { database, redis, queues, apiLatency, errorRate }

GET  /api/super-admin/dashboard/metrics
     Returns: { activeTenants, monthlyRevenue, activeUsers, pendingTasks }

GET  /api/super-admin/dashboard/alerts
     Returns: [{ id, type, severity, message, timestamp }]
```

### Tenant Management APIs

```
GET    /api/super-admin/tenants
       Query: ?status=active&plan=professional&search=xyz
       Returns: { tenants: [], pagination }

POST   /api/super-admin/tenants
       Body: { name, slug, plan, settings, limits }
       Returns: { tenant }

GET    /api/super-admin/tenants/:id
       Returns: { tenant, usage, users, services }

PUT    /api/super-admin/tenants/:id
       Body: { name, plan, settings, limits }

DELETE /api/super-admin/tenants/:id
       Soft delete with data retention

POST   /api/super-admin/tenants/:id/suspend
       Body: { reason, duration }

POST   /api/super-admin/tenants/:id/activate

POST   /api/super-admin/tenants/:id/impersonate
       Returns: { impersonationToken, expiresAt }

GET    /api/super-admin/tenants/:id/usage
       Returns: { users, services, storage, apiCalls }
```

### Pricing Engine APIs

```
GET    /api/super-admin/pricing-rules
       Query: ?serviceId=x&tenantId=y&type=promo

POST   /api/super-admin/pricing-rules
       Body: { serviceId, tenantId, ruleType, conditions, adjustment, priority }

PUT    /api/super-admin/pricing-rules/:id

DELETE /api/super-admin/pricing-rules/:id

POST   /api/super-admin/pricing/calculate
       Body: { serviceId, tenantId, quantity, promoCode }
       Returns: { basePrice, discounts: [], finalPrice }
```

### Commission APIs

```
GET    /api/super-admin/commission-rules
POST   /api/super-admin/commission-rules
PUT    /api/super-admin/commission-rules/:id
DELETE /api/super-admin/commission-rules/:id

GET    /api/super-admin/commissions/calculate
       Query: ?agentId=x&periodStart=date&periodEnd=date

GET    /api/super-admin/commissions/payouts
       Query: ?status=pending&agentId=x

POST   /api/super-admin/commissions/payouts
       Body: { agentId, periodStart, periodEnd }

PUT    /api/super-admin/commissions/payouts/:id/approve
PUT    /api/super-admin/commissions/payouts/:id/mark-paid
       Body: { paymentReference }
```

### Integration Hub APIs

```
GET    /api/super-admin/integrations/api-keys
POST   /api/super-admin/integrations/api-keys
       Body: { name, scopes, rateLimit, expiresAt }
DELETE /api/super-admin/integrations/api-keys/:id
POST   /api/super-admin/integrations/api-keys/:id/rotate

GET    /api/super-admin/integrations/webhooks
POST   /api/super-admin/integrations/webhooks
       Body: { url, events, secret }
PUT    /api/super-admin/integrations/webhooks/:id
DELETE /api/super-admin/integrations/webhooks/:id
GET    /api/super-admin/integrations/webhooks/:id/deliveries
POST   /api/super-admin/integrations/webhooks/:id/test
```

### Security APIs

```
GET    /api/super-admin/security/incidents
       Query: ?status=open&severity=high

POST   /api/super-admin/security/incidents
       Body: { severity, type, title, description, affectedUsers }

GET    /api/super-admin/security/incidents/:id
PUT    /api/super-admin/security/incidents/:id
POST   /api/super-admin/security/incidents/:id/assign
       Body: { assignedTo }
POST   /api/super-admin/security/incidents/:id/resolve
       Body: { resolution, rootCause }
POST   /api/super-admin/security/incidents/:id/timeline
       Body: { action, notes }

GET    /api/super-admin/security/access-reviews
POST   /api/super-admin/security/access-reviews
GET    /api/super-admin/security/access-reviews/:id
PUT    /api/super-admin/security/access-reviews/:id/approve
PUT    /api/super-admin/security/access-reviews/:id/reject
```

### Operations APIs

```
GET    /api/super-admin/operations/jobs
       Query: ?status=failed&type=email
POST   /api/super-admin/operations/jobs/:id/retry
DELETE /api/super-admin/operations/jobs/:id

GET    /api/super-admin/operations/feature-flags
POST   /api/super-admin/operations/feature-flags
PUT    /api/super-admin/operations/feature-flags/:id
DELETE /api/super-admin/operations/feature-flags/:id
POST   /api/super-admin/operations/feature-flags/:id/toggle

POST   /api/super-admin/operations/cache/clear
       Body: { pattern } -- optional, clears all if not provided

GET    /api/super-admin/operations/queues
       Returns: { queues: [{ name, pending, processing, failed }] }
```

### Analytics APIs

```
GET    /api/super-admin/analytics/reports
       Query: ?type=revenue&period=monthly

POST   /api/super-admin/analytics/reports/custom
       Body: { metrics, dimensions, filters, groupBy }

GET    /api/super-admin/analytics/exports
POST   /api/super-admin/analytics/exports
       Body: { reportId, format, recipients }

GET    /api/super-admin/analytics/scheduled-reports
POST   /api/super-admin/analytics/scheduled-reports
PUT    /api/super-admin/analytics/scheduled-reports/:id
DELETE /api/super-admin/analytics/scheduled-reports/:id
```

## UI Components

### Page Structure

```
client/src/pages/super-admin/
├── SuperAdminDashboard.tsx       -- Main overview
├── TenantManagement.tsx          -- Tenant CRUD
├── TenantDetail.tsx              -- Single tenant view
├── ServiceCatalogAdmin.tsx       -- Service management
├── PricingEngine.tsx             -- Pricing rules
├── CommissionConfig.tsx          -- Commission rules
├── CommissionPayouts.tsx         -- Payout management
├── IntegrationHub.tsx            -- API keys & webhooks
├── SecurityCenter.tsx            -- Incident management
├── AccessReviews.tsx             -- Access review workflows
├── FeatureFlagManager.tsx        -- Feature toggles
├── JobMonitor.tsx                -- Background jobs
├── ReportBuilder.tsx             -- Custom reports
└── ScheduledReports.tsx          -- Report scheduling
```

### Shared Components

```
client/src/components/super-admin/
├── SystemHealthCard.tsx
├── MetricCard.tsx
├── AlertBanner.tsx
├── TenantCard.tsx
├── PricingRuleBuilder.tsx
├── CommissionRuleForm.tsx
├── IncidentTimeline.tsx
├── FeatureFlagToggle.tsx
├── ReportChart.tsx
└── ExportButton.tsx
```

### Navigation Integration

Add to `ROUTES` and `ROUTE_GROUPS.superAdmin`:

```typescript
// In config/routes.ts
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

## Security Considerations

1. **Authentication:** All endpoints require `super_admin` role
2. **Audit Logging:** Every action logged with actor, target, action, timestamp
3. **Impersonation:** Creates separate session, logged with reason, auto-expires
4. **Rate Limiting:** Stricter limits on sensitive operations
5. **IP Whitelisting:** Optional for Super Admin access
6. **Two-Factor:** Required for Super Admin role

## Implementation Priority

### Phase 1: Core Infrastructure (Week 1)
- Database migrations for new tables
- Super Admin dashboard with health metrics
- Tenant management CRUD

### Phase 2: Financial Controls (Week 2)
- Pricing engine with rules
- Commission configuration
- Payout management

### Phase 3: Security & Operations (Week 3)
- Security incident management
- Feature flag system
- Job monitoring

### Phase 4: Analytics & Polish (Week 4)
- Report builder
- Scheduled reports
- UI polish and testing

## Success Metrics

- Super Admin can manage all tenants without engineering support
- Pricing changes reflected within 1 minute
- Commission calculations accurate to < 0.01%
- Security incidents tracked with full audit trail
- Feature flags enable/disable within 30 seconds

## Appendix: TypeScript Interfaces

```typescript
// Types for frontend components

interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial' | 'churned';
  plan: 'starter' | 'professional' | 'enterprise';
  settings: TenantSettings;
  limits: TenantLimits;
  billingInfo: BillingInfo;
  createdAt: string;
  updatedAt: string;
}

interface TenantSettings {
  branding?: { logo?: string; primaryColor?: string };
  features?: { enabled: string[] };
  notifications?: { email: boolean; sms: boolean };
}

interface TenantLimits {
  maxUsers: number;
  maxServices: number;
  storageGb: number;
  apiCallsPerMonth: number;
}

interface PricingRule {
  id: number;
  serviceId?: number;
  tenantId?: number;
  ruleType: 'base' | 'volume' | 'promo' | 'seasonal' | 'loyalty';
  name: string;
  conditions: PricingConditions;
  adjustment: { type: 'percentage' | 'fixed'; value: number };
  priority: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
}

interface CommissionRule {
  id: number;
  name: string;
  agentTier?: 'silver' | 'gold' | 'platinum';
  serviceCategory?: string;
  serviceId?: number;
  basePercentage: number;
  volumeBonuses: VolumeBonus[];
  clawbackRules?: ClawbackRule;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

interface VolumeBonus {
  threshold: number;
  bonusPercentage: number;
}

interface SecurityIncident {
  id: number;
  incidentNumber: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'unauthorized_access' | 'data_breach' | 'suspicious_activity' | 'policy_violation';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  title: string;
  description?: string;
  affectedUsers?: AffectedUser[];
  timeline: TimelineEntry[];
  resolution?: string;
  assignedTo?: number;
  createdAt: string;
  resolvedAt?: string;
}

interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: {
    tenants?: number[];
    users?: number[];
    plans?: string[];
  };
}
```
