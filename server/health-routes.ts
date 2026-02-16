import type { Express } from "express";
import { db, getPoolStats } from './db';
import { sql } from 'drizzle-orm';
import { storage } from './storage';
import { getHealthMetrics } from './robustness-middleware';

export function registerHealthRoutes(app: Express) {

  // Simple health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
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

    // Check database connectivity and pool stats
    try {
      await db.execute(sql`SELECT 1`);
      const poolStats = getPoolStats();
      healthStatus.checks.database = {
        status: 'ok',
        message: 'Database connection successful',
        pool: {
          total: poolStats.totalCount,
          idle: poolStats.idleCount,
          waiting: poolStats.waitingCount,
          max: poolStats.maxConnections,
          utilization: `${Math.round((poolStats.totalCount - poolStats.idleCount) / poolStats.maxConnections * 100)}%`,
        }
      };

      // Warn if pool is under pressure
      if (poolStats.waitingCount > 0) {
        healthStatus.checks.database.warning = 'Queries waiting for connections';
        if (poolStats.waitingCount > 5) {
          healthStatus.status = 'degraded';
        }
      }
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

    // Request metrics (if available)
    try {
      const metrics = getHealthMetrics();
      healthStatus.checks.requests = {
        status: 'ok',
        totalRequests: metrics.totalRequests,
        errorRate: `${metrics.errorRate.toFixed(2)}%`,
        avgResponseTime: `${metrics.avgResponseTime.toFixed(0)}ms`,
        lastMinute: {
          requests: metrics.requestsLastMinute,
          errors: metrics.errorsLastMinute,
        },
      };

      // Warn if error rate is high
      if (metrics.errorRate > 10) {
        healthStatus.checks.requests.warning = 'High error rate detected';
        if (metrics.errorRate > 25) {
          healthStatus.status = 'degraded';
        }
      }
    } catch {
      // Metrics not available, skip
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
  app.get('/health/jobs', async (req, res) => {
    const { jobManager } = await import('./job-lifecycle-manager.js');

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

  console.log('✅ Health check routes registered');
}
