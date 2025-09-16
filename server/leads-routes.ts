import express from 'express';
import { storage } from './storage';
import { 
  insertLeadEnhancedSchema,
  insertSalesProposalSchema,
  LeadEnhanced,
  SalesProposal
} from '../shared/schema';
import { z } from 'zod';

const router = express.Router();

// Lead ID generation is now handled by storage layer

// GET /api/leads - Get all leads with filtering and pagination
router.get('/leads', async (req, res) => {
  try {
    const { 
      search, 
      stage, 
      source, 
      executive, 
      page = '1', 
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Get leads with filtering and pagination using storage
    const result = await storage.getAllLeads({
      search: search as string,
      stage: stage as string,
      source: source as string,
      executive: executive as string,
      limit: parseInt(limit as string),
      offset
    });

    // Get stats for dashboard
    const stats = await storage.getLeadStats();

    res.json({
      leads: result.leads,
      pagination: {
        total: result.total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(result.total / parseInt(limit as string))
      },
      stats: stats.stageDistribution
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id - Get specific lead
router.get('/leads/:id', async (req, res) => {
  try {
    const lead = await storage.getLead(parseInt(req.params.id));

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get related proposals if any
    const proposals = await storage.getSalesProposalsByLead(lead.leadId);

    res.json({
      lead,
      proposals
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST /api/leads - Create new lead
router.post('/leads', async (req, res) => {
  try {
    const validatedData = insertLeadEnhancedSchema.omit({ leadId: true }).parse(req.body);
    
    const leadData = {
      ...validatedData,
      leadStage: validatedData.leadStage || 'new',
      priority: validatedData.priority || 'medium',
      status: validatedData.status || 'new'
    };
    
    const newLead = await storage.createLead(leadData);

    res.json(newLead);
  } catch (error) {
    console.error('Error creating lead:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/leads/:id', async (req, res) => {
  try {
    const validatedData = insertLeadEnhancedSchema.omit({ leadId: true }).partial().parse(req.body);
    
    const updatedLead = await storage.updateLead(parseInt(req.params.id), validatedData);

    if (!updatedLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/leads/:id', async (req, res) => {
  try {
    const deleted = await storage.deleteLead(parseInt(req.params.id));

    if (!deleted) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// POST /api/leads/:id/interaction - Add interaction to lead
router.post('/leads/:id/interaction', async (req, res) => {
  try {
    const { type, notes, executive } = req.body;
    
    const updatedLead = await storage.addLeadInteraction(parseInt(req.params.id), {
      type,
      notes,
      executive
    });

    if (!updatedLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(updatedLead);
  } catch (error) {
    console.error('Error adding interaction:', error);
    res.status(500).json({ error: 'Failed to add interaction' });
  }
});

// GET /api/leads/stats/dashboard - Get dashboard statistics
router.get('/stats/dashboard', async (req, res) => {
  try {
    const stats = await storage.getLeadStats();

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/leads/executives - Get list of pre-sales executives
router.get('/executives', async (req, res) => {
  try {
    const executives = await storage.getPreSalesExecutives();

    res.json(executives);
  } catch (error) {
    console.error('Error fetching executives:', error);
    res.status(500).json({ error: 'Failed to fetch executives' });
  }
});

export function registerLeadsRoutes(app: express.Application) {
  app.use('/api', router);
  console.log('✅ Leads routes registered');
}