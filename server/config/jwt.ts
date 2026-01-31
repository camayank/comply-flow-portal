/**
 * JWT Configuration
 * Token generation and verification utilities
 */

import jwt from 'jsonwebtoken';
import { logger } from './logger';

// CRITICAL: JWT_SECRET must be set in environment - no default allowed
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is required. Set a secure random string of at least 32 characters.');
}
if (JWT_SECRET.length < 32) {
  throw new Error('CRITICAL: JWT_SECRET must be at least 32 characters long for security.');
}
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'comply-flow-portal';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'comply-flow-users';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  type: 'access' | 'refresh';
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    {
      expiresIn: JWT_ACCESS_EXPIRY,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRY,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}

/**
 * Verify token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token');
    } else {
      logger.error('Token verification error:', error);
    }
    return null;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Token decode error:', error);
    return null;
  }
}

/**
 * Generate token pair (access + refresh)
 */
export function generateTokenPair(payload: Omit<JWTPayload, 'type'>) {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}
