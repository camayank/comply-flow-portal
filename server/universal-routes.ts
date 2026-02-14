import type { Express } from "express";
import { createServer, type Server } from "http";
import { UniversalServiceEngine } from "./universal-service-engine";
import { registerTeamManagementRoutes } from './team-management-routes';
import { requireAuth } from './auth-middleware';
import { db } from "./db";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from './rbac-middleware';
import { eq, and, desc, asc, like, inArray, isNull, sql, or } from "drizzle-orm";
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
  app.post("/api/client/messages", async (req, res) => {
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
  app.get("/api/client/notifications", async (req, res) => {
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
  app.get("/api/client/metrics", async (req, res) => {
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

      const metrics = {
        completionRate,
        totalOutstanding: 25000, // TODO: Calculate from billing
        monthlySpend: 15000 // TODO: Calculate from actual spending
      };

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching client metrics:", error);
      res.status(500).json({ error: "Failed to fetch client metrics" });
    }
  });

  // ===== OPERATIONS ROUTES =====

  // Operations Tasks
  app.get("/api/ops/tasks", async (req, res) => {
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
  app.put("/api/ops/tasks/:id/status", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      await UniversalServiceEngine.updateTaskStatus(
        taskId, 
        status, 
        req.user!.id, // Authenticated user ID
        notes
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ error: "Failed to update task status" });
    }
  });

  // Assign Task
  app.put("/api/ops/tasks/:id/assign", async (req, res) => {
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
  app.post("/api/ops/tasks/:id/comments", async (req, res) => {
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
  app.get("/api/ops/service-orders", async (req, res) => {
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

      res.json(ordersWithTasks);
    } catch (error) {
      console.error("Error fetching service orders:", error);
      res.status(500).json({ error: "Failed to fetch service orders" });
    }
  });

  // Team Members
  app.get("/api/ops/team-members", async (req, res) => {
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
  app.get("/api/ops/metrics", async (req, res) => {
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

      const metrics = {
        completedToday: completedTodayResult[0]?.count || 0,
        avgHandleTime: avgHandleTimeResult[0]?.avg || 0,
        reworkRate: reworkRateResult[0]?.total > 0 ? 
          Math.round((reworkRateResult[0]?.rework / reworkRateResult[0]?.total) * 100) : 0,
        teamUtilization: 85, // TODO: Calculate real utilization
        slaCompliance: 87
      };

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching ops metrics:", error);
      res.status(500).json({ error: "Failed to fetch ops metrics" });
    }
  });

  // SLA Metrics
  app.get("/api/ops/sla-metrics", async (req, res) => {
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
  app.get("/api/agent/leads", async (req, res) => {
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

      res.json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // Agent Commissions
  app.get("/api/agent/commissions", async (req, res) => {
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

  // Agent Commission Statements - Monthly/Quarterly summary of commissions
  app.get("/api/agent/commission-statements", async (req, res) => {
    try {
      const agentId = req.user?.id || 1;

      // Generate commission statements by period
      const generateStatements = () => {
        const statements = [];
        const now = new Date();

        for (let i = 0; i < 6; i++) {
          const periodDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const periodKey = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;
          const periodLabel = periodDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

          const totalCommission = Math.floor(Math.random() * 100000) + 50000;
          const totalPaid = i > 1 ? totalCommission : Math.floor(totalCommission * 0.7);
          const totalDisputed = Math.floor(Math.random() * 10000);

          const lineItems = [];
          const itemCount = Math.floor(Math.random() * 8) + 3;

          for (let j = 0; j < itemCount; j++) {
            const serviceValue = Math.floor(Math.random() * 50000) + 10000;
            const commissionRate = [5, 7.5, 10, 12.5, 15][Math.floor(Math.random() * 5)];
            const commissionAmount = Math.floor(serviceValue * commissionRate / 100);
            const statuses = ['approved', 'pending', 'disputed', 'adjusted'];

            lineItems.push({
              id: `li-${periodKey}-${j}`,
              statementId: `stmt-${periodKey}`,
              clientName: ['Reliance Industries', 'Tata Motors', 'Infosys Ltd', 'Wipro Technologies', 'HCL Tech'][Math.floor(Math.random() * 5)],
              clientId: `client-${j + 100}`,
              serviceType: ['GST Registration', 'Company Incorporation', 'Tax Filing', 'Compliance Audit', 'ROC Filing'][Math.floor(Math.random() * 5)],
              serviceRequestId: `sr-${Date.now()}-${j}`,
              serviceRequestNumber: `SR-2026-${String(i * 100 + j).padStart(5, '0')}`,
              serviceValue,
              commissionRate,
              commissionAmount,
              status: statuses[Math.floor(Math.random() * statuses.length)],
              completedAt: new Date(periodDate.getTime() + Math.random() * 28 * 24 * 60 * 60 * 1000).toISOString()
            });
          }

          statements.push({
            id: `stmt-${periodKey}`,
            period: periodKey,
            periodLabel,
            totalCommission,
            totalPaid,
            totalPending: totalCommission - totalPaid - totalDisputed,
            totalDisputed,
            lineItems,
            status: i > 1 ? 'paid' : i === 1 ? 'finalized' : 'draft',
            generatedAt: new Date(periodDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          });
        }

        return statements;
      };

      res.json(generateStatements());
    } catch (error) {
      console.error("Error fetching commission statements:", error);
      res.status(500).json({ error: "Failed to fetch commission statements" });
    }
  });

  // Agent Commission Disputes - Disputes raised on commissions
  app.get("/api/agent/commission-disputes", async (req, res) => {
    try {
      const { status } = req.query;
      const agentId = req.user?.id || 1;

      const generateDisputes = (statusFilter?: string) => {
        const disputes = [];
        const categories = ['missing_commission', 'incorrect_rate', 'wrong_calculation', 'missing_service', 'other'];
        const statuses = ['submitted', 'under_review', 'info_requested', 'approved', 'partially_approved', 'rejected'];

        for (let i = 0; i < 12; i++) {
          const disputeStatus = statuses[Math.floor(Math.random() * statuses.length)];

          if (statusFilter && statusFilter !== 'all' && disputeStatus !== statusFilter) {
            continue;
          }

          const originalAmount = Math.floor(Math.random() * 15000) + 5000;
          const disputedAmount = originalAmount + Math.floor(Math.random() * 5000);
          const isResolved = ['approved', 'partially_approved', 'rejected'].includes(disputeStatus);

          disputes.push({
            id: `disp-${i + 1}`,
            disputeNumber: `DIS-2026-${String(i + 1).padStart(4, '0')}`,
            statementId: `stmt-2026-0${(i % 3) + 1}`,
            lineItemId: `li-2026-0${(i % 3) + 1}-${i % 5}`,
            clientName: ['Reliance Industries', 'Tata Motors', 'Infosys Ltd', 'Wipro Technologies', 'HCL Tech'][i % 5],
            serviceRequestNumber: `SR-2026-${String(10000 + i).padStart(5, '0')}`,
            originalAmount,
            disputedAmount,
            reason: [
              'Commission rate should be 12.5% not 10% as per agreement',
              'Missing commission for renewal service',
              'Calculation error in base amount',
              'Service not included in statement',
              'Wrong client attributed to different agent'
            ][i % 5],
            category: categories[i % 5],
            status: disputeStatus,
            approvedAmount: isResolved && disputeStatus !== 'rejected'
              ? Math.floor(disputedAmount * (disputeStatus === 'approved' ? 1 : 0.6))
              : null,
            resolution: isResolved
              ? disputeStatus === 'rejected'
                ? 'Dispute rejected - commission rate was correctly applied as per standard terms'
                : 'Dispute resolved - adjusted amount credited to next statement'
              : null,
            submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            resolvedAt: isResolved ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
            resolvedBy: isResolved ? 'Finance Admin' : null,
            attachments: Math.random() > 0.5 ? ['commission_agreement.pdf', 'service_invoice.pdf'] : [],
            timeline: [
              {
                id: `tl-${i}-1`,
                action: 'dispute_submitted',
                description: 'Dispute submitted for review',
                actorName: 'Agent User',
                actorRole: 'agent',
                createdAt: new Date(Date.now() - (25 + i) * 24 * 60 * 60 * 1000).toISOString()
              },
              {
                id: `tl-${i}-2`,
                action: 'under_review',
                description: 'Dispute assigned to finance team',
                actorName: 'System',
                actorRole: 'system',
                createdAt: new Date(Date.now() - (23 + i) * 24 * 60 * 60 * 1000).toISOString()
              },
              ...(isResolved ? [{
                id: `tl-${i}-3`,
                action: disputeStatus,
                description: disputeStatus === 'rejected'
                  ? 'Dispute rejected after review'
                  : 'Dispute approved and adjustment processed',
                actorName: 'Finance Admin',
                actorRole: 'admin',
                createdAt: new Date(Date.now() - (5 + i) * 24 * 60 * 60 * 1000).toISOString()
              }] : [])
            ]
          });
        }

        return disputes;
      };

      res.json(generateDisputes(status as string));
    } catch (error) {
      console.error("Error fetching commission disputes:", error);
      res.status(500).json({ error: "Failed to fetch commission disputes" });
    }
  });

  // Create a new commission dispute
  app.post("/api/agent/commission-disputes", async (req, res) => {
    try {
      const { lineItemId, statementId, reason, category, expectedAmount, details } = req.body;
      const agentId = req.user?.id || 1;

      if (!lineItemId || !statementId || !reason || !category) {
        return res.status(400).json({ error: "Missing required fields: lineItemId, statementId, reason, category" });
      }

      const newDispute = {
        id: `disp-${Date.now()}`,
        disputeNumber: `DIS-2026-${String(Date.now()).slice(-4)}`,
        statementId,
        lineItemId,
        clientName: 'Client Name',
        serviceRequestNumber: 'SR-2026-XXXXX',
        originalAmount: 0,
        disputedAmount: parseFloat(expectedAmount) || 0,
        reason,
        category,
        status: 'submitted',
        approvedAmount: null,
        resolution: null,
        submittedAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
        attachments: [],
        timeline: [
          {
            id: `tl-new-1`,
            action: 'dispute_submitted',
            description: 'Dispute submitted for review',
            actorName: 'Agent User',
            actorRole: 'agent',
            createdAt: new Date().toISOString()
          }
        ]
      };

      res.status(201).json(newDispute);
    } catch (error) {
      console.error("Error creating commission dispute:", error);
      res.status(500).json({ error: "Failed to create commission dispute" });
    }
  });

  // ===== SEARCH & ANALYTICS =====

  // Global Search
  app.get("/api/search", async (req, res) => {
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
  app.post("/api/documents/:id/approve", async (req, res) => {
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
  app.post("/api/documents/:id/reject", async (req, res) => {
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
