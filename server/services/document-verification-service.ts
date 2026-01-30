/**
 * Document Verification Service
 *
 * CORE OPERATIONS INTEGRATION
 * This service handles document verification as part of the workflow state machine.
 * It enforces:
 * - All required documents must be uploaded before progressing past DOCUMENTS_UPLOADED
 * - All documents must be verified/approved before progressing past DOCUMENTS_VERIFIED
 * - Document integrity checks
 */

import { db } from '../db';
import {
  documentsUploads,
  serviceRequests,
  services,
  activityLogs
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// Document verification statuses
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  VERIFIED: 'verified',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
} as const;

export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];

// Required documents by service type
export const REQUIRED_DOCUMENTS_BY_SERVICE: Record<string, string[]> = {
  // Company Registration
  'company_registration': [
    'identity_proof',
    'address_proof',
    'director_din',
    'registered_office_proof'
  ],
  // GST Registration
  'gst_registration': [
    'pan_card',
    'identity_proof',
    'address_proof',
    'bank_statement',
    'business_proof'
  ],
  // ITR Filing
  'itr_filing': [
    'pan_card',
    'bank_statement',
    'previous_itr',
    'tds_certificates'
  ],
  // Default - basic documents for any compliance service
  'default': [
    'identity_proof',
    'address_proof'
  ]
};

// Document verification result
export interface DocumentVerificationResult {
  isComplete: boolean;
  isVerified: boolean;
  totalRequired: number;
  totalUploaded: number;
  totalVerified: number;
  totalRejected: number;
  missingDocuments: string[];
  pendingVerification: string[];
  rejectedDocuments: { name: string; reason?: string }[];
  details: DocumentDetail[];
}

export interface DocumentDetail {
  documentType: string;
  status: DocumentStatus;
  uploadedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: number;
  rejectionReason?: string;
}

// =============================================================================
// DOCUMENT VERIFICATION FUNCTIONS
// =============================================================================

/**
 * Get required documents for a service request
 */
export async function getRequiredDocuments(serviceRequestId: number): Promise<string[]> {
  try {
    const [sr] = await db
      .select({
        serviceId: serviceRequests.serviceId
      })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!sr?.serviceId) {
      return REQUIRED_DOCUMENTS_BY_SERVICE.default;
    }

    // Get service details for document requirements
    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.serviceId, sr.serviceId))
      .limit(1);

    // Check if service has specific requirements
    const serviceType = service?.category || 'default';
    return REQUIRED_DOCUMENTS_BY_SERVICE[serviceType] || REQUIRED_DOCUMENTS_BY_SERVICE.default;
  } catch (error) {
    console.error('Error getting required documents:', error);
    return REQUIRED_DOCUMENTS_BY_SERVICE.default;
  }
}

/**
 * Check if all required documents are uploaded for a service request
 */
export async function checkDocumentsUploaded(serviceRequestId: number): Promise<DocumentVerificationResult> {
  try {
    const requiredDocs = await getRequiredDocuments(serviceRequestId);

    // Get uploaded documents
    const uploadedDocs = await db
      .select()
      .from(documentsUploads)
      .where(eq(documentsUploads.serviceRequestId, serviceRequestId));

    const uploadedTypes = new Set(uploadedDocs.map(d => d.doctype || 'unknown'));
    const missingDocuments = requiredDocs.filter(doc => !uploadedTypes.has(doc));

    const details: DocumentDetail[] = uploadedDocs.map(d => ({
      documentType: d.doctype || 'unknown',
      status: (d.status as DocumentStatus) || DOCUMENT_STATUS.PENDING,
      uploadedAt: d.uploadedAt || undefined,
      verifiedAt: d.verifiedAt || undefined,
      verifiedBy: d.verifiedBy || undefined,
      rejectionReason: d.rejectionReason || undefined
    }));

    // Add missing documents to details
    missingDocuments.forEach(docType => {
      details.push({
        documentType: docType,
        status: DOCUMENT_STATUS.PENDING
      });
    });

    return {
      isComplete: missingDocuments.length === 0 && uploadedDocs.length > 0,
      isVerified: false,
      totalRequired: requiredDocs.length,
      totalUploaded: uploadedDocs.length,
      totalVerified: 0,
      totalRejected: uploadedDocs.filter(d => d.status === 'rejected').length,
      missingDocuments,
      pendingVerification: uploadedDocs
        .filter(d => d.status !== 'verified' && d.status !== 'approved' && d.status !== 'rejected')
        .map(d => d.doctype || 'unknown'),
      rejectedDocuments: uploadedDocs
        .filter(d => d.status === 'rejected')
        .map(d => ({ name: d.doctype || 'unknown', reason: d.rejectionReason || undefined })),
      details
    };
  } catch (error) {
    console.error('Error checking documents uploaded:', error);
    return {
      isComplete: false,
      isVerified: false,
      totalRequired: 0,
      totalUploaded: 0,
      totalVerified: 0,
      totalRejected: 0,
      missingDocuments: [],
      pendingVerification: [],
      rejectedDocuments: [],
      details: []
    };
  }
}

/**
 * Check if all documents are verified for a service request
 * This is called before transitioning to DOCUMENTS_VERIFIED status
 */
export async function checkDocumentsVerified(serviceRequestId: number): Promise<DocumentVerificationResult> {
  try {
    const uploadedResult = await checkDocumentsUploaded(serviceRequestId);

    if (!uploadedResult.isComplete) {
      return uploadedResult;
    }

    // Get uploaded documents
    const uploadedDocs = await db
      .select()
      .from(documentsUploads)
      .where(eq(documentsUploads.serviceRequestId, serviceRequestId));

    const verifiedDocs = uploadedDocs.filter(d =>
      d.status === 'verified' || d.status === 'approved'
    );

    const rejectedDocs = uploadedDocs.filter(d => d.status === 'rejected');
    const pendingDocs = uploadedDocs.filter(d =>
      d.status !== 'verified' && d.status !== 'approved' && d.status !== 'rejected'
    );

    const isVerified = verifiedDocs.length === uploadedDocs.length && rejectedDocs.length === 0;

    return {
      isComplete: uploadedResult.isComplete,
      isVerified,
      totalRequired: uploadedResult.totalRequired,
      totalUploaded: uploadedDocs.length,
      totalVerified: verifiedDocs.length,
      totalRejected: rejectedDocs.length,
      missingDocuments: uploadedResult.missingDocuments,
      pendingVerification: pendingDocs.map(d => d.doctype || 'unknown'),
      rejectedDocuments: rejectedDocs.map(d => ({
        name: d.doctype || 'unknown',
        reason: d.rejectionReason || undefined
      })),
      details: uploadedResult.details
    };
  } catch (error) {
    console.error('Error checking documents verified:', error);
    return {
      isComplete: false,
      isVerified: false,
      totalRequired: 0,
      totalUploaded: 0,
      totalVerified: 0,
      totalRejected: 0,
      missingDocuments: [],
      pendingVerification: [],
      rejectedDocuments: [],
      details: []
    };
  }
}

/**
 * Verify a single document (mark as verified/approved)
 */
export async function verifyDocument(
  documentId: number,
  verifiedBy: number,
  status: 'verified' | 'approved' | 'rejected',
  notes?: string,
  rejectionReason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const [doc] = await db
      .select()
      .from(documentsUploads)
      .where(eq(documentsUploads.id, documentId))
      .limit(1);

    if (!doc) {
      return { success: false, message: 'Document not found' };
    }

    await db
      .update(documentsUploads)
      .set({
        status,
        verifiedBy,
        verifiedAt: new Date(),
        verificationNotes: notes,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        updatedAt: new Date()
      })
      .where(eq(documentsUploads.id, documentId));

    // Log activity
    if (doc.serviceRequestId) {
      await db.insert(activityLogs).values({
        userId: verifiedBy,
        action: `document_${status}`,
        entityType: 'document',
        entityId: documentId,
        details: JSON.stringify({
          documentType: doc.doctype,
          status,
          notes,
          rejectionReason
        }),
        createdAt: new Date()
      });
    }

    return {
      success: true,
      message: status === 'rejected'
        ? `Document rejected: ${rejectionReason}`
        : `Document ${status} successfully`
    };
  } catch (error: any) {
    console.error('Error verifying document:', error);
    return { success: false, message: error.message || 'Verification failed' };
  }
}

/**
 * Bulk verify all documents for a service request
 */
export async function bulkVerifyDocuments(
  serviceRequestId: number,
  verifiedBy: number,
  status: 'verified' | 'approved'
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const [result] = await db
      .update(documentsUploads)
      .set({
        status,
        verifiedBy,
        verifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(documentsUploads.serviceRequestId, serviceRequestId),
        sql`${documentsUploads.status} NOT IN ('verified', 'approved', 'rejected')`
      ))
      .returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: verifiedBy,
      action: 'bulk_document_verification',
      entityType: 'service_request',
      entityId: serviceRequestId,
      details: JSON.stringify({ status }),
      createdAt: new Date()
    });

    return {
      success: true,
      message: `All documents ${status}`,
      count: result ? 1 : 0 // Drizzle returns single item for bulk update
    };
  } catch (error: any) {
    console.error('Error bulk verifying documents:', error);
    return { success: false, message: error.message, count: 0 };
  }
}

/**
 * Auto-transition service request status after document verification
 * This is called after a document is verified to check if we can advance the workflow
 */
export async function autoAdvanceAfterDocumentVerification(
  serviceRequestId: number,
  performedBy: { id: number; username: string; role: string }
): Promise<{ advanced: boolean; newStatus?: string; message: string }> {
  try {
    const [sr] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!sr) {
      return { advanced: false, message: 'Service request not found' };
    }

    // Only auto-advance from documents_uploaded status
    if (sr.status !== 'documents_uploaded') {
      return {
        advanced: false,
        message: `Auto-advance not applicable for status: ${sr.status}`
      };
    }

    // Check if all documents are verified
    const verificationResult = await checkDocumentsVerified(serviceRequestId);

    if (!verificationResult.isVerified) {
      return {
        advanced: false,
        message: `Cannot advance: ${verificationResult.pendingVerification.length} document(s) pending verification`
      };
    }

    // All documents verified - advance to documents_verified
    const { transitionServiceRequestStatus } = await import('./core-operations-service');
    const transitionResult = await transitionServiceRequestStatus(
      serviceRequestId,
      'documents_verified',
      {
        performedBy,
        reason: 'All documents verified',
        notes: `${verificationResult.totalVerified} documents verified`
      }
    );

    if (transitionResult.success) {
      return {
        advanced: true,
        newStatus: 'documents_verified',
        message: 'Service request advanced to documents_verified'
      };
    }

    return {
      advanced: false,
      message: transitionResult.message
    };
  } catch (error: any) {
    console.error('Error in auto-advance:', error);
    return { advanced: false, message: error.message };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  checkDocumentsUploaded,
  checkDocumentsVerified,
  verifyDocument,
  bulkVerifyDocuments,
  autoAdvanceAfterDocumentVerification,
  getRequiredDocuments,
  DOCUMENT_STATUS,
  REQUIRED_DOCUMENTS_BY_SERVICE
};
