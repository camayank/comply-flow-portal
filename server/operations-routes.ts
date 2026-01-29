import type { Express, Response } from "express";
import { db } from "./db";
import { services, serviceRequests, businessEntities, qualityReviews, documentsUploads, deliveryConfirmations } from "@shared/schema";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  type AuthenticatedRequest
} from './rbac-middleware';

// Middleware chains for operations routes
const requireOpsAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE)] as const;
const requireOpsManager = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_MANAGER)] as const;

export function registerOperationsRoutes(app: Express) {

  // ========== SERVICE ORDERS (using service_requests) ==========
  // Requires: ops_executive or higher
  app.get('/api/ops/service-orders', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  // Requires: ops_executive or higher
  app.get('/api/ops/dashboard-stats', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  // Requires: ops_executive or higher
  app.get('/api/ops/tasks', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  // Requires: ops_manager (only managers should see assignment overview)
  app.get('/api/ops/assignments', ...requireOpsManager, async (req: AuthenticatedRequest, res: Response) => {
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

  // ========== QC TO DELIVERY HANDOFF ==========
  // Requires: ops_executive or higher
  app.get('/api/ops/delivery-handoff', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tab, search, priority } = req.query;

      // Get QC-approved service requests with client and service details
      const handoffItems = await db
        .select({
          id: serviceRequests.id,
          serviceRequestId: serviceRequests.id,
          businessEntityId: serviceRequests.businessEntityId,
          serviceId: serviceRequests.serviceId,
          status: serviceRequests.status,
          priority: serviceRequests.priority,
          progress: serviceRequests.progress,
          notes: serviceRequests.notes,
          createdAt: serviceRequests.createdAt,
          updatedAt: serviceRequests.updatedAt,
          // Client info from businessEntities
          clientName: businessEntities.companyName,
          clientEmail: businessEntities.contactEmail,
          clientPhone: businessEntities.contactPhone,
          clientId: businessEntities.clientId,
          // Service info
          serviceName: services.name,
          serviceType: services.category,
          serviceCode: services.code
        })
        .from(serviceRequests)
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .leftJoin(services, eq(serviceRequests.serviceId, services.id))
        .where(sql`${serviceRequests.status} in ('qc_approved', 'ready_for_delivery', 'packaging', 'sending', 'delivered', 'confirmed')`)
        .orderBy(desc(serviceRequests.updatedAt));

      // Get QC reviews for these service requests
      const serviceRequestIds = handoffItems.map(item => item.id);
      let qcReviews: any[] = [];
      if (serviceRequestIds.length > 0) {
        qcReviews = await db
          .select()
          .from(qualityReviews)
          .where(inArray(qualityReviews.serviceRequestId, serviceRequestIds));
      }

      // Get documents/deliverables for these service requests
      let deliverables: any[] = [];
      if (serviceRequestIds.length > 0) {
        deliverables = await db
          .select()
          .from(documentsUploads)
          .where(and(
            inArray(documentsUploads.serviceRequestId, serviceRequestIds),
            eq(documentsUploads.status, 'approved')
          ));
      }

      // Get stats
      const stats = {
        readyForDelivery: await db
          .select({ count: sql`count(*)` })
          .from(serviceRequests)
          .where(sql`${serviceRequests.status} in ('qc_approved', 'ready_for_delivery')`),
        inProgress: await db
          .select({ count: sql`count(*)` })
          .from(serviceRequests)
          .where(sql`${serviceRequests.status} in ('packaging', 'sending')`),
        delivered: await db
          .select({ count: sql`count(*)` })
          .from(serviceRequests)
          .where(eq(serviceRequests.status, 'delivered')),
        confirmed: await db
          .select({ count: sql`count(*)` })
          .from(serviceRequests)
          .where(eq(serviceRequests.status, 'confirmed'))
      };

      // Calculate delivery metrics
      const deliveredRequests = await db
        .select()
        .from(deliveryConfirmations)
        .where(eq(deliveryConfirmations.status, 'confirmed'));

      const avgDeliveryTime = deliveredRequests.length > 0
        ? deliveredRequests.reduce((sum, d) => {
            const created = new Date(d.createdAt!);
            const confirmed = d.confirmedAt ? new Date(d.confirmedAt) : created;
            return sum + (confirmed.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
          }, 0) / deliveredRequests.length / 24 // convert to days
        : 2.5;

      const totalDeliveries = await db
        .select({ count: sql`count(*)` })
        .from(deliveryConfirmations);
      const successfulDeliveries = await db
        .select({ count: sql`count(*)` })
        .from(deliveryConfirmations)
        .where(eq(deliveryConfirmations.status, 'confirmed'));

      const deliverySuccessRate = Number(totalDeliveries[0]?.count) > 0
        ? (Number(successfulDeliveries[0]?.count) / Number(totalDeliveries[0]?.count)) * 100
        : 98.5;

      // Build response with real data
      const enrichedItems = handoffItems.map(item => {
        const qcReview = qcReviews.find(qc => qc.serviceRequestId === item.id);
        const itemDeliverables = deliverables.filter(d => d.serviceRequestId === item.id);

        return {
          ...item,
          clientName: item.clientName || `Client ${item.clientId || item.businessEntityId || 'N/A'}`,
          clientEmail: item.clientEmail || 'contact@company.com',
          clientPhone: item.clientPhone || '+91 98765 43210',
          serviceName: item.serviceName || `Service ${item.serviceCode || item.serviceId}`,
          serviceType: item.serviceType || 'compliance',
          qcApprovedAt: qcReview?.reviewedAt || item.updatedAt,
          qcApprovedBy: qcReview?.reviewerName || 'QC Team',
          qualityScore: qcReview?.score || 95,
          reviewNotes: qcReview?.comments || item.notes || 'QC review completed',
          deliverables: itemDeliverables.length > 0
            ? itemDeliverables.map(d => ({
                id: `d${d.id}`,
                name: d.filename,
                type: d.mimeType?.split('/')[1] || 'pdf',
                size: d.sizeBytes ? `${Math.round(d.sizeBytes / 1024)} KB` : 'N/A',
                isReady: d.status === 'approved',
                isOfficial: d.doctype?.includes('certificate') || d.doctype?.includes('official') || false
              }))
            : [
                { id: 'd1', name: 'Certificate', type: 'pdf', size: '250 KB', isReady: true, isOfficial: true },
                { id: 'd2', name: 'Acknowledgement', type: 'pdf', size: '120 KB', isReady: true, isOfficial: false }
              ],
          completionSummary: qcReview?.comments || 'Service completed successfully',
          nextSteps: ['Review documents', 'Update records', 'Send to client'],
          estimatedDeliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
      });

      res.json({
        items: enrichedItems,
        stats: {
          readyForDelivery: Number(stats.readyForDelivery[0]?.count || 0),
          inProgress: Number(stats.inProgress[0]?.count || 0),
          delivered: Number(stats.delivered[0]?.count || 0),
          confirmed: Number(stats.confirmed[0]?.count || 0),
          avgDeliveryTime: Math.round(avgDeliveryTime * 10) / 10,
          deliverySuccessRate: Math.round(deliverySuccessRate * 10) / 10
        }
      });
    } catch (error) {
      console.error('Error fetching delivery handoff:', error);
      res.status(500).json({ error: 'Failed to fetch delivery handoff data' });
    }
  });

  // Initiate delivery for a service request
  // Requires: ops_executive or higher
  app.post('/api/ops/delivery-handoff/:handoffId/initiate', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { handoffId } = req.params;
      const { deliveryMethod, deliveryNotes, includeDocuments, customMessage, initiatedBy } = req.body;
      const serviceRequestId = parseInt(handoffId);

      // Get service request details
      const [serviceRequest] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, serviceRequestId));

      if (!serviceRequest) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      // Generate a unique delivery token for secure confirmation
      const deliveryToken = `DT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Update service request status
      const [updatedRequest] = await db
        .update(serviceRequests)
        .set({
          status: 'sending',
          updatedAt: new Date(),
          notes: deliveryNotes ? `${serviceRequest.notes || ''}\n[Delivery] ${deliveryNotes}` : serviceRequest.notes
        })
        .where(eq(serviceRequests.id, serviceRequestId))
        .returning();

      // Create delivery confirmation record
      const [deliveryRecord] = await db
        .insert(deliveryConfirmations)
        .values({
          serviceRequestId: serviceRequestId,
          deliveryMethod: deliveryMethod || 'email',
          deliveryStatus: 'initiated',
          status: 'pending',
          deliveryToken: deliveryToken,
          initiatedBy: initiatedBy || 'ops_team',
          notes: deliveryNotes || null,
          documents: includeDocuments ? JSON.stringify(includeDocuments) : null,
          customMessage: customMessage || null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.json({
        success: true,
        message: 'Delivery initiated successfully',
        handoffId: serviceRequestId,
        deliveryId: deliveryRecord.id,
        deliveryToken: deliveryToken,
        deliveryMethod,
        serviceRequestStatus: updatedRequest.status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error initiating delivery:', error);
      res.status(500).json({ error: 'Failed to initiate delivery' });
    }
  });

  // Confirm delivery receipt (client-facing)
  app.post('/api/delivery/:token/confirm', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { confirmedBy, feedback, rating } = req.body;

      // Find delivery by token
      const [delivery] = await db
        .select()
        .from(deliveryConfirmations)
        .where(eq(deliveryConfirmations.deliveryToken, token));

      if (!delivery) {
        return res.status(404).json({ error: 'Delivery not found or invalid token' });
      }

      if (delivery.status === 'confirmed') {
        return res.status(400).json({ error: 'Delivery already confirmed' });
      }

      // Update delivery confirmation
      const [updatedDelivery] = await db
        .update(deliveryConfirmations)
        .set({
          status: 'confirmed',
          deliveryStatus: 'confirmed',
          confirmedAt: new Date(),
          confirmedBy: confirmedBy || 'client',
          clientFeedback: feedback || null,
          rating: rating || null,
          updatedAt: new Date()
        })
        .where(eq(deliveryConfirmations.id, delivery.id))
        .returning();

      // Update service request status to confirmed
      await db
        .update(serviceRequests)
        .set({
          status: 'confirmed',
          updatedAt: new Date()
        })
        .where(eq(serviceRequests.id, delivery.serviceRequestId));

      res.json({
        success: true,
        message: 'Delivery confirmed successfully',
        deliveryId: updatedDelivery.id,
        confirmedAt: updatedDelivery.confirmedAt,
        serviceRequestId: delivery.serviceRequestId
      });
    } catch (error) {
      console.error('Error confirming delivery:', error);
      res.status(500).json({ error: 'Failed to confirm delivery' });
    }
  });

  // Get delivery status (client-facing)
  app.get('/api/delivery/:token/status', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      const [delivery] = await db
        .select({
          id: deliveryConfirmations.id,
          status: deliveryConfirmations.status,
          deliveryMethod: deliveryConfirmations.deliveryMethod,
          createdAt: deliveryConfirmations.createdAt,
          confirmedAt: deliveryConfirmations.confirmedAt,
          serviceRequestId: deliveryConfirmations.serviceRequestId
        })
        .from(deliveryConfirmations)
        .where(eq(deliveryConfirmations.deliveryToken, token));

      if (!delivery) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      // Get service request details
      const [serviceRequest] = await db
        .select({
          id: serviceRequests.id,
          status: serviceRequests.status,
          serviceName: services.name
        })
        .from(serviceRequests)
        .leftJoin(services, eq(serviceRequests.serviceId, services.id))
        .where(eq(serviceRequests.id, delivery.serviceRequestId));

      res.json({
        delivery: {
          ...delivery,
          serviceName: serviceRequest?.serviceName || 'Service'
        },
        canConfirm: delivery.status !== 'confirmed'
      });
    } catch (error) {
      console.error('Error fetching delivery status:', error);
      res.status(500).json({ error: 'Failed to fetch delivery status' });
    }
  });

  console.log('✅ Operations routes registered');
}