/**
 * CORE DATA ENGINE - Single Source of Truth
 *
 * This is the central data access layer for the entire DigiComply platform.
 * All stakeholders access the SAME data through this engine with role-based filtering.
 *
 * PRINCIPLES:
 * 1. Single Source of Truth - One place for all service/request data
 * 2. Role-Based Access - Same data, different views based on permissions
 * 3. Consistency - All dashboards show consistent, real-time data
 * 4. Audit Trail - Every access and change is logged
 * 5. US Compliance Standards - SOC 2 compliant data handling
 *
 * STAKEHOLDERS SERVED:
 * - CLIENT: See their own services, transparent status
 * - AGENT: See leads, proposals, commissions
 * - OPS_EXECUTIVE: See assigned work, process services
 * - OPS_LEAD: See team's work, handle escalations
 * - QC_REVIEWER: See items for quality review
 * - FINANCE: See payments, revenue, invoices
 * - ADMIN: See everything, configure system
 * - SUPER_ADMIN: Full system access
 */

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
  escalationRules,
  documentsUploads,
  payments,
  qualityReviews,
  deliveryConfirmations,
  leads,
  salesProposals,
  commissionRecords,
  auditLogs
} from '@shared/schema';
import { eq, and, desc, asc, sql, gte, lte, isNull, or, ne, inArray, notInArray } from 'drizzle-orm';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type UserRole =
  | 'client'
  | 'agent'
  | 'ops_executive'
  | 'ops_lead'
  | 'qc_reviewer'
  | 'customer_service'
  | 'finance'
  | 'admin'
  | 'super_admin';

export interface UserContext {
  userId: number;
  role: UserRole;
  entityId?: number;       // For clients - their business entity
  teamId?: number;         // For ops - their team
  permissions: string[];
}

export interface ServiceRequestView {
  id: number;
  serviceKey: string;
  serviceName: string;
  serviceCategory: string;
  entityId: number;
  entityName: string;
  status: string;
  statusLabel: string;      // Human-readable status
  priority: string;
  periodLabel?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: number;
  assignedToName?: string;
  slaStatus: 'on_track' | 'at_risk' | 'warning' | 'breached';
  slaHoursRemaining?: number;
  escalationLevel: number;
  progress: number;         // 0-100
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  // Role-specific fields
  canEdit?: boolean;
  canTransition?: boolean;
  nextActions?: string[];
}

export interface DashboardStats {
  totalServices: number;
  activeServices: number;
  completedServices: number;
  pendingAction: number;
  atRisk: number;
  breached: number;
  dueToday: number;
  dueThisWeek: number;
}

export interface ServiceCatalogItem {
  id: number;
  serviceKey: string;
  name: string;
  category: string;
  periodicity: string;
  description?: string;
  isActive: boolean;
  // Stats
  totalRequests: number;
  activeRequests: number;
  avgCompletionDays: number;
}

// ============================================================================
// ROLE PERMISSIONS MATRIX
// ============================================================================

const ROLE_PERMISSIONS: Record<UserRole, {
  canViewAllRequests: boolean;
  canViewOwnRequests: boolean;
  canViewTeamRequests: boolean;
  canViewAssignedRequests: boolean;
  canProcessRequests: boolean;
  canApproveQC: boolean;
  canViewFinancials: boolean;
  canConfigureSystem: boolean;
  canManageUsers: boolean;
  canViewAllClients: boolean;
  dataScope: 'own' | 'team' | 'all';
}> = {
  client: {
    canViewAllRequests: false,
    canViewOwnRequests: true,
    canViewTeamRequests: false,
    canViewAssignedRequests: false,
    canProcessRequests: false,
    canApproveQC: false,
    canViewFinancials: false,
    canConfigureSystem: false,
    canManageUsers: false,
    canViewAllClients: false,
    dataScope: 'own'
  },
  agent: {
    canViewAllRequests: false,
    canViewOwnRequests: false,
    canViewTeamRequests: false,
    canViewAssignedRequests: true,
    canProcessRequests: false,
    canApproveQC: false,
    canViewFinancials: false,
    canConfigureSystem: false,
    canManageUsers: false,
    canViewAllClients: false,
    dataScope: 'own'
  },
  ops_executive: {
    canViewAllRequests: false,
    canViewOwnRequests: false,
    canViewTeamRequests: false,
    canViewAssignedRequests: true,
    canProcessRequests: true,
    canApproveQC: false,
    canViewFinancials: false,
    canConfigureSystem: false,
    canManageUsers: false,
    canViewAllClients: true,
    dataScope: 'team'
  },
  ops_lead: {
    canViewAllRequests: true,
    canViewOwnRequests: true,
    canViewTeamRequests: true,
    canViewAssignedRequests: true,
    canProcessRequests: true,
    canApproveQC: false,
    canViewFinancials: false,
    canConfigureSystem: false,
    canManageUsers: false,
    canViewAllClients: true,
    dataScope: 'all'
  },
  qc_reviewer: {
    canViewAllRequests: false,
    canViewOwnRequests: false,
    canViewTeamRequests: false,
    canViewAssignedRequests: true,
    canProcessRequests: false,
    canApproveQC: true,
    canViewFinancials: false,
    canConfigureSystem: false,
    canManageUsers: false,
    canViewAllClients: false,
    dataScope: 'team'
  },
  customer_service: {
    canViewAllRequests: true,
    canViewOwnRequests: true,
    canViewTeamRequests: true,
    canViewAssignedRequests: true,
    canProcessRequests: false,
    canApproveQC: false,
    canViewFinancials: false,
    canConfigureSystem: false,
    canManageUsers: false,
    canViewAllClients: true,
    dataScope: 'all'
  },
  finance: {
    canViewAllRequests: true,
    canViewOwnRequests: true,
    canViewTeamRequests: true,
    canViewAssignedRequests: true,
    canProcessRequests: false,
    canApproveQC: false,
    canViewFinancials: true,
    canConfigureSystem: false,
    canManageUsers: false,
    canViewAllClients: true,
    dataScope: 'all'
  },
  admin: {
    canViewAllRequests: true,
    canViewOwnRequests: true,
    canViewTeamRequests: true,
    canViewAssignedRequests: true,
    canProcessRequests: true,
    canApproveQC: true,
    canViewFinancials: true,
    canConfigureSystem: true,
    canManageUsers: true,
    canViewAllClients: true,
    dataScope: 'all'
  },
  super_admin: {
    canViewAllRequests: true,
    canViewOwnRequests: true,
    canViewTeamRequests: true,
    canViewAssignedRequests: true,
    canProcessRequests: true,
    canApproveQC: true,
    canViewFinancials: true,
    canConfigureSystem: true,
    canManageUsers: true,
    canViewAllClients: true,
    dataScope: 'all'
  }
};

// ============================================================================
// CORE DATA ENGINE CLASS
// ============================================================================

class CoreDataEngine {
  private static instance: CoreDataEngine;

  private constructor() {}

  public static getInstance(): CoreDataEngine {
    if (!CoreDataEngine.instance) {
      CoreDataEngine.instance = new CoreDataEngine();
    }
    return CoreDataEngine.instance;
  }

  // ==========================================================================
  // PERMISSION HELPERS
  // ==========================================================================

  getPermissions(role: UserRole) {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.client;
  }

  canAccess(userContext: UserContext, resource: string, action: string): boolean {
    const permissions = this.getPermissions(userContext.role);

    switch (`${resource}:${action}`) {
      case 'service_request:view_all':
        return permissions.canViewAllRequests;
      case 'service_request:view_own':
        return permissions.canViewOwnRequests;
      case 'service_request:process':
        return permissions.canProcessRequests;
      case 'qc:approve':
        return permissions.canApproveQC;
      case 'financial:view':
        return permissions.canViewFinancials;
      case 'system:configure':
        return permissions.canConfigureSystem;
      case 'user:manage':
        return permissions.canManageUsers;
      default:
        return false;
    }
  }

  // ==========================================================================
  // SERVICE CATALOG - Same for all users
  // ==========================================================================

  async getServiceCatalog(filters?: {
    category?: string;
    search?: string;
    isActive?: boolean;
  }): Promise<ServiceCatalogItem[]> {
    let conditions: any[] = [];

    if (filters?.isActive !== undefined) {
      conditions.push(eq(servicesCatalog.isActive, filters.isActive));
    }

    if (filters?.category) {
      conditions.push(eq(servicesCatalog.category, filters.category));
    }

    if (filters?.search) {
      conditions.push(
        or(
          sql`LOWER(${servicesCatalog.name}) LIKE LOWER(${'%' + filters.search + '%'})`,
          sql`LOWER(${servicesCatalog.serviceKey}) LIKE LOWER(${'%' + filters.search + '%'})`
        )
      );
    }

    const services = conditions.length > 0
      ? await db.select().from(servicesCatalog).where(and(...conditions))
      : await db.select().from(servicesCatalog);

    // Enrich with stats
    const enriched = await Promise.all(services.map(async (service) => {
      const requestStats = await db.select({
        total: sql<number>`COUNT(*)`,
        active: sql<number>`SUM(CASE WHEN status NOT IN ('completed', 'cancelled', 'Completed', 'Cancelled') THEN 1 ELSE 0 END)`
      })
      .from(serviceRequests)
      .where(eq(serviceRequests.serviceType, service.serviceKey));

      return {
        id: service.id,
        serviceKey: service.serviceKey,
        name: service.name,
        category: service.category || 'Other',
        periodicity: service.periodicity,
        description: service.description,
        isActive: service.isActive ?? true,
        totalRequests: Number(requestStats[0]?.total) || 0,
        activeRequests: Number(requestStats[0]?.active) || 0,
        avgCompletionDays: 0 // Calculate from historical data
      };
    }));

    return enriched;
  }

  async getServiceDetails(serviceKey: string) {
    const [service] = await db.select()
      .from(servicesCatalog)
      .where(eq(servicesCatalog.serviceKey, serviceKey));

    if (!service) return null;

    // Get workflow configuration
    const statuses = await db.select()
      .from(serviceWorkflowStatuses)
      .where(and(
        eq(serviceWorkflowStatuses.serviceKey, serviceKey),
        eq(serviceWorkflowStatuses.isActive, true)
      ))
      .orderBy(serviceWorkflowStatuses.displayOrder);

    const transitions = await db.select()
      .from(statusTransitionRules)
      .where(and(
        eq(statusTransitionRules.serviceKey, serviceKey),
        eq(statusTransitionRules.isActive, true)
      ));

    return {
      service,
      workflow: { statuses, transitions },
      isConfigured: statuses.length > 0
    };
  }

  // ==========================================================================
  // SERVICE REQUESTS - Role-based filtering
  // ==========================================================================

  async getServiceRequests(
    userContext: UserContext,
    filters?: {
      status?: string;
      serviceKey?: string;
      priority?: string;
      slaStatus?: string;
      assignedTo?: number;
      entityId?: number;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ requests: ServiceRequestView[]; total: number }> {
    const permissions = this.getPermissions(userContext.role);
    let conditions: any[] = [];

    // Apply role-based data scope
    switch (permissions.dataScope) {
      case 'own':
        // Client sees only their entity's requests
        if (userContext.entityId) {
          conditions.push(eq(serviceRequests.entityId, userContext.entityId));
        }
        break;
      case 'team':
        // Ops sees assigned or team's requests
        if (!permissions.canViewAllRequests) {
          conditions.push(
            or(
              eq(serviceRequests.assignedTo, userContext.userId),
              isNull(serviceRequests.assignedTo) // Unassigned items visible to team
            )
          );
        }
        break;
      case 'all':
        // Admin/Lead sees everything - no scope filter
        break;
    }

    // Apply additional filters
    if (filters?.status) {
      conditions.push(eq(serviceRequests.status, filters.status));
    }
    if (filters?.serviceKey) {
      conditions.push(eq(serviceRequests.serviceType, filters.serviceKey));
    }
    if (filters?.priority) {
      conditions.push(eq(serviceRequests.priority, filters.priority));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(serviceRequests.assignedTo, filters.assignedTo));
    }
    if (filters?.entityId) {
      conditions.push(eq(serviceRequests.entityId, filters.entityId));
    }

    // Exclude terminal statuses for active views
    const activeStatuses = ['completed', 'cancelled', 'Completed', 'Cancelled'];

    // Base query
    let query = db.select({
      id: serviceRequests.id,
      serviceType: serviceRequests.serviceType,
      status: serviceRequests.status,
      priority: serviceRequests.priority,
      periodLabel: serviceRequests.periodLabel,
      dueDate: serviceRequests.dueDate,
      createdAt: serviceRequests.createdAt,
      updatedAt: serviceRequests.updatedAt,
      entityId: serviceRequests.entityId,
      assignedTo: serviceRequests.assignedTo,
      entityName: businessEntities.name,
      assignedToName: users.fullName
    })
    .from(serviceRequests)
    .leftJoin(businessEntities, eq(serviceRequests.entityId, businessEntities.id))
    .leftJoin(users, eq(serviceRequests.assignedTo, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(
      sql`CASE WHEN ${serviceRequests.priority} = 'urgent' THEN 1
               WHEN ${serviceRequests.priority} = 'HIGH' THEN 2
               WHEN ${serviceRequests.priority} = 'MEDIUM' THEN 3
               ELSE 4 END`,
      desc(serviceRequests.updatedAt)
    ) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const rawRequests = await query;

    // Enrich with workflow and SLA data
    const enrichedRequests = await Promise.all(rawRequests.map(async (req) => {
      return this.enrichServiceRequest(req, userContext);
    }));

    // Get total count
    const totalResult = await db.select({ count: sql<number>`COUNT(*)` })
      .from(serviceRequests)
      .where(conditions.length > 0 ? and(...conditions) : sql`1=1`);

    return {
      requests: enrichedRequests,
      total: Number(totalResult[0]?.count) || 0
    };
  }

  private async enrichServiceRequest(req: any, userContext: UserContext): Promise<ServiceRequestView> {
    const permissions = this.getPermissions(userContext.role);

    // Get workflow statuses for progress calculation
    const statuses = await db.select()
      .from(serviceWorkflowStatuses)
      .where(and(
        eq(serviceWorkflowStatuses.serviceKey, req.serviceType || ''),
        eq(serviceWorkflowStatuses.isActive, true)
      ))
      .orderBy(serviceWorkflowStatuses.displayOrder);

    // Get work queue item for SLA status
    const [workItem] = await db.select()
      .from(workItemQueue)
      .where(eq(workItemQueue.serviceRequestId, req.id))
      .limit(1);

    // Calculate progress
    const currentStatusIndex = statuses.findIndex(s => s.statusCode === req.status);
    const progress = statuses.length > 0
      ? Math.round(((currentStatusIndex + 1) / statuses.length) * 100)
      : 0;

    // Get status label based on role
    const currentStatus = statuses.find(s => s.statusCode === req.status);
    const statusLabel = userContext.role === 'client'
      ? (currentStatus?.clientStatusLabel || req.status)
      : (currentStatus?.statusName || req.status);

    // Get service name
    const [service] = await db.select()
      .from(servicesCatalog)
      .where(eq(servicesCatalog.serviceKey, req.serviceType || ''))
      .limit(1);

    // Determine available actions based on role and current status
    const nextActions = await this.getAvailableActions(req, userContext);

    return {
      id: req.id,
      serviceKey: req.serviceType || '',
      serviceName: service?.name || req.serviceType || 'Unknown',
      serviceCategory: service?.category || 'Other',
      entityId: req.entityId,
      entityName: req.entityName || 'Unknown',
      status: req.status || 'pending',
      statusLabel,
      priority: req.priority || 'MEDIUM',
      periodLabel: req.periodLabel,
      dueDate: req.dueDate ? new Date(req.dueDate) : undefined,
      createdAt: req.createdAt ? new Date(req.createdAt) : new Date(),
      updatedAt: req.updatedAt ? new Date(req.updatedAt) : new Date(),
      assignedTo: req.assignedTo,
      assignedToName: req.assignedToName,
      slaStatus: (workItem?.slaStatus as any) || 'on_track',
      slaHoursRemaining: workItem?.slaHoursRemaining,
      escalationLevel: workItem?.escalationLevel || 0,
      progress,
      currentStep: statusLabel,
      totalSteps: statuses.length,
      completedSteps: currentStatusIndex + 1,
      canEdit: permissions.canProcessRequests,
      canTransition: permissions.canProcessRequests ||
                     (userContext.role === 'client' && currentStatus?.statusCode === 'docs_pending'),
      nextActions
    };
  }

  private async getAvailableActions(req: any, userContext: UserContext): Promise<string[]> {
    const permissions = this.getPermissions(userContext.role);
    const actions: string[] = [];

    // Get valid transitions for current status
    const transitions = await db.select()
      .from(statusTransitionRules)
      .where(and(
        eq(statusTransitionRules.serviceKey, req.serviceType || ''),
        eq(statusTransitionRules.fromStatusCode, req.status || ''),
        eq(statusTransitionRules.isActive, true)
      ));

    for (const transition of transitions) {
      const allowedRoles = transition.allowedRoles as string[] || [];
      if (allowedRoles.includes(userContext.role) ||
          allowedRoles.includes('admin') && (userContext.role === 'admin' || userContext.role === 'super_admin')) {
        actions.push(transition.buttonLabel || transition.transitionName || transition.toStatusCode);
      }
    }

    // Add role-specific actions
    if (userContext.role === 'client') {
      actions.push('Upload Document', 'Contact Support');
    }
    if (permissions.canProcessRequests) {
      actions.push('Add Note', 'Assign');
    }
    if (permissions.canApproveQC && req.status === 'qc_review') {
      actions.push('Approve QC', 'Reject QC', 'Request Rework');
    }

    return actions;
  }

  // ==========================================================================
  // DASHBOARD DATA - Role-specific aggregations
  // ==========================================================================

  async getDashboardStats(userContext: UserContext): Promise<DashboardStats> {
    const { requests } = await this.getServiceRequests(userContext, { limit: 10000 });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const activeStatuses = ['completed', 'cancelled', 'Completed', 'Cancelled'];

    return {
      totalServices: requests.length,
      activeServices: requests.filter(r => !activeStatuses.includes(r.status)).length,
      completedServices: requests.filter(r => ['completed', 'Completed'].includes(r.status)).length,
      pendingAction: requests.filter(r => ['initiated', 'docs_pending', 'Created'].includes(r.status)).length,
      atRisk: requests.filter(r => r.slaStatus === 'at_risk' || r.slaStatus === 'warning').length,
      breached: requests.filter(r => r.slaStatus === 'breached').length,
      dueToday: requests.filter(r => r.dueDate && r.dueDate.toDateString() === today.toDateString()).length,
      dueThisWeek: requests.filter(r => r.dueDate && r.dueDate >= today && r.dueDate <= weekEnd).length
    };
  }

  async getActivityTimeline(
    userContext: UserContext,
    serviceRequestId?: number,
    limit: number = 50
  ): Promise<any[]> {
    const permissions = this.getPermissions(userContext.role);

    let query = db.select().from(workItemActivityLog);
    let conditions: any[] = [];

    if (serviceRequestId) {
      conditions.push(eq(workItemActivityLog.serviceRequestId, serviceRequestId));
    }

    // Clients only see client-visible activities
    if (userContext.role === 'client') {
      conditions.push(eq(workItemActivityLog.clientVisible, true));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query
      .orderBy(desc(workItemActivityLog.occurredAt))
      .limit(limit);
  }

  // ==========================================================================
  // ROLE-SPECIFIC DATA METHODS
  // ==========================================================================

  // CLIENT-specific methods
  async getClientDashboard(userContext: UserContext) {
    if (userContext.role !== 'client' || !userContext.entityId) {
      throw new Error('Invalid user context for client dashboard');
    }

    const [entity] = await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.id, userContext.entityId));

    const stats = await this.getDashboardStats(userContext);
    const { requests } = await this.getServiceRequests(userContext);

    // Upcoming deadlines
    const upcomingDeadlines = requests
      .filter(r => r.dueDate && r.dueDate > new Date())
      .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
      .slice(0, 10);

    // Recent activity (client-visible only)
    const recentActivity = await this.getActivityTimeline(userContext, undefined, 20);

    return {
      entity,
      stats,
      requests,
      upcomingDeadlines,
      recentActivity
    };
  }

  // AGENT-specific methods
  async getAgentDashboard(userContext: UserContext) {
    if (userContext.role !== 'agent') {
      throw new Error('Invalid user context for agent dashboard');
    }

    // Get leads
    const agentLeads = await db.select()
      .from(leads)
      .where(eq(leads.assignedTo, userContext.userId))
      .orderBy(desc(leads.createdAt));

    // Get proposals
    const agentProposals = await db.select()
      .from(salesProposals)
      .where(eq(salesProposals.createdBy, userContext.userId))
      .orderBy(desc(salesProposals.createdAt));

    // Calculate lead stats
    const leadStats = {
      total: agentLeads.length,
      new: agentLeads.filter(l => l.stage === 'new').length,
      qualified: agentLeads.filter(l => ['qualified', 'hot_lead'].includes(l.stage || '')).length,
      converted: agentLeads.filter(l => l.stage === 'converted').length,
      conversionRate: agentLeads.length > 0
        ? Math.round((agentLeads.filter(l => l.stage === 'converted').length / agentLeads.length) * 100)
        : 0
    };

    // Calculate proposal stats
    const proposalStats = {
      total: agentProposals.length,
      draft: agentProposals.filter(p => p.status === 'draft').length,
      sent: agentProposals.filter(p => p.status === 'sent').length,
      accepted: agentProposals.filter(p => p.status === 'accepted').length
    };

    return {
      leads: { stats: leadStats, recent: agentLeads.slice(0, 10) },
      proposals: { stats: proposalStats, recent: agentProposals.slice(0, 10) }
    };
  }

  // OPS-specific methods
  async getOpsDashboard(userContext: UserContext) {
    const permissions = this.getPermissions(userContext.role);
    const isLead = userContext.role === 'ops_lead' || permissions.canViewAllRequests;

    // Get work queue
    let workQueueConditions: any[] = [];
    if (!isLead) {
      workQueueConditions.push(
        or(
          eq(workItemQueue.assignedTo, userContext.userId),
          isNull(workItemQueue.assignedTo)
        )
      );
    }

    const workItems = workQueueConditions.length > 0
      ? await db.select().from(workItemQueue).where(and(...workQueueConditions))
      : await db.select().from(workItemQueue);

    // Calculate stats
    const stats = {
      total: workItems.length,
      onTrack: workItems.filter(i => i.slaStatus === 'on_track').length,
      atRisk: workItems.filter(i => i.slaStatus === 'at_risk' || i.slaStatus === 'warning').length,
      breached: workItems.filter(i => i.slaStatus === 'breached').length,
      unassigned: workItems.filter(i => !i.assignedTo).length
    };

    // Get by service type
    const byServiceType: Record<string, { total: number; atRisk: number; breached: number }> = {};
    workItems.forEach(item => {
      const key = item.serviceKey || 'Unknown';
      if (!byServiceType[key]) {
        byServiceType[key] = { total: 0, atRisk: 0, breached: 0 };
      }
      byServiceType[key].total++;
      if (item.slaStatus === 'at_risk' || item.slaStatus === 'warning') byServiceType[key].atRisk++;
      if (item.slaStatus === 'breached') byServiceType[key].breached++;
    });

    // Get urgent items
    const urgentItems = workItems
      .filter(i => i.slaStatus === 'breached' || i.slaStatus === 'warning')
      .sort((a, b) => (a.slaHoursRemaining || 0) - (b.slaHoursRemaining || 0))
      .slice(0, 10);

    // Get tasks
    const tasks = await db.select()
      .from(taskItems)
      .where(
        and(
          isLead ? sql`1=1` : eq(taskItems.assignedTo, userContext.userId),
          ne(taskItems.status, 'completed')
        )
      )
      .orderBy(taskItems.priority)
      .limit(20);

    return {
      stats,
      byServiceType,
      urgentItems,
      tasks,
      workItems: workItems.slice(0, 50),
      isLead
    };
  }

  // QC-specific methods
  async getQCDashboard(userContext: UserContext) {
    if (!['qc_reviewer', 'admin', 'super_admin'].includes(userContext.role)) {
      throw new Error('Invalid user context for QC dashboard');
    }

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

    // Calculate metrics
    const allReviews = await db.select().from(qualityReviews);
    const qualityMetrics = {
      totalReviews: allReviews.length,
      approved: allReviews.filter(r => r.status === 'approved').length,
      rejected: allReviews.filter(r => r.status === 'rejected').length,
      averageScore: allReviews.length > 0
        ? Math.round(allReviews.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / allReviews.length * 10) / 10
        : 0,
      passRate: allReviews.length > 0
        ? Math.round((allReviews.filter(r => r.status === 'approved').length / allReviews.length) * 100)
        : 0
    };

    return {
      pendingQC,
      recentReviews,
      qualityMetrics
    };
  }

  // FINANCE-specific methods
  async getFinanceDashboard(userContext: UserContext) {
    const permissions = this.getPermissions(userContext.role);
    if (!permissions.canViewFinancials) {
      throw new Error('No permission to view financials');
    }

    // Get all payments
    const allPayments = await db.select().from(payments);

    // Revenue metrics
    const revenueMetrics = {
      totalRevenue: allPayments.reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0),
      totalTransactions: allPayments.length,
      paid: allPayments.filter(p => p.status === 'paid' || p.status === 'completed').length,
      pending: allPayments.filter(p => p.status === 'pending').length
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

    return {
      metrics: revenueMetrics,
      byService: revenueByService,
      recentTransactions
    };
  }

  // ADMIN-specific methods
  async getAdminDashboard(userContext: UserContext) {
    const permissions = this.getPermissions(userContext.role);
    if (!permissions.canConfigureSystem) {
      throw new Error('No permission to access admin dashboard');
    }

    // Get all services
    const services = await this.getServiceCatalog({ isActive: undefined });

    // Get system stats
    const totalUsers = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const totalEntities = await db.select({ count: sql<number>`COUNT(*)` }).from(businessEntities);
    const totalRequests = await db.select({ count: sql<number>`COUNT(*)` }).from(serviceRequests);

    // Get recent escalations
    const recentEscalations = await db.select()
      .from(escalationExecutions)
      .orderBy(desc(escalationExecutions.triggeredAt))
      .limit(10);

    // Get SLA breaches
    const recentBreaches = await db.select()
      .from(slaBreachRecords)
      .where(eq(slaBreachRecords.remediationStatus, 'pending'))
      .orderBy(desc(slaBreachRecords.breachedAt))
      .limit(10);

    // Services by category
    const byCategory: Record<string, { count: number; active: number; requests: number }> = {};
    services.forEach(s => {
      const cat = s.category || 'Other';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, active: 0, requests: 0 };
      }
      byCategory[cat].count++;
      if (s.isActive) byCategory[cat].active++;
      byCategory[cat].requests += s.totalRequests;
    });

    return {
      services: {
        total: services.length,
        active: services.filter(s => s.isActive).length,
        byCategory
      },
      system: {
        totalUsers: Number(totalUsers[0]?.count) || 0,
        totalEntities: Number(totalEntities[0]?.count) || 0,
        totalRequests: Number(totalRequests[0]?.count) || 0
      },
      recentEscalations,
      recentBreaches
    };
  }

  // ==========================================================================
  // AUDIT LOGGING
  // ==========================================================================

  async logAccess(
    userContext: UserContext,
    resource: string,
    action: string,
    resourceId?: string,
    details?: any
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: userContext.userId,
        action: `${resource}:${action}`,
        entityType: resource,
        entityId: resourceId,
        oldValue: null,
        newValue: details ? JSON.stringify(details) : null,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const coreDataEngine = CoreDataEngine.getInstance();

// Helper function to create user context from request
export function createUserContext(user: any): UserContext {
  return {
    userId: user.id,
    role: (user.role || 'client').toLowerCase() as UserRole,
    entityId: user.entityId,
    teamId: user.teamId,
    permissions: user.permissions || []
  };
}

// Export types
export type { ServiceRequestView, DashboardStats, ServiceCatalogItem };
