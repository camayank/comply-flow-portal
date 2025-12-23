const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../database/connection');
const logger = require('../utils/logger');
const { sessionManager } = require('../middleware/sessionAuth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
];

const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least 8 characters with uppercase, lowercase, number, and special character'),
  body('firstName').isLength({ min: 1, max: 100 }).trim(),
  body('lastName').optional().isLength({ max: 100 }).trim()
];

// Register new user (admin only)
router.post('/register', authLimiter, registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password, firstName, lastName, roleId = 7 } = req.body; // Default to support_agent role
    
    // Check if user already exists
    const existingUser = await db('system_users')
      .where('email', email)
      .orWhere('username', username)
      .first();
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or username already exists'
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Get default role
    const role = await db('roles').where('id', roleId).first();
    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified'
      });
    }
    
    // Create user
    const [userId] = await db('system_users').insert({
      username,
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      role_id: roleId,
      status: 'active',
      force_password_change: false,
      preferences: JSON.stringify({
        theme: 'light',
        notifications: {
          email: true,
          browser: true,
          mobile: false
        }
      })
    }).returning('id');
    
    const newUserId = userId.id || userId;
    
    // Log successful registration
    logger.info('New user registered', {
      userId: newUserId,
      email,
      username,
      role: role.name,
      ip: req.ip
    });
    
    // Create audit log entry
    await db('audit_logs').insert({
      user_id: newUserId,
      action: 'user_registered',
      entity_type: 'system_users',
      entity_id: newUserId,
      new_values: JSON.stringify({ email, username, role: role.name }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: newUserId,
        username,
        email,
        firstName,
        lastName,
        role: role.name
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
});

// Login
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const { email, password } = req.body;
    
    // Check for account lockout
    const user = await db('system_users')
      .leftJoin('roles', 'system_users.role_id', 'roles.id')
      .select(
        'system_users.*',
        'roles.name as role_name',
        'roles.permissions'
      )
      .where('system_users.email', email)
      .where('system_users.status', 'active')
      .first();
    
    if (!user) {
      // Don't reveal that user doesn't exist
      await new Promise(resolve => setTimeout(resolve, 1000)); // Prevent timing attacks
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const lockTimeRemaining = Math.ceil((new Date(user.locked_until) - new Date()) / (60 * 1000));
      
      logger.warn('Login attempt on locked account', {
        userId: user.id,
        email,
        ip: req.ip,
        lockTimeRemaining
      });
      
      return res.status(423).json({
        success: false,
        error: `Account is locked. Please try again in ${lockTimeRemaining} minutes.`
      });
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      let lockedUntil = null;
      
      // Lock account after 5 failed attempts
      if (newFailedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      }
      
      await db('system_users')
        .where('id', user.id)
        .update({
          failed_login_attempts: newFailedAttempts,
          locked_until: lockedUntil
        });
      
      logger.warn('Failed login attempt', {
        userId: user.id,
        email,
        failedAttempts: newFailedAttempts,
        ip: req.ip
      });
      
      // Create audit log
      await db('audit_logs').insert({
        user_id: user.id,
        action: 'login_failed',
        entity_type: 'system_users',
        entity_id: user.id,
        metadata: JSON.stringify({ 
          reason: 'invalid_password', 
          failed_attempts: newFailedAttempts 
        }),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Check if password change is required
    if (user.force_password_change) {
      return res.status(200).json({
        success: true,
        requirePasswordChange: true,
        userId: user.id,
        message: 'Password change required before login'
      });
    }
    
    // Reset failed login attempts on successful login
    await db('system_users')
      .where('id', user.id)
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date(),
        last_login_ip: req.ip
      });
    
    // Create session
    const session = await sessionManager.createSession(user, req);
    
    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role_name,
        sessionId: session.id
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Set secure session cookie
    res.cookie('mkw.sid', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    logger.info('Successful login', {
      userId: user.id,
      email,
      role: user.role_name,
      ip: req.ip
    });
    
    // Create audit log
    await db('audit_logs').insert({
      user_id: user.id,
      action: 'login_success',
      entity_type: 'system_users',
      entity_id: user.id,
      metadata: JSON.stringify({ role: user.role_name }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role_name,
          permissions: JSON.parse(user.permissions || '[]'),
          preferences: JSON.parse(user.preferences || '{}')
        },
        tokens: {
          accessToken: jwtToken
        },
        session: {
          id: session.id.substring(0, 8) + '...',
          createdAt: session.createdAt,
          expiresAt: new Date(session.createdAt.getTime() + 24 * 60 * 60 * 1000)
        }
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
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    // This route will use sessionAuthMiddleware when mounted
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Get user with role information
    const user = await db('system_users')
      .leftJoin('roles', 'system_users.role_id', 'roles.id')
      .select(
        'system_users.*',
        'roles.name as role_name',
        'roles.permissions'
      )
      .where('system_users.id', req.user.id)
      .first();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role_name,
        permissions: JSON.parse(user.permissions || '[]'),
        preferences: JSON.parse(user.preferences || '{}'),
        lastLogin: user.last_login_at,
        status: user.status
      }
    });
  } catch (error) {
    logger.error('Get user error', {
      error: error.message,
      userId: req.user?.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user information'
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    // Get session ID from cookie or authorization header
    const sessionId = req.cookies['mkw.sid'] || 
                     (req.headers.authorization?.startsWith('Session ') && 
                      req.headers.authorization.substring(8));
    
    if (sessionId) {
      await sessionManager.revokeSession(sessionId);
      
      // Clear session cookie
      res.clearCookie('mkw.sid', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      // Create audit log if user is known
      if (req.user) {
        await db('audit_logs').insert({
          user_id: req.user.id,
          action: 'logout',
          entity_type: 'system_users',
          entity_id: req.user.id,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
        
        logger.info('User logged out', {
          userId: req.user.id,
          ip: req.ip
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error', {
      error: error.message,
      userId: req.user?.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// Change password
router.post('/change-password', [
  body('currentPassword').isLength({ min: 1 }),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least 8 characters with uppercase, lowercase, number, and special character')
], async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    // Get current user with password hash
    const user = await db('system_users')
      .select('password_hash')
      .where('id', req.user.id)
      .first();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Verify current password
    const currentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!currentPasswordValid) {
      logger.warn('Invalid current password during change attempt', {
        userId: req.user.id,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    
    // Update password and clear force_password_change flag
    await db('system_users')
      .where('id', req.user.id)
      .update({
        password_hash: newPasswordHash,
        force_password_change: false,
        updated_at: new Date()
      });
    
    // Revoke all other sessions for security
    await sessionManager.revokeAllUserSessions(req.user.id, req.sessionId);
    
    logger.info('Password changed successfully', {
      userId: req.user.id,
      ip: req.ip
    });
    
    // Create audit log
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'password_changed',
      entity_type: 'system_users',
      entity_id: req.user.id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error', {
      error: error.message,
      userId: req.user?.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const sessionId = req.cookies['mkw.sid'];
    
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: 'No session found'
      });
    }
    
    const validation = await sessionManager.validateSession(sessionId, req);
    
    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session'
      });
    }
    
    // Get user details
    const user = await db('system_users')
      .leftJoin('roles', 'system_users.role_id', 'roles.id')
      .select(
        'system_users.*',
        'roles.name as role_name'
      )
      .where('system_users.id', validation.session.userId)
      .first();
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Generate new JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role_name,
        sessionId: validation.session.id
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      data: {
        accessToken: jwtToken
      }
    });
  } catch (error) {
    logger.error('Token refresh error', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

module.exports = router;