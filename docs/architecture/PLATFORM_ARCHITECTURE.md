# DigiComply Platform Architecture - Core Database with Drill-Down Capabilities

## Philosophy: US Compliance & Tax Tech Standards for India

Following principles from **Carta, Stripe, Gusto, Rippling, Vanta** - one source of truth with role-based views and unlimited drill-down depth.

---

## 1. Core Database Structure (Single Source of Truth)

### **Entities Hierarchy**
```
Account (Master)
├── Businesses (Multiple entities under one account)
│   ├── Business Details (PAN, GSTIN, CIN, etc.)
│   ├── Stage (Idea → Formation → Growth → Funded → Mature → Exit)
│   ├── Compliance State (GREEN/AMBER/RED)
│   └── Relationships
│       ├── Owners/Directors
│       ├── Authorized Signatories
│       └── Stakeholders
├── Services (Subscriptions)
│   ├── Active Services
│   ├── Renewal Schedule
│   ├── Service History
│   └── Upcoming Renewals
├── Documents (Vault)
│   ├── Identity Docs
│   ├── Tax Docs
│   ├── Financial Docs
│   ├── Legal Docs
│   ├── Operational Docs
│   ├── Statutory Filings
│   └── Registrations
├── Compliance Checkpoints
│   ├── Monthly Obligations
│   ├── Quarterly Obligations
│   ├── Annual Obligations
│   ├── Event-Driven Obligations
│   └── One-Time Setups
├── Transactions
│   ├── Invoices
│   ├── Payments
│   ├── Refunds
│   └── Credits
└── Audit Trail (Every action tracked)
```

### **Drill-Down Depth Levels**

#### **Level 1: Dashboard View** (Executive/Founder)
- Overall compliance status (GREEN/AMBER/RED)
- Funding readiness score (0-100)
- Days to next critical deadline
- Total services subscribed
- Document upload progress

#### **Level 2: Category View** (Deep-Dive Pages)
- Compliance: Monthly vs Quarterly vs Annual breakdown
- Services: Required vs Recommended vs Gaps
- Documents: By category (7 categories)
- Funding: Due diligence checklist

#### **Level 3: Item View** (Individual Records)
- Specific compliance checkpoint (e.g., "GST-3B January 2026")
- Specific service (e.g., "Monthly Accounting")
- Specific document (e.g., "PAN Card - Amit Sharma")
- Specific invoice (e.g., "INV-2026-001")

#### **Level 4: Action View** (Granular Tasks)
- Task breakdown for checkpoint (e.g., "Collect invoices" → "Prepare return" → "File online" → "Generate ACK")
- Service delivery workflow (Assigned to → In Progress → QC → Delivered)
- Document verification steps (Upload → OCR → Manual Review → Approved/Rejected)
- Payment reconciliation (Invoice → Payment → Settlement → Receipt)

#### **Level 5: History/Audit View** (Forensic Analysis)
- Who uploaded document? (User: Amit, Time: Jan 15, 2026 10:30 AM)
- Who verified it? (QC: Priya, Time: Jan 15, 2026 11:45 AM)
- What changed? (Field: PAN Number, Old: ABCD1234E, New: ABCD1234F)
- Why was it rejected? (Reason: "PAN number mismatch with Aadhaar")

---

## 2. Role-Based Access (User Views)

### **Client/Founder View** 
**What they see:**
- Their businesses only
- Compliance status (can't modify system settings)
- Service subscriptions (can request, can't approve)
- Documents they uploaded
- Invoices & payments
- Timeline & milestones

**Drill-down capability:**
✅ Dashboard → Compliance → Monthly GST → January 2026 → Task list → History
✅ Dashboard → Documents → Tax Docs → GST Certificate → Version history

### **Operations Team View**
**What they see:**
- All clients assigned to them
- Task queues (Pending → In Progress → Completed)
- Document verification queue
- Service delivery tracking
- Client communication history

**Drill-down capability:**
✅ Task Queue → Client: ABC Pvt Ltd → Service: GST Filing → Subtasks → Assign to team member
✅ Document Queue → PAN verification → OCR results → Manual override → Approve

### **Admin View**
**What they see:**
- All clients
- User management (add/remove users, assign roles)
- Service catalog management (add/edit services)
- Pricing & billing configuration
- System settings

**Drill-down capability:**
✅ User Management → Client: ABC Pvt Ltd → Users → Amit Sharma → Permissions → Audit trail
✅ Service Catalog → Monthly Accounting → Pricing tiers → Client assignments → Revenue analytics

### **Executive View**
**What they see:**
- Business metrics (MRR, churn, NPS)
- Compliance trends (% clients GREEN/AMBER/RED)
- Revenue analytics (by service, by stage, by industry)
- Team performance (ops team productivity)
- Growth forecasting

**Drill-down capability:**
✅ Revenue Dashboard → Service: GST Returns → Clients → ABC Pvt Ltd → Payment history → Invoices
✅ Compliance Trends → RED status clients → ABC Pvt Ltd → Overdue checkpoints → Root cause

### **QC View**
**What they see:**
- Quality review queue
- Document verification pending
- Service delivery quality checks
- Error tracking & trends

**Drill-down capability:**
✅ QC Queue → Service: Annual Filing → Client: ABC Pvt Ltd → Deliverable review → Reject with feedback

---

## 3. Missing Depth Components (To Build)

### **3.1 Compliance Action Center** (US Standard: Carta's Task Center)
**Current:** Just shows checkpoints with status
**Needed:**
```
Checkpoint: GST-3B January 2026
├── Status: Overdue (3 days)
├── Penalty Exposure: ₹10,000
├── Assigned To: Priya Sharma (Operations)
├── Subtasks:
│   ├── [✓] Collect sales invoices (Completed by Amit on Jan 10)
│   ├── [✓] Collect purchase invoices (Completed by Amit on Jan 12)
│   ├── [⏳] Reconcile input tax credit (In Progress - Priya)
│   ├── [  ] Prepare GSTR-3B return
│   ├── [  ] Get client approval
│   └── [  ] File on GST portal
├── Documents Required:
│   ├── Sales register (Uploaded ✓)
│   ├── Purchase register (Uploaded ✓)
│   └── Bank statement (Missing ✗)
├── Communication History:
│   ├── Jan 10: Email sent to client for documents
│   ├── Jan 12: Documents received via WhatsApp
│   └── Jan 14: Reminder sent for bank statement
└── Actions:
    ├── [Button] Upload Bank Statement
    ├── [Button] Mark as Complete
    └── [Button] Request Extension
```

### **3.2 Document Verification Workflow** (US Standard: Stripe's Identity Verification)
**Current:** Just upload and store
**Needed:**
```
Document: PAN Card - Amit Sharma
├── Upload Details:
│   ├── Uploaded by: Amit Sharma (Client)
│   ├── Upload time: Jan 15, 2026, 10:30 AM
│   ├── File: PAN_Amit.pdf (234 KB)
│   └── IP Address: 103.21.45.67 (Mumbai)
├── OCR Extraction:
│   ├── PAN Number: ABCD1234E
│   ├── Name: AMIT KUMAR SHARMA
│   ├── DOB: 15/03/1990
│   ├── Father's Name: RAJESH SHARMA
│   └── Confidence Score: 98.5%
├── Verification Steps:
│   ├── [✓] File format check (PDF ✓)
│   ├── [✓] File size check (< 2MB ✓)
│   ├── [✓] OCR extraction (Success ✓)
│   ├── [⏳] Manual review (Assigned to Priya)
│   ├── [  ] Cross-check with ITD database
│   └── [  ] Final approval
├── Issues Found:
│   └── Name mismatch: "AMIT KUMAR SHARMA" vs "Amit Sharma" (registration form)
├── Actions Taken:
│   ├── Jan 15, 11:00 AM: Flagged for review (System)
│   ├── Jan 15, 11:30 AM: Assigned to QC (Auto)
│   └── Jan 15, 12:00 PM: Clarification requested from client (Priya)
└── Status: Pending Client Response
```

### **3.3 Service Lifecycle Management** (US Standard: HubSpot's Deal Pipeline)
**Current:** Service subscribed → delivered (black box)
**Needed:**
```
Service: Monthly Accounting (Jan 2026)
├── Subscription Details:
│   ├── Plan: Professional (₹5,000/month)
│   ├── Start Date: Jan 1, 2026
│   ├── Renewal Date: Feb 1, 2026
│   ├── Auto-renew: Yes
│   └── Payment Method: UPI (amit@paytm)
├── Delivery Workflow:
│   ├── [✓] Stage 1: Data Collection (Jan 1-5)
│   │   ├── Bank statement received ✓
│   │   ├── Invoice data received ✓
│   │   └── Expense receipts received ✓
│   ├── [✓] Stage 2: Data Entry (Jan 6-10)
│   │   ├── Assigned to: Ravi (Ops Team)
│   │   ├── Entries: 145 transactions
│   │   └── Completed: Jan 10, 3:30 PM
│   ├── [✓] Stage 3: Reconciliation (Jan 11-12)
│   │   ├── Assigned to: Priya (Senior Ops)
│   │   ├── Matched: 140/145 transactions
│   │   └── Queries raised: 5 (resolved)
│   ├── [✓] Stage 4: QC Review (Jan 13)
│   │   ├── Reviewer: Sneha (QC Team)
│   │   ├── Quality Score: 9.5/10
│   │   └── Approved: Jan 13, 5:00 PM
│   └── [⏳] Stage 5: Client Delivery (Jan 14)
│       ├── Reports generated: 3
│       ├── Sent to client: Pending
│       └── ETA: Jan 15, 12:00 PM
├── Deliverables:
│   ├── P&L Statement (Generated ✓)
│   ├── Balance Sheet (Generated ✓)
│   ├── Cash Flow Statement (Generated ✓)
│   └── Reconciliation Report (Generated ✓)
├── Client Feedback:
│   └── (Awaiting delivery)
└── Next Renewal:
    ├── Date: Feb 1, 2026
    ├── Amount: ₹5,000
    └── Status: Scheduled for auto-debit
```

### **3.4 Audit Trail** (US Standard: AWS CloudTrail)
**Current:** No visibility into who did what
**Needed:**
```
Recent Activity for Client: ABC Pvt Ltd
├── Jan 15, 2026, 2:45 PM
│   ├── Action: Document uploaded
│   ├── User: Amit Sharma (Client)
│   ├── Document: Bank Statement (Jan 2026)
│   ├── IP: 103.21.45.67 (Mumbai)
│   └── Device: Chrome on MacOS
├── Jan 15, 2026, 3:00 PM
│   ├── Action: Document verified
│   ├── User: Priya Verma (QC Team)
│   ├── Result: Approved
│   └── Comments: "All details verified against bank's PDF"
├── Jan 15, 2026, 3:15 PM
│   ├── Action: Service status updated
│   ├── User: System (Auto)
│   ├── Service: Monthly Accounting
│   ├── Old Status: "Data Collection"
│   └── New Status: "Data Entry"
├── Jan 15, 2026, 3:30 PM
│   ├── Action: Task assigned
│   ├── User: Priya Verma (Operations Manager)
│   ├── Task: "Enter January transactions"
│   ├── Assigned To: Ravi Kumar (Ops Team)
│   └── Due Date: Jan 17, 2026
└── Jan 15, 2026, 4:00 PM
    ├── Action: Payment received
    ├── Amount: ₹5,000
    ├── Method: UPI (amit@paytm)
    ├── Transaction ID: 260115T123456
    └── Allocated To: Invoice INV-2026-001
```

---

## 4. Implementation Priority

### **Phase 1: Critical Depth (Next 2 weeks)**
1. ✅ Compliance Action Center with subtask breakdown
2. ✅ Document Verification Workflow (OCR + manual review)
3. ✅ Service Lifecycle tracking (5-stage pipeline)
4. ✅ Audit Trail (all actions logged)

### **Phase 2: Role-Based Views (Week 3-4)**
1. ✅ User Access Control (permissions per role)
2. ✅ Client Portal V2 with drill-down
3. ✅ Operations Dashboard with task queue
4. ✅ Admin Panel with system config

### **Phase 3: Analytics & Intelligence (Week 5-6)**
1. ✅ Executive Dashboard with drill-down to client level
2. ✅ Revenue Analytics by service/stage/industry
3. ✅ Compliance Trends & forecasting
4. ✅ Team Performance metrics

---

## 5. Database Schema Additions Needed

### **5.1 Compliance Actions Table**
```sql
CREATE TABLE compliance_actions (
  id SERIAL PRIMARY KEY,
  checkpoint_id INTEGER REFERENCES compliance_checkpoints(id),
  client_id INTEGER REFERENCES clients(id),
  action_type VARCHAR(50), -- 'task', 'document_request', 'approval', 'filing'
  title TEXT,
  description TEXT,
  assigned_to INTEGER REFERENCES users(id),
  status VARCHAR(20), -- 'pending', 'in_progress', 'completed', 'blocked'
  due_date DATE,
  completed_at TIMESTAMPTZ,
  dependencies JSONB, -- { "requires": [action_id_1, action_id_2] }
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **5.2 Document Verification Table**
```sql
CREATE TABLE document_verifications (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id),
  verification_stage VARCHAR(50), -- 'upload', 'ocr', 'manual_review', 'approved', 'rejected'
  verified_by INTEGER REFERENCES users(id),
  ocr_data JSONB,
  verification_notes TEXT,
  issues_found JSONB,
  confidence_score DECIMAL(5,2),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **5.3 Service Delivery Stages Table**
```sql
CREATE TABLE service_delivery_stages (
  id SERIAL PRIMARY KEY,
  service_subscription_id INTEGER REFERENCES entity_services(id),
  stage_name VARCHAR(100), -- 'data_collection', 'processing', 'qc', 'delivery', 'feedback'
  stage_order INTEGER,
  assigned_to INTEGER REFERENCES users(id),
  status VARCHAR(20), -- 'pending', 'in_progress', 'completed', 'blocked'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deliverables JSONB,
  quality_score DECIMAL(3,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **5.4 Audit Trail Table**
```sql
CREATE TABLE audit_trail (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  client_id INTEGER REFERENCES clients(id),
  action_type VARCHAR(50), -- 'document_upload', 'status_change', 'payment', 'task_assign', etc.
  entity_type VARCHAR(50), -- 'document', 'service', 'checkpoint', 'invoice', etc.
  entity_id INTEGER,
  action_details JSONB, -- { "old_value": "X", "new_value": "Y", "reason": "..." }
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. API Endpoints for Drill-Down

### **Compliance Drill-Down**
```
GET /api/v2/compliance/dashboard?userId=123
  → Returns: Overall status, days to deadline, checkpoints summary

GET /api/v2/compliance/checkpoints?category=monthly&status=pending
  → Returns: List of monthly checkpoints with status

GET /api/v2/compliance/checkpoint/:id
  → Returns: Full details with subtasks, documents, history

GET /api/v2/compliance/checkpoint/:id/actions
  → Returns: All action items for this checkpoint

GET /api/v2/compliance/checkpoint/:id/history
  → Returns: Audit trail for this specific checkpoint
```

### **Document Drill-Down**
```
GET /api/v2/documents/dashboard?userId=123
  → Returns: Total docs, upload progress, critical missing

GET /api/v2/documents?category=tax&status=verified
  → Returns: List of tax documents with status

GET /api/v2/documents/:id
  → Returns: Document metadata, verification status, file URL

GET /api/v2/documents/:id/verification-history
  → Returns: Complete verification workflow with OCR data

GET /api/v2/documents/:id/versions
  → Returns: All versions if document was re-uploaded
```

### **Service Drill-Down**
```
GET /api/v2/services/dashboard?userId=123
  → Returns: Active services, upcoming renewals, gaps

GET /api/v2/services/:id
  → Returns: Service details, pricing, subscription info

GET /api/v2/services/:id/delivery-pipeline
  → Returns: Current stage, progress, assigned team, ETAs

GET /api/v2/services/:id/deliverables
  → Returns: All reports/outputs generated for this service

GET /api/v2/services/:id/history
  → Returns: All past deliveries, quality scores, feedback
```

---

## 7. UI Components Needed

### **Drill-Down Navigation Pattern**
```tsx
// Breadcrumb navigation for context
Dashboard > Compliance > Monthly GST > January 2026 > Task: Collect Invoices

// Each level clickable to go back
// Each level shows relevant actions for that context
```

### **Expandable Table Rows**
```tsx
// Click row → Expand inline details
// Click icon → Drill into dedicated page
// Hover → Show quick preview tooltip
```

### **Action Sidebars**
```tsx
// Right sidebar slides in with:
// - Quick actions for current context
// - Related items
// - Recent activity
// - Comments/notes
```

### **Timeline Views**
```tsx
// Visual timeline of:
// - Service delivery stages
// - Document verification steps
// - Compliance checkpoint progress
// - Audit trail events
```

---

## Next Steps

1. **Clean up DevHub** - Remove outdated/duplicate pages
2. **Build Compliance Action Center** - With full drill-down
3. **Build Document Verification Workflow** - With OCR + stages
4. **Build Service Lifecycle Tracker** - 5-stage pipeline
5. **Implement Audit Trail** - Log every action
6. **Create drill-down components** - Reusable patterns

**Goal:** Match US SaaS standards (Carta, Stripe, Gusto) while being India-specific in domain logic.
