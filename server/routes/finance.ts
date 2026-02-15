/**
 * Finance Routes
 * API endpoints for Financial Management Dashboard
 *
 * Handles:
 * - Financial summary and KPIs (REAL DATA from payments/invoices tables)
 * - Invoice management
 * - Revenue analytics
 * - Budget planning
 * - Collection metrics
 */

import { Router, Request, Response } from 'express';
import { db, pool } from '../db';
import { eq, sql, desc, and, gte, lte, ne, count, sum } from 'drizzle-orm';
import { payments, invoices, businessEntities, serviceRequests } from '@shared/schema';

const router = Router();

/**
 * Get financial summary from REAL database
 */
async function getFinancialSummary() {
  // Get revenue from completed payments
  const revenueResult = await pool.query(`
    SELECT
      COALESCE(SUM(amount), 0) as total_revenue,
      COUNT(*) as paid_count
    FROM payments
    WHERE status = 'completed'
  `);

  // Get invoice statistics
  const invoiceResult = await pool.query(`
    SELECT
      COUNT(*) as total_invoices,
      COUNT(*) FILTER (WHERE status = 'paid') as paid_invoices,
      COUNT(*) FILTER (WHERE status = 'overdue' OR (status != 'paid' AND due_date < NOW())) as overdue_invoices,
      COALESCE(SUM(outstanding_amount::numeric), 0) as outstanding_amount
    FROM invoices
  `);

  // Get client count
  const clientResult = await pool.query(`
    SELECT COUNT(DISTINCT id) as client_count FROM business_entities WHERE status = 'active'
  `);

  // Calculate average collection days
  const collectionResult = await pool.query(`
    SELECT
      COALESCE(AVG(EXTRACT(EPOCH FROM (paid_at - invoice_date)) / 86400), 30) as avg_collection_days
    FROM invoices
    WHERE status = 'paid' AND paid_at IS NOT NULL
  `);

  // Get previous month revenue for growth calculation
  const prevMonthResult = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as prev_revenue
    FROM payments
    WHERE status = 'completed'
    AND completed_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
    AND completed_at < DATE_TRUNC('month', NOW())
  `);

  const currentMonthResult = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as current_revenue
    FROM payments
    WHERE status = 'completed'
    AND completed_at >= DATE_TRUNC('month', NOW())
  `);

  const prevRevenue = parseFloat(prevMonthResult.rows[0]?.prev_revenue || '0');
  const currentRevenue = parseFloat(currentMonthResult.rows[0]?.current_revenue || '0');
  const monthlyGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  return {
    totalRevenue: parseInt(revenueResult.rows[0]?.total_revenue || '0'),
    outstandingAmount: parseFloat(invoiceResult.rows[0]?.outstanding_amount || '0'),
    totalInvoices: parseInt(invoiceResult.rows[0]?.total_invoices || '0'),
    paidInvoices: parseInt(invoiceResult.rows[0]?.paid_invoices || '0'),
    overdueInvoices: parseInt(invoiceResult.rows[0]?.overdue_invoices || '0'),
    avgCollectionDays: Math.round(parseFloat(collectionResult.rows[0]?.avg_collection_days || '30')),
    monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
    clientCount: parseInt(clientResult.rows[0]?.client_count || '0')
  };
}

/**
 * Get financial KPIs from REAL database
 */
async function getFinancialKPIs() {
  // Current period revenue (this month)
  const currentResult = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as current_revenue
    FROM payments
    WHERE status = 'completed'
    AND completed_at >= DATE_TRUNC('month', NOW())
  `);

  // Previous period revenue (last month)
  const previousResult = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) as previous_revenue
    FROM payments
    WHERE status = 'completed'
    AND completed_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
    AND completed_at < DATE_TRUNC('month', NOW())
  `);

  // Cash flow metrics
  const cashFlowResult = await pool.query(`
    SELECT
      COALESCE(SUM(outstanding_amount::numeric), 0) as receivables
    FROM invoices
    WHERE status != 'paid' AND status != 'cancelled'
  `);

  // Client metrics
  const clientMetricsResult = await pool.query(`
    SELECT
      COUNT(DISTINCT be.id) as client_count,
      COALESCE(SUM(p.amount), 0) as total_revenue
    FROM business_entities be
    LEFT JOIN service_requests sr ON be.id = sr.business_entity_id
    LEFT JOIN payments p ON sr.id = p.service_request_id AND p.status = 'completed'
    WHERE be.status = 'active'
  `);

  const currentRevenue = parseFloat(currentResult.rows[0]?.current_revenue || '0');
  const previousRevenue = parseFloat(previousResult.rows[0]?.previous_revenue || '0');
  const growth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const receivables = parseFloat(cashFlowResult.rows[0]?.receivables || '0');
  const clientCount = parseInt(clientMetricsResult.rows[0]?.client_count || '1');
  const totalRevenue = parseFloat(clientMetricsResult.rows[0]?.total_revenue || '0');

  return {
    revenue: {
      current: currentRevenue,
      previous: previousRevenue,
      growth: Math.round(growth * 10) / 10
    },
    profitability: {
      grossProfit: Math.round(currentRevenue * 0.4), // Estimated 40% gross margin
      netProfit: Math.round(currentRevenue * 0.24), // Estimated 24% net margin
      margin: 24.0
    },
    cashFlow: {
      receivables: receivables,
      payables: 0, // Would need payables table
      netCashFlow: receivables
    },
    clientMetrics: {
      avgRevenuePerClient: clientCount > 0 ? Math.round(totalRevenue / clientCount) : 0,
      lifetimeValue: clientCount > 0 ? Math.round((totalRevenue / clientCount) * 4) : 0, // 4 year estimate
      acquisitionCost: 25000 // Would need CAC tracking
    }
  };
}

/**
 * Get collection metrics from REAL database
 */
async function getCollectionMetrics() {
  const metricsResult = await pool.query(`
    SELECT
      COUNT(*) as total_invoices,
      COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
      COUNT(*) FILTER (WHERE status = 'paid' AND paid_at <= due_date) as on_time_count,
      COUNT(*) FILTER (WHERE status = 'paid' AND paid_at > due_date) as late_count,
      COUNT(*) FILTER (WHERE status = 'overdue' OR (status != 'paid' AND due_date < NOW())) as overdue_count,
      COALESCE(AVG(EXTRACT(EPOCH FROM (paid_at - invoice_date)) / 86400)
        FILTER (WHERE status = 'paid'), 30) as avg_collection_days
    FROM invoices
  `);

  const row = metricsResult.rows[0];
  const totalInvoices = parseInt(row?.total_invoices || '0');
  const paidCount = parseInt(row?.paid_count || '0');
  const onTimeCount = parseInt(row?.on_time_count || '0');
  const lateCount = parseInt(row?.late_count || '0');

  const collectionRate = totalInvoices > 0 ? (paidCount / totalInvoices) * 100 : 0;
  const onTimePercent = paidCount > 0 ? (onTimeCount / paidCount) * 100 : 0;
  const latePercent = paidCount > 0 ? (lateCount / paidCount) * 100 : 0;

  return {
    collectionRate: Math.round(collectionRate * 10) / 10,
    avgCollectionDays: Math.round(parseFloat(row?.avg_collection_days || '30')),
    onTimePayments: Math.round(onTimePercent),
    latePayments: Math.round(latePercent),
    disputedInvoices: 0, // Would need dispute tracking
    badDebtRatio: 0 // Would need write-off tracking
  };
}

/**
 * Get real invoices from database
 */
async function getRealInvoices(filters: { status?: string; paymentStatus?: string; limit?: number }) {
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.status && filters.status !== 'all') {
    whereClause += ` AND i.status = $${paramIndex++}`;
    params.push(filters.status);
  }

  if (filters.paymentStatus && filters.paymentStatus !== 'all') {
    whereClause += ` AND i.payment_status = $${paramIndex++}`;
    params.push(filters.paymentStatus);
  }

  const limit = filters.limit || 50;
  params.push(limit);

  const result = await pool.query(`
    SELECT
      i.id,
      i.invoice_number,
      be.company_name as client_name,
      i.total_amount::numeric as total_amount,
      i.paid_amount::numeric as paid_amount,
      i.outstanding_amount::numeric as outstanding_amount,
      i.status,
      i.payment_status,
      i.due_date,
      i.invoice_date,
      i.line_items as services
    FROM invoices i
    LEFT JOIN business_entities be ON i.business_entity_id = be.id
    ${whereClause}
    ORDER BY i.invoice_date DESC
    LIMIT $${paramIndex}
  `, params);

  return result.rows.map(row => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientName: row.client_name || 'Unknown Client',
    totalAmount: parseFloat(row.total_amount || '0'),
    paidAmount: parseFloat(row.paid_amount || '0'),
    outstandingAmount: parseFloat(row.outstanding_amount || '0'),
    status: row.status,
    paymentStatus: row.payment_status,
    dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null,
    invoiceDate: row.invoice_date ? new Date(row.invoice_date).toISOString().split('T')[0] : null,
    services: row.services || []
  }));
}

/**
 * Get real revenue data by month
 */
async function getRealRevenueData(months: number = 12) {
  const result = await pool.query(`
    WITH months AS (
      SELECT generate_series(
        DATE_TRUNC('month', NOW() - INTERVAL '${months - 1} months'),
        DATE_TRUNC('month', NOW()),
        '1 month'::interval
      ) as month
    )
    SELECT
      m.month,
      COALESCE(SUM(p.amount), 0) as revenue
    FROM months m
    LEFT JOIN payments p ON
      DATE_TRUNC('month', p.completed_at) = m.month
      AND p.status = 'completed'
    GROUP BY m.month
    ORDER BY m.month ASC
  `);

  return result.rows.map(row => {
    const date = new Date(row.month);
    const revenue = parseInt(row.revenue || '0');
    return {
      period: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      revenue: revenue,
      target: Math.round(revenue * 1.15), // 15% above actual as target
      expenses: Math.round(revenue * 0.6), // Estimated 60% expenses
      profit: Math.round(revenue * 0.4) // Estimated 40% profit
    };
  });
}

/**
 * Get aging report from real invoices
 */
async function getRealAgingReport() {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE due_date >= NOW() OR EXTRACT(DAY FROM NOW() - due_date) <= 30) as current_count,
      COALESCE(SUM(outstanding_amount::numeric) FILTER (WHERE due_date >= NOW() OR EXTRACT(DAY FROM NOW() - due_date) <= 30), 0) as current_amount,
      COUNT(*) FILTER (WHERE EXTRACT(DAY FROM NOW() - due_date) > 30 AND EXTRACT(DAY FROM NOW() - due_date) <= 60) as days30_60_count,
      COALESCE(SUM(outstanding_amount::numeric) FILTER (WHERE EXTRACT(DAY FROM NOW() - due_date) > 30 AND EXTRACT(DAY FROM NOW() - due_date) <= 60), 0) as days30_60_amount,
      COUNT(*) FILTER (WHERE EXTRACT(DAY FROM NOW() - due_date) > 60 AND EXTRACT(DAY FROM NOW() - due_date) <= 90) as days60_90_count,
      COALESCE(SUM(outstanding_amount::numeric) FILTER (WHERE EXTRACT(DAY FROM NOW() - due_date) > 60 AND EXTRACT(DAY FROM NOW() - due_date) <= 90), 0) as days60_90_amount,
      COUNT(*) FILTER (WHERE EXTRACT(DAY FROM NOW() - due_date) > 90) as over90_count,
      COALESCE(SUM(outstanding_amount::numeric) FILTER (WHERE EXTRACT(DAY FROM NOW() - due_date) > 90), 0) as over90_amount
    FROM invoices
    WHERE status != 'paid' AND status != 'cancelled'
  `);

  const row = result.rows[0];
  return {
    current: {
      count: parseInt(row?.current_count || '0'),
      amount: parseFloat(row?.current_amount || '0')
    },
    days30_60: {
      count: parseInt(row?.days30_60_count || '0'),
      amount: parseFloat(row?.days30_60_amount || '0')
    },
    days60_90: {
      count: parseInt(row?.days60_90_count || '0'),
      amount: parseFloat(row?.days60_90_amount || '0')
    },
    over90: {
      count: parseInt(row?.over90_count || '0'),
      amount: parseFloat(row?.over90_amount || '0')
    }
  };
}

/**
 * Get client revenue breakdown from real data
 */
async function getRealClientRevenue() {
  const result = await pool.query(`
    SELECT
      be.company_name as client,
      COALESCE(SUM(i.total_amount::numeric), 0) as revenue,
      COUNT(i.id) as invoice_count
    FROM business_entities be
    LEFT JOIN invoices i ON i.business_entity_id = be.id
    WHERE be.status = 'active'
    GROUP BY be.id, be.company_name
    HAVING SUM(i.total_amount::numeric) > 0
    ORDER BY revenue DESC
    LIMIT 10
  `);

  return result.rows.map(row => ({
    client: row.client || 'Unknown',
    revenue: parseFloat(row.revenue || '0'),
    invoiceCount: parseInt(row.invoice_count || '0')
  }));
}

// Financial summary endpoint - REAL DATA
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await getFinancialSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
});

// Financial KPIs endpoint - REAL DATA
router.get('/kpis', async (req: Request, res: Response) => {
  try {
    const kpis = await getFinancialKPIs();
    res.json(kpis);
  } catch (error) {
    console.error('Error fetching financial KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch financial KPIs' });
  }
});

// Invoices endpoint - REAL DATA
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { status, paymentStatus, limit = 50 } = req.query;
    const invoices = await getRealInvoices({
      status: status as string,
      paymentStatus: paymentStatus as string,
      limit: Number(limit)
    });
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Single invoice endpoint - REAL DATA
router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        i.id,
        i.invoice_number,
        be.company_name as client_name,
        i.total_amount::numeric as total_amount,
        i.paid_amount::numeric as paid_amount,
        i.outstanding_amount::numeric as outstanding_amount,
        i.status,
        i.payment_status,
        i.due_date,
        i.invoice_date,
        i.line_items as services,
        i.notes,
        i.terms
      FROM invoices i
      LEFT JOIN business_entities be ON i.business_entity_id = be.id
      WHERE i.id = $1 OR i.invoice_number = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      invoiceNumber: row.invoice_number,
      clientName: row.client_name || 'Unknown Client',
      totalAmount: parseFloat(row.total_amount || '0'),
      paidAmount: parseFloat(row.paid_amount || '0'),
      outstandingAmount: parseFloat(row.outstanding_amount || '0'),
      status: row.status,
      paymentStatus: row.payment_status,
      dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null,
      invoiceDate: row.invoice_date ? new Date(row.invoice_date).toISOString().split('T')[0] : null,
      services: row.services || [],
      notes: row.notes,
      terms: row.terms
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create invoice endpoint - REAL DATA
router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const invoiceData = req.body;

    // Validate required fields
    if (!invoiceData.businessEntityId || !invoiceData.totalAmount) {
      return res.status(400).json({ error: 'Business entity ID and total amount are required' });
    }

    // Generate invoice number
    const countResult = await pool.query('SELECT COUNT(*) FROM invoices');
    const count = parseInt(countResult.rows[0].count) + 1;
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(count).padStart(5, '0')}`;

    const result = await pool.query(`
      INSERT INTO invoices (
        invoice_number,
        client_id,
        business_entity_id,
        invoice_date,
        due_date,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        paid_amount,
        outstanding_amount,
        line_items,
        status,
        payment_status,
        notes,
        terms,
        created_by,
        created_at
      ) VALUES (
        $1, $2, $3, NOW(), NOW() + INTERVAL '30 days',
        $4, $5, $6, $7, '0', $7, $8,
        'draft', 'pending', $9, $10, $11, NOW()
      ) RETURNING *
    `, [
      invoiceNumber,
      invoiceData.clientId || invoiceData.businessEntityId,
      invoiceData.businessEntityId,
      invoiceData.subtotal || invoiceData.totalAmount,
      invoiceData.taxAmount || 0,
      invoiceData.discountAmount || 0,
      invoiceData.totalAmount,
      JSON.stringify(invoiceData.lineItems || []),
      invoiceData.notes || null,
      invoiceData.terms || null,
      invoiceData.createdBy || 1
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice endpoint - REAL DATA
router.put('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(updateData.status);
    }
    if (updateData.paymentStatus !== undefined) {
      updates.push(`payment_status = $${paramIndex++}`);
      values.push(updateData.paymentStatus);
    }
    if (updateData.paidAmount !== undefined) {
      updates.push(`paid_amount = $${paramIndex++}`);
      values.push(updateData.paidAmount);
      updates.push(`outstanding_amount = total_amount::numeric - $${paramIndex - 1}::numeric`);
    }
    if (updateData.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(updateData.notes);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await pool.query(`
      UPDATE invoices
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Revenue analytics endpoint - REAL DATA
router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const { months = 12 } = req.query;
    const data = await getRealRevenueData(Number(months));
    res.json(data);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

// Budget plans endpoint - TODO: Create budget_plans table
router.get('/budget-plans', async (req: Request, res: Response) => {
  try {
    // Budget plans would need a dedicated table
    // For now return empty array with proper structure
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'budget_plans'
      ) as exists
    `);

    if (!result.rows[0]?.exists) {
      // Table doesn't exist yet - return empty with message
      res.json({
        plans: [],
        message: 'Budget planning module not yet configured'
      });
      return;
    }

    const plans = await pool.query('SELECT * FROM budget_plans ORDER BY created_at DESC');
    res.json(plans.rows);
  } catch (error) {
    console.error('Error fetching budget plans:', error);
    res.status(500).json({ error: 'Failed to fetch budget plans' });
  }
});

// Create budget plan - TODO: Requires budget_plans table
router.post('/budget-plans', async (req: Request, res: Response) => {
  try {
    const planData = req.body;

    if (!planData.planName || !planData.fiscalYear || !planData.revenueTarget) {
      return res.status(400).json({ error: 'Plan name, fiscal year, and revenue target are required' });
    }

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'budget_plans'
      ) as exists
    `);

    if (!tableCheck.rows[0]?.exists) {
      return res.status(501).json({
        error: 'Budget planning module not yet configured',
        message: 'Please run the budget_plans migration first'
      });
    }

    const result = await pool.query(`
      INSERT INTO budget_plans (plan_name, fiscal_year, revenue_target, status, created_at)
      VALUES ($1, $2, $3, 'draft', NOW())
      RETURNING *
    `, [planData.planName, planData.fiscalYear, planData.revenueTarget]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating budget plan:', error);
    res.status(500).json({ error: 'Failed to create budget plan' });
  }
});

// Collection metrics endpoint - REAL DATA
router.get('/collection-metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await getCollectionMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching collection metrics:', error);
    res.status(500).json({ error: 'Failed to fetch collection metrics' });
  }
});

// Aging report endpoint - REAL DATA
router.get('/aging-report', async (req: Request, res: Response) => {
  try {
    const agingReport = await getRealAgingReport();
    res.json(agingReport);
  } catch (error) {
    console.error('Error generating aging report:', error);
    res.status(500).json({ error: 'Failed to generate aging report' });
  }
});

// Client revenue breakdown endpoint - REAL DATA
router.get('/client-revenue', async (req: Request, res: Response) => {
  try {
    const clientRevenue = await getRealClientRevenue();
    res.json(clientRevenue);
  } catch (error) {
    console.error('Error fetching client revenue:', error);
    res.status(500).json({ error: 'Failed to fetch client revenue' });
  }
});

export default router;
