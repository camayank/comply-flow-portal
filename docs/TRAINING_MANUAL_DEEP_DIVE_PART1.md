# DigiComply Platform - Deep Dive Training Manual
## Part 1: Architecture & User Roles

**Version:** 2.0 (Deep Dive Edition)
**Last Updated:** February 2026

---

## 1. System Architecture

### 1.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | UI Framework |
| **Styling** | Tailwind CSS + shadcn/ui | Component styling |
| **State** | TanStack Query (React Query) | Server state management |
| **Forms** | React Hook Form + Zod | Form handling & validation |
| **Routing** | Wouter | Client-side routing |
| **Build** | Vite | Development & bundling |
| **Backend** | Express.js + Node.js | API server |
| **Database** | PostgreSQL | Data persistence |
| **ORM** | Drizzle ORM | Database abstraction |
| **Auth** | JWT + Session | Dual authentication |
| **Payments** | Razorpay | Payment gateway |
| **SMS/OTP** | Twilio | OTP delivery |

### 1.2 Directory Structure

```
comply-flow-portal/
├── client/
│   └── src/
│       ├── features/           # Feature-based modules
│       │   ├── admin/          # Admin dashboard
│       │   ├── agent/          # Agent portal
│       │   ├── auth/           # Authentication
│       │   ├── client-portal/  # Client portal
│       │   ├── compliance/     # Compliance tracking
│       │   ├── customer-success/ # CS module
│       │   ├── executive/      # Executive dashboards
│       │   ├── finance/        # Financial management
│       │   ├── hr/             # HR module
│       │   ├── messaging/      # Communication
│       │   ├── onboarding/     # Client onboarding
│       │   ├── operations/     # Operations portal
│       │   ├── qc/             # Quality control
│       │   ├── sales/          # Sales pipeline
│       │   ├── security/       # Security incidents
│       │   ├── shared/         # Shared pages
│       │   └── super-admin/    # Super admin
│       ├── components/         # Shared components
│       │   ├── ui/             # UI primitives (56+)
│       │   ├── hr/             # HR components
│       │   ├── ops/            # Operations components
│       │   ├── portal-v2/      # Portal v2 components
│       │   └── v3/             # V3 dashboard components
│       ├── hooks/              # Custom React hooks (18+)
│       ├── config/             # Configuration
│       ├── lib/                # Utilities
│       └── App.tsx             # Route definitions
├── server/
│   ├── routes/                 # API route handlers
│   ├── middleware/             # Express middleware
│   ├── services/               # Business logic
│   └── db/                     # Database layer
└── shared/
    └── schema.ts               # Database schema (120+ tables)
```

---

## 2. User Roles & Access Control

### 2.1 Role Hierarchy (100-Point System)

```
┌─────────────────────────────────────────────────────────────┐
│  SUPER_ADMIN (100) - Platform-wide access                   │
├─────────────────────────────────────────────────────────────┤
│  ADMIN (90) - Single tenant administration                  │
├─────────────────────────────────────────────────────────────┤
│  SALES_MANAGER (80) - Sales team leadership                 │
├─────────────────────────────────────────────────────────────┤
│  OPS_MANAGER (75) - Operations team leadership              │
├─────────────────────────────────────────────────────────────┤
│  HR (70) - Human resources management                       │
├─────────────────────────────────────────────────────────────┤
│  CUSTOMER_SERVICE (65) - Customer support                   │
├─────────────────────────────────────────────────────────────┤
│  QC (60) - Quality control review                           │
├─────────────────────────────────────────────────────────────┤
│  SALES_EXECUTIVE (55) - Sales contributor                   │
├─────────────────────────────────────────────────────────────┤
│  OPS_EXECUTIVE (50) - Operations execution                  │
├─────────────────────────────────────────────────────────────┤
│  QC_EXECUTIVE (45) - Quality control execution              │
├─────────────────────────────────────────────────────────────┤
│  ACCOUNTANT (40) - Financial management                     │
├─────────────────────────────────────────────────────────────┤
│  AGENT (30) - External sales partner                        │
├─────────────────────────────────────────────────────────────┤
│  CLIENT (10) - End customer                                 │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Role-Based Navigation

#### CLIENT Navigation
```
Dashboard (/portal-v2)
├── Services (/services)
├── My Requests (/service-requests)
├── Compliance (/compliance-calendar)
├── Documents (/vault)
├── AI Tools
│   ├── AutoComply (/autocomply)
│   ├── DigiScore (/digiscore)
│   └── TaxTracker (/taxtracker)
└── Account
    ├── Messages (/messages)
    ├── Support (/support)
    ├── Notifications (/notifications)
    ├── Billing (/portal-v2/account/billing)
    └── Settings (/portal-v2/account/security)
```

#### AGENT Navigation
```
Dashboard (/agent)
├── My Leads (/agent/leads)
├── Commissions (/agent/commissions)
├── Performance (/agent/performance)
├── Sales
│   ├── Proposals (/proposals)
│   └── Referrals (/referrals)
└── Account
    ├── KYC (/agent/kyc)
    └── Profile (/agent/profile)
```

#### OPERATIONS Navigation
```
Dashboard (/operations)
├── Work Queue (/work-queue)
├── Documents (/document-review)
├── Escalations (/escalations)
├── Management
│   ├── Team Assignment (/ops/team-assignment)
│   └── Status Management (/status-management)
└── Analytics
    ├── Metrics (/quality-metrics)
    ├── Performance (/ops/performance)
    └── Executive (/executive-dashboard)
```

#### SALES Navigation
```
Dashboard (/sales)
├── Leads (/leads)
├── Pipeline (/lead-pipeline)
├── Proposals (/proposals)
└── Analytics
    ├── Referrals (/referrals)
    ├── Analytics (/analytics)
    └── Executive (/executive-dashboard)
```

#### ADMIN Navigation
```
Dashboard (/admin)
├── Users (/admin/users)
├── Services (/admin/services)
├── Reports (/admin/reports)
├── Platform
│   ├── Blueprints (/admin/blueprints)
│   ├── Configuration (/config)
│   └── Bulk Upload (/bulk-upload)
└── Developer
    ├── API Keys (/admin/api-keys)
    ├── Webhooks (/admin/webhooks)
    └── Audit Log (/audit-log)
```

#### SUPER_ADMIN Navigation
```
Dashboard (/super-admin)
├── Tenants (/super-admin/tenants)
├── Pricing (/super-admin/pricing)
├── Analytics (/super-admin/analytics)
└── Platform
    ├── Services (/super-admin/services)
    ├── Commissions (/super-admin/commissions)
    └── Security (/super-admin/security)
```

#### HR Navigation
```
Dashboard (/hr)
├── Employees (/hr/employees)
├── Attendance (/hr/attendance)
├── Leave (/hr/leave)
└── Development
    ├── Training (/hr/training)
    ├── Performance (/hr/performance)
    └── Onboarding (/hr/onboarding)
```

---

## 3. Authentication System

### 3.1 Dual Authentication Model

DigiComply uses two authentication methods based on user type:

#### Client Authentication (OTP-Based)
```
Flow:
1. User enters phone number
2. System sends 6-digit OTP via Twilio SMS
3. OTP valid for 10 minutes, max 5 attempts
4. On verification, session created (24-hour duration)
5. User redirected to /portal-v2
```

#### Staff Authentication (Password-Based)
```
Flow:
1. User enters email + password
2. Password validated against bcrypt hash
3. JWT tokens generated (access + refresh)
4. Session created (8-hour duration)
5. User redirected based on role
```

### 3.2 Session Management

| Setting | Client | Staff |
|---------|--------|-------|
| Session Duration | 24 hours | 8 hours |
| Token Type | Session cookie | JWT Bearer |
| Refresh | Automatic | Manual refresh token |
| Multi-device | Allowed | Configurable |

### 3.3 Role-Based Routing

After login, users are redirected based on role:

| Role | Default Route |
|------|---------------|
| client | `/portal-v2` |
| agent | `/agent` |
| operations, ops_manager, ops_executive | `/operations` |
| qc, qc_executive | `/qc` |
| sales, sales_manager, sales_executive | `/sales` |
| admin | `/admin` |
| super_admin | `/super-admin` |
| hr | `/hr` |
| customer_service | `/customer-service` |
| accountant | `/financials` |

---

## 4. Database Schema Overview

### 4.1 Schema Statistics

| Category | Count |
|----------|-------|
| Total Tables | 120+ |
| Total Columns | 2000+ |
| Foreign Keys | 150+ |
| Unique Constraints | 50+ |
| Indexes | 200+ |

### 4.2 Core Table Groups

#### User Management (5 tables)
- `users` - Core user accounts
- `userSessions` - Active sessions
- `adminUsers` - Admin-specific data
- `agentProfiles` - Agent details
- `operationsTeam` - Ops team structure

#### Business Entities (3 tables)
- `businessEntities` - Client companies
- `entities` - Entity types
- `leads` - Sales leads

#### Services & Workflow (13 tables)
- `services` - Service definitions
- `serviceRequests` - Service orders
- `tasks` - Work tasks
- `taskItems` - Task details
- `workflowTemplates` - Workflow definitions

#### Compliance (9 tables)
- `complianceRules` - Compliance requirements
- `complianceTracking` - Compliance status
- `complianceStates` - Entity compliance state
- `complianceAlerts` - Alert definitions

#### Payments (6 tables)
- `payments` - Payment records
- `commissions` - Agent commissions
- `wallets` - User wallets
- `walletTransactions` - Wallet history

---

## 5. API Architecture

### 5.1 API Versioning

| Version | Base Path | Purpose |
|---------|-----------|---------|
| V1 | `/api/v1/*` | Traditional role-based |
| V2 | `/api/v2/*` | Status-first (Vanta/Drata style) |

### 5.2 Route Categories

| Category | Base Path | Auth Required |
|----------|-----------|---------------|
| Auth | `/api/v1/auth` | No (public) |
| Client | `/api/v1/client` | Yes (client) |
| Operations | `/api/v1/operations` | Yes (ops roles) |
| Admin | `/api/v1/admin` | Yes (admin) |
| Sales | `/api/v1/sales` | Yes (sales roles) |
| HR | `/api/hr` | Yes (hr) |
| Payments | `/api/v1/payments` | Yes |
| Government | `/api/government` | Yes (ops+) |
| Notifications | `/api/notifications` | Yes |
| Messages | `/api/messages` | Yes |
| Wallet | `/api/wallet` | Yes |
| Audit | `/api/audit` | Yes (admin+) |
| Reports | `/api/reports` | Yes (ops+) |

### 5.3 Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Auth (login/register) | 5 req/min |
| OTP | 3 req/min |
| API (general) | 100 req/min |
| Webhook | No limit |

---

*Continue to Part 2: Client Portal Deep Dive*
