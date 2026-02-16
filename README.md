# DigiComply - Comply Flow Portal

**Enterprise-Grade Compliance Management Platform**

![Node.js](https://img.shields.io/badge/Node.js-24+-green.svg)
![React](https://img.shields.io/badge/React-18+-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)

## Overview

DigiComply is an enterprise-grade compliance management platform designed to streamline compliance operations for Indian businesses. It provides comprehensive tools for managing 100+ regulatory requirements (GST, Companies Act, Income Tax, PF/ESI, etc.), multi-stakeholder coordination, and end-to-end service delivery tracking.

### Key Features

- **7 Core Modules**: Client Portal, Sales, Operations, Compliance, Admin, Payments, Agent Portal
- **100+ API Endpoints**: RESTful APIs with role-based access control
- **70+ Database Tables**: Optimized schema with comprehensive business logic
- **11 User Roles**: Hierarchical RBAC with 126 verified security tests
- **Real-time Tracking**: SLA monitoring, task management, notification system
- **Enterprise Security**: JWT auth, CSRF protection, encryption, audit trails, rate limiting

## Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js 24+, Express.js, TypeScript |
| Frontend | React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL 15+ |
| ORM | Drizzle ORM |
| Validation | Zod |
| Authentication | JWT, bcrypt, session fingerprinting |
| Payments | Razorpay |
| Notifications | Email (Nodemailer), SMS/WhatsApp (Twilio) |

## Quick Start

### Prerequisites

- Node.js v24+
- PostgreSQL database
- npm or yarn

### Installation

```bash
# Clone and install
git clone https://github.com/camayank/comply-flow-portal.git
cd comply-flow-portal
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and other settings

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Server runs on **port 5000**

### Test Users

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin_test` | `Test@123` |
| Ops Executive | `ops_exec_test` | `Test@123` |
| Ops Manager | `ops_mgr_test` | `Test@123` |
| Sales Manager | `sales_mgr_test` | `Test@123` |

## User Roles

| Role | Level | Access Scope |
|------|-------|--------------|
| SUPER_ADMIN | 100 | Full system access |
| ADMIN | 90 | User management, services, workflows |
| SALES_MANAGER | 85 | Lead management, team oversight |
| OPS_MANAGER | 80 | Team management, escalations |
| SALES_EXECUTIVE | 75 | Lead creation, proposals |
| OPS_EXECUTIVE | 70 | Service execution, task management |
| CUSTOMER_SERVICE | 60 | Client support, service requests |
| QC_EXECUTIVE | 55 | Quality control reviews |
| ACCOUNTANT | 50 | Financial data, invoices |
| AGENT | 40 | Lead submission, commission tracking |
| CLIENT | 10 | Self-service dashboard |

## Core Modules

1. **Service Catalog**: 100+ compliance services with dynamic pricing and SLA management
2. **Document Management**: Secure upload, version control, OCR verification
3. **Compliance Tracking**: 100+ regulatory filing deadlines with auto-calculated due dates
4. **Workflow Automation**: Pre-built templates, conditional logic, auto-assignment
5. **Notifications**: Multi-channel (Email, SMS, WhatsApp, In-App)
6. **Payment Processing**: Razorpay integration, invoicing, subscriptions
7. **Commission Management**: Lead-based, service-based, referral overrides
8. **Quality Control**: QC review queue, checklists, delivery confirmation

## API Structure

```
POST /api/auth/staff/login       # Staff login (username/password)
POST /api/auth/client/send-otp   # Client OTP request
POST /api/auth/client/verify-otp # Client OTP verification
GET  /api/auth/session           # Get current session
POST /api/auth/logout            # Logout

GET  /api/service-requests       # List service requests
POST /api/service-requests       # Create service request
GET  /api/client/dashboard       # Dashboard data

GET  /api/ops/work-queue         # Work queue (requires ops role)
GET  /api/ops/case/:id           # Case details
PATCH /api/ops/case/:id          # Update case

GET  /api/admin/users            # List users
POST /api/admin/users            # Create user
GET  /api/admin/services         # List services
```

## Security

- **Authentication**: JWT with session fingerprinting
- **Authorization**: Role-based access control (RBAC) - 126 tests verified
- **CSRF Protection**: Required `X-Requested-With: XMLHttpRequest` header
- **Rate Limiting**: 10 auth attempts per 15 minutes
- **Encryption**: At-rest and in-transit
- **Audit Logging**: All changes tracked

## Health Check

```bash
curl http://localhost:5000/health
# Returns: {"status":"ok","timestamp":"...","uptime":...}
```

## Documentation

- **[PRODUCT_DOCUMENTATION.md](./PRODUCT_DOCUMENTATION.md)** - Complete product flows and user journeys
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment instructions
- **[TECHNICAL_SPECIFICATIONS_COMPLETE.md](./TECHNICAL_SPECIFICATIONS_COMPLETE.md)** - Technical specifications

## Project Structure

```
comply-flow-portal/
├── server/                 # Backend (Express.js + TypeScript)
│   ├── routes/            # API routes
│   ├── middleware/        # Auth, RBAC, rate limiting
│   ├── db/               # Drizzle schema and migrations
│   └── services/         # Business logic
├── client/                # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities
├── shared/               # Shared types and schemas
└── docs/                 # Documentation
```

## License

This project is proprietary software. All rights reserved.

---

**DigiComply** - Enterprise Compliance Made Simple

*Last Updated: February 2026*
