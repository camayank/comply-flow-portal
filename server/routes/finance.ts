/**
 * Finance Routes
 * API endpoints for Financial Management Dashboard
 *
 * Handles:
 * - Financial summary and KPIs
 * - Invoice management
 * - Revenue analytics
 * - Budget planning
 * - Collection metrics
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Mock data for development - replace with actual database queries
const generateFinancialData = () => {
  const baseDate = new Date();

  return {
    summary: {
      totalRevenue: 4250000,
      outstandingAmount: 875000,
      totalInvoices: 156,
      paidInvoices: 128,
      overdueInvoices: 12,
      avgCollectionDays: 28,
      monthlyGrowth: 8.5,
      clientCount: 42
    },
    kpis: {
      revenue: {
        current: 4250000,
        previous: 3920000,
        growth: 8.4
      },
      profitability: {
        grossProfit: 1700000,
        netProfit: 1020000,
        margin: 24.0
      },
      cashFlow: {
        receivables: 875000,
        payables: 320000,
        netCashFlow: 555000
      },
      clientMetrics: {
        avgRevenuePerClient: 101190,
        lifetimeValue: 485000,
        acquisitionCost: 25000
      }
    },
    collectionMetrics: {
      collectionRate: 87.5,
      avgCollectionDays: 28,
      onTimePayments: 78,
      latePayments: 22,
      disputedInvoices: 4,
      badDebtRatio: 1.2
    }
  };
};

const generateInvoices = () => {
  const statuses = ['paid', 'pending', 'overdue', 'draft'];
  const clients = [
    'Reliance Industries Ltd',
    'Tata Consultancy Services',
    'Infosys Limited',
    'Wipro Technologies',
    'HCL Technologies',
    'Mahindra & Mahindra',
    'Larsen & Toubro',
    'Bajaj Auto Ltd',
    'HDFC Bank',
    'ICICI Bank'
  ];

  const invoices = [];
  const baseDate = new Date();

  for (let i = 1; i <= 50; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const totalAmount = Math.floor(Math.random() * 500000) + 50000;
    const paidAmount = status === 'paid' ? totalAmount :
                       status === 'pending' ? Math.floor(totalAmount * 0.3) : 0;

    const invoiceDate = new Date(baseDate);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 60));

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    invoices.push({
      id: i,
      invoiceNumber: `INV-2026-${String(i).padStart(4, '0')}`,
      clientName: clients[Math.floor(Math.random() * clients.length)],
      totalAmount,
      paidAmount,
      outstandingAmount: totalAmount - paidAmount,
      status,
      paymentStatus: status === 'paid' ? 'completed' : status === 'overdue' ? 'overdue' : 'pending',
      dueDate: dueDate.toISOString().split('T')[0],
      invoiceDate: invoiceDate.toISOString().split('T')[0],
      services: [
        { name: 'GST Registration', amount: Math.floor(totalAmount * 0.3) },
        { name: 'Compliance Filing', amount: Math.floor(totalAmount * 0.5) },
        { name: 'Annual Return', amount: Math.floor(totalAmount * 0.2) }
      ]
    });
  }

  return invoices.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
};

const generateRevenueData = (dateRange: string, months: number = 12) => {
  const data = [];
  const baseDate = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setMonth(date.getMonth() - i);

    const baseRevenue = 350000 + Math.random() * 100000;
    const growth = 1 + (Math.random() * 0.1); // 0-10% growth

    data.push({
      period: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      revenue: Math.floor(baseRevenue * growth),
      target: Math.floor(baseRevenue * 1.15),
      expenses: Math.floor(baseRevenue * 0.6),
      profit: Math.floor(baseRevenue * 0.4)
    });
  }

  return data;
};

const generateBudgetPlans = () => {
  return [
    {
      id: 1,
      planName: 'Annual Revenue Target',
      fiscalYear: '2026-27',
      revenueTarget: 6000000,
      actualRevenue: 4250000,
      variance: -29.2,
      status: 'active',
      departments: [
        { name: 'Compliance Services', target: 2500000, actual: 1800000 },
        { name: 'GST Filing', target: 2000000, actual: 1500000 },
        { name: 'Advisory Services', target: 1500000, actual: 950000 }
      ]
    },
    {
      id: 2,
      planName: 'Q4 Target',
      fiscalYear: '2025-26',
      revenueTarget: 1500000,
      actualRevenue: 1380000,
      variance: -8.0,
      status: 'completed'
    },
    {
      id: 3,
      planName: 'Growth Initiative',
      fiscalYear: '2026-27',
      revenueTarget: 8000000,
      status: 'draft'
    }
  ];
};

// Financial summary endpoint
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const data = generateFinancialData();
    res.json(data.summary);
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
});

// Financial KPIs endpoint
router.get('/kpis', async (req: Request, res: Response) => {
  try {
    const { dateRange = 'monthly' } = req.query;
    const data = generateFinancialData();

    // Adjust KPIs based on date range if needed
    res.json(data.kpis);
  } catch (error) {
    console.error('Error fetching financial KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch financial KPIs' });
  }
});

// Invoices endpoint
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { status, paymentStatus, limit = 50 } = req.query;
    let invoices = generateInvoices();

    // Filter by status if provided
    if (status && status !== 'all') {
      invoices = invoices.filter(inv => inv.status === status);
    }

    // Filter by payment status if provided
    if (paymentStatus && paymentStatus !== 'all') {
      invoices = invoices.filter(inv => inv.paymentStatus === paymentStatus);
    }

    res.json(invoices.slice(0, Number(limit)));
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Single invoice endpoint
router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoices = generateInvoices();
    const invoice = invoices.find(inv => inv.id === Number(id) || inv.invoiceNumber === id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create invoice endpoint
router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const invoiceData = req.body;

    // Validate required fields
    if (!invoiceData.clientName || !invoiceData.totalAmount) {
      return res.status(400).json({ error: 'Client name and total amount are required' });
    }

    const newInvoice = {
      id: Date.now(),
      invoiceNumber: `INV-2026-${String(Date.now()).slice(-4)}`,
      ...invoiceData,
      status: 'draft',
      paymentStatus: 'pending',
      invoiceDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    res.status(201).json(newInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice endpoint
router.put('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // In a real implementation, update the database
    res.json({
      id: Number(id),
      ...updateData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Revenue analytics endpoint
router.get('/revenue', async (req: Request, res: Response) => {
  try {
    const { dateRange = 'monthly', months = 12 } = req.query;
    const data = generateRevenueData(dateRange as string, Number(months));
    res.json(data);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

// Budget plans endpoint
router.get('/budget-plans', async (req: Request, res: Response) => {
  try {
    const plans = generateBudgetPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error fetching budget plans:', error);
    res.status(500).json({ error: 'Failed to fetch budget plans' });
  }
});

// Create budget plan
router.post('/budget-plans', async (req: Request, res: Response) => {
  try {
    const planData = req.body;

    if (!planData.planName || !planData.fiscalYear || !planData.revenueTarget) {
      return res.status(400).json({ error: 'Plan name, fiscal year, and revenue target are required' });
    }

    const newPlan = {
      id: Date.now(),
      ...planData,
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    res.status(201).json(newPlan);
  } catch (error) {
    console.error('Error creating budget plan:', error);
    res.status(500).json({ error: 'Failed to create budget plan' });
  }
});

// Collection metrics endpoint
router.get('/collection-metrics', async (req: Request, res: Response) => {
  try {
    const data = generateFinancialData();
    res.json(data.collectionMetrics);
  } catch (error) {
    console.error('Error fetching collection metrics:', error);
    res.status(500).json({ error: 'Failed to fetch collection metrics' });
  }
});

// Aging report endpoint
router.get('/aging-report', async (req: Request, res: Response) => {
  try {
    const invoices = generateInvoices();
    const today = new Date();

    const agingBuckets = {
      current: { count: 0, amount: 0 },      // 0-30 days
      days30_60: { count: 0, amount: 0 },    // 31-60 days
      days60_90: { count: 0, amount: 0 },    // 61-90 days
      over90: { count: 0, amount: 0 }        // 90+ days
    };

    invoices.filter(inv => inv.status !== 'paid').forEach(inv => {
      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 30) {
        agingBuckets.current.count++;
        agingBuckets.current.amount += inv.outstandingAmount;
      } else if (daysOverdue <= 60) {
        agingBuckets.days30_60.count++;
        agingBuckets.days30_60.amount += inv.outstandingAmount;
      } else if (daysOverdue <= 90) {
        agingBuckets.days60_90.count++;
        agingBuckets.days60_90.amount += inv.outstandingAmount;
      } else {
        agingBuckets.over90.count++;
        agingBuckets.over90.amount += inv.outstandingAmount;
      }
    });

    res.json(agingBuckets);
  } catch (error) {
    console.error('Error generating aging report:', error);
    res.status(500).json({ error: 'Failed to generate aging report' });
  }
});

// Client revenue breakdown endpoint
router.get('/client-revenue', async (req: Request, res: Response) => {
  try {
    const invoices = generateInvoices();

    // Aggregate revenue by client
    const clientRevenue: Record<string, { client: string; revenue: number; invoiceCount: number }> = {};

    invoices.forEach(inv => {
      if (!clientRevenue[inv.clientName]) {
        clientRevenue[inv.clientName] = {
          client: inv.clientName,
          revenue: 0,
          invoiceCount: 0
        };
      }
      clientRevenue[inv.clientName].revenue += inv.totalAmount;
      clientRevenue[inv.clientName].invoiceCount++;
    });

    const result = Object.values(clientRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json(result);
  } catch (error) {
    console.error('Error fetching client revenue:', error);
    res.status(500).json({ error: 'Failed to fetch client revenue' });
  }
});

export default router;
