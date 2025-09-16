import { eq, and, desc, asc, like, inArray, isNull, sql, count, avg } from "drizzle-orm";
import { Request, Response, Application } from "express";
import { db } from "./db";
import {
  qualityReviews,
  deliveryConfirmations,
  qualityMetrics,
  clientFeedback,
  qualityChecklists,
  serviceRequests,
  users,
  businessEntities,
  services,
  notifications,
  type InsertQualityReview,
  type InsertDeliveryConfirmation,
  type InsertQualityMetrics,
  type InsertClientFeedback,
  type QualityReview,
  QC_REVIEW_STATUS,
  DELIVERY_STATUS,
  QUALITY_SCORE
} from "@shared/schema";

export function registerQCRoutes(app: Application) {
  console.log('🔍 Registering QC routes...');

  // ========== QC DASHBOARD ==========
  app.get('/api/qc/dashboard', async (req: Request, res: Response) => {
    try {
      const { tab = 'pending', search, priority, status, sort = 'assignedAt', order = 'desc' } = req.query;
      const currentUserId = req.session?.userId || 1; // TODO: Get from session

      // Base query for service requests ready for QC
      let baseQuery = db
        .select({
          id: serviceRequests.id,
          serviceId: serviceRequests.serviceId,
          status: serviceRequests.status,
          priority: serviceRequests.priority,
          clientName: sql<string>`COALESCE(${businessEntities.name}, 'Unknown Client')`,
          serviceName: sql<string>`COALESCE(${services.name}, 'Unknown Service')`,
          serviceType: services.type,
          assignedAt: serviceRequests.createdAt,
          slaDeadline: serviceRequests.slaDeadline,
          qualityReview: {
            id: qualityReviews.id,
            status: qualityReviews.status,
            reviewerId: qualityReviews.reviewerId,
            qualityScore: qualityReviews.qualityScore,
            assignedAt: qualityReviews.assignedAt,
            slaDeadline: qualityReviews.slaDeadline
          }
        })
        .from(serviceRequests)
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .leftJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .leftJoin(qualityReviews, eq(serviceRequests.id, qualityReviews.serviceRequestId))
        .where(
          and(
            inArray(serviceRequests.status, ['completed', 'qc_review']),
            ...(search ? [like(businessEntities.name, `%${search}%`)] : []),
            ...(priority ? [eq(serviceRequests.priority, priority as string)] : []),
            ...(status ? [eq(qualityReviews.status, status as string)] : [])
          )
        );

      // Apply tab-specific filters
      if (tab === 'pending') {
        baseQuery = baseQuery.where(
          and(
            isNull(qualityReviews.reviewerId),
            inArray(qualityReviews.status, [QC_REVIEW_STATUS.PENDING])
          )
        );
      } else if (tab === 'assigned') {
        baseQuery = baseQuery.where(
          and(
            eq(qualityReviews.reviewerId, currentUserId),
            inArray(qualityReviews.status, [QC_REVIEW_STATUS.IN_PROGRESS, QC_REVIEW_STATUS.PENDING])
          )
        );
      } else if (tab === 'completed') {
        baseQuery = baseQuery.where(
          inArray(qualityReviews.status, [QC_REVIEW_STATUS.APPROVED, QC_REVIEW_STATUS.REJECTED])
        );
      }

      // Apply sorting
      if (sort === 'priority') {
        baseQuery = baseQuery.orderBy(
          order === 'desc' ? desc(serviceRequests.priority) : asc(serviceRequests.priority)
        );
      } else if (sort === 'assignedAt') {
        baseQuery = baseQuery.orderBy(
          order === 'desc' ? desc(qualityReviews.assignedAt) : asc(qualityReviews.assignedAt)
        );
      } else if (sort === 'deadline') {
        baseQuery = baseQuery.orderBy(
          order === 'desc' ? desc(qualityReviews.slaDeadline) : asc(qualityReviews.slaDeadline)
        );
      }

      const results = await baseQuery;

      // Get dashboard statistics
      const stats = await Promise.all([
        // Total pending reviews
        db.select({ count: count() })
          .from(qualityReviews)
          .where(eq(qualityReviews.status, QC_REVIEW_STATUS.PENDING)),
        
        // My assigned reviews
        db.select({ count: count() })
          .from(qualityReviews)
          .where(
            and(
              eq(qualityReviews.reviewerId, currentUserId),
              inArray(qualityReviews.status, [QC_REVIEW_STATUS.IN_PROGRESS, QC_REVIEW_STATUS.PENDING])
            )
          ),
        
        // Completed today
        db.select({ count: count() })
          .from(qualityReviews)
          .where(
            and(
              eq(qualityReviews.status, QC_REVIEW_STATUS.APPROVED),
              sql`DATE(${qualityReviews.reviewCompletedAt}) = CURRENT_DATE`
            )
          ),
        
        // Average review time (in minutes)
        db.select({ 
          avgTime: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${qualityReviews.reviewCompletedAt} - ${qualityReviews.reviewStartedAt})) / 60), 0)` 
        })
          .from(qualityReviews)
          .where(
            and(
              eq(qualityReviews.status, QC_REVIEW_STATUS.APPROVED),
              sql`${qualityReviews.reviewCompletedAt} IS NOT NULL`,
              sql`${qualityReviews.reviewStartedAt} IS NOT NULL`
            )
          ),
        
        // Average quality score
        db.select({ avgScore: sql<number>`COALESCE(AVG(${qualityReviews.qualityScore}), 0)` })
          .from(qualityReviews)
          .where(sql`${qualityReviews.qualityScore} IS NOT NULL`),
        
        // SLA compliance percentage
        db.select({ 
          compliance: sql<number>`
            COALESCE(
              AVG(CASE WHEN ${qualityReviews.reviewCompletedAt} <= ${qualityReviews.slaDeadline} THEN 100 ELSE 0 END), 
              0
            )
          ` 
        })
          .from(qualityReviews)
          .where(
            and(
              inArray(qualityReviews.status, [QC_REVIEW_STATUS.APPROVED, QC_REVIEW_STATUS.REJECTED]),
              sql`${qualityReviews.reviewCompletedAt} IS NOT NULL`
            )
          )
      ]);

      // Group results by tab
      const pendingReviews = results.filter(r => !r.qualityReview?.reviewerId);
      const myReviews = results.filter(r => r.qualityReview?.reviewerId === currentUserId);
      const completed = results.filter(r => 
        r.qualityReview?.status === QC_REVIEW_STATUS.APPROVED || 
        r.qualityReview?.status === QC_REVIEW_STATUS.REJECTED
      );

      res.json({
        pendingReviews,
        myReviews,
        completed,
        stats: {
          totalPending: stats[0][0]?.count || 0,
          myAssigned: stats[1][0]?.count || 0,
          completedToday: stats[2][0]?.count || 0,
          avgReviewTime: Math.round(stats[3][0]?.avgTime || 0),
          qualityScore: Math.round(stats[4][0]?.avgScore || 0),
          slaCompliance: Math.round(stats[5][0]?.compliance || 0)
        }
      });

    } catch (error) {
      console.error('Error fetching QC dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch QC dashboard data' });
    }
  });

  // ========== QC QUEUE MANAGEMENT ==========
  app.get('/api/qc/queue', async (req: Request, res: Response) => {
    try {
      const { sort = 'priority', order = 'desc', status, priority, assignee, search } = req.query;

      let query = db
        .select({
          id: qualityReviews.id,
          serviceRequestId: qualityReviews.serviceRequestId,
          clientName: sql<string>`COALESCE(${businessEntities.name}, 'Unknown Client')`,
          serviceName: sql<string>`COALESCE(${services.name}, 'Unknown Service')`,
          serviceType: services.type,
          priority: serviceRequests.priority,
          status: qualityReviews.status,
          assignedAt: qualityReviews.assignedAt,
          assignedTo: qualityReviews.reviewerId,
          assignedToName: sql<string>`reviewer.username`,
          slaDeadline: qualityReviews.slaDeadline,
          estimatedTime: sql<number>`30`, // Default 30 minutes
          qualityScore: qualityReviews.qualityScore,
          reviewerId: qualityReviews.reviewerId,
          reviewerName: sql<string>`reviewer.username`
        })
        .from(qualityReviews)
        .leftJoin(serviceRequests, eq(qualityReviews.serviceRequestId, serviceRequests.id))
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .leftJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .leftJoin(users, eq(qualityReviews.reviewerId, users.id))
        .leftJoin(users.as('reviewer'), eq(qualityReviews.reviewerId, users.id));

      // Apply filters
      const conditions = [];
      if (status) conditions.push(eq(qualityReviews.status, status as string));
      if (priority) conditions.push(eq(serviceRequests.priority, priority as string));
      if (assignee === 'unassigned') conditions.push(isNull(qualityReviews.reviewerId));
      else if (assignee) conditions.push(eq(qualityReviews.reviewerId, parseInt(assignee as string)));
      if (search) {
        conditions.push(
          sql`(${businessEntities.name} ILIKE ${'%' + search + '%'} OR ${services.name} ILIKE ${'%' + search + '%'})`
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const items = await query;

      // Calculate queue statistics
      const [stats] = await db
        .select({
          totalItems: count(),
          highPriority: sql<number>`SUM(CASE WHEN ${serviceRequests.priority} IN ('high', 'urgent', 'critical') THEN 1 ELSE 0 END)`,
          overdue: sql<number>`SUM(CASE WHEN ${qualityReviews.slaDeadline} < NOW() THEN 1 ELSE 0 END)`,
          avgWaitTime: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - ${qualityReviews.assignedAt})) / 3600), 0)`,
          qcTeamUtilization: sql<number>`75` // Placeholder
        })
        .from(qualityReviews)
        .leftJoin(serviceRequests, eq(qualityReviews.serviceRequestId, serviceRequests.id));

      res.json({
        items,
        stats: {
          totalItems: stats.totalItems || 0,
          highPriority: stats.highPriority || 0,
          overdue: stats.overdue || 0,
          avgWaitTime: Math.round(stats.avgWaitTime || 0),
          qcTeamUtilization: stats.qcTeamUtilization || 0
        }
      });

    } catch (error) {
      console.error('Error fetching QC queue:', error);
      res.status(500).json({ error: 'Failed to fetch QC queue data' });
    }
  });

  // ========== QC TEAM MANAGEMENT ==========
  app.get('/api/qc/team', async (req: Request, res: Response) => {
    try {
      const team = await db
        .select({
          id: users.id,
          name: users.username,
          email: users.email,
          activeReviews: sql<number>`
            COALESCE((
              SELECT COUNT(*) 
              FROM ${qualityReviews} 
              WHERE ${qualityReviews.reviewerId} = ${users.id} 
              AND ${qualityReviews.status} = '${QC_REVIEW_STATUS.IN_PROGRESS}'
            ), 0)
          `
        })
        .from(users)
        .where(eq(users.role, 'qc'));

      res.json(team);

    } catch (error) {
      console.error('Error fetching QC team:', error);
      res.status(500).json({ error: 'Failed to fetch QC team data' });
    }
  });

  // ========== QUALITY CHECKLISTS ==========
  app.get('/api/qc/checklist/:serviceType', async (req: Request, res: Response) => {
    try {
      const { serviceType } = req.params;

      const [checklist] = await db
        .select()
        .from(qualityChecklists)
        .where(
          and(
            eq(qualityChecklists.serviceType, serviceType),
            eq(qualityChecklists.isActive, true),
            eq(qualityChecklists.isDefault, true)
          )
        )
        .limit(1);

      if (!checklist) {
        // Return default checklist if none found
        const defaultChecklist = {
          checklistItems: [
            {
              id: 'doc_completeness',
              category: 'Documentation',
              item: 'All required documents are complete and accurate',
              status: 'pending',
              isMandatory: true,
              weight: 20
            },
            {
              id: 'legal_compliance',
              category: 'Compliance',
              item: 'Service meets all legal and regulatory requirements',
              status: 'pending',
              isMandatory: true,
              weight: 25
            },
            {
              id: 'data_accuracy',
              category: 'Quality',
              item: 'All data entries are accurate and verified',
              status: 'pending',
              isMandatory: true,
              weight: 20
            },
            {
              id: 'client_requirements',
              category: 'Requirements',
              item: 'Service fulfills all client requirements',
              status: 'pending',
              isMandatory: true,
              weight: 15
            },
            {
              id: 'formatting',
              category: 'Presentation',
              item: 'Documents are properly formatted and professional',
              status: 'pending',
              isMandatory: false,
              weight: 10
            },
            {
              id: 'timeline_adherence',
              category: 'Process',
              item: 'Service completed within agreed timeline',
              status: 'pending',
              isMandatory: false,
              weight: 10
            }
          ],
          approvalThreshold: 80,
          escalationThreshold: 60
        };

        res.json(defaultChecklist);
        return;
      }

      res.json({
        checklistItems: checklist.checklistItems,
        approvalThreshold: checklist.approvalThreshold,
        escalationThreshold: checklist.escalationThreshold
      });

    } catch (error) {
      console.error('Error fetching quality checklist:', error);
      res.status(500).json({ error: 'Failed to fetch quality checklist' });
    }
  });

  // ========== QC REVIEW OPERATIONS ==========
  
  // Start QC Review
  app.post('/api/qc/reviews/:reviewId/start', async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const currentUserId = req.session?.userId || 1;

      await db
        .update(qualityReviews)
        .set({
          status: QC_REVIEW_STATUS.IN_PROGRESS,
          reviewerId: currentUserId,
          reviewStartedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(qualityReviews.id, parseInt(reviewId)));

      res.json({ success: true, message: 'QC review started successfully' });

    } catch (error) {
      console.error('Error starting QC review:', error);
      res.status(500).json({ error: 'Failed to start QC review' });
    }
  });

  // Submit QC Review
  app.post('/api/qc/reviews/:reviewId/submit', async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const { 
        status, 
        qualityScore, 
        checklist, 
        reviewNotes, 
        internalComments,
        clientFacingNotes,
        reworkInstructions 
      } = req.body;

      const currentUserId = req.session?.userId || 1;

      // Update quality review
      await db
        .update(qualityReviews)
        .set({
          status,
          qualityScore,
          checklist,
          reviewNotes: clientFacingNotes || reviewNotes,
          internalComments,
          ...(status === QC_REVIEW_STATUS.REWORK_REQUIRED && { reworkInstructions }),
          reviewCompletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(qualityReviews.id, parseInt(reviewId)));

      // Get service request details for notifications
      const [serviceRequest] = await db
        .select({
          id: serviceRequests.id,
          businessEntityId: serviceRequests.businessEntityId,
          serviceId: serviceRequests.serviceId,
          assignedTeamMember: serviceRequests.assignedTeamMember
        })
        .from(serviceRequests)
        .innerJoin(qualityReviews, eq(serviceRequests.id, qualityReviews.serviceRequestId))
        .where(eq(qualityReviews.id, parseInt(reviewId)))
        .limit(1);

      if (serviceRequest) {
        // Update service request status based on QC result
        let newServiceStatus = serviceRequest.status;
        if (status === QC_REVIEW_STATUS.APPROVED) {
          newServiceStatus = 'ready_for_delivery';
        } else if (status === QC_REVIEW_STATUS.REJECTED || status === QC_REVIEW_STATUS.REWORK_REQUIRED) {
          newServiceStatus = 'in_progress';
        }

        await db
          .update(serviceRequests)
          .set({
            status: newServiceStatus,
            updatedAt: new Date()
          })
          .where(eq(serviceRequests.id, serviceRequest.id));

        // Create notification for ops team if rework is required
        if (status === QC_REVIEW_STATUS.REWORK_REQUIRED && serviceRequest.assignedTeamMember) {
          await db.insert(notifications).values({
            userId: serviceRequest.assignedTeamMember,
            title: 'QC Review: Rework Required',
            message: `Service request #${serviceRequest.id} requires rework. Please review QC feedback and make necessary corrections.`,
            type: 'qc_rework',
            category: 'service',
            priority: 'high',
            actionUrl: `/ops/service-requests/${serviceRequest.id}`,
            actionText: 'View Details'
          });
        }

        // Create delivery confirmation record if approved
        if (status === QC_REVIEW_STATUS.APPROVED) {
          await db.insert(deliveryConfirmations).values({
            serviceRequestId: serviceRequest.id,
            qualityReviewId: parseInt(reviewId),
            clientId: serviceRequest.businessEntityId,
            deliveryMethod: 'portal_download',
            deliveredBy: currentUserId,
            status: DELIVERY_STATUS.READY_FOR_DELIVERY,
            deliverables: [],
            handoffDocument: {
              qcApprovalDate: new Date().toISOString(),
              qualityScore,
              reviewNotes: clientFacingNotes || reviewNotes
            }
          });
        }

        // Calculate and store quality metrics
        await calculateQualityMetrics(parseInt(reviewId), serviceRequest.id);
      }

      res.json({ success: true, message: 'QC review submitted successfully' });

    } catch (error) {
      console.error('Error submitting QC review:', error);
      res.status(500).json({ error: 'Failed to submit QC review' });
    }
  });

  // Assign Review
  app.post('/api/qc/reviews/:reviewId/assign', async (req: Request, res: Response) => {
    try {
      const { reviewId } = req.params;
      const { reviewerId } = req.body;

      await db
        .update(qualityReviews)
        .set({
          reviewerId,
          assignedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(qualityReviews.id, parseInt(reviewId)));

      // Notify assigned reviewer
      await db.insert(notifications).values({
        userId: reviewerId,
        title: 'New QC Review Assigned',
        message: `You have been assigned a new quality control review. Please begin the review process.`,
        type: 'qc_assignment',
        category: 'service',
        priority: 'normal',
        actionUrl: `/qc/reviews/${reviewId}`,
        actionText: 'Start Review'
      });

      res.json({ success: true, message: 'Review assigned successfully' });

    } catch (error) {
      console.error('Error assigning review:', error);
      res.status(500).json({ error: 'Failed to assign review' });
    }
  });

  // Auto-assign reviews
  app.post('/api/qc/reviews/auto-assign', async (req: Request, res: Response) => {
    try {
      // Get unassigned reviews
      const unassignedReviews = await db
        .select({ id: qualityReviews.id })
        .from(qualityReviews)
        .where(
          and(
            isNull(qualityReviews.reviewerId),
            eq(qualityReviews.status, QC_REVIEW_STATUS.PENDING)
          )
        );

      // Get QC team members with their current workload
      const qcTeam = await db
        .select({
          id: users.id,
          activeReviews: sql<number>`
            COALESCE((
              SELECT COUNT(*) 
              FROM ${qualityReviews} 
              WHERE ${qualityReviews.reviewerId} = ${users.id} 
              AND ${qualityReviews.status} = '${QC_REVIEW_STATUS.IN_PROGRESS}'
            ), 0)
          `
        })
        .from(users)
        .where(eq(users.role, 'qc'));

      if (qcTeam.length === 0) {
        res.status(400).json({ error: 'No QC team members available' });
        return;
      }

      // Auto-assign based on workload balancing
      let assignmentCount = 0;
      for (const review of unassignedReviews) {
        // Find team member with least active reviews
        const assignee = qcTeam.reduce((prev, current) => 
          (prev.activeReviews < current.activeReviews) ? prev : current
        );

        await db
          .update(qualityReviews)
          .set({
            reviewerId: assignee.id,
            assignedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(qualityReviews.id, review.id));

        // Update local counter
        assignee.activeReviews++;
        assignmentCount++;

        // Notify assigned reviewer
        await db.insert(notifications).values({
          userId: assignee.id,
          title: 'QC Review Auto-Assigned',
          message: `A new quality control review has been automatically assigned to you.`,
          type: 'qc_assignment',
          category: 'service',
          priority: 'normal',
          actionUrl: `/qc/dashboard`,
          actionText: 'View Dashboard'
        });
      }

      res.json({ 
        success: true, 
        message: `Successfully auto-assigned ${assignmentCount} reviews`,
        assignedCount: assignmentCount
      });

    } catch (error) {
      console.error('Error auto-assigning reviews:', error);
      res.status(500).json({ error: 'Failed to auto-assign reviews' });
    }
  });

  console.log('✅ QC routes registered');
}

// Helper function to calculate quality metrics
async function calculateQualityMetrics(qualityReviewId: number, serviceRequestId: number) {
  try {
    const [review] = await db
      .select()
      .from(qualityReviews)
      .where(eq(qualityReviews.id, qualityReviewId))
      .limit(1);

    if (!review || !review.reviewStartedAt || !review.reviewCompletedAt) {
      return;
    }

    const qcDuration = Math.floor(
      (new Date(review.reviewCompletedAt).getTime() - new Date(review.reviewStartedAt).getTime()) / (1000 * 60)
    );

    const slaCompliance = review.slaDeadline ? 
      new Date(review.reviewCompletedAt) <= new Date(review.slaDeadline) : true;

    const slaVariance = review.slaDeadline ? 
      Math.floor((new Date(review.reviewCompletedAt).getTime() - new Date(review.slaDeadline).getTime()) / (1000 * 60)) : 0;

    // Calculate checklist-based scores
    const checklist = review.checklist as any[] || [];
    const totalWeight = checklist.reduce((sum, item) => sum + (item.weight || 0), 0);
    const passedWeight = checklist
      .filter(item => item.status === 'passed')
      .reduce((sum, item) => sum + (item.weight || 0), 0);

    const documentQuality = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100;
    const processAdherence = review.qualityScore || 0;

    await db.insert(qualityMetrics).values({
      serviceRequestId,
      qualityReviewId,
      qcDuration,
      overallQualityScore: review.qualityScore || 0,
      documentQuality,
      processAdherence,
      clientCommunication: 85, // Placeholder
      defectCount: checklist.filter(item => item.status === 'failed').length,
      reworkCount: review.status === QC_REVIEW_STATUS.REWORK_REQUIRED ? 1 : 0,
      slaCompliance,
      slaVariance,
      reviewerEfficiency: qcDuration <= 30 ? 100 : Math.max(50, 100 - (qcDuration - 30) * 2),
      firstPassSuccess: review.status === QC_REVIEW_STATUS.APPROVED,
      performanceCategory: review.qualityScore && review.qualityScore >= QUALITY_SCORE.EXCELLENT ? 'excellent' :
                          review.qualityScore && review.qualityScore >= QUALITY_SCORE.GOOD ? 'good' :
                          review.qualityScore && review.qualityScore >= QUALITY_SCORE.SATISFACTORY ? 'average' : 'poor'
    });

  } catch (error) {
    console.error('Error calculating quality metrics:', error);
  }
}