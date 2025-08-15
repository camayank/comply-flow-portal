import type { Express, Request, Response } from "express";
import { db } from "./db";
import { services, serviceRequests, businessEntities } from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";

export function registerOperationsRoutes(app: Express) {
  
  // ========== SERVICE ORDERS (using service_requests) ==========
  app.get('/api/ops/service-orders', async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      
      let query = db
        .select({
          id: serviceRequests.id,
          serviceId: serviceRequests.serviceId,
          businessEntityId: serviceRequests.businessEntityId,
          status: serviceRequests.status,
          progress: serviceRequests.progress,
          currentMilestone: serviceRequests.currentMilestone,
          totalAmount: serviceRequests.totalAmount,
          slaDeadline: serviceRequests.slaDeadline,
          priority: serviceRequests.priority,
          createdAt: serviceRequests.createdAt,
          updatedAt: serviceRequests.updatedAt
        })
        .from(serviceRequests)
        .orderBy(desc(serviceRequests.createdAt));

      // Apply status filter if provided
      if (status) {
        query = query.where(eq(serviceRequests.status, status as string));
      }

      const orders = await query;
      res.json(orders);
    } catch (error) {
      console.error('Error fetching service orders:', error);
      res.status(500).json({ error: 'Failed to fetch service orders' });
    }
  });

  // ========== OPERATIONS DASHBOARD STATS ==========
  app.get('/api/ops/dashboard-stats', async (req: Request, res: Response) => {
    try {
      const stats = {
        totalActiveOrders: await db
          .select({ count: sql`count(*)` })
          .from(serviceRequests)
          .where(sql`${serviceRequests.status} not in ('completed', 'delivered', 'cancelled')`),
        
        pendingOrders: await db
          .select({ count: sql`count(*)` })
          .from(serviceRequests)
          .where(eq(serviceRequests.status, 'initiated')),
        
        inProgressOrders: await db
          .select({ count: sql`count(*)` })
          .from(serviceRequests)
          .where(eq(serviceRequests.status, 'in_progress')),
        
        completedOrders: await db
          .select({ count: sql`count(*)` })
          .from(serviceRequests)
          .where(eq(serviceRequests.status, 'completed'))
      };

      res.json({
        totalActiveOrders: Number(stats.totalActiveOrders[0]?.count || 0),
        pendingOrders: Number(stats.pendingOrders[0]?.count || 0),
        inProgressOrders: Number(stats.inProgressOrders[0]?.count || 0),
        completedOrders: Number(stats.completedOrders[0]?.count || 0)
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  // ========== TASKS (simplified view) ==========
  app.get('/api/ops/tasks', async (req: Request, res: Response) => {
    try {
      const { status, priority } = req.query;
      
      let query = db
        .select({
          id: serviceRequests.id,
          taskId: serviceRequests.id,
          title: sql<string>`CONCAT('Service Request #', ${serviceRequests.id})`,
          status: serviceRequests.status,
          priority: serviceRequests.priority,
          currentMilestone: serviceRequests.currentMilestone,
          slaDeadline: serviceRequests.slaDeadline,
          createdAt: serviceRequests.createdAt
        })
        .from(serviceRequests)
        .orderBy(desc(serviceRequests.createdAt));

      // Apply filters
      if (status) {
        query = query.where(eq(serviceRequests.status, status as string));
      }

      const tasks = await query;
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // ========== ASSIGNMENTS OVERVIEW ==========
  app.get('/api/ops/assignments', async (req: Request, res: Response) => {
    try {
      // For now, return a summary based on assigned team members
      const assignments = await db
        .select({
          assignedTo: serviceRequests.assignedTeamMember,
          totalTasks: sql<number>`count(*)`,
          pendingTasks: sql<number>`count(case when ${serviceRequests.status} = 'initiated' then 1 end)`,
          inProgressTasks: sql<number>`count(case when ${serviceRequests.status} = 'in_progress' then 1 end)`,
          completedTasks: sql<number>`count(case when ${serviceRequests.status} = 'completed' then 1 end)`
        })
        .from(serviceRequests)
        .where(sql`${serviceRequests.assignedTeamMember} is not null`)
        .groupBy(serviceRequests.assignedTeamMember);

      res.json(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  });

  console.log('✅ Operations routes registered');
}