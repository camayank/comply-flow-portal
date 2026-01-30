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
  DEFAULT_ESCALATION_RULES
} from './auto-escalation-engine';
import { db } from './db';
import { escalationRules, escalationExecutions, slaBreachRecords, workItemQueue } from '@shared/schema';
import { eq, desc, and, sql, count } from 'drizzle-orm';

// Middleware chains
const requireOpsAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE)] as const;
const requireOpsManager = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_MANAGER)] as const;
const requireAdminAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN)] as const;

export function registerEscalationRoutes(app: Express) {
  console.log('📊 Registering Escalation routes...');

  // =============================================================================
  // WORK QUEUE ENDPOINTS
  // =============================================================================

  /**
   * Get unified work queue with filtering
   * The central view of all work items with SLA status
   */
  app.get('/api/escalation/work-queue', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  app.get('/api/escalation/work-queue/stats', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  app.post('/api/escalation/work-queue/refresh', ...requireOpsManager, async (req: AuthenticatedRequest, res: Response) => {
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

  // =============================================================================
  // SLA BREACH ENDPOINTS
  // =============================================================================

  /**
   * Get SLA breach records
   */
  app.get('/api/escalation/breaches', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  app.patch('/api/escalation/breaches/:breachId/remediation', ...requireOpsManager, async (req: AuthenticatedRequest, res: Response) => {
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
  app.get('/api/escalation/rules', ...requireOpsManager, async (req: AuthenticatedRequest, res: Response) => {
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
  app.post('/api/escalation/rules', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  app.patch('/api/escalation/rules/:ruleId/toggle', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  app.post('/api/escalation/rules/seed-defaults', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  app.get('/api/escalation/history/:serviceRequestId', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  app.get('/api/escalation/activity/:workItemId', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  app.get('/api/escalation/executions', ...requireOpsManager, async (req: AuthenticatedRequest, res: Response) => {
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
  app.get('/api/escalation/engine/status', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  app.post('/api/escalation/engine/start', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  app.post('/api/escalation/engine/stop', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  app.post('/api/escalation/engine/process', ...requireAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
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
