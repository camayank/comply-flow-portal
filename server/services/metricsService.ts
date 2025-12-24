/**
 * METRICS SERVICE
 * File: server/services/metricsService.ts
 *
 * Centralized metrics calculation service with caching and reusable functions
 */

import { db } from '../config/database';
import {
  users,
  businessEntities,
  serviceRequests,
  taskItems,
  payments,
  leads,
  agentProfiles,
  commissionRecords,
  complianceTracking,
  auditLogs,
  systemConfiguration,
  performanceDashboard
} from '../../shared/schema';
import { eq, and, gte, lte, desc, asc, sql, count, sum, avg } from 'drizzle-orm';
import { logger } from '../config/logger';

// ============ IN-MEMORY CACHE ============

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MetricsCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlMs || this.defaultTTL)
    });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const metricsCache = new MetricsCache();

// ============ DATABASE METRICS ============

export interface DatabaseMetrics {
  totalUsers: number;
  totalClients: number;
  totalServiceRequests: number;
  totalTasks: number;
  totalPayments: number;
  dbSize: string;
}

export async function getDatabaseMetrics(): Promise<DatabaseMetrics> {
  const cacheKey = 'db_metrics';
  const cached = metricsCache.get<DatabaseMetrics>(cacheKey);
  if (cached) return cached;

  try {
    const [userCount, clientCount, serviceCount, taskCount, paymentCount] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(businessEntities),
      db.select({ count: count() }).from(serviceRequests),
      db.select({ count: count() }).from(taskItems),
      db.select({ count: count() }).from(payments)
    ]);

    let dbSize = 'N/A';
    try {
      const result = await db.execute(sql`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      dbSize = (result.rows[0] as any)?.size || 'N/A';
    } catch (e) {
      // Ignore if not PostgreSQL
    }

    const metrics: DatabaseMetrics = {
      totalUsers: userCount[0]?.count || 0,
      totalClients: clientCount[0]?.count || 0,
      totalServiceRequests: serviceCount[0]?.count || 0,
      totalTasks: taskCount[0]?.count || 0,
      totalPayments: paymentCount[0]?.count || 0,
      dbSize
    };

    metricsCache.set(cacheKey, metrics, 10 * 60 * 1000); // 10 min cache
    return metrics;
  } catch (error: any) {
    logger.error('Error fetching database metrics', { error: error.message });
    throw error;
  }
}

// ============ REVENUE METRICS ============

export interface RevenueMetrics {
  total: number;
  transactions: number;
  pending: number;
  pendingCount: number;
  averageTransaction: number;
  monthly: Array<{ month: Date; revenue: number; transactions: number }>;
}

export async function getRevenueMetrics(days: number = 30): Promise<RevenueMetrics> {
  const cacheKey = `revenue_${days}`;
  const cached = metricsCache.get<RevenueMetrics>(cacheKey);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const [totalRevenue, pendingPayments, monthlyData] = await Promise.all([
      db.select({
        total: sum(payments.amount),
        count: count(),
      })
        .from(payments)
        .where(and(
          eq(payments.status, 'completed'),
          gte(payments.createdAt, startDate)
        )),

      db.select({
        total: sum(payments.amount),
        count: count(),
      })
        .from(payments)
        .where(eq(payments.status, 'pending')),

      db.execute(sql`
        SELECT
          DATE_TRUNC('month', created_at) as month,
          SUM(amount)::numeric as revenue,
          COUNT(*)::integer as transactions
        FROM payments
        WHERE status = 'completed'
        AND created_at >= ${startDate}
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `)
    ]);

    const total = Number(totalRevenue[0]?.total || 0);
    const txCount = totalRevenue[0]?.count || 0;

    const metrics: RevenueMetrics = {
      total,
      transactions: txCount,
      pending: Number(pendingPayments[0]?.total || 0),
      pendingCount: pendingPayments[0]?.count || 0,
      averageTransaction: txCount > 0 ? Math.round(total / txCount) : 0,
      monthly: monthlyData.rows as any
    };

    metricsCache.set(cacheKey, metrics);
    return metrics;
  } catch (error: any) {
    logger.error('Error fetching revenue metrics', { error: error.message });
    throw error;
  }
}

// ============ CLIENT METRICS ============

export interface ClientMetrics {
  total: number;
  active: number;
  new: number;
  byType: Array<{ type: string; count: number }>;
  retentionRate: number;
  churnedThisPeriod: number;
}

export async function getClientMetrics(days: number = 30): Promise<ClientMetrics> {
  const cacheKey = `clients_${days}`;
  const cached = metricsCache.get<ClientMetrics>(cacheKey);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const [total, active, newClients, churned, byType] = await Promise.all([
      db.select({ count: count() }).from(businessEntities),

      db.select({ count: count() })
        .from(businessEntities)
        .where(eq(businessEntities.clientStatus, 'active')),

      db.select({ count: count() })
        .from(businessEntities)
        .where(gte(businessEntities.createdAt, startDate)),

      db.select({ count: count() })
        .from(businessEntities)
        .where(and(
          eq(businessEntities.clientStatus, 'churned'),
          gte(businessEntities.updatedAt, startDate)
        )),

      db.select({
        type: businessEntities.entityType,
        count: count(),
      })
        .from(businessEntities)
        .where(eq(businessEntities.clientStatus, 'active'))
        .groupBy(businessEntities.entityType)
    ]);

    const totalCount = total[0]?.count || 0;
    const activeCount = active[0]?.count || 0;

    const metrics: ClientMetrics = {
      total: totalCount,
      active: activeCount,
      new: newClients[0]?.count || 0,
      byType: byType as any,
      retentionRate: totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0,
      churnedThisPeriod: churned[0]?.count || 0
    };

    metricsCache.set(cacheKey, metrics);
    return metrics;
  } catch (error: any) {
    logger.error('Error fetching client metrics', { error: error.message });
    throw error;
  }
}

// ============ SERVICE METRICS ============

export interface ServiceMetrics {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  onHold: number;
  completionRate: number;
  avgCompletionHours: number;
  topServices: Array<{ serviceId: string; count: number; revenue: number }>;
}

export async function getServiceMetrics(days: number = 30): Promise<ServiceMetrics> {
  const cacheKey = `services_${days}`;
  const cached = metricsCache.get<ServiceMetrics>(cacheKey);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const [stats, avgTime, topServices] = await Promise.all([
      db.select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
        inProgress: sql<number>`COUNT(CASE WHEN status = 'in_progress' THEN 1 END)`,
        pending: sql<number>`COUNT(CASE WHEN status = 'initiated' OR status = 'docs_uploaded' THEN 1 END)`,
        onHold: sql<number>`COUNT(CASE WHEN status = 'on_hold' THEN 1 END)`,
      })
        .from(serviceRequests)
        .where(gte(serviceRequests.createdAt, startDate)),

      db.execute(sql`
        SELECT AVG(EXTRACT(EPOCH FROM (actual_completion - created_at)) / 3600)::numeric as avg_hours
        FROM service_requests
        WHERE status = 'completed'
        AND actual_completion IS NOT NULL
        AND created_at >= ${startDate}
      `),

      db.select({
        serviceId: serviceRequests.serviceId,
        count: count(),
        revenue: sum(serviceRequests.totalAmount),
      })
        .from(serviceRequests)
        .where(gte(serviceRequests.createdAt, startDate))
        .groupBy(serviceRequests.serviceId)
        .orderBy(desc(count()))
        .limit(10)
    ]);

    const total = stats[0]?.total || 0;
    const completed = stats[0]?.completed || 0;

    const metrics: ServiceMetrics = {
      total,
      completed,
      inProgress: stats[0]?.inProgress || 0,
      pending: stats[0]?.pending || 0,
      onHold: stats[0]?.onHold || 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgCompletionHours: Math.round(Number((avgTime.rows[0] as any)?.avg_hours || 0)),
      topServices: topServices.map(s => ({
        serviceId: s.serviceId,
        count: s.count,
        revenue: Number(s.revenue || 0)
      }))
    };

    metricsCache.set(cacheKey, metrics);
    return metrics;
  } catch (error: any) {
    logger.error('Error fetching service metrics', { error: error.message });
    throw error;
  }
}

// ============ COMPLIANCE METRICS ============

export interface ComplianceMetrics {
  total: number;
  completed: number;
  overdue: number;
  pending: number;
  complianceRate: number;
  overdueByType: Array<{ type: string; count: number }>;
  upcomingDeadlines: Array<{
    id: number;
    serviceType: string | null;
    dueDate: Date;
    entityName: string | null;
    priority: string;
  }>;
  healthScoreDistribution: Array<{ category: string; count: number }>;
}

export async function getComplianceMetrics(): Promise<ComplianceMetrics> {
  const cacheKey = 'compliance_metrics';
  const cached = metricsCache.get<ComplianceMetrics>(cacheKey);
  if (cached) return cached;

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  try {
    const [stats, overdueByType, upcomingDeadlines, healthDist] = await Promise.all([
      db.select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
        overdue: sql<number>`COUNT(CASE WHEN status = 'overdue' THEN 1 END)`,
        pending: sql<number>`COUNT(CASE WHEN status = 'pending' THEN 1 END)`,
      })
        .from(complianceTracking),

      db.select({
        type: complianceTracking.complianceType,
        count: count(),
      })
        .from(complianceTracking)
        .where(eq(complianceTracking.status, 'overdue'))
        .groupBy(complianceTracking.complianceType),

      db.select({
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
        .limit(20),

      db.execute(sql`
        SELECT
          CASE
            WHEN compliance_score >= 90 THEN 'Excellent'
            WHEN compliance_score >= 75 THEN 'Good'
            WHEN compliance_score >= 50 THEN 'Fair'
            ELSE 'Poor'
          END as category,
          COUNT(*)::integer as count
        FROM business_entities
        WHERE client_status = 'active'
        GROUP BY
          CASE
            WHEN compliance_score >= 90 THEN 'Excellent'
            WHEN compliance_score >= 75 THEN 'Good'
            WHEN compliance_score >= 50 THEN 'Fair'
            ELSE 'Poor'
          END
      `)
    ]);

    const total = stats[0]?.total || 0;
    const completed = stats[0]?.completed || 0;

    const metrics: ComplianceMetrics = {
      total,
      completed,
      overdue: stats[0]?.overdue || 0,
      pending: stats[0]?.pending || 0,
      complianceRate: total > 0 ? Math.round((completed / total) * 100) : 100,
      overdueByType: overdueByType.map(o => ({
        type: o.type,
        count: o.count
      })),
      upcomingDeadlines: upcomingDeadlines as any,
      healthScoreDistribution: healthDist.rows as any
    };

    metricsCache.set(cacheKey, metrics);
    return metrics;
  } catch (error: any) {
    logger.error('Error fetching compliance metrics', { error: error.message });
    throw error;
  }
}

// ============ LEAD & AGENT METRICS ============

export interface LeadMetrics {
  total: number;
  converted: number;
  conversionRate: number;
  byStage: Array<{ stage: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
}

export async function getLeadMetrics(days: number = 30): Promise<LeadMetrics> {
  const cacheKey = `leads_${days}`;
  const cached = metricsCache.get<LeadMetrics>(cacheKey);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const [stats, byStage, bySource] = await Promise.all([
      db.select({
        total: count(),
        converted: sql<number>`COUNT(CASE WHEN status = 'converted' THEN 1 END)`,
      })
        .from(leads)
        .where(gte(leads.createdAt, startDate)),

      db.select({
        stage: leads.leadStage,
        count: count(),
      })
        .from(leads)
        .where(gte(leads.createdAt, startDate))
        .groupBy(leads.leadStage),

      db.select({
        source: leads.leadSource,
        count: count(),
      })
        .from(leads)
        .where(gte(leads.createdAt, startDate))
        .groupBy(leads.leadSource)
        .orderBy(desc(count()))
        .limit(10)
    ]);

    const total = stats[0]?.total || 0;
    const converted = stats[0]?.converted || 0;

    const metrics: LeadMetrics = {
      total,
      converted,
      conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      byStage: byStage.map(s => ({ stage: s.stage || 'unknown', count: s.count })),
      bySource: bySource.map(s => ({ source: s.source, count: s.count }))
    };

    metricsCache.set(cacheKey, metrics);
    return metrics;
  } catch (error: any) {
    logger.error('Error fetching lead metrics', { error: error.message });
    throw error;
  }
}

export interface AgentMetrics {
  total: number;
  active: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  topPerformers: Array<{ agentId: number; name: string; commission: number; leads: number }>;
}

export async function getAgentMetrics(days: number = 30): Promise<AgentMetrics> {
  const cacheKey = `agents_${days}`;
  const cached = metricsCache.get<AgentMetrics>(cacheKey);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const [agentStats, commissionStats] = await Promise.all([
      db.select({
        total: count(),
        active: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
      })
        .from(agentProfiles),

      db.select({
        total: sum(commissionRecords.commissionAmount),
        pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END)`,
        paid: sql<number>`SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END)`,
      })
        .from(commissionRecords)
        .where(gte(commissionRecords.createdAt, startDate))
    ]);

    const metrics: AgentMetrics = {
      total: agentStats[0]?.total || 0,
      active: agentStats[0]?.active || 0,
      totalCommission: Number(commissionStats[0]?.total || 0),
      pendingCommission: Number(commissionStats[0]?.pending || 0),
      paidCommission: Number(commissionStats[0]?.paid || 0),
      topPerformers: [] // Would require join with user table
    };

    metricsCache.set(cacheKey, metrics);
    return metrics;
  } catch (error: any) {
    logger.error('Error fetching agent metrics', { error: error.message });
    throw error;
  }
}

// ============ USER ACTIVITY METRICS ============

export interface UserActivityMetrics {
  activeIn24h: number;
  activeIn7d: number;
  activeIn30d: number;
  newUsers: number;
  byRole: Array<{ role: string; count: number }>;
  loginTrend: Array<{ date: Date; count: number }>;
}

export async function getUserActivityMetrics(days: number = 30): Promise<UserActivityMetrics> {
  const cacheKey = `user_activity_${days}`;
  const cached = metricsCache.get<UserActivityMetrics>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [active24h, active7d, active30d, newUsers, byRole, loginTrend] = await Promise.all([
      db.select({ count: count() })
        .from(users)
        .where(gte(users.lastLogin, oneDayAgo)),

      db.select({ count: count() })
        .from(users)
        .where(gte(users.lastLogin, sevenDaysAgo)),

      db.select({ count: count() })
        .from(users)
        .where(gte(users.lastLogin, thirtyDaysAgo)),

      db.select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo)),

      db.select({
        role: users.role,
        count: count(),
      })
        .from(users)
        .where(eq(users.isActive, true))
        .groupBy(users.role),

      db.execute(sql`
        SELECT
          DATE_TRUNC('day', last_login) as date,
          COUNT(*)::integer as count
        FROM users
        WHERE last_login >= ${thirtyDaysAgo}
        GROUP BY DATE_TRUNC('day', last_login)
        ORDER BY date DESC
        LIMIT 30
      `)
    ]);

    const metrics: UserActivityMetrics = {
      activeIn24h: active24h[0]?.count || 0,
      activeIn7d: active7d[0]?.count || 0,
      activeIn30d: active30d[0]?.count || 0,
      newUsers: newUsers[0]?.count || 0,
      byRole: byRole.map(r => ({ role: r.role, count: r.count })),
      loginTrend: loginTrend.rows as any
    };

    metricsCache.set(cacheKey, metrics);
    return metrics;
  } catch (error: any) {
    logger.error('Error fetching user activity metrics', { error: error.message });
    throw error;
  }
}

// ============ TREND ANALYSIS ============

export interface TrendComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export async function getTrendComparison(
  metricType: 'revenue' | 'clients' | 'services' | 'leads',
  days: number = 30
): Promise<TrendComparison> {
  const now = new Date();
  const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    let current = 0;
    let previous = 0;

    switch (metricType) {
      case 'revenue':
        const [currRev] = await db.select({ total: sum(payments.amount) })
          .from(payments)
          .where(and(
            eq(payments.status, 'completed'),
            gte(payments.createdAt, currentStart)
          ));
        const [prevRev] = await db.select({ total: sum(payments.amount) })
          .from(payments)
          .where(and(
            eq(payments.status, 'completed'),
            gte(payments.createdAt, previousStart),
            lte(payments.createdAt, currentStart)
          ));
        current = Number(currRev?.total || 0);
        previous = Number(prevRev?.total || 0);
        break;

      case 'clients':
        const [currClients] = await db.select({ count: count() })
          .from(businessEntities)
          .where(gte(businessEntities.createdAt, currentStart));
        const [prevClients] = await db.select({ count: count() })
          .from(businessEntities)
          .where(and(
            gte(businessEntities.createdAt, previousStart),
            lte(businessEntities.createdAt, currentStart)
          ));
        current = currClients?.count || 0;
        previous = prevClients?.count || 0;
        break;

      case 'services':
        const [currServices] = await db.select({ count: count() })
          .from(serviceRequests)
          .where(gte(serviceRequests.createdAt, currentStart));
        const [prevServices] = await db.select({ count: count() })
          .from(serviceRequests)
          .where(and(
            gte(serviceRequests.createdAt, previousStart),
            lte(serviceRequests.createdAt, currentStart)
          ));
        current = currServices?.count || 0;
        previous = prevServices?.count || 0;
        break;

      case 'leads':
        const [currLeads] = await db.select({ count: count() })
          .from(leads)
          .where(gte(leads.createdAt, currentStart));
        const [prevLeads] = await db.select({ count: count() })
          .from(leads)
          .where(and(
            gte(leads.createdAt, previousStart),
            lte(leads.createdAt, currentStart)
          ));
        current = currLeads?.count || 0;
        previous = prevLeads?.count || 0;
        break;
    }

    const change = current - previous;
    const changePercent = previous > 0 ? Math.round((change / previous) * 100) : 0;

    return {
      current,
      previous,
      change,
      changePercent,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    };
  } catch (error: any) {
    logger.error('Error calculating trend comparison', { error: error.message });
    throw error;
  }
}

// ============ SYSTEM CONFIGURATION ============

export async function getSystemConfig(category?: string): Promise<Record<string, any>> {
  try {
    let query = db.select().from(systemConfiguration);

    if (category) {
      query = query.where(eq(systemConfiguration.category, category)) as any;
    }

    const configs = await query;

    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.configKey] = config.configValue;
    }

    return result;
  } catch (error: any) {
    logger.error('Error fetching system config', { error: error.message });
    return {};
  }
}

export async function updateSystemConfig(
  key: string,
  value: any,
  category: string,
  userId: number
): Promise<boolean> {
  try {
    const existing = await db.select()
      .from(systemConfiguration)
      .where(eq(systemConfiguration.configKey, key));

    if (existing.length > 0) {
      await db.update(systemConfiguration)
        .set({
          configValue: value,
          lastModifiedBy: userId,
          lastModified: new Date()
        })
        .where(eq(systemConfiguration.configKey, key));
    } else {
      await db.insert(systemConfiguration).values({
        configKey: key,
        configValue: value,
        category,
        lastModifiedBy: userId,
        lastModified: new Date()
      });
    }

    // Invalidate cache
    metricsCache.invalidate('config');

    return true;
  } catch (error: any) {
    logger.error('Error updating system config', { error: error.message });
    return false;
  }
}

// ============ PERFORMANCE TRACKING ============

interface PerformanceEntry {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
}

class PerformanceTracker {
  private entries: PerformanceEntry[] = [];
  private maxEntries = 10000;

  record(entry: PerformanceEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries / 2);
    }
  }

  getStats(minutes: number = 60): {
    totalRequests: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
  } {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recent = this.entries.filter(e => e.timestamp >= cutoff);

    if (recent.length === 0) {
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        errorRate: 0,
        requestsPerMinute: 0,
        slowestEndpoints: []
      };
    }

    const responseTimes = recent.map(e => e.responseTime).sort((a, b) => a - b);
    const errors = recent.filter(e => e.statusCode >= 400).length;

    // Group by endpoint
    const byEndpoint: Record<string, number[]> = {};
    for (const entry of recent) {
      if (!byEndpoint[entry.endpoint]) {
        byEndpoint[entry.endpoint] = [];
      }
      byEndpoint[entry.endpoint].push(entry.responseTime);
    }

    const slowestEndpoints = Object.entries(byEndpoint)
      .map(([endpoint, times]) => ({
        endpoint,
        avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return {
      totalRequests: recent.length,
      avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      errorRate: Math.round((errors / recent.length) * 100),
      requestsPerMinute: Math.round(recent.length / minutes),
      slowestEndpoints
    };
  }
}

export const performanceTracker = new PerformanceTracker();

// ============ ALERTS & THRESHOLDS ============

export interface Alert {
  id: string;
  type: 'warning' | 'critical';
  category: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

const thresholds = {
  memory_usage_warning: 80,
  memory_usage_critical: 95,
  error_rate_warning: 5,
  error_rate_critical: 10,
  response_time_warning: 1000, // ms
  response_time_critical: 5000,
  overdue_compliance_warning: 5,
  overdue_compliance_critical: 20
};

export async function checkSystemAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();

  // Memory usage
  const memUsage = process.memoryUsage();
  const memUsagePct = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  if (memUsagePct >= thresholds.memory_usage_critical) {
    alerts.push({
      id: `mem_critical_${now.getTime()}`,
      type: 'critical',
      category: 'system',
      message: 'Memory usage is critically high',
      value: Math.round(memUsagePct),
      threshold: thresholds.memory_usage_critical,
      timestamp: now
    });
  } else if (memUsagePct >= thresholds.memory_usage_warning) {
    alerts.push({
      id: `mem_warning_${now.getTime()}`,
      type: 'warning',
      category: 'system',
      message: 'Memory usage is high',
      value: Math.round(memUsagePct),
      threshold: thresholds.memory_usage_warning,
      timestamp: now
    });
  }

  // Error rate
  const perfStats = performanceTracker.getStats(60);
  if (perfStats.errorRate >= thresholds.error_rate_critical) {
    alerts.push({
      id: `error_critical_${now.getTime()}`,
      type: 'critical',
      category: 'performance',
      message: 'Error rate is critically high',
      value: perfStats.errorRate,
      threshold: thresholds.error_rate_critical,
      timestamp: now
    });
  } else if (perfStats.errorRate >= thresholds.error_rate_warning) {
    alerts.push({
      id: `error_warning_${now.getTime()}`,
      type: 'warning',
      category: 'performance',
      message: 'Error rate is elevated',
      value: perfStats.errorRate,
      threshold: thresholds.error_rate_warning,
      timestamp: now
    });
  }

  // Overdue compliance
  try {
    const [overdueCount] = await db.select({ count: count() })
      .from(complianceTracking)
      .where(eq(complianceTracking.status, 'overdue'));

    const overdue = overdueCount?.count || 0;

    if (overdue >= thresholds.overdue_compliance_critical) {
      alerts.push({
        id: `compliance_critical_${now.getTime()}`,
        type: 'critical',
        category: 'compliance',
        message: 'High number of overdue compliance items',
        value: overdue,
        threshold: thresholds.overdue_compliance_critical,
        timestamp: now
      });
    } else if (overdue >= thresholds.overdue_compliance_warning) {
      alerts.push({
        id: `compliance_warning_${now.getTime()}`,
        type: 'warning',
        category: 'compliance',
        message: 'Several compliance items are overdue',
        value: overdue,
        threshold: thresholds.overdue_compliance_warning,
        timestamp: now
      });
    }
  } catch (e) {
    // Ignore if table doesn't exist
  }

  return alerts;
}

// ============ DASHBOARD SUMMARY ============

export interface DashboardSummary {
  timestamp: string;
  system: {
    uptime: number;
    uptimeFormatted: string;
    memoryUsage: number;
    cpuLoad: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  business: {
    revenue: TrendComparison;
    clients: TrendComparison;
    services: TrendComparison;
    leads: TrendComparison;
  };
  compliance: {
    rate: number;
    overdue: number;
    upcoming: number;
  };
  alerts: Alert[];
  performance: {
    avgResponseTime: number;
    requestsPerMinute: number;
    errorRate: number;
  };
}

export async function getDashboardSummary(days: number = 30): Promise<DashboardSummary> {
  const cacheKey = `dashboard_summary_${days}`;
  const cached = metricsCache.get<DashboardSummary>(cacheKey);
  if (cached) return cached;

  try {
    const [revenueTrend, clientTrend, serviceTrend, leadTrend, compliance, alerts] = await Promise.all([
      getTrendComparison('revenue', days),
      getTrendComparison('clients', days),
      getTrendComparison('services', days),
      getTrendComparison('leads', days),
      getComplianceMetrics(),
      checkSystemAlerts()
    ]);

    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    const memUsagePct = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const cpuLoad = require('os').loadavg()[0];
    const perfStats = performanceTracker.getStats(60);

    let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (alerts.some(a => a.type === 'critical')) {
      systemStatus = 'critical';
    } else if (alerts.some(a => a.type === 'warning')) {
      systemStatus = 'warning';
    }

    const summary: DashboardSummary = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: Math.floor(uptime),
        uptimeFormatted: formatUptime(uptime),
        memoryUsage: Math.round(memUsagePct),
        cpuLoad: Number(cpuLoad.toFixed(2)),
        status: systemStatus
      },
      business: {
        revenue: revenueTrend,
        clients: clientTrend,
        services: serviceTrend,
        leads: leadTrend
      },
      compliance: {
        rate: compliance.complianceRate,
        overdue: compliance.overdue,
        upcoming: compliance.upcomingDeadlines.length
      },
      alerts,
      performance: {
        avgResponseTime: perfStats.avgResponseTime,
        requestsPerMinute: perfStats.requestsPerMinute,
        errorRate: perfStats.errorRate
      }
    };

    metricsCache.set(cacheKey, summary, 60 * 1000); // 1 min cache for dashboard
    return summary;
  } catch (error: any) {
    logger.error('Error generating dashboard summary', { error: error.message });
    throw error;
  }
}

// Helper function
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
