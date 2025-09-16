import { Router } from 'express';
import { storage } from './storage';

const router = Router();

// ============================================================================
// FINANCIAL MANAGEMENT ROUTES
// ============================================================================

// Invoice Management Routes
router.get('/invoices', async (req, res) => {
  try {
    const { clientId, status, paymentStatus, dateFrom, dateTo, overdue, limit = 50, offset = 0 } = req.query;
    
    const filters = {
      clientId: clientId ? Number(clientId) : undefined,
      status: status as string,
      paymentStatus: paymentStatus as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      overdue: overdue === 'true',
      limit: Number(limit),
      offset: Number(offset)
    };
    
    const result = await storage.getAllInvoices(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await storage.getInvoice(Number(req.params.id));
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/invoices/number/:invoiceNumber', async (req, res) => {
  try {
    const invoice = await storage.getInvoiceByNumber(req.params.invoiceNumber);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice by number:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/invoices', async (req, res) => {
  try {
    const invoice = await storage.createInvoice(req.body);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/invoices/:id', async (req, res) => {
  try {
    const invoice = await storage.updateInvoice(Number(req.params.id), req.body);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/invoices/:id', async (req, res) => {
  try {
    const deleted = await storage.deleteInvoice(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/invoices/client/:clientId', async (req, res) => {
  try {
    const invoices = await storage.getInvoicesByClient(Number(req.params.clientId));
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching client invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/invoices/overdue', async (req, res) => {
  try {
    const invoices = await storage.getOverdueInvoices();
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching overdue invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/invoices/:id/mark-paid', async (req, res) => {
  try {
    const { paidAmount, paymentMethod, paymentReference } = req.body;
    const paymentDetails = {
      paidAmount,
      paymentMethod,
      paymentReference,
      paidAt: new Date()
    };
    
    const invoice = await storage.markInvoiceAsPaid(Number(req.params.id), paymentDetails);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Financial Analytics Routes
router.get('/analytics/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const { dateFrom, dateTo } = req.query;
    
    const analytics = await storage.getFinancialAnalytics(
      period,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/analytics', async (req, res) => {
  try {
    const analytics = await storage.createFinancialAnalytics(req.body);
    res.status(201).json(analytics);
  } catch (error) {
    console.error('Error creating financial analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const summary = await storage.getFinancialSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/revenue/:period/:months', async (req, res) => {
  try {
    const { period, months } = req.params;
    const revenue = await storage.getRevenueByPeriod(
      period as 'daily' | 'weekly' | 'monthly' | 'quarterly',
      Number(months)
    );
    res.json(revenue);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Budget and Forecasting Routes
router.get('/budget-plans', async (req, res) => {
  try {
    const { fiscalYear, planType, status, limit = 50, offset = 0 } = req.query;
    
    const filters = {
      fiscalYear: fiscalYear as string,
      planType: planType as string,
      status: status as string,
      limit: Number(limit),
      offset: Number(offset)
    };
    
    const result = await storage.getAllBudgetPlans(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching budget plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/budget-plans/:id', async (req, res) => {
  try {
    const plan = await storage.getBudgetPlan(Number(req.params.id));
    if (!plan) {
      return res.status(404).json({ error: 'Budget plan not found' });
    }
    res.json(plan);
  } catch (error) {
    console.error('Error fetching budget plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/budget-plans', async (req, res) => {
  try {
    const plan = await storage.createBudgetPlan(req.body);
    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating budget plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/budget-plans/:id', async (req, res) => {
  try {
    const plan = await storage.updateBudgetPlan(Number(req.params.id), req.body);
    if (!plan) {
      return res.status(404).json({ error: 'Budget plan not found' });
    }
    res.json(plan);
  } catch (error) {
    console.error('Error updating budget plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/budget-plans/year/:fiscalYear', async (req, res) => {
  try {
    const plan = await storage.getBudgetPlanByYear(req.params.fiscalYear);
    if (!plan) {
      return res.status(404).json({ error: 'Budget plan not found for this fiscal year' });
    }
    res.json(plan);
  } catch (error) {
    console.error('Error fetching budget plan by year:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/budget-plans/:id/vs-actual', async (req, res) => {
  try {
    const comparison = await storage.getBudgetVsActual(Number(req.params.id));
    res.json(comparison);
  } catch (error) {
    console.error('Error fetching budget vs actual:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Financial KPIs and Metrics Routes
router.get('/kpis', async (req, res) => {
  try {
    const { period } = req.query;
    const kpis = await storage.getFinancialKPIs(period as string);
    res.json(kpis);
  } catch (error) {
    console.error('Error fetching financial KPIs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/collection-metrics', async (req, res) => {
  try {
    const metrics = await storage.getCollectionMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching collection metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;