import { eq, and, desc, asc, like, inArray, isNull, sql, count, avg } from "drizzle-orm";
import { Request, Response, Application } from "express";
import { db } from "./db";
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  type AuthenticatedRequest
} from './rbac-middleware';

// Middleware chains for QC routes
const requireQCAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.QC_EXECUTIVE)] as const;
const requireOpsManager = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_MANAGER)] as const;
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
  // QC Dashboard - requires QC Executive or higher
  app.get('/api/qc/dashboard', ...requireQCAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tab = 'pending', search, priority, status, sort = 'assignedAt', order = 'desc' } = req.query;
      const currentUserId = req.user!.id;

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

  // ========== QC METRICS ==========
  // Requires QC Executive or higher
  app.get('/api/qc/metrics', ...requireQCAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { timeRange = '7d', serviceFilter = 'all', reviewerFilter = 'all' } = req.query;

      // Calculate date range
      let startDate: Date;
      switch (timeRange) {
        case '24h':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }

      // Get all reviews in the date range
      const reviews = await db.select()
        .from(qualityReviews)
        .where(sql`${qualityReviews.createdAt} >= ${startDate}`)
        .orderBy(desc(qualityReviews.createdAt));

      // Calculate metrics
      const totalReviews = reviews.length;
      const approvedReviews = reviews.filter(r => r.status === 'approved').length;
      const rejectedReviews = reviews.filter(r => r.status === 'rejected').length;
      const pendingReviews = reviews.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
      const reworkRequired = reviews.filter(r => r.status === 'rework_required').length;

      const avgQualityScore = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (Number(r.qualityScore) || 0), 0) / reviews.length
        : 0;

      // Calculate average review time (in minutes)
      const completedReviews = reviews.filter(r => r.completedAt && r.startedAt);
      const avgReviewTime = completedReviews.length > 0
        ? completedReviews.reduce((sum, r) => {
            const start = new Date(r.startedAt!).getTime();
            const end = new Date(r.completedAt!).getTime();
            return sum + (end - start) / (1000 * 60);
          }, 0) / completedReviews.length
        : 0;

      // Calculate SLA compliance
      const slaCompliant = reviews.filter(r => {
        if (!r.slaDeadline || !r.completedAt) return true;
        return new Date(r.completedAt) <= new Date(r.slaDeadline);
      }).length;

      // Generate trend data (last 7 days)
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const dayReviews = reviews.filter(r => {
          const created = new Date(r.createdAt || Date.now());
          return created >= dayStart && created <= dayEnd;
        });

        trendData.push({
          date: dayStart.toISOString().split('T')[0],
          total: dayReviews.length,
          approved: dayReviews.filter(r => r.status === 'approved').length,
          rejected: dayReviews.filter(r => r.status === 'rejected').length,
          avgScore: dayReviews.length > 0
            ? dayReviews.reduce((sum, r) => sum + (Number(r.qualityScore) || 0), 0) / dayReviews.length
            : 0,
        });
      }

      // Get top reviewers
      const reviewerStats: Record<number, { count: number, approved: number, avgScore: number, scores: number[] }> = {};
      reviews.forEach(r => {
        if (r.reviewerId) {
          if (!reviewerStats[r.reviewerId]) {
            reviewerStats[r.reviewerId] = { count: 0, approved: 0, avgScore: 0, scores: [] };
          }
          reviewerStats[r.reviewerId].count++;
          if (r.status === 'approved') reviewerStats[r.reviewerId].approved++;
          if (r.qualityScore) reviewerStats[r.reviewerId].scores.push(Number(r.qualityScore));
        }
      });

      const topReviewers = Object.entries(reviewerStats)
        .map(([id, stats]) => ({
          reviewerId: parseInt(id),
          reviewCount: stats.count,
          approvalRate: stats.count > 0 ? Math.round((stats.approved / stats.count) * 100) : 0,
          avgScore: stats.scores.length > 0 ? stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length : 0,
        }))
        .sort((a, b) => b.reviewCount - a.reviewCount)
        .slice(0, 5);

      const metrics = {
        summary: {
          totalReviews,
          approvedReviews,
          rejectedReviews,
          pendingReviews,
          reworkRequired,
          approvalRate: totalReviews > 0 ? Math.round((approvedReviews / totalReviews) * 100) : 0,
          rejectionRate: totalReviews > 0 ? Math.round((rejectedReviews / totalReviews) * 100) : 0,
          avgQualityScore: Math.round(avgQualityScore * 10) / 10,
          avgReviewTime: Math.round(avgReviewTime),
          slaCompliance: totalReviews > 0 ? Math.round((slaCompliant / totalReviews) * 100) : 100,
        },
        trends: trendData,
        topReviewers,
        breakdown: {
          byStatus: {
            approved: approvedReviews,
            rejected: rejectedReviews,
            pending: pendingReviews,
            rework: reworkRequired,
          },
          byPriority: {
            critical: reviews.filter(r => r.priority === 'critical').length,
            high: reviews.filter(r => r.priority === 'high').length,
            medium: reviews.filter(r => r.priority === 'medium').length,
            low: reviews.filter(r => r.priority === 'low').length,
          },
        },
      };

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching QC metrics:', error);
      res.status(500).json({ error: 'Failed to fetch QC metrics' });
    }
  });

  // ========== QC QUEUE MANAGEMENT ==========
  // Requires QC Executive or higher
  app.get('/api/qc/queue', ...requireQCAccess, async (req: AuthenticatedRequest, res: Response) => {
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
  // Requires QC Executive or higher
  app.get('/api/qc/team', ...requireQCAccess, async (req: AuthenticatedRequest, res: Response) => {
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
              AND ${qualityReviews.status} = ${QC_REVIEW_STATUS.IN_PROGRESS}
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
  // Requires QC Executive or higher
  app.get('/api/qc/checklist/:serviceType', ...requireQCAccess, async (req: AuthenticatedRequest, res: Response) => {
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

  // Start QC Review - Requires QC Executive or higher
  app.post('/api/qc/reviews/:reviewId/start', ...requireQCAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reviewId } = req.params;
      const currentUserId = req.user!.id;

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

  // Submit QC Review - Requires QC Executive or higher
  app.post('/api/qc/reviews/:reviewId/submit', ...requireQCAccess, async (req: AuthenticatedRequest, res: Response) => {
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

      const currentUserId = req.user!.id;

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

  // Assign Review - Requires Ops Manager (only managers can assign reviews)
  app.post('/api/qc/reviews/:reviewId/assign', ...requireOpsManager, async (req: AuthenticatedRequest, res: Response) => {
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

  // Auto-assign reviews - Requires Ops Manager
  app.post('/api/qc/reviews/auto-assign', ...requireOpsManager, async (req: AuthenticatedRequest, res: Response) => {
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
              AND ${qualityReviews.status} = ${QC_REVIEW_STATUS.IN_PROGRESS}
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