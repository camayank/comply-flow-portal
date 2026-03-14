import express from 'express';
import bcrypt from 'bcrypt';
import { storage } from './storage';
import {
  insertLeadEnhancedSchema,
  insertSalesProposalSchema,
  LeadEnhanced,
  SalesProposal,
  businessEntities
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
import { leadAssignmentService } from './services/lead-assignment-service';
import { ok, created, fail } from './utils/api-response';

const router = express.Router();

function cleanLeadPayload(body: Record<string, unknown>) {
  const cleaned = { ...body } as Record<string, unknown>;
  const emptyOptionalFields = [
    'estimatedValue',
    'nextFollowupDate',
    'contactEmail',
    'directorName',
    'directorEmail',
    'directorPhone',
    'state',
    'preSalesExecutive',
    'entityType',
    'remarks',
  ];

  for (const field of emptyOptionalFields) {
    if (cleaned[field] === '' || cleaned[field] === undefined) delete cleaned[field];
  }

  if (cleaned.nextFollowupDate && typeof cleaned.nextFollowupDate === 'string') {
    cleaned.nextFollowupDate = new Date(cleaned.nextFollowupDate);
  }

  return cleaned;
}

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

    return ok(res, {
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
    return fail(res, 500, { code: 'LEADS_FETCH_FAILED', message: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id - Get specific lead
router.get('/leads/:id', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
  try {
    const lead = await storage.getLead(parseInt(req.params.id));

    if (!lead) {
      return fail(res, 404, { code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    }

    // Get related proposals if any
    const proposals = await storage.getSalesProposalsByLead(lead.leadId);

    return ok(res, {
      lead,
      proposals
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    return fail(res, 500, { code: 'LEAD_FETCH_FAILED', message: 'Failed to fetch lead' });
  }
});

// POST /api/leads - Create new lead
router.post('/leads', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
  try {
    const body = cleanLeadPayload(req.body as Record<string, unknown>);

    const validatedData = insertLeadEnhancedSchema.omit({ leadId: true }).parse(body);

    // Generate unique leadId
    const leadId = await generateLeadId();

    const leadData = {
      ...validatedData,
      leadId,
      leadStage: validatedData.leadStage || 'new',
      priority: validatedData.priority || 'medium',
      status: validatedData.status || 'new'
    };

    const newLead = await storage.createLead(leadData);

    return created(res, newLead);
  } catch (error) {
    console.error('Error creating lead:', error);
    if (error instanceof z.ZodError) {
      return fail(res, 400, { code: 'VALIDATION_ERROR', message: 'Validation error', details: error.errors });
    }
    return fail(res, 500, { code: 'LEAD_CREATE_FAILED', message: 'Failed to create lead' });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/leads/:id', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
  try {
    const body = cleanLeadPayload(req.body as Record<string, unknown>);

    const validatedData = insertLeadEnhancedSchema.omit({ leadId: true }).partial().parse(body);
    
    const updatedLead = await storage.updateLead(parseInt(req.params.id), validatedData);

    if (!updatedLead) {
      return fail(res, 404, { code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    }

    return ok(res, updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    if (error instanceof z.ZodError) {
      return fail(res, 400, { code: 'VALIDATION_ERROR', message: 'Validation error', details: error.errors });
    }
    return fail(res, 500, { code: 'LEAD_UPDATE_FAILED', message: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id - Delete lead (Admin only)
router.delete('/leads/:id', requireMinimumRole(USER_ROLES.ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const deleted = await storage.deleteLead(parseInt(req.params.id));

    if (!deleted) {
      return fail(res, 404, { code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    }

    return ok(res, { message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return fail(res, 500, { code: 'LEAD_DELETE_FAILED', message: 'Failed to delete lead' });
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
      return fail(res, 404, { code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    }

    return ok(res, updatedLead);
  } catch (error) {
    console.error('Error adding interaction:', error);
    return fail(res, 500, { code: 'LEAD_INTERACTION_FAILED', message: 'Failed to add interaction' });
  }
});

// GET /api/leads/stats/dashboard - Get dashboard statistics
router.get('/stats/dashboard', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await storage.getLeadStats();

    return ok(res, stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return fail(res, 500, { code: 'LEAD_STATS_FETCH_FAILED', message: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/leads/executives - Get list of pre-sales executives
router.get('/executives', requireMinimumRole(USER_ROLES.CUSTOMER_SERVICE), async (req: AuthenticatedRequest, res) => {
  try {
    const executives = await storage.getPreSalesExecutives();

    return ok(res, executives);
  } catch (error) {
    console.error('Error fetching executives:', error);
    return fail(res, 500, { code: 'LEAD_EXECUTIVES_FETCH_FAILED', message: 'Failed to fetch executives' });
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
      return fail(res, 400, { code: 'ASSIGNED_TO_REQUIRED', message: 'assignedTo is required' });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return fail(res, 404, { code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    }

    // Update lead with assignment
    const updatedLead = await storage.updateLead(leadId, {
      assignedTo,
      priority: priority || lead.priority,
      remarks: notes ? `Assigned to ${assignedToName || assignedTo}: ${notes}` : `Assigned to ${assignedToName || assignedTo}`,
      updatedAt: new Date()
    });

    // Log the assignment activity
    console.log(`Lead ${lead.leadId} assigned to ${assignedToName || assignedTo} by ${req.user?.username}`);

    return ok(res, {
      success: true,
      message: 'Lead assigned successfully',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error assigning lead:', error);
    return fail(res, 500, { code: 'LEAD_ASSIGN_FAILED', message: 'Failed to assign lead' });
  }
});

// POST /api/leads/bulk-assign - Bulk assign leads to sales executives
router.post('/leads/bulk-assign', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const { leadIds, assignedTo, assignedToName, distributionType = 'manual' } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return fail(res, 400, { code: 'LEAD_IDS_REQUIRED', message: 'leadIds array is required' });
    }

    if (distributionType === 'manual' && !assignedTo) {
      return fail(res, 400, { code: 'ASSIGNED_TO_REQUIRED', message: 'assignedTo is required for manual distribution' });
    }

    const results: { success: any[]; failed: any[] } = { success: [], failed: [] };

    // Get executives for round-robin distribution if needed
    let executives: any[] = [];
    if (distributionType === 'round_robin' || distributionType === 'load_balanced') {
      executives = await storage.getPreSalesExecutives();
      if (executives.length === 0) {
        return fail(res, 400, { code: 'NO_SALES_EXECUTIVES', message: 'No sales executives available for distribution' });
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
          remarks: `Assigned to ${targetAssigneeName || targetAssignee}`,
          updatedAt: new Date()
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
    console.log(`Bulk assigned ${results.success.length}/${leadIds.length} leads by ${req.user?.username} using ${distributionType}`);

    return ok(res, {
      success: true,
      message: `Assigned ${results.success.length} of ${leadIds.length} leads`,
      results
    });
  } catch (error) {
    console.error('Error bulk assigning leads:', error);
    return fail(res, 500, { code: 'LEADS_BULK_ASSIGN_FAILED', message: 'Failed to bulk assign leads' });
  }
});

// PATCH /api/leads/:id/approve - Approve lead (Sales Manager)
router.patch('/leads/:id/approve', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { qualityScore, notes, assignToExecutive } = req.body;

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return fail(res, 404, { code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    }

    // Cannot approve already converted or rejected leads
    if (lead.leadStage === 'converted' || lead.status === 'rejected') {
      return fail(res, 400, { code: 'LEAD_APPROVE_INVALID_STATE', message: `Cannot approve a lead that is ${lead.status || lead.leadStage}` });
    }

    const updateData: Partial<typeof lead> = {
      status: 'approved',
      conversionProbability: qualityScore || 80,
      remarks: notes ? `Approved by ${req.user?.username}: ${notes}` : `Approved by ${req.user?.username}`,
      updatedAt: new Date()
    };

    // Optionally assign to executive upon approval
    if (assignToExecutive) {
      updateData.assignedTo = assignToExecutive.id;
    }

    // Move to qualified stage
    if (lead.leadStage === 'new' || lead.leadStage === 'contacted') {
      updateData.leadStage = 'qualified';
    }

    const updatedLead = await storage.updateLead(leadId, updateData);

    // Log approval
    console.log(`Lead ${lead.leadId} approved by ${req.user?.username}`);

    return ok(res, {
      success: true,
      message: 'Lead approved successfully',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error approving lead:', error);
    return fail(res, 500, { code: 'LEAD_APPROVE_FAILED', message: 'Failed to approve lead' });
  }
});

// PATCH /api/leads/:id/reject - Reject lead (Sales Manager)
router.patch('/leads/:id/reject', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { reason, feedback, allowResubmission = false } = req.body;

    if (!reason) {
      return fail(res, 400, { code: 'REJECTION_REASON_REQUIRED', message: 'Rejection reason is required' });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return fail(res, 404, { code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    }

    // Cannot reject already converted leads
    if (lead.leadStage === 'converted') {
      return fail(res, 400, { code: 'LEAD_REJECT_INVALID_STATE', message: 'Cannot reject a converted lead' });
    }

    const updatedLead = await storage.updateLead(leadId, {
      status: 'rejected',
      leadStage: allowResubmission ? 'new' : 'lost',
      lostReason: reason,
      remarks: feedback ? `Rejected: ${feedback}` : `Rejected by ${req.user?.username}`,
      updatedAt: new Date()
    });

    // Log rejection activity
    console.log(`Lead ${lead.leadId} rejected by ${req.user?.username}. Reason: ${reason}`);

    return ok(res, {
      success: true,
      message: allowResubmission
        ? 'Lead returned for more information'
        : 'Lead rejected',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error rejecting lead:', error);
    return fail(res, 500, { code: 'LEAD_REJECT_FAILED', message: 'Failed to reject lead' });
  }
});

// POST /api/leads/:id/request-info - Request more information on lead
router.post('/leads/:id/request-info', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { requiredFields, message, deadline } = req.body;

    if (!requiredFields || !Array.isArray(requiredFields) || requiredFields.length === 0) {
      return fail(res, 400, { code: 'REQUIRED_FIELDS_REQUIRED', message: 'requiredFields array is required' });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return fail(res, 404, { code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    }

    const updatedLead = await storage.updateLead(leadId, {
      status: 'info_requested',
      remarks: `Info requested: ${requiredFields.join(', ')}${message ? ` - ${message}` : ''}`,
      nextFollowupDate: deadline ? new Date(deadline) : null,
      updatedAt: new Date()
    });

    // Log info request activity
    console.log(`Lead ${lead.leadId} - info requested by ${req.user?.username}: ${requiredFields.join(', ')}`);

    return ok(res, {
      success: true,
      message: 'Information requested from lead submitter',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Error requesting lead info:', error);
    return fail(res, 500, { code: 'LEAD_REQUEST_INFO_FAILED', message: 'Failed to request lead information' });
  }
});

// GET /api/leads/pending-approval - Get leads pending manager approval
router.get('/leads/pending-approval', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const result = await storage.getAllLeads({
      stage: 'new',
      limit: parseInt(limit as string),
      offset,
    });

    const pendingLeads = result.leads.filter((lead: any) =>
      lead.status !== 'converted' && lead.status !== 'rejected' && lead.status !== 'approved'
    );

    return ok(res, {
      leads: pendingLeads,
      pagination: {
        total: pendingLeads.length,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(pendingLeads.length / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error fetching pending leads:', error);
    return fail(res, 500, { code: 'PENDING_LEADS_FETCH_FAILED', message: 'Failed to fetch pending leads' });
  }
});

// POST /api/leads/:id/score - Calculate lead quality score
router.post('/leads/:id/score', requireMinimumRole(USER_ROLES.SALES_EXECUTIVE), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const lead = await storage.getLead(leadId);

    if (!lead) {
      return fail(res, 404, { code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    }

    // Calculate lead quality score based on multiple factors
    let score = 0;
    const factors: { factor: string; score: number; maxScore: number }[] = [];

    // 1. Company information completeness (max 20)
    if (lead.clientName) { score += 5; factors.push({ factor: 'Company Name', score: 5, maxScore: 5 }); }
    if (lead.state) { score += 5; factors.push({ factor: 'State', score: 5, maxScore: 5 }); }
    if (lead.entityType) { score += 5; factors.push({ factor: 'Entity Type', score: 5, maxScore: 5 }); }
    if (lead.serviceInterested) { score += 5; factors.push({ factor: 'Service Interested', score: 5, maxScore: 5 }); }

    // 2. Contact information (max 20)
    if (lead.contactEmail) { score += 10; factors.push({ factor: 'Email', score: 10, maxScore: 10 }); }
    if (lead.contactPhone) { score += 5; factors.push({ factor: 'Phone', score: 5, maxScore: 5 }); }
    if (lead.preSalesExecutive) { score += 5; factors.push({ factor: 'Pre-Sales Executive', score: 5, maxScore: 5 }); }

    // 3. Budget qualification (max 20)
    const budget = lead.estimatedValue ? parseFloat(lead.estimatedValue) : 0;
    if (budget >= 100000) { score += 20; factors.push({ factor: 'Budget (₹1L+)', score: 20, maxScore: 20 }); }
    else if (budget >= 50000) { score += 15; factors.push({ factor: 'Budget (₹50K+)', score: 15, maxScore: 20 }); }
    else if (budget >= 25000) { score += 10; factors.push({ factor: 'Budget (₹25K+)', score: 10, maxScore: 20 }); }
    else if (budget > 0) { score += 5; factors.push({ factor: 'Budget (Specified)', score: 5, maxScore: 20 }); }

    // 4. Lead source quality (max 20)
    const highQualitySources = ['referral', 'partner', 'existing_client'];
    const mediumQualitySources = ['website', 'linkedin', 'google'];
    if (highQualitySources.includes(lead.leadSource || '')) {
      score += 20; factors.push({ factor: 'High-Quality Source', score: 20, maxScore: 20 });
    } else if (mediumQualitySources.includes(lead.leadSource || '')) {
      score += 12; factors.push({ factor: 'Medium-Quality Source', score: 12, maxScore: 20 });
    } else if (lead.leadSource) {
      score += 5; factors.push({ factor: 'Source Specified', score: 5, maxScore: 20 });
    }

    // 5. Service interest (max 20)
    const requiredServices = lead.requiredServices as string[] | null;
    if (requiredServices && Array.isArray(requiredServices) && requiredServices.length > 0) {
      const serviceScore = Math.min(requiredServices.length * 5, 20);
      score += serviceScore;
      factors.push({ factor: 'Service Interest', score: serviceScore, maxScore: 20 });
    }

    // Determine qualification level
    let qualificationLevel: 'hot' | 'warm' | 'cold' | 'unqualified';
    if (score >= 80) qualificationLevel = 'hot';
    else if (score >= 60) qualificationLevel = 'warm';
    else if (score >= 40) qualificationLevel = 'cold';
    else qualificationLevel = 'unqualified';

    // Update lead with score (using conversionProbability as quality score)
    await storage.updateLead(leadId, {
      conversionProbability: score,
      remarks: `Quality score: ${score}/100 (${qualificationLevel})`,
      updatedAt: new Date()
    });

    return ok(res, {
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
    return fail(res, 500, { code: 'LEAD_SCORE_FAILED', message: 'Failed to score lead' });
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
      convertedBy,
    } = req.body;

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return fail(res, 404, { code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    }

    if (lead.leadStage === 'converted' || lead.status === 'converted') {
      return fail(res, 400, { code: 'LEAD_ALREADY_CONVERTED', message: 'Lead has already been converted' });
    }

    const clientId = await generateClientId();
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const userData = {
      username: lead.contactEmail || `client_${clientId.toLowerCase()}`,
      password: hashedPassword,
      email: lead.contactEmail || `${clientId.toLowerCase()}@pending.digicomply.in`,
      phone: lead.contactPhone || null,
      fullName: lead.clientName || 'New Client',
      role: 'client' as const,
      isActive: true,
      emailVerified: false,
    };

    const newUser = await storage.createUser(userData);

    // Create business entity record for the converted lead
    const businessEntity = await storage.createBusinessEntity({
      ownerId: newUser.id,
      clientId: clientId,
      name: lead.clientName || 'New Client',
      entityType: lead.entityType || 'proprietorship',
      pan: null,
      gstin: null,
      contactEmail: lead.contactEmail || null,
      contactPhone: lead.contactPhone || null,
      state: lead.state || null,
      leadSource: lead.leadSource || null,
      onboardingStage: 'pending',
      clientStatus: 'active',
      isActive: true,
      leadId: lead.id,
      notes: `Auto-created from lead conversion of ${lead.leadId}`,
    });

    const updatedLead = await storage.updateLead(leadId, {
      leadStage: 'converted',
      status: 'converted',
      convertedAt: new Date(),
      remarks: `Converted to client ${clientId} by ${convertedBy || req.user?.username || 'system'}${notes ? `: ${notes}` : ''}`,
    });

    let serviceRequest = null;
    if (createServiceRequest && selectedServiceId) {
      serviceRequest = await storage.createServiceRequest({
        serviceId: selectedServiceId,
        userId: newUser.id,
        status: 'initiated',
        priority: lead.priority || 'medium',
        currentMilestone: 'initiated',
        internalNotes: 'Auto-created from lead conversion',
        totalAmount: 0,
      });
    }

    console.log(`Lead ${lead.leadId} converted to client ${clientId} by ${convertedBy || req.user?.username}`);

    return ok(res, {
      success: true,
      message: 'Lead converted to client successfully',
      lead: updatedLead,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        temporaryPassword: tempPassword,
      },
      clientId,
      businessEntity: {
        id: businessEntity.id,
        clientId: businessEntity.clientId,
        name: businessEntity.name,
      },
      serviceRequest: serviceRequest
        ? {
            id: serviceRequest.id,
            status: serviceRequest.status,
          }
        : null,
    });
  } catch (error) {
    console.error('Error converting lead:', error);
    return fail(res, 500, { code: 'LEAD_CONVERT_FAILED', message: 'Failed to convert lead to client' });
  }
});

// ============================================================================
// INTELLIGENT LEAD ASSIGNMENT ENDPOINTS
// ============================================================================

// POST /api/leads/:id/auto-assign - Auto-assign lead using intelligent matching
router.post('/leads/:id/auto-assign', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { serviceCategory, priority, rules } = req.body;

    const result = await leadAssignmentService.autoAssign(leadId, {
      serviceCategory,
      priority,
      rules,
    });

    if (!result.success) {
      return fail(res, 400, { code: 'LEAD_ASSIGNMENT_REJECTED', message: result.reason || 'Lead assignment failed' });
    }

    return ok(res, {
      success: true,
      message: 'Lead auto-assigned successfully',
      assignedTo: result.assignedTo,
      assignedToName: result.assignedToName,
      matchScore: result.matchScore,
    });
  } catch (error) {
    console.error('Error auto-assigning lead:', error);
    return fail(res, 500, { code: 'LEAD_AUTO_ASSIGN_FAILED', message: 'Failed to auto-assign lead' });
  }
});

// POST /api/leads/:id/manual-assign - Manually assign lead to specific executive
router.post('/leads/:id/manual-assign', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { assignToUserId, notes } = req.body;

    if (!assignToUserId) {
      return fail(res, 400, { code: 'ASSIGN_TO_USER_REQUIRED', message: 'assignToUserId is required' });
    }

    const result = await leadAssignmentService.manualAssign(
      leadId,
      assignToUserId,
      req.user?.id || 0,
      notes
    );

    if (!result.success) {
      return fail(res, 400, { code: 'LEAD_ASSIGNMENT_REJECTED', message: result.reason || 'Lead assignment failed' });
    }

    return ok(res, {
      success: true,
      message: 'Lead manually assigned',
      assignedTo: result.assignedTo,
      assignedToName: result.assignedToName,
    });
  } catch (error) {
    console.error('Error manually assigning lead:', error);
    return fail(res, 500, { code: 'LEAD_MANUAL_ASSIGN_FAILED', message: 'Failed to manually assign lead' });
  }
});

// POST /api/leads/:id/reassign - Reassign lead to different executive
router.post('/leads/:id/reassign', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { newAssigneeId, reason } = req.body;

    if (!newAssigneeId || !reason) {
      return fail(res, 400, { code: 'NEW_ASSIGNEE_AND_REASON_REQUIRED', message: 'newAssigneeId and reason are required' });
    }

    const result = await leadAssignmentService.reassign(
      leadId,
      newAssigneeId,
      req.user?.id || 0,
      reason
    );

    if (!result.success) {
      return fail(res, 400, { code: 'LEAD_ASSIGNMENT_REJECTED', message: result.reason || 'Lead assignment failed' });
    }

    return ok(res, {
      success: true,
      message: 'Lead reassigned successfully',
      assignedTo: result.assignedTo,
      assignedToName: result.assignedToName,
    });
  } catch (error) {
    console.error('Error reassigning lead:', error);
    return fail(res, 500, { code: 'LEAD_REASSIGN_FAILED', message: 'Failed to reassign lead' });
  }
});

// POST /api/leads/:id/round-robin-assign - Round-robin assignment for even distribution
router.post('/leads/:id/round-robin-assign', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const leadId = parseInt(req.params.id);

    const result = await leadAssignmentService.roundRobinAssign(leadId);

    if (!result.success) {
      return fail(res, 400, { code: 'LEAD_ASSIGNMENT_REJECTED', message: result.reason || 'Lead assignment failed' });
    }

    return ok(res, {
      success: true,
      message: 'Lead assigned via round-robin',
      assignedTo: result.assignedTo,
      assignedToName: result.assignedToName,
    });
  } catch (error) {
    console.error('Error round-robin assigning lead:', error);
    return fail(res, 500, { code: 'LEAD_ROUND_ROBIN_ASSIGN_FAILED', message: 'Failed to round-robin assign lead' });
  }
});

// POST /api/leads/bulk-auto-assign - Bulk auto-assign multiple leads
router.post('/leads/bulk-auto-assign', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const { leadIds, rules } = req.body;

    const result = await leadAssignmentService.bulkAutoAssign(leadIds, rules);

    return ok(res, {
      success: true,
      message: `Assigned ${result.assigned} of ${result.total} leads`,
      ...result,
    });
  } catch (error) {
    console.error('Error bulk auto-assigning leads:', error);
    return fail(res, 500, { code: 'LEAD_BULK_AUTO_ASSIGN_FAILED', message: 'Failed to bulk auto-assign leads' });
  }
});

// GET /api/leads/workload-summary - Get executive workload summary
router.get('/leads/workload-summary', requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res) => {
  try {
    const summary = await leadAssignmentService.getWorkloadSummary();
    return ok(res, summary);
  } catch (error) {
    console.error('Error fetching workload summary:', error);
    return fail(res, 500, { code: 'LEAD_WORKLOAD_SUMMARY_FETCH_FAILED', message: 'Failed to fetch workload summary' });
  }
});

export function registerLeadsRoutes(app: express.Application) {
  app.use('/api', router);
  console.log('✅ Leads routes registered');
}
