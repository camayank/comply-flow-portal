import { Request, Response } from 'express';
import { eq, sql, desc, and, inArray, avg, count, gte, lte } from 'drizzle-orm';
import { db } from './db';
import { users, tasks, service_orders, entities, sla_timers } from '@shared/universal-schema';
import { EnhancedSlaSystem, SlaMonitoringService } from './enhanced-sla-system';

// Enhanced Team Management Routes for Operations
export function registerTeamManagementRoutes(app: any) {
  
  // ========== TEAM WORKLOAD DASHBOARD ==========
  app.get('/api/ops/team-workload', async (req: Request, res: Response) => {
    try {
      // Get all operations team members
      const teamMembers = await db.select({
        id: users.id,
        email: users.email,
        role: users.role
      })
        .from(users)
        .where(inArray(users.role, ['ops_exec', 'ops_lead', 'qa_reviewer']));

      // Calculate comprehensive metrics for each member
      const membersWithMetrics = await Promise.all(teamMembers.map(async (member) => {
        // Active tasks count
        const [activeTasksResult] = await db.select({ 
          count: sql<number>`count(*)::int` 
        })
          .from(tasks)
          .where(and(
            eq(tasks.assignee_id, member.id),
            inArray(tasks.status, ['assigned', 'in_progress', 'qa_review'])
          ));

        // Completed tasks this week
        const [completedWeekResult] = await db.select({ 
          count: sql<number>`count(*)::int` 
        })
          .from(tasks)
          .where(and(
            eq(tasks.assignee_id, member.id),
            eq(tasks.status, 'completed'),
            sql`${tasks.completed_at} >= CURRENT_DATE - INTERVAL '7 days'`
          ));

        // Average completion time (in hours)
        const [avgCompletionResult] = await db.select({ 
          avg: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600), 0)` 
        })
          .from(tasks)
          .where(and(
            eq(tasks.assignee_id, member.id),
            eq(tasks.status, 'completed'),
            sql`${tasks.completed_at} IS NOT NULL`
          ));

        // SLA compliance rate (tasks completed on time)
        const [slaComplianceResult] = await db.select({ 
          total: sql<number>`count(*)::int`,
          onTime: sql<number>`count(case when completed_at <= due_at then 1 end)::int`
        })
          .from(tasks)
          .where(and(
            eq(tasks.assignee_id, member.id),
            eq(tasks.status, 'completed'),
            sql`${tasks.due_at} IS NOT NULL AND ${tasks.completed_at} IS NOT NULL`
          ));

        // Overdue tasks
        const [overdueResult] = await db.select({ 
          count: sql<number>`count(*)::int` 
        })
          .from(tasks)
          .where(and(
            eq(tasks.assignee_id, member.id),
            inArray(tasks.status, ['assigned', 'in_progress']),
            sql`${tasks.due_at} < NOW()`
          ));

        // Calculate workload capacity (max 40 hours per week)
        const maxCapacity = 40; // hours per week
        const estimatedHoursResult = await db.select({ 
          total: sql<number>`COALESCE(SUM(estimated_hours), 0)::int` 
        })
          .from(tasks)
          .where(and(
            eq(tasks.assignee_id, member.id),
            inArray(tasks.status, ['assigned', 'in_progress'])
          ));

        const activeTasks = activeTasksResult.count || 0;
        const completedThisWeek = completedWeekResult.count || 0;
        const avgCompletionTime = Math.round(avgCompletionResult.avg || 0);
        const totalCompleted = slaComplianceResult.total || 0;
        const completedOnTime = slaComplianceResult.onTime || 0;
        const slaCompliance = totalCompleted > 0 ? Math.round((completedOnTime / totalCompleted) * 100) : 100;
        const overdueCount = overdueResult.count || 0;
        const currentWorkloadHours = estimatedHoursResult[0]?.total || 0;
        const workloadCapacity = Math.round((currentWorkloadHours / maxCapacity) * 100);

        return {
          id: member.id,
          email: member.email,
          role: member.role,
          active_tasks: activeTasks,
          completed_this_week: completedThisWeek,
          sla_compliance: slaCompliance,
          avg_completion_time: avgCompletionTime,
          overdue_tasks: overdueCount,
          workload_capacity: Math.min(workloadCapacity, 100), // Cap at 100%
          current_workload_hours: currentWorkloadHours,
          max_capacity_hours: maxCapacity
        };
      }));

      res.json(membersWithMetrics);
    } catch (error) {
      console.error('Error fetching team workload:', error);
      res.status(500).json({ error: 'Failed to fetch team workload' });
    }
  });

  // ========== WORKLOAD BALANCING ENDPOINT ==========
  app.get('/api/ops/suggest-assignee', async (req: Request, res: Response) => {
    try {
      const { taskType, priority, estimatedHours = 2 } = req.query;

      // Get team members with current workload
      const teamMembers = await db.select({
        id: users.id,
        email: users.email,
        role: users.role
      })
        .from(users)
        .where(inArray(users.role, ['ops_exec', 'ops_lead', 'qa_reviewer']));

      // Calculate current workload for each member
      const membersWithWorkload = await Promise.all(teamMembers.map(async (member) => {
        const [workloadResult] = await db.select({ 
          hours: sql<number>`COALESCE(SUM(estimated_hours), 0)::int` 
        })
          .from(tasks)
          .where(and(
            eq(tasks.assignee_id, member.id),
            inArray(tasks.status, ['assigned', 'in_progress'])
          ));

        const [performanceResult] = await db.select({ 
          total: sql<number>`count(*)::int`,
          onTime: sql<number>`count(case when completed_at <= due_at then 1 end)::int`
        })
          .from(tasks)
          .where(and(
            eq(tasks.assignee_id, member.id),
            eq(tasks.status, 'completed'),
            sql`${tasks.due_at} IS NOT NULL`
          ));

        const currentWorkload = workloadResult.hours || 0;
        const totalTasks = performanceResult.total || 0;
        const onTimeTasks = performanceResult.onTime || 0;
        const performanceScore = totalTasks > 0 ? (onTimeTasks / totalTasks) : 1.0;

        return {
          ...member,
          current_workload: currentWorkload,
          performance_score: performanceScore,
          capacity_remaining: Math.max(0, 40 - currentWorkload), // Max 40 hours
          workload_percentage: Math.min((currentWorkload / 40) * 100, 100)
        };
      }));

      // Workload balancing algorithm
      const availableMembers = membersWithWorkload.filter(member => 
        member.capacity_remaining >= (estimatedHours as number)
      );

      if (availableMembers.length === 0) {
        return res.json({
          suggested_assignee: null,
          reason: 'All team members are at capacity',
          alternatives: membersWithWorkload
            .sort((a, b) => a.workload_percentage - b.workload_percentage)
            .slice(0, 3)
        });
      }

      // Score based on workload balance (lower is better) and performance (higher is better)
      const scoredMembers = availableMembers.map(member => ({
        ...member,
        score: (1 - (member.workload_percentage / 100)) * 0.6 + member.performance_score * 0.4
      }));

      // Sort by highest score (best balance of low workload + high performance)
      scoredMembers.sort((a, b) => b.score - a.score);

      const suggestedAssignee = scoredMembers[0];

      res.json({
        suggested_assignee: {
          id: suggestedAssignee.id,
          email: suggestedAssignee.email,
          role: suggestedAssignee.role,
          current_workload: suggestedAssignee.current_workload,
          workload_percentage: suggestedAssignee.workload_percentage,
          performance_score: Math.round(suggestedAssignee.performance_score * 100),
          score: Math.round(suggestedAssignee.score * 100)
        },
        reason: `Best balance of workload (${Math.round(suggestedAssignee.workload_percentage)}%) and performance (${Math.round(suggestedAssignee.performance_score * 100)}%)`,
        alternatives: scoredMembers.slice(1, 4).map(member => ({
          id: member.id,
          email: member.email,
          workload_percentage: Math.round(member.workload_percentage),
          performance_score: Math.round(member.performance_score * 100)
        }))
      });

    } catch (error) {
      console.error('Error suggesting assignee:', error);
      res.status(500).json({ error: 'Failed to suggest assignee' });
    }
  });

  // ========== TEAM PERFORMANCE ANALYTICS ==========
  app.get('/api/ops/team-analytics', async (req: Request, res: Response) => {
    try {
      // Validate and sanitize timeframe to prevent SQL injection
      const rawTimeframe = req.query.timeframe;
      const validTimeframes = [7, 14, 30, 60, 90];
      const timeframeDays = parseInt(String(rawTimeframe || '7'), 10);

      // Validate: must be a positive integer within valid range
      if (isNaN(timeframeDays) || timeframeDays <= 0 || timeframeDays > 365) {
        return res.status(400).json({ error: 'Invalid timeframe. Must be a number between 1 and 365.' });
      }

      // Calculate the start date instead of using string interpolation
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframeDays);

      // Overall team metrics
      const [overallMetrics] = await db.select({
        totalTasks: sql<number>`count(*)::int`,
        completedTasks: sql<number>`count(case when status = 'completed' then 1 end)::int`,
        avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)`,
        slaBreaches: sql<number>`count(case when completed_at > due_at then 1 end)::int`
      })
        .from(tasks)
        .where(gte(tasks.created_at, startDate));

      // Task distribution by status
      const statusDistribution = await db.select({
        status: tasks.status,
        count: sql<number>`count(*)::int`
      })
        .from(tasks)
        .where(gte(tasks.created_at, startDate))
        .groupBy(tasks.status);

      // Priority distribution
      const priorityDistribution = await db.select({
        priority: tasks.priority,
        count: sql<number>`count(*)::int`,
        avgHours: sql<number>`AVG(actual_hours)`
      })
        .from(tasks)
        .where(gte(tasks.created_at, startDate))
        .groupBy(tasks.priority);

      // Daily completion trend
      const completionTrend = await db.select({
        date: sql<string>`DATE(completed_at)`,
        completed: sql<number>`count(*)::int`
      })
        .from(tasks)
        .where(and(
          eq(tasks.status, 'completed'),
          gte(tasks.completed_at, startDate)
        ))
        .groupBy(sql`DATE(completed_at)`)
        .orderBy(sql`DATE(completed_at)`);

      const analytics = {
        overview: {
          total_tasks: overallMetrics.totalTasks,
          completed_tasks: overallMetrics.completedTasks,
          completion_rate: overallMetrics.totalTasks > 0 
            ? Math.round((overallMetrics.completedTasks / overallMetrics.totalTasks) * 100) 
            : 0,
          avg_completion_time: Math.round(overallMetrics.avgCompletionTime || 0),
          sla_breaches: overallMetrics.slaBreaches,
          sla_compliance_rate: overallMetrics.completedTasks > 0 
            ? Math.round(((overallMetrics.completedTasks - overallMetrics.slaBreaches) / overallMetrics.completedTasks) * 100)
            : 100
        },
        status_distribution: statusDistribution,
        priority_distribution: priorityDistribution,
        completion_trend: completionTrend,
        timeframe: `${timeframeDays} days`
      };

      res.json(analytics);
    } catch (error) {
      console.error('Error fetching team analytics:', error);
      res.status(500).json({ error: 'Failed to fetch team analytics' });
    }
  });

  // ========== REAL-TIME SLA MONITORING ==========
  app.get('/api/ops/sla-timers', async (req: Request, res: Response) => {
    try {
      // Get active service orders with SLA timers
      const serviceOrders = await db.select({
        id: service_orders.id,
        service_type: service_orders.service_type,
        status: service_orders.status,
        created_at: service_orders.created_at,
        entity: {
          name: entities.name
        }
      })
        .from(service_orders)
        .innerJoin(entities, eq(service_orders.entity_id, entities.id))
        .where(inArray(service_orders.status, ['created', 'in_progress', 'waiting_client', 'waiting_government']));

      // Get SLA timer info for each active order
      const slaTimers = await Promise.all(serviceOrders.map(async (order) => {
        try {
          const timer = await EnhancedSlaSystem.getTimer(order.id);
          if (timer) {
            const timerInfo = timer.getTimerInfo();
            return {
              id: order.id,
              service_order_id: order.id,
              service_type: order.service_type,
              entity_name: order.entity.name,
              baseline_hours: timerInfo.standardHours,
              started_at: timerInfo.startTime.toISOString(),
              current_status: timerInfo.status.status,
              escalation_level: timerInfo.status.escalationLevel || null,
              minutes_remaining: timerInfo.status.minutesRemaining,
              total_paused_minutes: timerInfo.totalPausedMinutes,
              currently_paused: timerInfo.currentlyPaused,
              pause_reasons: timerInfo.pauseReasons,
              breach_notified: timerInfo.status.status === 'breached'
            };
          }
          return null;
        } catch (error) {
          // Initialize timer if not exists
          const timer = await EnhancedSlaSystem.initializeTimer(order.id, order.service_type);
          const timerInfo = timer.getTimerInfo();
          return {
            id: order.id,
            service_order_id: order.id,
            service_type: order.service_type,
            entity_name: order.entity.name,
            baseline_hours: timerInfo.standardHours,
            started_at: timerInfo.startTime.toISOString(),
            current_status: timerInfo.status.status,
            escalation_level: timerInfo.status.escalationLevel || null,
            minutes_remaining: timerInfo.status.minutesRemaining,
            total_paused_minutes: timerInfo.totalPausedMinutes,
            currently_paused: timerInfo.currentlyPaused,
            pause_reasons: timerInfo.pauseReasons,
            breach_notified: false
          };
        }
      }));

      // Filter out null results and sort by urgency
      const validTimers = slaTimers.filter(timer => timer !== null);
      validTimers.sort((a, b) => {
        // Sort by status priority: breached > at_risk > warning > on_track
        const statusPriority = { 'breached': 4, 'at_risk': 3, 'warning': 2, 'on_track': 1, 'paused': 0 };
        return (statusPriority[b.current_status] || 0) - (statusPriority[a.current_status] || 0);
      });

      res.json(validTimers);
    } catch (error) {
      console.error('Error fetching SLA timers:', error);
      res.status(500).json({ error: 'Failed to fetch SLA timers' });
    }
  });

  // Pause SLA Timer
  app.post('/api/ops/sla-timers/:serviceOrderId/pause', async (req: Request, res: Response) => {
    try {
      const { serviceOrderId } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: 'Reason is required for pausing SLA timer' });
      }

      const timer = await EnhancedSlaSystem.getTimer(parseInt(serviceOrderId));
      if (!timer) {
        return res.status(404).json({ error: 'SLA timer not found' });
      }

      timer.pauseTimer(reason);
      
      res.json({ 
        success: true, 
        message: 'SLA timer paused successfully',
        timerInfo: timer.getTimerInfo()
      });
    } catch (error) {
      console.error('Error pausing SLA timer:', error);
      res.status(500).json({ error: 'Failed to pause SLA timer' });
    }
  });

  // Resume SLA Timer
  app.post('/api/ops/sla-timers/:serviceOrderId/resume', async (req: Request, res: Response) => {
    try {
      const { serviceOrderId } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ error: 'Reason is required for resuming SLA timer' });
      }

      const timer = await EnhancedSlaSystem.getTimer(parseInt(serviceOrderId));
      if (!timer) {
        return res.status(404).json({ error: 'SLA timer not found' });
      }

      timer.resumeTimer(reason);
      
      res.json({ 
        success: true, 
        message: 'SLA timer resumed successfully',
        timerInfo: timer.getTimerInfo()
      });
    } catch (error) {
      console.error('Error resuming SLA timer:', error);
      res.status(500).json({ error: 'Failed to resume SLA timer' });
    }
  });

  // SLA Dashboard Statistics
  app.get('/api/ops/dashboard-stats', async (req: Request, res: Response) => {
    try {
      // Get comprehensive SLA metrics
      const slaMetrics = await EnhancedSlaSystem.getSlaMetrics();
      
      // Get current active orders by status
      const [statusCounts] = await db.select({
        totalActiveOrders: sql<number>`count(case when status in ('created', 'in_progress', 'waiting_client', 'waiting_government', 'under_review') then 1 end)::int`,
        pendingOrders: sql<number>`count(case when status = 'created' then 1 end)::int`,
        inProgressOrders: sql<number>`count(case when status = 'in_progress' then 1 end)::int`,
        waitingOrders: sql<number>`count(case when status in ('waiting_client', 'waiting_government') then 1 end)::int`,
        reviewOrders: sql<number>`count(case when status = 'under_review' then 1 end)::int`,
        completedOrders: sql<number>`count(case when status = 'completed' then 1 end)::int`,
        onHoldOrders: sql<number>`count(case when status = 'on_hold' then 1 end)::int`
      })
        .from(service_orders);

      // Get recent completions (last 7 days)
      const [recentStats] = await db.select({
        completedThisWeek: sql<number>`count(case when completed_at >= CURRENT_DATE - INTERVAL '7 days' then 1 end)::int`,
        avgCompletionDays: sql<number>`AVG(EXTRACT(DAY FROM (completed_at - created_at)))::int`
      })
        .from(service_orders)
        .where(eq(service_orders.status, 'completed'));

      const dashboardStats = {
        totalActiveOrders: statusCounts.totalActiveOrders || 0,
        pendingOrders: statusCounts.pendingOrders || 0,
        inProgressOrders: statusCounts.inProgressOrders || 0,
        waitingOrders: statusCounts.waitingOrders || 0,
        reviewOrders: statusCounts.reviewOrders || 0,
        completedOrders: statusCounts.completedOrders || 0,
        onHoldOrders: statusCounts.onHoldOrders || 0,
        completedThisWeek: recentStats.completedThisWeek || 0,
        avgCompletionDays: recentStats.avgCompletionDays || 0,
        
        // SLA metrics
        slaCompliance: slaMetrics.compliancePercentage,
        activeSlaTimers: slaMetrics.activeTimers,
        slaBreaches: slaMetrics.slaBreaches,
        onTimeDeliveries: slaMetrics.onTimeDeliveries,
        avgCompletionHours: slaMetrics.averageCompletionHours
      };

      res.json(dashboardStats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  });

  // SLA Monitoring Status and Controls
  app.get('/api/ops/sla-monitoring-status', async (req: Request, res: Response) => {
    try {
      const status = await SlaMonitoringService.getMonitoringStatus();
      res.json(status);
    } catch (error) {
      console.error('Error fetching SLA monitoring status:', error);
      res.status(500).json({ error: 'Failed to fetch monitoring status' });
    }
  });

  console.log('✅ Team Management and SLA routes registered');
}