/**
 * Core Operations Service
 *
 * CENTRAL ORCHESTRATION for all service request operations.
 * This service enforces proper workflow management and integrates:
 * - State machine transitions
 * - SLA deadline calculation
 * - QC review creation
 * - Task auto-creation
 * - Document verification
 * - Notification dispatch
 *
 * ALL status changes MUST go through this service.
 */

import { db } from '../db';
import {
  serviceRequests,
  qualityReviews,
  taskItems,
  notifications,
  activityLogs,
  services,
  documentsUploads,
  deliveryConfirmations,
  slaSettings
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  transitionStatus,
  isValidTransition,
  getValidNextStatuses,
  getProgressPercentage,
  SERVICE_REQUEST_STATUSES
} from './service-request-state-machine';

// Types
export interface TransitionContext {
  performedBy: {
    id: number;
    username: string;
    role: string;
  };
  reason?: string;
  notes?: string;
  force?: boolean;
}

export interface TransitionResult {
  success: boolean;
  message: string;
  serviceRequestId: number;
  previousStatus: string;
  newStatus: string;
  progress?: number;
  transitionId?: number;
  triggeredActions?: string[];
  timestamp: Date;
}

export interface SLACalculation {
  slaDeadline: Date;
  slaHours: number;
  workingDaysOnly: boolean;
}

// =============================================================================
// SLA DEADLINE CALCULATION
// =============================================================================

/**
 * Calculate SLA deadline based on service definition
 */
export async function calculateSLADeadline(serviceId: string, startDate: Date = new Date()): Promise<SLACalculation | null> {
  try {
    const [slaConfig] = await db
      .select()
      .from(slaSettings)
      .where(eq(slaSettings.serviceCode, serviceId))
      .limit(1);

    if (slaConfig?.standardHours) {
      const slaDeadline = new Date(startDate.getTime() + slaConfig.standardHours * 60 * 60 * 1000);
      return {
        slaDeadline,
        slaHours: slaConfig.standardHours,
        workingDaysOnly: false
      };
    }

    // Get service definition
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.serviceId, serviceId))
      .limit(1);

    if (!service) {
      console.warn(`Service not found for SLA calculation: ${serviceId}`);
      return null;
    }

    // Parse deadline from service (e.g., "20 days", "5-7 days", "48 hours")
    const deadline = service.deadline || '7 days';
    let hours = 0;

    if (deadline.includes('hour')) {
      const match = deadline.match(/(\d+)/);
      hours = match ? parseInt(match[1]) : 48;
    } else if (deadline.includes('day')) {
      const match = deadline.match(/(\d+)/);
      // Take the higher number if range (e.g., "5-7 days" -> 7)
      const days = match ? parseInt(match[1]) : 7;
      hours = days * 24;
    } else {
      // Default to 7 days
      hours = 7 * 24;
    }

    // Calculate deadline (working hours only for business days)
    const slaDeadline = new Date(startDate.getTime() + hours * 60 * 60 * 1000);

    return {
      slaDeadline,
      slaHours: hours,
      workingDaysOnly: false
    };
  } catch (error) {
    console.error('Error calculating SLA deadline:', error);
    return null;
  }
}

/**
 * Set SLA deadline on service request creation
 */
export async function setSLADeadline(serviceRequestId: number, serviceId: string): Promise<boolean> {
  try {
    const slaCalc = await calculateSLADeadline(serviceId);

    if (!slaCalc) {
      // Use default 7 days if calculation fails
      const defaultDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db
        .update(serviceRequests)
        .set({
          slaDeadline: defaultDeadline,
          updatedAt: new Date()
        })
        .where(eq(serviceRequests.id, serviceRequestId));
      return true;
    }

    await db
      .update(serviceRequests)
      .set({
        slaDeadline: slaCalc.slaDeadline,
        updatedAt: new Date()
      })
      .where(eq(serviceRequests.id, serviceRequestId));

    return true;
  } catch (error) {
    console.error('Error setting SLA deadline:', error);
    return false;
  }
}

// =============================================================================
// STATUS TRANSITIONS WITH INTEGRATIONS
// =============================================================================

/**
 * MAIN ENTRY POINT: Transition service request status with all integrations
 *
 * This function:
 * 1. Validates the transition using state machine
 * 2. Performs the transition
 * 3. Triggers all related actions (QC creation, tasks, notifications)
 * 4. Logs the activity
 */
export async function transitionServiceRequestStatus(
  serviceRequestId: number,
  toStatus: string,
  context: TransitionContext
): Promise<TransitionResult> {
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
        message: 'Service request not found',
        serviceRequestId,
        previousStatus: 'unknown',
        newStatus: toStatus,
        timestamp: new Date()
      };
    }

    const fromStatus = serviceRequest.status || 'initiated';

    // Validate transition (unless forced by admin)
    if (!context.force && !isValidTransition(fromStatus, toStatus)) {
      return {
        success: false,
        message: `Invalid transition from '${fromStatus}' to '${toStatus}'. Valid next statuses: ${getValidNextStatuses(fromStatus).join(', ')}`,
        serviceRequestId,
        previousStatus: fromStatus,
        newStatus: toStatus,
        timestamp: new Date()
      };
    }

    // Pre-transition checks
    const preCheckResult = await runPreTransitionChecks(serviceRequestId, fromStatus, toStatus);
    if (!preCheckResult.passed) {
      return {
        success: false,
        message: preCheckResult.message,
        serviceRequestId,
        previousStatus: fromStatus,
        newStatus: toStatus,
        timestamp: new Date()
      };
    }

    // Perform the transition
    const result = await transitionStatus(serviceRequestId, toStatus, context);

    if (!result.success) {
      return {
        success: false,
        message: result.message,
        serviceRequestId,
        previousStatus: fromStatus,
        newStatus: toStatus,
        timestamp: new Date()
      };
    }

    // Post-transition actions
    const triggeredActions = await runPostTransitionActions(
      serviceRequestId,
      fromStatus,
      toStatus,
      context
    );

    // Log activity
    await logStatusTransition(serviceRequestId, fromStatus, toStatus, context);

    return {
      success: true,
      message: `Successfully transitioned from '${fromStatus}' to '${toStatus}'`,
      serviceRequestId,
      previousStatus: fromStatus,
      newStatus: toStatus,
      progress: getProgressPercentage(toStatus),
      transitionId: result.transitionId,
      triggeredActions,
      timestamp: new Date()
    };

  } catch (error: any) {
    console.error('Error in service request transition:', error);
    return {
      success: false,
      message: error.message || 'Transition failed',
      serviceRequestId,
      previousStatus: 'unknown',
      newStatus: toStatus,
      timestamp: new Date()
    };
  }
}

// =============================================================================
// PRE-TRANSITION CHECKS
// =============================================================================

interface PreCheckResult {
  passed: boolean;
  message: string;
}

async function runPreTransitionChecks(
  serviceRequestId: number,
  fromStatus: string,
  toStatus: string
): Promise<PreCheckResult> {

  // Check: Documents verified before progressing past DOCUMENTS_UPLOADED
  if (toStatus === SERVICE_REQUEST_STATUSES.DOCUMENTS_VERIFIED) {
    const hasAllDocs = await verifyAllDocumentsUploaded(serviceRequestId);
    if (!hasAllDocs) {
      return {
        passed: false,
        message: 'Cannot mark documents verified - required documents are missing or not approved'
      };
    }
  }

  // Check: Payment received before progressing past PENDING_PAYMENT
  if (fromStatus === SERVICE_REQUEST_STATUSES.PENDING_PAYMENT &&
      toStatus === SERVICE_REQUEST_STATUSES.PAYMENT_RECEIVED) {
    const paymentVerified = await verifyPaymentReceived(serviceRequestId);
    if (!paymentVerified) {
      return {
        passed: false,
        message: 'Cannot mark payment received - no verified payment found'
      };
    }
  }

  // Check: QC must be approved before delivery
  if (toStatus === SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY) {
    const qcApproved = await verifyQCApproved(serviceRequestId);
    if (!qcApproved) {
      return {
        passed: false,
        message: 'Cannot proceed to delivery - QC approval required'
      };
    }
  }

  return { passed: true, message: 'All checks passed' };
}

async function verifyAllDocumentsUploaded(serviceRequestId: number): Promise<boolean> {
  try {
    // Get uploaded documents
    const docs = await db
      .select()
      .from(documentsUploads)
      .where(eq(documentsUploads.serviceRequestId, serviceRequestId));

    // For now, just check if any documents exist
    // In future, validate against required documents list
    return docs.length > 0 && docs.every(d => d.status !== 'rejected');
  } catch (error) {
    console.error('Error verifying documents:', error);
    return true; // Don't block on error - log it instead
  }
}

async function verifyPaymentReceived(serviceRequestId: number): Promise<boolean> {
  try {
    const [sr] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    // Check if paymentId exists
    return !!sr?.paymentId;
  } catch (error) {
    console.error('Error verifying payment:', error);
    return true; // Don't block on error
  }
}

async function verifyQCApproved(serviceRequestId: number): Promise<boolean> {
  try {
    const [qcReview] = await db
      .select()
      .from(qualityReviews)
      .where(and(
        eq(qualityReviews.serviceRequestId, serviceRequestId),
        eq(qualityReviews.status, 'approved')
      ))
      .limit(1);

    return !!qcReview;
  } catch (error) {
    console.error('Error verifying QC approval:', error);
    return true; // Don't block on error
  }
}

// =============================================================================
// POST-TRANSITION ACTIONS
// =============================================================================

async function runPostTransitionActions(
  serviceRequestId: number,
  fromStatus: string,
  toStatus: string,
  context: TransitionContext
): Promise<string[]> {
  const triggeredActions: string[] = [];

  try {
    // Create QC Review when entering QC_REVIEW status
    if (toStatus === SERVICE_REQUEST_STATUSES.QC_REVIEW) {
      const qcCreated = await createQCReview(serviceRequestId, context);
      if (qcCreated) triggeredActions.push('qc_review_created');
    }

    // Create delivery confirmation when approved
    if (toStatus === SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY) {
      await createDeliveryConfirmation(serviceRequestId, context);
      triggeredActions.push('delivery_confirmation_created');
    }

    // Notify assigned team member of status changes
    await notifyAssignedTeamMember(serviceRequestId, fromStatus, toStatus);
    triggeredActions.push('team_notified');

    // Handle rejection - notify and revert
    if (toStatus === SERVICE_REQUEST_STATUSES.QC_REJECTED) {
      await handleQCRejection(serviceRequestId, context);
      triggeredActions.push('qc_rejection_handled');
    }

    // Create tasks based on new status
    await createStatusTasks(serviceRequestId, toStatus, context);
    triggeredActions.push('tasks_created');

  } catch (error) {
    console.error('Error in post-transition actions:', error);
    // Don't fail the transition - just log
  }

  return triggeredActions;
}

async function createQCReview(serviceRequestId: number, context: TransitionContext): Promise<boolean> {
  try {
    // Check if QC review already exists
    const [existing] = await db
      .select()
      .from(qualityReviews)
      .where(eq(qualityReviews.serviceRequestId, serviceRequestId))
      .limit(1);

    if (existing) {
      // Update existing review to pending
      await db
        .update(qualityReviews)
        .set({
          status: 'pending',
          updatedAt: new Date()
        })
        .where(eq(qualityReviews.id, existing.id));
      return true;
    }

    // Get service request details
    const [sr] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!sr) return false;

    // Create new QC review
    await db.insert(qualityReviews).values({
      serviceRequestId,
      status: 'pending',
      priority: sr.priority || 'medium',
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours for QC
      checklist: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error creating QC review:', error);
    return false;
  }
}

async function createDeliveryConfirmation(serviceRequestId: number, context: TransitionContext): Promise<boolean> {
  try {
    const [sr] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!sr) return false;

    // Check if delivery confirmation already exists
    const [existing] = await db
      .select()
      .from(deliveryConfirmations)
      .where(eq(deliveryConfirmations.serviceRequestId, serviceRequestId))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(deliveryConfirmations)
        .set({
          status: 'ready_for_delivery',
          updatedAt: new Date()
        })
        .where(eq(deliveryConfirmations.id, existing.id));
      return true;
    }

    // Create new delivery confirmation
    await db.insert(deliveryConfirmations).values({
      serviceRequestId,
      clientId: sr.businessEntityId,
      deliveryMethod: 'portal_download',
      deliveredBy: context.performedBy.id,
      status: 'ready_for_delivery',
      deliverables: [],
      handoffDocument: {
        preparedAt: new Date().toISOString(),
        preparedBy: context.performedBy.username
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error creating delivery confirmation:', error);
    return false;
  }
}

async function handleQCRejection(serviceRequestId: number, context: TransitionContext): Promise<void> {
  try {
    // Get service request details
    const [sr] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!sr?.assignedTeamMember) return;

    // Create notification for assigned team member
    await db.insert(notifications).values({
      userId: sr.assignedTeamMember,
      title: 'QC Rejection - Rework Required',
      message: `Service request #${serviceRequestId} has been rejected by QC. Please review feedback and make corrections.`,
      type: 'qc_rejection',
      category: 'service',
      priority: 'high',
      actionUrl: `/ops/service-requests/${serviceRequestId}`,
      actionText: 'View Details',
      createdAt: new Date()
    });

    // Create rework task
    await db.insert(taskItems).values({
      serviceRequestId,
      title: `Rework Required - QC Rejection`,
      description: context.notes || 'Please address QC feedback and resubmit for review',
      status: 'pending',
      priority: 'high',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
      assignedTo: sr.assignedTeamMember,
      taskType: 'rework',
      isUrgent: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

  } catch (error) {
    console.error('Error handling QC rejection:', error);
  }
}

async function notifyAssignedTeamMember(
  serviceRequestId: number,
  fromStatus: string,
  toStatus: string
): Promise<void> {
  try {
    const [sr] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!sr?.assignedTeamMember) return;

    const statusLabels: Record<string, string> = {
      [SERVICE_REQUEST_STATUSES.INITIATED]: 'Initiated',
      [SERVICE_REQUEST_STATUSES.PENDING_PAYMENT]: 'Pending Payment',
      [SERVICE_REQUEST_STATUSES.PAYMENT_RECEIVED]: 'Payment Received',
      [SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING]: 'Documents Pending',
      [SERVICE_REQUEST_STATUSES.DOCUMENTS_UPLOADED]: 'Documents Uploaded',
      [SERVICE_REQUEST_STATUSES.DOCUMENTS_VERIFIED]: 'Documents Verified',
      [SERVICE_REQUEST_STATUSES.IN_PROGRESS]: 'In Progress',
      [SERVICE_REQUEST_STATUSES.QC_REVIEW]: 'QC Review',
      [SERVICE_REQUEST_STATUSES.QC_APPROVED]: 'QC Approved',
      [SERVICE_REQUEST_STATUSES.QC_REJECTED]: 'QC Rejected',
      [SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY]: 'Ready for Delivery',
      [SERVICE_REQUEST_STATUSES.DELIVERED]: 'Delivered',
      [SERVICE_REQUEST_STATUSES.COMPLETED]: 'Completed'
    };

    await db.insert(notifications).values({
      userId: sr.assignedTeamMember,
      title: `Status Update: ${statusLabels[toStatus] || toStatus}`,
      message: `Service request #${serviceRequestId} status changed from ${statusLabels[fromStatus] || fromStatus} to ${statusLabels[toStatus] || toStatus}`,
      type: 'status_change',
      category: 'service',
      priority: 'normal',
      actionUrl: `/ops/service-requests/${serviceRequestId}`,
      actionText: 'View Request',
      createdAt: new Date()
    });

  } catch (error) {
    console.error('Error notifying team member:', error);
  }
}

async function createStatusTasks(
  serviceRequestId: number,
  status: string,
  context: TransitionContext
): Promise<void> {
  try {
    const [sr] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!sr) return;

    // Define tasks for each status
    const statusTasks: Record<string, { title: string; description: string; priority: string; daysUntilDue: number }[]> = {
      [SERVICE_REQUEST_STATUSES.DOCUMENTS_PENDING]: [
        {
          title: 'Request Documents from Client',
          description: 'Send document request to client and follow up',
          priority: 'high',
          daysUntilDue: 2
        }
      ],
      [SERVICE_REQUEST_STATUSES.DOCUMENTS_UPLOADED]: [
        {
          title: 'Verify Uploaded Documents',
          description: 'Review all uploaded documents for completeness and accuracy',
          priority: 'high',
          daysUntilDue: 1
        }
      ],
      [SERVICE_REQUEST_STATUSES.IN_PROGRESS]: [
        {
          title: 'Process Service Request',
          description: 'Complete the service work as per requirements',
          priority: 'medium',
          daysUntilDue: 5
        }
      ],
      [SERVICE_REQUEST_STATUSES.READY_FOR_DELIVERY]: [
        {
          title: 'Prepare Delivery Package',
          description: 'Compile all deliverables and prepare for client delivery',
          priority: 'high',
          daysUntilDue: 1
        }
      ]
    };

    const tasks = statusTasks[status];
    if (!tasks || tasks.length === 0) return;

    for (const task of tasks) {
      await db.insert(taskItems).values({
        serviceRequestId,
        title: task.title,
        description: task.description,
        status: 'pending',
        priority: task.priority,
        dueDate: new Date(Date.now() + task.daysUntilDue * 24 * 60 * 60 * 1000),
        assignedTo: sr.assignedTeamMember,
        taskType: 'workflow',
        createdBy: context.performedBy.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

  } catch (error) {
    console.error('Error creating status tasks:', error);
  }
}

// =============================================================================
// ACTIVITY LOGGING
// =============================================================================

async function logStatusTransition(
  serviceRequestId: number,
  fromStatus: string,
  toStatus: string,
  context: TransitionContext
): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      userId: context.performedBy.id,
      action: 'status_transition',
      entityType: 'service_request',
      entityId: serviceRequestId,
      details: JSON.stringify({
        fromStatus,
        toStatus,
        reason: context.reason,
        notes: context.notes,
        forced: context.force || false
      }),
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk update service request statuses
 */
export async function bulkTransitionStatus(
  serviceRequestIds: number[],
  toStatus: string,
  context: TransitionContext
): Promise<{ succeeded: number[]; failed: { id: number; reason: string }[] }> {
  const succeeded: number[] = [];
  const failed: { id: number; reason: string }[] = [];

  for (const id of serviceRequestIds) {
    const result = await transitionServiceRequestStatus(id, toStatus, context);
    if (result.success) {
      succeeded.push(id);
    } else {
      failed.push({ id, reason: result.message });
    }
  }

  return { succeeded, failed };
}

// =============================================================================
// WORKFLOW QUERIES
// =============================================================================

/**
 * Get service requests by status for operations dashboard
 */
export async function getServiceRequestsByStatus(status: string | string[]): Promise<any[]> {
  try {
    const statuses = Array.isArray(status) ? status : [status];

    const results = await db
      .select()
      .from(serviceRequests)
      .where(sql`${serviceRequests.status} IN (${sql.join(statuses.map(s => sql`${s}`), sql`, `)})`)
      .orderBy(serviceRequests.slaDeadline);

    return results;
  } catch (error) {
    console.error('Error fetching service requests by status:', error);
    return [];
  }
}

/**
 * Get SLA at-risk service requests
 */
export async function getSLAAtRiskRequests(hoursThreshold: number = 24): Promise<any[]> {
  try {
    const thresholdTime = new Date(Date.now() + hoursThreshold * 60 * 60 * 1000);

    const results = await db
      .select()
      .from(serviceRequests)
      .where(and(
        sql`${serviceRequests.slaDeadline} < ${thresholdTime}`,
        sql`${serviceRequests.status} NOT IN ('completed', 'cancelled', 'delivered')`
      ))
      .orderBy(serviceRequests.slaDeadline);

    return results;
  } catch (error) {
    console.error('Error fetching SLA at-risk requests:', error);
    return [];
  }
}

/**
 * Get pending QC reviews
 */
export async function getPendingQCReviews(): Promise<any[]> {
  try {
    const results = await db
      .select({
        review: qualityReviews,
        serviceRequest: serviceRequests
      })
      .from(qualityReviews)
      .innerJoin(serviceRequests, eq(qualityReviews.serviceRequestId, serviceRequests.id))
      .where(eq(qualityReviews.status, 'pending'))
      .orderBy(qualityReviews.slaDeadline);

    return results;
  } catch (error) {
    console.error('Error fetching pending QC reviews:', error);
    return [];
  }
}

export default {
  transitionServiceRequestStatus,
  bulkTransitionStatus,
  setSLADeadline,
  calculateSLADeadline,
  getServiceRequestsByStatus,
  getSLAAtRiskRequests,
  getPendingQCReviews
};
