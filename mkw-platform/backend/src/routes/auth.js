const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../database/connection');
const logger = require('../utils/logger');
const { 
  sessionManager,
  sessionAuthMiddleware 
} = require('../middleware/sessionAuth');
const {
  rateLimits,
  csrfProtection,
  trackOTPAttempt,
  checkOTPCooldown,
  hashOTP,
  verifyOTP
} = require('../middleware/security');

const router = express.Router();

// Enhanced validation rules
const validationRules = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .custom(async (email) => {
        const existing = await db('users').where('email', email).first();
        if (existing) {
          throw new Error('Email already registered');
        }
      }),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least 8 characters with uppercase, lowercase, number, and special character'),
    body('username')
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .custom(async (username) => {
        const existing = await db('users').where('username', username).first();
        if (existing) {
          throw new Error('Username already taken');
        }
      }),
    body('firstName').isLength({ min: 1, max: 100 }).trim(),
    body('lastName').optional().isLength({ max: 100 }).trim()
  ],
  
  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 })
  ],
  
  sendOTP: [
    body('email').isEmail().normalizeEmail(),
    body('captcha').optional().isLength({ min: 1 }) // For future CAPTCHA integration
  ],
  
  verifyOTP: [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 4, max: 8 }).isNumeric()
  ]
};

// Secure OTP generation
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Register endpoint with comprehensive security
router.post('/register',
  rateLimits.authPerIP,
  csrfProtection,
  validationRules.register,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password, username, firstName, lastName } = req.body;
      
      // Hash password with high cost
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create user
      const [userId] = await db('users').insert({
        email,
        password_hash: passwordHash,
        username,
        first_name: firstName,
        last_name: lastName,
        role: 'user',
        status: 'active',
        email_verified: false,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');
      
      logger.info('User registered', {
        userId: userId.id || userId,
        email,
        ip: req.ip
      });
      
      // Create session
      const user = await db('users').where('id', userId.id || userId).first();
      const session = await sessionManager.createSession(user, req);
      
      // Set secure cookie
      res.cookie('mkw.sid', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
          },
          tokens: {
            accessToken: jwt.sign(
              { userId: user.id, role: user.role },
              process.env.JWT_SECRET,
              { expiresIn: '7d' }
            )
          },
          csrfToken: session.csrfToken
        }
      });
    } catch (error) {
      logger.error('Registration error', {
        error: error.message,
        stack: error.stack,
        ip: req.ip
      });
      
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  }
);

// Login with comprehensive security
router.post('/login',
  rateLimits.authPerIP,
  csrfProtection,
  validationRules.login,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input'
        });
      }

      const { email, password } = req.body;
      
      // Check for account lockout
      const lockoutCheck = await db('failed_login_attempts')
        .where('identifier', email)
        .where('identifier_type', 'email')
        .where('locked_until', '>', new Date())
        .first();
      
      if (lockoutCheck) {
        logger.warn('Login attempted on locked account', {
          email,
          ip: req.ip,
          lockedUntil: lockoutCheck.locked_until
        });
        
        return res.status(423).json({
          success: false,
          error: 'Account temporarily locked due to failed attempts'
        });
      }
      
      // Find user
      const user = await db('users')
        .where('email', email)
        .where('status', 'active')
        .first();
      
      if (!user) {
        await trackFailedAttempt(email, 'email', req.ip);
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
      
      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordValid) {
        await trackFailedAttempt(email, 'email', req.ip);
        logger.warn('Failed login attempt', {
          email,
          ip: req.ip
        });
        
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
      
      // Clear failed attempts on successful login
      await db('failed_login_attempts')
        .where('identifier', email)
        .where('identifier_type', 'email')
        .delete();
      
      // Update last login
      await db('users')
        .where('id', user.id)
        .update({
          last_login: new Date(),
          failed_login_attempts: 0,
          updated_at: new Date()
        });
      
      // Create session
      const session = await sessionManager.createSession(user, req);
      
      // Set secure cookie
      res.cookie('mkw.sid', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      logger.info('Successful login', {
        userId: user.id,
        email,
        ip: req.ip
      });
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
          },
          tokens: {
            accessToken: jwt.sign(
              { userId: user.id, role: user.role },
              process.env.JWT_SECRET,
              { expiresIn: '7d' }
            )
          },
          csrfToken: session.csrfToken
        }
      });
    } catch (error) {
      logger.error('Login error', {
        error: error.message,
        stack: error.stack,
        ip: req.ip
      });
      
      res.status(500).json({
        success: false,
        error: 'Authentication system error'
      });
    }
  }
);

// Secure OTP sending with enterprise protection
router.post('/send-otp',
  rateLimits.otpPerIP,
  rateLimits.otpPerEmail,
  csrfProtection,
  validationRules.sendOTP,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Always return success to prevent enumeration
        return res.json({
          success: true,
          message: 'If the account exists, an OTP has been sent'
        });
      }

      const { email } = req.body;
      
      // Check OTP cooldown
      const cooldownCheck = checkOTPCooldown(email);
      if (!cooldownCheck.allowed) {
        return res.status(429).json({
          success: false,
          error: `Please wait ${cooldownCheck.cooldownMinutes} minutes before requesting another OTP`
        });
      }
      
      // Track attempt (even if user doesn't exist)
      trackOTPAttempt(email);
      
      // Check if user exists (but don't reveal in response)
      const user = await db('users')
        .where('email', email)
        .where('status', 'active')
        .first();
      
      if (user) {
        // Generate and hash OTP
        const otp = generateOTP();
        const hashedOTP = await hashOTP(otp);
        
        // Store hashed OTP
        await db('otp_store').insert({
          identifier: email,
          otp_hash: hashedOTP,
          attempts: 0,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'] || null,
          expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          created_at: new Date()
        });
        
        // In production, send via email service
        // await emailService.sendOTP(email, otp);
        
        // NEVER log the raw OTP in production
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG_OTP === 'true') {
          logger.debug('OTP generated for development', {
            email,
            otpHint: `***${otp.slice(-2)}`, // Only last 2 digits
            ip: req.ip
          });
        }
        
        logger.info('OTP sent successfully', {
          email,
          ip: req.ip
        });
      }
      
      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If the account exists, an OTP has been sent'
      });
    } catch (error) {
      logger.error('OTP sending error', {
        error: error.message,
        stack: error.stack,
        ip: req.ip
      });
      
      res.json({
        success: true,
        message: 'If the account exists, an OTP has been sent'
      });
    }
  }
);

// Secure OTP verification
router.post('/verify-otp',
  rateLimits.authPerIP,
  csrfProtection,
  validationRules.verifyOTP,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input'
        });
      }

      const { email, otp } = req.body;
      
      // Get OTP record
      const otpRecord = await db('otp_store')
        .where('identifier', email)
        .where('expires_at', '>', new Date())
        .orderBy('created_at', 'desc')
        .first();
      
      if (!otpRecord) {
        logger.warn('OTP verification failed - no valid OTP found', {
          email,
          ip: req.ip
        });
        
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired OTP'
        });
      }
      
      // Check attempt limit
      if (otpRecord.attempts >= 3) {
        await db('otp_store').where('id', otpRecord.id).delete();
        
        logger.warn('OTP verification failed - too many attempts', {
          email,
          ip: req.ip,
          attempts: otpRecord.attempts
        });
        
        return res.status(429).json({
          success: false,
          error: 'Too many attempts. Please request a new OTP.'
        });
      }
      
      // Verify OTP
      const otpValid = await verifyOTP(otp, otpRecord.otp_hash);
      
      // Increment attempts
      await db('otp_store')
        .where('id', otpRecord.id)
        .update({ attempts: otpRecord.attempts + 1 });
      
      if (!otpValid) {
        logger.warn('OTP verification failed - invalid OTP', {
          email,
          ip: req.ip,
          attempts: otpRecord.attempts + 1
        });
        
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired OTP'
        });
      }
      
      // Delete used OTP
      await db('otp_store').where('id', otpRecord.id).delete();
      
      // Get user and create session
      const user = await db('users')
        .where('email', email)
        .where('status', 'active')
        .first();
      
      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'User account not found'
        });
      }
      
      // Mark email as verified
      await db('users')
        .where('id', user.id)
        .update({
          email_verified: true,
          last_login: new Date(),
          updated_at: new Date()
        });
      
      // Create session
      const session = await sessionManager.createSession(user, req);
      
      // Set secure cookie
      res.cookie('mkw.sid', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      logger.info('OTP verification successful', {
        userId: user.id,
        email,
        ip: req.ip
      });
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
          },
          tokens: {
            accessToken: jwt.sign(
              { userId: user.id, role: user.role },
              process.env.JWT_SECRET,
              { expiresIn: '7d' }
            )
          },
          csrfToken: session.csrfToken
        }
      });
    } catch (error) {
      logger.error('OTP verification error', {
        error: error.message,
        stack: error.stack,
        ip: req.ip
      });
      
      res.status(500).json({
        success: false,
        error: 'Verification system error'
      });
    }
  }
);

// Get current user (session-based)
router.get('/me', sessionAuthMiddleware, async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        role: req.user.role,
        emailVerified: req.user.email_verified,
        lastLogin: req.user.last_login
      },
      session: {
        id: req.session.id.substring(0, 8) + '...',
        createdAt: req.session.createdAt,
        lastActivity: req.session.lastActivity
      }
    }
  });
});

// Secure logout
router.post('/logout', sessionAuthMiddleware, async (req, res) => {
  try {
    await sessionManager.revokeSession(req.sessionId);
    
    res.clearCookie('mkw.sid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    logger.info('User logged out', {
      userId: req.user.id,
      ip: req.ip
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Logout error', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// Helper function to track failed login attempts
async function trackFailedAttempt(identifier, type, ip) {
  const existing = await db('failed_login_attempts')
    .where('identifier', identifier)
    .where('identifier_type', type)
    .first();
  
  if (existing) {
    const newCount = existing.attempt_count + 1;
    let lockedUntil = null;
    
    // Progressive lockout
    if (newCount >= 10) {
      lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    } else if (newCount >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }
    
    await db('failed_login_attempts')
      .where('id', existing.id)
      .update({
        attempt_count: newCount,
        last_attempt: new Date(),
        locked_until: lockedUntil
      });
  } else {
    await db('failed_login_attempts').insert({
      identifier,
      identifier_type: type,
      attempt_count: 1,
      last_attempt: new Date()
    });
  }
  
  // Log security event
  await db('security_events').insert({
    event_type: 'login_failed',
    ip_address: ip,
    details: { identifier, type },
    created_at: new Date()
  });
}

module.exports = router;