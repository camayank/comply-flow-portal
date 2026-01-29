/**
 * Comprehensive Compliance Management API
 * End-to-end compliance lifecycle management with calendar, alerts, and penalty tracking
 */

import { Router, Request, Response } from 'express';
import { db } from './db';
import {
  complianceTracking,
  complianceStates,
  complianceStateHistory,
  complianceRules,
  compliancePenaltyDefinitions,
  complianceAlerts,
  businessEntities,
  services
} from '@shared/schema';
import { eq, and, gte, lte, desc, sql, or, isNull, asc, count, sum } from 'drizzle-orm';
import { z } from 'zod';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from './rbac-middleware';

const router = Router();

// ============ Compliance Calendar API ============

// Schema for compliance item
const ComplianceItemSchema = z.object({
  serviceId: z.number(),
  ruleKey: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.string(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'annual', 'one_time']),
  category: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  penaltyAmount: z.number().optional(),
  penaltyType: z.enum(['fixed', 'per_day', 'percentage']).optional(),
  reminderDays: z.array(z.number()).optional(),
  autoEscalate: z.boolean().optional(),
});

// Get compliance calendar for entity
router.get('/calendar/:entityId', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { month, year, category, status } = req.query;

    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    // Calculate date range for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    // Get compliance tracking items
    const items = await db
      .select({
        id: complianceTracking.id,
        businessEntityId: complianceTracking.businessEntityId,
        serviceId: complianceTracking.serviceId,
        complianceType: complianceTracking.complianceType,
        periodStart: complianceTracking.periodStart,
        periodEnd: complianceTracking.periodEnd,
        dueDate: complianceTracking.dueDate,
        actualCompletionDate: complianceTracking.actualCompletionDate,
        status: complianceTracking.status,
        filingReference: complianceTracking.filingReference,
        penaltyApplied: complianceTracking.penaltyApplied,
        penaltyAmount: complianceTracking.penaltyAmount,
        notes: complianceTracking.notes,
        serviceName: services.serviceName,
        serviceCategory: services.category,
      })
      .from(complianceTracking)
      .leftJoin(services, eq(complianceTracking.serviceId, services.id))
      .where(
        and(
          eq(complianceTracking.businessEntityId, parseInt(entityId)),
          gte(complianceTracking.dueDate, startDate.toISOString().split('T')[0]),
          lte(complianceTracking.dueDate, endDate.toISOString().split('T')[0]),
          ...(category && category !== 'all' ? [eq(services.category, category as string)] : []),
          ...(status && status !== 'all' ? [eq(complianceTracking.status, status as string)] : [])
        )
      )
      .orderBy(asc(complianceTracking.dueDate));

    // Calculate days until due and urgency for each item
    const today = new Date();
    const enrichedItems = items.map(item => {
      const dueDate = new Date(item.dueDate!);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let urgency: 'overdue' | 'critical' | 'warning' | 'safe';
      if (daysUntilDue < 0) urgency = 'overdue';
      else if (daysUntilDue <= 3) urgency = 'critical';
      else if (daysUntilDue <= 7) urgency = 'warning';
      else urgency = 'safe';

      return {
        ...item,
        daysUntilDue,
        urgency,
        isOverdue: daysUntilDue < 0,
        penaltyRisk: item.penaltyAmount ? (daysUntilDue < 0 ? item.penaltyAmount * Math.abs(daysUntilDue) : 0) : 0
      };
    });

    // Generate calendar grid
    const calendarDays = [];
    const firstDayOfMonth = new Date(targetYear, targetMonth - 1, 1).getDay();
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    // Fill in empty days before start of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push({ day: null, items: [] });
    }

    // Fill in days of month with compliance items
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayItems = enrichedItems.filter(item => {
        const itemDate = new Date(item.dueDate!);
        return itemDate.getDate() === day;
      });
      calendarDays.push({
        day,
        date: dateStr,
        items: dayItems,
        hasOverdue: dayItems.some(i => i.urgency === 'overdue'),
        hasCritical: dayItems.some(i => i.urgency === 'critical'),
        hasWarning: dayItems.some(i => i.urgency === 'warning'),
      });
    }

    res.json({
      month: targetMonth,
      year: targetYear,
      monthName: startDate.toLocaleString('en-US', { month: 'long' }),
      calendar: calendarDays,
      items: enrichedItems,
      summary: {
        total: enrichedItems.length,
        overdue: enrichedItems.filter(i => i.urgency === 'overdue').length,
        critical: enrichedItems.filter(i => i.urgency === 'critical').length,
        warning: enrichedItems.filter(i => i.urgency === 'warning').length,
        completed: enrichedItems.filter(i => i.status === 'completed').length,
        inProgress: enrichedItems.filter(i => i.status === 'in_progress').length,
        pending: enrichedItems.filter(i => i.status === 'pending').length,
        totalPenaltyRisk: enrichedItems.reduce((sum, i) => sum + (i.penaltyRisk || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching compliance calendar:', error);
    res.status(500).json({ error: 'Failed to fetch compliance calendar' });
  }
});

// Get compliance calendar for all entities (admin view)
router.get('/calendar', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPERATIONS), async (req: Request, res: Response) => {
  try {
    const { month, year, category, status, entityId } = req.query;

    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const whereConditions = [
      gte(complianceTracking.dueDate, startDate.toISOString().split('T')[0]),
      lte(complianceTracking.dueDate, endDate.toISOString().split('T')[0])
    ];

    if (category && category !== 'all') {
      whereConditions.push(eq(services.category, category as string));
    }
    if (status && status !== 'all') {
      whereConditions.push(eq(complianceTracking.status, status as string));
    }
    if (entityId) {
      whereConditions.push(eq(complianceTracking.businessEntityId, parseInt(entityId as string)));
    }

    const items = await db
      .select({
        id: complianceTracking.id,
        businessEntityId: complianceTracking.businessEntityId,
        serviceId: complianceTracking.serviceId,
        complianceType: complianceTracking.complianceType,
        dueDate: complianceTracking.dueDate,
        actualCompletionDate: complianceTracking.actualCompletionDate,
        status: complianceTracking.status,
        penaltyApplied: complianceTracking.penaltyApplied,
        penaltyAmount: complianceTracking.penaltyAmount,
        notes: complianceTracking.notes,
        serviceName: services.serviceName,
        serviceCategory: services.category,
        entityName: businessEntities.companyName,
        entityType: businessEntities.entityType,
      })
      .from(complianceTracking)
      .leftJoin(services, eq(complianceTracking.serviceId, services.id))
      .leftJoin(businessEntities, eq(complianceTracking.businessEntityId, businessEntities.id))
      .where(and(...whereConditions))
      .orderBy(asc(complianceTracking.dueDate));

    const today = new Date();
    const enrichedItems = items.map(item => {
      const dueDate = new Date(item.dueDate!);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let urgency: 'overdue' | 'critical' | 'warning' | 'safe';
      if (daysUntilDue < 0) urgency = 'overdue';
      else if (daysUntilDue <= 3) urgency = 'critical';
      else if (daysUntilDue <= 7) urgency = 'warning';
      else urgency = 'safe';

      return { ...item, daysUntilDue, urgency };
    });

    // Group by entity for summary
    const entitySummary = enrichedItems.reduce((acc: any, item) => {
      if (!acc[item.businessEntityId!]) {
        acc[item.businessEntityId!] = {
          entityId: item.businessEntityId,
          entityName: item.entityName,
          entityType: item.entityType,
          total: 0,
          overdue: 0,
          critical: 0,
          warning: 0,
          completed: 0
        };
      }
      acc[item.businessEntityId!].total++;
      if (item.urgency === 'overdue') acc[item.businessEntityId!].overdue++;
      if (item.urgency === 'critical') acc[item.businessEntityId!].critical++;
      if (item.urgency === 'warning') acc[item.businessEntityId!].warning++;
      if (item.status === 'completed') acc[item.businessEntityId!].completed++;
      return acc;
    }, {});

    res.json({
      month: targetMonth,
      year: targetYear,
      monthName: startDate.toLocaleString('en-US', { month: 'long' }),
      items: enrichedItems,
      entitySummary: Object.values(entitySummary),
      summary: {
        total: enrichedItems.length,
        overdue: enrichedItems.filter(i => i.urgency === 'overdue').length,
        critical: enrichedItems.filter(i => i.urgency === 'critical').length,
        warning: enrichedItems.filter(i => i.urgency === 'warning').length,
        completed: enrichedItems.filter(i => i.status === 'completed').length,
        entitiesAtRisk: Object.values(entitySummary).filter((e: any) => e.overdue > 0).length
      }
    });
  } catch (error) {
    console.error('Error fetching admin compliance calendar:', error);
    res.status(500).json({ error: 'Failed to fetch compliance calendar' });
  }
});

// ============ Compliance Item CRUD ============

// Create compliance item
router.post('/items', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPERATIONS), async (req: Request, res: Response) => {
  try {
    const data = ComplianceItemSchema.parse(req.body);
    const { entityId } = req.body;

    const [newItem] = await db.insert(complianceTracking).values({
      businessEntityId: entityId,
      serviceId: data.serviceId,
      complianceType: data.ruleKey,
      periodStart: new Date().toISOString().split('T')[0],
      periodEnd: data.dueDate,
      dueDate: data.dueDate,
      status: 'pending',
      notes: data.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    res.json({ success: true, item: newItem });
  } catch (error) {
    console.error('Error creating compliance item:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create compliance item' });
  }
});

// Update compliance item
router.patch('/items/:id', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const [updated] = await db
      .update(complianceTracking)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(complianceTracking.id, parseInt(id)))
      .returning();

    res.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error updating compliance item:', error);
    res.status(500).json({ error: 'Failed to update compliance item' });
  }
});

// Mark compliance item as complete
router.post('/items/:id/complete', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { filingReference, completionDate, notes } = req.body;

    const [updated] = await db
      .update(complianceTracking)
      .set({
        status: 'completed',
        actualCompletionDate: completionDate || new Date().toISOString().split('T')[0],
        filingReference,
        notes: notes || undefined,
        updatedAt: new Date(),
      })
      .where(eq(complianceTracking.id, parseInt(id)))
      .returning();

    // Update compliance state for entity
    if (updated) {
      await recalculateComplianceState(updated.businessEntityId!);
    }

    res.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error completing compliance item:', error);
    res.status(500).json({ error: 'Failed to complete compliance item' });
  }
});

// Request extension for compliance item
router.post('/items/:id/extension', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, requestedDate, requestedBy } = req.body;

    const [updated] = await db
      .update(complianceTracking)
      .set({
        status: 'extension_requested',
        notes: `Extension requested: ${reason}. New date: ${requestedDate}`,
        updatedAt: new Date(),
      })
      .where(eq(complianceTracking.id, parseInt(id)))
      .returning();

    // Create alert for admin review
    await db.insert(complianceAlerts).values({
      businessEntityId: updated.businessEntityId!,
      alertType: 'extension_request',
      severity: 'medium',
      title: 'Extension Request',
      message: `Extension requested for compliance item. Reason: ${reason}`,
      referenceId: parseInt(id),
      referenceType: 'compliance_tracking',
      status: 'pending',
      createdAt: new Date(),
    });

    res.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error requesting extension:', error);
    res.status(500).json({ error: 'Failed to request extension' });
  }
});

// Approve/Reject extension
router.post('/items/:id/extension/review', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved, newDueDate, reviewNotes } = req.body;

    if (approved && newDueDate) {
      const [updated] = await db
        .update(complianceTracking)
        .set({
          dueDate: newDueDate,
          status: 'pending',
          notes: `Extension approved. New due date: ${newDueDate}. ${reviewNotes || ''}`,
          updatedAt: new Date(),
        })
        .where(eq(complianceTracking.id, parseInt(id)))
        .returning();

      res.json({ success: true, approved: true, item: updated });
    } else {
      const [updated] = await db
        .update(complianceTracking)
        .set({
          status: 'pending',
          notes: `Extension denied. ${reviewNotes || ''}`,
          updatedAt: new Date(),
        })
        .where(eq(complianceTracking.id, parseInt(id)))
        .returning();

      res.json({ success: true, approved: false, item: updated });
    }
  } catch (error) {
    console.error('Error reviewing extension:', error);
    res.status(500).json({ error: 'Failed to review extension' });
  }
});

// Delete compliance item
router.delete('/items/:id', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(complianceTracking).where(eq(complianceTracking.id, parseInt(id)));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting compliance item:', error);
    res.status(500).json({ error: 'Failed to delete compliance item' });
  }
});

// ============ Compliance State & Health ============

// Get compliance health score
router.get('/health/:entityId', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Get current compliance state
    const [state] = await db
      .select()
      .from(complianceStates)
      .where(eq(complianceStates.businessEntityId, parseInt(entityId)))
      .limit(1);

    // Get all tracking items for this entity
    const trackingItems = await db
      .select()
      .from(complianceTracking)
      .where(eq(complianceTracking.businessEntityId, parseInt(entityId)));

    const today = new Date();
    const stats = trackingItems.reduce((acc, item) => {
      const dueDate = new Date(item.dueDate!);
      const isOverdue = item.status !== 'completed' && dueDate < today;

      acc.total++;
      if (item.status === 'completed') acc.completed++;
      if (isOverdue) acc.overdue++;
      if (item.penaltyApplied) acc.penalties += item.penaltyAmount || 0;

      return acc;
    }, { total: 0, completed: 0, overdue: 0, penalties: 0 });

    // Calculate health score (0-100)
    const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 100;
    const overdueDeduction = stats.overdue * 10; // 10 points per overdue item
    const penaltyDeduction = Math.min(20, stats.penalties / 1000); // Max 20 points deduction for penalties

    const healthScore = Math.max(0, Math.min(100, completionRate - overdueDeduction - penaltyDeduction));

    let healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
    if (healthScore >= 90) healthStatus = 'excellent';
    else if (healthScore >= 70) healthStatus = 'good';
    else if (healthScore >= 50) healthStatus = 'warning';
    else healthStatus = 'critical';

    // Get breakdown by category
    const categoryBreakdown = await db
      .select({
        category: services.category,
        total: count(),
        completed: sql<number>`count(case when ${complianceTracking.status} = 'completed' then 1 end)`,
      })
      .from(complianceTracking)
      .leftJoin(services, eq(complianceTracking.serviceId, services.id))
      .where(eq(complianceTracking.businessEntityId, parseInt(entityId)))
      .groupBy(services.category);

    // Get recent alerts
    const recentAlerts = await db
      .select()
      .from(complianceAlerts)
      .where(eq(complianceAlerts.businessEntityId, parseInt(entityId)))
      .orderBy(desc(complianceAlerts.createdAt))
      .limit(5);

    res.json({
      entityId: parseInt(entityId),
      healthScore: Math.round(healthScore),
      healthStatus,
      currentState: state?.state || 'UNKNOWN',
      stats: {
        total: stats.total,
        completed: stats.completed,
        pending: stats.total - stats.completed - stats.overdue,
        overdue: stats.overdue,
        completionRate: Math.round(completionRate),
        totalPenalties: stats.penalties
      },
      categoryBreakdown: categoryBreakdown.map(c => ({
        category: c.category || 'Other',
        total: c.total,
        completed: c.completed,
        rate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 100
      })),
      recentAlerts,
      recommendations: generateRecommendations(healthScore, stats, state?.state)
    });
  } catch (error) {
    console.error('Error fetching compliance health:', error);
    res.status(500).json({ error: 'Failed to fetch compliance health' });
  }
});

// Recalculate compliance state for entity
async function recalculateComplianceState(entityId: number) {
  try {
    const trackingItems = await db
      .select()
      .from(complianceTracking)
      .where(eq(complianceTracking.businessEntityId, entityId));

    const today = new Date();
    let overdueCount = 0;
    let criticalCount = 0;

    trackingItems.forEach(item => {
      if (item.status === 'completed') return;

      const dueDate = new Date(item.dueDate!);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilDue < 0) overdueCount++;
      else if (daysUntilDue <= 3) criticalCount++;
    });

    let newState: 'GREEN' | 'AMBER' | 'RED';
    if (overdueCount > 0) newState = 'RED';
    else if (criticalCount > 0) newState = 'AMBER';
    else newState = 'GREEN';

    // Check if state exists
    const [existingState] = await db
      .select()
      .from(complianceStates)
      .where(eq(complianceStates.businessEntityId, entityId))
      .limit(1);

    if (existingState) {
      // Record history if state changed
      if (existingState.state !== newState) {
        await db.insert(complianceStateHistory).values({
          complianceStateId: existingState.id,
          previousState: existingState.state,
          newState,
          reason: `Auto-recalculated: ${overdueCount} overdue, ${criticalCount} critical`,
          changedAt: new Date(),
        });
      }

      // Update state
      await db
        .update(complianceStates)
        .set({
          state: newState,
          overdueCount,
          upcomingCount: criticalCount,
          lastCalculatedAt: new Date(),
        })
        .where(eq(complianceStates.id, existingState.id));
    } else {
      // Create new state
      await db.insert(complianceStates).values({
        businessEntityId: entityId,
        state: newState,
        overdueCount,
        upcomingCount: criticalCount,
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return newState;
  } catch (error) {
    console.error('Error recalculating compliance state:', error);
    throw error;
  }
}

// Manual state recalculation endpoint
router.post('/state/:entityId/recalculate', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPERATIONS), async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const newState = await recalculateComplianceState(parseInt(entityId));
    res.json({ success: true, newState });
  } catch (error) {
    console.error('Error in state recalculation:', error);
    res.status(500).json({ error: 'Failed to recalculate state' });
  }
});

// ============ Compliance Alerts ============

// Get alerts for entity
router.get('/alerts/:entityId', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { status, severity } = req.query;

    const whereConditions = [eq(complianceAlerts.businessEntityId, parseInt(entityId))];

    if (status) whereConditions.push(eq(complianceAlerts.status, status as string));
    if (severity) whereConditions.push(eq(complianceAlerts.severity, severity as string));

    const alerts = await db
      .select()
      .from(complianceAlerts)
      .where(and(...whereConditions))
      .orderBy(desc(complianceAlerts.createdAt));

    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get all alerts (admin)
router.get('/alerts', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPERATIONS), async (req: Request, res: Response) => {
  try {
    const { status, severity, entityId } = req.query;

    const whereConditions: any[] = [];

    if (status) whereConditions.push(eq(complianceAlerts.status, status as string));
    if (severity) whereConditions.push(eq(complianceAlerts.severity, severity as string));
    if (entityId) whereConditions.push(eq(complianceAlerts.businessEntityId, parseInt(entityId as string)));

    const alerts = await db
      .select({
        ...complianceAlerts,
        entityName: businessEntities.companyName,
      })
      .from(complianceAlerts)
      .leftJoin(businessEntities, eq(complianceAlerts.businessEntityId, businessEntities.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(complianceAlerts.createdAt))
      .limit(100);

    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching all alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Acknowledge alert
router.post('/alerts/:alertId/acknowledge', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { notes } = req.body;

    const [updated] = await db
      .update(complianceAlerts)
      .set({
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        notes,
      })
      .where(eq(complianceAlerts.id, parseInt(alertId)))
      .returning();

    res.json({ success: true, alert: updated });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Resolve alert
router.post('/alerts/:alertId/resolve', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { resolution } = req.body;

    const [updated] = await db
      .update(complianceAlerts)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        notes: resolution,
      })
      .where(eq(complianceAlerts.id, parseInt(alertId)))
      .returning();

    res.json({ success: true, alert: updated });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// ============ Penalty Management ============

// Get penalty summary for entity
router.get('/penalties/:entityId', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { year } = req.query;

    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    const items = await db
      .select({
        id: complianceTracking.id,
        complianceType: complianceTracking.complianceType,
        dueDate: complianceTracking.dueDate,
        actualCompletionDate: complianceTracking.actualCompletionDate,
        penaltyApplied: complianceTracking.penaltyApplied,
        penaltyAmount: complianceTracking.penaltyAmount,
        serviceName: services.serviceName,
        serviceCategory: services.category,
      })
      .from(complianceTracking)
      .leftJoin(services, eq(complianceTracking.serviceId, services.id))
      .where(
        and(
          eq(complianceTracking.businessEntityId, parseInt(entityId)),
          eq(complianceTracking.penaltyApplied, true),
          sql`EXTRACT(YEAR FROM ${complianceTracking.dueDate}) = ${targetYear}`
        )
      )
      .orderBy(desc(complianceTracking.dueDate));

    const totalPenalties = items.reduce((sum, item) => sum + (item.penaltyAmount || 0), 0);

    // Group by category
    const byCategory = items.reduce((acc: any, item) => {
      const cat = item.serviceCategory || 'Other';
      if (!acc[cat]) acc[cat] = { category: cat, count: 0, amount: 0 };
      acc[cat].count++;
      acc[cat].amount += item.penaltyAmount || 0;
      return acc;
    }, {});

    // Monthly breakdown
    const byMonth = items.reduce((acc: any, item) => {
      const month = new Date(item.dueDate!).toLocaleString('en-US', { month: 'short' });
      if (!acc[month]) acc[month] = { month, count: 0, amount: 0 };
      acc[month].count++;
      acc[month].amount += item.penaltyAmount || 0;
      return acc;
    }, {});

    res.json({
      year: targetYear,
      totalPenalties,
      totalItems: items.length,
      items,
      byCategory: Object.values(byCategory),
      byMonth: Object.values(byMonth)
    });
  } catch (error) {
    console.error('Error fetching penalties:', error);
    res.status(500).json({ error: 'Failed to fetch penalties' });
  }
});

// Record penalty for compliance item
router.post('/items/:id/penalty', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPERATIONS), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const [updated] = await db
      .update(complianceTracking)
      .set({
        penaltyApplied: true,
        penaltyAmount: amount,
        notes: `Penalty applied: ₹${amount}. Reason: ${reason}`,
        updatedAt: new Date(),
      })
      .where(eq(complianceTracking.id, parseInt(id)))
      .returning();

    res.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error recording penalty:', error);
    res.status(500).json({ error: 'Failed to record penalty' });
  }
});

// ============ Bulk Operations ============

// Bulk create compliance items from template
router.post('/bulk/generate', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPERATIONS), async (req: Request, res: Response) => {
  try {
    const { entityId, serviceIds, year, month } = req.body;

    // Get compliance rules for the services
    const rules = await db
      .select()
      .from(complianceRules)
      .where(
        and(
          sql`${complianceRules.serviceId} = ANY(${serviceIds})`,
          eq(complianceRules.isActive, true)
        )
      );

    const targetDate = new Date(year, month - 1, 1);
    const createdItems: any[] = [];

    for (const rule of rules) {
      // Calculate due date based on frequency
      let dueDate: Date;
      switch (rule.frequency) {
        case 'monthly':
          dueDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, rule.dueDayOfMonth || 20);
          break;
        case 'quarterly':
          const quarterEnd = Math.ceil((targetDate.getMonth() + 1) / 3) * 3;
          dueDate = new Date(targetDate.getFullYear(), quarterEnd, rule.dueDayOfMonth || 30);
          break;
        case 'annual':
          dueDate = new Date(targetDate.getFullYear() + 1, rule.dueMonth || 3, rule.dueDayOfMonth || 31);
          break;
        default:
          dueDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 20);
      }

      const [item] = await db.insert(complianceTracking).values({
        businessEntityId: entityId,
        serviceId: rule.serviceId,
        complianceType: rule.ruleKey,
        periodStart: targetDate.toISOString().split('T')[0],
        periodEnd: dueDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'pending',
        notes: rule.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      createdItems.push(item);
    }

    res.json({ success: true, created: createdItems.length, items: createdItems });
  } catch (error) {
    console.error('Error generating compliance items:', error);
    res.status(500).json({ error: 'Failed to generate compliance items' });
  }
});

// Bulk update status
router.post('/bulk/update-status', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPERATIONS), async (req: Request, res: Response) => {
  try {
    const { itemIds, status, notes } = req.body;

    const updated = await db
      .update(complianceTracking)
      .set({ status, notes, updatedAt: new Date() })
      .where(sql`${complianceTracking.id} = ANY(${itemIds})`)
      .returning();

    res.json({ success: true, updated: updated.length });
  } catch (error) {
    console.error('Error bulk updating status:', error);
    res.status(500).json({ error: 'Failed to bulk update status' });
  }
});

// ============ Dashboard & Analytics ============

// Get compliance dashboard data
router.get('/dashboard', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.query;

    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    let whereCondition = and(
      gte(complianceTracking.dueDate, today.toISOString().split('T')[0]),
      lte(complianceTracking.dueDate, thirtyDaysFromNow.toISOString().split('T')[0])
    );

    if (entityId) {
      whereCondition = and(
        whereCondition,
        eq(complianceTracking.businessEntityId, parseInt(entityId as string))
      );
    }

    // Upcoming deadlines in next 30 days
    const upcomingDeadlines = await db
      .select({
        id: complianceTracking.id,
        complianceType: complianceTracking.complianceType,
        dueDate: complianceTracking.dueDate,
        status: complianceTracking.status,
        serviceName: services.serviceName,
        serviceCategory: services.category,
        entityName: businessEntities.companyName,
      })
      .from(complianceTracking)
      .leftJoin(services, eq(complianceTracking.serviceId, services.id))
      .leftJoin(businessEntities, eq(complianceTracking.businessEntityId, businessEntities.id))
      .where(whereCondition)
      .orderBy(asc(complianceTracking.dueDate))
      .limit(20);

    // Entity health overview
    const entityHealth = await db
      .select({
        entityId: complianceStates.businessEntityId,
        entityName: businessEntities.companyName,
        state: complianceStates.state,
        overdueCount: complianceStates.overdueCount,
        upcomingCount: complianceStates.upcomingCount,
      })
      .from(complianceStates)
      .leftJoin(businessEntities, eq(complianceStates.businessEntityId, businessEntities.id))
      .orderBy(
        sql`CASE ${complianceStates.state} WHEN 'RED' THEN 1 WHEN 'AMBER' THEN 2 ELSE 3 END`
      )
      .limit(10);

    // Recent alerts
    const recentAlerts = await db
      .select({
        ...complianceAlerts,
        entityName: businessEntities.companyName,
      })
      .from(complianceAlerts)
      .leftJoin(businessEntities, eq(complianceAlerts.businessEntityId, businessEntities.id))
      .where(eq(complianceAlerts.status, 'pending'))
      .orderBy(desc(complianceAlerts.createdAt))
      .limit(10);

    // Summary stats
    const [stats] = await db
      .select({
        totalEntities: sql<number>`count(distinct ${complianceStates.businessEntityId})`,
        greenCount: sql<number>`count(case when ${complianceStates.state} = 'GREEN' then 1 end)`,
        amberCount: sql<number>`count(case when ${complianceStates.state} = 'AMBER' then 1 end)`,
        redCount: sql<number>`count(case when ${complianceStates.state} = 'RED' then 1 end)`,
      })
      .from(complianceStates);

    res.json({
      summary: {
        totalEntities: stats?.totalEntities || 0,
        greenEntities: stats?.greenCount || 0,
        amberEntities: stats?.amberCount || 0,
        redEntities: stats?.redCount || 0,
        pendingAlerts: recentAlerts.length,
        upcomingDeadlines: upcomingDeadlines.length
      },
      upcomingDeadlines: upcomingDeadlines.map(d => ({
        ...d,
        daysUntilDue: Math.ceil((new Date(d.dueDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      })),
      entityHealth,
      recentAlerts
    });
  } catch (error) {
    console.error('Error fetching compliance dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// Helper function to generate recommendations
function generateRecommendations(healthScore: number, stats: any, state: string | null) {
  const recommendations: { priority: 'high' | 'medium' | 'low'; message: string; action: string }[] = [];

  if (stats.overdue > 0) {
    recommendations.push({
      priority: 'high',
      message: `You have ${stats.overdue} overdue compliance items requiring immediate attention`,
      action: 'Clear overdue items to avoid penalties'
    });
  }

  if (healthScore < 70) {
    recommendations.push({
      priority: 'high',
      message: 'Your compliance health score is below optimal level',
      action: 'Review and complete pending compliance tasks'
    });
  }

  if (stats.total > 0 && stats.completed / stats.total < 0.8) {
    recommendations.push({
      priority: 'medium',
      message: `Only ${Math.round((stats.completed / stats.total) * 100)}% of compliance items completed`,
      action: 'Increase completion rate to improve health score'
    });
  }

  if (stats.penalties > 0) {
    recommendations.push({
      priority: 'medium',
      message: `Total penalties incurred: ₹${stats.penalties.toLocaleString()}`,
      action: 'Set up reminders to avoid future penalties'
    });
  }

  if (state === 'AMBER') {
    recommendations.push({
      priority: 'medium',
      message: 'Compliance state is AMBER - items approaching deadline',
      action: 'Complete upcoming items before due dates'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      message: 'Great job! Your compliance is in good standing',
      action: 'Continue maintaining timely filings'
    });
  }

  return recommendations;
}

export default router;
