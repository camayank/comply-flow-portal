import type { Express } from "express";
import multer from 'multer';
import { db } from './db';
import { 
  serviceRequests,
  businessEntities
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import path from 'path';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
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
      
      // Get service orders from service_requests table
      const orders = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.businessEntityId, entityId))
        .orderBy(serviceRequests.createdAt);

      // Add mock document counts for working system
      const ordersWithCounts = orders.map(order => ({
        ...order,
        docsApproved: 0,
        docsPending: 0,
        docsRejected: 0,
        documentsRequired: 3,
        documentsUploaded: 0
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

      // Return appropriate required docs based on service type
      const getRequiredDocsForService = (serviceId: string) => {
        const docTypes = {
          'gst_returns': [
            { doctype: 'sales_register', label: 'Sales Register', mandatory: true },
            { doctype: 'purchase_register', label: 'Purchase Register', mandatory: true },
            { doctype: 'bank_statements', label: 'Bank Statements', mandatory: false }
          ],
          'incorporation': [
            { doctype: 'director_pan', label: 'Director PAN Cards', mandatory: true },
            { doctype: 'address_proof', label: 'Address Proof', mandatory: true },
            { doctype: 'moa_aoa', label: 'MOA & AOA', mandatory: true }
          ]
        };
        return docTypes[serviceId] || [
          { doctype: 'general_docs', label: 'Required Documents', mandatory: true }
        ];
      };
      
      const requiredDocs = getRequiredDocsForService(serviceOrder.serviceId);

      res.json(requiredDocs);
    } catch (error) {
      console.error('Error fetching required documents:', error);
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
      
      // Mock uploaded documents for now
      const mockDocuments = [
        {
          id: 1,
          doctype: 'sales_register',
          filename: 'sales_register_jan2024.xlsx',
          sizeBytes: 25600,
          uploader: 'client',
          status: 'pending_review',
          rejectionReason: null,
          version: 1,
          createdAt: new Date().toISOString()
        }
      ];

      res.json(mockDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  /**
   * POST: upload a document to a service order
   * /client/service-orders/:soId/upload?doctype=XXX
   */
  app.post('/client/service-orders/:soId/upload', upload.single('file'), async (req, res) => {
    try {
      const soId = parseInt(req.params.soId);
      const doctype = req.query.doctype;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      if (!doctype) {
        return res.status(400).json({ error: 'Document type is required' });
      }

      // For now, just return success - file is saved to uploads/ directory
      const uploadRecord = {
        id: Date.now(),
        serviceOrderId: soId,
        doctype: doctype as string,
        filename: file.originalname,
        path: file.path,
        sizeBytes: file.size,
        uploader: 'client',
        status: 'pending_review',
        version: 1,
        createdAt: new Date().toISOString()
      };

      res.json({ 
        ok: true, 
        message: 'File uploaded successfully',
        document: uploadRecord
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });

  /**
   * GET: download a document
   * /client/documents/:docId/download
   */
  app.get('/client/documents/:docId/download', async (req, res) => {
    try {
      const docId = parseInt(req.params.docId);
      
      // Mock document download
      res.status(404).json({ error: 'Document not found or not accessible' });
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  });

  /**
   * GET: list deliverable documents for a service order
   * /client/service-orders/:soId/deliverables
   */
  app.get('/client/service-orders/:soId/deliverables', async (req, res) => {
    try {
      const soId = parseInt(req.params.soId);
      
      // Mock deliverable documents
      const mockDeliverables = [
        {
          id: 2,
          doctype: 'gstr3b_ack',
          filename: 'GSTR3B_Jan2024_Acknowledgment.pdf',
          sizeBytes: 15360,
          uploader: 'ops',
          status: 'approved',
          createdAt: new Date().toISOString()
        }
      ];

      res.json(mockDeliverables);
    } catch (error) {
      console.error('Error fetching deliverables:', error);
      res.status(500).json({ error: 'Failed to fetch deliverables' });
    }
  });

  console.log('✅ Client routes registered (simplified working version)');
}