/**
 * ADVANCED CRM ENGINE
 *
 * Enterprise-grade CRM system with capabilities exceeding Salesforce/Zoho:
 * - Complete lead lifecycle management
 * - AI-powered lead scoring
 * - Bulk operations (import, update, delete)
 * - External conversion handling
 * - Automated nurturing workflows
 * - Advanced analytics & forecasting
 * - Multi-channel communication tracking
 * - Commission & revenue attribution
 *
 * Designed for compliance service businesses with 96+ services
 */

import { Router, Request, Response } from 'express';
import { db } from './db';
import {
  leads,
  users,
  businessEntities,
  services,
  serviceRequests,
  salesProposals,
  commissionRecords,
  agents,
  insertLeadSchema
} from '@shared/schema';
import { eq, and, or, gte, lte, like, desc, asc, sql, count, isNull, isNotNull } from 'drizzle-orm';
import { generateTempPassword } from './security-utils';
import { sessionAuthMiddleware } from './rbac-middleware';
import { parse } from 'csv-parse/sync';
import bcrypt from 'bcrypt';
import { syncComplianceTracking } from './compliance-tracking-sync';

const router = Router();

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface LeadScore {
  total: number;
  breakdown: {
    engagement: number;
    firmographics: number;
    behavior: number;
    timing: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: string;
}

interface LeadJourney {
  stage: string;
  enteredAt: Date;
  duration: number;
  activities: LeadActivity[];
  nextActions: string[];
}

interface LeadActivity {
  id: number;
  type: 'call' | 'email' | 'meeting' | 'note' | 'status_change' | 'proposal' | 'document' | 'whatsapp';
  description: string;
  performedBy: string;
  timestamp: Date;
  outcome?: string;
  nextFollowup?: Date;
  metadata?: any;
}

interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data?: any }>;
  duplicates: number;
  created: number;
  updated: number;
}

interface PipelineMetrics {
  totalLeads: number;
  byStage: Record<string, number>;
  bySource: Record<string, number>;
  conversionRate: number;
  avgCycleTime: number;
  forecastedRevenue: number;
  thisMonth: {
    newLeads: number;
    converted: number;
    lost: number;
    revenue: number;
  };
}

// ============================================================================
// LEAD STAGES CONFIGURATION
// ============================================================================

const LEAD_STAGES = {
  NEW: { key: 'new', label: 'New Lead', order: 1, color: '#3B82F6' },
  CONTACTED: { key: 'contacted', label: 'Contacted', order: 2, color: '#8B5CF6' },
  QUALIFIED: { key: 'qualified', label: 'Qualified', order: 3, color: '#06B6D4' },
  PROPOSAL: { key: 'proposal', label: 'Proposal Sent', order: 4, color: '#F59E0B' },
  NEGOTIATION: { key: 'negotiation', label: 'Negotiation', order: 5, color: '#EC4899' },
  CONVERTED: { key: 'converted', label: 'Converted', order: 6, color: '#10B981' },
  LOST: { key: 'lost', label: 'Lost', order: 7, color: '#EF4444' },
  // Legacy stages mapping
  HOT_LEAD: { key: 'hot_lead', label: 'Hot Lead', order: 2, color: '#EF4444' },
  WARM_LEAD: { key: 'warm_lead', label: 'Warm Lead', order: 3, color: '#F59E0B' },
  COLD_LEAD: { key: 'cold_lead', label: 'Cold Lead', order: 4, color: '#6B7280' },
};

const LEAD_SOURCES = [
  'google_ads', 'facebook_ads', 'linkedin', 'website', 'referral',
  'cold_call', 'event', 'partner', 'email_campaign', 'whatsapp',
  'instagram', 'youtube', 'trade_show', 'webinar', 'content_marketing',
  'seo', 'affiliate', 'direct', 'other'
];

// ============================================================================
// AI LEAD SCORING ENGINE
// ============================================================================

function calculateLeadScore(lead: any): LeadScore {
  let engagement = 0;
  let firmographics = 0;
  let behavior = 0;
  let timing = 0;

  // Engagement Score (0-25)
  const interactions = lead.interactionHistory?.length || 0;
  engagement += Math.min(interactions * 3, 15);
  if (lead.lastContactDate) {
    const daysSinceContact = Math.floor((Date.now() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
    engagement += daysSinceContact < 3 ? 10 : daysSinceContact < 7 ? 5 : 0;
  }

  // Firmographics Score (0-25)
  if (lead.entityType === 'pvt_ltd' || lead.entityType === 'public_ltd') firmographics += 10;
  else if (lead.entityType === 'llp' || lead.entityType === 'opc') firmographics += 7;
  else firmographics += 3;

  if (lead.estimatedValue) {
    if (lead.estimatedValue >= 100000) firmographics += 15;
    else if (lead.estimatedValue >= 50000) firmographics += 10;
    else if (lead.estimatedValue >= 20000) firmographics += 5;
  }

  // Behavior Score (0-25)
  const services = lead.requiredServices?.length || 0;
  behavior += Math.min(services * 5, 15);

  if (lead.kycDocuments && Object.keys(lead.kycDocuments).length > 0) {
    behavior += 10;
  }

  // Timing Score (0-25)
  if (lead.nextFollowupDate) {
    const followupDate = new Date(lead.nextFollowupDate);
    if (followupDate <= new Date()) timing += 10; // Overdue followup
  }

  // Stage-based timing bonus
  if (lead.stage === 'hot_lead' || lead.leadStage === 'Hot') timing += 15;
  else if (lead.stage === 'warm_lead' || lead.leadStage === 'Warm') timing += 10;
  else if (lead.stage === 'qualified' || lead.stage === 'proposal') timing += 12;

  const total = engagement + firmographics + behavior + timing;

  // Grade assignment
  let grade: LeadScore['grade'];
  let recommendation: string;

  if (total >= 80) {
    grade = 'A';
    recommendation = 'Hot prospect - Prioritize immediate follow-up and proposal';
  } else if (total >= 60) {
    grade = 'B';
    recommendation = 'Strong potential - Schedule discovery call within 48 hours';
  } else if (total >= 40) {
    grade = 'C';
    recommendation = 'Moderate interest - Nurture with relevant content';
  } else if (total >= 20) {
    grade = 'D';
    recommendation = 'Low priority - Add to drip campaign';
  } else {
    grade = 'F';
    recommendation = 'Unlikely to convert - Review qualification criteria';
  }

  return {
    total,
    breakdown: { engagement, firmographics, behavior, timing },
    grade,
    recommendation
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Parse and validate CSV data for lead import
 */
function parseLeadCSV(csvContent: string): { leads: any[]; errors: any[] } {
  const parsedLeads: any[] = [];
  const errors: any[] = [];

  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: true
    });

    records.forEach((record: any, index: number) => {
      const rowNum = index + 2; // +2 for header row and 0-index

      // Required field validation
      if (!record.clientName && !record.client_name && !record.name) {
        errors.push({ row: rowNum, error: 'Missing client name' });
        return;
      }

      if (!record.contactPhone && !record.phone && !record.mobile) {
        errors.push({ row: rowNum, error: 'Missing contact phone' });
        return;
      }

      // Map CSV columns to lead fields
      const lead = {
        clientName: record.clientName || record.client_name || record.name || record.company,
        contactEmail: record.contactEmail || record.email || record.contact_email,
        contactPhone: String(record.contactPhone || record.phone || record.mobile || '').replace(/[^\d+]/g, ''),
        state: record.state || record.location || record.region,
        entityType: mapEntityType(record.entityType || record.entity_type || record.business_type),
        requiredServices: parseServices(record.services || record.required_services || record.serviceInterested),
        serviceInterested: record.serviceInterested || record.service_interested || record.services || 'General Inquiry',
        leadSource: mapLeadSource(record.leadSource || record.lead_source || record.source),
        leadStage: record.leadStage || record.lead_stage || record.stage || 'Hot',
        stage: mapStage(record.stage || record.leadStage || 'new'),
        priority: record.priority || 'medium',
        estimatedValue: parseFloat(record.estimatedValue || record.estimated_value || record.value || '0') || null,
        remarks: record.remarks || record.notes || record.comment || '',
        nextFollowupDate: parseDate(record.nextFollowupDate || record.followup_date || record.next_followup),
        preSalesExecutive: record.preSalesExecutive || record.assigned_to || record.executive,
      };

      // Validate phone format
      if (lead.contactPhone.length < 10) {
        errors.push({ row: rowNum, error: `Invalid phone number: ${lead.contactPhone}` });
        return;
      }

      parsedLeads.push(lead);
    });

  } catch (error: any) {
    errors.push({ row: 0, error: `CSV parsing error: ${error.message}` });
  }

  return { leads: parsedLeads, errors };
}

function mapEntityType(value: string): string {
  const mapping: Record<string, string> = {
    'private limited': 'pvt_ltd',
    'pvt ltd': 'pvt_ltd',
    'private': 'pvt_ltd',
    'public limited': 'public_ltd',
    'public': 'public_ltd',
    'llp': 'llp',
    'limited liability': 'llp',
    'partnership': 'partnership',
    'proprietorship': 'proprietorship',
    'sole proprietor': 'proprietorship',
    'opc': 'opc',
    'one person': 'opc',
    'individual': 'individual',
  };
  return mapping[value?.toLowerCase()] || value || 'pvt_ltd';
}

function mapLeadSource(value: string): string {
  const mapping: Record<string, string> = {
    'google': 'google_ads',
    'facebook': 'facebook_ads',
    'fb': 'facebook_ads',
    'linkedin': 'linkedin',
    'website': 'website',
    'referral': 'referral',
    'reference': 'referral',
    'cold call': 'cold_call',
    'call': 'cold_call',
    'event': 'event',
    'partner': 'partner',
    'email': 'email_campaign',
    'whatsapp': 'whatsapp',
    'wa': 'whatsapp',
  };
  return mapping[value?.toLowerCase()] || value || 'website';
}

function mapStage(value: string): string {
  const mapping: Record<string, string> = {
    'new': 'new',
    'hot': 'hot_lead',
    'warm': 'warm_lead',
    'cold': 'cold_lead',
    'contacted': 'contacted',
    'qualified': 'qualified',
    'proposal': 'proposal',
    'negotiation': 'negotiation',
    'converted': 'converted',
    'won': 'converted',
    'lost': 'lost',
    'closed': 'lost',
  };
  return mapping[value?.toLowerCase()] || 'new';
}

function parseServices(value: string | string[]): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return value.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

// ============================================================================
// API ROUTES
// ============================================================================

// -----------------------------------------------------------------------------
// LEAD CRUD OPERATIONS
// -----------------------------------------------------------------------------

/**
 * GET /api/crm/leads
 * Advanced lead listing with filters, sorting, and pagination
 */
router.get('/leads', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      search,
      stage,
      source,
      priority,
      assignedTo,
      entityType,
      minValue,
      maxValue,
      dateFrom,
      dateTo,
      followupOverdue,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = db.select().from(leads);
    const conditions: any[] = [];

    // Search filter
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          like(leads.clientName, searchTerm),
          like(leads.contactEmail, searchTerm),
          like(leads.contactPhone, searchTerm),
          like(leads.leadId, searchTerm)
        )
      );
    }

    // Stage filter
    if (stage) {
      const stages = (stage as string).split(',');
      conditions.push(or(...stages.map(s => eq(leads.stage, s))));
    }

    // Source filter
    if (source) {
      conditions.push(eq(leads.leadSource, source as string));
    }

    // Priority filter
    if (priority) {
      conditions.push(eq(leads.priority, priority as string));
    }

    // Assigned to filter
    if (assignedTo) {
      conditions.push(eq(leads.preSalesExecutive, assignedTo as string));
    }

    // Entity type filter
    if (entityType) {
      conditions.push(eq(leads.entityType, entityType as string));
    }

    // Value range filter
    if (minValue) {
      conditions.push(gte(leads.estimatedValue, minValue as string));
    }
    if (maxValue) {
      conditions.push(lte(leads.estimatedValue, maxValue as string));
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(gte(leads.createdAt, new Date(dateFrom as string)));
    }
    if (dateTo) {
      conditions.push(lte(leads.createdAt, new Date(dateTo as string)));
    }

    // Overdue followup filter
    if (followupOverdue === 'true') {
      conditions.push(
        and(
          isNotNull(leads.nextFollowupDate),
          lte(leads.nextFollowupDate, new Date())
        )
      );
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Get total count
    const countResult = await db.select({ count: count() })
      .from(leads)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = countResult[0]?.count || 0;

    // Apply sorting
    const sortColumn = leads[sortBy as keyof typeof leads] || leads.createdAt;
    query = (sortOrder === 'asc' ? query.orderBy(asc(sortColumn)) : query.orderBy(desc(sortColumn))) as any;

    // Apply pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    query = query.limit(limitNum).offset((pageNum - 1) * limitNum) as any;

    const leadsData = await query;

    // Enrich with scores
    const enrichedLeads = leadsData.map((lead: any) => ({
      ...lead,
      score: calculateLeadScore(lead)
    }));

    res.json({
      success: true,
      leads: enrichedLeads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error: any) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

/**
 * GET /api/crm/leads/:id
 * Get single lead with full details
 */
router.get('/leads/:id', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);

    const [lead] = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get related proposals
    const proposals = await db.select()
      .from(salesProposals)
      .where(eq(salesProposals.leadId, leadId));

    // Get related service requests (if converted)
    let serviceReqs: any[] = [];
    if (lead.stage === 'converted' && lead.convertedAt) {
      serviceReqs = await db.select()
        .from(serviceRequests)
        .where(eq(serviceRequests.clientId, lead.clientName))
        .limit(10);
    }

    // Calculate score
    const score = calculateLeadScore(lead);

    // Build journey timeline
    const journey = buildLeadJourney(lead);

    res.json({
      success: true,
      lead: {
        ...lead,
        score,
        journey,
        proposals,
        serviceRequests: serviceReqs
      }
    });

  } catch (error: any) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

/**
 * POST /api/crm/leads
 * Create new lead with validation
 */
router.post('/leads', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Generate lead ID
    const lastLead = await db.select({ leadId: leads.leadId })
      .from(leads)
      .orderBy(desc(leads.id))
      .limit(1);

    const lastNum = lastLead[0]?.leadId
      ? parseInt(lastLead[0].leadId.replace('L', ''))
      : 0;
    const newLeadId = `L${String(lastNum + 1).padStart(4, '0')}`;

    // Check for duplicates
    const existing = await db.select({ id: leads.id })
      .from(leads)
      .where(
        or(
          eq(leads.contactPhone, data.contactPhone),
          data.contactEmail ? eq(leads.contactEmail, data.contactEmail) : undefined
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Duplicate lead',
        message: 'A lead with this phone or email already exists',
        existingLeadId: existing[0].id
      });
    }

    // Create lead
    const [newLead] = await db.insert(leads)
      .values({
        leadId: newLeadId,
        clientName: data.clientName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        state: data.state,
        entityType: data.entityType || 'pvt_ltd',
        requiredServices: data.requiredServices || [],
        serviceInterested: data.serviceInterested || 'General Inquiry',
        leadSource: data.leadSource || 'website',
        preSalesExecutive: data.preSalesExecutive,
        leadStage: data.leadStage || 'Hot',
        stage: data.stage || 'new',
        priority: data.priority || 'medium',
        estimatedValue: data.estimatedValue,
        nextFollowupDate: data.nextFollowupDate ? new Date(data.nextFollowupDate) : null,
        remarks: data.remarks,
        notes: data.notes,
        interactionHistory: [{
          date: new Date().toISOString(),
          type: 'created',
          notes: 'Lead created',
          executive: data.preSalesExecutive || 'System'
        }]
      })
      .returning();

    // Calculate initial score
    const score = calculateLeadScore(newLead);

    res.status(201).json({
      success: true,
      lead: { ...newLead, score },
      message: 'Lead created successfully'
    });

  } catch (error: any) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead', details: error.message });
  }
});

/**
 * PUT /api/crm/leads/:id
 * Update lead with full data
 */
router.put('/leads/:id', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    const data = req.body;

    // Get existing lead
    const [existingLead] = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Track stage change
    const stageChanged = data.stage && data.stage !== existingLead.stage;
    let interactionHistory = existingLead.interactionHistory as any[] || [];

    if (stageChanged) {
      interactionHistory.push({
        date: new Date().toISOString(),
        type: 'status_change',
        notes: `Stage changed from ${existingLead.stage} to ${data.stage}`,
        executive: (req as any).user?.name || 'System'
      });
    }

    // Update lead
    const [updatedLead] = await db.update(leads)
      .set({
        ...data,
        interactionHistory,
        updatedAt: new Date(),
        // Handle conversion
        convertedAt: data.stage === 'converted' && !existingLead.convertedAt ? new Date() : existingLead.convertedAt,
        closedAt: (data.stage === 'converted' || data.stage === 'lost') && !existingLead.closedAt ? new Date() : existingLead.closedAt,
        lostReason: data.stage === 'lost' ? data.lostReason : existingLead.lostReason
      })
      .where(eq(leads.id, leadId))
      .returning();

    res.json({
      success: true,
      lead: { ...updatedLead, score: calculateLeadScore(updatedLead) },
      message: 'Lead updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

/**
 * DELETE /api/crm/leads/:id
 * Delete single lead
 */
router.delete('/leads/:id', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);

    const [deleted] = await db.delete(leads)
      .where(eq(leads.id, leadId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully',
      deletedLead: deleted
    });

  } catch (error: any) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// -----------------------------------------------------------------------------
// BULK OPERATIONS
// -----------------------------------------------------------------------------

/**
 * POST /api/crm/leads/bulk-import
 * Import leads from CSV
 */
router.post('/leads/bulk-import', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { csvContent, updateExisting = false } = req.body;

    if (!csvContent) {
      return res.status(400).json({ error: 'CSV content is required' });
    }

    const { leads: parsedLeads, errors } = parseLeadCSV(csvContent);

    if (errors.length > 0 && parsedLeads.length === 0) {
      return res.status(400).json({
        error: 'CSV parsing failed',
        errors
      });
    }

    const result: BulkOperationResult = {
      success: 0,
      failed: errors.length,
      errors,
      duplicates: 0,
      created: 0,
      updated: 0
    };

    // Get last lead ID for generating new IDs
    const lastLead = await db.select({ leadId: leads.leadId })
      .from(leads)
      .orderBy(desc(leads.id))
      .limit(1);

    let lastNum = lastLead[0]?.leadId
      ? parseInt(lastLead[0].leadId.replace('L', ''))
      : 0;

    for (let i = 0; i < parsedLeads.length; i++) {
      const lead = parsedLeads[i];
      const rowNum = i + 2;

      try {
        // Check for existing lead
        const existing = await db.select()
          .from(leads)
          .where(
            or(
              eq(leads.contactPhone, lead.contactPhone),
              lead.contactEmail ? eq(leads.contactEmail, lead.contactEmail) : undefined
            )
          )
          .limit(1);

        if (existing.length > 0) {
          if (updateExisting) {
            // Update existing lead
            await db.update(leads)
              .set({
                ...lead,
                updatedAt: new Date()
              })
              .where(eq(leads.id, existing[0].id));

            result.updated++;
            result.success++;
          } else {
            result.duplicates++;
          }
        } else {
          // Create new lead
          lastNum++;
          const newLeadId = `L${String(lastNum).padStart(4, '0')}`;

          await db.insert(leads)
            .values({
              leadId: newLeadId,
              ...lead,
              interactionHistory: [{
                date: new Date().toISOString(),
                type: 'imported',
                notes: 'Lead imported via bulk upload',
                executive: 'System'
              }]
            });

          result.created++;
          result.success++;
        }

      } catch (err: any) {
        result.failed++;
        result.errors.push({ row: rowNum, error: err.message, data: lead });
      }
    }

    res.json({
      success: true,
      result,
      message: `Bulk import completed: ${result.created} created, ${result.updated} updated, ${result.duplicates} duplicates, ${result.failed} failed`
    });

  } catch (error: any) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Bulk import failed', details: error.message });
  }
});

/**
 * POST /api/crm/leads/bulk-update
 * Bulk update multiple leads
 */
router.post('/leads/bulk-update', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { leadIds, updates } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs array is required' });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Updates object is required' });
    }

    let successCount = 0;
    const errors: any[] = [];

    for (const id of leadIds) {
      try {
        await db.update(leads)
          .set({
            ...updates,
            updatedAt: new Date()
          })
          .where(eq(leads.id, id));

        successCount++;
      } catch (err: any) {
        errors.push({ id, error: err.message });
      }
    }

    res.json({
      success: true,
      updated: successCount,
      failed: errors.length,
      errors,
      message: `${successCount} leads updated successfully`
    });

  } catch (error: any) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
});

/**
 * POST /api/crm/leads/bulk-delete
 * Bulk delete multiple leads
 */
router.post('/leads/bulk-delete', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs array is required' });
    }

    let successCount = 0;
    const errors: any[] = [];

    for (const id of leadIds) {
      try {
        await db.delete(leads).where(eq(leads.id, id));
        successCount++;
      } catch (err: any) {
        errors.push({ id, error: err.message });
      }
    }

    res.json({
      success: true,
      deleted: successCount,
      failed: errors.length,
      errors,
      message: `${successCount} leads deleted successfully`
    });

  } catch (error: any) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

/**
 * POST /api/crm/leads/bulk-assign
 * Bulk assign leads to executive
 */
router.post('/leads/bulk-assign', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { leadIds, assignTo } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs array is required' });
    }

    if (!assignTo) {
      return res.status(400).json({ error: 'Assignee is required' });
    }

    let successCount = 0;

    for (const id of leadIds) {
      const [lead] = await db.select({ interactionHistory: leads.interactionHistory })
        .from(leads)
        .where(eq(leads.id, id))
        .limit(1);

      const history = lead?.interactionHistory as any[] || [];
      history.push({
        date: new Date().toISOString(),
        type: 'assigned',
        notes: `Lead assigned to ${assignTo}`,
        executive: (req as any).user?.name || 'System'
      });

      await db.update(leads)
        .set({
          preSalesExecutive: assignTo,
          assignedTo: parseInt(assignTo) || null,
          interactionHistory: history,
          updatedAt: new Date()
        })
        .where(eq(leads.id, id));

      successCount++;
    }

    res.json({
      success: true,
      assigned: successCount,
      message: `${successCount} leads assigned to ${assignTo}`
    });

  } catch (error: any) {
    console.error('Bulk assign error:', error);
    res.status(500).json({ error: 'Bulk assign failed' });
  }
});

// -----------------------------------------------------------------------------
// EXTERNAL CONVERSION HANDLING
// -----------------------------------------------------------------------------

/**
 * POST /api/crm/leads/:id/mark-converted-external
 * Mark lead as converted externally (outside the system)
 */
router.post('/leads/:id/mark-converted-external', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    const {
      conversionDate,
      conversionSource,
      clientDetails,
      services,
      revenue,
      notes
    } = req.body;

    const [existingLead] = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (existingLead.stage === 'converted') {
      return res.status(400).json({ error: 'Lead is already converted' });
    }

    // Update interaction history
    const history = existingLead.interactionHistory as any[] || [];
    history.push({
      date: new Date().toISOString(),
      type: 'external_conversion',
      notes: `Marked as converted externally. Source: ${conversionSource || 'Manual'}. ${notes || ''}`,
      executive: (req as any).user?.name || 'System',
      metadata: {
        conversionDate,
        conversionSource,
        services,
        revenue
      }
    });

    // Update lead
    const [updatedLead] = await db.update(leads)
      .set({
        stage: 'converted',
        convertedAt: conversionDate ? new Date(conversionDate) : new Date(),
        closedAt: new Date(),
        estimatedValue: revenue || existingLead.estimatedValue,
        interactionHistory: history,
        updatedAt: new Date()
      })
      .where(eq(leads.id, leadId))
      .returning();

    // Optionally create client record
    if (clientDetails && clientDetails.createClient) {
      let ownerId = clientDetails.ownerId as number | undefined;

      if (!ownerId && existingLead.contactEmail) {
        const [existingUser] = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.email, existingLead.contactEmail))
          .limit(1);

        if (existingUser) {
          ownerId = existingUser.id;
        } else {
          const tempPassword = generateTempPassword();
          const hashedPassword = await bcrypt.hash(tempPassword, 12);
          const usernameBase = existingLead.contactEmail.split('@')[0];
          const username = `${usernameBase}_${Date.now().toString(36)}`;

          const [newUser] = await db.insert(users)
            .values({
              username,
              email: existingLead.contactEmail,
              phone: existingLead.contactPhone || null,
              fullName: existingLead.clientName || 'Client',
              password: hashedPassword,
              role: 'client',
              isActive: true,
            })
            .returning();
          ownerId = newUser.id;
        }
      }

      if (!ownerId) {
        throw new Error('Unable to create client without ownerId or contactEmail');
      }

      // Create business entity for converted lead
      const lastEntity = await db.select({ clientId: businessEntities.clientId })
        .from(businessEntities)
        .orderBy(desc(businessEntities.id))
        .limit(1);

      const lastClientNum = lastEntity[0]?.clientId
        ? parseInt(lastEntity[0].clientId.replace('C', ''))
        : 0;
      const newClientId = `C${String(lastClientNum + 1).padStart(4, '0')}`;

      const [newEntity] = await db.insert(businessEntities)
        .values({
          ownerId,
          clientId: newClientId,
          name: existingLead.clientName,
          contactEmail: existingLead.contactEmail,
          contactPhone: existingLead.contactPhone,
          entityType: existingLead.entityType || 'pvt_ltd',
          state: existingLead.state,
          leadSource: existingLead.leadSource,
          clientStatus: 'active',
          onboardingStage: 'completed',
          metadata: {
            convertedFromLead: existingLead.leadId,
            conversionDate: new Date().toISOString(),
            ...clientDetails
          }
        })
        .returning();

      await db.update(users)
        .set({ businessEntityId: newEntity.id })
        .where(eq(users.id, ownerId));

      await syncComplianceTracking({ entityIds: [newEntity.id] });
    }

    res.json({
      success: true,
      lead: updatedLead,
      message: 'Lead marked as converted successfully'
    });

  } catch (error: any) {
    console.error('External conversion error:', error);
    res.status(500).json({ error: 'Failed to mark as converted' });
  }
});

/**
 * POST /api/crm/leads/sync-external-conversions
 * Sync leads converted in external systems (e.g., direct sales, partner)
 */
router.post('/leads/sync-external-conversions', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { conversions } = req.body;

    if (!conversions || !Array.isArray(conversions)) {
      return res.status(400).json({ error: 'Conversions array is required' });
    }

    const results = {
      synced: 0,
      notFound: 0,
      alreadyConverted: 0,
      errors: [] as any[]
    };

    for (const conversion of conversions) {
      try {
        // Find lead by phone or email
        const [lead] = await db.select()
          .from(leads)
          .where(
            or(
              eq(leads.contactPhone, conversion.phone),
              conversion.email ? eq(leads.contactEmail, conversion.email) : undefined,
              conversion.leadId ? eq(leads.leadId, conversion.leadId) : undefined
            )
          )
          .limit(1);

        if (!lead) {
          results.notFound++;
          continue;
        }

        if (lead.stage === 'converted') {
          results.alreadyConverted++;
          continue;
        }

        // Update lead as converted
        const history = lead.interactionHistory as any[] || [];
        history.push({
          date: new Date().toISOString(),
          type: 'external_sync',
          notes: `Synced from external system: ${conversion.source || 'Unknown'}`,
          executive: 'System',
          metadata: conversion
        });

        await db.update(leads)
          .set({
            stage: 'converted',
            convertedAt: conversion.conversionDate ? new Date(conversion.conversionDate) : new Date(),
            closedAt: new Date(),
            estimatedValue: conversion.revenue || lead.estimatedValue,
            interactionHistory: history,
            updatedAt: new Date()
          })
          .where(eq(leads.id, lead.id));

        results.synced++;

      } catch (err: any) {
        results.errors.push({ conversion, error: err.message });
      }
    }

    res.json({
      success: true,
      results,
      message: `Sync completed: ${results.synced} synced, ${results.notFound} not found, ${results.alreadyConverted} already converted`
    });

  } catch (error: any) {
    console.error('External sync error:', error);
    res.status(500).json({ error: 'External sync failed' });
  }
});

// -----------------------------------------------------------------------------
// LEAD ACTIVITIES & INTERACTIONS
// -----------------------------------------------------------------------------

/**
 * POST /api/crm/leads/:id/activity
 * Add activity/interaction to lead
 */
router.post('/leads/:id/activity', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    const { type, description, outcome, nextFollowup, metadata } = req.body;

    const [lead] = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const history = lead.interactionHistory as any[] || [];
    const activity = {
      id: history.length + 1,
      date: new Date().toISOString(),
      type: type || 'note',
      notes: description,
      outcome,
      executive: (req as any).user?.name || 'System',
      metadata
    };

    history.push(activity);

    const updates: any = {
      interactionHistory: history,
      lastContactDate: new Date(),
      updatedAt: new Date()
    };

    if (nextFollowup) {
      updates.nextFollowupDate = new Date(nextFollowup);
    }

    const [updatedLead] = await db.update(leads)
      .set(updates)
      .where(eq(leads.id, leadId))
      .returning();

    res.json({
      success: true,
      activity,
      lead: updatedLead,
      message: 'Activity added successfully'
    });

  } catch (error: any) {
    console.error('Add activity error:', error);
    res.status(500).json({ error: 'Failed to add activity' });
  }
});

// -----------------------------------------------------------------------------
// ANALYTICS & PIPELINE
// -----------------------------------------------------------------------------

/**
 * GET /api/crm/pipeline
 * Get pipeline view with stage-wise breakdown
 */
router.get('/pipeline', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo, assignedTo } = req.query;

    const conditions: any[] = [];

    if (dateFrom) {
      conditions.push(gte(leads.createdAt, new Date(dateFrom as string)));
    }
    if (dateTo) {
      conditions.push(lte(leads.createdAt, new Date(dateTo as string)));
    }
    if (assignedTo) {
      conditions.push(eq(leads.preSalesExecutive, assignedTo as string));
    }

    // Get leads by stage
    const allLeads = await db.select()
      .from(leads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(leads.createdAt));

    // Group by stage
    const pipeline: Record<string, any[]> = {};
    const stageMetrics: Record<string, { count: number; value: number }> = {};

    Object.values(LEAD_STAGES).forEach(stage => {
      pipeline[stage.key] = [];
      stageMetrics[stage.key] = { count: 0, value: 0 };
    });

    allLeads.forEach((lead: any) => {
      const stage = lead.stage || 'new';
      if (!pipeline[stage]) {
        pipeline[stage] = [];
        stageMetrics[stage] = { count: 0, value: 0 };
      }
      pipeline[stage].push({
        ...lead,
        score: calculateLeadScore(lead)
      });
      stageMetrics[stage].count++;
      stageMetrics[stage].value += parseFloat(lead.estimatedValue || '0');
    });

    // Calculate metrics
    const totalLeads = allLeads.length;
    const converted = stageMetrics['converted']?.count || 0;
    const conversionRate = totalLeads > 0 ? (converted / totalLeads) * 100 : 0;
    const totalValue = Object.values(stageMetrics).reduce((sum, s) => sum + s.value, 0);

    res.json({
      success: true,
      pipeline,
      stageMetrics,
      stages: Object.values(LEAD_STAGES),
      summary: {
        totalLeads,
        converted,
        conversionRate: Math.round(conversionRate * 10) / 10,
        totalPipelineValue: totalValue,
        avgDealSize: totalLeads > 0 ? Math.round(totalValue / totalLeads) : 0
      }
    });

  } catch (error: any) {
    console.error('Pipeline error:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

/**
 * GET /api/crm/analytics
 * Comprehensive CRM analytics
 */
router.get('/analytics', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // This month leads
    const thisMonthLeads = await db.select()
      .from(leads)
      .where(gte(leads.createdAt, thisMonthStart));

    // Last month leads
    const lastMonthLeads = await db.select()
      .from(leads)
      .where(and(
        gte(leads.createdAt, lastMonthStart),
        lte(leads.createdAt, lastMonthEnd)
      ));

    // All leads for stage distribution
    const allLeads = await db.select()
      .from(leads);

    // Calculate metrics
    const byStage: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byExecutive: Record<string, number> = {};
    let totalValue = 0;
    let convertedCount = 0;
    let convertedValue = 0;

    allLeads.forEach((lead: any) => {
      byStage[lead.stage || 'new'] = (byStage[lead.stage || 'new'] || 0) + 1;
      bySource[lead.leadSource || 'unknown'] = (bySource[lead.leadSource || 'unknown'] || 0) + 1;

      if (lead.preSalesExecutive) {
        byExecutive[lead.preSalesExecutive] = (byExecutive[lead.preSalesExecutive] || 0) + 1;
      }

      totalValue += parseFloat(lead.estimatedValue || '0');

      if (lead.stage === 'converted') {
        convertedCount++;
        convertedValue += parseFloat(lead.estimatedValue || '0');
      }
    });

    // This month metrics
    const thisMonthNew = thisMonthLeads.length;
    const thisMonthConverted = thisMonthLeads.filter((l: any) => l.stage === 'converted').length;
    const thisMonthLost = thisMonthLeads.filter((l: any) => l.stage === 'lost').length;
    const thisMonthValue = thisMonthLeads.reduce((sum: number, l: any) =>
      sum + (l.stage === 'converted' ? parseFloat(l.estimatedValue || '0') : 0), 0);

    // Growth calculations
    const lastMonthNew = lastMonthLeads.length;
    const growth = lastMonthNew > 0 ? ((thisMonthNew - lastMonthNew) / lastMonthNew) * 100 : 100;

    res.json({
      success: true,
      analytics: {
        overview: {
          totalLeads: allLeads.length,
          totalPipelineValue: totalValue,
          convertedCount,
          convertedValue,
          conversionRate: allLeads.length > 0 ? (convertedCount / allLeads.length) * 100 : 0,
          avgDealSize: convertedCount > 0 ? convertedValue / convertedCount : 0
        },
        thisMonth: {
          newLeads: thisMonthNew,
          converted: thisMonthConverted,
          lost: thisMonthLost,
          revenue: thisMonthValue,
          growth: Math.round(growth * 10) / 10
        },
        distribution: {
          byStage,
          bySource,
          byExecutive
        },
        topSources: Object.entries(bySource)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([source, count]) => ({ source, count })),
        topExecutives: Object.entries(byExecutive)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([executive, count]) => ({ executive, count }))
      }
    });

  } catch (error: any) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/crm/forecast
 * Revenue forecasting based on pipeline
 */
router.get('/forecast', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const allLeads = await db.select()
      .from(leads)
      .where(
        or(
          eq(leads.stage, 'qualified'),
          eq(leads.stage, 'proposal'),
          eq(leads.stage, 'negotiation'),
          eq(leads.stage, 'hot_lead'),
          eq(leads.stage, 'warm_lead')
        )
      );

    // Conversion probability by stage
    const stageProbability: Record<string, number> = {
      'new': 0.05,
      'hot_lead': 0.30,
      'warm_lead': 0.15,
      'cold_lead': 0.05,
      'contacted': 0.10,
      'qualified': 0.25,
      'proposal': 0.50,
      'negotiation': 0.75
    };

    let weightedForecast = 0;
    let bestCase = 0;
    let worstCase = 0;

    const byStage: Record<string, { count: number; value: number; weighted: number }> = {};

    allLeads.forEach((lead: any) => {
      const value = parseFloat(lead.estimatedValue || '0');
      const probability = stageProbability[lead.stage] || 0.10;

      const stage = lead.stage || 'new';
      if (!byStage[stage]) {
        byStage[stage] = { count: 0, value: 0, weighted: 0 };
      }

      byStage[stage].count++;
      byStage[stage].value += value;
      byStage[stage].weighted += value * probability;

      weightedForecast += value * probability;
      bestCase += value;
      worstCase += value * (probability * 0.5);
    });

    res.json({
      success: true,
      forecast: {
        weighted: Math.round(weightedForecast),
        bestCase: Math.round(bestCase),
        worstCase: Math.round(worstCase),
        byStage,
        leadsInPipeline: allLeads.length,
        methodology: 'Stage-based probability weighting'
      }
    });

  } catch (error: any) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

function buildLeadJourney(lead: any): LeadJourney {
  const history = lead.interactionHistory as any[] || [];
  const activities: LeadActivity[] = history.map((h: any, idx: number) => ({
    id: idx + 1,
    type: h.type,
    description: h.notes,
    performedBy: h.executive,
    timestamp: new Date(h.date),
    outcome: h.outcome,
    metadata: h.metadata
  }));

  // Calculate stage duration
  const createdAt = new Date(lead.createdAt);
  const duration = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Generate next actions
  const nextActions: string[] = [];

  if (!lead.nextFollowupDate) {
    nextActions.push('Schedule follow-up call');
  } else if (new Date(lead.nextFollowupDate) < new Date()) {
    nextActions.push('Overdue follow-up - contact immediately');
  }

  if (lead.stage === 'new') {
    nextActions.push('Qualify the lead');
    nextActions.push('Send introductory email');
  } else if (lead.stage === 'qualified' || lead.stage === 'hot_lead') {
    nextActions.push('Send proposal');
    nextActions.push('Schedule discovery call');
  } else if (lead.stage === 'proposal') {
    nextActions.push('Follow up on proposal');
    nextActions.push('Address objections');
  } else if (lead.stage === 'negotiation') {
    nextActions.push('Finalize terms');
    nextActions.push('Prepare contract');
  }

  if (!lead.kycDocuments || Object.keys(lead.kycDocuments || {}).length === 0) {
    nextActions.push('Collect KYC documents');
  }

  return {
    stage: lead.stage,
    enteredAt: createdAt,
    duration,
    activities,
    nextActions: nextActions.slice(0, 5)
  };
}

// -----------------------------------------------------------------------------
// EXPORT CSV TEMPLATE
// -----------------------------------------------------------------------------

router.get('/leads/export-template', sessionAuthMiddleware, async (req: Request, res: Response) => {
  const template = `clientName,contactPhone,contactEmail,state,entityType,serviceInterested,leadSource,leadStage,priority,estimatedValue,remarks
"ABC Pvt Ltd",9876543210,abc@example.com,Maharashtra,pvt_ltd,"GST Registration",website,Hot,high,50000,"Interested in quick registration"
"XYZ LLP",8765432109,xyz@example.com,Karnataka,llp,"Company Incorporation",referral,Warm,medium,75000,"Referred by existing client"`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=lead_import_template.csv');
  res.send(template);
});

/**
 * GET /api/crm/leads/export
 * Export leads to CSV
 */
router.get('/leads/export', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { stage, source, dateFrom, dateTo } = req.query;

    const conditions: any[] = [];

    if (stage) conditions.push(eq(leads.stage, stage as string));
    if (source) conditions.push(eq(leads.leadSource, source as string));
    if (dateFrom) conditions.push(gte(leads.createdAt, new Date(dateFrom as string)));
    if (dateTo) conditions.push(lte(leads.createdAt, new Date(dateTo as string)));

    const leadsData = await db.select()
      .from(leads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(leads.createdAt));

    // Build CSV
    const headers = [
      'Lead ID', 'Client Name', 'Phone', 'Email', 'State', 'Entity Type',
      'Service', 'Source', 'Stage', 'Priority', 'Value', 'Executive',
      'Created At', 'Last Contact', 'Next Followup', 'Remarks'
    ];

    const rows = leadsData.map((lead: any) => [
      lead.leadId,
      lead.clientName,
      lead.contactPhone,
      lead.contactEmail || '',
      lead.state || '',
      lead.entityType || '',
      lead.serviceInterested || '',
      lead.leadSource || '',
      lead.stage || '',
      lead.priority || '',
      lead.estimatedValue || '',
      lead.preSalesExecutive || '',
      lead.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : '',
      lead.lastContactDate ? new Date(lead.lastContactDate).toISOString().split('T')[0] : '',
      lead.nextFollowupDate ? new Date(lead.nextFollowupDate).toISOString().split('T')[0] : '',
      (lead.remarks || '').replace(/"/g, '""')
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);

  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// =============================================================================
// ENHANCED LEAD SCORING & AI INSIGHTS
// =============================================================================

/**
 * Calculate conversion probability based on lead attributes and historical data
 */
function calculateConversionProbability(lead: any): {
  probability: number;
  confidence: 'low' | 'medium' | 'high';
  factors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral'; weight: number }>;
} {
  let probability = 50; // Base probability
  const factors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral'; weight: number }> = [];

  // Stage-based probability
  const stageProbabilities: Record<string, number> = {
    'new': 15,
    'contacted': 25,
    'hot_lead': 40,
    'warm_lead': 30,
    'cold_lead': 10,
    'qualified': 50,
    'proposal': 65,
    'negotiation': 80,
    'converted': 100,
    'lost': 0
  };

  probability = stageProbabilities[lead.stage] || 25;
  factors.push({
    factor: `Current stage: ${lead.stage}`,
    impact: probability >= 50 ? 'positive' : probability >= 25 ? 'neutral' : 'negative',
    weight: 25
  });

  // Engagement recency
  if (lead.lastContactDate) {
    const daysSinceContact = Math.floor((Date.now() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceContact < 3) {
      probability += 15;
      factors.push({ factor: 'Contacted within 3 days', impact: 'positive', weight: 15 });
    } else if (daysSinceContact < 7) {
      probability += 8;
      factors.push({ factor: 'Contacted within a week', impact: 'positive', weight: 8 });
    } else if (daysSinceContact > 14) {
      probability -= 10;
      factors.push({ factor: 'No contact for 2+ weeks', impact: 'negative', weight: -10 });
    }
  }

  // Interaction count
  const interactions = lead.interactionHistory?.length || 0;
  if (interactions >= 5) {
    probability += 12;
    factors.push({ factor: '5+ interactions recorded', impact: 'positive', weight: 12 });
  } else if (interactions >= 3) {
    probability += 6;
    factors.push({ factor: '3+ interactions recorded', impact: 'positive', weight: 6 });
  } else if (interactions === 0) {
    probability -= 8;
    factors.push({ factor: 'No interactions recorded', impact: 'negative', weight: -8 });
  }

  // Deal value
  const value = parseFloat(lead.estimatedValue) || 0;
  if (value >= 100000) {
    probability += 10;
    factors.push({ factor: 'High value deal (1L+)', impact: 'positive', weight: 10 });
  } else if (value >= 50000) {
    probability += 5;
    factors.push({ factor: 'Medium value deal (50K+)', impact: 'positive', weight: 5 });
  }

  // Entity type
  const premiumEntities = ['pvt_ltd', 'public_ltd', 'llp'];
  if (premiumEntities.includes(lead.entityType)) {
    probability += 8;
    factors.push({ factor: `Premium entity type: ${lead.entityType}`, impact: 'positive', weight: 8 });
  }

  // Multiple services interest
  const services = lead.requiredServices?.length || 0;
  if (services >= 3) {
    probability += 10;
    factors.push({ factor: 'Interest in 3+ services', impact: 'positive', weight: 10 });
  } else if (services >= 2) {
    probability += 5;
    factors.push({ factor: 'Interest in multiple services', impact: 'positive', weight: 5 });
  }

  // KYC documents submitted
  if (lead.kycDocuments && Object.keys(lead.kycDocuments).length > 0) {
    probability += 15;
    factors.push({ factor: 'KYC documents provided', impact: 'positive', weight: 15 });
  }

  // Lead source quality
  const highQualitySources = ['referral', 'partner', 'event', 'webinar'];
  const mediumQualitySources = ['linkedin', 'google_ads', 'content_marketing'];
  if (highQualitySources.includes(lead.leadSource)) {
    probability += 10;
    factors.push({ factor: `High-quality source: ${lead.leadSource}`, impact: 'positive', weight: 10 });
  } else if (mediumQualitySources.includes(lead.leadSource)) {
    probability += 5;
    factors.push({ factor: `Medium-quality source: ${lead.leadSource}`, impact: 'positive', weight: 5 });
  }

  // Clamp probability
  probability = Math.max(0, Math.min(100, probability));

  // Confidence based on data completeness
  let dataPoints = 0;
  if (lead.contactEmail) dataPoints++;
  if (lead.contactPhone) dataPoints++;
  if (lead.entityType) dataPoints++;
  if (lead.estimatedValue) dataPoints++;
  if (lead.lastContactDate) dataPoints++;
  if (interactions > 0) dataPoints++;

  const confidence: 'low' | 'medium' | 'high' = dataPoints >= 5 ? 'high' : dataPoints >= 3 ? 'medium' : 'low';

  return {
    probability: Math.round(probability),
    confidence,
    factors: factors.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
  };
}

/**
 * Generate AI-like insights and next best actions
 */
function generateLeadInsights(lead: any, score: LeadScore, conversionProb: ReturnType<typeof calculateConversionProbability>) {
  const insights: string[] = [];
  const nextBestActions: Array<{ action: string; priority: 'high' | 'medium' | 'low'; reason: string }> = [];

  // Time-based insights
  const daysSinceCreation = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceCreation > 30 && lead.stage === 'new') {
    insights.push('Lead has been in "New" stage for over 30 days without progression');
    nextBestActions.push({
      action: 'Qualify or archive this lead',
      priority: 'high',
      reason: 'Stale leads reduce pipeline accuracy'
    });
  }

  // Followup insights
  if (lead.nextFollowupDate) {
    const followupDate = new Date(lead.nextFollowupDate);
    const now = new Date();
    if (followupDate < now) {
      const daysOverdue = Math.floor((now.getTime() - followupDate.getTime()) / (1000 * 60 * 60 * 24));
      insights.push(`Follow-up is ${daysOverdue} day(s) overdue`);
      nextBestActions.push({
        action: 'Contact immediately',
        priority: 'high',
        reason: 'Overdue follow-up reduces conversion probability'
      });
    }
  } else if (lead.stage !== 'converted' && lead.stage !== 'lost') {
    insights.push('No follow-up date scheduled');
    nextBestActions.push({
      action: 'Schedule a follow-up date',
      priority: 'medium',
      reason: 'Scheduled follow-ups improve conversion rates'
    });
  }

  // Score-based insights
  if (score.grade === 'A' && conversionProb.probability >= 70) {
    insights.push('This is a hot lead with high conversion potential');
    nextBestActions.push({
      action: 'Send personalized proposal',
      priority: 'high',
      reason: 'High-score leads should receive immediate attention'
    });
  } else if (score.grade === 'C' || score.grade === 'D') {
    insights.push('Lead shows moderate to low engagement');
    nextBestActions.push({
      action: 'Add to nurture campaign',
      priority: 'medium',
      reason: 'Automated nurturing can improve engagement'
    });
  }

  // Missing data insights
  if (!lead.contactEmail) {
    insights.push('Email address is missing');
    nextBestActions.push({
      action: 'Collect email address',
      priority: 'medium',
      reason: 'Email enables multi-channel communication'
    });
  }

  if (!lead.estimatedValue || lead.estimatedValue === 0) {
    insights.push('Deal value not estimated');
    nextBestActions.push({
      action: 'Estimate deal value',
      priority: 'low',
      reason: 'Accurate valuations improve forecasting'
    });
  }

  // Stage progression insights
  const stageOrder = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted'];
  const currentStageIndex = stageOrder.indexOf(lead.stage);
  if (currentStageIndex >= 0 && currentStageIndex < stageOrder.length - 1) {
    const nextStage = stageOrder[currentStageIndex + 1];
    insights.push(`Next milestone: Move to "${nextStage}" stage`);
  }

  return {
    insights,
    nextBestActions: nextBestActions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }),
    healthScore: Math.round((score.total + conversionProb.probability) / 2),
    riskLevel: conversionProb.probability < 30 ? 'high' : conversionProb.probability < 60 ? 'medium' : 'low'
  };
}

/**
 * GET /api/crm/leads/:id/intelligence
 * Get enhanced scoring, conversion probability, and AI insights
 */
router.get('/leads/:id/intelligence', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);

    const [lead] = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const score = calculateLeadScore(lead);
    const conversionProbability = calculateConversionProbability(lead);
    const insights = generateLeadInsights(lead, score, conversionProbability);

    res.json({
      leadId: lead.id,
      leadName: lead.clientName,
      currentStage: lead.stage,
      scoring: score,
      conversionProbability,
      insights: insights.insights,
      nextBestActions: insights.nextBestActions,
      healthScore: insights.healthScore,
      riskLevel: insights.riskLevel,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error generating lead intelligence:', error);
    res.status(500).json({ error: 'Failed to generate lead intelligence' });
  }
});

/**
 * GET /api/crm/leads/pipeline-intelligence
 * Get AI-powered pipeline analysis
 */
router.get('/leads/pipeline-intelligence', sessionAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const allLeads = await db.select()
      .from(leads)
      .where(
        and(
          or(
            isNull(leads.stage),
            sql`${leads.stage} NOT IN ('converted', 'lost')`
          )
        )
      );

    // Calculate scores and probabilities for all leads
    const analyzedLeads = allLeads.map((lead: any) => ({
      ...lead,
      score: calculateLeadScore(lead),
      conversionProbability: calculateConversionProbability(lead)
    }));

    // Pipeline health metrics
    const highProbability = analyzedLeads.filter(l => l.conversionProbability.probability >= 70);
    const mediumProbability = analyzedLeads.filter(l => l.conversionProbability.probability >= 40 && l.conversionProbability.probability < 70);
    const lowProbability = analyzedLeads.filter(l => l.conversionProbability.probability < 40);

    // At-risk leads (overdue followups with high value)
    const atRiskLeads = analyzedLeads.filter(l => {
      if (!l.nextFollowupDate) return false;
      const isOverdue = new Date(l.nextFollowupDate) < new Date();
      const hasValue = (l.estimatedValue || 0) >= 20000;
      return isOverdue && hasValue;
    });

    // Top opportunities
    const topOpportunities = [...analyzedLeads]
      .filter(l => l.conversionProbability.probability >= 50)
      .sort((a, b) => {
        const scoreA = a.conversionProbability.probability * (a.estimatedValue || 1);
        const scoreB = b.conversionProbability.probability * (b.estimatedValue || 1);
        return scoreB - scoreA;
      })
      .slice(0, 10)
      .map(l => ({
        id: l.id,
        name: l.clientName,
        stage: l.stage,
        value: l.estimatedValue,
        probability: l.conversionProbability.probability,
        expectedValue: Math.round((l.estimatedValue || 0) * l.conversionProbability.probability / 100)
      }));

    // Forecasted revenue
    const forecastedRevenue = analyzedLeads.reduce((sum, l) => {
      return sum + Math.round((l.estimatedValue || 0) * l.conversionProbability.probability / 100);
    }, 0);

    // Stage bottlenecks
    const stageAnalysis: Record<string, { count: number; avgDays: number; avgProbability: number }> = {};
    analyzedLeads.forEach(l => {
      const stage = l.stage || 'new';
      if (!stageAnalysis[stage]) {
        stageAnalysis[stage] = { count: 0, avgDays: 0, avgProbability: 0 };
      }
      stageAnalysis[stage].count++;
      const daysInStage = Math.floor((Date.now() - new Date(l.updatedAt || l.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      stageAnalysis[stage].avgDays = (stageAnalysis[stage].avgDays * (stageAnalysis[stage].count - 1) + daysInStage) / stageAnalysis[stage].count;
      stageAnalysis[stage].avgProbability = (stageAnalysis[stage].avgProbability * (stageAnalysis[stage].count - 1) + l.conversionProbability.probability) / stageAnalysis[stage].count;
    });

    res.json({
      summary: {
        totalLeads: analyzedLeads.length,
        highProbability: highProbability.length,
        mediumProbability: mediumProbability.length,
        lowProbability: lowProbability.length,
        atRisk: atRiskLeads.length,
        forecastedRevenue
      },
      topOpportunities,
      atRiskLeads: atRiskLeads.slice(0, 5).map(l => ({
        id: l.id,
        name: l.clientName,
        value: l.estimatedValue,
        followupOverdueBy: Math.floor((Date.now() - new Date(l.nextFollowupDate!).getTime()) / (1000 * 60 * 60 * 24)),
        recommendation: 'Contact immediately to prevent deal loss'
      })),
      stageAnalysis: Object.entries(stageAnalysis).map(([stage, data]) => ({
        stage,
        count: data.count,
        avgDaysInStage: Math.round(data.avgDays),
        avgConversionProbability: Math.round(data.avgProbability),
        isBottleneck: data.avgDays > 14 && data.count > 3
      })),
      recommendations: [
        highProbability.length > 0 ? `Prioritize ${highProbability.length} high-probability leads for immediate action` : null,
        atRiskLeads.length > 0 ? `${atRiskLeads.length} high-value leads have overdue follow-ups` : null,
        Object.values(stageAnalysis).some(s => s.avgDays > 14) ? 'Some stages show bottlenecks - review qualification criteria' : null
      ].filter(Boolean),
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error generating pipeline intelligence:', error);
    res.status(500).json({ error: 'Failed to generate pipeline intelligence' });
  }
});

export default router;
