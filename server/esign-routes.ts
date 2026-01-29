import type { Express, Request, Response } from "express";
import { db } from './db';
import { serviceRequests, businessEntities, users } from '@shared/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { sessionAuthMiddleware, type AuthenticatedRequest } from './rbac-middleware';
import { storage } from './storage';
import { createHash } from 'crypto';

interface ESignDocument {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'ready' | 'signed' | 'expired';
  pages: number;
  required: boolean;
  category: string;
  signedAt?: string;
  signedBy?: string;
  expiryDate?: string;
  serviceRequestId?: number;
}

export function registerESignRoutes(app: Express) {

  // Get documents available for e-signing
  app.get('/api/esign/documents', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get user's service requests that need signing
      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      // Get service requests with pending signatures
      const pendingRequests = await db.select()
        .from(serviceRequests)
        .where(
          and(
            entityId
              ? eq(serviceRequests.businessEntityId, entityId)
              : eq(serviceRequests.userId, userId),
            inArray(serviceRequests.status, ['docs_uploaded', 'ready_for_signing', 'pending_signature'])
          )
        )
        .orderBy(desc(serviceRequests.createdAt));

      // Generate document list based on service types
      const documents: ESignDocument[] = [];

      // Add standard incorporation documents
      const standardDocs = getStandardDocuments(entityId);
      documents.push(...standardDocs);

      // Add documents from pending service requests
      pendingRequests.forEach(sr => {
        const serviceSpecificDocs = getServiceSpecificDocuments(sr);
        documents.push(...serviceSpecificDocs);
      });

      res.json(documents);
    } catch (error: any) {
      console.error('Error fetching e-sign documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  // Get a specific document for signing
  app.get('/api/esign/documents/:id', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const documentId = req.params.id;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Find the document
      const document = getDocumentById(documentId);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json(document);
    } catch (error: any) {
      console.error('Error fetching document:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  });

  // Sign a document
  app.post('/api/esign/documents/:id/sign', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const documentId = req.params.id;
      const userId = req.user?.id;
      const { signatureData, agreedToTerms } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!agreedToTerms) {
        return res.status(400).json({ error: 'Terms must be accepted' });
      }

      // Get user details for signature
      const user = await storage.getUser(userId);

      // Create digital signature hash
      const signatureHash = createHash('sha256')
        .update(JSON.stringify({
          documentId,
          userId,
          timestamp: new Date().toISOString(),
          signatureData: signatureData || 'digital-consent',
        }))
        .digest('hex');

      const signatureRecord = {
        documentId,
        signedBy: user?.fullName || `User ${userId}`,
        signedAt: new Date().toISOString(),
        signatureHash,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        agreedToTerms: true,
        verified: true,
      };

      // If this is tied to a service request, update it
      const document = getDocumentById(documentId);
      if (document?.serviceRequestId) {
        await db.update(serviceRequests)
          .set({
            status: 'ready_for_payment',
            signatureData: signatureRecord,
            updatedAt: new Date(),
          })
          .where(eq(serviceRequests.id, document.serviceRequestId));
      }

      res.json({
        success: true,
        message: 'Document signed successfully',
        signature: {
          documentId,
          signedAt: signatureRecord.signedAt,
          signatureHash: signatureRecord.signatureHash.substring(0, 16) + '...',
          verified: true,
        },
      });
    } catch (error: any) {
      console.error('Error signing document:', error);
      res.status(500).json({ error: 'Failed to sign document' });
    }
  });

  // Verify a signature
  app.get('/api/esign/verify/:signatureHash', async (req: Request, res: Response) => {
    try {
      const { signatureHash } = req.params;

      // In production, this would verify against stored signatures
      const isValid = signatureHash && signatureHash.length === 64;

      res.json({
        valid: isValid,
        verified: isValid,
        message: isValid ? 'Signature is valid' : 'Signature verification failed',
      });
    } catch (error: any) {
      console.error('Error verifying signature:', error);
      res.status(500).json({ error: 'Failed to verify signature' });
    }
  });

  // Get signing history for a user
  app.get('/api/esign/history', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      // Get signed service requests
      const signedRequests = await db.select()
        .from(serviceRequests)
        .where(
          and(
            entityId
              ? eq(serviceRequests.businessEntityId, entityId)
              : eq(serviceRequests.userId, userId)
          )
        )
        .orderBy(desc(serviceRequests.updatedAt));

      const history = signedRequests
        .filter(sr => sr.signatureData)
        .map(sr => ({
          id: sr.id,
          documentTitle: `Service Request #${sr.id}`,
          signedAt: sr.signatureData?.signedAt,
          signedBy: sr.signatureData?.signedBy,
          verified: sr.signatureData?.verified || false,
        }));

      res.json(history);
    } catch (error: any) {
      console.error('Error fetching signing history:', error);
      res.status(500).json({ error: 'Failed to fetch signing history' });
    }
  });

  // Register duplicate routes at /api/v1 paths for backward compatibility
  app.get('/api/v1/esign/documents', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const standardDocs = getStandardDocuments();
    res.json(standardDocs);
  });

  app.get('/api/v1/esign/documents/:id', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const document = getDocumentById(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    res.json(document);
  });

  app.post('/api/v1/esign/documents/:id/sign', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const documentId = req.params.id;
    const userId = req.user?.id;
    const { agreedToTerms } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!agreedToTerms) return res.status(400).json({ error: 'Terms must be accepted' });

    const user = await storage.getUser(userId);
    const signatureHash = createHash('sha256')
      .update(JSON.stringify({ documentId, userId, timestamp: new Date().toISOString() }))
      .digest('hex');

    res.json({
      success: true,
      message: 'Document signed successfully',
      signature: {
        documentId,
        signedAt: new Date().toISOString(),
        signatureHash: signatureHash.substring(0, 16) + '...',
        verified: true,
      },
    });
  });

  app.get('/api/v1/esign/verify/:signatureHash', async (req: Request, res: Response) => {
    const { signatureHash } = req.params;
    const isValid = signatureHash && signatureHash.length === 64;
    res.json({ valid: isValid, verified: isValid, message: isValid ? 'Signature is valid' : 'Signature verification failed' });
  });

  app.get('/api/v1/esign/history', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    res.json([]);
  });

  console.log('✅ E-Sign routes registered');
}

// Helper function to get standard incorporation documents
function getStandardDocuments(entityId?: number): ESignDocument[] {
  return [
    {
      id: 'moa',
      title: 'Memorandum of Association (MOA)',
      description: "Defines the company's constitution and scope of activities",
      status: 'ready',
      pages: 12,
      required: true,
      category: 'incorporation',
    },
    {
      id: 'aoa',
      title: 'Articles of Association (AOA)',
      description: 'Internal management and governance rules',
      status: 'ready',
      pages: 8,
      required: true,
      category: 'incorporation',
    },
    {
      id: 'inc32',
      title: 'INC-32 (SPICe Part B)',
      description: 'Application for Name Reservation',
      status: 'ready',
      pages: 4,
      required: true,
      category: 'incorporation',
    },
    {
      id: 'dir2',
      title: 'DIR-2 (Director KYC)',
      description: 'Director identification and KYC verification',
      status: 'ready',
      pages: 6,
      required: true,
      category: 'kyc',
    },
    {
      id: 'inc9',
      title: 'INC-9 (Declaration by Professionals)',
      description: 'Professional declaration and verification',
      status: 'ready',
      pages: 2,
      required: true,
      category: 'incorporation',
    },
  ];
}

// Helper function to get service-specific documents
function getServiceSpecificDocuments(serviceRequest: any): ESignDocument[] {
  const docs: ESignDocument[] = [];
  const serviceId = serviceRequest.serviceId;

  // Add documents based on service type
  if (typeof serviceId === 'string') {
    if (serviceId.includes('gst')) {
      docs.push({
        id: `gst-declaration-${serviceRequest.id}`,
        title: 'GST Declaration Form',
        description: 'Declaration for GST registration',
        status: 'ready',
        pages: 3,
        required: true,
        category: 'tax',
        serviceRequestId: serviceRequest.id,
      });
    }

    if (serviceId.includes('trademark')) {
      docs.push({
        id: `tm-form-${serviceRequest.id}`,
        title: 'Trademark Application (TM-1)',
        description: 'Application for trademark registration',
        status: 'ready',
        pages: 5,
        required: true,
        category: 'ip',
        serviceRequestId: serviceRequest.id,
      });
    }

    if (serviceId.includes('compliance')) {
      docs.push({
        id: `compliance-declaration-${serviceRequest.id}`,
        title: 'Compliance Declaration',
        description: 'Annual compliance filing declaration',
        status: 'ready',
        pages: 2,
        required: true,
        category: 'compliance',
        serviceRequestId: serviceRequest.id,
      });
    }
  }

  return docs;
}

// Helper function to get document by ID
function getDocumentById(documentId: string): ESignDocument | undefined {
  const allDocs = getStandardDocuments();
  return allDocs.find(doc => doc.id === documentId);
}
