/**
 * Service Request State Machine
 *
 * Enforces valid status transitions and workflow rules for service requests.
 * This is CRITICAL for ensuring proper workflow execution and preventing
 * invalid state changes that could corrupt data or bypass required steps.
 */

import { db } from '../db';
import { serviceRequests, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Valid service request statuses
export const SERVICE_REQUEST_STATUSES = {
  // Initial States
  DRAFT: 'draft',
  INITIATED: 'initiated',
  PENDING_PAYMENT: 'pending_payment',

  // Active Processing States
  PAYMENT_RECEIVED: 'payment_received',
  DOCUMENTS_PENDING: 'documents_pending',
  DOCUMENTS_UPLOADED: 'documents_uploaded',
  DOCUMENTS_VERIFIED: 'documents_verified',
  IN_PROGRESS: 'in_progress',
  PROCESSING: 'processing',

  // Review States
  PENDING_REVIEW: 'pending_review',
  UNDER_REVIEW: 'under_review',
  QC_REVIEW: 'qc_review',
  QC_APPROVED: 'qc_approved',
  QC_REJECTED: 'qc_rejected',

  // Delivery States
  READY_FOR_DELIVERY: 'ready_for_delivery',
  DELIVERED: 'delivered',
  AWAITING_CLIENT_CONFIRMATION: 'awaiting_client_confirmation',

  // Terminal States
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
  REJECTED: 'rejected',

  // Escalation States
  ESCALATED: 'escalated',
  SLA_BREACHED: 'sla_breached'
} as const;

export type ServiceRequestStatus = typeof SERVICE_REQUEST_STATUSES[keyof typeof SERVICE_REQUEST_STATUSES];

// Define valid transitions - from status -> allowed to statuses
const VALID_TRANSITIONS: Record<string, string[]> = {
  // Draft can only go to initiated or cancelled
  [SERVICE_REQUEST_STATUSES.DRAFT]: [
    SERVICE_REQUEST_STATUSES.INITIATED,
    SERVICE_REQUEST_STATUSES.CANCELLED
  ],

  // Initiated goes to payment or documents
  [SERVICE_REQUEST_STATUSES.INITIATED]: [
    SERVICE_REQUEST_STATUSES.PENDING_PAYMENT,
    SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING,
    SERVICE_REQUEST_STATUSES.CANCELLED,
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  // Payment flow
  [SERVICE_REQUEST_STATUSES.PENDING_PAYMENT]: [
    SERVICE_REQUEST_STATUSES.PAYMENT_RECEIVED,
    SERVICE_REQUEST_STATUSES.CANCELLED,
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  [SERVICE_REQUEST_STATUSES.PAYMENT_RECEIVED]: [
    SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING,
    SERVICE_REQUEST_STATUSES.IN_PROGRESS,
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  // Document flow
  [SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING]: [
    SERVICE_REQUEST_STATUSES.DOCUMENTS_UPLOADED,
    SERVICE_REQUEST_STATUSES.ON_HOLD,
    SERVICE_REQUEST_STATUSES.CANCELLED
  ],

  [SERVICE_REQUEST_STATUSES.DOCUMENTS_UPLOADED]: [
    SERVICE_REQUEST_STATUSES.DOCUMENTS_VERIFIED,
    SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING, // Reject back for re-upload
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  [SERVICE_REQUEST_STATUSES.DOCUMENTS_VERIFIED]: [
    SERVICE_REQUEST_STATUSES.IN_PROGRESS,
    SERVICE_REQUEST_STATUSES.PROCESSING,
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  // Processing flow
  [SERVICE_REQUEST_STATUSES.IN_PROGRESS]: [
    SERVICE_REQUEST_STATUSES.PROCESSING,
    SERVICE_REQUEST_STATUSES.PENDING_REVIEW,
    SERVICE_REQUEST_STATUSES.QC_REVIEW,
    SERVICE_REQUEST_STATUSES.ON_HOLD,
    SERVICE_REQUEST_STATUSES.ESCALATED
  ],

  [SERVICE_REQUEST_STATUSES.PROCESSING]: [
    SERVICE_REQUEST_STATUSES.PENDING_REVIEW,
    SERVICE_REQUEST_STATUSES.QC_REVIEW,
    SERVICE_REQUEST_STATUSES.IN_PROGRESS, // Back to in_progress if issues
    SERVICE_REQUEST_STATUSES.ON_HOLD,
    SERVICE_REQUEST_STATUSES.ESCALATED
  ],

  // Review flow
  [SERVICE_REQUEST_STATUSES.PENDING_REVIEW]: [
    SERVICE_REQUEST_STATUSES.UNDER_REVIEW,
    SERVICE_REQUEST_STATUSES.QC_REVIEW,
    SERVICE_REQUEST_STATUSES.IN_PROGRESS,
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  [SERVICE_REQUEST_STATUSES.UNDER_REVIEW]: [
    SERVICE_REQUEST_STATUSES.QC_REVIEW,
    SERVICE_REQUEST_STATUSES.IN_PROGRESS, // Needs more work
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  // QC flow - CRITICAL: Must pass QC before delivery
  [SERVICE_REQUEST_STATUSES.QC_REVIEW]: [
    SERVICE_REQUEST_STATUSES.QC_APPROVED,
    SERVICE_REQUEST_STATUSES.QC_REJECTED,
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  [SERVICE_REQUEST_STATUSES.QC_APPROVED]: [
    SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY,
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  [SERVICE_REQUEST_STATUSES.QC_REJECTED]: [
    SERVICE_REQUEST_STATUSES.IN_PROGRESS, // Back to work
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  // Delivery flow
  [SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY]: [
    SERVICE_REQUEST_STATUSES.DELIVERED,
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  [SERVICE_REQUEST_STATUSES.DELIVERED]: [
    SERVICE_REQUEST_STATUSES.AWAITING_CLIENT_CONFIRMATION,
    SERVICE_REQUEST_STATUSES.COMPLETED
  ],

  [SERVICE_REQUEST_STATUSES.AWAITING_CLIENT_CONFIRMATION]: [
    SERVICE_REQUEST_STATUSES.COMPLETED,
    SERVICE_REQUEST_STATUSES.IN_PROGRESS // Client rejects delivery
  ],

  // Terminal states - limited transitions
  [SERVICE_REQUEST_STATUSES.COMPLETED]: [], // No transitions from completed
  [SERVICE_REQUEST_STATUSES.CANCELLED]: [], // No transitions from cancelled

  // Special states
  [SERVICE_REQUEST_STATUSES.ON_HOLD]: [
    SERVICE_REQUEST_STATUSES.INITIATED,
    SERVICE_REQUEST_STATUSES.IN_PROGRESS,
    SERVICE_REQUEST_STATUSES.PENDING_PAYMENT,
    SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING,
    SERVICE_REQUEST_STATUSES.CANCELLED
  ],

  [SERVICE_REQUEST_STATUSES.ESCALATED]: [
    SERVICE_REQUEST_STATUSES.IN_PROGRESS,
    SERVICE_REQUEST_STATUSES.ON_HOLD,
    SERVICE_REQUEST_STATUSES.CANCELLED
  ],

  [SERVICE_REQUEST_STATUSES.SLA_BREACHED]: [
    SERVICE_REQUEST_STATUSES.IN_PROGRESS,
    SERVICE_REQUEST_STATUSES.ESCALATED,
    SERVICE_REQUEST_STATUSES.ON_HOLD
  ],

  [SERVICE_REQUEST_STATUSES.REJECTED]: [
    SERVICE_REQUEST_STATUSES.INITIATED // Allow re-initiation
  ]
};

// Roles that can perform each transition
const TRANSITION_PERMISSIONS: Record<string, string[]> = {
  // Client can only cancel drafts and confirm delivery
  'client_cancel': ['client'],
  'client_confirm_delivery': ['client'],

  // Operations can handle most processing transitions
  'ops_process': ['ops_executive', 'ops_manager', 'admin', 'super_admin'],

  // QC transitions
  'qc_approve': ['qc_executive', 'ops_manager', 'admin', 'super_admin'],
  'qc_reject': ['qc_executive', 'ops_manager', 'admin', 'super_admin'],

  // Manager-level transitions
  'escalate': ['ops_manager', 'admin', 'super_admin'],
  'hold': ['ops_manager', 'admin', 'super_admin'],
  'cancel': ['ops_manager', 'admin', 'super_admin'],

  // Admin-only transitions
  'admin_override': ['admin', 'super_admin']
};

// Required conditions for certain transitions
interface TransitionCondition {
  check: (serviceRequest: any, context?: any) => Promise<boolean>;
  errorMessage: string;
}

const TRANSITION_CONDITIONS: Record<string, TransitionCondition[]> = {
  [`${SERVICE_REQUEST_STATUSES.PENDING_PAYMENT}->${SERVICE_REQUEST_STATUSES.PAYMENT_RECEIVED}`]: [
    {
      check: async (sr) => {
        // Check if payment exists
        return true; // In production, check payments table
      },
      errorMessage: 'Payment must be received before transitioning'
    }
  ],

  [`${SERVICE_REQUEST_STATUSES.DOCUMENTS_UPLOADED}->${SERVICE_REQUEST_STATUSES.DOCUMENTS_VERIFIED}`]: [
    {
      check: async (sr) => {
        // Check if all required documents are uploaded
        return true; // In production, check documents
      },
      errorMessage: 'All required documents must be uploaded and verified'
    }
  ],

  [`${SERVICE_REQUEST_STATUSES.QC_REVIEW}->${SERVICE_REQUEST_STATUSES.QC_APPROVED}`]: [
    {
      check: async (sr, context) => {
        // Ensure QC review was performed by QC role
        return context?.performedBy?.role?.includes('qc') ||
               context?.performedBy?.role === 'ops_manager' ||
               context?.performedBy?.role === 'admin';
      },
      errorMessage: 'QC approval must be performed by QC personnel'
    }
  ],

  [`${SERVICE_REQUEST_STATUSES.QC_APPROVED}->${SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY}`]: [
    {
      check: async (sr) => {
        // QC must be approved first
        return sr.qcStatus === 'approved' || sr.status === SERVICE_REQUEST_STATUSES.QC_APPROVED;
      },
      errorMessage: 'Service request must pass QC before delivery'
    }
  ],

  [`${SERVICE_REQUEST_STATUSES.DELIVERED}->${SERVICE_REQUEST_STATUSES.COMPLETED}`]: [
    {
      check: async (sr) => {
        // Delivery must be confirmed or auto-complete after timeout
        return true; // In production, check delivery confirmation
      },
      errorMessage: 'Delivery must be confirmed before completion'
    }
  ]
};

export interface TransitionResult {
  success: boolean;
  previousStatus: string;
  newStatus: string;
  message: string;
  transitionId?: string;
  timestamp: string;
}

export interface TransitionContext {
  performedBy: {
    id: number;
    username: string;
    role: string;
  };
  reason?: string;
  notes?: string;
  force?: boolean; // Admin override
}

/**
 * Validate if a status transition is allowed
 */
export function isValidTransition(fromStatus: string, toStatus: string): boolean {
  const allowedTransitions = VALID_TRANSITIONS[fromStatus];
  if (!allowedTransitions) {
    console.warn(`Unknown status: ${fromStatus}`);
    return false;
  }
  return allowedTransitions.includes(toStatus);
}

/**
 * Get all valid next statuses from current status
 */
export function getValidNextStatuses(currentStatus: string): string[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Perform a validated status transition
 */
export async function transitionStatus(
  serviceRequestId: number,
  toStatus: string,
  context: TransitionContext
): Promise<TransitionResult> {
  const timestamp = new Date().toISOString();

  try {
    // Get current service request
    const [serviceRequest] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!serviceRequest) {
      return {
        success: false,
        previousStatus: '',
        newStatus: toStatus,
        message: 'Service request not found',
        timestamp
      };
    }

    const fromStatus = serviceRequest.status;

    // Check if transition is valid (unless force override)
    if (!context.force && !isValidTransition(fromStatus, toStatus)) {
      return {
        success: false,
        previousStatus: fromStatus,
        newStatus: toStatus,
        message: `Invalid transition: ${fromStatus} -> ${toStatus}. Valid transitions: ${getValidNextStatuses(fromStatus).join(', ')}`,
        timestamp
      };
    }

    // Check transition conditions
    const conditionKey = `${fromStatus}->${toStatus}`;
    const conditions = TRANSITION_CONDITIONS[conditionKey] || [];

    for (const condition of conditions) {
      const passed = await condition.check(serviceRequest, context);
      if (!passed && !context.force) {
        return {
          success: false,
          previousStatus: fromStatus,
          newStatus: toStatus,
          message: condition.errorMessage,
          timestamp
        };
      }
    }

    // Perform the transition
    await db
      .update(serviceRequests)
      .set({
        status: toStatus,
        lastStatusChangeAt: new Date(),
        lastStatusChangeBy: context.performedBy.id,
        statusChangeReason: context.reason || null,
        updatedAt: new Date()
      })
      .where(eq(serviceRequests.id, serviceRequestId));

    // Log the transition (in production, log to audit table)
    console.log(`[STATE MACHINE] Service Request ${serviceRequestId}: ${fromStatus} -> ${toStatus} by ${context.performedBy.username}`);

    return {
      success: true,
      previousStatus: fromStatus,
      newStatus: toStatus,
      message: `Status updated from ${fromStatus} to ${toStatus}`,
      transitionId: `TRN-${Date.now()}`,
      timestamp
    };

  } catch (error: any) {
    console.error('State machine transition error:', error);
    return {
      success: false,
      previousStatus: '',
      newStatus: toStatus,
      message: `Transition failed: ${error.message}`,
      timestamp
    };
  }
}

/**
 * Get status workflow diagram data (for UI visualization)
 */
export function getWorkflowDiagram() {
  const nodes = Object.values(SERVICE_REQUEST_STATUSES).map(status => ({
    id: status,
    label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: getStatusType(status)
  }));

  const edges: { from: string; to: string }[] = [];
  Object.entries(VALID_TRANSITIONS).forEach(([from, toList]) => {
    toList.forEach(to => {
      edges.push({ from, to });
    });
  });

  return { nodes, edges };
}

function getStatusType(status: string): 'initial' | 'active' | 'review' | 'delivery' | 'terminal' | 'special' {
  if (['draft', 'initiated', 'pending_payment'].includes(status)) return 'initial';
  if (['payment_received', 'documents_pending', 'documents_uploaded', 'documents_verified', 'in_progress', 'processing'].includes(status)) return 'active';
  if (['pending_review', 'under_review', 'qc_review', 'qc_approved', 'qc_rejected'].includes(status)) return 'review';
  if (['ready_for_delivery', 'delivered', 'awaiting_client_confirmation'].includes(status)) return 'delivery';
  if (['completed', 'cancelled', 'rejected'].includes(status)) return 'terminal';
  return 'special';
}

/**
 * Calculate progress percentage based on status
 */
export function getProgressPercentage(status: string): number {
  const progressMap: Record<string, number> = {
    [SERVICE_REQUEST_STATUSES.DRAFT]: 0,
    [SERVICE_REQUEST_STATUSES.INITIATED]: 5,
    [SERVICE_REQUEST_STATUSES.PENDING_PAYMENT]: 10,
    [SERVICE_REQUEST_STATUSES.PAYMENT_RECEIVED]: 15,
    [SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING]: 20,
    [SERVICE_REQUEST_STATUSES.DOCUMENTS_UPLOADED]: 30,
    [SERVICE_REQUEST_STATUSES.DOCUMENTS_VERIFIED]: 40,
    [SERVICE_REQUEST_STATUSES.IN_PROGRESS]: 50,
    [SERVICE_REQUEST_STATUSES.PROCESSING]: 60,
    [SERVICE_REQUEST_STATUSES.PENDING_REVIEW]: 70,
    [SERVICE_REQUEST_STATUSES.UNDER_REVIEW]: 75,
    [SERVICE_REQUEST_STATUSES.QC_REVIEW]: 80,
    [SERVICE_REQUEST_STATUSES.QC_APPROVED]: 85,
    [SERVICE_REQUEST_STATUSES.QC_REJECTED]: 60, // Back to processing
    [SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY]: 90,
    [SERVICE_REQUEST_STATUSES.DELIVERED]: 95,
    [SERVICE_REQUEST_STATUSES.AWAITING_CLIENT_CONFIRMATION]: 97,
    [SERVICE_REQUEST_STATUSES.COMPLETED]: 100,
    [SERVICE_REQUEST_STATUSES.CANCELLED]: 0,
    [SERVICE_REQUEST_STATUSES.ON_HOLD]: -1, // Special indicator
    [SERVICE_REQUEST_STATUSES.ESCALATED]: -1,
    [SERVICE_REQUEST_STATUSES.SLA_BREACHED]: -1,
    [SERVICE_REQUEST_STATUSES.REJECTED]: 0
  };

  return progressMap[status] ?? 0;
}

/**
 * Get estimated remaining steps count
 */
export function getRemainingSteps(currentStatus: string): number {
  const stepsToCompletion: Record<string, number> = {
    [SERVICE_REQUEST_STATUSES.DRAFT]: 10,
    [SERVICE_REQUEST_STATUSES.INITIATED]: 9,
    [SERVICE_REQUEST_STATUSES.PENDING_PAYMENT]: 8,
    [SERVICE_REQUEST_STATUSES.PAYMENT_RECEIVED]: 7,
    [SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING]: 6,
    [SERVICE_REQUEST_STATUSES.DOCUMENTS_UPLOADED]: 5,
    [SERVICE_REQUEST_STATUSES.DOCUMENTS_VERIFIED]: 4,
    [SERVICE_REQUEST_STATUSES.IN_PROGRESS]: 4,
    [SERVICE_REQUEST_STATUSES.PROCESSING]: 3,
    [SERVICE_REQUEST_STATUSES.QC_REVIEW]: 3,
    [SERVICE_REQUEST_STATUSES.QC_APPROVED]: 2,
    [SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY]: 2,
    [SERVICE_REQUEST_STATUSES.DELIVERED]: 1,
    [SERVICE_REQUEST_STATUSES.AWAITING_CLIENT_CONFIRMATION]: 1,
    [SERVICE_REQUEST_STATUSES.COMPLETED]: 0,
    [SERVICE_REQUEST_STATUSES.CANCELLED]: 0
  };

  return stepsToCompletion[currentStatus] ?? 5;
}
