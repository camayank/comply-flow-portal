/**
 * Agent KYC API Routes
 *
 * Complete KYC management for agent onboarding
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { documents, agentKycStatus, agentKycDocuments, kycVerificationLog } from '../db/schema/agent-kyc';
import { authenticate, requireRole } from '../middleware/auth';
import { storageService } from '../services/storage';
import { queueManager } from '../queues';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'));
    }
  },
});

// ============================================
// KYC STATUS ENDPOINTS
// ============================================

/**
 * GET /api/agent/kyc/status
 * Get agent's KYC status
 */
router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get or create KYC status
    let status = await db.query.agentKycStatus.findFirst({
      where: eq(agentKycStatus.agentId, userId),
    });

    if (!status) {
      const [newStatus] = await db.insert(agentKycStatus)
        .values({ agentId: userId })
        .returning();
      status = newStatus;
    }

    // Get document statuses
    const kycDocs = await db.query.agentKycDocuments.findMany({
      where: eq(agentKycDocuments.agentId, userId),
      orderBy: desc(agentKycDocuments.createdAt),
    });

    // Group by document type (get latest of each type)
    const docsByType: Record<string, any> = {};
    for (const doc of kycDocs) {
      if (!docsByType[doc.documentType]) {
        docsByType[doc.documentType] = doc;
      }
    }

    const requiredDocuments = [
      { type: 'pan', label: 'PAN Card', required: true },
      { type: 'aadhaar', label: 'Aadhaar Card', required: true },
      { type: 'bank_statement', label: 'Bank Statement / Cancelled Cheque', required: true },
      { type: 'address_proof', label: 'Address Proof', required: true },
      { type: 'photo', label: 'Passport Photo', required: false },
      { type: 'signature', label: 'Signature', required: false },
    ];

    const documentStatus = requiredDocuments.map(reqDoc => {
      const submitted = docsByType[reqDoc.type];
      return {
        type: reqDoc.type,
        label: reqDoc.label,
        required: reqDoc.required,
        status: submitted?.verificationStatus || 'not_submitted',
        submittedAt: submitted?.createdAt,
        verifiedAt: submitted?.verifiedAt,
        rejectionReason: submitted?.rejectionReason,
      };
    });

    res.json({
      overallStatus: status.overallStatus,
      documentsSubmitted: status.documentsSubmitted,
      documentsRequired: status.documentsRequired,
      documentsApproved: status.documentsApproved,
      documentsRejected: status.documentsRejected,
      submittedAt: status.submittedAt,
      reviewedAt: status.reviewedAt,
      approvedAt: status.approvedAt,
      rejectedAt: status.rejectedAt,
      rejectionReason: status.rejectionReason,
      expiresAt: status.expiresAt,
      documents: documentStatus,
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

/**
 * GET /api/agent/kyc/documents
 * Get all KYC documents
 */
router.get('/documents', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const kycDocs = await db.query.agentKycDocuments.findMany({
      where: eq(agentKycDocuments.agentId, userId),
      orderBy: desc(agentKycDocuments.createdAt),
      with: {
        document: true,
      },
    });

    res.json(kycDocs.map(doc => ({
      id: doc.id,
      documentType: doc.documentType,
      fileName: doc.document?.fileName,
      mimeType: doc.document?.mimeType,
      fileSize: doc.document?.fileSize,
      verificationStatus: doc.verificationStatus,
      ocrConfidence: doc.ocrConfidence,
      verifiedAt: doc.verifiedAt,
      rejectionReason: doc.rejectionReason,
      expiryDate: doc.expiryDate,
      version: doc.version,
      createdAt: doc.createdAt,
    })));
  } catch (error) {
    console.error('Get KYC documents error:', error);
    res.status(500).json({ error: 'Failed to fetch KYC documents' });
  }
});

/**
 * POST /api/agent/kyc/documents
 * Upload a KYC document
 */
router.post('/documents', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const file = req.file;
    const { documentType, documentNumber } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const validTypes = ['pan', 'aadhaar', 'bank_statement', 'cancelled_cheque', 'address_proof', 'photo', 'signature'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    // Upload to storage
    const storedFile = await storageService.upload({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }, {
      category: 'kyc',
      subcategory: documentType,
      entityType: 'agent',
      entityId: userId,
      userId,
    });

    // Check for existing document of same type
    const existing = await db.query.agentKycDocuments.findFirst({
      where: and(
        eq(agentKycDocuments.agentId, userId),
        eq(agentKycDocuments.documentType, documentType)
      ),
      orderBy: desc(agentKycDocuments.version),
    });

    // Create KYC document record
    const [kycDoc] = await db.insert(agentKycDocuments).values({
      agentId: userId,
      documentType,
      documentId: storedFile.id,
      documentNumber: documentNumber || null, // Will be encrypted if sensitive
      verificationStatus: 'pending',
      version: existing ? existing.version + 1 : 1,
      previousVersionId: existing?.id,
    }).returning();

    // Log the upload
    await db.insert(kycVerificationLog).values({
      kycDocumentId: kycDoc.id,
      action: 'submitted',
      performedBy: userId,
      performedByRole: 'agent',
      newStatus: 'pending',
      notes: `Document uploaded: ${file.originalname}`,
    });

    // Update KYC status
    await updateAgentKycStatus(userId);

    // Queue for OCR verification
    await queueManager.addJob('kyc_verification', {
      kycDocumentId: kycDoc.id,
      documentType,
      storagePath: storedFile.storagePath,
    });

    res.status(201).json({
      success: true,
      document: {
        id: kycDoc.id,
        documentType,
        status: 'pending',
        version: kycDoc.version,
        uploadedAt: kycDoc.createdAt,
      },
    });
  } catch (error) {
    console.error('Upload KYC document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * GET /api/agent/kyc/documents/:id/download
 * Download a KYC document
 */
router.get('/documents/:id/download', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const docId = parseInt(req.params.id);

    const kycDoc = await db.query.agentKycDocuments.findFirst({
      where: and(
        eq(agentKycDocuments.id, docId),
        eq(agentKycDocuments.agentId, userId)
      ),
      with: {
        document: true,
      },
    });

    if (!kycDoc || !kycDoc.document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get signed URL
    const signedUrl = await storageService.getSignedUrl(kycDoc.document.id, 15);

    res.json({
      url: signedUrl,
      fileName: kycDoc.document.fileName,
      expiresIn: 15 * 60, // 15 minutes
    });
  } catch (error) {
    console.error('Download KYC document error:', error);
    res.status(500).json({ error: 'Failed to generate download link' });
  }
});

/**
 * DELETE /api/agent/kyc/documents/:id
 * Delete a KYC document (only if pending)
 */
router.delete('/documents/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const docId = parseInt(req.params.id);

    const kycDoc = await db.query.agentKycDocuments.findFirst({
      where: and(
        eq(agentKycDocuments.id, docId),
        eq(agentKycDocuments.agentId, userId)
      ),
    });

    if (!kycDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (kycDoc.verificationStatus !== 'pending') {
      return res.status(400).json({ error: 'Cannot delete document after verification started' });
    }

    // Soft delete the document
    if (kycDoc.documentId) {
      await db.update(documents)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        })
        .where(eq(documents.id, kycDoc.documentId));
    }

    // Remove KYC document record
    await db.delete(agentKycDocuments)
      .where(eq(agentKycDocuments.id, docId));

    // Update status
    await updateAgentKycStatus(userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete KYC document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * POST /api/agent/kyc/submit
 * Submit KYC for review
 */
router.post('/submit', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Check all required documents are submitted
    const kycDocs = await db.query.agentKycDocuments.findMany({
      where: eq(agentKycDocuments.agentId, userId),
    });

    const submittedTypes = new Set(kycDocs.map(d => d.documentType));
    const requiredTypes = ['pan', 'aadhaar', 'bank_statement', 'address_proof'];
    const missingTypes = requiredTypes.filter(t => !submittedTypes.has(t));

    if (missingTypes.length > 0) {
      return res.status(400).json({
        error: 'Missing required documents',
        missingDocuments: missingTypes,
      });
    }

    // Update status to under_review
    await db.update(agentKycStatus)
      .set({
        overallStatus: 'under_review',
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentKycStatus.agentId, userId));

    // Notify admins
    await queueManager.addJob('notifications', {
      type: 'admin_notification',
      subject: 'New KYC Submission',
      message: `Agent ID ${userId} has submitted KYC documents for review`,
      targetRole: 'admin',
    });

    res.json({
      success: true,
      message: 'KYC submitted for review',
    });
  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({ error: 'Failed to submit KYC' });
  }
});

// ============================================
// ADMIN KYC REVIEW ENDPOINTS
// ============================================

/**
 * GET /api/admin/kyc/pending
 * Get pending KYC submissions (Admin)
 */
router.get('/admin/pending', authenticate, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const { status = 'under_review', limit = '20', offset = '0' } = req.query;

    const pendingKyc = await db.query.agentKycStatus.findMany({
      where: eq(agentKycStatus.overallStatus, status as string),
      orderBy: desc(agentKycStatus.submittedAt),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      with: {
        agent: {
          columns: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    res.json(pendingKyc.map(kyc => ({
      id: kyc.id,
      agentId: kyc.agentId,
      agentName: kyc.agent?.fullName,
      agentEmail: kyc.agent?.email,
      overallStatus: kyc.overallStatus,
      documentsSubmitted: kyc.documentsSubmitted,
      documentsApproved: kyc.documentsApproved,
      submittedAt: kyc.submittedAt,
    })));
  } catch (error) {
    console.error('Get pending KYC error:', error);
    res.status(500).json({ error: 'Failed to fetch pending KYC' });
  }
});

/**
 * GET /api/admin/kyc/:agentId
 * Get agent's KYC details for review (Admin)
 */
router.get('/admin/:agentId', authenticate, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const agentId = parseInt(req.params.agentId);

    const status = await db.query.agentKycStatus.findFirst({
      where: eq(agentKycStatus.agentId, agentId),
      with: {
        agent: {
          columns: { id: true, fullName: true, email: true, phone: true, createdAt: true },
        },
      },
    });

    if (!status) {
      return res.status(404).json({ error: 'KYC not found' });
    }

    const kycDocs = await db.query.agentKycDocuments.findMany({
      where: eq(agentKycDocuments.agentId, agentId),
      orderBy: desc(agentKycDocuments.createdAt),
      with: {
        document: true,
        verifier: {
          columns: { id: true, fullName: true },
        },
      },
    });

    res.json({
      status,
      documents: kycDocs.map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.document?.fileName,
        verificationStatus: doc.verificationStatus,
        ocrConfidence: doc.ocrConfidence,
        ocrExtractedData: doc.ocrExtractedData,
        verifiedBy: doc.verifier?.fullName,
        verifiedAt: doc.verifiedAt,
        rejectionReason: doc.rejectionReason,
        version: doc.version,
        createdAt: doc.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get agent KYC error:', error);
    res.status(500).json({ error: 'Failed to fetch agent KYC' });
  }
});

/**
 * POST /api/admin/kyc/:agentId/documents/:docId/verify
 * Verify or reject a KYC document (Admin)
 */
router.post('/admin/:agentId/documents/:docId/verify', authenticate, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const agentId = parseInt(req.params.agentId);
    const docId = parseInt(req.params.docId);
    const { action, notes } = req.body; // action: 'approve' | 'reject'

    const kycDoc = await db.query.agentKycDocuments.findFirst({
      where: and(
        eq(agentKycDocuments.id, docId),
        eq(agentKycDocuments.agentId, agentId)
      ),
    });

    if (!kycDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const previousStatus = kycDoc.verificationStatus;
    const newStatus = action === 'approve' ? 'verified' : 'rejected';

    // Update document status
    await db.update(agentKycDocuments)
      .set({
        verificationStatus: newStatus,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        verificationNotes: notes,
        rejectionReason: action === 'reject' ? notes : null,
        updatedAt: new Date(),
      })
      .where(eq(agentKycDocuments.id, docId));

    // Log the action
    await db.insert(kycVerificationLog).values({
      kycDocumentId: docId,
      action: action === 'approve' ? 'approved' : 'rejected',
      performedBy: adminId,
      performedByRole: 'admin',
      previousStatus,
      newStatus,
      notes,
    });

    // Update overall KYC status
    await updateAgentKycStatus(agentId);

    res.json({
      success: true,
      newStatus,
    });
  } catch (error) {
    console.error('Verify KYC document error:', error);
    res.status(500).json({ error: 'Failed to verify document' });
  }
});

/**
 * POST /api/admin/kyc/:agentId/approve
 * Approve agent's overall KYC (Admin)
 */
router.post('/admin/:agentId/approve', authenticate, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const agentId = parseInt(req.params.agentId);
    const { notes, expiryMonths = 12 } = req.body;

    // Verify all required documents are approved
    const kycDocs = await db.query.agentKycDocuments.findMany({
      where: eq(agentKycDocuments.agentId, agentId),
    });

    const requiredTypes = ['pan', 'aadhaar', 'bank_statement', 'address_proof'];
    const approvedTypes = new Set(
      kycDocs
        .filter(d => d.verificationStatus === 'verified')
        .map(d => d.documentType)
    );

    const missingApprovals = requiredTypes.filter(t => !approvedTypes.has(t));
    if (missingApprovals.length > 0) {
      return res.status(400).json({
        error: 'Not all required documents are verified',
        pendingDocuments: missingApprovals,
      });
    }

    // Update KYC status
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);

    await db.update(agentKycStatus)
      .set({
        overallStatus: 'approved',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        approvedAt: new Date(),
        approvedBy: adminId,
        internalNotes: notes,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(agentKycStatus.agentId, agentId));

    // Update agent's isVerified flag
    // await db.update(users).set({ isKycVerified: true }).where(eq(users.id, agentId));

    // Notify agent
    await queueManager.addJob('notifications', {
      type: 'kyc_approved',
      userId: agentId,
      channels: ['email', 'in_app'],
      subject: 'KYC Approved',
      message: 'Congratulations! Your KYC has been approved. You can now start earning commissions.',
    });

    res.json({
      success: true,
      message: 'KYC approved successfully',
      expiresAt,
    });
  } catch (error) {
    console.error('Approve KYC error:', error);
    res.status(500).json({ error: 'Failed to approve KYC' });
  }
});

/**
 * POST /api/admin/kyc/:agentId/reject
 * Reject agent's overall KYC (Admin)
 */
router.post('/admin/:agentId/reject', authenticate, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const agentId = parseInt(req.params.agentId);
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    await db.update(agentKycStatus)
      .set({
        overallStatus: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectedAt: new Date(),
        rejectedBy: adminId,
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(agentKycStatus.agentId, agentId));

    // Notify agent
    await queueManager.addJob('notifications', {
      type: 'kyc_rejected',
      userId: agentId,
      channels: ['email', 'in_app'],
      subject: 'KYC Rejected',
      message: `Your KYC has been rejected. Reason: ${reason}. Please resubmit the required documents.`,
    });

    res.json({
      success: true,
      message: 'KYC rejected',
    });
  } catch (error) {
    console.error('Reject KYC error:', error);
    res.status(500).json({ error: 'Failed to reject KYC' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Update agent's overall KYC status based on document statuses
 */
async function updateAgentKycStatus(agentId: number): Promise<void> {
  const kycDocs = await db.query.agentKycDocuments.findMany({
    where: eq(agentKycDocuments.agentId, agentId),
  });

  // Get latest of each document type
  const docsByType: Record<string, any> = {};
  for (const doc of kycDocs) {
    if (!docsByType[doc.documentType] || doc.version > docsByType[doc.documentType].version) {
      docsByType[doc.documentType] = doc;
    }
  }

  const latestDocs = Object.values(docsByType);
  const submitted = latestDocs.length;
  const approved = latestDocs.filter(d => d.verificationStatus === 'verified').length;
  const rejected = latestDocs.filter(d => d.verificationStatus === 'rejected').length;

  // Determine overall status
  let overallStatus = 'not_started';
  if (submitted > 0) {
    overallStatus = 'documents_pending';
  }

  await db.update(agentKycStatus)
    .set({
      documentsSubmitted: submitted,
      documentsApproved: approved,
      documentsRejected: rejected,
      updatedAt: new Date(),
    })
    .where(eq(agentKycStatus.agentId, agentId));
}

export default router;
