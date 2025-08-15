import type { Express } from "express";
import { db } from './db';
import { 
  serviceRequests,
  businessEntities,
  serviceDocTypes,
  documentsUploads
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
    cb(null, `${ts}_${safe}`);
  }
});

const upload = multer({ storage });

export function registerClientRoutes(app: Express) {

  /**
   * GET: list service orders for a client entity
   * /client/entities/:entityId/service-orders
   */
  app.get('/client/entities/:entityId/service-orders', async (req, res) => {
    try {
      const entityId = parseInt(req.params.entityId);
      
      // Get service orders from service_requests table (using businessEntityId)
      const orders = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.businessEntityId, entityId))
        .orderBy(serviceRequests.createdAt);

      // Add document counts separately to avoid SQL complexity
      const ordersWithCounts = await Promise.all(orders.map(async (order) => {
        const docCounts = await db
          .select({
            approved: sql`COUNT(CASE WHEN status = 'approved' THEN 1 END)`,
            pending: sql`COUNT(CASE WHEN status = 'pending_review' THEN 1 END)`,
            rejected: sql`COUNT(CASE WHEN status = 'rejected' THEN 1 END)`
          })
          .from(documentsUploads)
          .where(eq(documentsUploads.serviceOrderId, order.id));

        return {
          ...order,
          docsApproved: Number(docCounts[0]?.approved || 0),
          docsPending: Number(docCounts[0]?.pending || 0),
          docsRejected: Number(docCounts[0]?.rejected || 0)
        };
      }));

      res.json(ordersWithCounts);
    } catch (error) {
      console.error('Error fetching service orders:', error);
      res.status(500).json({ error: 'Failed to fetch service orders' });
    }
  });

  /**
   * GET: required client-upload doc types for a service order
   * /client/service-orders/:soId/required-docs
   */
  app.get('/client/service-orders/:soId/required-docs', async (req, res) => {
    try {
      const soId = parseInt(req.params.soId);
      
      // Get service order
      const [serviceOrder] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, soId));

      if (!serviceOrder) {
        return res.status(404).json({ error: 'Service order not found' });
      }

      // Get required document types for this service
      const docTypes = await db
        .select({
          doctype: serviceDocTypes.doctype,
          label: serviceDocTypes.label,
          clientUploads: serviceDocTypes.clientUploads,
          versioned: serviceDocTypes.versioned,
          mandatory: serviceDocTypes.mandatory
        })
        .from(serviceDocTypes)
        .where(
          and(
            eq(serviceDocTypes.serviceKey, serviceOrder.serviceType),
            eq(serviceDocTypes.clientUploads, true)
          )
        )
        .orderBy(serviceDocTypes.label);

      res.json(docTypes);
    } catch (error) {
      console.error('Error fetching required docs:', error);
      res.status(500).json({ error: 'Failed to fetch required documents' });
    }
  });

  /**
   * GET: list uploaded documents for a service order
   * /client/service-orders/:soId/documents
   */
  app.get('/client/service-orders/:soId/documents', async (req, res) => {
    try {
      const soId = parseInt(req.params.soId);
      
      const docs = await db
        .select({
          id: documentsUploads.id,
          doctype: documentsUploads.doctype,
          filename: documentsUploads.filename,
          sizeBytes: documentsUploads.sizeBytes,
          uploader: documentsUploads.uploader,
          status: documentsUploads.status,
          rejectionReason: documentsUploads.rejectionReason,
          version: documentsUploads.version,
          createdAt: documentsUploads.createdAt
        })
        .from(documentsUploads)
        .where(eq(documentsUploads.serviceOrderId, soId))
        .orderBy(documentsUploads.createdAt);

      res.json(docs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  /**
   * POST: upload a client document
   * /client/service-orders/:soId/upload?doctype=...
   * multipart form-data: file=<file>
   */
  app.post('/client/service-orders/:soId/upload', upload.single('file'), async (req, res) => {
    try {
      const soId = parseInt(req.params.soId);
      const { doctype } = req.query;

      if (!doctype) {
        return res.status(400).json({ error: 'doctype is required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'file is required' });
      }

      // Get service order to verify it exists and get entity ID
      const [serviceOrder] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, soId));

      if (!serviceOrder) {
        return res.status(404).json({ error: 'Service order not found' });
      }

      // Get current version for this doctype
      const [maxVersion] = await db
        .select({ maxVersion: sql`COALESCE(MAX(version), 0)` })
        .from(documentsUploads)
        .where(
          and(
            eq(documentsUploads.serviceOrderId, soId),
            eq(documentsUploads.doctype, doctype as string)
          )
        );

      const version = (maxVersion?.maxVersion as number || 0) + 1;

      // Insert document record
      const [newDoc] = await db
        .insert(documentsUploads)
        .values({
          serviceOrderId: soId,
          entityId: serviceOrder.entityId!,
          doctype: doctype as string,
          filename: req.file.originalname,
          path: path.join('uploads', req.file.filename),
          sizeBytes: req.file.size,
          uploader: 'client',
          status: 'pending_review',
          version
        })
        .returning();

      console.log(`📄 Document uploaded: ${req.file.originalname} for service order ${soId}`);

      res.json({ 
        ok: true, 
        version, 
        filename: req.file.originalname,
        documentId: newDoc.id
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });

  /**
   * GET: download a document (for approved documents)
   * /client/documents/:docId/download
   */
  app.get('/client/documents/:docId/download', async (req, res) => {
    try {
      const docId = parseInt(req.params.docId);
      
      const [doc] = await db
        .select()
        .from(documentsUploads)
        .where(eq(documentsUploads.id, docId));

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Only allow download of approved documents or client's own uploads
      if (doc.status !== 'approved' && doc.uploader !== 'client') {
        return res.status(403).json({ error: 'Document not available for download' });
      }

      // Check if file exists
      if (!fs.existsSync(doc.path)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      // Stream the file
      const fileStream = fs.createReadStream(doc.path);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  });

  /**
   * GET: get deliverables for completed service orders
   * /client/service-orders/:soId/deliverables
   */
  app.get('/client/service-orders/:soId/deliverables', async (req, res) => {
    try {
      const soId = parseInt(req.params.soId);
      
      // Get service order to check if completed
      const [serviceOrder] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, soId));

      if (!serviceOrder) {
        return res.status(404).json({ error: 'Service order not found' });
      }

      if (serviceOrder.status !== 'Completed') {
        return res.status(400).json({ error: 'Service order not yet completed' });
      }

      // Get deliverable documents (uploaded by ops and approved)
      const deliverables = await db
        .select()
        .from(documentsUploads)
        .where(
          and(
            eq(documentsUploads.serviceOrderId, soId),
            eq(documentsUploads.uploader, 'ops'),
            eq(documentsUploads.status, 'approved')
          )
        )
        .orderBy(documentsUploads.createdAt);

      res.json(deliverables);
    } catch (error) {
      console.error('Error fetching deliverables:', error);
      res.status(500).json({ error: 'Failed to fetch deliverables' });
    }
  });

  console.log('✅ Client routes registered');
}