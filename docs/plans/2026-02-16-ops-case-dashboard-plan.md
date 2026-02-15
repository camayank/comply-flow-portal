# Ops Case Dashboard + Client Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a two-level ops dashboard system with full lead traceability:
- **Client Dashboard** (`/ops/client/:clientId`) - Single source of truth for all client work items
- **Case Dashboard** (`/ops/case/:id`) - Deep dive into individual cases

**Architecture:** Schema-first approach:
1. Add lead_id foreign keys for traceability
2. Add client_activities table for unified timeline
3. Build API endpoints
4. Build frontend components and pages

**Tech Stack:** Drizzle ORM, PostgreSQL, Express, React, TanStack Query, Tailwind CSS, shadcn/ui

---

## Task 0: Add client_activities Table for Unified Timeline

**Files:**
- Modify: `shared/schema.ts`

**Step 1: Add ACTIVITY_TYPES constant**

Add after existing constants (around line 75):

```typescript
export const ACTIVITY_TYPES = {
  STATUS_CHANGE: 'status_change',
  NOTE_ADDED: 'note_added',
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_REQUESTED: 'document_requested',
  FILING_UPDATE: 'filing_update',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  ASSIGNMENT_CHANGE: 'assignment_change',
  SLA_UPDATE: 'sla_update',
  ESCALATION: 'escalation',
  COMMUNICATION: 'communication',
  CASE_CREATED: 'case_created',
  CASE_COMPLETED: 'case_completed',
} as const;
```

**Step 2: Add clientActivities table**

Add after caseNotes table:

```typescript
// Unified activity timeline for clients - single source of truth
export const clientActivities = pgTable("client_activities", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(), // FK to business_entities.id
  serviceRequestId: integer("service_request_id"), // optional, links to specific case
  activityType: text("activity_type").notNull(), // from ACTIVITY_TYPES
  title: text("title").notNull(),
  description: text("description"),
  oldValue: text("old_value"), // for status changes
  newValue: text("new_value"), // for status changes
  metadata: json("metadata"), // flexible additional data
  performedBy: integer("performed_by"), // user who performed action
  performedByName: text("performed_by_name"), // denormalized for display
  isClientVisible: boolean("is_client_visible").default(false),
  isSystemGenerated: boolean("is_system_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientActivitySchema = createInsertSchema(clientActivities).omit({
  id: true,
  createdAt: true,
});

export type ClientActivity = typeof clientActivities.$inferSelect;
export type InsertClientActivity = z.infer<typeof insertClientActivitySchema>;
```

**Step 3: Verify schema compiles**

Run: `npx tsc --noEmit shared/schema.ts`
Expected: No errors

**Step 4: Commit**

```bash
git add shared/schema.ts
git commit -m "feat(schema): add client_activities table for unified timeline"
```

---

## Task 1: Add Lead Traceability Fields to Schema

**Files:**
- Modify: `shared/schema.ts` (lines ~88-100 for users, ~108-146 for businessEntities, ~177-209 for serviceRequests, ~211-221 for payments)

**Step 1: Add leadId to users table**

In `shared/schema.ts`, find the `users` table definition (around line 88) and add after `businessEntityId`:

```typescript
// After line 97: businessEntityId: integer("business_entity_id"),
leadId: integer("lead_id"), // FK to leads.id - tracks original lead source
```

**Step 2: Add leadId to businessEntities table**

Find `businessEntities` table (around line 108) and add after `leadSource`:

```typescript
// After line 129: leadSource: text("lead_source"),
leadId: integer("lead_id"), // FK to leads.id - tracks conversion source
```

**Step 3: Add leadId and filing fields to serviceRequests table**

Find `serviceRequests` table (around line 177) and add after `assignedAgentId`:

```typescript
// After line 201: assignedAgentId: integer("assigned_agent_id"),
leadId: integer("lead_id"), // FK to leads.id - tracks original lead

// Filing status tracking
filingStage: text("filing_stage").default("not_filed"), // not_filed, filed, acknowledged, query_raised, response_submitted, under_processing, approved, rejected
filingDate: timestamp("filing_date"),
filingPortal: text("filing_portal"), // GST Portal, MCA, FSSAI, ITR, etc.
arnNumber: text("arn_number"), // Application Reference Number
queryDetails: text("query_details"),
queryRaisedAt: timestamp("query_raised_at"),
responseSubmittedAt: timestamp("response_submitted_at"),
finalStatus: text("final_status"), // approved, rejected
finalStatusDate: timestamp("final_status_date"),
certificateUrl: text("certificate_url"),
```

**Step 4: Add leadId to payments table**

Find `payments` table (around line 211) and add after `transactionId`:

```typescript
// After line 218: transactionId: text("transaction_id"),
leadId: integer("lead_id"), // FK to leads.id - tracks revenue attribution
```

**Step 5: Verify schema compiles**

Run: `npx tsc --noEmit shared/schema.ts`
Expected: No errors

**Step 6: Commit**

```bash
git add shared/schema.ts
git commit -m "feat(schema): add lead_id traceability and filing status fields"
```

---

## Task 2: Add case_notes Table to Schema

**Files:**
- Modify: `shared/schema.ts` (add after payments table, around line 225)

**Step 1: Add FILING_STAGES constant**

Add after the existing constants (around line 60):

```typescript
export const FILING_STAGES = {
  NOT_FILED: 'not_filed',
  FILED: 'filed',
  ACKNOWLEDGED: 'acknowledged',
  QUERY_RAISED: 'query_raised',
  RESPONSE_SUBMITTED: 'response_submitted',
  UNDER_PROCESSING: 'under_processing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
```

**Step 2: Add caseNotes table**

Add after the `payments` table definition:

```typescript
// Internal notes for ops team collaboration on cases
export const caseNotes = pgTable("case_notes", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  authorId: integer("author_id").notNull(),
  content: text("content").notNull(),
  isClientVisible: boolean("is_client_visible").default(false),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCaseNoteSchema = createInsertSchema(caseNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CaseNote = typeof caseNotes.$inferSelect;
export type InsertCaseNote = z.infer<typeof insertCaseNoteSchema>;
```

**Step 3: Verify schema compiles**

Run: `npx tsc --noEmit shared/schema.ts`
Expected: No errors

**Step 4: Commit**

```bash
git add shared/schema.ts
git commit -m "feat(schema): add case_notes table and FILING_STAGES constant"
```

---

## Task 3: Create Database Migration

**Files:**
- Create: `server/migrations/007_lead_traceability_and_case_notes.sql`

**Step 1: Write migration SQL**

```sql
-- Migration: Add lead traceability and case notes
-- Date: 2026-02-16

-- Add lead_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS lead_id INTEGER;

-- Add lead_id to business_entities table
ALTER TABLE business_entities ADD COLUMN IF NOT EXISTS lead_id INTEGER;

-- Add lead_id and filing status to service_requests table
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS lead_id INTEGER;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS filing_stage TEXT DEFAULT 'not_filed';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS filing_date TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS filing_portal TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS arn_number TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS query_details TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS query_raised_at TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS response_submitted_at TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS final_status TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS final_status_date TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- Add lead_id to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS lead_id INTEGER;

-- Create case_notes table
CREATE TABLE IF NOT EXISTS case_notes (
  id SERIAL PRIMARY KEY,
  service_request_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_client_visible BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_users_lead_id ON users(lead_id);
CREATE INDEX IF NOT EXISTS idx_business_entities_lead_id ON business_entities(lead_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_lead_id ON service_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_filing_stage ON service_requests(filing_stage);
CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_service_request_id ON case_notes(service_request_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_author_id ON case_notes(author_id);

-- Add foreign key constraints (if leads table exists)
-- Note: Using DO block for conditional FK creation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_lead_id
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
    ALTER TABLE business_entities ADD CONSTRAINT fk_business_entities_lead_id
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
    ALTER TABLE service_requests ADD CONSTRAINT fk_service_requests_lead_id
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
    ALTER TABLE payments ADD CONSTRAINT fk_payments_lead_id
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Constraints already exist
END $$;
```

**Step 2: Commit migration**

```bash
git add server/migrations/007_lead_traceability_and_case_notes.sql
git commit -m "feat(migration): add lead traceability columns and case_notes table"
```

---

## Task 4: Create Ops Case Routes

**Files:**
- Create: `server/ops-case-routes.ts`

**Step 1: Create the routes file**

```typescript
import { Router, Request, Response } from 'express';
import { db } from './db';
import { serviceRequests, businessEntities, leads, caseNotes, users, documents } from '@shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { requireAuth } from './auth-middleware';
import { requireRole } from './rbac-middleware';

const router = Router();

// Middleware: require ops role
const opsRoles = ['ops_executive', 'ops_manager', 'admin', 'super_admin'];

// GET /api/ops/cases/:id - Full case detail with lead attribution
router.get('/cases/:id', requireAuth, requireRole(opsRoles), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Try to find by numeric ID or readable ID (SR2600001)
    const isNumeric = /^\d+$/.test(id);

    const [caseData] = await db
      .select({
        // Service request fields
        id: serviceRequests.id,
        requestId: serviceRequests.requestId,
        status: serviceRequests.status,
        priority: serviceRequests.priority,
        serviceId: serviceRequests.serviceId,
        totalAmount: serviceRequests.totalAmount,
        progress: serviceRequests.progress,
        currentMilestone: serviceRequests.currentMilestone,
        slaDeadline: serviceRequests.slaDeadline,
        dueDate: serviceRequests.dueDate,
        expectedCompletion: serviceRequests.expectedCompletion,
        assignedTeamMember: serviceRequests.assignedTeamMember,
        clientNotes: serviceRequests.clientNotes,
        internalNotes: serviceRequests.internalNotes,
        createdAt: serviceRequests.createdAt,
        updatedAt: serviceRequests.updatedAt,
        // Filing status
        filingStage: serviceRequests.filingStage,
        filingDate: serviceRequests.filingDate,
        filingPortal: serviceRequests.filingPortal,
        arnNumber: serviceRequests.arnNumber,
        queryDetails: serviceRequests.queryDetails,
        queryRaisedAt: serviceRequests.queryRaisedAt,
        responseSubmittedAt: serviceRequests.responseSubmittedAt,
        finalStatus: serviceRequests.finalStatus,
        finalStatusDate: serviceRequests.finalStatusDate,
        certificateUrl: serviceRequests.certificateUrl,
        // Lead ID for attribution
        leadId: serviceRequests.leadId,
        // Business entity (client) info
        businessEntityId: serviceRequests.businessEntityId,
        clientId: businessEntities.clientId,
        clientName: businessEntities.name,
        clientGstin: businessEntities.gstin,
        clientPan: businessEntities.pan,
        clientEmail: businessEntities.contactEmail,
        clientPhone: businessEntities.contactPhone,
        entityType: businessEntities.entityType,
        // Lead info (via lead_id join)
        leadReadableId: leads.leadId,
        leadSource: leads.leadSource,
        leadAgentId: leads.agentId,
        leadCreatedAt: leads.createdAt,
        leadConvertedAt: leads.convertedAt,
      })
      .from(serviceRequests)
      .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
      .leftJoin(leads, eq(serviceRequests.leadId, leads.id))
      .where(
        isNumeric
          ? eq(serviceRequests.id, parseInt(id))
          : eq(serviceRequests.requestId, id)
      )
      .limit(1);

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(caseData);
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ error: 'Failed to fetch case details' });
  }
});

// GET /api/ops/cases/:id/notes - List notes for case
router.get('/cases/:id/notes', requireAuth, requireRole(opsRoles), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const serviceRequestId = parseInt(id);

    const notes = await db
      .select({
        id: caseNotes.id,
        content: caseNotes.content,
        isClientVisible: caseNotes.isClientVisible,
        createdAt: caseNotes.createdAt,
        authorId: caseNotes.authorId,
        authorName: users.fullName,
        authorRole: users.role,
      })
      .from(caseNotes)
      .leftJoin(users, eq(caseNotes.authorId, users.id))
      .where(
        and(
          eq(caseNotes.serviceRequestId, serviceRequestId),
          eq(caseNotes.isDeleted, false)
        )
      )
      .orderBy(desc(caseNotes.createdAt));

    res.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/ops/cases/:id/notes - Add note
router.post('/cases/:id/notes', requireAuth, requireRole(opsRoles), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, isClientVisible = false } = req.body;
    const authorId = (req as any).user?.id;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const [note] = await db
      .insert(caseNotes)
      .values({
        serviceRequestId: parseInt(id),
        authorId,
        content: content.trim(),
        isClientVisible,
      })
      .returning();

    res.status(201).json(note);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// PATCH /api/ops/cases/:id/filing - Update filing status
router.patch('/cases/:id/filing', requireAuth, requireRole(opsRoles), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      filingStage,
      filingDate,
      filingPortal,
      arnNumber,
      queryDetails,
      queryRaisedAt,
      responseSubmittedAt,
      finalStatus,
      finalStatusDate,
      certificateUrl,
    } = req.body;

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (filingStage !== undefined) updateData.filingStage = filingStage;
    if (filingDate !== undefined) updateData.filingDate = filingDate ? new Date(filingDate) : null;
    if (filingPortal !== undefined) updateData.filingPortal = filingPortal;
    if (arnNumber !== undefined) updateData.arnNumber = arnNumber;
    if (queryDetails !== undefined) updateData.queryDetails = queryDetails;
    if (queryRaisedAt !== undefined) updateData.queryRaisedAt = queryRaisedAt ? new Date(queryRaisedAt) : null;
    if (responseSubmittedAt !== undefined) updateData.responseSubmittedAt = responseSubmittedAt ? new Date(responseSubmittedAt) : null;
    if (finalStatus !== undefined) updateData.finalStatus = finalStatus;
    if (finalStatusDate !== undefined) updateData.finalStatusDate = finalStatusDate ? new Date(finalStatusDate) : null;
    if (certificateUrl !== undefined) updateData.certificateUrl = certificateUrl;

    const [updated] = await db
      .update(serviceRequests)
      .set(updateData)
      .where(eq(serviceRequests.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating filing status:', error);
    res.status(500).json({ error: 'Failed to update filing status' });
  }
});

export default router;
```

**Step 2: Register routes in main server**

In `server/index.ts` or `server/routes.ts`, add:

```typescript
import opsCaseRoutes from './ops-case-routes';
// ...
app.use('/api/ops', opsCaseRoutes);
```

**Step 3: Commit**

```bash
git add server/ops-case-routes.ts server/index.ts
git commit -m "feat(api): add ops case dashboard routes"
```

---

## Task 5: Create Ops Components Directory

**Files:**
- Create: `client/src/components/ops/index.ts`
- Create: `client/src/pages/ops/` directory

**Step 1: Create directories**

```bash
mkdir -p client/src/components/ops
mkdir -p client/src/pages/ops
```

**Step 2: Create index export file**

Create `client/src/components/ops/index.ts`:

```typescript
export { FilingStatusCard } from './FilingStatusCard';
export { DocumentsCard } from './DocumentsCard';
export { ClientInfoCard } from './ClientInfoCard';
export { SlaCard } from './SlaCard';
export { InternalNotesTab } from './InternalNotesTab';
export { CaseHeader } from './CaseHeader';
```

**Step 3: Commit**

```bash
git add client/src/components/ops client/src/pages/ops
git commit -m "chore: create ops components and pages directories"
```

---

## Task 6: Create FilingStatusCard Component

**Files:**
- Create: `client/src/components/ops/FilingStatusCard.tsx`

**Step 1: Create the component**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Check, AlertCircle, Clock, Send, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

const FILING_STAGES = [
  { value: 'not_filed', label: 'Not Filed', icon: FileText, color: 'text-gray-500' },
  { value: 'filed', label: 'Filed', icon: Send, color: 'text-blue-500' },
  { value: 'acknowledged', label: 'Acknowledged', icon: Check, color: 'text-blue-600' },
  { value: 'query_raised', label: 'Query Raised', icon: AlertCircle, color: 'text-orange-500' },
  { value: 'response_submitted', label: 'Response Submitted', icon: Send, color: 'text-purple-500' },
  { value: 'under_processing', label: 'Under Processing', icon: RefreshCw, color: 'text-indigo-500' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-green-500' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-500' },
];

interface FilingStatusCardProps {
  filingStage: string;
  filingDate?: string | null;
  filingPortal?: string | null;
  arnNumber?: string | null;
  queryDetails?: string | null;
  queryRaisedAt?: string | null;
  responseSubmittedAt?: string | null;
  finalStatus?: string | null;
  finalStatusDate?: string | null;
  onUpdate: (data: Record<string, any>) => void;
  isUpdating?: boolean;
}

export function FilingStatusCard({
  filingStage,
  filingDate,
  filingPortal,
  arnNumber,
  queryDetails,
  queryRaisedAt,
  responseSubmittedAt,
  finalStatus,
  finalStatusDate,
  onUpdate,
  isUpdating,
}: FilingStatusCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    filingStage,
    filingPortal: filingPortal || '',
    arnNumber: arnNumber || '',
    queryDetails: queryDetails || '',
  });

  const currentStageIndex = FILING_STAGES.findIndex(s => s.value === filingStage);

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Filing Status
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Filing Stage</Label>
              <Select
                value={editData.filingStage}
                onValueChange={(v) => setEditData({ ...editData, filingStage: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILING_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filing Portal</Label>
              <Input
                value={editData.filingPortal}
                onChange={(e) => setEditData({ ...editData, filingPortal: e.target.value })}
                placeholder="GST Portal, MCA, FSSAI..."
              />
            </div>
            <div className="space-y-2">
              <Label>ARN / Reference Number</Label>
              <Input
                value={editData.arnNumber}
                onChange={(e) => setEditData({ ...editData, arnNumber: e.target.value })}
                placeholder="Enter ARN or reference number"
              />
            </div>
            {editData.filingStage === 'query_raised' && (
              <div className="space-y-2">
                <Label>Query Details</Label>
                <Textarea
                  value={editData.queryDetails}
                  onChange={(e) => setEditData({ ...editData, queryDetails: e.target.value })}
                  placeholder="Describe the query raised..."
                  rows={3}
                />
              </div>
            )}
            <Button onClick={handleSave} disabled={isUpdating} className="w-full">
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {FILING_STAGES.map((stage, index) => {
              const Icon = stage.icon;
              const isComplete = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isPending = index > currentStageIndex;

              let dateInfo = null;
              if (stage.value === 'filed' && filingDate) dateInfo = formatDate(filingDate);
              if (stage.value === 'acknowledged' && arnNumber) dateInfo = `ARN: ${arnNumber}`;
              if (stage.value === 'query_raised' && queryRaisedAt) dateInfo = formatDate(queryRaisedAt);
              if (stage.value === 'response_submitted' && responseSubmittedAt) dateInfo = formatDate(responseSubmittedAt);
              if ((stage.value === 'approved' || stage.value === 'rejected') && finalStatusDate) {
                dateInfo = formatDate(finalStatusDate);
              }

              return (
                <div
                  key={stage.value}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isCurrent ? 'bg-blue-50 border border-blue-200' : ''
                  } ${isPending ? 'opacity-50' : ''}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isComplete ? 'bg-green-100' : isCurrent ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Icon className={`h-3 w-3 ${isCurrent ? stage.color : 'text-gray-400'}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isPending ? 'text-gray-400' : 'text-gray-900'}`}>
                      {stage.label}
                    </p>
                    {dateInfo && (
                      <p className="text-xs text-gray-500">{dateInfo}</p>
                    )}
                  </div>
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              );
            })}
            {filingPortal && (
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">Portal: {filingPortal}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/ops/FilingStatusCard.tsx
git commit -m "feat(ui): add FilingStatusCard component"
```

---

## Task 7: Create ClientInfoCard Component

**Files:**
- Create: `client/src/components/ops/ClientInfoCard.tsx`

**Step 1: Create the component**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, MapPin, Calendar, TrendingUp } from 'lucide-react';

interface ClientInfoCardProps {
  clientId: string;
  clientName: string;
  entityType?: string | null;
  gstin?: string | null;
  pan?: string | null;
  email?: string | null;
  phone?: string | null;
  // Lead attribution
  leadId?: string | null;
  leadSource?: string | null;
  leadCreatedAt?: string | null;
  leadConvertedAt?: string | null;
  agentName?: string | null;
}

export function ClientInfoCard({
  clientId,
  clientName,
  entityType,
  gstin,
  pan,
  email,
  phone,
  leadId,
  leadSource,
  leadCreatedAt,
  leadConvertedAt,
  agentName,
}: ClientInfoCardProps) {
  const formatDate = (date: string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatEntityType = (type: string | null | undefined) => {
    if (!type) return 'Unknown';
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Client Info
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {clientId}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Info */}
        <div>
          <h4 className="font-semibold text-gray-900">{clientName}</h4>
          <p className="text-sm text-gray-500">{formatEntityType(entityType)}</p>
        </div>

        {/* Tax IDs */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {gstin && (
            <div>
              <span className="text-gray-500">GSTIN:</span>
              <p className="font-mono text-xs">{gstin}</p>
            </div>
          )}
          {pan && (
            <div>
              <span className="text-gray-500">PAN:</span>
              <p className="font-mono text-xs">{pan}</p>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="space-y-1">
          {email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3 w-3 text-gray-400" />
              <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
                {email}
              </a>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3 w-3 text-gray-400" />
              <a href={`tel:${phone}`} className="text-blue-600 hover:underline">
                {phone}
              </a>
            </div>
          )}
        </div>

        {/* Lead Attribution */}
        {leadId && (
          <div className="pt-3 border-t space-y-2">
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Lead Attribution
            </h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Lead ID:</span>
                <p className="font-mono text-xs">{leadId}</p>
              </div>
              <div>
                <span className="text-gray-500">Source:</span>
                <p className="text-xs">
                  <Badge variant="secondary" className="text-xs">
                    {leadSource || 'Unknown'}
                  </Badge>
                </p>
              </div>
              {leadCreatedAt && (
                <div>
                  <span className="text-gray-500">Lead Date:</span>
                  <p className="text-xs">{formatDate(leadCreatedAt)}</p>
                </div>
              )}
              {leadConvertedAt && (
                <div>
                  <span className="text-gray-500">Converted:</span>
                  <p className="text-xs">{formatDate(leadConvertedAt)}</p>
                </div>
              )}
            </div>
            {agentName && (
              <div className="flex items-center gap-2 text-sm pt-1">
                <TrendingUp className="h-3 w-3 text-gray-400" />
                <span className="text-gray-500">Agent:</span>
                <span>{agentName}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/ops/ClientInfoCard.tsx
git commit -m "feat(ui): add ClientInfoCard component with lead attribution"
```

---

## Task 8: Create InternalNotesTab Component

**Files:**
- Create: `client/src/components/ops/InternalNotesTab.tsx`

**Step 1: Create the component**

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Note {
  id: number;
  content: string;
  isClientVisible: boolean;
  createdAt: string;
  authorId: number;
  authorName: string | null;
  authorRole: string | null;
}

interface InternalNotesTabProps {
  notes: Note[];
  onAddNote: (content: string, isClientVisible: boolean) => void;
  isAdding?: boolean;
}

export function InternalNotesTab({ notes, onAddNote, isAdding }: InternalNotesTabProps) {
  const [newNote, setNewNote] = useState('');
  const [isClientVisible, setIsClientVisible] = useState(false);

  const handleSubmit = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim(), isClientVisible);
      setNewNote('');
      setIsClientVisible(false);
    }
  };

  const formatRole = (role: string | null) => {
    if (!role) return '';
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an internal note..."
          rows={3}
          className="bg-white"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="clientVisible"
              checked={isClientVisible}
              onCheckedChange={(checked) => setIsClientVisible(checked === true)}
            />
            <Label htmlFor="clientVisible" className="text-sm text-gray-600 cursor-pointer">
              Make visible to client
            </Label>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!newNote.trim() || isAdding}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            {isAdding ? 'Adding...' : 'Add Note'}
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs">Add the first internal note above</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-white border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {note.authorName || `User #${note.authorId}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatRole(note.authorRole)} • {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {note.isClientVisible && (
                  <Badge variant="outline" className="text-xs">
                    Client Visible
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap pl-10">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/ops/InternalNotesTab.tsx
git commit -m "feat(ui): add InternalNotesTab component"
```

---

## Task 9: Create SlaCard Component

**Files:**
- Create: `client/src/components/ops/SlaCard.tsx`

**Step 1: Create the component**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { differenceInHours, differenceInMinutes, format } from 'date-fns';

interface SlaCardProps {
  slaDeadline?: string | null;
  dueDate?: string | null;
  status: string;
  onExtendSla?: () => void;
}

export function SlaCard({ slaDeadline, dueDate, status, onExtendSla }: SlaCardProps) {
  const deadline = slaDeadline || dueDate;

  const getSlaStatus = () => {
    if (!deadline) return { status: 'no_sla', label: 'No SLA', color: 'gray' };
    if (status === 'completed') return { status: 'completed', label: 'Completed', color: 'green' };

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursRemaining = differenceInHours(deadlineDate, now);

    if (hoursRemaining < 0) {
      return { status: 'breached', label: 'SLA Breached', color: 'red' };
    } else if (hoursRemaining <= 4) {
      return { status: 'critical', label: 'Critical', color: 'red' };
    } else if (hoursRemaining <= 24) {
      return { status: 'at_risk', label: 'At Risk', color: 'orange' };
    } else {
      return { status: 'on_track', label: 'On Track', color: 'green' };
    }
  };

  const getTimeRemaining = () => {
    if (!deadline) return null;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const totalMinutes = differenceInMinutes(deadlineDate, now);

    if (totalMinutes < 0) {
      const overdueMins = Math.abs(totalMinutes);
      const hours = Math.floor(overdueMins / 60);
      const mins = overdueMins % 60;
      return { text: `${hours}h ${mins}m overdue`, isOverdue: true };
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return { text: `${days}d ${remainingHours}h`, isOverdue: false };
    }

    return { text: `${hours}h ${mins}m`, isOverdue: false };
  };

  const slaStatus = getSlaStatus();
  const timeRemaining = getTimeRemaining();

  const StatusIcon = {
    no_sla: Clock,
    completed: CheckCircle,
    on_track: CheckCircle,
    at_risk: AlertTriangle,
    critical: AlertCircle,
    breached: AlertCircle,
  }[slaStatus.status] || Clock;

  const statusColors = {
    no_sla: 'bg-gray-100 text-gray-600',
    completed: 'bg-green-100 text-green-700',
    on_track: 'bg-green-100 text-green-700',
    at_risk: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
    breached: 'bg-red-100 text-red-700',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          SLA Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          {timeRemaining ? (
            <>
              <p className={`text-2xl font-bold ${timeRemaining.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {timeRemaining.text}
              </p>
              <p className="text-xs text-gray-500">
                {timeRemaining.isOverdue ? 'Overdue' : 'Remaining'}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">No SLA set</p>
          )}
        </div>

        <div className="flex justify-center">
          <Badge className={statusColors[slaStatus.status as keyof typeof statusColors]}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {slaStatus.label}
          </Badge>
        </div>

        {deadline && (
          <div className="text-center text-xs text-gray-500">
            Deadline: {format(new Date(deadline), 'dd MMM yyyy, h:mm a')}
          </div>
        )}

        {onExtendSla && slaStatus.status !== 'completed' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onExtendSla}
          >
            Extend SLA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/ops/SlaCard.tsx
git commit -m "feat(ui): add SlaCard component"
```

---

## Task 10: Create CaseDashboard Page

**Files:**
- Create: `client/src/pages/ops/CaseDashboard.tsx`

**Step 1: Create the page**

```typescript
import { useRoute, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/layouts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  ArrowLeft,
  FileText,
  Clock,
  MessageSquare,
  Settings,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  FilingStatusCard,
  ClientInfoCard,
  SlaCard,
  InternalNotesTab,
} from '@/components/ops';

export default function CaseDashboard() {
  const [, params] = useRoute('/ops/case/:id');
  const caseId = params?.id;
  const { toast } = useToast();

  // Fetch case details
  const { data: caseData, isLoading, error } = useQuery({
    queryKey: ['ops-case', caseId],
    queryFn: () => apiRequest('GET', `/api/ops/cases/${caseId}`),
    enabled: !!caseId,
  });

  // Fetch case notes
  const { data: notesData } = useQuery({
    queryKey: ['ops-case-notes', caseId],
    queryFn: () => apiRequest('GET', `/api/ops/cases/${caseId}/notes`),
    enabled: !!caseId,
  });

  // Update filing status mutation
  const updateFilingMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiRequest('PATCH', `/api/ops/cases/${caseId}/filing`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-case', caseId] });
      toast({ title: 'Filing status updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update filing status', variant: 'destructive' });
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: (data: { content: string; isClientVisible: boolean }) =>
      apiRequest('POST', `/api/ops/cases/${caseId}/notes`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-case-notes', caseId] });
      toast({ title: 'Note added' });
    },
    onError: () => {
      toast({ title: 'Failed to add note', variant: 'destructive' });
    },
  });

  // Update case status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest('PATCH', `/api/service-requests/${caseId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-case', caseId] });
      toast({ title: 'Status updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !caseData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-lg font-semibold">Case Not Found</h2>
          <Link href="/operations/work-queue">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Queue
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 -mx-4 -mt-4 px-4 lg:-mx-6 lg:px-6 mb-6">
        <div className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/operations/work-queue">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Queue
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">
                    Case #{caseData.requestId || caseData.id}
                  </h1>
                  <Badge className={getPriorityColor(caseData.priority)}>
                    {caseData.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {caseData.clientName} • {caseData.serviceId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={caseData.status}
                onValueChange={(v) => updateStatusMutation.mutate(v)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initiated">Initiated</SelectItem>
                  <SelectItem value="docs_uploaded">Docs Uploaded</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="qc_review">QC Review</SelectItem>
                  <SelectItem value="ready_for_sign">Ready for Sign</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <FilingStatusCard
          filingStage={caseData.filingStage || 'not_filed'}
          filingDate={caseData.filingDate}
          filingPortal={caseData.filingPortal}
          arnNumber={caseData.arnNumber}
          queryDetails={caseData.queryDetails}
          queryRaisedAt={caseData.queryRaisedAt}
          responseSubmittedAt={caseData.responseSubmittedAt}
          finalStatus={caseData.finalStatus}
          finalStatusDate={caseData.finalStatusDate}
          onUpdate={(data) => updateFilingMutation.mutate(data)}
          isUpdating={updateFilingMutation.isPending}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">--</p>
            <p className="text-xs text-gray-500">Uploaded</p>
            <Button variant="link" size="sm" className="px-0 mt-2">
              View Documents
            </Button>
          </CardContent>
        </Card>

        <ClientInfoCard
          clientId={caseData.clientId || `C${caseData.businessEntityId}`}
          clientName={caseData.clientName || 'Unknown Client'}
          entityType={caseData.entityType}
          gstin={caseData.clientGstin}
          pan={caseData.clientPan}
          email={caseData.clientEmail}
          phone={caseData.clientPhone}
          leadId={caseData.leadReadableId}
          leadSource={caseData.leadSource}
          leadCreatedAt={caseData.leadCreatedAt}
          leadConvertedAt={caseData.leadConvertedAt}
        />

        <SlaCard
          slaDeadline={caseData.slaDeadline}
          dueDate={caseData.dueDate}
          status={caseData.status}
        />
      </div>

      {/* Tabs */}
      <Card>
        <Tabs defaultValue="notes">
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="timeline">
                <Clock className="h-4 w-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="notes">
                <MessageSquare className="h-4 w-4 mr-2" />
                Internal Notes
              </TabsTrigger>
              <TabsTrigger value="actions">
                <Settings className="h-4 w-4 mr-2" />
                Actions
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="timeline" className="mt-0">
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Timeline coming soon</p>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <InternalNotesTab
                notes={notesData?.notes || []}
                onAddNote={(content, isClientVisible) =>
                  addNoteMutation.mutate({ content, isClientVisible })
                }
                isAdding={addNoteMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="actions" className="mt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Button variant="outline" className="justify-start">
                  Assign Team Member
                </Button>
                <Button variant="outline" className="justify-start">
                  Change Priority
                </Button>
                <Button variant="outline" className="justify-start">
                  Extend SLA
                </Button>
                <Button variant="outline" className="justify-start">
                  Request Documents
                </Button>
                <Button variant="outline" className="justify-start">
                  Escalate Case
                </Button>
                <Button variant="outline" className="justify-start text-red-600">
                  Put On Hold
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </DashboardLayout>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/pages/ops/CaseDashboard.tsx
git commit -m "feat(ui): add CaseDashboard page"
```

---

## Task 11: Update Component Exports and Add Route

**Files:**
- Modify: `client/src/components/ops/index.ts`
- Modify: `client/src/App.tsx` or router config

**Step 1: Update component exports**

Ensure `client/src/components/ops/index.ts` exports all components:

```typescript
export { FilingStatusCard } from './FilingStatusCard';
export { ClientInfoCard } from './ClientInfoCard';
export { SlaCard } from './SlaCard';
export { InternalNotesTab } from './InternalNotesTab';
```

**Step 2: Add route to App.tsx**

Find the router configuration and add:

```typescript
import CaseDashboard from '@/pages/ops/CaseDashboard';

// In routes array or Switch
<Route path="/ops/case/:id" component={CaseDashboard} />
```

**Step 3: Commit**

```bash
git add client/src/components/ops/index.ts client/src/App.tsx
git commit -m "feat(routes): add ops case dashboard route"
```

---

## Task 12: Update Lead Conversion Logic

**Files:**
- Modify: `server/leads-routes.ts`

**Step 1: Find the conversion endpoint**

Search for `POST /api/leads/:id/convert` or similar conversion logic.

**Step 2: Add lead_id propagation**

When creating user, business entity, and service requests, include `leadId`:

```typescript
// In the conversion handler, after fetching the lead:
const leadId = lead.id; // Numeric lead ID

// When creating user:
const user = await db.insert(users).values({
  // ...existing fields
  leadId, // ADD THIS
}).returning();

// When creating business entity:
const entity = await db.insert(businessEntities).values({
  // ...existing fields
  leadId, // ADD THIS
}).returning();

// When creating service request:
const serviceRequest = await db.insert(serviceRequests).values({
  // ...existing fields
  leadId, // ADD THIS
}).returning();
```

**Step 3: Commit**

```bash
git add server/leads-routes.ts
git commit -m "feat(leads): propagate lead_id through conversion flow"
```

---

## Task 13: Run Migration and Test

**Step 1: Run migration**

```bash
# If using drizzle-kit:
npx drizzle-kit push

# Or run SQL directly:
psql $DATABASE_URL < server/migrations/007_lead_traceability_and_case_notes.sql
```

**Step 2: Start dev server and test**

```bash
npm run dev
```

**Step 3: Test the case dashboard**

1. Navigate to `/ops/case/1` (or any valid case ID)
2. Verify all cards render
3. Test adding a note
4. Test updating filing status

**Step 4: Commit**

```bash
git add .
git commit -m "test: verify case dashboard implementation"
```

---

## Task 14: Add Client Dashboard API Routes

**Files:**
- Modify: `server/ops-case-routes.ts`

**Step 1: Add client detail endpoint**

Add to ops-case-routes.ts:

```typescript
// GET /api/ops/clients/:clientId - Full client detail with all work items
router.get('/clients/:clientId', requireAuth, requireRole(opsRoles), async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    // Fetch client (business entity)
    const [client] = await db
      .select()
      .from(businessEntities)
      .leftJoin(leads, eq(businessEntities.leadId, leads.id))
      .where(
        /^\d+$/.test(clientId)
          ? eq(businessEntities.id, parseInt(clientId))
          : eq(businessEntities.clientId, clientId)
      )
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Fetch all service requests for this client
    const workItems = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.businessEntityId, client.business_entities.id))
      .orderBy(desc(serviceRequests.createdAt));

    // Fetch unified timeline
    const timeline = await db
      .select()
      .from(clientActivities)
      .where(eq(clientActivities.clientId, client.business_entities.id))
      .orderBy(desc(clientActivities.createdAt))
      .limit(50);

    // Calculate summary stats
    const stats = {
      totalCases: workItems.length,
      activeCases: workItems.filter(w => !['completed', 'failed'].includes(w.status)).length,
      completedCases: workItems.filter(w => w.status === 'completed').length,
      totalRevenue: workItems.reduce((sum, w) => sum + (w.totalAmount || 0), 0),
    };

    res.json({
      client: client.business_entities,
      lead: client.leads,
      workItems,
      timeline,
      stats,
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Failed to fetch client details' });
  }
});

// GET /api/ops/clients/:clientId/timeline - Unified timeline
router.get('/clients/:clientId/timeline', requireAuth, requireRole(opsRoles), async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const timeline = await db
      .select()
      .from(clientActivities)
      .where(eq(clientActivities.clientId, parseInt(clientId)))
      .orderBy(desc(clientActivities.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    res.json({ timeline });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// POST /api/ops/clients/:clientId/activities - Log activity
router.post('/clients/:clientId/activities', requireAuth, requireRole(opsRoles), async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { activityType, title, description, serviceRequestId, isClientVisible, metadata } = req.body;
    const user = (req as any).user;

    const [activity] = await db
      .insert(clientActivities)
      .values({
        clientId: parseInt(clientId),
        serviceRequestId,
        activityType,
        title,
        description,
        performedBy: user?.id,
        performedByName: user?.fullName || user?.username,
        isClientVisible: isClientVisible || false,
        metadata,
      })
      .returning();

    res.status(201).json(activity);
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});
```

**Step 2: Commit**

```bash
git add server/ops-case-routes.ts
git commit -m "feat(api): add client dashboard routes with unified timeline"
```

---

## Task 15: Create WorkItemsTable Component

**Files:**
- Create: `client/src/components/ops/WorkItemsTable.tsx`

**Step 1: Create the component**

```typescript
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkItem {
  id: number;
  requestId: string;
  serviceId: string;
  status: string;
  priority: string;
  filingStage?: string;
  totalAmount?: number;
  slaDeadline?: string;
  createdAt: string;
}

interface WorkItemsTableProps {
  items: WorkItem[];
  showClientColumn?: boolean;
}

export function WorkItemsTable({ items, showClientColumn = false }: WorkItemsTableProps) {
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      initiated: 'bg-blue-100 text-blue-700',
      docs_uploaded: 'bg-purple-100 text-purple-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      qc_review: 'bg-orange-100 text-orange-700',
      completed: 'bg-green-100 text-green-700',
      on_hold: 'bg-gray-100 text-gray-700',
      failed: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-blue-500 text-white',
      low: 'bg-gray-500 text-white',
    };
    return colors[priority] || 'bg-gray-500 text-white';
  };

  const getSlaIndicator = (deadline?: string) => {
    if (!deadline) return null;
    const hours = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hours < 0) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (hours < 24) return <Clock className="h-4 w-4 text-orange-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const formatService = (serviceId: string) => {
    return serviceId
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Case ID</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Filing</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>SLA</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Created</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
              No work items found
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm">
                {item.requestId || `#${item.id}`}
              </TableCell>
              <TableCell>{formatService(item.serviceId)}</TableCell>
              <TableCell>
                <Badge className={getStatusBadge(item.status)}>
                  {item.status.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {(item.filingStage || 'not_filed').replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getPriorityBadge(item.priority)}>
                  {item.priority}
                </Badge>
              </TableCell>
              <TableCell>{getSlaIndicator(item.slaDeadline)}</TableCell>
              <TableCell>
                {item.totalAmount ? `₹${item.totalAmount.toLocaleString()}` : '-'}
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <Link href={`/ops/case/${item.id}`}>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/ops/WorkItemsTable.tsx
git commit -m "feat(ui): add WorkItemsTable component"
```

---

## Task 16: Create UnifiedTimeline Component

**Files:**
- Create: `client/src/components/ops/UnifiedTimeline.tsx`

**Step 1: Create the component**

```typescript
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  MessageSquare,
  Upload,
  CreditCard,
  UserPlus,
  Clock,
  AlertTriangle,
  CheckCircle,
  Send,
  Bell
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: number;
  activityType: string;
  title: string;
  description?: string;
  serviceRequestId?: number;
  performedByName?: string;
  isClientVisible?: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface UnifiedTimelineProps {
  activities: Activity[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const activityIcons: Record<string, any> = {
  status_change: Clock,
  note_added: MessageSquare,
  document_uploaded: Upload,
  document_requested: FileText,
  filing_update: Send,
  payment_received: CreditCard,
  payment_failed: AlertTriangle,
  assignment_change: UserPlus,
  sla_update: Clock,
  escalation: AlertTriangle,
  communication: Bell,
  case_created: FileText,
  case_completed: CheckCircle,
};

const activityColors: Record<string, string> = {
  status_change: 'bg-blue-100 text-blue-600',
  note_added: 'bg-purple-100 text-purple-600',
  document_uploaded: 'bg-green-100 text-green-600',
  document_requested: 'bg-yellow-100 text-yellow-600',
  filing_update: 'bg-indigo-100 text-indigo-600',
  payment_received: 'bg-green-100 text-green-600',
  payment_failed: 'bg-red-100 text-red-600',
  assignment_change: 'bg-cyan-100 text-cyan-600',
  sla_update: 'bg-orange-100 text-orange-600',
  escalation: 'bg-red-100 text-red-600',
  communication: 'bg-blue-100 text-blue-600',
  case_created: 'bg-blue-100 text-blue-600',
  case_completed: 'bg-green-100 text-green-600',
};

export function UnifiedTimeline({ activities, onLoadMore, hasMore }: UnifiedTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.activityType] || Clock;
        const colorClass = activityColors[activity.activityType] || 'bg-gray-100 text-gray-600';

        return (
          <div key={activity.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              {index < activities.length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-200 mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{activity.title}</p>
                  {activity.description && (
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                    {activity.performedByName && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{activity.performedByName}</span>
                      </>
                    )}
                    {activity.serviceRequestId && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <Badge variant="outline" className="text-xs">
                          Case #{activity.serviceRequestId}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                {activity.isClientVisible && (
                  <Badge variant="secondary" className="text-xs">
                    Client Visible
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Load more activities
        </button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/ops/UnifiedTimeline.tsx
git commit -m "feat(ui): add UnifiedTimeline component"
```

---

## Task 17: Create ClientDashboard Page

**Files:**
- Create: `client/src/pages/ops/ClientDashboard.tsx`

**Step 1: Create the page**

```typescript
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/layouts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import {
  ArrowLeft,
  Building2,
  FileText,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  Mail,
  Phone,
} from 'lucide-react';
import { WorkItemsTable } from '@/components/ops/WorkItemsTable';
import { UnifiedTimeline } from '@/components/ops/UnifiedTimeline';

export default function ClientDashboard() {
  const [, params] = useRoute('/ops/client/:clientId');
  const clientId = params?.clientId;

  const { data, isLoading, error } = useQuery({
    queryKey: ['ops-client', clientId],
    queryFn: () => apiRequest('GET', `/api/ops/clients/${clientId}`),
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-lg font-semibold">Client Not Found</h2>
          <Link href="/operations/work-queue">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Queue
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const { client, lead, workItems, timeline, stats } = data;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 -mx-4 -mt-4 px-4 lg:-mx-6 lg:px-6 mb-6">
        <div className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/operations/work-queue">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <h1 className="text-xl font-bold">{client.name}</h1>
                  <Badge variant="outline" className="font-mono">
                    {client.clientId}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  {client.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {client.contactEmail}
                    </span>
                  )}
                  {client.contactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {client.contactPhone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Edit Client
              </Button>
              <Button size="sm">
                New Service Request
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Cases</p>
                <p className="text-2xl font-bold">{stats.totalCases}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-blue-600">{stats.activeCases}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedCases}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Attribution */}
      {lead && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Lead Attribution</p>
                  <p className="text-xs text-blue-600">
                    Source: {lead.leadSource} • Lead ID: {lead.leadId}
                    {lead.convertedAt && ` • Converted: ${new Date(lead.convertedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-700">
                {lead.leadStage || 'Converted'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <Tabs defaultValue="cases">
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="cases">
                Work Items ({workItems.length})
              </TabsTrigger>
              <TabsTrigger value="timeline">
                Timeline
              </TabsTrigger>
              <TabsTrigger value="documents">
                Documents
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="cases" className="mt-0">
              <WorkItemsTable items={workItems} />
            </TabsContent>
            <TabsContent value="timeline" className="mt-0">
              <UnifiedTimeline activities={timeline} />
            </TabsContent>
            <TabsContent value="documents" className="mt-0">
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Documents view coming soon</p>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </DashboardLayout>
  );
}
```

**Step 2: Add route to App.tsx**

```typescript
import ClientDashboard from '@/pages/ops/ClientDashboard';

// Add route
<Route path="/ops/client/:clientId" component={ClientDashboard} />
```

**Step 3: Update component exports**

In `client/src/components/ops/index.ts`:

```typescript
export { FilingStatusCard } from './FilingStatusCard';
export { ClientInfoCard } from './ClientInfoCard';
export { SlaCard } from './SlaCard';
export { InternalNotesTab } from './InternalNotesTab';
export { WorkItemsTable } from './WorkItemsTable';
export { UnifiedTimeline } from './UnifiedTimeline';
```

**Step 4: Commit**

```bash
git add client/src/pages/ops/ClientDashboard.tsx client/src/components/ops/index.ts client/src/App.tsx
git commit -m "feat(ui): add ClientDashboard page with unified timeline"
```

---

## Task 18: Final Integration and Test

**Step 1: Update CaseDashboard to link to ClientDashboard**

In CaseDashboard.tsx, add link in ClientInfoCard area:

```typescript
<Link href={`/ops/client/${caseData.businessEntityId}`}>
  <Button variant="link" size="sm">View All Client Cases</Button>
</Link>
```

**Step 2: Run migration**

```bash
npx drizzle-kit push
# Or: psql $DATABASE_URL < server/migrations/007_lead_traceability_and_case_notes.sql
```

**Step 3: Test both dashboards**

1. Navigate to `/ops/client/1` - verify client dashboard loads
2. Click on a case - verify it opens case dashboard
3. From case dashboard, click "View All Client Cases" - verify it goes back to client dashboard
4. Test unified timeline
5. Test work items table

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete client + case dashboard integration"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 0 | Add client_activities table | shared/schema.ts |
| 1 | Add lead_id fields to schema | shared/schema.ts |
| 2 | Add case_notes table | shared/schema.ts |
| 3 | Create database migration | server/migrations/007_*.sql |
| 4 | Create Case API routes | server/ops-case-routes.ts |
| 5 | Create component directories | client/src/components/ops/, pages/ops/ |
| 6 | Create FilingStatusCard | components/ops/FilingStatusCard.tsx |
| 7 | Create ClientInfoCard | components/ops/ClientInfoCard.tsx |
| 8 | Create InternalNotesTab | components/ops/InternalNotesTab.tsx |
| 9 | Create SlaCard | components/ops/SlaCard.tsx |
| 10 | Create CaseDashboard page | pages/ops/CaseDashboard.tsx |
| 11 | Update exports and routes | index.ts, App.tsx |
| 12 | Update lead conversion | leads-routes.ts |
| 13 | Test case dashboard | - |
| 14 | Add Client API routes | server/ops-case-routes.ts |
| 15 | Create WorkItemsTable | components/ops/WorkItemsTable.tsx |
| 16 | Create UnifiedTimeline | components/ops/UnifiedTimeline.tsx |
| 17 | Create ClientDashboard | pages/ops/ClientDashboard.tsx |
| 18 | Final integration | - |

**Total estimated commits:** 18
