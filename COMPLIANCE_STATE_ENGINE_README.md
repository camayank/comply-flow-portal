# Compliance State Engine

## 🎯 Overview

The **Compliance State Engine** is the foundational system that transforms Comply Flow from a service-tracking platform into a **state-monitoring compliance product**.

Instead of showing users "You have 131 services", it answers:
> **"Is my company compliant right now?"**

## 🧠 Core Concept

### State-Centric vs Service-Centric

**Before (Service-Centric):**
```
Client sees: 15 active service requests
Client thinks: "What does this mean?"
```

**After (State-Centric):**
```
Client sees: 🟢 GREEN - Your company is compliant (12 days safe)
Client thinks: "I'm safe. Got it."
```

## 📊 State Model

### Three States (Simple, Deterministic)

| State | Meaning | Trigger |
|-------|---------|---------|
| 🟢 **GREEN** | All compliances current | No upcoming deadlines within 7 days, nothing overdue |
| 🟡 **AMBER** | Action needed soon | Deadline within 7 days, or minor issues |
| 🔴 **RED** | Critical / Overdue | Deadline passed, penalty risk, or blocking issues |

### Six Compliance Domains

1. **CORPORATE** - MCA, ROC, Company Law (AOC-4, MGT-7, DIR-3 KYC)
2. **TAX_GST** - GST returns and compliance (GSTR-1, GSTR-3B, GSTR-9)
3. **TAX_INCOME** - Income Tax, TDS, TCS (ITR, 24Q, 26Q)
4. **LABOUR** - PF, ESI, PT, Labour laws
5. **FEMA** - Foreign exchange, imports/exports
6. **LICENSES** - FSSAI, Trade licenses, etc.
7. **STATUTORY** - Other statutory requirements

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT REQUEST                        │
│          "What's my compliance status?"                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              COMPLIANCE STATE ENGINE                     │
│                                                          │
│  1. Gather entity data                                  │
│     ├─ Entity details (type, turnover, employees)      │
│     ├─ Active services                                  │
│     ├─ Document status                                  │
│     └─ Filing history                                   │
│                                                          │
│  2. Load applicable rules                               │
│     └─ Filter by entity type, thresholds, flags         │
│                                                          │
│  3. Calculate per-domain state                          │
│     ├─ For each rule: calculate due date                │
│     ├─ Determine state (GREEN/AMBER/RED)                │
│     ├─ Calculate penalty exposure                       │
│     └─ Identify blockers                                │
│                                                          │
│  4. Calculate overall state                             │
│     └─ Worst domain state = overall state               │
│                                                          │
│  5. Identify next critical action                       │
│     └─ Most urgent requirement across domains           │
│                                                          │
│  6. Save state & generate alerts                        │
│     └─ Update DB, log calculation, create alerts        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                DATABASE (State Stored)                   │
│                                                          │
│  compliance_states          (current snapshot)          │
│  compliance_state_history   (time-series)               │
│  compliance_rules           (rule engine)               │
│  compliance_alerts          (active alerts)             │
│  state_calculation_log      (audit trail)               │
└─────────────────────────────────────────────────────────┘
```

## 🗄️ Database Schema

### `compliance_states` (Current State)
```sql
- entity_id
- overall_state (GREEN/AMBER/RED)
- overall_risk_score (0-100)
- total_penalty_exposure (₹)
- total_overdue_items
- next_critical_deadline
- next_critical_action
- domain_states (JSON)
- requirement_states (JSON)
```

### `compliance_rules` (Rule Engine)
```sql
- rule_id (e.g., 'GST_GSTR3B_MONTHLY')
- domain (CORPORATE, TAX_GST, etc.)
- applicable_entity_types
- turnover_min/max
- employee_count_min
- frequency (MONTHLY, QUARTERLY, ANNUAL)
- due_date_logic
- penalty_per_day
- criticality_score
```

## 🚀 Quick Start

### 1. Run Migration
```bash
cd /Users/rakeshanita/DigiComply/comply-flow-portal
psql -U your_user -d your_database -f database/migrations/001_create_compliance_state_tables.sql
```

### 2. Seed Rules
```bash
cd server
npx tsx seed-compliance-rules.ts
```

### 3. Calculate State
```typescript
import { stateEngine } from './compliance-state-engine';

// Calculate state for an entity
const result = await stateEngine.calculateEntityState(entityId);

if (result.success) {
  console.log('Overall State:', result.entityState.overallState);
  console.log('Risk Score:', result.entityState.overallRiskScore);
  console.log('Next Action:', result.entityState.nextCriticalAction);
}
```

## 📡 API Endpoints

### Get Current State
```
GET /api/compliance-state/:entityId
```

### Recalculate State
```
POST /api/compliance-state/:entityId/recalculate
```

### Get Dashboard Summary
```
GET /api/compliance-state/:entityId/summary
Response:
{
  "overallState": "AMBER",
  "overallRiskScore": 45,
  "nextCriticalAction": "File GSTR-3B (due in 3 days)",
  "nextCriticalDeadline": "2026-01-24T00:00:00Z",
  "daysUntilNextDeadline": 3,
  "totalPenaltyExposure": 0,
  "totalOverdueItems": 0,
  "totalUpcomingItems": 2,
  "domains": [
    {
      "domain": "TAX_GST",
      "state": "AMBER",
      "riskScore": 50,
      "overdueRequirements": 0
    }
  ]
}
```

### Get Alerts
```
GET /api/compliance-state/:entityId/alerts
```

### Get History (Trending)
```
GET /api/compliance-state/:entityId/history?days=30
```

## 🔧 Integration with Existing Code

### 1. Add to server/index.ts
```typescript
import complianceStateRoutes from './compliance-state-routes';

// After other routes
app.use('/api/compliance-state', complianceStateRoutes);
```

### 2. Trigger Calculation When Data Changes

**When service status changes:**
```typescript
// In service update handler
await stateEngine.calculateEntityState(entityId);
```

**When document uploaded:**
```typescript
// In document upload handler
await stateEngine.calculateEntityState(entityId);
```

**Automatic periodic calculation:**
```typescript
// In cron job or scheduler
setInterval(async () => {
  await stateEngine.recalculateAllEntities();
}, 6 * 60 * 60 * 1000); // Every 6 hours
```

## 🎨 Frontend Integration

### Display State Badge
```tsx
import { ComplianceStateBadge } from './ComplianceStateBadge';

function Dashboard() {
  const { data: state } = useQuery(['compliance-state', entityId], 
    () => api.get(`/compliance-state/${entityId}/summary`)
  );

  return (
    <div>
      <ComplianceStateBadge 
        state={state.overallState} 
        riskScore={state.overallRiskScore} 
      />
      
      <h2>Next Action</h2>
      <p>{state.nextCriticalAction}</p>
      <p>Due: {state.daysUntilNextDeadline} days</p>
    </div>
  );
}
```

### Show Domain Breakdown
```tsx
function DomainStateGrid({ domains }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {domains.map(domain => (
        <DomainCard
          key={domain.domain}
          name={domain.domain}
          state={domain.state}
          riskScore={domain.riskScore}
          overdueCount={domain.overdueRequirements}
        />
      ))}
    </div>
  );
}
```

## 📈 Roadmap

### Phase 1 (Current - Foundation)
- [x] Database schema
- [x] Core state engine
- [x] 15 P0 compliance rules
- [x] API endpoints
- [ ] Frontend integration

### Phase 2 (Next 2 weeks - Expansion)
- [ ] Add 30 more rules (P1)
- [ ] Enhance due date calculation logic
- [ ] Add filing history tracking
- [ ] Build UI components

### Phase 3 (Next 4 weeks - Intelligence)
- [ ] Predictive alerts
- [ ] Trend analysis
- [ ] Benchmarking
- [ ] Auto-recommendations

## 🐛 Debugging

### View Calculation Logs
```sql
SELECT * FROM state_calculation_log 
WHERE entity_id = 123 
ORDER BY calculated_at DESC 
LIMIT 10;
```

### Check Rule Applicability
```typescript
const input = await stateEngine.gatherInputData(entityId);
const rules = await stateEngine.loadApplicableRules(input);
console.log('Applicable rules:', rules.length);
```

### Manual Recalculation
```bash
curl -X POST http://localhost:5000/api/compliance-state/123/recalculate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔒 Security

- All routes protected with `requireAuth` middleware
- Bulk recalculation restricted to admins
- State calculation logged for audit
- No sensitive data in JSON responses

## 📝 Adding New Rules

1. Add to `seed-compliance-rules.ts`:
```typescript
{
  ruleId: 'NEW_RULE_ID',
  ruleName: 'Rule Display Name',
  domain: 'TAX_GST',
  applicableEntityTypes: ['pvt_ltd'],
  frequency: 'MONTHLY',
  dueDateLogic: '20th of next month',
  criticalityScore: 9,
  amberThresholdDays: 7,
  // ... other fields
}
```

2. Re-run seeder:
```bash
npx tsx seed-compliance-rules.ts
```

3. Recalculate all entities:
```bash
curl -X POST http://localhost:5000/api/compliance-state/recalculate-all
```

## 🎯 Key Benefits

1. **Simplicity** - Three states instead of 131 services
2. **Proactive** - Know problems before they happen
3. **Quantified** - Penalty exposure in ₹
4. **Actionable** - Clear next steps
5. **Auditable** - Full calculation history
6. **Scalable** - Fast, deterministic calculations
7. **Extensible** - Easy to add new rules

## 📚 Reference

- Type Definitions: `shared/compliance-state-types.ts`
- Database Schema: `shared/compliance-state-schema.ts`
- Core Engine: `server/compliance-state-engine.ts`
- API Routes: `server/compliance-state-routes.ts`
- Rule Seeder: `server/seed-compliance-rules.ts`

---

**Built for:** Comply Flow Portal  
**Version:** 1.0.0  
**Date:** January 2026
