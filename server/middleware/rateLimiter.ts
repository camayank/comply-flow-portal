/**
 * Rate Limiting Middleware
 * Prevents abuse and DoS attacks
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW || '15') * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_API_MAX || '100'), // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime?.getTime() ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 0),
    });
  },
});

/**
 * Authentication endpoints rate limiter (stricter)
 */
export const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '15') * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10'),
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime?.getTime() ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 0),
    });
  },
});

/**
 * OTP request rate limiter (very strict)
 */
export const otpLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_OTP_WINDOW || '15') * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_OTP_MAX || '3'),
  message: 'Too many OTP requests, please try again later.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many OTP requests. Please wait before requesting again.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime?.getTime() ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 0),
    });
  },
});

/**
 * File upload rate limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW || '60') * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '10'),
  message: 'Too many file uploads, please try again later.',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Upload limit exceeded. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime?.getTime() ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 0),
    });
  },
});

/**
 * Create custom rate limiter
 */
export function createRateLimiter(windowMinutes: number, maxRequests: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(req.rateLimit?.resetTime?.getTime() ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 0),
      });
    },
  });
}
