# DigiComply ID Management Specification

## Executive Summary

This document defines a comprehensive ID management system for DigiComply platform to ensure:
- **Traceability**: Every work item, transaction, and entity is trackable
- **Consistency**: Uniform ID formats across the platform
- **Audit Compliance**: Full audit trail for regulatory requirements
- **Operational Efficiency**: Easy reference in communications and support

---

## ID Taxonomy & Format Standards

### Format Convention: `{PREFIX}{YEAR}{SEQUENCE}`

All business-facing IDs follow this pattern for:
- Human readability
- Year-based grouping
- Easy verbal communication
- Sortable by time

---

## 1. CORE ENTITY IDs

### 1.1 Client/Business Entity IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **Client ID** | `C` | `C{5-digit}` | `C00001` | Primary client identifier |
| **Entity ID** | `E` | `E{5-digit}` | `E00001` | Business entity (can have multiple per client) |
| **Contact ID** | `CT` | `CT{6-digit}` | `CT000001` | Individual contacts within entities |

**Hierarchy**: Client → Multiple Entities → Multiple Contacts

```
C00001 (Rakesh Enterprises Group)
├── E00001 (Rakesh Pvt Ltd - Main Company)
│   ├── CT000001 (Rakesh - Director)
│   └── CT000002 (Anita - CFO)
├── E00002 (Rakesh Trading LLP)
│   └── CT000003 (Manager)
```

---

### 1.2 User & Role IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **User ID** | `U` | `U{6-digit}` | `U000001` | System user account |
| **Staff ID** | `STF` | `STF{4-digit}` | `STF0001` | Internal staff member |
| **Agent ID** | `AGT` | `AGT{4-digit}` | `AGT0001` | Channel partner/agent |
| **Team ID** | `TM` | `TM{3-digit}` | `TM001` | Operations team |

---

## 2. SERVICE & WORK IDs

### 2.1 Service Catalog IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **Service Code** | `SVC` | `SVC_{CATEGORY}_{NAME}` | `SVC_GST_GSTR3B` | Service definition |
| **Package ID** | `PKG` | `PKG{4-digit}` | `PKG0001` | Service bundles |
| **Plan ID** | `PLN` | `PLN{4-digit}` | `PLN0001` | Retainership plans |

**Service Code Taxonomy**:
```
SVC_GST_GSTR1          - GST Returns - GSTR1
SVC_GST_GSTR3B         - GST Returns - GSTR3B
SVC_GST_ANNUAL         - GST Annual Return
SVC_ROC_AOC4           - ROC Filing - AOC-4
SVC_ROC_MGT7           - ROC Filing - MGT-7
SVC_TAX_ITR_COMPANY    - Income Tax - Company ITR
SVC_TAX_TDS_QUARTERLY  - TDS Quarterly Filing
SVC_REG_COMPANY        - Company Registration
SVC_REG_TRADEMARK      - Trademark Registration
SVC_ACC_MONTHLY        - Monthly Accounting
SVC_AUDIT_STATUTORY    - Statutory Audit
```

---

### 2.2 Service Request & Work Item IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **Service Request** | `SR` | `SR{YY}{5-digit}` | `SR2600001` | Client service request |
| **Work Item** | `WI` | `WI{YY}{6-digit}` | `WI26000001` | Internal work tracking |
| **Task** | `TSK` | `TSK{YY}{6-digit}` | `TSK26000001` | Individual task |
| **Sub-Task** | `ST` | `ST{YY}{6-digit}` | `ST26000001` | Task breakdown |

**Work Item Lifecycle**:
```
SR2600001 (Service Request from Client)
└── WI26000001 (Work Item for Operations)
    ├── TSK26000001 (Document Collection)
    │   ├── ST26000001 (Request PAN copy)
    │   └── ST26000002 (Request bank statement)
    ├── TSK26000002 (Filing Preparation)
    └── TSK26000003 (Submission & Verification)
```

---

### 2.3 Workflow & Status IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **Workflow Template** | `WF` | `WF{4-digit}` | `WF0001` | Workflow definition |
| **Workflow Instance** | `WFI` | `WFI{YY}{6-digit}` | `WFI26000001` | Running workflow |
| **Status Code** | `STS` | `STS_{STAGE}_{STATE}` | `STS_DOC_PENDING` | Status definitions |

**Standard Status Codes**:
```
STS_SR_INITIATED       - Service Request Initiated
STS_SR_DOCS_PENDING    - Awaiting Documents
STS_SR_DOCS_RECEIVED   - Documents Received
STS_SR_IN_PROGRESS     - Work In Progress
STS_SR_QC_REVIEW       - Quality Check Review
STS_SR_PENDING_FILING  - Ready for Filing
STS_SR_FILED           - Filed with Authority
STS_SR_COMPLETED       - Completed
STS_SR_ON_HOLD         - On Hold
STS_SR_CANCELLED       - Cancelled
```

---

## 3. FINANCIAL IDs

### 3.1 Payment & Invoice IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **Invoice** | `INV` | `INV{YY}{MM}{5-digit}` | `INV260100001` | Invoice number |
| **Payment** | `PAY` | `PAY{YY}{6-digit}` | `PAY26000001` | Payment transaction |
| **Receipt** | `RCT` | `RCT{YY}{6-digit}` | `RCT26000001` | Payment receipt |
| **Credit Note** | `CN` | `CN{YY}{5-digit}` | `CN2600001` | Credit note |
| **Debit Note** | `DN` | `DN{YY}{5-digit}` | `DN2600001` | Debit note |

**Invoice Number Format**: `INV{YEAR}{MONTH}{SEQUENCE}`
- Enables monthly tracking
- Supports GST compliance requirements
- Example: `INV2601` = January 2026 invoices

---

### 3.2 Commission & Wallet IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **Commission** | `COM` | `COM{YY}{6-digit}` | `COM26000001` | Commission record |
| **Wallet Transaction** | `WLT` | `WLT{YY}{6-digit}` | `WLT26000001` | Wallet credit/debit |
| **Payout** | `PO` | `PO{YY}{5-digit}` | `PO2600001` | Agent payout |
| **Referral Code** | `REF` | `REF{ALPHANUM}` | `REFABC123` | Referral tracking |

---

## 4. DOCUMENT IDs

### 4.1 Document Management IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **Document** | `DOC` | `DOC{YY}{6-digit}` | `DOC26000001` | Uploaded document |
| **Document Request** | `DR` | `DR{YY}{5-digit}` | `DR2600001` | Document request |
| **Signature Request** | `SIG` | `SIG{YY}{5-digit}` | `SIG2600001` | E-sign request |
| **Certificate** | `CRT` | `CRT{YY}{5-digit}` | `CRT2600001` | Generated certificate |

**Document Categories**:
```
DOC_CAT_IDENTITY       - Identity documents (PAN, Aadhaar)
DOC_CAT_INCORPORATION  - Incorporation documents (CoI, MoA, AoA)
DOC_CAT_FINANCIAL      - Financial documents (BS, P&L, Bank Stmt)
DOC_CAT_TAX           - Tax documents (Returns, Challans)
DOC_CAT_COMPLIANCE    - Compliance certificates
DOC_CAT_LEGAL         - Legal agreements
DOC_CAT_OTHER         - Other documents
```

---

## 5. COMPLIANCE IDs

### 5.1 Compliance Tracking IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **Compliance Item** | `CMP` | `CMP{YY}{6-digit}` | `CMP26000001` | Individual compliance |
| **Compliance Rule** | `CR` | `CR_{AUTHORITY}_{TYPE}` | `CR_GST_GSTR3B_M` | Rule definition |
| **Deadline** | `DL` | `DL{YY}{6-digit}` | `DL26000001` | Deadline instance |
| **Penalty Record** | `PEN` | `PEN{YY}{5-digit}` | `PEN2600001` | Penalty tracking |
| **Filing Reference** | `FIL` | `FIL{YY}{6-digit}` | `FIL26000001` | Filing confirmation |

**Compliance Rule Code Pattern**: `CR_{AUTHORITY}_{FORM}_{FREQUENCY}`
```
CR_GST_GSTR3B_M     - GST GSTR-3B Monthly
CR_GST_GSTR1_M      - GST GSTR-1 Monthly
CR_GST_GSTR9_A      - GST Annual Return
CR_ROC_AOC4_A       - ROC AOC-4 Annual
CR_ROC_MGT7_A       - ROC MGT-7 Annual
CR_IT_ITR_A         - Income Tax Return Annual
CR_TDS_24Q_Q        - TDS 24Q Quarterly
CR_TDS_26Q_Q        - TDS 26Q Quarterly
```

---

## 6. SALES & CRM IDs

### 6.1 Lead & Opportunity IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **Lead** | `L` | `L{YY}{5-digit}` | `L2600001` | Sales lead |
| **Opportunity** | `OPP` | `OPP{YY}{5-digit}` | `OPP2600001` | Sales opportunity |
| **Proposal** | `PRP` | `PRP{YY}{5-digit}` | `PRP2600001` | Sales proposal |
| **Contract** | `CON` | `CON{YY}{5-digit}` | `CON2600001` | Client contract |
| **Quote** | `QT` | `QT{YY}{5-digit}` | `QT2600001` | Price quote |

**Lead Lifecycle**:
```
L2600001 (New Lead)
└── OPP2600001 (Qualified Opportunity)
    └── PRP2600001 (Proposal Sent)
        └── CON2600001 (Contract Signed)
            └── C00001 (Client Created)
```

---

## 7. SUPPORT IDs

### 7.1 Support & Communication IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **Support Ticket** | `TKT` | `TKT{YY}{6-digit}` | `TKT26000001` | Support request |
| **Escalation** | `ESC` | `ESC{YY}{5-digit}` | `ESC2600001` | Escalation record |
| **Feedback** | `FB` | `FB{YY}{5-digit}` | `FB2600001` | Client feedback |
| **Message Thread** | `MSG` | `MSG{YY}{6-digit}` | `MSG26000001` | Communication thread |

---

## 8. QUALITY & DELIVERY IDs

### 8.1 QC & Delivery IDs

| ID Type | Prefix | Format | Example | Usage |
|---------|--------|--------|---------|-------|
| **QC Review** | `QC` | `QC{YY}{6-digit}` | `QC26000001` | Quality review |
| **Delivery** | `DLV` | `DLV{YY}{5-digit}` | `DLV2600001` | Delivery record |
| **Rejection** | `REJ` | `REJ{YY}{5-digit}` | `REJ2600001` | QC rejection |

---

## 9. CROSS-REFERENCE MATRIX

### How IDs Connect (Example Flow)

```
CLIENT ONBOARDING:
L2600001 → OPP2600001 → PRP2600001 → CON2600001 → C00001 + E00001

SERVICE REQUEST FLOW:
C00001 + E00001 → SR2600001 → WI26000001 → TSK26000001...TSK26000005
                      ↓
               INV2601000001 → PAY26000001 → RCT26000001

DOCUMENT FLOW:
SR2600001 → DR2600001 → DOC26000001...DOC26000005 → SIG2600001

COMPLIANCE FLOW:
E00001 → CMP26000001 (CR_GST_GSTR3B_M) → DL26000001 → FIL26000001

SUPPORT FLOW:
SR2600001 → TKT26000001 → ESC2600001 → QC26000001 → DLV2600001
```

---

## 10. ID GENERATION IMPLEMENTATION

### 10.1 Centralized ID Generator Service

```typescript
// server/services/id-generator.ts

interface IdConfig {
  prefix: string;
  includeYear: boolean;
  includeMonth?: boolean;
  sequenceLength: number;
  separator?: string;
}

const ID_CONFIGS: Record<string, IdConfig> = {
  CLIENT: { prefix: 'C', includeYear: false, sequenceLength: 5 },
  ENTITY: { prefix: 'E', includeYear: false, sequenceLength: 5 },
  SERVICE_REQUEST: { prefix: 'SR', includeYear: true, sequenceLength: 5 },
  WORK_ITEM: { prefix: 'WI', includeYear: true, sequenceLength: 6 },
  TASK: { prefix: 'TSK', includeYear: true, sequenceLength: 6 },
  INVOICE: { prefix: 'INV', includeYear: true, includeMonth: true, sequenceLength: 5 },
  PAYMENT: { prefix: 'PAY', includeYear: true, sequenceLength: 6 },
  DOCUMENT: { prefix: 'DOC', includeYear: true, sequenceLength: 6 },
  LEAD: { prefix: 'L', includeYear: true, sequenceLength: 5 },
  TICKET: { prefix: 'TKT', includeYear: true, sequenceLength: 6 },
  // ... more configs
};

class IdGenerator {
  private counters: Map<string, number> = new Map();

  async generateId(type: keyof typeof ID_CONFIGS): Promise<string> {
    const config = ID_CONFIGS[type];
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

    // Get next sequence from database (atomic)
    const sequence = await this.getNextSequence(type, year);
    const paddedSeq = sequence.toString().padStart(config.sequenceLength, '0');

    let id = config.prefix;
    if (config.includeYear) id += year;
    if (config.includeMonth) id += month;
    id += paddedSeq;

    return id;
  }

  private async getNextSequence(type: string, year: string): Promise<number> {
    // Use database sequence or counter table for atomicity
    const result = await db.execute(`
      INSERT INTO id_sequences (type, year, sequence)
      VALUES ($1, $2, 1)
      ON CONFLICT (type, year)
      DO UPDATE SET sequence = id_sequences.sequence + 1
      RETURNING sequence
    `, [type, year]);

    return result.rows[0].sequence;
  }
}

export const idGenerator = new IdGenerator();
```

### 10.2 Database Sequence Table

```sql
CREATE TABLE id_sequences (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  year VARCHAR(4) NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(type, year)
);

-- Indexes for fast lookup
CREATE INDEX idx_id_sequences_type_year ON id_sequences(type, year);
```

---

## 11. DISPLAY & SEARCH SPECIFICATIONS

### 11.1 ID Display Format

| Context | Format | Example |
|---------|--------|---------|
| Dashboard | Full ID | `SR2600001` |
| Lists | Full ID with icon | `📋 SR2600001` |
| Communications | Readable | `Service Request #SR2600001` |
| URLs | Slug-safe | `/service-requests/SR2600001` |
| API | Full ID | `"serviceRequestId": "SR2600001"` |

### 11.2 Search Capabilities

Users should be able to search by:
- **Full ID**: `SR2600001`
- **Partial ID**: `SR26` (all 2026 requests)
- **Cross-reference**: Search `C00001` to find all SRs, invoices, documents
- **Natural language**: "invoices for Rakesh Enterprises"

---

## 12. MIGRATION PLAN

### Phase 1: New ID Generation (Week 1)
1. Create `id_sequences` table
2. Implement `IdGenerator` service
3. Update all create operations to use new IDs

### Phase 2: Update Existing Records (Week 2)
1. Generate new IDs for existing records
2. Store both old and new IDs during transition
3. Create mapping table for reference

### Phase 3: UI Updates (Week 3)
1. Display new IDs in all interfaces
2. Update search to use new IDs
3. Update reports and exports

### Phase 4: API Updates (Week 4)
1. Accept both old and new IDs in APIs
2. Return new IDs in all responses
3. Deprecate old ID references

---

## 13. BENEFITS SUMMARY

| Benefit | Description |
|---------|-------------|
| **Traceability** | Every action linked via IDs |
| **Audit Trail** | Year-based IDs enable compliance reporting |
| **Communication** | Easy to reference in calls/emails |
| **Search** | Fast lookup across entities |
| **Integration** | Consistent IDs for API consumers |
| **Analytics** | Volume tracking by year/month |
| **Scalability** | Supports millions of records per year |

---

## 14. QUICK REFERENCE CARD

```
┌─────────────────────────────────────────────────────────────┐
│                    DigiComply ID Quick Reference             │
├─────────────────────────────────────────────────────────────┤
│ CLIENTS                                                      │
│   C00001    - Client Account                                │
│   E00001    - Business Entity                               │
│   CT000001  - Contact                                       │
├─────────────────────────────────────────────────────────────┤
│ WORK                                                         │
│   SR2600001 - Service Request                               │
│   WI26000001- Work Item                                     │
│   TSK26000001- Task                                         │
├─────────────────────────────────────────────────────────────┤
│ FINANCIAL                                                    │
│   INV2601000001 - Invoice (Jan 2026)                        │
│   PAY26000001   - Payment                                   │
│   RCT26000001   - Receipt                                   │
├─────────────────────────────────────────────────────────────┤
│ DOCUMENTS                                                    │
│   DOC26000001 - Document                                    │
│   SIG2600001  - Signature Request                           │
├─────────────────────────────────────────────────────────────┤
│ COMPLIANCE                                                   │
│   CMP26000001 - Compliance Item                             │
│   CR_GST_GSTR3B_M - Rule Code                               │
│   FIL26000001 - Filing Reference                            │
├─────────────────────────────────────────────────────────────┤
│ SALES                                                        │
│   L2600001   - Lead                                         │
│   OPP2600001 - Opportunity                                  │
│   PRP2600001 - Proposal                                     │
├─────────────────────────────────────────────────────────────┤
│ SUPPORT                                                      │
│   TKT26000001 - Support Ticket                              │
│   QC26000001  - QC Review                                   │
└─────────────────────────────────────────────────────────────┘
```

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: DigiComply Platform Team*
