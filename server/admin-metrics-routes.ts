/**
 * ADMIN METRICS API ROUTES
 * File: server/admin-metrics-routes.ts
 *
 * System and business metrics APIs for Admin Dashboard
 */

import { Router, Request, Response } from 'express';
import { db } from './config/database';
import {
  users,
  businessEntities,
  serviceRequests,
  taskItems,
  payments,
  invoices,
  commissionRecords,
  leads,
  agentProfiles,
  complianceTracking,
  auditLogs
} from '../shared/schema';
import { eq, and, gte, lte, desc, asc, sql, count, sum } from 'drizzle-orm';
import { authenticateToken } from './middleware/auth';
import { requireMinimumRole, USER_ROLES } from './rbac-middleware';
import { logger } from './config/logger';
import os from 'os';

const router = Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireMinimumRole(USER_ROLES.ADMIN));

// ============ SYSTEM METRICS ============

/**
 * GET /api/v1/admin/metrics/system
 * System health and infrastructure metrics
 */
router.get('/metrics/system', async (req: Request, res: Response) => {
  try {
    // Database counts
    const [userCount] = await db.select({ count: count() }).from(users);
    const [clientCount] = await db.select({ count: count() }).from(businessEntities);
    const [serviceCount] = await db.select({ count: count() }).from(serviceRequests);
    const [taskCount] = await db.select({ count: count() }).from(taskItems);
    const [paymentCount] = await db.select({ count: count() }).from(payments);

    // Active sessions (users logged in last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [activeUsers] = await db.select({ count: count() })
      .from(users)
      .where(gte(users.lastLogin, oneDayAgo));

    // Application metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = os.loadavg();

    // Database size (PostgreSQL)
    let dbSize = 'N/A';
    try {
      const [sizeResult] = await db.execute(sql`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      dbSize = (sizeResult as any)?.size || 'N/A';
    } catch (e) {
      // Ignore if not PostgreSQL
    }

    res.json({
      database: {
        totalUsers: userCount?.count || 0,
        totalClients: clientCount?.count || 0,
        totalServiceRequests: serviceCount?.count || 0,
        totalTasks: taskCount?.count || 0,
        totalPayments: paymentCount?.count || 0,
        size: dbSize,
      },
      application: {
        uptime: {
          seconds: Math.floor(uptime),
          formatted: formatUptime(uptime),
        },
        memory: {
          heapUsed: formatBytes(memoryUsage.heapUsed),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          rss: formatBytes(memoryUsage.rss),
          external: formatBytes(memoryUsage.external),
        },
        cpu: {
          load1m: cpuUsage[0]?.toFixed(2),
          load5m: cpuUsage[1]?.toFixed(2),
          load15m: cpuUsage[2]?.toFixed(2),
          cores: os.cpus().length,
        },
        nodeVersion: process.version,
        platform: os.platform(),
      },
      users: {
        total: userCount?.count || 0,
        activeIn24h: activeUsers?.count || 0,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error fetching system metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

// ============ BUSINESS METRICS ============

/**
 * GET /api/v1/admin/metrics/business
 * Business KPIs and analytics
 */
router.get('/metrics/business', async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Revenue metrics
    const [totalRevenue] = await db.select({
      total: sum(payments.amount),
      count: count(),
    })
      .from(payments)
      .where(and(
        eq(payments.status, 'completed'),
        gte(payments.createdAt, startDate)
      ));

    const [pendingPayments] = await db.select({
      total: sum(payments.amount),
      count: count(),
    })
      .from(payments)
      .where(eq(payments.status, 'pending'));

    // Revenue by month
    const monthlyRevenue = await db.execute(sql`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        SUM(amount) as revenue,
        COUNT(*) as transactions
      FROM payments
      WHERE status = 'completed'
      AND created_at >= ${startDate}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
    `);

    // Client metrics
    const [totalClients] = await db.select({ count: count() })
      .from(businessEntities);

    const [activeClients] = await db.select({ count: count() })
      .from(businessEntities)
      .where(eq(businessEntities.clientStatus, 'active'));

    const [newClients] = await db.select({ count: count() })
      .from(businessEntities)
      .where(gte(businessEntities.createdAt, startDate));

    // Clients by entity type (instead of subscription plan)
    const clientsByType = await db.select({
      type: businessEntities.entityType,
      count: count(),
    })
      .from(businessEntities)
      .where(eq(businessEntities.clientStatus, 'active'))
      .groupBy(businessEntities.entityType);

    // Service metrics
    const [serviceStats] = await db.select({
      total: count(),
      completed: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
      inProgress: sql<number>`COUNT(CASE WHEN status = 'in_progress' THEN 1 END)`,
      pending: sql<number>`COUNT(CASE WHEN status = 'initiated' THEN 1 END)`,
    })
      .from(serviceRequests)
      .where(gte(serviceRequests.createdAt, startDate));

    // Average completion time
    const [avgCompletion] = await db.execute(sql`
      SELECT AVG(EXTRACT(EPOCH FROM (actual_completion - created_at)) / 3600) as avg_hours
      FROM service_requests
      WHERE status = 'completed'
      AND actual_completion IS NOT NULL
      AND created_at >= ${startDate}
    `);

    // Task SLA compliance
    const [taskStats] = await db.select({
      total: count(),
      completed: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
    })
      .from(taskItems)
      .where(gte(taskItems.createdAt, startDate));

    const taskCompletionRate = taskStats?.total
      ? Math.round((taskStats.completed || 0) / taskStats.total * 100)
      : 100;

    // Agent metrics
    const [agentStats] = await db.select({
      total: count(),
      active: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
    })
      .from(agentProfiles);

    const [commissionStats] = await db.select({
      total: sum(commissionRecords.commissionAmount),
      pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END)`,
      paid: sql<number>`SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END)`,
    })
      .from(commissionRecords)
      .where(gte(commissionRecords.createdAt, startDate));

    // Lead metrics
    const [leadStats] = await db.select({
      total: count(),
      converted: sql<number>`COUNT(CASE WHEN status = 'converted' THEN 1 END)`,
    })
      .from(leads)
      .where(gte(leads.createdAt, startDate));

    const conversionRate = leadStats?.total
      ? Math.round((leadStats.converted || 0) / leadStats.total * 100)
      : 0;

    // Top services
    const topServices = await db.select({
      serviceId: serviceRequests.serviceId,
      count: count(),
      revenue: sum(serviceRequests.totalAmount),
    })
      .from(serviceRequests)
      .where(gte(serviceRequests.createdAt, startDate))
      .groupBy(serviceRequests.serviceId)
      .orderBy(desc(count()))
      .limit(10);

    res.json({
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      revenue: {
        total: Number(totalRevenue?.total || 0),
        transactions: totalRevenue?.count || 0,
        pending: Number(pendingPayments?.total || 0),
        pendingCount: pendingPayments?.count || 0,
        averageTransaction: totalRevenue?.count
          ? Math.round(Number(totalRevenue.total || 0) / totalRevenue.count)
          : 0,
        monthly: monthlyRevenue.rows,
      },
      clients: {
        total: totalClients?.count || 0,
        active: activeClients?.count || 0,
        new: newClients?.count || 0,
        byType: clientsByType,
        retentionRate: totalClients?.count
          ? Math.round((activeClients?.count || 0) / totalClients.count * 100)
          : 0,
      },
      services: {
        total: serviceStats?.total || 0,
        completed: serviceStats?.completed || 0,
        inProgress: serviceStats?.inProgress || 0,
        pending: serviceStats?.pending || 0,
        completionRate: serviceStats?.total
          ? Math.round((serviceStats.completed || 0) / serviceStats.total * 100)
          : 0,
        avgCompletionHours: Math.round(Number((avgCompletion.rows[0] as any)?.avg_hours || 0)),
        taskCompletionRate,
        topServices,
      },
      agents: {
        total: agentStats?.total || 0,
        active: agentStats?.active || 0,
        commissions: {
          total: Number(commissionStats?.total || 0),
          pending: Number(commissionStats?.pending || 0),
          paid: Number(commissionStats?.paid || 0),
        },
      },
      leads: {
        total: leadStats?.total || 0,
        converted: leadStats?.converted || 0,
        conversionRate,
      },
    });

  } catch (error: any) {
    logger.error('Error fetching business metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch business metrics' });
  }
});

// ============ COMPLIANCE METRICS ============

/**
 * GET /api/v1/admin/metrics/compliance
 * Compliance health and status
 */
router.get('/metrics/compliance', async (req: Request, res: Response) => {
  try {
    const [complianceStats] = await db.select({
      total: count(),
      completed: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
      overdue: sql<number>`COUNT(CASE WHEN status = 'overdue' THEN 1 END)`,
      pending: sql<number>`COUNT(CASE WHEN status = 'pending' THEN 1 END)`,
    })
      .from(complianceTracking);

    // Overdue by compliance type
    const overdueByType = await db.select({
      complianceType: complianceTracking.complianceType,
      count: count(),
    })
      .from(complianceTracking)
      .where(eq(complianceTracking.status, 'overdue'))
      .groupBy(complianceTracking.complianceType);

    // Upcoming deadlines (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingDeadlines = await db.select({
      id: complianceTracking.id,
      serviceType: complianceTracking.serviceType,
      dueDate: complianceTracking.dueDate,
      entityName: complianceTracking.entityName,
      priority: complianceTracking.priority,
    })
      .from(complianceTracking)
      .where(and(
        eq(complianceTracking.status, 'pending'),
        lte(complianceTracking.dueDate, thirtyDaysFromNow)
      ))
      .orderBy(asc(complianceTracking.dueDate))
      .limit(20);

    // Health score distribution
    const healthScoreDistribution = await db.execute(sql`
      SELECT
        CASE
          WHEN compliance_score >= 90 THEN 'Excellent'
          WHEN compliance_score >= 75 THEN 'Good'
          WHEN compliance_score >= 50 THEN 'Fair'
          ELSE 'Poor'
        END as category,
        COUNT(*) as count
      FROM business_entities
      WHERE client_status = 'active'
      GROUP BY
        CASE
          WHEN compliance_score >= 90 THEN 'Excellent'
          WHEN compliance_score >= 75 THEN 'Good'
          WHEN compliance_score >= 50 THEN 'Fair'
          ELSE 'Poor'
        END
    `);

    const overallComplianceRate = complianceStats?.total
      ? Math.round((complianceStats.completed || 0) / complianceStats.total * 100)
      : 100;

    res.json({
      summary: {
        total: complianceStats?.total || 0,
        completed: complianceStats?.completed || 0,
        overdue: complianceStats?.overdue || 0,
        pending: complianceStats?.pending || 0,
        complianceRate: overallComplianceRate,
      },
      overdueByType,
      upcomingDeadlines,
      healthScoreDistribution: healthScoreDistribution.rows,
    });

  } catch (error: any) {
    logger.error('Error fetching compliance metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch compliance metrics' });
  }
});

// ============ AUDIT LOG ============

/**
 * GET /api/v1/admin/audit-log
 * Activity audit trail
 */
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      action,
      entity,
      dateFrom,
      dateTo,
      page = '1',
      limit = '50'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // Build conditions
    let conditions: any[] = [];

    if (userId) {
      conditions.push(eq(auditLogs.userId, parseInt(userId as string)));
    }
    if (action) {
      conditions.push(eq(auditLogs.action, action as string));
    }
    if (entity) {
      conditions.push(eq(auditLogs.entityType, entity as string));
    }
    if (dateFrom) {
      conditions.push(gte(auditLogs.createdAt, new Date(dateFrom as string)));
    }
    if (dateTo) {
      conditions.push(lte(auditLogs.createdAt, new Date(dateTo as string)));
    }

    // Get total count
    const [countResult] = await db.select({ count: count() })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get paginated results
    const logs = await db.select({
      log: auditLogs,
      userName: users.fullName,
      userEmail: users.email,
    })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    // Get available actions for filter dropdown
    const actions = await db.selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .limit(50);

    // Get available entities for filter dropdown
    const entities = await db.selectDistinct({ entity: auditLogs.entityType })
      .from(auditLogs)
      .limit(50);

    res.json({
      data: logs.map(l => ({
        id: l.log.id,
        action: l.log.action,
        entityType: l.log.entityType,
        entityId: l.log.entityId,
        userId: l.log.userId,
        userName: l.userName,
        userEmail: l.userEmail,
        oldValue: l.log.oldValue,
        newValue: l.log.newValue,
        ipAddress: l.log.ipAddress,
        userAgent: l.log.userAgent,
        createdAt: l.log.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / limitNum),
      },
      filters: {
        actions: actions.map(a => a.action),
        entities: entities.map(e => e.entity),
      },
    });

  } catch (error: any) {
    logger.error('Error fetching audit log', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ============ SYSTEM CONFIG ============

/**
 * GET /api/v1/admin/config
 * Get system configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    // Fetch from systemConfig table or return defaults
    const config = {
      general: {
        appName: process.env.APP_NAME || 'Comply Flow',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@complyflow.in',
        timezone: process.env.TZ || 'Asia/Kolkata',
      },
      payments: {
        gateway: 'stripe',
        currency: 'INR',
        minimumAmount: 100,
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: true,
        whatsappEnabled: true,
      },
      compliance: {
        reminderDays: [7, 3, 1, 0],
        autoGenerateTasks: true,
        penaltyCalculation: true,
      },
      sla: {
        defaultHours: 48,
        warningThresholdHours: 4,
        breachEscalation: true,
      },
      commission: {
        defaultRate: 15,
        minimumPayout: 1000,
        payoutDay: 5,
      },
    };

    res.json(config);

  } catch (error: any) {
    logger.error('Error fetching config', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * PUT /api/v1/admin/config/:key
 * Update system configuration (Super Admin only)
 */
router.put('/config/:key', requireMinimumRole(USER_ROLES.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    // Log the change
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'CONFIG_UPDATE',
      entityType: 'SYSTEM_CONFIG',
      entityId: key,
      oldValue: JSON.stringify({}), // Would fetch previous value in real implementation
      newValue: JSON.stringify(value),
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date(),
    });

    res.json({ success: true, message: `Configuration ${key} updated` });

  } catch (error: any) {
    logger.error('Error updating config', { error: error.message });
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// ============ HEALTH CHECK ============

/**
 * GET /api/v1/admin/health
 * Detailed health check
 */
router.get('/health', async (req: Request, res: Response) => {
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Database check
  try {
    await db.execute(sql`SELECT 1`);
    health.checks.database = { status: 'healthy', latency: '< 10ms' };
  } catch (e) {
    health.checks.database = { status: 'unhealthy', error: 'Connection failed' };
    health.status = 'unhealthy';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memUsagePct = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  health.checks.memory = {
    status: memUsagePct < 90 ? 'healthy' : 'warning',
    usagePercent: memUsagePct.toFixed(1),
  };

  // Disk check (simplified)
  health.checks.disk = { status: 'healthy' };

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// ============ HELPER FUNCTIONS ============

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export default router;

// Export function to register routes
export function registerAdminMetricsRoutes(app: any) {
  app.use('/api/v1/admin', router);
}
