# Operations User Complete Flow

**Date:** 2026-02-16
**Status:** Active
**For:** Ops Executives and Ops Managers

## Overview

This document describes the complete user flow for Operations team members, covering all screens, navigation paths, and actions available.

---

## User Roles

| Role | Level | Description |
|------|-------|-------------|
| `ops_manager` | 80 | Full ops access + team management + analytics |
| `ops_executive` | 70 | Individual work + limited team view |

---

## Complete Screen Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OPS USER LOGIN                                      │
│                              ↓                                               │
│                    /operations (Dashboard Home)                              │
│                              ↓                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐          │
│   │   Work Queue    │   │ Document Review │   │  Escalations    │          │
│   │   /work-queue   │   │ /ops/doc-review │   │  /escalations   │          │
│   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘          │
│            │                     │                      │                    │
│            ↓                     ↓                      ↓                    │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │                    /ops/case/:id                             │           │
│   │                  (Case Dashboard)                            │           │
│   │                                                              │           │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │           │
│   │  │ Filing   │ │ Client   │ │ SLA      │ │ Actions  │       │           │
│   │  │ Status   │ │ Info     │ │ Timer    │ │ Panel    │       │           │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │           │
│   │                                                              │           │
│   │  Tabs: [Timeline] [Documents] [Notes] [Communications]      │           │
│   └──────────────────────────────────────────────────────────────┘           │
│                              │                                               │
│                              ↓                                               │
│   ┌─────────────────────────────────────────────────────────────┐           │
│   │                  /ops/client/:clientId                       │           │
│   │                 (Client Dashboard)                           │           │
│   │                                                              │           │
│   │  All work items for this client + unified timeline          │           │
│   └──────────────────────────────────────────────────────────────┘           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Details

### 1. Operations Dashboard (`/operations`)

**File:** `client/src/pages/MobileOperationsPanelRefactored.tsx`

**Purpose:** Home dashboard with overview stats and quick navigation

**Components:**
- Stats Cards: Total Orders, Pending, Completed, Team Utilization
- Quick Actions: New Order, Schedule, Assign Task, Reports
- Today's Performance: SLA metrics, completion rate
- Navigation Links to all ops screens

**Data API:** `GET /api/ops/dashboard-stats`

```
┌─────────────────────────────────────────────────────────────────┐
│ Operations Dashboard                                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ Total   │ │ Pending │ │ Complete│ │ Team    │               │
│  │  124    │ │   42    │ │   82    │ │  78%    │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│                                                                  │
│  Quick Actions:                                                  │
│  [New Order] [Schedule] [Assign Task] [Reports]                 │
│                                                                  │
│  Today's Performance:                                            │
│  ████████████░░░░ 75% SLA Met                                   │
│                                                                  │
│  Navigation:                                                     │
│  → Work Queue  → Document Review  → Escalations                 │
│  → Service Requests  → Team Performance                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Work Queue (`/work-queue`)

**File:** `client/src/pages/OperationsWorkQueue.tsx`

**Purpose:** Central work management with SLA tracking

**Features:**
- Real-time SLA status (on_track, at_risk, warning, breached)
- Escalation indicators (L1, L2, L3)
- Assignment management
- Filter by status, priority, assignee
- Bulk actions

**Data APIs:**
- `GET /api/work-queue` - List items
- `GET /api/work-queue/stats` - Dashboard stats
- `GET /api/work-queue/at-risk` - At-risk items
- `GET /api/work-queue/breached` - Breached items
- `POST /api/work-queue/:id/assign` - Assign item
- `POST /api/work-queue/escalation-check` - Run escalation check

```
┌─────────────────────────────────────────────────────────────────┐
│ Work Queue                                            [Refresh]  │
├─────────────────────────────────────────────────────────────────┤
│  Stats: On Track (45) | At Risk (12) | Warning (8) | Breached (3)│
├─────────────────────────────────────────────────────────────────┤
│  Filters: [Status ▼] [Priority ▼] [Assignee ▼] [Type ▼]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ID       Client          Service       SLA      Status  Action │
│  ─────────────────────────────────────────────────────────────  │
│  SR001    Acme Corp       GST Reg       2h 15m   ⚠️ Risk [→]   │
│  SR002    TechStart       FSSAI         4h 30m   ✓ Track [→]   │
│  SR003    Retail Plus     Shop Act      BREACH   🔴 L2   [→]   │
│  ...                                                            │
│                                                                  │
│  [← Prev]  Page 1 of 5  [Next →]                                │
└─────────────────────────────────────────────────────────────────┘
```

**Actions:**
- Click row → `/ops/case/:id`
- Click client → `/ops/client/:clientId`
- Assign → Opens assignment dialog
- View escalation history

---

### 3. Document Review (`/ops/document-review`)

**File:** `client/src/pages/OperationsDocumentReview.tsx`

**Purpose:** Review and approve client-uploaded documents

**Features:**
- Document queue by status
- Preview documents
- Approve/Reject with comments
- Client-visible rejection reasons
- Link to case dashboard

**Data APIs:**
- `GET /api/ops/documents/pending` - Pending documents
- `POST /api/ops/documents/:id/approve` - Approve
- `POST /api/ops/documents/:id/reject` - Reject

```
┌─────────────────────────────────────────────────────────────────┐
│ Document Review                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Tabs: [Pending (24)] [Under Review (8)] [Approved] [Rejected]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Document         Client          Type         Uploaded  Action │
│  ─────────────────────────────────────────────────────────────  │
│  PAN Card         Acme Corp       Identity     2h ago   [Review]│
│  GST Certificate  TechStart       Compliance   4h ago   [Review]│
│  Bank Statement   Retail Plus     Financial    6h ago   [Review]│
│  ...                                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. Escalations (`/escalations`)

**File:** `client/src/pages/EscalationManagement.tsx`

**Purpose:** Manage escalated cases requiring attention

**Features:**
- Cases by escalation level (L1, L2, L3)
- Escalation history and timeline
- De-escalation actions
- Manager notifications

**Data APIs:**
- `GET /api/escalations` - List escalated items
- `POST /api/escalations/:id/acknowledge` - Acknowledge
- `POST /api/escalations/:id/resolve` - Resolve

```
┌─────────────────────────────────────────────────────────────────┐
│ Escalation Management                                            │
├─────────────────────────────────────────────────────────────────┤
│  L1 Warning (12) | L2 Critical (5) | L3 Breach (2)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔴 L3 BREACH - SR003 - Retail Plus - Shop Act                  │
│     Breached 4 hours ago | Assigned: Rahul                      │
│     [View Case] [Reassign] [Escalate to Manager]                │
│                                                                  │
│  🟠 L2 CRITICAL - SR007 - ABC Trading - GST Filing             │
│     Critical for 2 hours | Assigned: Priya                      │
│     [View Case] [Add Resources] [Contact Client]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Case Dashboard (`/ops/case/:id`)

**File:** `client/src/pages/ops/CaseDashboard.tsx`

**Purpose:** Single view of everything about a compliance case

**Components:**
- `FilingStatusCard` - Government filing progress
- `ClientInfoCard` - Client details with lead attribution
- `SlaCard` - SLA countdown and status
- `InternalNotesTab` - Ops-only notes
- `UnifiedTimeline` - Activity history

**Data APIs:**
- `GET /api/ops/cases/:id` - Full case detail
- `GET /api/ops/cases/:id/notes` - Case notes
- `POST /api/ops/cases/:id/notes` - Add note
- `PATCH /api/ops/cases/:id/filing` - Update filing status

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back    Case #SR2600001    [In Progress ▼]    [🔴 Urgent]     │
│           Client: Acme Corp   SLA: 4h 23m remaining             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ FILING       │  │ CLIENT       │  │ SLA          │           │
│  │ Query Raised │  │ Acme Corp    │  │ 4h 23m       │           │
│  │ ARN: GST123  │  │ Lead: Google │  │ ✓ On Track   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│  [Timeline] [Documents] [Internal Notes] [Actions]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Timeline Content / Tab Content                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6. Client Dashboard (`/ops/client/:clientId`)

**File:** `client/src/pages/ops/ClientDashboard.tsx`

**Purpose:** View all work for a specific client

**Components:**
- Client stats (total/active/completed cases)
- Lead attribution banner
- `WorkItemsTable` - All client's work items
- `UnifiedTimeline` - Client activity history

**Data APIs:**
- `GET /api/ops/clients/:clientId` - Client detail
- `GET /api/ops/clients/:clientId/timeline` - Activity timeline

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back    Acme Corp Pvt Ltd [C00042]                            │
│           GSTIN: 27AABCA1234A1Z5                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ Total: 8   │  │ Active: 3  │  │ Done: 5    │  │ ₹2.4L Rev  │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
│                                                                  │
│  📣 Lead Source: Google Ads | Agent: Priya | Acquired: Dec 2025│
├─────────────────────────────────────────────────────────────────┤
│  [Work Items] [Timeline]                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Work Items Table / Timeline Content                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Navigation Flow

```
/operations ──→ /work-queue ──→ /ops/case/:id ──→ /ops/client/:clientId
     │              │                 │                    │
     │              │                 ↓                    ↓
     │              │           Update Filing        View all cases
     │              │           Add Notes            for this client
     │              │           Change Status
     │              │
     ├──→ /ops/document-review ──→ /ops/case/:id
     │              │
     │              ↓
     │        Approve/Reject
     │        Documents
     │
     ├──→ /escalations ──→ /ops/case/:id
     │              │
     │              ↓
     │        Manage Escalations
     │        Reassign
     │
     └──→ /operations/team (Manager only)
                    │
                    ↓
              Team Performance
              Assignment Distribution
```

---

## Quick Actions Reference

| Screen | Action | Result |
|--------|--------|--------|
| Work Queue | Click row | Go to Case Dashboard |
| Work Queue | Click client name | Go to Client Dashboard |
| Work Queue | Assign button | Open assignment dialog |
| Case Dashboard | Update Filing | Change filing stage |
| Case Dashboard | Add Note | Create internal note |
| Case Dashboard | Click client | Go to Client Dashboard |
| Document Review | Approve | Mark document approved |
| Document Review | Reject | Mark rejected with reason |
| Escalations | View Case | Go to Case Dashboard |
| Escalations | Reassign | Change assignee |

---

## API Endpoints Summary

### Dashboard
- `GET /api/ops/dashboard-stats`

### Work Queue
- `GET /api/work-queue`
- `GET /api/work-queue/stats`
- `GET /api/work-queue/at-risk`
- `GET /api/work-queue/breached`
- `POST /api/work-queue/:id/assign`

### Cases
- `GET /api/ops/cases/:id`
- `GET /api/ops/cases/:id/notes`
- `POST /api/ops/cases/:id/notes`
- `PATCH /api/ops/cases/:id/notes/:noteId`
- `PATCH /api/ops/cases/:id/filing`

### Clients
- `GET /api/ops/clients/:clientId`
- `GET /api/ops/clients/:clientId/timeline`
- `POST /api/ops/clients/:clientId/activities`

### Documents
- `GET /api/ops/documents/pending`
- `POST /api/ops/documents/:id/approve`
- `POST /api/ops/documents/:id/reject`

### Escalations
- `GET /api/escalations`
- `POST /api/escalations/:id/acknowledge`
- `POST /api/escalations/:id/resolve`

---

## Files Reference

| Route | Page Component | Location |
|-------|----------------|----------|
| `/operations` | MobileOperationsPanelRefactored | `pages/MobileOperationsPanelRefactored.tsx` |
| `/work-queue` | OperationsWorkQueue | `pages/OperationsWorkQueue.tsx` |
| `/ops/document-review` | OperationsDocumentReview | `pages/OperationsDocumentReview.tsx` |
| `/escalations` | EscalationManagement | `pages/EscalationManagement.tsx` |
| `/ops/case/:id` | CaseDashboard | `pages/ops/CaseDashboard.tsx` |
| `/ops/client/:clientId` | ClientDashboard | `pages/ops/ClientDashboard.tsx` |

---

## Success Metrics

1. **SLA Compliance:** 95% of cases completed within SLA
2. **Response Time:** Average first response < 2 hours
3. **Escalation Rate:** < 5% of cases escalate to L2+
4. **Document Turnaround:** Average review time < 4 hours
5. **Client Visibility:** 100% of status changes logged
