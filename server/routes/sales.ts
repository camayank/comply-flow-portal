/**
 * Sales Portal Routes
 * Lead management, pipeline, proposals
 */

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { apiLimiter } from '../middleware/rateLimiter';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('sales_manager', 'sales_executive', 'admin', 'super_admin'));
router.use(apiLimiter);

/**
 * GET /api/v1/sales/dashboard
 */
router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;

  const leadsCount = await pool.query(
    'SELECT COUNT(*) FROM leads WHERE assigned_to = $1',
    [userId]
  );

  const proposalsCount = await pool.query(
    'SELECT COUNT(*) FROM proposals WHERE created_by = $1',
    [userId]
  );

  res.json({
    success: true,
    data: {
      stats: {
        totalLeads: parseInt(leadsCount.rows[0].count),
        totalProposals: parseInt(proposalsCount.rows[0].count),
      },
    },
  });
}));

/**
 * GET /api/v1/sales/leads
 */
router.get('/leads', asyncHandler(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 20 } = req.query;

  let query = 'SELECT * FROM leads WHERE 1=1';
  const params: any[] = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const offset = (Number(page) - 1) * Number(limit);
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  params.push(limit);
  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await pool.query(query, params);

  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * POST /api/v1/sales/leads
 */
router.post('/leads', asyncHandler(async (req: Request, res: Response) => {
  const { companyName, contactPerson, email, phone, source, notes } = req.body;

  if (!companyName || !contactPerson || !email) {
    throw new ValidationError('Company name, contact person, and email are required');
  }

  const result = await pool.query(
    `INSERT INTO leads (company_name, contact_person, email, phone, source, assigned_to, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [companyName, contactPerson, email, phone, source, req.userId, notes]
  );

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: result.rows[0],
  });
}));

/**
 * GET /api/v1/sales/leads/:id
 */
router.get('/leads/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Lead');
  }

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

/**
 * PATCH /api/v1/sales/leads/:id
 */
router.patch('/leads/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, leadScore, notes } = req.body;

  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    updates.push(`status = $${paramCount}`);
    values.push(status);
  }

  if (leadScore !== undefined) {
    paramCount++;
    updates.push(`lead_score = $${paramCount}`);
    values.push(leadScore);
  }

  if (notes) {
    paramCount++;
    updates.push(`notes = $${paramCount}`);
    values.push(notes);
  }

  if (updates.length === 0) {
    throw new ValidationError('No fields to update');
  }

  paramCount++;
  values.push(id);

  const result = await pool.query(
    `UPDATE leads SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramCount} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Lead');
  }

  res.json({
    success: true,
    message: 'Lead updated successfully',
    data: result.rows[0],
  });
}));

/**
 * POST /api/v1/sales/leads/:id/convert
 */
router.post('/leads/:id/convert', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Get lead
  const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
  if (leadResult.rows.length === 0) {
    throw new NotFoundError('Lead');
  }

  const lead = leadResult.rows[0];

  // Create client from lead
  const clientResult = await pool.query(
    `INSERT INTO clients (company_name, contact_person, email, phone, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [lead.company_name, lead.contact_person, lead.email, lead.phone, 'active']
  );

  // Update lead status
  await pool.query(
    `UPDATE leads SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    ['converted', id]
  );

  res.json({
    success: true,
    message: 'Lead converted to client successfully',
    data: clientResult.rows[0],
  });
}));

/**
 * GET /api/v1/sales/proposals
 */
router.get('/proposals', asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM proposals ORDER BY created_at DESC LIMIT 50'
  );

  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * POST /api/v1/sales/proposals
 */
router.post('/proposals', asyncHandler(async (req: Request, res: Response) => {
  const { leadId, clientId, title, description, totalAmount, validUntil } = req.body;

  if (!title || !totalAmount) {
    throw new ValidationError('Title and total amount are required');
  }

  const result = await pool.query(
    `INSERT INTO proposals (lead_id, client_id, title, description, total_amount, valid_until, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [leadId, clientId, title, description, totalAmount, validUntil, req.userId]
  );

  res.status(201).json({
    success: true,
    message: 'Proposal created successfully',
    data: result.rows[0],
  });
}));

export default router;
