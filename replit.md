# Universal Service Provider Platform - Enterprise Ready

## Overview
The Universal Service Provider Platform is a comprehensive, white-label solution designed for any service provider business. It offers client management, operations, document handling, workflow automation, and agent management capabilities. The platform aims to be a universal solution adaptable to various service-based models, including legal firms, accounting practices, consulting agencies, and healthcare clinics. Its vision is for immediate ₹100 Cr+ revenue deployment and multi-industry national expansion.

## User Preferences
- Focus on execution-ready deliverables
- Prioritize revenue-generating features
- Emphasize trust-building and conversion optimization
- Target ₹10 Cr national scale-up
- Agent-focused distribution model (Compliance Rakshaks)

## System Architecture
The platform is built on a robust architecture designed for enterprise deployment and scalability. It features a unified landing page and a dynamic dashboard system that supports six distinct user roles (client, agent, operations, admin, customer-service, super-admin) with role-based routing and persistent state management.

### UI/UX Decisions
- **Mobile-First Design**: All portals are fully responsive and mobile-friendly.
- **Consistent Theming**: Uses centralized theme utilities for consistent colors, badges, and status indicators, including dark mode support.
- **Component Library**: Leverages `shadcn/ui` components for a modern and consistent user interface.

### Technical Implementations
- **Frontend**: React TypeScript with Tailwind CSS.
- **Backend**: Express.js with enterprise-grade middleware and role-based API routes.
- **Database**: PostgreSQL with Drizzle ORM, supporting multi-tenant operations with 56+ tables and a hybrid storage architecture.
- **Government Integration Pro System**: A separate module for government compliance APIs (GSP, ERI, MCA21) with secure credential vault (libsodium XSalsa20-Poly1305 encryption), bidirectional Google Sheets sync, job queue with retry mechanisms, and complete audit trails.
- **Referral & Wallet System**: Complete viral referral system with wallet credits.
- **Workflow Automation Engine**: No-code automation with configurable triggers and actions (e.g., email, WhatsApp, task creation, wallet credit).
- **Universal Task Management System**: Cross-role task management with automated reminders, approval workflows, RBAC, and activity logging.
- **AI Document Preparation & Signature Management**: AI-powered document generation (Claude Sonnet 4), real-time editing, version control, multi-format download, and comprehensive signature workflow (DSC, e-signatures).
- **Financial Management**: Revenue, expense, profit/loss tracking, and cash flow projection.
- **Tax Management**: GST, TDS, ITR compliance tracking, calculators, and deadline calendars.
- **Core Functionality**: Includes a Compliance Calendar, Knowledge Base of Indian regulations, a Service Catalog (99 services across 18 categories), a comprehensive User Management System with RBAC (40+ granular permissions), Google Cloud Storage integration for file uploads, Zod-based data validation, 29 database indexes, global error handling, CSV/Excel data export, and a drag-and-drop no-code platform.

### Feature Specifications
- **Universal Admin Panel**: Supports no-code workflow building, real-time monitoring, analytics, and user management. Includes "DigiComply AI Products" (AutoComply, TaxTracker, DigiScore).
- **Universal Client Portal**: Enables multi-entity management, service tracking, automated document workflows, and secure messaging.
- **Universal Operations Panel**: Provides task orchestration, team management, SLA monitoring, and QA workflows.
- **Universal Agent Network**: Includes lead management, commission tracking, and performance analytics.
- **Customer Service Dashboard**: Complete support ticket management, response templates, and performance metrics.
- **Security**: Enterprise-grade security including session-based authentication, PostgreSQL-based OTP with brute-force protection, httpOnly/secure cookies, rate limiting, multi-tier RBAC, Zod input validation, Drizzle ORM for SQL injection prevention, DOMPurify for XSS protection, bcrypt password hashing, libsodium encryption for credentials, and comprehensive security headers.

### System Design Choices
- **Multi-tenant Architecture**: Designed for scalability and distributed operations.
- **Cloud Deployment Ready**: Configured for AWS, GCP, and Azure/Dynamics 365.

## External Dependencies
- **Google Cloud Storage**: For file management.
- **Google Sheets API**: For bidirectional sync of government filings.
- **PostgreSQL**: Primary database.
- **LegalSuvidha.com**: Integrated for service catalog.
- **Twilio (WhatsApp)**: Connector available (requires credentials for future setup).
- **Stripe**: Payment gateway integration.
- **Payment Processing**: Generic integration point for various gateways.
- **CRM Synchronization**: Capability for integrating with CRM systems.
- **Government API Integrations**:
  - **GSP (GST Suvidha Provider)**: GST filing.
  - **ERI (e-Return Intermediary)**: Income Tax filing.
  - **MCA21 (Ministry of Corporate Affairs)**: Corporate filings.