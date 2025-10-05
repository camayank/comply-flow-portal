import { Request, Response, NextFunction } from 'express';

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPS_EXECUTIVE: 'ops_executive',
  CUSTOMER_SERVICE: 'customer_service',
  AGENT: 'agent',
  CLIENT: 'client',
} as const;

export const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN]: 6,
  [USER_ROLES.ADMIN]: 5,
  [USER_ROLES.OPS_EXECUTIVE]: 4,
  [USER_ROLES.CUSTOMER_SERVICE]: 3,
  [USER_ROLES.AGENT]: 2,
  [USER_ROLES.CLIENT]: 1,
} as const;

export const PERMISSIONS = {
  USER_MANAGEMENT: {
    CREATE: 'user:create',
    READ: 'user:read',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
  },
  CLIENT_MANAGEMENT: {
    CREATE: 'client:create',
    READ: 'client:read',
    UPDATE: 'client:update',
    DELETE: 'client:delete',
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
  },
  ANALYTICS: {
    VIEW: 'analytics:view',
    EXPORT: 'analytics:export',
  },
  SYSTEM_CONFIG: {
    VIEW: 'config:view',
    EDIT: 'config:edit',
  },
  WORKFLOW: {
    VIEW: 'workflow:view',
    EDIT: 'workflow:edit',
  },
} as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [USER_ROLES.SUPER_ADMIN]: [
    ...Object.values(PERMISSIONS.USER_MANAGEMENT),
    ...Object.values(PERMISSIONS.CLIENT_MANAGEMENT),
    ...Object.values(PERMISSIONS.SERVICE_MANAGEMENT),
    ...Object.values(PERMISSIONS.OPERATIONS),
    ...Object.values(PERMISSIONS.ANALYTICS),
    ...Object.values(PERMISSIONS.SYSTEM_CONFIG),
    ...Object.values(PERMISSIONS.WORKFLOW),
  ],
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.USER_MANAGEMENT.READ,
    ...Object.values(PERMISSIONS.CLIENT_MANAGEMENT),
    ...Object.values(PERMISSIONS.SERVICE_MANAGEMENT),
    ...Object.values(PERMISSIONS.OPERATIONS),
    ...Object.values(PERMISSIONS.ANALYTICS),
    PERMISSIONS.SYSTEM_CONFIG.VIEW,
    ...Object.values(PERMISSIONS.WORKFLOW),
  ],
  [USER_ROLES.OPS_EXECUTIVE]: [
    ...Object.values(PERMISSIONS.SERVICE_MANAGEMENT),
    ...Object.values(PERMISSIONS.OPERATIONS),
    PERMISSIONS.CLIENT_MANAGEMENT.READ,
    PERMISSIONS.ANALYTICS.VIEW,
  ],
  [USER_ROLES.CUSTOMER_SERVICE]: [
    PERMISSIONS.CLIENT_MANAGEMENT.READ,
    PERMISSIONS.CLIENT_MANAGEMENT.UPDATE,
    PERMISSIONS.SERVICE_MANAGEMENT.READ,
    PERMISSIONS.SERVICE_MANAGEMENT.CREATE,
  ],
  [USER_ROLES.AGENT]: [
    PERMISSIONS.CLIENT_MANAGEMENT.READ,
    PERMISSIONS.SERVICE_MANAGEMENT.READ,
  ],
  [USER_ROLES.CLIENT]: [
    PERMISSIONS.SERVICE_MANAGEMENT.READ,
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
