import { db } from './db';
import {
  serviceRequests,
  serviceWorkflowStatuses,
  statusTransitionRules,
  statusTransitionHistory,
  taskItems,
  notifications,
  users,
  businessEntities
} from '@shared/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { EventEmitter } from 'events';

// ============================================================================
// STATUS TRANSITION HANDLER
// Central handler for all status changes with automatic triggers
// ============================================================================

class StatusTransitionHandler {
  private eventBus: EventEmitter;

  constructor() {
    this.eventBus = new EventEmitter();
    this.eventBus.setMaxListeners(50);
    console.log('Status Transition Handler initialized');
  }

  // Get the event bus for external listeners
  getEventBus(): EventEmitter {
    return this.eventBus;
  }

  // ============================================================================
  // MAIN TRANSITION FUNCTION
  // ============================================================================

  async executeTransition(params: {
    serviceRequestId: number;
    toStatusCode: string;
    userId: number;
    reason?: string;
    notes?: string;
    isAutomatic?: boolean;
    triggerSource?: string;
  }): Promise<{
    success: boolean;
    error?: string;
    previousStatus?: string;
    newStatus?: string;
    historyId?: number;
  }> {
    const {
      serviceRequestId,
      toStatusCode,
      userId,
      reason,
      notes,
      isAutomatic = false,
      triggerSource = 'manual'
    } = params;

    try {
      // 1. Get current service request
      const [serviceRequest] = await db.select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, serviceRequestId))
        .limit(1);

      if (!serviceRequest) {
        return { success: false, error: 'Service request not found' };
      }

      const serviceKey = serviceRequest.serviceId;
      const fromStatusCode = serviceRequest.status;

      // 2. Validate transition is allowed
      const validationResult = await this.validateTransition(
        serviceKey,
        fromStatusCode,
        toStatusCode,
        userId
      );

      if (!validationResult.valid) {
        return { success: false, error: validationResult.error };
      }

      // 3. Get status details
      const [fromStatus, toStatus] = await this.getStatusDetails(
        serviceKey,
        fromStatusCode,
        toStatusCode
      );

      // 4. Get user details
      const [user] = await db.select({
        fullName: users.fullName,
        role: users.role
      })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // 5. Calculate duration in previous status
      let durationInPreviousStatus: number | null = null;
      const [lastTransition] = await db.select()
        .from(statusTransitionHistory)
        .where(eq(statusTransitionHistory.serviceRequestId, serviceRequestId))
        .orderBy(desc(statusTransitionHistory.changedAt))
        .limit(1);

      if (lastTransition?.changedAt) {
        const lastTime = new Date(lastTransition.changedAt).getTime();
        const now = Date.now();
        durationInPreviousStatus = Math.floor((now - lastTime) / 60000); // minutes
      }

      // 6. Update service request status
      await db.update(serviceRequests)
        .set({
          status: toStatusCode,
          currentMilestone: toStatus?.statusName || toStatusCode,
          updatedAt: new Date()
        })
        .where(eq(serviceRequests.id, serviceRequestId));

      // 7. Record in transition history
      const [historyEntry] = await db.insert(statusTransitionHistory)
        .values({
          serviceRequestId,
          serviceKey,
          businessEntityId: serviceRequest.businessEntityId,
          fromStatusCode,
          toStatusCode,
          fromStatusName: fromStatus?.statusName || fromStatusCode,
          toStatusName: toStatus?.statusName || toStatusCode,
          changedBy: userId,
          changedByName: user?.fullName || 'System',
          changedByRole: user?.role || 'system',
          transitionReason: reason,
          notes,
          durationInPreviousStatus,
          isAutomatic,
          triggerSource,
          wasApprovalRequired: validationResult.transitionRule?.requiresApproval || false,
          requestSnapshot: {
            status: fromStatusCode,
            progress: serviceRequest.progress,
            priority: serviceRequest.priority
          }
        })
        .returning();

      // 8. Update milestone history in service request
      const existingHistory = (serviceRequest.milestoneHistory as any[]) || [];
      const newHistory = [
        ...existingHistory,
        {
          milestone: toStatus?.statusName || toStatusCode,
          date: new Date().toISOString(),
          status: toStatusCode,
          changedBy: user?.fullName || 'System'
        }
      ];

      await db.update(serviceRequests)
        .set({ milestoneHistory: newHistory })
        .where(eq(serviceRequests.id, serviceRequestId));

      // 9. Emit event for notification system
      this.eventBus.emit('service_status_changed', {
        type: 'status_change',
        serviceRequestId,
        serviceKey,
        fromStatus: fromStatusCode,
        toStatus: toStatusCode,
        fromStatusName: fromStatus?.statusName,
        toStatusName: toStatus?.statusName,
        userId,
        userName: user?.fullName,
        reason,
        timestamp: new Date()
      });

      // 10. Trigger automatic actions
      await this.executeAutomaticActions({
        serviceRequest,
        toStatus,
        userId,
        historyId: historyEntry.id
      });

      return {
        success: true,
        previousStatus: fromStatusCode,
        newStatus: toStatusCode,
        historyId: historyEntry.id
      };

    } catch (error) {
      console.error('Status transition error:', error);
      return { success: false, error: 'Internal error during status transition' };
    }
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  private async validateTransition(
    serviceKey: string,
    fromStatusCode: string,
    toStatusCode: string,
    userId: number
  ): Promise<{
    valid: boolean;
    error?: string;
    transitionRule?: any;
  }> {
    // Check for custom transition rules
    const [transitionRule] = await db.select()
      .from(statusTransitionRules)
      .where(and(
        eq(statusTransitionRules.serviceKey, serviceKey),
        eq(statusTransitionRules.fromStatusCode, fromStatusCode),
        eq(statusTransitionRules.toStatusCode, toStatusCode),
        eq(statusTransitionRules.isActive, true)
      ))
      .limit(1);

    if (transitionRule) {
      // Check role permissions if defined
      if (transitionRule.allowedRoles && Array.isArray(transitionRule.allowedRoles)) {
        const [user] = await db.select({ role: users.role })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        const userRole = user?.role || '';
        if (!transitionRule.allowedRoles.includes(userRole) && !transitionRule.allowedRoles.includes('admin')) {
          return {
            valid: false,
            error: `User role "${userRole}" is not allowed to perform this transition`
          };
        }
      }

      return { valid: true, transitionRule };
    }

    // Use default transitions
    const defaultTransitions = this.getDefaultTransitions();
    const defaultTransition = defaultTransitions.find(
      t => t.fromStatusCode === fromStatusCode && t.toStatusCode === toStatusCode
    );

    if (defaultTransition) {
      return { valid: true, transitionRule: defaultTransition };
    }

    return {
      valid: false,
      error: `Invalid transition from "${fromStatusCode}" to "${toStatusCode}"`
    };
  }

  private getDefaultTransitions() {
    return [
      { fromStatusCode: 'initiated', toStatusCode: 'docs_pending' },
      { fromStatusCode: 'initiated', toStatusCode: 'docs_uploaded' },
      { fromStatusCode: 'initiated', toStatusCode: 'on_hold' },
      { fromStatusCode: 'initiated', toStatusCode: 'cancelled' },
      { fromStatusCode: 'docs_pending', toStatusCode: 'docs_uploaded' },
      { fromStatusCode: 'docs_pending', toStatusCode: 'on_hold' },
      { fromStatusCode: 'docs_uploaded', toStatusCode: 'in_progress' },
      { fromStatusCode: 'docs_uploaded', toStatusCode: 'on_hold' },
      { fromStatusCode: 'in_progress', toStatusCode: 'govt_submission' },
      { fromStatusCode: 'in_progress', toStatusCode: 'qc_review' },
      { fromStatusCode: 'in_progress', toStatusCode: 'on_hold' },
      { fromStatusCode: 'in_progress', toStatusCode: 'failed' },
      { fromStatusCode: 'govt_submission', toStatusCode: 'qc_review' },
      { fromStatusCode: 'govt_submission', toStatusCode: 'in_progress' },
      { fromStatusCode: 'qc_review', toStatusCode: 'ready_for_delivery' },
      { fromStatusCode: 'qc_review', toStatusCode: 'in_progress', requiresApproval: true },
      { fromStatusCode: 'qc_review', toStatusCode: 'completed' },
      { fromStatusCode: 'ready_for_delivery', toStatusCode: 'completed' },
      { fromStatusCode: 'ready_for_sign', toStatusCode: 'completed' },
      { fromStatusCode: 'on_hold', toStatusCode: 'in_progress' },
      { fromStatusCode: 'on_hold', toStatusCode: 'cancelled' },
      { fromStatusCode: 'failed', toStatusCode: 'in_progress' },
      { fromStatusCode: 'failed', toStatusCode: 'cancelled' },
    ];
  }

  // ============================================================================
  // STATUS DETAILS
  // ============================================================================

  private async getStatusDetails(
    serviceKey: string,
    fromStatusCode: string,
    toStatusCode: string
  ): Promise<[any, any]> {
    const statuses = await db.select()
      .from(serviceWorkflowStatuses)
      .where(and(
        eq(serviceWorkflowStatuses.serviceKey, serviceKey),
        eq(serviceWorkflowStatuses.isActive, true)
      ));

    const fromStatus = statuses.find(s => s.statusCode === fromStatusCode) ||
      this.getDefaultStatusInfo(fromStatusCode);
    const toStatus = statuses.find(s => s.statusCode === toStatusCode) ||
      this.getDefaultStatusInfo(toStatusCode);

    return [fromStatus, toStatus];
  }

  private getDefaultStatusInfo(statusCode: string) {
    const defaults: Record<string, any> = {
      initiated: { statusName: 'Service Initiated', color: '#3b82f6', triggerNotification: true, triggerTasks: true, clientVisible: true, clientStatusLabel: 'Request Received' },
      docs_pending: { statusName: 'Documents Pending', color: '#f59e0b', triggerNotification: true, triggerTasks: true, clientVisible: true, clientStatusLabel: 'Documents Required' },
      docs_uploaded: { statusName: 'Documents Uploaded', color: '#10b981', triggerNotification: true, triggerTasks: true, clientVisible: true, clientStatusLabel: 'Documents Under Review' },
      in_progress: { statusName: 'In Progress', color: '#6366f1', triggerNotification: true, triggerTasks: true, clientVisible: true, clientStatusLabel: 'Processing', defaultAssigneeRole: 'ops_executive' },
      govt_submission: { statusName: 'Government Submission', color: '#8b5cf6', triggerNotification: true, clientVisible: true, clientStatusLabel: 'Filed with Authority' },
      qc_review: { statusName: 'QC Review', color: '#ec4899', triggerNotification: true, triggerTasks: true, clientVisible: true, clientStatusLabel: 'Quality Check', defaultAssigneeRole: 'qc_reviewer' },
      ready_for_delivery: { statusName: 'Ready for Delivery', color: '#14b8a6', triggerNotification: true, clientVisible: true, clientStatusLabel: 'Ready' },
      ready_for_sign: { statusName: 'Ready for Signature', color: '#14b8a6', triggerNotification: true, clientVisible: true, clientStatusLabel: 'Signature Required' },
      completed: { statusName: 'Completed', color: '#22c55e', triggerNotification: true, clientVisible: true, clientStatusLabel: 'Completed', isTerminal: true },
      on_hold: { statusName: 'On Hold', color: '#f97316', triggerNotification: true, clientVisible: true, clientStatusLabel: 'On Hold' },
      cancelled: { statusName: 'Cancelled', color: '#ef4444', triggerNotification: true, clientVisible: true, clientStatusLabel: 'Cancelled', isTerminal: true },
      failed: { statusName: 'Failed', color: '#ef4444', triggerNotification: true, clientVisible: true, clientStatusLabel: 'Issue Encountered' },
    };

    return defaults[statusCode] || {
      statusName: statusCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      color: '#6b7280',
      triggerNotification: true,
      clientVisible: true
    };
  }

  // ============================================================================
  // AUTOMATIC ACTIONS
  // ============================================================================

  private async executeAutomaticActions(params: {
    serviceRequest: any;
    toStatus: any;
    userId: number;
    historyId: number;
  }) {
    const { serviceRequest, toStatus, userId, historyId } = params;

    // Create tasks if configured
    if (toStatus?.triggerTasks) {
      await this.createStatusTask(serviceRequest, toStatus, userId, historyId);
    }

    // Create client notification if configured
    if (toStatus?.triggerNotification && toStatus?.clientVisible) {
      await this.createStatusNotification(serviceRequest, toStatus);
    }

    // Emit specific events for certain statuses
    switch (toStatus?.statusCode || params.toStatus) {
      case 'completed':
        this.eventBus.emit('service_completed', {
          serviceRequestId: serviceRequest.id,
          completedAt: new Date()
        });
        break;
      case 'qc_review':
        this.eventBus.emit('qc_review_started', {
          serviceRequestId: serviceRequest.id
        });
        break;
      case 'cancelled':
        this.eventBus.emit('service_cancelled', {
          serviceRequestId: serviceRequest.id
        });
        break;
    }
  }

  private async createStatusTask(
    serviceRequest: any,
    status: any,
    userId: number,
    historyId: number
  ): Promise<void> {
    try {
      const taskNumber = `TASK-${Date.now()}-${serviceRequest.id}`;

      const [task] = await db.insert(taskItems)
        .values({
          taskNumber,
          title: `${status.statusName}: ${serviceRequest.serviceId}`,
          description: status.statusDescription || `Process service request at ${status.statusName} stage`,
          taskType: 'service_related',
          initiatorId: userId,
          assigneeRole: status.defaultAssigneeRole || 'ops_executive',
          status: 'pending',
          priority: serviceRequest.priority || 'medium',
          serviceRequestId: serviceRequest.id,
          businessEntityId: serviceRequest.businessEntityId,
          dueDate: status.slaHours
            ? new Date(Date.now() + status.slaHours * 60 * 60 * 1000)
            : null,
          metadata: { transitionHistoryId: historyId }
        })
        .returning();

      // Update history with task ID
      if (task) {
        await db.update(statusTransitionHistory)
          .set({ tasksCreated: [task.id] })
          .where(eq(statusTransitionHistory.id, historyId));
      }

      console.log(`Created task ${taskNumber} for status ${status.statusName}`);
    } catch (error) {
      console.error('Error creating status task:', error);
    }
  }

  private async createStatusNotification(
    serviceRequest: any,
    status: any
  ): Promise<void> {
    try {
      const clientUserId = serviceRequest.userId;
      if (!clientUserId) return;

      await db.insert(notifications).values({
        userId: clientUserId,
        title: `Service Update: ${status.clientStatusLabel || status.statusName}`,
        message: status.clientMessage || `Your service request status has been updated to: ${status.statusName}`,
        type: 'status_change',
        category: 'service',
        priority: 'normal',
        actionUrl: `/service-requests/${serviceRequest.id}`,
        actionText: 'View Details',
        metadata: {
          serviceRequestId: serviceRequest.id,
          newStatus: status.statusCode,
          statusName: status.statusName
        }
      });

      console.log(`Created notification for status ${status.statusName}`);
    } catch (error) {
      console.error('Error creating status notification:', error);
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  async bulkTransition(params: {
    serviceRequestIds: number[];
    toStatusCode: string;
    userId: number;
    reason?: string;
  }): Promise<{
    succeeded: number[];
    failed: { id: number; error: string }[];
  }> {
    const { serviceRequestIds, toStatusCode, userId, reason } = params;
    const results = {
      succeeded: [] as number[],
      failed: [] as { id: number; error: string }[]
    };

    for (const serviceRequestId of serviceRequestIds) {
      const result = await this.executeTransition({
        serviceRequestId,
        toStatusCode,
        userId,
        reason,
        triggerSource: 'bulk_operation'
      });

      if (result.success) {
        results.succeeded.push(serviceRequestId);
      } else {
        results.failed.push({ id: serviceRequestId, error: result.error || 'Unknown error' });
      }
    }

    return results;
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  async getAvailableTransitions(serviceRequestId: number): Promise<any[]> {
    const [serviceRequest] = await db.select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!serviceRequest) return [];

    const serviceKey = serviceRequest.serviceId;
    const currentStatus = serviceRequest.status;

    // Get custom transitions
    const customTransitions = await db.select()
      .from(statusTransitionRules)
      .where(and(
        eq(statusTransitionRules.serviceKey, serviceKey),
        eq(statusTransitionRules.fromStatusCode, currentStatus),
        eq(statusTransitionRules.isActive, true)
      ))
      .orderBy(asc(statusTransitionRules.displayOrder));

    if (customTransitions.length > 0) {
      return customTransitions;
    }

    // Return default transitions
    return this.getDefaultTransitions()
      .filter(t => t.fromStatusCode === currentStatus);
  }

  async getTransitionHistory(
    serviceRequestId: number,
    limit = 50
  ): Promise<any[]> {
    return db.select()
      .from(statusTransitionHistory)
      .where(eq(statusTransitionHistory.serviceRequestId, serviceRequestId))
      .orderBy(desc(statusTransitionHistory.changedAt))
      .limit(limit);
  }
}

// Singleton instance
export const statusTransitionHandler = new StatusTransitionHandler();

// Export convenience functions
export const executeStatusTransition = statusTransitionHandler.executeTransition.bind(statusTransitionHandler);
export const getAvailableTransitions = statusTransitionHandler.getAvailableTransitions.bind(statusTransitionHandler);
export const getTransitionHistory = statusTransitionHandler.getTransitionHistory.bind(statusTransitionHandler);
export const statusEventBus = statusTransitionHandler.getEventBus();
