const express = require('express');
const { body, validationResult, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../../database/connection');
const logger = require('../../utils/logger');
const { sessionAuthMiddleware, requireRole, requirePermission } = require('../../middleware/sessionAuth');

const router = express.Router();

// Admin-specific rate limiting (stricter)
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit admin users to 50 requests per 15 minutes
  message: {
    success: false,
    error: 'Admin rate limit exceeded. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply middleware to all admin routes
router.use(adminRateLimit);
router.use(sessionAuthMiddleware);
router.use(requireRole(['super_admin', 'admin']));

// Audit logging middleware
router.use((req, res, next) => {
  // Log all admin actions
  logger.info('Admin API access', {
    userId: req.user.id,
    userRole: req.user.role_name,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// Dashboard Statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [totalServices] = await db('services').count('* as count');
    const [totalRequests] = await db('service_requests').count('* as count');
    const [activeRequests] = await db('service_requests')
      .whereNotIn('status', ['completed', 'delivered', 'cancelled'])
      .count('* as count');
    const [totalUsers] = await db('system_users').count('* as count');
    
    // Recent requests
    const recentRequests = await db('service_requests')
      .leftJoin('services', 'service_requests.service_id', 'services.id')
      .leftJoin('system_users', 'service_requests.assigned_to', 'system_users.id')
      .select(
        'service_requests.*',
        'services.name as service_name',
        'system_users.first_name',
        'system_users.last_name'
      )
      .orderBy('service_requests.created_at', 'desc')
      .limit(10);
    
    // Status distribution
    const statusStats = await db('service_requests')
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    // Revenue stats (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenueStats = await db('service_requests')
      .where('created_at', '>=', thirtyDaysAgo)
      .sum('final_price as total_revenue')
      .count('* as total_orders')
      .first();
    
    res.json({
      success: true,
      data: {
        totals: {
          services: parseInt(totalServices.count),
          requests: parseInt(totalRequests.count),
          activeRequests: parseInt(activeRequests.count),
          users: parseInt(totalUsers.count)
        },
        recentRequests,
        statusDistribution: statusStats.map(stat => ({
          status: stat.status,
          count: parseInt(stat.count)
        })),
        revenue: {
          last30Days: parseFloat(revenueStats.total_revenue) || 0,
          orders: parseInt(revenueStats.total_orders) || 0
        }
      }
    });
  } catch (error) {
    logger.error('Admin dashboard stats error', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// System Configuration Management
router.get('/config', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = db('system_config')
      .select('category', 'key', 'value', 'data_type', 'description', 'is_editable')
      .orderBy('category')
      .orderBy('key');
    
    if (category) {
      query = query.where('category', category);
    }
    
    const config = await query;
    
    // Group by category
    const groupedConfig = config.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      
      acc[item.category].push({
        key: item.key,
        value: item.data_type === 'json' ? JSON.parse(item.value || '{}') : item.value,
        dataType: item.data_type,
        description: item.description,
        isEditable: item.is_editable
      });
      
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: groupedConfig
    });
  } catch (error) {
    logger.error('Admin config fetch error', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration'
    });
  }
});

router.put('/config/:category/:key', [
  body('value').notEmpty()
], requireRole(['super_admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { category, key } = req.params;
    const { value } = req.body;
    
    // Check if config exists and is editable
    const config = await db('system_config')
      .where('category', category)
      .where('key', key)
      .first();
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    if (!config.is_editable) {
      return res.status(400).json({
        success: false,
        error: 'This configuration is not editable'
      });
    }
    
    // Validate value based on data type
    let processedValue = value;
    if (config.data_type === 'number' && isNaN(value)) {
      return res.status(400).json({
        success: false,
        error: 'Value must be a number'
      });
    }
    
    if (config.data_type === 'boolean') {
      processedValue = value === 'true' || value === true ? 'true' : 'false';
    }
    
    if (config.data_type === 'json') {
      try {
        JSON.parse(value);
        processedValue = typeof value === 'string' ? value : JSON.stringify(value);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Value must be valid JSON'
        });
      }
    }
    
    // Store old value for audit
    const oldValue = config.value;
    
    // Update configuration
    await db('system_config')
      .where('category', category)
      .where('key', key)
      .update({
        value: processedValue,
        updated_at: new Date()
      });
    
    // Create audit log
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'config_updated',
      entity_type: 'system_config',
      entity_id: config.id,
      old_values: JSON.stringify({ [key]: oldValue }),
      new_values: JSON.stringify({ [key]: processedValue }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    logger.info('System configuration updated', {
      userId: req.user.id,
      category,
      key,
      oldValue,
      newValue: processedValue,
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    logger.error('Admin config update error', {
      error: error.message,
      userId: req.user.id,
      category: req.params.category,
      key: req.params.key,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

// User Management
router.get('/users', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isString(),
  query('status').optional().isIn(['active', 'inactive', 'suspended'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { role, status } = req.query;
    
    // Build query
    let query = db('system_users')
      .leftJoin('roles', 'system_users.role_id', 'roles.id')
      .select(
        'system_users.*',
        'roles.name as role_name',
        'roles.display_name as role_display_name'
      )
      .orderBy('system_users.created_at', 'desc');
    
    if (role) {
      query = query.where('roles.name', role);
    }
    
    if (status) {
      query = query.where('system_users.status', status);
    }
    
    // Get total count
    const totalQuery = query.clone().clearSelect().count('* as count').first();
    const total = await totalQuery;
    
    // Get paginated results
    const users = await query.limit(limit).offset(offset);
    
    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          employeeId: user.employee_id,
          department: user.department,
          designation: user.designation,
          role: user.role_name,
          roleDisplayName: user.role_display_name,
          status: user.status,
          lastLogin: user.last_login_at,
          createdAt: user.created_at
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(parseInt(total.count) / limit),
          totalItems: parseInt(total.count),
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    logger.error('Admin users list error', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Service Management
router.get('/services', async (req, res) => {
  try {
    const services = await db('services')
      .leftJoin('service_categories', 'services.category_id', 'service_categories.id')
      .select(
        'services.*',
        'service_categories.name as category_name',
        'service_categories.color as category_color'
      )
      .orderBy('service_categories.sort_order')
      .orderBy('services.sort_order');
    
    // Get request counts for each service
    const requestCounts = await db('service_requests')
      .select('service_id')
      .count('* as request_count')
      .groupBy('service_id');
    
    const requestCountMap = requestCounts.reduce((acc, item) => {
      acc[item.service_id] = parseInt(item.request_count);
      return acc;
    }, {});
    
    const servicesWithStats = services.map(service => ({
      ...service,
      requestCount: requestCountMap[service.id] || 0,
      pricingTiers: JSON.parse(service.pricing_tiers || '{}'),
      requiredDocuments: JSON.parse(service.required_documents || '[]'),
      optionalDocuments: JSON.parse(service.optional_documents || '[]')
    }));
    
    res.json({
      success: true,
      data: servicesWithStats
    });
  } catch (error) {
    logger.error('Admin services list error', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services'
    });
  }
});

// Audit Logs
router.get('/audit-logs', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('action').optional().isString(),
  query('user_id').optional().isInt(),
  query('from_date').optional().isISO8601(),
  query('to_date').optional().isISO8601()
], requirePermission(['audit_logs:read']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const { action, user_id, from_date, to_date } = req.query;
    
    // Build query
    let query = db('audit_logs')
      .leftJoin('system_users', 'audit_logs.user_id', 'system_users.id')
      .select(
        'audit_logs.*',
        'system_users.first_name',
        'system_users.last_name',
        'system_users.email'
      )
      .orderBy('audit_logs.created_at', 'desc');
    
    if (action) {
      query = query.where('audit_logs.action', 'like', `%${action}%`);
    }
    
    if (user_id) {
      query = query.where('audit_logs.user_id', user_id);
    }
    
    if (from_date) {
      query = query.where('audit_logs.created_at', '>=', from_date);
    }
    
    if (to_date) {
      query = query.where('audit_logs.created_at', '<=', to_date);
    }
    
    // Get total count
    const totalQuery = query.clone().clearSelect().count('* as count').first();
    const total = await totalQuery;
    
    // Get paginated results
    const logs = await query.limit(limit).offset(offset);
    
    res.json({
      success: true,
      data: {
        logs: logs.map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entity_type,
          entityId: log.entity_id,
          oldValues: JSON.parse(log.old_values || '{}'),
          newValues: JSON.parse(log.new_values || '{}'),
          metadata: JSON.parse(log.metadata || '{}'),
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          createdAt: log.created_at,
          user: log.user_id ? {
            id: log.user_id,
            name: `${log.first_name || ''} ${log.last_name || ''}`.trim(),
            email: log.email
          } : null
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(parseInt(total.count) / limit),
          totalItems: parseInt(total.count),
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    logger.error('Admin audit logs error', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

// System Health Check
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.raw('SELECT 1');
    
    // Check various system metrics
    const [userCount] = await db('system_users').count('* as count');
    const [serviceCount] = await db('services').count('* as count');
    const [requestCount] = await db('service_requests').count('* as count');
    
    // Memory usage
    const memoryUsage = process.memoryUsage();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        database: {
          status: 'connected',
          users: parseInt(userCount.count),
          services: parseInt(serviceCount.count),
          requests: parseInt(requestCount.count)
        },
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
        },
        environment: process.env.NODE_ENV
      }
    });
  } catch (error) {
    logger.error('Admin health check error', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(503).json({
      success: false,
      error: 'System health check failed',
      details: error.message
    });
  }
});

module.exports = router;