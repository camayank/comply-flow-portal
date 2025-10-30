const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../database/connection');
const { authenticateToken } = require('./auth');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation schemas
const createOpportunityValidation = [
  body('name')
    .notEmpty()
    .isLength({ max: 255 })
    .withMessage('Opportunity name is required and must be less than 255 characters'),
  body('accountId')
    .isInt({ min: 1 })
    .withMessage('Valid account ID is required'),
  body('amount')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Amount must be a valid decimal number'),
  body('probability')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Probability must be between 0-100'),
  body('closeDate')
    .optional()
    .isISO8601()
    .withMessage('Close date must be a valid date'),
  body('stage')
    .optional()
    .isIn(['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])
    .withMessage('Invalid opportunity stage'),
  body('opportunityType')
    .optional()
    .isIn(['new_business', 'existing_customer', 'renewal'])
    .withMessage('Invalid opportunity type'),
  body('leadSource')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Lead source must be less than 50 characters'),
  body('forecastCategory')
    .optional()
    .isIn(['omitted', 'pipeline', 'best_case', 'commit'])
    .withMessage('Invalid forecast category')
];

// @route   GET /api/opportunities
// @desc    Get all opportunities with filtering and pagination
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  query('search').optional().isLength({ max: 255 }).withMessage('Search term too long'),
  query('stage').optional().isIn(['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).withMessage('Invalid stage filter'),
  query('accountId').optional().isInt().withMessage('Account ID must be a valid integer'),
  query('owner').optional().isInt().withMessage('Owner must be a valid user ID'),
  query('forecastCategory').optional().isIn(['omitted', 'pipeline', 'best_case', 'commit']).withMessage('Invalid forecast filter'),
  query('sortBy').optional().isIn(['name', 'amount', 'probability', 'close_date', 'created_at', 'updated_at']).withMessage('Invalid sort field'),
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
      stage = '',
      accountId = '',
      owner = '',
      forecastCategory = '',
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
        o.name ILIKE $${paramCount} OR 
        o.description ILIKE $${paramCount} OR
        a.name ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    if (stage) {
      paramCount++;
      whereConditions.push(`o.stage = $${paramCount}`);
      queryParams.push(stage);
    }

    if (accountId) {
      paramCount++;
      whereConditions.push(`o.account_id = $${paramCount}`);
      queryParams.push(accountId);
    }

    if (owner) {
      paramCount++;
      whereConditions.push(`o.owner_id = $${paramCount}`);
      queryParams.push(owner);
    }

    if (forecastCategory) {
      paramCount++;
      whereConditions.push(`o.forecast_category = $${paramCount}`);
      queryParams.push(forecastCategory);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderClause = `ORDER BY o.${sortBy} ${sortOrder.toUpperCase()}`;

    // Main query
    const query = `
      SELECT 
        o.*,
        a.name as account_name,
        a.industry as account_industry,
        u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name,
        u.email as owner_email,
        c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name,
        ROUND((o.amount * o.probability / 100)::numeric, 2) as weighted_amount
      FROM opportunities o
      LEFT JOIN accounts a ON o.account_id = a.id
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN contacts c ON o.primary_contact_id = c.id
      ${whereClause}
      ${orderClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    // Execute main query
    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(o.id) as total
      FROM opportunities o
      LEFT JOIN accounts a ON o.account_id = a.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const totalRecords = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      success: true,
      data: {
        opportunities: result.rows,
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
    logger.error('Get opportunities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch opportunities'
    });
  }
});

// @route   GET /api/opportunities/stats/dashboard
// @desc    Get opportunity statistics for dashboard
// @access  Private
router.get('/stats/dashboard', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_opportunities,
        COUNT(CASE WHEN is_closed = false THEN 1 END) as open_opportunities,
        COUNT(CASE WHEN is_won = true THEN 1 END) as won_opportunities,
        COUNT(CASE WHEN is_closed = true AND is_won = false THEN 1 END) as lost_opportunities,
        COALESCE(SUM(CASE WHEN is_closed = false THEN amount ELSE 0 END), 0) as pipeline_value,
        COALESCE(SUM(CASE WHEN is_won = true THEN amount ELSE 0 END), 0) as won_value,
        COALESCE(AVG(CASE WHEN is_closed = false THEN probability END), 0) as average_probability,
        ROUND(
          (COUNT(CASE WHEN is_won = true THEN 1 END)::decimal / 
           NULLIF(COUNT(CASE WHEN is_closed = true THEN 1 END), 0)) * 100, 2
        ) as win_rate,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' AND is_won = true THEN 1 END) as recently_won
      FROM opportunities
    `;

    const monthlyTrendQuery = `
      SELECT 
        DATE_TRUNC('month', close_date) as month,
        COUNT(*) as opportunity_count,
        COALESCE(SUM(amount), 0) as won_value
      FROM opportunities 
      WHERE is_won = true 
        AND close_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', close_date)
      ORDER BY month
    `;

    const stageDistributionQuery = `
      SELECT 
        stage,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM opportunities 
      WHERE is_closed = false
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'prospecting' THEN 1
          WHEN 'qualification' THEN 2
          WHEN 'proposal' THEN 3
          WHEN 'negotiation' THEN 4
          ELSE 5
        END
    `;

    const [statsResult, trendResult, stageResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(monthlyTrendQuery),
      pool.query(stageDistributionQuery)
    ]);

    res.json({
      success: true,
      data: {
        summary: statsResult.rows[0],
        monthlyTrend: trendResult.rows,
        stageDistribution: stageResult.rows
      }
    });

  } catch (error) {
    logger.error('Get opportunity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch opportunity statistics'
    });
  }
});

// @route   GET /api/opportunities/pipeline
// @desc    Get pipeline view with opportunities grouped by stage
// @access  Private
router.get('/pipeline', async (req, res) => {
  try {
    const query = `
      SELECT 
        stage,
        COUNT(*) as opportunity_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(probability), 0) as avg_probability,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', id,
            'name', name,
            'account_name', account_name,
            'amount', amount,
            'probability', probability,
            'close_date', close_date,
            'owner_name', owner_name
          ) ORDER BY amount DESC
        ) FILTER (WHERE id IS NOT NULL) as opportunities
      FROM (
        SELECT 
          o.id, o.name, o.stage, o.amount, o.probability, o.close_date,
          a.name as account_name,
          u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name
        FROM opportunities o
        LEFT JOIN accounts a ON o.account_id = a.id
        LEFT JOIN users u ON o.owner_id = u.id
        WHERE o.is_closed = false
      ) grouped_opportunities
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'prospecting' THEN 1
          WHEN 'qualification' THEN 2
          WHEN 'proposal' THEN 3
          WHEN 'negotiation' THEN 4
          ELSE 5
        END
    `;

    const result = await pool.query(query);

    // Calculate pipeline summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_opportunities,
        COALESCE(SUM(amount), 0) as total_pipeline_value,
        COALESCE(SUM(amount * probability / 100), 0) as weighted_pipeline_value,
        COALESCE(AVG(probability), 0) as average_probability
      FROM opportunities 
      WHERE is_closed = false
    `;

    const summaryResult = await pool.query(summaryQuery);

    res.json({
      success: true,
      data: {
        pipeline: result.rows,
        summary: summaryResult.rows[0]
      }
    });

  } catch (error) {
    logger.error('Get pipeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pipeline data'
    });
  }
});

// @route   POST /api/opportunities
// @desc    Create new opportunity
// @access  Private
router.post('/', createOpportunityValidation, async (req, res) => {
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
      accountId,
      primaryContactId,
      stage = 'prospecting',
      amount,
      probability = 10,
      closeDate,
      leadSource,
      opportunityType = 'new_business',
      description,
      competitors,
      nextStep,
      forecastCategory = 'pipeline',
      tags = []
    } = req.body;

    // Verify account exists
    const accountCheck = await pool.query('SELECT id FROM accounts WHERE id = $1', [accountId]);
    if (accountCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Verify contact exists and belongs to account (if provided)
    if (primaryContactId) {
      const contactCheck = await pool.query(
        'SELECT id FROM contacts WHERE id = $1 AND account_id = $2',
        [primaryContactId, accountId]
      );
      if (contactCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Contact not found or does not belong to the specified account'
        });
      }
    }

    const query = `
      INSERT INTO opportunities (
        name, account_id, primary_contact_id, stage, amount, probability,
        close_date, lead_source, opportunity_type, description, competitors,
        next_step, forecast_category, tags, owner_id, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15
      ) RETURNING *
    `;

    const values = [
      name, accountId, primaryContactId, stage, amount, probability,
      closeDate, leadSource, opportunityType, description, competitors,
      nextStep, forecastCategory, tags, req.user.id
    ];

    const result = await pool.query(query, values);
    const newOpportunity = result.rows[0];

    // Get enriched opportunity data
    const enrichedQuery = `
      SELECT 
        o.*,
        a.name as account_name,
        u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name,
        c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
      FROM opportunities o
      LEFT JOIN accounts a ON o.account_id = a.id
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN contacts c ON o.primary_contact_id = c.id
      WHERE o.id = $1
    `;

    const enrichedResult = await pool.query(enrichedQuery, [newOpportunity.id]);
    const enrichedOpportunity = enrichedResult.rows[0];

    // Log opportunity creation
    logger.info('Opportunity created successfully', {
      opportunityId: newOpportunity.id,
      opportunityName: newOpportunity.name,
      accountId: newOpportunity.account_id,
      userId: req.user.id,
      userEmail: req.user.email
    });

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('opportunity-created', {
      opportunity: enrichedOpportunity,
      user: req.user
    });

    res.status(201).json({
      success: true,
      message: 'Opportunity created successfully',
      data: {
        opportunity: enrichedOpportunity
      }
    });

  } catch (error) {
    logger.error('Create opportunity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create opportunity'
    });
  }
});

// @route   PUT /api/opportunities/:id
// @desc    Update opportunity
// @access  Private
router.put('/:id', createOpportunityValidation.map(validation => 
  validation.optional ? validation : validation.optional()
), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const opportunityId = parseInt(req.params.id);
    if (isNaN(opportunityId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity ID'
      });
    }

    // Check if opportunity exists
    const existingOpportunity = await pool.query(
      'SELECT * FROM opportunities WHERE id = $1', 
      [opportunityId]
    );
    
    if (existingOpportunity.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    const {
      name, accountId, primaryContactId, stage, amount, probability,
      closeDate, leadSource, opportunityType, description, competitors,
      nextStep, forecastCategory, tags, isWon, isClosed
    } = req.body;

    const updateFields = [];
    const values = [];
    let paramCount = 0;

    // Build dynamic UPDATE clause
    const fieldMappings = {
      name,
      account_id: accountId,
      primary_contact_id: primaryContactId,
      stage,
      amount,
      probability,
      close_date: closeDate,
      lead_source: leadSource,
      opportunity_type: opportunityType,
      description,
      competitors,
      next_step: nextStep,
      forecast_category: forecastCategory,
      tags,
      is_won: isWon,
      is_closed: isClosed
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

    // Add stage change tracking
    if (stage && stage !== existingOpportunity.rows[0].stage) {
      paramCount++;
      updateFields.push(`stage_change_date = $${paramCount}`);
      values.push(new Date());
    }

    // Add updated_by
    paramCount++;
    updateFields.push(`updated_by = $${paramCount}`);
    values.push(req.user.id);

    // Add WHERE clause parameter
    paramCount++;
    values.push(opportunityId);

    const updateQuery = `
      UPDATE opportunities 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    const updatedOpportunity = result.rows[0];

    // Get enriched opportunity data
    const enrichedQuery = `
      SELECT 
        o.*,
        a.name as account_name,
        u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name,
        c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name
      FROM opportunities o
      LEFT JOIN accounts a ON o.account_id = a.id
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN contacts c ON o.primary_contact_id = c.id
      WHERE o.id = $1
    `;

    const enrichedResult = await pool.query(enrichedQuery, [opportunityId]);
    const enrichedOpportunity = enrichedResult.rows[0];

    // Log opportunity update
    logger.info('Opportunity updated successfully', {
      opportunityId: updatedOpportunity.id,
      opportunityName: updatedOpportunity.name,
      userId: req.user.id,
      userEmail: req.user.email,
      updatedFields: Object.keys(fieldMappings).filter(key => fieldMappings[key] !== undefined)
    });

    // Emit real-time event
    const io = req.app.get('io');
    io.to(`opportunity-${opportunityId}`).emit('opportunity-updated', {
      opportunity: enrichedOpportunity,
      user: req.user
    });

    res.json({
      success: true,
      message: 'Opportunity updated successfully',
      data: {
        opportunity: enrichedOpportunity
      }
    });

  } catch (error) {
    logger.error('Update opportunity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update opportunity'
    });
  }
});

// @route   GET /api/opportunities/:id
// @desc    Get single opportunity by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const opportunityId = parseInt(req.params.id);
    if (isNaN(opportunityId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity ID'
      });
    }

    const query = `
      SELECT 
        o.*,
        a.name as account_name,
        a.industry as account_industry,
        u.first_name || ' ' || COALESCE(u.last_name, '') as owner_name,
        u.email as owner_email,
        c.first_name || ' ' || COALESCE(c.last_name, '') as contact_name,
        c.email as contact_email,
        ROUND((o.amount * o.probability / 100)::numeric, 2) as weighted_amount
      FROM opportunities o
      LEFT JOIN accounts a ON o.account_id = a.id
      LEFT JOIN users u ON o.owner_id = u.id
      LEFT JOIN contacts c ON o.primary_contact_id = c.id
      WHERE o.id = $1
    `;

    const result = await pool.query(query, [opportunityId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    res.json({
      success: true,
      data: {
        opportunity: result.rows[0]
      }
    });

  } catch (error) {
    logger.error('Get opportunity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch opportunity'
    });
  }
});

// @route   DELETE /api/opportunities/:id
// @desc    Delete opportunity
// @access  Private (Admin/Manager only)
router.delete('/:id', async (req, res) => {
  try {
    // Check permissions
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete opportunities'
      });
    }

    const opportunityId = parseInt(req.params.id);
    if (isNaN(opportunityId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid opportunity ID'
      });
    }

    // Get opportunity details before deletion
    const opportunityResult = await pool.query(
      'SELECT name, account_id FROM opportunities WHERE id = $1',
      [opportunityId]
    );

    if (opportunityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    const opportunity = opportunityResult.rows[0];

    // Delete opportunity (hard delete)
    await pool.query('DELETE FROM opportunities WHERE id = $1', [opportunityId]);

    // Log opportunity deletion
    logger.info('Opportunity deleted successfully', {
      opportunityId,
      opportunityName: opportunity.name,
      accountId: opportunity.account_id,
      userId: req.user.id,
      userEmail: req.user.email
    });

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('opportunity-deleted', {
      opportunityId,
      accountId: opportunity.account_id,
      user: req.user
    });

    res.json({
      success: true,
      message: 'Opportunity deleted successfully'
    });

  } catch (error) {
    logger.error('Delete opportunity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete opportunity'
    });
  }
});

module.exports = router;