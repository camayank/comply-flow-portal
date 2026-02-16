/**
 * Application Performance Monitoring (APM)
 *
 * Tracks application metrics, performance, and health
 */

import { Request, Response, NextFunction } from 'express';

// Metric types
interface MetricPoint {
  timestamp: number;
  value: number;
}

interface RequestMetric {
  path: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
}

interface AggregatedMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    byStatus: Record<string, number>;
    byEndpoint: Record<string, number>;
  };
  performance: {
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

// In-memory metrics storage (for production, use Prometheus/Datadog/etc.)
class APMCollector {
  private requestMetrics: RequestMetric[] = [];
  private responseTimes: number[] = [];
  private errorCounts: Record<string, number> = {};
  private startTime: number = Date.now();
  private lastCpuUsage: NodeJS.CpuUsage = process.cpuUsage();

  // Configuration
  private readonly MAX_METRICS_STORED = 10000;
  private readonly METRICS_RETENTION_MS = 60 * 60 * 1000; // 1 hour

  recordRequest(metric: RequestMetric): void {
    this.requestMetrics.push(metric);
    this.responseTimes.push(metric.responseTime);

    // Track errors
    if (metric.statusCode >= 400) {
      const errorType = metric.statusCode >= 500 ? 'server_error' : 'client_error';
      this.errorCounts[errorType] = (this.errorCounts[errorType] || 0) + 1;
      this.errorCounts[`status_${metric.statusCode}`] = (this.errorCounts[`status_${metric.statusCode}`] || 0) + 1;
    }

    // Cleanup old metrics periodically
    if (this.requestMetrics.length > this.MAX_METRICS_STORED) {
      this.cleanup();
    }
  }

  recordError(errorType: string): void {
    this.errorCounts[errorType] = (this.errorCounts[errorType] || 0) + 1;
  }

  private cleanup(): void {
    const cutoffTime = Date.now() - this.METRICS_RETENTION_MS;
    this.requestMetrics = this.requestMetrics.filter(m => m.timestamp > cutoffTime);
    this.responseTimes = this.responseTimes.slice(-this.MAX_METRICS_STORED);
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  getMetrics(windowMs: number = 60000): AggregatedMetrics {
    const now = Date.now();
    const cutoff = now - windowMs;

    // Filter to window
    const recentRequests = this.requestMetrics.filter(m => m.timestamp > cutoff);
    const recentTimes = recentRequests.map(r => r.responseTime);

    // Request stats
    const total = recentRequests.length;
    const successful = recentRequests.filter(r => r.statusCode < 400).length;
    const failed = total - successful;

    // By status code
    const byStatus: Record<string, number> = {};
    recentRequests.forEach(r => {
      const status = `${r.statusCode}`;
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    // By endpoint
    const byEndpoint: Record<string, number> = {};
    recentRequests.forEach(r => {
      const key = `${r.method} ${r.path}`;
      byEndpoint[key] = (byEndpoint[key] || 0) + 1;
    });

    // Performance stats
    const sortedTimes = [...recentTimes].sort((a, b) => a - b);

    return {
      requests: {
        total,
        successful,
        failed,
        byStatus,
        byEndpoint,
      },
      performance: {
        avgResponseTime: recentTimes.length > 0
          ? recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length
          : 0,
        p50ResponseTime: this.percentile(recentTimes, 50),
        p95ResponseTime: this.percentile(recentTimes, 95),
        p99ResponseTime: this.percentile(recentTimes, 99),
        maxResponseTime: sortedTimes[sortedTimes.length - 1] || 0,
        minResponseTime: sortedTimes[0] || 0,
      },
      throughput: {
        requestsPerSecond: total / (windowMs / 1000),
        requestsPerMinute: total / (windowMs / 60000),
      },
      errors: {
        total: failed,
        rate: total > 0 ? failed / total : 0,
        byType: { ...this.errorCounts },
      },
      system: {
        uptime: (now - this.startTime) / 1000,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(this.lastCpuUsage),
      },
    };
  }

  getSlowRequests(thresholdMs: number = 1000, limit: number = 10): RequestMetric[] {
    return this.requestMetrics
      .filter(m => m.responseTime > thresholdMs)
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, limit);
  }

  getTopEndpoints(limit: number = 10): Array<{ endpoint: string; count: number; avgTime: number }> {
    const endpointStats: Record<string, { count: number; totalTime: number }> = {};

    this.requestMetrics.forEach(m => {
      const key = `${m.method} ${m.path}`;
      if (!endpointStats[key]) {
        endpointStats[key] = { count: 0, totalTime: 0 };
      }
      endpointStats[key].count++;
      endpointStats[key].totalTime += m.responseTime;
    });

    return Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// Singleton collector
export const apmCollector = new APMCollector();

/**
 * APM Middleware - tracks request metrics
 */
export function apmMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const startHrTime = process.hrtime();

  // Capture original end
  const originalEnd = res.end.bind(res);

  // Override res.end to track metrics
  (res.end as any) = function(chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
    const hrTime = process.hrtime(startHrTime);
    const responseTime = hrTime[0] * 1000 + hrTime[1] / 1000000;

    // Normalize path (remove IDs for grouping)
    const normalizedPath = normalizePath(req.path);

    apmCollector.recordRequest({
      path: normalizedPath,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      timestamp: startTime,
    });

    return originalEnd(chunk, encoding as BufferEncoding, cb);
  };

  next();
}

/**
 * Normalize paths by replacing IDs with placeholders
 */
function normalizePath(path: string): string {
  return path
    // UUID
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Cleanup multiple slashes
    .replace(/\/+/g, '/');
}

/**
 * APM metrics endpoint handler
 */
export function getAPMMetrics(req: Request, res: Response): void {
  const windowMs = parseInt(req.query.window as string) || 60000;
  const metrics = apmCollector.getMetrics(windowMs);

  res.json({
    status: 'ok',
    window: `${windowMs / 1000}s`,
    timestamp: new Date().toISOString(),
    metrics,
  });
}

/**
 * APM slow requests endpoint handler
 */
export function getSlowRequests(req: Request, res: Response): void {
  const threshold = parseInt(req.query.threshold as string) || 1000;
  const limit = parseInt(req.query.limit as string) || 10;

  const slowRequests = apmCollector.getSlowRequests(threshold, limit);

  res.json({
    status: 'ok',
    threshold: `${threshold}ms`,
    count: slowRequests.length,
    requests: slowRequests,
  });
}

/**
 * APM top endpoints endpoint handler
 */
export function getTopEndpoints(req: Request, res: Response): void {
  const limit = parseInt(req.query.limit as string) || 10;

  const topEndpoints = apmCollector.getTopEndpoints(limit);

  res.json({
    status: 'ok',
    count: topEndpoints.length,
    endpoints: topEndpoints,
  });
}

// Alerting thresholds
export interface AlertThresholds {
  errorRatePercent: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  memoryUsagePercent: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  errorRatePercent: 5,
  p95ResponseTimeMs: 2000,
  p99ResponseTimeMs: 5000,
  memoryUsagePercent: 85,
};

/**
 * Check if any alert thresholds are breached
 */
export function checkAlerts(thresholds: AlertThresholds = DEFAULT_THRESHOLDS): Array<{
  type: string;
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
}> {
  const metrics = apmCollector.getMetrics(60000);
  const alerts: Array<{
    type: string;
    severity: 'warning' | 'critical';
    message: string;
    value: number;
    threshold: number;
  }> = [];

  // Error rate check
  const errorRate = metrics.errors.rate * 100;
  if (errorRate > thresholds.errorRatePercent) {
    alerts.push({
      type: 'error_rate',
      severity: errorRate > thresholds.errorRatePercent * 2 ? 'critical' : 'warning',
      message: `Error rate ${errorRate.toFixed(2)}% exceeds threshold ${thresholds.errorRatePercent}%`,
      value: errorRate,
      threshold: thresholds.errorRatePercent,
    });
  }

  // P95 response time check
  if (metrics.performance.p95ResponseTime > thresholds.p95ResponseTimeMs) {
    alerts.push({
      type: 'p95_response_time',
      severity: metrics.performance.p95ResponseTime > thresholds.p95ResponseTimeMs * 2 ? 'critical' : 'warning',
      message: `P95 response time ${metrics.performance.p95ResponseTime.toFixed(0)}ms exceeds threshold ${thresholds.p95ResponseTimeMs}ms`,
      value: metrics.performance.p95ResponseTime,
      threshold: thresholds.p95ResponseTimeMs,
    });
  }

  // P99 response time check
  if (metrics.performance.p99ResponseTime > thresholds.p99ResponseTimeMs) {
    alerts.push({
      type: 'p99_response_time',
      severity: metrics.performance.p99ResponseTime > thresholds.p99ResponseTimeMs * 2 ? 'critical' : 'warning',
      message: `P99 response time ${metrics.performance.p99ResponseTime.toFixed(0)}ms exceeds threshold ${thresholds.p99ResponseTimeMs}ms`,
      value: metrics.performance.p99ResponseTime,
      threshold: thresholds.p99ResponseTimeMs,
    });
  }

  // Memory usage check
  const memUsage = metrics.system.memoryUsage;
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapUsedPercent > thresholds.memoryUsagePercent) {
    alerts.push({
      type: 'memory_usage',
      severity: heapUsedPercent > 95 ? 'critical' : 'warning',
      message: `Heap memory usage ${heapUsedPercent.toFixed(1)}% exceeds threshold ${thresholds.memoryUsagePercent}%`,
      value: heapUsedPercent,
      threshold: thresholds.memoryUsagePercent,
    });
  }

  return alerts;
}

/**
 * Get alerts endpoint handler
 */
export function getAlerts(req: Request, res: Response): void {
  const alerts = checkAlerts();

  res.json({
    status: alerts.length > 0 ? 'alerting' : 'ok',
    alertCount: alerts.length,
    alerts,
    checkedAt: new Date().toISOString(),
  });
}
