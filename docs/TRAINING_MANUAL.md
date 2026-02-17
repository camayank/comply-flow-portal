# DigiComply Platform - Complete Training Manual

**Version:** 1.0
**Last Updated:** February 2026
**Document Type:** End-User & Administrator Training Guide

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [User Roles & Access Levels](#2-user-roles--access-levels)
3. [Getting Started](#3-getting-started)
4. [Client Portal](#4-client-portal)
5. [Agent Portal](#5-agent-portal)
6. [Operations Portal](#6-operations-portal)
7. [Sales Portal](#7-sales-portal)
8. [Admin Portal](#8-admin-portal)
9. [Super Admin Portal](#9-super-admin-portal)
10. [HR Module](#10-hr-module)
11. [Customer Service Module](#11-customer-service-module)
12. [Compliance & Government Filings](#12-compliance--government-filings)
13. [AI-Powered Tools](#13-ai-powered-tools)
14. [Document Management](#14-document-management)
15. [Communication & Notifications](#15-communication--notifications)
16. [Payment & Billing](#16-payment--billing)
17. [Reporting & Analytics](#17-reporting--analytics)
18. [Security & Authentication](#18-security--authentication)
19. [Troubleshooting](#19-troubleshooting)
20. [API Reference](#20-api-reference)

---

## 1. Platform Overview

### 1.1 What is DigiComply?

DigiComply is a comprehensive compliance management platform designed to streamline business compliance operations in India. It provides end-to-end solutions for:

- **Business Registration** - Company incorporation, GST registration, MSME registration
- **Compliance Management** - GST filings, income tax returns, TDS, ESI, PF
- **Document Management** - Secure vault for business documents
- **Service Delivery** - Track service requests from initiation to completion
- **Government Filings** - Automated filings with MCA, GST Portal, Income Tax Portal

### 1.2 Platform Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DigiComply Platform                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + Vite + Tailwind CSS)            │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Express.js + Node.js + TypeScript)                    │
├─────────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL + Drizzle ORM)                            │
├─────────────────────────────────────────────────────────────────┤
│  Integrations: Razorpay | Twilio | Government APIs              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Tenant** | Support for multiple organizations with isolated data |
| **Role-Based Access** | 14 distinct user roles with granular permissions |
| **AI Tools** | AutoComply, DigiScore, TaxTracker for intelligent compliance |
| **Real-Time Tracking** | Live status updates on all service requests |
| **Secure Documents** | Encrypted document vault with version control |
| **Government Integration** | Direct filing to GST, MCA, Income Tax portals |
| **Mobile Responsive** | Full functionality on all devices |

---

## 2. User Roles & Access Levels

### 2.1 Role Hierarchy

DigiComply implements a 100-point hierarchy system where higher values indicate broader access:

| Role | Hierarchy Level | Description |
|------|----------------|-------------|
| `super_admin` | 100 | Full platform access, manages all tenants |
| `admin` | 90 | Single-tenant administration |
| `sales_manager` | 80 | Sales team leadership, pipeline management |
| `ops_manager` | 75 | Operations team leadership |
| `hr` | 70 | Human resources management |
| `customer_service` | 65 | Customer support and success |
| `qc` | 60 | Quality control review |
| `sales_executive` | 55 | Individual sales contributor |
| `ops_executive` | 50 | Operations task execution |
| `qc_executive` | 45 | Quality control execution |
| `accountant` | 40 | Financial management |
| `agent` | 30 | External sales/referral partner |
| `client` | 10 | End customer accessing services |

### 2.2 Role Capabilities Matrix

| Capability | Client | Agent | Ops | QC | Sales | Admin | Super Admin |
|------------|--------|-------|-----|-----|-------|-------|-------------|
| View Own Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit Service Requests | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Process Service Requests | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Access Reports | ❌ | Limited | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Pricing | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Access All Tenants | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Getting Started

### 3.1 Accessing the Platform

**Production URL:** `https://app.digicomply.in`

### 3.2 Authentication Methods

DigiComply uses **dual authentication** based on user type:

#### Client Authentication (OTP-Based)
1. Navigate to the login page
2. Enter your registered mobile number
3. Click "Send OTP"
4. Enter the 6-digit OTP received via SMS
5. You're logged in!

#### Staff Authentication (Password-Based)
1. Navigate to the login page
2. Enter your email address
3. Enter your password
4. Click "Sign In"

### 3.3 Forgot Password

If you've forgotten your password:
1. Click "Forgot Password?" on the login page
2. Enter your registered email
3. Check your email for reset instructions
4. Follow the link to set a new password

### 3.4 First-Time Login

Upon first login:
1. Complete your profile setup
2. Review and accept Terms of Service
3. Set notification preferences
4. For clients: Add your business details
5. For staff: Review assigned tasks

---

## 4. Client Portal

### 4.1 Dashboard Overview

The Client Portal dashboard (`/portal-v2`) provides a unified view of:

- **Active Services** - Services currently in progress
- **Compliance Calendar** - Upcoming deadlines
- **Recent Documents** - Latest uploads and downloads
- **Quick Actions** - Common tasks

### 4.2 Navigation

| Menu Item | Path | Description |
|-----------|------|-------------|
| Dashboard | `/portal-v2` | Main overview |
| Services | `/services` | Browse available services |
| My Requests | `/service-requests` | Track submitted requests |
| Compliance | `/compliance-calendar` | View compliance deadlines |
| Documents | `/vault` | Access document vault |
| AutoComply | `/autocomply` | AI compliance assistant |
| DigiScore | `/digiscore` | Business compliance score |
| TaxTracker | `/taxtracker` | Tax liability tracker |
| Messages | `/messages` | Communication center |
| Support | `/support` | Help and support tickets |
| Notifications | `/notifications` | Alert center |
| Billing | `/portal-v2/account/billing` | Invoices and payments |
| Settings | `/portal-v2/account/security` | Account settings |

### 4.3 Requesting a Service

**Step 1: Browse Services**
- Navigate to "Services" from the sidebar
- Browse by category or search
- View service details, pricing, and requirements

**Step 2: Initiate Request**
- Click "Request Service"
- Fill in required business information
- Upload necessary documents
- Review pricing and timeline

**Step 3: Payment**
- Select payment method (Razorpay integration)
- Complete payment
- Receive confirmation

**Step 4: Track Progress**
- View real-time status in "My Requests"
- Receive notifications on status changes
- Communicate with assigned team via messages

### 4.4 Document Vault

The secure Document Vault allows you to:

- **Upload Documents** - Drag & drop or click to upload
- **Organize** - Create folders by category
- **Share** - Generate secure sharing links
- **Version Control** - Track document versions
- **Download** - Access anytime, anywhere

**Supported Formats:** PDF, JPG, PNG, DOC, DOCX, XLS, XLSX

### 4.5 Compliance Calendar

Track all your compliance deadlines:

- **GST Returns** - Monthly/Quarterly filing dates
- **Income Tax** - Advance tax, ITR filing
- **TDS** - Quarterly return deadlines
- **ROC Filings** - Annual return, AOC-4
- **PF/ESI** - Monthly contribution deadlines

---

## 5. Agent Portal

### 5.1 Overview

Agents are external sales partners who refer clients to DigiComply. The Agent Portal provides tools for:

- Lead management
- Commission tracking
- Performance analytics
- Client onboarding

### 5.2 Navigation

| Menu Item | Path | Description |
|-----------|------|-------------|
| Dashboard | `/agent` | Overview and stats |
| My Leads | `/agent/leads` | Manage referred leads |
| Commissions | `/agent/commissions` | Track earnings |
| Performance | `/agent/performance` | Analytics dashboard |
| Proposals | `/proposals` | Create client proposals |
| Referrals | `/referrals` | Referral tracking |
| KYC | `/agent/kyc` | Complete agent KYC |
| Profile | `/agent/profile` | Account settings |

### 5.3 Lead Management

**Adding a Lead:**
1. Navigate to "My Leads"
2. Click "Add Lead"
3. Enter client details (name, phone, email, business type)
4. Assign service interest
5. Track conversion progress

**Lead Statuses:**
- `New` - Just added
- `Contacted` - Initial outreach done
- `Interested` - Client showing interest
- `Qualified` - Ready to convert
- `Converted` - Became a paying client
- `Lost` - Did not convert

### 5.4 Commission Structure

Agents earn commissions on:
- **New Client Signup** - One-time bonus
- **Service Purchases** - Percentage of service value
- **Renewals** - Recurring commission on retainers

View detailed commission breakdown in the Commissions section.

### 5.5 Agent KYC

Complete KYC to activate your agent account:

1. Upload PAN Card
2. Upload Aadhaar (front and back)
3. Bank account details for payouts
4. Address proof
5. Agreement acceptance

---

## 6. Operations Portal

### 6.1 Overview

The Operations team handles service delivery. This portal provides tools for task management, document processing, and quality control.

### 6.2 Navigation

| Menu Item | Path | Description |
|-----------|------|-------------|
| Dashboard | `/operations` | Work overview |
| Work Queue | `/work-queue` | Assigned tasks |
| Documents | `/document-review` | Document processing |
| Escalations | `/escalations` | Issue management |
| Team Assignment | `/ops/team-assignment` | Task distribution |
| Status Management | `/status-management` | Status updates |
| Metrics | `/quality-metrics` | Quality KPIs |
| Performance | `/ops/performance` | Team performance |
| Executive | `/executive-dashboard` | High-level analytics |

### 6.3 Work Queue

The Work Queue shows all assigned service requests:

**Columns:**
- Request ID
- Client Name
- Service Type
- Status
- Priority
- Due Date
- Assigned To

**Actions:**
- View Details
- Update Status
- Add Notes
- Upload Documents
- Escalate

### 6.4 Processing a Service Request

**Step 1: Review Request**
- Open from Work Queue
- Review client details and requirements
- Check uploaded documents

**Step 2: Document Verification**
- Verify all required documents
- Mark as verified or request reupload
- Add verification notes

**Step 3: Process Service**
- Complete required tasks
- Update status at each milestone
- Upload generated documents

**Step 4: Quality Review**
- Submit for QC review
- Address any QC feedback
- Final approval

**Step 5: Delivery**
- Mark as completed
- Notify client
- Upload final deliverables

### 6.5 Status Flow

```
New → In Progress → Document Verification → Processing → QC Review → Completed
                ↓                              ↓
            On Hold                        Revision
                ↓
            Cancelled
```

### 6.6 Escalation Management

When issues arise:

1. Click "Escalate" on the request
2. Select escalation type:
   - Document Issue
   - Client Unresponsive
   - Technical Problem
   - Compliance Concern
3. Add detailed description
4. Assign to manager/specialist
5. Track resolution

---

## 7. Sales Portal

### 7.1 Overview

The Sales Portal enables lead tracking, pipeline management, and proposal creation.

### 7.2 Navigation

| Menu Item | Path | Description |
|-----------|------|-------------|
| Dashboard | `/sales` | Sales overview |
| Leads | `/leads` | Lead management |
| Pipeline | `/lead-pipeline` | Sales funnel |
| Proposals | `/proposals` | Proposal management |
| Referrals | `/referrals` | Referral tracking |
| Analytics | `/analytics` | Sales analytics |
| Executive | `/executive-dashboard` | Executive view |

### 7.3 Lead Pipeline

Visual Kanban board showing leads across stages:

**Stages:**
1. **New** - Fresh leads
2. **Qualified** - Verified and interested
3. **Proposal Sent** - Quote provided
4. **Negotiation** - Discussing terms
5. **Won** - Converted to client
6. **Lost** - Did not convert

**Actions:**
- Drag cards between stages
- Click to view/edit details
- Add follow-up tasks
- Set reminders

### 7.4 Proposal Management

Create professional proposals:

1. Select client/lead
2. Choose services to include
3. Apply discounts if applicable
4. Add custom terms
5. Generate PDF
6. Send via email or share link

Track proposal status:
- Draft
- Sent
- Viewed
- Accepted
- Rejected

---

## 8. Admin Portal

### 8.1 Overview

Administrators manage users, services, and platform configuration for their organization.

### 8.2 Navigation

| Menu Item | Path | Description |
|-----------|------|-------------|
| Dashboard | `/admin` | Admin overview |
| Users | `/admin/users` | User management |
| Services | `/admin/services` | Service catalog |
| Reports | `/admin/reports` | Report generation |
| Blueprints | `/admin/blueprints` | Service workflows |
| Configuration | `/config` | System settings |
| Bulk Upload | `/bulk-upload` | Mass data import |
| API Keys | `/admin/api-keys` | API management |
| Webhooks | `/admin/webhooks` | Integration hooks |
| Audit Log | `/audit-log` | Activity tracking |

### 8.3 User Management

**Creating a User:**
1. Navigate to Users
2. Click "Add User"
3. Enter details:
   - Full Name
   - Email
   - Phone
   - Role
   - Department
4. Set initial password or send invite
5. Save

**Bulk User Import:**
1. Navigate to Bulk Upload
2. Download template
3. Fill in user data
4. Upload Excel file
5. Review and confirm

**User Actions:**
- Edit profile
- Reset password
- Deactivate/Reactivate
- Change role
- View activity log

### 8.4 Service Configuration

Configure available services:

- **Service Details** - Name, description, category
- **Pricing** - Base price, tax, discounts
- **Documents** - Required document types
- **Workflow** - Processing steps
- **SLA** - Delivery timelines
- **Visibility** - Who can purchase

### 8.5 Audit Logs

Track all platform activity:

- User logins/logouts
- Data changes
- Document access
- Configuration changes
- API calls

Filter by:
- Date range
- User
- Action type
- Resource

---

## 9. Super Admin Portal

### 9.1 Overview

Super Admins have complete platform access across all tenants. Use with caution.

### 9.2 Navigation

| Menu Item | Path | Description |
|-----------|------|-------------|
| Dashboard | `/super-admin` | Platform overview |
| Tenants | `/super-admin/tenants` | Organization management |
| Pricing | `/super-admin/pricing` | Global pricing |
| Analytics | `/super-admin/analytics` | Platform analytics |
| Services | `/super-admin/services` | Master service catalog |
| Commissions | `/super-admin/commissions` | Commission rules |
| Security | `/super-admin/security` | Security settings |

### 9.3 Tenant Management

Each tenant is an isolated organization:

**Creating a Tenant:**
1. Click "Add Tenant"
2. Enter organization details
3. Configure plan/limits
4. Create admin user
5. Activate

**Tenant Configuration:**
- Custom branding
- Service availability
- User limits
- Storage quota
- Feature toggles

### 9.4 Global Pricing Engine

Configure pricing rules:

- **Base Prices** - Default service costs
- **Volume Discounts** - Bulk pricing
- **Subscription Plans** - Retainer packages
- **Regional Pricing** - Location-based adjustments
- **Promotional Codes** - Discount campaigns

### 9.5 Security Center

Monitor platform security:

- Active sessions
- Failed login attempts
- API usage patterns
- Security incidents
- Compliance reports

---

## 10. HR Module

### 10.1 Overview

Complete human resources management for internal staff.

### 10.2 Navigation

| Menu Item | Path | Description |
|-----------|------|-------------|
| Dashboard | `/hr` | HR overview |
| Employees | `/hr/employees` | Staff directory |
| Attendance | `/hr/attendance` | Time tracking |
| Leave | `/hr/leave` | Leave management |
| Training | `/hr/training` | Learning programs |
| Performance | `/hr/performance` | Reviews & goals |
| Onboarding | `/hr/onboarding` | New hire setup |

### 10.3 Employee Management

**Employee Profile includes:**
- Personal information
- Employment details (join date, department, reporting)
- Compensation (salary, benefits)
- Documents (offer letter, ID proofs)
- Skills & certifications
- Performance history

### 10.4 Attendance Tracking

**Features:**
- Clock in/out via web or mobile
- Shift management
- Overtime tracking
- Attendance reports
- Integration with payroll

**For Managers:**
- Team attendance view
- Approve regularization requests
- Configure shift patterns
- Generate attendance reports

### 10.5 Leave Management

**Leave Types:**
- Casual Leave
- Sick Leave
- Earned/Privilege Leave
- Maternity/Paternity Leave
- Compensatory Off

**Applying for Leave:**
1. Navigate to Leave
2. Click "Apply Leave"
3. Select leave type
4. Choose dates
5. Add reason
6. Submit for approval

**For Managers:**
- Review leave requests
- Check team calendar
- Approve/Reject with comments
- View leave balances

### 10.6 Training & Development

**Available Programs:**
- Compliance training (mandatory)
- Skills development
- Certification courses
- Onboarding curriculum

**Enrolling in Training:**
1. Browse available programs
2. Check prerequisites
3. Click "Enroll"
4. Complete modules
5. Take assessment
6. Receive certificate

### 10.7 Performance Management

**Goal Setting:**
- Set quarterly/annual goals
- Align with team objectives
- Track progress
- Self-assessment

**Performance Reviews:**
- 360-degree feedback
- Manager ratings
- Calibration meetings
- Development plans

---

## 11. Customer Service Module

### 11.1 Overview

Customer Service handles support tickets, manages client success, and drives renewals.

### 11.2 Navigation

| Menu Item | Path | Description |
|-----------|------|-------------|
| Dashboard | `/customer-service` | Overview |
| Tickets | `/support` | Support queue |
| Playbooks | `/playbooks` | Response templates |
| Renewals | `/renewals` | Renewal pipeline |

### 11.3 Ticket Management

**Ticket Lifecycle:**
```
New → Assigned → In Progress → Awaiting Client → Resolved → Closed
```

**Processing a Ticket:**
1. View ticket details
2. Review client history
3. Investigate issue
4. Respond using playbooks or custom response
5. Escalate if needed
6. Resolve and close

### 11.4 Client Success

Monitor client health:
- Service usage
- Compliance status
- Satisfaction scores
- Engagement metrics
- At-risk indicators

---

## 12. Compliance & Government Filings

### 12.1 Supported Filings

DigiComply supports the following government filings:

| Category | Filings |
|----------|---------|
| **GST** | GSTR-1, GSTR-3B, GSTR-9, GSTR-9C |
| **Income Tax** | ITR-1 to ITR-7, Advance Tax |
| **TDS** | Form 24Q, 26Q, 27Q, 27EQ |
| **MCA** | AOC-4, MGT-7, ADT-1, DIR-3 KYC |
| **PF** | ECR Filing, Form 5A |
| **ESI** | Monthly Contribution Filing |

### 12.2 Filing Process

**Step 1: Data Collection**
- Client provides financial data
- Documents uploaded to vault
- System validates completeness

**Step 2: Preparation**
- Operations team prepares filing
- Calculations verified
- Draft generated for review

**Step 3: Client Approval**
- Client reviews draft
- Approves or requests changes
- Signs off on final version

**Step 4: Filing**
- Submitted to government portal
- Acknowledgment captured
- Confirmation to client

**Step 5: Post-Filing**
- Store acknowledgment in vault
- Update compliance calendar
- Schedule next filing

### 12.3 Compliance Calendar

The automated Compliance Calendar:

- Shows all upcoming deadlines
- Color-coded by urgency
- Email/SMS reminders
- Auto-calculates due dates
- Links to start filing process

---

## 13. AI-Powered Tools

### 13.1 AutoComply

AI-driven compliance assistant that:

- Analyzes business transactions
- Identifies compliance requirements
- Suggests optimal filing strategies
- Alerts on regulatory changes
- Predicts potential issues

**Usage:**
1. Navigate to `/autocomply`
2. Select business to analyze
3. Choose compliance area
4. Review AI recommendations
5. Accept or modify suggestions
6. Generate action items

### 13.2 DigiScore

Business compliance health score:

- **Score Range:** 0-100
- **Components:**
  - Filing timeliness (25%)
  - Documentation completeness (25%)
  - Regulatory adherence (25%)
  - Financial health indicators (25%)

**Improving Your Score:**
- File returns on time
- Complete all required registrations
- Maintain updated documents
- Address compliance gaps

### 13.3 TaxTracker

Real-time tax liability tracking:

- **GST Liability** - Input/output tracking
- **Income Tax** - Advance tax calculator
- **TDS** - Deduction tracker
- **Tax Calendar** - Payment schedules

**Features:**
- Dashboard with tax summary
- Payment reminders
- What-if analysis
- Tax optimization suggestions

---

## 14. Document Management

### 14.1 Document Vault

Secure cloud storage for business documents:

**Organization:**
```
Document Vault/
├── Company Documents/
│   ├── Incorporation/
│   ├── Registrations/
│   └── Licenses/
├── Financial/
│   ├── Bank Statements/
│   ├── Invoices/
│   └── Ledgers/
├── Tax Filings/
│   ├── GST Returns/
│   ├── Income Tax/
│   └── TDS Returns/
└── Agreements/
    ├── Client Contracts/
    └── Vendor Agreements/
```

### 14.2 Document Upload

**Methods:**
1. **Drag & Drop** - Drop files directly
2. **Click Upload** - Browse and select
3. **Bulk Upload** - Multiple files at once
4. **Email** - Forward to dedicated email

**Processing:**
- Virus scanning
- Format validation
- OCR for searchability
- Auto-categorization

### 14.3 Document Sharing

**Secure Sharing:**
1. Select document(s)
2. Click "Share"
3. Set permissions:
   - View only
   - Download allowed
   - Time-limited access
4. Generate link
5. Share via email or copy link

### 14.4 E-Sign Integration

Sign documents electronically:

1. Upload document for signing
2. Add signature fields
3. Invite signatories
4. Track signing progress
5. Download signed copy

---

## 15. Communication & Notifications

### 15.1 Message Center

Internal communication hub:

- **Threads** - Organized by service request or topic
- **Direct Messages** - One-on-one communication
- **Team Channels** - Department discussions
- **Attachments** - Share documents inline

### 15.2 Notification Types

| Type | Channel | Purpose |
|------|---------|---------|
| Status Updates | In-app, Email, SMS | Service progress |
| Reminders | In-app, Email, SMS | Compliance deadlines |
| Alerts | In-app, Email | Urgent actions needed |
| Promotions | Email | New services, offers |
| System | In-app | Platform updates |

### 15.3 Notification Preferences

Customize your notifications:

1. Navigate to Settings
2. Select "Notifications"
3. Configure per category:
   - Enable/disable
   - Choose channels
   - Set quiet hours
4. Save preferences

### 15.4 WhatsApp Integration

Get updates via WhatsApp:

1. Opt-in to WhatsApp notifications
2. Verify phone number
3. Receive:
   - Status updates
   - Payment confirmations
   - Filing reminders
   - Support responses

---

## 16. Payment & Billing

### 16.1 Payment Methods

**Supported Methods:**
- Credit/Debit Cards (Visa, Mastercard, RuPay)
- Net Banking
- UPI (Google Pay, PhonePe, BHIM)
- Wallets (Paytm, Amazon Pay)
- EMI (select services)

### 16.2 Making a Payment

1. Select service or invoice
2. Review amount and breakdown
3. Choose payment method
4. Complete on Razorpay gateway
5. Receive instant confirmation

### 16.3 Invoices

Access all invoices:

1. Navigate to Billing
2. View invoice list
3. Download PDF
4. Pay outstanding invoices
5. Track payment history

**Invoice Details:**
- Invoice number
- Service details
- Amount breakdown (base + taxes)
- Payment status
- Due date

### 16.4 Wallet & Credits

DigiComply Wallet:

- **Add Credits** - Prepay for services
- **Bonus Credits** - From promotions
- **Auto-Pay** - Use wallet balance first
- **Referral Earnings** - Credits from referrals

---

## 17. Reporting & Analytics

### 17.1 Available Reports

**Client Reports:**
- Service history
- Compliance status
- Payment history
- Document inventory

**Operations Reports:**
- Work volume
- SLA adherence
- Team productivity
- Escalation trends

**Sales Reports:**
- Pipeline analysis
- Conversion rates
- Revenue forecast
- Agent performance

**Executive Reports:**
- Revenue dashboard
- Client acquisition
- Service mix
- Regional analysis

### 17.2 Generating Reports

1. Navigate to Reports section
2. Select report type
3. Configure parameters:
   - Date range
   - Filters
   - Grouping
4. Generate
5. Export (Excel, PDF, CSV)

### 17.3 Scheduled Reports

Automate report delivery:

1. Configure report
2. Click "Schedule"
3. Set frequency (daily, weekly, monthly)
4. Add recipients
5. Activate

---

## 18. Security & Authentication

### 18.1 Authentication

**Client Authentication:**
- OTP-based login (no passwords to remember)
- Session duration: 24 hours
- Re-authentication for sensitive actions

**Staff Authentication:**
- Email + password
- Password requirements:
  - Minimum 8 characters
  - Upper and lowercase letters
  - At least one number
  - At least one special character
- Session duration: 8 hours (configurable)

### 18.2 Session Management

View and manage active sessions:

1. Navigate to Security settings
2. View "Active Sessions"
3. See devices, locations, times
4. Terminate suspicious sessions
5. "Sign Out All Devices" if needed

### 18.3 Two-Factor Authentication (2FA)

Enable additional security:

1. Go to Security settings
2. Enable 2FA
3. Choose method:
   - Authenticator app (Google, Authy)
   - SMS OTP
4. Complete setup
5. Save recovery codes

### 18.4 Data Protection

DigiComply implements:

- **Encryption at Rest** - All data encrypted in database
- **Encryption in Transit** - TLS 1.3 for all connections
- **Access Logging** - All access tracked
- **Regular Backups** - Daily backups with 30-day retention
- **GDPR Compliance** - Data deletion available

### 18.5 Audit Trail

Complete activity logging:

- User actions tracked
- Immutable logs
- Retention: 7 years (compliance requirement)
- Export for audits

---

## 19. Troubleshooting

### 19.1 Common Issues

**Issue: Can't log in**
- Verify correct email/phone
- Check caps lock
- Clear browser cache
- Try incognito/private mode
- Contact support if persistent

**Issue: OTP not received**
- Wait 60 seconds
- Check SMS inbox (not spam)
- Verify phone number
- Try "Resend OTP"
- Check if DND is enabled

**Issue: Page not loading**
- Refresh the page
- Clear browser cache
- Check internet connection
- Try different browser
- Contact support

**Issue: Document upload failed**
- Check file size (max 10MB)
- Verify file format
- Check internet stability
- Try smaller file
- Contact support

### 19.2 Browser Requirements

**Supported Browsers:**
- Chrome (recommended) - version 90+
- Firefox - version 88+
- Safari - version 14+
- Edge - version 90+

**Requirements:**
- JavaScript enabled
- Cookies enabled
- Pop-ups allowed for this site

### 19.3 Getting Help

**Self-Service:**
- Knowledge Base: `/knowledge-base`
- FAQs in Support section
- Video tutorials

**Contact Support:**
- In-app chat (9 AM - 7 PM IST)
- Email: support@digicomply.in
- Phone: 1800-XXX-XXXX

**Escalation:**
- Request manager callback
- Email: escalations@digicomply.in

---

## 20. API Reference

### 20.1 API Overview

DigiComply provides REST APIs for integration:

**Base URL:** `https://api.digicomply.in/api/v1`

**Authentication:**
- Bearer token authentication
- API keys for server-to-server
- OAuth2 for user context

### 20.2 API Categories

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Auth | `/auth/*` | Authentication & sessions |
| Client | `/client/*` | Client data & actions |
| Services | `/services/*` | Service catalog |
| Operations | `/operations/*` | Work management |
| Documents | `/documents/*` | Document operations |
| Payments | `/payments/*` | Payment processing |
| Compliance | `/compliance-state/*` | Compliance tracking |
| Government | `/government/*` | Filing APIs |
| Notifications | `/notifications/*` | Notification management |
| Reports | `/reports/*` | Report generation |
| HR | `/hr/*` | Human resources |
| Audit | `/audit/*` | Activity logs |

### 20.3 Webhooks

Receive real-time events:

**Available Events:**
- `service_request.created`
- `service_request.status_changed`
- `document.uploaded`
- `payment.completed`
- `compliance.due_soon`

**Configuration:**
1. Navigate to Admin > Webhooks
2. Add endpoint URL
3. Select events
4. Configure security (signature verification)
5. Activate

### 20.4 Rate Limits

| Tier | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Basic | 60 | 10,000 |
| Professional | 300 | 50,000 |
| Enterprise | 1,000 | Unlimited |

---

## Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G` then `H` | Go to Home/Dashboard |
| `G` then `S` | Go to Services |
| `G` then `D` | Go to Documents |
| `G` then `N` | Go to Notifications |
| `?` | Show keyboard shortcuts |
| `Esc` | Close modal/dialog |
| `/` | Focus search |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **DigiScore** | Compliance health score (0-100) |
| **AutoComply** | AI compliance assistant |
| **TaxTracker** | Tax liability monitoring tool |
| **SLA** | Service Level Agreement - delivery timeline |
| **ROC** | Registrar of Companies |
| **MCA** | Ministry of Corporate Affairs |
| **GST** | Goods and Services Tax |
| **TDS** | Tax Deducted at Source |
| **PF** | Provident Fund |
| **ESI** | Employee State Insurance |
| **Retainer** | Monthly subscription plan |
| **Blueprint** | Service workflow template |
| **Tenant** | Organization/company account |

---

## Appendix C: Contact Information

**Technical Support:**
- Email: support@digicomply.in
- Phone: 1800-XXX-XXXX
- Hours: 9 AM - 7 PM IST (Mon-Sat)

**Sales Inquiries:**
- Email: sales@digicomply.in
- Phone: 1800-XXX-XXXX

**Partnership:**
- Email: partners@digicomply.in

**Corporate Office:**
- Address: [Company Address]
- Website: www.digicomply.in

---

**Document Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial release |

---

*This document is proprietary to DigiComply. Unauthorized distribution is prohibited.*
