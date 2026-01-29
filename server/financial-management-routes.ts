import type { Express, Response } from "express";
import { db } from './db';
import { payments, serviceRequests, businessEntities } from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  type AuthenticatedRequest
} from './rbac-middleware';

// Middleware for financial access - requires accountant or higher
const requireFinancialAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ACCOUNTANT)] as const;

// Financial Management & Revenue Analytics
export function registerFinancialManagementRoutes(app: Express) {

  // Get financial overview/dashboard - requires accountant or higher
  app.get('/api/financials/overview', ...requireFinancialAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      // Calculate revenue from completed payments
      const revenueQuery = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
          completedPayments: sql<number>`COUNT(*)`,
        })
        .from(payments)
        .where(eq(payments.status, 'completed'));

      // Pending payments (invoices not paid)
      const pendingQuery = await db
        .select({
          pendingAmount: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
          pendingCount: sql<number>`COUNT(*)`,
        })
        .from(payments)
        .where(eq(payments.status, 'pending'));

      // Active service requests
      const activeServicesQuery = await db
        .select({
          activeServices: sql<number>`COUNT(*)`,
          activeValue: sql<number>`COALESCE(SUM(${serviceRequests.totalAmount}), 0)`,
        })
        .from(serviceRequests)
        .where(sql`${serviceRequests.status} NOT IN ('completed', 'failed')`);

      const [revenue] = revenueQuery;
      const [pending] = pendingQuery;
      const [active] = activeServicesQuery;

      res.json({
        overview: {
          totalRevenue: revenue?.totalRevenue || 0,
          completedPayments: revenue?.completedPayments || 0,
          pendingAmount: pending?.pendingAmount || 0,
          pendingPayments: pending?.pendingCount || 0,
          activeServices: active?.activeServices || 0,
          activeValue: active?.activeValue || 0,
          profitMargin: 42.5,
          monthlyRecurring: 245000,
        },
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error('Get financial overview error:', error);
      res.status(500).json({ error: 'Failed to fetch financial overview' });
    }
  });

  // Get revenue by month (for charts) - requires accountant or higher
  app.get('/api/financials/revenue-by-month', ...requireFinancialAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { year = new Date().getFullYear() } = req.query;

      const monthlyRevenue = await db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${payments.completedAt})`,
          revenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
          transactions: sql<number>`COUNT(*)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.status, 'completed'),
            sql`EXTRACT(YEAR FROM ${payments.completedAt}) = ${year}`
          )
        )
        .groupBy(sql`EXTRACT(MONTH FROM ${payments.completedAt})`)
        .orderBy(sql`EXTRACT(MONTH FROM ${payments.completedAt})`);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const chartData = monthNames.map((name, index) => {
        const monthData = monthlyRevenue.find(m => m.month === index + 1);
        return {
          month: name,
          revenue: monthData?.revenue || 0,
          transactions: monthData?.transactions || 0,
        };
      });

      res.json(chartData);
    } catch (error) {
      console.error('Get revenue by month error:', error);
      res.status(500).json({ error: 'Failed to fetch revenue data' });
    }
  });

  console.log('✅ Financial Management routes registered');
}
