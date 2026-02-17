/**
 * Analytics Service
 *
 * Consolidates business analytics, metrics tracking, and reporting
 * Provides real-time KPIs, trend analysis, and performance insights
 */
import { db } from '../db';
import { eq, and, gte, lte, desc, sql, count, sum, avg } from 'drizzle-orm';
import {
  serviceRequests,
  businessEntities,
  payments,
  users,
  leads,
  qualityReviews,
  complianceTracking,
  operationsTeam,
  clientFeedback,
} from '@shared/schema';
import { logger } from '../logger';

// Types
interface KPIMetric {
  value: number | string;
  previousValue?: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'stable';
  target?: number;
  status?: 'on_track' | 'at_risk' | 'off_track';
}

interface DashboardKPIs {
  revenue: KPIMetric;
  clients: KPIMetric;
  services: KPIMetric;
  leads: KPIMetric;
  compliance: KPIMetric;
  quality: KPIMetric;
  satisfaction: KPIMetric;
  efficiency: KPIMetric;
}

interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface PerformanceMetrics {
  serviceDelivery: {
    avgDeliveryTime: number;
    onTimeRate: number;
    qcPassRate: number;
  };
  teamPerformance: {
    avgTasksCompleted: number;
    utilizationRate: number;
    productivityIndex: number;
  };
  clientEngagement: {
    retentionRate: number;
    repeatBusinessRate: number;
    npsScore: number;
  };
}

interface RevenueAnalytics {
  totalRevenue: number;
  recurringRevenue: number;
  oneTimeRevenue: number;
  averageTransactionValue: number;
  revenueByCategory: Array<{ category: string; amount: number; percentage: number }>;
  revenueByMonth: TrendDataPoint[];
  projectedRevenue: number;
  growthRate: number;
}

interface ConversionFunnel {
  leads: number;
  qualified: number;
  proposals: number;
  negotiations: number;
  converted: number;
  conversionRate: number;
}

class AnalyticsService {
  /**
   * Get executive dashboard KPIs
   */
  async getDashboardKPIs(dateRange: number = 30): Promise<DashboardKPIs> {
    const now = new Date();
    const startDate = new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);
    const prevStartDate = new Date(startDate.getTime() - dateRange * 24 * 60 * 60 * 1000);

    try {
      // Revenue KPIs
      const [currentRevenue] = await db
        .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
        .from(payments)
        .where(and(gte(payments.createdAt, startDate), eq(payments.status, 'completed')));

      const [prevRevenue] = await db
        .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
        .from(payments)
        .where(
          and(
            gte(payments.createdAt, prevStartDate),
            lte(payments.createdAt, startDate),
            eq(payments.status, 'completed')
          )
        );

      const currentRev = parseFloat(currentRevenue?.total || '0');
      const prevRev = parseFloat(prevRevenue?.total || '0');
      const revenueChange = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0;

      // Client KPIs
      const [clientCount] = await db.select({ count: count() }).from(businessEntities);
      const [newClients] = await db
        .select({ count: count() })
        .from(businessEntities)
        .where(gte(businessEntities.createdAt, startDate));

      // Service KPIs
      const [serviceStats] = await db
        .select({
          total: count(),
          completed: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'completed' THEN 1 END)`,
          inProgress: sql<number>`COUNT(CASE WHEN ${serviceRequests.status} = 'in_progress' THEN 1 END)`,
        })
        .from(serviceRequests)
        .where(gte(serviceRequests.createdAt, startDate));

      const completionRate = serviceStats.total > 0 ? (serviceStats.completed / serviceStats.total) * 100 : 0;

      // Lead KPIs
      const [leadStats] = await db
        .select({
          total: count(),
          converted: sql<number>`COUNT(CASE WHEN ${leads.status} = 'converted' THEN 1 END)`,
        })
        .from(leads)
        .where(gte(leads.createdAt, startDate));

      const conversionRate = leadStats.total > 0 ? (leadStats.converted / leadStats.total) * 100 : 0;

      // Compliance KPIs
      const [complianceStats] = await db
        .select({
          total: count(),
          completed: sql<number>`COUNT(CASE WHEN ${complianceTracking.status} = 'completed' THEN 1 END)`,
          overdue: sql<number>`COUNT(CASE WHEN ${complianceTracking.status} = 'overdue' THEN 1 END)`,
        })
        .from(complianceTracking);

      const complianceRate =
        complianceStats.total > 0 ? (complianceStats.completed / complianceStats.total) * 100 : 100;

      // Quality KPIs
      const [qualityStats] = await db
        .select({
          avgScore: sql<string>`COALESCE(AVG(${qualityReviews.qualityScore}), 0)`,
          passRate: sql<number>`
            COALESCE(
              AVG(CASE WHEN ${qualityReviews.status} = 'approved' THEN 100 ELSE 0 END),
              0
            )
          `,
        })
        .from(qualityReviews)
        .where(gte(qualityReviews.createdAt, startDate));

      // Satisfaction KPIs
      const [satisfactionStats] = await db
        .select({
          avgRating: sql<string>`COALESCE(AVG(${clientFeedback.overallRating}), 0)`,
        })
        .from(clientFeedback)
        .where(gte(clientFeedback.createdAt, startDate));

      // Team efficiency
      const [teamStats] = await db
        .select({
          avgUtilization: sql<string>`
            COALESCE(
              AVG(
                CASE WHEN ${operationsTeam.maxWorkload} > 0
                THEN (${operationsTeam.currentWorkload}::float / ${operationsTeam.maxWorkload}) * 100
                ELSE 0 END
              ),
              0
            )
          `,
        })
        .from(operationsTeam)
        .where(eq(operationsTeam.isAvailable, true));

      return {
        revenue: {
          value: currentRev,
          previousValue: prevRev,
          change: Math.round(revenueChange * 10) / 10,
          changeType: revenueChange > 0 ? 'increase' : revenueChange < 0 ? 'decrease' : 'stable',
          status: revenueChange >= 0 ? 'on_track' : 'at_risk',
        },
        clients: {
          value: clientCount?.count || 0,
          change: newClients?.count || 0,
          changeType: 'increase',
          status: 'on_track',
        },
        services: {
          value: serviceStats.completed || 0,
          change: Math.round(completionRate),
          target: 90,
          status: completionRate >= 85 ? 'on_track' : completionRate >= 70 ? 'at_risk' : 'off_track',
        },
        leads: {
          value: leadStats.total || 0,
          change: Math.round(conversionRate),
          target: 25,
          status: conversionRate >= 20 ? 'on_track' : conversionRate >= 15 ? 'at_risk' : 'off_track',
        },
        compliance: {
          value: Math.round(complianceRate),
          change: complianceStats.overdue || 0,
          target: 95,
          status: complianceRate >= 90 ? 'on_track' : complianceRate >= 80 ? 'at_risk' : 'off_track',
        },
        quality: {
          value: Math.round(parseFloat(qualityStats?.avgScore || '0')),
          change: Math.round(qualityStats?.passRate || 0),
          target: 85,
          status:
            parseFloat(qualityStats?.avgScore || '0') >= 80
              ? 'on_track'
              : parseFloat(qualityStats?.avgScore || '0') >= 70
                ? 'at_risk'
                : 'off_track',
        },
        satisfaction: {
          value: Math.round(parseFloat(satisfactionStats?.avgRating || '0') * 20), // Convert 5-scale to 100
          target: 80,
          status:
            parseFloat(satisfactionStats?.avgRating || '0') >= 4
              ? 'on_track'
              : parseFloat(satisfactionStats?.avgRating || '0') >= 3.5
                ? 'at_risk'
                : 'off_track',
        },
        efficiency: {
          value: Math.round(parseFloat(teamStats?.avgUtilization || '0')),
          target: 80,
          status:
            parseFloat(teamStats?.avgUtilization || '0') >= 70
              ? 'on_track'
              : parseFloat(teamStats?.avgUtilization || '0') >= 50
                ? 'at_risk'
                : 'off_track',
        },
      };
    } catch (error) {
      logger.error('Get dashboard KPIs error:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(dateRange: number = 90): Promise<RevenueAnalytics> {
    const now = new Date();
    const startDate = new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);

    try {
      // Total revenue
      const [totalRev] = await db
        .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
        .from(payments)
        .where(and(gte(payments.createdAt, startDate), eq(payments.status, 'completed')));

      // Revenue by service category
      const categoryRevenue = await db
        .select({
          category: serviceRequests.serviceId,
          amount: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
        })
        .from(payments)
        .innerJoin(serviceRequests, eq(payments.serviceRequestId, serviceRequests.id))
        .where(and(gte(payments.createdAt, startDate), eq(payments.status, 'completed')))
        .groupBy(serviceRequests.serviceId)
        .orderBy(desc(sql`SUM(${payments.amount})`))
        .limit(10);

      const totalRevenue = parseFloat(totalRev?.total || '0');

      // Monthly revenue trend
      const monthlyTrend: TrendDataPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const [monthRev] = await db
          .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
          .from(payments)
          .where(
            and(
              gte(payments.createdAt, monthStart),
              lte(payments.createdAt, monthEnd),
              eq(payments.status, 'completed')
            )
          );

        monthlyTrend.push({
          date: monthStart.toISOString().slice(0, 7),
          value: parseFloat(monthRev?.total || '0'),
          label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        });
      }

      // Calculate growth rate
      const firstMonthRev = monthlyTrend[0]?.value || 0;
      const lastMonthRev = monthlyTrend[monthlyTrend.length - 1]?.value || 0;
      const growthRate = firstMonthRev > 0 ? ((lastMonthRev - firstMonthRev) / firstMonthRev) * 100 : 0;

      // Calculate average transaction value
      const [txnStats] = await db
        .select({
          avgValue: sql<string>`COALESCE(AVG(${payments.amount}), 0)`,
          txnCount: count(),
        })
        .from(payments)
        .where(and(gte(payments.createdAt, startDate), eq(payments.status, 'completed')));

      return {
        totalRevenue,
        recurringRevenue: totalRevenue * 0.6, // Estimate - would calculate from subscription data
        oneTimeRevenue: totalRevenue * 0.4,
        averageTransactionValue: parseFloat(txnStats?.avgValue || '0'),
        revenueByCategory: categoryRevenue.map((c) => ({
          category: `Service ${c.category}`,
          amount: parseFloat(c.amount || '0'),
          percentage: totalRevenue > 0 ? (parseFloat(c.amount || '0') / totalRevenue) * 100 : 0,
        })),
        revenueByMonth: monthlyTrend,
        projectedRevenue: lastMonthRev * 1.1, // Simple projection
        growthRate: Math.round(growthRate * 10) / 10,
      };
    } catch (error) {
      logger.error('Get revenue analytics error:', error);
      throw error;
    }
  }

  /**
   * Get conversion funnel analytics
   */
  async getConversionFunnel(dateRange: number = 30): Promise<ConversionFunnel> {
    const now = new Date();
    const startDate = new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);

    try {
      const [funnelStats] = await db
        .select({
          total: count(),
          qualified: sql<number>`COUNT(CASE WHEN ${leads.status} IN ('qualified', 'proposal_sent', 'negotiation', 'converted') THEN 1 END)`,
          proposals: sql<number>`COUNT(CASE WHEN ${leads.status} IN ('proposal_sent', 'negotiation', 'converted') THEN 1 END)`,
          negotiations: sql<number>`COUNT(CASE WHEN ${leads.status} IN ('negotiation', 'converted') THEN 1 END)`,
          converted: sql<number>`COUNT(CASE WHEN ${leads.status} = 'converted' THEN 1 END)`,
        })
        .from(leads)
        .where(gte(leads.createdAt, startDate));

      const total = funnelStats.total || 0;
      const conversionRate = total > 0 ? ((funnelStats.converted || 0) / total) * 100 : 0;

      return {
        leads: total,
        qualified: funnelStats.qualified || 0,
        proposals: funnelStats.proposals || 0,
        negotiations: funnelStats.negotiations || 0,
        converted: funnelStats.converted || 0,
        conversionRate: Math.round(conversionRate * 10) / 10,
      };
    } catch (error) {
      logger.error('Get conversion funnel error:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(dateRange: number = 30): Promise<PerformanceMetrics> {
    const now = new Date();
    const startDate = new Date(now.getTime() - dateRange * 24 * 60 * 60 * 1000);

    try {
      // Service delivery metrics
      const [deliveryStats] = await db
        .select({
          avgDeliveryDays: sql<string>`
            COALESCE(
              AVG(
                EXTRACT(DAY FROM (${serviceRequests.updatedAt} - ${serviceRequests.createdAt}))
              ),
              0
            )
          `,
          onTimeCount: sql<number>`
            COUNT(
              CASE WHEN ${serviceRequests.slaDeadline} IS NULL
                OR ${serviceRequests.updatedAt} <= ${serviceRequests.slaDeadline}
              THEN 1 END
            )
          `,
          total: count(),
        })
        .from(serviceRequests)
        .where(and(gte(serviceRequests.createdAt, startDate), eq(serviceRequests.status, 'completed')));

      // QC pass rate
      const [qcStats] = await db
        .select({
          passed: sql<number>`COUNT(CASE WHEN ${qualityReviews.status} = 'approved' THEN 1 END)`,
          total: count(),
        })
        .from(qualityReviews)
        .where(gte(qualityReviews.createdAt, startDate));

      // Team performance
      const [teamStats] = await db
        .select({
          avgUtilization: sql<string>`
            COALESCE(
              AVG(
                CASE WHEN ${operationsTeam.maxWorkload} > 0
                THEN (${operationsTeam.currentWorkload}::float / ${operationsTeam.maxWorkload}) * 100
                ELSE 0 END
              ),
              0
            )
          `,
          totalWorkload: sql<number>`COALESCE(SUM(${operationsTeam.currentWorkload}), 0)`,
          teamSize: count(),
        })
        .from(operationsTeam)
        .where(eq(operationsTeam.isAvailable, true));

      // Client engagement
      const [engagementStats] = await db
        .select({
          avgRating: sql<string>`COALESCE(AVG(${clientFeedback.overallRating}), 0)`,
          respondents: count(),
        })
        .from(clientFeedback)
        .where(gte(clientFeedback.createdAt, startDate));

      const onTimeRate =
        deliveryStats.total > 0 ? ((deliveryStats.onTimeCount || 0) / deliveryStats.total) * 100 : 100;
      const qcPassRate = qcStats.total > 0 ? ((qcStats.passed || 0) / qcStats.total) * 100 : 100;

      return {
        serviceDelivery: {
          avgDeliveryTime: Math.round(parseFloat(deliveryStats?.avgDeliveryDays || '0')),
          onTimeRate: Math.round(onTimeRate),
          qcPassRate: Math.round(qcPassRate),
        },
        teamPerformance: {
          avgTasksCompleted:
            teamStats.teamSize > 0
              ? Math.round((teamStats.totalWorkload || 0) / teamStats.teamSize)
              : 0,
          utilizationRate: Math.round(parseFloat(teamStats?.avgUtilization || '0')),
          productivityIndex: Math.round((qcPassRate + onTimeRate) / 2),
        },
        clientEngagement: {
          retentionRate: 85, // Would calculate from actual churn data
          repeatBusinessRate: 60, // Would calculate from repeat orders
          npsScore: Math.round((parseFloat(engagementStats?.avgRating || '0') - 3) * 50), // Convert to NPS-like score
        },
      };
    } catch (error) {
      logger.error('Get performance metrics error:', error);
      throw error;
    }
  }

  /**
   * Get trend data for a specific metric
   */
  async getMetricTrend(
    metric: 'revenue' | 'services' | 'leads' | 'clients',
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
    dateRange: number = 30
  ): Promise<TrendDataPoint[]> {
    const now = new Date();
    const trend: TrendDataPoint[] = [];

    try {
      const intervals =
        granularity === 'daily' ? dateRange : granularity === 'weekly' ? Math.ceil(dateRange / 7) : 6;

      for (let i = intervals - 1; i >= 0; i--) {
        let startDate: Date, endDate: Date;

        if (granularity === 'daily') {
          startDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
        } else if (granularity === 'weekly') {
          startDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        }

        let value = 0;

        switch (metric) {
          case 'revenue':
            const [revData] = await db
              .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
              .from(payments)
              .where(
                and(
                  gte(payments.createdAt, startDate),
                  lte(payments.createdAt, endDate),
                  eq(payments.status, 'completed')
                )
              );
            value = parseFloat(revData?.total || '0');
            break;

          case 'services':
            const [svcData] = await db
              .select({ count: count() })
              .from(serviceRequests)
              .where(
                and(
                  gte(serviceRequests.createdAt, startDate),
                  lte(serviceRequests.createdAt, endDate),
                  eq(serviceRequests.status, 'completed')
                )
              );
            value = svcData?.count || 0;
            break;

          case 'leads':
            const [leadData] = await db
              .select({ count: count() })
              .from(leads)
              .where(and(gte(leads.createdAt, startDate), lte(leads.createdAt, endDate)));
            value = leadData?.count || 0;
            break;

          case 'clients':
            const [clientData] = await db
              .select({ count: count() })
              .from(businessEntities)
              .where(
                and(gte(businessEntities.createdAt, startDate), lte(businessEntities.createdAt, endDate))
              );
            value = clientData?.count || 0;
            break;
        }

        trend.push({
          date: startDate.toISOString().split('T')[0],
          value,
          label:
            granularity === 'monthly'
              ? startDate.toLocaleDateString('en-US', { month: 'short' })
              : startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        });
      }

      return trend;
    } catch (error) {
      logger.error('Get metric trend error:', error);
      throw error;
    }
  }

  /**
   * Get top performers by various metrics
   */
  async getTopPerformers(
    metric: 'services' | 'revenue' | 'quality',
    limit: number = 10
  ): Promise<
    Array<{
      userId: number;
      name: string;
      value: number;
      rank: number;
    }>
  > {
    try {
      let results;

      switch (metric) {
        case 'services':
          results = await db
            .select({
              userId: serviceRequests.assignedTo,
              name: users.fullName,
              value: count(),
            })
            .from(serviceRequests)
            .leftJoin(users, eq(serviceRequests.assignedTo, users.id))
            .where(eq(serviceRequests.status, 'completed'))
            .groupBy(serviceRequests.assignedTo, users.fullName)
            .orderBy(desc(count()))
            .limit(limit);
          break;

        case 'quality':
          results = await db
            .select({
              userId: qualityReviews.reviewerId,
              name: users.fullName,
              value: sql<number>`COALESCE(AVG(${qualityReviews.qualityScore}), 0)`,
            })
            .from(qualityReviews)
            .leftJoin(users, eq(qualityReviews.reviewerId, users.id))
            .where(eq(qualityReviews.status, 'approved'))
            .groupBy(qualityReviews.reviewerId, users.fullName)
            .orderBy(desc(sql`AVG(${qualityReviews.qualityScore})`))
            .limit(limit);
          break;

        default:
          return [];
      }

      return results.map((r, index) => ({
        userId: r.userId || 0,
        name: r.name || `User ${r.userId}`,
        value: typeof r.value === 'number' ? r.value : 0,
        rank: index + 1,
      }));
    } catch (error) {
      logger.error('Get top performers error:', error);
      return [];
    }
  }

  /**
   * Generate insights from analytics data
   */
  async generateInsights(): Promise<
    Array<{
      type: 'warning' | 'success' | 'info' | 'action';
      category: string;
      message: string;
      priority: 'high' | 'medium' | 'low';
      recommendation?: string;
    }>
  > {
    const insights: Array<{
      type: 'warning' | 'success' | 'info' | 'action';
      category: string;
      message: string;
      priority: 'high' | 'medium' | 'low';
      recommendation?: string;
    }> = [];

    try {
      const kpis = await this.getDashboardKPIs(30);

      // Revenue insights
      if (kpis.revenue.change && kpis.revenue.change < -10) {
        insights.push({
          type: 'warning',
          category: 'Revenue',
          message: `Revenue declined by ${Math.abs(kpis.revenue.change)}% compared to previous period`,
          priority: 'high',
          recommendation: 'Review pricing strategy and upsell opportunities',
        });
      } else if (kpis.revenue.change && kpis.revenue.change > 20) {
        insights.push({
          type: 'success',
          category: 'Revenue',
          message: `Strong revenue growth of ${kpis.revenue.change}%`,
          priority: 'low',
        });
      }

      // Lead conversion insights
      if (typeof kpis.leads.change === 'number' && kpis.leads.change < 15) {
        insights.push({
          type: 'warning',
          category: 'Sales',
          message: `Lead conversion rate at ${kpis.leads.change}% is below target`,
          priority: 'medium',
          recommendation: 'Review lead qualification process and sales follow-ups',
        });
      }

      // Compliance insights
      if (typeof kpis.compliance.value === 'number' && kpis.compliance.value < 90) {
        insights.push({
          type: 'action',
          category: 'Compliance',
          message: `Compliance rate at ${kpis.compliance.value}% needs attention`,
          priority: 'high',
          recommendation: 'Address overdue compliance items immediately',
        });
      }

      // Quality insights
      if (typeof kpis.quality.value === 'number' && kpis.quality.value < 75) {
        insights.push({
          type: 'warning',
          category: 'Quality',
          message: `Quality score at ${kpis.quality.value}% is below standard`,
          priority: 'medium',
          recommendation: 'Review QC process and provide additional training',
        });
      }

      // Efficiency insights
      if (typeof kpis.efficiency.value === 'number' && kpis.efficiency.value > 90) {
        insights.push({
          type: 'info',
          category: 'Operations',
          message: 'Team utilization is very high - consider scaling',
          priority: 'medium',
          recommendation: 'Evaluate workload distribution and hiring needs',
        });
      }

      if (insights.length === 0) {
        insights.push({
          type: 'success',
          category: 'General',
          message: 'All KPIs are within healthy ranges',
          priority: 'low',
        });
      }

      return insights;
    } catch (error) {
      logger.error('Generate insights error:', error);
      return [];
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    type: 'kpis' | 'revenue' | 'performance',
    format: 'json' | 'csv'
  ): Promise<string | object> {
    try {
      let data: any;

      switch (type) {
        case 'kpis':
          data = await this.getDashboardKPIs();
          break;
        case 'revenue':
          data = await this.getRevenueAnalytics();
          break;
        case 'performance':
          data = await this.getPerformanceMetrics();
          break;
        default:
          data = {};
      }

      if (format === 'csv') {
        // Convert to CSV
        const rows = Object.entries(data).map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            return `${key},${JSON.stringify(value).replace(/,/g, ';')}`;
          }
          return `${key},${value}`;
        });
        return ['Metric,Value', ...rows].join('\n');
      }

      return data;
    } catch (error) {
      logger.error('Export analytics error:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
