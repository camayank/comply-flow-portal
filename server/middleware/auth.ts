/**
 * Authentication Middleware
 * Handles JWT verification and user authentication
 *
 * PRODUCTION READY - All security checks enabled
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
 * Verifies Bearer token and attaches user to request
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
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
    req.userId = decoded.id || decoded.userId;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token present, but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.type === 'access') {
        req.user = decoded;
        req.userId = decoded.id || decoded.userId;
      }
    }

    next();
  } catch (error) {
    // Optional auth - continue even if token invalid
    next();
  }
}

/**
 * Verify refresh token middleware
 * Used for token refresh operations
 */
export function verifyRefreshToken(req: Request, res: Response, next: NextFunction): void {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: 'Refresh token required',
      });
      return;
    }

    const decoded = verifyToken(refreshToken);

    if (!decoded) {
      res.status(403).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
      return;
    }

    if (decoded.type !== 'refresh') {
      res.status(403).json({
        success: false,
        error: 'Invalid token type - refresh token required',
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Refresh token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed',
    });
  }
}
