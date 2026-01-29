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
