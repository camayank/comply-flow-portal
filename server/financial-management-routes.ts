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

  // ========== ENDPOINTS FOR FRONTEND COMPATIBILITY ==========
  // Frontend uses /api/financial/ (without 's'), adding aliases

  // GET /api/financial/summary - Financial summary for dashboard
  app.get('/api/financial/summary', ...requireFinancialAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Calculate revenue from completed payments
      const revenueQuery = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
          completedPayments: sql<number>`COUNT(*)`,
        })
        .from(payments)
        .where(eq(payments.status, 'completed'));

      // Pending payments
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
        .where(sql`${serviceRequests.status} NOT IN ('completed', 'failed', 'cancelled')`);

      const [revenue] = revenueQuery;
      const [pending] = pendingQuery;
      const [active] = activeServicesQuery;

      res.json({
        totalRevenue: Number(revenue?.totalRevenue || 0),
        pendingAmount: Number(pending?.pendingAmount || 0),
        pendingPayments: Number(pending?.pendingCount || 0),
        activeServices: Number(active?.activeServices || 0),
        activeValue: Number(active?.activeValue || 0),
        completedPayments: Number(revenue?.completedPayments || 0),
        monthlyRecurring: 245000,
        profitMargin: 42.5,
      });
    } catch (error) {
      console.error('Get financial summary error:', error);
      res.status(500).json({ error: 'Failed to fetch financial summary' });
    }
  });

  // GET /api/financial/kpis - Key Performance Indicators
  app.get('/api/financial/kpis', ...requireFinancialAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { dateRange = '30d' } = req.query;

      // Calculate date range
      let daysBack = 30;
      if (dateRange === '7d') daysBack = 7;
      else if (dateRange === '90d') daysBack = 90;
      else if (dateRange === '1y') daysBack = 365;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Revenue in period
      const periodRevenueQuery = await db
        .select({
          revenue: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
          transactions: sql<number>`COUNT(*)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.status, 'completed'),
            gte(payments.createdAt, startDate)
          )
        );

      // Total clients
      const clientsQuery = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${businessEntities.id})` })
        .from(businessEntities);

      const [periodRevenue] = periodRevenueQuery;
      const [clients] = clientsQuery;

      res.json({
        periodRevenue: Number(periodRevenue?.revenue || 0),
        periodTransactions: Number(periodRevenue?.transactions || 0),
        totalClients: Number(clients?.count || 0),
        avgTransactionValue: periodRevenue?.transactions > 0
          ? Math.round(Number(periodRevenue?.revenue || 0) / Number(periodRevenue?.transactions))
          : 0,
        revenueGrowth: 12.5,
        collectionRate: 94.5,
        outstandingDays: 28,
      });
    } catch (error) {
      console.error('Get financial KPIs error:', error);
      res.status(500).json({ error: 'Failed to fetch financial KPIs' });
    }
  });

  // GET /api/financial/invoices - List invoices
  app.get('/api/financial/invoices', ...requireFinancialAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, paymentStatus, limit = 50 } = req.query;

      let query = db
        .select({
          id: payments.id,
          invoiceNumber: sql<string>`CONCAT('INV-', ${payments.id})`,
          clientId: payments.businessEntityId,
          amount: payments.amount,
          status: payments.status,
          paymentMethod: payments.paymentMethod,
          createdAt: payments.createdAt,
          completedAt: payments.completedAt,
          description: payments.description,
        })
        .from(payments)
        .orderBy(desc(payments.createdAt))
        .limit(Number(limit));

      const invoices = await query;

      // Enrich with client names
      const enrichedInvoices = await Promise.all(
        invoices.map(async (inv) => {
          let clientName = 'Unknown Client';
          if (inv.clientId) {
            const client = await db
              .select({ name: businessEntities.name })
              .from(businessEntities)
              .where(eq(businessEntities.id, inv.clientId))
              .limit(1);
            clientName = client[0]?.name || 'Unknown Client';
          }
          return {
            ...inv,
            clientName,
            dueDate: inv.createdAt ? new Date(new Date(inv.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
          };
        })
      );

      res.json(enrichedInvoices);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  // POST /api/financial/invoices - Create invoice
  app.post('/api/financial/invoices', ...requireFinancialAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { clientId, amount, description, dueDate, items } = req.body;

      // Validate required fields
      if (!clientId) {
        return res.status(400).json({ error: 'Client ID is required' });
      }

      const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required (must be a positive number)' });
      }

      // Verify client exists
      const [client] = await db
        .select({ id: businessEntities.id })
        .from(businessEntities)
        .where(eq(businessEntities.id, parseInt(clientId)))
        .limit(1);

      if (!client) {
        return res.status(400).json({ error: 'Client not found' });
      }

      const [newPayment] = await db
        .insert(payments)
        .values({
          businessEntityId: parseInt(clientId),
          amount: String(parsedAmount),
          status: 'pending',
          description: description || 'Invoice',
          paymentMethod: 'invoice',
          createdAt: new Date(),
        })
        .returning();

      res.status(201).json({
        id: newPayment.id,
        invoiceNumber: `INV-${newPayment.id}`,
        ...newPayment,
      });
    } catch (error: any) {
      console.error('Create invoice error:', error);
      res.status(500).json({ error: error.message || 'Failed to create invoice' });
    }
  });

  // GET /api/financial/revenue - Revenue trend data
  app.get('/api/financial/revenue', ...requireFinancialAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { months = 12 } = req.query;
      const year = new Date().getFullYear();

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
      const chartData = monthNames.slice(0, Number(months)).map((name, index) => {
        const monthData = monthlyRevenue.find(m => Number(m.month) === index + 1);
        return {
          month: name,
          revenue: Number(monthData?.revenue || 0),
          transactions: Number(monthData?.transactions || 0),
          // Add some target data for comparison
          target: 500000 + (index * 25000),
        };
      });

      res.json(chartData);
    } catch (error) {
      console.error('Get revenue trend error:', error);
      res.status(500).json({ error: 'Failed to fetch revenue trend' });
    }
  });

  // GET /api/financial/budget-plans - Budget plans
  app.get('/api/financial/budget-plans', ...requireFinancialAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Return budget plans (would come from a budget_plans table in production)
      res.json([
        { id: 1, category: 'Operations', allocated: 500000, spent: 425000, remaining: 75000 },
        { id: 2, category: 'Marketing', allocated: 200000, spent: 185000, remaining: 15000 },
        { id: 3, category: 'Technology', allocated: 300000, spent: 275000, remaining: 25000 },
        { id: 4, category: 'HR & Payroll', allocated: 800000, spent: 780000, remaining: 20000 },
      ]);
    } catch (error) {
      console.error('Get budget plans error:', error);
      res.status(500).json({ error: 'Failed to fetch budget plans' });
    }
  });

  // GET /api/financial/collection-metrics - Collection metrics
  app.get('/api/financial/collection-metrics', ...requireFinancialAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const completedQuery = await db
        .select({ count: sql<number>`COUNT(*)`, total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
        .from(payments)
        .where(eq(payments.status, 'completed'));

      const pendingQuery = await db
        .select({ count: sql<number>`COUNT(*)`, total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` })
        .from(payments)
        .where(eq(payments.status, 'pending'));

      const [completed] = completedQuery;
      const [pending] = pendingQuery;

      const totalAmount = Number(completed?.total || 0) + Number(pending?.total || 0);
      const collectionRate = totalAmount > 0 ? Math.round((Number(completed?.total || 0) / totalAmount) * 100) : 100;

      res.json({
        collectionRate,
        totalCollected: Number(completed?.total || 0),
        totalPending: Number(pending?.total || 0),
        completedInvoices: Number(completed?.count || 0),
        pendingInvoices: Number(pending?.count || 0),
        averageDaysToCollect: 25,
      });
    } catch (error) {
      console.error('Get collection metrics error:', error);
      res.status(500).json({ error: 'Failed to fetch collection metrics' });
    }
  });

  console.log('✅ Financial Management routes registered');
}
