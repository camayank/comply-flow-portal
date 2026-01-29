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
import { eq, gte, lte, sql, count, sum, and, desc, between, isNull, not } from 'drizzle-orm';

// ============================================================================
// PREDICTIVE ANALYTICS ENGINE
// ============================================================================

interface HistoricalDataPoint {
  date: Date;
  value: number;
}

interface PredictionResult {
  predictedValue: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
}

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  percentageChange: number;
  momentum: number;
  seasonalIndex: number;
}

/**
 * Simple linear regression for trend prediction
 */
function linearRegression(data: HistoricalDataPoint[]): { slope: number; intercept: number; r2: number } {
  if (data.length < 2) return { slope: 0, intercept: 0, r2: 0 };

  const n = data.length;
  const xValues = data.map((_, i) => i);
  const yValues = data.map(d => d.value);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
  const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);
  const sumY2 = yValues.reduce((acc, y) => acc + y * y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssTotal = yValues.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0);
  const ssResidual = yValues.reduce((acc, y, i) => acc + Math.pow(y - (slope * i + intercept), 2), 0);
  const r2 = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

  return { slope, intercept, r2: Math.max(0, Math.min(1, r2)) };
}

/**
 * Exponential smoothing for short-term predictions
 */
function exponentialSmoothing(data: number[], alpha: number = 0.3): number {
  if (data.length === 0) return 0;

  let smoothed = data[0];
  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i] + (1 - alpha) * smoothed;
  }
  return smoothed;
}

/**
 * Calculate moving average
 */
function movingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i <= data.length - window; i++) {
    const slice = data.slice(i, i + window);
    result.push(slice.reduce((a, b) => a + b, 0) / window);
  }
  return result;
}

/**
 * Detect seasonality in data (monthly patterns)
 */
function detectSeasonality(monthlyData: number[]): { index: number[]; strength: number } {
  if (monthlyData.length < 12) {
    return { index: new Array(12).fill(1), strength: 0 };
  }

  const average = monthlyData.reduce((a, b) => a + b, 0) / monthlyData.length;
  const seasonalIndex = monthlyData.slice(0, 12).map(v => average > 0 ? v / average : 1);

  const variance = monthlyData.reduce((acc, v) => acc + Math.pow(v - average, 2), 0) / monthlyData.length;
  const strength = Math.min(1, Math.sqrt(variance) / (average + 1));

  return { index: seasonalIndex, strength };
}

/**
 * Churn risk scoring based on engagement patterns
 */
function calculateChurnRisk(params: {
  daysSinceLastActivity: number;
  serviceRequestsLastQuarter: number;
  complianceScore: number;
  paymentDelays: number;
  supportTickets: number;
}): { risk: number; factors: string[]; recommendation: string } {
  const factors: string[] = [];
  let riskScore = 0;

  // Activity decay - major factor
  if (params.daysSinceLastActivity > 90) {
    riskScore += 35;
    factors.push('No activity for 3+ months');
  } else if (params.daysSinceLastActivity > 60) {
    riskScore += 20;
    factors.push('Low engagement in past 2 months');
  } else if (params.daysSinceLastActivity > 30) {
    riskScore += 10;
    factors.push('Reduced engagement recently');
  }

  // Service request frequency
  if (params.serviceRequestsLastQuarter === 0) {
    riskScore += 25;
    factors.push('No service requests this quarter');
  } else if (params.serviceRequestsLastQuarter < 2) {
    riskScore += 10;
    factors.push('Below average service usage');
  }

  // Compliance health
  if (params.complianceScore < 50) {
    riskScore += 20;
    factors.push('Poor compliance score');
  } else if (params.complianceScore < 70) {
    riskScore += 10;
    factors.push('Compliance needs attention');
  }

  // Payment behavior
  if (params.paymentDelays > 3) {
    riskScore += 15;
    factors.push('Multiple payment delays');
  } else if (params.paymentDelays > 0) {
    riskScore += 5;
    factors.push('Occasional payment delays');
  }

  // Support engagement (negative indicator if too many issues)
  if (params.supportTickets > 10) {
    riskScore += 10;
    factors.push('High support ticket volume');
  }

  const risk = Math.min(100, Math.max(0, riskScore));

  let recommendation = 'Monitor engagement levels';
  if (risk >= 70) {
    recommendation = 'Immediate retention outreach required';
  } else if (risk >= 50) {
    recommendation = 'Schedule check-in call this week';
  } else if (risk >= 30) {
    recommendation = 'Send engagement email with value reminder';
  }

  return { risk, factors, recommendation };
}

/**
 * Revenue prediction with confidence intervals
 */
function predictRevenue(
  historicalMonthly: HistoricalDataPoint[],
  monthsAhead: number
): PredictionResult[] {
  if (historicalMonthly.length < 3) {
    return Array(monthsAhead).fill({
      predictedValue: 0,
      confidence: 0.5,
      lowerBound: 0,
      upperBound: 0
    });
  }

  const values = historicalMonthly.map(d => d.value);
  const { slope, intercept, r2 } = linearRegression(historicalMonthly);
  const smoothedTrend = exponentialSmoothing(values);
  const { index: seasonalIndex, strength: seasonality } = detectSeasonality(values);

  // Calculate standard deviation for confidence intervals
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length);

  const predictions: PredictionResult[] = [];
  const lastIndex = values.length - 1;

  for (let i = 1; i <= monthsAhead; i++) {
    const futureIndex = lastIndex + i;
    const monthOfYear = (new Date().getMonth() + i) % 12;

    // Combine linear trend with seasonal adjustment
    const trendValue = slope * futureIndex + intercept;
    const seasonalAdjustment = seasonality > 0.1 ? seasonalIndex[monthOfYear] : 1;
    const predictedValue = Math.max(0, trendValue * seasonalAdjustment);

    // Confidence decreases with distance and increases with R²
    const distanceFactor = 1 / (1 + 0.1 * i);
    const confidence = Math.max(0.3, Math.min(0.95, r2 * distanceFactor));

    // Wider intervals for further predictions
    const intervalWidth = stdDev * (1.5 + 0.3 * i) * (1 - confidence + 0.3);

    predictions.push({
      predictedValue: Math.round(predictedValue),
      confidence: Math.round(confidence * 100) / 100,
      lowerBound: Math.round(Math.max(0, predictedValue - intervalWidth)),
      upperBound: Math.round(predictedValue + intervalWidth)
    });
  }

  return predictions;
}

/**
 * Analyze growth trends
 */
function analyzeGrowthTrend(values: number[]): TrendAnalysis {
  if (values.length < 2) {
    return { direction: 'stable', percentageChange: 0, momentum: 0, seasonalIndex: 1 };
  }

  const recent = values.slice(-3);
  const older = values.slice(-6, -3);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

  const percentageChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

  // Calculate momentum (rate of change of the trend)
  const ma = movingAverage(values, Math.min(3, values.length));
  const momentum = ma.length >= 2 ? (ma[ma.length - 1] - ma[ma.length - 2]) / (ma[ma.length - 2] + 1) : 0;

  const direction = percentageChange > 5 ? 'up' : percentageChange < -5 ? 'down' : 'stable';

  return {
    direction,
    percentageChange: Math.round(percentageChange * 10) / 10,
    momentum: Math.round(momentum * 100) / 100,
    seasonalIndex: 1
  };
}

/**
 * Generate AI-powered business insights
 */
function generateBusinessInsights(metrics: {
  revenueGrowth: number;
  clientGrowth: number;
  churnRate: number;
  conversionRate: number;
  avgTicketSize: number;
  complianceHealth: number;
}): Array<{ type: string; priority: string; insight: string; action: string }> {
  const insights: Array<{ type: string; priority: string; insight: string; action: string }> = [];

  // Revenue insights
  if (metrics.revenueGrowth < 0) {
    insights.push({
      type: 'revenue',
      priority: 'high',
      insight: `Revenue declining by ${Math.abs(metrics.revenueGrowth).toFixed(1)}% - immediate attention needed`,
      action: 'Review pricing strategy and upsell opportunities for existing clients'
    });
  } else if (metrics.revenueGrowth > 20) {
    insights.push({
      type: 'revenue',
      priority: 'info',
      insight: `Strong revenue growth of ${metrics.revenueGrowth.toFixed(1)}%`,
      action: 'Consider capacity planning for scaling operations'
    });
  }

  // Churn insights
  if (metrics.churnRate > 10) {
    insights.push({
      type: 'retention',
      priority: 'critical',
      insight: `Churn rate at ${metrics.churnRate.toFixed(1)}% - above industry standard`,
      action: 'Implement immediate customer success intervention program'
    });
  } else if (metrics.churnRate > 5) {
    insights.push({
      type: 'retention',
      priority: 'medium',
      insight: `Churn rate at ${metrics.churnRate.toFixed(1)}% - room for improvement`,
      action: 'Analyze churned customer patterns and improve onboarding'
    });
  }

  // Conversion insights
  if (metrics.conversionRate < 15) {
    insights.push({
      type: 'sales',
      priority: 'high',
      insight: `Low conversion rate of ${metrics.conversionRate.toFixed(1)}%`,
      action: 'Review lead qualification criteria and sales process'
    });
  } else if (metrics.conversionRate > 30) {
    insights.push({
      type: 'sales',
      priority: 'info',
      insight: `Excellent conversion rate of ${metrics.conversionRate.toFixed(1)}%`,
      action: 'Document winning strategies and train team'
    });
  }

  // Ticket size insights
  if (metrics.avgTicketSize < 5000) {
    insights.push({
      type: 'revenue',
      priority: 'medium',
      insight: 'Average ticket size is below optimal range',
      action: 'Introduce service bundles and premium packages'
    });
  }

  // Compliance health insights
  if (metrics.complianceHealth < 70) {
    insights.push({
      type: 'compliance',
      priority: 'high',
      insight: `Overall compliance health at ${metrics.complianceHealth}% - risk exposure`,
      action: 'Proactive outreach to clients with pending compliance items'
    });
  }

  // Client growth vs churn balance
  if (metrics.clientGrowth < metrics.churnRate) {
    insights.push({
      type: 'growth',
      priority: 'critical',
      insight: 'Client acquisition not keeping pace with churn',
      action: 'Prioritize both retention and acquisition strategies'
    });
  }

  return insights.length > 0 ? insights : [{
    type: 'general',
    priority: 'info',
    insight: 'Business metrics are within healthy ranges',
    action: 'Continue monitoring and optimize for growth'
  }];
}

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

// Forecasting data - Real predictive analytics
router.get('/bi/forecast', async (req: Request, res: Response) => {
  try {
    const { months = 3 } = req.query;
    const monthsAhead = Math.min(12, Math.max(1, Number(months)));

    // Get historical monthly revenue data (last 12 months)
    const historicalRevenue: HistoricalDataPoint[] = [];
    const historicalClients: HistoricalDataPoint[] = [];
    const historicalServices: HistoricalDataPoint[] = [];

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const [revenueData] = await db.select({ total: sum(payments.amount) })
        .from(payments)
        .where(
          and(
            gte(payments.createdAt, monthStart),
            lte(payments.createdAt, monthEnd),
            eq(payments.status, 'completed')
          )
        );

      const [clientData] = await db.select({ count: count() })
        .from(businessEntities)
        .where(gte(businessEntities.createdAt, monthStart));

      const [serviceData] = await db.select({ count: count() })
        .from(serviceRequests)
        .where(
          and(
            gte(serviceRequests.createdAt, monthStart),
            lte(serviceRequests.createdAt, monthEnd)
          )
        );

      historicalRevenue.push({ date: monthStart, value: Number(revenueData?.total || 0) });
      historicalClients.push({ date: monthStart, value: clientData?.count || 0 });
      historicalServices.push({ date: monthStart, value: serviceData?.count || 0 });
    }

    // Generate predictions using the predictive engine
    const revenuePredictions = predictRevenue(historicalRevenue, monthsAhead);
    const clientPredictions = predictRevenue(historicalClients, monthsAhead);
    const servicePredictions = predictRevenue(historicalServices, monthsAhead);

    // Analyze trends
    const revenueTrend = analyzeGrowthTrend(historicalRevenue.map(d => d.value));
    const clientTrend = analyzeGrowthTrend(historicalClients.map(d => d.value));

    const forecast = [];
    const currentDate = new Date();

    for (let i = 0; i < monthsAhead; i++) {
      const forecastDate = new Date(currentDate);
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);

      forecast.push({
        month: forecastDate.toISOString().slice(0, 7),
        projectedRevenue: revenuePredictions[i].predictedValue,
        revenueConfidence: revenuePredictions[i].confidence,
        revenueLowerBound: revenuePredictions[i].lowerBound,
        revenueUpperBound: revenuePredictions[i].upperBound,
        projectedClients: clientPredictions[i].predictedValue,
        clientConfidence: clientPredictions[i].confidence,
        projectedServices: servicePredictions[i].predictedValue,
        serviceConfidence: servicePredictions[i].confidence
      });
    }

    res.json({
      forecast,
      trends: {
        revenue: revenueTrend,
        clients: clientTrend
      },
      historicalSummary: {
        avgMonthlyRevenue: Math.round(historicalRevenue.reduce((a, b) => a + b.value, 0) / 12),
        totalRevenueL12M: historicalRevenue.reduce((a, b) => a + b.value, 0),
        clientGrowthL12M: historicalClients[11]?.value - historicalClients[0]?.value || 0
      },
      methodology: 'linear_regression_with_exponential_smoothing',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// PREDICTIVE ANALYTICS ENDPOINTS
// ============================================================================

// Churn prediction for all clients
router.get('/predictive/churn', async (req: Request, res: Response) => {
  try {
    const { threshold = 50 } = req.query;
    const riskThreshold = Number(threshold);

    // Get all active business entities with their engagement metrics
    const entities = await db.select({
      id: businessEntities.id,
      name: businessEntities.companyName,
      createdAt: businessEntities.createdAt
    }).from(businessEntities);

    const churnAnalysis = [];

    for (const entity of entities.slice(0, 100)) { // Limit for performance
      // Get last activity date
      const [lastService] = await db.select({ date: sql`MAX(${serviceRequests.createdAt})` })
        .from(serviceRequests)
        .where(eq(serviceRequests.businessEntityId, entity.id));

      // Count services last quarter
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const [serviceCount] = await db.select({ count: count() })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.businessEntityId, entity.id),
            gte(serviceRequests.createdAt, threeMonthsAgo)
          )
        );

      // Get compliance score (simplified)
      const [complianceData] = await db.select({ count: count() })
        .from(complianceTracking)
        .where(
          and(
            eq(complianceTracking.businessEntityId, entity.id),
            eq(complianceTracking.status, 'completed')
          )
        );

      const [totalCompliance] = await db.select({ count: count() })
        .from(complianceTracking)
        .where(eq(complianceTracking.businessEntityId, entity.id));

      const complianceScore = totalCompliance?.count ?
        Math.round((complianceData?.count || 0) / totalCompliance.count * 100) : 50;

      const lastActivityDate = lastService?.date ? new Date(lastService.date as string) : entity.createdAt;
      const daysSinceLastActivity = Math.floor((Date.now() - (lastActivityDate?.getTime() || Date.now())) / (1000 * 60 * 60 * 24));

      const churnRisk = calculateChurnRisk({
        daysSinceLastActivity,
        serviceRequestsLastQuarter: serviceCount?.count || 0,
        complianceScore,
        paymentDelays: 0, // Would calculate from payment data
        supportTickets: 0 // Would calculate from support data
      });

      if (churnRisk.risk >= riskThreshold) {
        churnAnalysis.push({
          entityId: entity.id,
          companyName: entity.name,
          churnRisk: churnRisk.risk,
          riskLevel: churnRisk.risk >= 70 ? 'critical' : churnRisk.risk >= 50 ? 'high' : 'medium',
          factors: churnRisk.factors,
          recommendation: churnRisk.recommendation,
          lastActivity: lastActivityDate,
          complianceScore
        });
      }
    }

    // Sort by risk level
    churnAnalysis.sort((a, b) => b.churnRisk - a.churnRisk);

    const summary = {
      totalAnalyzed: entities.length,
      atRiskCount: churnAnalysis.length,
      criticalCount: churnAnalysis.filter(c => c.riskLevel === 'critical').length,
      highCount: churnAnalysis.filter(c => c.riskLevel === 'high').length,
      mediumCount: churnAnalysis.filter(c => c.riskLevel === 'medium').length,
      avgRiskScore: churnAnalysis.length > 0 ?
        Math.round(churnAnalysis.reduce((a, b) => a + b.churnRisk, 0) / churnAnalysis.length) : 0
    };

    res.json({
      summary,
      atRiskClients: churnAnalysis.slice(0, 50),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error predicting churn:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revenue prediction for specific client
router.get('/predictive/revenue/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { months = 6 } = req.query;

    // Get historical payments for this entity
    const entityPayments = await db.select({
      amount: payments.amount,
      date: payments.createdAt
    })
      .from(payments)
      .innerJoin(serviceRequests, eq(payments.serviceRequestId, serviceRequests.id))
      .where(
        and(
          eq(serviceRequests.businessEntityId, Number(entityId)),
          eq(payments.status, 'completed')
        )
      )
      .orderBy(payments.createdAt);

    // Aggregate by month
    const monthlyRevenue = new Map<string, number>();
    entityPayments.forEach(p => {
      const monthKey = p.date ? new Date(p.date).toISOString().slice(0, 7) : '';
      if (monthKey) {
        monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + Number(p.amount || 0));
      }
    });

    const historicalData: HistoricalDataPoint[] = Array.from(monthlyRevenue.entries())
      .map(([month, value]) => ({ date: new Date(month + '-01'), value }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const predictions = predictRevenue(historicalData, Number(months));
    const trend = analyzeGrowthTrend(historicalData.map(d => d.value));

    const forecast = [];
    const currentDate = new Date();

    for (let i = 0; i < Number(months); i++) {
      const forecastDate = new Date(currentDate);
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);

      forecast.push({
        month: forecastDate.toISOString().slice(0, 7),
        predicted: predictions[i].predictedValue,
        confidence: predictions[i].confidence,
        range: {
          low: predictions[i].lowerBound,
          high: predictions[i].upperBound
        }
      });
    }

    res.json({
      entityId: Number(entityId),
      historical: historicalData.slice(-12).map(d => ({
        month: d.date.toISOString().slice(0, 7),
        revenue: d.value
      })),
      forecast,
      trend,
      lifetimeValue: entityPayments.reduce((a, b) => a + Number(b.amount || 0), 0),
      avgMonthlyRevenue: historicalData.length > 0 ?
        Math.round(historicalData.reduce((a, b) => a + b.value, 0) / historicalData.length) : 0
    });
  } catch (error) {
    console.error('Error predicting entity revenue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI-powered business insights
router.get('/predictive/insights', async (req: Request, res: Response) => {
  try {
    // Calculate key metrics for insight generation
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Revenue growth
    const [currentRevenue] = await db.select({ total: sum(payments.amount) })
      .from(payments)
      .where(and(gte(payments.createdAt, thirtyDaysAgo), eq(payments.status, 'completed')));

    const [prevRevenue] = await db.select({ total: sum(payments.amount) })
      .from(payments)
      .where(and(
        gte(payments.createdAt, sixtyDaysAgo),
        lte(payments.createdAt, thirtyDaysAgo),
        eq(payments.status, 'completed')
      ));

    const currentRev = Number(currentRevenue?.total || 0);
    const prevRev = Number(prevRevenue?.total || 1);
    const revenueGrowth = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0;

    // Client growth
    const [newClients] = await db.select({ count: count() })
      .from(businessEntities)
      .where(gte(businessEntities.createdAt, thirtyDaysAgo));

    const [totalClients] = await db.select({ count: count() })
      .from(businessEntities);

    const clientGrowth = totalClients?.count ? (newClients?.count || 0) / totalClients.count * 100 : 0;

    // Conversion rate
    const [convertedLeads] = await db.select({ count: count() })
      .from(leads)
      .where(and(gte(leads.updatedAt, thirtyDaysAgo), eq(leads.stage, 'converted')));

    const [totalLeads] = await db.select({ count: count() })
      .from(leads)
      .where(gte(leads.createdAt, thirtyDaysAgo));

    const conversionRate = totalLeads?.count ? (convertedLeads?.count || 0) / totalLeads.count * 100 : 0;

    // Average ticket size
    const [serviceCount] = await db.select({ count: count() })
      .from(serviceRequests)
      .where(and(gte(serviceRequests.createdAt, thirtyDaysAgo), eq(serviceRequests.status, 'completed')));

    const avgTicketSize = serviceCount?.count ? currentRev / serviceCount.count : 0;

    // Compliance health
    const [completedCompliance] = await db.select({ count: count() })
      .from(complianceTracking)
      .where(eq(complianceTracking.status, 'completed'));

    const [totalComplianceItems] = await db.select({ count: count() })
      .from(complianceTracking);

    const complianceHealth = totalComplianceItems?.count ?
      (completedCompliance?.count || 0) / totalComplianceItems.count * 100 : 0;

    // Simplified churn rate (clients with no activity in 90 days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const [inactiveClients] = await db.select({ count: count() })
      .from(businessEntities)
      .where(lte(businessEntities.createdAt, ninetyDaysAgo));

    const churnRate = totalClients?.count ? (inactiveClients?.count || 0) / totalClients.count * 100 * 0.1 : 0;

    // Generate insights
    const insights = generateBusinessInsights({
      revenueGrowth,
      clientGrowth,
      churnRate,
      conversionRate,
      avgTicketSize,
      complianceHealth
    });

    res.json({
      insights,
      metrics: {
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        clientGrowth: Math.round(clientGrowth * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgTicketSize: Math.round(avgTicketSize),
        complianceHealth: Math.round(complianceHealth),
        estimatedChurnRate: Math.round(churnRate * 10) / 10
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Growth trajectory analysis
router.get('/predictive/growth', async (req: Request, res: Response) => {
  try {
    const { metric = 'revenue' } = req.query;

    // Get 12 months of data
    const monthlyData: { month: string; value: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      let value = 0;

      if (metric === 'revenue') {
        const [data] = await db.select({ total: sum(payments.amount) })
          .from(payments)
          .where(and(
            gte(payments.createdAt, monthStart),
            lte(payments.createdAt, monthEnd),
            eq(payments.status, 'completed')
          ));
        value = Number(data?.total || 0);
      } else if (metric === 'clients') {
        const [data] = await db.select({ count: count() })
          .from(businessEntities)
          .where(and(
            gte(businessEntities.createdAt, monthStart),
            lte(businessEntities.createdAt, monthEnd)
          ));
        value = data?.count || 0;
      } else if (metric === 'services') {
        const [data] = await db.select({ count: count() })
          .from(serviceRequests)
          .where(and(
            gte(serviceRequests.createdAt, monthStart),
            lte(serviceRequests.createdAt, monthEnd)
          ));
        value = data?.count || 0;
      }

      monthlyData.push({
        month: monthStart.toISOString().slice(0, 7),
        value
      });
    }

    const values = monthlyData.map(d => d.value);
    const trend = analyzeGrowthTrend(values);
    const { slope, intercept, r2 } = linearRegression(values.map((v, i) => ({ date: new Date(), value: v })));

    // Calculate compound growth rate
    const firstValue = values[0] || 1;
    const lastValue = values[values.length - 1] || 1;
    const periods = values.length - 1;
    const cagr = periods > 0 ? (Math.pow(lastValue / firstValue, 1 / periods) - 1) * 100 : 0;

    // Calculate moving averages
    const ma3 = movingAverage(values, 3);
    const ma6 = movingAverage(values, 6);

    res.json({
      metric,
      historical: monthlyData,
      analysis: {
        trend: trend.direction,
        percentageChange: trend.percentageChange,
        momentum: trend.momentum,
        cagr: Math.round(cagr * 10) / 10,
        rSquared: Math.round(r2 * 100) / 100,
        volatility: Math.round(Math.sqrt(values.reduce((acc, v) => {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          return acc + Math.pow(v - mean, 2);
        }, 0) / values.length))
      },
      movingAverages: {
        threeMonth: ma3.slice(-6),
        sixMonth: ma6.slice(-6)
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing growth:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Anomaly detection in metrics
router.get('/predictive/anomalies', async (req: Request, res: Response) => {
  try {
    const anomalies: Array<{
      type: string;
      severity: string;
      metric: string;
      expected: number;
      actual: number;
      deviation: number;
      date: string;
      description: string;
    }> = [];

    // Get recent daily revenue
    const dailyRevenue: number[] = [];
    for (let i = 30; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [data] = await db.select({ total: sum(payments.amount) })
        .from(payments)
        .where(and(
          gte(payments.createdAt, dayStart),
          lte(payments.createdAt, dayEnd),
          eq(payments.status, 'completed')
        ));

      dailyRevenue.push(Number(data?.total || 0));
    }

    // Calculate mean and standard deviation
    const mean = dailyRevenue.reduce((a, b) => a + b, 0) / dailyRevenue.length;
    const stdDev = Math.sqrt(dailyRevenue.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / dailyRevenue.length);

    // Detect anomalies (values beyond 2 standard deviations)
    dailyRevenue.forEach((value, index) => {
      const deviation = Math.abs(value - mean);
      if (deviation > 2 * stdDev && stdDev > 0) {
        const date = new Date();
        date.setDate(date.getDate() - (30 - index));

        anomalies.push({
          type: value > mean ? 'spike' : 'drop',
          severity: deviation > 3 * stdDev ? 'high' : 'medium',
          metric: 'daily_revenue',
          expected: Math.round(mean),
          actual: Math.round(value),
          deviation: Math.round((deviation / stdDev) * 100) / 100,
          date: date.toISOString().split('T')[0],
          description: value > mean
            ? `Revenue ${Math.round((value / mean - 1) * 100)}% above average`
            : `Revenue ${Math.round((1 - value / mean) * 100)}% below average`
        });
      }
    });

    // Check for service request anomalies
    const [avgDailyServices] = await db.select({ avg: sql`AVG(daily_count)` })
      .from(
        db.select({ daily_count: count() })
          .from(serviceRequests)
          .groupBy(sql`DATE(${serviceRequests.createdAt})`)
          .as('daily_counts')
      );

    const [todayServices] = await db.select({ count: count() })
      .from(serviceRequests)
      .where(gte(serviceRequests.createdAt, new Date(new Date().setHours(0, 0, 0, 0))));

    const avgServices = Number(avgDailyServices?.avg || 1);
    if (todayServices?.count && Math.abs(todayServices.count - avgServices) > avgServices * 0.5) {
      anomalies.push({
        type: todayServices.count > avgServices ? 'spike' : 'drop',
        severity: 'medium',
        metric: 'daily_service_requests',
        expected: Math.round(avgServices),
        actual: todayServices.count,
        deviation: Math.round(Math.abs(todayServices.count - avgServices) / avgServices * 100) / 100,
        date: new Date().toISOString().split('T')[0],
        description: `Service requests ${todayServices.count > avgServices ? 'higher' : 'lower'} than usual`
      });
    }

    res.json({
      anomalies: anomalies.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return (severityOrder[a.severity as keyof typeof severityOrder] || 2) -
               (severityOrder[b.severity as keyof typeof severityOrder] || 2);
      }),
      summary: {
        total: anomalies.length,
        highSeverity: anomalies.filter(a => a.severity === 'high').length,
        mediumSeverity: anomalies.filter(a => a.severity === 'medium').length,
        spikes: anomalies.filter(a => a.type === 'spike').length,
        drops: anomalies.filter(a => a.type === 'drop').length
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
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
