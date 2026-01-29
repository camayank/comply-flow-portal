/**
 * @deprecated This service has been replaced by v2/compliance-service.ts
 * Please migrate to: /api/v2/lifecycle/compliance-detail
 * Removal planned for: 2026-06-01
 * 
 * Compliance Calculation Engine
 * 
 * Following best practices from Vanta, Drata, Secureframe:
 * - Real-time compliance status calculation
 * - Risk-based scoring
 * - Automated deadline tracking
 * - Penalty exposure calculation
 */

console.warn('⚠️  DEPRECATED: compliance-engine.ts - Use v2/compliance-service.ts instead');

import { pool } from '../db';

export interface ComplianceState {
  overallState: 'GREEN' | 'AMBER' | 'RED';
  daysSafe: number;
  nextCriticalDeadline: Date | null;
  penaltyExposure: number;
  compliantItems: number;
  pendingItems: number;
  overdueItems: number;
}

export interface ComplianceAction {
  id: number;
  title: string;
  actionType: 'upload' | 'review' | 'pay' | 'confirm';
  documentType: string | null;
  dueDate: Date;
  priority: string;
  penaltyAmount: number | null;
  estimatedTimeMinutes: number | null;
  benefits: string[];
  instructions: string[];
}

/**
 * Calculate compliance state for a client
 * Uses risk-based algorithm similar to Vanta's compliance scoring
 */
export async function calculateComplianceState(clientId: number): Promise<ComplianceState> {
  try {
    // Get all pending and overdue actions
    const actionsResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as compliant_items,
        COUNT(*) FILTER (WHERE status != 'completed' AND due_date >= CURRENT_DATE) as pending_items,
        COUNT(*) FILTER (WHERE status != 'completed' AND due_date < CURRENT_DATE) as overdue_items,
        MIN(due_date) FILTER (WHERE status != 'completed') as next_deadline,
        SUM(penalty_amount) FILTER (WHERE status != 'completed') as total_penalty
      FROM compliance_actions
      WHERE client_id = $1`,
      [clientId]
    );

    const row = actionsResult.rows[0];
    const overdueItems = parseInt(row.overdue_items) || 0;
    const pendingItems = parseInt(row.pending_items) || 0;
    const compliantItems = parseInt(row.compliant_items) || 0;
    const nextDeadline = row.next_deadline ? new Date(row.next_deadline) : null;
    const penaltyExposure = parseFloat(row.total_penalty) || 0;

    // Calculate days until next critical deadline
    let daysSafe = 365;
    if (nextDeadline) {
      const diffTime = nextDeadline.getTime() - Date.now();
      daysSafe = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Determine overall state using Vanta-style risk scoring
    let overallState: 'GREEN' | 'AMBER' | 'RED';
    if (overdueItems > 0) {
      overallState = 'RED'; // Any overdue items = critical
    } else if (daysSafe <= 7 || pendingItems > 2) {
      overallState = 'AMBER'; // Less than 7 days or multiple pending = warning
    } else {
      overallState = 'GREEN'; // All good
    }

    const state: ComplianceState = {
      overallState,
      daysSafe,
      nextCriticalDeadline: nextDeadline,
      penaltyExposure,
      compliantItems,
      pendingItems,
      overdueItems,
    };

    // Persist state to database for caching
    await pool.query(
      `INSERT INTO client_compliance_state (
        client_id, overall_state, days_until_critical, next_critical_deadline,
        total_penalty_exposure, compliant_items, pending_items, overdue_items,
        calculation_metadata, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      ON CONFLICT (client_id) DO UPDATE SET
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
        daysSafe,
        nextDeadline,
        penaltyExposure,
        compliantItems,
        pendingItems,
        overdueItems,
        JSON.stringify({ calculatedAt: new Date(), algorithm: 'risk-based-v1' }),
      ]
    );

    return state;
  } catch (error) {
    console.error('Error calculating compliance state:', error);
    throw error;
  }
}

/**
 * Get next prioritized action for a client
 * Uses priority + deadline algorithm similar to Drata's task prioritization
 */
export async function getNextPrioritizedAction(clientId: number): Promise<ComplianceAction | null> {
  try {
    const result = await pool.query(
      `SELECT 
        id, title, action_type, document_type, due_date, priority,
        penalty_amount, estimated_time_minutes, benefits, instructions
      FROM compliance_actions
      WHERE client_id = $1 AND status != 'completed'
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        due_date ASC
      LIMIT 1`,
      [clientId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      actionType: row.action_type,
      documentType: row.document_type,
      dueDate: row.due_date,
      priority: row.priority,
      penaltyAmount: row.penalty_amount,
      estimatedTimeMinutes: row.estimated_time_minutes,
      benefits: row.benefits || [],
      instructions: row.instructions || [],
    };
  } catch (error) {
    console.error('Error getting next action:', error);
    return null;
  }
}

/**
 * Get recent activities for a client
 * Stripe-style activity feed with metadata
 */
export async function getRecentActivities(clientId: number, limit: number = 10) {
  try {
    const result = await pool.query(
      `SELECT 
        id, activity_type, description, actor_id, actor_type,
        entity_type, entity_id, metadata, created_at
      FROM client_activities
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [clientId, limit]
    );

    return result.rows.map(row => ({
      id: row.id.toString(),
      type: row.activity_type,
      description: row.description,
      timestamp: row.created_at.toISOString(),
      metadata: row.metadata,
      actor: {
        id: row.actor_id,
        type: row.actor_type,
      },
      entity: row.entity_type ? {
        type: row.entity_type,
        id: row.entity_id,
      } : null,
    }));
  } catch (error) {
    console.error('Error getting activities:', error);
    return [];
  }
}

/**
 * Log activity (Stripe-style audit trail)
 */
export async function logActivity(
  clientId: number,
  activityType: string,
  description: string,
  actorId: string,
  metadata?: any,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await pool.query(
      `INSERT INTO client_activities (
        client_id, activity_type, description, actor_id, actor_type,
        metadata, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        clientId,
        activityType,
        description,
        actorId,
        'user',
        metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        userAgent,
      ]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
