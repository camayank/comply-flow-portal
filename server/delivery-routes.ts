import { eq, and, desc, sql } from "drizzle-orm";
import { Request, Response, Application } from "express";
import { db } from "./db";
import {
  deliveryConfirmations,
  qualityReviews,
  serviceRequests,
  businessEntities,
  services,
  clientFeedback,
  notifications,
  documentVault,
  type InsertDeliveryConfirmation,
  type InsertClientFeedback,
  DELIVERY_STATUS,
  QC_REVIEW_STATUS
} from "@shared/schema";

export function registerDeliveryRoutes(app: Application) {
  console.log('📦 Registering Delivery routes...');

  // ========== DELIVERY CONFIRMATION ==========
  
  // Get delivery details for confirmation
  app.get('/api/delivery/:deliveryId', async (req: Request, res: Response) => {
    try {
      const { deliveryId } = req.params;
      const { token } = req.query;

      // TODO: Validate confirmation token for security
      
      const [deliveryDetails] = await db
        .select({
          serviceRequest: {
            id: serviceRequests.id,
            serviceId: serviceRequests.serviceId,
            status: serviceRequests.status,
            priority: serviceRequests.priority,
            createdAt: serviceRequests.createdAt,
            completedAt: serviceRequests.actualCompletion
          },
          deliveryConfirmation: {
            id: deliveryConfirmations.id,
            serviceRequestId: deliveryConfirmations.serviceRequestId,
            qualityReviewId: deliveryConfirmations.qualityReviewId,
            clientId: deliveryConfirmations.clientId,
            deliveryMethod: deliveryConfirmations.deliveryMethod,
            deliveredBy: deliveryConfirmations.deliveredBy,
            deliveredAt: deliveryConfirmations.deliveredAt,
            clientConfirmedAt: deliveryConfirmations.clientConfirmedAt,
            confirmationMethod: deliveryConfirmations.confirmationMethod,
            status: deliveryConfirmations.status,
            deliveryNotes: deliveryConfirmations.deliveryNotes,
            handoffDocument: deliveryConfirmations.handoffDocument,
            deliverables: deliveryConfirmations.deliverables,
            accessInstructions: deliveryConfirmations.accessInstructions,
            satisfactionRating: deliveryConfirmations.satisfactionRating
          },
          clientName: businessEntities.name,
          serviceName: services.name,
          qualityScore: qualityReviews.qualityScore,
          qcNotes: qualityReviews.reviewNotes
        })
        .from(deliveryConfirmations)
        .innerJoin(serviceRequests, eq(deliveryConfirmations.serviceRequestId, serviceRequests.id))
        .innerJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .innerJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .innerJoin(qualityReviews, eq(deliveryConfirmations.qualityReviewId, qualityReviews.id))
        .where(eq(deliveryConfirmations.id, parseInt(deliveryId)))
        .limit(1);

      if (!deliveryDetails) {
        return res.status(404).json({ error: 'Delivery confirmation not found' });
      }

      // Get deliverables from document vault
      const deliverables = await db
        .select({
          id: documentVault.id,
          name: documentVault.fileName,
          originalName: documentVault.originalFileName,
          type: documentVault.documentType,
          size: sql<string>`CONCAT(ROUND(${documentVault.fileSize} / 1024.0, 1), ' KB')`,
          downloadUrl: documentVault.fileUrl,
          description: sql<string>`COALESCE(${documentVault.documentType}, 'Document')`,
          isOfficial: documentVault.isOfficial,
          verificationStatus: documentVault.aiVerificationStatus
        })
        .from(documentVault)
        .where(eq(documentVault.serviceRequestId, deliveryDetails.serviceRequest.id));

      // Build handoff document with QC information
      const handoffDocument = {
        qcApprovalDate: new Date().toISOString(),
        qualityScore: deliveryDetails.qualityScore || 0,
        reviewNotes: deliveryDetails.qcNotes || '',
        completionSummary: `Your ${deliveryDetails.serviceName} has been completed successfully and has passed our quality control review with a score of ${deliveryDetails.qualityScore}%. All deliverables have been prepared and are ready for download.`,
        nextSteps: [
          'Download all deliverables from the links provided above',
          'Review all documents for accuracy and completeness',
          'Contact our support team if you have any questions',
          'Keep these documents safe for your records'
        ],
        warranties: [
          'All documents are guaranteed to be accurate and complete',
          'We provide 30 days of post-delivery support',
          'Any errors identified within 7 days will be corrected free of charge'
        ],
        supportInfo: {
          contactName: 'Customer Success Team',
          contactEmail: 'support@digicomply.in',
          contactPhone: '+91-9876543210',
          supportHours: 'Monday to Friday, 9 AM to 6 PM IST'
        },
        ...deliveryDetails.deliveryConfirmation.handoffDocument
      };

      res.json({
        serviceRequest: deliveryDetails.serviceRequest,
        deliveryConfirmation: deliveryDetails.deliveryConfirmation,
        deliverables,
        handoffDocument,
        clientName: deliveryDetails.clientName,
        serviceName: deliveryDetails.serviceName
      });

    } catch (error) {
      console.error('Error fetching delivery details:', error);
      res.status(500).json({ error: 'Failed to fetch delivery details' });
    }
  });

  // Confirm delivery reception by client
  app.post('/api/delivery/:deliveryId/confirm', async (req: Request, res: Response) => {
    try {
      const { deliveryId } = req.params;
      const { confirmationMethod, clientSignature } = req.body;

      // Update delivery confirmation
      await db
        .update(deliveryConfirmations)
        .set({
          clientConfirmedAt: new Date(),
          confirmationMethod: confirmationMethod || 'portal_click',
          clientSignature,
          status: DELIVERY_STATUS.CLIENT_CONFIRMED,
          updatedAt: new Date()
        })
        .where(eq(deliveryConfirmations.id, parseInt(deliveryId)));

      // Get delivery details for notifications
      const [delivery] = await db
        .select({
          serviceRequestId: deliveryConfirmations.serviceRequestId,
          clientId: deliveryConfirmations.clientId,
          deliveredBy: deliveryConfirmations.deliveredBy
        })
        .from(deliveryConfirmations)
        .where(eq(deliveryConfirmations.id, parseInt(deliveryId)))
        .limit(1);

      if (delivery) {
        // Update service request to completed status
        await db
          .update(serviceRequests)
          .set({
            status: 'completed',
            actualCompletion: new Date(),
            updatedAt: new Date()
          })
          .where(eq(serviceRequests.id, delivery.serviceRequestId));

        // Notify the delivery team member
        await db.insert(notifications).values({
          userId: delivery.deliveredBy,
          title: 'Delivery Confirmed by Client',
          message: `Client has confirmed receipt of service delivery for request #${delivery.serviceRequestId}`,
          type: 'delivery_confirmed',
          category: 'service',
          priority: 'normal',
          actionUrl: `/ops/service-requests/${delivery.serviceRequestId}`,
          actionText: 'View Details'
        });

        // Notify admin team
        await db.insert(notifications).values({
          userId: 1, // Admin user ID
          title: 'Service Delivery Completed',
          message: `Service request #${delivery.serviceRequestId} has been successfully delivered and confirmed by client`,
          type: 'service_completed',
          category: 'service',
          priority: 'low',
          actionUrl: `/admin/completed-services`,
          actionText: 'View Report'
        });
      }

      res.json({ 
        success: true, 
        message: 'Delivery confirmation recorded successfully' 
      });

    } catch (error) {
      console.error('Error confirming delivery:', error);
      res.status(500).json({ error: 'Failed to confirm delivery' });
    }
  });

  // Submit client feedback
  app.post('/api/delivery/:deliveryId/feedback', async (req: Request, res: Response) => {
    try {
      const { deliveryId } = req.params;
      const feedbackData = req.body;

      // Get delivery details
      const [delivery] = await db
        .select({
          serviceRequestId: deliveryConfirmations.serviceRequestId,
          clientId: deliveryConfirmations.clientId
        })
        .from(deliveryConfirmations)
        .where(eq(deliveryConfirmations.id, parseInt(deliveryId)))
        .limit(1);

      if (!delivery) {
        return res.status(404).json({ error: 'Delivery not found' });
      }

      // Insert client feedback
      await db.insert(clientFeedback).values({
        serviceRequestId: delivery.serviceRequestId,
        deliveryConfirmationId: parseInt(deliveryId),
        clientId: delivery.clientId,
        overallRating: feedbackData.overallRating,
        serviceQuality: feedbackData.serviceQuality,
        timeliness: feedbackData.timeliness,
        communication: feedbackData.communication,
        documentation: feedbackData.documentation,
        positiveAspects: feedbackData.positiveAspects,
        improvementSuggestions: feedbackData.improvementSuggestions,
        additionalComments: feedbackData.additionalComments,
        npsScore: feedbackData.npsScore,
        wouldRecommend: feedbackData.wouldRecommend,
        hasIssues: feedbackData.hasIssues,
        issuesDescription: feedbackData.issuesDescription,
        serviceCategory: feedbackData.serviceCategory,
        specificService: feedbackData.specificService,
        feedbackChannel: feedbackData.feedbackChannel || 'portal'
      });

      // Update delivery confirmation with satisfaction rating
      await db
        .update(deliveryConfirmations)
        .set({
          satisfactionRating: feedbackData.overallRating,
          updatedAt: new Date()
        })
        .where(eq(deliveryConfirmations.id, parseInt(deliveryId)));

      // Create notification for low ratings
      if (feedbackData.overallRating <= 3 || feedbackData.hasIssues) {
        await db.insert(notifications).values({
          userId: 1, // Admin/Support team
          title: 'Low Client Satisfaction Alert',
          message: `Service request #${delivery.serviceRequestId} received low satisfaction rating (${feedbackData.overallRating}/5). Immediate attention required.`,
          type: 'low_satisfaction',
          category: 'service',
          priority: 'high',
          actionUrl: `/admin/feedback/${delivery.serviceRequestId}`,
          actionText: 'Review Feedback'
        });
      }

      res.json({ 
        success: true, 
        message: 'Feedback submitted successfully. Thank you for your input!' 
      });

    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  });

  // ========== DELIVERY MANAGEMENT (Internal) ==========

  // Get all pending deliveries for ops team
  app.get('/api/delivery/pending', async (req: Request, res: Response) => {
    try {
      const pendingDeliveries = await db
        .select({
          id: deliveryConfirmations.id,
          serviceRequestId: deliveryConfirmations.serviceRequestId,
          clientName: businessEntities.name,
          serviceName: services.name,
          deliveryMethod: deliveryConfirmations.deliveryMethod,
          deliveredAt: deliveryConfirmations.deliveredAt,
          status: deliveryConfirmations.status,
          priority: serviceRequests.priority,
          deliverables: deliveryConfirmations.deliverables,
          qualityScore: qualityReviews.qualityScore
        })
        .from(deliveryConfirmations)
        .innerJoin(serviceRequests, eq(deliveryConfirmations.serviceRequestId, serviceRequests.id))
        .innerJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .innerJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .innerJoin(qualityReviews, eq(deliveryConfirmations.qualityReviewId, qualityReviews.id))
        .where(eq(deliveryConfirmations.status, DELIVERY_STATUS.READY_FOR_DELIVERY))
        .orderBy(desc(deliveryConfirmations.deliveredAt));

      res.json(pendingDeliveries);

    } catch (error) {
      console.error('Error fetching pending deliveries:', error);
      res.status(500).json({ error: 'Failed to fetch pending deliveries' });
    }
  });

  // Initiate delivery process
  app.post('/api/delivery/initiate', async (req: Request, res: Response) => {
    try {
      const { 
        serviceRequestId, 
        qualityReviewId, 
        deliveryMethod, 
        deliveryNotes,
        deliverables,
        accessInstructions 
      } = req.body;
      
      const currentUserId = req.session?.userId || 1;

      // Get service request details
      const [serviceRequest] = await db
        .select({
          businessEntityId: serviceRequests.businessEntityId,
          serviceId: serviceRequests.serviceId
        })
        .from(serviceRequests)
        .where(eq(serviceRequests.id, serviceRequestId))
        .limit(1);

      if (!serviceRequest) {
        return res.status(404).json({ error: 'Service request not found' });
      }

      // Create delivery confirmation record
      const [delivery] = await db
        .insert(deliveryConfirmations)
        .values({
          serviceRequestId,
          qualityReviewId,
          clientId: serviceRequest.businessEntityId,
          deliveryMethod: deliveryMethod || 'portal_download',
          deliveredBy: currentUserId,
          status: DELIVERY_STATUS.READY_FOR_DELIVERY,
          deliveryNotes,
          deliverables: deliverables || [],
          accessInstructions,
          handoffDocument: {
            deliveryInitiated: new Date().toISOString(),
            deliveredBy: currentUserId
          }
        })
        .returning();

      // Generate delivery confirmation link (for email notifications)
      const confirmationToken = Buffer.from(`${delivery.id}:${Date.now()}`).toString('base64');
      const confirmationUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/delivery/${delivery.id}?token=${confirmationToken}`;

      // Send notification to client (via email or in-app)
      await db.insert(notifications).values({
        userId: serviceRequest.businessEntityId, // Assuming client user ID
        title: 'Service Delivery Ready',
        message: `Your service has been completed and is ready for delivery. Please confirm receipt when you have reviewed the deliverables.`,
        type: 'delivery_ready',
        category: 'service',
        priority: 'normal',
        actionUrl: `/delivery/${delivery.id}`,
        actionText: 'View Delivery',
        metadata: {
          deliveryId: delivery.id,
          confirmationUrl
        }
      });

      res.json({ 
        success: true, 
        deliveryId: delivery.id,
        confirmationUrl,
        message: 'Delivery initiated successfully' 
      });

    } catch (error) {
      console.error('Error initiating delivery:', error);
      res.status(500).json({ error: 'Failed to initiate delivery' });
    }
  });

  // Get delivery statistics
  app.get('/api/delivery/stats', async (req: Request, res: Response) => {
    try {
      const { timeRange = '30d' } = req.query;
      
      // Calculate date range
      const daysBack = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysBack);

      const [stats] = await db
        .select({
          totalDeliveries: sql<number>`COUNT(*)`,
          confirmedDeliveries: sql<number>`SUM(CASE WHEN ${deliveryConfirmations.status} = '${DELIVERY_STATUS.CLIENT_CONFIRMED}' THEN 1 ELSE 0 END)`,
          avgSatisfactionRating: sql<number>`AVG(${deliveryConfirmations.satisfactionRating})`,
          avgConfirmationTime: sql<number>`
            AVG(
              CASE WHEN ${deliveryConfirmations.clientConfirmedAt} IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (${deliveryConfirmations.clientConfirmedAt} - ${deliveryConfirmations.deliveredAt})) / 3600
              ELSE NULL END
            )
          `,
          pendingConfirmations: sql<number>`SUM(CASE WHEN ${deliveryConfirmations.status} = '${DELIVERY_STATUS.READY_FOR_DELIVERY}' THEN 1 ELSE 0 END)`
        })
        .from(deliveryConfirmations)
        .where(sql`${deliveryConfirmations.deliveredAt} >= ${fromDate}`);

      // Get delivery method breakdown
      const methodBreakdown = await db
        .select({
          method: deliveryConfirmations.deliveryMethod,
          count: sql<number>`COUNT(*)`
        })
        .from(deliveryConfirmations)
        .where(sql`${deliveryConfirmations.deliveredAt} >= ${fromDate}`)
        .groupBy(deliveryConfirmations.deliveryMethod);

      res.json({
        overview: {
          totalDeliveries: stats.totalDeliveries || 0,
          confirmedDeliveries: stats.confirmedDeliveries || 0,
          confirmationRate: stats.totalDeliveries > 0 ? 
            Math.round((stats.confirmedDeliveries / stats.totalDeliveries) * 100) : 0,
          avgSatisfactionRating: Number((stats.avgSatisfactionRating || 0).toFixed(1)),
          avgConfirmationTime: Math.round(stats.avgConfirmationTime || 0),
          pendingConfirmations: stats.pendingConfirmations || 0
        },
        methodBreakdown,
        timeRange
      });

    } catch (error) {
      console.error('Error fetching delivery stats:', error);
      res.status(500).json({ error: 'Failed to fetch delivery statistics' });
    }
  });

  console.log('✅ Delivery routes registered');
}