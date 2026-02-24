/**
 * Task Instantiation Service
 *
 * Bridges the workflow engine to live order execution by:
 * 1. Auto-creating tasks from workflow templates when orders are created
 * 2. Managing task dependencies and blocking
 * 3. Auto-assigning tasks using round-robin within roles
 * 4. Integrating with QC workflow for review tasks
 * 5. Tracking order progress and auto-completing orders
 */

import { db } from '../db';
import {
  orderTasks, orderTaskActivityLog, serviceRequests, qualityReviews, users,
  operationsTeam, workflowTemplates,
  ORDER_TASK_STATUS, ORDER_TASK_TYPE, QC_REVIEW_STATUS,
  type OrderTask, type InsertOrderTask, type ServiceRequest
} from '@shared/schema';
import { serviceBlueprints, blueprintWorkflowSteps } from '@shared/blueprints-schema';
import { eq, and, inArray, sql, desc, asc, isNull, not, or } from 'drizzle-orm';
import { idGenerator, ID_TYPES } from './id-generator';
import { workflowEngine, type WorkflowStepTemplate } from '../workflow-engine';
import { logger } from '../logger';
import { notificationHub } from './notifications/notification-hub';

// Notification types for workflow events
const WORKFLOW_NOTIFICATIONS = {
  SERVICE_REQUEST_CREATED: 'service_request_created',
  TASK_ASSIGNED: 'task_assigned',
  QC_REVIEW_NEEDED: 'qc_review_needed',
  QC_APPROVED: 'qc_approved',
  QC_REJECTED: 'qc_rejected',
  SERVICE_COMPLETED: 'service_completed',
  DOCUMENT_REQUESTED: 'document_requested',
};

// Blueprint step type for type safety
interface BlueprintStep {
  id: string;
  stepCode: string;
  stepName: string;
  stepType: string;
  description: string | null;
  defaultAssigneeRole: string | null;
  slaHours: number | null;
  requiredDocuments: unknown;
  sortOrder: number | null;
  isMilestone: boolean | null;
  entryConditions: unknown;
  exitConditions: unknown;
  skipConditions: unknown;
  allowedNextSteps: unknown;
}

// Workflow source for logging
type WorkflowSource = 'BLUEPRINT_DB' | 'IN_MEMORY_FALLBACK' | 'DEFAULT_WORKFLOW';

// Task type to role mapping
const TASK_TYPE_ROLE_MAP: Record<string, string> = {
  'document_upload': 'ops_executive',
  'document_review': 'ops_executive',
  'data_entry': 'ops_executive',
  'verification': 'ops_executive',
  'filing': 'ops_executive',
  'approval': 'ops_lead',
  'payment': 'ops_executive',
  'communication': 'ops_executive',
  'delivery': 'ops_executive',
  'qc_review': 'qc_reviewer',
  'documentation': 'ops_executive',
};

// Step type to task type mapping
const STEP_TYPE_TO_TASK_TYPE: Record<string, string> = {
  'documentation': ORDER_TASK_TYPE.DOCUMENT_UPLOAD,
  'filing': ORDER_TASK_TYPE.FILING,
  'approval': ORDER_TASK_TYPE.APPROVAL,
  'payment': ORDER_TASK_TYPE.PAYMENT,
  'verification': ORDER_TASK_TYPE.VERIFICATION,
};

interface TaskInstantiationResult {
  success: boolean;
  serviceRequestId: number;
  tasksCreated: number;
  tasks: OrderTask[];
  errors?: string[];
}

interface TaskStatusUpdateResult {
  success: boolean;
  task: OrderTask | null;
  unblockedTasks: OrderTask[];
  orderCompleted: boolean;
  orderProgress: number;
  qcReviewId?: number;
  error?: string;
}

interface AutoAssignmentResult {
  success: boolean;
  assignedTo: number | null;
  assigneeName: string | null;
  method: 'round_robin' | 'least_loaded' | 'manual' | 'unavailable';
  reason?: string;
}

export class TaskInstantiationService {

  /**
   * Try to load workflow from blueprint system (database)
   * Returns null if no blueprint exists for this service
   */
  private async loadWorkflowFromBlueprint(serviceId: string): Promise<{
    blueprint: typeof serviceBlueprints.$inferSelect;
    steps: BlueprintStep[];
  } | null> {
    try {
      // Try to find blueprint by code (serviceId maps to blueprint code)
      const [blueprint] = await db
        .select()
        .from(serviceBlueprints)
        .where(
          and(
            eq(serviceBlueprints.code, serviceId.toUpperCase()),
            eq(serviceBlueprints.isActive, true),
            eq(serviceBlueprints.status, 'ACTIVE')
          )
        )
        .limit(1);

      if (!blueprint) {
        return null;
      }

      // Load workflow steps for this blueprint
      const steps = await db
        .select()
        .from(blueprintWorkflowSteps)
        .where(eq(blueprintWorkflowSteps.blueprintId, blueprint.id))
        .orderBy(asc(blueprintWorkflowSteps.sortOrder));

      if (steps.length === 0) {
        logger.warn(`[Blueprint DB] Blueprint ${blueprint.code} found but has no workflow steps`);
        return null;
      }

      return { blueprint, steps: steps as BlueprintStep[] };
    } catch (error) {
      logger.error('Error loading workflow from blueprint:', error);
      return null;
    }
  }

  /**
   * Map blueprint step type to task type
   */
  private mapBlueprintStepTypeToTaskType(stepType: string): string {
    const typeMap: Record<string, string> = {
      'DATA_COLLECTION': ORDER_TASK_TYPE.DATA_ENTRY,
      'DOCUMENT_UPLOAD': ORDER_TASK_TYPE.DOCUMENT_UPLOAD,
      'DOCUMENT_COLLECTION': ORDER_TASK_TYPE.DOCUMENT_UPLOAD,
      'VERIFICATION': ORDER_TASK_TYPE.VERIFICATION,
      'GOVERNMENT_FILING': ORDER_TASK_TYPE.FILING,
      'FILING': ORDER_TASK_TYPE.FILING,
      'PAYMENT': ORDER_TASK_TYPE.PAYMENT,
      'APPROVAL': ORDER_TASK_TYPE.APPROVAL,
      'QC_REVIEW': ORDER_TASK_TYPE.VERIFICATION,
      'REVIEW': ORDER_TASK_TYPE.VERIFICATION,
      'CLIENT_APPROVAL': ORDER_TASK_TYPE.APPROVAL,
      'DELIVERY': ORDER_TASK_TYPE.APPROVAL,
      'TASK': ORDER_TASK_TYPE.DATA_ENTRY,
      'AUTO': ORDER_TASK_TYPE.DATA_ENTRY,
      'WAIT': ORDER_TASK_TYPE.DATA_ENTRY,
      'DECISION': ORDER_TASK_TYPE.VERIFICATION,
      'ACKNOWLEDGMENT': ORDER_TASK_TYPE.APPROVAL,
      'CALCULATION': ORDER_TASK_TYPE.DATA_ENTRY,
      'CLIENT_ACTION': ORDER_TASK_TYPE.COMMUNICATION,
    };
    return typeMap[stepType] || ORDER_TASK_TYPE.DATA_ENTRY;
  }

  /**
   * Create tasks from blueprint workflow steps
   */
  private async createTasksFromBlueprint(
    serviceRequestId: number,
    serviceRequest: ServiceRequest,
    blueprint: typeof serviceBlueprints.$inferSelect,
    steps: BlueprintStep[]
  ): Promise<TaskInstantiationResult> {
    const errors: string[] = [];
    const createdTasks: OrderTask[] = [];
    const stepCodeToTaskIdMap: Map<string, number> = new Map();
    const baseDate = serviceRequest.createdAt || new Date();

    logger.info(`[Blueprint DB] Creating ${steps.length} tasks from blueprint: ${blueprint.code}`);

    // First pass: create all tasks
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      try {
        const taskId = await idGenerator.generateId(ID_TYPES.TASK);
        const taskType = this.mapBlueprintStepTypeToTaskType(step.stepType);
        const assignedRole = step.defaultAssigneeRole || TASK_TYPE_ROLE_MAP[taskType] || 'ops_executive';

        // Calculate due date from SLA hours or default
        const slaHours = step.slaHours || 8;
        const estimatedDays = Math.ceil(slaHours / 8);
        const dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + this.calculateCumulativeDaysFromBlueprint(steps, i));

        // Determine if QC is required based on step type
        const requiresQc = step.stepType === 'QC_REVIEW' ||
                          step.stepType === 'VERIFICATION' ||
                          step.stepType === 'APPROVAL' ||
                          (step.isMilestone === true);

        // Check if has dependencies (from allowedNextSteps on previous steps)
        const hasDependencies = i > 0; // For now, assume linear dependency
        const initialStatus = hasDependencies
          ? ORDER_TASK_STATUS.BLOCKED
          : ORDER_TASK_STATUS.READY;

        const [task] = await db.insert(orderTasks).values({
          taskId,
          serviceRequestId,
          workflowTemplateId: blueprint.code,
          stepNumber: i + 1,
          stepId: step.stepCode,
          name: step.stepName,
          description: step.description || `Step ${i + 1}: ${step.stepName}`,
          taskType,
          status: initialStatus,
          assignedRole,
          assignedTo: null,
          dependsOn: [],
          blockedBy: [],
          requiresQc,
          estimatedDuration: slaHours,
          dueDate,
          priority: step.isMilestone ? 'high' : 'medium',
          autoAssigned: false,
          assignmentAttempts: 0,
          reworkCount: 0,
        }).returning();

        stepCodeToTaskIdMap.set(step.stepCode, task.id);
        createdTasks.push(task);

        await this.logTaskActivity(task.id, 'created', null, initialStatus, null, {
          source: 'BLUEPRINT_DB',
          blueprintId: blueprint.id,
          blueprintCode: blueprint.code,
          stepCode: step.stepCode,
          stepNumber: i + 1
        });

      } catch (stepError) {
        const errorMsg = `[Blueprint DB] Failed to create task for step ${step.stepCode}: ${(stepError as Error).message}`;
        logger.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Second pass: update dependencies (linear for now, or use allowedNextSteps if defined)
    await this.updateBlueprintTaskDependencies(createdTasks, steps, stepCodeToTaskIdMap);

    // Auto-assign ready tasks
    for (const task of createdTasks) {
      if (task.status === ORDER_TASK_STATUS.READY) {
        await this.autoAssignTask(task.id);
      }
    }

    // Update service request progress
    await this.updateOrderProgress(serviceRequestId);

    logger.info(`[Blueprint DB] Created ${createdTasks.length} tasks for service request ${serviceRequestId} from blueprint ${blueprint.code}`);

    return {
      success: errors.length === 0,
      serviceRequestId,
      tasksCreated: createdTasks.length,
      tasks: createdTasks,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Calculate cumulative days for blueprint steps
   */
  private calculateCumulativeDaysFromBlueprint(steps: BlueprintStep[], currentIndex: number): number {
    let total = 0;
    for (let i = 0; i <= currentIndex; i++) {
      const slaHours = steps[i].slaHours || 8;
      total += Math.ceil(slaHours / 8);
    }
    return total;
  }

  /**
   * Update task dependencies for blueprint-based tasks
   */
  private async updateBlueprintTaskDependencies(
    tasks: OrderTask[],
    steps: BlueprintStep[],
    stepCodeToTaskIdMap: Map<string, number>
  ): Promise<void> {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const step = steps[i];

      // For linear workflows, each step depends on the previous
      if (i > 0) {
        const prevTaskId = tasks[i - 1].id;
        const prevTask = tasks[i - 1];

        const dependencyTaskIds = [prevTaskId];
        const blockedByTaskIds = prevTask.status !== ORDER_TASK_STATUS.COMPLETED ? [prevTaskId] : [];

        await db.update(orderTasks)
          .set({
            dependsOn: dependencyTaskIds,
            blockedBy: blockedByTaskIds,
            status: blockedByTaskIds.length > 0 ? ORDER_TASK_STATUS.BLOCKED : ORDER_TASK_STATUS.READY,
            updatedAt: new Date()
          })
          .where(eq(orderTasks.id, task.id));
      }
    }
  }

  /**
   * STEP 1: Create tasks from workflow template when service request is created
   * Priority: 1) Blueprint DB  2) In-Memory Templates  3) Default 4-step workflow
   */
  async instantiateTasksForOrder(
    serviceRequestId: number,
    workflowTemplateId?: string
  ): Promise<TaskInstantiationResult> {
    const errors: string[] = [];

    try {
      // Get the service request
      const [serviceRequest] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, serviceRequestId))
        .limit(1);

      if (!serviceRequest) {
        return {
          success: false,
          serviceRequestId,
          tasksCreated: 0,
          tasks: [],
          errors: ['Service request not found']
        };
      }

      // Determine which workflow template to use
      const templateId = workflowTemplateId || serviceRequest.serviceId;

      // PRIORITY 1: Try to load from Blueprint DB first
      const blueprintData = await this.loadWorkflowFromBlueprint(templateId);
      if (blueprintData) {
        logger.info(`[Blueprint DB] Using blueprint workflow for service: ${templateId}`);
        return this.createTasksFromBlueprint(
          serviceRequestId,
          serviceRequest,
          blueprintData.blueprint,
          blueprintData.steps
        );
      }

      // PRIORITY 2: Fall back to in-memory workflow engine
      const template = workflowEngine.getTemplate(templateId);

      if (!template || !template.steps || template.steps.length === 0) {
        logger.warn(`[In-Memory Fallback] No workflow template found for service: ${templateId}, using default 4-step workflow`);
        // PRIORITY 3: Create default workflow if no template found
        return this.createDefaultTasks(serviceRequestId, serviceRequest);
      }

      logger.info(`[In-Memory Fallback] Using in-memory workflow template for service: ${templateId}`);

      // Create task ID to step ID mapping for dependency resolution
      const stepToTaskIdMap: Map<string, number> = new Map();
      const createdTasks: OrderTask[] = [];

      // Calculate base due date from service request
      const baseDate = serviceRequest.createdAt || new Date();

      // Create tasks for each workflow step
      for (let i = 0; i < template.steps.length; i++) {
        const step = template.steps[i];

        try {
          // Generate readable task ID
          const taskId = await idGenerator.generateId(ID_TYPES.TASK);

          // Determine task type and role
          const taskType = STEP_TYPE_TO_TASK_TYPE[step.type] || ORDER_TASK_TYPE.DATA_ENTRY;
          const assignedRole = TASK_TYPE_ROLE_MAP[taskType] || 'ops_executive';

          // Calculate due date based on estimated days
          const estimatedDays = step.estimatedDays || 1;
          const dueDate = new Date(baseDate);
          dueDate.setDate(dueDate.getDate() + this.calculateCumulativeDays(template.steps, i));

          // Determine if QC is required
          const requiresQc = step.type === 'approval' || step.type === 'verification';

          // Determine initial status based on dependencies
          const hasDependencies = step.dependencies && step.dependencies.length > 0;
          const initialStatus = hasDependencies
            ? ORDER_TASK_STATUS.BLOCKED
            : ORDER_TASK_STATUS.READY;

          // Create the task
          const [task] = await db.insert(orderTasks).values({
            taskId,
            serviceRequestId,
            workflowTemplateId: templateId,
            stepNumber: i + 1,
            stepId: step.id,
            name: step.name,
            description: step.description,
            taskType,
            status: initialStatus,
            assignedRole,
            assignedTo: null, // Will be assigned later
            dependsOn: [], // Will be updated after all tasks created
            blockedBy: [], // Will be updated after all tasks created
            requiresQc,
            estimatedDuration: estimatedDays * 8, // Convert to hours
            dueDate,
            priority: 'medium',
            autoAssigned: false,
            assignmentAttempts: 0,
            reworkCount: 0,
          }).returning();

          stepToTaskIdMap.set(step.id, task.id);
          createdTasks.push(task);

          // Log task creation
          await this.logTaskActivity(task.id, 'created', null, initialStatus, null, {
            source: 'IN_MEMORY_FALLBACK',
            templateId,
            stepId: step.id,
            stepNumber: i + 1
          });

        } catch (stepError) {
          const errorMsg = `Failed to create task for step ${step.id}: ${(stepError as Error).message}`;
          logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Update dependencies with actual task IDs
      await this.updateTaskDependencies(createdTasks, template.steps, stepToTaskIdMap);

      // Auto-assign ready tasks
      for (const task of createdTasks) {
        if (task.status === ORDER_TASK_STATUS.READY) {
          await this.autoAssignTask(task.id);
        }
      }

      // Update service request progress
      await this.updateOrderProgress(serviceRequestId);

      // NOTIFICATION: Service request created - notify client
      if (serviceRequest.userId) {
        const serviceName = serviceRequest.serviceId || 'Service';
        this.notifyServiceRequestCreated(
          serviceRequestId,
          serviceRequest.userId,
          serviceName,
          serviceRequest.requestId || `SR-${serviceRequestId}`
        );
      }

      logger.info(`[In-Memory Fallback] Created ${createdTasks.length} tasks for service request ${serviceRequestId} from template ${templateId}`);

      return {
        success: errors.length === 0,
        serviceRequestId,
        tasksCreated: createdTasks.length,
        tasks: createdTasks,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      logger.error(`Failed to instantiate tasks for order ${serviceRequestId}:`, error);
      return {
        success: false,
        serviceRequestId,
        tasksCreated: 0,
        tasks: [],
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Create default 4-step workflow when no template exists
   */
  private async createDefaultTasks(
    serviceRequestId: number,
    serviceRequest: ServiceRequest
  ): Promise<TaskInstantiationResult> {
    logger.info(`[Default Workflow] Creating default 4-step workflow for service request ${serviceRequestId}`);

    const defaultSteps = [
      { id: 'intake', name: 'Requirement Intake', type: 'documentation', days: 1 },
      { id: 'execution', name: 'Service Execution', type: 'filing', days: 3 },
      { id: 'review', name: 'Quality Review', type: 'verification', days: 1 },
      { id: 'delivery', name: 'Client Delivery', type: 'approval', days: 1 },
    ];

    const createdTasks: OrderTask[] = [];
    const stepToTaskIdMap: Map<string, number> = new Map();
    const baseDate = serviceRequest.createdAt || new Date();
    let cumulativeDays = 0;

    for (let i = 0; i < defaultSteps.length; i++) {
      const step = defaultSteps[i];
      const taskId = await idGenerator.generateId(ID_TYPES.TASK);

      cumulativeDays += step.days;
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + cumulativeDays);

      const taskType = STEP_TYPE_TO_TASK_TYPE[step.type] || ORDER_TASK_TYPE.DATA_ENTRY;
      const assignedRole = TASK_TYPE_ROLE_MAP[taskType] || 'ops_executive';
      const requiresQc = step.type === 'verification' || step.type === 'approval';

      // First task is ready, rest are blocked
      const initialStatus = i === 0 ? ORDER_TASK_STATUS.READY : ORDER_TASK_STATUS.BLOCKED;

      const [task] = await db.insert(orderTasks).values({
        taskId,
        serviceRequestId,
        workflowTemplateId: 'default',
        stepNumber: i + 1,
        stepId: step.id,
        name: step.name,
        description: `Default workflow step: ${step.name}`,
        taskType,
        status: initialStatus,
        assignedRole,
        assignedTo: null,
        dependsOn: i > 0 ? [createdTasks[i - 1].id] : [],
        blockedBy: i > 0 ? [createdTasks[i - 1].id] : [],
        requiresQc,
        estimatedDuration: step.days * 8,
        dueDate,
        priority: 'medium',
        autoAssigned: false,
        assignmentAttempts: 0,
        reworkCount: 0,
      }).returning();

      stepToTaskIdMap.set(step.id, task.id);
      createdTasks.push(task);

      await this.logTaskActivity(task.id, 'created', null, initialStatus, null, {
        source: 'DEFAULT_WORKFLOW',
        templateId: 'default',
        stepId: step.id,
        stepNumber: i + 1
      });
    }

    // Auto-assign first task
    if (createdTasks.length > 0) {
      await this.autoAssignTask(createdTasks[0].id);
    }

    await this.updateOrderProgress(serviceRequestId);

    logger.info(`[Default Workflow] Created ${createdTasks.length} tasks for service request ${serviceRequestId}`);

    return {
      success: true,
      serviceRequestId,
      tasksCreated: createdTasks.length,
      tasks: createdTasks
    };
  }

  /**
   * Calculate cumulative days for a step based on all previous steps
   */
  private calculateCumulativeDays(steps: WorkflowStepTemplate[], currentIndex: number): number {
    let total = 0;
    for (let i = 0; i <= currentIndex; i++) {
      total += steps[i].estimatedDays || 1;
    }
    return total;
  }

  /**
   * Update task dependencies with actual task IDs
   */
  private async updateTaskDependencies(
    tasks: OrderTask[],
    steps: WorkflowStepTemplate[],
    stepToTaskIdMap: Map<string, number>
  ): Promise<void> {
    for (const task of tasks) {
      const step = steps.find(s => s.id === task.stepId);
      if (!step || !step.dependencies || step.dependencies.length === 0) continue;

      // Convert step IDs to task IDs
      const dependencyTaskIds: number[] = [];
      const blockedByTaskIds: number[] = [];

      for (const depStepId of step.dependencies) {
        const depTaskId = stepToTaskIdMap.get(depStepId);
        if (depTaskId) {
          dependencyTaskIds.push(depTaskId);

          // Check if dependency is completed
          const depTask = tasks.find(t => t.id === depTaskId);
          if (depTask && depTask.status !== ORDER_TASK_STATUS.COMPLETED) {
            blockedByTaskIds.push(depTaskId);
          }
        }
      }

      // Update task with resolved dependencies
      await db.update(orderTasks)
        .set({
          dependsOn: dependencyTaskIds,
          blockedBy: blockedByTaskIds,
          status: blockedByTaskIds.length > 0 ? ORDER_TASK_STATUS.BLOCKED : ORDER_TASK_STATUS.READY,
          updatedAt: new Date()
        })
        .where(eq(orderTasks.id, task.id));
    }
  }

  /**
   * STEP 2: Handle task status updates with dependency cascade
   */
  async updateTaskStatus(
    taskId: number,
    newStatus: string,
    userId: number,
    notes?: string
  ): Promise<TaskStatusUpdateResult> {
    try {
      // Get current task
      const [task] = await db
        .select()
        .from(orderTasks)
        .where(eq(orderTasks.id, taskId))
        .limit(1);

      if (!task) {
        return {
          success: false,
          task: null,
          unblockedTasks: [],
          orderCompleted: false,
          orderProgress: 0,
          error: 'Task not found'
        };
      }

      const oldStatus = task.status;

      // Validate status transition
      if (!this.isValidStatusTransition(oldStatus, newStatus)) {
        return {
          success: false,
          task,
          unblockedTasks: [],
          orderCompleted: false,
          orderProgress: 0,
          error: `Invalid status transition from ${oldStatus} to ${newStatus}`
        };
      }

      // Handle QC integration for tasks that require QC
      if (task.requiresQc && newStatus === ORDER_TASK_STATUS.COMPLETED &&
          oldStatus !== ORDER_TASK_STATUS.QC_PENDING) {
        // Redirect to QC pending instead of completed
        return this.submitTaskForQc(taskId, userId, notes);
      }

      // Update the task
      const updateData: Partial<OrderTask> = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === ORDER_TASK_STATUS.IN_PROGRESS && !task.startedAt) {
        updateData.startedAt = new Date();
      }

      if (newStatus === ORDER_TASK_STATUS.COMPLETED) {
        updateData.completedAt = new Date();
      }

      if (notes) {
        updateData.workNotes = notes;
      }

      const [updatedTask] = await db.update(orderTasks)
        .set(updateData)
        .where(eq(orderTasks.id, taskId))
        .returning();

      // Log the activity
      await this.logTaskActivity(taskId, 'status_change', oldStatus, newStatus, userId, { notes });

      // Handle dependency cascade if task completed
      let unblockedTasks: OrderTask[] = [];
      if (newStatus === ORDER_TASK_STATUS.COMPLETED) {
        unblockedTasks = await this.cascadeUnblock(taskId, task.serviceRequestId);
      }

      // Update order progress
      const { progress, completed } = await this.updateOrderProgress(task.serviceRequestId);

      return {
        success: true,
        task: updatedTask,
        unblockedTasks,
        orderCompleted: completed,
        orderProgress: progress
      };

    } catch (error) {
      logger.error(`Failed to update task ${taskId} status:`, error);
      return {
        success: false,
        task: null,
        unblockedTasks: [],
        orderCompleted: false,
        orderProgress: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * Validate status transitions
   */
  private isValidStatusTransition(from: string, to: string): boolean {
    const validTransitions: Record<string, string[]> = {
      [ORDER_TASK_STATUS.PENDING]: [ORDER_TASK_STATUS.READY, ORDER_TASK_STATUS.BLOCKED, ORDER_TASK_STATUS.SKIPPED],
      [ORDER_TASK_STATUS.BLOCKED]: [ORDER_TASK_STATUS.READY, ORDER_TASK_STATUS.SKIPPED],
      [ORDER_TASK_STATUS.READY]: [ORDER_TASK_STATUS.IN_PROGRESS, ORDER_TASK_STATUS.SKIPPED],
      [ORDER_TASK_STATUS.IN_PROGRESS]: [ORDER_TASK_STATUS.COMPLETED, ORDER_TASK_STATUS.QC_PENDING, ORDER_TASK_STATUS.BLOCKED],
      [ORDER_TASK_STATUS.QC_PENDING]: [ORDER_TASK_STATUS.COMPLETED, ORDER_TASK_STATUS.QC_REJECTED],
      [ORDER_TASK_STATUS.QC_REJECTED]: [ORDER_TASK_STATUS.IN_PROGRESS],
      [ORDER_TASK_STATUS.COMPLETED]: [], // Terminal state
      [ORDER_TASK_STATUS.SKIPPED]: [], // Terminal state
      [ORDER_TASK_STATUS.CANCELLED]: [], // Terminal state
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * STEP 2: Cascade unblock dependent tasks when a task is completed
   */
  private async cascadeUnblock(completedTaskId: number, serviceRequestId: number): Promise<OrderTask[]> {
    const unblockedTasks: OrderTask[] = [];

    // Find all tasks that depend on this completed task
    const dependentTasks = await db
      .select()
      .from(orderTasks)
      .where(
        and(
          eq(orderTasks.serviceRequestId, serviceRequestId),
          sql`${orderTasks.blockedBy}::jsonb @> ${JSON.stringify([completedTaskId])}::jsonb`
        )
      );

    for (const task of dependentTasks) {
      // Remove the completed task from blockedBy
      const newBlockedBy = ((task.blockedBy as number[]) || [])
        .filter((id: number) => id !== completedTaskId);

      // If no more blockers, task becomes ready
      const newStatus = newBlockedBy.length === 0
        ? ORDER_TASK_STATUS.READY
        : ORDER_TASK_STATUS.BLOCKED;

      const [updatedTask] = await db.update(orderTasks)
        .set({
          blockedBy: newBlockedBy,
          status: newStatus,
          updatedAt: new Date()
        })
        .where(eq(orderTasks.id, task.id))
        .returning();

      if (newStatus === ORDER_TASK_STATUS.READY) {
        unblockedTasks.push(updatedTask);

        // Log unblock activity
        await this.logTaskActivity(task.id, 'unblocked', ORDER_TASK_STATUS.BLOCKED, ORDER_TASK_STATUS.READY, null, {
          unblockedBy: completedTaskId
        });

        // Auto-assign the newly ready task
        await this.autoAssignTask(task.id);
      }
    }

    return unblockedTasks;
  }

  /**
   * STEP 3: Auto-assign task using round-robin within role
   */
  async autoAssignTask(taskId: number): Promise<AutoAssignmentResult> {
    try {
      const [task] = await db
        .select()
        .from(orderTasks)
        .where(eq(orderTasks.id, taskId))
        .limit(1);

      if (!task) {
        return {
          success: false,
          assignedTo: null,
          assigneeName: null,
          method: 'unavailable',
          reason: 'Task not found'
        };
      }

      // If already assigned, skip
      if (task.assignedTo) {
        return {
          success: true,
          assignedTo: task.assignedTo,
          assigneeName: null,
          method: 'manual',
          reason: 'Already assigned'
        };
      }

      const role = task.assignedRole;

      // Find eligible users with this role who are active
      // Try operations team first
      const eligibleOpsTeam = await db
        .select()
        .from(operationsTeam)
        .where(
          and(
            eq(operationsTeam.role, role),
            eq(operationsTeam.isActive, true)
          )
        );

      // Also check main users table for the role
      const eligibleUsers = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, role),
            eq(users.isActive, true)
          )
        );

      // Combine and deduplicate
      const allEligible = [
        ...eligibleOpsTeam.map(o => ({ userId: o.userId, name: o.name })),
        ...eligibleUsers.map(u => ({ userId: u.id, name: u.fullName || u.username }))
      ];

      // Remove duplicates
      const uniqueEligible = Array.from(
        new Map(allEligible.map(item => [item.userId, item])).values()
      );

      if (uniqueEligible.length === 0) {
        // No eligible users, flag for manual assignment
        await db.update(orderTasks)
          .set({
            assignmentAttempts: (task.assignmentAttempts || 0) + 1,
            assignmentNotes: `No users available for role: ${role}`,
            updatedAt: new Date()
          })
          .where(eq(orderTasks.id, taskId));

        return {
          success: false,
          assignedTo: null,
          assigneeName: null,
          method: 'unavailable',
          reason: `No active users found for role: ${role}`
        };
      }

      // Find user with fewest in-progress tasks (least loaded)
      const workloadCounts = await Promise.all(
        uniqueEligible.map(async (user) => {
          const [result] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(orderTasks)
            .where(
              and(
                eq(orderTasks.assignedTo, user.userId),
                eq(orderTasks.status, ORDER_TASK_STATUS.IN_PROGRESS)
              )
            );
          return {
            ...user,
            inProgressCount: result?.count || 0
          };
        })
      );

      // Sort by workload (ascending)
      workloadCounts.sort((a, b) => a.inProgressCount - b.inProgressCount);

      const selectedUser = workloadCounts[0];

      // Assign the task
      await db.update(orderTasks)
        .set({
          assignedTo: selectedUser.userId,
          assignedAt: new Date(),
          autoAssigned: true,
          assignmentNotes: `Auto-assigned via least-loaded algorithm`,
          updatedAt: new Date()
        })
        .where(eq(orderTasks.id, taskId));

      // Log assignment
      await this.logTaskActivity(taskId, 'assigned', null, null, null, {
        assignedTo: selectedUser.userId,
        method: 'least_loaded',
        workload: selectedUser.inProgressCount
      });

      // NOTIFICATION: Task assigned - notify ops executive
      this.notifyTaskAssigned(
        taskId,
        selectedUser.userId,
        task.name,
        task.workflowTemplateId || 'Service',
        'Client' // Will be enhanced to get actual client name
      );

      logger.info(`Auto-assigned task ${taskId} to user ${selectedUser.userId} (${selectedUser.name})`);

      return {
        success: true,
        assignedTo: selectedUser.userId,
        assigneeName: selectedUser.name,
        method: 'least_loaded',
        reason: `Selected user with ${selectedUser.inProgressCount} in-progress tasks`
      };

    } catch (error) {
      logger.error(`Failed to auto-assign task ${taskId}:`, error);
      return {
        success: false,
        assignedTo: null,
        assigneeName: null,
        method: 'unavailable',
        reason: (error as Error).message
      };
    }
  }

  /**
   * STEP 4: Submit task for QC review
   */
  async submitTaskForQc(
    taskId: number,
    userId: number,
    notes?: string
  ): Promise<TaskStatusUpdateResult> {
    try {
      const [task] = await db
        .select()
        .from(orderTasks)
        .where(eq(orderTasks.id, taskId))
        .limit(1);

      if (!task) {
        return {
          success: false,
          task: null,
          unblockedTasks: [],
          orderCompleted: false,
          orderProgress: 0,
          error: 'Task not found'
        };
      }

      // Create QC review record
      const reviewId = await idGenerator.generateId(ID_TYPES.QC_REVIEW);

      const [qcReview] = await db.insert(qualityReviews).values({
        reviewId,
        serviceRequestId: task.serviceRequestId,
        reviewerId: 0, // Will be assigned by QC team
        status: QC_REVIEW_STATUS.PENDING,
        priority: task.priority || 'medium',
        checklist: {
          items: [
            { id: 'accuracy', label: 'Data Accuracy', checked: false },
            { id: 'completeness', label: 'Completeness', checked: false },
            { id: 'compliance', label: 'Compliance Check', checked: false },
            { id: 'documentation', label: 'Documentation', checked: false },
          ],
          taskId: task.id,
          taskName: task.name
        },
        reviewNotes: notes,
      }).returning();

      // Update task status to QC pending
      const [updatedTask] = await db.update(orderTasks)
        .set({
          status: ORDER_TASK_STATUS.QC_PENDING,
          qcReviewId: qcReview.id,
          qcStatus: 'pending',
          workNotes: notes,
          updatedAt: new Date()
        })
        .where(eq(orderTasks.id, taskId))
        .returning();

      // Log the activity
      await this.logTaskActivity(taskId, 'qc_submitted', ORDER_TASK_STATUS.IN_PROGRESS, ORDER_TASK_STATUS.QC_PENDING, userId, {
        qcReviewId: qcReview.id,
        notes
      });

      // NOTIFICATION: QC review needed - notify QC executives
      this.notifyQcReviewNeeded(
        taskId,
        task.name,
        task.workflowTemplateId || 'Service',
        'Client'
      );

      const { progress } = await this.updateOrderProgress(task.serviceRequestId);

      return {
        success: true,
        task: updatedTask,
        unblockedTasks: [],
        orderCompleted: false,
        orderProgress: progress,
        qcReviewId: qcReview.id
      };

    } catch (error) {
      logger.error(`Failed to submit task ${taskId} for QC:`, error);
      return {
        success: false,
        task: null,
        unblockedTasks: [],
        orderCompleted: false,
        orderProgress: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * STEP 4: Handle QC review result
   */
  async handleQcResult(
    taskId: number,
    approved: boolean,
    reviewerId: number,
    notes?: string
  ): Promise<TaskStatusUpdateResult> {
    try {
      const [task] = await db
        .select()
        .from(orderTasks)
        .where(eq(orderTasks.id, taskId))
        .limit(1);

      if (!task) {
        return {
          success: false,
          task: null,
          unblockedTasks: [],
          orderCompleted: false,
          orderProgress: 0,
          error: 'Task not found'
        };
      }

      if (task.status !== ORDER_TASK_STATUS.QC_PENDING) {
        return {
          success: false,
          task,
          unblockedTasks: [],
          orderCompleted: false,
          orderProgress: 0,
          error: 'Task is not pending QC review'
        };
      }

      // Update QC review if exists
      if (task.qcReviewId) {
        await db.update(qualityReviews)
          .set({
            reviewerId,
            status: approved ? QC_REVIEW_STATUS.APPROVED : QC_REVIEW_STATUS.REJECTED,
            reviewNotes: notes,
            reviewCompletedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(qualityReviews.id, task.qcReviewId));
      }

      if (approved) {
        // QC approved - mark task as completed
        const [updatedTask] = await db.update(orderTasks)
          .set({
            status: ORDER_TASK_STATUS.COMPLETED,
            qcStatus: 'approved',
            qcNotes: notes,
            completedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(orderTasks.id, taskId))
          .returning();

        await this.logTaskActivity(taskId, 'qc_approved', ORDER_TASK_STATUS.QC_PENDING, ORDER_TASK_STATUS.COMPLETED, reviewerId, { notes });

        // Cascade unblock dependent tasks
        const unblockedTasks = await this.cascadeUnblock(taskId, task.serviceRequestId);
        const { progress, completed } = await this.updateOrderProgress(task.serviceRequestId);

        return {
          success: true,
          task: updatedTask,
          unblockedTasks,
          orderCompleted: completed,
          orderProgress: progress
        };

      } else {
        // QC rejected - send back to in_progress for rework
        const [updatedTask] = await db.update(orderTasks)
          .set({
            status: ORDER_TASK_STATUS.QC_REJECTED,
            qcStatus: 'rejected',
            qcNotes: notes,
            lastReworkReason: notes,
            reworkCount: (task.reworkCount || 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(orderTasks.id, taskId))
          .returning();

        await this.logTaskActivity(taskId, 'qc_rejected', ORDER_TASK_STATUS.QC_PENDING, ORDER_TASK_STATUS.QC_REJECTED, reviewerId, {
          notes,
          reworkCount: (task.reworkCount || 0) + 1
        });

        // NOTIFICATION: QC rejected - notify ops executive with notes
        if (task.assignedTo) {
          this.notifyQcRejected(
            taskId,
            task.assignedTo,
            task.name,
            notes || 'Please review and resubmit.',
            task.reworkCount || 0
          );
        }

        const { progress } = await this.updateOrderProgress(task.serviceRequestId);

        return {
          success: true,
          task: updatedTask,
          unblockedTasks: [],
          orderCompleted: false,
          orderProgress: progress
        };
      }

    } catch (error) {
      logger.error(`Failed to handle QC result for task ${taskId}:`, error);
      return {
        success: false,
        task: null,
        unblockedTasks: [],
        orderCompleted: false,
        orderProgress: 0,
        error: (error as Error).message
      };
    }
  }

  /**
   * STEP 5: Update order progress and auto-complete if all tasks done
   */
  async updateOrderProgress(serviceRequestId: number): Promise<{ progress: number; completed: boolean }> {
    try {
      // Get all tasks for this order
      const tasks = await db
        .select()
        .from(orderTasks)
        .where(eq(orderTasks.serviceRequestId, serviceRequestId));

      if (tasks.length === 0) {
        return { progress: 0, completed: false };
      }

      // Calculate progress
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t =>
        t.status === ORDER_TASK_STATUS.COMPLETED ||
        t.status === ORDER_TASK_STATUS.SKIPPED
      ).length;

      const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

      // Check if all tasks are completed
      const allCompleted = completedTasks === totalTasks;

      // Update service request
      const updateData: Partial<ServiceRequest> = {
        progress: progressPercentage,
        updatedAt: new Date()
      };

      if (allCompleted) {
        updateData.status = 'completed';
        updateData.actualCompletion = new Date();
      }

      await db.update(serviceRequests)
        .set(updateData)
        .where(eq(serviceRequests.id, serviceRequestId));

      if (allCompleted) {
        logger.info(`Service request ${serviceRequestId} auto-completed - all tasks finished`);

        // NOTIFICATION: Service completed - notify client
        const [serviceRequest] = await db
          .select()
          .from(serviceRequests)
          .where(eq(serviceRequests.id, serviceRequestId))
          .limit(1);

        if (serviceRequest?.userId) {
          this.notifyServiceCompleted(
            serviceRequestId,
            serviceRequest.userId,
            serviceRequest.serviceId || 'Service',
            serviceRequest.requestId || `SR-${serviceRequestId}`
          );
        }
      }

      return { progress: progressPercentage, completed: allCompleted };

    } catch (error) {
      logger.error(`Failed to update order progress for ${serviceRequestId}:`, error);
      return { progress: 0, completed: false };
    }
  }

  /**
   * Get all tasks for an order
   */
  async getTasksForOrder(serviceRequestId: number): Promise<OrderTask[]> {
    return db
      .select()
      .from(orderTasks)
      .where(eq(orderTasks.serviceRequestId, serviceRequestId))
      .orderBy(asc(orderTasks.stepNumber));
  }

  /**
   * Get tasks assigned to a user
   */
  async getTasksForUser(userId: number, statusFilter?: string[]): Promise<OrderTask[]> {
    const conditions = [eq(orderTasks.assignedTo, userId)];

    if (statusFilter && statusFilter.length > 0) {
      conditions.push(inArray(orderTasks.status, statusFilter));
    }

    return db
      .select()
      .from(orderTasks)
      .where(and(...conditions))
      .orderBy(asc(orderTasks.dueDate));
  }

  /**
   * Get unassigned tasks ready for pickup
   */
  async getUnassignedReadyTasks(role?: string): Promise<OrderTask[]> {
    const conditions = [
      eq(orderTasks.status, ORDER_TASK_STATUS.READY),
      isNull(orderTasks.assignedTo)
    ];

    if (role) {
      conditions.push(eq(orderTasks.assignedRole, role));
    }

    return db
      .select()
      .from(orderTasks)
      .where(and(...conditions))
      .orderBy(asc(orderTasks.dueDate));
  }

  /**
   * Manually assign a task to a user
   */
  async assignTask(
    taskId: number,
    assignToUserId: number,
    assignedBy: number
  ): Promise<OrderTask | null> {
    try {
      const [updatedTask] = await db.update(orderTasks)
        .set({
          assignedTo: assignToUserId,
          assignedAt: new Date(),
          autoAssigned: false,
          assignmentNotes: `Manually assigned`,
          updatedAt: new Date()
        })
        .where(eq(orderTasks.id, taskId))
        .returning();

      await this.logTaskActivity(taskId, 'assigned', null, null, assignedBy, {
        assignedTo: assignToUserId,
        method: 'manual'
      });

      return updatedTask;
    } catch (error) {
      logger.error(`Failed to assign task ${taskId}:`, error);
      return null;
    }
  }

  /**
   * Log task activity
   */
  private async logTaskActivity(
    taskId: number,
    activityType: string,
    fromStatus: string | null,
    toStatus: string | null,
    performedBy: number | null,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(orderTaskActivityLog).values({
        taskId,
        activityType,
        fromStatus,
        toStatus,
        performedBy,
        details
      });
    } catch (error) {
      logger.error(`Failed to log task activity:`, error);
    }
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: number): Promise<OrderTask | null> {
    const [task] = await db
      .select()
      .from(orderTasks)
      .where(eq(orderTasks.id, taskId))
      .limit(1);

    return task || null;
  }

  /**
   * Get task by readable ID (TK26000001)
   */
  async getTaskByReadableId(readableId: string): Promise<OrderTask | null> {
    const [task] = await db
      .select()
      .from(orderTasks)
      .where(eq(orderTasks.taskId, readableId))
      .limit(1);

    return task || null;
  }

  /**
   * Send notification for service request created
   */
  async notifyServiceRequestCreated(
    serviceRequestId: number,
    clientUserId: number,
    serviceName: string,
    requestId: string
  ): Promise<void> {
    try {
      await notificationHub.send({
        userId: clientUserId,
        type: WORKFLOW_NOTIFICATIONS.SERVICE_REQUEST_CREATED,
        channels: ['email', 'in_app'],
        priority: 'normal',
        subject: `Service Request Created: ${serviceName}`,
        content: `Your service request ${requestId} for ${serviceName} has been created and is being processed. You can track progress in your portal.`,
        referenceType: 'service_request',
        referenceId: serviceRequestId,
        data: {
          serviceName,
          requestId,
          serviceRequestId,
        },
      });
      logger.info(`[Notification] Service request created notification sent to user ${clientUserId}`);
    } catch (error) {
      logger.error(`[Notification] Failed to send service request created notification:`, error);
    }
  }

  /**
   * Send notification for task assigned to ops executive
   */
  async notifyTaskAssigned(
    taskId: number,
    assignedToUserId: number,
    taskName: string,
    serviceName: string,
    clientName: string
  ): Promise<void> {
    try {
      await notificationHub.send({
        userId: assignedToUserId,
        type: WORKFLOW_NOTIFICATIONS.TASK_ASSIGNED,
        channels: ['in_app'],
        priority: 'normal',
        subject: `New Task Assigned: ${taskName}`,
        content: `You have been assigned a new task "${taskName}" for client ${clientName} (${serviceName}). Please review and start working on it.`,
        referenceType: 'task',
        referenceId: taskId,
        data: {
          taskId,
          taskName,
          serviceName,
          clientName,
        },
      });
      logger.info(`[Notification] Task assigned notification sent to user ${assignedToUserId}`);
    } catch (error) {
      logger.error(`[Notification] Failed to send task assigned notification:`, error);
    }
  }

  /**
   * Send notification for QC review needed
   */
  async notifyQcReviewNeeded(
    taskId: number,
    taskName: string,
    serviceName: string,
    clientName: string
  ): Promise<void> {
    try {
      // Get QC executives
      const qcUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'qc_executive'), eq(users.isActive, true)));

      for (const qcUser of qcUsers) {
        await notificationHub.send({
          userId: qcUser.id,
          type: WORKFLOW_NOTIFICATIONS.QC_REVIEW_NEEDED,
          channels: ['in_app'],
          priority: 'normal',
          subject: `QC Review Required: ${taskName}`,
          content: `Task "${taskName}" for ${clientName} (${serviceName}) is pending QC review. Please review the work and approve or reject.`,
          referenceType: 'task',
          referenceId: taskId,
          data: {
            taskId,
            taskName,
            serviceName,
            clientName,
          },
        });
      }
      logger.info(`[Notification] QC review needed notification sent to ${qcUsers.length} QC executives`);
    } catch (error) {
      logger.error(`[Notification] Failed to send QC review needed notification:`, error);
    }
  }

  /**
   * Send notification for QC rejected (back to ops with notes)
   */
  async notifyQcRejected(
    taskId: number,
    assignedToUserId: number,
    taskName: string,
    rejectionNotes: string,
    reworkCount: number
  ): Promise<void> {
    try {
      await notificationHub.send({
        userId: assignedToUserId,
        type: WORKFLOW_NOTIFICATIONS.QC_REJECTED,
        channels: ['email', 'in_app'],
        priority: 'high',
        subject: `Task Requires Rework: ${taskName}`,
        content: `Your task "${taskName}" was rejected by QC and requires rework (Attempt ${reworkCount + 1}). Reason: ${rejectionNotes}. Please review the feedback and resubmit.`,
        referenceType: 'task',
        referenceId: taskId,
        data: {
          taskId,
          taskName,
          rejectionNotes,
          reworkCount,
        },
      });
      logger.info(`[Notification] QC rejected notification sent to user ${assignedToUserId}`);
    } catch (error) {
      logger.error(`[Notification] Failed to send QC rejected notification:`, error);
    }
  }

  /**
   * Send notification for service completed
   */
  async notifyServiceCompleted(
    serviceRequestId: number,
    clientUserId: number,
    serviceName: string,
    requestId: string
  ): Promise<void> {
    try {
      await notificationHub.send({
        userId: clientUserId,
        type: WORKFLOW_NOTIFICATIONS.SERVICE_COMPLETED,
        channels: ['email', 'in_app'],
        priority: 'normal',
        subject: `Service Completed: ${serviceName}`,
        content: `Great news! Your service request ${requestId} for ${serviceName} has been completed. You can download your documents from the portal.`,
        referenceType: 'service_request',
        referenceId: serviceRequestId,
        data: {
          serviceName,
          requestId,
          serviceRequestId,
        },
      });
      logger.info(`[Notification] Service completed notification sent to user ${clientUserId}`);
    } catch (error) {
      logger.error(`[Notification] Failed to send service completed notification:`, error);
    }
  }

  /**
   * Send notification for document requested
   */
  async notifyDocumentRequested(
    clientUserId: number,
    documentList: string[],
    serviceName: string,
    requestId: string
  ): Promise<void> {
    try {
      const docListText = documentList.join(', ');
      await notificationHub.send({
        userId: clientUserId,
        type: WORKFLOW_NOTIFICATIONS.DOCUMENT_REQUESTED,
        channels: ['email'],
        priority: 'normal',
        subject: `Documents Required: ${serviceName}`,
        content: `We need the following documents for your ${serviceName} service (${requestId}): ${docListText}. Please upload them through your portal.`,
        data: {
          documentList,
          serviceName,
          requestId,
        },
      });
      logger.info(`[Notification] Document requested notification sent to user ${clientUserId}`);
    } catch (error) {
      logger.error(`[Notification] Failed to send document requested notification:`, error);
    }
  }
}

// Export singleton instance
export const taskInstantiationService = new TaskInstantiationService();
