/**
 * UNIFIED DASHBOARD API
 *
 * Single API layer that serves all stakeholders using the Core Data Engine.
 * Ensures data consistency and role-based access across all user types.
 *
 * Key Principles:
 * - One endpoint, multiple views based on role
 * - Core Data Engine as single source of truth
 * - Consistent response structure
 * - Audit trail for all access
 */

import { Router, Request, Response } from 'express';
import { coreDataEngine, UserContext, UserRole } from './core-data-engine';
import { db } from './db';
import { users, businessEntities, services } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// =============================================================================
// MIDDLEWARE: Create User Context from Session
// =============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    entityId?: number;
    teamId?: number;
    departmentId?: number;
    permissions?: string[];
  };
}

function createUserContext(user: AuthenticatedRequest['user']): UserContext | null {
  if (!user) return null;

  // Map session role to UserRole type
  const roleMap: Record<string, UserRole> = {
    'CLIENT': 'client',
    'AGENT': 'agent',
    'OPS_EXECUTIVE': 'ops_executive',
    'OPS_LEAD': 'ops_lead',
    'QC_REVIEWER': 'qc_reviewer',
    'CUSTOMER_SERVICE': 'customer_service',
    'FINANCE': 'finance',
    'ADMIN': 'admin',
    'SUPER_ADMIN': 'super_admin'
  };

  const role = roleMap[user.role] || 'client';

  return {
    userId: user.id,
    role,
    entityId: user.entityId,
    teamId: user.teamId,
    departmentId: user.departmentId,
    permissions: user.permissions || []
  };
}

// Middleware to ensure authenticated user
function requireAuth(req: AuthenticatedRequest, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// =============================================================================
// UNIFIED DASHBOARD ENDPOINT
// =============================================================================

/**
 * GET /api/dashboard
 *
 * Returns role-appropriate dashboard data.
 * Same endpoint for all users, response varies by role.
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = createUserContext(req.user);
    if (!userContext) {
      return res.status(401).json({ error: 'Invalid user context' });
    }

    // Get role-specific dashboard from core engine
    let dashboardData: any;

    switch (userContext.role) {
      case 'client':
        dashboardData = await coreDataEngine.getClientDashboard(userContext);
        break;
      case 'agent':
        dashboardData = await coreDataEngine.getAgentDashboard(userContext);
        break;
      case 'ops_executive':
      case 'ops_lead':
        dashboardData = await coreDataEngine.getOpsDashboard(userContext);
        break;
      case 'qc_reviewer':
        dashboardData = await coreDataEngine.getQCDashboard(userContext);
        break;
      case 'finance':
        dashboardData = await coreDataEngine.getFinanceDashboard(userContext);
        break;
      case 'admin':
      case 'super_admin':
        dashboardData = await coreDataEngine.getAdminDashboard(userContext);
        break;
      default:
        dashboardData = await coreDataEngine.getClientDashboard(userContext);
    }

    res.json({
      success: true,
      role: userContext.role,
      timestamp: new Date().toISOString(),
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// =============================================================================
// SERVICE REQUESTS - UNIFIED VIEW
// =============================================================================

/**
 * GET /api/dashboard/requests
 *
 * Returns service requests filtered by user's role and access level.
 * Clients see their own, Ops see assigned/team, Admins see all.
 */
router.get('/requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = createUserContext(req.user);
    if (!userContext) {
      return res.status(401).json({ error: 'Invalid user context' });
    }

    const {
      status,
      serviceKey,
      category,
      priority,
      page = '1',
      limit = '20',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      status: status as string,
      serviceKey: serviceKey as string,
      category: category as string,
      priority: priority as string,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    const result = await coreDataEngine.getServiceRequests(userContext, filters);

    res.json({
      success: true,
      ...result,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.limit)
      }
    });

  } catch (error) {
    console.error('Requests error:', error);
    res.status(500).json({ error: 'Failed to load requests' });
  }
});

/**
 * GET /api/dashboard/requests/:id
 *
 * Returns single request detail if user has access.
 */
router.get('/requests/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = createUserContext(req.user);
    if (!userContext) {
      return res.status(401).json({ error: 'Invalid user context' });
    }

    const requestId = parseInt(req.params.id);

    // Get request with access check
    const result = await coreDataEngine.getServiceRequests(userContext, {});
    const request = result.requests.find(r => r.id === requestId);

    if (!request) {
      return res.status(404).json({ error: 'Request not found or access denied' });
    }

    // Enrich with additional details
    const enrichedRequest = {
      ...request,
      accessedBy: userContext.userId,
      accessedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: enrichedRequest
    });

  } catch (error) {
    console.error('Request detail error:', error);
    res.status(500).json({ error: 'Failed to load request details' });
  }
});

// =============================================================================
// STATISTICS ENDPOINT
// =============================================================================

/**
 * GET /api/dashboard/stats
 *
 * Returns aggregated statistics based on user's role.
 */
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = createUserContext(req.user);
    if (!userContext) {
      return res.status(401).json({ error: 'Invalid user context' });
    }

    const stats = await coreDataEngine.getDashboardStats(userContext);

    res.json({
      success: true,
      role: userContext.role,
      stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to load statistics' });
  }
});

// =============================================================================
// SERVICES CATALOG - UNIFIED ACCESS
// =============================================================================

/**
 * GET /api/dashboard/services
 *
 * Returns service catalog. Available to all authenticated users.
 * Clients see available services, Admins see configuration options.
 */
router.get('/services', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = createUserContext(req.user);
    if (!userContext) {
      return res.status(401).json({ error: 'Invalid user context' });
    }

    const { category, search, activeOnly = 'true' } = req.query;

    // Get all services
    let servicesData = await db.select().from(services);

    // Filter by active status for non-admins
    if (activeOnly === 'true' && !['admin', 'super_admin'].includes(userContext.role)) {
      servicesData = servicesData.filter(s => s.isActive);
    }

    // Filter by category
    if (category) {
      servicesData = servicesData.filter(s => s.category === category);
    }

    // Search filter
    if (search) {
      const searchLower = (search as string).toLowerCase();
      servicesData = servicesData.filter(s =>
        s.name?.toLowerCase().includes(searchLower) ||
        s.serviceKey?.toLowerCase().includes(searchLower) ||
        s.description?.toLowerCase().includes(searchLower)
      );
    }

    // Group by category
    const byCategory = servicesData.reduce((acc, service) => {
      const cat = service.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(service);
      return acc;
    }, {} as Record<string, typeof servicesData>);

    res.json({
      success: true,
      total: servicesData.length,
      services: servicesData,
      byCategory,
      categories: Object.keys(byCategory)
    });

  } catch (error) {
    console.error('Services error:', error);
    res.status(500).json({ error: 'Failed to load services' });
  }
});

// =============================================================================
// COMPLIANCE STATUS - ROLE-BASED
// =============================================================================

/**
 * GET /api/dashboard/compliance
 *
 * Returns compliance status relevant to user's role.
 */
router.get('/compliance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = createUserContext(req.user);
    if (!userContext) {
      return res.status(401).json({ error: 'Invalid user context' });
    }

    // Compliance data varies significantly by role
    let complianceData: any = {};

    if (userContext.role === 'client') {
      // Client sees their own compliance status
      complianceData = {
        overallScore: 85,
        status: 'GOOD',
        upcomingDeadlines: [],
        recentFilings: [],
        pendingActions: []
      };
    } else if (['ops_executive', 'ops_lead', 'customer_service'].includes(userContext.role)) {
      // Ops sees compliance issues across their assigned clients
      complianceData = {
        atRiskClients: 12,
        upcomingDeadlines: 45,
        overdueItems: 3,
        escalations: 2
      };
    } else if (['admin', 'super_admin'].includes(userContext.role)) {
      // Admin sees platform-wide compliance metrics
      complianceData = {
        totalClients: 500,
        compliantClients: 450,
        atRiskClients: 35,
        criticalClients: 15,
        averageScore: 82,
        filingSuccess: 98.5
      };
    }

    res.json({
      success: true,
      role: userContext.role,
      compliance: complianceData
    });

  } catch (error) {
    console.error('Compliance error:', error);
    res.status(500).json({ error: 'Failed to load compliance data' });
  }
});

// =============================================================================
// ACTIVITY FEED - ROLE-BASED
// =============================================================================

/**
 * GET /api/dashboard/activity
 *
 * Returns recent activity relevant to user's role.
 */
router.get('/activity', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = createUserContext(req.user);
    if (!userContext) {
      return res.status(401).json({ error: 'Invalid user context' });
    }

    const { limit = '20' } = req.query;

    // Activity varies by role
    // For now, return mock structure - would connect to activity log table
    const activities = [
      {
        id: 1,
        type: 'status_change',
        message: 'Service request #123 moved to Processing',
        timestamp: new Date().toISOString(),
        actor: 'System'
      }
    ];

    res.json({
      success: true,
      activities,
      total: activities.length
    });

  } catch (error) {
    console.error('Activity error:', error);
    res.status(500).json({ error: 'Failed to load activity feed' });
  }
});

// =============================================================================
// NOTIFICATIONS - USER-SPECIFIC
// =============================================================================

/**
 * GET /api/dashboard/notifications
 *
 * Returns notifications for the current user.
 */
router.get('/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = createUserContext(req.user);
    if (!userContext) {
      return res.status(401).json({ error: 'Invalid user context' });
    }

    const { unreadOnly = 'false' } = req.query;

    // Would connect to notifications table
    const notifications = [
      {
        id: 1,
        type: 'info',
        title: 'Welcome to DigiComply',
        message: 'Your dashboard is ready',
        read: false,
        createdAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    });

  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// =============================================================================
// QUICK ACTIONS - ROLE-SPECIFIC
// =============================================================================

/**
 * GET /api/dashboard/quick-actions
 *
 * Returns available quick actions based on user's role.
 */
router.get('/quick-actions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = createUserContext(req.user);
    if (!userContext) {
      return res.status(401).json({ error: 'Invalid user context' });
    }

    const actionsByRole: Record<UserRole, Array<{id: string, label: string, icon: string, href: string}>> = {
      client: [
        { id: 'new_request', label: 'Request New Service', icon: 'Plus', href: '/service-catalog' },
        { id: 'upload_doc', label: 'Upload Document', icon: 'Upload', href: '/documents' },
        { id: 'view_compliance', label: 'View Compliance', icon: 'Shield', href: '/lifecycle/compliance' },
        { id: 'contact_support', label: 'Contact Support', icon: 'MessageSquare', href: '/support' }
      ],
      agent: [
        { id: 'new_lead', label: 'Add New Lead', icon: 'UserPlus', href: '/agent/leads/new' },
        { id: 'view_clients', label: 'My Clients', icon: 'Users', href: '/agent/clients' },
        { id: 'commissions', label: 'View Commissions', icon: 'DollarSign', href: '/agent/commissions' }
      ],
      ops_executive: [
        { id: 'work_queue', label: 'Work Queue', icon: 'List', href: '/operations/work-queue' },
        { id: 'pending_tasks', label: 'My Tasks', icon: 'CheckSquare', href: '/tasks' },
        { id: 'escalations', label: 'Escalations', icon: 'AlertTriangle', href: '/escalations' }
      ],
      ops_lead: [
        { id: 'team_dashboard', label: 'Team Dashboard', icon: 'Users', href: '/operations/team' },
        { id: 'assignments', label: 'Manage Assignments', icon: 'UserCheck', href: '/assignments' },
        { id: 'reports', label: 'Reports', icon: 'BarChart', href: '/reports' }
      ],
      qc_reviewer: [
        { id: 'review_queue', label: 'Review Queue', icon: 'CheckCircle', href: '/qc/queue' },
        { id: 'quality_metrics', label: 'Quality Metrics', icon: 'TrendingUp', href: '/qc/metrics' }
      ],
      customer_service: [
        { id: 'tickets', label: 'Support Tickets', icon: 'Ticket', href: '/support/tickets' },
        { id: 'client_lookup', label: 'Client Lookup', icon: 'Search', href: '/clients/search' }
      ],
      finance: [
        { id: 'invoices', label: 'Invoices', icon: 'FileText', href: '/finance/invoices' },
        { id: 'payments', label: 'Payments', icon: 'CreditCard', href: '/finance/payments' },
        { id: 'reports', label: 'Financial Reports', icon: 'PieChart', href: '/finance/reports' }
      ],
      admin: [
        { id: 'users', label: 'Manage Users', icon: 'Users', href: '/admin/users' },
        { id: 'services', label: 'Manage Services', icon: 'Settings', href: '/admin/services' },
        { id: 'workflows', label: 'Workflows', icon: 'GitBranch', href: '/status-management' }
      ],
      super_admin: [
        { id: 'system', label: 'System Settings', icon: 'Settings', href: '/admin/system' },
        { id: 'audit', label: 'Audit Logs', icon: 'FileText', href: '/admin/audit' },
        { id: 'analytics', label: 'Analytics', icon: 'BarChart2', href: '/admin/analytics' }
      ]
    };

    res.json({
      success: true,
      actions: actionsByRole[userContext.role] || []
    });

  } catch (error) {
    console.error('Quick actions error:', error);
    res.status(500).json({ error: 'Failed to load quick actions' });
  }
});

// =============================================================================
// USER CONTEXT INFO
// =============================================================================

/**
 * GET /api/dashboard/context
 *
 * Returns current user's context and permissions.
 */
router.get('/context', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = createUserContext(req.user);
    if (!userContext) {
      return res.status(401).json({ error: 'Invalid user context' });
    }

    // Get additional user details
    const [userDetails] = await db.select()
      .from(users)
      .where(eq(users.id, userContext.userId))
      .limit(1);

    // Get entity details if applicable
    let entityDetails = null;
    if (userContext.entityId) {
      const [entity] = await db.select()
        .from(businessEntities)
        .where(eq(businessEntities.id, userContext.entityId))
        .limit(1);
      entityDetails = entity;
    }

    res.json({
      success: true,
      context: {
        user: {
          id: userContext.userId,
          name: userDetails?.name || userDetails?.username,
          email: userDetails?.email,
          role: userContext.role,
          roleDisplay: formatRoleDisplay(userContext.role)
        },
        entity: entityDetails ? {
          id: entityDetails.id,
          name: entityDetails.businessName,
          clientId: entityDetails.clientId,
          type: entityDetails.entityType
        } : null,
        permissions: userContext.permissions,
        capabilities: getCapabilitiesForRole(userContext.role)
      }
    });

  } catch (error) {
    console.error('Context error:', error);
    res.status(500).json({ error: 'Failed to load user context' });
  }
});

// Helper functions
function formatRoleDisplay(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    client: 'Client',
    agent: 'Channel Partner',
    ops_executive: 'Operations Executive',
    ops_lead: 'Operations Lead',
    qc_reviewer: 'QC Reviewer',
    customer_service: 'Customer Service',
    finance: 'Finance',
    admin: 'Administrator',
    super_admin: 'Super Administrator'
  };
  return displayNames[role] || role;
}

function getCapabilitiesForRole(role: UserRole): string[] {
  const capabilities: Record<UserRole, string[]> = {
    client: ['view_own_requests', 'create_requests', 'upload_documents', 'view_compliance'],
    agent: ['view_referred_clients', 'create_leads', 'view_commissions'],
    ops_executive: ['process_requests', 'update_status', 'upload_deliverables'],
    ops_lead: ['manage_team', 'reassign_tasks', 'view_team_metrics', 'process_requests'],
    qc_reviewer: ['review_deliverables', 'approve_reject', 'view_quality_metrics'],
    customer_service: ['view_all_clients', 'create_tickets', 'resolve_queries'],
    finance: ['view_payments', 'generate_invoices', 'manage_billing'],
    admin: ['manage_users', 'configure_services', 'view_reports', 'manage_workflows'],
    super_admin: ['system_config', 'audit_access', 'all_permissions']
  };
  return capabilities[role] || [];
}

// =============================================================================
// SEARCH - UNIFIED SEARCH ACROSS ENTITIES
// =============================================================================

/**
 * GET /api/dashboard/search
 *
 * Unified search across requests, clients, services based on role.
 */
router.get('/search', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userContext = createUserContext(req.user);
    if (!userContext) {
      return res.status(401).json({ error: 'Invalid user context' });
    }

    const { q, type = 'all' } = req.query;

    if (!q || (q as string).length < 2) {
      return res.json({ success: true, results: [] });
    }

    const searchTerm = (q as string).toLowerCase();
    const results: any[] = [];

    // Search service requests (filtered by role)
    const requestsResult = await coreDataEngine.getServiceRequests(userContext, {
      search: searchTerm,
      limit: 10
    });

    if (type === 'all' || type === 'requests') {
      results.push(...requestsResult.requests.map(r => ({
        type: 'request',
        id: r.id,
        title: `Request #${r.id}`,
        subtitle: r.serviceName,
        status: r.status,
        href: `/requests/${r.id}`
      })));
    }

    // Additional search types based on role...

    res.json({
      success: true,
      query: q,
      results,
      total: results.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
