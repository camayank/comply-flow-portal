/**
 * UNIVERSAL SERVICE API
 *
 * Central API serving 96+ configurable services to all stakeholders:
 * - CLIENT: Browse, request, track services
 * - AGENT: Sell services, track conversions
 * - OPS_EXECUTIVE: Process services, manage tasks
 * - OPS_LEAD: Oversee team, handle escalations
 * - QC_REVIEWER: Quality control services
 * - FINANCE: Track revenue, manage payments
 * - ADMIN: Configure services, manage system
 *
 * Follows US compliance/tax tech stack principles:
 * - Complete audit trail
 * - Role-based access control
 * - Transparent status for all stakeholders
 */

import { Router } from 'express';
import { db } from './db';
import {
  servicesCatalog,
  serviceRequests,
  businessEntities,
  users,
  taskItems,
  serviceWorkflowStatuses,
  statusTransitionRules,
  statusTransitionHistory,
  workItemQueue,
  workItemActivityLog,
  slaBreachRecords,
  escalationExecutions,
  documentsUploads,
  payments,
  qualityReviews,
  deliveryConfirmations,
  leads,
  salesProposals
} from '@shared/schema';
import { eq, and, desc, asc, sql, gte, lte, isNull, or, ne, count, sum } from 'drizzle-orm';
import { logWorkItemActivity } from './auto-escalation-engine';

const router = Router();

// ============================================================================
// SERVICE CATALOG APIs (All Users)
// ============================================================================

/**
 * GET /api/universal/services
 * Get all active services from the 96+ catalog
 * Access: All authenticated users
 */
router.get('/services', async (req, res) => {
  try {
    const { category, search, is_active = 'true' } = req.query;

    let query = db.select().from(servicesCatalog);
    let conditions: any[] = [];

    if (is_active === 'true') {
      conditions.push(eq(servicesCatalog.isActive, true));
    }

    if (category) {
      conditions.push(eq(servicesCatalog.category, category as string));
    }

    if (search) {
      conditions.push(
        or(
          sql`LOWER(${servicesCatalog.name}) LIKE LOWER(${'%' + search + '%'})`,
          sql`LOWER(${servicesCatalog.serviceKey}) LIKE LOWER(${'%' + search + '%'})`
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const services = await query.orderBy(servicesCatalog.category, servicesCatalog.name);

    // Group by category for easier frontend consumption
    const grouped = services.reduce((acc: any, service) => {
      const cat = service.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(service);
      return acc;
    }, {});

    res.json({
      total: services.length,
      services,
      byCategory: grouped,
      categories: Object.keys(grouped)
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

/**
 * GET /api/universal/services/:serviceKey
 * Get single service with full configuration
 */
router.get('/services/:serviceKey', async (req, res) => {
  try {
    const { serviceKey } = req.params;

    const [service] = await db.select()
      .from(servicesCatalog)
      .where(eq(servicesCatalog.serviceKey, serviceKey));

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Get workflow statuses for this service
    const statuses = await db.select()
      .from(serviceWorkflowStatuses)
      .where(
        and(
          eq(serviceWorkflowStatuses.serviceKey, serviceKey),
          eq(serviceWorkflowStatuses.isActive, true)
        )
      )
      .orderBy(serviceWorkflowStatuses.displayOrder);

    // Get transition rules
    const transitions = await db.select()
      .from(statusTransitionRules)
      .where(
        and(
          eq(statusTransitionRules.serviceKey, serviceKey),
          eq(statusTransitionRules.isActive, true)
        )
      );

    res.json({
      service,
      workflow: {
        statuses,
        transitions
      }
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// ============================================================================
// CLIENT APIs - Service Requests & Tracking
// ============================================================================

/**
 * GET /api/universal/client/dashboard
 * Client dashboard with all their services
 */
router.get('/client/dashboard', async (req, res) => {
  try {
    const entityId = (req as any).user?.entityId || req.query.entity_id;

    if (!entityId) {
      return res.status(400).json({ error: 'Entity ID required' });
    }

    // Get entity info
    const [entity] = await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.id, parseInt(entityId as string)));

    // Get all service requests for this entity
    const requests = await db.select({
      id: serviceRequests.id,
      serviceType: serviceRequests.serviceType,
      status: serviceRequests.status,
      priority: serviceRequests.priority,
      periodLabel: serviceRequests.periodLabel,
      dueDate: serviceRequests.dueDate,
      createdAt: serviceRequests.createdAt,
      updatedAt: serviceRequests.updatedAt
    })
    .from(serviceRequests)
    .where(eq(serviceRequests.entityId, parseInt(entityId as string)))
    .orderBy(desc(serviceRequests.createdAt));

    // Calculate stats
    const stats = {
      total: requests.length,
      active: requests.filter(r => !['completed', 'cancelled', 'Completed', 'Cancelled'].includes(r.status || '')).length,
      completed: requests.filter(r => ['completed', 'Completed'].includes(r.status || '')).length,
      pending: requests.filter(r => ['initiated', 'docs_pending', 'Created'].includes(r.status || '')).length,
      inProgress: requests.filter(r => ['in_progress', 'In Progress', 'Processing'].includes(r.status || '')).length
    };

    // Get upcoming deadlines
    const upcomingDeadlines = await db.select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.entityId, parseInt(entityId as string)),
          sql`${serviceRequests.dueDate} IS NOT NULL`,
          sql`${serviceRequests.dueDate} >= CURRENT_DATE`,
          sql`${serviceRequests.status} NOT IN ('completed', 'cancelled', 'Completed', 'Cancelled')`
        )
      )
      .orderBy(asc(serviceRequests.dueDate))
      .limit(10);

    // Get recent activity
    const recentActivity = await db.select()
      .from(workItemActivityLog)
      .where(
        and(
          sql`${workItemActivityLog.serviceRequestId} IN (
            SELECT id FROM service_requests WHERE entity_id = ${entityId}
          )`,
          eq(workItemActivityLog.clientVisible, true)
        )
      )
      .orderBy(desc(workItemActivityLog.occurredAt))
      .limit(20);

    res.json({
      entity,
      stats,
      requests,
      upcomingDeadlines,
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching client dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

/**
 * POST /api/universal/client/service-request
 * Create a new service request
 */
router.post('/client/service-request', async (req, res) => {
  try {
    const {
      entity_id,
      service_key,
      period_label,
      due_date,
      priority = 'MEDIUM',
      description,
      documents
    } = req.body;

    // Get service details
    const [service] = await db.select()
      .from(servicesCatalog)
      .where(eq(servicesCatalog.serviceKey, service_key));

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Create service request
    const [newRequest] = await db.insert(serviceRequests)
      .values({
        entityId: entity_id,
        serviceType: service_key,
        serviceId: service_key,
        periodLabel: period_label,
        dueDate: due_date,
        priority,
        status: 'initiated',
        description,
        isActive: true
      })
      .returning();

    // Log activity
    await logWorkItemActivity({
      workItemQueueId: 0,
      serviceRequestId: newRequest.id,
      activityType: 'service_requested',
      activityDescription: `New ${service.name} service requested`,
      performedBy: (req as any).user?.id,
      triggerSource: 'client_portal',
      clientVisible: true,
      clientMessage: 'Your service request has been submitted successfully.'
    });

    res.json({
      success: true,
      request: newRequest,
      message: `${service.name} request created successfully`
    });
  } catch (error) {
    console.error('Error creating service request:', error);
    res.status(500).json({ error: 'Failed to create service request' });
  }
});

/**
 * GET /api/universal/client/service-request/:id
 * Get detailed service request with timeline
 */
router.get('/client/service-request/:id', async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);

    // Get request details
    const [request] = await db.select({
      id: serviceRequests.id,
      serviceType: serviceRequests.serviceType,
      status: serviceRequests.status,
      priority: serviceRequests.priority,
      periodLabel: serviceRequests.periodLabel,
      dueDate: serviceRequests.dueDate,
      description: serviceRequests.description,
      createdAt: serviceRequests.createdAt,
      updatedAt: serviceRequests.updatedAt,
      entityId: serviceRequests.entityId,
      entityName: businessEntities.name
    })
    .from(serviceRequests)
    .leftJoin(businessEntities, eq(serviceRequests.entityId, businessEntities.id))
    .where(eq(serviceRequests.id, requestId));

    if (!request) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    // Get service workflow statuses
    const statuses = await db.select()
      .from(serviceWorkflowStatuses)
      .where(
        and(
          eq(serviceWorkflowStatuses.serviceKey, request.serviceType || ''),
          eq(serviceWorkflowStatuses.isActive, true),
          eq(serviceWorkflowStatuses.clientVisible, true)
        )
      )
      .orderBy(serviceWorkflowStatuses.displayOrder);

    // Get status transition history
    const history = await db.select()
      .from(statusTransitionHistory)
      .where(eq(statusTransitionHistory.serviceRequestId, requestId))
      .orderBy(desc(statusTransitionHistory.changedAt));

    // Get client-visible activity
    const activity = await db.select()
      .from(workItemActivityLog)
      .where(
        and(
          eq(workItemActivityLog.serviceRequestId, requestId),
          eq(workItemActivityLog.clientVisible, true)
        )
      )
      .orderBy(desc(workItemActivityLog.occurredAt));

    // Get documents
    const documents = await db.select()
      .from(documentsUploads)
      .where(eq(documentsUploads.serviceRequestId, requestId));

    // Calculate progress
    const currentStatusIndex = statuses.findIndex(s => s.statusCode === request.status);
    const progress = statuses.length > 0
      ? Math.round(((currentStatusIndex + 1) / statuses.length) * 100)
      : 0;

    // Get current status details
    const currentStatus = statuses.find(s => s.statusCode === request.status);

    res.json({
      request,
      workflow: {
        statuses,
        currentStatus,
        progress,
        completedSteps: currentStatusIndex + 1,
        totalSteps: statuses.length
      },
      history,
      activity,
      documents
    });
  } catch (error) {
    console.error('Error fetching service request:', error);
    res.status(500).json({ error: 'Failed to fetch service request' });
  }
});

// ============================================================================
// AGENT APIs - Leads, Proposals, Commissions
// ============================================================================

/**
 * GET /api/universal/agent/dashboard
 * Agent dashboard with leads, proposals, commissions
 */
router.get('/agent/dashboard', async (req, res) => {
  try {
    const agentId = (req as any).user?.id || req.query.agent_id;

    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID required' });
    }

    // Get leads
    const agentLeads = await db.select()
      .from(leads)
      .where(eq(leads.assignedTo, parseInt(agentId as string)))
      .orderBy(desc(leads.createdAt));

    // Get proposals
    const agentProposals = await db.select()
      .from(salesProposals)
      .where(eq(salesProposals.createdBy, parseInt(agentId as string)))
      .orderBy(desc(salesProposals.createdAt));

    // Calculate stats
    const leadStats = {
      total: agentLeads.length,
      new: agentLeads.filter(l => l.stage === 'new').length,
      qualified: agentLeads.filter(l => l.stage === 'qualified' || l.stage === 'hot_lead').length,
      converted: agentLeads.filter(l => l.stage === 'converted').length,
      conversionRate: agentLeads.length > 0
        ? Math.round((agentLeads.filter(l => l.stage === 'converted').length / agentLeads.length) * 100)
        : 0
    };

    const proposalStats = {
      total: agentProposals.length,
      draft: agentProposals.filter(p => p.status === 'draft').length,
      sent: agentProposals.filter(p => p.status === 'sent').length,
      accepted: agentProposals.filter(p => p.status === 'accepted').length,
      successRate: agentProposals.length > 0
        ? Math.round((agentProposals.filter(p => p.status === 'accepted').length / agentProposals.length) * 100)
        : 0
    };

    // Get service-wise performance
    const servicePerformance = await db.select({
      serviceType: leads.interestedServices,
      count: sql<number>`count(*)`,
      converted: sql<number>`SUM(CASE WHEN stage = 'converted' THEN 1 ELSE 0 END)`
    })
    .from(leads)
    .where(eq(leads.assignedTo, parseInt(agentId as string)))
    .groupBy(leads.interestedServices);

    res.json({
      leads: {
        stats: leadStats,
        recent: agentLeads.slice(0, 10)
      },
      proposals: {
        stats: proposalStats,
        recent: agentProposals.slice(0, 10)
      },
      servicePerformance
    });
  } catch (error) {
    console.error('Error fetching agent dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ============================================================================
// OPERATIONS APIs - Work Queue, Tasks, Processing
// ============================================================================

/**
 * GET /api/universal/ops/dashboard
 * Operations dashboard with work queue stats
 */
router.get('/ops/dashboard', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    const showAll = role === 'ops_lead' || role === 'admin' || role === 'super_admin';

    // Get work queue stats
    const allItems = await db.select().from(workItemQueue);

    const myItems = showAll
      ? allItems
      : allItems.filter(i => i.assignedTo === userId);

    const stats = {
      total: myItems.length,
      onTrack: myItems.filter(i => i.slaStatus === 'on_track').length,
      atRisk: myItems.filter(i => i.slaStatus === 'at_risk' || i.slaStatus === 'warning').length,
      breached: myItems.filter(i => i.slaStatus === 'breached').length,
      unassigned: allItems.filter(i => !i.assignedTo).length
    };

    // Get by service type
    const byServiceType = myItems.reduce((acc: any, item) => {
      const service = item.serviceKey || 'Unknown';
      if (!acc[service]) {
        acc[service] = { total: 0, onTrack: 0, atRisk: 0, breached: 0 };
      }
      acc[service].total++;
      if (item.slaStatus === 'on_track') acc[service].onTrack++;
      if (item.slaStatus === 'at_risk' || item.slaStatus === 'warning') acc[service].atRisk++;
      if (item.slaStatus === 'breached') acc[service].breached++;
      return acc;
    }, {});

    // Get by status
    const byStatus = myItems.reduce((acc: any, item) => {
      const status = item.currentStatus || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Get urgent items
    const urgentItems = myItems
      .filter(i => i.slaStatus === 'breached' || i.slaStatus === 'warning')
      .sort((a, b) => (a.slaHoursRemaining || 0) - (b.slaHoursRemaining || 0))
      .slice(0, 10);

    // Get today's tasks
    const todaysTasks = await db.select()
      .from(taskItems)
      .where(
        and(
          showAll ? sql`1=1` : eq(taskItems.assignedTo, userId),
          sql`DATE(${taskItems.dueDate}) = CURRENT_DATE`
        )
      )
      .orderBy(taskItems.priority);

    res.json({
      stats,
      byServiceType,
      byStatus,
      urgentItems,
      todaysTasks,
      showingAll: showAll
    });
  } catch (error) {
    console.error('Error fetching ops dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

/**
 * GET /api/universal/ops/service-requests
 * Get all service requests for operations
 */
router.get('/ops/service-requests', async (req, res) => {
  try {
    const {
      status,
      service_type,
      assigned_to,
      priority,
      sla_status,
      limit = 50,
      offset = 0
    } = req.query;

    let conditions: any[] = [
      sql`${serviceRequests.status} NOT IN ('completed', 'cancelled', 'Completed', 'Cancelled')`
    ];

    if (status) {
      conditions.push(eq(serviceRequests.status, status as string));
    }
    if (service_type) {
      conditions.push(eq(serviceRequests.serviceType, service_type as string));
    }
    if (assigned_to) {
      conditions.push(eq(serviceRequests.assignedTo, parseInt(assigned_to as string)));
    }
    if (priority) {
      conditions.push(eq(serviceRequests.priority, priority as string));
    }

    const requests = await db.select({
      id: serviceRequests.id,
      serviceType: serviceRequests.serviceType,
      status: serviceRequests.status,
      priority: serviceRequests.priority,
      periodLabel: serviceRequests.periodLabel,
      dueDate: serviceRequests.dueDate,
      createdAt: serviceRequests.createdAt,
      updatedAt: serviceRequests.updatedAt,
      entityId: serviceRequests.entityId,
      entityName: businessEntities.name,
      assignedTo: serviceRequests.assignedTo
    })
    .from(serviceRequests)
    .leftJoin(businessEntities, eq(serviceRequests.entityId, businessEntities.id))
    .where(and(...conditions))
    .orderBy(
      sql`CASE WHEN ${serviceRequests.priority} = 'urgent' THEN 1
               WHEN ${serviceRequests.priority} = 'HIGH' THEN 2
               WHEN ${serviceRequests.priority} = 'MEDIUM' THEN 3
               ELSE 4 END`,
      asc(serviceRequests.dueDate)
    )
    .limit(parseInt(limit as string))
    .offset(parseInt(offset as string));

    // Enrich with SLA status from work queue
    const enrichedRequests = await Promise.all(requests.map(async (request) => {
      const [workItem] = await db.select()
        .from(workItemQueue)
        .where(eq(workItemQueue.serviceRequestId, request.id))
        .limit(1);

      return {
        ...request,
        slaStatus: workItem?.slaStatus || 'unknown',
        slaHoursRemaining: workItem?.slaHoursRemaining,
        escalationLevel: workItem?.escalationLevel || 0
      };
    }));

    res.json({
      total: requests.length,
      requests: enrichedRequests
    });
  } catch (error) {
    console.error('Error fetching service requests:', error);
    res.status(500).json({ error: 'Failed to fetch service requests' });
  }
});

// ============================================================================
// QC APIs - Quality Control
// ============================================================================

/**
 * GET /api/universal/qc/dashboard
 * QC dashboard with review queue
 */
router.get('/qc/dashboard', async (req, res) => {
  try {
    // Get items pending QC
    const pendingQC = await db.select({
      id: serviceRequests.id,
      serviceType: serviceRequests.serviceType,
      status: serviceRequests.status,
      priority: serviceRequests.priority,
      entityName: businessEntities.name,
      createdAt: serviceRequests.createdAt
    })
    .from(serviceRequests)
    .leftJoin(businessEntities, eq(serviceRequests.entityId, businessEntities.id))
    .where(
      or(
        eq(serviceRequests.status, 'qc_review'),
        eq(serviceRequests.status, 'QC Review'),
        eq(serviceRequests.status, 'quality_check')
      )
    )
    .orderBy(asc(serviceRequests.createdAt));

    // Get recent reviews
    const recentReviews = await db.select()
      .from(qualityReviews)
      .orderBy(desc(qualityReviews.reviewedAt))
      .limit(20);

    // Calculate quality metrics
    const allReviews = await db.select().from(qualityReviews);
    const qualityMetrics = {
      totalReviews: allReviews.length,
      approved: allReviews.filter(r => r.status === 'approved').length,
      rejected: allReviews.filter(r => r.status === 'rejected').length,
      needsRevision: allReviews.filter(r => r.status === 'needs_revision').length,
      averageScore: allReviews.length > 0
        ? Math.round(allReviews.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / allReviews.length * 10) / 10
        : 0,
      passRate: allReviews.length > 0
        ? Math.round((allReviews.filter(r => r.status === 'approved').length / allReviews.length) * 100)
        : 0
    };

    res.json({
      pendingQC,
      recentReviews,
      qualityMetrics
    });
  } catch (error) {
    console.error('Error fetching QC dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

/**
 * POST /api/universal/qc/review
 * Submit a QC review
 */
router.post('/qc/review', async (req, res) => {
  try {
    const {
      service_request_id,
      status, // approved, rejected, needs_revision
      quality_score,
      checklist_items,
      comments,
      recommendations
    } = req.body;

    const reviewerId = (req as any).user?.id || 1;

    // Create review record
    const [review] = await db.insert(qualityReviews)
      .values({
        serviceRequestId: service_request_id,
        reviewerId,
        reviewType: 'final',
        status,
        qualityScore: quality_score,
        checklistItems: JSON.stringify(checklist_items),
        comments,
        recommendations,
        reviewedAt: new Date()
      })
      .returning();

    // Update service request status based on review
    const newStatus = status === 'approved' ? 'ready_for_delivery' :
                      status === 'rejected' ? 'in_progress' : 'in_progress';

    await db.update(serviceRequests)
      .set({
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(serviceRequests.id, service_request_id));

    // Log activity
    await logWorkItemActivity({
      workItemQueueId: 0,
      serviceRequestId: service_request_id,
      activityType: 'qc_review',
      activityDescription: `QC Review: ${status} (Score: ${quality_score}/10)`,
      performedBy: reviewerId,
      triggerSource: 'qc_portal',
      clientVisible: status === 'approved',
      clientMessage: status === 'approved' ? 'Your service has passed quality review and is ready for delivery.' : undefined
    });

    res.json({
      success: true,
      review,
      newStatus
    });
  } catch (error) {
    console.error('Error submitting QC review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ============================================================================
// FINANCE APIs - Revenue, Payments
// ============================================================================

/**
 * GET /api/universal/finance/dashboard
 * Finance dashboard with revenue metrics
 */
router.get('/finance/dashboard', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    // Get all payments
    let paymentConditions: any[] = [];
    if (from_date) {
      paymentConditions.push(gte(payments.createdAt, new Date(from_date as string)));
    }
    if (to_date) {
      paymentConditions.push(lte(payments.createdAt, new Date(to_date as string)));
    }

    const allPayments = paymentConditions.length > 0
      ? await db.select().from(payments).where(and(...paymentConditions))
      : await db.select().from(payments);

    // Calculate revenue metrics
    const revenueMetrics = {
      totalRevenue: allPayments.reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0),
      totalTransactions: allPayments.length,
      paid: allPayments.filter(p => p.status === 'paid' || p.status === 'completed').length,
      pending: allPayments.filter(p => p.status === 'pending').length,
      failed: allPayments.filter(p => p.status === 'failed').length
    };

    // Revenue by service type
    const revenueByService = await db.select({
      serviceType: serviceRequests.serviceType,
      totalAmount: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
      count: sql<number>`COUNT(*)`
    })
    .from(payments)
    .leftJoin(serviceRequests, eq(payments.serviceRequestId, serviceRequests.id))
    .groupBy(serviceRequests.serviceType);

    // Monthly trend
    const monthlyTrend = await db.select({
      month: sql<string>`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`,
      revenue: sql<number>`SUM(${payments.amount})`,
      count: sql<number>`COUNT(*)`
    })
    .from(payments)
    .where(eq(payments.status, 'paid'))
    .groupBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${payments.createdAt}, 'YYYY-MM')`);

    // Recent transactions
    const recentTransactions = await db.select({
      id: payments.id,
      amount: payments.amount,
      status: payments.status,
      method: payments.paymentMethod,
      createdAt: payments.createdAt,
      serviceType: serviceRequests.serviceType,
      entityName: businessEntities.name
    })
    .from(payments)
    .leftJoin(serviceRequests, eq(payments.serviceRequestId, serviceRequests.id))
    .leftJoin(businessEntities, eq(serviceRequests.entityId, businessEntities.id))
    .orderBy(desc(payments.createdAt))
    .limit(20);

    res.json({
      metrics: revenueMetrics,
      byService: revenueByService,
      monthlyTrend,
      recentTransactions
    });
  } catch (error) {
    console.error('Error fetching finance dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ============================================================================
// ADMIN APIs - Service Configuration
// ============================================================================

/**
 * GET /api/universal/admin/services-overview
 * Admin overview of all 96+ services
 */
router.get('/admin/services-overview', async (req, res) => {
  try {
    // Get all services
    const services = await db.select().from(servicesCatalog);

    // Get request counts per service
    const requestCounts = await db.select({
      serviceType: serviceRequests.serviceType,
      total: sql<number>`COUNT(*)`,
      active: sql<number>`SUM(CASE WHEN status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END)`,
      completed: sql<number>`SUM(CASE WHEN status IN ('completed', 'Completed') THEN 1 ELSE 0 END)`
    })
    .from(serviceRequests)
    .groupBy(serviceRequests.serviceType);

    // Get workflow status counts per service
    const statusCounts = await db.select({
      serviceKey: serviceWorkflowStatuses.serviceKey,
      count: sql<number>`COUNT(*)`
    })
    .from(serviceWorkflowStatuses)
    .where(eq(serviceWorkflowStatuses.isActive, true))
    .groupBy(serviceWorkflowStatuses.serviceKey);

    // Merge data
    const enrichedServices = services.map(service => {
      const requests = requestCounts.find(r => r.serviceType === service.serviceKey);
      const statuses = statusCounts.find(s => s.serviceKey === service.serviceKey);

      return {
        ...service,
        requestStats: {
          total: requests?.total || 0,
          active: requests?.active || 0,
          completed: requests?.completed || 0
        },
        workflowConfigured: (statuses?.count || 0) > 0,
        statusCount: statuses?.count || 0
      };
    });

    // Group by category
    const byCategory = enrichedServices.reduce((acc: any, service) => {
      const cat = service.category || 'Other';
      if (!acc[cat]) {
        acc[cat] = { services: [], totalRequests: 0, activeRequests: 0 };
      }
      acc[cat].services.push(service);
      acc[cat].totalRequests += service.requestStats.total;
      acc[cat].activeRequests += service.requestStats.active;
      return acc;
    }, {});

    res.json({
      totalServices: services.length,
      activeServices: services.filter(s => s.isActive).length,
      services: enrichedServices,
      byCategory,
      summary: {
        totalRequests: requestCounts.reduce((sum, r) => sum + (r.total || 0), 0),
        activeRequests: requestCounts.reduce((sum, r) => sum + (r.active || 0), 0),
        completedRequests: requestCounts.reduce((sum, r) => sum + (r.completed || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching admin services overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

/**
 * POST /api/universal/admin/service
 * Create or update a service
 */
router.post('/admin/service', async (req, res) => {
  try {
    const {
      id,
      service_key,
      name,
      category,
      periodicity,
      description,
      is_active = true
    } = req.body;

    if (id) {
      // Update existing
      const [updated] = await db.update(servicesCatalog)
        .set({
          name,
          category,
          periodicity,
          description,
          isActive: is_active,
          updatedAt: new Date()
        })
        .where(eq(servicesCatalog.id, id))
        .returning();

      res.json({ success: true, service: updated, action: 'updated' });
    } else {
      // Create new
      const [created] = await db.insert(servicesCatalog)
        .values({
          serviceKey: service_key,
          name,
          category,
          periodicity,
          description,
          isActive: is_active
        })
        .returning();

      res.json({ success: true, service: created, action: 'created' });
    }
  } catch (error) {
    console.error('Error saving service:', error);
    res.status(500).json({ error: 'Failed to save service' });
  }
});

// ============================================================================
// COMMON APIs - Shared across roles
// ============================================================================

/**
 * GET /api/universal/my-tasks
 * Get tasks for current user
 */
router.get('/my-tasks', async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    const tasks = await db.select({
      id: taskItems.id,
      title: taskItems.title,
      description: taskItems.description,
      taskType: taskItems.taskType,
      status: taskItems.status,
      priority: taskItems.priority,
      dueDate: taskItems.dueDate,
      serviceRequestId: taskItems.serviceRequestId,
      createdAt: taskItems.createdAt
    })
    .from(taskItems)
    .where(
      and(
        eq(taskItems.assignedTo, userId),
        ne(taskItems.status, 'completed')
      )
    )
    .orderBy(
      sql`CASE WHEN ${taskItems.priority} = 'urgent' THEN 1
               WHEN ${taskItems.priority} = 'high' THEN 2
               WHEN ${taskItems.priority} = 'medium' THEN 3
               ELSE 4 END`,
      asc(taskItems.dueDate)
    );

    const stats = {
      total: tasks.length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
      dueToday: tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()).length,
      urgent: tasks.filter(t => t.priority === 'urgent').length
    };

    res.json({ tasks, stats });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * GET /api/universal/notifications
 * Get notifications for current user
 */
router.get('/notifications', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;

    // Get recent activity relevant to user
    const activity = await db.select()
      .from(workItemActivityLog)
      .orderBy(desc(workItemActivityLog.occurredAt))
      .limit(50);

    // Filter based on role
    const filtered = activity.filter(a => {
      if (role === 'client') return a.clientVisible;
      return true;
    });

    res.json({
      notifications: filtered.slice(0, 20),
      unreadCount: filtered.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router;
