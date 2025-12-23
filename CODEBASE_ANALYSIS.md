# Comply Flow Portal - Codebase Analysis

## 1. Tech Stack Overview

### Languages
- **Backend:** TypeScript, JavaScript (Node.js)
- **Frontend:** TypeScript, React 18
- **Database:** PostgreSQL

### Frameworks & Libraries

#### Backend
| Category | Technology |
|----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.18 |
| ORM | Drizzle ORM |
| Database | PostgreSQL (pg), Knex.js |
| Authentication | JWT (jsonwebtoken), bcrypt |
| Session | express-session, connect-redis |
| Validation | Zod, Joi, express-validator |
| File Upload | Multer, AWS S3, Sharp |
| Email | Nodemailer |
| Real-time | Socket.io |
| Security | Helmet, CORS, express-rate-limit |
| Logging | Winston |
| API Docs | Swagger (swagger-jsdoc, swagger-ui-express) |

#### Frontend
| Category | Technology |
|----------|------------|
| Framework | React 18.2 |
| Routing | Wouter |
| State Management | Zustand, TanStack Query |
| Forms | React Hook Form, Yup |
| UI Components | Radix UI, Headless UI |
| Styling | Tailwind CSS 3.3, Framer Motion |
| Charts | Chart.js, react-chartjs-2 |
| Notifications | react-hot-toast, Sonner |
| Real-time | socket.io-client |

---

## 2. Directory Structure

```
comply-flow-portal/
├── client/                          # React Frontend
│   ├── public/
│   └── src/
│       ├── components/              # Reusable components
│       │   ├── hr/                  # HR module components
│       │   ├── leads/               # Lead management
│       │   ├── proposals/           # Proposal management
│       │   └── ui/                  # shadcn/ui components
│       ├── config/                  # Frontend config
│       ├── constants/               # Constants & enums
│       ├── contexts/                # React contexts
│       ├── hooks/                   # Custom hooks
│       ├── lib/                     # Utilities
│       ├── pages/                   # Page components (88 pages)
│       ├── services/                # API service layer
│       ├── store/                   # Zustand stores
│       ├── types/                   # TypeScript types
│       └── utils/                   # Utility functions
├── server/                          # Express Backend
│   ├── __tests__/                   # Jest tests
│   ├── config/                      # Server config (db, jwt, logger)
│   ├── middleware/                  # Express middleware
│   ├── routes/                      # API route modules
│   └── services/                    # Business services
├── shared/                          # Shared types & schema
│   └── schema.ts                    # Drizzle schema (60+ tables)
├── database/
│   ├── migrations/                  # SQL migrations
│   └── seeds/                       # Seed data
├── mkw-platform/                    # Alternative backend (JS)
│   ├── backend/
│   │   └── src/
│   │       ├── database/
│   │       │   ├── migrations/
│   │       │   └── seeds/
│   │       ├── middleware/
│   │       ├── routes/
│   │       └── utils/
│   └── frontend/
└── comply-flow-portal/              # Legacy frontend structure
    └── frontend/
```

---

## 3. Database Schema (60+ Tables)

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, username, email, password, role, department, isActive |
| `user_sessions` | Session management | userId, sessionToken, ipAddress, fingerprint, csrfToken |
| `business_entities` | Client businesses | ownerId, clientId, name, entityType, cin, gstin, pan |
| `services` | Service catalog | serviceId, name, type, category, price, deadline |
| `service_requests` | Service orders | userId, serviceId, status, progress, paymentId, slaDeadline |
| `payments` | Payment records | paymentId, serviceRequestId, amount, status, transactionId |

### Lead & Sales Tables

| Table | Purpose |
|-------|---------|
| `leads` | Lead tracking with stages and conversion |
| `sales_proposals` | Proposal management and approval workflow |
| `commission_records` | Agent commission tracking |
| `agent_profiles` | Agent/partner information |

### Compliance Tables

| Table | Purpose |
|-------|---------|
| `compliance_tracking` | Per-client compliance status |
| `compliance_rules` | Compliance rule library (GST, ROC, etc.) |
| `compliance_required_documents` | Documents needed per compliance |
| `compliance_penalty_definitions` | Penalty calculation rules |
| `compliance_jurisdiction_overrides` | State-specific rule variations |

### Operations Tables

| Table | Purpose |
|-------|---------|
| `operations_team` | Staff with departments & workload |
| `operations_tasks` | Work items assigned to staff |
| `task_items` | Universal task management |
| `task_templates` | Reusable task workflows |
| `handover_history` | Task handoff records |
| `performance_metrics` | Staff performance tracking |

### QC & Delivery Tables

| Table | Purpose |
|-------|---------|
| `quality_reviews` | QC review records with checklists |
| `delivery_confirmations` | Client delivery tracking |
| `quality_metrics` | QC performance analytics |
| `quality_checklists` | QC checklist templates |
| `client_feedback` | NPS and satisfaction surveys |

### Document & Notification Tables

| Table | Purpose |
|-------|---------|
| `document_vault` | Secure document storage |
| `documents` | Document uploads with versioning |
| `document_templates` | Reusable document templates |
| `notifications` | In-app notifications |
| `notification_rules` | Automated notification triggers |
| `notification_templates` | Email/SMS/WhatsApp templates |
| `messages` | In-app messaging |

### Admin & System Tables

| Table | Purpose |
|-------|---------|
| `admin_users` | Admin permissions matrix |
| `service_catalogue` | Admin-managed service definitions |
| `workflow_templates` | Drag-drop workflow builder |
| `sla_settings` | SLA configuration per service |
| `system_configuration` | System-wide settings |
| `audit_logs` | Full audit trail |

---

## 4. API Endpoints

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /register | User registration |
| POST | /login | User login |
| POST | /send-otp | Send OTP |
| POST | /verify-otp | Verify OTP |
| POST | /refresh | Refresh tokens |
| POST | /logout | Logout |
| GET | /me | Get current user |
| POST | /password/reset | Password reset |

### Client Portal (`/api/v1/client`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /dashboard | Client dashboard data |
| GET | /services | User's service requests |
| GET | /services/:id | Service request detail |
| GET | /documents | User's documents |
| POST | /documents | Upload document |
| GET | /payments | Payment history |
| GET | /compliance-calendar | Compliance deadlines |
| GET | /catalog | Service catalog |
| POST | /book | Book a service |

### Sales (`/api/v1/sales`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /dashboard | Sales dashboard |
| GET | /leads | List leads |
| POST | /leads | Create lead |
| PATCH | /leads/:id | Update lead |
| POST | /leads/:id/convert | Convert to client |
| GET | /proposals | List proposals |
| POST | /proposals | Create proposal |

### Operations (`/api/v1/ops`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /dashboard | Ops dashboard |
| GET | /tasks | List tasks |
| POST | /tasks | Create task |
| PATCH | /tasks/:id | Update task |
| POST | /tasks/:id/complete | Complete task |

### Admin (`/api/v1/admin`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /dashboard | Admin dashboard |
| GET | /users | List users |
| POST | /users | Create user |
| PATCH | /users/:id | Update user |
| GET | /services | List services |
| POST | /services | Create service |
| GET | /audit-logs | Audit logs |
| GET | /settings | System settings |
| PUT | /settings/:key | Update setting |

### Payments (`/api/v1/payments`)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /create-order | Create Razorpay order |
| POST | /verify | Verify payment |
| POST | /webhook | Razorpay webhook |
| GET | /history | Payment history |

### Additional Modules
- **Customer Service** (`/api/customer-service`): Tickets, templates, satisfaction
- **QC/Delivery** (`/api/qc`, `/api/delivery`): Quality reviews, confirmations
- **Post-Sales** (`/api/post-sales`): Health scores, upsell, loyalty
- **File Management** (`/api/files`): Document upload/download
- **Leads** (`/api/leads`): Full lead CRUD and stats

---

## 5. User Roles & Permissions

### Role Hierarchy (Highest to Lowest)
```
super_admin (6) → admin (5) → ops_executive (4) → customer_service (3) → agent (2) → client (1)
```

### Role Permissions Matrix

| Permission | Super Admin | Admin | Ops Executive | Customer Service | Agent | Client |
|------------|:-----------:|:-----:|:-------------:|:----------------:|:-----:|:------:|
| user:create | ✓ | | | | | |
| user:read | ✓ | ✓ | | | | |
| user:update | ✓ | | | | | |
| user:delete | ✓ | | | | | |
| client:create | ✓ | ✓ | | | | |
| client:read | ✓ | ✓ | ✓ | ✓ | ✓ | |
| client:update | ✓ | ✓ | | ✓ | | |
| client:delete | ✓ | ✓ | | | | |
| service:create | ✓ | ✓ | ✓ | ✓ | | |
| service:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| service:update | ✓ | ✓ | ✓ | | | |
| service:assign | ✓ | ✓ | ✓ | | | |
| service:complete | ✓ | ✓ | ✓ | | | |
| ops:assign | ✓ | ✓ | ✓ | | | |
| ops:qc | ✓ | ✓ | ✓ | | | |
| ops:delivery | ✓ | ✓ | ✓ | | | |
| analytics:view | ✓ | ✓ | ✓ | | | |
| analytics:export | ✓ | ✓ | | | | |
| config:view | ✓ | ✓ | | | | |
| config:edit | ✓ | | | | | |
| workflow:view | ✓ | ✓ | | | | |
| workflow:edit | ✓ | ✓ | | | | |

### Departments
- Pre-Sales, Sales, Operations, QC, Admin, HR, Finance

---

## 6. Status/Workflow States

### Lead Stages
```
new → hot_lead → warm_lead → cold_lead → not_answered → not_interested → converted → lost
```

### Service Request Status
```
initiated → docs_uploaded → in_progress → ready_for_sign → qc_review → completed
                                      ↘ on_hold / failed
```

### Payment Status
```
pending → completed / failed / refunded / partial
```

### QC Review Status
```
pending → in_progress → approved / rejected / rework_required / escalated
```

### Delivery Status
```
pending_qc → qc_approved → ready_for_delivery → delivered → client_confirmed / delivery_rejected
```

### Task Status
```
pending → in_progress → awaiting_verification → completed / reopened / cancelled
```

### Operations Task Status
```
to_do → in_progress → waiting → completed / rework_required
```

### SLA Timer Status
```
on_track → warning → at_risk → breached / paused
```

### Priority Levels
```
low → medium → high → urgent → critical
```

### Client Status
```
active → inactive → dormant → churned
```

### Entity Types
```
pvt_ltd | llp | opc | partnership | proprietorship | public_limited
```

---

## 7. Key Business Logic Files

### Backend Core
| File | Description |
|------|-------------|
| `server/rbac-middleware.ts` | Role-based access control, permissions |
| `server/storage.ts` | Data access layer interface |
| `server/db-storage.ts` | Database implementation of storage |
| `server/routes/auth.ts` | Authentication logic |
| `server/middleware/auth.ts` | JWT middleware |
| `server/middleware/rateLimiter.ts` | Rate limiting |
| `server/services/emailService.ts` | Email notifications |
| `server/services/paymentService.ts` | Razorpay integration |

### Workflow & SLA
| File | Description |
|------|-------------|
| `server/enhanced-sla-system.ts` | SLA monitoring & escalation |
| `server/job-lifecycle-manager.ts` | Background job management |
| `server/notification-engine.ts` | Multi-channel notifications |
| `server/task-reminder-processor.ts` | Scheduled task reminders |

### Routes
| File | Description |
|------|-------------|
| `server/routes/client.ts` | Client portal API |
| `server/routes/sales.ts` | Sales/lead API |
| `server/routes/operations.ts` | Operations API |
| `server/routes/admin.ts` | Admin API |
| `server/routes/payment.ts` | Payment API |
| `server/leads-routes.ts` | Enhanced lead management |
| `server/proposals-routes.ts` | Proposal management |
| `server/qc-routes.ts` | QC workflow |
| `server/delivery-routes.ts` | Delivery confirmation |

### Schema
| File | Description |
|------|-------------|
| `shared/schema.ts` | Complete database schema (60+ tables) |

---

## 8. Frontend Pages/Routes

### Public Routes
| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | UnifiedLanding | Landing page |
| `/login`, `/signin` | Login | User login |
| `/register`, `/signup` | ClientRegistration | Registration |

### Client Portal
| Route | Component | Purpose |
|-------|-----------|---------|
| `/dashboard` | UnifiedDashboard | Main dashboard |
| `/services`, `/service-catalog` | ClientServiceCatalog | Browse services |
| `/service-request/create` | ServiceRequestCreate | New service |
| `/service-request/:id` | ServiceRequestDetail | Service details |
| `/my-requests` | ServiceRequestUI | My services |
| `/documents` | AiDocumentPreparation | Document vault |
| `/compliance-calendar` | ClientComplianceCalendar | Compliance dates |
| `/portal`, `/client-portal` | MobileClientPortal | Client portal |

### Operations
| Route | Component | Purpose |
|-------|-----------|---------|
| `/operations`, `/ops` | MobileOperationsPanel | Ops dashboard |
| `/tasks` | TaskManagement | Task management |
| `/qc`, `/qc-dashboard` | QCDashboard | Quality control |
| `/quality-metrics` | QualityMetricsDashboard | QC analytics |
| `/delivery/:id` | DeliveryConfirmation | Delivery tracking |

### Sales/Leads
| Route | Component | Purpose |
|-------|-----------|---------|
| `/leads` | LeadManagement | Lead management |
| `/pre-sales` | PreSalesManager | Pre-sales dashboard |
| `/proposals`, `/sales-proposals` | SalesProposalManager | Proposals |

### Admin
| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin` | MobileAdminPanel | Admin panel |
| `/admin-config` | AdminServiceConfig | Service config |
| `/universal-admin` | UniversalAdminPanel | Full admin |
| `/super-admin` | SuperAdminPortal | Super admin |
| `/hr`, `/hr-dashboard` | HRDashboard | HR management |
| `/clients`, `/client-master` | ClientMasterDashboard | Client CRM |

### Agent Portal
| Route | Component | Purpose |
|-------|-----------|---------|
| `/agent-portal` | AgentPortal | Agent dashboard |
| `/agent-leads` | AgentLeadManagement | Agent leads |
| `/agent-commission` | AgentCommissionTracker | Commissions |
| `/agent-performance` | AgentPerformance | Performance |

### Analytics
| Route | Component | Purpose |
|-------|-----------|---------|
| `/executive-dashboard` | ExecutiveDashboard | Executive view |
| `/business-intelligence` | BusinessIntelligence | BI analytics |
| `/financial-management` | FinancialManagementDashboard | Financials |

---

## Summary Statistics

- **Total Database Tables:** 60+
- **Total API Endpoints:** 100+
- **Total Frontend Pages:** 88
- **User Roles:** 6
- **Service Categories:** Incorporation, Tax, Compliance, Licenses, Legal
- **Notification Channels:** Email, SMS, WhatsApp, In-App, Push
