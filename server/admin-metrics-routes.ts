/**
 * ADMIN METRICS API ROUTES
 * File: server/admin-metrics-routes.ts
 *
 * Comprehensive system and business metrics APIs for Admin Dashboard
 * Features: Caching, Trend Analysis, Alerts, Exports, Real-time Performance
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from './config/database';
import {
  users,
  auditLogs,
  systemConfiguration
} from '../shared/schema';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { authenticateToken } from './middleware/auth';
import { requireMinimumRole, USER_ROLES } from './rbac-middleware';
import { logger } from './config/logger';
import os from 'os';

// Import metrics service
import {
  metricsCache,
  getDatabaseMetrics,
  getRevenueMetrics,
  getClientMetrics,
  getServiceMetrics,
  getComplianceMetrics,
  getLeadMetrics,
  getAgentMetrics,
  getUserActivityMetrics,
  getTrendComparison,
  getSystemConfig,
  updateSystemConfig,
  performanceTracker,
  checkSystemAlerts,
  getDashboardSummary
} from './services/metricsService';

const router = Router();

// ============ MIDDLEWARE ============

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireMinimumRole(USER_ROLES.ADMIN));

// Performance tracking middleware
router.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    performanceTracker.record({
      endpoint: req.path,
      method: req.method,
      responseTime: Date.now() - start,
      statusCode: res.statusCode,
      timestamp: new Date()
    });
  });

  next();
});

// Input validation schemas
const periodSchema = z.object({
  period: z.string().regex(/^\d+$/).optional().default('30')
});

const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('50')
});

const dateRangeSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

// ============ DASHBOARD SUMMARY ============

/**
 * GET /api/v1/admin/dashboard
 * Single endpoint for complete dashboard overview
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string) || 30;

    const summary = await getDashboardSummary(days);

    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    logger.error('Error fetching dashboard summary', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard summary' });
  }
});

// ============ SYSTEM METRICS ============

/**
 * GET /api/v1/admin/metrics/system
 * System health and infrastructure metrics
 */
router.get('/metrics/system', async (req: Request, res: Response) => {
  try {
    const dbMetrics = await getDatabaseMetrics();

    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = os.loadavg();

    res.json({
      success: true,
      data: {
        database: dbMetrics,
        application: {
          uptime: {
            seconds: Math.floor(uptime),
            formatted: formatUptime(uptime),
          },
          memory: {
            heapUsed: formatBytes(memoryUsage.heapUsed),
            heapTotal: formatBytes(memoryUsage.heapTotal),
            heapUsedRaw: memoryUsage.heapUsed,
            heapTotalRaw: memoryUsage.heapTotal,
            rss: formatBytes(memoryUsage.rss),
            external: formatBytes(memoryUsage.external),
            usagePercent: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1)
          },
          cpu: {
            load1m: cpuUsage[0]?.toFixed(2),
            load5m: cpuUsage[1]?.toFixed(2),
            load15m: cpuUsage[2]?.toFixed(2),
            cores: os.cpus().length,
          },
          nodeVersion: process.version,
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname()
        },
        cache: metricsCache.getStats(),
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    logger.error('Error fetching system metrics', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch system metrics' });
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
    const days = parseInt(period as string) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [revenue, clients, services, agents, leads] = await Promise.all([
      getRevenueMetrics(days),
      getClientMetrics(days),
      getServiceMetrics(days),
      getAgentMetrics(days),
      getLeadMetrics(days)
    ]);

    res.json({
      success: true,
      data: {
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
        revenue,
        clients,
        services,
        agents,
        leads
      }
    });
  } catch (error: any) {
    logger.error('Error fetching business metrics', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch business metrics' });
  }
});

// ============ TREND ANALYSIS ============

/**
 * GET /api/v1/admin/metrics/trends
 * Period-over-period comparison
 */
router.get('/metrics/trends', async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string) || 30;

    const [revenue, clients, services, leads] = await Promise.all([
      getTrendComparison('revenue', days),
      getTrendComparison('clients', days),
      getTrendComparison('services', days),
      getTrendComparison('leads', days)
    ]);

    res.json({
      success: true,
      data: {
        period: days,
        comparisons: {
          revenue,
          clients,
          services,
          leads
        }
      }
    });
  } catch (error: any) {
    logger.error('Error fetching trend analysis', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch trend analysis' });
  }
});

// ============ COMPLIANCE METRICS ============

/**
 * GET /api/v1/admin/metrics/compliance
 * Compliance health and status
 */
router.get('/metrics/compliance', async (req: Request, res: Response) => {
  try {
    const compliance = await getComplianceMetrics();

    res.json({
      success: true,
      data: compliance
    });
  } catch (error: any) {
    logger.error('Error fetching compliance metrics', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch compliance metrics' });
  }
});

// ============ USER ACTIVITY ============

/**
 * GET /api/v1/admin/metrics/users
 * User activity analytics
 */
router.get('/metrics/users', async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string) || 30;

    const activity = await getUserActivityMetrics(days);

    res.json({
      success: true,
      data: activity
    });
  } catch (error: any) {
    logger.error('Error fetching user activity metrics', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch user activity metrics' });
  }
});

// ============ PERFORMANCE METRICS ============

/**
 * GET /api/v1/admin/metrics/performance
 * Real-time API performance metrics
 */
router.get('/metrics/performance', async (req: Request, res: Response) => {
  try {
    const { minutes = '60' } = req.query;
    const mins = parseInt(minutes as string) || 60;

    const stats = performanceTracker.getStats(mins);

    res.json({
      success: true,
      data: {
        period: `${mins} minutes`,
        ...stats
      }
    });
  } catch (error: any) {
    logger.error('Error fetching performance metrics', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch performance metrics' });
  }
});

// ============ ALERTS ============

/**
 * GET /api/v1/admin/alerts
 * System alerts and threshold warnings
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = await checkSystemAlerts();

    res.json({
      success: true,
      data: {
        count: alerts.length,
        critical: alerts.filter(a => a.type === 'critical').length,
        warnings: alerts.filter(a => a.type === 'warning').length,
        alerts
      }
    });
  } catch (error: any) {
    logger.error('Error fetching system alerts', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch system alerts' });
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

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));

    // Build conditions
    let conditions: any[] = [];

    if (userId) {
      const uid = parseInt(userId as string);
      if (!isNaN(uid)) {
        conditions.push(eq(auditLogs.userId, uid));
      }
    }
    if (action && typeof action === 'string') {
      conditions.push(eq(auditLogs.action, action));
    }
    if (entity && typeof entity === 'string') {
      conditions.push(eq(auditLogs.entityType, entity));
    }
    if (dateFrom && typeof dateFrom === 'string') {
      const date = new Date(dateFrom);
      if (!isNaN(date.getTime())) {
        conditions.push(gte(auditLogs.createdAt, date));
      }
    }
    if (dateTo && typeof dateTo === 'string') {
      const date = new Date(dateTo);
      if (!isNaN(date.getTime())) {
        conditions.push(lte(auditLogs.createdAt, date));
      }
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

    // Get available filters
    const [actions, entities] = await Promise.all([
      db.selectDistinct({ action: auditLogs.action }).from(auditLogs).limit(50),
      db.selectDistinct({ entity: auditLogs.entityType }).from(auditLogs).limit(50)
    ]);

    const total = countResult?.count || 0;

    res.json({
      success: true,
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
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1
      },
      filters: {
        actions: actions.map(a => a.action).filter(Boolean),
        entities: entities.map(e => e.entity).filter(Boolean),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching audit log', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch audit log' });
  }
});

// ============ EXPORT METRICS ============

/**
 * GET /api/v1/admin/export/:type
 * Export metrics to CSV format
 */
router.get('/export/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { period = '30' } = req.query;
    const days = parseInt(period as string) || 30;

    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'revenue':
        const revenue = await getRevenueMetrics(days);
        data = revenue.monthly.map((m: any) => ({
          month: m.month,
          revenue: m.revenue,
          transactions: m.transactions
        }));
        filename = `revenue_report_${days}d.csv`;
        break;

      case 'clients':
        const clients = await getClientMetrics(days);
        data = clients.byType.map((c: any) => ({
          entityType: c.type,
          count: c.count
        }));
        filename = `client_report_${days}d.csv`;
        break;

      case 'services':
        const services = await getServiceMetrics(days);
        data = services.topServices.map((s: any) => ({
          serviceId: s.serviceId,
          count: s.count,
          revenue: s.revenue
        }));
        filename = `services_report_${days}d.csv`;
        break;

      case 'compliance':
        const compliance = await getComplianceMetrics();
        data = compliance.upcomingDeadlines.map((d: any) => ({
          serviceType: d.serviceType,
          entityName: d.entityName,
          dueDate: d.dueDate,
          priority: d.priority
        }));
        filename = `compliance_report.csv`;
        break;

      default:
        return res.status(400).json({ success: false, error: 'Invalid export type' });
    }

    // Convert to CSV
    if (data.length === 0) {
      return res.status(404).json({ success: false, error: 'No data to export' });
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(v =>
        typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error: any) {
    logger.error('Error exporting metrics', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to export metrics' });
  }
});

// ============ SYSTEM CONFIG ============

/**
 * GET /api/v1/admin/config
 * Get system configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    // Get from database
    const dbConfig = await getSystemConfig(category as string);

    // Merge with defaults
    const defaults = {
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

    res.json({
      success: true,
      data: { ...defaults, ...dbConfig }
    });
  } catch (error: any) {
    logger.error('Error fetching config', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch configuration' });
  }
});

/**
 * PUT /api/v1/admin/config/:key
 * Update system configuration (Super Admin only)
 */
router.put('/config/:key', requireMinimumRole(USER_ROLES.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, category = 'general' } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ success: false, error: 'Key and value are required' });
    }

    // Get previous value for audit
    const previous = await getSystemConfig();
    const oldValue = previous[key];

    // Update config
    const success = await updateSystemConfig(key, value, category, req.user!.id);

    if (!success) {
      return res.status(500).json({ success: false, error: 'Failed to update configuration' });
    }

    // Log the change
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'CONFIG_UPDATE',
      entityType: 'SYSTEM_CONFIG',
      entityId: key,
      oldValue: JSON.stringify(oldValue || {}),
      newValue: JSON.stringify(value),
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date(),
    });

    res.json({ success: true, message: `Configuration ${key} updated` });
  } catch (error: any) {
    logger.error('Error updating config', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update configuration' });
  }
});

// ============ CACHE MANAGEMENT ============

/**
 * POST /api/v1/admin/cache/invalidate
 * Invalidate metrics cache (Super Admin only)
 */
router.post('/cache/invalidate', requireMinimumRole(USER_ROLES.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const { pattern } = req.body;

    metricsCache.invalidate(pattern);

    // Log the action
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'CACHE_INVALIDATE',
      entityType: 'SYSTEM_CACHE',
      entityId: pattern || 'all',
      oldValue: null,
      newValue: null,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      message: pattern ? `Cache invalidated for pattern: ${pattern}` : 'All cache invalidated'
    });
  } catch (error: any) {
    logger.error('Error invalidating cache', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to invalidate cache' });
  }
});

/**
 * GET /api/v1/admin/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = metricsCache.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Error fetching cache stats', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch cache stats' });
  }
});

// ============ HEALTH CHECK ============

/**
 * GET /api/v1/admin/health
 * Detailed health check
 */
router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Database check
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    const dbLatency = Date.now() - dbStart;
    health.checks.database = {
      status: dbLatency < 100 ? 'healthy' : 'warning',
      latency: `${dbLatency}ms`
    };
  } catch (e) {
    health.checks.database = { status: 'unhealthy', error: 'Connection failed' };
    health.status = 'unhealthy';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memUsagePct = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  health.checks.memory = {
    status: memUsagePct < 80 ? 'healthy' : memUsagePct < 95 ? 'warning' : 'critical',
    usagePercent: memUsagePct.toFixed(1),
    heapUsed: formatBytes(memUsage.heapUsed),
    heapTotal: formatBytes(memUsage.heapTotal)
  };

  if (memUsagePct >= 95) {
    health.status = 'unhealthy';
  } else if (memUsagePct >= 80 && health.status === 'healthy') {
    health.status = 'warning';
  }

  // CPU check
  const cpuLoad = os.loadavg()[0];
  const cpuCores = os.cpus().length;
  const cpuUsagePct = (cpuLoad / cpuCores) * 100;
  health.checks.cpu = {
    status: cpuUsagePct < 70 ? 'healthy' : cpuUsagePct < 90 ? 'warning' : 'critical',
    load: cpuLoad.toFixed(2),
    cores: cpuCores,
    usagePercent: cpuUsagePct.toFixed(1)
  };

  // Cache check
  const cacheStats = metricsCache.getStats();
  health.checks.cache = {
    status: 'healthy',
    entries: cacheStats.size
  };

  // Uptime
  health.checks.uptime = {
    status: 'healthy',
    seconds: Math.floor(process.uptime()),
    formatted: formatUptime(process.uptime())
  };

  health.responseTime = `${Date.now() - startTime}ms`;

  res.status(health.status === 'healthy' ? 200 : health.status === 'warning' ? 200 : 503).json(health);
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
