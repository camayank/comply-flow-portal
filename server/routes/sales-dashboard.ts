/**
 * Sales Dashboard Routes
 * Comprehensive API endpoints for Sales Dashboard data
 *
 * Provides:
 * - Pipeline overview and stage breakdown
 * - Lead management with filtering
 * - Team performance metrics
 * - Proposal tracking
 * - Targets and forecasts
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Generate realistic sales data
const generateLeads = () => {
  const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const sources = ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Event', 'Advertisement', 'Partner'];
  const companies = [
    'Tech Solutions Pvt Ltd', 'StartupXYZ', 'Global Traders', 'FinServ India',
    'Manufacturing Co', 'Retail Corp', 'Healthcare Plus', 'EduTech Systems',
    'Logistics Hub', 'AgriTech India', 'E-commerce Ventures', 'Media House'
  ];
  const executives = ['Rahul Verma', 'Anita Desai', 'Suresh Nair', 'Priya Sharma'];

  const leads = [];
  const baseDate = new Date();

  for (let i = 1; i <= 50; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const createdDate = new Date(baseDate);
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 60));

    const lastContactDate = new Date(createdDate);
    lastContactDate.setDate(lastContactDate.getDate() + Math.floor(Math.random() * 14));

    leads.push({
      id: i,
      name: ['Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Neha', 'Arun', 'Kavita'][i % 8] + ' ' +
            ['Kumar', 'Sharma', 'Patel', 'Gupta', 'Singh', 'Reddy', 'Nair', 'Iyer'][i % 8],
      company: companies[i % companies.length],
      email: `contact${i}@${companies[i % companies.length].toLowerCase().replace(/\s+/g, '')}.com`,
      phone: `+91 ${90000 + Math.floor(Math.random() * 9999)} ${10000 + Math.floor(Math.random() * 89999)}`,
      source: sources[Math.floor(Math.random() * sources.length)],
      status,
      value: Math.floor(Math.random() * 500000) + 50000,
      assignedTo: executives[Math.floor(Math.random() * executives.length)],
      createdAt: createdDate.toISOString().split('T')[0],
      lastContact: lastContactDate.toISOString().split('T')[0]
    });
  }

  return leads;
};

const generateProposals = () => {
  const statuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected'];
  const proposals = [];
  const baseDate = new Date();

  const proposalTitles = [
    'Annual Compliance Package',
    'Company Registration + GST',
    'Full Service Retainership',
    'GST Filing Package',
    'Tax Audit Package',
    'ROC Filing Annual',
    'Payroll Compliance',
    'Legal Documentation'
  ];

  for (let i = 1; i <= 20; i++) {
    const createdDate = new Date(baseDate);
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));

    const validUntilDate = new Date(createdDate);
    validUntilDate.setDate(validUntilDate.getDate() + 30);

    proposals.push({
      id: i,
      title: proposalTitles[i % proposalTitles.length],
      client: ['Tech Solutions', 'StartupXYZ', 'FinServ India', 'Global Traders', 'Manufacturing Co'][i % 5],
      value: Math.floor(Math.random() * 300000) + 30000,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: createdDate.toISOString().split('T')[0],
      validUntil: validUntilDate.toISOString().split('T')[0]
    });
  }

  return proposals;
};

const generateTeamMembers = () => {
  return [
    {
      id: 1,
      name: 'Rahul Verma',
      role: 'Sales Executive',
      leads: Math.floor(Math.random() * 20) + 15,
      conversions: Math.floor(Math.random() * 10) + 5,
      revenue: Math.floor(Math.random() * 400000) + 300000,
      target: 500000
    },
    {
      id: 2,
      name: 'Anita Desai',
      role: 'Sales Executive',
      leads: Math.floor(Math.random() * 25) + 20,
      conversions: Math.floor(Math.random() * 12) + 8,
      revenue: Math.floor(Math.random() * 500000) + 400000,
      target: 600000
    },
    {
      id: 3,
      name: 'Suresh Nair',
      role: 'Sales Executive',
      leads: Math.floor(Math.random() * 15) + 10,
      conversions: Math.floor(Math.random() * 6) + 3,
      revenue: Math.floor(Math.random() * 250000) + 150000,
      target: 400000
    },
    {
      id: 4,
      name: 'Priya Sharma',
      role: 'Senior Sales Executive',
      leads: Math.floor(Math.random() * 30) + 25,
      conversions: Math.floor(Math.random() * 15) + 10,
      revenue: Math.floor(Math.random() * 600000) + 500000,
      target: 750000
    }
  ];
};

// GET /api/sales/leads - Get all leads with optional filtering
router.get('/leads', async (req: Request, res: Response) => {
  try {
    const { status, source, assignedTo, search, page = 1, limit = 20 } = req.query;
    let leads = generateLeads();

    // Apply filters
    if (status && status !== 'all') {
      leads = leads.filter(lead => lead.status === status);
    }

    if (source && source !== 'all') {
      leads = leads.filter(lead => lead.source === source);
    }

    if (assignedTo && assignedTo !== 'all') {
      leads = leads.filter(lead => lead.assignedTo === assignedTo);
    }

    if (search) {
      const searchLower = (search as string).toLowerCase();
      leads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchLower) ||
        lead.company.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower)
      );
    }

    // Sort by created date (most recent first)
    leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginatedLeads = leads.slice(startIndex, startIndex + Number(limit));

    res.json({
      data: paginatedLeads,
      total: leads.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(leads.length / Number(limit))
    });
  } catch (error) {
    console.error('Error fetching sales leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/sales/leads/:id - Get single lead
router.get('/leads/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const leads = generateLeads();
    const lead = leads.find(l => l.id === Number(id));

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST /api/sales/leads - Create new lead
router.post('/leads', async (req: Request, res: Response) => {
  try {
    const leadData = req.body;

    if (!leadData.name || !leadData.company || !leadData.email) {
      return res.status(400).json({ error: 'Name, company, and email are required' });
    }

    const newLead = {
      id: Date.now(),
      ...leadData,
      status: 'new',
      createdAt: new Date().toISOString().split('T')[0],
      lastContact: new Date().toISOString().split('T')[0]
    };

    res.status(201).json(newLead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PATCH /api/sales/leads/:id - Update lead
router.patch('/leads/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    res.json({
      id: Number(id),
      ...updateData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// GET /api/sales/proposals - Get all proposals
router.get('/proposals', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let proposals = generateProposals();

    if (status && status !== 'all') {
      proposals = proposals.filter(p => p.status === status);
    }

    res.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// POST /api/sales/proposals - Create proposal
router.post('/proposals', async (req: Request, res: Response) => {
  try {
    const proposalData = req.body;

    const newProposal = {
      id: Date.now(),
      ...proposalData,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    res.status(201).json(newProposal);
  } catch (error) {
    console.error('Error creating proposal:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// GET /api/sales/team - Get team performance data
router.get('/team', async (req: Request, res: Response) => {
  try {
    const team = generateTeamMembers();
    res.json(team);
  } catch (error) {
    console.error('Error fetching team data:', error);
    res.status(500).json({ error: 'Failed to fetch team data' });
  }
});

// GET /api/sales/pipeline - Get pipeline stage breakdown
router.get('/pipeline', async (req: Request, res: Response) => {
  try {
    const leads = generateLeads();

    const stages = [
      { key: 'new', label: 'New', color: 'bg-blue-500' },
      { key: 'contacted', label: 'Contacted', color: 'bg-purple-500' },
      { key: 'qualified', label: 'Qualified', color: 'bg-yellow-500' },
      { key: 'proposal', label: 'Proposal', color: 'bg-orange-500' },
      { key: 'negotiation', label: 'Negotiation', color: 'bg-pink-500' },
      { key: 'won', label: 'Won', color: 'bg-green-500' },
      { key: 'lost', label: 'Lost', color: 'bg-red-500' }
    ];

    const pipeline = stages.map(stage => {
      const stageLeads = leads.filter(l => l.status === stage.key);
      return {
        ...stage,
        count: stageLeads.length,
        value: stageLeads.reduce((sum, l) => sum + l.value, 0),
        leads: stageLeads.slice(0, 5) // Top 5 leads per stage
      };
    });

    res.json(pipeline);
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

// GET /api/sales/metrics - Get sales metrics/KPIs
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const leads = generateLeads();
    const proposals = generateProposals();
    const team = generateTeamMembers();

    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter(l => ['qualified', 'proposal', 'negotiation'].includes(l.status)).length;
    const pipelineValue = leads.filter(l => !['won', 'lost'].includes(l.status)).reduce((sum, l) => sum + l.value, 0);
    const wonDeals = leads.filter(l => l.status === 'won').length;
    const conversionRate = totalLeads > 0 ? Math.round((wonDeals / totalLeads) * 100) : 0;

    const totalRevenue = team.reduce((sum, m) => sum + m.revenue, 0);
    const totalTarget = team.reduce((sum, m) => sum + m.target, 0);
    const targetProgress = totalTarget > 0 ? Math.round((totalRevenue / totalTarget) * 100) : 0;

    const activeProposals = proposals.filter(p => ['sent', 'viewed'].includes(p.status)).length;
    const proposalValue = proposals.filter(p => ['sent', 'viewed'].includes(p.status))
      .reduce((sum, p) => sum + p.value, 0);

    res.json({
      totalLeads,
      qualifiedLeads,
      pipelineValue,
      wonDeals,
      conversionRate,
      totalRevenue,
      totalTarget,
      targetProgress,
      activeProposals,
      proposalValue,
      teamSize: team.length,
      avgRevenuePerRep: Math.round(totalRevenue / team.length)
    });
  } catch (error) {
    console.error('Error fetching sales metrics:', error);
    res.status(500).json({ error: 'Failed to fetch sales metrics' });
  }
});

// GET /api/sales/forecasts - Get sales forecasts
router.get('/forecasts', async (req: Request, res: Response) => {
  try {
    const leads = generateLeads();
    const now = new Date();

    // Calculate forecasts based on pipeline
    const pipelineLeads = leads.filter(l => !['won', 'lost'].includes(l.status));

    // Weighted forecast based on stage probability
    const stageProbabilities: Record<string, number> = {
      new: 0.10,
      contacted: 0.20,
      qualified: 0.40,
      proposal: 0.60,
      negotiation: 0.80
    };

    const weightedForecast = pipelineLeads.reduce((sum, lead) => {
      const probability = stageProbabilities[lead.status] || 0;
      return sum + (lead.value * probability);
    }, 0);

    // Monthly forecast data
    const monthlyData = [];
    for (let i = 0; i < 6; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const baseValue = 500000 + Math.random() * 200000;

      monthlyData.push({
        month: month.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        forecast: Math.floor(baseValue * (1 + i * 0.05)),
        target: 600000 + (i * 25000),
        actual: i === 0 ? Math.floor(baseValue * 0.7) : null
      });
    }

    res.json({
      weightedForecast: Math.round(weightedForecast),
      pipelineTotal: pipelineLeads.reduce((sum, l) => sum + l.value, 0),
      pipelineCount: pipelineLeads.length,
      monthlyData,
      confidence: {
        low: Math.round(weightedForecast * 0.7),
        medium: Math.round(weightedForecast),
        high: Math.round(weightedForecast * 1.2)
      }
    });
  } catch (error) {
    console.error('Error fetching forecasts:', error);
    res.status(500).json({ error: 'Failed to fetch forecasts' });
  }
});

export default router;
