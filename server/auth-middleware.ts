import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db';
import { users, userSessions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        fullName: string | null;
        role: string;
        department: string | null;
        isActive: boolean;
      };
      sessionId?: string;
    }
  }
}

/**
 * Session-based authentication middleware
 * Validates sessionToken from cookie and attaches user to req.user
 *
 * Usage:
 * app.get('/api/protected', requireAuth, (req, res) => {
 *   // req.user is available here
 * });
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get session token from cookie
    const sessionToken = req.cookies?.sessionToken;

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
      });
    }

    // Find active session
    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.sessionToken, sessionToken),
          eq(userSessions.isActive, true)
        )
      )
      .limit(1);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please log in again.',
      });
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
      // Deactivate expired session
      await db
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.id, session.id));

      return res.status(401).json({
        success: false,
        error: 'Session expired. Please log in again.',
      });
    }

    // Validate session fingerprint to detect hijacking
    const userAgent = req.headers['user-agent'] || '';
    const ipSubnet = (req.ip || '').split('.').slice(0, 3).join('.');
    const fingerprint = crypto
      .createHash('sha256')
      .update(userAgent)
      .update(ipSubnet)
      .digest('hex');

    if (session.fingerprint && session.fingerprint !== fingerprint) {
      await db
        .update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.id, session.id));

      return res.status(401).json({
        success: false,
        error: 'Session validation failed. Please log in again.',
      });
    }

    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Contact administrator.',
      });
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
    };

    req.sessionId = sessionToken;

    // Update last activity (don't await - fire and forget)
    db.update(userSessions)
      .set({ lastActivity: new Date() })
      .where(eq(userSessions.id, session.id))
      .catch((err) => console.error('Failed to update session activity:', err));

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication system error.',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if authenticated, but doesn't block if not
 *
 * Usage:
 * app.get('/api/public-but-personalized', optionalAuth, (req, res) => {
 *   if (req.user) {
 *     // Show personalized content
 *   } else {
 *     // Show public content
 *   }
 * });
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies?.sessionToken;

  if (!sessionToken) {
    return next(); // No token, continue without user
  }

  try {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.sessionToken, sessionToken),
          eq(userSessions.isActive, true)
        )
      )
      .limit(1);

    if (session && session.expiresAt >= new Date()) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      if (user && user.isActive) {
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
        };
        req.sessionId = sessionToken;
      }
    }
  } catch (error) {
    console.error('Optional auth error:', error);
    // Continue anyway - this is optional auth
  }

  next();
}

/**
 * Role-based authorization middleware
 * Requires user to have specific role
 *
 * Usage:
 * app.post('/api/admin', requireAuth, requireRole('admin'), (req, res) => {
 *   // Only admins can access
 * });
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
}

/**
 * Require minimum role level
 * Allows user with specified role or higher
 *
 * Usage:
 * app.get('/api/reports', requireAuth, requireMinRole('ops_executive'), (req, res) => {
 *   // Ops executives, admins, and super_admins can access
 * });
 */
export function requireMinRole(minimumRole: string) {
  const roleHierarchy: Record<string, number> = {
    client: 1,
    agent: 2,
    customer_service: 3,
    ops_executive: 4,
    admin: 5,
    super_admin: 6,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    const userLevel = roleHierarchy[req.user.role] || 0;
    const requiredLevel = roleHierarchy[minimumRole] || 999;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: `Insufficient privileges. Minimum role required: ${minimumRole}`,
      });
    }

    next();
  };
}

console.log('✅ Authentication middleware loaded');
