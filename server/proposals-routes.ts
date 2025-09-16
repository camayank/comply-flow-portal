import express from 'express';
import { storage } from './storage';
import { insertSalesProposalSchema, SalesProposal } from '../shared/schema';
import { z } from 'zod';

const router = express.Router();

// GET /api/proposals - Get all proposals with filtering and pagination
router.get('/proposals', async (req, res) => {
  try {
    const { 
      search, 
      status, 
      executive, 
      viewMode,
      page = '1', 
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Get proposals with filtering and pagination using storage
    const result = await storage.getAllProposals({
      search: search as string,
      status: status as string,
      executive: executive as string,
      viewMode: viewMode as string,
      limit: parseInt(limit as string),
      offset
    });

    // Get stats for dashboard
    const stats = await storage.getProposalStats();

    res.json({
      proposals: result.proposals,
      pagination: {
        total: result.total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(result.total / parseInt(limit as string))
      },
      stats: stats.statusDistribution
    });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// GET /api/proposals/:id - Get specific proposal
router.get('/proposals/:id', async (req, res) => {
  try {
    const proposal = await storage.getProposal(parseInt(req.params.id));

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json(proposal);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// POST /api/proposals - Create new proposal
router.post('/proposals', async (req, res) => {
  try {
    const validatedData = insertSalesProposalSchema.parse(req.body);
    
    const proposalData = {
      ...validatedData,
      proposalStatus: validatedData.proposalStatus || 'draft',
      paymentReceived: validatedData.paymentReceived || 'pending'
    };
    
    const newProposal = await storage.createSalesProposal(proposalData);

    res.json(newProposal);
  } catch (error) {
    console.error('Error creating proposal:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// PUT /api/proposals/:id - Update proposal
router.put('/proposals/:id', async (req, res) => {
  try {
    const validatedData = insertSalesProposalSchema.partial().parse(req.body);
    
    const updatedProposal = await storage.updateProposal(parseInt(req.params.id), validatedData);

    if (!updatedProposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json(updatedProposal);
  } catch (error) {
    console.error('Error updating proposal:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update proposal' });
  }
});

// DELETE /api/proposals/:id - Delete proposal
router.delete('/proposals/:id', async (req, res) => {
  try {
    const deleted = await storage.deleteProposal(parseInt(req.params.id));

    if (!deleted) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json({ message: 'Proposal deleted successfully' });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
});

// POST /api/proposals/:id/send - Send proposal to client
router.post('/proposals/:id/send', async (req, res) => {
  try {
    const sentProposal = await storage.sendProposal(parseInt(req.params.id));

    if (!sentProposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json({ 
      message: 'Proposal sent successfully', 
      proposal: sentProposal 
    });
  } catch (error) {
    console.error('Error sending proposal:', error);
    res.status(500).json({ error: 'Failed to send proposal' });
  }
});

// GET /api/proposals/stats/dashboard - Get dashboard statistics
router.get('/proposals/stats/dashboard', async (req, res) => {
  try {
    const stats = await storage.getProposalStats();

    res.json(stats);
  } catch (error) {
    console.error('Error fetching proposal stats:', error);
    res.status(500).json({ error: 'Failed to fetch proposal stats' });
  }
});

// GET /api/proposals/by-lead/:leadId - Get proposals for a specific lead
router.get('/proposals/by-lead/:leadId', async (req, res) => {
  try {
    const proposals = await storage.getSalesProposalsByLead(req.params.leadId);

    res.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals by lead:', error);
    res.status(500).json({ error: 'Failed to fetch proposals by lead' });
  }
});

// POST /api/proposals/:id/approve - Approve proposal
router.post('/proposals/:id/approve', async (req, res) => {
  try {
    const { remarks } = req.body;
    
    const updatedProposal = await storage.updateProposal(parseInt(req.params.id), {
      proposalStatus: 'approved',
      finalRemark: remarks || 'Proposal approved'
    });

    if (!updatedProposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json({ 
      message: 'Proposal approved successfully', 
      proposal: updatedProposal 
    });
  } catch (error) {
    console.error('Error approving proposal:', error);
    res.status(500).json({ error: 'Failed to approve proposal' });
  }
});

// POST /api/proposals/:id/reject - Reject proposal
router.post('/proposals/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    
    const updatedProposal = await storage.updateProposal(parseInt(req.params.id), {
      proposalStatus: 'rejected',
      finalRemark: reason || 'Proposal rejected'
    });

    if (!updatedProposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json({ 
      message: 'Proposal rejected', 
      proposal: updatedProposal 
    });
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    res.status(500).json({ error: 'Failed to reject proposal' });
  }
});

// POST /api/proposals/:id/convert - Convert proposal to client
router.post('/proposals/:id/convert', async (req, res) => {
  try {
    const { paymentAmount } = req.body;
    
    const updatedProposal = await storage.updateProposal(parseInt(req.params.id), {
      proposalStatus: 'converted',
      paymentReceived: paymentAmount ? 'partial' : 'full',
      paymentPending: paymentAmount ? paymentAmount.toString() : '0'
    });

    if (!updatedProposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json({ 
      message: 'Proposal converted successfully', 
      proposal: updatedProposal 
    });
  } catch (error) {
    console.error('Error converting proposal:', error);
    res.status(500).json({ error: 'Failed to convert proposal' });
  }
});

export function registerProposalRoutes(app: express.Application) {
  app.use('/api', router);
  console.log('✅ Proposal routes registered');
}