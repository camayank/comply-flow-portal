/**
 * UNIFIED WORK QUEUE & ESCALATION API ROUTES
 *
 * Provides complete visibility into all work items with:
 * - Real-time SLA status (on_track, at_risk, warning, breached)
 * - Escalation history and management
 * - Breach records with remediation tracking
 * - Immutable activity logs (SOC 2 compliant)
 * - Client-visible status updates
 */

import { Router } from 'express';
import { db } from './db';
import {
  escalationRules,
  escalationExecutions,
  slaBreachRecords,
  workItemQueue,
  workItemActivityLog,
  serviceRequests,
  users
} from '@shared/schema';
import { eq, and, desc, sql, gte, lte, isNull, or } from 'drizzle-orm';
import {
  autoEscalationEngine,
  getUnifiedWorkQueue,
  getSlaBreachReport,
  logWorkItemActivity,
  DEFAULT_ESCALATION_RULES,
  SlaStatus
} from './auto-escalation-engine';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from './rbac-middleware';

const router = Router();

// ============================================================================
// SECURITY: All work queue routes require authentication and ops role
// ============================================================================
router.use(sessionAuthMiddleware);
router.use(requireMinimumRole(USER_ROLES.OPS_EXECUTIVE));

// ============================================================================
// UNIFIED WORK QUEUE ENDPOINTS
// ============================================================================

/**
 * GET /api/work-queue
 * Get unified work queue with all work items
 * Supports filtering by SLA status, priority, assignee
 */
router.get('/', async (req, res) => {
  try {
    const {
      sla_status,
      priority,
      assigned_to,
      service_key,
      limit = 50,
      offset = 0
    } = req.query;

    const result = await getUnifiedWorkQueue({
      slaStatus: sla_status as SlaStatus | undefined,
      priority: priority as string | undefined,
      assignedTo: assigned_to ? parseInt(assigned_to as string) : undefined,
      serviceKey: service_key as string | undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching work queue:', error);
    res.status(500).json({ error: 'Failed to fetch work queue' });
  }
});

/**
 * GET /api/work-queue/stats
 * Get work queue statistics for dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await getUnifiedWorkQueue();
    res.json(result.stats);
  } catch (error) {
    console.error('Error fetching work queue stats:', error);
    res.status(500).json({ error: 'Failed to fetch work queue statistics' });
  }
});

/**
 * GET /api/work-queue/at-risk
 * Get items that are at risk or warning status
 */
router.get('/at-risk', async (req, res) => {
  try {
    const items = await db.select()
      .from(workItemQueue)
      .where(
        or(
          eq(workItemQueue.slaStatus, 'at_risk'),
          eq(workItemQueue.slaStatus, 'warning')
        )
      )
      .orderBy(
        sql`CASE WHEN ${workItemQueue.slaStatus} = 'warning' THEN 1 ELSE 2 END`,
        desc(workItemQueue.escalationLevel)
      );

    res.json({
      count: items.length,
      items,
      message: items.length > 0
        ? `${items.length} items need attention before SLA breach`
        : 'All items on track'
    });
  } catch (error) {
    console.error('Error fetching at-risk items:', error);
    res.status(500).json({ error: 'Failed to fetch at-risk items' });
  }
});

/**
 * GET /api/work-queue/breached
 * Get items that have breached SLA
 */
router.get('/breached', async (req, res) => {
  try {
    const items = await db.select()
      .from(workItemQueue)
      .where(eq(workItemQueue.slaStatus, 'breached'))
      .orderBy(desc(workItemQueue.ageHours));

    // Get breach records for additional context
    const breachIds = items.map(i => i.serviceRequestId).filter(Boolean);
    const breachRecords = breachIds.length > 0
      ? await db.select()
          .from(slaBreachRecords)
          .where(sql`${slaBreachRecords.serviceRequestId} IN (${breachIds.join(',')})`)
      : [];

    res.json({
      count: items.length,
      items,
      breachRecords,
      severity: {
        critical: items.filter(i => (i.ageHours || 0) > 72).length,
        major: items.filter(i => (i.ageHours || 0) > 48 && (i.ageHours || 0) <= 72).length,
        minor: items.filter(i => (i.ageHours || 0) <= 48).length
      }
    });
  } catch (error) {
    console.error('Error fetching breached items:', error);
    res.status(500).json({ error: 'Failed to fetch breached items' });
  }
});

/**
 * GET /api/work-queue/unassigned
 * Get items without an assignee
 */
router.get('/unassigned', async (req, res) => {
  try {
    const items = await db.select()
      .from(workItemQueue)
      .where(isNull(workItemQueue.assignedTo))
      .orderBy(
        sql`CASE WHEN ${workItemQueue.slaStatus} = 'breached' THEN 1
                 WHEN ${workItemQueue.slaStatus} = 'warning' THEN 2
                 WHEN ${workItemQueue.slaStatus} = 'at_risk' THEN 3
                 ELSE 4 END`,
        desc(workItemQueue.priority)
      );

    res.json({
      count: items.length,
      items,
      urgentCount: items.filter(i => i.slaStatus === 'breached' || i.slaStatus === 'warning').length
    });
  } catch (error) {
    console.error('Error fetching unassigned items:', error);
    res.status(500).json({ error: 'Failed to fetch unassigned items' });
  }
});

/**
 * GET /api/work-queue/:id
 * Get single work item with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const [item] = await db.select()
      .from(workItemQueue)
      .where(eq(workItemQueue.id, id));

    if (!item) {
      return res.status(404).json({ error: 'Work item not found' });
    }

    // Get activity log
    const activities = await autoEscalationEngine.getActivityLog(id);

    // Get escalation history if service request
    let escalations: any[] = [];
    if (item.serviceRequestId) {
      escalations = await autoEscalationEngine.getEscalationHistory(item.serviceRequestId);
    }

    res.json({
      item,
      activities,
      escalations
    });
  } catch (error) {
    console.error('Error fetching work item:', error);
    res.status(500).json({ error: 'Failed to fetch work item' });
  }
});

/**
 * PATCH /api/work-queue/:id/assign
 * Assign a work item to a user
 */
router.patch('/:id/assign', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { assignee_id, notes } = req.body;

    const [item] = await db.select()
      .from(workItemQueue)
      .where(eq(workItemQueue.id, id));

    if (!item) {
      return res.status(404).json({ error: 'Work item not found' });
    }

    // Get assignee details
    const [assignee] = await db.select()
      .from(users)
      .where(eq(users.id, assignee_id));

    if (!assignee) {
      return res.status(400).json({ error: 'Invalid assignee' });
    }

    const previousAssignee = item.assignedTo;

    // Update work item
    await db.update(workItemQueue)
      .set({
        assignedTo: assignee_id,
        assignedToName: assignee.fullName || assignee.email,
        assignedToRole: assignee.role,
        lastActivityAt: new Date()
      })
      .where(eq(workItemQueue.id, id));

    // Log activity
    await logWorkItemActivity({
      workItemQueueId: id,
      serviceRequestId: item.serviceRequestId,
      activityType: 'assignment',
      activityDescription: `Assigned to ${assignee.fullName || assignee.email}`,
      previousValue: { assignedTo: previousAssignee },
      newValue: { assignedTo: assignee_id, assigneeName: assignee.fullName },
      performedBy: (req as any).user?.id,
      triggerSource: 'api'
    });

    res.json({
      success: true,
      message: `Work item assigned to ${assignee.fullName || assignee.email}`
    });
  } catch (error) {
    console.error('Error assigning work item:', error);
    res.status(500).json({ error: 'Failed to assign work item' });
  }
});

// ============================================================================
// ESCALATION MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/work-queue/escalations/rules
 * Get all escalation rules
 */
router.get('/escalations/rules', async (req, res) => {
  try {
    const rules = await db.select()
      .from(escalationRules)
      .orderBy(desc(escalationRules.isActive), escalationRules.ruleName);

    res.json(rules);
  } catch (error) {
    console.error('Error fetching escalation rules:', error);
    res.status(500).json({ error: 'Failed to fetch escalation rules' });
  }
});

/**
 * POST /api/work-queue/escalations/rules
 * Create a new escalation rule
 */
router.post('/escalations/rules', async (req, res) => {
  try {
    const rule = req.body;

    const [created] = await db.insert(escalationRules)
      .values({
        ...rule,
        createdBy: (req as any).user?.id
      })
      .returning();

    res.json(created);
  } catch (error) {
    console.error('Error creating escalation rule:', error);
    res.status(500).json({ error: 'Failed to create escalation rule' });
  }
});

/**
 * PATCH /api/work-queue/escalations/rules/:id
 * Update an escalation rule
 */
router.patch('/escalations/rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;

    const [updated] = await db.update(escalationRules)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(escalationRules.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating escalation rule:', error);
    res.status(500).json({ error: 'Failed to update escalation rule' });
  }
});

/**
 * GET /api/work-queue/escalations/history
 * Get escalation execution history
 */
router.get('/escalations/history', async (req, res) => {
  try {
    const { service_request_id, from_date, to_date, limit = 100 } = req.query;

    let query = db.select({
      execution: escalationExecutions,
      ruleName: escalationRules.ruleName
    })
    .from(escalationExecutions)
    .leftJoin(escalationRules, eq(escalationExecutions.escalationRuleId, escalationRules.id));

    let conditions: any[] = [];

    if (service_request_id) {
      conditions.push(eq(escalationExecutions.serviceRequestId, parseInt(service_request_id as string)));
    }
    if (from_date) {
      conditions.push(gte(escalationExecutions.triggeredAt, new Date(from_date as string)));
    }
    if (to_date) {
      conditions.push(lte(escalationExecutions.triggeredAt, new Date(to_date as string)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(escalationExecutions.triggeredAt)).limit(parseInt(limit as string)) as any;

    const history = await query;

    res.json(history);
  } catch (error) {
    console.error('Error fetching escalation history:', error);
    res.status(500).json({ error: 'Failed to fetch escalation history' });
  }
});

/**
 * POST /api/work-queue/escalations/:id/acknowledge
 * Acknowledge an escalation
 */
router.post('/escalations/:id/acknowledge', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = (req as any).user?.id || 1;

    await db.update(escalationExecutions)
      .set({
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date()
      })
      .where(eq(escalationExecutions.id, id));

    res.json({ success: true, message: 'Escalation acknowledged' });
  } catch (error) {
    console.error('Error acknowledging escalation:', error);
    res.status(500).json({ error: 'Failed to acknowledge escalation' });
  }
});

/**
 * POST /api/work-queue/escalations/:id/resolve
 * Resolve an escalation
 */
router.post('/escalations/:id/resolve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { notes } = req.body;
    const userId = (req as any).user?.id || 1;

    await db.update(escalationExecutions)
      .set({
        resolved: true,
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNotes: notes
      })
      .where(eq(escalationExecutions.id, id));

    res.json({ success: true, message: 'Escalation resolved' });
  } catch (error) {
    console.error('Error resolving escalation:', error);
    res.status(500).json({ error: 'Failed to resolve escalation' });
  }
});

// ============================================================================
// SLA BREACH MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/work-queue/breaches
 * Get SLA breach records with filtering
 */
router.get('/breaches', async (req, res) => {
  try {
    const { severity, remediation_status, from_date, to_date, limit = 50 } = req.query;

    const breaches = await getSlaBreachReport({
      severity: severity as string | undefined,
      remediationStatus: remediation_status as string | undefined,
      fromDate: from_date ? new Date(from_date as string) : undefined,
      toDate: to_date ? new Date(to_date as string) : undefined,
      limit: parseInt(limit as string)
    });

    // Calculate summary stats
    const allBreaches = await db.select().from(slaBreachRecords);
    const stats = {
      total: allBreaches.length,
      pending: allBreaches.filter(b => b.remediationStatus === 'pending').length,
      inProgress: allBreaches.filter(b => b.remediationStatus === 'in_progress').length,
      completed: allBreaches.filter(b => b.remediationStatus === 'completed').length,
      bySeverity: {
        critical: allBreaches.filter(b => b.breachSeverity === 'critical').length,
        major: allBreaches.filter(b => b.breachSeverity === 'major').length,
        minor: allBreaches.filter(b => b.breachSeverity === 'minor').length
      }
    };

    res.json({ breaches, stats });
  } catch (error) {
    console.error('Error fetching breaches:', error);
    res.status(500).json({ error: 'Failed to fetch breach records' });
  }
});

/**
 * PATCH /api/work-queue/breaches/:id/remediation
 * Update breach remediation status
 */
router.patch('/breaches/:id/remediation', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      status,
      root_cause_category,
      root_cause_details,
      remediation_actions,
      client_notified
    } = req.body;

    await db.update(slaBreachRecords)
      .set({
        remediationStatus: status,
        rootCauseCategory: root_cause_category,
        rootCauseDetails: root_cause_details,
        remediationActions: remediation_actions ? JSON.stringify(remediation_actions) : undefined,
        clientNotified: client_notified,
        clientNotifiedAt: client_notified ? new Date() : undefined,
        updatedAt: new Date()
      })
      .where(eq(slaBreachRecords.id, id));

    res.json({ success: true, message: 'Breach remediation updated' });
  } catch (error) {
    console.error('Error updating breach remediation:', error);
    res.status(500).json({ error: 'Failed to update breach remediation' });
  }
});

// ============================================================================
// ACTIVITY LOG ENDPOINTS
// ============================================================================

/**
 * GET /api/work-queue/activity/:service_request_id
 * Get activity log for a service request
 */
router.get('/activity/:service_request_id', async (req, res) => {
  try {
    const serviceRequestId = parseInt(req.params.service_request_id);
    const { client_visible_only } = req.query;

    let query = db.select()
      .from(workItemActivityLog)
      .where(eq(workItemActivityLog.serviceRequestId, serviceRequestId));

    if (client_visible_only === 'true') {
      query = query.where(
        and(
          eq(workItemActivityLog.serviceRequestId, serviceRequestId),
          eq(workItemActivityLog.clientVisible, true)
        )
      ) as any;
    }

    const activities = await query.orderBy(desc(workItemActivityLog.occurredAt));

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

/**
 * POST /api/work-queue/activity
 * Add activity to a work item (manual note)
 */
router.post('/activity', async (req, res) => {
  try {
    const {
      work_item_queue_id,
      service_request_id,
      activity_type,
      activity_description,
      client_visible,
      client_message
    } = req.body;

    await logWorkItemActivity({
      workItemQueueId: work_item_queue_id,
      serviceRequestId: service_request_id,
      activityType: activity_type || 'note',
      activityDescription: activity_description,
      performedBy: (req as any).user?.id,
      triggerSource: 'api',
      clientVisible: client_visible || false,
      clientMessage: client_message
    });

    res.json({ success: true, message: 'Activity logged' });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// ============================================================================
// CLIENT-FACING ENDPOINTS (for client portal)
// ============================================================================

/**
 * GET /api/work-queue/client/:entity_id/status
 * Get client-visible status updates for all their services
 */
router.get('/client/:entity_id/status', async (req, res) => {
  try {
    const entityId = parseInt(req.params.entity_id);

    // Get all work items for this client
    const items = await db.select()
      .from(workItemQueue)
      .where(eq(workItemQueue.entityId, entityId))
      .orderBy(desc(workItemQueue.lastActivityAt));

    // Get client-visible activities for each item
    const itemsWithActivities = await Promise.all(
      items.map(async (item) => {
        let activities: any[] = [];
        if (item.serviceRequestId) {
          activities = await autoEscalationEngine.getClientVisibleActivity(item.serviceRequestId);
        }
        return {
          id: item.id,
          serviceType: item.serviceTypeName,
          period: item.periodLabel,
          status: item.clientStatusLabel || item.currentStatus,
          priority: item.priority,
          dueDate: item.dueDate,
          lastUpdate: item.lastActivityAt,
          recentActivities: activities.slice(0, 5) // Last 5 activities
        };
      })
    );

    res.json({
      entityId,
      totalServices: items.length,
      services: itemsWithActivities
    });
  } catch (error) {
    console.error('Error fetching client status:', error);
    res.status(500).json({ error: 'Failed to fetch client status' });
  }
});

// ============================================================================
// ENGINE CONTROL ENDPOINTS
// ============================================================================

/**
 * POST /api/work-queue/engine/start
 * Start the escalation engine
 */
router.post('/engine/start', async (req, res) => {
  try {
    const { interval_minutes = 15 } = req.body;
    await autoEscalationEngine.startProcessing(interval_minutes);
    res.json({ success: true, message: `Engine started with ${interval_minutes} minute interval` });
  } catch (error) {
    console.error('Error starting engine:', error);
    res.status(500).json({ error: 'Failed to start engine' });
  }
});

/**
 * POST /api/work-queue/engine/stop
 * Stop the escalation engine
 */
router.post('/engine/stop', async (req, res) => {
  try {
    await autoEscalationEngine.stopProcessing();
    res.json({ success: true, message: 'Engine stopped' });
  } catch (error) {
    console.error('Error stopping engine:', error);
    res.status(500).json({ error: 'Failed to stop engine' });
  }
});

/**
 * POST /api/work-queue/engine/process
 * Manually trigger processing cycle
 */
router.post('/engine/process', async (req, res) => {
  try {
    await autoEscalationEngine.processAllWorkItems();
    res.json({ success: true, message: 'Processing cycle completed' });
  } catch (error) {
    console.error('Error processing:', error);
    res.status(500).json({ error: 'Failed to process' });
  }
});

/**
 * POST /api/work-queue/escalations/seed-defaults
 * Seed default escalation rules
 */
router.post('/escalations/seed-defaults', async (req, res) => {
  try {
    let created = 0;
    for (const rule of DEFAULT_ESCALATION_RULES) {
      // Check if rule exists
      const existing = await db.select()
        .from(escalationRules)
        .where(eq(escalationRules.ruleKey, rule.ruleKey))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(escalationRules).values({
          ...rule,
          escalationTiers: JSON.stringify(rule.escalationTiers),
          createdBy: (req as any).user?.id
        });
        created++;
      }
    }

    res.json({
      success: true,
      message: `${created} default escalation rules created`,
      totalRules: DEFAULT_ESCALATION_RULES.length
    });
  } catch (error) {
    console.error('Error seeding default rules:', error);
    res.status(500).json({ error: 'Failed to seed default rules' });
  }
});

export default router;
