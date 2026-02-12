/**
 * Escalation Routes
 *
 * API endpoints for the Auto-Escalation Engine
 * Provides access to:
 * - Work queue management
 * - SLA breach records
 * - Escalation history
 * - Engine control (start/stop)
 */

import type { Express, Response } from "express";
import { Router } from "express";
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  type AuthenticatedRequest
} from './rbac-middleware';
import {
  autoEscalationEngine,
  initializeEscalationEngine,
  stopEscalationEngine,
  getUnifiedWorkQueue,
  getSlaBreachReport,
  SlaStatus,
  DEFAULT_ESCALATION_RULES,
  logWorkItemActivity
} from './auto-escalation-engine';
import { db } from './db';
import { escalationRules, escalationExecutions, slaBreachRecords, workItemQueue, users, serviceRequests, notifications, activityLogs } from '@shared/schema';
import { eq, desc, and, sql, count, inArray } from 'drizzle-orm';

// Middleware chains
const requireOpsAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE)] as const;
const requireOpsManager = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_MANAGER)] as const;
const requireAdminAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN)] as const;

export function registerEscalationRoutes(app: Express) {
  console.log('📊 Registering Escalation routes...');
  const router = Router();

  // =============================================================================
  // WORK QUEUE ENDPOINTS
  // =============================================================================

  /**
   * Get unified work queue with filtering
   * The central view of all work items with SLA status
   */
  router.get('/work-queue', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { slaStatus, priority, assignedTo, serviceKey, limit, offset } = req.query;

      const result = await getUnifiedWorkQueue({
        slaStatus: slaStatus as SlaStatus | undefined,
        priority: priority as string | undefined,
        assignedTo: assignedTo ? parseInt(assignedTo as string) : undefined,
        serviceKey: serviceKey as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error fetching work queue:', error);
      res.status(500).json({ error: 'Failed to fetch work queue' });
    }
  });

  /**
   * Get work queue dashboard stats
   */
  router.get('/work-queue/stats', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await getUnifiedWorkQueue({});
      res.json({
        stats: result.stats,
        criticalItems: result.items.filter(i =>
          i.slaStatus === SlaStatus.BREACHED || i.slaStatus === SlaStatus.WARNING
        ).length
      });
    } catch (error: any) {
      console.error('Error fetching work queue stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  /**
   * Trigger work queue refresh
   */
  router.post('/work-queue/refresh', ...requireOpsManager, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await autoEscalationEngine.refreshWorkQueue();
      const result = await getUnifiedWorkQueue({});
      res.json({
        success: true,
        message: 'Work queue refreshed',
        itemCount: result.stats.total
      });
    } catch (error: any) {
      console.error('Error refreshing work queue:', error);
      res.status(500).json({ error: 'Failed to refresh work queue' });
    }
  });

  /**
   * Get operations team members for assignment
   */
  router.get('/team-members', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allowedRoles = [
        USER_ROLES.OPS_MANAGER,
        USER_ROLES.OPS_EXECUTIVE,
        USER_ROLES.QC_EXECUTIVE,
        USER_ROLES.CUSTOMER_SERVICE,
      ];

      const members = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          username: users.username,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(and(inArray(users.role, allowedRoles), eq(users.isActive, true)))
        .orderBy(users.fullName, users.email);

      const memberIds = members.map((member) => member.id).filter((id) => id !== null && id !== undefined) as number[];

      const workloads = memberIds.length > 0
        ? await db
            .select({
              assigneeId: workItemQueue.assignedTo,
              count: count(),
            })
            .from(workItemQueue)
            .where(inArray(workItemQueue.assignedTo, memberIds))
            .groupBy(workItemQueue.assignedTo)
        : [];

      const workloadMap = new Map<number, number>();
      workloads.forEach((entry) => {
        if (entry.assigneeId !== null && entry.assigneeId !== undefined) {
          workloadMap.set(entry.assigneeId, Number(entry.count || 0));
        }
      });

      const maxCapacityByRole: Record<string, number> = {
        [USER_ROLES.OPS_MANAGER]: 12,
        [USER_ROLES.OPS_EXECUTIVE]: 10,
        [USER_ROLES.QC_EXECUTIVE]: 8,
        [USER_ROLES.CUSTOMER_SERVICE]: 8,
      };

      const payload = members.map((member) => {
        const activeWorkload = workloadMap.get(member.id) || 0;
        const maxCapacity = maxCapacityByRole[member.role] || 10;
        return {
          id: member.id,
          name: member.fullName || member.email || member.username || `User ${member.id}`,
          role: member.role,
          activeWorkload,
          maxCapacity,
          available: activeWorkload < maxCapacity,
        };
      });

      res.json(payload);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ error: 'Failed to fetch team members' });
    }
  });

  /**
   * Assign a work queue item to an operations team member
   */
  router.patch('/work-queue/:id/assign', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workItemId = parseInt(req.params.id);
      const rawAssignee = req.body.assigneeId ?? req.body.assignee_id ?? null;
      const notes = req.body.notes;

      const [item] = await db.select()
        .from(workItemQueue)
        .where(eq(workItemQueue.id, workItemId));

      if (!item) {
        return res.status(404).json({ error: 'Work item not found' });
      }

      const allowedRoles = new Set([
        USER_ROLES.OPS_MANAGER,
        USER_ROLES.OPS_EXECUTIVE,
        USER_ROLES.QC_EXECUTIVE,
        USER_ROLES.CUSTOMER_SERVICE,
      ]);

      const requesterRole = req.user?.role;
      const isManager =
        requesterRole === USER_ROLES.OPS_MANAGER ||
        requesterRole === USER_ROLES.ADMIN ||
        requesterRole === USER_ROLES.SUPER_ADMIN;

      if (!isManager) {
        if (requesterRole !== USER_ROLES.OPS_EXECUTIVE) {
          return res.status(403).json({ error: 'Insufficient permissions to assign work items' });
        }
        if (item.assignedTo && item.assignedTo !== req.user?.id) {
          return res.status(403).json({ error: 'Ops executives may only self-assign unassigned items' });
        }
      }

      let assigneeId: number | null = null;
      let assigneeName: string | null = null;
      let assigneeRole: string | null = null;

      if (rawAssignee !== null && rawAssignee !== undefined && rawAssignee !== '') {
        assigneeId = parseInt(String(rawAssignee), 10);
        if (Number.isNaN(assigneeId)) {
          return res.status(400).json({ error: 'Invalid assignee id' });
        }

        if (!isManager && assigneeId !== req.user?.id) {
          return res.status(403).json({ error: 'Ops executives may only assign work items to themselves' });
        }

        const [assignee] = await db
          .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            username: users.username,
            role: users.role,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.id, assigneeId));

        if (!assignee) {
          return res.status(400).json({ error: 'Assignee not found' });
        }

        if (!assignee.isActive) {
          return res.status(400).json({ error: 'Assignee is inactive' });
        }

        if (!allowedRoles.has(assignee.role)) {
          return res.status(400).json({ error: 'Assignee role not eligible for work queue items' });
        }

        assigneeName = assignee.fullName || assignee.email || assignee.username || `User ${assignee.id}`;
        assigneeRole = assignee.role;
      } else if (!isManager) {
        return res.status(403).json({ error: 'Ops executives may only assign work items to themselves' });
      }

      const previousAssignee = item.assignedTo;

      await db.update(workItemQueue)
        .set({
          assignedTo: assigneeId,
          assignedToName: assigneeName,
          assignedToRole: assigneeRole,
          lastActivityAt: new Date(),
        })
        .where(eq(workItemQueue.id, workItemId));

      if (item.serviceRequestId) {
        await db.update(serviceRequests)
          .set({
            assignedTeamMember: assigneeId,
            updatedAt: new Date(),
          })
          .where(eq(serviceRequests.id, item.serviceRequestId));

        await db.insert(activityLogs).values({
          userId: req.user?.id,
          serviceRequestId: item.serviceRequestId,
          action: 'assignment',
          entityType: 'service_request',
          entityId: item.serviceRequestId,
          details: assigneeName ? 'Assigned to operations team member' : 'Unassigned from operations team',
          metadata: {
            assigneeId,
            assigneeName,
            workItemId: workItemId
          },
          createdAt: new Date()
        });
      }

      await logWorkItemActivity({
        workItemQueueId: workItemId,
        serviceRequestId: item.serviceRequestId ?? undefined,
        activityType: 'assignment',
        activityDescription: assigneeName
          ? `Assigned to ${assigneeName}${notes ? ` (${notes})` : ''}`
          : `Unassigned${notes ? ` (${notes})` : ''}`,
        previousValue: { assignedTo: previousAssignee },
        newValue: { assignedTo: assigneeId, assigneeName },
        performedBy: req.user?.id,
        performedByName: req.user?.username,
        performedByRole: req.user?.role,
        triggerSource: 'ops_assignment'
      });

      if (assigneeId && assigneeName) {
        await db.insert(notifications).values({
          userId: assigneeId,
          title: 'New Work Item Assigned',
          message: `You have been assigned ${item.serviceTypeName || item.workItemType} for ${item.entityName || 'a client'}.`,
          type: 'task_assignment',
          category: 'service',
          priority: item.priority?.toLowerCase() === 'urgent' ? 'urgent' : 'normal',
          actionUrl: item.serviceRequestId ? `/ops/service-requests/${item.serviceRequestId}` : undefined,
          actionText: item.serviceRequestId ? 'View Service Request' : 'View Work Item',
          createdAt: new Date()
        });
      }

      res.json({
        success: true,
        message: assigneeName ? `Assigned to ${assigneeName}` : 'Work item unassigned'
      });
    } catch (error: any) {
      console.error('Error assigning work item:', error);
      res.status(500).json({ error: 'Failed to assign work item' });
    }
  });

  // =============================================================================
  // SLA BREACH ENDPOINTS
  // =============================================================================

  /**
   * Get SLA breach records
   */
  router.get('/breaches', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { severity, remediationStatus, fromDate, toDate, limit } = req.query;

      const breaches = await getSlaBreachReport({
        severity: severity as string | undefined,
        remediationStatus: remediationStatus as string | undefined,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 100
      });

      // Get summary stats
      const [stats] = await db.select({
        total: count(),
        critical: sql<number>`SUM(CASE WHEN ${slaBreachRecords.breachSeverity} = 'critical' THEN 1 ELSE 0 END)`,
        major: sql<number>`SUM(CASE WHEN ${slaBreachRecords.breachSeverity} = 'major' THEN 1 ELSE 0 END)`,
        minor: sql<number>`SUM(CASE WHEN ${slaBreachRecords.breachSeverity} = 'minor' THEN 1 ELSE 0 END)`,
        pendingRemediation: sql<number>`SUM(CASE WHEN ${slaBreachRecords.remediationStatus} = 'pending' THEN 1 ELSE 0 END)`
      }).from(slaBreachRecords);

      res.json({
        breaches,
        stats: {
          total: stats?.total || 0,
          critical: stats?.critical || 0,
          major: stats?.major || 0,
          minor: stats?.minor || 0,
          pendingRemediation: stats?.pendingRemediation || 0
        }
      });
    } catch (error: any) {
      console.error('Error fetching breach records:', error);
      res.status(500).json({ error: 'Failed to fetch breach records' });
    }
  });

  /**
   * Update breach remediation status
   */
  router.patch('/breaches/:breachId/remediation', ...requireOpsManager, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { breachId } = req.params;
      const { status, notes, remediatedBy } = req.body;

      await db.update(slaBreachRecords)
        .set({
          remediationStatus: status,
          remediationNotes: notes,
          remediatedBy: remediatedBy || req.user?.username,
          remediatedAt: status === 'resolved' ? new Date() : undefined
        })
        .where(eq(slaBreachRecords.id, parseInt(breachId)));

      res.json({
        success: true,
        message: `Breach remediation status updated to ${status}`
      });
    } catch (error: any) {
      console.error('Error updating breach remediation:', error);
      res.status(500).json({ error: 'Failed to update remediation status' });
    }
  });

  // =============================================================================
  // ESCALATION RULES ENDPOINTS
  // =============================================================================

  /**
   * Get all escalation rules
   */
  router.get('/rules', ...requireOpsManager, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rules = await db.select()
        .from(escalationRules)
        .orderBy(escalationRules.ruleKey);

      res.json({ rules });
    } catch (error: any) {
      console.error('Error fetching escalation rules:', error);
      res.status(500).json({ error: 'Failed to fetch rules' });
    }
  });

  /**
   * Create or update escalation rule
   */
  router.post('/rules', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        ruleKey,
        ruleName,
        triggerType,
        triggerHours,
        serviceKey,
        statusCode,
        priority,
        escalationTiers,
        autoReassign,
        reassignToRole,
        notifyClient,
        isActive
      } = req.body;

      // Check if rule exists
      const [existing] = await db.select()
        .from(escalationRules)
        .where(eq(escalationRules.ruleKey, ruleKey))
        .limit(1);

      if (existing) {
        // Update
        await db.update(escalationRules)
          .set({
            ruleName,
            triggerType,
            triggerHours,
            serviceKey,
            statusCode,
            priority,
            escalationTiers,
            autoReassign,
            reassignToRole,
            notifyClient,
            isActive,
            updatedAt: new Date()
          })
          .where(eq(escalationRules.ruleKey, ruleKey));

        res.json({ success: true, message: 'Rule updated', ruleKey });
      } else {
        // Insert
        await db.insert(escalationRules).values({
          ruleKey,
          ruleName,
          triggerType,
          triggerHours,
          serviceKey,
          statusCode,
          priority,
          escalationTiers,
          autoReassign,
          reassignToRole,
          notifyClient,
          isActive
        });

        res.status(201).json({ success: true, message: 'Rule created', ruleKey });
      }
    } catch (error: any) {
      console.error('Error creating/updating rule:', error);
      res.status(500).json({ error: 'Failed to save rule' });
    }
  });

  /**
   * Toggle rule active status
   */
  router.patch('/rules/:ruleId/toggle', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ruleId } = req.params;
      const { isActive } = req.body;

      await db.update(escalationRules)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(escalationRules.id, parseInt(ruleId)));

      res.json({
        success: true,
        message: `Rule ${isActive ? 'activated' : 'deactivated'}`
      });
    } catch (error: any) {
      console.error('Error toggling rule:', error);
      res.status(500).json({ error: 'Failed to toggle rule' });
    }
  });

  /**
   * Seed default escalation rules
   */
  router.post('/rules/seed-defaults', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      let created = 0;
      let skipped = 0;

      for (const rule of DEFAULT_ESCALATION_RULES) {
        const [existing] = await db.select()
          .from(escalationRules)
          .where(eq(escalationRules.ruleKey, rule.ruleKey))
          .limit(1);

        if (!existing) {
          await db.insert(escalationRules).values(rule);
          created++;
        } else {
          skipped++;
        }
      }

      res.json({
        success: true,
        message: `Seeded ${created} rules (${skipped} already existed)`,
        created,
        skipped
      });
    } catch (error: any) {
      console.error('Error seeding rules:', error);
      res.status(500).json({ error: 'Failed to seed rules' });
    }
  });

  // =============================================================================
  // ESCALATION HISTORY ENDPOINTS
  // =============================================================================

  /**
   * Get escalation history for a service request
   */
  router.get('/history/:serviceRequestId', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { serviceRequestId } = req.params;

      const history = await autoEscalationEngine.getEscalationHistory(parseInt(serviceRequestId));

      res.json({ history });
    } catch (error: any) {
      console.error('Error fetching escalation history:', error);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  /**
   * Get activity log for a work item
   */
  router.get('/activity/:workItemId', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { workItemId } = req.params;

      const activity = await autoEscalationEngine.getActivityLog(parseInt(workItemId));

      res.json({ activity });
    } catch (error: any) {
      console.error('Error fetching activity log:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

  /**
   * Get recent escalation executions
   */
  router.get('/executions', ...requireOpsManager, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = '50' } = req.query;

      const executions = await db.select()
        .from(escalationExecutions)
        .orderBy(desc(escalationExecutions.triggeredAt))
        .limit(parseInt(limit as string));

      res.json({ executions });
    } catch (error: any) {
      console.error('Error fetching executions:', error);
      res.status(500).json({ error: 'Failed to fetch executions' });
    }
  });

  // =============================================================================
  // ENGINE CONTROL ENDPOINTS (Admin only)
  // =============================================================================

  /**
   * Get engine status
   */
  router.get('/engine/status', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if engine is running by looking at processing interval
      const isRunning = (autoEscalationEngine as any).processingInterval !== null;

      res.json({
        status: isRunning ? 'running' : 'stopped',
        message: isRunning ? 'Escalation engine is running' : 'Escalation engine is stopped'
      });
    } catch (error: any) {
      console.error('Error getting engine status:', error);
      res.status(500).json({ error: 'Failed to get engine status' });
    }
  });

  /**
   * Start the escalation engine
   */
  router.post('/engine/start', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { intervalMinutes = 15 } = req.body;

      await initializeEscalationEngine(intervalMinutes);

      res.json({
        success: true,
        message: `Escalation engine started (checking every ${intervalMinutes} minutes)`
      });
    } catch (error: any) {
      console.error('Error starting engine:', error);
      res.status(500).json({ error: 'Failed to start engine' });
    }
  });

  /**
   * Stop the escalation engine
   */
  router.post('/engine/stop', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await stopEscalationEngine();

      res.json({
        success: true,
        message: 'Escalation engine stopped'
      });
    } catch (error: any) {
      console.error('Error stopping engine:', error);
      res.status(500).json({ error: 'Failed to stop engine' });
    }
  });

  /**
   * Trigger manual processing
   */
  router.post('/engine/process', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await autoEscalationEngine.processAllWorkItems();

      const result = await getUnifiedWorkQueue({});

      res.json({
        success: true,
        message: 'Manual processing completed',
        stats: result.stats
      });
    } catch (error: any) {
      console.error('Error in manual processing:', error);
      res.status(500).json({ error: 'Failed to process' });
    }
  });

  const mountPaths = ['/api/escalation', '/api/v1/escalation', '/api/v2/escalation'];
  mountPaths.forEach((path) => app.use(path, router));

  console.log('✅ Escalation routes registered');
}

/**
 * Initialize the escalation engine on server startup
 */
export async function initializeEscalationOnStartup(): Promise<void> {
  try {
    // Seed default rules if they don't exist
    for (const rule of DEFAULT_ESCALATION_RULES) {
      const [existing] = await db.select()
        .from(escalationRules)
        .where(eq(escalationRules.ruleKey, rule.ruleKey))
        .limit(1);

      if (!existing) {
        await db.insert(escalationRules).values(rule);
        console.log(`📝 Seeded escalation rule: ${rule.ruleKey}`);
      }
    }

    // Start the engine with 15-minute intervals
    await initializeEscalationEngine(15);
    console.log('🚀 Auto-escalation engine initialized on startup');
  } catch (error) {
    console.error('⚠️ Failed to initialize escalation engine:', error);
    // Don't fail server startup - escalation can be started manually
  }
}
