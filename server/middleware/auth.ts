/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../config/jwt';
import { logger } from '../config/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: string;
    }
  }
}

/**
 * Authenticate JWT token middleware
 * DEV MODE: Authentication bypass enabled
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  // 🔓 DEV MODE: Bypass authentication
  req.user = {
    id: 'dev-user-123',
    email: 'dev@test.com',
    role: 'client',
    type: 'access'
  };
  req.userId = 'dev-user-123';
  next();
  return;

  /* ORIGINAL AUTH CODE - COMMENTED FOR DEV
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication token required',
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Check token type
    if (decoded.type !== 'access') {
      res.status(403).json({
        success: false,
        error: 'Invalid token type',
      });
      return;
    }

    // Attach user to request
    req.user = decoded;
    req.userId = decoded.userId;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
  */
}

/**
 * Optional authentication middleware
 * DEV MODE: Always attach dev user
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  // 🔓 DEV MODE: Always attach user
  req.user = {
    id: 'dev-user-123',
    email: 'dev@test.com',
    role: 'client',
    type: 'access'
  };
  req.userId = 'dev-user-123';
  next();
}

/**
 * Verify refresh token middleware
 * DEV MODE: Always allow refresh
 */
export function verifyRefreshToken(req: Request, res: Response, next: NextFunction): void {
  // 🔓 DEV MODE: Bypass refresh token verification
  req.user = {
    id: 'dev-user-123',
    email: 'dev@test.com',
    role: 'client',
    type: 'refresh'
  };
  next();
}

    req.user = decoded;
    req.userId = decoded.userId;

    next();
  } catch (error) {
    logger.error('Refresh token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed',
    });
  }
}
