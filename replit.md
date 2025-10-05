# Universal Service Provider Platform - Enterprise Ready

## Overview
The Universal Service Provider Platform is a comprehensive, white-label solution designed for any service provider business. It offers client management, operations, document handling, workflow automation, and agent management capabilities. The platform aims to be a universal solution adaptable to various service-based models, including legal firms, accounting practices, consulting agencies, and healthcare clinics, with a vision for immediate ₹100 Cr+ revenue deployment and multi-industry national expansion.

## User Preferences
- Focus on execution-ready deliverables
- Prioritize revenue-generating features
- Emphasize trust-building and conversion optimization
- Target ₹10 Cr national scale-up
- Agent-focused distribution model (Compliance Rakshaks)

## System Architecture
The platform is built on a robust architecture designed for enterprise deployment and scalability.

### UI/UX Decisions
- **Mobile-First Design**: All portals (Landing, Client, Operations, Admin, Agent) are fully responsive and mobile-friendly.
- **Consistent Theming**: Uses centralized theme utilities for consistent colors, badges, and status indicators across all portals, including dark mode support.
- **Component Library**: Leverages `shadcn/ui` components for a modern and consistent user interface.

### Technical Implementations
- **Frontend**: React TypeScript with Tailwind CSS.
- **Backend**: Express.js with enterprise-grade middleware and role-based API routes.
- **Database**: PostgreSQL with Drizzle ORM, featuring 51+ comprehensive tables supporting multi-tenant operations. A hybrid storage architecture uses PostgreSQL for critical entities (Leads, Proposals, Service Requests, Business Entities, Payments, Referrals, Wallet Credits) and in-memory storage for other modules.
- **Referral & Wallet System**: Complete viral referral system with wallet credits (4 tables: referralCodes, referrals, walletCredits, walletTransactions). Clients earn 10% credit when referrals complete first service.
- **Workflow Automation Engine**: No-code automation with triggers (client_registered, payment_due_soon, milestone_completed, referral_completed) and actions (send_email, send_whatsapp, create_task, credit_wallet).
- **Universal Task Management System**: Cross-role task management supporting all user types (client, admin, ops, agent) with 7 database tables (taskItems, taskParticipants, taskDependencies, taskSubtasks, taskActivityLog, taskReminderTemplates, taskReminders). Features automated reminder scheduling (T-7, T-3, T-1 days, due date, overdue), task closure workflow with approval system, RBAC enforcement, activity logging, and notification integration. Reminder processor runs hourly for upcoming deadlines and daily at 9 AM IST for overdue tasks.
- **AI Document Preparation & Signature Management**: Comprehensive document generation, editing, and signing system powered by Claude Sonnet 4. Features include AI-powered document generation from templates or custom prompts, real-time preview and editing, version control with edit history, multi-format download (HTML/PDF), and complete signature workflow supporting DSC (Digital Signature Certificate), e-signatures, canvas-drawn signatures, and uploaded signatures. System includes 6 database tables (aiDocuments, documentVersions, documentSignatures, documentSignatories, documentActivityLog, aiDocumentTemplates) with full audit trail, signatory management, and integration with existing document management system.
- **Financial Management**: Revenue tracking, expense management, profit/loss reporting, cash flow projection with real-time analytics.
- **Tax Management**: GST, TDS, and ITR compliance tracking for startups with filing history, calculators, deadline calendar, and tax-saving insights.
- **Core Functionality**:
    - **Compliance Calendar**: Interactive visual timeline with 4-tier risk-based color coding, multi-item day modals, and smart summary cards.
    - **Comprehensive Compliance Knowledge Base**: Integrates 18 compliance rules from Indian regulations (Companies Act 2013, GST, Income Tax, PF/ESI) with detailed penalty information and required document checklists.
    - **Service Catalog**: Integrated 99 services across 18 categories, covering business registrations, tax, IP, certifications, monthly/annual compliances, and legal documentation.
    - **User Management System**: Complete role-based user management with 6 role types (Super Admin, Admin, Ops Executive, Customer Service, Agent, Client), CRUD operations, role-based access control (RBAC) middleware, password hashing with bcrypt, and comprehensive statistics dashboard.
    - **Role-Based Access Control**: Hierarchical permission system with 40+ granular permissions across user management, client management, service operations, analytics, and system configuration. Includes role hierarchy enforcement and flexible authorization middleware.
    - **File Upload System**: Google Cloud Storage integration for secure document management with validation, type enforcement, and size limits.
    - **Data Validation**: Comprehensive client-side validation using Zod patterns for various data types (email, phone, PAN, GST, etc.).
    - **Performance Optimization**: 29 database indexes implemented across critical tables, with `pg_trgm` extension for fast text search.
    - **Error Handling**: Global error boundaries, automatic toast notifications, and uncaught error handlers enhance user experience.
    - **Data Export**: Comprehensive CSV/Excel export system for various data entities and reports.
    - **No-Code Platform**: Features a drag-and-drop workflow builder for process changes without developer dependency.

### Feature Specifications
- **Universal Admin Panel**: Supports no-code workflow building, global workflow updates, real-time system monitoring, and comprehensive analytics. Features dedicated DigiComply AI Products section with quick-access cards for AutoComply, TaxTracker, and DigiScore. Includes 7 comprehensive tabs (Dashboard, Services, Workflows, Analytics, Users, Config, Roles) with user management capabilities for creating, editing, and deactivating users with role-based permissions.
- **Universal Client Portal**: Enables multi-entity management, service progress tracking, automated document workflows, and secure messaging.
- **Universal Operations Panel**: Provides task orchestration, team management, SLA monitoring, and QA workflows.
- **Universal Agent Network**: Includes lead management, commission tracking, and territory management functionalities.
- **DigiComply AI Products**: Three fully functional AI-powered products with dedicated routes - AutoComply (/autocomply), TaxTracker (/taxtracker), DigiScore (/digiscore) - integrated into admin dashboard for seamless navigation.
- **Security**: Implements comprehensive enterprise-grade security measures:
  - **Authentication**: Session-based authentication with secure token storage in PostgreSQL
  - **Session Security**: httpOnly, secure, and sameSite=strict cookies prevent XSS and CSRF attacks
  - **Rate Limiting**: 5 requests/15min for auth endpoints, 100 requests/15min for API endpoints
  - **RBAC**: Multi-tier role-based access control with 40+ granular permissions
  - **Input Validation**: Zod schemas validate all user inputs at API boundaries
  - **SQL Injection Prevention**: Drizzle ORM's parameterized queries
  - **XSS Protection**: DOMPurify sanitization for all AI-generated HTML content
  - **Password Security**: bcrypt hashing (10 rounds) with no password logging
  - **API Protection**: All sensitive routes protected with sessionAuthMiddleware
  - **Audit Trail**: Complete session tracking with IP, user agent, and activity logs
  - **OTP Security**: Production-ready abstraction layer (currently in-memory, requires Redis/database for production)

### System Design Choices
- **Multi-tenant Architecture**: Designed to support unlimited clients and distributed operations teams, enabling national scale.
- **Cloud Deployment Ready**: Configurations and scripts prepared for AWS, GCP, and Azure/Dynamics 365.

## External Dependencies
- **Google Cloud Storage**: For file upload and document management.
- **LegalSuvidha.com**: Integrated for a comprehensive service catalog.
- **PostgreSQL**: Primary database for persistent storage.
- **WhatsApp (Twilio)**: Twilio connector available for WhatsApp integration. User dismissed setup - requires Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) if needed in future.
- **Stripe**: Payment gateway integration complete. Requires STRIPE_SECRET_KEY and VITE_STRIPE_PUBLIC_KEY environment variables.
- **Payment Processing**: Generic integration point for various payment gateways.
- **CRM Synchronization**: Capability for integrating with Customer Relationship Management systems.
- **Government API Endpoints**: Utilized for compliance and regulatory information.