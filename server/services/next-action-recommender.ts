/**
 * @deprecated This service has been replaced by v2/business-lifecycle-service.ts
 * Action recommendations are now part of lifecycle API
 * Removal planned for: 2026-06-01
 */
console.warn('⚠️  DEPRECATED: next-action-recommender.ts - Use v2/business-lifecycle-service.ts instead');

import { pool } from '../db';

interface NextAction {
  id: string;
  title: string;
  timeEstimate: string;
  whyMatters: {
    benefits: string[];
    socialProof: string;
  };
  actionType: 'upload' | 'review' | 'confirm' | 'pay' | 'sign' | 'verify';
  instructions: string[];
  documentType?: string;
  dueDate: string;
  priority: number;
  ruleCode: string;
}

interface ComplianceState {
  overallState: 'GREEN' | 'AMBER' | 'RED';
  daysSafe: number;
  nextCriticalAction?: {
    ruleCode: string;
    dueDate: string;
    isOverdue: boolean;
  };
}

/**
 * Get the single highest-priority action for a client
 * Priority logic:
 * 1. Overdue items (past due date) - highest priority
 * 2. Due within 7 days - high priority
 * 3. Missing prerequisite documents - medium priority  
 * 4. Upcoming within 30 days - lower priority
 * 5. No action needed - null
 */
export async function getNextPrioritizedAction(
  clientId: string,
  complianceState: ComplianceState
): Promise<NextAction | null> {
  try {
    // Get all pending compliance items for this client
    const result = await pool.query(
      `
      SELECT 
        cr.id,
        cr.rule_code,
        cr.compliance_name,
        cr.friendly_label,
        cr.action_verb,
        cr.estimated_time_minutes,
        cr.why_matters,
        cr.instructions,
        cr.due_date_calculation_type,
        cr.due_date_formula,
        cs.due_date,
        cs.status,
        CASE
          WHEN cs.due_date < CURRENT_DATE THEN 1000 + EXTRACT(DAY FROM CURRENT_DATE - cs.due_date)::int
          WHEN cs.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 500
          WHEN cs.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 300
          WHEN cs.due_date <= CURRENT_DATE + INTERVAL '14 days' THEN 200
          WHEN cs.due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 100
          ELSE 50
        END as priority_score
      FROM compliance_rules cr
      LEFT JOIN compliance_states cs ON cs.rule_code = cr.rule_code 
        AND cs.entity_id = $1
      WHERE cr.is_active = true
        AND cr.friendly_label IS NOT NULL
        AND (cs.status IS NULL OR cs.status IN ('PENDING', 'IN_PROGRESS', 'REQUIRED'))
      ORDER BY priority_score DESC, cs.due_date ASC NULLS LAST
      LIMIT 1
      `,
      [clientId]
    );

    if (result.rows.length === 0) {
      return null; // All caught up!
    }

    const row = result.rows[0];

    // Calculate due date if not already set
    let dueDate = row.due_date;
    if (!dueDate && row.due_date_formula) {
      dueDate = calculateDueDate(row.due_date_formula);
    }

    // Parse why_matters from JSONB
    let whyMatters = {
      benefits: ['Complete this compliance requirement', 'Stay legally compliant'],
      socialProof: 'Important for your business',
    };

    if (row.why_matters) {
      try {
        whyMatters = typeof row.why_matters === 'string' 
          ? JSON.parse(row.why_matters) 
          : row.why_matters;
      } catch (e) {
        console.error('Failed to parse why_matters:', e);
      }
    }

    // Format time estimate
    const timeEstimate = row.estimated_time_minutes 
      ? `${row.estimated_time_minutes} minute${row.estimated_time_minutes > 1 ? 's' : ''}`
      : '10 minutes';

    // Generate unique action ID
    const actionId = `action_${row.rule_code}_${Date.now()}`;

    return {
      id: actionId,
      title: row.friendly_label || row.compliance_name,
      timeEstimate,
      whyMatters,
      actionType: row.action_verb || 'upload',
      instructions: row.instructions || [
        'Complete this compliance requirement',
        'Upload required documents',
        'We\'ll process it automatically',
      ],
      documentType: row.rule_code,
      dueDate: dueDate ? dueDate.toISOString() : new Date().toISOString(),
      priority: row.priority_score,
      ruleCode: row.rule_code,
    };
  } catch (error) {
    console.error('Error getting next action:', error);
    return null;
  }
}

/**
 * Get recent compliance activities for a client
 */
export async function getRecentActivities(
  clientId: string,
  limit: number = 5
): Promise<Array<{
  id: string;
  type: string;
  description: string;
  timestamp: string;
  icon?: string;
}>> {
  try {
    const result = await pool.query(
      `
      SELECT 
        csh.id,
        csh.event_type as type,
        csh.description,
        csh.created_at as timestamp,
        CASE csh.event_type
          WHEN 'DOCUMENT_UPLOADED' THEN 'Upload'
          WHEN 'FILING_COMPLETED' THEN 'FileText'
          WHEN 'PAYMENT_COMPLETED' THEN 'DollarSign'
          WHEN 'STATUS_CHANGED' THEN 'CheckCircle'
          ELSE 'FileText'
        END as icon
      FROM compliance_state_history csh
      WHERE csh.entity_id = $1
        AND csh.created_at >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY csh.created_at DESC
      LIMIT $2
      `,
      [clientId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id.toString(),
      type: row.type,
      description: row.description || formatActivityDescription(row.type),
      timestamp: row.timestamp.toISOString(),
      icon: row.icon,
    }));
  } catch (error) {
    console.error('Error getting recent activities:', error);
    // Return empty array on error
    return [];
  }
}

/**
 * Calculate due date based on formula
 */
function calculateDueDate(formula: any): Date {
  try {
    const parsed = typeof formula === 'string' ? JSON.parse(formula) : formula;
    const today = new Date();
    
    if (parsed.day) {
      // Fixed day of month
      const dueDate = new Date(today.getFullYear(), today.getMonth() + (parsed.month || 0), parsed.day);
      if (dueDate < today) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      return dueDate;
    }
    
    // Default to 30 days from now
    return new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  } catch (error) {
    console.error('Error calculating due date:', error);
    return new Date();
  }
}

/**
 * Format activity description for display
 */
function formatActivityDescription(eventType: string): string {
  const descriptions: Record<string, string> = {
    DOCUMENT_UPLOADED: 'Document uploaded',
    FILING_COMPLETED: 'Filing completed',
    PAYMENT_COMPLETED: 'Payment completed',
    STATUS_CHANGED: 'Status updated',
    STATE_CALCULATED: 'Compliance state calculated',
    ALERT_CREATED: 'Alert created',
  };

  return descriptions[eventType] || 'Activity recorded';
}

/**
 * Complete an action (called when user submits)
 */
export async function completeAction(
  actionId: string,
  clientId: string,
  data: {
    files?: string[];
    confirmationData?: any;
    paymentReference?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  newState?: {
    complianceState: string;
    daysSafe: number;
  };
}> {
  try {
    // Extract rule code from action ID
    const ruleCode = actionId.split('_')[1];

    if (!ruleCode) {
      throw new Error('Invalid action ID');
    }

    // Update compliance state to COMPLETED
    await pool.query(
      `
      UPDATE compliance_states
      SET status = 'COMPLETED',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE entity_id = $1
        AND rule_code = $2
      `,
      [clientId, ruleCode]
    );

    // Log activity
    await pool.query(
      `
      INSERT INTO compliance_state_history (
        entity_id,
        rule_code,
        event_type,
        description,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [
        clientId,
        ruleCode,
        'ACTION_COMPLETED',
        `Action completed: ${ruleCode}`,
        JSON.stringify(data),
      ]
    );

    // Trigger recalculation (if compliance-event-emitter is available)
    try {
      const { triggerEntityRecalculation } = require('./compliance-event-emitter');
      triggerEntityRecalculation(clientId, 'action_completed', { ruleCode, actionId });
    } catch (err) {
      console.warn('Could not trigger recalculation:', err);
    }

    // Calculate new state (simplified)
    const stateResult = await pool.query(
      `
      SELECT overall_state, days_until_critical
      FROM compliance_states
      WHERE entity_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
      `,
      [clientId]
    );

    let newState;
    if (stateResult.rows.length > 0) {
      newState = {
        complianceState: stateResult.rows[0].overall_state,
        daysSafe: stateResult.rows[0].days_until_critical || 0,
      };
    }

    return {
      success: true,
      message: 'Action completed successfully',
      newState,
    };
  } catch (error: any) {
    console.error('Error completing action:', error);
    return {
      success: false,
      message: error.message || 'Failed to complete action',
    };
  }
}
