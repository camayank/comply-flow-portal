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
  complianceRequiredDocuments,
  complianceAlerts,
  businessEntities,
  services,
  documentVault,
  documentsUploads
} from '@shared/schema';
import { eq, and, gte, lte, desc, sql, or, asc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from './rbac-middleware';
import { mapComplianceCategory } from './compliance-taxonomy';
import { ensureRequiredDocumentsForRuleIds, getEvidenceStatusForRule } from './compliance-evidence';
import { computeDueDateFromFormula, computeNextDueDate } from './compliance-due-date';

const router = Router();

// ============ Compliance Calendar API ============

// Schema for compliance item
const ComplianceItemSchema = z.object({
  serviceId: z.union([z.string(), z.number()]),
  ruleKey: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.string(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'half_yearly', 'annual', 'one_time']).optional(),
  category: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  penaltyAmount: z.number().optional(),
  penaltyType: z.enum(['fixed', 'per_day', 'percentage']).optional(),
  reminderDays: z.array(z.number()).optional(),
  autoEscalate: z.boolean().optional(),
});

const normalizePeriodicity = (value?: string | null) => {
  const raw = String(value || '').toLowerCase().trim();
  switch (raw) {
    case 'half-yearly':
    case 'half_yearly':
    case 'halfyearly':
      return 'half_yearly';
    case 'yearly':
      return 'annual';
    default:
      return raw;
  }
};

const shouldRollForward = (rule: { periodicity?: string | null; dueDateCalculationType?: string | null }) => {
  const periodicity = normalizePeriodicity(rule.periodicity);
  if (['one_time', 'event_based', 'event'].includes(periodicity)) {
    return false;
  }
  const calcType = String(rule.dueDateCalculationType || '').toLowerCase();
  if (calcType === 'event_triggered' || calcType === 'event') {
    return false;
  }
  return true;
};

// Get compliance calendar for entity
router.get('/calendar/:entityId', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { month, year, category, status } = req.query;

    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    // Calculate date range for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const whereConditions = [
      eq(complianceTracking.businessEntityId, parseInt(entityId)),
      gte(complianceTracking.dueDate, startDate),
      lte(complianceTracking.dueDate, endDate)
    ];

    if (status && status !== 'all') {
      whereConditions.push(eq(complianceTracking.status, status as string));
    }

    // Get compliance tracking items
    const items = await db
      .select({
        id: complianceTracking.id,
        businessEntityId: complianceTracking.businessEntityId,
        serviceId: complianceTracking.serviceId,
        complianceRuleId: complianceTracking.complianceRuleId,
        complianceType: complianceTracking.complianceType,
        dueDate: complianceTracking.dueDate,
        lastCompleted: complianceTracking.lastCompleted,
        status: complianceTracking.status,
        priority: complianceTracking.priority,
        estimatedPenalty: complianceTracking.estimatedPenalty,
        penaltyRisk: complianceTracking.penaltyRisk,
        serviceName: services.name,
        serviceCategory: services.category,
        complianceName: complianceRules.complianceName,
        ruleCategory: complianceRules.regulationCategory,
        description: complianceRules.description,
      })
      .from(complianceTracking)
      .leftJoin(services, eq(complianceTracking.serviceId, services.serviceId))
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
      .where(and(...whereConditions))
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

      const basePenalty = Number(item.estimatedPenalty || 0);
      const serviceName = item.serviceName || item.complianceName || item.complianceType || item.serviceId;
      const serviceCategory = mapComplianceCategory(item.serviceCategory || item.ruleCategory);

      return {
        id: item.id,
        businessEntityId: item.businessEntityId,
        serviceId: item.serviceId,
        complianceRuleId: item.complianceRuleId,
        complianceType: item.complianceType,
        dueDate: item.dueDate,
        actualCompletionDate: item.lastCompleted,
        status: item.status,
        priority: item.priority,
        penaltyApplied: !!item.penaltyRisk,
        penaltyAmount: basePenalty || null,
        notes: item.description || null,
        serviceName,
        serviceCategory,
        daysUntilDue,
        urgency,
        isOverdue: daysUntilDue < 0,
        penaltyRisk: basePenalty ? (daysUntilDue < 0 ? basePenalty : 0) : 0
      };
    });

    const itemsWithEvidence = await attachEvidenceToItems(enrichedItems);
    const filteredItems = category && category !== 'all'
      ? itemsWithEvidence.filter(item => item.serviceCategory === category)
      : itemsWithEvidence;

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
      const dayItems = filteredItems.filter(item => {
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
      items: filteredItems,
      summary: {
        total: filteredItems.length,
        overdue: filteredItems.filter(i => i.urgency === 'overdue').length,
        critical: filteredItems.filter(i => i.urgency === 'critical').length,
        warning: filteredItems.filter(i => i.urgency === 'warning').length,
        completed: filteredItems.filter(i => i.status === 'completed').length,
        inProgress: filteredItems.filter(i => i.status === 'in_progress').length,
        pending: filteredItems.filter(i => i.status === 'pending').length,
        totalPenaltyRisk: filteredItems.reduce((sum, i) => sum + (i.penaltyRisk || 0), 0)
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
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const whereConditions = [
      gte(complianceTracking.dueDate, startDate),
      lte(complianceTracking.dueDate, endDate)
    ];

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
        complianceRuleId: complianceTracking.complianceRuleId,
        complianceType: complianceTracking.complianceType,
        dueDate: complianceTracking.dueDate,
        lastCompleted: complianceTracking.lastCompleted,
        status: complianceTracking.status,
        priority: complianceTracking.priority,
        estimatedPenalty: complianceTracking.estimatedPenalty,
        penaltyRisk: complianceTracking.penaltyRisk,
        serviceName: services.name,
        serviceCategory: services.category,
        complianceName: complianceRules.complianceName,
        ruleCategory: complianceRules.regulationCategory,
        description: complianceRules.description,
        entityName: businessEntities.name,
        entityType: businessEntities.entityType,
      })
      .from(complianceTracking)
      .leftJoin(services, eq(complianceTracking.serviceId, services.serviceId))
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
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

      const basePenalty = Number(item.estimatedPenalty || 0);
      const serviceName = item.serviceName || item.complianceName || item.complianceType || item.serviceId;
      const serviceCategory = mapComplianceCategory(item.serviceCategory || item.ruleCategory);

      return {
        id: item.id,
        businessEntityId: item.businessEntityId,
        serviceId: item.serviceId,
        complianceRuleId: item.complianceRuleId,
        complianceType: item.complianceType,
        dueDate: item.dueDate,
        actualCompletionDate: item.lastCompleted,
        status: item.status,
        priority: item.priority,
        penaltyApplied: !!item.penaltyRisk,
        penaltyAmount: basePenalty || null,
        notes: item.description || null,
        serviceName,
        serviceCategory,
        entityName: item.entityName,
        entityType: item.entityType,
        daysUntilDue,
        urgency
      };
    });

    const itemsWithEvidence = await attachEvidenceToItems(enrichedItems);
    const filteredItems = category && category !== 'all'
      ? itemsWithEvidence.filter(item => item.serviceCategory === category)
      : itemsWithEvidence;

    // Group by entity for summary
    const entitySummary = filteredItems.reduce((acc: any, item) => {
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
      items: filteredItems,
      entitySummary: Object.values(entitySummary),
      summary: {
        total: filteredItems.length,
        overdue: filteredItems.filter(i => i.urgency === 'overdue').length,
        critical: filteredItems.filter(i => i.urgency === 'critical').length,
        warning: filteredItems.filter(i => i.urgency === 'warning').length,
        completed: filteredItems.filter(i => i.status === 'completed').length,
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
    const entityId = Number(req.body.entityId);

    if (!entityId || Number.isNaN(entityId)) {
      return res.status(400).json({ error: 'Valid entityId is required' });
    }

    const [entity] = await db
      .select({ ownerId: businessEntities.ownerId })
      .from(businessEntities)
      .where(eq(businessEntities.id, entityId))
      .limit(1);

    if (!entity) {
      return res.status(404).json({ error: 'Business entity not found' });
    }

    const [rule] = data.ruleKey
      ? await db
          .select()
          .from(complianceRules)
          .where(eq(complianceRules.ruleCode, data.ruleKey))
          .limit(1)
      : [null];

    const serviceId = rule?.ruleCode || String(data.serviceId);
    const serviceType = data.title || rule?.complianceName || serviceId;
    const complianceType = rule?.periodicity || data.frequency || data.ruleKey || 'one_time';
    const penaltyRisk = !!data.penaltyAmount || ['high', 'critical'].includes(rule?.penaltyRiskLevel || '');

    const [newItem] = await db.insert(complianceTracking).values({
      userId: entity.ownerId,
      businessEntityId: entityId,
      complianceRuleId: rule?.id ?? null,
      serviceId,
      serviceType,
      complianceType,
      dueDate: new Date(data.dueDate),
      status: 'pending',
      priority: data.priority || rule?.priorityLevel || 'medium',
      penaltyRisk,
      estimatedPenalty: data.penaltyAmount || 0,
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
    const updates = req.body || {};

    const updatePayload: any = {};
    if (updates.status) updatePayload.status = updates.status;
    if (updates.dueDate) updatePayload.dueDate = new Date(updates.dueDate);
    if (updates.priority) updatePayload.priority = updates.priority;
    if (updates.penaltyAmount !== undefined) updatePayload.estimatedPenalty = Number(updates.penaltyAmount || 0);
    if (updates.penaltyApplied !== undefined) updatePayload.penaltyRisk = !!updates.penaltyApplied;
    if (updates.serviceName) updatePayload.serviceType = updates.serviceName;
    if (updates.serviceId) updatePayload.serviceId = String(updates.serviceId);
    if (updates.complianceType) updatePayload.complianceType = updates.complianceType;
    if (updates.complianceRuleId !== undefined) updatePayload.complianceRuleId = updates.complianceRuleId;
    if (updates.nextDueDate) updatePayload.nextDueDate = new Date(updates.nextDueDate);
    if (updates.lastCompleted) updatePayload.lastCompleted = new Date(updates.lastCompleted);

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const [updated] = await db
      .update(complianceTracking)
      .set({ ...updatePayload, updatedAt: new Date() })
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
    const { completionDate, overrideEvidence } = req.body;

    const [trackingItem] = await db
      .select({
        businessEntityId: complianceTracking.businessEntityId,
        complianceRuleId: complianceTracking.complianceRuleId,
        serviceType: complianceTracking.serviceType,
        serviceId: complianceTracking.serviceId,
      })
      .from(complianceTracking)
      .where(eq(complianceTracking.id, parseInt(id)))
      .limit(1);

    if (!trackingItem) {
      return res.status(404).json({ error: 'Compliance item not found' });
    }

    if (trackingItem.businessEntityId) {
      const evidence = await getEvidenceStatusForRule(
        trackingItem.businessEntityId,
        trackingItem.complianceRuleId
      );

      const canOverride = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.OPS_MANAGER, USER_ROLES.OPS_EXECUTIVE].includes(
        (req as any).user?.role
      );

      if (evidence.missingDocuments.length > 0 && overrideEvidence && !canOverride) {
        return res.status(403).json({
          error: 'Insufficient permissions to override evidence requirements',
        });
      }

      if (evidence.missingDocuments.length > 0 && !overrideEvidence) {
        return res.status(400).json({
          error: 'Missing required documents',
          message: `Required documents are missing for ${trackingItem.serviceType || trackingItem.serviceId}.`,
          missingDocuments: evidence.missingDocuments,
          requiredDocuments: evidence.requiredDocuments,
        });
      }
    }

    const [updated] = await db
      .update(complianceTracking)
      .set({
        status: 'completed',
        lastCompleted: completionDate ? new Date(completionDate) : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(complianceTracking.id, parseInt(id)))
      .returning();

    if (updated && updated.businessEntityId && updated.complianceRuleId) {
      try {
        const [rule] = await db
          .select({
            id: complianceRules.id,
            ruleCode: complianceRules.ruleCode,
            complianceName: complianceRules.complianceName,
            periodicity: complianceRules.periodicity,
            dueDateCalculationType: complianceRules.dueDateCalculationType,
            dueDateFormula: complianceRules.dueDateFormula,
            priorityLevel: complianceRules.priorityLevel,
            penaltyRiskLevel: complianceRules.penaltyRiskLevel,
          })
          .from(complianceRules)
          .where(eq(complianceRules.id, updated.complianceRuleId))
          .limit(1);

        if (rule && shouldRollForward(rule)) {
          const referenceDate = updated.dueDate || updated.lastCompleted || new Date();
          const nextDueDate = computeNextDueDate(
            rule.dueDateFormula as any,
            rule.dueDateCalculationType,
            rule.periodicity,
            referenceDate
          );

          if (nextDueDate) {
            const [existingNext] = await db
              .select({ id: complianceTracking.id })
              .from(complianceTracking)
              .where(
                and(
                  eq(complianceTracking.businessEntityId, updated.businessEntityId),
                  eq(complianceTracking.complianceRuleId, updated.complianceRuleId),
                  sql`DATE(${complianceTracking.dueDate}) = DATE(${nextDueDate})`
                )
              )
              .limit(1);

            if (!existingNext) {
              await db.insert(complianceTracking).values({
                userId: updated.userId,
                businessEntityId: updated.businessEntityId,
                complianceRuleId: updated.complianceRuleId,
                serviceId: updated.serviceId,
                serviceType: updated.serviceType || rule.complianceName,
                complianceType: normalizePeriodicity(rule.periodicity) || updated.complianceType,
                dueDate: nextDueDate,
                status: 'pending',
                priority: rule.priorityLevel || updated.priority || 'medium',
                penaltyRisk: ['high', 'critical'].includes(String(rule.penaltyRiskLevel || '')),
                estimatedPenalty: updated.estimatedPenalty || 0,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              await ensureRequiredDocumentsForRuleIds([updated.complianceRuleId]);
            }

            await db
              .update(complianceTracking)
              .set({ nextDueDate, updatedAt: new Date() })
              .where(eq(complianceTracking.id, updated.id));
          }
        }
      } catch (rollError) {
        console.error('Error rolling compliance item forward:', rollError);
      }
    }

    // Update compliance state for entity
    if (updated?.businessEntityId) {
      await recalculateComplianceState(updated.businessEntityId);
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
        ...(requestedDate ? { nextDueDate: new Date(requestedDate) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(complianceTracking.id, parseInt(id)))
      .returning();

    // Create alert for admin review
    await db.insert(complianceAlerts).values({
      entityId: updated.businessEntityId!,
      ruleId: updated.serviceId,
      alertType: 'EXTENSION_REQUEST',
      severity: 'WARNING',
      title: 'Extension Request',
      message: `Extension requested for ${updated.serviceType || updated.serviceId}. Reason: ${reason}`,
      actionRequired: 'Review extension request',
      triggeredAt: new Date(),
      metadata: {
        trackingId: parseInt(id),
        requestedDate,
        reason,
        requestedBy,
      },
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
          dueDate: new Date(newDueDate),
          status: 'pending',
          nextDueDate: null,
          updatedAt: new Date(),
        })
        .where(eq(complianceTracking.id, parseInt(id)))
        .returning();

      if (updated?.businessEntityId) {
        await db.update(complianceAlerts)
          .set({
            isActive: false,
            isAcknowledged: true,
            acknowledgedAt: new Date(),
            acknowledgedBy: (req as any).user?.id,
            metadata: {
              trackingId: parseInt(id),
              approved: true,
              reviewNotes,
            },
          })
          .where(
            and(
              eq(complianceAlerts.entityId, updated.businessEntityId),
              eq(complianceAlerts.alertType, 'EXTENSION_REQUEST'),
              sql`(metadata->>'trackingId')::int = ${parseInt(id)}`
            )
          );
      }

      res.json({ success: true, approved: true, item: updated });
    } else {
      const [updated] = await db
        .update(complianceTracking)
        .set({
          status: 'pending',
          nextDueDate: null,
          updatedAt: new Date(),
        })
        .where(eq(complianceTracking.id, parseInt(id)))
        .returning();

      if (updated?.businessEntityId) {
        await db.update(complianceAlerts)
          .set({
            isActive: false,
            isAcknowledged: true,
            acknowledgedAt: new Date(),
            acknowledgedBy: (req as any).user?.id,
            metadata: {
              trackingId: parseInt(id),
              approved: false,
              reviewNotes,
            },
          })
          .where(
            and(
              eq(complianceAlerts.entityId, updated.businessEntityId),
              eq(complianceAlerts.alertType, 'EXTENSION_REQUEST'),
              sql`(metadata->>'trackingId')::int = ${parseInt(id)}`
            )
          );
      }

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
      .where(eq(complianceStates.entityId, parseInt(entityId)))
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
      const penaltyExposure = Number(item.estimatedPenalty || 0);

      acc.total++;
      if (item.status === 'completed') acc.completed++;
      if (isOverdue) acc.overdue++;
      if (isOverdue && penaltyExposure > 0) acc.penalties += penaltyExposure;

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
    const categoryRows = await db
      .select({
        serviceCategory: services.category,
        ruleCategory: complianceRules.regulationCategory,
        status: complianceTracking.status,
      })
      .from(complianceTracking)
      .leftJoin(services, eq(complianceTracking.serviceId, services.serviceId))
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
      .where(eq(complianceTracking.businessEntityId, parseInt(entityId)));

    const categoryTotals: Record<string, { category: string; total: number; completed: number }> = {};
    categoryRows.forEach(row => {
      const category = mapComplianceCategory(row.serviceCategory || row.ruleCategory);
      if (!categoryTotals[category]) {
        categoryTotals[category] = { category, total: 0, completed: 0 };
      }
      categoryTotals[category].total++;
      if (row.status === 'completed') categoryTotals[category].completed++;
    });

    // Get recent alerts
    const recentAlerts = await db
      .select()
      .from(complianceAlerts)
      .where(eq(complianceAlerts.entityId, parseInt(entityId)))
      .orderBy(desc(complianceAlerts.triggeredAt))
      .limit(5);

    res.json({
      entityId: parseInt(entityId),
      healthScore: Math.round(healthScore),
      healthStatus,
      currentState: state?.overallState || 'UNKNOWN',
      stats: {
        total: stats.total,
        completed: stats.completed,
        pending: stats.total - stats.completed - stats.overdue,
        overdue: stats.overdue,
        completionRate: Math.round(completionRate),
        totalPenalties: stats.penalties
      },
      categoryBreakdown: Object.values(categoryTotals).map(c => ({
        category: c.category,
        total: c.total,
        completed: c.completed,
        rate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 100
      })),
      recentAlerts,
      recommendations: generateRecommendations(healthScore, stats, state?.overallState || null)
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
      .select({
        id: complianceTracking.id,
        serviceId: complianceTracking.serviceId,
        serviceType: complianceTracking.serviceType,
        complianceType: complianceTracking.complianceType,
        dueDate: complianceTracking.dueDate,
        status: complianceTracking.status,
        priority: complianceTracking.priority,
        estimatedPenalty: complianceTracking.estimatedPenalty,
        complianceName: complianceRules.complianceName,
        ruleCategory: complianceRules.regulationCategory,
        ruleCode: complianceRules.ruleCode,
      })
      .from(complianceTracking)
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
      .where(eq(complianceTracking.businessEntityId, entityId));

    const today = new Date();
    let overdueCount = 0;
    let upcomingCount = 0;
    let criticalCount = 0;
    let nextDeadline: Date | null = null;
    let nextAction: string | null = null;
    let totalPenaltyExposure = 0;

    const requirementStates: any[] = [];
    const domainMap: Record<string, {
      domain: string;
      total: number;
      overdue: number;
      critical: number;
      penaltyExposure: number;
    }> = {};

    trackingItems.forEach(item => {
      const dueDate = item.dueDate ? new Date(item.dueDate) : null;
      const isCompleted = item.status === 'completed';
      const daysUntilDue = dueDate
        ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const daysOverdue = daysUntilDue !== null && daysUntilDue < 0 ? Math.abs(daysUntilDue) : null;

      if (!isCompleted && dueDate) {
        if (daysUntilDue! < 0) overdueCount++;
        else upcomingCount++;

        if (daysUntilDue! <= 7) criticalCount++;

        if (!nextDeadline || dueDate.getTime() < nextDeadline.getTime()) {
          nextDeadline = dueDate;
          nextAction = item.complianceName || item.serviceType || item.serviceId;
        }
      }

      const penaltyExposure = Number(item.estimatedPenalty || 0);
      if (!isCompleted) {
        totalPenaltyExposure += penaltyExposure;
      }

      const requirementState =
        isCompleted
          ? 'GREEN'
          : daysUntilDue !== null && daysUntilDue < 0
            ? 'RED'
            : daysUntilDue !== null && daysUntilDue <= 7
              ? 'AMBER'
              : 'GREEN';

      const domainKey = item.ruleCategory || item.complianceType || 'Other';
      if (!domainMap[domainKey]) {
        domainMap[domainKey] = {
          domain: domainKey,
          total: 0,
          overdue: 0,
          critical: 0,
          penaltyExposure: 0,
        };
      }

      domainMap[domainKey].total += 1;
      if (!isCompleted && daysUntilDue !== null && daysUntilDue < 0) domainMap[domainKey].overdue += 1;
      if (!isCompleted && daysUntilDue !== null && daysUntilDue <= 7) domainMap[domainKey].critical += 1;
      if (!isCompleted) domainMap[domainKey].penaltyExposure += penaltyExposure;

      requirementStates.push({
        requirementId: item.ruleCode || item.serviceId,
        name: item.complianceName || item.serviceType || item.serviceId,
        domain: domainKey,
        state: requirementState,
        dueDate: dueDate ? dueDate.toISOString() : null,
        daysUntilDue,
        daysOverdue,
        penaltyExposure,
        priority: item.priority || 'medium',
        actionRequired: item.complianceName || item.serviceType || item.serviceId,
      });
    });

    let newState: 'GREEN' | 'AMBER' | 'RED';
    if (overdueCount > 0) newState = 'RED';
    else if (criticalCount > 0) newState = 'AMBER';
    else newState = 'GREEN';

    const overallRiskScore = Math.max(0, Math.min(100, 100 - overdueCount * 10 - criticalCount * 5));
    const daysUntilNextDeadline = nextDeadline
      ? Math.ceil((nextDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const domainStates = Object.values(domainMap).map(domain => {
      const state =
        domain.overdue > 0 ? 'RED' : domain.critical > 0 ? 'AMBER' : 'GREEN';
      const riskScore = Math.max(0, Math.min(100, 100 - domain.overdue * 10 - domain.critical * 5));

      return {
        domain: domain.domain,
        state,
        riskScore,
        activeRequirements: domain.total,
        overdueRequirements: domain.overdue,
        totalPenaltyExposure: domain.penaltyExposure,
      };
    });

    // Check if state exists
    const [existingState] = await db
      .select()
      .from(complianceStates)
      .where(eq(complianceStates.entityId, entityId))
      .limit(1);

    if (existingState) {
      // Record history if state changed
      if (existingState.overallState !== newState) {
        await db.insert(complianceStateHistory).values({
          entityId,
          state: newState,
          riskScore: overallRiskScore.toFixed(2),
          penaltyExposure: totalPenaltyExposure.toFixed(2),
          overdueItems: overdueCount,
          snapshotData: {
            overallState: newState,
            totalPenaltyExposure,
            overdueCount,
            upcomingCount,
            criticalCount,
            requirementStates,
            domainStates,
          },
          recordedAt: new Date(),
        });
      }

      // Update state
      await db
        .update(complianceStates)
        .set({
          overallState: newState,
          overallRiskScore: overallRiskScore.toFixed(2),
          totalPenaltyExposure: totalPenaltyExposure.toFixed(2),
          totalOverdueItems: overdueCount,
          totalUpcomingItems: upcomingCount,
          nextCriticalDeadline: nextDeadline,
          nextCriticalAction: nextAction,
          daysUntilNextDeadline: daysUntilNextDeadline ?? null,
          domainStates,
          requirementStates,
          calculatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(complianceStates.id, existingState.id));
    } else {
      // Create new state
      await db.insert(complianceStates).values({
        entityId,
        overallState: newState,
        overallRiskScore: overallRiskScore.toFixed(2),
        totalPenaltyExposure: totalPenaltyExposure.toFixed(2),
        totalOverdueItems: overdueCount,
        totalUpcomingItems: upcomingCount,
        nextCriticalDeadline: nextDeadline,
        nextCriticalAction: nextAction,
        daysUntilNextDeadline: daysUntilNextDeadline ?? null,
        domainStates,
        requirementStates,
        calculatedAt: new Date(),
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

    const whereConditions = [eq(complianceAlerts.entityId, parseInt(entityId))];

    if (status) {
      const normalized = String(status).toLowerCase();
      if (normalized === 'pending') {
        whereConditions.push(eq(complianceAlerts.isActive, true));
        whereConditions.push(eq(complianceAlerts.isAcknowledged, false));
      } else if (normalized === 'acknowledged') {
        whereConditions.push(eq(complianceAlerts.isAcknowledged, true));
      } else if (normalized === 'resolved') {
        whereConditions.push(eq(complianceAlerts.isActive, false));
      }
    }

    if (severity) {
      whereConditions.push(eq(complianceAlerts.severity, String(severity).toUpperCase()));
    }

    const alerts = await db
      .select()
      .from(complianceAlerts)
      .where(and(...whereConditions))
      .orderBy(desc(complianceAlerts.triggeredAt));

    const mapped = alerts.map(alert => ({
      ...alert,
      severity: mapAlertSeverity(alert.severity),
      businessEntityId: alert.entityId,
      createdAt: alert.triggeredAt,
      status: !alert.isActive ? 'resolved' : alert.isAcknowledged ? 'acknowledged' : 'pending'
    }));

    res.json({ alerts: mapped });
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

    if (status) {
      const normalized = String(status).toLowerCase();
      if (normalized === 'pending') {
        whereConditions.push(eq(complianceAlerts.isActive, true));
        whereConditions.push(eq(complianceAlerts.isAcknowledged, false));
      } else if (normalized === 'acknowledged') {
        whereConditions.push(eq(complianceAlerts.isAcknowledged, true));
      } else if (normalized === 'resolved') {
        whereConditions.push(eq(complianceAlerts.isActive, false));
      }
    }
    if (severity) whereConditions.push(eq(complianceAlerts.severity, String(severity).toUpperCase()));
    if (entityId) whereConditions.push(eq(complianceAlerts.entityId, parseInt(entityId as string)));

    const alerts = await db
      .select({
        ...complianceAlerts,
        entityName: businessEntities.name,
      })
      .from(complianceAlerts)
      .leftJoin(businessEntities, eq(complianceAlerts.entityId, businessEntities.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(complianceAlerts.triggeredAt))
      .limit(100);

    const mapped = alerts.map(alert => ({
      ...alert,
      severity: mapAlertSeverity(alert.severity),
      businessEntityId: alert.entityId,
      createdAt: alert.triggeredAt,
      status: !alert.isActive ? 'resolved' : alert.isAcknowledged ? 'acknowledged' : 'pending'
    }));

    res.json({ alerts: mapped });
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

    const [existing] = await db
      .select({ metadata: complianceAlerts.metadata })
      .from(complianceAlerts)
      .where(eq(complianceAlerts.id, parseInt(alertId)))
      .limit(1);

    const [updated] = await db
      .update(complianceAlerts)
      .set({
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: (req as any).user?.id,
        metadata: {
          ...(existing?.metadata || {}),
          acknowledgeNotes: notes,
        },
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

    const [existing] = await db
      .select({ metadata: complianceAlerts.metadata })
      .from(complianceAlerts)
      .where(eq(complianceAlerts.id, parseInt(alertId)))
      .limit(1);

    const [updated] = await db
      .update(complianceAlerts)
      .set({
        isActive: false,
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: (req as any).user?.id,
        metadata: {
          ...(existing?.metadata || {}),
          resolution,
          resolvedAt: new Date().toISOString(),
        },
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
        lastCompleted: complianceTracking.lastCompleted,
        estimatedPenalty: complianceTracking.estimatedPenalty,
        penaltyRisk: complianceTracking.penaltyRisk,
        serviceName: services.name,
        serviceCategory: services.category,
        complianceName: complianceRules.complianceName,
        ruleCategory: complianceRules.regulationCategory,
      })
      .from(complianceTracking)
      .leftJoin(services, eq(complianceTracking.serviceId, services.serviceId))
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
      .where(
        and(
          eq(complianceTracking.businessEntityId, parseInt(entityId)),
          sql`EXTRACT(YEAR FROM ${complianceTracking.dueDate}) = ${targetYear}`,
          sql`${complianceTracking.estimatedPenalty} > 0`
        )
      )
      .orderBy(desc(complianceTracking.dueDate));

    const mappedItems = items.map(item => ({
      ...item,
      penaltyApplied: item.penaltyRisk || false,
      penaltyAmount: Number(item.estimatedPenalty || 0),
      serviceName: item.serviceName || item.complianceName || item.complianceType,
      serviceCategory: mapComplianceCategory(item.serviceCategory || item.ruleCategory),
      actualCompletionDate: item.lastCompleted,
    }));

    const totalPenalties = mappedItems.reduce((sum, item) => sum + (item.penaltyAmount || 0), 0);

    // Group by category
    const byCategory = mappedItems.reduce((acc: any, item) => {
      const cat = item.serviceCategory || 'Other';
      if (!acc[cat]) acc[cat] = { category: cat, count: 0, amount: 0 };
      acc[cat].count++;
      acc[cat].amount += item.penaltyAmount || 0;
      return acc;
    }, {});

    // Monthly breakdown
    const byMonth = mappedItems.reduce((acc: any, item) => {
      const month = new Date(item.dueDate!).toLocaleString('en-US', { month: 'short' });
      if (!acc[month]) acc[month] = { month, count: 0, amount: 0 };
      acc[month].count++;
      acc[month].amount += item.penaltyAmount || 0;
      return acc;
    }, {});

    res.json({
      year: targetYear,
      totalPenalties,
      totalItems: mappedItems.length,
      items: mappedItems,
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
        penaltyRisk: true,
        estimatedPenalty: Number(amount || 0),
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

    if (!entityId || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({ error: 'entityId and serviceIds are required' });
    }

    const [entity] = await db
      .select({ ownerId: businessEntities.ownerId })
      .from(businessEntities)
      .where(eq(businessEntities.id, Number(entityId)))
      .limit(1);

    if (!entity) {
      return res.status(404).json({ error: 'Business entity not found' });
    }

    // Get compliance rules for the provided rule codes
    const rules = await db
      .select()
      .from(complianceRules)
      .where(
        and(
          inArray(complianceRules.ruleCode, serviceIds.map(String)),
          eq(complianceRules.isActive, true)
        )
      );

    const targetDate = new Date(year, (month || 1) - 1, 1);
    const createdItems: any[] = [];

    const computeDueDate = (rule: any, baseDate: Date) =>
      computeDueDateFromFormula(rule.dueDateFormula, rule.dueDateCalculationType, baseDate);

    for (const rule of rules) {
      const dueDate = computeDueDate(rule, targetDate);
      const penaltyRisk = ['high', 'critical'].includes(rule.penaltyRiskLevel || '');

      const [item] = await db.insert(complianceTracking).values({
        userId: entity.ownerId,
        businessEntityId: Number(entityId),
        complianceRuleId: rule.id,
        serviceId: rule.ruleCode,
        serviceType: rule.complianceName,
        complianceType: rule.periodicity,
        dueDate,
        status: 'pending',
        priority: rule.priorityLevel || 'medium',
        penaltyRisk,
        estimatedPenalty: 0,
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
      .set({ status, updatedAt: new Date() })
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
      gte(complianceTracking.dueDate, today),
      lte(complianceTracking.dueDate, thirtyDaysFromNow),
      or(
        eq(complianceTracking.status, 'pending'),
        eq(complianceTracking.status, 'overdue'),
        eq(complianceTracking.status, 'in_progress')
      )
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
        serviceName: services.name,
        serviceCategory: services.category,
        complianceName: complianceRules.complianceName,
        ruleCategory: complianceRules.regulationCategory,
        entityName: businessEntities.name,
      })
      .from(complianceTracking)
      .leftJoin(services, eq(complianceTracking.serviceId, services.serviceId))
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
      .leftJoin(businessEntities, eq(complianceTracking.businessEntityId, businessEntities.id))
      .where(whereCondition)
      .orderBy(asc(complianceTracking.dueDate))
      .limit(20);

    // Entity health overview
    const entityHealth = await db
      .select({
        entityId: complianceStates.entityId,
        entityName: businessEntities.name,
        state: complianceStates.overallState,
        overdueCount: complianceStates.totalOverdueItems,
        upcomingCount: complianceStates.totalUpcomingItems,
      })
      .from(complianceStates)
      .leftJoin(businessEntities, eq(complianceStates.entityId, businessEntities.id))
      .orderBy(
        sql`CASE ${complianceStates.overallState} WHEN 'RED' THEN 1 WHEN 'AMBER' THEN 2 ELSE 3 END`
      )
      .limit(10);

    // Recent alerts
    const recentAlerts = await db
      .select({
        ...complianceAlerts,
        entityName: businessEntities.name,
      })
      .from(complianceAlerts)
      .leftJoin(businessEntities, eq(complianceAlerts.entityId, businessEntities.id))
      .where(
        and(
          eq(complianceAlerts.isActive, true),
          eq(complianceAlerts.isAcknowledged, false)
        )
      )
      .orderBy(desc(complianceAlerts.triggeredAt))
      .limit(10);

    // Summary stats
    const [stats] = await db
      .select({
        totalEntities: sql<number>`count(distinct ${complianceStates.entityId})`,
        greenCount: sql<number>`count(case when ${complianceStates.overallState} = 'GREEN' then 1 end)`,
        amberCount: sql<number>`count(case when ${complianceStates.overallState} = 'AMBER' then 1 end)`,
        redCount: sql<number>`count(case when ${complianceStates.overallState} = 'RED' then 1 end)`,
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
        serviceName: d.serviceName || d.complianceName || d.complianceType,
        serviceCategory: mapComplianceCategory(d.serviceCategory || d.ruleCategory),
        daysUntilDue: Math.ceil((new Date(d.dueDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      })),
      entityHealth,
      recentAlerts: recentAlerts.map(alert => ({
        ...alert,
        severity: mapAlertSeverity(alert.severity),
        businessEntityId: alert.entityId,
        createdAt: alert.triggeredAt,
        status: !alert.isActive ? 'resolved' : alert.isAcknowledged ? 'acknowledged' : 'pending'
      }))
    });
  } catch (error) {
    console.error('Error fetching compliance dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

type EvidenceItem = {
  businessEntityId: number | null;
  complianceRuleId?: number | null;
};

const normalizeDocumentType = (value: string) => value.trim().toLowerCase();

async function attachEvidenceToItems<T extends EvidenceItem>(items: T[]): Promise<(T & {
  requiredDocuments: { documentType: string; documentName: string; isMandatory: boolean | null }[];
  missingDocuments: { documentType: string; documentName: string; isMandatory: boolean | null }[];
  evidenceSummary: { required: number; uploaded: number; missing: number };
})[]> {
  const ruleIds = Array.from(new Set(items.map(item => item.complianceRuleId).filter((id): id is number => typeof id === 'number')));
  if (ruleIds.length === 0) {
    return items.map(item => ({
      ...item,
      requiredDocuments: [],
      missingDocuments: [],
      evidenceSummary: { required: 0, uploaded: 0, missing: 0 },
    }));
  }

  await ensureRequiredDocumentsForRuleIds(ruleIds);

  const requiredDocs = await db
    .select({
      complianceRuleId: complianceRequiredDocuments.complianceRuleId,
      documentType: complianceRequiredDocuments.documentType,
      documentName: complianceRequiredDocuments.documentName,
      isMandatory: complianceRequiredDocuments.isMandatory,
    })
    .from(complianceRequiredDocuments)
    .where(inArray(complianceRequiredDocuments.complianceRuleId, ruleIds));

  const docsByRule = new Map<number, { documentType: string; documentName: string; isMandatory: boolean | null }[]>();
  requiredDocs.forEach(doc => {
    const list = docsByRule.get(doc.complianceRuleId) || [];
    list.push({
      documentType: doc.documentType,
      documentName: doc.documentName,
      isMandatory: doc.isMandatory,
    });
    docsByRule.set(doc.complianceRuleId, list);
  });

  const entityIds = Array.from(new Set(items.map(item => item.businessEntityId).filter((id): id is number => typeof id === 'number')));
  const docsByEntity = new Map<number, Set<string>>();

  if (entityIds.length > 0) {
    const vaultDocs = await db
      .select({
        businessEntityId: documentVault.businessEntityId,
        documentType: documentVault.documentType,
        approvalStatus: documentVault.approvalStatus,
      })
      .from(documentVault)
      .where(inArray(documentVault.businessEntityId, entityIds));

    vaultDocs.forEach(doc => {
      if (!doc.businessEntityId || !doc.documentType) return;
      if (doc.approvalStatus !== 'approved') return;
      const set = docsByEntity.get(doc.businessEntityId) || new Set<string>();
      set.add(normalizeDocumentType(doc.documentType));
      docsByEntity.set(doc.businessEntityId, set);
    });

    const uploadDocs = await db
      .select({
        entityId: documentsUploads.entityId,
        documentType: documentsUploads.doctype,
        status: documentsUploads.status,
      })
      .from(documentsUploads)
      .where(inArray(documentsUploads.entityId, entityIds));

    uploadDocs.forEach(doc => {
      if (!doc.entityId || !doc.documentType) return;
      if (doc.status !== 'approved') return;
      const set = docsByEntity.get(doc.entityId) || new Set<string>();
      set.add(normalizeDocumentType(doc.documentType));
      docsByEntity.set(doc.entityId, set);
    });
  }

  return items.map(item => {
    const required = item.complianceRuleId ? (docsByRule.get(item.complianceRuleId) || []) : [];
    const uploaded = item.businessEntityId ? (docsByEntity.get(item.businessEntityId) || new Set<string>()) : new Set<string>();

    const missing = required.filter(doc => {
      if (doc.isMandatory === false) return false;
      return !uploaded.has(normalizeDocumentType(doc.documentType));
    });

    return {
      ...item,
      requiredDocuments: required,
      missingDocuments: missing,
      evidenceSummary: {
        required: required.length,
        uploaded: Math.max(0, required.length - missing.length),
        missing: missing.length,
      },
    };
  });
}

function mapAlertSeverity(severity: string | null | undefined): string {
  const normalized = (severity || '').toUpperCase();
  if (normalized === 'CRITICAL') return 'critical';
  if (normalized === 'WARNING') return 'high';
  if (normalized === 'INFO') return 'low';
  return (severity || '').toLowerCase();
}

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
