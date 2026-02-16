/**
 * Monitoring API Routes
 *
 * Endpoints for APM metrics, alerts, and system diagnostics
 */

import { Router } from 'express';
import { getAPMMetrics, getSlowRequests, getTopEndpoints, getAlerts, apmCollector } from './apm';
import { db, getPoolStats } from '../db';
import { getCacheStats } from '../cache';
import { getQueueStats } from '../queues';

const router = Router();

/**
 * GET /api/monitoring/metrics
 * Get aggregated APM metrics
 */
router.get('/metrics', getAPMMetrics);

/**
 * GET /api/monitoring/slow-requests
 * Get slow request details
 */
router.get('/slow-requests', getSlowRequests);

/**
 * GET /api/monitoring/top-endpoints
 * Get most accessed endpoints
 */
router.get('/top-endpoints', getTopEndpoints);

/**
 * GET /api/monitoring/alerts
 * Get current alert status
 */
router.get('/alerts', getAlerts);

/**
 * GET /api/monitoring/dashboard
 * Comprehensive dashboard data for ops team
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [metrics, cacheStats, queueStats, poolStats] = await Promise.all([
      Promise.resolve(apmCollector.getMetrics(300000)), // Last 5 minutes
      getCacheStats(),
      getQueueStats(),
      Promise.resolve(getPoolStats()),
    ]);

    const slowRequests = apmCollector.getSlowRequests(1000, 5);
    const topEndpoints = apmCollector.getTopEndpoints(10);

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      apm: {
        requests: metrics.requests,
        performance: metrics.performance,
        throughput: metrics.throughput,
        errors: metrics.errors,
      },
      cache: cacheStats,
      queues: queueStats,
      database: {
        pool: poolStats,
      },
      insights: {
        slowRequests,
        topEndpoints,
      },
      system: metrics.system,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to gather monitoring data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/monitoring/system
 * System-level metrics
 */
router.get('/system', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    memory: {
      rss: formatBytes(memoryUsage.rss),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      heapUsed: formatBytes(memoryUsage.heapUsed),
      external: formatBytes(memoryUsage.external),
      heapUsedPercent: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1) + '%',
    },
    cpu: {
      user: (cpuUsage.user / 1000000).toFixed(2) + 's',
      system: (cpuUsage.system / 1000000).toFixed(2) + 's',
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
});

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export default router;
