/**
 * Sales Dashboard Routes
 * Database-backed API endpoints for Sales Dashboard data
 *
 * Provides:
 * - Pipeline overview and stage breakdown
 * - Lead management with filtering
 * - Team performance metrics
 * - Proposal tracking
 * - Targets and forecasts
 */

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { apiLimiter } from '../middleware/rateLimiter';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';

const router = Router();

// Apply authentication and role-based access to all routes
router.use(authenticateToken);
router.use(requireRole('sales_manager', 'sales_executive', 'admin', 'super_admin'));
router.use(apiLimiter);

// GET /api/sales/leads - Get all leads with optional filtering
router.get('/leads', asyncHandler(async (req: Request, res: Response) => {
  const { status, source, assignedTo, search, page = 1, limit = 20 } = req.query;

  let query = `
    SELECT
      id, lead_id as "leadId", client_name as name, client_name as company,
      contact_email as email, contact_phone as phone, lead_source as source,
      COALESCE(lead_stage, status) as status, estimated_value as value,
      pre_sales_executive as "assignedTo", created_at as "createdAt",
      last_contact_date as "lastContact", priority, remarks, state,
      entity_type as "entityType", service_interested as "serviceInterested"
    FROM leads WHERE 1=1
  `;
  const params: any[] = [];
  let paramCount = 0;

  // Apply filters
  if (status && status !== 'all') {
    paramCount++;
    query += ` AND (lead_stage = $${paramCount} OR status = $${paramCount})`;
    params.push(status);
  }

  if (source && source !== 'all') {
    paramCount++;
    query += ` AND lead_source = $${paramCount}`;
    params.push(source);
  }

  if (assignedTo && assignedTo !== 'all') {
    paramCount++;
    query += ` AND pre_sales_executive = $${paramCount}`;
    params.push(assignedTo);
  }

  if (search) {
    paramCount++;
    query += ` AND (
      client_name ILIKE $${paramCount} OR
      contact_email ILIKE $${paramCount} OR
      contact_phone ILIKE $${paramCount}
    )`;
    params.push(`%${search}%`);
  }

  // Get total count
  const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM');
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Add sorting and pagination
  query += ' ORDER BY created_at DESC';

  const offset = (Number(page) - 1) * Number(limit);
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  params.push(Number(limit));
  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await pool.query(query, params);

  res.json({
    data: result.rows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit))
  });
}));

// GET /api/sales/leads/:id - Get single lead
router.get('/leads/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await pool.query(`
    SELECT
      id, lead_id as "leadId", client_name as name, client_name as company,
      contact_email as email, contact_phone as phone, lead_source as source,
      COALESCE(lead_stage, status) as status, estimated_value as value,
      pre_sales_executive as "assignedTo", created_at as "createdAt",
      last_contact_date as "lastContact", priority, remarks, state,
      entity_type as "entityType", service_interested as "serviceInterested",
      interaction_history as "interactionHistory", next_followup_date as "nextFollowupDate"
    FROM leads WHERE id = $1
  `, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Lead not found');
  }

  res.json(result.rows[0]);
}));

// POST /api/sales/leads - Create new lead
router.post('/leads', asyncHandler(async (req: Request, res: Response) => {
  const {
    name, company, email, phone, source, notes,
    priority, estimatedValue, serviceInterested, state, entityType
  } = req.body;

  if (!name || !phone) {
    throw new ValidationError('Name and phone are required');
  }

  // Generate lead ID
  const countResult = await pool.query('SELECT COUNT(*) FROM leads');
  const leadNumber = parseInt(countResult.rows[0].count) + 1;
  const leadId = `L${String(leadNumber).padStart(4, '0')}`;

  const result = await pool.query(`
    INSERT INTO leads (
      lead_id, client_name, contact_email, contact_phone, lead_source,
      notes, priority, estimated_value, service_interested, state, entity_type,
      status, lead_stage, pre_sales_executive
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'new', 'new', $12)
    RETURNING
      id, lead_id as "leadId", client_name as name, contact_email as email,
      contact_phone as phone, lead_source as source, status, created_at as "createdAt"
  `, [
    leadId, company || name, email, phone, source || 'Website',
    notes, priority || 'medium', estimatedValue || null,
    serviceInterested || 'General Inquiry', state, entityType,
    req.user?.email || 'System'
  ]);

  res.status(201).json(result.rows[0]);
}));

// PATCH /api/sales/leads/:id - Update lead
router.patch('/leads/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  // Build dynamic update query
  const allowedFields: Record<string, string> = {
    name: 'client_name',
    company: 'client_name',
    email: 'contact_email',
    phone: 'contact_phone',
    source: 'lead_source',
    status: 'status',
    leadStage: 'lead_stage',
    priority: 'priority',
    estimatedValue: 'estimated_value',
    assignedTo: 'pre_sales_executive',
    remarks: 'remarks',
    notes: 'notes',
    nextFollowupDate: 'next_followup_date',
    serviceInterested: 'service_interested'
  };

  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 0;

  for (const [key, value] of Object.entries(updateData)) {
    if (allowedFields[key] && value !== undefined) {
      paramCount++;
      updates.push(`${allowedFields[key]} = $${paramCount}`);
      values.push(value);
    }
  }

  if (updates.length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  paramCount++;
  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(`
    UPDATE leads SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING id, lead_id as "leadId", client_name as name, status, updated_at as "updatedAt"
  `, values);

  if (result.rows.length === 0) {
    throw new NotFoundError('Lead not found');
  }

  res.json(result.rows[0]);
}));

// GET /api/sales/proposals - Get all proposals
router.get('/proposals', asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;

  let query = `
    SELECT
      sp.id, sp.lead_id as "leadId", l.client_name as client,
      sp.proposal_amount as value, sp.proposal_status as status,
      sp.created_at as "createdAt", sp.next_followup_date as "validUntil",
      sp.sales_executive as "createdBy", sp.required_services as services,
      l.service_interested as title
    FROM sales_proposals sp
    LEFT JOIN leads l ON sp.lead_id = l.lead_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && status !== 'all') {
    params.push(status);
    query += ` AND sp.proposal_status = $${params.length}`;
  }

  query += ' ORDER BY sp.created_at DESC';

  const result = await pool.query(query, params);
  res.json(result.rows);
}));

// POST /api/sales/proposals - Create proposal
router.post('/proposals', asyncHandler(async (req: Request, res: Response) => {
  const { leadId, amount, services, notes } = req.body;

  if (!leadId) {
    throw new ValidationError('Lead ID is required');
  }

  const result = await pool.query(`
    INSERT INTO sales_proposals (
      lead_id, sales_executive, proposal_amount, required_services,
      proposal_status, final_remark
    ) VALUES ($1, $2, $3, $4, 'draft', $5)
    RETURNING id, lead_id as "leadId", proposal_amount as value, proposal_status as status, created_at as "createdAt"
  `, [leadId, req.user?.email || 'System', amount || 0, JSON.stringify(services || []), notes]);

  res.status(201).json(result.rows[0]);
}));

// GET /api/sales/team - Get team performance data
router.get('/team', asyncHandler(async (req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT
      pre_sales_executive as name,
      'Sales Executive' as role,
      COUNT(*) as leads,
      COUNT(CASE WHEN status = 'converted' OR lead_stage = 'converted' THEN 1 END) as conversions,
      COALESCE(SUM(CASE WHEN status = 'converted' THEN estimated_value::numeric ELSE 0 END), 0) as revenue,
      500000 as target
    FROM leads
    WHERE pre_sales_executive IS NOT NULL
    GROUP BY pre_sales_executive
    ORDER BY revenue DESC
  `);

  res.json(result.rows.map((row, idx) => ({
    id: idx + 1,
    name: row.name || 'Unassigned',
    role: row.role,
    leads: parseInt(row.leads),
    conversions: parseInt(row.conversions),
    revenue: parseFloat(row.revenue) || 0,
    target: row.target
  })));
}));

// GET /api/sales/pipeline - Get pipeline stage breakdown
router.get('/pipeline', asyncHandler(async (req: Request, res: Response) => {
  const stages = [
    { key: 'new', label: 'New', color: 'bg-blue-500' },
    { key: 'contacted', label: 'Contacted', color: 'bg-purple-500' },
    { key: 'qualified', label: 'Qualified', color: 'bg-yellow-500' },
    { key: 'proposal', label: 'Proposal', color: 'bg-orange-500' },
    { key: 'negotiation', label: 'Negotiation', color: 'bg-pink-500' },
    { key: 'converted', label: 'Won', color: 'bg-green-500' },
    { key: 'lost', label: 'Lost', color: 'bg-red-500' }
  ];

  const pipeline = [];

  for (const stage of stages) {
    const result = await pool.query(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(estimated_value::numeric), 0) as value
      FROM leads
      WHERE COALESCE(lead_stage, status) = $1
    `, [stage.key]);

    const leadsResult = await pool.query(`
      SELECT
        id, lead_id as "leadId", client_name as name,
        estimated_value as value, priority
      FROM leads
      WHERE COALESCE(lead_stage, status) = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [stage.key]);

    pipeline.push({
      ...stage,
      count: parseInt(result.rows[0].count),
      value: parseFloat(result.rows[0].value) || 0,
      leads: leadsResult.rows
    });
  }

  res.json(pipeline);
}));

// GET /api/sales/metrics - Get sales metrics/KPIs
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  // Lead metrics
  const leadsResult = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN COALESCE(lead_stage, status) IN ('qualified', 'proposal', 'negotiation') THEN 1 END) as qualified,
      COUNT(CASE WHEN COALESCE(lead_stage, status) = 'converted' THEN 1 END) as won,
      COALESCE(SUM(CASE WHEN COALESCE(lead_stage, status) NOT IN ('converted', 'lost') THEN estimated_value::numeric ELSE 0 END), 0) as pipeline_value
    FROM leads
  `);

  const leads = leadsResult.rows[0];
  const totalLeads = parseInt(leads.total);
  const qualifiedLeads = parseInt(leads.qualified);
  const wonDeals = parseInt(leads.won);
  const pipelineValue = parseFloat(leads.pipeline_value) || 0;
  const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

  // Revenue from converted leads
  const revenueResult = await pool.query(`
    SELECT COALESCE(SUM(estimated_value::numeric), 0) as revenue
    FROM leads WHERE COALESCE(lead_stage, status) = 'converted'
  `);
  const totalRevenue = parseFloat(revenueResult.rows[0].revenue) || 0;

  // Team size
  const teamResult = await pool.query(`
    SELECT COUNT(DISTINCT pre_sales_executive) as count
    FROM leads WHERE pre_sales_executive IS NOT NULL
  `);
  const teamSize = parseInt(teamResult.rows[0].count) || 1;

  // Proposal metrics
  const proposalResult = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN proposal_status IN ('sent', 'viewed') THEN 1 END) as active,
      COALESCE(SUM(CASE WHEN proposal_status IN ('sent', 'viewed') THEN proposal_amount::numeric ELSE 0 END), 0) as value
    FROM sales_proposals
  `);
  const proposals = proposalResult.rows[0];
  const activeProposals = parseInt(proposals.active);
  const proposalValue = parseFloat(proposals.value) || 0;

  const totalTarget = teamSize * 500000; // Default target per team member

  res.json({
    totalLeads,
    qualifiedLeads,
    pipelineValue,
    wonDeals,
    conversionRate,
    totalRevenue,
    totalTarget,
    targetProgress: totalTarget > 0 ? Math.round((totalRevenue / totalTarget) * 100) : 0,
    activeProposals,
    proposalValue,
    teamSize,
    avgRevenuePerRep: teamSize > 0 ? Math.round(totalRevenue / teamSize) : 0
  });
}));

// GET /api/sales/forecasts - Get sales forecasts
router.get('/forecasts', asyncHandler(async (req: Request, res: Response) => {
  // Get pipeline leads with weighted forecast
  const pipelineResult = await pool.query(`
    SELECT
      COALESCE(lead_stage, status) as stage,
      COALESCE(estimated_value::numeric, 0) as value
    FROM leads
    WHERE COALESCE(lead_stage, status) NOT IN ('converted', 'lost')
  `);

  const stageProbabilities: Record<string, number> = {
    new: 0.10,
    contacted: 0.20,
    qualified: 0.40,
    proposal: 0.60,
    negotiation: 0.80
  };

  let weightedForecast = 0;
  let pipelineTotal = 0;

  for (const row of pipelineResult.rows) {
    const probability = stageProbabilities[row.stage] || 0.10;
    const value = parseFloat(row.value) || 0;
    weightedForecast += value * probability;
    pipelineTotal += value;
  }

  // Monthly forecast data
  const now = new Date();
  const monthlyData = [];

  for (let i = 0; i < 6; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const baseValue = 500000 + (i * 25000);

    monthlyData.push({
      month: month.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      forecast: Math.floor(weightedForecast / 6 * (1 + i * 0.05)),
      target: baseValue,
      actual: i === 0 ? Math.floor(weightedForecast * 0.3) : null
    });
  }

  res.json({
    weightedForecast: Math.round(weightedForecast),
    pipelineTotal: Math.round(pipelineTotal),
    pipelineCount: pipelineResult.rows.length,
    monthlyData,
    confidence: {
      low: Math.round(weightedForecast * 0.7),
      medium: Math.round(weightedForecast),
      high: Math.round(weightedForecast * 1.2)
    }
  });
}));

export default router;
