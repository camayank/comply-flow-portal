const { body, param, query, validationResult } = require('express-validator');
const logger = require('./logger');

// Common validation rules
const commonValidations = {
  // ID validations
  id: param('id').isInt({ min: 1 }).withMessage('Invalid ID'),
  userId: param('userId').isInt({ min: 1 }).withMessage('Invalid user ID'),
  serviceId: param('serviceId').isInt({ min: 1 }).withMessage('Invalid service ID'),
  requestId: param('requestId').isInt({ min: 1 }).withMessage('Invalid request ID'),
  
  // Pagination
  page: query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  limit: query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  // Text fields
  name: body('name').isLength({ min: 1, max: 200 }).trim().withMessage('Name is required and must be less than 200 characters'),
  email: body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  phone: body('phone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
  description: body('description').optional().isLength({ max: 2000 }).trim().withMessage('Description must be less than 2000 characters'),
  
  // Business fields
  gstin: body('gstin').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GSTIN format'),
  pan: body('pan').optional().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Invalid PAN format'),
  
  // Enums
  status: query('status').optional().isIn([
    'draft', 'submitted', 'under_review', 'approved', 'in_progress',
    'pending_client', 'pending_documents', 'quality_check',
    'completed', 'delivered', 'cancelled', 'on_hold'
  ]).withMessage('Invalid status'),
  
  priority: body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
  
  userStatus: query('userStatus').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid user status'),
  
  // Amounts
  amount: body('amount').optional().isDecimal({ decimal_digits: '0,2' }).withMessage('Amount must be a valid decimal'),
  
  // Dates
  date: body('date').optional().isISO8601().withMessage('Valid date required (ISO 8601 format)'),
  fromDate: query('from_date').optional().isISO8601().withMessage('Valid from date required'),
  toDate: query('to_date').optional().isISO8601().withMessage('Valid to date required')
};

// Validation middleware factory
const createValidationMiddleware = (validations) => {
  return [
    ...validations,
    (req, res, next) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        const errorDetails = errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }));
        
        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors: errorDetails,
          userId: req.user?.id,
          ip: req.ip
        });
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorDetails
        });
      }
      
      next();
    }
  ];
};

// Service request validation schemas
const serviceRequestValidations = {
  create: createValidationMiddleware([
    commonValidations.serviceId,
    body('clientName').isLength({ min: 1, max: 200 }).trim().withMessage('Client name is required'),
    body('clientEmail').isEmail().normalizeEmail().withMessage('Valid client email is required'),
    body('clientPhone').optional().isMobilePhone('any').withMessage('Valid phone number required'),
    body('clientCompany').optional().isLength({ max: 200 }).trim(),
    body('clientAddress').optional().isLength({ max: 500 }).trim(),
    body('clientGstin').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GSTIN format'),
    body('clientPan').optional().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Invalid PAN format'),
    commonValidations.description,
    body('requirements').optional().isObject().withMessage('Requirements must be an object'),
    body('quotedPrice').optional().isDecimal({ decimal_digits: '0,2' }).withMessage('Quoted price must be a valid amount'),
    commonValidations.priority
  ]),
  
  update: createValidationMiddleware([
    commonValidations.requestId,
    body('status').optional().isIn([
      'draft', 'submitted', 'under_review', 'approved', 'in_progress',
      'pending_client', 'pending_documents', 'quality_check',
      'completed', 'delivered', 'cancelled', 'on_hold'
    ]).withMessage('Invalid status'),
    commonValidations.priority,
    body('assignedTo').optional().isInt({ min: 1 }).withMessage('Invalid assigned user ID'),
    body('finalPrice').optional().isDecimal({ decimal_digits: '0,2' }).withMessage('Final price must be a valid amount'),
    body('actualDeliveryDate').optional().isISO8601().withMessage('Valid delivery date required'),
    body('internalNotes').optional().isLength({ max: 2000 }).trim(),
    body('clientFeedback').optional().isLength({ max: 2000 }).trim(),
    body('clientRating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
  ]),
  
  list: createValidationMiddleware([
    commonValidations.page,
    commonValidations.limit,
    commonValidations.status,
    query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
    query('assigned_to').optional().isInt({ min: 1 }).withMessage('Invalid assigned user ID'),
    query('service_id').optional().isInt({ min: 1 }).withMessage('Invalid service ID'),
    commonValidations.fromDate,
    commonValidations.toDate
  ])
};

// User validation schemas
const userValidations = {
  create: createValidationMiddleware([
    body('username')
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
    commonValidations.email,
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
    body('firstName').isLength({ min: 1, max: 100 }).trim().withMessage('First name is required'),
    body('lastName').optional().isLength({ max: 100 }).trim(),
    commonValidations.phone,
    body('employeeId').optional().isLength({ max: 50 }).trim(),
    body('department').optional().isLength({ max: 100 }).trim(),
    body('designation').optional().isLength({ max: 100 }).trim(),
    body('roleId').isInt({ min: 1 }).withMessage('Valid role ID is required')
  ]),
  
  update: createValidationMiddleware([
    commonValidations.userId,
    body('firstName').optional().isLength({ min: 1, max: 100 }).trim(),
    body('lastName').optional().isLength({ max: 100 }).trim(),
    body('phone').optional().isMobilePhone('any'),
    body('department').optional().isLength({ max: 100 }).trim(),
    body('designation').optional().isLength({ max: 100 }).trim(),
    body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
    body('roleId').optional().isInt({ min: 1 }).withMessage('Invalid role ID')
  ]),
  
  changePassword: createValidationMiddleware([
    body('currentPassword').isLength({ min: 1 }).withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must be at least 8 characters with uppercase, lowercase, number, and special character')
  ]),
  
  list: createValidationMiddleware([
    commonValidations.page,
    commonValidations.limit,
    query('role').optional().isString().withMessage('Role must be a string'),
    commonValidations.userStatus
  ])
};

// File validation schemas
const fileValidations = {
  upload: createValidationMiddleware([
    body('serviceRequestId').optional().isInt({ min: 1 }).withMessage('Invalid service request ID'),
    body('documentType').optional().isIn(['requirement', 'deliverable', 'support']).withMessage('Invalid document type')
  ]),
  
  download: createValidationMiddleware([
    param('fileId').isInt({ min: 1 }).withMessage('Invalid file ID')
  ]),
  
  list: createValidationMiddleware([
    param('serviceRequestId').isInt({ min: 1 }).withMessage('Invalid service request ID'),
    query('document_type').optional().isIn(['requirement', 'deliverable', 'support']).withMessage('Invalid document type')
  ])
};

// Admin validation schemas
const adminValidations = {
  configUpdate: createValidationMiddleware([
    param('category').isLength({ min: 1, max: 100 }).withMessage('Category is required'),
    param('key').isLength({ min: 1, max: 100 }).withMessage('Key is required'),
    body('value').notEmpty().withMessage('Value is required')
  ]),
  
  auditLogs: createValidationMiddleware([
    commonValidations.page,
    commonValidations.limit,
    query('action').optional().isString(),
    query('user_id').optional().isInt({ min: 1 }),
    commonValidations.fromDate,
    commonValidations.toDate
  ])
};

// Sanitization helpers
const sanitizers = {
  // Remove HTML tags and trim whitespace
  sanitizeText: (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/<[^>]*>?/gm, '').trim();
  },
  
  // Normalize phone numbers
  normalizePhone: (phone) => {
    if (typeof phone !== 'string') return phone;
    return phone.replace(/[^0-9+]/g, '');
  },
  
  // Validate and sanitize GSTIN
  sanitizeGSTIN: (gstin) => {
    if (typeof gstin !== 'string') return gstin;
    return gstin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  },
  
  // Validate and sanitize PAN
  sanitizePAN: (pan) => {
    if (typeof pan !== 'string') return pan;
    return pan.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
};

// Custom validation functions
const customValidators = {
  // Check if email domain is allowed
  isAllowedEmailDomain: (email) => {
    const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS;
    if (!allowedDomains) return true;
    
    const domain = email.split('@')[1];
    return allowedDomains.split(',').includes(domain);
  },
  
  // Check if date is in the future
  isFutureDate: (date) => {
    return new Date(date) > new Date();
  },
  
  // Check if file extension is allowed
  isAllowedFileType: (filename) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,jpeg,png')
      .split(',')
      .map(type => type.trim().toLowerCase());
    
    const extension = filename.split('.').pop().toLowerCase();
    return allowedTypes.includes(extension);
  }
};

module.exports = {
  commonValidations,
  serviceRequestValidations,
  userValidations,
  fileValidations,
  adminValidations,
  createValidationMiddleware,
  sanitizers,
  customValidators
};