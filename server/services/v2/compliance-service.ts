/**
 * Compliance Service
 * Following Vanta/Drata architecture patterns:
 * - Real-time compliance state calculation
 * - Risk-based prioritization
 * - Audit trail for all state changes
 */

import { db } from '../../db';
import {
  complianceStates,
  complianceTracking,
  complianceRules,
  activityLogs,
  businessEntities,
  complianceRequiredDocuments,
} from '@shared/schema';
import { and, desc, eq, or, count } from 'drizzle-orm';
import { ensureRequiredDocumentsForRuleIds } from '../../compliance-evidence';

export interface ComplianceState {
  overallState: 'GREEN' | 'AMBER' | 'RED';
  daysUntilCritical: number;
  nextCriticalDeadline: Date | null;
  totalPenaltyExposure: number;
  compliantItems: number;
  pendingItems: number;
  overdueItems: number;
  calculationMetadata: any;
}

export interface ComplianceAction {
  id: number;
  clientId: number;
  actionType: 'upload' | 'review' | 'pay' | 'confirm';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate: Date;
  estimatedMinutes: number;
  documentType?: string;
  penaltyAmount?: number;
  instructions?: string[];
  benefits?: string[];
  metadata?: any;
}

export interface Activity {
  id: number;
  type: 'document_uploaded' | 'filing_initiated' | 'payment_completed' | 'document_approved' | 'alert_created';
  description: string;
  timestamp: Date;
  userId?: string;
  metadata?: any;
}

/**
 * Get current compliance state for a client
 * Uses cached state from database with real-time validation
 */
export async function getComplianceState(clientId: number): Promise<ComplianceState | null> {
  const [state] = await db
    .select()
    .from(complianceStates)
    .where(eq(complianceStates.entityId, clientId))
    .limit(1);

  const trackingItems = await db
    .select({
      status: complianceTracking.status,
      dueDate: complianceTracking.dueDate,
      estimatedPenalty: complianceTracking.estimatedPenalty,
    })
    .from(complianceTracking)
    .where(eq(complianceTracking.businessEntityId, clientId));

  if (!state && trackingItems.length === 0) {
    return null;
  }

  const today = new Date();
  let compliant = 0;
  let pending = 0;
  let overdue = 0;
  let criticalSoon = 0;
  let nextDeadline: Date | null = null;
  let totalPenalty = 0;

  for (const item of trackingItems) {
    const dueDate = item.dueDate ? new Date(item.dueDate) : null;
    const isCompleted = item.status === 'completed';

    if (isCompleted) {
      compliant++;
      continue;
    }

    if (dueDate) {
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) overdue++;
      else pending++;

      if (daysUntil <= 7) {
        criticalSoon++;
      }

      if (!nextDeadline || dueDate.getTime() < nextDeadline.getTime()) {
        nextDeadline = dueDate;
      }
    } else {
      pending++;
    }

    totalPenalty += Number(item.estimatedPenalty || 0);
  }

  const computedOverallState: ComplianceState['overallState'] =
    overdue > 0 ? 'RED' : criticalSoon > 0 ? 'AMBER' : 'GREEN';

  const daysUntilCritical = nextDeadline
    ? Math.ceil((nextDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    overallState: (state?.overallState as ComplianceState['overallState']) || computedOverallState,
    daysUntilCritical: state?.daysUntilNextDeadline ?? daysUntilCritical,
    nextCriticalDeadline: state?.nextCriticalDeadline ?? nextDeadline,
    totalPenaltyExposure: Number(state?.totalPenaltyExposure ?? totalPenalty),
    compliantItems: compliant,
    pendingItems: pending,
    overdueItems: overdue,
    calculationMetadata: {
      source: state ? 'state_table' : 'computed_from_tracking',
      calculatedAt: state?.calculatedAt ?? new Date(),
    }
  };
}

/**
 * Get prioritized next action for client
 */
export async function getNextPrioritizedAction(clientId: number): Promise<ComplianceAction | null> {
  const pendingItems = await db
    .select({
      id: complianceTracking.id,
      dueDate: complianceTracking.dueDate,
      status: complianceTracking.status,
      priority: complianceTracking.priority,
      estimatedPenalty: complianceTracking.estimatedPenalty,
      complianceType: complianceTracking.complianceType,
      serviceType: complianceTracking.serviceType,
      complianceRuleId: complianceTracking.complianceRuleId,
      ruleCode: complianceRules.ruleCode,
      complianceName: complianceRules.complianceName,
      description: complianceRules.description,
      formNumber: complianceRules.formNumber,
    })
    .from(complianceTracking)
    .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
    .where(
      and(
        eq(complianceTracking.businessEntityId, clientId),
        or(eq(complianceTracking.status, 'pending'), eq(complianceTracking.status, 'overdue'))
      )
    );

  if (pendingItems.length === 0) {
    return null;
  }

  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  pendingItems.sort((a, b) => {
    const pa = priorityOrder[a.priority || 'medium'] ?? 2;
    const pb = priorityOrder[b.priority || 'medium'] ?? 2;
    if (pa !== pb) return pa - pb;
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });

  const next = pendingItems[0];
  let requiresDocuments = false;

  if (next.complianceRuleId) {
    await ensureRequiredDocumentsForRuleIds([next.complianceRuleId]);
    const [docCount] = await db
      .select({ count: count() })
      .from(complianceRequiredDocuments)
      .where(eq(complianceRequiredDocuments.complianceRuleId, next.complianceRuleId))
      .limit(1);

    requiresDocuments = Number(docCount?.count || 0) > 0;
  }
  const priority = (next.priority === 'critical' || next.priority === 'high') ? 'high' :
    next.priority === 'low' ? 'low' : 'medium';

  return {
    id: next.id,
    clientId,
    actionType: requiresDocuments ? 'upload' : 'review',
    title: next.complianceName || next.serviceType || next.complianceType || 'Compliance Action',
    description: next.description || 'Complete the required compliance action before the due date.',
    priority,
    status: next.status === 'overdue' ? 'pending' : 'in_progress',
    dueDate: next.dueDate ? new Date(next.dueDate) : new Date(),
    estimatedMinutes: priority === 'high' ? 45 : priority === 'medium' ? 25 : 15,
    documentType: next.formNumber || next.complianceType || undefined,
    penaltyAmount: next.estimatedPenalty || undefined,
    instructions: next.description ? [next.description] : undefined,
    benefits: undefined,
    metadata: { ruleCode: next.ruleCode }
  };
}

/**
 * Get recent activities for a client
 */
export async function getRecentActivities(clientId: number, limit: number = 10): Promise<Activity[]> {
  const logs = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      details: activityLogs.details,
      createdAt: activityLogs.createdAt,
      userId: activityLogs.userId,
      metadata: activityLogs.metadata,
    })
    .from(activityLogs)
    .where(eq(activityLogs.businessEntityId, clientId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  const mapActionToType = (action: string | null | undefined): Activity['type'] => {
    const normalized = (action || '').toLowerCase();
    if (normalized.includes('document')) return 'document_uploaded';
    if (normalized.includes('payment')) return 'payment_completed';
    if (normalized.includes('approval')) return 'document_approved';
    if (normalized.includes('alert')) return 'alert_created';
    if (normalized.includes('filing')) return 'filing_initiated';
    return 'alert_created';
  };

  return logs.map(row => ({
    id: row.id,
    type: mapActionToType(row.action),
    description: row.details || row.action || 'Activity recorded',
    timestamp: row.createdAt,
    userId: row.userId ? String(row.userId) : undefined,
    metadata: row.metadata
  }));
}

/**
 * Complete a compliance action
 */
export async function completeAction(
  actionId: number,
  completedBy: string,
  completionData?: any
): Promise<void> {
  const [item] = await db
    .select({
      id: complianceTracking.id,
      businessEntityId: complianceTracking.businessEntityId,
      serviceType: complianceTracking.serviceType,
    })
    .from(complianceTracking)
    .where(eq(complianceTracking.id, actionId))
    .limit(1);

  if (!item) return;

  await db
    .update(complianceTracking)
    .set({
      status: 'completed',
      lastCompleted: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(complianceTracking.id, actionId));

  await db.insert(activityLogs).values({
    businessEntityId: item.businessEntityId!,
    action: 'compliance_completed',
    details: `Completed: ${item.serviceType || 'Compliance item'}`,
    userId: Number(completedBy) || undefined,
    metadata: completionData || undefined,
  });
}

/**
 * Create a new compliance action
 * Maps to complianceTracking entry
 */
export async function createAction(action: Omit<ComplianceAction, 'id'>): Promise<number> {
  const [entity] = await db
    .select({ ownerId: businessEntities.ownerId })
    .from(businessEntities)
    .where(eq(businessEntities.id, action.clientId))
    .limit(1);

  if (!entity) {
    throw new Error('Client entity not found');
  }

  const [created] = await db
    .insert(complianceTracking)
    .values({
      userId: entity.ownerId,
      businessEntityId: action.clientId,
      complianceRuleId: null,
      serviceId: action.documentType || action.title,
      serviceType: action.title,
      complianceType: action.actionType,
      dueDate: action.dueDate,
      status: action.status || 'pending',
      priority: action.priority || 'medium',
      estimatedPenalty: action.penaltyAmount || 0,
      penaltyRisk: !!action.penaltyAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created.id;
}

/**
 * Get upcoming deadlines for a client
 */
export interface UpcomingDeadline {
  title: string;
  date: string;
  daysLeft: number;
  priority: 'high' | 'medium' | 'low';
  category?: string;
}

export async function getUpcomingDeadlines(clientId: number, limit: number = 5): Promise<UpcomingDeadline[]> {
  const items = await db
    .select({
      dueDate: complianceTracking.dueDate,
      priority: complianceTracking.priority,
      complianceType: complianceTracking.complianceType,
      serviceType: complianceTracking.serviceType,
      complianceName: complianceRules.complianceName,
      category: complianceRules.regulationCategory,
    })
    .from(complianceTracking)
    .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
    .where(
      and(
        eq(complianceTracking.businessEntityId, clientId),
        or(eq(complianceTracking.status, 'pending'), eq(complianceTracking.status, 'overdue'))
      )
    )
    .orderBy(desc(complianceTracking.dueDate))
    .limit(limit);

  const today = new Date();

  return items
    .filter(item => item.dueDate && new Date(item.dueDate) >= today)
    .map(item => {
      const dueDate = new Date(item.dueDate!);
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const priority: 'high' | 'medium' | 'low' =
        item.priority === 'critical' || item.priority === 'high'
          ? 'high'
          : item.priority === 'low'
            ? 'low'
            : 'medium';

      return {
        title: item.complianceName || item.serviceType || item.complianceType || 'Compliance item',
        date: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        daysLeft,
        priority,
        category: item.category || undefined
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, limit);
}

/**
 * Get quick stats for client dashboard
 */
export interface QuickStats {
  tasksCompleted: number;
  tasksCompletedChange?: string;
  pendingActions: number;
  pendingActionsLabel?: string;
  daysSafe: number;
  daysSafeLabel?: string;
}

export async function getQuickStats(clientId: number): Promise<QuickStats> {
  const items = await db
    .select({
      status: complianceTracking.status,
      dueDate: complianceTracking.dueDate,
      lastCompleted: complianceTracking.lastCompleted,
    })
    .from(complianceTracking)
    .where(eq(complianceTracking.businessEntityId, clientId));

  const today = new Date();
  let tasksCompleted = 0;
  let tasksCompletedThisMonth = 0;
  let pendingActions = 0;
  let nextDeadline: Date | null = null;

  for (const item of items) {
    const dueDate = item.dueDate ? new Date(item.dueDate) : null;
    if (item.status === 'completed') {
      tasksCompleted++;
      if (item.lastCompleted) {
        const completedAt = new Date(item.lastCompleted);
        const sameMonth = completedAt.getMonth() === today.getMonth() && completedAt.getFullYear() === today.getFullYear();
        if (sameMonth) tasksCompletedThisMonth++;
      }
    } else {
      pendingActions++;
      if (dueDate && (!nextDeadline || dueDate.getTime() < nextDeadline.getTime())) {
        nextDeadline = dueDate;
      }
    }
  }

  const daysSafe = nextDeadline
    ? Math.max(0, Math.ceil((nextDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    : 30;

  return {
    tasksCompleted,
    tasksCompletedChange: tasksCompletedThisMonth > 0 ? `+${tasksCompletedThisMonth} this month` : undefined,
    pendingActions,
    pendingActionsLabel: pendingActions > 0 ? 'Due soon' : 'All clear',
    daysSafe,
    daysSafeLabel: 'Until next deadline'
  };
}
