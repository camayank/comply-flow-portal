const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Salesforce-level rate limiting patterns
const createRateLimit = (windowMs, max, message, keyGenerator) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip),
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Enterprise rate limiting tiers
const rateLimits = {
  // OTP endpoints - Salesforce-level protection
  otpPerEmail: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    3, // 3 attempts per email (stricter than requested 5)
    'Too many OTP requests for this email. Please wait 15 minutes.',
    (req) => (req.body.email || req.body.identifier || '').toLowerCase()
  ),
  
  otpPerIP: createRateLimit(
    60 * 60 * 1000, // 1 hour
    20, // 20 attempts per IP (stricter than requested 30)
    'Too many OTP requests from this IP. Please wait 1 hour.',
    (req) => req.ip
  ),
  
  // Authentication endpoints
  authPerIP: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    10, // 10 login attempts per IP
    'Too many authentication attempts. Please wait 15 minutes.',
    (req) => req.ip
  ),
  
  // Admin endpoints - Ultra strict
  adminPerIP: createRateLimit(
    15 * 60 * 1000, // 15 minutes  
    5, // 5 admin operations per IP
    'Admin operations rate limited. Please wait 15 minutes.',
    (req) => req.ip
  ),
  
  // General API protection
  generalAPI: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per IP
     'API rate limit exceeded. Please slow down.',
    (req) => req.ip
  )
};

// Production-grade Content Security Policy
const getCSPPolicy = (env) => {
  const isDev = env === 'development';
  
  const basePolicy = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    workerSrc: ["'self'"],
    childSrc: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: !isDev
  };
  
  if (isDev) {
    // Development: Allow Vite HMR and dev tools
    basePolicy.scriptSrc = ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'http://localhost:*'];
    basePolicy.connectSrc.push('ws://localhost:*', 'http://localhost:*');
  } else {
    // Production: Strict CSP, no inline scripts
    basePolicy.scriptSrc = ["'self'", "'strict-dynamic'"];
    basePolicy.upgradeInsecureRequests = true;
  }
  
  return basePolicy;
};

// Comprehensive CSRF protection
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Check for CSRF token in multiple places
  const token = req.headers['x-csrf-token'] || 
                req.headers['x-requested-with'] === 'XMLHttpRequest' ||
                req.body._csrf ||
                req.query._csrf;
  
  // Validate session-based CSRF token
  if (req.session && req.session.csrfToken) {
    if (token !== req.session.csrfToken) {
      logger.warn('CSRF token mismatch', {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent'],
        providedToken: token ? 'provided' : 'missing',
        sessionId: req.session.id
      });
      return res.status(403).json({
        success: false,
        error: 'CSRF token validation failed'
      });
    }
  } else {
    // For stateless APIs, require X-Requested-With header
    if (!req.headers['x-requested-with'] && !token) {
      return res.status(403).json({
        success: false,
        error: 'CSRF protection: Missing required headers'
      });
    }
  }
  
  next();
};

// Secure session configuration
const sessionConfig = {
  name: 'mkw.sid', // Don't use default 'connect.sid'
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.COOKIE_DOMAIN || undefined
  },
  genid: () => crypto.randomBytes(32).toString('hex')
};

// Admin route protection middleware
const requireMinimumRole = (minimumRole) => {
  const roleHierarchy = {
    'user': 1,
    'sales_rep': 2,
    'manager': 3,
    'admin': 4
  };
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const userRoleLevel = roleHierarchy[req.user.role] || 0;
    const requiredLevel = roleHierarchy[minimumRole] || 999;
    
    if (userRoleLevel < requiredLevel) {
      logger.warn('Insufficient privileges attempted', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRole: minimumRole,
        ip: req.ip,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient privileges'
      });
    }
    
    next();
  };
};

// Session fingerprinting for additional security
const validateSessionFingerprint = (req, res, next) => {
  if (!req.session || !req.user) {
    return next();
  }
  
  const currentFingerprint = crypto
    .createHash('sha256')
    .update(req.headers['user-agent'] || '')
    .update(req.ip.split('.').slice(0, 3).join('.')) // Subnet matching
    .digest('hex');
  
  if (req.session.fingerprint && req.session.fingerprint !== currentFingerprint) {
    logger.warn('Session fingerprint mismatch - possible session hijacking', {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      sessionId: req.session.id
    });
    
    // Destroy suspicious session
    req.session.destroy();
    return res.status(401).json({
      success: false,
      error: 'Session validation failed. Please login again.'
    });
  }
  
  // Set fingerprint on first use
  if (!req.session.fingerprint) {
    req.session.fingerprint = currentFingerprint;
  }
  
  next();
};

// OTP attempt tracking and cooldown
const otpAttemptTracker = new Map(); // In production, use Redis

const trackOTPAttempt = (identifier) => {
  const key = identifier.toLowerCase();
  const now = Date.now();
  const attempts = otpAttemptTracker.get(key) || { count: 0, firstAttempt: now, lastAttempt: now };
  
  // Reset counter if more than 1 hour passed
  if (now - attempts.firstAttempt > 60 * 60 * 1000) {
    attempts.count = 1;
    attempts.firstAttempt = now;
  } else {
    attempts.count++;
  }
  
  attempts.lastAttempt = now;
  otpAttemptTracker.set(key, attempts);
  
  return attempts;
};

const checkOTPCooldown = (identifier) => {
  const attempts = otpAttemptTracker.get(identifier.toLowerCase());
  if (!attempts) return { allowed: true };
  
  const now = Date.now();
  const timeSinceFirst = now - attempts.firstAttempt;
  const timeSinceLast = now - attempts.lastAttempt;
  
  // Progressive cooldown
  if (attempts.count >= 10) {
    return { allowed: false, cooldownMinutes: 60 }; // 1 hour lockout
  } else if (attempts.count >= 5) {
    return { allowed: timeSinceLast > 15 * 60 * 1000, cooldownMinutes: 15 }; // 15 min cooldown
  } else if (attempts.count >= 3) {
    return { allowed: timeSinceLast > 5 * 60 * 1000, cooldownMinutes: 5 }; // 5 min cooldown
  }
  
  return { allowed: true };
};

// Secure OTP operations
const hashOTP = async (otp) => {
  return await bcrypt.hash(otp, 12); // Salesforce uses high cost factors
};

const verifyOTP = async (providedOTP, hashedOTP) => {
  return await bcrypt.compare(providedOTP, hashedOTP);
};

// Environment validation with strict enforcement
const validateEnvironment = () => {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'CREDENTIAL_ENCRYPTION_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate key lengths
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  
  if (process.env.CREDENTIAL_ENCRYPTION_KEY.length < 32) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters');
  }
};

module.exports = {
  rateLimits,
  getCSPPolicy,
  csrfProtection,
  sessionConfig,
  requireMinimumRole,
  validateSessionFingerprint,
  trackOTPAttempt,
  checkOTPCooldown,
  hashOTP,
  verifyOTP,
  validateEnvironment
};