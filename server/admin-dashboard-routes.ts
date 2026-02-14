/**
 * Admin Dashboard API Routes
 *
 * Provides organization-level statistics and activity for Admin users.
 * Requires minimum role of ADMIN.
 *
 * Endpoints:
 * - GET /api/admin/dashboard/stats - Organization statistics
 * - GET /api/admin/dashboard/activity - Recent activity feed
 * - GET /api/admin/dashboard/pending - Pending approvals/tasks
 * - GET /api/admin/dashboard/metrics - Key performance metrics
 */

import type { Express, Response } from "express";
import { db } from "./db";
import {
  users,
  serviceRequests,
  activityLogs,
  leads,
  salesProposals,
  payments,
  documentVault,
  qualityReviews,
  escalationExecutions,
  workItemQueue,
  businessEntities,
} from "@shared/schema";
import { eq, desc, and, sql, gte, count, lt, ne, isNull, or } from "drizzle-orm";
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  type AuthenticatedRequest,
} from "./rbac-middleware";

export function registerAdminDashboardRoutes(app: Express) {
  const adminAuth = [
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
  ] as const;

  /**
   * GET /api/admin/dashboard/stats
   *
   * Returns organization-level statistics:
   * - totalUsers, activeUsers, newUsersThisMonth
   * - totalServiceRequests, pendingRequests, completedRequests
   * - totalLeads, convertedLeads
   * - totalRevenue (this month)
   */
  app.get(
    "/api/admin/dashboard/stats",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Calculate date ranges
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Execute all queries in parallel for performance
        const [
          userStats,
          serviceRequestStats,
          leadStats,
          revenueStats,
          entityStats,
        ] = await Promise.all([
          // User statistics
          db
            .select({
              totalUsers: sql<number>`COUNT(*)::int`,
              activeUsers: sql<number>`COUNT(CASE WHEN ${users.isActive} = true THEN 1 END)::int`,
              newUsersThisMonth: sql<number>`COUNT(CASE WHEN ${users.createdAt} >= ${startOfMonth} THEN 1 END)::int`,
            })
            .from(users),

          // Service request statistics
          db
            .select({
              totalServiceRequests: sql<number>`COUNT(*)::int`,
              pendingRequests: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} IN ('initiated', 'docs_uploaded', 'in_progress') THEN 1 END)::int`,
              completedRequests: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'completed' THEN 1 END)::int`,
              inProgressRequests: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'in_progress' THEN 1 END)::int`,
              qcReviewRequests: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'qc_review' THEN 1 END)::int`,
            })
            .from(serviceRequests),

          // Lead statistics
          db
            .select({
              totalLeads: sql<number>`COUNT(*)::int`,
              convertedLeads: sql<number>`COUNT(CASE WHEN ${leads.status} = 'converted' OR ${leads.convertedAt} IS NOT NULL THEN 1 END)::int`,
              hotLeads: sql<number>`COUNT(CASE WHEN ${leads.leadStage} = 'hot_lead' THEN 1 END)::int`,
              newLeadsThisMonth: sql<number>`COUNT(CASE WHEN ${leads.createdAt} >= ${startOfMonth} THEN 1 END)::int`,
            })
            .from(leads),

          // Revenue statistics (this month)
          db
            .select({
              totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' AND ${payments.completedAt} >= ${startOfMonth} THEN ${payments.amount} ELSE 0 END), 0)::int`,
              totalRevenueAllTime: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)::int`,
              pendingPayments: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'pending' THEN ${payments.amount} ELSE 0 END), 0)::int`,
              transactionCount: sql<number>`COUNT(CASE WHEN ${payments.status} = 'completed' AND ${payments.completedAt} >= ${startOfMonth} THEN 1 END)::int`,
            })
            .from(payments),

          // Business entity statistics
          db
            .select({
              totalEntities: sql<number>`COUNT(*)::int`,
              activeEntities: sql<number>`COUNT(CASE WHEN ${businessEntities.isActive} = true THEN 1 END)::int`,
              newEntitiesThisMonth: sql<number>`COUNT(CASE WHEN ${businessEntities.createdAt} >= ${startOfMonth} THEN 1 END)::int`,
            })
            .from(businessEntities),
        ]);

        // Calculate derived metrics
        const conversionRate =
          leadStats[0].totalLeads > 0
            ? Math.round(
                (leadStats[0].convertedLeads / leadStats[0].totalLeads) * 100
              )
            : 0;

        const completionRate =
          serviceRequestStats[0].totalServiceRequests > 0
            ? Math.round(
                (serviceRequestStats[0].completedRequests /
                  serviceRequestStats[0].totalServiceRequests) *
                  100
              )
            : 0;

        res.json({
          success: true,
          data: {
            users: {
              total: userStats[0].totalUsers,
              active: userStats[0].activeUsers,
              newThisMonth: userStats[0].newUsersThisMonth,
            },
            serviceRequests: {
              total: serviceRequestStats[0].totalServiceRequests,
              pending: serviceRequestStats[0].pendingRequests,
              completed: serviceRequestStats[0].completedRequests,
              inProgress: serviceRequestStats[0].inProgressRequests,
              qcReview: serviceRequestStats[0].qcReviewRequests,
              completionRate,
            },
            leads: {
              total: leadStats[0].totalLeads,
              converted: leadStats[0].convertedLeads,
              hot: leadStats[0].hotLeads,
              newThisMonth: leadStats[0].newLeadsThisMonth,
              conversionRate,
            },
            revenue: {
              thisMonth: revenueStats[0].totalRevenue,
              allTime: revenueStats[0].totalRevenueAllTime,
              pending: revenueStats[0].pendingPayments,
              transactionCount: revenueStats[0].transactionCount,
            },
            entities: {
              total: entityStats[0].totalEntities,
              active: entityStats[0].activeEntities,
              newThisMonth: entityStats[0].newEntitiesThisMonth,
            },
          },
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error fetching admin dashboard stats:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch dashboard statistics",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  );

  /**
   * GET /api/admin/dashboard/activity
   *
   * Returns recent activity logs (last 50 by default):
   * - action, entityType, userName, timestamp
   *
   * Query params:
   * - limit: number (default: 50, max: 100)
   * - offset: number (default: 0)
   * - entityType: filter by entity type
   */
  app.get(
    "/api/admin/dashboard/activity",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const limit = Math.min(
          Math.max(parseInt(req.query.limit as string) || 50, 1),
          100
        );
        const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
        const entityTypeFilter = req.query.entityType as string | undefined;

        // Build where conditions
        const whereConditions = entityTypeFilter
          ? eq(activityLogs.entityType, entityTypeFilter)
          : undefined;

        // Fetch activity logs with user info
        const activities = await db
          .select({
            id: activityLogs.id,
            action: activityLogs.action,
            entityType: activityLogs.entityType,
            entityId: activityLogs.entityId,
            details: activityLogs.details,
            metadata: activityLogs.metadata,
            ipAddress: activityLogs.ipAddress,
            timestamp: activityLogs.createdAt,
            userId: activityLogs.userId,
            userName: users.fullName,
            userEmail: users.email,
            userRole: users.role,
          })
          .from(activityLogs)
          .leftJoin(users, eq(activityLogs.userId, users.id))
          .where(whereConditions)
          .orderBy(desc(activityLogs.createdAt))
          .limit(limit)
          .offset(offset);

        // Get total count for pagination
        const [countResult] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(activityLogs)
          .where(whereConditions);

        res.json({
          success: true,
          data: {
            activities: activities.map((activity) => ({
              id: activity.id,
              action: activity.action,
              entityType: activity.entityType,
              entityId: activity.entityId,
              details: activity.details,
              metadata: activity.metadata,
              ipAddress: activity.ipAddress,
              timestamp: activity.timestamp,
              user: activity.userId
                ? {
                    id: activity.userId,
                    name: activity.userName || "Unknown",
                    email: activity.userEmail,
                    role: activity.userRole,
                  }
                : null,
            })),
            pagination: {
              total: countResult.count,
              limit,
              offset,
              hasMore: offset + limit < countResult.count,
            },
          },
        });
      } catch (error) {
        console.error("Error fetching admin dashboard activity:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch activity feed",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  );

  /**
   * GET /api/admin/dashboard/pending
   *
   * Returns counts of pending items requiring attention:
   * - pendingProposals
   * - pendingServiceRequests
   * - pendingDocuments
   * - escalations
   * - pendingQcReviews
   * - pendingWorkItems
   */
  app.get(
    "/api/admin/dashboard/pending",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        // Execute all queries in parallel
        const [
          pendingProposalCount,
          pendingServiceRequestCount,
          pendingDocumentCount,
          activeEscalationCount,
          pendingQcReviewCount,
          pendingWorkItemCount,
          urgentWorkItemCount,
        ] = await Promise.all([
          // Pending proposals (sent but not approved)
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(salesProposals)
            .where(
              or(
                eq(salesProposals.proposalStatus, "Sent"),
                eq(salesProposals.proposalStatus, "Revised Sent")
              )
            ),

          // Pending service requests (not completed/failed)
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(serviceRequests)
            .where(
              and(
                ne(serviceRequests.status, "completed"),
                ne(serviceRequests.status, "failed")
              )
            ),

          // Pending document reviews
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(documentVault)
            .where(eq(documentVault.approvalStatus, "pending")),

          // Active escalations (not resolved/closed)
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(escalationExecutions)
            .where(
              or(
                isNull(escalationExecutions.resolvedAt),
                eq(escalationExecutions.notificationsSent, false)
              )
            ),

          // Pending QC reviews
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(qualityReviews)
            .where(
              or(
                eq(qualityReviews.status, "pending"),
                eq(qualityReviews.status, "in_progress")
              )
            ),

          // Pending work items in queue
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(workItemQueue)
            .where(
              and(
                ne(workItemQueue.currentStatus, "completed"),
                ne(workItemQueue.currentStatus, "cancelled")
              )
            ),

          // Urgent work items (high priority or SLA at risk/breached)
          db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(workItemQueue)
            .where(
              and(
                ne(workItemQueue.currentStatus, "completed"),
                ne(workItemQueue.currentStatus, "cancelled"),
                or(
                  eq(workItemQueue.priority, "HIGH"),
                  eq(workItemQueue.priority, "URGENT"),
                  eq(workItemQueue.slaStatus, "at_risk"),
                  eq(workItemQueue.slaStatus, "warning"),
                  eq(workItemQueue.slaStatus, "breached")
                )
              )
            ),
        ]);

        // Calculate summary metrics
        const totalPending =
          pendingProposalCount[0].count +
          pendingServiceRequestCount[0].count +
          pendingDocumentCount[0].count +
          pendingQcReviewCount[0].count;

        res.json({
          success: true,
          data: {
            pendingProposals: pendingProposalCount[0].count,
            pendingServiceRequests: pendingServiceRequestCount[0].count,
            pendingDocuments: pendingDocumentCount[0].count,
            escalations: activeEscalationCount[0].count,
            pendingQcReviews: pendingQcReviewCount[0].count,
            pendingWorkItems: pendingWorkItemCount[0].count,
            urgentWorkItems: urgentWorkItemCount[0].count,
            summary: {
              totalPendingItems: totalPending,
              requiresImmediateAttention:
                urgentWorkItemCount[0].count + activeEscalationCount[0].count,
            },
          },
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error fetching admin dashboard pending items:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch pending items",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  );

  /**
   * GET /api/admin/dashboard/metrics
   *
   * Returns key performance indicators:
   * - avgRequestCompletionTime
   * - customerSatisfactionScore
   * - serviceRequestTrend (last 7 days)
   * - slaComplianceRate
   * - qualityScore
   */
  app.get(
    "/api/admin/dashboard/metrics",
    ...adminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const now = new Date();
        const sevenDaysAgo = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000
        );
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        );

        // Execute all queries in parallel
        const [
          completionTimeStats,
          qualityStats,
          slaStats,
          trendData,
          dailyTrend,
        ] = await Promise.all([
          // Average completion time (for completed requests in last 30 days)
          db
            .select({
              avgCompletionTimeHours: sql<number>`
                COALESCE(
                  AVG(
                    EXTRACT(EPOCH FROM (${serviceRequests.actualCompletion} - ${serviceRequests.createdAt})) / 3600
                  ),
                  0
                )::numeric(10,2)
              `,
              completedCount: sql<number>`COUNT(*)::int`,
            })
            .from(serviceRequests)
            .where(
              and(
                eq(serviceRequests.status, "completed"),
                gte(serviceRequests.actualCompletion, thirtyDaysAgo)
              )
            ),

          // Quality metrics (average quality score from QC reviews)
          db
            .select({
              avgQualityScore: sql<number>`COALESCE(AVG(${qualityReviews.qualityScore}), 0)::numeric(10,2)`,
              totalReviews: sql<number>`COUNT(*)::int`,
              approvedReviews: sql<number>`COUNT(CASE WHEN ${qualityReviews.status} = 'approved' THEN 1 END)::int`,
              rejectedReviews: sql<number>`COUNT(CASE WHEN ${qualityReviews.status} = 'rejected' THEN 1 END)::int`,
            })
            .from(qualityReviews)
            .where(gte(qualityReviews.createdAt, thirtyDaysAgo)),

          // SLA compliance (requests completed within SLA)
          db
            .select({
              totalCompleted: sql<number>`COUNT(*)::int`,
              withinSla: sql<number>`COUNT(CASE WHEN ${serviceRequests.actualCompletion} <= ${serviceRequests.slaDeadline} THEN 1 END)::int`,
              breached: sql<number>`COUNT(CASE WHEN ${serviceRequests.actualCompletion} > ${serviceRequests.slaDeadline} THEN 1 END)::int`,
            })
            .from(serviceRequests)
            .where(
              and(
                eq(serviceRequests.status, "completed"),
                gte(serviceRequests.actualCompletion, thirtyDaysAgo)
              )
            ),

          // Overall trend data (last 7 days vs previous 7 days)
          db
            .select({
              currentWeek: sql<number>`COUNT(CASE WHEN ${serviceRequests.createdAt} >= ${sevenDaysAgo} THEN 1 END)::int`,
              previousWeek: sql<number>`COUNT(CASE WHEN ${serviceRequests.createdAt} < ${sevenDaysAgo} AND ${serviceRequests.createdAt} >= ${sql`${sevenDaysAgo}::timestamp - INTERVAL '7 days'`} THEN 1 END)::int`,
            })
            .from(serviceRequests),

          // Daily service request trend for last 7 days
          db
            .select({
              date: sql<string>`DATE(${serviceRequests.createdAt})::text`,
              count: sql<number>`COUNT(*)::int`,
            })
            .from(serviceRequests)
            .where(gte(serviceRequests.createdAt, sevenDaysAgo))
            .groupBy(sql`DATE(${serviceRequests.createdAt})`)
            .orderBy(sql`DATE(${serviceRequests.createdAt})`),
        ]);

        // Calculate derived metrics
        const slaComplianceRate =
          slaStats[0].totalCompleted > 0
            ? Math.round(
                (slaStats[0].withinSla / slaStats[0].totalCompleted) * 100
              )
            : 100;

        const qualityApprovalRate =
          qualityStats[0].totalReviews > 0
            ? Math.round(
                (qualityStats[0].approvedReviews / qualityStats[0].totalReviews) *
                  100
              )
            : 0;

        const trendPercentage =
          trendData[0].previousWeek > 0
            ? Math.round(
                ((trendData[0].currentWeek - trendData[0].previousWeek) /
                  trendData[0].previousWeek) *
                  100
              )
            : trendData[0].currentWeek > 0
            ? 100
            : 0;

        // Build 7-day trend array with zeros for missing days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
          return date.toISOString().split("T")[0];
        });

        const serviceRequestTrend = last7Days.map((date) => {
          const found = dailyTrend.find((d) => d.date === date);
          return {
            date,
            count: found?.count || 0,
          };
        });

        res.json({
          success: true,
          data: {
            avgRequestCompletionTime: {
              hours: Number(completionTimeStats[0].avgCompletionTimeHours),
              days: Number(
                (
                  Number(completionTimeStats[0].avgCompletionTimeHours) / 24
                ).toFixed(1)
              ),
              completedCount: completionTimeStats[0].completedCount,
            },
            qualityMetrics: {
              averageScore: Number(qualityStats[0].avgQualityScore),
              totalReviews: qualityStats[0].totalReviews,
              approvalRate: qualityApprovalRate,
              approvedReviews: qualityStats[0].approvedReviews,
              rejectedReviews: qualityStats[0].rejectedReviews,
            },
            slaCompliance: {
              rate: slaComplianceRate,
              totalCompleted: slaStats[0].totalCompleted,
              withinSla: slaStats[0].withinSla,
              breached: slaStats[0].breached,
            },
            serviceRequestTrend: {
              data: serviceRequestTrend,
              currentWeek: trendData[0].currentWeek,
              previousWeek: trendData[0].previousWeek,
              changePercent: trendPercentage,
              trend:
                trendPercentage > 0
                  ? "up"
                  : trendPercentage < 0
                  ? "down"
                  : "stable",
            },
          },
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error fetching admin dashboard metrics:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch performance metrics",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  );

  console.log("✅ Admin dashboard routes registered");
}
