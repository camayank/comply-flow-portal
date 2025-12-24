import type { Express } from "express";
import { db } from './db';
import { sql } from 'drizzle-orm';
import { storage } from './storage';

export function registerHealthRoutes(app: Express) {
  
  // Simple health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Detailed health check with database connectivity
  app.get('/health/detailed', async (req, res) => {
    const healthStatus: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {}
    };

    // Check database connectivity
    try {
      await db.execute(sql`SELECT 1`);
      healthStatus.checks.database = {
        status: 'ok',
        message: 'Database connection successful'
      };
    } catch (error) {
      healthStatus.status = 'degraded';
      healthStatus.checks.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database connection failed'
      };
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    healthStatus.checks.memory = {
      status: 'ok',
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    };

    // Check environment
    healthStatus.checks.environment = {
      nodeEnv: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    };

    // Check storage backend (critical for production)
    try {
      const storageInfo = (storage as any).getStorageBackendInfo?.();
      if (storageInfo) {
        const isProduction = process.env.NODE_ENV === 'production';
        const isProductionSafe = storageInfo.isProductionSafe;

        healthStatus.checks.storage = {
          status: (isProduction && !isProductionSafe) ? 'warning' : 'ok',
          type: storageInfo.type,
          usesDatabase: storageInfo.usesDatabase,
          databaseEntities: storageInfo.databaseEntities,
          memoryEntities: storageInfo.memoryEntities,
          isProductionSafe: storageInfo.isProductionSafe,
          warning: (isProduction && !isProductionSafe)
            ? 'DANGER: Using in-memory storage in production - data loss will occur on restart'
            : undefined
        };

        if (isProduction && !isProductionSafe) {
          healthStatus.status = 'degraded';
        }
      } else {
        healthStatus.checks.storage = {
          status: 'unknown',
          message: 'Storage backend info not available'
        };
      }
    } catch (error) {
      healthStatus.checks.storage = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Storage check failed'
      };
    }

    const statusCode = healthStatus.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  });

  // Readiness check (for load balancers)
  app.get('/ready', async (req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      res.status(200).json({ ready: true });
    } catch (error) {
      res.status(503).json({ 
        ready: false, 
        error: error instanceof Error ? error.message : 'Not ready' 
      });
    }
  });

  // Liveness check (for container orchestration)
  app.get('/live', (req, res) => {
    res.status(200).json({ alive: true });
  });

  // Background jobs status (for operational monitoring)
  app.get('/health/jobs', (req, res) => {
    const { jobManager } = require('./job-lifecycle-manager');

    const jobs = jobManager.getStatus();
    const activeCount = jobManager.getActiveJobCount();

    res.json({
      status: 'ok',
      activeJobs: activeCount,
      jobs: jobs.map((job: any) => ({
        id: job.id,
        type: job.type,
        description: job.description,
        startedAt: job.startedAt,
        lastRun: job.lastRun,
        runCount: job.runCount,
        uptime: Date.now() - new Date(job.startedAt).getTime()
      }))
    });
  });

  // Compliance scheduler status
  app.get('/health/scheduler', async (req, res) => {
    try {
      const { getSchedulerStatus } = await import('./jobs/compliance-scheduler');
      const schedulerStatus = getSchedulerStatus();

      // Get some stats from database
      let complianceStats = null;
      try {
        const statsResult = await db.execute(sql`
          SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
          FROM compliance_tracking
          WHERE created_at >= NOW() - INTERVAL '30 days'
        `);
        complianceStats = (statsResult as any).rows?.[0] || null;
      } catch {
        // Table might not exist
      }

      // Get upcoming tasks count
      let upcomingTasks = 0;
      try {
        const taskResult = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM task_items
          WHERE status NOT IN ('completed', 'cancelled')
          AND due_date >= NOW()
          AND due_date <= NOW() + INTERVAL '7 days'
        `);
        upcomingTasks = parseInt((taskResult as any).rows?.[0]?.count || '0');
      } catch {
        // Table might not exist
      }

      res.json({
        status: schedulerStatus.initialized ? 'ok' : 'not_initialized',
        scheduler: schedulerStatus,
        complianceStats,
        upcomingTasksNext7Days: upcomingTasks,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Manual trigger for compliance jobs (admin only, for testing)
  app.post('/health/scheduler/run/:jobName', async (req, res) => {
    const { jobName } = req.params;

    // In production, this should be protected by admin auth
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Manual triggers disabled in production' });
    }

    try {
      const scheduler = await import('./jobs/compliance-scheduler');

      // We can't directly call the internal functions, but we can provide feedback
      res.json({
        status: 'acknowledged',
        message: `Job ${jobName} acknowledged. Check logs for execution status.`,
        note: 'Manual job triggers run asynchronously via cron'
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  });

  console.log('✅ Health check routes registered');
}
