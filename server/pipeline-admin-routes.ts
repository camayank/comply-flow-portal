import { Router } from 'express';
import { db } from './db';
import { pipelineEvents, pipelineAutomationConfig, approvalRequests } from '@shared/pipeline-schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

const router = Router();

// GET /api/admin/pipeline/events — List recent events
router.get('/events', async (req, res) => {
  const { processed, limit = '50', offset = '0' } = req.query;
  let query = db.select().from(pipelineEvents).orderBy(desc(pipelineEvents.createdAt))
    .limit(Number(limit)).offset(Number(offset));

  if (processed !== undefined) {
    query = query.where(eq(pipelineEvents.processed, processed === 'true')) as any;
  }

  const events = await query;
  res.json({ ok: true, data: events });
});

// GET /api/admin/pipeline/events/:id — Event detail with handler results
router.get('/events/:id', async (req, res) => {
  const [event] = await db.select().from(pipelineEvents)
    .where(eq(pipelineEvents.id, Number(req.params.id))).limit(1);
  if (!event) return res.status(404).json({ ok: false, error: 'Event not found' });
  res.json({ ok: true, data: event });
});

// POST /api/admin/pipeline/events/:id/retry — Retry failed event
router.post('/events/:id/retry', async (req, res) => {
  await db.update(pipelineEvents).set({
    processed: false,
    retryCount: 0,
    error: null,
  }).where(eq(pipelineEvents.id, Number(req.params.id)));
  res.json({ ok: true, message: 'Event queued for retry' });
});

// GET /api/admin/pipeline/config — List automation config
router.get('/config', async (_req, res) => {
  const config = await db.select().from(pipelineAutomationConfig)
    .orderBy(asc(pipelineAutomationConfig.eventType));
  res.json({ ok: true, data: config });
});

// PATCH /api/admin/pipeline/config/:id — Update automation level
router.patch('/config/:id', async (req, res) => {
  const { automationLevel, gateApproverRole } = req.body;
  if (!['AUTO', 'GATED', 'MANUAL'].includes(automationLevel)) {
    return res.status(400).json({ ok: false, error: 'Invalid automation level' });
  }
  await db.update(pipelineAutomationConfig).set({
    automationLevel,
    gateApproverRole: gateApproverRole || null,
    updatedAt: new Date(),
  }).where(eq(pipelineAutomationConfig.id, Number(req.params.id)));
  res.json({ ok: true, message: 'Config updated' });
});

// GET /api/admin/pipeline/approvals — Pending approvals
router.get('/approvals', async (_req, res) => {
  const pending = await db.select().from(approvalRequests)
    .where(eq(approvalRequests.status, 'pending'))
    .orderBy(asc(approvalRequests.createdAt));
  res.json({ ok: true, data: pending });
});

// POST /api/admin/pipeline/approvals/:id/resolve — Approve/reject
router.post('/approvals/:id/resolve', async (req, res) => {
  const { decision, reason } = req.body;
  const userId = (req as any).user?.id;
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ ok: false, error: 'Invalid decision' });
  }

  await db.transaction(async (tx) => {
    await tx.update(approvalRequests).set({
      status: decision,
      approvedBy: userId,
      rejectionReason: decision === 'rejected' ? reason : null,
      resolvedAt: new Date(),
    }).where(eq(approvalRequests.id, Number(req.params.id)));

    if (decision === 'approved') {
      const [approval] = await tx.select().from(approvalRequests)
        .where(eq(approvalRequests.id, Number(req.params.id))).limit(1);
      if (approval?.pipelineEventId) {
        await tx.update(pipelineEvents).set({
          processed: false,
          retryCount: 0,
          error: null,
        }).where(eq(pipelineEvents.id, approval.pipelineEventId));
      }
    }
  });

  res.json({ ok: true, message: `Approval ${decision}` });
});

// GET /api/admin/pipeline/stats — Pipeline health dashboard
router.get('/stats', async (_req, res) => {
  const [stats] = await db.select({
    total: sql<number>`count(*)`,
    processed: sql<number>`count(*) filter (where processed = true)`,
    failed: sql<number>`count(*) filter (where error is not null and processed = false)`,
    deadLettered: sql<number>`count(*) filter (where retry_count >= max_retries)`,
  }).from(pipelineEvents);
  res.json({ ok: true, data: stats });
});

export default router;
