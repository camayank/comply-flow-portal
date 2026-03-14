# Unified RegTech Pipeline Design Spec

**Date:** 2026-03-14
**Status:** Draft
**Author:** Claude (Brainstorming session with product owner)

---

## 1. Overview

### 1.1 Problem Statement

DigiComply's lead-to-delivery pipeline has 4 critical disconnection zones where automation stops and manual handoff begins:

- **Zone A (Sales → Conversion):** Proposal approval doesn't auto-create service requests
- **Zone B (Service → Delivery):** Tasks created but not auto-assigned; no workload balancing
- **Zone C (Delivery → Finance):** No auto-invoice; no formal invoice table; commission clawbacks defined but not enforced
- **Zone D (Conversion → Compliance):** Compliance state not auto-initialized; no auto-task creation from rules; no service renewal automation

Additionally, there is no unified event system connecting these zones — each operates as a silo.

### 1.2 Goal

Build a unified, event-driven pipeline that connects lead generation through service delivery, financial settlement, and ongoing compliance monitoring with zero manual handoffs, full audit trail, and configurable automation gates.

### 1.3 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Pipeline Orchestrator pattern | Central audit point for RegTech; clean zone separation; works with existing outbox |
| Automation | Configurable per service blueprint | Start gated, progressively unlock full-auto as confidence grows |
| Event system | Extend existing outbox pattern | Lower complexity; reuse polling mechanism; faster to ship |
| Data enrichment | All 4 stages (create, convert, initiate, complete) | Maximum data quality at every transition |
| Compliance gate | Soft gate (warn + escalate) | Allow services but flag RED compliance; auto-escalate to account manager |
| Dead code strategy | Per-zone sweep after each implementation | Incremental cleanup; zone not "done" until sweep passes |

### 1.4 Learnings from Jamku (Reference Platform)

Jamku is India's largest CA practice management software (1700+ firms, closed-source SaaS). Key patterns adopted:

1. **Compliance = Service x Client x Periodicity** — strengthen bulk task creation
2. **Non-Compliance View (Gap Detection)** — show where tasks are MISSING, not just late
3. **Simplified Client-Facing Status** — map 18 internal states to 4 client-visible statuses
4. **One-Click Bulk Operations** — batch event processing for monthly recurring services
5. **Govt Portal Sync** — reserve event type now (`compliance.portal_synced`), build in future phase

DigiComply's unique advantages over Jamku: DigiScore (0-100), GREEN/AMBER/RED state machine, penalty calculation, SLA enforcement with business hours, QC gates, agent ecosystem with commissions, and full client self-service portal.

---

## 2. Pipeline Event System

### 2.1 New Table: `pipeline_events`

```sql
CREATE TABLE pipeline_events (
  id              SERIAL PRIMARY KEY,
  event_type      VARCHAR(100) NOT NULL,
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       INTEGER NOT NULL,
  payload         JSONB NOT NULL,
  previous_state  VARCHAR(50),
  new_state       VARCHAR(50),
  triggered_by    INTEGER REFERENCES users(id),
  processed       BOOLEAN DEFAULT false,
  processed_at    TIMESTAMP,
  handler_results JSONB,
  error           TEXT,
  retry_count     INTEGER DEFAULT 0,
  max_retries     INTEGER DEFAULT 3,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pipeline_events_unprocessed ON pipeline_events (processed, created_at);
CREATE INDEX idx_pipeline_events_entity ON pipeline_events (entity_type, entity_id);
CREATE INDEX idx_pipeline_events_type ON pipeline_events (event_type);
```

### 2.2 Event Catalog (32 Events)

**Zone A: Sales Pipeline**
| Event | Trigger | Downstream Action |
|-------|---------|-------------------|
| `lead.created` | New lead submitted | Auto-assign agent + enrich from MCA/GST |
| `lead.assigned` | Agent assigned | Notify agent + set followup |
| `lead.qualified` | Lead marked HOT/WARM | Auto-create proposal draft |
| `lead.proposal_sent` | Proposal sent to client | Notify client + track open |
| `lead.proposal_approved` | Client approves proposal | Auto-create entity + service requests |
| `lead.converted` | Lead converts to client | Create user account + init compliance |
| `lead.lost` | Lead marked LOST | Log reason + analytics |

**Zone B: Service Execution**
| Event | Trigger | Downstream Action |
|-------|---------|-------------------|
| `service.created` | Service request created | Instantiate tasks from blueprint |
| `service.payment_received` | Payment confirmed | Unlock doc upload + notify ops |
| `service.docs_uploaded` | Client uploads documents | Auto-verify (OCR) + assign reviewer |
| `service.docs_verified` | Documents pass verification | Move to IN_PROGRESS + assign tasks |
| `service.task_completed` | Individual task done | Check all tasks done → trigger QC |
| `service.qc_submitted` | QC review requested | Assign QC reviewer |
| `service.qc_approved` | QC passes | Move to READY_FOR_DELIVERY |
| `service.qc_rejected` | QC fails | Create rework tasks + notify ops |
| `service.delivered` | Deliverables sent | Notify client + request confirmation |
| `service.confirmed` | Client confirms delivery | COMPLETED + trigger finance pipeline |
| `service.payment_pending` | Service created, awaiting payment | Notify client with payment link |
| `service.sla_warning` | SLA polling job: 50% elapsed | Escalation level 1 notification |
| `service.sla_breached` | SLA polling job: deadline passed | Escalation levels 2+3 + status change |
| `service.escalated` | Manual escalation or auto (unassignable) | Notify ops manager via in-app + email. Dependent tasks remain in PENDING state. Escalation is resolved manually: ops manager assigns the task via UI, which clears the escalation flag. No automatic reassignment — this is a human decision point. |
| `service.cancelled` | Service cancelled/refunded | Trigger commission clawback if applicable |

**Zone C: Financial**
| Event | Trigger | Downstream Action |
|-------|---------|-------------------|
| `finance.invoice_created` | Service completed | Auto-calculate GST + store in DB |
| `finance.invoice_sent` | Invoice sent to client | Notify client + set payment due |
| `finance.payment_received` | Payment confirmed | Reconcile invoice + update wallet |
| `finance.commission_calculated` | Payment reconciled | Queue for approval |
| `finance.commission_approved` | Admin approves | Schedule payout |
| `finance.commission_paid` | Payout executed | Notify agent + update wallet |

**Zone D: Compliance Lifecycle**
| Event | Trigger | Downstream Action |
|-------|---------|-------------------|
| `compliance.entity_initialized` | New business entity | Apply rules + set deadlines |
| `compliance.deadline_approaching` | 7 days to deadline | AMBER alert + notify client |
| `compliance.deadline_overdue` | Past deadline | RED alert + escalate + penalty calc |
| `compliance.action_completed` | Filing/payment done | Recalculate DigiScore |
| `compliance.state_changed` | State transition | Notify stakeholders + log |
| `compliance.renewal_due` | Recurring service due | Auto-create service request |
| `compliance.gap_detected` | Missing task coverage | Alert in dashboard + notify |
| `compliance.portal_synced` | Govt portal data fetched | Update compliance state (future) |

### 2.3 Pipeline Orchestrator

**File:** `server/services/pipeline/pipeline-orchestrator.ts`

**Polling loop (every 15 seconds):**
1. Query `pipeline_events WHERE processed = false ORDER BY created_at`
2. For each event:
   a. Look up registered handlers for `event_type`
   b. Check `pipeline_automation_config` for automation level:
      - `AUTO` → execute handler immediately
      - `GATED` → create `approval_request` (default `expires_at` = 24 hours), wait for human. A separate **approval timeout job** (runs every 15 minutes) checks for expired approvals: sets `escalated = true`, notifies admin via in-app notification. Admin can then approve/reject via the approval queue UI. When admin resolves the approval, the pipeline event's `processed` flag is set to false and `retry_count` reset, allowing the orchestrator to re-process it with the approval result.
      - `MANUAL` → create notification only
   c. Execute handler(s) **strictly sequentially** (no parallel execution)
   d. On success: `processed = true`, `processed_at = NOW()`, store `handler_results`
   e. On failure: **halt the handler chain for this event**, increment `retry_count`, log error
   f. If `retry_count >= max_retries` → dead letter + alert admin
3. Handler may emit NEW events → chain continues
4. Every event + handler result = audit_log entry

**Handler Execution Semantics:**
- Handlers for a single event run **sequentially, in registration order**. If handler #2 fails, handler #3 does not run.
- All handlers must be **idempotent** — if retried, they must produce the same result. Idempotency is enforced via unique constraints and state checks:
  - Invoice creation: `UNIQUE(service_request_id)` on `invoices` table — use `INSERT ... ON CONFLICT (service_request_id) DO NOTHING`. If the row already exists, the handler logs "invoice already exists, skipping" and marks itself as "completed" in handler_results (not "failed")
  - Task instantiation: check `tasks WHERE service_request_id = X` count before creating
  - Commission creation: check `commissions WHERE service_request_id = X AND type = Y` before creating
  - Compliance initialization: check `business_entities.compliance_initialized = true` before re-running
- The **entire event** is retried on failure, not individual handlers. The `handler_results` JSONB stores which handlers succeeded, so on retry the orchestrator skips already-completed handlers.
- **`handler_results` JSONB schema:**
  ```json
  {
    "handlers": [
      { "name": "compliance-guard", "status": "completed", "completed_at": "ISO-8601", "output": {} },
      { "name": "task-instantiation", "status": "completed", "completed_at": "ISO-8601", "output": { "tasks_created": 5 } },
      { "name": "auto-assign", "status": "failed", "error": "No users with role 'gst_specialist'", "attempted_at": "ISO-8601" }
    ]
  }
  ```
  On retry, the orchestrator iterates `handlers` and skips any with `"status": "completed"`. It resumes execution from the first non-completed handler.
- Events emitted by handlers are **buffered in memory** during handler execution. They are only committed to `pipeline_events` as new rows **after all handlers for the parent event succeed**. If any handler fails, buffered events are discarded (they will be re-emitted when the parent event retries successfully). This prevents orphaned downstream events from being processed while the parent event is in a failed/retry state. Buffered events are processed in subsequent polling cycles (never in the same cycle, preventing runaway chains). This means downstream events (e.g., `finance.invoice_created` after `service.confirmed`) execute in the next 15-second cycle, not synchronously. The ordering guarantee is: **parent event succeeds → child events are persisted → child events process in order**. There is no same-cycle execution guarantee between parent and child events.

**SLA/Compliance Deadline Events:**
- `service.sla_warning` and `service.sla_breached` are emitted by a **separate SLA polling job** (existing `sla-service.ts`, runs every 15 minutes). The SLA job checks all active service requests against their SLA deadlines and emits events when thresholds are crossed.
- `compliance.deadline_approaching` and `compliance.deadline_overdue` are emitted by a **separate compliance deadline job** (runs daily at 6 AM IST). This job scans all `complianceTracking` records and emits events based on days-to-deadline calculations.

**File structure:**
```
server/services/pipeline/
├── pipeline-orchestrator.ts     # Central event dispatcher
├── pipeline-events.ts           # Typed event definitions
├── handlers/
│   ├── sales-handler.ts         # Lead → Convert automation
│   ├── execution-handler.ts     # Service → Delivery automation
│   ├── finance-handler.ts       # Invoice → Commission automation
│   └── compliance-handler.ts    # Rules → DigiScore automation
├── enrichment/
│   ├── lead-enrichment.ts       # MCA/GST data fetch
│   ├── entity-enrichment.ts     # Compliance rules applicability
│   ├── service-enrichment.ts    # Blueprint → tasks + SLA
│   └── delivery-enrichment.ts   # Invoice + renewal calc
└── guards/
    ├── compliance-guard.ts      # Soft gate logic
    └── sla-guard.ts             # SLA enforcement
```

---

## 3. Zone Handlers

### 3.1 Zone A: Sales Handler

**File:** `server/services/pipeline/handlers/sales-handler.ts`

**`lead.created` handler:**
- Auto-assign via lead-assignment-service (skill match + workload balance)
- Enrich: fetch company data from PAN/GSTIN (entity type, directors, registered address, turnover bracket, GST status)
- Store enrichment in `leads.enrichment_data` JSONB
- Emit: `lead.assigned`

**`lead.qualified` handler:**
- Auto-generate proposal draft from service catalog pricing
- Pre-populate services matched to entity type + needs from enrichment data
- Emit: `lead.proposal_sent` (or queue for review if GATED)

**`lead.proposal_approved` handler:**
- Create `businessEntity` from enriched lead data
- Create `user` account (client role) with temporary password
- Create `serviceRequest` per approved proposal line item
- Create `commission` record (lead_conversion type)
- Emit: `lead.converted`, `service.created` (per service)

**Dead code to remove in Zone A sweep:**
- Manual lead-to-entity conversion routes (replaced by handler)
- Duplicate lead status/stage fields (consolidate to `stage` only)
- Local lead form implementations in LeadManagement.tsx, LeadPipeline.tsx, PreSales.tsx (use shared LeadForm.tsx)

### 3.2 Zone B: Execution Handler

**File:** `server/services/pipeline/handlers/execution-handler.ts`

**`service.created` handler:**
1. **Compliance guard check first:** Query entity's compliance state. If AMBER: attach warning metadata. If RED: auto-escalate to account manager and add compliance remediation tasks (derived from the entity's overdue complianceTracking records) as prerequisite tasks in the service workflow. Service creation always proceeds (soft gate).
2. Load SOP blueprint for service type. If no blueprint exists, use the default workflow (3-step: document → process → deliver).
3. Instantiate tasks with dependencies via task-instantiation-service. Task dependencies are declared in the blueprint's `dependsOnSteps` JSON array (step keys that must complete first).
4. Auto-assign tasks: round-robin within the required role. If no user with the required skill is available, the task is created with `assignedTo = null` and a `service.escalated` event is emitted to notify the ops manager for manual assignment.
5. Calculate SLA deadlines (business hours, Mon-Fri 9AM-6PM IST, with priority multipliers)
6. Determine required documents per task from blueprint's `requiredDocuments` array
7. Emit: `service.payment_pending`

**`service.task_completed` handler:**
- Check: all tasks for this service done?
  - YES → auto-create qualityReview, emit `service.qc_submitted`
  - NO → unblock dependent tasks, update progress percentage

**`service.qc_approved` handler:**
- Create deliveryConfirmation record
- Package deliverables
- Emit: `service.delivered`

**`service.confirmed` handler:**
- Mark service COMPLETED
- Calculate invoice line items + GST
- Create invoice record in DB
- **Only after successful invoice creation**, emit: `finance.invoice_created`, `compliance.action_completed`
- If invoice creation fails, the handler fails and the event retries. Neither `finance.invoice_created` nor `compliance.action_completed` are emitted until invoice creation succeeds (events are buffered per section 2.3). This ensures no compliance state update without a corresponding financial record.
- **Compliance initialization guard:** Before emitting `compliance.action_completed`, check `business_entities.compliance_initialized = true`. If false, skip the compliance event and emit `compliance.entity_initialized` instead (to trigger initialization). The compliance action will be recorded once initialization completes and the entity has tracking records.

**Dead code to remove in Zone B sweep:**
- Manual task assignment UI/routes (replaced by auto-assign)
- Standalone QC trigger buttons (replaced by event-driven)
- Duplicate SLA calculation logic (consolidate to sla-service)

### 3.3 Zone C: Finance Handler

**File:** `server/services/pipeline/handlers/finance-handler.ts`

**`finance.invoice_created` handler:**
- Create invoice record in new `invoices` table
- Auto-generate invoice number (INV-YYYY-NNNNNN)
- Calculate GST: CGST/SGST (intrastate) or IGST (interstate)
- Set due date (service completion + 15 days)
- Emit: `finance.invoice_sent`

**`finance.payment_received` handler:**
- Reconcile: match payment to invoice
- Update invoice status → paid
- Calculate commission (base + volume bonus per commission rules)
- Emit: `finance.commission_calculated`

**`finance.commission_approved` handler:**
- Credit agent wallet
- Create wallet transaction (referenceType: commission)
- Emit: `finance.commission_paid`

**Dead code to remove in Zone C sweep:**
- Ad-hoc invoice-generator.ts (replaced by persisted invoices table)
- Manual commission calculation routes (replaced by event-driven)
- Duplicate GST logic across routes (consolidate to finance-handler)

### 3.4 Zone D: Compliance Handler

**File:** `server/services/pipeline/handlers/compliance-handler.ts`

**`compliance.entity_initialized` handler:**
- Determine applicable compliance rules for entity
  - Filter by: entity type, turnover, state, employee count
  - Filter by: GST/PF/ESI registration status
- Create complianceTracking records per applicable rule
- Calculate all deadlines for current FY
- Initialize complianceState (GREEN by default for new entities)
- Calculate initial DigiScore
- Emit: `compliance.state_changed`

**`compliance.deadline_approaching` handler (7 days):**
- Set domain state → AMBER
- Notify client (email + WhatsApp + in-app)
- Notify assigned account manager
- Recalculate DigiScore

**`compliance.deadline_overdue` handler:**
- Set domain state → RED
- Calculate penalty exposure (per penalty definition rules)
- Escalate to account manager + admin
- Soft gate: flag on all new service requests for this entity
- Recalculate DigiScore

**`compliance.renewal_due` handler:**
- **Deduplication key:** `(service_code, business_entity_id, fiscal_year, period)`. Before creating a renewal, check if a service request with the same deduplication key already exists. If it does, skip creation (prevents infinite loops and duplicate renewals).
  - `fiscal_year`: Indian financial year string, e.g., `"2025-26"` (April to March). Derived from `renewal_due_date`.
  - `period`: Depends on service periodicity — `"M03"` for monthly (March), `"Q4"` for quarterly (Q4), `"H2"` for half-yearly, `"FY"` for annual. The period code is determined by the compliance rule's `periodicity` field.
  - Example dedup key: `"GST_RETURN:42:2025-26:M03"` (GST return for entity 42, March 2025-26).
  - **Cancelled renewals:** The dedup check excludes service requests with status `CANCELLED`. If a renewal was created but cancelled (e.g., payment failure), the same renewal can be auto-created again when `compliance.renewal_due` fires next.
- Auto-create serviceRequest for recurring service with `renewal_of` FK pointing to the previous service request
- Pre-populate with previous service data
- Notify client: "Your [service] renewal is due"
- Emit: `service.created` (feeds back into Zone B)

**`compliance.gap_detected` handler:**
- Identify clients eligible for a compliance service without active tasks
- Surface in compliance dashboard as "Clients Missing Coverage"
- Notify account manager

**Dead code to remove in Zone D sweep:**
- Manual compliance initialization routes
- Standalone DigiScore recalculation triggers
- Duplicate state calculation logic (consolidate to handler)

---

## 4. Data Enrichment

### 4.1 Lead Creation Enrichment

**File:** `server/services/pipeline/enrichment/lead-enrichment.ts`

When a lead is created with PAN or GSTIN:
- Fetch company details from MCA/GST data sources
- Pre-populate: entity type, directors, registered address, turnover bracket
- Store in `leads.enrichment_data` JSONB column
- Set `leads.enriched_at` timestamp and `leads.enrichment_source`

**Enrichment source hierarchy (fallback chain):**
1. **MCA/GST API** (when govt portal integration is built — future phase)
2. **Manual entry by sales agent** (current default — agent fills entity type, turnover, state during lead qualification)
3. **Lead form fields** (minimum: PAN, entity type, contact info — always available)

Until govt portal integration exists, enrichment relies on manual entry and lead form data. The `enrichment_source` field tracks which source populated the data ('manual', 'lead_form', 'mca', 'gst').

### 4.2 Lead Conversion Enrichment

**File:** `server/services/pipeline/enrichment/entity-enrichment.ts`

When a lead converts to a business entity:
- Auto-determine applicable compliance rules based on entity type, turnover, state, employee count
- If zero rules match (e.g., entity type not yet configured in rule engine): initialize with GREEN state and zero tracking records. Emit `compliance.gap_detected` to flag the entity for manual rule assignment.
- If rule engine query fails: log error, set `compliance_initialized = false`, and the pipeline event's `retry_count` increments. After 3 failed attempts (`retry_count >= max_retries`), the event moves to dead letter and an admin alert is raised. The entity remains with `compliance_initialized = false` — admin must manually trigger re-initialization via the admin dashboard's "Retry Compliance Initialization" button (creates a new `compliance.entity_initialized` event for the entity). When `compliance_initialized = false`, the compliance guard treats the entity as GREEN (no blocking, no remediation tasks) but attaches `compliance_uninitialized: true` metadata to surface the issue in the ops dashboard.
- Initialize compliance calendar with all deadlines for current financial year
- Entity type and turnover are sourced from `leads.enrichment_data` (populated in stage 1). If enrichment data is missing, fall back to manual fields from the lead form.
- Set `business_entities.compliance_initialized = true`

### 4.3 Service Initiation Enrichment

**File:** `server/services/pipeline/enrichment/service-enrichment.ts`

When a service request is created:
- Load SOP blueprint for the service type
- Auto-populate task checklist from blueprint steps
- Calculate SLA deadlines with business hours and priority multipliers
- Determine document requirements per task/service type

### 4.4 Service Completion Enrichment

**File:** `server/services/pipeline/enrichment/delivery-enrichment.ts`

When a service is confirmed complete:
- Auto-compute invoice line items from service pricing
- Calculate GST (CGST/SGST if intrastate, IGST if interstate)
- Generate compliance state update
- Trigger renewal scheduling for recurring services (set `service_requests.renewal_due_date`)

---

## 5. New Schema

### 5.1 New Tables

**Table 1: `pipeline_events`** — See Section 2.1

**Table 2: `invoices`**
```sql
CREATE TABLE invoices (
  id                  SERIAL PRIMARY KEY,
  invoice_number      VARCHAR(20) UNIQUE NOT NULL,
  business_entity_id  INTEGER REFERENCES business_entities(id),
  service_request_id  INTEGER REFERENCES service_requests(id) UNIQUE,
  client_name         VARCHAR(200) NOT NULL,
  client_gstin        VARCHAR(15),
  client_state        VARCHAR(50),
  line_items          JSONB NOT NULL,
  subtotal            DECIMAL(12,2) NOT NULL,
  cgst_amount         DECIMAL(12,2) DEFAULT 0,
  sgst_amount         DECIMAL(12,2) DEFAULT 0,
  igst_amount         DECIMAL(12,2) DEFAULT 0,
  total_tax           DECIMAL(12,2) NOT NULL,
  grand_total         DECIMAL(12,2) NOT NULL,
  status              VARCHAR(20) DEFAULT 'draft',
  due_date            DATE NOT NULL,
  paid_at             TIMESTAMP,
  payment_id          INTEGER REFERENCES payments(id),
  pdf_url             TEXT,
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);
```

**Table 3: `pipeline_automation_config`**
```sql
CREATE TABLE pipeline_automation_config (
  id                  SERIAL PRIMARY KEY,
  service_code        VARCHAR(100) NOT NULL,
  event_type          VARCHAR(100) NOT NULL,
  automation_level    VARCHAR(10) NOT NULL,  -- AUTO, GATED, MANUAL
  gate_approver_role  VARCHAR(50),
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW(),
  UNIQUE (service_code, event_type)
);
```

**Table 4: `approval_requests`**
```sql
CREATE TABLE approval_requests (
  id                  SERIAL PRIMARY KEY,
  pipeline_event_id   INTEGER REFERENCES pipeline_events(id),
  required_role       VARCHAR(50) NOT NULL,
  status              VARCHAR(20) DEFAULT 'pending',
  approved_by         INTEGER REFERENCES users(id),
  rejection_reason    TEXT,
  expires_at          TIMESTAMP,
  escalated           BOOLEAN DEFAULT false,
  created_at          TIMESTAMP DEFAULT NOW(),
  resolved_at         TIMESTAMP
);
```

### 5.2 Schema Modifications

**`leads` table:**
- REMOVE: `status` field (consolidate to `stage` only — single source of truth)
- ADD: `enrichment_data JSONB` — MCA/GST fetched data
- ADD: `enriched_at TIMESTAMP` — When enrichment ran
- ADD: `enrichment_source VARCHAR(50)` — 'mca', 'gst', 'manual'

**`service_requests` table:**
- ADD: `automation_level VARCHAR(10)` — Snapshot of the `pipeline_automation_config` entry matching this service's `service_code` and the `service.created` event_type. Captured at service creation time as a point-in-time copy; if config changes later, existing service requests are not affected. New service requests pick up the latest config. This field governs whether the service's lifecycle events are processed as AUTO, GATED, or MANUAL.
- ADD: `pipeline_stage VARCHAR(50)` — Current position in unified pipeline
- ADD: `renewal_of INTEGER` — FK to previous service_request (for renewals)
- ADD: `renewal_due_date DATE` — When this service needs renewal
- ADD: `renewal_dedup_key VARCHAR(200) UNIQUE` — Deduplication key: `{service_code}:{entity_id}:{fy}:{period}`. Set to NULL for non-renewal service requests (UNIQUE allows multiple NULLs in PostgreSQL). Fiscal year derivation: if `renewal_due_date` falls between April 1 of year Y and March 31 of year Y+1, FY = `"Y-(Y+1 mod 100)"` (e.g., 2026-03-31 → `"2025-26"`, 2026-04-01 → `"2026-27"`). Cancelled service requests have their `renewal_dedup_key` set to NULL to allow re-creation.

**`business_entities` table:**
- ADD: `compliance_initialized BOOLEAN DEFAULT false`
- ADD: `compliance_initialized_at TIMESTAMP`
- ADD: `estimated_turnover DECIMAL(15,2)` — For rule applicability
- ADD: `employee_count INTEGER` — For PF/ESI applicability

**`commissions` table:**
- ADD: `invoice_id INTEGER REFERENCES invoices(id)` — Link to invoice
- ADD: `clawback_eligible BOOLEAN DEFAULT true`
- ADD: `clawback_until DATE` — Clawback window end. Set to `commission.created_at + 90 days` by default. For lead conversion commissions, the date is set when the commission record is created (at `lead.proposal_approved` handler). Configurable per commission rule.

**Commission Clawback Rules:**
- If a service request is CANCELLED or REFUNDED within the clawback window, the commission is automatically reversed.
- Clawback is triggered by `service.cancelled` or `finance.refund_processed` pipeline events.
- The finance handler creates a negative commission record and debits the agent's wallet.
- Agent is notified of the clawback with reason.
- **Multi-service proposals:** One lead conversion commission is created per proposal approval, not per service. The commission is linked to the first service request created from the proposal. If ANY service from that proposal is cancelled within the clawback window, the entire lead conversion commission is clawed back. Per-service commissions (delivery-based) are clawed back individually per service.

---

## 6. Migration Strategy

### Phase 1: Additive Only (Zero breaking changes)
```
Migration 001: CREATE TABLE pipeline_events
Migration 002: CREATE TABLE invoices
Migration 003: CREATE TABLE pipeline_automation_config
Migration 004: CREATE TABLE approval_requests
Migration 005: ALTER TABLE leads ADD enrichment columns
Migration 006: ALTER TABLE service_requests ADD pipeline columns
Migration 007: ALTER TABLE business_entities ADD compliance columns
Migration 008: ALTER TABLE commissions ADD invoice/clawback columns
Migration 009: Seed pipeline_automation_config with defaults
```

### Phase 2: Data Migration (After pipeline is working)
```
Migration 010: Backfill leads.stage from leads.status where needed
Migration 011: Generate invoices records from existing payments
  - Only for payments WITH a service_request_id FK
  - Orphaned payments (no service_request link) are logged to a
    migration_audit table with columns: payment_id, amount, created_at,
    reason ('missing_service_request_link'). Admin dashboard surfaces
    these for manual resolution (link to service request or mark as
    standalone payment). These are NOT left in a broken state — they
    continue to function as payments, they just don't have invoice records.
  - Validation query: SELECT count(*) FROM payments LEFT JOIN invoices
    ON payments.id = invoices.payment_id WHERE invoices.id IS NULL
    AND payments.service_request_id IS NOT NULL (should return 0)
Migration 012: Initialize compliance for existing business entities
```

**Phase 2 Validation Gate:** Before proceeding to Phase 3, run validation queries:
- All payments with service_request_id have a corresponding invoice record
- All business entities have compliance_initialized = true OR are flagged for review
- leads.stage is populated for all leads where leads.status was non-null

### Phase 3: Cleanup (After validation gate passes)
```
Migration 013: DROP leads.status column
Migration 014: Remove deprecated column defaults
```

Each migration runs independently. Rollback scripts included.

---

## 7. Client-Facing Status Mapping

Internal 18-state machine maps to 4 client-visible statuses:

| Client Status | Internal States |
|---------------|-----------------|
| **In Progress** | INITIATED, PENDING_PAYMENT, PAYMENT_RECEIVED, DOCUMENTS_PENDING, DOCUMENTS_UPLOADED, DOCUMENTS_VERIFIED, IN_PROGRESS, PROCESSING |
| **Needs Attention** | SLA_BREACHED, ESCALATED, ON_HOLD, QC_REJECTED |
| **Almost Done** | PENDING_REVIEW, UNDER_REVIEW, QC_REVIEW, QC_APPROVED, READY_FOR_DELIVERY, DELIVERED, AWAITING_CLIENT_CONFIRMATION |
| **Done** | COMPLETED |

---

## 8. Compliance Guard (Soft Gate)

**File:** `server/services/pipeline/guards/compliance-guard.ts`

**Execution timing:** The compliance guard runs as the **first step** of the `service.created` handler, before task instantiation. The service request is already created in the database at this point (the event fires after creation). The guard adds metadata and tasks to the existing service request.

When a new service request is created, the compliance guard checks the entity's compliance state:

- **GREEN** → proceed freely, no action needed
- **AMBER** → attach `compliance_warning: true` metadata to service request. Add a notification to the ops dashboard. The service workflow proceeds normally — no blocking tasks added.
- **RED** → attach `compliance_critical: true` metadata. Auto-escalate to account manager via notification. Add compliance remediation tasks derived from the entity's **overdue** `complianceTracking` records (e.g., if GSTR-3B is overdue, add a "File GSTR-3B" task). These tasks are added as **parallel tasks** within the service workflow (no dependency on other service tasks, no `isPrerequisite` flag). They serve as visibility reminders for the ops team, not as blockers. The service workflow proceeds normally regardless of whether remediation tasks are completed.

**Edge case:** If no overdue complianceTracking records exist for a RED entity (e.g., state was manually set to RED), no remediation tasks are added. Only the escalation notification is sent.

**Renewal service deduplication:** When a service is created via `compliance.renewal_due`, the compliance guard still runs but skips remediation task creation if active remediation tasks already exist for this entity. The guard queries within the same database transaction: `SELECT id FROM tasks WHERE business_entity_id = X AND compliance_tracking_id = Y AND type = 'compliance_remediation' AND status NOT IN ('COMPLETED', 'CANCELLED') FOR UPDATE`. If a matching task exists, skip creation and log "remediation task already active for complianceTracking #{id}".

**Handler ordering:** The compliance guard runs as the first step but only adds metadata and parallel tasks. It does NOT depend on blueprint tasks being created (step 3). Remediation tasks are independent of the main service workflow and have no task dependencies on blueprint-derived tasks.

The guard never hard-blocks service creation. It warns and escalates.

---

## 9. Dead Code Elimination Protocol

### Per-Zone Sweep (Mandatory after each zone implementation)

**Step 1: Import Graph Scan**
- grep all exports in zone files
- grep all imports across entire codebase
- Any export with zero imports = DELETE

**Step 2: Route Reachability Check**
- List all routes in App.tsx and server route registration
- Any page component not referenced in router = DELETE
- Any API route not called by any frontend hook = REVIEW

**Step 3: Hook/Service Audit**
- List all custom hooks in hooks/ and features/*/hooks/
- Any hook not imported by a component = DELETE
- Any service function not called = DELETE

**Step 4: Schema Consolidation**
- Check for duplicate table definitions across schema files
- Merge overlapping enums (LEAD_STAGES vs leadStatusEnum)
- Remove unused relation definitions

**Step 5: Middleware/Utils Cleanup**
- Any middleware not used in route registration = DELETE
- Any util function with zero callers = DELETE
- Consolidate duplicate helper logic

**Gate:** Zone is not "done" until sweep passes with zero orphans.
**Rule:** Every PR that adds pipeline code must not increase dead code count.

**Automation (future — not part of initial pipeline implementation):** Steps 1-3 will eventually be implemented as a shell script (`scripts/dead-code-check.sh`) that runs grep-based analysis and outputs a report. This script will be added as a CI check that blocks PR merge if new orphans are detected. The script counts unused exports, unreachable routes, and unimported hooks, and fails if the count increases from the baseline stored in `.dead-code-baseline.json`. **For the initial implementation, dead code sweeps are performed manually at each zone completion checkpoint.**

### Known Dead Code (From Bug Analysis)

**Lead Form Unification (Remaining bug from error docs):**
- LeadManagement.tsx, LeadPipeline.tsx, PreSales.tsx have local lead forms
- Shared LeadForm.tsx exists but is not used by all pages
- Fix: refactor all 3 pages to import shared LeadForm, delete local implementations
- Scheduled: Zone A dead code sweep

---

## 10. Open Source Architecture

### Layer 1: Core (Open Source — Apache 2.0)
```
@digicomply/core
├── pipeline-orchestrator    # Event backbone
├── compliance-engine        # Rule engine + state machine
├── task-engine              # Blueprint instantiation + SLA
├── auth                     # RBAC + session management
├── schema                   # Drizzle schema (all tables)
├── api-contracts            # Typed request/response
└── ui-components            # Shared UI kit (shadcn-based)
```

### Layer 2: Modules (Open Source — Pluggable)
```
@digicomply/sales            # Lead pipeline + proposals
@digicomply/operations       # Work queue + team management
@digicomply/finance          # Invoicing + commissions
@digicomply/compliance       # DigiScore + rules + alerts
@digicomply/client-portal    # Self-service client UI
@digicomply/agent            # Agent ecosystem + KYC
@digicomply/notifications    # Multi-channel notification hub
@digicomply/messaging        # Threaded messaging system
```

### Layer 3: Integrations (Open Source — Community Driven)
```
@digicomply/razorpay         # Payment gateway
@digicomply/gst-portal       # GST data sync (future)
@digicomply/it-portal        # Income Tax sync (future)
@digicomply/tds-portal       # TDS/Traces sync (future)
@digicomply/mca-portal       # MCA data fetch (future)
@digicomply/whatsapp         # WhatsApp Business API
```

### Layer 4: Cloud (Commercial — Optional)
```
Multi-tenancy               # Tenant isolation
Managed infrastructure      # Hosting + backups + SSL
Priority support            # SLA-backed support
Advanced analytics          # Cross-tenant insights
```

---

## 11. Bug Fix Integration

29 of 30 reported bugs are already fixed (96.7%). The remaining issue (lead form unification) is incorporated into Zone A dead code sweep.

All fixes from error documents are validated:
- Sales Manager: 9/10 fixed (lead form = partial)
- OPS Manager: 7/7 fixed
- Super Admin: 3/3 fixed
- Agent Portal: 2/2 fixed
- Finance: 3/3 fixed

The pipeline design prevents bug recurrence through:
- Event-driven automation (no manual handoffs to break)
- Single shared components (no duplicate forms)
- Per-zone dead code sweep (catches orphans)
- Unified response helpers (consistent error handling)

---

## 12. Success Criteria

1. Every lead-to-delivery transition emits a pipeline event
2. Every pipeline event is processed within 15 seconds
3. Zero manual handoffs for AUTO-configured services
4. Full audit trail for every state transition (queryable by entity)
5. DigiScore recalculates automatically on compliance changes
6. Dead code count decreases with each zone implementation
7. All existing bug fixes remain intact after pipeline deployment
8. Client-facing status shows simplified 4-state view
9. Compliance gaps (missing task coverage) are detected and surfaced
10. Invoice records persist in database (not generated ad-hoc)

---

## 13. Assumptions & Constraints

1. **MCA/GST API integration is a future phase.** Lead enrichment currently relies on manual entry by sales agents and lead form fields. The `enrichment_source` field tracks provenance so automated data can be layered in later without schema changes.
2. **Govt portal credentials are NOT stored in DigiComply.** When portal sync is built, it will use session-based auth (similar to Jamku's approach) rather than storing long-lived credentials.
3. **PostgreSQL is the only supported database.** The pipeline_events polling mechanism uses `FOR UPDATE SKIP LOCKED` for concurrent orchestrator instances.
4. **Business hours are Mon-Fri, 9 AM - 6 PM IST (UTC+05:30)** for all SLA calculations. All timestamps are stored in UTC in the database and converted to IST for business hours computation. IST does not observe DST, so no DST adjustment is needed. Holidays are not yet configurable (future enhancement).
5. **Single orchestrator instance.** The polling loop runs in the main Node.js process. For horizontal scaling, the `FOR UPDATE SKIP LOCKED` pattern ensures events aren't double-processed.
6. **Commission clawback window defaults to 90 days.** Configurable per commission rule but defaults to 90 days from commission creation date.
7. **Renewal deduplication** uses a composite key of `(service_code, business_entity_id, fiscal_year, period)` to prevent infinite loops and duplicate service requests.
