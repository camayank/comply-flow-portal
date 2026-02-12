import express from 'express';
import { storage } from './storage';
import { insertSalesProposalSchema, SalesProposal } from '../shared/schema';
import { z } from 'zod';
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  AuthenticatedRequest
} from './rbac-middleware';
import { generateTempPassword } from './security-utils';

const router = express.Router();

// Apply authentication to all proposal routes
router.use('/proposals', sessionAuthMiddleware);

// GET /api/proposals - Get all proposals with filtering and pagination
router.get('/proposals', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
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
router.get('/proposals/:id', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
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
router.post('/proposals', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
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
router.put('/proposals/:id', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
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

// DELETE /api/proposals/:id - Delete proposal (Admin only)
router.delete('/proposals/:id', requireMinimumRole(USER_ROLES.ADMIN), async (req: AuthenticatedRequest, res) => {
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
router.post('/proposals/:id/send', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
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
router.get('/proposals/stats/dashboard', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await storage.getProposalStats();

    res.json(stats);
  } catch (error) {
    console.error('Error fetching proposal stats:', error);
    res.status(500).json({ error: 'Failed to fetch proposal stats' });
  }
});

// GET /api/proposals/by-lead/:leadId - Get proposals for a specific lead
router.get('/proposals/by-lead/:leadId', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
  try {
    const proposals = await storage.getSalesProposalsByLead(req.params.leadId);

    res.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals by lead:', error);
    res.status(500).json({ error: 'Failed to fetch proposals by lead' });
  }
});

// POST /api/proposals/:id/approve - Approve proposal (Admin only)
router.post('/proposals/:id/approve', requireMinimumRole(USER_ROLES.ADMIN), async (req: AuthenticatedRequest, res) => {
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

// POST /api/proposals/:id/reject - Reject proposal (Admin only)
router.post('/proposals/:id/reject', requireMinimumRole(USER_ROLES.ADMIN), async (req: AuthenticatedRequest, res) => {
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

// POST /api/proposals/:id/convert - Convert proposal to client (Ops Executive and above)
router.post('/proposals/:id/convert', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: AuthenticatedRequest, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    const {
      paymentAmount,
      createServiceRequest = true,
      notes,
      convertedBy
    } = req.body;

    // Get the proposal
    const proposal = await storage.getProposal(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Check if already converted
    if (proposal.proposalStatus === 'converted') {
      return res.status(400).json({ error: 'Proposal has already been converted' });
    }

    // Get associated lead if exists
    let lead = null;
    if (proposal.leadId) {
      lead = await storage.getLeadByLeadId(proposal.leadId);
    }

    // Generate unique client ID (C0001 format)
    const existingEntities = await storage.getAllBusinessEntities();
    const clientNumber = existingEntities.length + 1;
    const clientId = `C${clientNumber.toString().padStart(4, '0')}`;

    // Generate cryptographically secure temporary password
    const tempPassword = generateTempPassword();

    // Use proposal data, falling back to lead data
    const clientEmail = proposal.email || lead?.email || `${clientId.toLowerCase()}@pending.digicomply.in`;
    const companyName = proposal.companyName || lead?.companyName || 'New Company';
    const contactPerson = proposal.clientName || lead?.contactPerson || 'New Client';
    const phone = proposal.phone || lead?.phone || null;

    // Create user account
    const userData = {
      username: clientEmail,
      password: tempPassword, // In production, this should be hashed
      email: clientEmail,
      phone: phone,
      fullName: contactPerson,
      role: 'client' as const,
      isActive: true,
      emailVerified: false
    };

    const newUser = await storage.createUser(userData);

    // Create business entity
    const entityData = {
      clientId: clientId,
      userId: newUser.id,
      companyName: companyName,
      entityType: lead?.businessType || 'private_limited',
      incorporationDate: null,
      gstin: lead?.gstin || null,
      pan: null,
      cin: null,
      registeredAddress: lead?.city || null,
      operatingAddress: null,
      state: lead?.state || 'Delhi',
      pincode: null,
      industry: lead?.industry || null,
      annualTurnover: proposal.proposedAmount?.toString() || lead?.estimatedBudget?.toString() || null,
      employeeCount: null,
      website: lead?.website || null,
      contactPerson: contactPerson,
      contactEmail: clientEmail,
      contactPhone: phone,
      complianceStatus: 'pending',
      riskLevel: 'low',
      onboardingStatus: 'pending',
      assignedManager: null,
      notes: notes || `Converted from proposal #${proposalId}`,
      isActive: true,
      lifecycleStage: 'onboarding'
    };

    const newEntity = await storage.createBusinessEntity(entityData);

    // Update proposal status
    const updatedProposal = await storage.updateProposal(proposalId, {
      proposalStatus: 'converted',
      paymentReceived: paymentAmount ? 'partial' : 'full',
      paymentPending: paymentAmount ? paymentAmount.toString() : '0',
      conversionDate: new Date(),
      convertedClientId: clientId
    });

    // Update lead if exists
    if (lead) {
      await storage.updateLead(lead.id, {
        leadStage: 'converted',
        status: 'converted',
        convertedAt: new Date(),
        conversionNotes: `Converted via proposal #${proposalId} to client ${clientId}`
      });
    }

    // Create service request if proposal has services
    let serviceRequest = null;
    if (createServiceRequest && proposal.selectedServices) {
      // Parse selected services if stored as JSON string
      let servicesArray = proposal.selectedServices;
      if (typeof servicesArray === 'string') {
        try {
          servicesArray = JSON.parse(servicesArray);
        } catch {
          servicesArray = [];
        }
      }

      // Create service request for first service (or primary service)
      if (Array.isArray(servicesArray) && servicesArray.length > 0) {
        const primaryServiceId = servicesArray[0]?.id || servicesArray[0];
        if (primaryServiceId) {
          serviceRequest = await storage.createServiceRequest({
            serviceId: typeof primaryServiceId === 'number' ? primaryServiceId : parseInt(primaryServiceId),
            businessEntityId: newEntity.id,
            status: 'initiated',
            priority: 'medium',
            progress: 0,
            currentMilestone: 'initiated',
            totalAmount: proposal.proposedAmount?.toString() || null,
            notes: `Auto-created from proposal #${proposalId} conversion`,
            assignedTeamMember: null
          });
        }
      }
    }

    // Log the conversion activity
    try {
      await storage.createActivityLog({
        userId: req.user?.id || newUser.id,
        action: 'proposal_converted',
        entityType: 'proposal',
        entityId: proposalId,
        details: JSON.stringify({
          proposalId: proposalId,
          leadId: proposal.leadId || null,
          clientId: clientId,
          userId: newUser.id,
          entityId: newEntity.id,
          serviceRequestId: serviceRequest?.id || null
        }),
        ipAddress: req.ip || null
      });
    } catch (logError) {
      console.warn('Failed to log conversion activity:', logError);
    }

    res.json({
      success: true,
      message: 'Proposal converted to client successfully',
      data: {
        proposal: updatedProposal,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          temporaryPassword: tempPassword // Send once for admin to share with client
        },
        businessEntity: {
          id: newEntity.id,
          clientId: clientId,
          companyName: newEntity.companyName
        },
        serviceRequest: serviceRequest ? {
          id: serviceRequest.id,
          status: serviceRequest.status
        } : null
      }
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