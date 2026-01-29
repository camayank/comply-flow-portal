import express from 'express';
import { storage } from './storage';
import {
  insertLeadEnhancedSchema,
  insertSalesProposalSchema,
  LeadEnhanced,
  SalesProposal
} from '../shared/schema';
import { z } from 'zod';
import {
  sessionAuthMiddleware,
  requireMinimumRole,
  USER_ROLES,
  AuthenticatedRequest
} from './rbac-middleware';

const router = express.Router();

// Lead ID generation is now handled by storage layer

// Apply authentication to all lead routes
router.use('/leads', sessionAuthMiddleware);
router.use('/stats', sessionAuthMiddleware);
router.use('/executives', sessionAuthMiddleware);

// GET /api/leads - Get all leads with filtering and pagination
router.get('/leads', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
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
router.get('/leads/:id', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
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
router.post('/leads', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
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
router.put('/leads/:id', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
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

// DELETE /api/leads/:id - Delete lead (Admin only)
router.delete('/leads/:id', requireMinimumRole(USER_ROLES.ADMIN), async (req: AuthenticatedRequest, res) => {
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
router.post('/leads/:id/interaction', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
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
router.get('/stats/dashboard', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await storage.getLeadStats();

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/leads/executives - Get list of pre-sales executives
router.get('/executives', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
  try {
    const executives = await storage.getPreSalesExecutives();

    res.json(executives);
  } catch (error) {
    console.error('Error fetching executives:', error);
    res.status(500).json({ error: 'Failed to fetch executives' });
  }
});

// POST /api/leads/:id/convert - Convert lead to client (CRITICAL ENDPOINT)
router.post('/leads/:id/convert', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const {
      createServiceRequest = false,
      selectedServiceId,
      notes,
      convertedBy
    } = req.body;

    // 1. Get the lead
    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check if already converted
    if (lead.leadStage === 'converted' || lead.status === 'converted') {
      return res.status(400).json({ error: 'Lead has already been converted' });
    }

    // 2. Generate unique client ID (C0001 format)
    const existingEntities = await storage.getAllBusinessEntities();
    const clientNumber = existingEntities.length + 1;
    const clientId = `C${clientNumber.toString().padStart(4, '0')}`;

    // 3. Generate temporary password (should be changed on first login)
    const tempPassword = `DigiComply${Math.random().toString(36).slice(-8)}`;

    // 4. Create user account
    const userData = {
      username: lead.email || `client_${clientId.toLowerCase()}`,
      password: tempPassword, // In production, this should be hashed
      email: lead.email || `${clientId.toLowerCase()}@pending.digicomply.in`,
      phone: lead.phone || null,
      fullName: lead.companyName || lead.contactPerson || 'New Client',
      role: 'client' as const,
      isActive: true,
      emailVerified: false
    };

    const newUser = await storage.createUser(userData);

    // 5. Create business entity
    const entityData = {
      clientId: clientId,
      userId: newUser.id,
      companyName: lead.companyName || 'New Company',
      entityType: lead.businessType || 'private_limited',
      incorporationDate: null,
      gstin: null,
      pan: null,
      cin: null,
      registeredAddress: lead.city || null,
      operatingAddress: null,
      state: lead.state || 'Delhi',
      pincode: null,
      industry: lead.industry || null,
      annualTurnover: lead.estimatedBudget?.toString() || null,
      employeeCount: null,
      website: lead.website || null,
      contactPerson: lead.contactPerson || null,
      contactEmail: lead.email || null,
      contactPhone: lead.phone || null,
      complianceStatus: 'pending',
      riskLevel: 'low',
      onboardingStatus: 'pending',
      assignedManager: null,
      notes: notes || `Converted from lead ${lead.leadId}`,
      isActive: true,
      lifecycleStage: 'onboarding'
    };

    const newEntity = await storage.createBusinessEntity(entityData);

    // 6. Update lead status to converted
    const updatedLead = await storage.updateLead(leadId, {
      leadStage: 'converted',
      status: 'converted',
      convertedAt: new Date(),
      conversionNotes: `Converted to client ${clientId} by ${convertedBy || req.user?.username || 'system'}`
    });

    // 7. Optionally create initial service request
    let serviceRequest = null;
    if (createServiceRequest && selectedServiceId) {
      serviceRequest = await storage.createServiceRequest({
        serviceId: selectedServiceId,
        businessEntityId: newEntity.id,
        status: 'initiated',
        priority: lead.priority || 'medium',
        progress: 0,
        currentMilestone: 'initiated',
        notes: `Auto-created from lead conversion`,
        assignedTeamMember: null
      });
    }

    // 8. Log the conversion activity
    try {
      await storage.createActivityLog({
        userId: req.user?.id || newUser.id,
        action: 'lead_converted',
        entityType: 'lead',
        entityId: leadId,
        details: JSON.stringify({
          leadId: lead.leadId,
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
      message: 'Lead converted to client successfully',
      data: {
        lead: updatedLead,
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
    console.error('Error converting lead:', error);
    res.status(500).json({ error: 'Failed to convert lead to client' });
  }
});

export function registerLeadsRoutes(app: express.Application) {
  app.use('/api', router);
  console.log('✅ Leads routes registered');
}