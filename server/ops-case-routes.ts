import { Router, Request, Response } from 'express';
import { db } from './db';
import { serviceRequests, businessEntities, leads, caseNotes, users } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth } from './auth-middleware';
import { requireRole } from './rbac-middleware';

const router = Router();

// Middleware: require ops role
const opsRoles = ['ops_executive', 'ops_manager', 'admin', 'super_admin'];

// GET /api/ops/cases/:id - Full case detail with lead attribution
router.get('/cases/:id', requireAuth, requireRole(...opsRoles), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Try to find by numeric ID or readable ID (SR2600001)
    const isNumeric = /^\d+$/.test(id);

    const [caseData] = await db
      .select({
        // Service request fields
        id: serviceRequests.id,
        requestId: serviceRequests.requestId,
        status: serviceRequests.status,
        priority: serviceRequests.priority,
        serviceId: serviceRequests.serviceId,
        totalAmount: serviceRequests.totalAmount,
        progress: serviceRequests.progress,
        currentMilestone: serviceRequests.currentMilestone,
        slaDeadline: serviceRequests.slaDeadline,
        dueDate: serviceRequests.dueDate,
        expectedCompletion: serviceRequests.expectedCompletion,
        assignedTeamMember: serviceRequests.assignedTeamMember,
        clientNotes: serviceRequests.clientNotes,
        internalNotes: serviceRequests.internalNotes,
        createdAt: serviceRequests.createdAt,
        updatedAt: serviceRequests.updatedAt,
        // Filing status
        filingStage: serviceRequests.filingStage,
        filingDate: serviceRequests.filingDate,
        filingPortal: serviceRequests.filingPortal,
        arnNumber: serviceRequests.arnNumber,
        queryDetails: serviceRequests.queryDetails,
        queryRaisedAt: serviceRequests.queryRaisedAt,
        responseSubmittedAt: serviceRequests.responseSubmittedAt,
        finalStatus: serviceRequests.finalStatus,
        finalStatusDate: serviceRequests.finalStatusDate,
        certificateUrl: serviceRequests.certificateUrl,
        // Lead ID for attribution
        leadId: serviceRequests.leadId,
        // Business entity (client) info
        businessEntityId: serviceRequests.businessEntityId,
        clientId: businessEntities.clientId,
        clientName: businessEntities.name,
        clientGstin: businessEntities.gstin,
        clientPan: businessEntities.pan,
        clientEmail: businessEntities.contactEmail,
        clientPhone: businessEntities.contactPhone,
        entityType: businessEntities.entityType,
        // Lead info (via lead_id join)
        leadReadableId: leads.leadId,
        leadSource: leads.leadSource,
        leadAgentId: leads.agentId,
        leadCreatedAt: leads.createdAt,
        leadConvertedAt: leads.convertedAt,
      })
      .from(serviceRequests)
      .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
      .leftJoin(leads, eq(serviceRequests.leadId, leads.id))
      .where(
        isNumeric
          ? eq(serviceRequests.id, parseInt(id))
          : eq(serviceRequests.requestId, id)
      )
      .limit(1);

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(caseData);
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ error: 'Failed to fetch case details' });
  }
});

// GET /api/ops/cases/:id/notes - List notes for case
router.get('/cases/:id/notes', requireAuth, requireRole(...opsRoles), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const serviceRequestId = parseInt(id);

    const notes = await db
      .select({
        id: caseNotes.id,
        content: caseNotes.content,
        isClientVisible: caseNotes.isClientVisible,
        createdAt: caseNotes.createdAt,
        authorId: caseNotes.authorId,
        authorName: users.fullName,
        authorRole: users.role,
      })
      .from(caseNotes)
      .leftJoin(users, eq(caseNotes.authorId, users.id))
      .where(
        and(
          eq(caseNotes.serviceRequestId, serviceRequestId),
          eq(caseNotes.isDeleted, false)
        )
      )
      .orderBy(desc(caseNotes.createdAt));

    res.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/ops/cases/:id/notes - Add note
router.post('/cases/:id/notes', requireAuth, requireRole(...opsRoles), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, isClientVisible = false } = req.body;
    const authorId = (req as any).user?.id;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const [note] = await db
      .insert(caseNotes)
      .values({
        serviceRequestId: parseInt(id),
        authorId,
        content: content.trim(),
        isClientVisible,
      })
      .returning();

    res.status(201).json(note);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// PATCH /api/ops/cases/:id/filing - Update filing status
router.patch('/cases/:id/filing', requireAuth, requireRole(...opsRoles), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      filingStage,
      filingDate,
      filingPortal,
      arnNumber,
      queryDetails,
      queryRaisedAt,
      responseSubmittedAt,
      finalStatus,
      finalStatusDate,
      certificateUrl,
    } = req.body;

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (filingStage !== undefined) updateData.filingStage = filingStage;
    if (filingDate !== undefined) updateData.filingDate = filingDate ? new Date(filingDate) : null;
    if (filingPortal !== undefined) updateData.filingPortal = filingPortal;
    if (arnNumber !== undefined) updateData.arnNumber = arnNumber;
    if (queryDetails !== undefined) updateData.queryDetails = queryDetails;
    if (queryRaisedAt !== undefined) updateData.queryRaisedAt = queryRaisedAt ? new Date(queryRaisedAt) : null;
    if (responseSubmittedAt !== undefined) updateData.responseSubmittedAt = responseSubmittedAt ? new Date(responseSubmittedAt) : null;
    if (finalStatus !== undefined) updateData.finalStatus = finalStatus;
    if (finalStatusDate !== undefined) updateData.finalStatusDate = finalStatusDate ? new Date(finalStatusDate) : null;
    if (certificateUrl !== undefined) updateData.certificateUrl = certificateUrl;

    const [updated] = await db
      .update(serviceRequests)
      .set(updateData)
      .where(eq(serviceRequests.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating filing status:', error);
    res.status(500).json({ error: 'Failed to update filing status' });
  }
});

export default router;
