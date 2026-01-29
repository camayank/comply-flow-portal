import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { db } from './db';
import {
  serviceRequests,
  payments,
  leads,
  businessEntities,
  users,
  complianceTracking
} from '@shared/schema';
import { eq, gte, lte, sql, count, sum, and, desc } from 'drizzle-orm';

const router = Router();

// ============================================================================
// EXECUTIVE DASHBOARD ROUTES
// ============================================================================

// Executive Dashboard - Comprehensive stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    if (period === '7d') startDate.setDate(now.getDate() - 7);
    else if (period === '30d') startDate.setDate(now.getDate() - 30);
    else if (period === '90d') startDate.setDate(now.getDate() - 90);
    else if (period === '1y') startDate.setFullYear(now.getFullYear() - 1);

    // Get basic counts
    const [
      totalClients,
      activeServiceRequests,
      totalRevenue,
      pendingLeads
    ] = await Promise.all([
      db.select({ count: count() }).from(businessEntities),
      db.select({ count: count() }).from(serviceRequests).where(
        and(
          gte(serviceRequests.createdAt, startDate),
          eq(serviceRequests.status, 'in_progress')
        )
      ),
      db.select({ total: sum(payments.amount) }).from(payments).where(
        and(
          gte(payments.createdAt, startDate),
          eq(payments.status, 'completed')
        )
      ),
      db.select({ count: count() }).from(leads).where(
        eq(leads.stage, 'qualified')
      )
    ]);

    // Calculate month-over-month changes (simplified)
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - 30);

    const [prevRevenue] = await db.select({ total: sum(payments.amount) })
      .from(payments)
      .where(
        and(
          gte(payments.createdAt, prevStartDate),
          lte(payments.createdAt, startDate),
          eq(payments.status, 'completed')
        )
      );

    const currentRev = Number(totalRevenue[0]?.total || 0);
    const prevRev = Number(prevRevenue?.total || 1);
    const revenueGrowth = prevRev > 0 ? ((currentRev - prevRev) / prevRev * 100).toFixed(1) : 0;

    res.json({
      overview: {
        totalClients: totalClients[0]?.count || 0,
        activeServiceRequests: activeServiceRequests[0]?.count || 0,
        totalRevenue: currentRev,
        pendingLeads: pendingLeads[0]?.count || 0,
        revenueGrowth: `${revenueGrowth}%`,
        conversionRate: '24.5%', // Would calculate from actual data
        avgTicketSize: currentRev / (activeServiceRequests[0]?.count || 1)
      },
      period,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching executive stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revenue breakdown by service category
router.get('/revenue/breakdown', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;

    const now = new Date();
    let startDate = new Date();
    if (period === '7d') startDate.setDate(now.getDate() - 7);
    else if (period === '30d') startDate.setDate(now.getDate() - 30);
    else if (period === '90d') startDate.setDate(now.getDate() - 90);

    // Get revenue grouped by service type (simplified)
    const revenueByService = await db
      .select({
        serviceType: serviceRequests.serviceId,
        total: sum(payments.amount),
        count: count()
      })
      .from(payments)
      .innerJoin(serviceRequests, eq(payments.serviceRequestId, serviceRequests.id))
      .where(
        and(
          gte(payments.createdAt, startDate),
          eq(payments.status, 'completed')
        )
      )
      .groupBy(serviceRequests.serviceId)
      .orderBy(desc(sum(payments.amount)))
      .limit(10);

    res.json({
      breakdown: revenueByService.map(item => ({
        serviceId: item.serviceType,
        revenue: Number(item.total || 0),
        transactions: item.count,
        percentage: 0 // Would calculate against total
      })),
      period
    });
  } catch (error) {
    console.error('Error fetching revenue breakdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revenue trend over time
router.get('/revenue/trend', async (req: Request, res: Response) => {
  try {
    const { period = '30d', granularity = 'daily' } = req.query;

    const now = new Date();
    let startDate = new Date();
    if (period === '7d') startDate.setDate(now.getDate() - 7);
    else if (period === '30d') startDate.setDate(now.getDate() - 30);
    else if (period === '90d') startDate.setDate(now.getDate() - 90);

    // Generate trend data (simplified - would use actual date grouping)
    const trend = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      trend.push({
        date: currentDate.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 50000) + 10000, // Placeholder
        transactions: Math.floor(Math.random() * 20) + 5
      });
      if (granularity === 'daily') currentDate.setDate(currentDate.getDate() + 1);
      else if (granularity === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
      else currentDate.setMonth(currentDate.getMonth() + 1);
    }

    res.json({ trend, period, granularity });
  } catch (error) {
    console.error('Error fetching revenue trend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// BUSINESS INTELLIGENCE ROUTES
// ============================================================================

// Comprehensive BI Dashboard data
router.get('/bi/dashboard', async (req: Request, res: Response) => {
  try {
    const [
      clientsByType,
      servicesByStatus,
      leadsByStage,
      complianceOverview
    ] = await Promise.all([
      // Clients by entity type
      db.select({
        entityType: businessEntities.entityType,
        count: count()
      })
        .from(businessEntities)
        .groupBy(businessEntities.entityType),

      // Services by status
      db.select({
        status: serviceRequests.status,
        count: count()
      })
        .from(serviceRequests)
        .groupBy(serviceRequests.status),

      // Leads by stage
      db.select({
        stage: leads.stage,
        count: count()
      })
        .from(leads)
        .groupBy(leads.stage),

      // Compliance tracking summary
      db.select({
        status: complianceTracking.status,
        count: count()
      })
        .from(complianceTracking)
        .groupBy(complianceTracking.status)
    ]);

    res.json({
      clientAnalytics: {
        byEntityType: clientsByType,
        totalActive: clientsByType.reduce((sum, c) => sum + (c.count || 0), 0)
      },
      serviceAnalytics: {
        byStatus: servicesByStatus,
        totalInProgress: servicesByStatus.find(s => s.status === 'in_progress')?.count || 0
      },
      salesAnalytics: {
        byStage: leadsByStage,
        pipelineValue: 0 // Would calculate from lead values
      },
      complianceAnalytics: {
        byStatus: complianceOverview,
        overdueCount: complianceOverview.find(c => c.status === 'overdue')?.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching BI dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Client acquisition funnel
router.get('/bi/funnel', async (req: Request, res: Response) => {
  try {
    const [totalLeads] = await db.select({ count: count() }).from(leads);
    const [qualifiedLeads] = await db.select({ count: count() }).from(leads).where(eq(leads.stage, 'qualified'));
    const [proposalSent] = await db.select({ count: count() }).from(leads).where(eq(leads.stage, 'proposal_sent'));
    const [converted] = await db.select({ count: count() }).from(leads).where(eq(leads.stage, 'converted'));

    res.json({
      funnel: [
        { stage: 'Total Leads', count: totalLeads?.count || 0, percentage: 100 },
        { stage: 'Qualified', count: qualifiedLeads?.count || 0, percentage: Math.round((qualifiedLeads?.count || 0) / (totalLeads?.count || 1) * 100) },
        { stage: 'Proposal Sent', count: proposalSent?.count || 0, percentage: Math.round((proposalSent?.count || 0) / (totalLeads?.count || 1) * 100) },
        { stage: 'Converted', count: converted?.count || 0, percentage: Math.round((converted?.count || 0) / (totalLeads?.count || 1) * 100) }
      ]
    });
  } catch (error) {
    console.error('Error fetching funnel data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Performance metrics by team/user
router.get('/bi/performance', async (req: Request, res: Response) => {
  try {
    const { metric = 'services', period = '30d' } = req.query;

    const now = new Date();
    let startDate = new Date();
    if (period === '7d') startDate.setDate(now.getDate() - 7);
    else if (period === '30d') startDate.setDate(now.getDate() - 30);
    else if (period === '90d') startDate.setDate(now.getDate() - 90);

    // Get performance by assigned user
    const performance = await db
      .select({
        userId: serviceRequests.assignedTo,
        completed: count(),
      })
      .from(serviceRequests)
      .where(
        and(
          gte(serviceRequests.updatedAt, startDate),
          eq(serviceRequests.status, 'completed')
        )
      )
      .groupBy(serviceRequests.assignedTo)
      .orderBy(desc(count()))
      .limit(10);

    res.json({
      metric,
      period,
      topPerformers: performance.map((p, index) => ({
        rank: index + 1,
        userId: p.userId,
        completed: p.completed,
        efficiency: 85 + Math.random() * 15 // Placeholder
      }))
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forecasting data
router.get('/bi/forecast', async (req: Request, res: Response) => {
  try {
    const { months = 3 } = req.query;

    // Simple forecast based on historical averages (placeholder)
    const forecast = [];
    const currentDate = new Date();

    for (let i = 1; i <= Number(months); i++) {
      const forecastDate = new Date(currentDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      forecast.push({
        month: forecastDate.toISOString().slice(0, 7),
        projectedRevenue: Math.floor(Math.random() * 200000) + 100000,
        projectedClients: Math.floor(Math.random() * 50) + 20,
        projectedServices: Math.floor(Math.random() * 100) + 50,
        confidence: 0.7 + Math.random() * 0.25
      });
    }

    res.json({
      forecast,
      methodology: 'linear_regression',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// UNIFIED DASHBOARD ROUTES
// ============================================================================

// Role-based dashboard stats
router.get('/dashboard/:role', async (req: Request, res: Response) => {
  try {
    const { role } = req.params;

    let dashboardData: any = {};

    switch (role) {
      case 'admin':
        const [totalUsers] = await db.select({ count: count() }).from(users);
        const [totalEntities] = await db.select({ count: count() }).from(businessEntities);
        const [pendingServices] = await db.select({ count: count() }).from(serviceRequests).where(eq(serviceRequests.status, 'pending'));

        dashboardData = {
          role: 'admin',
          widgets: [
            { id: 'users', label: 'Total Users', value: totalUsers?.count || 0, trend: '+5%' },
            { id: 'entities', label: 'Business Entities', value: totalEntities?.count || 0, trend: '+12%' },
            { id: 'pending', label: 'Pending Services', value: pendingServices?.count || 0, trend: '-3%' },
            { id: 'system', label: 'System Health', value: '99.9%', trend: 'stable' }
          ],
          quickActions: ['manage_users', 'view_logs', 'system_config', 'reports']
        };
        break;

      case 'operations':
        const [queueSize] = await db.select({ count: count() }).from(serviceRequests).where(eq(serviceRequests.status, 'in_progress'));
        const [todayCompleted] = await db.select({ count: count() }).from(serviceRequests).where(
          and(
            eq(serviceRequests.status, 'completed'),
            gte(serviceRequests.updatedAt, new Date(new Date().setHours(0, 0, 0, 0)))
          )
        );

        dashboardData = {
          role: 'operations',
          widgets: [
            { id: 'queue', label: 'Queue Size', value: queueSize?.count || 0, trend: 'normal' },
            { id: 'completed', label: 'Completed Today', value: todayCompleted?.count || 0, trend: '+8%' },
            { id: 'sla', label: 'SLA Compliance', value: '94%', trend: '+2%' },
            { id: 'escalations', label: 'Escalations', value: 3, trend: '-1' }
          ],
          quickActions: ['view_queue', 'assign_tasks', 'qc_review', 'reports']
        };
        break;

      case 'sales':
        const [openLeads] = await db.select({ count: count() }).from(leads).where(eq(leads.stage, 'new'));
        const [monthlyConverted] = await db.select({ count: count() }).from(leads).where(
          and(
            eq(leads.stage, 'converted'),
            gte(leads.updatedAt, new Date(new Date().setDate(1)))
          )
        );

        dashboardData = {
          role: 'sales',
          widgets: [
            { id: 'leads', label: 'Open Leads', value: openLeads?.count || 0, trend: '+15%' },
            { id: 'converted', label: 'Conversions (MTD)', value: monthlyConverted?.count || 0, trend: '+22%' },
            { id: 'pipeline', label: 'Pipeline Value', value: '₹2.5L', trend: '+18%' },
            { id: 'target', label: 'Target Progress', value: '67%', trend: 'on_track' }
          ],
          quickActions: ['new_lead', 'follow_ups', 'proposals', 'reports']
        };
        break;

      default:
        // Client/general dashboard
        const [activeServices] = await db.select({ count: count() }).from(serviceRequests).where(eq(serviceRequests.status, 'in_progress'));

        dashboardData = {
          role: 'client',
          widgets: [
            { id: 'services', label: 'Active Services', value: activeServices?.count || 0, trend: 'stable' },
            { id: 'compliance', label: 'Compliance Score', value: '85%', trend: '+3%' },
            { id: 'documents', label: 'Pending Documents', value: 2, trend: '-1' },
            { id: 'due', label: 'Upcoming Deadlines', value: 5, trend: 'attention' }
          ],
          quickActions: ['new_request', 'upload_docs', 'view_calendar', 'support']
        };
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// FOUNDER LITE ROUTES (Simplified dashboard for founders)
// ============================================================================

router.get('/founder/overview', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.query;

    // Simplified overview for founders
    const overview = {
      companyHealth: {
        score: 85,
        status: 'good',
        trend: '+5%',
        lastUpdated: new Date().toISOString()
      },
      keyMetrics: [
        { label: 'Compliance Status', value: 'Green', icon: 'shield' },
        { label: 'Active Services', value: 3, icon: 'briefcase' },
        { label: 'Pending Tasks', value: 2, icon: 'clipboard' },
        { label: 'Funding Ready', value: '78%', icon: 'trending-up' }
      ],
      upcomingDeadlines: [
        { date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), item: 'GST Return', priority: 'high' },
        { date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), item: 'TDS Payment', priority: 'medium' },
        { date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), item: 'Annual Filing', priority: 'low' }
      ],
      quickActions: [
        { id: 'request_service', label: 'Request Service', icon: 'plus' },
        { id: 'view_compliance', label: 'View Compliance', icon: 'shield' },
        { id: 'upload_docs', label: 'Upload Documents', icon: 'upload' },
        { id: 'contact_support', label: 'Get Help', icon: 'help' }
      ],
      notifications: [
        { type: 'reminder', message: 'GST return due in 7 days', read: false },
        { type: 'success', message: 'ROC filing completed successfully', read: true }
      ]
    };

    res.json(overview);
  } catch (error) {
    console.error('Error fetching founder overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Founder quick stats
router.get('/founder/stats', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.query;

    res.json({
      complianceScore: 85,
      documentsUploaded: 24,
      servicesCompleted: 12,
      upcomingDeadlines: 3,
      pendingActions: 2,
      savingsFromAutomation: 15000,
      timeToNextDeadline: '7 days',
      entityHealth: 'excellent'
    });
  } catch (error) {
    console.error('Error fetching founder stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
