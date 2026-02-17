# Platform Completion Design Document

**Date:** 2026-02-17
**Status:** Approved
**Approach:** Hybrid (Foundation + Parallel User Journeys)

## Executive Summary

This document outlines the end-to-end implementation plan to bring the DigiComply platform to production readiness. The audit identified 30+ incomplete features across 14 user roles. This design addresses all gaps using a three-phase hybrid approach.

## Scope

### User Personas (All Equal Priority)
- **Client** - Business owners using compliance services
- **Operations** - Internal team processing service requests
- **Sales** - Lead management and proposal generation
- **Agent** - Partner network earning commissions
- **Admin/Super Admin** - Platform configuration and user management

### Feature Categories (Core Workflows First)
- Notifications (multi-channel delivery)
- Payments/Wallet (webhooks, transactions)
- Document Verification (storage, OCR)
- SLA Enforcement (real tracking)

### Integration Depth
- Production-ready with real providers (SendGrid, Twilio, Razorpay)

---

## Phase 1: Foundation

### 1.1 Notification Hub

**Architecture:**
```
NotificationHub (Central Router)
├── EmailChannel (SendGrid/SMTP)
│   ├── Template engine (7 templates)
│   ├── Delivery tracking
│   └── Retry with exponential backoff
├── SMSChannel (Twilio/MSG91)
│   ├── OTP delivery
│   └── Transactional SMS
├── WhatsAppChannel (Meta Business API)
│   ├── Template messages
│   └── Session messages
├── PushChannel (Firebase FCM)
│   └── Mobile + web push
└── InAppChannel (Database + WebSocket)
    └── Real-time notifications
```

**Key Features:**
- User preference enforcement (quiet hours, channel opt-out)
- Delivery confirmation tracking in database
- Failed delivery retry queue (BullMQ)
- Rate limiting per user/channel

**Files to Create/Modify:**
- `server/services/notifications/notification-hub.ts` (enhance existing)
- `server/services/notifications/channels/*.ts` (production config)
- `server/db/schema/notification-delivery-log.ts` (new table)

### 1.2 Payment Webhook Handler

**Flow:**
```
Razorpay Event → /api/webhooks/razorpay
├── Signature verification (SHA256 HMAC)
├── Idempotency check (prevent duplicate processing)
├── Event routing:
│   ├── payment.captured → Update payment status + send receipt
│   ├── payment.failed → Update status + notify user
│   ├── refund.processed → Update wallet + notify
│   └── subscription.* → Handle recurring billing
└── Audit log entry
```

**Files to Create/Modify:**
- `server/routes/webhooks/razorpay.ts` (new)
- `server/services/payment-webhook-processor.ts` (new)
- `server/db/schema/webhook-events.ts` (idempotency table)

### 1.3 Storage Service

**Interface:**
```typescript
interface IStorageProvider {
  upload(buffer, path, options): Promise<{path, url}>
  getSignedUrl(path, expiresIn): Promise<string>
  delete(path): Promise<void>
}
```

**Providers:**
- LocalStorageProvider (development)
- GCSStorageProvider (production - Google Cloud Storage)
- S3StorageProvider (optional - AWS S3)

**Files:**
- `server/services/storage/index.ts` (exists - enhance)
- `server/services/storage/providers/*.ts` (provider implementations)

### 1.4 OTP Service

**Security Features:**
- Cryptographically secure generation (6-digit via `crypto.randomInt`)
- bcrypt hashing before storage
- Rate limiting: 3 attempts/10 min, 5 OTPs/hour
- Expiry: 10 minutes
- Multi-channel delivery (SMS primary, email fallback)

**Files:**
- `server/services/notifications/otp.service.ts` (exists - enhance)
- `server/db/schema/otp-codes.ts` (exists)

---

## Phase 2: Core Workflows by User

### 2.1 Client User Journey

**Onboarding Flow:**
```
Registration → OTP Verify → Business Details → KYC Upload → Payment → Welcome Email
```

**Features to Implement:**

| Feature | Current State | Implementation |
|---------|--------------|----------------|
| OTP Verification | TODO comment | Real SMS/email OTP with rate limiting |
| Welcome Email | TODO comment | SendGrid template with temp password |
| Document Upload | Works | Add virus scan + OCR extraction |
| KYC Verification | Mock | DigiLocker API for Aadhaar/PAN validation |
| Wallet System | Returns `{balance: 0}` | Real wallet table with transactions |
| Referral Tracking | TODO comment | Referral codes, tracking, reward payouts |
| Compliance Calendar | UI only | Real deadline tracking with reminders |
| Invoice Download | Data only | PDF generation with template |

**Files to Create/Modify:**
- `server/routes/client-registration-routes.ts` (complete TODOs)
- `server/services/kyc-verification.ts` (new)
- `server/services/wallet-service.ts` (new)
- `server/services/referral-service.ts` (new)
- `client/src/hooks/useClientPortal.ts` (enhance)

### 2.2 Operations User Journey

**Work Queue Flow:**
```
New Request → Auto-Assign → SLA Timer → Work → QC Review → Delivery → Close
```

**Features to Implement:**

| Feature | Current State | Implementation |
|---------|--------------|----------------|
| SLA Enforcement | `Math.random()` | Real deadline calculation from service config |
| Auto-Escalation | TODO comment | Cron job checks breaches, notifies managers |
| Work Assignment | Manual only | Algorithm: skill match + workload balance |
| Document Verification | Basic upload | Checklist-based review + approve/reject |
| QC Handoff | UI exists | Workflow with client signature capture |
| Performance Metrics | Random values | Real calculations from timestamps |
| Team Dashboard | Mock data | Aggregated from actual work items |

**Services to Implement:**
```typescript
// SLA Service
calculateDeadline(serviceId, priority): Date
checkBreaches(): ServiceRequest[]
escalate(requestId, level): void

// Assignment Service
autoAssign(requestId): userId
rebalanceWorkload(teamId): void
getOptimalAssignee(skills, workload): userId
```

**Files to Create/Modify:**
- `server/services/sla-service.ts` (new - real implementation)
- `server/services/assignment-service.ts` (new)
- `server/services/qc-workflow-service.ts` (new)
- `server/routes/operations-routes.ts` (replace mocks)

### 2.3 Sales/Agent User Journey

**Lead-to-Client Flow:**
```
Lead Capture → Qualify → Proposal → Negotiate → Payment → Convert to Client
```

**Features to Implement:**

| Feature | Current State | Implementation |
|---------|--------------|----------------|
| Lead Assignment | Manual | Auto-distribute based on territory/skill/load |
| Lead Scoring | Basic stages | Algorithm: engagement + firmographics |
| Proposal PDF | Data only | PDFKit generation with branding |
| Proposal Email | Not implemented | SendGrid with tracking pixel |
| E-Signature | UI placeholder | Internal signature capture |
| Commission Calc | No logic | Tier-based rules engine |
| Commission Payout | Not implemented | Batch processing + wallet credit |
| Agent KYC | Schema exists | Full verification workflow |

**Services to Implement:**
```typescript
// Proposal Service
generatePDF(proposalId): Buffer
sendToClient(proposalId, email): void
trackView(proposalId, token): void

// Commission Service
calculateCommission(saleId, agentId): amount
processPayouts(period): BatchResult
getAgentStatement(agentId, dateRange): Statement
```

**Files to Create/Modify:**
- `server/services/proposal-service.ts` (new)
- `server/services/commission-service.ts` (new)
- `server/services/lead-assignment-service.ts` (new)
- `server/routes/proposals-routes.ts` (enhance)
- `server/routes/agent-routes.ts` (enhance)

### 2.4 Admin User Journey

**User Management Flow:**
```
Create User → Set Role → Send Credentials → User Logs In → Audit Trail
```

**Features to Implement:**

| Feature | Current State | Implementation |
|---------|--------------|----------------|
| User Provisioning | Creates user | + Email notification + temp password |
| Audit Log Export | Logs exist | Excel/PDF export with filters |
| Service Config | UI exists | Real SLA hours, pricing, documents |
| Webhook Management | CRUD only | Signature verification + retry logic |
| API Key Management | Basic | Scoped permissions + usage tracking |
| System Health | Not implemented | Real metrics from DB/queues/services |

**Files to Create/Modify:**
- `server/routes/admin-routes.ts` (complete user provisioning)
- `server/services/audit-export-service.ts` (new)
- `server/services/system-health-service.ts` (new)
- `server/routes/webhooks/management.ts` (enhance)

---

## Phase 3: Enhancements

### 3.1 Real Analytics

**Aggregation Layer:**
```
Raw Data (DB Tables)
├── Aggregation Layer (Materialized Views + Cron Jobs)
│   ├── daily_metrics (nightly refresh)
│   ├── user_performance (hourly)
│   └── compliance_scores (on-demand + cached)
└── Analytics API
    ├── GET /analytics/dashboard/:role
    ├── GET /analytics/trends?period=
    └── GET /analytics/export?format=
```

**Metrics by Role:**

| Role | Metrics | Source |
|------|---------|--------|
| Client | DigiScore, compliance %, upcoming deadlines | compliance_tracking |
| Ops | Avg completion time, SLA breach %, workload | service_requests |
| Sales | Conversion rate, pipeline value, commission | leads + proposals |
| QC | Approval rate, avg review time | qc_reviews |
| Admin | Active users, revenue, system health | aggregated |

**Caching Strategy:**
- Redis cache for frequently accessed metrics (5-min TTL)
- Materialized views for complex aggregations
- Real-time updates via WebSocket for critical metrics

**Files to Create:**
- `server/services/analytics-service.ts` (new)
- `server/routes/analytics-routes.ts` (new)
- `server/db/migrations/create-analytics-views.ts` (new)

### 3.2 Government API Integration

**APIs to Integrate:**

| API | Purpose | Provider |
|-----|---------|----------|
| GST Portal | GSTIN verification, filing status | GSP (Cleartax/Masters India) |
| MCA21 | CIN verification, company details | MCA API |
| PAN Verification | Identity validation | NSDL/UTIITSL |
| Aadhaar (DigiLocker) | KYC verification | DigiLocker API |
| ITR Verification | Income verification | Income Tax Portal |

**Adapter Pattern:**
```typescript
interface IGovtAPIAdapter {
  verify(identifier: string): Promise<VerificationResult>
  getStatus(identifier: string): Promise<FilingStatus>
  file(data: FilingData): Promise<FilingResult>
}
```

**Files to Create/Modify:**
- `server/services/govt-api/gst-adapter.ts` (real implementation)
- `server/services/govt-api/mca-adapter.ts` (real implementation)
- `server/services/govt-api/pan-adapter.ts` (new)
- `server/services/govt-api/digilocker-adapter.ts` (new)

### 3.3 Advanced Reporting

**Report Types:**

| Report | Audience | Format | Delivery |
|--------|----------|--------|----------|
| Compliance Summary | Client | PDF | Email + Portal |
| Operations Performance | Ops Manager | Excel | Scheduled |
| Revenue Report | Admin | PDF/Excel | On-demand |
| Audit Trail | Compliance Officer | PDF | On-demand |
| Commission Statement | Agent | PDF | Monthly auto |

**PDF Generation Stack:**
```
Data Query → Template Engine → PDFKit/Puppeteer → Storage → Notification
```

**Files to Create:**
- `server/services/report-generator.ts` (new)
- `server/templates/reports/*.hbs` (Handlebars templates)
- `server/queues/processors/report-processor.ts` (new)

### 3.4 Enhanced Communication

**Messaging Improvements:**
- Thread hierarchy (parent-child relationships)
- File attachments (storage service integration)
- Read receipts (WebSocket + database)
- @mentions (parse content, trigger notifications)
- Full-text search (PostgreSQL)

**Files to Modify:**
- `server/routes/messaging.ts` (enhance)
- `server/db/schema/messaging.ts` (add fields)
- `client/src/hooks/useMessaging.ts` (enhance)

---

## Database Schema Additions

### New Tables

```sql
-- Wallet transactions
CREATE TABLE wallet_transactions (
  id SERIAL PRIMARY KEY,
  wallet_id INTEGER REFERENCES wallets(id),
  type VARCHAR(20) NOT NULL, -- credit, debit, referral_bonus, cashback
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  description TEXT,
  reference_type VARCHAR(50),
  reference_id INTEGER,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notification delivery log
CREATE TABLE notification_delivery_log (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER REFERENCES notifications(id),
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, sent, delivered, failed
  provider_message_id VARCHAR(255),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webhook events (idempotency)
CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB,
  processed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Commission rules
CREATE TABLE commission_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  service_category VARCHAR(50),
  tier INTEGER DEFAULT 1,
  percentage DECIMAL(5,2) NOT NULL,
  flat_amount DECIMAL(12,2),
  min_value DECIMAL(12,2),
  max_value DECIMAL(12,2),
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scheduled reports
CREATE TABLE scheduled_reports (
  id SERIAL PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  schedule VARCHAR(50) NOT NULL, -- cron expression
  recipients JSONB NOT NULL, -- user IDs or role
  filters JSONB,
  format VARCHAR(10) DEFAULT 'pdf',
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics cache
CREATE TABLE analytics_cache (
  id SERIAL PRIMARY KEY,
  metric_key VARCHAR(100) NOT NULL,
  metric_value JSONB NOT NULL,
  role VARCHAR(50),
  user_id INTEGER,
  calculated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(metric_key, role, user_id)
);
```

---

## Implementation Timeline

### Phase 1: Foundation (Week 1)
- Day 1-2: Notification Hub production config
- Day 3: Payment webhook handler
- Day 4: Storage service enhancement
- Day 5: OTP service + testing

### Phase 2: Core Workflows (Weeks 2-4)
- Week 2: Client journey (onboarding, wallet, referrals)
- Week 3: Operations journey (SLA, assignment, QC)
- Week 4: Sales/Agent journey (proposals, commissions)

### Phase 3: Enhancements (Weeks 5-6)
- Week 5: Real analytics, government APIs
- Week 6: Reporting, communication, polish

---

## Success Criteria

### Production Readiness Checklist

- [ ] All notifications delivered via real channels
- [ ] Payment webhooks processed with idempotency
- [ ] Documents stored securely with signed URLs
- [ ] OTP verification working for all users
- [ ] SLA tracking uses real timestamps
- [ ] Proposals generate PDFs and send emails
- [ ] Commissions calculated automatically
- [ ] Analytics show real data (no Math.random)
- [ ] Audit logs exportable
- [ ] All TODO comments resolved

### Testing Requirements

- Unit tests for all new services
- Integration tests for external APIs
- E2E tests for critical user journeys
- Load testing for notification throughput

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| External API rate limits | High | Implement queuing + retry logic |
| Government API downtime | High | Fallback to manual verification queue |
| Payment webhook failures | Critical | Idempotency + reconciliation job |
| Notification delivery delays | Medium | Multi-channel fallback |

---

## Appendix: File Index

### New Files to Create
```
server/
├── services/
│   ├── wallet-service.ts
│   ├── referral-service.ts
│   ├── sla-service.ts
│   ├── assignment-service.ts
│   ├── qc-workflow-service.ts
│   ├── proposal-service.ts
│   ├── commission-service.ts
│   ├── lead-assignment-service.ts
│   ├── analytics-service.ts
│   ├── audit-export-service.ts
│   ├── system-health-service.ts
│   ├── report-generator.ts
│   ├── kyc-verification.ts
│   └── govt-api/
│       ├── pan-adapter.ts
│       └── digilocker-adapter.ts
├── routes/
│   ├── webhooks/
│   │   └── razorpay.ts
│   └── analytics-routes.ts
├── db/
│   └── migrations/
│       ├── add-wallet-transactions.ts
│       ├── add-notification-delivery-log.ts
│       ├── add-webhook-events.ts
│       ├── add-commission-rules.ts
│       ├── add-scheduled-reports.ts
│       └── add-analytics-cache.ts
├── templates/
│   └── reports/
│       ├── compliance-summary.hbs
│       ├── commission-statement.hbs
│       └── operations-performance.hbs
└── queues/
    └── processors/
        └── report-processor.ts
```

### Files to Modify
```
server/
├── routes/
│   ├── client-registration-routes.ts (complete TODOs)
│   ├── operations-routes.ts (replace mocks)
│   ├── proposals-routes.ts (add PDF/email)
│   ├── agent-routes.ts (commission logic)
│   ├── admin-routes.ts (user provisioning)
│   └── messaging.ts (enhance threading)
├── services/
│   ├── notifications/notification-hub.ts (production)
│   ├── notifications/channels/*.ts (real providers)
│   ├── govt-api/gst-adapter.ts (real API)
│   └── govt-api/mca-adapter.ts (real API)
└── db/schema/
    └── messaging.ts (add fields)

client/src/
├── hooks/
│   ├── useClientPortal.ts (enhance)
│   └── useMessaging.ts (enhance)
└── features/
    └── */hooks/*.ts (connect to real APIs)
```
