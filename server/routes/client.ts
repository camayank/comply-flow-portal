/**
 * Client Portal Routes
 * Client dashboard, services, documents, and compliance calendar
 */

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { apiLimiter } from '../middleware/rateLimiter';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authenticateToken);
router.use(apiLimiter);

/**
 * GET /api/v1/client/dashboard
 * Get client dashboard overview
 */
router.get('/dashboard', requireRole('client'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  // Get client info
  const clientResult = await pool.query(
    'SELECT * FROM clients WHERE user_id = $1',
    [userId]
  );

  if (clientResult.rows.length === 0) {
    throw new NotFoundError('Client profile');
  }

  const client = clientResult.rows[0];

  // Get active services count
  const servicesResult = await pool.query(
    'SELECT COUNT(*) as count FROM client_services WHERE client_id = $1 AND status = $2',
    [client.id, 'active']
  );

  // Get pending documents count
  const docsResult = await pool.query(
    'SELECT COUNT(*) as count FROM client_documents WHERE client_id = $1 AND status = $2',
    [client.id, 'pending']
  );

  // Get recent invoices
  const invoicesResult = await pool.query(
    `SELECT * FROM invoices WHERE client_id = $1 ORDER BY issue_date DESC LIMIT 5`,
    [client.id]
  );

  res.json({
    success: true,
    data: {
      client: {
        id: client.id,
        companyName: client.company_name,
        email: client.email,
        phone: client.phone,
        status: client.status,
      },
      stats: {
        activeServices: parseInt(servicesResult.rows[0].count),
        pendingDocuments: parseInt(docsResult.rows[0].count),
        recentInvoices: invoicesResult.rows.length,
      },
      recentInvoices: invoicesResult.rows,
    },
  });
}));

/**
 * GET /api/v1/client/services
 * Get all services for client
 */
router.get('/services', requireRole('client'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  // Get client
  const clientResult = await pool.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
  if (clientResult.rows.length === 0) {
    throw new NotFoundError('Client profile');
  }

  const clientId = clientResult.rows[0].id;

  // Get services
  const servicesResult = await pool.query(
    `SELECT cs.*, s.name as service_name, s.description as service_description
     FROM client_services cs
     JOIN services s ON cs.service_type = s.name
     WHERE cs.client_id = $1
     ORDER BY cs.created_at DESC`,
    [clientId]
  );

  res.json({
    success: true,
    data: servicesResult.rows,
  });
}));

/**
 * GET /api/v1/client/services/:id
 * Get specific service details
 */
router.get('/services/:id', requireRole('client'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  // Get client
  const clientResult = await pool.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
  if (clientResult.rows.length === 0) {
    throw new NotFoundError('Client profile');
  }

  const clientId = clientResult.rows[0].id;

  // Get service
  const serviceResult = await pool.query(
    `SELECT cs.*, s.name as service_name, s.description as service_description
     FROM client_services cs
     JOIN services s ON cs.service_type = s.name
     WHERE cs.id = $1 AND cs.client_id = $2`,
    [id, clientId]
  );

  if (serviceResult.rows.length === 0) {
    throw new NotFoundError('Service');
  }

  res.json({
    success: true,
    data: serviceResult.rows[0],
  });
}));

/**
 * GET /api/v1/client/documents
 * Get all documents for client
 */
router.get('/documents', requireRole('client'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  // Get client
  const clientResult = await pool.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
  if (clientResult.rows.length === 0) {
    throw new NotFoundError('Client profile');
  }

  const clientId = clientResult.rows[0].id;

  // Get documents
  const docsResult = await pool.query(
    `SELECT * FROM client_documents WHERE client_id = $1 ORDER BY upload_date DESC`,
    [clientId]
  );

  res.json({
    success: true,
    data: docsResult.rows,
  });
}));

/**
 * POST /api/v1/client/documents
 * Upload document
 */
router.post('/documents', requireRole('client'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { documentType, documentName, filePath, fileSize } = req.body;

  if (!documentType || !documentName || !filePath) {
    throw new ValidationError('Document type, name, and file path are required');
  }

  // Get client
  const clientResult = await pool.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
  if (clientResult.rows.length === 0) {
    throw new NotFoundError('Client profile');
  }

  const clientId = clientResult.rows[0].id;

  // Insert document
  const result = await pool.query(
    `INSERT INTO client_documents (client_id, document_type, document_name, file_path, file_size, uploaded_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [clientId, documentType, documentName, filePath, fileSize || null, userId, 'pending']
  );

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: result.rows[0],
  });
}));

/**
 * GET /api/v1/client/payments
 * Get payment history
 */
router.get('/payments', requireRole('client'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  // Get client
  const clientResult = await pool.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
  if (clientResult.rows.length === 0) {
    throw new NotFoundError('Client profile');
  }

  const clientId = clientResult.rows[0].id;

  // Get invoices and transactions
  const paymentsResult = await pool.query(
    `SELECT i.*, t.transaction_id, t.payment_method, t.payment_gateway, t.status as payment_status
     FROM invoices i
     LEFT JOIN transactions t ON i.id = t.invoice_id
     WHERE i.client_id = $1
     ORDER BY i.issue_date DESC`,
    [clientId]
  );

  res.json({
    success: true,
    data: paymentsResult.rows,
  });
}));

/**
 * GET /api/v1/client/compliance-calendar
 * Get compliance deadlines
 */
router.get('/compliance-calendar', requireRole('client'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  // Get client
  const clientResult = await pool.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
  if (clientResult.rows.length === 0) {
    throw new NotFoundError('Client profile');
  }

  // Mock compliance calendar data
  const complianceItems = [
    {
      id: '1',
      title: 'GST Return Filing (GSTR-3B)',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      status: 'upcoming',
      priority: 'high',
    },
    {
      id: '2',
      title: 'TDS Return Filing (24Q)',
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
      status: 'upcoming',
      priority: 'medium',
    },
  ];

  res.json({
    success: true,
    data: complianceItems,
  });
}));

/**
 * GET /api/v1/services/catalog
 * Get available services catalog
 */
router.get('/catalog', asyncHandler(async (req: Request, res: Response) => {
  const { category, search, page = 1, limit = 20 } = req.query;

  let query = 'SELECT * FROM services WHERE is_active = true';
  const params: any[] = [];
  let paramCount = 0;

  if (category) {
    paramCount++;
    query += ` AND category = $${paramCount}`;
    params.push(category);
  }

  if (search) {
    paramCount++;
    query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  query += ' ORDER BY name ASC';

  // Add pagination
  const offset = (Number(page) - 1) * Number(limit);
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  params.push(limit);
  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await pool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM services WHERE is_active = true';
  const countParams: any[] = [];
  let countParamCount = 0;

  if (category) {
    countParamCount++;
    countQuery += ` AND category = $${countParamCount}`;
    countParams.push(category);
  }

  if (search) {
    countParamCount++;
    countQuery += ` AND (name ILIKE $${countParamCount} OR description ILIKE $${countParamCount})`;
    countParams.push(`%${search}%`);
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  res.json({
    success: true,
    data: {
      services: result.rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
}));

/**
 * GET /api/v1/services/:id
 * Get service details
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(
    'SELECT * FROM services WHERE id = $1 AND is_active = true',
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Service');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

/**
 * POST /api/v1/services/book
 * Book a service
 */
router.post('/book', requireRole('client'), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { serviceId } = req.body;

  if (!serviceId) {
    throw new ValidationError('Service ID is required');
  }

  // Get service
  const serviceResult = await pool.query('SELECT * FROM services WHERE id = $1', [serviceId]);
  if (serviceResult.rows.length === 0) {
    throw new NotFoundError('Service');
  }

  const service = serviceResult.rows[0];

  // Get client
  const clientResult = await pool.query('SELECT id FROM clients WHERE user_id = $1', [userId]);
  if (clientResult.rows.length === 0) {
    throw new NotFoundError('Client profile');
  }

  const clientId = clientResult.rows[0].id;

  // Create service booking
  const result = await pool.query(
    `INSERT INTO client_services (client_id, service_type, status, fee)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [clientId, service.name, 'pending', service.base_price]
  );

  res.status(201).json({
    success: true,
    message: 'Service booked successfully',
    data: result.rows[0],
  });
}));

export default router;
