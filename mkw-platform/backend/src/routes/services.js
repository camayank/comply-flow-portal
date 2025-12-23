const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../database/connection');
const logger = require('../utils/logger');
const { sessionAuthMiddleware, requirePermission } = require('../middleware/sessionAuth');

const router = express.Router();

// Public routes (no authentication required)

// Get all active services (public catalog)
router.get('/', [
  query('category').optional().isString(),
  query('search').optional().isString()
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

    const { category, search } = req.query;
    
    // Build query for active services
    let query = db('services')
      .leftJoin('service_categories', 'services.category_id', 'service_categories.id')
      .select(
        'services.id',
        'services.name',
        'services.code',
        'services.description',
        'services.base_price',
        'services.currency',
        'services.estimated_days',
        'services.sla_hours',
        'services.pricing_tiers',
        'services.requires_consultation',
        'services.sort_order',
        'service_categories.name as category_name',
        'service_categories.code as category_code',
        'service_categories.icon as category_icon',
        'service_categories.color as category_color'
      )
      .where('services.is_active', true)
      .where('service_categories.is_active', true)
      .orderBy('service_categories.sort_order')
      .orderBy('services.sort_order');
    
    if (category) {
      query = query.where('service_categories.code', category);
    }
    
    if (search) {
      query = query.where(function() {
        this.where('services.name', 'ilike', `%${search}%`)
            .orWhere('services.description', 'ilike', `%${search}%`)
            .orWhere('service_categories.name', 'ilike', `%${search}%`);
      });
    }
    
    const services = await query;
    
    // Parse JSON fields and format response
    const formattedServices = services.map(service => ({
      id: service.id,
      name: service.name,
      code: service.code,
      description: service.description,
      basePrice: parseFloat(service.base_price),
      currency: service.currency,
      estimatedDays: service.estimated_days,
      slaHours: service.sla_hours,
      pricingTiers: JSON.parse(service.pricing_tiers || '{}'),
      requiresConsultation: service.requires_consultation,
      category: {
        name: service.category_name,
        code: service.category_code,
        icon: service.category_icon,
        color: service.category_color
      }
    }));
    
    res.json({
      success: true,
      data: {
        services: formattedServices,
        totalServices: formattedServices.length
      }
    });
    
  } catch (error) {
    logger.error('Services list error', {
      error: error.message,
      query: req.query,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services'
    });
  }
});

// Get service categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await db('service_categories')
      .select(
        'id',
        'name',
        'code',
        'description',
        'icon',
        'color',
        'sort_order'
      )
      .where('is_active', true)
      .orderBy('sort_order');
    
    // Get service count for each category
    const serviceCounts = await db('services')
      .select('category_id')
      .count('* as service_count')
      .where('is_active', true)
      .groupBy('category_id');
    
    const serviceCountMap = serviceCounts.reduce((acc, item) => {
      acc[item.category_id] = parseInt(item.service_count);
      return acc;
    }, {});
    
    const categoriesWithCounts = categories.map(category => ({
      ...category,
      serviceCount: serviceCountMap[category.id] || 0
    }));
    
    res.json({
      success: true,
      data: {
        categories: categoriesWithCounts
      }
    });
    
  } catch (error) {
    logger.error('Service categories error', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service categories'
    });
  }
});

// Get single service details
router.get('/:serviceId', [
  param('serviceId').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service ID'
      });
    }

    const { serviceId } = req.params;
    
    const service = await db('services')
      .leftJoin('service_categories', 'services.category_id', 'service_categories.id')
      .select(
        'services.*',
        'service_categories.name as category_name',
        'service_categories.code as category_code',
        'service_categories.icon as category_icon',
        'service_categories.color as category_color'
      )
      .where('services.id', serviceId)
      .where('services.is_active', true)
      .first();
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }
    
    // Get workflow template for this service
    const workflowTemplate = await db('workflow_templates')
      .select('id', 'name', 'description', 'steps')
      .where('service_id', serviceId)
      .where('is_default', true)
      .where('is_active', true)
      .first();
    
    // Get some sample service requests (anonymized)
    const sampleRequests = await db('service_requests')
      .select('status', 'created_at', 'estimated_days')
      .where('service_id', serviceId)
      .where('status', 'completed')
      .orderBy('created_at', 'desc')
      .limit(5);
    
    const formattedService = {
      id: service.id,
      name: service.name,
      code: service.code,
      description: service.description,
      requirements: service.requirements,
      deliverables: service.deliverables,
      basePrice: parseFloat(service.base_price),
      currency: service.currency,
      estimatedDays: service.estimated_days,
      slaHours: service.sla_hours,
      pricingTiers: JSON.parse(service.pricing_tiers || '{}'),
      requiredDocuments: JSON.parse(service.required_documents || '[]'),
      optionalDocuments: JSON.parse(service.optional_documents || '[]'),
      requiresConsultation: service.requires_consultation,
      category: {
        name: service.category_name,
        code: service.category_code,
        icon: service.category_icon,
        color: service.category_color
      },
      workflow: workflowTemplate ? {
        id: workflowTemplate.id,
        name: workflowTemplate.name,
        description: workflowTemplate.description,
        steps: JSON.parse(workflowTemplate.steps || '[]')
      } : null,
      stats: {
        sampleCompletionTimes: sampleRequests.map(req => req.estimated_days),
        averageCompletionTime: sampleRequests.length > 0 ? 
          Math.round(sampleRequests.reduce((sum, req) => sum + req.estimated_days, 0) / sampleRequests.length) : 
          service.estimated_days
      }
    };
    
    res.json({
      success: true,
      data: formattedService
    });
    
  } catch (error) {
    logger.error('Service details error', {
      error: error.message,
      serviceId: req.params.serviceId,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service details'
    });
  }
});

// Protected routes (require authentication)
router.use(sessionAuthMiddleware);

// Create service request
router.post('/:serviceId/request', [
  param('serviceId').isInt({ min: 1 }),
  body('clientName').isLength({ min: 1, max: 200 }).trim(),
  body('clientEmail').isEmail().normalizeEmail(),
  body('clientPhone').optional().isMobilePhone(),
  body('clientCompany').optional().isLength({ max: 200 }).trim(),
  body('clientAddress').optional().isLength({ max: 500 }).trim(),
  body('description').optional().isLength({ max: 2000 }).trim(),
  body('requirements').optional().isObject(),
  body('quotedPrice').optional().isDecimal({ decimal_digits: '0,2' })
], requirePermission(['service_requests:create']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { serviceId } = req.params;
    const {
      clientName,
      clientEmail,
      clientPhone,
      clientCompany,
      clientAddress,
      clientGstin,
      clientPan,
      description,
      requirements,
      quotedPrice,
      priority = 'normal'
    } = req.body;
    
    // Verify service exists and is active
    const service = await db('services')
      .where('id', serviceId)
      .where('is_active', true)
      .first();
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }
    
    // Get default workflow template
    const workflowTemplate = await db('workflow_templates')
      .where('service_id', serviceId)
      .where('is_default', true)
      .where('is_active', true)
      .first();
    
    // Generate request number
    const currentYear = new Date().getFullYear();
    const requestCount = await db('service_requests').count('* as count').first();
    const requestNumber = `MKW-${currentYear}-${String(parseInt(requestCount.count) + 1).padStart(4, '0')}`;
    
    // Calculate expected delivery date
    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + service.estimated_days);
    
    // Auto-assign if enabled
    let assignedTo = null;
    const autoAssign = await db('system_config')
      .where('category', 'business')
      .where('key', 'auto_assign_requests')
      .first();
    
    if (autoAssign && autoAssign.value === 'true') {
      // Find available service executive
      const availableExecutive = await db('system_users')
        .leftJoin('roles', 'system_users.role_id', 'roles.id')
        .select('system_users.id')
        .whereIn('roles.name', ['service_executive', 'operations_manager', 'admin'])
        .where('system_users.status', 'active')
        .orderBy(db.raw('RANDOM()'))
        .first();
      
      if (availableExecutive) {
        assignedTo = availableExecutive.id;
      }
    }
    
    // Create service request
    const [requestId] = await db('service_requests').insert({
      request_number: requestNumber,
      service_id: serviceId,
      workflow_template_id: workflowTemplate?.id,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      client_company: clientCompany,
      client_address: clientAddress,
      client_gstin: clientGstin,
      client_pan: clientPan,
      description,
      requirements: JSON.stringify(requirements || {}),
      quoted_price: quotedPrice ? parseFloat(quotedPrice) : service.base_price,
      currency: service.currency,
      expected_delivery_date: expectedDeliveryDate,
      status: 'submitted',
      priority,
      assigned_to: assignedTo,
      metadata: JSON.stringify({
        created_by_user: req.user.id,
        auto_assigned: !!assignedTo,
        source: 'web_portal'
      })
    }).returning('id');
    
    const newRequestId = requestId.id || requestId;
    
    // Create workflow steps if template exists
    if (workflowTemplate) {
      const steps = JSON.parse(workflowTemplate.steps || '[]');
      
      const workflowSteps = steps.map((step, index) => ({
        service_request_id: newRequestId,
        step_name: step.name,
        step_description: step.description,
        step_order: step.order || index + 1,
        assigned_to: step.assignee_role === 'auto' ? assignedTo : null,
        due_at: step.estimated_hours ? 
          new Date(Date.now() + step.estimated_hours * 60 * 60 * 1000) : null,
        step_data: JSON.stringify(step)
      }));
      
      if (workflowSteps.length > 0) {
        await db('service_request_steps').insert(workflowSteps);
        
        // Update current step
        await db('service_requests')
          .where('id', newRequestId)
          .update({
            current_step: steps[0]?.name || 'Initial Processing'
          });
      }
    }
    
    // Create audit log
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'service_request_created',
      entity_type: 'service_requests',
      entity_id: newRequestId,
      new_values: JSON.stringify({
        request_number: requestNumber,
        service_name: service.name,
        client_email: clientEmail,
        status: 'submitted'
      }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    logger.info('Service request created', {
      requestId: newRequestId,
      requestNumber,
      serviceId,
      serviceName: service.name,
      clientEmail,
      assignedTo,
      userId: req.user.id,
      ip: req.ip
    });
    
    // TODO: Send notification to client and assigned user
    
    res.status(201).json({
      success: true,
      data: {
        id: newRequestId,
        requestNumber,
        service: {
          id: service.id,
          name: service.name
        },
        status: 'submitted',
        expectedDeliveryDate,
        assignedTo,
        message: 'Service request created successfully'
      }
    });
    
  } catch (error) {
    logger.error('Service request creation error', {
      error: error.message,
      stack: error.stack,
      serviceId: req.params.serviceId,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to create service request'
    });
  }
});

// Get user's service requests
router.get('/requests/my', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn([
    'draft', 'submitted', 'under_review', 'approved', 'in_progress',
    'pending_client', 'pending_documents', 'quality_check',
    'completed', 'delivered', 'cancelled', 'on_hold'
  ])
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
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { status } = req.query;
    
    // Build query - show requests assigned to user or created by user
    let query = db('service_requests')
      .leftJoin('services', 'service_requests.service_id', 'services.id')
      .leftJoin('system_users as assignee', 'service_requests.assigned_to', 'assignee.id')
      .select(
        'service_requests.*',
        'services.name as service_name',
        'services.code as service_code',
        'assignee.first_name as assignee_first_name',
        'assignee.last_name as assignee_last_name'
      )
      .where(function() {
        // User can see requests assigned to them or requests they created
        this.where('service_requests.assigned_to', req.user.id)
            .orWhere('service_requests.client_email', req.user.email);
        
        // Admins can see all requests
        if (['super_admin', 'admin', 'operations_manager'].includes(req.user.role_name)) {
          this.orWhere(db.raw('1 = 1')); // Always true for admins
        }
      })
      .orderBy('service_requests.created_at', 'desc');
    
    if (status) {
      query = query.where('service_requests.status', status);
    }
    
    // Get total count
    const totalQuery = query.clone().clearSelect().count('* as count').first();
    const total = await totalQuery;
    
    // Get paginated results
    const requests = await query.limit(limit).offset(offset);
    
    const formattedRequests = requests.map(request => ({
      id: request.id,
      requestNumber: request.request_number,
      service: {
        id: request.service_id,
        name: request.service_name,
        code: request.service_code
      },
      client: {
        name: request.client_name,
        email: request.client_email,
        phone: request.client_phone,
        company: request.client_company
      },
      status: request.status,
      priority: request.priority,
      currentStep: request.current_step,
      quotedPrice: parseFloat(request.quoted_price),
      finalPrice: request.final_price ? parseFloat(request.final_price) : null,
      currency: request.currency,
      expectedDeliveryDate: request.expected_delivery_date,
      actualDeliveryDate: request.actual_delivery_date,
      paymentStatus: request.payment_status,
      assignedTo: request.assigned_to ? {
        id: request.assigned_to,
        name: `${request.assignee_first_name || ''} ${request.assignee_last_name || ''}`.trim()
      } : null,
      createdAt: request.created_at,
      updatedAt: request.updated_at
    }));
    
    res.json({
      success: true,
      data: {
        requests: formattedRequests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(parseInt(total.count) / limit),
          totalItems: parseInt(total.count),
          itemsPerPage: limit
        }
      }
    });
    
  } catch (error) {
    logger.error('User service requests error', {
      error: error.message,
      userId: req.user.id,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service requests'
    });
  }
});

module.exports = router;