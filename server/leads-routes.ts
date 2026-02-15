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
import { generateClientId, generateLeadId } from './services/id-generator';
import { generateTempPassword } from './security-utils';

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

// =====================================================
// LEAD ASSIGNMENT & APPROVAL WORKFLOW - CRITICAL APIS
// =====================================================

// PUT /api/leads/:id/assign - Assign lead to sales executive
router.put('/leads/:id/assign', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { assignedTo, assignedToName, priority, notes } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ error: 'assignedTo is required' });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Update lead with assignment
    const updatedLead = await storage.updateLead(leadId, {
      assignedTo,
      assignedToName: assignedToName || null,
      priority: priority || lead.priority,
      lastActivityDate: new Date(),
      lastActivityType: 'assigned'
    });

    // Log the assignment activity
    try {
      await storage.createActivityLog({
        userId: req.user?.id || 0,
        action: 'lead_assigned',
        entityType: 'lead',
        entityId: leadId,
        details: JSON.stringify({
          leadId: lead.leadId,
          assignedTo,
          assignedToName,
          assignedBy: req.user?.username,
          notes
        }),
        ipAddress: req.ip || null
      });
    } catch (logError) {
      console.warn('Failed to log assignment activity:', logError);
    }

    res.json({
      success: true,
      message: 'Lead assigned successfully',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

// POST /api/leads/bulk-assign - Bulk assign leads to sales executives
router.post('/leads/bulk-assign', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const { leadIds, assignedTo, assignedToName, distributionType = 'manual' } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    if (distributionType === 'manual' && !assignedTo) {
      return res.status(400).json({ error: 'assignedTo is required for manual distribution' });
    }

    const results: { success: any[]; failed: any[] } = { success: [], failed: [] };

    // Get executives for round-robin distribution if needed
    let executives: any[] = [];
    if (distributionType === 'round_robin' || distributionType === 'load_balanced') {
      executives = await storage.getPreSalesExecutives();
      if (executives.length === 0) {
        return res.status(400).json({ error: 'No sales executives available for distribution' });
      }
    }

    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i];
      try {
        let targetAssignee = assignedTo;
        let targetAssigneeName = assignedToName;

        // Distribute leads based on strategy
        if (distributionType === 'round_robin') {
          const execIndex = i % executives.length;
          targetAssignee = executives[execIndex].id;
          targetAssigneeName = executives[execIndex].fullName;
        } else if (distributionType === 'load_balanced') {
          // Simple load balancing - assign to exec with least leads
          const execWithLeastLeads = executives.reduce((min, exec) =>
            (exec.activeLeadCount || 0) < (min.activeLeadCount || 0) ? exec : min
          , executives[0]);
          targetAssignee = execWithLeastLeads.id;
          targetAssigneeName = execWithLeastLeads.fullName;
          // Increment virtual count for next iteration
          execWithLeastLeads.activeLeadCount = (execWithLeastLeads.activeLeadCount || 0) + 1;
        }

        const updatedLead = await storage.updateLead(leadId, {
          assignedTo: targetAssignee,
          assignedToName: targetAssigneeName,
          lastActivityDate: new Date(),
          lastActivityType: 'assigned'
        });

        if (updatedLead) {
          results.success.push({ leadId, assignedTo: targetAssignee, assignedToName: targetAssigneeName });
        } else {
          results.failed.push({ leadId, error: 'Lead not found' });
        }
      } catch (err: any) {
        results.failed.push({ leadId, error: err.message });
      }
    }

    // Log bulk assignment
    try {
      await storage.createActivityLog({
        userId: req.user?.id || 0,
        action: 'leads_bulk_assigned',
        entityType: 'lead',
        entityId: 0,
        details: JSON.stringify({
          totalLeads: leadIds.length,
          successCount: results.success.length,
          failedCount: results.failed.length,
          distributionType,
          assignedBy: req.user?.username
        }),
        ipAddress: req.ip || null
      });
    } catch (logError) {
      console.warn('Failed to log bulk assignment:', logError);
    }

    res.json({
      success: true,
      message: `Assigned ${results.success.length} of ${leadIds.length} leads`,
      results
    });
  } catch (error) {
    console.error('Error bulk assigning leads:', error);
    res.status(500).json({ error: 'Failed to bulk assign leads' });
  }
});

// PATCH /api/leads/:id/approve - Approve lead (Sales Manager)
router.patch('/leads/:id/approve', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { qualityScore, notes, assignToExecutive } = req.body;

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Cannot approve already converted or rejected leads
    if (lead.leadStage === 'converted' || lead.status === 'rejected') {
      return res.status(400).json({ error: `Cannot approve a lead that is ${lead.status || lead.leadStage}` });
    }

    const updateData: any = {
      status: 'approved',
      qualityScore: qualityScore || 80,
      approvedAt: new Date(),
      approvedBy: req.user?.id,
      approvalNotes: notes,
      lastActivityDate: new Date(),
      lastActivityType: 'approved'
    };

    // Optionally assign to executive upon approval
    if (assignToExecutive) {
      updateData.assignedTo = assignToExecutive.id;
      updateData.assignedToName = assignToExecutive.name;
    }

    // Move to qualified stage
    if (lead.leadStage === 'new' || lead.leadStage === 'contacted') {
      updateData.leadStage = 'qualified';
    }

    const updatedLead = await storage.updateLead(leadId, updateData);

    // Log approval
    try {
      await storage.createActivityLog({
        userId: req.user?.id || 0,
        action: 'lead_approved',
        entityType: 'lead',
        entityId: leadId,
        details: JSON.stringify({
          leadId: lead.leadId,
          qualityScore: updateData.qualityScore,
          approvedBy: req.user?.username,
          notes
        }),
        ipAddress: req.ip || null
      });
    } catch (logError) {
      console.warn('Failed to log approval activity:', logError);
    }

    res.json({
      success: true,
      message: 'Lead approved successfully',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error approving lead:', error);
    res.status(500).json({ error: 'Failed to approve lead' });
  }
});

// PATCH /api/leads/:id/reject - Reject lead (Sales Manager)
router.patch('/leads/:id/reject', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { reason, feedback, allowResubmission = false } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Cannot reject already converted leads
    if (lead.leadStage === 'converted') {
      return res.status(400).json({ error: 'Cannot reject a converted lead' });
    }

    const updatedLead = await storage.updateLead(leadId, {
      status: 'rejected',
      leadStage: allowResubmission ? 'new' : 'lost',
      rejectedAt: new Date(),
      rejectedBy: req.user?.id,
      rejectionReason: reason,
      rejectionFeedback: feedback,
      lastActivityDate: new Date(),
      lastActivityType: 'rejected'
    });

    // Log rejection
    try {
      await storage.createActivityLog({
        userId: req.user?.id || 0,
        action: 'lead_rejected',
        entityType: 'lead',
        entityId: leadId,
        details: JSON.stringify({
          leadId: lead.leadId,
          reason,
          feedback,
          allowResubmission,
          rejectedBy: req.user?.username
        }),
        ipAddress: req.ip || null
      });
    } catch (logError) {
      console.warn('Failed to log rejection activity:', logError);
    }

    res.json({
      success: true,
      message: allowResubmission
        ? 'Lead returned for more information'
        : 'Lead rejected',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error rejecting lead:', error);
    res.status(500).json({ error: 'Failed to reject lead' });
  }
});

// POST /api/leads/:id/request-info - Request more information on lead
router.post('/leads/:id/request-info', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { requiredFields, message, deadline } = req.body;

    if (!requiredFields || !Array.isArray(requiredFields) || requiredFields.length === 0) {
      return res.status(400).json({ error: 'requiredFields array is required' });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updatedLead = await storage.updateLead(leadId, {
      status: 'info_requested',
      infoRequestedAt: new Date(),
      infoRequestedBy: req.user?.id,
      infoRequestedFields: JSON.stringify(requiredFields),
      infoRequestMessage: message,
      infoRequestDeadline: deadline ? new Date(deadline) : null,
      lastActivityDate: new Date(),
      lastActivityType: 'info_requested'
    });

    // Log info request
    try {
      await storage.createActivityLog({
        userId: req.user?.id || 0,
        action: 'lead_info_requested',
        entityType: 'lead',
        entityId: leadId,
        details: JSON.stringify({
          leadId: lead.leadId,
          requiredFields,
          message,
          deadline,
          requestedBy: req.user?.username
        }),
        ipAddress: req.ip || null
      });
    } catch (logError) {
      console.warn('Failed to log info request activity:', logError);
    }

    res.json({
      success: true,
      message: 'Information requested from lead submitter',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error requesting lead info:', error);
    res.status(500).json({ error: 'Failed to request lead information' });
  }
});

// GET /api/leads/pending-approval - Get leads pending manager approval
router.get('/leads/pending-approval', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get leads that need approval (new leads without approval status)
    const result = await storage.getAllLeads({
      stage: 'new',
      limit: parseInt(limit as string),
      offset
    });

    // Filter to only pending approval (no approvedAt and no rejectedAt)
    const pendingLeads = result.leads.filter((lead: any) =>
      !lead.approvedAt && !lead.rejectedAt && lead.status !== 'rejected'
    );

    res.json({
      leads: pendingLeads,
      pagination: {
        total: pendingLeads.length,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(pendingLeads.length / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching pending leads:', error);
    res.status(500).json({ error: 'Failed to fetch pending leads' });
  }
});

// POST /api/leads/:id/score - Calculate lead quality score
router.post('/leads/:id/score', requireMinimumRole(USER_ROLES.SALES_EXECUTIVE), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const lead = await storage.getLead(leadId);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Calculate lead quality score based on multiple factors
    let score = 0;
    const factors: { factor: string; score: number; maxScore: number }[] = [];

    // 1. Company information completeness (max 20)
    if (lead.companyName) { score += 5; factors.push({ factor: 'Company Name', score: 5, maxScore: 5 }); }
    if (lead.industry) { score += 5; factors.push({ factor: 'Industry', score: 5, maxScore: 5 }); }
    if (lead.businessType) { score += 5; factors.push({ factor: 'Business Type', score: 5, maxScore: 5 }); }
    if (lead.website) { score += 5; factors.push({ factor: 'Website', score: 5, maxScore: 5 }); }

    // 2. Contact information (max 20)
    if (lead.email) { score += 10; factors.push({ factor: 'Email', score: 10, maxScore: 10 }); }
    if (lead.phone) { score += 5; factors.push({ factor: 'Phone', score: 5, maxScore: 5 }); }
    if (lead.contactPerson) { score += 5; factors.push({ factor: 'Contact Person', score: 5, maxScore: 5 }); }

    // 3. Budget qualification (max 20)
    const budget = lead.estimatedBudget || 0;
    if (budget >= 100000) { score += 20; factors.push({ factor: 'Budget (₹1L+)', score: 20, maxScore: 20 }); }
    else if (budget >= 50000) { score += 15; factors.push({ factor: 'Budget (₹50K+)', score: 15, maxScore: 20 }); }
    else if (budget >= 25000) { score += 10; factors.push({ factor: 'Budget (₹25K+)', score: 10, maxScore: 20 }); }
    else if (budget > 0) { score += 5; factors.push({ factor: 'Budget (Specified)', score: 5, maxScore: 20 }); }

    // 4. Lead source quality (max 20)
    const highQualitySources = ['referral', 'partner', 'existing_client'];
    const mediumQualitySources = ['website', 'linkedin', 'google'];
    if (highQualitySources.includes(lead.source || '')) {
      score += 20; factors.push({ factor: 'High-Quality Source', score: 20, maxScore: 20 });
    } else if (mediumQualitySources.includes(lead.source || '')) {
      score += 12; factors.push({ factor: 'Medium-Quality Source', score: 12, maxScore: 20 });
    } else if (lead.source) {
      score += 5; factors.push({ factor: 'Source Specified', score: 5, maxScore: 20 });
    }

    // 5. Service interest (max 20)
    if (lead.interestedServices && Array.isArray(lead.interestedServices) && lead.interestedServices.length > 0) {
      const serviceScore = Math.min(lead.interestedServices.length * 5, 20);
      score += serviceScore;
      factors.push({ factor: 'Service Interest', score: serviceScore, maxScore: 20 });
    }

    // Determine qualification level
    let qualificationLevel: 'hot' | 'warm' | 'cold' | 'unqualified';
    if (score >= 80) qualificationLevel = 'hot';
    else if (score >= 60) qualificationLevel = 'warm';
    else if (score >= 40) qualificationLevel = 'cold';
    else qualificationLevel = 'unqualified';

    // Update lead with score
    await storage.updateLead(leadId, {
      qualityScore: score,
      qualificationLevel,
      lastScoredAt: new Date()
    });

    res.json({
      leadId: lead.leadId,
      score,
      maxScore: 100,
      qualificationLevel,
      factors,
      recommendation: score >= 60
        ? 'This lead is qualified and should be pursued actively'
        : score >= 40
        ? 'This lead needs more qualification before pursuing'
        : 'This lead may not be a good fit - consider requesting more information'
    });
  } catch (error) {
    console.error('Error scoring lead:', error);
    res.status(500).json({ error: 'Failed to score lead' });
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

    // 2. Generate unique client ID using centralized ID generator
    const clientId = await generateClientId();

    // 3. Generate cryptographically secure temporary password (should be changed on first login)
    const tempPassword = generateTempPassword();

    // 4. Create user account
    const userData = {
      username: lead.email || `client_${clientId.toLowerCase()}`,
      password: tempPassword, // In production, this should be hashed
      email: lead.email || `${clientId.toLowerCase()}@pending.digicomply.in`,
      phone: lead.phone || null,
      fullName: lead.companyName || lead.contactPerson || 'New Client',
      role: 'client' as const,
      isActive: true,
      emailVerified: false,
      leadId: lead.id, // Propagate lead ID for tracking conversion source
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
      lifecycleStage: 'onboarding',
      leadId: lead.id, // Propagate lead ID for tracking conversion source
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
        assignedTeamMember: null,
        assignedAgentId: lead.agentId ? Number(lead.agentId) : null,
        leadId: lead.id, // Propagate lead ID for tracking conversion source
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
