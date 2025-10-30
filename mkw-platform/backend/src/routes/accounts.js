const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../database/connection');
const { authenticateToken } = require('./auth');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation schemas
const createAccountValidation = [
  body('name')
    .notEmpty()
    .isLength({ max: 255 })
    .withMessage('Account name is required and must be less than 255 characters'),
  body('type')
    .optional()
    .isIn(['enterprise', 'mid_market', 'small_business', 'startup'])
    .withMessage('Invalid account type'),
  body('industry')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Industry must be less than 100 characters'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d\s\-\(\)]{7,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('annualRevenue')
    .optional()
    .isDecimal()
    .withMessage('Annual revenue must be a valid number'),
  body('numberOfEmployees')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Number of employees must be a positive integer')
];

const updateAccountValidation = [
  ...createAccountValidation.filter(validation => 
    !validation.builder.fields.includes('name') || validation.optional
  ),
  body('name')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Account name must be less than 255 characters')
];

// @route   GET /api/accounts
// @desc    Get all accounts with filtering, searching, and pagination
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  query('search').optional().isLength({ max: 255 }).withMessage('Search term too long'),
  query('type').optional().isIn(['enterprise', 'mid_market', 'small_business', 'startup']).withMessage('Invalid account type'),
  query('industry').optional().isLength({ max: 100 }).withMessage('Industry filter too long'),
  query('status').optional().isIn(['active', 'inactive', 'prospect']).withMessage('Invalid status filter'),
  query('owner').optional().isInt().withMessage('Owner must be a valid user ID'),
  query('sortBy').optional().isIn(['name', 'created_at', 'updated_at', 'annual_revenue']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      search = '',
      type = '',
      industry = '',
      status = '',
      owner = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Build dynamic WHERE clause
    if (search) {
      paramCount++;
      whereConditions.push(`(
        a.name ILIKE $${paramCount} OR 
        a.description ILIKE $${paramCount} OR 
        a.industry ILIKE $${paramCount} OR
        a.billing_city ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    if (type) {
      paramCount++;
      whereConditions.push(`a.type = $${paramCount}`);
      queryParams.push(type);
    }

    if (industry) {
      paramCount++;
      whereConditions.push(`a.industry = $${paramCount}`);
      queryParams.push(industry);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`a.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (owner) {
      paramCount++;
      whereConditions.push(`a.owner_id = $${paramCount}`);
      queryParams.push(owner);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderClause = `ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}`;

    // Main query with user details
    const query = `
      SELECT 
        a.*,
        u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name,
        u.email as owner_email,
        COUNT(o.id) as opportunity_count,
        COALESCE(SUM(CASE WHEN o.is_closed = false THEN o.amount ELSE 0 END), 0) as pipeline_value,
        COUNT(c.id) as contact_count
      FROM accounts a
      LEFT JOIN users u ON a.owner_id = u.id
      LEFT JOIN opportunities o ON a.id = o.account_id
      LEFT JOIN contacts c ON a.id = c.account_id
      ${whereClause}
      GROUP BY a.id, u.first_name, u.last_name, u.email
      ${orderClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    // Execute main query
    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT a.id) as total
      FROM accounts a
      LEFT JOIN users u ON a.owner_id = u.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const totalRecords = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      success: true,
      data: {
        accounts: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords,
          limit: parseInt(limit),
          hasMore: page < totalPages
        }
      }
    });

  } catch (error) {
    logger.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounts'
    });
  }
});

// @route   GET /api/accounts/stats/dashboard
// @desc    Get account statistics for dashboard
// @access  Private
router.get('/stats/dashboard', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_accounts,
        COUNT(CASE WHEN status = 'prospect' THEN 1 END) as prospect_accounts,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_accounts,
        COUNT(*) as total_accounts,
        AVG(health_score) as avg_health_score,
        SUM(annual_revenue) as total_annual_revenue
      FROM accounts
    `;

    const industryQuery = `
      SELECT 
        industry,
        COUNT(*) as account_count,
        AVG(annual_revenue) as avg_revenue
      FROM accounts 
      WHERE industry IS NOT NULL AND status = 'active'
      GROUP BY industry 
      ORDER BY account_count DESC 
      LIMIT 10
    `;

    const recentActivityQuery = `
      SELECT 
        a.name as account_name,
        a.id as account_id,
        a.created_at,
        u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name
      FROM accounts a
      LEFT JOIN users u ON a.owner_id = u.id
      WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY a.created_at DESC
      LIMIT 5
    `;

    const [statsResult, industryResult, activityResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(industryQuery),
      pool.query(recentActivityQuery)
    ]);

    res.json({
      success: true,
      data: {
        summary: statsResult.rows[0],
        industryBreakdown: industryResult.rows,
        recentAccounts: activityResult.rows
      }
    });

  } catch (error) {
    logger.error('Get account stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account statistics'
    });
  }
});

// @route   GET /api/accounts/:id
// @desc    Get single account by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID'
      });
    }

    const query = `
      SELECT 
        a.*,
        u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name,
        u.email as owner_email,
        COUNT(DISTINCT o.id) as opportunity_count,
        COUNT(DISTINCT c.id) as contact_count,
        COALESCE(SUM(CASE WHEN o.is_closed = false THEN o.amount ELSE 0 END), 0) as pipeline_value,
        COALESCE(SUM(CASE WHEN o.is_won = true THEN o.amount ELSE 0 END), 0) as won_value
      FROM accounts a
      LEFT JOIN users u ON a.owner_id = u.id
      LEFT JOIN opportunities o ON a.id = o.account_id
      LEFT JOIN contacts c ON a.id = c.account_id
      WHERE a.id = $1
      GROUP BY a.id, u.first_name, u.last_name, u.email
    `;

    const result = await pool.query(query, [accountId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: {
        account: result.rows[0]
      }
    });

  } catch (error) {
    logger.error('Get account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account'
    });
  }
});

// @route   POST /api/accounts
// @desc    Create new account
// @access  Private
router.post('/', createAccountValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      name,
      type = 'small_business',
      industry,
      website,
      phone,
      email,
      billingStreet,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry = 'India',
      annualRevenue,
      numberOfEmployees,
      description,
      tags = []
    } = req.body;

    const query = `
      INSERT INTO accounts (
        name, type, industry, website, phone, email,
        billing_street, billing_city, billing_state, billing_postal_code, billing_country,
        annual_revenue, number_of_employees, description, tags, owner_id, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16
      ) RETURNING *
    `;

    const values = [
      name, type, industry, website, phone, email,
      billingStreet, billingCity, billingState, billingPostalCode, billingCountry,
      annualRevenue, numberOfEmployees, description, tags, req.user.id
    ];

    const result = await pool.query(query, values);
    const newAccount = result.rows[0];

    // Log account creation
    logger.info('Account created successfully', {
      accountId: newAccount.id,
      accountName: newAccount.name,
      userId: req.user.id,
      userEmail: req.user.email
    });

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('account-created', {
      account: newAccount,
      user: req.user
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        account: newAccount
      }
    });

  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        success: false,
        message: 'Account with this name already exists'
      });
    }

    logger.error('Create account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account'
    });
  }
});

// @route   PUT /api/accounts/:id
// @desc    Update account
// @access  Private
router.put('/:id', updateAccountValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const accountId = parseInt(req.params.id);
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID'
      });
    }

    // Check if account exists
    const existingAccount = await pool.query('SELECT * FROM accounts WHERE id = $1', [accountId]);
    if (existingAccount.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const {
      name,
      type,
      industry,
      website,
      phone,
      email,
      billingStreet,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
      annualRevenue,
      numberOfEmployees,
      description,
      tags,
      healthScore,
      rating,
      status
    } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 0;

    // Build dynamic UPDATE clause
    const fieldMappings = {
      name, type, industry, website, phone, email,
      billing_street: billingStreet,
      billing_city: billingCity,
      billing_state: billingState,
      billing_postal_code: billingPostalCode,
      billing_country: billingCountry,
      annual_revenue: annualRevenue,
      number_of_employees: numberOfEmployees,
      description, tags, health_score: healthScore, rating, status
    };

    Object.entries(fieldMappings).forEach(([field, value]) => {
      if (value !== undefined) {
        paramCount++;
        updateFields.push(`${field} = $${paramCount}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Add updated_by
    paramCount++;
    updateFields.push(`updated_by = $${paramCount}`);
    values.push(req.user.id);

    // Add WHERE clause parameter
    paramCount++;
    values.push(accountId);

    const updateQuery = `
      UPDATE accounts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    const updatedAccount = result.rows[0];

    // Log account update
    logger.info('Account updated successfully', {
      accountId: updatedAccount.id,
      accountName: updatedAccount.name,
      userId: req.user.id,
      userEmail: req.user.email,
      updatedFields: Object.keys(fieldMappings).filter(key => fieldMappings[key] !== undefined)
    });

    // Emit real-time event
    const io = req.app.get('io');
    io.to(`account-${accountId}`).emit('account-updated', {
      account: updatedAccount,
      user: req.user
    });

    res.json({
      success: true,
      message: 'Account updated successfully',
      data: {
        account: updatedAccount
      }
    });

  } catch (error) {
    logger.error('Update account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update account'
    });
  }
});

// @route   DELETE /api/accounts/:id
// @desc    Delete account (soft delete)
// @access  Private (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete accounts'
      });
    }

    const accountId = parseInt(req.params.id);
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID'
      });
    }

    // Check if account exists and has related data
    const relatedDataQuery = `
      SELECT 
        (SELECT COUNT(*) FROM opportunities WHERE account_id = $1) as opportunities,
        (SELECT COUNT(*) FROM contacts WHERE account_id = $1) as contacts,
        (SELECT COUNT(*) FROM cases WHERE account_id = $1) as cases
    `;

    const relatedResult = await pool.query(relatedDataQuery, [accountId]);
    const relatedData = relatedResult.rows[0];

    // Soft delete by changing status to inactive
    const updateResult = await pool.query(
      'UPDATE accounts SET status = $1, updated_by = $2 WHERE id = $3 RETURNING name',
      ['inactive', req.user.id, accountId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Log account deletion
    logger.info('Account deleted (soft delete)', {
      accountId,
      accountName: updateResult.rows[0].name,
      userId: req.user.id,
      userEmail: req.user.email,
      relatedData
    });

    res.json({
      success: true,
      message: 'Account deleted successfully',
      data: {
        relatedData
      }
    });

  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

// @route   GET /api/accounts/:id/opportunities
// @desc    Get all opportunities for an account
// @access  Private
router.get('/:id/opportunities', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID'
      });
    }

    const query = `
      SELECT 
        o.*,
        u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name,
        c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
      FROM opportunities o
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN contacts c ON o.primary_contact_id = c.id
      WHERE o.account_id = $1
      ORDER BY o.created_at DESC
    `;

    const result = await pool.query(query, [accountId]);

    res.json({
      success: true,
      data: {
        opportunities: result.rows
      }
    });

  } catch (error) {
    logger.error('Get account opportunities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account opportunities'
    });
  }
});

// @route   GET /api/accounts/:id/contacts
// @desc    Get all contacts for an account
// @access  Private
router.get('/:id/contacts', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID'
      });
    }

    const query = `
      SELECT 
        c.*,
        u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name
      FROM contacts c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.account_id = $1
      ORDER BY c.is_primary_contact DESC, c.created_at DESC
    `;

    const result = await pool.query(query, [accountId]);

    res.json({
      success: true,
      data: {
        contacts: result.rows
      }
    });

  } catch (error) {
    logger.error('Get account contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account contacts'
    });
  }
});

module.exports = router;