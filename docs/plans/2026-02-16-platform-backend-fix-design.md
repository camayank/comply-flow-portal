# Platform Backend Fix - Replace Mock Data with Real Backend

**Date:** 2026-02-16
**Status:** COMPLETED
**Author:** Claude + User

## Overview

Fix critical platform gaps where UI exists but backend returns mock/fake data instead of real database queries. Follow Cannoor's principles: real backend, best UX, no mock data.

## Critical Gaps Identified

### 1. Finance Dashboard (CRITICAL)
**File:** `server/routes/finance.ts`
**Problem:** All endpoints return mock data from `generateFinancialData()`, `generateInvoices()`, `generateRevenueData()`
**Tables Available:** `payments`, `invoices` (both have proper schema)

### 2. OCR Service (MEDIUM)
**File:** `server/services/v2/document-management-service.ts`
**Problem:** `simulateOCR()` returns hardcoded mock data
**Solution:** Flag as "manual verification required" until real OCR integrated

### 3. Agent Commission API (HIGH)
**Tables Available:** `commissions`, `commissionDisputes` (proper schema exists)
**Problem:** Frontend expects data but backend may not be wired

### 4. Communication Logging (MEDIUM)
**Table Available:** `clientCommunications` (proper schema exists)
**Problem:** Email/SMS/WhatsApp sends but no logging middleware

---

## Part 1: Finance Dashboard Backend Fix

### Current State (Broken)
```typescript
// server/routes/finance.ts - RETURNS MOCK DATA
const generateFinancialData = () => {
  return {
    summary: { totalRevenue: 4250000, ... }, // FAKE
    kpis: { ... },  // FAKE
  };
};
```

### Target State (Real DB)
```typescript
// Query REAL data from payments + invoices tables
const getFinancialSummary = async () => {
  const revenue = await db.select({
    totalRevenue: sum(payments.amount),
    paidCount: count(),
  }).from(payments).where(eq(payments.status, 'completed'));

  const invoiceStats = await db.select({
    total: count(),
    outstanding: sum(invoices.outstandingAmount),
  }).from(invoices);

  return { ...revenue, ...invoiceStats };
};
```

### Endpoints to Fix

| Endpoint | Current | Fix |
|----------|---------|-----|
| GET /api/finance/summary | Mock `generateFinancialData()` | Query `payments` + `invoices` |
| GET /api/finance/kpis | Mock data | Aggregate from `payments`, `invoices`, `serviceRequests` |
| GET /api/finance/invoices | Mock `generateInvoices()` | Query `invoices` table directly |
| GET /api/finance/revenue | Mock `generateRevenueData()` | Group `payments` by month |
| GET /api/finance/aging-report | Mock calculation | Query `invoices` WHERE status != 'paid' |
| GET /api/finance/client-revenue | Mock aggregation | JOIN `invoices` with `businessEntities` |

### KPI Calculations (Real)

```sql
-- Total Revenue (completed payments)
SELECT SUM(amount) as total_revenue FROM payments WHERE status = 'completed';

-- Outstanding Amount
SELECT SUM(outstanding_amount) as outstanding FROM invoices WHERE status != 'paid';

-- Invoice Counts
SELECT
  COUNT(*) as total_invoices,
  COUNT(*) FILTER (WHERE status = 'paid') as paid_invoices,
  COUNT(*) FILTER (WHERE status = 'overdue') as overdue_invoices
FROM invoices;

-- Monthly Revenue Trend
SELECT
  DATE_TRUNC('month', completed_at) as month,
  SUM(amount) as revenue
FROM payments
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', completed_at)
ORDER BY month DESC
LIMIT 12;

-- Client Revenue Breakdown
SELECT
  be.company_name as client,
  SUM(i.total_amount) as revenue,
  COUNT(i.id) as invoice_count
FROM invoices i
JOIN business_entities be ON i.business_entity_id = be.id
GROUP BY be.id, be.company_name
ORDER BY revenue DESC
LIMIT 10;
```

---

## Part 2: OCR Service Fix

### Current State
```typescript
async function simulateOCR(documentKey: string, fileData: any): Promise<any> {
  const mockData = {
    pan_card: { pan_number: 'ABCDE1234F', ... }, // FAKE
  };
  return mockData[documentKey] || {};
}
```

### Target State (Graceful Degradation)
```typescript
async function extractOCR(documentKey: string, fileData: any): Promise<OcrResult> {
  // Check if OCR service is configured
  if (!process.env.OCR_SERVICE_URL) {
    return {
      status: 'manual_verification_required',
      message: 'OCR service not configured. Document requires manual verification.',
      extractedData: {},
      confidence: 0,
    };
  }

  try {
    // Call real OCR service (AWS Textract, Google Vision, etc.)
    const result = await callOcrService(documentKey, fileData.fileBuffer);
    return {
      status: 'extracted',
      extractedData: result.fields,
      confidence: result.confidence,
    };
  } catch (error) {
    return {
      status: 'extraction_failed',
      message: 'OCR extraction failed. Manual verification required.',
      extractedData: {},
      confidence: 0,
    };
  }
}
```

### UX Handling
- Documents without OCR show "Pending Manual Verification" badge
- Ops team sees clear indicator that document needs review
- No fake data displayed to user

---

## Part 3: Agent Commission API Fix

### Tables Already Exist
```typescript
export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  serviceRequestId: integer("service_request_id"),
  leadId: integer("lead_id"),
  commissionType: text("commission_type"),
  commissionAmount: decimal("commission_amount").notNull(),
  status: text("status").default("pending"),
  // ...
});
```

### Endpoints Needed

```typescript
// GET /api/agent/commissions - List agent's commissions
router.get('/commissions', async (req, res) => {
  const agentId = req.user.id;
  const commissions = await db.select()
    .from(commissions)
    .where(eq(commissions.agentId, agentId))
    .orderBy(desc(commissions.createdAt));
  return res.json(commissions);
});

// GET /api/agent/commission-summary - Dashboard stats
router.get('/commission-summary', async (req, res) => {
  const agentId = req.user.id;
  const summary = await db.select({
    totalEarned: sum(commissions.commissionAmount),
    pending: sum(sql`CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END`),
    paid: sum(sql`CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END`),
  }).from(commissions).where(eq(commissions.agentId, agentId));
  return res.json(summary[0]);
});
```

---

## Part 4: Communication Logging Middleware

### Table Already Exists
```typescript
export const clientCommunications = pgTable("client_communications", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  communicationType: text("communication_type").notNull(), // call, email, whatsapp, sms
  direction: text("direction").notNull(), // inbound, outbound
  subject: text("subject"),
  summary: text("summary").notNull(),
  fullContent: text("full_content"),
  contactedBy: integer("contacted_by"),
  // ...
});
```

### Middleware Pattern
```typescript
// server/middleware/communication-logger.ts
export async function logCommunication(params: {
  clientId: number;
  type: 'email' | 'sms' | 'whatsapp';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  recipientId?: number;
  metadata?: any;
}) {
  await db.insert(clientCommunications).values({
    clientId: params.clientId,
    communicationType: params.type,
    direction: params.direction,
    subject: params.subject,
    summary: params.content.substring(0, 200),
    fullContent: params.content,
    actualAt: new Date(),
    contactedBy: params.recipientId,
    createdBy: params.recipientId || 0,
  });
}

// Usage in email sender:
await sendEmail(to, subject, body);
await logCommunication({
  clientId: client.id,
  type: 'email',
  direction: 'outbound',
  subject,
  content: body,
});
```

---

## Implementation Order

1. **Finance Dashboard** (highest impact - currently shows fake revenue numbers)
2. **OCR Service** (flag as manual verification - no fake extraction)
3. **Agent Commission** (wire up existing tables)
4. **Communication Logger** (middleware for outbound messages)

---

## Success Criteria

1. Finance dashboard shows REAL revenue from `payments` table
2. Invoice list shows REAL invoices from `invoices` table
3. OCR clearly indicates "Manual verification required" instead of fake data
4. Commission API returns real data from `commissions` table
5. All outbound emails/SMS logged in `clientCommunications`

---

## Files to Modify

| File | Changes |
|------|---------|
| `server/routes/finance.ts` | Replace all mock generators with real DB queries |
| `server/services/v2/document-management-service.ts` | Fix `simulateOCR` to return proper status |
| `server/routes/agents.ts` | Wire commission endpoints to DB |
| `server/middleware/communication-logger.ts` | NEW: Logging middleware |
| `server/services/email-service.ts` | Add logging calls |
| `server/services/sms-service.ts` | Add logging calls |
