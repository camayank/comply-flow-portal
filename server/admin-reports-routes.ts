import type { Express, Response } from "express";
import { db } from "./db";
import { serviceRequests, users, payments, complianceTracking, businessEntities, userSessions } from "@shared/schema";
import { eq, desc, and, sql, gte, lte, count, sum, avg } from "drizzle-orm";
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from "./rbac-middleware";
import { convertToCSV, prepareDataForExport, sendCSVResponse } from "./export-utils";

// Type definitions for report data
interface ServiceRequestReportItem {
  id: number;
  requestId: string | null;
  serviceId: string;
  status: string;
  priority: string | null;
  totalAmount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  businessEntityName: string | null;
  businessEntityType: string | null;
}

interface RevenueReportItem {
  period: string;
  totalRevenue: number;
  transactionCount: number;
  averageAmount: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
}

interface UserActivityReportItem {
  userId: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: Date | null;
  sessionCount: number;
  lastActivity: Date | null;
}

interface ComplianceReportItem {
  status: string;
  count: number;
  percentage: number;
}

interface ComplianceDetailItem {
  id: number;
  serviceId: string;
  serviceType: string | null;
  entityName: string | null;
  complianceType: string;
  dueDate: Date;
  status: string;
  priority: string;
  healthScore: number | null;
  penaltyRisk: boolean | null;
  estimatedPenalty: number | null;
}

// Helper function to parse date range
function parseDateRange(startDate?: string, endDate?: string): { start: Date | null; end: Date | null } {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  // Validate dates
  if (start && isNaN(start.getTime())) {
    throw new Error('Invalid startDate format');
  }
  if (end && isNaN(end.getTime())) {
    throw new Error('Invalid endDate format');
  }

  return { start, end };
}

// Helper function to get date group SQL based on groupBy parameter
function getDateGroupSQL(groupBy: string): string {
  switch (groupBy) {
    case 'day':
      return `TO_CHAR(${payments.createdAt}, 'YYYY-MM-DD')`;
    case 'week':
      return `TO_CHAR(DATE_TRUNC('week', ${payments.createdAt}), 'YYYY-"W"IW')`;
    case 'month':
    default:
      return `TO_CHAR(${payments.createdAt}, 'YYYY-MM')`;
  }
}

// Helper to format period label
function formatPeriodLabel(dateStr: string, groupBy: string): string {
  if (groupBy === 'week') {
    return dateStr; // Already in YYYY-WXX format
  }
  if (groupBy === 'day') {
    return dateStr; // Already in YYYY-MM-DD format
  }
  // For month, format as "Jan 2025"
  const [year, month] = dateStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

export function registerAdminReportsRoutes(app: Express) {
  const adminAuth = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ADMIN)] as const;

  // ============================================================================
  // GET /api/admin/reports/service-requests
  // Service request report with filtering and summary stats
  // ============================================================================
  app.get('/api/admin/reports/service-requests', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate, status, serviceType, limit = '100', offset = '0' } = req.query;

      // Parse and validate date range
      let dateRange: { start: Date | null; end: Date | null };
      try {
        dateRange = parseDateRange(startDate as string, endDate as string);
      } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
      }

      // Build conditions array
      const conditions: any[] = [];

      if (dateRange.start) {
        conditions.push(gte(serviceRequests.createdAt, dateRange.start));
      }
      if (dateRange.end) {
        conditions.push(lte(serviceRequests.createdAt, dateRange.end));
      }
      if (status && typeof status === 'string') {
        conditions.push(eq(serviceRequests.status, status));
      }
      if (serviceType && typeof serviceType === 'string') {
        conditions.push(eq(serviceRequests.serviceId, serviceType));
      }

      // Fetch service requests with business entity info
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const requests = await db
        .select({
          id: serviceRequests.id,
          requestId: serviceRequests.requestId,
          serviceId: serviceRequests.serviceId,
          status: serviceRequests.status,
          priority: serviceRequests.priority,
          totalAmount: serviceRequests.totalAmount,
          createdAt: serviceRequests.createdAt,
          updatedAt: serviceRequests.updatedAt,
          businessEntityName: businessEntities.name,
          businessEntityType: businessEntities.entityType,
        })
        .from(serviceRequests)
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .where(whereClause)
        .orderBy(desc(serviceRequests.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      // Calculate summary statistics
      const [summaryStats] = await db
        .select({
          totalCount: sql<number>`COUNT(*)::int`,
          totalAmount: sql<number>`COALESCE(SUM(${serviceRequests.totalAmount}), 0)::int`,
          avgAmount: sql<number>`COALESCE(AVG(${serviceRequests.totalAmount}), 0)::int`,
          completedCount: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'completed' THEN 1 END)::int`,
          inProgressCount: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'in_progress' THEN 1 END)::int`,
          pendingCount: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'initiated' OR ${serviceRequests.status} = 'docs_uploaded' THEN 1 END)::int`,
          failedCount: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'failed' THEN 1 END)::int`,
          onHoldCount: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'on_hold' THEN 1 END)::int`,
        })
        .from(serviceRequests)
        .where(whereClause);

      // Get status distribution
      const statusDistribution = await db
        .select({
          status: serviceRequests.status,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(serviceRequests)
        .where(whereClause)
        .groupBy(serviceRequests.status);

      // Get service type distribution
      const serviceTypeDistribution = await db
        .select({
          serviceId: serviceRequests.serviceId,
          count: sql<number>`COUNT(*)::int`,
          totalAmount: sql<number>`COALESCE(SUM(${serviceRequests.totalAmount}), 0)::int`,
        })
        .from(serviceRequests)
        .where(whereClause)
        .groupBy(serviceRequests.serviceId)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

      // Get priority distribution
      const priorityDistribution = await db
        .select({
          priority: serviceRequests.priority,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(serviceRequests)
        .where(whereClause)
        .groupBy(serviceRequests.priority);

      const report = {
        data: requests,
        summary: {
          totalCount: summaryStats.totalCount,
          totalAmount: summaryStats.totalAmount,
          averageAmount: summaryStats.avgAmount,
          completedCount: summaryStats.completedCount,
          inProgressCount: summaryStats.inProgressCount,
          pendingCount: summaryStats.pendingCount,
          failedCount: summaryStats.failedCount,
          onHoldCount: summaryStats.onHoldCount,
          completionRate: summaryStats.totalCount > 0
            ? Math.round((summaryStats.completedCount / summaryStats.totalCount) * 100)
            : 0,
        },
        distributions: {
          byStatus: statusDistribution,
          byServiceType: serviceTypeDistribution,
          byPriority: priorityDistribution,
        },
        filters: {
          startDate: dateRange.start?.toISOString() || null,
          endDate: dateRange.end?.toISOString() || null,
          status: status || null,
          serviceType: serviceType || null,
        },
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: requests.length === parseInt(limit as string),
        },
        generatedAt: new Date().toISOString(),
      };

      res.json(report);
    } catch (error) {
      console.error('Error generating service requests report:', error);
      res.status(500).json({ error: 'Failed to generate service requests report' });
    }
  });

  // ============================================================================
  // GET /api/admin/reports/revenue
  // Revenue report with grouping options
  // ============================================================================
  app.get('/api/admin/reports/revenue', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate, groupBy = 'month' } = req.query;

      // Validate groupBy parameter
      const validGroupBy = ['day', 'week', 'month'];
      if (!validGroupBy.includes(groupBy as string)) {
        return res.status(400).json({ error: 'Invalid groupBy parameter. Must be one of: day, week, month' });
      }

      // Parse date range
      let dateRange: { start: Date | null; end: Date | null };
      try {
        dateRange = parseDateRange(startDate as string, endDate as string);
      } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
      }

      // Build conditions
      const conditions: any[] = [];
      if (dateRange.start) {
        conditions.push(gte(payments.createdAt, dateRange.start));
      }
      if (dateRange.end) {
        conditions.push(lte(payments.createdAt, dateRange.end));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get revenue grouped by period
      let revenueByPeriod: RevenueReportItem[];

      if (groupBy === 'day') {
        const result = await db
          .select({
            period: sql<string>`TO_CHAR(${payments.createdAt}, 'YYYY-MM-DD')`,
            totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)::int`,
            transactionCount: sql<number>`COUNT(*)::int`,
            averageAmount: sql<number>`COALESCE(AVG(${payments.amount}), 0)::int`,
            completedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'completed' THEN 1 END)::int`,
            pendingPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'pending' THEN 1 END)::int`,
            failedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'failed' THEN 1 END)::int`,
          })
          .from(payments)
          .where(whereClause)
          .groupBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM-DD')`)
          .orderBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM-DD')`);
        revenueByPeriod = result;
      } else if (groupBy === 'week') {
        const result = await db
          .select({
            period: sql<string>`TO_CHAR(DATE_TRUNC('week', ${payments.createdAt}), 'YYYY-"W"IW')`,
            totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)::int`,
            transactionCount: sql<number>`COUNT(*)::int`,
            averageAmount: sql<number>`COALESCE(AVG(${payments.amount}), 0)::int`,
            completedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'completed' THEN 1 END)::int`,
            pendingPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'pending' THEN 1 END)::int`,
            failedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'failed' THEN 1 END)::int`,
          })
          .from(payments)
          .where(whereClause)
          .groupBy(sql`DATE_TRUNC('week', ${payments.createdAt})`)
          .orderBy(sql`DATE_TRUNC('week', ${payments.createdAt})`);
        revenueByPeriod = result;
      } else {
        // month grouping (default)
        const result = await db
          .select({
            period: sql<string>`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`,
            totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)::int`,
            transactionCount: sql<number>`COUNT(*)::int`,
            averageAmount: sql<number>`COALESCE(AVG(${payments.amount}), 0)::int`,
            completedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'completed' THEN 1 END)::int`,
            pendingPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'pending' THEN 1 END)::int`,
            failedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'failed' THEN 1 END)::int`,
          })
          .from(payments)
          .where(whereClause)
          .groupBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`)
          .orderBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`);
        revenueByPeriod = result;
      }

      // Get overall totals
      const [totals] = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)::int`,
          totalTransactions: sql<number>`COUNT(*)::int`,
          averageTransactionAmount: sql<number>`COALESCE(AVG(${payments.amount}), 0)::int`,
          completedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'completed' THEN 1 END)::int`,
          pendingPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'pending' THEN 1 END)::int`,
          failedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'failed' THEN 1 END)::int`,
          refundedPayments: sql<number>`COUNT(CASE WHEN ${payments.status} = 'refunded' THEN 1 END)::int`,
          pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'pending' THEN ${payments.amount} ELSE 0 END), 0)::int`,
        })
        .from(payments)
        .where(whereClause);

      // Get payment method distribution
      const paymentMethodDistribution = await db
        .select({
          paymentMethod: payments.paymentMethod,
          count: sql<number>`COUNT(*)::int`,
          totalAmount: sql<number>`COALESCE(SUM(${payments.amount}), 0)::int`,
        })
        .from(payments)
        .where(whereClause)
        .groupBy(payments.paymentMethod);

      const report = {
        data: revenueByPeriod.map(item => ({
          ...item,
          periodLabel: formatPeriodLabel(item.period, groupBy as string),
        })),
        totals: {
          totalRevenue: totals.totalRevenue,
          totalTransactions: totals.totalTransactions,
          averageTransactionAmount: totals.averageTransactionAmount,
          completedPayments: totals.completedPayments,
          pendingPayments: totals.pendingPayments,
          failedPayments: totals.failedPayments,
          refundedPayments: totals.refundedPayments,
          pendingAmount: totals.pendingAmount,
          successRate: totals.totalTransactions > 0
            ? Math.round((totals.completedPayments / totals.totalTransactions) * 100)
            : 0,
        },
        distributions: {
          byPaymentMethod: paymentMethodDistribution,
        },
        filters: {
          startDate: dateRange.start?.toISOString() || null,
          endDate: dateRange.end?.toISOString() || null,
          groupBy: groupBy,
        },
        generatedAt: new Date().toISOString(),
      };

      res.json(report);
    } catch (error) {
      console.error('Error generating revenue report:', error);
      res.status(500).json({ error: 'Failed to generate revenue report' });
    }
  });

  // ============================================================================
  // GET /api/admin/reports/users
  // User activity report
  // ============================================================================
  app.get('/api/admin/reports/users', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate, role, isActive, limit = '100', offset = '0' } = req.query;

      // Parse date range
      let dateRange: { start: Date | null; end: Date | null };
      try {
        dateRange = parseDateRange(startDate as string, endDate as string);
      } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
      }

      // Build conditions for users
      const userConditions: any[] = [];
      if (role && typeof role === 'string') {
        userConditions.push(eq(users.role, role));
      }
      if (isActive !== undefined) {
        userConditions.push(eq(users.isActive, isActive === 'true'));
      }

      const userWhereClause = userConditions.length > 0 ? and(...userConditions) : undefined;

      // Get users with session activity
      const userActivityData = await db
        .select({
          userId: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          lastLogin: users.lastLogin,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(userWhereClause)
        .orderBy(desc(users.lastLogin))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      // Get session counts for each user
      const sessionConditions: any[] = [];
      if (dateRange.start) {
        sessionConditions.push(gte(userSessions.createdAt, dateRange.start));
      }
      if (dateRange.end) {
        sessionConditions.push(lte(userSessions.createdAt, dateRange.end));
      }

      const sessionCounts = await db
        .select({
          userId: userSessions.userId,
          sessionCount: sql<number>`COUNT(*)::int`,
          lastActivity: sql<Date>`MAX(${userSessions.lastActivity})`,
        })
        .from(userSessions)
        .where(sessionConditions.length > 0 ? and(...sessionConditions) : undefined)
        .groupBy(userSessions.userId);

      // Create a map of session data by user ID
      const sessionMap = new Map(sessionCounts.map(s => [s.userId, s]));

      // Combine user data with session activity
      const userActivityReport: UserActivityReportItem[] = userActivityData.map(user => ({
        userId: user.userId,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive ?? true,
        lastLogin: user.lastLogin,
        sessionCount: sessionMap.get(user.userId)?.sessionCount || 0,
        lastActivity: sessionMap.get(user.userId)?.lastActivity || null,
      }));

      // Calculate summary statistics
      const [userSummary] = await db
        .select({
          totalUsers: sql<number>`COUNT(*)::int`,
          activeUsers: sql<number>`COUNT(CASE WHEN ${users.isActive} = true THEN 1 END)::int`,
          inactiveUsers: sql<number>`COUNT(CASE WHEN ${users.isActive} = false THEN 1 END)::int`,
          usersLoggedInToday: sql<number>`COUNT(CASE WHEN ${users.lastLogin} >= CURRENT_DATE THEN 1 END)::int`,
          usersLoggedInThisWeek: sql<number>`COUNT(CASE WHEN ${users.lastLogin} >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::int`,
          usersLoggedInThisMonth: sql<number>`COUNT(CASE WHEN ${users.lastLogin} >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::int`,
        })
        .from(users)
        .where(userWhereClause);

      // Get role distribution
      const roleDistribution = await db
        .select({
          role: users.role,
          count: sql<number>`COUNT(*)::int`,
          activeCount: sql<number>`COUNT(CASE WHEN ${users.isActive} = true THEN 1 END)::int`,
        })
        .from(users)
        .groupBy(users.role)
        .orderBy(desc(sql`COUNT(*)`));

      // Get session statistics for the date range
      const [sessionSummary] = await db
        .select({
          totalSessions: sql<number>`COUNT(*)::int`,
          activeSessions: sql<number>`COUNT(CASE WHEN ${userSessions.isActive} = true THEN 1 END)::int`,
          uniqueUsers: sql<number>`COUNT(DISTINCT ${userSessions.userId})::int`,
        })
        .from(userSessions)
        .where(sessionConditions.length > 0 ? and(...sessionConditions) : undefined);

      const report = {
        data: userActivityReport,
        summary: {
          totalUsers: userSummary.totalUsers,
          activeUsers: userSummary.activeUsers,
          inactiveUsers: userSummary.inactiveUsers,
          usersLoggedInToday: userSummary.usersLoggedInToday,
          usersLoggedInThisWeek: userSummary.usersLoggedInThisWeek,
          usersLoggedInThisMonth: userSummary.usersLoggedInThisMonth,
          activityRate: userSummary.totalUsers > 0
            ? Math.round((userSummary.usersLoggedInThisMonth / userSummary.totalUsers) * 100)
            : 0,
        },
        sessions: {
          totalSessions: sessionSummary.totalSessions,
          activeSessions: sessionSummary.activeSessions,
          uniqueUsers: sessionSummary.uniqueUsers,
        },
        distributions: {
          byRole: roleDistribution,
        },
        filters: {
          startDate: dateRange.start?.toISOString() || null,
          endDate: dateRange.end?.toISOString() || null,
          role: role || null,
          isActive: isActive !== undefined ? isActive === 'true' : null,
        },
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: userActivityReport.length === parseInt(limit as string),
        },
        generatedAt: new Date().toISOString(),
      };

      res.json(report);
    } catch (error) {
      console.error('Error generating users report:', error);
      res.status(500).json({ error: 'Failed to generate users report' });
    }
  });

  // ============================================================================
  // GET /api/admin/reports/compliance
  // Compliance status report
  // ============================================================================
  app.get('/api/admin/reports/compliance', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate, status, priority, limit = '100', offset = '0' } = req.query;

      // Parse date range
      let dateRange: { start: Date | null; end: Date | null };
      try {
        dateRange = parseDateRange(startDate as string, endDate as string);
      } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
      }

      // Build conditions
      const conditions: any[] = [];
      if (dateRange.start) {
        conditions.push(gte(complianceTracking.dueDate, dateRange.start));
      }
      if (dateRange.end) {
        conditions.push(lte(complianceTracking.dueDate, dateRange.end));
      }
      if (status && typeof status === 'string') {
        conditions.push(eq(complianceTracking.status, status));
      }
      if (priority && typeof priority === 'string') {
        conditions.push(eq(complianceTracking.priority, priority));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get compliance items with details
      const complianceItems = await db
        .select({
          id: complianceTracking.id,
          serviceId: complianceTracking.serviceId,
          serviceType: complianceTracking.serviceType,
          entityName: complianceTracking.entityName,
          complianceType: complianceTracking.complianceType,
          dueDate: complianceTracking.dueDate,
          status: complianceTracking.status,
          priority: complianceTracking.priority,
          healthScore: complianceTracking.healthScore,
          penaltyRisk: complianceTracking.penaltyRisk,
          estimatedPenalty: complianceTracking.estimatedPenalty,
          lastCompleted: complianceTracking.lastCompleted,
          nextDueDate: complianceTracking.nextDueDate,
        })
        .from(complianceTracking)
        .where(whereClause)
        .orderBy(complianceTracking.dueDate)
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      // Get status breakdown
      const statusBreakdown = await db
        .select({
          status: complianceTracking.status,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(complianceTracking)
        .where(whereClause)
        .groupBy(complianceTracking.status);

      const totalCount = statusBreakdown.reduce((sum, item) => sum + item.count, 0);
      const statusWithPercentage: ComplianceReportItem[] = statusBreakdown.map(item => ({
        status: item.status,
        count: item.count,
        percentage: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0,
      }));

      // Get priority breakdown
      const priorityBreakdown = await db
        .select({
          priority: complianceTracking.priority,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(complianceTracking)
        .where(whereClause)
        .groupBy(complianceTracking.priority);

      // Get compliance type breakdown
      const complianceTypeBreakdown = await db
        .select({
          complianceType: complianceTracking.complianceType,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(complianceTracking)
        .where(whereClause)
        .groupBy(complianceTracking.complianceType);

      // Calculate overall statistics
      const [overallStats] = await db
        .select({
          totalItems: sql<number>`COUNT(*)::int`,
          completedItems: sql<number>`COUNT(CASE WHEN ${complianceTracking.status} = 'completed' THEN 1 END)::int`,
          overdueItems: sql<number>`COUNT(CASE WHEN ${complianceTracking.status} = 'overdue' THEN 1 END)::int`,
          pendingItems: sql<number>`COUNT(CASE WHEN ${complianceTracking.status} = 'pending' THEN 1 END)::int`,
          avgHealthScore: sql<number>`COALESCE(AVG(${complianceTracking.healthScore}), 0)::int`,
          highRiskItems: sql<number>`COUNT(CASE WHEN ${complianceTracking.penaltyRisk} = true THEN 1 END)::int`,
          totalEstimatedPenalty: sql<number>`COALESCE(SUM(${complianceTracking.estimatedPenalty}), 0)::int`,
        })
        .from(complianceTracking)
        .where(whereClause);

      // Get upcoming due items (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const [upcomingStats] = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
        })
        .from(complianceTracking)
        .where(and(
          eq(complianceTracking.status, 'pending'),
          gte(complianceTracking.dueDate, new Date()),
          lte(complianceTracking.dueDate, thirtyDaysFromNow)
        ));

      const report = {
        data: complianceItems,
        summary: {
          totalItems: overallStats.totalItems,
          completedItems: overallStats.completedItems,
          overdueItems: overallStats.overdueItems,
          pendingItems: overallStats.pendingItems,
          averageHealthScore: overallStats.avgHealthScore,
          highRiskItems: overallStats.highRiskItems,
          totalEstimatedPenalty: overallStats.totalEstimatedPenalty,
          complianceRate: overallStats.totalItems > 0
            ? Math.round((overallStats.completedItems / overallStats.totalItems) * 100)
            : 0,
          upcomingDueIn30Days: upcomingStats.count,
        },
        distributions: {
          byStatus: statusWithPercentage,
          byPriority: priorityBreakdown,
          byComplianceType: complianceTypeBreakdown,
        },
        filters: {
          startDate: dateRange.start?.toISOString() || null,
          endDate: dateRange.end?.toISOString() || null,
          status: status || null,
          priority: priority || null,
        },
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: complianceItems.length === parseInt(limit as string),
        },
        generatedAt: new Date().toISOString(),
      };

      res.json(report);
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ error: 'Failed to generate compliance report' });
    }
  });

  // ============================================================================
  // POST /api/admin/reports/export
  // Export report as CSV or JSON
  // ============================================================================
  app.post('/api/admin/reports/export', ...adminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reportType, format = 'json', filters = {} } = req.body;

      // Validate report type
      const validReportTypes = ['service-requests', 'revenue', 'users', 'compliance'];
      if (!reportType || !validReportTypes.includes(reportType)) {
        return res.status(400).json({
          error: 'Invalid reportType. Must be one of: service-requests, revenue, users, compliance'
        });
      }

      // Validate format
      const validFormats = ['csv', 'json'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({ error: 'Invalid format. Must be one of: csv, json' });
      }

      const { startDate, endDate } = filters;
      let dateRange: { start: Date | null; end: Date | null };
      try {
        dateRange = parseDateRange(startDate, endDate);
      } catch (error) {
        return res.status(400).json({ error: (error as Error).message });
      }

      let exportData: any[] = [];
      let filename = '';

      // Build date conditions
      const getDateConditions = (dateField: any) => {
        const conditions: any[] = [];
        if (dateRange.start) {
          conditions.push(gte(dateField, dateRange.start));
        }
        if (dateRange.end) {
          conditions.push(lte(dateField, dateRange.end));
        }
        return conditions.length > 0 ? and(...conditions) : undefined;
      };

      switch (reportType) {
        case 'service-requests': {
          const conditions: any[] = [];
          if (dateRange.start) {
            conditions.push(gte(serviceRequests.createdAt, dateRange.start));
          }
          if (dateRange.end) {
            conditions.push(lte(serviceRequests.createdAt, dateRange.end));
          }
          if (filters.status) {
            conditions.push(eq(serviceRequests.status, filters.status));
          }
          if (filters.serviceType) {
            conditions.push(eq(serviceRequests.serviceId, filters.serviceType));
          }

          const data = await db
            .select({
              id: serviceRequests.id,
              requestId: serviceRequests.requestId,
              serviceId: serviceRequests.serviceId,
              status: serviceRequests.status,
              priority: serviceRequests.priority,
              totalAmount: serviceRequests.totalAmount,
              progress: serviceRequests.progress,
              dueDate: serviceRequests.dueDate,
              createdAt: serviceRequests.createdAt,
              updatedAt: serviceRequests.updatedAt,
              businessEntity: businessEntities.name,
              entityType: businessEntities.entityType,
            })
            .from(serviceRequests)
            .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(serviceRequests.createdAt));

          exportData = data.map(item => ({
            ...item,
            createdAt: item.createdAt?.toISOString() || '',
            updatedAt: item.updatedAt?.toISOString() || '',
            dueDate: item.dueDate?.toISOString() || '',
          }));
          filename = 'service-requests-report';
          break;
        }

        case 'revenue': {
          const conditions: any[] = [];
          if (dateRange.start) {
            conditions.push(gte(payments.createdAt, dateRange.start));
          }
          if (dateRange.end) {
            conditions.push(lte(payments.createdAt, dateRange.end));
          }
          if (filters.status) {
            conditions.push(eq(payments.status, filters.status));
          }

          const data = await db
            .select({
              id: payments.id,
              paymentId: payments.paymentId,
              amount: payments.amount,
              status: payments.status,
              paymentMethod: payments.paymentMethod,
              transactionId: payments.transactionId,
              createdAt: payments.createdAt,
              completedAt: payments.completedAt,
            })
            .from(payments)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(payments.createdAt));

          exportData = data.map(item => ({
            ...item,
            createdAt: item.createdAt?.toISOString() || '',
            completedAt: item.completedAt?.toISOString() || '',
          }));
          filename = 'revenue-report';
          break;
        }

        case 'users': {
          const conditions: any[] = [];
          if (filters.role) {
            conditions.push(eq(users.role, filters.role));
          }
          if (filters.isActive !== undefined) {
            conditions.push(eq(users.isActive, filters.isActive));
          }

          const data = await db
            .select({
              id: users.id,
              username: users.username,
              email: users.email,
              fullName: users.fullName,
              role: users.role,
              department: users.department,
              phone: users.phone,
              isActive: users.isActive,
              lastLogin: users.lastLogin,
              createdAt: users.createdAt,
            })
            .from(users)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(users.createdAt));

          exportData = data.map(item => ({
            ...item,
            lastLogin: item.lastLogin?.toISOString() || '',
            createdAt: item.createdAt?.toISOString() || '',
          }));
          filename = 'users-report';
          break;
        }

        case 'compliance': {
          const conditions: any[] = [];
          if (dateRange.start) {
            conditions.push(gte(complianceTracking.dueDate, dateRange.start));
          }
          if (dateRange.end) {
            conditions.push(lte(complianceTracking.dueDate, dateRange.end));
          }
          if (filters.status) {
            conditions.push(eq(complianceTracking.status, filters.status));
          }
          if (filters.priority) {
            conditions.push(eq(complianceTracking.priority, filters.priority));
          }

          const data = await db
            .select({
              id: complianceTracking.id,
              serviceId: complianceTracking.serviceId,
              serviceType: complianceTracking.serviceType,
              entityName: complianceTracking.entityName,
              complianceType: complianceTracking.complianceType,
              dueDate: complianceTracking.dueDate,
              status: complianceTracking.status,
              priority: complianceTracking.priority,
              healthScore: complianceTracking.healthScore,
              penaltyRisk: complianceTracking.penaltyRisk,
              estimatedPenalty: complianceTracking.estimatedPenalty,
              lastCompleted: complianceTracking.lastCompleted,
              nextDueDate: complianceTracking.nextDueDate,
            })
            .from(complianceTracking)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(complianceTracking.dueDate);

          exportData = data.map(item => ({
            ...item,
            dueDate: item.dueDate?.toISOString() || '',
            lastCompleted: item.lastCompleted?.toISOString() || '',
            nextDueDate: item.nextDueDate?.toISOString() || '',
          }));
          filename = 'compliance-report';
          break;
        }
      }

      const timestamp = new Date().toISOString().split('T')[0];

      if (format === 'csv') {
        const flattenedData = prepareDataForExport(exportData);
        sendCSVResponse(res, flattenedData, `${filename}-${timestamp}`);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}-${timestamp}.json"`);
        res.json({
          reportType,
          generatedAt: new Date().toISOString(),
          filters: {
            startDate: dateRange.start?.toISOString() || null,
            endDate: dateRange.end?.toISOString() || null,
            ...filters,
          },
          totalRecords: exportData.length,
          data: exportData,
        });
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({ error: 'Failed to export report' });
    }
  });

  console.log('✅ Admin reports routes registered');
}
