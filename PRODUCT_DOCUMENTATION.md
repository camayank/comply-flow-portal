# DigiComply - Complete Product Documentation

## 1. Product Overview

### What is DigiComply?
DigiComply is an **Enterprise-Grade Compliance Management Platform** designed to streamline compliance operations for Indian businesses. It provides comprehensive tools for managing clients, sales pipelines, operations, regulatory compliance, document management, and agent/partner networks.

### Problem Solved
- **Compliance Complexity**: Manages 100+ regulatory requirements (GST, Companies Act, Income Tax, PF/ESI, etc.)
- **Multi-stakeholder Coordination**: Unified platform for clients, operations teams, sales, and partners
- **Document Management**: Centralized vault with version control, encryption, and approval workflows
- **Service Delivery**: End-to-end tracking from lead to service completion
- **Commission Management**: Automated tracking and dispute resolution for agent/partner networks

### Key Capabilities
- **7 Core Modules**: Client Portal, Sales, Operations, Compliance, Admin, Payments, Agent Portal
- **100+ API Endpoints**: RESTful APIs with role-based access control
- **70+ Database Tables**: Optimized schema with comprehensive business logic
- **Real-time Tracking**: SLA monitoring, task management, notification system
- **Enterprise Security**: JWT auth, encryption, audit trails, rate limiting

---

## 2. User Roles & Permissions

### Role Hierarchy

| Role | Level | Access Scope |
|------|-------|--------------|
| **SUPER_ADMIN** | 100 | Full system access, manages admins |
| **ADMIN** | 90 | User management, services, workflows |
| **SALES_MANAGER** | 85 | Lead management, team oversight, forecasting |
| **OPS_MANAGER** | 80 | Team management, service assignment, escalations |
| **SALES_EXECUTIVE** | 75 | Lead creation, proposals, pipeline |
| **OPS_EXECUTIVE** | 70 | Service execution, task management, QC |
| **CUSTOMER_SERVICE** | 60 | Client support, service requests |
| **QC_EXECUTIVE** | 55 | Quality control reviews, delivery approval |
| **ACCOUNTANT** | 50 | Financial data, invoice/payment management |
| **AGENT** | 40 | Lead submission, commission tracking |
| **CLIENT** | 10 | Self-service dashboard, document upload |

---

## 3. User Flows

### A. Client Flow
```
Registration → Onboarding → Dashboard → Service Request → Document Upload → Tracking → Delivery
```

**Key Features:**
- Self-service registration with OTP verification
- Business entity management (multiple companies)
- Service catalog browsing and ordering
- Document vault with version control
- Compliance calendar with reminders
- Payment via Razorpay (cards, UPI, wallets)
- Real-time service status tracking

### B. Operations Executive Flow
```
Work Queue → Task Assignment → Document Review → Status Update → QC Submission → Delivery
```

**Key Features:**
- Daily work queue with priority sorting
- SLA monitoring with color-coded alerts
- Document review and approval
- Internal notes and team collaboration
- Milestone tracking per service
- Quality control checklist

### C. Operations Manager Flow
```
Team Dashboard → Workload Balancing → Assignment → Escalation Management → Performance Review
```

**Key Features:**
- Team workload visualization
- Auto-assignment and manual override
- Escalation queue management
- SLA breach handling
- Team performance metrics
- Quality analytics

### D. Admin Flow
```
User Management → Service Configuration → Workflow Setup → Reports → Audit Logs
```

**Key Features:**
- Create/manage users with role assignment
- Configure service catalog and pricing
- Set up workflow automation rules
- View comprehensive reports
- Access audit logs

### E. Sales Flow
```
Lead Creation → Qualification → Proposal → Negotiation → Conversion → Commission
```

**Key Features:**
- Lead pipeline management (Kanban view)
- Proposal generation with e-signature
- Sales forecasting
- Target tracking
- Commission calculation

### F. Agent Flow
```
Lead Submission → Status Tracking → Commission Tracking → Payout
```

**Key Features:**
- Submit leads via portal
- Track lead conversion status
- Real-time commission dashboard
- Dispute resolution system
- Performance leaderboard

---

## 4. Core Modules

### Module 1: Service Catalog
- 100+ compliance and business services
- Dynamic pricing with tax calculation
- SLA management with deadlines
- Required documents per service
- Multi-step milestone tracking
- Renewal management

### Module 2: Document Management
- Secure upload with encryption
- Version control
- Multi-level approval workflow
- OCR & AI verification
- Expiry tracking with reminders
- Bulk upload support

### Module 3: Compliance Tracking
- 100+ regulatory filing deadlines
- Auto-calculated due dates
- Penalty risk assessment
- State-specific rules
- Compliance health score (0-100)
- Document linking

### Module 4: Workflow Automation
- Pre-built workflow templates
- Conditional logic (if-then rules)
- Auto-assignment
- Auto-notifications
- Approval chains
- Webhook integration

### Module 5: Notifications
- Multi-channel: Email, SMS, WhatsApp, In-App
- Template system with variables
- User preference management
- Priority levels
- Smart batching
- Delivery analytics

### Module 6: Payment Processing
- Razorpay integration
- Invoice generation
- Refund processing
- Subscription billing
- Tax calculation
- Payment history

### Module 7: Commission Management
- Lead-based commission
- Service-based commission
- Referral overrides
- Dispute resolution
- Payout scheduling
- Performance leaderboard

### Module 8: Quality Control
- QC review queue
- Quality checklists
- Issue tracking
- Rework management
- Delivery confirmation
- Quality metrics

---

## 5. API Structure

### Authentication
```
POST /api/auth/staff/login      - Staff login (username/password)
POST /api/auth/client/send-otp  - Client OTP request
POST /api/auth/client/verify-otp - Client OTP verification
GET  /api/auth/session          - Get current session
POST /api/auth/logout           - Logout
```

### Client Portal
```
GET  /api/service-requests      - List service requests
POST /api/service-requests      - Create service request
GET  /api/client/dashboard      - Dashboard data
GET  /api/compliance-state/:id  - Compliance details
```

### Operations
```
GET  /api/ops/work-queue        - Work queue (requires ops role)
GET  /api/ops/case/:id          - Case details
PATCH /api/ops/case/:id         - Update case
GET  /api/ops/performance       - Performance metrics
```

### Admin
```
GET  /api/admin/users           - List users
POST /api/admin/users           - Create user
GET  /api/admin/services        - List services
POST /api/admin/services        - Create service
```

### Agent
```
POST /api/agent/leads           - Submit lead
GET  /api/agent/commissions     - Commission tracking
GET  /api/agent/performance     - Performance metrics
```

---

## 6. Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles |
| `businessEntities` | Client companies |
| `services` | Service catalog |
| `serviceRequests` | Active service requests |
| `complianceTracking` | Compliance status per client |
| `complianceRules` | 100+ regulatory rules |
| `documentVault` | Document storage |
| `taskItems` | Universal task system |
| `payments` | Payment records |
| `commissions` | Commission tracking |
| `notifications` | Notification records |
| `activityLogs` | Audit trail |

---

## 7. Security Features

- **Authentication**: JWT with session fingerprinting
- **Authorization**: Role-based access control (RBAC)
- **CSRF Protection**: Required headers for all mutations
- **Rate Limiting**: 10 auth attempts / 15 minutes
- **Encryption**: At-rest and in-transit
- **Audit Logging**: All changes tracked
- **Two-Factor Auth**: OTP support

---

## 8. Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js, TypeScript |
| Frontend | React 18, TypeScript, Tailwind CSS |
| Database | PostgreSQL 15+ |
| ORM | Drizzle ORM |
| Validation | Zod |
| Authentication | JWT, bcrypt |
| Payments | Razorpay |
| Email | Nodemailer |
| SMS/WhatsApp | Twilio |

---

**Document Version**: 2.0  
**Last Updated**: February 2026  
**Status**: Production Ready
