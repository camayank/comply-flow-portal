import type { Express } from "express";
import { db } from './db';
import { 
  serviceRequests,
  businessEntities
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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

  // UPDATE service order status
  app.patch('/api/service-orders/:id/status', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { from, to, notes, timestamp } = req.body;

      // Fetch current order
      const [currentOrder] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, orderId));

      if (!currentOrder) {
        return res.status(404).json({ error: 'Service order not found' });
      }

      // Update status
      await db
        .update(serviceRequests)
        .set({
          status: to,
          updatedAt: new Date().toISOString()
        })
        .where(eq(serviceRequests.id, orderId));

      // TODO: Emit event for notification system
      // emitEvent('service.status_changed', {
      //   service_order_id: orderId,
      //   from,
      //   to,
      //   serviceName: currentOrder.serviceType,
      //   periodLabel: currentOrder.periodLabel,
      //   notes,
      //   timestamp
      // });

      console.log(`📈 Status updated: Order ${orderId} ${from} → ${to}`);
      
      res.json({ 
        success: true,
        message: 'Status updated successfully',
        orderId,
        from,
        to
      });
    } catch (error) {
      console.error('Error updating service order status:', error);
      res.status(500).json({ error: 'Failed to update status' });
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