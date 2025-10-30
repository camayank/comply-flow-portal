const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const pool = require('../database/connection');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('firstName')
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('First name is required and must be less than 100 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'sales_rep', 'user'])
    .withMessage('Invalid role specified')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// JWT token generation
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: 'mkw-platform',
    audience: 'mkw-platform-users'
  });

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: 'mkw-platform',
      audience: 'mkw-platform-users'
    }
  );

  return { accessToken, refreshToken };
};

// JWT token verification middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'mkw-platform',
      audience: 'mkw-platform-users'
    });

    // Get fresh user data
    const result = await pool.query(
      'SELECT id, uuid, username, email, first_name, last_name, role, status, last_login FROM users WHERE id = $1 AND status = $2',
      [decoded.id, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    logger.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public (but can be restricted to admin only)
router.post('/register', authLimiter, registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { username, email, password, firstName, lastName, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, uuid, username, email, first_name, last_name, role, status, created_at`,
      [username, email, passwordHash, firstName, lastName, role]
    );

    const newUser = result.rows[0];

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(newUser);

    // Log successful registration
    logger.info('User registered successfully', {
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          uuid: newUser.uuid,
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          status: newUser.status
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        }
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password, rememberMe = false } = req.body;

    // Get user by email
    const result = await pool.query(
      'SELECT id, uuid, username, email, password_hash, first_name, last_name, role, status, failed_login_attempts, account_locked_until FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.account_locked_until && new Date() < new Date(user.account_locked_until)) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed attempts',
        lockedUntil: user.account_locked_until
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null; // Lock for 30 minutes after 5 failed attempts

      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, account_locked_until = $2 WHERE id = $3',
        [failedAttempts, lockUntil, user.id]
      );

      logger.warn('Failed login attempt', {
        userId: user.id,
        email: user.email,
        failedAttempts: failedAttempts,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        ...(failedAttempts >= 5 && { accountLocked: true, lockedUntil: lockUntil })
      });
    }

    // Reset failed login attempts and update last login
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Log successful login
    logger.info('User logged in successfully', {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          uuid: user.uuid,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        }
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          uuid: req.user.uuid,
          username: req.user.username,
          email: req.user.email,
          firstName: req.user.first_name,
          lastName: req.user.last_name,
          role: req.user.role,
          status: req.user.status,
          lastLogin: req.user.last_login
        }
      }
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public (requires valid refresh token)
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      {
        issuer: 'mkw-platform',
        audience: 'mkw-platform-users'
      }
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Get user
    const result = await pool.query(
      'SELECT id, uuid, username, email, first_name, last_name, role, status FROM users WHERE id = $1 AND status = $2',
      [decoded.id, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const user = result.rows[0];
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        }
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Get current password hash
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = result.rows[0];

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Log password change
      logger.info('Password changed successfully', {
        userId: userId,
        email: req.user.email,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Password change failed'
      });
    }
  }
);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout
    logger.info('User logged out', {
      userId: req.user.id,
      email: req.user.email,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Export middleware for use in other routes
module.exports = {
  router,
  authenticateToken,
  generateTokens
};

// Export router as default
module.exports = router;
module.exports.authenticateToken = authenticateToken;