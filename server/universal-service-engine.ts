import { eq, and, desc, asc, like, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  entities,
  service_catalog,
  workflow_templates,
  service_orders,
  tasks,
  documents,
  messages,
  agents,
  leads,
  commissions,
  notifications,
  audit_logs,
  sla_settings,
  sla_timers,
  user_preferences,
  system_settings,
  type User,
  type Entity,
  type ServiceOrder,
  type Task,
  type WorkflowTemplate,
  type InsertServiceOrder,
  type InsertTask,
  type InsertWorkflowTemplate,
  type InsertServiceCatalog
} from "@shared/universal-schema";

// Universal Service Provider Engine
// Supports any service business: legal, accounting, consulting, healthcare, etc.
export class UniversalServiceEngine {

  // Service Catalog Management
  static async createServiceType(serviceData: InsertServiceCatalog): Promise<any> {
    try {
      const [service] = await db.insert(service_catalog).values(serviceData).returning();
      
      // Create audit log
      await this.createAuditLog({
        actor_id: null,
        action: "service_type_created",
        target_type: "service_catalog",
        target_id: service.id.toString(),
        new_values: serviceData
      });

      return service;
    } catch (error) {
      throw new Error(`Failed to create service type: ${error}`);
    }
  }

  static async getAllServiceTypes(filters?: { category?: string; is_active?: boolean }) {
    try {
      let query = db.select().from(service_catalog);
      
      if (filters?.category) {
        query = query.where(eq(service_catalog.category, filters.category));
      }
      
      if (filters?.is_active !== undefined) {
        query = query.where(eq(service_catalog.is_active, filters.is_active));
      }

      return await query.orderBy(asc(service_catalog.category), asc(service_catalog.name));
    } catch (error) {
      throw new Error(`Failed to fetch service types: ${error}`);
    }
  }

  // No-Code Workflow Builder
  static async createWorkflowTemplate(workflowData: InsertWorkflowTemplate): Promise<WorkflowTemplate> {
    try {
      // Validate workflow steps structure
      if (!this.validateWorkflowSteps(workflowData.steps as any)) {
        throw new Error("Invalid workflow steps structure");
      }

      // Check for existing active template
      const [existingActive] = await db
        .select()
        .from(workflow_templates)
        .where(
          and(
            eq(workflow_templates.service_type, workflowData.service_type),
            eq(workflow_templates.is_active, true)
          )
        )
        .limit(1);

      // Increment version if active template exists
      if (existingActive) {
        workflowData.version = existingActive.version + 1;
        
        // Deactivate previous version
        await db
          .update(workflow_templates)
          .set({ is_active: false, updated_at: new Date() })
          .where(eq(workflow_templates.id, existingActive.id));
      }

      const [template] = await db.insert(workflow_templates).values(workflowData).returning();

      // Create audit log
      await this.createAuditLog({
        actor_id: workflowData.created_by,
        action: "workflow_template_created",
        target_type: "workflow_templates",
        target_id: template.id.toString(),
        new_values: workflowData
      });

      return template;
    } catch (error) {
      throw new Error(`Failed to create workflow template: ${error}`);
    }
  }

  static validateWorkflowSteps(steps: any[]): boolean {
    if (!Array.isArray(steps) || steps.length === 0) return false;

    for (const step of steps) {
      if (!step.key || !step.name || !step.type) return false;
      if (step.dependencies && !Array.isArray(step.dependencies)) return false;
    }

    // Check for circular dependencies
    return this.checkCircularDependencies(steps);
  }

  static checkCircularDependencies(steps: any[]): boolean {
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const stepMap = new Map(steps.map(s => [s.key, s]));

    const hasCycle = (stepKey: string): boolean => {
      if (inStack.has(stepKey)) return true;
      if (visited.has(stepKey)) return false;

      visited.add(stepKey);
      inStack.add(stepKey);

      const step = stepMap.get(stepKey);
      if (step?.dependencies) {
        for (const depKey of step.dependencies) {
          if (hasCycle(depKey)) return true;
        }
      }

      inStack.delete(stepKey);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.key) && hasCycle(step.key)) {
        return false;
      }
    }

    return true;
  }

  // Service Order Management
  static async createServiceOrder(orderData: InsertServiceOrder): Promise<ServiceOrder> {
    try {
      // Get workflow template
      const [template] = await db
        .select()
        .from(workflow_templates)
        .where(
          and(
            eq(workflow_templates.service_type, orderData.service_type),
            eq(workflow_templates.is_active, true)
          )
        )
        .limit(1);

      if (!template) {
        throw new Error(`No active workflow template found for service type: ${orderData.service_type}`);
      }

      // Create service order
      const [serviceOrder] = await db.insert(service_orders).values({
        ...orderData,
        workflow_version: template.version
      }).returning();

      // Generate initial tasks from workflow
      await this.generateTasksFromWorkflow(serviceOrder.id, template);

      // Initialize SLA timer
      await this.initializeSlaTimer(serviceOrder.id, orderData.service_type);

      // Create audit log
      await this.createAuditLog({
        actor_id: null,
        action: "service_order_created",
        target_type: "service_orders",
        target_id: serviceOrder.id.toString(),
        new_values: orderData
      });

      return serviceOrder;
    } catch (error) {
      throw new Error(`Failed to create service order: ${error}`);
    }
  }

  static async generateTasksFromWorkflow(serviceOrderId: number, template: WorkflowTemplate): Promise<void> {
    try {
      const steps = template.steps as any[];
      const tasksToCreate = [];

      // First pass: create all tasks
      for (const step of steps) {
        const dueDate = step.sla_days ? 
          new Date(Date.now() + step.sla_days * 24 * 60 * 60 * 1000) : 
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

        tasksToCreate.push({
          service_order_id: serviceOrderId,
          step_key: step.key,
          name: step.name,
          description: step.description || "",
          type: step.type || "ops_task",
          status: step.dependencies && step.dependencies.length > 0 ? "pending" : "pending",
          due_at: dueDate,
          checklist: step.checklist || [],
          dependencies: step.dependencies || [],
          priority: step.priority || "medium",
          estimated_hours: step.estimated_hours || 1,
          qa_required: step.qa_required || false
        });
      }

      // Insert all tasks
      await db.insert(tasks).values(tasksToCreate);

      // Update service order progress
      await this.updateServiceOrderProgress(serviceOrderId);

    } catch (error) {
      throw new Error(`Failed to generate tasks from workflow: ${error}`);
    }
  }

  static async updateServiceOrderProgress(serviceOrderId: number): Promise<void> {
    try {
      // Get all tasks for this service order
      const allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.service_order_id, serviceOrderId));

      const completedTasks = allTasks.filter(task => task.status === "completed").length;
      const progressPercentage = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;

      // Update service order
      await db
        .update(service_orders)
        .set({ 
          progress_percentage: progressPercentage,
          updated_at: new Date(),
          ...(progressPercentage === 100 ? { completed_at: new Date(), status: "completed" } : {})
        })
        .where(eq(service_orders.id, serviceOrderId));

    } catch (error) {
      console.error(`Failed to update service order progress: ${error}`);
    }
  }

  // Task Management
  static async updateTaskStatus(taskId: number, status: string, userId: number, notes?: string): Promise<void> {
    try {
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (!task) {
        throw new Error("Task not found");
      }

      const updateData: any = {
        status,
        updated_at: new Date()
      };

      if (status === "completed") {
        updateData.completed_at = new Date();
      }

      // Update task
      await db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, taskId));

      // Check dependencies and unlock next tasks
      if (status === "completed") {
        await this.unlockDependentTasks(task.service_order_id, task.step_key);
        await this.updateServiceOrderProgress(task.service_order_id);
      }

      // Create audit log
      await this.createAuditLog({
        actor_id: userId,
        action: "task_status_updated",
        target_type: "tasks",
        target_id: taskId.toString(),
        old_values: { status: task.status },
        new_values: { status, notes }
      });

    } catch (error) {
      throw new Error(`Failed to update task status: ${error}`);
    }
  }

  static async unlockDependentTasks(serviceOrderId: number, completedStepKey: string): Promise<void> {
    try {
      // Get all pending tasks that depend on this completed step
      const dependentTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.service_order_id, serviceOrderId),
            eq(tasks.status, "pending")
          )
        );

      for (const task of dependentTasks) {
        const dependencies = task.dependencies as string[] || [];
        
        if (dependencies.includes(completedStepKey)) {
          // Check if all dependencies are now complete
          const allDependenciesComplete = await this.checkAllDependenciesComplete(
            serviceOrderId, 
            dependencies
          );

          if (allDependenciesComplete) {
            await db
              .update(tasks)
              .set({ status: "assigned", updated_at: new Date() })
              .where(eq(tasks.id, task.id));
          }
        }
      }
    } catch (error) {
      console.error(`Failed to unlock dependent tasks: ${error}`);
    }
  }

  static async checkAllDependenciesComplete(serviceOrderId: number, dependencies: string[]): Promise<boolean> {
    if (dependencies.length === 0) return true;

    const completedDeps = await db
      .select({ step_key: tasks.step_key })
      .from(tasks)
      .where(
        and(
          eq(tasks.service_order_id, serviceOrderId),
          eq(tasks.status, "completed"),
          inArray(tasks.step_key, dependencies)
        )
      );

    return completedDeps.length === dependencies.length;
  }

  // SLA Management
  static async initializeSlaTimer(serviceOrderId: number, serviceType: string): Promise<void> {
    try {
      // Get SLA settings for this service type
      let [slaSettings] = await db
        .select()
        .from(sla_settings)
        .where(eq(sla_settings.service_type, serviceType))
        .limit(1);

      // Create default SLA if none exists
      if (!slaSettings) {
        [slaSettings] = await db.insert(sla_settings).values({
          service_type: serviceType,
          baseline_hours: 48, // Default 48 hours
          warning_threshold_hours: 24,
          critical_threshold_hours: 4,
          escalation_rules: [],
          pause_conditions: ["waiting_client", "waiting_government"]
        }).returning();
      }

      // Create SLA timer
      await db.insert(sla_timers).values({
        service_order_id: serviceOrderId,
        baseline_hours: slaSettings.baseline_hours,
        started_at: new Date(),
        current_status: "running"
      });

    } catch (error) {
      console.error(`Failed to initialize SLA timer: ${error}`);
    }
  }

  // Document Management
  static async approveDocument(documentId: number, approvedBy: number, notes?: string): Promise<void> {
    try {
      await db
        .update(documents)
        .set({
          status: "approved",
          approved_by: approvedBy,
          approved_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(documents.id, documentId));

      // Create audit log
      await this.createAuditLog({
        actor_id: approvedBy,
        action: "document_approved",
        target_type: "documents",
        target_id: documentId.toString(),
        new_values: { status: "approved", notes }
      });

      // Send notification to document uploader
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (document) {
        await this.createNotification({
          user_id: document.uploader_id,
          event_type: "document_approved",
          channel: "in_app",
          title: "Document Approved",
          message: `Your document "${document.filename}" has been approved.`,
          payload: { document_id: documentId }
        });
      }

    } catch (error) {
      throw new Error(`Failed to approve document: ${error}`);
    }
  }

  static async rejectDocument(documentId: number, rejectedBy: number, reason: string): Promise<void> {
    try {
      await db
        .update(documents)
        .set({
          status: "rejected",
          rejection_reason: reason,
          updated_at: new Date()
        })
        .where(eq(documents.id, documentId));

      // Create audit log
      await this.createAuditLog({
        actor_id: rejectedBy,
        action: "document_rejected",
        target_type: "documents",
        target_id: documentId.toString(),
        new_values: { status: "rejected", rejection_reason: reason }
      });

      // Send notification to document uploader
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (document) {
        await this.createNotification({
          user_id: document.uploader_id,
          event_type: "document_rejected",
          channel: "in_app",
          title: "Document Rejected",
          message: `Your document "${document.filename}" was rejected. Reason: ${reason}`,
          payload: { document_id: documentId, reason }
        });
      }

    } catch (error) {
      throw new Error(`Failed to reject document: ${error}`);
    }
  }

  // Global Workflow Updates
  static async applyGlobalWorkflowChanges(
    serviceType: string, 
    changes: any[], 
    applyTo: "all" | "eligible_inflight",
    userId: number
  ): Promise<{ affectedOrders: number; previewChanges: any[] }> {
    try {
      // Get current active template
      const [currentTemplate] = await db
        .select()
        .from(workflow_templates)
        .where(
          and(
            eq(workflow_templates.service_type, serviceType),
            eq(workflow_templates.is_active, true)
          )
        )
        .limit(1);

      if (!currentTemplate) {
        throw new Error(`No active workflow template found for service type: ${serviceType}`);
      }

      // Create new version with changes
      const updatedSteps = this.applyChangesToSteps(currentTemplate.steps as any[], changes);
      
      // Validate updated workflow
      if (!this.validateWorkflowSteps(updatedSteps)) {
        throw new Error("Updated workflow contains invalid steps or circular dependencies");
      }

      // Create new template version
      const newTemplate = await this.createWorkflowTemplate({
        service_type: serviceType,
        version: currentTemplate.version + 1,
        name: currentTemplate.name,
        description: currentTemplate.description,
        steps: updatedSteps,
        is_active: true,
        created_by: userId
      });

      let affectedOrders = 0;

      if (applyTo === "all" || applyTo === "eligible_inflight") {
        // Get all eligible in-flight orders
        const eligibleOrders = await db
          .select()
          .from(service_orders)
          .where(
            and(
              eq(service_orders.service_type, serviceType),
              inArray(service_orders.status, ["created", "in_progress"])
            )
          );

        // Apply changes to each eligible order
        for (const order of eligibleOrders) {
          const updated = await this.updateInFlightOrder(order.id, changes);
          if (updated) affectedOrders++;
        }
      }

      // Create audit log
      await this.createAuditLog({
        actor_id: userId,
        action: "global_workflow_update",
        target_type: "workflow_templates",
        target_id: newTemplate.id.toString(),
        new_values: {
          changes,
          applyTo,
          affectedOrders,
          newVersion: newTemplate.version
        }
      });

      return {
        affectedOrders,
        previewChanges: changes
      };

    } catch (error) {
      throw new Error(`Failed to apply global workflow changes: ${error}`);
    }
  }

  static applyChangesToSteps(originalSteps: any[], changes: any[]): any[] {
    const updatedSteps = [...originalSteps];

    for (const change of changes) {
      const stepIndex = updatedSteps.findIndex(s => s.key === change.stepKey);
      if (stepIndex >= 0) {
        updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...change.updates };
      }
    }

    return updatedSteps;
  }

  static async updateInFlightOrder(orderId: number, changes: any[]): Promise<boolean> {
    try {
      // Get completed tasks for this order
      const completedTasks = await db
        .select({ step_key: tasks.step_key })
        .from(tasks)
        .where(
          and(
            eq(tasks.service_order_id, orderId),
            eq(tasks.status, "completed")
          )
        );

      const completedStepKeys = completedTasks.map(t => t.step_key);
      let updated = false;

      // Apply changes only to non-completed steps
      for (const change of changes) {
        if (!completedStepKeys.includes(change.stepKey)) {
          await db
            .update(tasks)
            .set({
              ...change.updates,
              updated_at: new Date()
            })
            .where(
              and(
                eq(tasks.service_order_id, orderId),
                eq(tasks.step_key, change.stepKey)
              )
            );
          updated = true;
        }
      }

      return updated;
    } catch (error) {
      console.error(`Failed to update in-flight order ${orderId}:`, error);
      return false;
    }
  }

  // Search & Analytics
  static async globalSearch(query: string, scope: string[] = [], userId?: number): Promise<any> {
    try {
      const results: any = {
        service_orders: [],
        tasks: [],
        documents: [],
        entities: []
      };

      const searchTerm = `%${query}%`;

      // Search service orders
      if (scope.length === 0 || scope.includes("service_orders")) {
        results.service_orders = await db
          .select({
            id: service_orders.id,
            service_type: service_orders.service_type,
            status: service_orders.status,
            created_at: service_orders.created_at,
            entity_name: entities.name
          })
          .from(service_orders)
          .innerJoin(entities, eq(service_orders.entity_id, entities.id))
          .where(
            or(
              like(service_orders.service_type, searchTerm),
              like(entities.name, searchTerm)
            )
          )
          .limit(20);
      }

      // Search tasks
      if (scope.length === 0 || scope.includes("tasks")) {
        results.tasks = await db
          .select({
            id: tasks.id,
            name: tasks.name,
            status: tasks.status,
            service_order_id: tasks.service_order_id,
            created_at: tasks.created_at
          })
          .from(tasks)
          .where(
            or(
              like(tasks.name, searchTerm),
              like(tasks.description, searchTerm)
            )
          )
          .limit(20);
      }

      // Search documents
      if (scope.length === 0 || scope.includes("documents")) {
        results.documents = await db
          .select({
            id: documents.id,
            filename: documents.filename,
            doctype: documents.doctype,
            status: documents.status,
            service_order_id: documents.service_order_id,
            created_at: documents.created_at
          })
          .from(documents)
          .where(
            or(
              like(documents.filename, searchTerm),
              like(documents.doctype, searchTerm)
            )
          )
          .limit(20);
      }

      // Search entities
      if (scope.length === 0 || scope.includes("entities")) {
        results.entities = await db
          .select()
          .from(entities)
          .where(like(entities.name, searchTerm))
          .limit(20);
      }

      return results;
    } catch (error) {
      throw new Error(`Search failed: ${error}`);
    }
  }

  // Utility Functions
  static async createNotification(notificationData: any): Promise<void> {
    try {
      await db.insert(notifications).values(notificationData);
    } catch (error) {
      console.error("Failed to create notification:", error);
    }
  }

  static async createAuditLog(logData: any): Promise<void> {
    try {
      await db.insert(audit_logs).values({
        ...logData,
        created_at: new Date()
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
    }
  }

  // Analytics & Reports
  static async getOperationalMetrics(dateRange?: { from: Date; to: Date }) {
    try {
      const fromDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = dateRange?.to || new Date();

      // Service orders metrics
      const serviceOrderMetrics = await db
        .select({
          status: service_orders.status,
          count: sql<number>`count(*)::int`
        })
        .from(service_orders)
        .where(
          and(
            sql`${service_orders.created_at} >= ${fromDate}`,
            sql`${service_orders.created_at} <= ${toDate}`
          )
        )
        .groupBy(service_orders.status);

      // Task completion metrics
      const taskMetrics = await db
        .select({
          status: tasks.status,
          count: sql<number>`count(*)::int`
        })
        .from(tasks)
        .where(
          and(
            sql`${tasks.created_at} >= ${fromDate}`,
            sql`${tasks.created_at} <= ${toDate}`
          )
        )
        .groupBy(tasks.status);

      return {
        serviceOrders: serviceOrderMetrics,
        tasks: taskMetrics,
        generatedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Failed to get operational metrics: ${error}`);
    }
  }
}

// Additional helper function for SQL operations
function or(...conditions: any[]) {
  return sql`${conditions.join(' OR ')}`;
}