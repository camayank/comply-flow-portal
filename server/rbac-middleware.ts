import { Request, Response, NextFunction } from 'express';

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPS_MANAGER: 'ops_manager',
  OPS_EXECUTIVE: 'ops_executive',
  CUSTOMER_SERVICE: 'customer_service',
  QC_EXECUTIVE: 'qc_executive',
  ACCOUNTANT: 'accountant',
  AGENT: 'agent',
  CLIENT: 'client',
} as const;

// Roles that only Super Admin can manage
export const ADMIN_ROLES = ['super_admin', 'admin'] as const;

// Roles that Admin can manage (delegated)
export const DELEGATED_ROLES = ['ops_manager', 'ops_executive', 'customer_service', 'qc_executive', 'accountant', 'agent', 'client'] as const;

/**
 * Role Hierarchy for Authorization
 *
 * ⚠️ SINGLE SOURCE OF TRUTH - DO NOT DUPLICATE
 *
 * This is the authoritative role hierarchy used for permission checking.
 * Higher numbers = more permissions.
 *
 * Previously duplicated in shared/schema.ts with different values (10-100),
 * which created a security vulnerability. That duplicate has been removed.
 *
 * Used by: requireMinimumRole() middleware for authorization checks
 */
export const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN]: 100,      // Full system access - ONLY manages admins, system config
  [USER_ROLES.ADMIN]: 90,             // Administrative access - manages all non-admin users
  [USER_ROLES.OPS_MANAGER]: 80,       // Operations manager
  [USER_ROLES.OPS_EXECUTIVE]: 70,     // Operations team
  [USER_ROLES.CUSTOMER_SERVICE]: 60,  // Customer support
  [USER_ROLES.QC_EXECUTIVE]: 55,      // Quality control
  [USER_ROLES.ACCOUNTANT]: 50,        // Finance team
  [USER_ROLES.AGENT]: 40,             // External partners
  [USER_ROLES.CLIENT]: 10,            // End users
} as const;

export const PERMISSIONS = {
  // User management - granular permissions
  USER_MANAGEMENT: {
    CREATE: 'user:create',           // Create non-admin users (Admin+)
    READ: 'user:read',               // View users
    UPDATE: 'user:update',           // Update non-admin users (Admin+)
    DELETE: 'user:delete',           // Delete non-admin users (Admin+)
    CREATE_ADMIN: 'user:create_admin',   // Create admin users (Super Admin only)
    UPDATE_ADMIN: 'user:update_admin',   // Update admin users (Super Admin only)
    DELETE_ADMIN: 'user:delete_admin',   // Delete admin users (Super Admin only)
    RESET_PASSWORD: 'user:reset_password', // Reset passwords (Admin+)
  },
  CLIENT_MANAGEMENT: {
    CREATE: 'client:create',
    READ: 'client:read',
    UPDATE: 'client:update',
    DELETE: 'client:delete',
  },
  // Client self-service permissions (what clients can do with their own data)
  CLIENT_SELF_SERVICE: {
    VIEW_DASHBOARD: 'self:dashboard',         // View own compliance dashboard
    VIEW_DOCUMENTS: 'self:documents:view',    // View own documents
    UPLOAD_DOCUMENTS: 'self:documents:upload', // Upload documents
    VIEW_SERVICES: 'self:services:view',      // View available services
    REQUEST_SERVICES: 'self:services:request', // Request new services
    VIEW_COMPLIANCE: 'self:compliance:view',  // View own compliance status
    COMPLETE_ACTIONS: 'self:actions:complete', // Complete compliance actions
    VIEW_PAYMENTS: 'self:payments:view',      // View own payment history
    MAKE_PAYMENTS: 'self:payments:make',      // Make payments
    VIEW_PROFILE: 'self:profile:view',        // View own profile
    UPDATE_PROFILE: 'self:profile:update',    // Update own profile
  },
  SERVICE_MANAGEMENT: {
    CREATE: 'service:create',
    READ: 'service:read',
    UPDATE: 'service:update',
    DELETE: 'service:delete',
    ASSIGN: 'service:assign',
    COMPLETE: 'service:complete',
  },
  OPERATIONS: {
    ASSIGN_TASKS: 'ops:assign',
    QC_REVIEW: 'ops:qc',
    DELIVERY: 'ops:delivery',
    MANAGE_TEAM: 'ops:manage_team',  // Manage ops team (Admin+)
  },
  ANALYTICS: {
    VIEW: 'analytics:view',
    EXPORT: 'analytics:export',
  },
  FINANCIAL: {
    VIEW: 'financial:view',          // View financial data
    MANAGE: 'financial:manage',      // Manage invoices, payments
    CONFIG: 'financial:config',      // Configure pricing (Super Admin only)
  },
  SYSTEM_CONFIG: {
    VIEW: 'config:view',
    EDIT: 'config:edit',             // Super Admin only
  },
  WORKFLOW: {
    VIEW: 'workflow:view',
    EDIT: 'workflow:edit',
  },
  AUDIT: {
    VIEW: 'audit:view',              // View audit logs (Admin+)
    EXPORT: 'audit:export',          // Export audit logs (Super Admin only)
  },
  INTEGRATIONS: {
    VIEW: 'integrations:view',
    MANAGE: 'integrations:manage',   // Super Admin only
  },
} as const;

// Flatten permissions for easier use
export const FLAT_PERMISSIONS = {
  // User Management
  USER_MANAGEMENT_CREATE: PERMISSIONS.USER_MANAGEMENT.CREATE,
  USER_MANAGEMENT_READ: PERMISSIONS.USER_MANAGEMENT.READ,
  USER_MANAGEMENT_UPDATE: PERMISSIONS.USER_MANAGEMENT.UPDATE,
  USER_MANAGEMENT_DELETE: PERMISSIONS.USER_MANAGEMENT.DELETE,
  USER_MANAGEMENT_CREATE_ADMIN: PERMISSIONS.USER_MANAGEMENT.CREATE_ADMIN,
  USER_MANAGEMENT_UPDATE_ADMIN: PERMISSIONS.USER_MANAGEMENT.UPDATE_ADMIN,
  USER_MANAGEMENT_DELETE_ADMIN: PERMISSIONS.USER_MANAGEMENT.DELETE_ADMIN,
  USER_MANAGEMENT_RESET_PASSWORD: PERMISSIONS.USER_MANAGEMENT.RESET_PASSWORD,
  // Client Management
  CLIENT_MANAGEMENT_CREATE: PERMISSIONS.CLIENT_MANAGEMENT.CREATE,
  CLIENT_MANAGEMENT_READ: PERMISSIONS.CLIENT_MANAGEMENT.READ,
  CLIENT_MANAGEMENT_UPDATE: PERMISSIONS.CLIENT_MANAGEMENT.UPDATE,
  CLIENT_MANAGEMENT_DELETE: PERMISSIONS.CLIENT_MANAGEMENT.DELETE,
  // Service Management
  SERVICE_MANAGEMENT_CREATE: PERMISSIONS.SERVICE_MANAGEMENT.CREATE,
  SERVICE_MANAGEMENT_READ: PERMISSIONS.SERVICE_MANAGEMENT.READ,
  SERVICE_MANAGEMENT_UPDATE: PERMISSIONS.SERVICE_MANAGEMENT.UPDATE,
  SERVICE_MANAGEMENT_DELETE: PERMISSIONS.SERVICE_MANAGEMENT.DELETE,
  SERVICE_MANAGEMENT_ASSIGN: PERMISSIONS.SERVICE_MANAGEMENT.ASSIGN,
  SERVICE_MANAGEMENT_COMPLETE: PERMISSIONS.SERVICE_MANAGEMENT.COMPLETE,
  // Operations
  OPS_ASSIGN_TASK: PERMISSIONS.OPERATIONS.ASSIGN_TASKS,
  OPS_QC_REVIEW: PERMISSIONS.OPERATIONS.QC_REVIEW,
  OPS_DELIVERY: PERMISSIONS.OPERATIONS.DELIVERY,
  OPS_MANAGE_TEAM: PERMISSIONS.OPERATIONS.MANAGE_TEAM,
  // Analytics
  ANALYTICS_VIEW: PERMISSIONS.ANALYTICS.VIEW,
  ANALYTICS_EXPORT: PERMISSIONS.ANALYTICS.EXPORT,
  // Financial
  FINANCIAL_VIEW: PERMISSIONS.FINANCIAL.VIEW,
  FINANCIAL_MANAGE: PERMISSIONS.FINANCIAL.MANAGE,
  FINANCIAL_CONFIG: PERMISSIONS.FINANCIAL.CONFIG,
  // System Config
  SYSTEM_CONFIG_VIEW: PERMISSIONS.SYSTEM_CONFIG.VIEW,
  SYSTEM_CONFIG_EDIT: PERMISSIONS.SYSTEM_CONFIG.EDIT,
  // Workflow
  WORKFLOW_VIEW: PERMISSIONS.WORKFLOW.VIEW,
  WORKFLOW_EDIT: PERMISSIONS.WORKFLOW.EDIT,
  // Audit
  AUDIT_VIEW: PERMISSIONS.AUDIT.VIEW,
  AUDIT_EXPORT: PERMISSIONS.AUDIT.EXPORT,
  // Integrations
  INTEGRATIONS_VIEW: PERMISSIONS.INTEGRATIONS.VIEW,
  INTEGRATIONS_MANAGE: PERMISSIONS.INTEGRATIONS.MANAGE,
} as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  // SUPER ADMIN - Full system access including admin user management and system config
  [USER_ROLES.SUPER_ADMIN]: [
    // All user management including admin users
    ...Object.values(PERMISSIONS.USER_MANAGEMENT),
    // All client management
    ...Object.values(PERMISSIONS.CLIENT_MANAGEMENT),
    // All service management
    ...Object.values(PERMISSIONS.SERVICE_MANAGEMENT),
    // All operations
    ...Object.values(PERMISSIONS.OPERATIONS),
    // All analytics
    ...Object.values(PERMISSIONS.ANALYTICS),
    // All financial including config
    ...Object.values(PERMISSIONS.FINANCIAL),
    // All system config
    ...Object.values(PERMISSIONS.SYSTEM_CONFIG),
    // All workflow
    ...Object.values(PERMISSIONS.WORKFLOW),
    // All audit including export
    ...Object.values(PERMISSIONS.AUDIT),
    // All integrations
    ...Object.values(PERMISSIONS.INTEGRATIONS),
  ],

  // ADMIN - Can manage non-admin users, services, workflows, view audit logs
  [USER_ROLES.ADMIN]: [
    // User management for non-admin users only
    PERMISSIONS.USER_MANAGEMENT.CREATE,
    PERMISSIONS.USER_MANAGEMENT.READ,
    PERMISSIONS.USER_MANAGEMENT.UPDATE,
    PERMISSIONS.USER_MANAGEMENT.DELETE,
    PERMISSIONS.USER_MANAGEMENT.RESET_PASSWORD,
    // All client management
    ...Object.values(PERMISSIONS.CLIENT_MANAGEMENT),
    // All service management
    ...Object.values(PERMISSIONS.SERVICE_MANAGEMENT),
    // All operations including team management
    ...Object.values(PERMISSIONS.OPERATIONS),
    // All analytics
    ...Object.values(PERMISSIONS.ANALYTICS),
    // Financial view and manage (not config)
    PERMISSIONS.FINANCIAL.VIEW,
    PERMISSIONS.FINANCIAL.MANAGE,
    // System config view only
    PERMISSIONS.SYSTEM_CONFIG.VIEW,
    // All workflow
    ...Object.values(PERMISSIONS.WORKFLOW),
    // Audit view only (not export)
    PERMISSIONS.AUDIT.VIEW,
    // Integrations view only
    PERMISSIONS.INTEGRATIONS.VIEW,
  ],

  // OPS MANAGER - Team management, service assignment, QC oversight
  [USER_ROLES.OPS_MANAGER]: [
    PERMISSIONS.USER_MANAGEMENT.READ,
    ...Object.values(PERMISSIONS.CLIENT_MANAGEMENT),
    ...Object.values(PERMISSIONS.SERVICE_MANAGEMENT),
    ...Object.values(PERMISSIONS.OPERATIONS),
    PERMISSIONS.ANALYTICS.VIEW,
    PERMISSIONS.FINANCIAL.VIEW,
    PERMISSIONS.WORKFLOW.VIEW,
  ],

  // OPS EXECUTIVE - Service execution, task management
  [USER_ROLES.OPS_EXECUTIVE]: [
    PERMISSIONS.CLIENT_MANAGEMENT.READ,
    PERMISSIONS.CLIENT_MANAGEMENT.UPDATE,
    PERMISSIONS.SERVICE_MANAGEMENT.READ,
    PERMISSIONS.SERVICE_MANAGEMENT.ASSIGN,
    PERMISSIONS.SERVICE_MANAGEMENT.COMPLETE,
    PERMISSIONS.OPERATIONS.ASSIGN_TASKS,
    PERMISSIONS.OPERATIONS.QC_REVIEW,
    PERMISSIONS.ANALYTICS.VIEW,
  ],

  // CUSTOMER SERVICE - Client support, service requests
  [USER_ROLES.CUSTOMER_SERVICE]: [
    PERMISSIONS.CLIENT_MANAGEMENT.READ,
    PERMISSIONS.CLIENT_MANAGEMENT.UPDATE,
    PERMISSIONS.SERVICE_MANAGEMENT.READ,
    PERMISSIONS.SERVICE_MANAGEMENT.CREATE,
    PERMISSIONS.ANALYTICS.VIEW,
  ],

  // QC EXECUTIVE - Quality control, delivery approval
  [USER_ROLES.QC_EXECUTIVE]: [
    PERMISSIONS.CLIENT_MANAGEMENT.READ,
    PERMISSIONS.SERVICE_MANAGEMENT.READ,
    PERMISSIONS.OPERATIONS.QC_REVIEW,
    PERMISSIONS.OPERATIONS.DELIVERY,
    PERMISSIONS.ANALYTICS.VIEW,
  ],

  // ACCOUNTANT - Financial management
  [USER_ROLES.ACCOUNTANT]: [
    PERMISSIONS.CLIENT_MANAGEMENT.READ,
    PERMISSIONS.SERVICE_MANAGEMENT.READ,
    PERMISSIONS.FINANCIAL.VIEW,
    PERMISSIONS.FINANCIAL.MANAGE,
    PERMISSIONS.ANALYTICS.VIEW,
    PERMISSIONS.ANALYTICS.EXPORT,
  ],

  // AGENT - Lead management, referrals (can only see their own leads/commissions)
  [USER_ROLES.AGENT]: [
    PERMISSIONS.CLIENT_MANAGEMENT.READ,
    PERMISSIONS.SERVICE_MANAGEMENT.READ,
    // Agent-specific permissions (all scoped to their own data)
    'agent:leads:read',           // View own leads
    'agent:leads:create',         // Create new leads
    'agent:leads:update',         // Update own leads
    'agent:commissions:read',     // View own commissions
    'agent:performance:read',     // View own performance
    'agent:leaderboard:read',     // View leaderboard
    'agent:announcements:read',   // View announcements
  ],

  // CLIENT - Self-service access (can only access their own data)
  [USER_ROLES.CLIENT]: [
    PERMISSIONS.SERVICE_MANAGEMENT.READ,
    // Self-service permissions - client can only access their OWN data
    PERMISSIONS.CLIENT_SELF_SERVICE.VIEW_DASHBOARD,
    PERMISSIONS.CLIENT_SELF_SERVICE.VIEW_DOCUMENTS,
    PERMISSIONS.CLIENT_SELF_SERVICE.UPLOAD_DOCUMENTS,
    PERMISSIONS.CLIENT_SELF_SERVICE.VIEW_SERVICES,
    PERMISSIONS.CLIENT_SELF_SERVICE.REQUEST_SERVICES,
    PERMISSIONS.CLIENT_SELF_SERVICE.VIEW_COMPLIANCE,
    PERMISSIONS.CLIENT_SELF_SERVICE.COMPLETE_ACTIONS,
    PERMISSIONS.CLIENT_SELF_SERVICE.VIEW_PAYMENTS,
    PERMISSIONS.CLIENT_SELF_SERVICE.MAKE_PAYMENTS,
    PERMISSIONS.CLIENT_SELF_SERVICE.VIEW_PROFILE,
    PERMISSIONS.CLIENT_SELF_SERVICE.UPDATE_PROFILE,
  ],
};

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isActive) {
    return res.status(403).json({ error: 'Account is inactive' });
  }

  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
}

export function requireMinimumRole(minimumRole: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role as keyof typeof ROLE_HIERARCHY] || 0;
    const minimumRoleLevel = ROLE_HIERARCHY[minimumRole as keyof typeof ROLE_HIERARCHY] || 0;

    if (userRoleLevel < minimumRoleLevel) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: minimumRole,
        current: req.user.role,
      });
    }

    next();
  };
}

export function requirePermission(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Missing required permissions',
        required: requiredPermissions,
      });
    }

    next();
  };
}

export function requireAllPermissions(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const hasAllPermissions = requiredPermissions.every(perm => userPermissions.includes(perm));

    if (!hasAllPermissions) {
      return res.status(403).json({ 
        error: 'Missing required permissions',
        required: requiredPermissions,
      });
    }

    next();
  };
}

// Session-based authentication middleware
export async function sessionAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Get session token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.replace('Bearer ', '') || req.cookies?.sessionToken;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Import db and userSessions here to avoid circular dependencies
    const { db } = await import('./db');
    const { users, userSessions } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    // Verify session
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken))
      .limit(1);

    if (!session || !session.isActive) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    if (session.expiresAt < new Date()) {
      await db
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.id, session.id));
      
      return res.status(401).json({ error: 'Session expired' });
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    console.error('Session authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

export function hasPermission(role: string, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
}

export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a user can manage another user based on role hierarchy
 * - Super Admin can manage everyone
 * - Admin can only manage non-admin users (delegated roles)
 * - Others cannot manage users
 */
export function canManageUser(managerRole: string, targetRole: string): boolean {
  // Super Admin can manage everyone
  if (managerRole === USER_ROLES.SUPER_ADMIN) {
    return true;
  }

  // Admin can only manage non-admin roles (delegated)
  if (managerRole === USER_ROLES.ADMIN) {
    return DELEGATED_ROLES.includes(targetRole as any);
  }

  // Other roles cannot manage users
  return false;
}

/**
 * Check if a role is an admin role (super_admin or admin)
 */
export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as any);
}

/**
 * Get roles that a user can create/manage based on their role
 */
export function getManageableRoles(managerRole: string): string[] {
  if (managerRole === USER_ROLES.SUPER_ADMIN) {
    return [...ADMIN_ROLES, ...DELEGATED_ROLES];
  }
  if (managerRole === USER_ROLES.ADMIN) {
    return [...DELEGATED_ROLES];
  }
  return [];
}

/**
 * Get role level for hierarchy comparison
 */
export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] || 0;
}
