import { eq, and, inArray } from "drizzle-orm";
import { db } from "./db";
import { 
  workflowTemplates, 
  operationsTasks, 
  serviceRequests, 
  auditLogs 
} from "@shared/schema";

// Workflow Step Definition
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  assigneeRole: string;
  estimatedMinutes: number;
  dependencies: string[]; // Array of step IDs that must complete first
  isClientTask: boolean;
  requiredDocuments: string[];
  checklist: string[];
  autoAdvanceConditions?: string[];
}

// Workflow Template with Dependencies
export interface WorkflowTemplate {
  id: number;
  serviceCode: string;
  version: number;
  steps: WorkflowStep[];
  isActive: boolean;
}

// Dependency Graph Node
export interface DependencyNode {
  stepId: string;
  step: WorkflowStep;
  dependencies: string[];
  dependents: string[]; // Steps that depend on this one
  level: number; // Execution level (0 = no dependencies, 1 = depends on level 0, etc.)
}

// Dependency Validation Results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  executionLevels: Record<string, number>;
}

// Workflow Dependency Engine
export class WorkflowDependencyEngine {
  
  // Validate workflow dependencies using Directed Acyclic Graph (DAG) algorithm
  static validateWorkflowDependencies(steps: WorkflowStep[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      executionLevels: {}
    };

    // Create step ID lookup
    const stepMap = new Map<string, WorkflowStep>();
    steps.forEach(step => stepMap.set(step.id, step));

    // Validate all referenced dependencies exist
    for (const step of steps) {
      for (const depId of step.dependencies) {
        if (!stepMap.has(depId)) {
          result.errors.push(`Step "${step.name}" depends on non-existent step ID: ${depId}`);
          result.isValid = false;
        }
      }
    }

    if (!result.isValid) return result;

    // Check for cycles using DFS
    const cycleCheck = this.detectCycles(steps);
    if (cycleCheck.hasCycle) {
      result.errors.push(`Circular dependency detected: ${cycleCheck.cycle.join(' → ')}`);
      result.isValid = false;
      return result;
    }

    // Calculate execution levels using topological sort
    const levels = this.calculateExecutionLevels(steps);
    result.executionLevels = levels;

    // Generate warnings for potential issues
    this.generateWarnings(steps, result);

    return result;
  }

  // Detect circular dependencies using Depth-First Search
  private static detectCycles(steps: WorkflowStep[]): { hasCycle: boolean; cycle: string[] } {
    const stepMap = new Map<string, WorkflowStep>();
    steps.forEach(step => stepMap.set(step.id, step));

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        // Found cycle - return the cycle path
        const cycleStart = path.indexOf(stepId);
        return true;
      }

      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);
      path.push(stepId);

      const step = stepMap.get(stepId);
      if (step) {
        for (const depId of step.dependencies) {
          if (dfs(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      path.pop();
      return false;
    };

    // Check each unvisited node
    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (dfs(step.id)) {
          return { hasCycle: true, cycle: [...path] };
        }
      }
    }

    return { hasCycle: false, cycle: [] };
  }

  // Calculate execution levels using topological sorting
  private static calculateExecutionLevels(steps: WorkflowStep[]): Record<string, number> {
    const levels: Record<string, number> = {};
    const stepMap = new Map<string, WorkflowStep>();
    steps.forEach(step => stepMap.set(step.id, step));

    // Calculate levels iteratively
    const calculateLevel = (stepId: string, visited = new Set<string>()): number => {
      if (visited.has(stepId)) return 0; // Avoid infinite recursion
      if (levels[stepId] !== undefined) return levels[stepId];

      visited.add(stepId);
      const step = stepMap.get(stepId);
      
      if (!step || step.dependencies.length === 0) {
        levels[stepId] = 0;
        return 0;
      }

      let maxDepLevel = -1;
      for (const depId of step.dependencies) {
        const depLevel = calculateLevel(depId, visited);
        maxDepLevel = Math.max(maxDepLevel, depLevel);
      }

      levels[stepId] = maxDepLevel + 1;
      return levels[stepId];
    };

    // Calculate level for each step
    steps.forEach(step => calculateLevel(step.id));

    return levels;
  }

  // Generate warnings for potential workflow issues
  private static generateWarnings(steps: WorkflowStep[], result: ValidationResult): void {
    // Check for steps with no dependencies and no dependents
    const dependents = new Map<string, string[]>();
    steps.forEach(step => {
      step.dependencies.forEach(depId => {
        if (!dependents.has(depId)) dependents.set(depId, []);
        dependents.get(depId)!.push(step.id);
      });
    });

    steps.forEach(step => {
      if (step.dependencies.length === 0 && (!dependents.has(step.id) || dependents.get(step.id)!.length === 0)) {
        result.warnings.push(`Step "${step.name}" has no dependencies and no dependents - may be orphaned`);
      }
    });

    // Check for very deep dependency chains
    const maxLevel = Math.max(...Object.values(result.executionLevels));
    if (maxLevel > 10) {
      result.warnings.push(`Workflow has ${maxLevel + 1} dependency levels - consider simplifying`);
    }

    // Check for client tasks that depend on other client tasks
    const clientSteps = steps.filter(s => s.isClientTask);
    clientSteps.forEach(step => {
      const hasClientDependency = step.dependencies.some(depId => {
        const depStep = steps.find(s => s.id === depId);
        return depStep?.isClientTask;
      });
      if (hasClientDependency) {
        result.warnings.push(`Client task "${step.name}" depends on another client task - may cause delays`);
      }
    });
  }

  // Get executable steps at current workflow state
  static getExecutableSteps(
    workflowSteps: WorkflowStep[], 
    completedStepIds: string[]
  ): WorkflowStep[] {
    const completed = new Set(completedStepIds);
    
    return workflowSteps.filter(step => {
      // All dependencies must be completed
      const dependenciesComplete = step.dependencies.every(depId => completed.has(depId));
      // Step itself must not be completed
      const notCompleted = !completed.has(step.id);
      
      return dependenciesComplete && notCompleted;
    });
  }

  // Update workflow with global changes
  static async updateWorkflowGlobally(
    serviceCode: string,
    changes: Partial<WorkflowStep>[],
    updatedBy: number
  ): Promise<{ affectedServices: number; previewChanges: any[] }> {
    
    // Get current workflow template
    const [currentTemplate] = await db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.serviceCode, serviceCode))
      .orderBy(workflowTemplates.version)
      .limit(1);

    if (!currentTemplate) {
      throw new Error(`No workflow template found for service: ${serviceCode}`);
    }

    const currentSteps = currentTemplate.steps as WorkflowStep[];
    
    // Apply changes to create new version
    const updatedSteps = [...currentSteps];
    const previewChanges = [];

    for (const change of changes) {
      const stepIndex = updatedSteps.findIndex(s => s.id === change.id);
      if (stepIndex >= 0) {
        const originalStep = { ...updatedSteps[stepIndex] };
        updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...change };
        
        previewChanges.push({
          stepId: change.id,
          stepName: originalStep.name,
          changes: this.getStepChanges(originalStep, updatedSteps[stepIndex])
        });
      }
    }

    // Validate updated workflow
    const validation = this.validateWorkflowDependencies(updatedSteps);
    if (!validation.isValid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Create new workflow version
    const newVersion = currentTemplate.version + 1;
    await db.insert(workflowTemplates).values({
      serviceCode,
      version: newVersion,
      steps: updatedSteps,
      isActive: true,
      createdBy: updatedBy,
      createdAt: new Date()
    });

    // Deactivate previous version
    await db
      .update(workflowTemplates)
      .set({ isActive: false })
      .where(eq(workflowTemplates.id, currentTemplate.id));

    // Update in-flight services at eligible steps
    const affectedServices = await this.updateInFlightServices(
      serviceCode,
      changes,
      updatedBy
    );

    // Log global workflow update
    await db.insert(auditLogs).values({
      userId: updatedBy,
      action: "workflow_global_update",
      entityType: "workflow_template",
      entityId: serviceCode,
      details: {
        newVersion,
        changesApplied: previewChanges.length,
        affectedServices,
        changes: previewChanges
      }
    });

    return { affectedServices, previewChanges };
  }

  // Update in-flight services with workflow changes
  private static async updateInFlightServices(
    serviceCode: string,
    changes: Partial<WorkflowStep>[],
    updatedBy: number
  ): Promise<number> {
    // Get all active services for this service type
    const activeServices = await db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.serviceCode, serviceCode),
          inArray(serviceRequests.status, ["in_progress", "pending_review"])
        )
      );

    let affectedCount = 0;

    for (const service of activeServices) {
      // Get current tasks for this service
      const currentTasks = await db
        .select()
        .from(operationsTasks)
        .where(eq(operationsTasks.serviceRequestId, service.id));

      const completedStepIds = currentTasks
        .filter(t => t.status === "completed")
        .map(t => t.stepId || "");

      // Check which changes can be applied to this service
      let serviceUpdated = false;
      for (const change of changes) {
        const stepId = change.id;
        
        // Only update steps that haven't been completed yet
        if (!completedStepIds.includes(stepId!)) {
          // Update task with new step definition
          await db
            .update(operationsTasks)
            .set({
              instructions: change.description || undefined,
              checklist: change.checklist || undefined,
              estimatedMinutes: change.estimatedMinutes || undefined,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(operationsTasks.serviceRequestId, service.id),
                eq(operationsTasks.stepId, stepId!)
              )
            );

          serviceUpdated = true;
        }
      }

      if (serviceUpdated) {
        affectedCount++;
        
        // Log service update
        await db.insert(auditLogs).values({
          userId: updatedBy,
          action: "workflow_service_updated",
          entityType: "service_request",
          entityId: service.id.toString(),
          details: {
            serviceCode,
            updatedSteps: changes.map(c => c.id),
            updateReason: "global_workflow_change"
          }
        });
      }
    }

    return affectedCount;
  }

  // Compare two workflow steps to identify changes
  private static getStepChanges(original: WorkflowStep, updated: WorkflowStep): Record<string, any> {
    const changes: Record<string, any> = {};
    
    if (original.name !== updated.name) {
      changes.name = { from: original.name, to: updated.name };
    }
    if (original.description !== updated.description) {
      changes.description = { from: original.description, to: updated.description };
    }
    if (original.estimatedMinutes !== updated.estimatedMinutes) {
      changes.estimatedMinutes = { from: original.estimatedMinutes, to: updated.estimatedMinutes };
    }
    if (JSON.stringify(original.dependencies) !== JSON.stringify(updated.dependencies)) {
      changes.dependencies = { from: original.dependencies, to: updated.dependencies };
    }
    if (JSON.stringify(original.checklist) !== JSON.stringify(updated.checklist)) {
      changes.checklist = { from: original.checklist, to: updated.checklist };
    }

    return changes;
  }

  // Get dependency graph visualization data
  static getDependencyGraph(steps: WorkflowStep[]): DependencyNode[] {
    const levels = this.calculateExecutionLevels(steps);
    const dependents = new Map<string, string[]>();
    
    // Build dependents map
    steps.forEach(step => {
      step.dependencies.forEach(depId => {
        if (!dependents.has(depId)) dependents.set(depId, []);
        dependents.get(depId)!.push(step.id);
      });
    });

    return steps.map(step => ({
      stepId: step.id,
      step,
      dependencies: step.dependencies,
      dependents: dependents.get(step.id) || [],
      level: levels[step.id] || 0
    }));
  }

  // Create workflow rollback point
  static async createRollbackPoint(
    serviceCode: string,
    version: number,
    createdBy: number
  ): Promise<void> {
    const [template] = await db
      .select()
      .from(workflowTemplates)
      .where(
        and(
          eq(workflowTemplates.serviceCode, serviceCode),
          eq(workflowTemplates.version, version)
        )
      )
      .limit(1);

    if (!template) {
      throw new Error(`Workflow template not found: ${serviceCode} v${version}`);
    }

    // Create rollback snapshot
    await db.insert(auditLogs).values({
      userId: createdBy,
      action: "workflow_rollback_point_created",
      entityType: "workflow_template",
      entityId: `${serviceCode}_v${version}`,
      details: {
        serviceCode,
        version,
        steps: template.steps,
        snapshotTime: new Date().toISOString()
      }
    });
  }

  // Rollback workflow to previous version
  static async rollbackWorkflow(
    serviceCode: string,
    targetVersion: number,
    rolledBackBy: number
  ): Promise<void> {
    // Get target version template
    const [targetTemplate] = await db
      .select()
      .from(workflowTemplates)
      .where(
        and(
          eq(workflowTemplates.serviceCode, serviceCode),
          eq(workflowTemplates.version, targetVersion)
        )
      )
      .limit(1);

    if (!targetTemplate) {
      throw new Error(`Target rollback version not found: ${serviceCode} v${targetVersion}`);
    }

    // Deactivate current version
    await db
      .update(workflowTemplates)
      .set({ isActive: false })
      .where(
        and(
          eq(workflowTemplates.serviceCode, serviceCode),
          eq(workflowTemplates.isActive, true)
        )
      );

    // Activate target version
    await db
      .update(workflowTemplates)
      .set({ isActive: true })
      .where(eq(workflowTemplates.id, targetTemplate.id));

    // Log rollback action
    await db.insert(auditLogs).values({
      userId: rolledBackBy,
      action: "workflow_rollback_executed",
      entityType: "workflow_template",
      entityId: serviceCode,
      details: {
        targetVersion,
        rollbackTime: new Date().toISOString(),
        reason: "admin_rollback"
      }
    });
  }
}

// Workflow execution engine
export class WorkflowExecutionEngine {
  
  // Start workflow execution for a service request
  static async startWorkflowExecution(
    serviceRequestId: number,
    serviceCode: string
  ): Promise<void> {
    // Get active workflow template
    const [template] = await db
      .select()
      .from(workflowTemplates)
      .where(
        and(
          eq(workflowTemplates.serviceCode, serviceCode),
          eq(workflowTemplates.isActive, true)
        )
      )
      .limit(1);

    if (!template) {
      throw new Error(`No active workflow template found for: ${serviceCode}`);
    }

    const steps = template.steps as WorkflowStep[];
    
    // Get initial executable steps (those with no dependencies)
    const executableSteps = WorkflowDependencyEngine.getExecutableSteps(steps, []);

    // Create initial tasks
    for (const step of executableSteps) {
      await db.insert(operationsTasks).values({
        serviceRequestId,
        stepId: step.id,
        title: step.name,
        instructions: step.description,
        assigneeRole: step.assigneeRole,
        status: "pending",
        priority: "medium",
        estimatedMinutes: step.estimatedMinutes,
        checklist: step.checklist,
        isClientTask: step.isClientTask,
        requiredDocuments: step.requiredDocuments,
        dueDate: new Date(Date.now() + step.estimatedMinutes * 60 * 1000)
      });
    }

    // Log workflow start
    await db.insert(auditLogs).values({
      userId: 0, // System user
      action: "workflow_execution_started",
      entityType: "service_request",
      entityId: serviceRequestId.toString(),
      details: {
        serviceCode,
        workflowVersion: template.version,
        initialStepsCreated: executableSteps.length,
        totalSteps: steps.length
      }
    });
  }

  // Advance workflow when a step is completed
  static async advanceWorkflow(
    serviceRequestId: number,
    completedStepId: string
  ): Promise<void> {
    // Get service details
    const [service] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!service) return;

    // Get workflow template
    const [template] = await db
      .select()
      .from(workflowTemplates)
      .where(
        and(
          eq(workflowTemplates.serviceCode, service.serviceCode),
          eq(workflowTemplates.isActive, true)
        )
      )
      .limit(1);

    if (!template) return;

    const steps = template.steps as WorkflowStep[];
    
    // Get all completed steps for this service
    const completedTasks = await db
      .select()
      .from(operationsTasks)
      .where(
        and(
          eq(operationsTasks.serviceRequestId, serviceRequestId),
          eq(operationsTasks.status, "completed")
        )
      );

    const completedStepIds = completedTasks.map(t => t.stepId || "");
    
    // Get newly executable steps
    const executableSteps = WorkflowDependencyEngine.getExecutableSteps(steps, completedStepIds);
    
    // Create tasks for newly executable steps
    for (const step of executableSteps) {
      // Check if task already exists
      const [existingTask] = await db
        .select()
        .from(operationsTasks)
        .where(
          and(
            eq(operationsTasks.serviceRequestId, serviceRequestId),
            eq(operationsTasks.stepId, step.id)
          )
        )
        .limit(1);

      if (!existingTask) {
        await db.insert(operationsTasks).values({
          serviceRequestId,
          stepId: step.id,
          title: step.name,
          instructions: step.description,
          assigneeRole: step.assigneeRole,
          status: "pending",
          priority: "medium",
          estimatedMinutes: step.estimatedMinutes,
          checklist: step.checklist,
          isClientTask: step.isClientTask,
          requiredDocuments: step.requiredDocuments,
          dueDate: new Date(Date.now() + step.estimatedMinutes * 60 * 1000)
        });
      }
    }

    // Check if workflow is complete
    if (completedStepIds.length === steps.length) {
      await db
        .update(serviceRequests)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(serviceRequests.id, serviceRequestId));

      // Log workflow completion
      await db.insert(auditLogs).values({
        userId: 0,
        action: "workflow_execution_completed",
        entityType: "service_request",
        entityId: serviceRequestId.toString(),
        details: {
          completedSteps: completedStepIds.length,
          totalSteps: steps.length,
          completionTime: new Date().toISOString()
        }
      });
    }

    // Log workflow advancement
    await db.insert(auditLogs).values({
      userId: 0,
      action: "workflow_advanced",
      entityType: "service_request", 
      entityId: serviceRequestId.toString(),
      details: {
        completedStep: completedStepId,
        newExecutableSteps: executableSteps.length,
        totalCompleted: completedStepIds.length,
        totalSteps: steps.length
      }
    });
  }
}