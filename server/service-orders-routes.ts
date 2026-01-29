import type { Express } from "express";
import { db } from './db';
import {
  serviceRequests,
  businessEntities
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { executeStatusTransition, getAvailableTransitions, getTransitionHistory } from './status-transition-handler';

export function registerServiceOrdersRoutes(app: Express) {

  // LIST all service orders with basic filters
  app.get('/api/service-orders', async (req, res) => {
    try {
      const { status, service_type } = req.query;
      
      let query = db
        .select({
          id: serviceRequests.id,
          entityId: serviceRequests.entityId,
          serviceType: serviceRequests.serviceType,
          periodLabel: serviceRequests.periodLabel,
          status: serviceRequests.status,
          priority: serviceRequests.priority,
          dueDate: serviceRequests.dueDate,
          createdAt: serviceRequests.createdAt,
          updatedAt: serviceRequests.updatedAt,
          entityName: businessEntities.name
        })
        .from(serviceRequests)
        .leftJoin(businessEntities, eq(serviceRequests.entityId, businessEntities.id))
        .orderBy(serviceRequests.dueDate, desc(serviceRequests.updatedAt));

      // Apply filters
      if (status) {
        query = query.where(eq(serviceRequests.status, status as string));
      }
      
      if (service_type) {
        query = query.where(eq(serviceRequests.serviceType, service_type as string));
      }

      const orders = await query;
      
      res.json(orders);
    } catch (error) {
      console.error('Error fetching service orders:', error);
      res.status(500).json({ error: 'Failed to fetch service orders' });
    }
  });

  // GET one service order
  app.get('/api/service-orders/:id', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      const [order] = await db
        .select({
          id: serviceRequests.id,
          entityId: serviceRequests.entityId,
          serviceType: serviceRequests.serviceType,
          periodLabel: serviceRequests.periodLabel,
          status: serviceRequests.status,
          priority: serviceRequests.priority,
          dueDate: serviceRequests.dueDate,
          description: serviceRequests.description,
          createdAt: serviceRequests.createdAt,
          updatedAt: serviceRequests.updatedAt,
          entityName: businessEntities.name
        })
        .from(serviceRequests)
        .leftJoin(businessEntities, eq(serviceRequests.entityId, businessEntities.id))
        .where(eq(serviceRequests.id, orderId));

      if (!order) {
        return res.status(404).json({ error: 'Service order not found' });
      }

      res.json(order);
    } catch (error) {
      console.error('Error fetching service order:', error);
      res.status(500).json({ error: 'Failed to fetch service order' });
    }
  });

  // UPDATE service order status (using unified status transition handler)
  app.patch('/api/service-orders/:id/status', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { from, to, notes, reason, timestamp } = req.body;

      // Use the unified status transition handler
      // This automatically:
      // 1. Validates the transition
      // 2. Records history for transparency
      // 3. Creates tasks if configured
      // 4. Sends notifications if configured
      // 5. Emits events for other systems
      const result = await executeStatusTransition({
        serviceRequestId: orderId,
        toStatusCode: to,
        userId: (req as any).user?.id || 1, // Get from auth context
        reason: reason || notes,
        notes,
        triggerSource: 'api'
      });

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          from,
          to
        });
      }

      console.log(`📈 Status updated via transition handler: Order ${orderId} ${result.previousStatus} → ${result.newStatus}`);

      res.json({
        success: true,
        message: 'Status updated successfully',
        orderId,
        from: result.previousStatus,
        to: result.newStatus,
        historyId: result.historyId
      });
    } catch (error) {
      console.error('Error updating service order status:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  });

  // GET available transitions for a service order
  app.get('/api/service-orders/:id/available-transitions', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const transitions = await getAvailableTransitions(orderId);

      res.json({ transitions });
    } catch (error) {
      console.error('Error fetching available transitions:', error);
      res.status(500).json({ error: 'Failed to fetch available transitions' });
    }
  });

  // GET transition history for a service order
  app.get('/api/service-orders/:id/transition-history', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await getTransitionHistory(orderId, limit);

      res.json({ history });
    } catch (error) {
      console.error('Error fetching transition history:', error);
      res.status(500).json({ error: 'Failed to fetch transition history' });
    }
  });

  // CREATE new service order (manual)
  app.post('/api/service-orders', async (req, res) => {
    try {
      const {
        entityId,
        serviceType,
        periodLabel,
        dueDate,
        priority = 'MEDIUM',
        description
      } = req.body;

      const [newOrder] = await db
        .insert(serviceRequests)
        .values({
          entityId,
          serviceType,
          periodLabel,
          dueDate,
          priority,
          status: 'Created',
          description
        })
        .returning();

      res.json(newOrder);
    } catch (error) {
      console.error('Error creating service order:', error);
      res.status(500).json({ error: 'Failed to create service order' });
    }
  });

  // BULK status update
  app.patch('/api/service-orders/bulk/status', async (req, res) => {
    try {
      const { orderIds, newStatus } = req.body;

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: 'Invalid orderIds array' });
      }

      // Update multiple orders
      const updates = await Promise.all(
        orderIds.map(async (id: number) => {
          await db
            .update(serviceRequests)
            .set({
              status: newStatus,
              updatedAt: new Date().toISOString()
            })
            .where(eq(serviceRequests.id, id));
          
          return { id, status: newStatus };
        })
      );

      console.log(`📈 Bulk status update: ${orderIds.length} orders → ${newStatus}`);

      res.json({
        success: true,
        message: `${orderIds.length} orders updated to ${newStatus}`,
        updates
      });
    } catch (error) {
      console.error('Error bulk updating service orders:', error);
      res.status(500).json({ error: 'Failed to bulk update orders' });
    }
  });

  // GET service order statistics
  app.get('/api/service-orders/stats', async (req, res) => {
    try {
      const stats = await db
        .select({
          status: serviceRequests.status,
          count: sql`count(*)`
        })
        .from(serviceRequests)
        .groupBy(serviceRequests.status);

      const priorityStats = await db
        .select({
          priority: serviceRequests.priority,
          count: sql`count(*)`
        })
        .from(serviceRequests)
        .groupBy(serviceRequests.priority);

      const serviceTypeStats = await db
        .select({
          serviceType: serviceRequests.serviceType,
          count: sql`count(*)`
        })
        .from(serviceRequests)
        .groupBy(serviceRequests.serviceType);

      // Calculate overdue orders
      const overdueCount = await db
        .select({
          count: sql`count(*)`
        })
        .from(serviceRequests)
        .where(
          and(
            sql`date(due_date) < date('now')`,
            sql`status != 'Completed'`
          )
        );

      res.json({
        byStatus: stats.map(s => ({
          status: s.status,
          count: Number(s.count)
        })),
        byPriority: priorityStats.map(s => ({
          priority: s.priority,
          count: Number(s.count)
        })),
        byServiceType: serviceTypeStats.map(s => ({
          serviceType: s.serviceType,
          count: Number(s.count)
        })),
        overdue: Number(overdueCount[0].count)
      });
    } catch (error) {
      console.error('Error fetching service order statistics:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  console.log('✅ Service orders routes registered');
}