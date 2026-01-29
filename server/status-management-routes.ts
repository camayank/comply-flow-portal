import { Router, Request, Response } from 'express';
import { db } from './db';
import {
  serviceWorkflowStatuses,
  statusTransitionRules,
  statusTransitionHistory,
  serviceWorkflowSteps,
  serviceRequestSteps,
  serviceRequests,
  servicesCatalog,
  taskItems,
  notifications,
  users
} from '@shared/schema';
import { eq, and, desc, asc, count, sql, inArray } from 'drizzle-orm';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from './rbac-middleware';

const router = Router();

// ============================================================================
// UNIFIED STATUS MANAGEMENT ROUTES
// Admin routes for configuring workflow statuses per service
// ============================================================================

// ============================================================================
// WORKFLOW STATUS CRUD
// ============================================================================

// Get all workflow statuses for a service
router.get('/services/:serviceKey/statuses', async (req: Request, res: Response) => {
  try {
    const { serviceKey } = req.params;
    const { includeInactive } = req.query;

    let query = db.select()
      .from(serviceWorkflowStatuses)
      .where(eq(serviceWorkflowStatuses.serviceKey, serviceKey))
      .orderBy(asc(serviceWorkflowStatuses.displayOrder));

    if (!includeInactive) {
      query = db.select()
        .from(serviceWorkflowStatuses)
        .where(and(
          eq(serviceWorkflowStatuses.serviceKey, serviceKey),
          eq(serviceWorkflowStatuses.isActive, true)
        ))
        .orderBy(asc(serviceWorkflowStatuses.displayOrder));
    }

    const statuses = await query;

    // If no custom statuses, return default statuses
    if (statuses.length === 0) {
      const defaultStatuses = getDefaultWorkflowStatuses(serviceKey);
      return res.json({
        statuses: defaultStatuses,
        isDefault: true,
        serviceKey
      });
    }

    res.json({
      statuses,
      isDefault: false,
      serviceKey
    });
  } catch (error) {
    console.error('Error fetching workflow statuses:', error);
    res.status(500).json({ error: 'Failed to fetch workflow statuses' });
  }
});

// Get all services with their status counts
router.get('/services/status-summary', async (req: Request, res: Response) => {
  try {
    // Get all services from catalog
    const services = await db.select({
      serviceKey: servicesCatalog.serviceKey,
      name: servicesCatalog.name,
      category: servicesCatalog.category,
      periodicity: servicesCatalog.periodicity
    })
      .from(servicesCatalog)
      .where(eq(servicesCatalog.isActive, true))
      .orderBy(servicesCatalog.category, servicesCatalog.name);

    // Get status counts per service
    const statusCounts = await db.select({
      serviceKey: serviceWorkflowStatuses.serviceKey,
      count: count()
    })
      .from(serviceWorkflowStatuses)
      .where(eq(serviceWorkflowStatuses.isActive, true))
      .groupBy(serviceWorkflowStatuses.serviceKey);

    const countMap = new Map(statusCounts.map(s => [s.serviceKey, s.count]));

    const result = services.map(service => ({
      ...service,
      statusCount: countMap.get(service.serviceKey) || 0,
      hasCustomStatuses: countMap.has(service.serviceKey)
    }));

    res.json({ services: result });
  } catch (error) {
    console.error('Error fetching service status summary:', error);
    res.status(500).json({ error: 'Failed to fetch status summary' });
  }
});

// Create a new workflow status
router.post('/services/:serviceKey/statuses', async (req: Request, res: Response) => {
  try {
    const { serviceKey } = req.params;
    const statusData = req.body;

    // Validate service exists
    const [service] = await db.select()
      .from(servicesCatalog)
      .where(eq(servicesCatalog.serviceKey, serviceKey))
      .limit(1);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check for duplicate status code
    const [existing] = await db.select()
      .from(serviceWorkflowStatuses)
      .where(and(
        eq(serviceWorkflowStatuses.serviceKey, serviceKey),
        eq(serviceWorkflowStatuses.statusCode, statusData.statusCode)
      ))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: 'Status code already exists for this service' });
    }

    // Get max display order
    const [maxOrder] = await db.select({
      maxOrder: sql<number>`COALESCE(MAX(${serviceWorkflowStatuses.displayOrder}), 0)`
    })
      .from(serviceWorkflowStatuses)
      .where(eq(serviceWorkflowStatuses.serviceKey, serviceKey));

    const [newStatus] = await db.insert(serviceWorkflowStatuses)
      .values({
        serviceKey,
        statusCode: statusData.statusCode,
        statusName: statusData.statusName,
        statusDescription: statusData.statusDescription,
        statusCategory: statusData.statusCategory || 'process',
        isTerminal: statusData.isTerminal || false,
        displayOrder: statusData.displayOrder ?? (maxOrder?.maxOrder || 0) + 1,
        color: statusData.color || '#6b7280',
        icon: statusData.icon,
        autoProgress: statusData.autoProgress || false,
        autoProgressDelayHours: statusData.autoProgressDelayHours,
        requiresApproval: statusData.requiresApproval || false,
        requiresDocument: statusData.requiresDocument || false,
        slaHours: statusData.slaHours,
        triggerTasks: statusData.triggerTasks ?? true,
        triggerNotification: statusData.triggerNotification ?? true,
        defaultAssigneeRole: statusData.defaultAssigneeRole,
        escalateToRole: statusData.escalateToRole,
        clientVisible: statusData.clientVisible ?? true,
        clientStatusLabel: statusData.clientStatusLabel,
        clientMessage: statusData.clientMessage,
        createdBy: (req as any).user?.id
      })
      .returning();

    res.status(201).json(newStatus);
  } catch (error) {
    console.error('Error creating workflow status:', error);
    res.status(500).json({ error: 'Failed to create workflow status' });
  }
});

// Update a workflow status
router.put('/statuses/:statusId', async (req: Request, res: Response) => {
  try {
    const { statusId } = req.params;
    const updateData = req.body;

    const [updated] = await db.update(serviceWorkflowStatuses)
      .set({
        statusName: updateData.statusName,
        statusDescription: updateData.statusDescription,
        statusCategory: updateData.statusCategory,
        isTerminal: updateData.isTerminal,
        displayOrder: updateData.displayOrder,
        color: updateData.color,
        icon: updateData.icon,
        autoProgress: updateData.autoProgress,
        autoProgressDelayHours: updateData.autoProgressDelayHours,
        requiresApproval: updateData.requiresApproval,
        requiresDocument: updateData.requiresDocument,
        slaHours: updateData.slaHours,
        triggerTasks: updateData.triggerTasks,
        triggerNotification: updateData.triggerNotification,
        defaultAssigneeRole: updateData.defaultAssigneeRole,
        escalateToRole: updateData.escalateToRole,
        clientVisible: updateData.clientVisible,
        clientStatusLabel: updateData.clientStatusLabel,
        clientMessage: updateData.clientMessage,
        isActive: updateData.isActive,
        updatedAt: new Date()
      })
      .where(eq(serviceWorkflowStatuses.id, Number(statusId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Status not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating workflow status:', error);
    res.status(500).json({ error: 'Failed to update workflow status' });
  }
});

// Delete a workflow status (soft delete)
router.delete('/statuses/:statusId', async (req: Request, res: Response) => {
  try {
    const { statusId } = req.params;

    const [deleted] = await db.update(serviceWorkflowStatuses)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(serviceWorkflowStatuses.id, Number(statusId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Status not found' });
    }

    res.json({ message: 'Status deactivated successfully', status: deleted });
  } catch (error) {
    console.error('Error deleting workflow status:', error);
    res.status(500).json({ error: 'Failed to delete workflow status' });
  }
});

// Reorder statuses
router.put('/services/:serviceKey/statuses/reorder', async (req: Request, res: Response) => {
  try {
    const { serviceKey } = req.params;
    const { statusOrder } = req.body; // Array of {id, displayOrder}

    if (!Array.isArray(statusOrder)) {
      return res.status(400).json({ error: 'statusOrder must be an array' });
    }

    // Update each status's display order
    for (const item of statusOrder) {
      await db.update(serviceWorkflowStatuses)
        .set({ displayOrder: item.displayOrder, updatedAt: new Date() })
        .where(and(
          eq(serviceWorkflowStatuses.id, item.id),
          eq(serviceWorkflowStatuses.serviceKey, serviceKey)
        ));
    }

    res.json({ message: 'Status order updated successfully' });
  } catch (error) {
    console.error('Error reordering statuses:', error);
    res.status(500).json({ error: 'Failed to reorder statuses' });
  }
});

// ============================================================================
// STATUS TRANSITION RULES CRUD
// ============================================================================

// Get all transition rules for a service
router.get('/services/:serviceKey/transitions', async (req: Request, res: Response) => {
  try {
    const { serviceKey } = req.params;

    const transitions = await db.select()
      .from(statusTransitionRules)
      .where(and(
        eq(statusTransitionRules.serviceKey, serviceKey),
        eq(statusTransitionRules.isActive, true)
      ))
      .orderBy(asc(statusTransitionRules.displayOrder));

    // If no custom transitions, return default
    if (transitions.length === 0) {
      const defaultTransitions = getDefaultTransitionRules(serviceKey);
      return res.json({
        transitions: defaultTransitions,
        isDefault: true
      });
    }

    res.json({
      transitions,
      isDefault: false
    });
  } catch (error) {
    console.error('Error fetching transition rules:', error);
    res.status(500).json({ error: 'Failed to fetch transition rules' });
  }
});

// Create a new transition rule
router.post('/services/:serviceKey/transitions', async (req: Request, res: Response) => {
  try {
    const { serviceKey } = req.params;
    const transitionData = req.body;

    const [newTransition] = await db.insert(statusTransitionRules)
      .values({
        serviceKey,
        fromStatusCode: transitionData.fromStatusCode,
        toStatusCode: transitionData.toStatusCode,
        transitionName: transitionData.transitionName,
        transitionDescription: transitionData.transitionDescription,
        allowedRoles: transitionData.allowedRoles,
        requiresApproval: transitionData.requiresApproval || false,
        approverRoles: transitionData.approverRoles,
        conditionsJson: transitionData.conditionsJson,
        validationMessage: transitionData.validationMessage,
        onTransitionTasks: transitionData.onTransitionTasks,
        onTransitionNotifications: transitionData.onTransitionNotifications,
        onTransitionWebhook: transitionData.onTransitionWebhook,
        buttonLabel: transitionData.buttonLabel,
        buttonColor: transitionData.buttonColor || 'primary',
        confirmationRequired: transitionData.confirmationRequired || false,
        confirmationMessage: transitionData.confirmationMessage,
        displayOrder: transitionData.displayOrder || 0
      })
      .returning();

    res.status(201).json(newTransition);
  } catch (error) {
    console.error('Error creating transition rule:', error);
    res.status(500).json({ error: 'Failed to create transition rule' });
  }
});

// Update a transition rule
router.put('/transitions/:transitionId', async (req: Request, res: Response) => {
  try {
    const { transitionId } = req.params;
    const updateData = req.body;

    const [updated] = await db.update(statusTransitionRules)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(statusTransitionRules.id, Number(transitionId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Transition rule not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating transition rule:', error);
    res.status(500).json({ error: 'Failed to update transition rule' });
  }
});

// Delete a transition rule
router.delete('/transitions/:transitionId', async (req: Request, res: Response) => {
  try {
    const { transitionId } = req.params;

    const [deleted] = await db.update(statusTransitionRules)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(statusTransitionRules.id, Number(transitionId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Transition rule not found' });
    }

    res.json({ message: 'Transition rule deactivated' });
  } catch (error) {
    console.error('Error deleting transition rule:', error);
    res.status(500).json({ error: 'Failed to delete transition rule' });
  }
});

// ============================================================================
// WORKFLOW STEPS CRUD
// ============================================================================

// Get all workflow steps for a service status
router.get('/services/:serviceKey/statuses/:statusCode/steps', async (req: Request, res: Response) => {
  try {
    const { serviceKey, statusCode } = req.params;

    const steps = await db.select()
      .from(serviceWorkflowSteps)
      .where(and(
        eq(serviceWorkflowSteps.serviceKey, serviceKey),
        eq(serviceWorkflowSteps.statusCode, statusCode),
        eq(serviceWorkflowSteps.isActive, true)
      ))
      .orderBy(asc(serviceWorkflowSteps.stepOrder));

    res.json({ steps });
  } catch (error) {
    console.error('Error fetching workflow steps:', error);
    res.status(500).json({ error: 'Failed to fetch workflow steps' });
  }
});

// Create a workflow step
router.post('/services/:serviceKey/statuses/:statusCode/steps', async (req: Request, res: Response) => {
  try {
    const { serviceKey, statusCode } = req.params;
    const stepData = req.body;

    // Get max step order
    const [maxOrder] = await db.select({
      maxOrder: sql<number>`COALESCE(MAX(${serviceWorkflowSteps.stepOrder}), 0)`
    })
      .from(serviceWorkflowSteps)
      .where(and(
        eq(serviceWorkflowSteps.serviceKey, serviceKey),
        eq(serviceWorkflowSteps.statusCode, statusCode)
      ));

    const [newStep] = await db.insert(serviceWorkflowSteps)
      .values({
        serviceKey,
        statusCode,
        stepOrder: stepData.stepOrder ?? (maxOrder?.maxOrder || 0) + 1,
        stepName: stepData.stepName,
        stepDescription: stepData.stepDescription,
        stepType: stepData.stepType || 'task',
        assigneeRole: stepData.assigneeRole,
        assigneeUserId: stepData.assigneeUserId,
        requiredDocuments: stepData.requiredDocuments,
        requiredFields: stepData.requiredFields,
        checklistItems: stepData.checklistItems,
        estimatedMinutes: stepData.estimatedMinutes,
        slaMinutes: stepData.slaMinutes,
        dependsOnSteps: stepData.dependsOnSteps,
        blocksSteps: stepData.blocksSteps,
        internalInstructions: stepData.internalInstructions,
        clientInstructions: stepData.clientInstructions,
        canAutoComplete: stepData.canAutoComplete || false,
        autoCompleteTrigger: stepData.autoCompleteTrigger
      })
      .returning();

    res.status(201).json(newStep);
  } catch (error) {
    console.error('Error creating workflow step:', error);
    res.status(500).json({ error: 'Failed to create workflow step' });
  }
});

// Update a workflow step
router.put('/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;
    const updateData = req.body;

    const [updated] = await db.update(serviceWorkflowSteps)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(serviceWorkflowSteps.id, Number(stepId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Workflow step not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating workflow step:', error);
    res.status(500).json({ error: 'Failed to update workflow step' });
  }
});

// Delete a workflow step
router.delete('/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const { stepId } = req.params;

    const [deleted] = await db.update(serviceWorkflowSteps)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(serviceWorkflowSteps.id, Number(stepId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Workflow step not found' });
    }

    res.json({ message: 'Workflow step deactivated' });
  } catch (error) {
    console.error('Error deleting workflow step:', error);
    res.status(500).json({ error: 'Failed to delete workflow step' });
  }
});

// ============================================================================
// STATUS TRANSITION HISTORY (TRANSPARENCY)
// ============================================================================

// Get transition history for a service request
router.get('/service-requests/:requestId/history', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;

    const history = await db.select()
      .from(statusTransitionHistory)
      .where(eq(statusTransitionHistory.serviceRequestId, Number(requestId)))
      .orderBy(desc(statusTransitionHistory.changedAt));

    res.json({ history });
  } catch (error) {
    console.error('Error fetching transition history:', error);
    res.status(500).json({ error: 'Failed to fetch transition history' });
  }
});

// Get transition history for a business entity
router.get('/entities/:entityId/status-history', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const history = await db.select()
      .from(statusTransitionHistory)
      .where(eq(statusTransitionHistory.businessEntityId, Number(entityId)))
      .orderBy(desc(statusTransitionHistory.changedAt))
      .limit(Number(limit))
      .offset(Number(offset));

    const [countResult] = await db.select({ count: count() })
      .from(statusTransitionHistory)
      .where(eq(statusTransitionHistory.businessEntityId, Number(entityId)));

    res.json({
      history,
      total: countResult?.count || 0,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    console.error('Error fetching entity status history:', error);
    res.status(500).json({ error: 'Failed to fetch status history' });
  }
});

// ============================================================================
// STATUS TRANSITION EXECUTION
// ============================================================================

// Execute a status transition (main API for changing status)
router.post('/service-requests/:requestId/transition', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { toStatusCode, reason, notes } = req.body;
    const userId = (req as any).user?.id;

    // Get current service request
    const [serviceRequest] = await db.select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, Number(requestId)))
      .limit(1);

    if (!serviceRequest) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    const serviceKey = serviceRequest.serviceId;
    const fromStatusCode = serviceRequest.status;

    // Check if transition is valid
    const [transitionRule] = await db.select()
      .from(statusTransitionRules)
      .where(and(
        eq(statusTransitionRules.serviceKey, serviceKey),
        eq(statusTransitionRules.fromStatusCode, fromStatusCode),
        eq(statusTransitionRules.toStatusCode, toStatusCode),
        eq(statusTransitionRules.isActive, true)
      ))
      .limit(1);

    // If no explicit rule found, check if default transition exists
    if (!transitionRule) {
      const defaultTransitions = getDefaultTransitionRules(serviceKey);
      const defaultTransition = defaultTransitions.find(
        t => t.fromStatusCode === fromStatusCode && t.toStatusCode === toStatusCode
      );

      if (!defaultTransition) {
        return res.status(400).json({
          error: 'Invalid status transition',
          from: fromStatusCode,
          to: toStatusCode
        });
      }
    }

    // Get user details
    const [user] = await db.select({
      fullName: users.fullName,
      role: users.role
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Get status names for history
    const statuses = await db.select()
      .from(serviceWorkflowStatuses)
      .where(and(
        eq(serviceWorkflowStatuses.serviceKey, serviceKey),
        inArray(serviceWorkflowStatuses.statusCode, [fromStatusCode, toStatusCode])
      ));

    const fromStatus = statuses.find(s => s.statusCode === fromStatusCode);
    const toStatus = statuses.find(s => s.statusCode === toStatusCode);

    // Calculate duration in previous status
    let durationInPreviousStatus: number | null = null;
    const [lastTransition] = await db.select()
      .from(statusTransitionHistory)
      .where(eq(statusTransitionHistory.serviceRequestId, Number(requestId)))
      .orderBy(desc(statusTransitionHistory.changedAt))
      .limit(1);

    if (lastTransition) {
      const lastTime = new Date(lastTransition.changedAt!).getTime();
      const now = Date.now();
      durationInPreviousStatus = Math.floor((now - lastTime) / 60000); // minutes
    }

    // Update service request status
    await db.update(serviceRequests)
      .set({
        status: toStatusCode,
        currentMilestone: toStatus?.statusName || toStatusCode,
        updatedAt: new Date()
      })
      .where(eq(serviceRequests.id, Number(requestId)));

    // Record in transition history
    const [historyEntry] = await db.insert(statusTransitionHistory)
      .values({
        serviceRequestId: Number(requestId),
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
        isAutomatic: false,
        triggerSource: 'manual',
        wasApprovalRequired: transitionRule?.requiresApproval || false,
        requestSnapshot: {
          status: fromStatusCode,
          progress: serviceRequest.progress,
          priority: serviceRequest.priority
        }
      })
      .returning();

    // Trigger notifications if configured
    if (toStatus?.triggerNotification) {
      await createStatusNotification(serviceRequest, toStatus, userId);
    }

    // Trigger task creation if configured
    if (toStatus?.triggerTasks) {
      await createStatusTasks(serviceRequest, toStatus, userId);
    }

    // Update milestone history in service request
    const existingHistory = serviceRequest.milestoneHistory || [];
    const newHistory = [
      ...(existingHistory as any[]),
      {
        milestone: toStatus?.statusName || toStatusCode,
        date: new Date().toISOString(),
        status: toStatusCode,
        changedBy: user?.fullName
      }
    ];

    await db.update(serviceRequests)
      .set({ milestoneHistory: newHistory })
      .where(eq(serviceRequests.id, Number(requestId)));

    res.json({
      success: true,
      previousStatus: fromStatusCode,
      newStatus: toStatusCode,
      historyId: historyEntry.id,
      message: `Status changed from "${fromStatus?.statusName || fromStatusCode}" to "${toStatus?.statusName || toStatusCode}"`
    });
  } catch (error) {
    console.error('Error executing status transition:', error);
    res.status(500).json({ error: 'Failed to execute status transition' });
  }
});

// Get available transitions for a service request
router.get('/service-requests/:requestId/available-transitions', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;

    const [serviceRequest] = await db.select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, Number(requestId)))
      .limit(1);

    if (!serviceRequest) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    const serviceKey = serviceRequest.serviceId;
    const currentStatus = serviceRequest.status;

    // Get custom transitions
    let transitions = await db.select()
      .from(statusTransitionRules)
      .where(and(
        eq(statusTransitionRules.serviceKey, serviceKey),
        eq(statusTransitionRules.fromStatusCode, currentStatus),
        eq(statusTransitionRules.isActive, true)
      ))
      .orderBy(asc(statusTransitionRules.displayOrder));

    // If no custom transitions, use defaults
    if (transitions.length === 0) {
      const defaultTransitions = getDefaultTransitionRules(serviceKey)
        .filter(t => t.fromStatusCode === currentStatus);

      return res.json({
        currentStatus,
        transitions: defaultTransitions,
        isDefault: true
      });
    }

    res.json({
      currentStatus,
      transitions,
      isDefault: false
    });
  } catch (error) {
    console.error('Error fetching available transitions:', error);
    res.status(500).json({ error: 'Failed to fetch available transitions' });
  }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

// Copy statuses from one service to another
router.post('/services/:sourceServiceKey/copy-to/:targetServiceKey', async (req: Request, res: Response) => {
  try {
    const { sourceServiceKey, targetServiceKey } = req.params;

    // Get source statuses
    const sourceStatuses = await db.select()
      .from(serviceWorkflowStatuses)
      .where(and(
        eq(serviceWorkflowStatuses.serviceKey, sourceServiceKey),
        eq(serviceWorkflowStatuses.isActive, true)
      ));

    if (sourceStatuses.length === 0) {
      return res.status(404).json({ error: 'No statuses found for source service' });
    }

    // Copy each status to target
    const copiedStatuses = [];
    for (const status of sourceStatuses) {
      const { id, serviceKey, createdAt, updatedAt, ...statusData } = status;
      const [copied] = await db.insert(serviceWorkflowStatuses)
        .values({
          ...statusData,
          serviceKey: targetServiceKey
        })
        .returning();
      copiedStatuses.push(copied);
    }

    // Copy transition rules
    const sourceTransitions = await db.select()
      .from(statusTransitionRules)
      .where(and(
        eq(statusTransitionRules.serviceKey, sourceServiceKey),
        eq(statusTransitionRules.isActive, true)
      ));

    const copiedTransitions = [];
    for (const transition of sourceTransitions) {
      const { id, serviceKey, createdAt, updatedAt, ...transitionData } = transition;
      const [copied] = await db.insert(statusTransitionRules)
        .values({
          ...transitionData,
          serviceKey: targetServiceKey
        })
        .returning();
      copiedTransitions.push(copied);
    }

    res.json({
      message: `Copied ${copiedStatuses.length} statuses and ${copiedTransitions.length} transitions`,
      copiedStatuses: copiedStatuses.length,
      copiedTransitions: copiedTransitions.length
    });
  } catch (error) {
    console.error('Error copying statuses:', error);
    res.status(500).json({ error: 'Failed to copy statuses' });
  }
});

// Initialize default statuses for a service
router.post('/services/:serviceKey/initialize-defaults', async (req: Request, res: Response) => {
  try {
    const { serviceKey } = req.params;

    // Check if service already has statuses
    const existing = await db.select()
      .from(serviceWorkflowStatuses)
      .where(eq(serviceWorkflowStatuses.serviceKey, serviceKey))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Service already has custom statuses' });
    }

    // Get default statuses and insert them
    const defaultStatuses = getDefaultWorkflowStatuses(serviceKey);
    const insertedStatuses = [];

    for (const status of defaultStatuses) {
      const [inserted] = await db.insert(serviceWorkflowStatuses)
        .values({
          serviceKey,
          ...status
        })
        .returning();
      insertedStatuses.push(inserted);
    }

    // Insert default transitions
    const defaultTransitions = getDefaultTransitionRules(serviceKey);
    const insertedTransitions = [];

    for (const transition of defaultTransitions) {
      const [inserted] = await db.insert(statusTransitionRules)
        .values({
          serviceKey,
          ...transition
        })
        .returning();
      insertedTransitions.push(inserted);
    }

    res.json({
      message: 'Default statuses initialized',
      statuses: insertedStatuses.length,
      transitions: insertedTransitions.length
    });
  } catch (error) {
    console.error('Error initializing defaults:', error);
    res.status(500).json({ error: 'Failed to initialize defaults' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDefaultWorkflowStatuses(serviceKey: string): any[] {
  // Default statuses applicable to most services
  return [
    {
      statusCode: 'initiated',
      statusName: 'Service Initiated',
      statusDescription: 'Client has requested this service',
      statusCategory: 'milestone',
      isTerminal: false,
      displayOrder: 1,
      color: '#3b82f6',
      icon: 'play',
      triggerNotification: true,
      triggerTasks: true,
      clientVisible: true,
      clientStatusLabel: 'Request Received',
      clientMessage: 'Your service request has been received. Our team will begin processing shortly.'
    },
    {
      statusCode: 'docs_pending',
      statusName: 'Documents Pending',
      statusDescription: 'Waiting for client to upload required documents',
      statusCategory: 'process',
      isTerminal: false,
      displayOrder: 2,
      color: '#f59e0b',
      icon: 'file-text',
      requiresDocument: true,
      slaHours: 72,
      triggerNotification: true,
      clientVisible: true,
      clientStatusLabel: 'Documents Required',
      clientMessage: 'Please upload the required documents to proceed with your request.'
    },
    {
      statusCode: 'docs_uploaded',
      statusName: 'Documents Uploaded',
      statusDescription: 'Client has uploaded documents, pending review',
      statusCategory: 'process',
      isTerminal: false,
      displayOrder: 3,
      color: '#10b981',
      icon: 'check-circle',
      triggerNotification: true,
      triggerTasks: true,
      defaultAssigneeRole: 'ops_executive',
      clientVisible: true,
      clientStatusLabel: 'Documents Under Review',
      clientMessage: 'Your documents are being reviewed by our team.'
    },
    {
      statusCode: 'in_progress',
      statusName: 'In Progress',
      statusDescription: 'Service is being actively worked on',
      statusCategory: 'process',
      isTerminal: false,
      displayOrder: 4,
      color: '#6366f1',
      icon: 'loader',
      slaHours: 48,
      triggerTasks: true,
      defaultAssigneeRole: 'ops_executive',
      clientVisible: true,
      clientStatusLabel: 'Processing',
      clientMessage: 'Your request is being processed by our operations team.'
    },
    {
      statusCode: 'govt_submission',
      statusName: 'Government Submission',
      statusDescription: 'Filed with government authority',
      statusCategory: 'process',
      isTerminal: false,
      displayOrder: 5,
      color: '#8b5cf6',
      icon: 'send',
      triggerNotification: true,
      clientVisible: true,
      clientStatusLabel: 'Filed with Authority',
      clientMessage: 'Your application has been submitted to the relevant government authority.'
    },
    {
      statusCode: 'qc_review',
      statusName: 'QC Review',
      statusDescription: 'Quality check before delivery',
      statusCategory: 'process',
      isTerminal: false,
      displayOrder: 6,
      color: '#ec4899',
      icon: 'check-square',
      requiresApproval: true,
      slaHours: 24,
      triggerTasks: true,
      defaultAssigneeRole: 'qc_reviewer',
      clientVisible: true,
      clientStatusLabel: 'Quality Check',
      clientMessage: 'Your deliverables are undergoing quality review.'
    },
    {
      statusCode: 'ready_for_delivery',
      statusName: 'Ready for Delivery',
      statusDescription: 'QC passed, ready to deliver to client',
      statusCategory: 'milestone',
      isTerminal: false,
      displayOrder: 7,
      color: '#14b8a6',
      icon: 'package',
      triggerNotification: true,
      clientVisible: true,
      clientStatusLabel: 'Ready',
      clientMessage: 'Your deliverables are ready and will be shared shortly.'
    },
    {
      statusCode: 'completed',
      statusName: 'Completed',
      statusDescription: 'Service successfully completed and delivered',
      statusCategory: 'terminal',
      isTerminal: true,
      displayOrder: 8,
      color: '#22c55e',
      icon: 'check-circle-2',
      triggerNotification: true,
      clientVisible: true,
      clientStatusLabel: 'Completed',
      clientMessage: 'Your service has been completed. Thank you for choosing DigiComply!'
    },
    {
      statusCode: 'on_hold',
      statusName: 'On Hold',
      statusDescription: 'Service temporarily paused',
      statusCategory: 'process',
      isTerminal: false,
      displayOrder: 9,
      color: '#f97316',
      icon: 'pause-circle',
      triggerNotification: true,
      clientVisible: true,
      clientStatusLabel: 'On Hold',
      clientMessage: 'Your request is currently on hold. Our team will contact you for next steps.'
    },
    {
      statusCode: 'cancelled',
      statusName: 'Cancelled',
      statusDescription: 'Service request cancelled',
      statusCategory: 'terminal',
      isTerminal: true,
      displayOrder: 10,
      color: '#ef4444',
      icon: 'x-circle',
      triggerNotification: true,
      clientVisible: true,
      clientStatusLabel: 'Cancelled',
      clientMessage: 'This service request has been cancelled.'
    }
  ];
}

function getDefaultTransitionRules(serviceKey: string): any[] {
  return [
    {
      fromStatusCode: 'initiated',
      toStatusCode: 'docs_pending',
      transitionName: 'Request Documents',
      buttonLabel: 'Request Documents',
      allowedRoles: ['ops_executive', 'admin']
    },
    {
      fromStatusCode: 'docs_pending',
      toStatusCode: 'docs_uploaded',
      transitionName: 'Documents Received',
      buttonLabel: 'Mark Documents Received',
      allowedRoles: ['ops_executive', 'admin', 'client']
    },
    {
      fromStatusCode: 'docs_uploaded',
      toStatusCode: 'in_progress',
      transitionName: 'Start Processing',
      buttonLabel: 'Start Processing',
      allowedRoles: ['ops_executive', 'admin']
    },
    {
      fromStatusCode: 'in_progress',
      toStatusCode: 'govt_submission',
      transitionName: 'Submit to Government',
      buttonLabel: 'Mark as Submitted',
      allowedRoles: ['ops_executive', 'admin']
    },
    {
      fromStatusCode: 'govt_submission',
      toStatusCode: 'qc_review',
      transitionName: 'Send for QC',
      buttonLabel: 'Send for QC',
      allowedRoles: ['ops_executive', 'admin']
    },
    {
      fromStatusCode: 'in_progress',
      toStatusCode: 'qc_review',
      transitionName: 'Send for QC',
      buttonLabel: 'Send for QC',
      allowedRoles: ['ops_executive', 'admin']
    },
    {
      fromStatusCode: 'qc_review',
      toStatusCode: 'ready_for_delivery',
      transitionName: 'QC Approved',
      buttonLabel: 'Approve QC',
      allowedRoles: ['qc_reviewer', 'admin'],
      requiresApproval: true
    },
    {
      fromStatusCode: 'qc_review',
      toStatusCode: 'in_progress',
      transitionName: 'QC Rejected',
      buttonLabel: 'Return for Rework',
      buttonColor: 'warning',
      allowedRoles: ['qc_reviewer', 'admin']
    },
    {
      fromStatusCode: 'ready_for_delivery',
      toStatusCode: 'completed',
      transitionName: 'Complete Delivery',
      buttonLabel: 'Mark Completed',
      buttonColor: 'success',
      allowedRoles: ['ops_executive', 'admin']
    },
    {
      fromStatusCode: 'initiated',
      toStatusCode: 'on_hold',
      transitionName: 'Put on Hold',
      buttonLabel: 'Put on Hold',
      buttonColor: 'warning',
      confirmationRequired: true,
      confirmationMessage: 'Are you sure you want to put this request on hold?',
      allowedRoles: ['ops_executive', 'admin']
    },
    {
      fromStatusCode: 'on_hold',
      toStatusCode: 'in_progress',
      transitionName: 'Resume Processing',
      buttonLabel: 'Resume',
      allowedRoles: ['ops_executive', 'admin']
    },
    {
      fromStatusCode: 'initiated',
      toStatusCode: 'cancelled',
      transitionName: 'Cancel Request',
      buttonLabel: 'Cancel',
      buttonColor: 'danger',
      confirmationRequired: true,
      confirmationMessage: 'Are you sure you want to cancel this request? This action cannot be undone.',
      allowedRoles: ['admin', 'client']
    }
  ];
}

async function createStatusNotification(
  serviceRequest: any,
  status: any,
  userId: number
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
  } catch (error) {
    console.error('Error creating status notification:', error);
  }
}

async function createStatusTasks(
  serviceRequest: any,
  status: any,
  userId: number
): Promise<void> {
  try {
    if (!status.triggerTasks) return;

    // Generate task number
    const taskNumber = `TASK-${Date.now()}`;

    await db.insert(taskItems).values({
      taskNumber,
      title: `${status.statusName}: ${serviceRequest.serviceId}`,
      description: status.statusDescription || `Process service request in ${status.statusName} stage`,
      taskType: 'service_related',
      initiatorId: userId,
      assigneeRole: status.defaultAssigneeRole || 'ops_executive',
      status: 'pending',
      priority: serviceRequest.priority || 'medium',
      serviceRequestId: serviceRequest.id,
      businessEntityId: serviceRequest.businessEntityId,
      dueDate: status.slaHours
        ? new Date(Date.now() + status.slaHours * 60 * 60 * 1000)
        : undefined
    });
  } catch (error) {
    console.error('Error creating status tasks:', error);
  }
}

export default router;
