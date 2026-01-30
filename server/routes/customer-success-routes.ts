/**
 * Customer Success Routes
 *
 * API endpoints for managing customer success features:
 * - Health Scores - Customer health tracking
 * - Success Playbooks - Guided customer journeys
 * - Playbook Executions - Active playbook instances
 * - Renewal Opportunities - Contract renewal tracking
 * - AI Recommendations - Smart suggestions
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  customerHealthScoresV2,
  successPlaybooks,
  playbookExecutions,
  renewalOpportunities,
  aiRecommendations,
} from '../../shared/enterprise-schema';
import { users } from '../../shared/schema';
import { eq, and, desc, asc, sql, gte, lte, count, avg } from 'drizzle-orm';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from '../rbac-middleware';
import { logger } from '../logger';

const router = Router();

// All routes require authentication
router.use(sessionAuthMiddleware);

// ============================================================================
// HEALTH SCORES
// ============================================================================

/**
 * GET /api/customer-success/health-scores
 * Get all customer health scores for the tenant
 */
router.get('/health-scores', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { riskLevel, limit = '50', offset = '0' } = req.query;

    const conditions = [];

    if (riskLevel) {
      conditions.push(eq(customerHealthScoresV2.riskLevel, riskLevel as string));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const healthScores = await db.select({
      id: customerHealthScoresV2.id,
      clientId: customerHealthScoresV2.clientId,
      overallScore: customerHealthScoresV2.overallScore,
      engagementScore: customerHealthScoresV2.engagementScore,
      complianceScore: customerHealthScoresV2.complianceScore,
      paymentScore: customerHealthScoresV2.paymentScore,
      supportScore: customerHealthScoresV2.supportScore,
      productUsageScore: customerHealthScoresV2.productUsageScore,
      trend: customerHealthScoresV2.trend,
      riskLevel: customerHealthScoresV2.riskLevel,
      factors: customerHealthScoresV2.factors,
      recommendations: customerHealthScoresV2.recommendations,
      calculatedAt: customerHealthScoresV2.calculatedAt,
      clientName: users.name,
      clientEmail: users.email,
    })
      .from(customerHealthScoresV2)
      .leftJoin(users, eq(customerHealthScoresV2.clientId, users.id))
      .where(whereClause)
      .orderBy(asc(customerHealthScoresV2.overallScore))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get summary stats
    const summary = await db.select({
      total: count(),
      avgScore: avg(customerHealthScoresV2.overallScore),
    })
      .from(customerHealthScoresV2)
      .where(whereClause);

    // Count by risk level
    const riskCounts = await db.select({
      riskLevel: customerHealthScoresV2.riskLevel,
      count: count(),
    })
      .from(customerHealthScoresV2)
      .groupBy(customerHealthScoresV2.riskLevel);

    res.json({
      healthScores,
      summary: {
        total: summary[0]?.total || 0,
        avgScore: summary[0]?.avgScore || 0,
        byRiskLevel: riskCounts.reduce((acc, r) => {
          acc[r.riskLevel || 'unknown'] = r.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    logger.error('Error fetching health scores:', error);
    res.status(500).json({ error: 'Failed to fetch health scores' });
  }
});

/**
 * GET /api/customer-success/health-scores/:clientId
 * Get health score for a specific client
 */
router.get('/health-scores/:clientId', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const [healthScore] = await db.select({
      id: customerHealthScoresV2.id,
      clientId: customerHealthScoresV2.clientId,
      overallScore: customerHealthScoresV2.overallScore,
      engagementScore: customerHealthScoresV2.engagementScore,
      complianceScore: customerHealthScoresV2.complianceScore,
      paymentScore: customerHealthScoresV2.paymentScore,
      supportScore: customerHealthScoresV2.supportScore,
      productUsageScore: customerHealthScoresV2.productUsageScore,
      trend: customerHealthScoresV2.trend,
      riskLevel: customerHealthScoresV2.riskLevel,
      factors: customerHealthScoresV2.factors,
      recommendations: customerHealthScoresV2.recommendations,
      calculatedAt: customerHealthScoresV2.calculatedAt,
      clientName: users.name,
      clientEmail: users.email,
    })
      .from(customerHealthScoresV2)
      .leftJoin(users, eq(customerHealthScoresV2.clientId, users.id))
      .where(eq(customerHealthScoresV2.clientId, parseInt(clientId)))
      .orderBy(desc(customerHealthScoresV2.calculatedAt))
      .limit(1);

    if (!healthScore) {
      return res.status(404).json({ error: 'Health score not found' });
    }

    res.json({ healthScore });
  } catch (error) {
    logger.error('Error fetching health score:', error);
    res.status(500).json({ error: 'Failed to fetch health score' });
  }
});

/**
 * POST /api/customer-success/health-scores/recalculate
 * Trigger recalculation of health scores
 */
router.post('/health-scores/recalculate', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    // This would trigger a background job to recalculate health scores
    // For now, we return a success message
    res.json({
      message: 'Health score recalculation triggered',
      status: 'processing',
    });
  } catch (error) {
    logger.error('Error triggering health score recalculation:', error);
    res.status(500).json({ error: 'Failed to trigger health score recalculation' });
  }
});

// ============================================================================
// SUCCESS PLAYBOOKS
// ============================================================================

/**
 * GET /api/customer-success/playbooks
 * Get all playbook templates
 */
router.get('/playbooks', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { isActive } = req.query;

    const conditions = [];

    if (user.tenantId) {
      conditions.push(eq(successPlaybooks.tenantId, user.tenantId));
    }

    if (isActive !== undefined) {
      conditions.push(eq(successPlaybooks.isActive, isActive === 'true'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const playbooks = await db.select()
      .from(successPlaybooks)
      .where(whereClause)
      .orderBy(desc(successPlaybooks.createdAt));

    // Get execution counts for each playbook
    const playbooksWithStats = await Promise.all(
      playbooks.map(async (playbook) => {
        const [stats] = await db.select({
          activeExecutions: count(),
        })
          .from(playbookExecutions)
          .where(and(
            eq(playbookExecutions.playbookId, playbook.id),
            eq(playbookExecutions.status, 'active')
          ));

        const [completedStats] = await db.select({
          completedExecutions: count(),
        })
          .from(playbookExecutions)
          .where(and(
            eq(playbookExecutions.playbookId, playbook.id),
            eq(playbookExecutions.status, 'completed')
          ));

        return {
          ...playbook,
          activeExecutions: stats?.activeExecutions || 0,
          completedExecutions: completedStats?.completedExecutions || 0,
        };
      })
    );

    // Summary
    const summary = {
      total: playbooks.length,
      active: playbooks.filter(p => p.isActive).length,
      totalActiveExecutions: playbooksWithStats.reduce((sum, p) => sum + (p.activeExecutions || 0), 0),
      totalCompletedExecutions: playbooksWithStats.reduce((sum, p) => sum + (p.completedExecutions || 0), 0),
    };

    res.json({ playbooks: playbooksWithStats, summary });
  } catch (error) {
    logger.error('Error fetching playbooks:', error);
    res.status(500).json({ error: 'Failed to fetch playbooks' });
  }
});

/**
 * GET /api/customer-success/playbooks/:id
 * Get a specific playbook with its executions
 */
router.get('/playbooks/:id', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [playbook] = await db.select()
      .from(successPlaybooks)
      .where(eq(successPlaybooks.id, parseInt(id)));

    if (!playbook) {
      return res.status(404).json({ error: 'Playbook not found' });
    }

    // Get active executions
    const executions = await db.select({
      id: playbookExecutions.id,
      playbookId: playbookExecutions.playbookId,
      clientId: playbookExecutions.clientId,
      currentStage: playbookExecutions.currentStage,
      stageProgress: playbookExecutions.stageProgress,
      status: playbookExecutions.status,
      assignedTo: playbookExecutions.assignedTo,
      startedAt: playbookExecutions.startedAt,
      completedAt: playbookExecutions.completedAt,
      clientName: users.name,
    })
      .from(playbookExecutions)
      .leftJoin(users, eq(playbookExecutions.clientId, users.id))
      .where(eq(playbookExecutions.playbookId, parseInt(id)))
      .orderBy(desc(playbookExecutions.startedAt));

    res.json({ playbook, executions });
  } catch (error) {
    logger.error('Error fetching playbook:', error);
    res.status(500).json({ error: 'Failed to fetch playbook' });
  }
});

/**
 * POST /api/customer-success/playbooks
 * Create a new playbook
 */
router.post('/playbooks', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, description, triggerType, triggerConditions, stages, isActive = true } = req.body;

    if (!name || !triggerType || !stages) {
      return res.status(400).json({ error: 'Name, trigger type, and stages are required' });
    }

    const [playbook] = await db.insert(successPlaybooks)
      .values({
        tenantId: user.tenantId || null,
        name,
        description,
        triggerType,
        triggerConditions: triggerConditions || {},
        stages,
        isActive,
        createdBy: user.id,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({
      message: 'Playbook created successfully',
      playbook,
    });
  } catch (error) {
    logger.error('Error creating playbook:', error);
    res.status(500).json({ error: 'Failed to create playbook' });
  }
});

/**
 * PATCH /api/customer-success/playbooks/:id
 * Update a playbook
 */
router.patch('/playbooks/:id', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, triggerType, triggerConditions, stages, isActive } = req.body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (triggerType !== undefined) updates.triggerType = triggerType;
    if (triggerConditions !== undefined) updates.triggerConditions = triggerConditions;
    if (stages !== undefined) updates.stages = stages;
    if (isActive !== undefined) updates.isActive = isActive;

    const [playbook] = await db.update(successPlaybooks)
      .set(updates)
      .where(eq(successPlaybooks.id, parseInt(id)))
      .returning();

    if (!playbook) {
      return res.status(404).json({ error: 'Playbook not found' });
    }

    res.json({
      message: 'Playbook updated successfully',
      playbook,
    });
  } catch (error) {
    logger.error('Error updating playbook:', error);
    res.status(500).json({ error: 'Failed to update playbook' });
  }
});

// ============================================================================
// PLAYBOOK EXECUTIONS
// ============================================================================

/**
 * GET /api/customer-success/executions
 * Get all playbook executions
 */
router.get('/executions', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const { status, clientId } = req.query;

    const conditions = [];

    if (status) {
      conditions.push(eq(playbookExecutions.status, status as string));
    }

    if (clientId) {
      conditions.push(eq(playbookExecutions.clientId, parseInt(clientId as string)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const executions = await db.select({
      id: playbookExecutions.id,
      playbookId: playbookExecutions.playbookId,
      clientId: playbookExecutions.clientId,
      currentStage: playbookExecutions.currentStage,
      stageProgress: playbookExecutions.stageProgress,
      status: playbookExecutions.status,
      assignedTo: playbookExecutions.assignedTo,
      startedAt: playbookExecutions.startedAt,
      completedAt: playbookExecutions.completedAt,
      pausedAt: playbookExecutions.pausedAt,
      pauseReason: playbookExecutions.pauseReason,
      playbookName: successPlaybooks.name,
      clientName: users.name,
    })
      .from(playbookExecutions)
      .leftJoin(successPlaybooks, eq(playbookExecutions.playbookId, successPlaybooks.id))
      .leftJoin(users, eq(playbookExecutions.clientId, users.id))
      .where(whereClause)
      .orderBy(desc(playbookExecutions.startedAt));

    // Add total stages from playbook
    const executionsWithStages = await Promise.all(
      executions.map(async (exec) => {
        const [playbook] = await db.select({ stages: successPlaybooks.stages })
          .from(successPlaybooks)
          .where(eq(successPlaybooks.id, exec.playbookId));

        const stages = (playbook?.stages as any[]) || [];
        return {
          ...exec,
          totalStages: stages.length,
        };
      })
    );

    res.json({ executions: executionsWithStages });
  } catch (error) {
    logger.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

/**
 * POST /api/customer-success/playbooks/:playbookId/executions
 * Start a new playbook execution for a client
 */
router.post('/playbooks/:playbookId/executions', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const { playbookId } = req.params;
    const { clientId, assignedToId, notes } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    // Verify playbook exists
    const [playbook] = await db.select()
      .from(successPlaybooks)
      .where(eq(successPlaybooks.id, parseInt(playbookId)));

    if (!playbook) {
      return res.status(404).json({ error: 'Playbook not found' });
    }

    // Check for existing active execution
    const [existing] = await db.select()
      .from(playbookExecutions)
      .where(and(
        eq(playbookExecutions.playbookId, parseInt(playbookId)),
        eq(playbookExecutions.clientId, clientId),
        eq(playbookExecutions.status, 'active')
      ));

    if (existing) {
      return res.status(400).json({ error: 'Client already has an active execution for this playbook' });
    }

    const [execution] = await db.insert(playbookExecutions)
      .values({
        playbookId: parseInt(playbookId),
        clientId,
        currentStage: 1,
        stageProgress: {},
        status: 'active',
        assignedTo: assignedToId || null,
        startedAt: new Date(),
      })
      .returning();

    res.status(201).json({
      message: 'Playbook execution started',
      execution,
    });
  } catch (error) {
    logger.error('Error starting playbook execution:', error);
    res.status(500).json({ error: 'Failed to start playbook execution' });
  }
});

/**
 * PATCH /api/customer-success/executions/:id
 * Update a playbook execution (advance stage, pause, resume, cancel, complete)
 */
router.patch('/executions/:id', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, notes, stageProgress } = req.body;

    const [execution] = await db.select()
      .from(playbookExecutions)
      .where(eq(playbookExecutions.id, parseInt(id)));

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Get playbook to know total stages
    const [playbook] = await db.select({ stages: successPlaybooks.stages })
      .from(successPlaybooks)
      .where(eq(successPlaybooks.id, execution.playbookId));

    const totalStages = ((playbook?.stages as any[]) || []).length;

    const updates: Record<string, any> = {};

    switch (action) {
      case 'advance':
        if (execution.currentStage && execution.currentStage >= totalStages) {
          updates.status = 'completed';
          updates.completedAt = new Date();
        } else {
          updates.currentStage = (execution.currentStage || 0) + 1;
        }
        break;

      case 'pause':
        updates.status = 'paused';
        updates.pausedAt = new Date();
        updates.pauseReason = notes || 'Paused by user';
        break;

      case 'resume':
        updates.status = 'active';
        updates.pausedAt = null;
        updates.pauseReason = null;
        break;

      case 'cancel':
        updates.status = 'cancelled';
        updates.completedAt = new Date();
        break;

      case 'complete':
        updates.status = 'completed';
        updates.completedAt = new Date();
        break;

      default:
        // Allow direct updates for stage progress
        if (stageProgress) {
          updates.stageProgress = stageProgress;
        }
    }

    const [updated] = await db.update(playbookExecutions)
      .set(updates)
      .where(eq(playbookExecutions.id, parseInt(id)))
      .returning();

    res.json({
      message: `Execution ${action || 'updated'} successfully`,
      execution: updated,
    });
  } catch (error) {
    logger.error('Error updating execution:', error);
    res.status(500).json({ error: 'Failed to update execution' });
  }
});

// ============================================================================
// RENEWAL OPPORTUNITIES
// ============================================================================

/**
 * GET /api/customer-success/renewals
 * Get all renewal opportunities
 */
router.get('/renewals', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, daysUntil } = req.query;

    const conditions = [];

    if (user.tenantId) {
      conditions.push(eq(renewalOpportunities.tenantId, user.tenantId));
    }

    if (status) {
      conditions.push(eq(renewalOpportunities.status, status as string));
    }

    if (daysUntil) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(daysUntil as string));
      conditions.push(lte(renewalOpportunities.renewalDate, futureDate.toISOString().split('T')[0]));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const renewals = await db.select({
      id: renewalOpportunities.id,
      clientId: renewalOpportunities.clientId,
      entityId: renewalOpportunities.entityId,
      contractType: renewalOpportunities.contractType,
      currentValue: renewalOpportunities.currentValue,
      renewalValue: renewalOpportunities.renewalValue,
      renewalDate: renewalOpportunities.renewalDate,
      status: renewalOpportunities.status,
      probability: renewalOpportunities.probability,
      riskFactors: renewalOpportunities.riskFactors,
      ownerId: renewalOpportunities.ownerId,
      notes: renewalOpportunities.notes,
      renewedAt: renewalOpportunities.renewedAt,
      createdAt: renewalOpportunities.createdAt,
      clientName: users.name,
    })
      .from(renewalOpportunities)
      .leftJoin(users, eq(renewalOpportunities.clientId, users.id))
      .where(whereClause)
      .orderBy(asc(renewalOpportunities.renewalDate));

    // Add days until renewal and owner info
    const now = new Date();
    const renewalsWithDetails = await Promise.all(
      renewals.map(async (renewal) => {
        const renewalDate = new Date(renewal.renewalDate);
        const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let owner = null;
        if (renewal.ownerId) {
          const [ownerData] = await db.select({ id: users.id, name: users.name })
            .from(users)
            .where(eq(users.id, renewal.ownerId));
          owner = ownerData;
        }

        return {
          ...renewal,
          daysUntilRenewal,
          owner,
          client: { id: renewal.clientId, name: renewal.clientName },
        };
      })
    );

    // Summary
    const totalPipeline = renewalsWithDetails.reduce((sum, r) => sum + (Number(r.renewalValue || r.currentValue) || 0), 0);
    const atRiskValue = renewalsWithDetails
      .filter(r => r.status === 'at_risk' || (r.probability && r.probability < 50))
      .reduce((sum, r) => sum + (Number(r.renewalValue || r.currentValue) || 0), 0);
    const dueIn30Days = renewalsWithDetails.filter(r => r.daysUntilRenewal <= 30 && r.daysUntilRenewal > 0).length;
    const avgProbability = renewalsWithDetails.length > 0
      ? renewalsWithDetails.reduce((sum, r) => sum + (r.probability || 50), 0) / renewalsWithDetails.length
      : 0;

    res.json({
      renewals: renewalsWithDetails,
      summary: {
        total: renewalsWithDetails.length,
        totalPipeline,
        atRiskValue,
        dueIn30Days,
        avgProbability: Math.round(avgProbability),
      },
    });
  } catch (error) {
    logger.error('Error fetching renewals:', error);
    res.status(500).json({ error: 'Failed to fetch renewals' });
  }
});

/**
 * GET /api/customer-success/renewals/:id
 * Get a specific renewal opportunity
 */
router.get('/renewals/:id', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [renewal] = await db.select({
      id: renewalOpportunities.id,
      clientId: renewalOpportunities.clientId,
      entityId: renewalOpportunities.entityId,
      contractType: renewalOpportunities.contractType,
      currentValue: renewalOpportunities.currentValue,
      renewalValue: renewalOpportunities.renewalValue,
      renewalDate: renewalOpportunities.renewalDate,
      status: renewalOpportunities.status,
      probability: renewalOpportunities.probability,
      riskFactors: renewalOpportunities.riskFactors,
      ownerId: renewalOpportunities.ownerId,
      notes: renewalOpportunities.notes,
      renewedAt: renewalOpportunities.renewedAt,
      createdAt: renewalOpportunities.createdAt,
      clientName: users.name,
    })
      .from(renewalOpportunities)
      .leftJoin(users, eq(renewalOpportunities.clientId, users.id))
      .where(eq(renewalOpportunities.id, parseInt(id)));

    if (!renewal) {
      return res.status(404).json({ error: 'Renewal not found' });
    }

    // Get owner info
    let owner = null;
    if (renewal.ownerId) {
      const [ownerData] = await db.select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, renewal.ownerId));
      owner = ownerData;
    }

    const now = new Date();
    const renewalDate = new Date(renewal.renewalDate);
    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      renewal: {
        ...renewal,
        daysUntilRenewal,
        owner,
        client: { id: renewal.clientId, name: renewal.clientName },
      },
    });
  } catch (error) {
    logger.error('Error fetching renewal:', error);
    res.status(500).json({ error: 'Failed to fetch renewal' });
  }
});

/**
 * POST /api/customer-success/renewals
 * Create a new renewal opportunity
 */
router.post('/renewals', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      clientId,
      entityId,
      contractType,
      currentValue,
      renewalValue,
      renewalDate,
      probability,
      ownerId,
      notes,
    } = req.body;

    if (!clientId || !renewalDate) {
      return res.status(400).json({ error: 'Client ID and renewal date are required' });
    }

    const [renewal] = await db.insert(renewalOpportunities)
      .values({
        tenantId: user.tenantId || null,
        clientId,
        entityId: entityId || null,
        contractType,
        currentValue: currentValue || null,
        renewalValue: renewalValue || null,
        renewalDate,
        status: 'upcoming',
        probability: probability || 50,
        riskFactors: [],
        ownerId: ownerId || null,
        notes: notes || null,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({
      message: 'Renewal opportunity created',
      renewal,
    });
  } catch (error) {
    logger.error('Error creating renewal:', error);
    res.status(500).json({ error: 'Failed to create renewal' });
  }
});

/**
 * PATCH /api/customer-success/renewals/:id
 * Update a renewal opportunity
 */
router.patch('/renewals/:id', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      renewalValue,
      probability,
      riskFactors,
      ownerId,
      notes,
    } = req.body;

    const updates: Record<string, any> = {};
    if (status !== undefined) {
      updates.status = status;
      if (status === 'renewed') {
        updates.renewedAt = new Date();
      }
    }
    if (renewalValue !== undefined) updates.renewalValue = renewalValue;
    if (probability !== undefined) updates.probability = probability;
    if (riskFactors !== undefined) updates.riskFactors = riskFactors;
    if (ownerId !== undefined) updates.ownerId = ownerId;
    if (notes !== undefined) updates.notes = notes;

    const [renewal] = await db.update(renewalOpportunities)
      .set(updates)
      .where(eq(renewalOpportunities.id, parseInt(id)))
      .returning();

    if (!renewal) {
      return res.status(404).json({ error: 'Renewal not found' });
    }

    res.json({
      message: 'Renewal updated successfully',
      renewal,
    });
  } catch (error) {
    logger.error('Error updating renewal:', error);
    res.status(500).json({ error: 'Failed to update renewal' });
  }
});

// ============================================================================
// AI RECOMMENDATIONS
// ============================================================================

/**
 * GET /api/customer-success/recommendations
 * Get AI recommendations for the current user
 */
router.get('/recommendations', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const recommendations = await db.select()
      .from(aiRecommendations)
      .where(and(
        eq(aiRecommendations.userId, user.id),
        eq(aiRecommendations.isDismissed, false)
      ))
      .orderBy(desc(aiRecommendations.createdAt));

    res.json({ recommendations });
  } catch (error) {
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * PATCH /api/customer-success/recommendations/:id/dismiss
 * Dismiss a recommendation
 */
router.patch('/recommendations/:id/dismiss', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [recommendation] = await db.update(aiRecommendations)
      .set({
        isDismissed: true,
        dismissedAt: new Date(),
        dismissReason: reason || null,
      })
      .where(eq(aiRecommendations.id, parseInt(id)))
      .returning();

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    res.json({
      message: 'Recommendation dismissed',
      recommendation,
    });
  } catch (error) {
    logger.error('Error dismissing recommendation:', error);
    res.status(500).json({ error: 'Failed to dismiss recommendation' });
  }
});

/**
 * PATCH /api/customer-success/recommendations/:id/act
 * Mark a recommendation as acted upon
 */
router.patch('/recommendations/:id/act', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { outcome } = req.body;

    const [recommendation] = await db.update(aiRecommendations)
      .set({
        isActedUpon: true,
        actedUponAt: new Date(),
        outcome: outcome || null,
      })
      .where(eq(aiRecommendations.id, parseInt(id)))
      .returning();

    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }

    res.json({
      message: 'Recommendation marked as acted upon',
      recommendation,
    });
  } catch (error) {
    logger.error('Error updating recommendation:', error);
    res.status(500).json({ error: 'Failed to update recommendation' });
  }
});

export default router;
