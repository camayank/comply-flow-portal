# Ops Case Dashboard + Lead Traceability Design

**Date:** 2026-02-16
**Status:** Approved
**Author:** Claude + User

## Overview

Build an ops-focused Case Dashboard at `/ops/case/:id` that provides a single view of everything about a compliance case. Simultaneously fix lead traceability by adding `lead_id` foreign keys to core tables.

## Goals

1. **Single source of truth** for ops team managing a case
2. **Lead attribution** - trace any service request back to original lead source
3. **Filing status tracking** - detailed government submission stages
4. **Team collaboration** - internal notes with audit trail
5. **Future-ready** - support email marketing attribution when added

## Non-Goals

- Client-facing changes (separate page exists)
- Government API integration (manual workflow for now)
- Real-time notifications (use existing system)

---

## Part 1: Schema Changes (Lead Traceability)

### Problem

Lead ID is not preserved when converting leads to users/clients. This breaks:
- Marketing attribution (which campaign → which revenue)
- Lead source analytics
- Agent commission tracking accuracy

### Current Flow (Broken)

```
Lead (L2600001) → User (id:42) → BusinessEntity (C00001) → ServiceRequest (SR2600001)
                  ↑ NO lead_id    ↑ NO lead_id            ↑ NO lead_id
```

### New Flow (Fixed)

```
Lead (L2600001, id:1)
    ↓ lead_id:1 propagated
User (id:42, lead_id:1)
    ↓
BusinessEntity (C00001, lead_id:1)
    ↓
ServiceRequest (SR2600001, lead_id:1)
    ↓
Payment (PAY26000001, lead_id:1)
```

### Schema Additions

#### 1. users table
```typescript
leadId: integer("lead_id").references(() => leads.id),
```

#### 2. business_entities table
```typescript
leadId: integer("lead_id").references(() => leads.id),
```

#### 3. service_requests table
```typescript
leadId: integer("lead_id").references(() => leads.id),

// Filing status fields
filingStage: text("filing_stage").default("not_filed"),
  // Values: not_filed, filed, acknowledged, query_raised,
  //         response_submitted, under_processing, approved, rejected
filingDate: timestamp("filing_date"),
filingPortal: text("filing_portal"), // GST Portal, MCA, FSSAI, etc.
arnNumber: text("arn_number"), // Application Reference Number
queryDetails: text("query_details"),
queryRaisedAt: timestamp("query_raised_at"),
responseSubmittedAt: timestamp("response_submitted_at"),
finalStatus: text("final_status"), // approved, rejected
finalStatusDate: timestamp("final_status_date"),
certificateUrl: text("certificate_url"),
```

#### 4. payments table
```typescript
leadId: integer("lead_id").references(() => leads.id),
```

#### 5. New table: case_notes
```typescript
export const caseNotes = pgTable("case_notes", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id")
    .notNull()
    .references(() => serviceRequests.id),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  isClientVisible: boolean("is_client_visible").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Migration Strategy

1. Add columns as nullable first
2. Backfill existing records where possible (match by email)
3. Update conversion logic to populate going forward
4. Add indexes for query performance

---

## Part 2: Ops Case Dashboard

### Route

`/ops/case/:id` - where `:id` is service_request.id or service_request.requestId (SR2600001)

### Access Control

- Roles: `ops_executive`, `ops_manager`, `admin`, `super_admin`
- Ops can view all cases
- Assignment restrictions based on role

### Layout

Single-page dashboard with:
- **Header**: Case ID, status dropdown, priority badge, SLA timer
- **Summary Cards**: Filing status, documents, client info, SLA
- **Tabbed Content**: Timeline, documents, internal notes, client comms, actions

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to Queue    Case #SR2600001    [In Progress ▼]  [Urgent]    │
│                    Client: Acme Corp   SLA: 4h 23m remaining       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
│  │ FILING       │  │ DOCUMENTS    │  │ CLIENT       │  │ SLA     │ │
│  │ STATUS       │  │ 4/6 uploaded │  │ Acme Corp    │  │ 4h 23m  │ │
│  │ Query Raised │  │ 2 pending    │  │ Lead: Google │  │ On Track│ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│  [Timeline] [Documents] [Internal Notes] [Client Comms] [Actions]  │
├─────────────────────────────────────────────────────────────────────┤
│  Tab Content Area                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Filing Status Card

Displays current filing stage with visual progress:

```
○ Not Filed
○ Filed ─────────── 12 Jan 2026
○ Acknowledged ──── ARN: GST1234567
● Query Raised ──── 14 Jan 2026
○ Response Submitted
○ Under Processing
○ Approved / Rejected
```

**Actions:**
- Update filing stage (dropdown)
- Add ARN/reference number
- Add query details
- Upload certificate

### Documents Card

Shows document checklist with status:

```
✓ PAN Card              [View] [Verify]
✓ GST Certificate       [View] [Verify]
○ Board Resolution      [Request from Client]
○ Director KYC          [Request from Client]
```

**Actions:**
- View document
- Mark as verified
- Request from client (sends notification)
- Upload on behalf of client
- Download all

### Client Info Card

Shows client details with lead attribution:

```
Acme Corp Pvt Ltd           [C00042]
GSTIN: 27AABCA1234A1Z5
PAN: AABCA1234A

Contact: Rahul Sharma
rahul@acme.com | +91 98765 43210

───────────────────────────
Lead Source: Google Ads      ← From lead_id join
Lead ID: L2600042
Acquired: 15 Dec 2025
Agent: Priya (Commission: ₹2,500)
```

### SLA Card

Shows time remaining with visual indicator:

```
⏱️ SLA STATUS

Time Remaining: 4h 23m
Status: On Track (green)
Deadline: 16 Feb 2026, 6:00 PM

[Extend SLA] [View History]
```

### Internal Notes Tab

Simple chronological log:

```
[+ Add Note]

Rahul (Ops Executive) - 2 hours ago
Called client, they're gathering missing PAN copy.
Will upload by EOD.

Priya (QC Manager) - Yesterday
GST certificate looks incorrect. Need verification
before proceeding with filing.
```

**Features:**
- Add note with text
- Timestamp + author auto-added
- Optional: mark as client-visible
- Chronological display (newest first)

### Actions Tab

Quick actions for the case:

- **Status**: Change case status
- **Assignment**: Assign/reassign team member
- **Priority**: Update priority level
- **SLA**: Extend SLA with reason
- **Escalate**: Manually escalate case
- **Filing**: Update filing status
- **Documents**: Request/upload documents

---

## API Endpoints

### Case Notes

```
GET    /api/ops/cases/:id/notes      - List notes for case
POST   /api/ops/cases/:id/notes      - Add note
PATCH  /api/ops/cases/:id/notes/:nid - Update note
DELETE /api/ops/cases/:id/notes/:nid - Delete note (soft)
```

### Filing Status

```
GET   /api/ops/cases/:id/filing      - Get filing status
PATCH /api/ops/cases/:id/filing      - Update filing status
POST  /api/ops/cases/:id/filing/arn  - Add ARN/reference
```

### Case Detail (enhanced)

```
GET /api/ops/cases/:id  - Full case detail with:
  - Service request data
  - Business entity (client) data
  - Lead data (via lead_id join)
  - Documents
  - Timeline
  - Notes
  - Filing status
  - SLA status
  - Assignment info
```

---

## File Structure

```
client/src/pages/ops/
  CaseDashboard.tsx          # Main dashboard page

client/src/components/ops/
  CaseHeader.tsx             # Header with status/priority
  FilingStatusCard.tsx       # Filing progress card
  DocumentsCard.tsx          # Document checklist card
  ClientInfoCard.tsx         # Client details + lead info
  SlaCard.tsx                # SLA timer card
  InternalNotesTab.tsx       # Notes list + add form
  CaseActionsTab.tsx         # Quick actions
  CaseTimelineTab.tsx        # Activity timeline

server/routes/
  ops-case-routes.ts         # API routes for case dashboard

shared/schema.ts             # Schema additions
```

---

## Success Criteria

1. Ops can view complete case info in one screen
2. Lead source visible on every case
3. Filing status trackable through all stages
4. Internal notes preserved with audit trail
5. All actions accessible without page navigation
6. Query: "Revenue by lead source" answerable

---

## Future Enhancements (Not in Scope)

- Real-time updates via WebSocket
- Keyboard shortcuts for power users
- Bulk case actions
- Custom filing stage templates per service type
- AI-suggested next actions
