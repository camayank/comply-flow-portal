import { Router, type Request, type Response } from 'express';
import { storage } from './storage';
import {
  upload,
  uploadToStorage,
  deleteFromStorage,
  getSignedUrl,
  validateFileSize,
  ALLOWED_FILE_TYPES
} from './file-upload';
import { db } from './db';
import { documentsUploads } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { generateDocumentId } from './services/id-generator';

const router = Router();

// Get all documents for a service request
router.get('/service-requests/:serviceRequestId/documents', async (req: Request, res: Response) => {
  try {
    const serviceRequestId = parseInt(req.params.serviceRequestId);
    
    const documents = await db
      .select()
      .from(documentsUploads)
      .where(eq(documentsUploads.serviceRequestId, serviceRequestId))
      .orderBy(documentsUploads.uploadedAt);
    
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Upload document(s) to a service request
router.post('/service-requests/:serviceRequestId/documents', upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    const serviceRequestId = parseInt(req.params.serviceRequestId);
    const { doctype, notes } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (!doctype) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    // Verify service request exists
    const serviceRequest = await storage.getServiceRequest(serviceRequestId);
    if (!serviceRequest) {
      return res.status(404).json({ error: 'Service request not found' });
    }

    // Upload files and create records
    const uploadedDocuments = [];
    const errors = [];

    for (const file of files) {
      try {
        // Validate file size
        const sizeValidation = validateFileSize(file);
        if (!sizeValidation.valid) {
          errors.push({ filename: file.originalname, error: sizeValidation.error });
          continue;
        }

        // Upload to storage (private folder organized by service request)
        const uploadResult = await uploadToStorage(
          file,
          false,
          `service-requests/${serviceRequestId}`
        );

        // Generate unique document ID using centralized ID generator
        const documentId = await generateDocumentId();

        // Create database record
        const insertData: any = {
          documentId, // DOC26000001 - human-readable ID
          entityId: serviceRequest.businessEntityId,
          serviceRequestId: serviceRequestId,
          doctype: doctype,
          filename: uploadResult.filename,
          path: uploadResult.path,
          sizeBytes: uploadResult.size,
          mimeType: uploadResult.mimetype,
          uploader: 'client', // TODO: Get from authenticated user
          status: 'pending_review',
          version: 1,
          uploadedAt: new Date()
        };
        
        if (notes) {
          insertData.notes = notes;
        }
        
        const [document] = await db
          .insert(documentsUploads)
          .values(insertData)
          .returning();

        uploadedDocuments.push({
          ...document,
          url: uploadResult.url
        });
      } catch (error: any) {
        errors.push({ filename: file.originalname, error: error.message });
      }
    }

    // Return results
    const response: any = {
      success: uploadedDocuments.length > 0,
      uploaded: uploadedDocuments.length,
      failed: errors.length,
      documents: uploadedDocuments
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    res.status(uploadedDocuments.length > 0 ? 201 : 400).json(response);
  } catch (error: any) {
    console.error('Error uploading documents:', error);
    res.status(500).json({ error: 'Document upload failed', details: error.message });
  }
});

// Get document download URL
router.get('/documents/:documentId/download', async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.documentId);

    const [document] = await db
      .select()
      .from(documentsUploads)
      .where(eq(documentsUploads.id, documentId));

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate fresh signed URL for private files
    const signedUrl = await getSignedUrl(document.path, 15 * 60 * 1000); // 15 minutes

    res.json({
      url: signedUrl,
      filename: document.filename,
      mimetype: document.mimeType,
      size: document.sizeBytes,
      expiresIn: '15 minutes'
    });
  } catch (error: any) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL', details: error.message });
  }
});

// Update document status (for review/approval)
router.patch('/documents/:documentId/status', async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const { status, reviewNotes, reviewedBy } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending_review', 'approved', 'rejected', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const [updated] = await db
      .update(documentsUploads)
      .set({
        status,
        reviewNotes,
        reviewedBy,
        reviewedAt: new Date()
      })
      .where(eq(documentsUploads.id, documentId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating document status:', error);
    res.status(500).json({ error: 'Failed to update document status' });
  }
});

// Delete document
router.delete('/documents/:documentId', async (req: Request, res: Response) => {
  try {
    const documentId = parseInt(req.params.documentId);

    const [document] = await db
      .select()
      .from(documentsUploads)
      .where(eq(documentsUploads.id, documentId));

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from storage
    try {
      await deleteFromStorage(document.path);
    } catch (error) {
      console.warn('Failed to delete file from storage, continuing with DB deletion:', error);
    }

    // Delete from database
    await db
      .delete(documentsUploads)
      .where(eq(documentsUploads.id, documentId));

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Get document types and their requirements
router.get('/document-types', async (req: Request, res: Response) => {
  try {
    // This could be expanded to fetch from database/admin config
    const documentTypes = [
      {
        code: 'pan_card',
        name: 'PAN Card',
        description: 'Permanent Account Number card',
        required: true,
        allowedTypes: Object.keys(ALLOWED_FILE_TYPES),
        maxSize: '5MB'
      },
      {
        code: 'aadhar_card',
        name: 'Aadhar Card',
        description: 'Aadhar identification document',
        required: true,
        allowedTypes: Object.keys(ALLOWED_FILE_TYPES),
        maxSize: '5MB'
      },
      {
        code: 'bank_statement',
        name: 'Bank Statement',
        description: 'Recent bank statement (last 3 months)',
        required: true,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSize: '10MB'
      },
      {
        code: 'gst_certificate',
        name: 'GST Certificate',
        description: 'GST registration certificate',
        required: false,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSize: '5MB'
      },
      {
        code: 'incorporation_cert',
        name: 'Certificate of Incorporation',
        description: 'Company incorporation certificate',
        required: false,
        allowedTypes: ['application/pdf'],
        maxSize: '5MB'
      },
      {
        code: 'moa_aoa',
        name: 'MOA & AOA',
        description: 'Memorandum and Articles of Association',
        required: false,
        allowedTypes: ['application/pdf'],
        maxSize: '10MB'
      },
      {
        code: 'board_resolution',
        name: 'Board Resolution',
        description: 'Board resolution document',
        required: false,
        allowedTypes: ['application/pdf'],
        maxSize: '5MB'
      },
      {
        code: 'financial_statement',
        name: 'Financial Statements',
        description: 'Company financial statements',
        required: false,
        allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        maxSize: '10MB'
      },
      {
        code: 'other',
        name: 'Other Documents',
        description: 'Any other supporting documents',
        required: false,
        allowedTypes: Object.keys(ALLOWED_FILE_TYPES),
        maxSize: '10MB'
      }
    ];

    res.json(documentTypes);
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ error: 'Failed to fetch document types' });
  }
});

// Get upload statistics for a service request
router.get('/service-requests/:serviceRequestId/upload-stats', async (req: Request, res: Response) => {
  try {
    const serviceRequestId = parseInt(req.params.serviceRequestId);

    const documents = await db
      .select()
      .from(documentsUploads)
      .where(eq(documentsUploads.serviceRequestId, serviceRequestId));

    const stats = {
      total: documents.length,
      pending: documents.filter(d => d.status === 'pending_review').length,
      approved: documents.filter(d => d.status === 'approved').length,
      rejected: documents.filter(d => d.status === 'rejected').length,
      totalSize: documents.reduce((sum, d) => sum + (d.sizeBytes || 0), 0),
      byDocType: documents.reduce((acc: Record<string, number>, d) => {
        acc[d.doctype] = (acc[d.doctype] || 0) + 1;
        return acc;
      }, {})
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching upload stats:', error);
    res.status(500).json({ error: 'Failed to fetch upload statistics' });
  }
});

export default router;
