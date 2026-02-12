# Week 1 Day 1 — US Portal Implementation Kickoff

**Date:** 2026-01-22  
**Goal:** Backend foundation (database + API spec)  
**Time:** 8 hours

---

## ✅ Morning Session (2 hours)

### 1. Git Branch Setup (15 min)
```bash
cd /Users/rakeshanita/DigiComply/comply-flow-portal
git checkout -b feature/us-style-portal
git push -u origin feature/us-style-portal
```

### 2. Project Tracking Setup (30 min)
Create Linear/Jira/GitHub Project with these epics:
- [ ] Week 1: Backend Foundation
- [ ] Week 2: Frontend Components
- [ ] Week 3: Integration & Testing
- [ ] Week 4: Production Migration

### 3. Team Kickoff (45 min)
- [ ] Share US_PORTAL_COMPONENT_ARCHITECTURE.md with team
- [ ] Review 4-week timeline
- [ ] Assign roles (full-stack dev, compliance expert, QA)
- [ ] Schedule daily standups

### 4. Book Compliance Expert (30 min)
- [ ] Schedule 8-hour review session for Day 6-7
- [ ] Share friendly labels list for pre-review
- [ ] Set expectations (131 compliance types to translate)

---

## ⚙️ Afternoon Session (6 hours)

### 5. Database Migration (2 hours)

**Create:** `database/migrations/003-add-friendly-labels.sql`

```sql
-- Add friendly labels to compliance_rules table
ALTER TABLE compliance_rules ADD COLUMN IF NOT EXISTS friendly_label TEXT;
ALTER TABLE compliance_rules ADD COLUMN IF NOT EXISTS action_verb TEXT; -- "Upload", "Review", "Confirm", "Pay"
ALTER TABLE compliance_rules ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER;
ALTER TABLE compliance_rules ADD COLUMN IF NOT EXISTS why_matters JSONB; -- { benefits: [], socialProof: "" }
ALTER TABLE compliance_rules ADD COLUMN IF NOT EXISTS instructions TEXT[]; -- Step-by-step

-- Create index for faster lookups
CREATE INDEX idx_compliance_rules_friendly ON compliance_rules(friendly_label);

-- Add comments for documentation
COMMENT ON COLUMN compliance_rules.friendly_label IS 'Human-friendly version (e.g., "Upload purchase invoices" instead of "GSTR-3B Input Credit")';
COMMENT ON COLUMN compliance_rules.action_verb IS 'Primary action type: upload, review, confirm, pay';
COMMENT ON COLUMN compliance_rules.estimated_time_minutes IS 'Expected time for user to complete (reduces anxiety)';
COMMENT ON COLUMN compliance_rules.why_matters IS 'JSON object with benefits[] and socialProof string';
```

**Run migration:**
```bash
psql $DATABASE_URL -f database/migrations/003-add-friendly-labels.sql
```

**Verify:**
```sql
\d+ compliance_rules
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'compliance_rules' 
AND column_name IN ('friendly_label', 'action_verb', 'estimated_time_minutes', 'why_matters');
```

---

### 6. Seed Script (Top 10 Labels) (2 hours)

**Create:** `server/seed-friendly-labels.ts`

```typescript
import { db } from './db';

interface FriendlyLabel {
  ruleCode: string;
  friendlyLabel: string;
  actionVerb: 'upload' | 'review' | 'confirm' | 'pay';
  estimatedTimeMinutes: number;
  whyMatters: {
    benefits: string[];
    socialProof: string;
  };
  instructions: string[];
}

const TOP_10_LABELS: FriendlyLabel[] = [
  {
    ruleCode: 'GSTR3B',
    friendlyLabel: 'Upload purchase invoices for GST',
    actionVerb: 'upload',
    estimatedTimeMinutes: 5,
    whyMatters: {
      benefits: [
        'Avoid ₹5,000 late fee',
        'Complete monthly GST compliance',
        'Stay compliant with Indian tax laws',
      ],
      socialProof: 'Used by 92% businesses like yours',
    },
    instructions: [
      'Gather all purchase invoices from this month',
      'Upload PDF or Excel files',
      'We'll process them within 2 hours',
    ],
  },
  {
    ruleCode: 'GSTR1',
    friendlyLabel: 'Upload sales invoices for GST',
    actionVerb: 'upload',
    estimatedTimeMinutes: 5,
    whyMatters: {
      benefits: [
        'Complete monthly GST filing',
        'Avoid ₹10,000 late fee',
        'Required for input tax credit claims',
      ],
      socialProof: 'Most businesses complete this in under 5 minutes',
    },
    instructions: [
      'Gather all sales invoices from this month',
      'Upload PDF, Excel, or JSON files',
      'We'll file your GST return automatically',
    ],
  },
  {
    ruleCode: 'ITR_ADVANCE_TAX_Q1',
    friendlyLabel: 'Pay quarterly advance tax',
    actionVerb: 'pay',
    estimatedTimeMinutes: 3,
    whyMatters: {
      benefits: [
        'Avoid 1% monthly interest penalty',
        'Stay compliant with income tax laws',
        'Reduce year-end tax burden',
      ],
      socialProof: '89% businesses pay on time to avoid penalties',
    },
    instructions: [
      'Review estimated tax amount',
      'Pay via net banking or UPI',
      'We'll file the challan automatically',
    ],
  },
  {
    ruleCode: 'DIR3_KYC',
    friendlyLabel: 'Verify director identity',
    actionVerb: 'upload',
    estimatedTimeMinutes: 10,
    whyMatters: {
      benefits: [
        'Keep director registration active',
        'Avoid DIN deactivation',
        'Required for all company filings',
      ],
      socialProof: 'Annual requirement for all directors in India',
    },
    instructions: [
      'Upload PAN card copy',
      'Upload Aadhaar card copy',
      'Upload recent passport-size photo',
      'We'll file DIR-3 KYC within 24 hours',
    ],
  },
  {
    ruleCode: 'AOC4',
    friendlyLabel: 'Submit annual financial statements',
    actionVerb: 'review',
    estimatedTimeMinutes: 15,
    whyMatters: {
      benefits: [
        'Avoid ₹100/day late fee (up to ₹5 lakh)',
        'Complete annual company compliance',
        'Required for bank loans and funding',
      ],
      socialProof: 'Critical filing for all private limited companies',
    },
    instructions: [
      'Review drafted balance sheet',
      'Review profit & loss statement',
      'Approve and we'll file with ROC',
    ],
  },
  {
    ruleCode: 'MGT7',
    friendlyLabel: 'Submit annual shareholder report',
    actionVerb: 'review',
    estimatedTimeMinutes: 10,
    whyMatters: {
      benefits: [
        'Avoid ₹100/day late fee (up to ₹3 lakh)',
        'Complete annual company compliance',
        'Update shareholder information',
      ],
      socialProof: 'Mandatory for all companies, even one-person companies',
    },
    instructions: [
      'Review drafted MGT-7 form',
      'Confirm shareholder details',
      'Approve and we'll file with ROC',
    ],
  },
  {
    ruleCode: 'PF_MONTHLY',
    friendlyLabel: 'Upload employee salary details for PF',
    actionVerb: 'upload',
    estimatedTimeMinutes: 8,
    whyMatters: {
      benefits: [
        'Complete employee PF compliance',
        'Avoid interest penalties',
        'Keep employee accounts updated',
      ],
      socialProof: 'Required monthly for companies with 20+ employees',
    },
    instructions: [
      'Upload salary register Excel file',
      'We'll calculate PF contributions',
      'We'll file ECR return automatically',
    ],
  },
  {
    ruleCode: 'ESI_MONTHLY',
    friendlyLabel: 'Upload employee salary details for ESI',
    actionVerb: 'upload',
    estimatedTimeMinutes: 8,
    whyMatters: {
      benefits: [
        'Complete employee health insurance compliance',
        'Avoid penalties',
        'Keep employee coverage active',
      ],
      socialProof: 'Required monthly for companies with 10+ employees',
    },
    instructions: [
      'Upload salary register Excel file',
      'We'll calculate ESI contributions',
      'We'll file return automatically',
    ],
  },
  {
    ruleCode: 'TDS_PAYMENT',
    friendlyLabel: 'Pay monthly TDS (tax deducted at source)',
    actionVerb: 'pay',
    estimatedTimeMinutes: 5,
    whyMatters: {
      benefits: [
        'Avoid 1.5% monthly interest penalty',
        'Stay compliant with income tax laws',
        'Required for vendor/salary payments',
      ],
      socialProof: 'Critical monthly compliance for all businesses',
    },
    instructions: [
      'Review TDS summary',
      'Pay via Challan 281',
      'We'll file TDS return automatically',
    ],
  },
  {
    ruleCode: 'GST_PAYMENT',
    friendlyLabel: 'Pay monthly GST liability',
    actionVerb: 'pay',
    estimatedTimeMinutes: 3,
    whyMatters: {
      benefits: [
        'Avoid 18% annual interest penalty',
        'Complete monthly GST compliance',
        'Required before filing returns',
      ],
      socialProof: 'Most businesses pay on time to avoid heavy interest',
    },
    instructions: [
      'Review GST liability amount',
      'Pay via GST portal',
      'We'll reconcile payment automatically',
    ],
  },
];

async function seedFriendlyLabels() {
  console.log('🌱 Seeding friendly labels for top 10 compliance rules...\n');

  let updated = 0;
  let notFound = 0;

  for (const label of TOP_10_LABELS) {
    try {
      const result = await db.query(
        `UPDATE compliance_rules 
         SET friendly_label = $1,
             action_verb = $2,
             estimated_time_minutes = $3,
             why_matters = $4,
             instructions = $5,
             updated_at = NOW()
         WHERE rule_code = $6
         RETURNING id, name`,
        [
          label.friendlyLabel,
          label.actionVerb,
          label.estimatedTimeMinutes,
          JSON.stringify(label.whyMatters),
          label.instructions,
          label.ruleCode,
        ]
      );

      if (result.rowCount > 0) {
        console.log(`✅ ${label.ruleCode}: ${label.friendlyLabel}`);
        updated++;
      } else {
        console.log(`⚠️  ${label.ruleCode}: Rule not found in database`);
        notFound++;
      }
    } catch (error) {
      console.error(`❌ ${label.ruleCode}: Error - ${error.message}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Total: ${TOP_10_LABELS.length}`);
}

seedFriendlyLabels()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
```

**Run seed:**
```bash
node --env-file=.env --import tsx server/seed-friendly-labels.ts
```

**Verify:**
```sql
SELECT rule_code, friendly_label, action_verb, estimated_time_minutes 
FROM compliance_rules 
WHERE friendly_label IS NOT NULL 
LIMIT 10;
```

---

### 7. API Spec Document (2 hours)

**Create:** `server/routes/api-v2-spec.md`

```markdown
# Client Portal V2 API Specification

## GET /api/v2/client/status

**Auth:** Bearer token (requireAuth middleware)

**Purpose:** Single call for entire portal state

**Response 200:**
```json
{
  "complianceState": "GREEN" | "AMBER" | "RED",
  "daysSafe": number,
  "nextDeadline": "YYYY-MM-DD",
  "penaltyExposure": number | null,
  "nextAction": {
    "id": "action_uuid",
    "title": "Human-friendly action",
    "timeEstimate": "X minutes",
    "whyMatters": {
      "benefits": string[],
      "socialProof": string
    },
    "actionType": "upload" | "review" | "confirm" | "pay",
    "instructions": string[],
    "documentType": string | null,
    "dueDate": "YYYY-MM-DD"
  } | null,
  "recentActivities": [
    {
      "id": "activity_uuid",
      "type": "document_uploaded" | "filing_initiated" | "payment_completed",
      "description": "Human-readable description",
      "timestamp": "ISO 8601",
      "icon": "CheckCircle" | "FileText" | "DollarSign"
    }
  ]
}
```

**Error 401:** Unauthorized  
**Error 500:** Server error

---

## POST /api/v2/client/actions/complete

**Auth:** Bearer token (requireAuth middleware)

**Purpose:** Complete an action (upload, confirm, pay)

**Body (multipart/form-data):**
```
actionId: string (required)
files: File[] (optional, for uploads)
confirmationData: JSON (optional, for reviews/confirms)
paymentReference: string (optional, for payments)
```

**Response 200:**
```json
{
  "success": true,
  "message": "Action completed successfully",
  "newState": {
    "complianceState": "GREEN",
    "daysSafe": 30
  }
}
```

**Error 400:** Bad request (missing files, invalid action)  
**Error 401:** Unauthorized  
**Error 404:** Action not found  
**Error 500:** Server error

---

## Implementation Notes

### Backend Dependencies
- `compliance-state-engine.ts` (exists) - For state calculation
- `compliance-event-emitter.ts` (exists) - For recalculation triggers
- `compliance-rules` table (exists) - For rule lookup
- `friendly_labels` columns (NEW) - For human-friendly text

### New Functions to Create
1. `getNextPrioritizedAction(userId, complianceState)` - Returns single highest-priority action
2. `getRecentActivities(userId, limit)` - Returns recent compliance activities
3. `completeAction(actionId, userId, data)` - Processes action completion

### Priority Logic (for next action)
1. Overdue (past due date) → highest priority
2. Due within 7 days → primary
3. Missing prerequisite documents → next
4. Upcoming (due within 30 days) → later
5. Else → null (all good)
```

---

## 📝 End of Day 1 Deliverables

- [ ] Git branch created
- [ ] Project tracking set up
- [ ] Team kickoff completed
- [ ] Compliance expert booked
- [ ] Database migration created and run
- [ ] Top 10 friendly labels seeded
- [ ] API spec documented

---

## 🚀 Day 2 Preview

Tomorrow we'll:
1. Implement `getNextPrioritizedAction()` function
2. Implement `GET /api/v2/client/status` endpoint
3. Implement `POST /api/v2/client/actions/complete` endpoint
4. Write unit tests for priority logic
5. Test with Postman/curl

---

**Status:** Ready to execute  
**Time estimate:** 8 hours  
**Blockers:** None (all dependencies exist)
