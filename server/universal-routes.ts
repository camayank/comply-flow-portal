import type { Express } from "express";
import { createServer, type Server } from "http";
import { UniversalServiceEngine } from "./universal-service-engine";
import { registerTeamManagementRoutes } from './team-management-routes';
import { requireAuth } from './auth-middleware';
import { db } from "./db";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from './rbac-middleware';
import { eq, and, desc, asc, like, inArray, isNull, sql, or, gte } from "drizzle-orm";
import { payments, operationsTeam } from "@shared/schema";
import { pipelineEvents } from "@shared/pipeline-schema";
import { createPipelineEvent, PIPELINE_EVENTS } from "./services/pipeline/pipeline-events";
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
  system_settings
} from "@shared/universal-schema";

export async function registerUniversalRoutes(app: Express): Promise<Server> {
  const requireAdminAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN)] as const;
  const requireOpsAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE)] as const;

  // ===== ADMIN ROUTES =====
  
  // Service Catalog Management
  app.get("/api/admin/service-types", ...requireAdminAccess, async (req, res) => {
    try {
      const serviceTypes = await UniversalServiceEngine.getAllServiceTypes();
      res.json(serviceTypes);
    } catch (error) {
      console.error("Error fetching service types:", error);
      res.status(500).json({ error: "Failed to fetch service types" });
    }
  });

  app.post("/api/admin/service-types", ...requireAdminAccess, async (req, res) => {
    try {
      const serviceType = await UniversalServiceEngine.createServiceType(req.body);
      res.json(serviceType);
    } catch (error) {
      console.error("Error creating service type:", error);
      res.status(500).json({ error: "Failed to create service type" });
    }
  });

  // Workflow Template Management
  app.get("/api/admin/workflow-templates", ...requireAdminAccess, async (req, res) => {
    try {
      const templates = await db.select().from(workflow_templates)
        .orderBy(desc(workflow_templates.created_at));
      res.json(templates);
    } catch (error) {
      console.error("Error fetching workflow templates:", error);
      res.status(500).json({ error: "Failed to fetch workflow templates" });
    }
  });

  app.post("/api/admin/workflow-templates", ...requireAdminAccess, async (req, res) => {
    try {
      const template = await UniversalServiceEngine.createWorkflowTemplate(req.body);
      res.json(template);
    } catch (error) {
      console.error("Error creating workflow template:", error);
      res.status(500).json({ error: "Failed to create workflow template" });
    }
  });

  // Global Workflow Updates
  app.post("/api/admin/apply-global-updates", ...requireAdminAccess, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { service_type, changes, apply_to } = req.body;
      const result = await UniversalServiceEngine.applyGlobalWorkflowChanges(
        service_type,
        changes,
        apply_to,
        req.user.id // Using authenticated user ID
      );
      res.json(result);
    } catch (error) {
      console.error("Error applying global updates:", error);
      res.status(500).json({ error: "Failed to apply global updates" });
    }
  });

  // Admin Dashboard Metrics
  app.get("/api/admin/dashboard-metrics", ...requireAdminAccess, async (req, res) => {
    try {
      const [
        activeOrdersResult,
        slaStatsResult,
        monthlyRevenueResult
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` })
          .from(service_orders)
          .where(inArray(service_orders.status, ["created", "in_progress"])),
        // Calculate real SLA compliance: timers that haven't breached / total timers
        db.select({
          total: sql<number>`count(*)::int`,
          compliant: sql<number>`count(*) filter (where breached = false)::int`
        })
          .from(sla_timers)
          .where(eq(sla_timers.current_status, "completed")),
        db.select({
          total: sql<number>`sum(CAST(base_price AS INTEGER))::int`
        })
          .from(service_orders)
          .innerJoin(service_catalog, eq(service_orders.service_type, service_catalog.service_type))
          .where(sql`${service_orders.created_at} >= date_trunc('month', now())`)
      ]);

      // Calculate real SLA compliance percentage
      const totalSLA = slaStatsResult[0]?.total || 0;
      const compliantSLA = slaStatsResult[0]?.compliant || 0;
      const slaCompliance = totalSLA > 0 ? Math.round((compliantSLA / totalSLA) * 100) : 100;

      const metrics = {
        activeOrders: activeOrdersResult[0]?.count || 0,
        slaCompliance, // Calculated from actual SLA data
        monthlyRevenue: monthlyRevenueResult[0]?.total || 0
      };

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching admin metrics:", error);
      res.status(500).json({ error: "Failed to fetch admin metrics" });
    }
  });

  app.get("/api/admin/operational-metrics", ...requireOpsAccess, async (req, res) => {
    try {
      const metrics = await UniversalServiceEngine.getOperationalMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching operational metrics:", error);
      res.status(500).json({ error: "Failed to fetch operational metrics" });
    }
  });

  // ===== CLIENT ROUTES =====

  // Client Entities
  app.get("/api/client/entities", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Filter entities by authenticated user
      const userEntities = await db.select()
        .from(entities)
        .where(and(
          eq(entities.active, true),
          eq(entities.user_id, req.user.id) // Filter by authenticated user
        ))
        .orderBy(asc(entities.name));

      res.json(userEntities);
    } catch (error) {
      console.error("Error fetching entities:", error);
      res.status(500).json({ error: "Failed to fetch entities" });
    }
  });

  // Client Service Orders
  app.get("/api/client/service-orders", requireAuth, async (req, res) => {
    try {
      const { entity_id } = req.query;
      
      let query = db.select({
        id: service_orders.id,
        entity_id: service_orders.entity_id,
        service_type: service_orders.service_type,
        status: service_orders.status,
        progress_percentage: service_orders.progress_percentage,
        due_at: service_orders.due_at,
        created_at: service_orders.created_at,
        entity: {
          id: entities.id,
          name: entities.name,
          type: entities.type
        }
      })
        .from(service_orders)
        .innerJoin(entities, eq(service_orders.entity_id, entities.id));

      if (entity_id) {
        query = query.where(eq(service_orders.entity_id, parseInt(entity_id as string)));
      }

      const orders = await query.orderBy(desc(service_orders.created_at));

      // Get related data for each order
      const ordersWithDetails = await Promise.all(orders.map(async (order) => {
        const [orderTasks, orderDocs, orderMessages] = await Promise.all([
          db.select().from(tasks).where(eq(tasks.service_order_id, order.id)),
          db.select().from(documents).where(eq(documents.service_order_id, order.id)),
          db.select().from(messages)
            .where(and(
              eq(messages.service_order_id, order.id),
              eq(messages.visibility, "client")
            ))
            .orderBy(desc(messages.created_at))
        ]);

        return {
          ...order,
          tasks: orderTasks,
          documents: orderDocs,
          messages: orderMessages
        };
      }));

      res.json(ordersWithDetails);
    } catch (error) {
      console.error("Error fetching service orders:", error);
      res.status(500).json({ error: "Failed to fetch service orders" });
    }
  });

  // Client Document Upload
  app.post("/api/client/documents/upload", requireAuth, async (req, res) => {
    try {
      // TODO: Implement file upload with storage service
      const { service_order_id, doctype } = req.body;
      
      // Mock document creation for now
      const [document] = await db.insert(documents).values({
        service_order_id: parseInt(service_order_id),
        uploader_id: req.user!.id, // Authenticated user ID (middleware ensures req.user exists)
        doctype: doctype || "client_upload",
        filename: "uploaded_document.pdf",
        original_filename: "document.pdf",
        file_path: "/uploads/documents/",
        file_size: 1024000,
        mime_type: "application/pdf",
        status: "uploaded"
      }).returning();

      res.json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Client Messages
  app.post("/api/client/messages", sessionAuthMiddleware, async (req, res) => {
    try {
      const [message] = await db.insert(messages).values({
        ...req.body,
        author_id: req.user!.id, // Authenticated user ID
        created_at: new Date()
      }).returning();

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Client Notifications
  app.get("/api/client/notifications", sessionAuthMiddleware, async (req, res) => {
    try {
      const userNotifications = await db.select()
        .from(notifications)
        .where(eq(notifications.user_id, req.user!.id)) // Authenticated user ID
        .orderBy(desc(notifications.created_at))
        .limit(20);

      res.json(userNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Client Metrics
  app.get("/api/client/metrics", sessionAuthMiddleware, async (req, res) => {
    try {
      const { entity_id } = req.query;
      
      // Calculate completion rate
      const [totalOrders] = await db.select({ count: sql<number>`count(*)::int` })
        .from(service_orders)
        .where(entity_id ? eq(service_orders.entity_id, parseInt(entity_id as string)) : sql`true`);

      const [completedOrders] = await db.select({ count: sql<number>`count(*)::int` })
        .from(service_orders)
        .where(and(
          eq(service_orders.status, "completed"),
          entity_id ? eq(service_orders.entity_id, parseInt(entity_id as string)) : sql`true`
        ));

      const completionRate = totalOrders.count > 0 ? 
        Math.round((completedOrders.count / totalOrders.count) * 100) : 0;

      // Calculate outstanding payments
      const [outstandingResult] = await db.select({
        total: sql<number>`COALESCE(SUM(amount::numeric), 0)::int`
      }).from(payments).where(eq(payments.status, 'pending'));

      // Calculate monthly spend (completed payments this month)
      const [monthlyResult] = await db.select({
        total: sql<number>`COALESCE(SUM(amount::numeric), 0)::int`
      }).from(payments).where(and(
        eq(payments.status, 'completed'),
        gte(payments.completedAt, sql`date_trunc('month', NOW())`)
      ));

      const metrics = {
        completionRate,
        totalOutstanding: outstandingResult?.total || 0,
        monthlySpend: monthlyResult?.total || 0
      };

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching client metrics:", error);
      res.status(500).json({ error: "Failed to fetch client metrics" });
    }
  });

  // ===== OPERATIONS ROUTES =====

  // Operations Tasks
  app.get("/api/ops/tasks", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req, res) => {
    try {
      const { filter, priority, assignee, search } = req.query;
      
      let query = db.select({
        id: tasks.id,
        service_order_id: tasks.service_order_id,
        step_key: tasks.step_key,
        name: tasks.name,
        description: tasks.description,
        type: tasks.type,
        status: tasks.status,
        assignee_id: tasks.assignee_id,
        due_at: tasks.due_at,
        checklist: tasks.checklist,
        dependencies: tasks.dependencies,
        priority: tasks.priority,
        estimated_hours: tasks.estimated_hours,
        actual_hours: tasks.actual_hours,
        qa_required: tasks.qa_required,
        created_at: tasks.created_at,
        completed_at: tasks.completed_at,
        service_order: {
          id: service_orders.id,
          service_type: service_orders.service_type,
          entity: {
            name: entities.name
          }
        },
        assignee: {
          id: users.id,
          email: users.email
        }
      })
        .from(tasks)
        .innerJoin(service_orders, eq(tasks.service_order_id, service_orders.id))
        .innerJoin(entities, eq(service_orders.entity_id, entities.id))
        .leftJoin(users, eq(tasks.assignee_id, users.id));

      // Apply filters
      const whereConditions = [];
      
      if (filter && filter !== "all") {
        whereConditions.push(eq(tasks.status, filter as string));
      }
      
      if (priority && priority !== "all") {
        whereConditions.push(eq(tasks.priority, priority as string));
      }
      
      if (assignee && assignee !== "all") {
        whereConditions.push(eq(tasks.assignee_id, parseInt(assignee as string)));
      }
      
      if (search) {
        whereConditions.push(
          or(
            like(tasks.name, `%${search}%`),
            like(service_orders.service_type, `%${search}%`),
            like(entities.name, `%${search}%`)
          )
        );
      }

      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      const allTasks = await query.orderBy(asc(tasks.due_at));
      res.json(allTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Update Task Status
  app.put("/api/ops/tasks/:id/status", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      await UniversalServiceEngine.updateTaskStatus(
        taskId,
        status,
        req.user!.id, // Authenticated user ID
        notes
      );

      // Emit pipeline event for task completion
      if (status === 'completed') {
        try {
          await db.insert(pipelineEvents).values(createPipelineEvent({
            eventType: PIPELINE_EVENTS.SERVICE_TASK_COMPLETED,
            entityType: 'task',
            entityId: taskId,
            payload: { status, notes },
            triggeredBy: req.user?.id,
            newState: 'completed',
          }));
        } catch (pipelineError) {
          console.error('Pipeline event emission failed (service.task_completed):', pipelineError);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ error: "Failed to update task status" });
    }
  });

  // Assign Task
  app.put("/api/ops/tasks/:id/assign", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { assignee_id } = req.body;
      
      await db.update(tasks)
        .set({ assignee_id, updated_at: new Date() })
        .where(eq(tasks.id, taskId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({ error: "Failed to assign task" });
    }
  });

  // Add Task Comment
  app.post("/api/ops/tasks/:id/comments", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { body, visibility } = req.body;
      
      const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const [message] = await db.insert(messages).values({
        service_order_id: task.service_order_id,
        author_id: req.user!.id, // Authenticated user ID
        subject: `Comment on ${task.name}`,
        body,
        visibility: visibility || "internal",
        created_at: new Date()
      }).returning();

      res.json(message);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // Operations Service Orders
  app.get("/api/ops/service-orders", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req, res) => {
    try {
      const orders = await db.select({
        id: service_orders.id,
        service_type: service_orders.service_type,
        status: service_orders.status,
        progress_percentage: service_orders.progress_percentage,
        due_at: service_orders.due_at,
        entity: {
          name: entities.name
        }
      })
        .from(service_orders)
        .innerJoin(entities, eq(service_orders.entity_id, entities.id))
        .orderBy(desc(service_orders.created_at));

      // Get tasks for each order
      const ordersWithTasks = await Promise.all(orders.map(async (order) => {
        const orderTasks = await db.select().from(tasks)
          .where(eq(tasks.service_order_id, order.id));
        return { ...order, tasks: orderTasks };
      }));

      return ok(res, ordersWithTasks);
    } catch (error) {
      console.error("Error fetching service orders:", error);
      return fail(res, 500, { message: "Failed to fetch service orders" });
    }
  });

  // Team Members
  app.get("/api/ops/team-members", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req, res) => {
    try {
      const teamMembers = await db.select({
        id: users.id,
        email: users.email,
        role: users.role
      })
        .from(users)
        .where(inArray(users.role, ["ops_exec", "ops_lead"]));

      // Get task counts for each member
      const membersWithCounts = await Promise.all(teamMembers.map(async (member) => {
        const [activeTasks] = await db.select({ count: sql<number>`count(*)::int` })
          .from(tasks)
          .where(and(
            eq(tasks.assignee_id, member.id),
            inArray(tasks.status, ["assigned", "in_progress"])
          ));

        const [completedToday] = await db.select({ count: sql<number>`count(*)::int` })
          .from(tasks)
          .where(and(
            eq(tasks.assignee_id, member.id),
            eq(tasks.status, "completed"),
            sql`${tasks.completed_at}::date = CURRENT_DATE`
          ));

        return {
          ...member,
          active_tasks: activeTasks.count || 0,
          completed_today: completedToday.count || 0
        };
      }));

      res.json(membersWithCounts);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Operations Metrics
  app.get("/api/ops/metrics", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req, res) => {
    try {
      const [
        completedTodayResult,
        avgHandleTimeResult,
        reworkRateResult,
        utilizationResult
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` })
          .from(tasks)
          .where(and(
            eq(tasks.status, "completed"),
            sql`${tasks.completed_at}::date = CURRENT_DATE`
          )),
        db.select({ avg: sql<number>`avg(actual_hours)::int` })
          .from(tasks)
          .where(isNull(tasks.actual_hours) === false),
        db.select({ 
          total: sql<number>`count(*)::int`,
          rework: sql<number>`count(*) filter (where status = 'rework_required')::int`
        })
          .from(tasks),
        db.select({ count: sql<number>`count(*)::int` })
          .from(users)
          .where(inArray(users.role, ["ops_exec", "ops_lead"]))
      ]);

      // Calculate real team utilization from operations_team table
      const [utilizationData] = await db.select({
        avgUtilization: sql<number>`COALESCE(AVG(current_workload * 100.0 / NULLIF(workload_capacity, 0)), 0)::int`
      }).from(operationsTeam).where(eq(operationsTeam.isActive, true));

      // Calculate SLA compliance from completed tasks
      const [slaData] = await db.select({
        total: sql<number>`count(*)::int`,
        onTime: sql<number>`count(*) filter (where actual_completion <= sla_deadline OR (actual_completion IS NOT NULL AND sla_deadline IS NULL))::int`
      }).from(sql`service_orders`).where(sql`actual_completion IS NOT NULL`);

      const slaCompliance = slaData?.total > 0
        ? Math.round((slaData.onTime / slaData.total) * 100)
        : 100;

      const metrics = {
        completedToday: completedTodayResult[0]?.count || 0,
        avgHandleTime: avgHandleTimeResult[0]?.avg || 0,
        reworkRate: reworkRateResult[0]?.total > 0 ?
          Math.round((reworkRateResult[0]?.rework / reworkRateResult[0]?.total) * 100) : 0,
        teamUtilization: utilizationData?.avgUtilization || 0,
        slaCompliance
      };

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching ops metrics:", error);
      res.status(500).json({ error: "Failed to fetch ops metrics" });
    }
  });

  // SLA Metrics
  app.get("/api/ops/sla-metrics", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req, res) => {
    try {
      const [
        totalTimersResult,
        atRiskResult,
        breachedResult
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` })
          .from(sla_timers)
          .where(eq(sla_timers.current_status, "running")),
        db.select({ count: sql<number>`count(*)::int` })
          .from(tasks)
          .where(sql`${tasks.due_at} <= now() + interval '4 hours' AND ${tasks.due_at} > now()`),
        db.select({ count: sql<number>`count(*)::int` })
          .from(tasks)
          .where(sql`${tasks.due_at} < now()`)
      ]);

      const total = totalTimersResult[0]?.count || 1;
      const atRisk = atRiskResult[0]?.count || 0;
      const breached = breachedResult[0]?.count || 0;
      const onTime = total - atRisk - breached;

      const metrics = {
        compliance: Math.round((onTime / total) * 100),
        atRisk,
        breached,
        total
      };

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching SLA metrics:", error);
      res.status(500).json({ error: "Failed to fetch SLA metrics" });
    }
  });

  // ===== AGENT ROUTES =====

  // Agent Leads
  app.get("/api/agent/leads", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.AGENT), async (req, res) => {
    try {
      // TODO: Filter by agent ID from auth
      const agentLeads = await db.select().from(leads)
        .orderBy(desc(leads.created_at));
      res.json(agentLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.post("/api/agent/leads", requireAuth, async (req, res) => {
    try {
      const agentId = req.user!.id; // Assuming user ID can be used as agent ID
      const [lead] = await db.insert(leads).values({
        ...req.body,
        agent_id: agentId,
        created_at: new Date()
      }).returning();

      // Emit pipeline event for lead creation
      try {
        await db.insert(pipelineEvents).values(createPipelineEvent({
          eventType: PIPELINE_EVENTS.LEAD_CREATED,
          entityType: 'lead',
          entityId: lead.id,
          payload: { leadName: lead.name, agentId, source: req.body.source },
          triggeredBy: req.user?.id,
        }));
      } catch (pipelineError) {
        console.error('Pipeline event emission failed (lead.created):', pipelineError);
      }

      res.json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // Agent Commissions
  app.get("/api/agent/commissions", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.AGENT), async (req, res) => {
    try {
      // TODO: Filter by agent ID from auth
      const agentCommissions = await db.select().from(commissions)
        .orderBy(desc(commissions.created_at));
      res.json(agentCommissions);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ error: "Failed to fetch commissions" });
    }
  });

  // NOTE: Commission statements and disputes endpoints are implemented in payment-routes.ts
  // with proper authentication and real database queries.
  // See: /api/agent/commission-statements, /api/agent/commission-disputes (GET and POST)

  // ===== SEARCH & ANALYTICS =====

  // Global Search
  app.get("/api/search", sessionAuthMiddleware, async (req, res) => {
    try {
      const { q, scope } = req.query;
      if (!q) {
        return res.status(400).json({ error: "Search query required" });
      }

      const searchScope = scope ? (scope as string).split(',') : [];
      const results = await UniversalServiceEngine.globalSearch(
        q as string, 
        searchScope,
        req.user?.id
      );
      
      res.json(results);
    } catch (error) {
      console.error("Error performing search:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // ===== DOCUMENT MANAGEMENT =====

  // Approve Document
  app.post("/api/documents/:id/approve", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.QC_EXECUTIVE), async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const { notes } = req.body;
      
      await UniversalServiceEngine.approveDocument(
        documentId, 
        req.user!.id, // Authenticated user ID
        notes
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving document:", error);
      res.status(500).json({ error: "Failed to approve document" });
    }
  });

  // Reject Document
  app.post("/api/documents/:id/reject", sessionAuthMiddleware, requireMinimumRole(USER_ROLES.QC_EXECUTIVE), async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Rejection reason required" });
      }
      
      await UniversalServiceEngine.rejectDocument(
        documentId, 
        req.user!.id, // Authenticated user ID
        reason
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting document:", error);
      res.status(500).json({ error: "Failed to reject document" });
    }
  });

  // ===== SERVICE ORDER MANAGEMENT =====

  // Create Service Order
  app.post("/api/service-orders", async (req, res) => {
    try {
      const serviceOrder = await UniversalServiceEngine.createServiceOrder(req.body);
      res.json(serviceOrder);
    } catch (error) {
      console.error("Error creating service order:", error);
      res.status(500).json({ error: "Failed to create service order" });
    }
  });

  // Register team management routes
  registerTeamManagementRoutes(app);
  
  const httpServer = createServer(app);
  return httpServer;
}
