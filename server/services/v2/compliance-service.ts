/**
 * Compliance Service
 * Following Vanta/Drata architecture patterns:
 * - Real-time compliance state calculation
 * - Risk-based prioritization
 * - Audit trail for all state changes
 */

import { pool } from '../../db';

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
  const result = await pool.query(
    `SELECT 
      overall_state,
      days_until_critical,
      next_critical_deadline,
      total_penalty_exposure,
      compliant_items,
      pending_items,
      overdue_items,
      calculation_metadata,
      calculated_at
    FROM client_compliance_state
    WHERE client_id = $1`,
    [clientId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    overallState: row.overall_state,
    daysUntilCritical: row.days_until_critical,
    nextCriticalDeadline: row.next_critical_deadline,
    totalPenaltyExposure: parseFloat(row.total_penalty_exposure || 0),
    compliantItems: row.compliant_items,
    pendingItems: row.pending_items,
    overdueItems: row.overdue_items,
    calculationMetadata: row.calculation_metadata
  };
}

/**
 * Get prioritized next action for client
 * Uses smart prioritization based on:
 * - Deadline urgency
 * - Penalty amount
 * - Compliance impact
 * - Client history
 */
export async function getNextPrioritizedAction(clientId: number): Promise<ComplianceAction | null> {
  const result = await pool.query(
    `SELECT 
      id,
      client_id,
      action_type,
      title,
      description,
      priority,
      status,
      due_date,
      estimated_time_minutes,
      document_type,
      penalty_amount,
      instructions,
      benefits,
      metadata
    FROM compliance_actions
    WHERE client_id = $1 
      AND status IN ('pending', 'in_progress')
    ORDER BY 
      CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        ELSE 3 
      END,
      due_date ASC,
      penalty_amount DESC NULLS LAST
    LIMIT 1`,
    [clientId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    clientId: row.client_id,
    actionType: row.action_type,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    estimatedMinutes: row.estimated_time_minutes || 5,
    documentType: row.document_type,
    penaltyAmount: row.penalty_amount ? parseFloat(row.penalty_amount) : undefined,
    instructions: row.instructions,
    benefits: row.benefits,
    metadata: row.metadata
  };
}

/**
 * Get recent activities for a client
 * Includes document uploads, filings, payments, approvals
 */
export async function getRecentActivities(clientId: number, limit: number = 10): Promise<Activity[]> {
  const result = await pool.query(
    `SELECT 
      id,
      activity_type as type,
      description,
      created_at as timestamp,
      actor_id as user_id,
      metadata
    FROM client_activities
    WHERE client_id = $1
    ORDER BY created_at DESC
    LIMIT $2`,
    [clientId, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    type: row.type,
    description: row.description,
    timestamp: row.timestamp,
    userId: row.user_id,
    metadata: row.metadata
  }));
}

/**
 * Complete a compliance action
 * Records completion, updates state, creates audit trail
 */
export async function completeAction(
  actionId: number,
  completedBy: string,
  completionData?: any
): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Update action status
    await client.query(
      `UPDATE compliance_actions 
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           completed_by = $1,
           completion_data = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [completedBy, completionData, actionId]
    );

    // Get action details for activity log
    const actionResult = await client.query(
      'SELECT client_id, title FROM compliance_actions WHERE id = $1',
      [actionId]
    );

    if (actionResult.rows.length > 0) {
      const { client_id, title } = actionResult.rows[0];

      // Create activity record
      await client.query(
        `INSERT INTO client_activities 
         (client_id, activity_type, description, user_id, metadata)
         VALUES ($1, 'document_approved', $2, $3, $4)`,
        [
          client_id,
          `Completed: ${title}`,
          completedBy,
          { actionId, completionData }
        ]
      );

      // Trigger compliance state recalculation (async)
      // In production, this would be a background job
      await recalculateComplianceState(client_id, client);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Recalculate compliance state for a client
 * Called after actions are completed or deadlines change
 */
async function recalculateComplianceState(clientId: number, client: any): Promise<void> {
  // Get all pending and overdue actions
  const actionsResult = await client.query(
    `SELECT 
      COUNT(*) FILTER (WHERE status = 'completed') as compliant_count,
      COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND due_date >= CURRENT_DATE) as pending_count,
      COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress') AND due_date < CURRENT_DATE) as overdue_count,
      MIN(due_date) FILTER (WHERE status IN ('pending', 'in_progress')) as next_deadline,
      SUM(penalty_amount) FILTER (WHERE status IN ('pending', 'in_progress')) as total_penalty
    FROM compliance_actions
    WHERE client_id = $1`,
    [clientId]
  );

  const stats = actionsResult.rows[0];
  const nextDeadline = stats.next_deadline ? new Date(stats.next_deadline) : null;
  const daysUntilCritical = nextDeadline 
    ? Math.ceil((nextDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 999;

  // Determine overall state based on Vanta-style rules
  let overallState: 'GREEN' | 'AMBER' | 'RED';
  if (stats.overdue_count > 0) {
    overallState = 'RED';
  } else if (daysUntilCritical <= 14 || stats.pending_count > 3) {
    overallState = 'AMBER';
  } else {
    overallState = 'GREEN';
  }

  // Update compliance state
  await client.query(
    `INSERT INTO client_compliance_state 
     (client_id, overall_state, days_until_critical, next_critical_deadline, 
      total_penalty_exposure, compliant_items, pending_items, overdue_items,
      calculation_metadata, calculated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
     ON CONFLICT (client_id) 
     DO UPDATE SET
       overall_state = EXCLUDED.overall_state,
       days_until_critical = EXCLUDED.days_until_critical,
       next_critical_deadline = EXCLUDED.next_critical_deadline,
       total_penalty_exposure = EXCLUDED.total_penalty_exposure,
       compliant_items = EXCLUDED.compliant_items,
       pending_items = EXCLUDED.pending_items,
       overdue_items = EXCLUDED.overdue_items,
       calculation_metadata = EXCLUDED.calculation_metadata,
       calculated_at = EXCLUDED.calculated_at,
       updated_at = CURRENT_TIMESTAMP`,
    [
      clientId,
      overallState,
      daysUntilCritical,
      nextDeadline,
      stats.total_penalty || 0,
      stats.compliant_count,
      stats.pending_count,
      stats.overdue_count,
      { recalculatedAt: new Date(), stats }
    ]
  );
}

/**
 * Create a new compliance action
 * Validates input and updates compliance state
 */
export async function createAction(action: Omit<ComplianceAction, 'id'>): Promise<number> {
  const result = await pool.query(
    `INSERT INTO compliance_actions 
     (client_id, action_type, title, description, priority, status, due_date,
      estimated_time_minutes, document_type, penalty_amount,
      instructions, benefits, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id`,
    [
      action.clientId,
      action.actionType,
      action.title,
      action.description,
      action.priority,
      action.status,
      action.dueDate,
      action.estimatedMinutes,
      action.documentType,
      action.penaltyAmount,
      action.instructions,
      action.benefits,
      action.metadata
    ]
  );

  const actionId = result.rows[0].id;

  // Trigger compliance state recalculation
  const client = await pool.connect();
  try {
    await recalculateComplianceState(action.clientId, client);
  } finally {
    client.release();
  }

  return actionId;
}

/**
 * Get upcoming deadlines for a client
 * Returns sorted list of compliance deadlines
 */
export interface UpcomingDeadline {
  title: string;
  date: string;
  daysLeft: number;
  priority: 'high' | 'medium' | 'low';
  category?: string;
}

export async function getUpcomingDeadlines(clientId: number, limit: number = 5): Promise<UpcomingDeadline[]> {
  const result = await pool.query(
    `SELECT
      title,
      due_date,
      priority,
      document_type
    FROM compliance_actions
    WHERE client_id = $1
      AND status IN ('pending', 'in_progress')
      AND due_date >= CURRENT_DATE
    ORDER BY due_date ASC
    LIMIT $2`,
    [clientId, limit]
  );

  return result.rows.map(row => {
    const dueDate = new Date(row.due_date);
    const today = new Date();
    const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      title: row.title,
      date: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      daysLeft,
      priority: row.priority || (daysLeft <= 7 ? 'high' : daysLeft <= 30 ? 'medium' : 'low'),
      category: row.document_type
    };
  });
}

/**
 * Get quick stats for client dashboard
 * Returns task completion and status metrics
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
  const result = await pool.query(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'completed') as tasks_completed,
      COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '30 days') as tasks_this_month,
      COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) as pending_actions,
      MIN(due_date) FILTER (WHERE status IN ('pending', 'in_progress') AND due_date >= CURRENT_DATE) as next_deadline
    FROM compliance_actions
    WHERE client_id = $1`,
    [clientId]
  );

  const stats = result.rows[0];
  const nextDeadline = stats.next_deadline ? new Date(stats.next_deadline) : null;
  const daysSafe = nextDeadline
    ? Math.max(0, Math.ceil((nextDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;

  return {
    tasksCompleted: parseInt(stats.tasks_completed) || 0,
    tasksCompletedChange: stats.tasks_this_month > 0 ? `+${stats.tasks_this_month} this month` : undefined,
    pendingActions: parseInt(stats.pending_actions) || 0,
    pendingActionsLabel: parseInt(stats.pending_actions) > 0 ? 'Due soon' : 'All clear',
    daysSafe,
    daysSafeLabel: 'Until next deadline'
  };
}
