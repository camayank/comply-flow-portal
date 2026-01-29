/**
 * Automated Document Request System
 *
 * Enables operations team to request specific documents from clients
 * with automated reminders, tracking, and escalation
 */

import type { Express, Request, Response } from "express";
import { db } from './db';
import {
  businessEntities,
  users,
  serviceRequests,
  documentsUploads
} from '@shared/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from './rbac-middleware';
import { storage } from './storage';
import { nanoid } from 'nanoid';
import { sendWhatsApp } from './services/whatsappService';
import nodemailer from 'nodemailer';

// Document Request Types
interface DocumentRequest {
  id: string;
  businessEntityId: number;
  serviceRequestId?: number;
  requestedBy: number;
  documentType: string;
  documentName: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'uploaded' | 'approved' | 'rejected' | 'cancelled';
  dueDate: Date;
  reminderSent: number;
  lastReminderAt?: Date;
  uploadedDocumentId?: number;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  notes: string[];
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredFields: string[];
  acceptedFormats: string[];
  maxSizeMB: number;
  sampleUrl?: string;
  complianceType?: string;
}

// In-memory storage (replace with database table in production)
const documentRequests = new Map<string, DocumentRequest>();

// Document templates for common request types
const documentTemplates: DocumentTemplate[] = [
  {
    id: 'coi',
    name: 'Certificate of Incorporation',
    description: 'MCA issued Certificate of Incorporation',
    category: 'legal',
    requiredFields: ['CIN', 'Date of Incorporation'],
    acceptedFormats: ['pdf'],
    maxSizeMB: 5,
    complianceType: 'statutory'
  },
  {
    id: 'pan_card',
    name: 'PAN Card',
    description: 'Company PAN Card issued by Income Tax Department',
    category: 'tax',
    requiredFields: ['PAN Number'],
    acceptedFormats: ['pdf', 'jpg', 'png'],
    maxSizeMB: 2,
    complianceType: 'tax'
  },
  {
    id: 'gst_certificate',
    name: 'GST Registration Certificate',
    description: 'GST Registration Certificate from GSTN',
    category: 'tax',
    requiredFields: ['GSTIN'],
    acceptedFormats: ['pdf'],
    maxSizeMB: 2,
    complianceType: 'tax'
  },
  {
    id: 'moa',
    name: 'Memorandum of Association',
    description: 'MOA filed with MCA',
    category: 'legal',
    requiredFields: ['Objects Clause'],
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
    complianceType: 'statutory'
  },
  {
    id: 'aoa',
    name: 'Articles of Association',
    description: 'AOA filed with MCA',
    category: 'legal',
    requiredFields: ['Share Capital Structure'],
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
    complianceType: 'statutory'
  },
  {
    id: 'board_resolution',
    name: 'Board Resolution',
    description: 'Certified copy of Board Resolution',
    category: 'governance',
    requiredFields: ['Resolution Date', 'Resolution Number'],
    acceptedFormats: ['pdf'],
    maxSizeMB: 5,
    complianceType: 'statutory'
  },
  {
    id: 'bank_statement',
    name: 'Bank Statement',
    description: 'Company bank statement for specified period',
    category: 'financial',
    requiredFields: ['Account Number', 'Period'],
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
    complianceType: 'financial'
  },
  {
    id: 'audited_financials',
    name: 'Audited Financial Statements',
    description: 'Audited Balance Sheet and P&L for the financial year',
    category: 'financial',
    requiredFields: ['Financial Year'],
    acceptedFormats: ['pdf'],
    maxSizeMB: 20,
    complianceType: 'statutory'
  },
  {
    id: 'itr',
    name: 'Income Tax Return',
    description: 'Filed ITR with acknowledgment',
    category: 'tax',
    requiredFields: ['Assessment Year', 'Acknowledgment Number'],
    acceptedFormats: ['pdf'],
    maxSizeMB: 5,
    complianceType: 'tax'
  },
  {
    id: 'gst_return',
    name: 'GST Return',
    description: 'Filed GST return for specified period',
    category: 'tax',
    requiredFields: ['Return Type', 'Period'],
    acceptedFormats: ['pdf'],
    maxSizeMB: 5,
    complianceType: 'tax'
  },
  {
    id: 'tds_return',
    name: 'TDS Return',
    description: 'Filed TDS return with Form 16/16A',
    category: 'tax',
    requiredFields: ['Quarter', 'Form Type'],
    acceptedFormats: ['pdf'],
    maxSizeMB: 5,
    complianceType: 'tax'
  },
  {
    id: 'director_kyc',
    name: 'Director KYC Documents',
    description: 'PAN, Aadhaar, and Address proof of director',
    category: 'kyc',
    requiredFields: ['Director Name', 'DIN'],
    acceptedFormats: ['pdf', 'jpg', 'png'],
    maxSizeMB: 5,
    complianceType: 'statutory'
  },
  {
    id: 'rent_agreement',
    name: 'Rent Agreement',
    description: 'Registered rent agreement for office premises',
    category: 'legal',
    requiredFields: ['Property Address', 'Lease Period'],
    acceptedFormats: ['pdf'],
    maxSizeMB: 10,
    complianceType: 'statutory'
  },
  {
    id: 'utility_bill',
    name: 'Utility Bill',
    description: 'Recent utility bill for address verification',
    category: 'kyc',
    requiredFields: ['Utility Type', 'Address'],
    acceptedFormats: ['pdf', 'jpg', 'png'],
    maxSizeMB: 2,
    complianceType: 'kyc'
  },
  {
    id: 'employee_list',
    name: 'Employee List',
    description: 'Current employee list with PF/ESI details',
    category: 'hr',
    requiredFields: ['Employee Count'],
    acceptedFormats: ['pdf', 'xlsx'],
    maxSizeMB: 5,
    complianceType: 'compliance'
  }
];

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export function registerDocumentRequestRoutes(app: Express) {
  const requireOpsAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE)] as const;
  const requireClientAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.CLIENT)] as const;

  // ============================================================
  // DOCUMENT TEMPLATES
  // ============================================================

  /**
   * Get all document templates
   */
  app.get('/api/document-requests/templates', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { category, complianceType } = req.query;

      let templates = documentTemplates;

      if (category) {
        templates = templates.filter(t => t.category === category);
      }
      if (complianceType) {
        templates = templates.filter(t => t.complianceType === complianceType);
      }

      // Group by category
      const byCategory: Record<string, DocumentTemplate[]> = {};
      templates.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = [];
        byCategory[t.category].push(t);
      });

      res.json({
        templates,
        byCategory: Object.entries(byCategory).map(([category, items]) => ({
          category,
          displayName: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          templates: items
        }))
      });

    } catch (error: any) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // ============================================================
  // OPERATIONS - REQUEST MANAGEMENT
  // ============================================================

  /**
   * Create document request (bulk or single)
   */
  app.post('/api/document-requests', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const {
        businessEntityId,
        serviceRequestId,
        documents,
        dueDate,
        priority = 'medium',
        sendNotification = true
      } = req.body;

      if (!businessEntityId || !documents || !Array.isArray(documents) || documents.length === 0) {
        return res.status(400).json({ error: 'Business entity and documents required' });
      }

      // Verify entity exists
      const [entity] = await db.select()
        .from(businessEntities)
        .where(eq(businessEntities.id, businessEntityId))
        .limit(1);

      if (!entity) {
        return res.status(404).json({ error: 'Business entity not found' });
      }

      // Get entity's primary contact
      const contact = entity.primaryContactId
        ? await storage.getUser(entity.primaryContactId)
        : null;

      const createdRequests: DocumentRequest[] = [];

      for (const doc of documents) {
        const requestId = nanoid(16);
        const template = documentTemplates.find(t => t.id === doc.templateId);

        const request: DocumentRequest = {
          id: requestId,
          businessEntityId,
          serviceRequestId,
          requestedBy: userId,
          documentType: doc.templateId || 'custom',
          documentName: doc.name || template?.name || 'Document',
          description: doc.description || template?.description,
          priority: doc.priority || priority,
          status: 'pending',
          dueDate: new Date(doc.dueDate || dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000),
          reminderSent: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: doc.notes ? [doc.notes] : []
        };

        documentRequests.set(requestId, request);
        createdRequests.push(request);
      }

      // Send notification to client
      if (sendNotification && contact) {
        const documentList = createdRequests.map(r => `- ${r.documentName}`).join('\n');
        const dueStr = new Date(dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN');

        // Email notification
        if (contact.email && process.env.NOTIFICATION_EMAIL_ENABLED === 'true') {
          await emailTransporter.sendMail({
            from: process.env.SMTP_FROM || '"DigiComply" <noreply@digicomply.in>',
            to: contact.email,
            subject: `Document Request - Action Required by ${dueStr}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">Document Request</h2>
                <p>Dear ${contact.firstName || 'Client'},</p>
                <p>We require the following documents for <strong>${entity.entityName}</strong>:</p>
                <ul>
                  ${createdRequests.map(r => `<li><strong>${r.documentName}</strong>${r.description ? ` - ${r.description}` : ''}</li>`).join('')}
                </ul>
                <p><strong>Due Date:</strong> ${dueStr}</p>
                <p>Please upload these documents through your client portal at your earliest convenience.</p>
                <p><a href="${process.env.FRONTEND_URL}/documents" style="background: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upload Documents</a></p>
                <hr style="margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px;">This is an automated message from DigiComply. Please do not reply to this email.</p>
              </div>
            `
          });
        }

        // WhatsApp notification
        if (contact.phone && process.env.NOTIFICATION_WHATSAPP_ENABLED === 'true') {
          await sendWhatsApp({
            to: contact.phone,
            message: `Hi ${contact.firstName || 'there'}! We need ${createdRequests.length} document(s) for ${entity.entityName}:\n${documentList}\n\nDue by: ${dueStr}\n\nPlease upload via your DigiComply portal.`
          });
        }
      }

      res.status(201).json({
        success: true,
        message: `${createdRequests.length} document request(s) created`,
        requests: createdRequests.map(r => ({
          id: r.id,
          documentName: r.documentName,
          status: r.status,
          dueDate: r.dueDate,
          priority: r.priority
        })),
        notificationSent: sendNotification && !!contact
      });

    } catch (error: any) {
      console.error('Error creating document request:', error);
      res.status(500).json({ error: 'Failed to create document request' });
    }
  });

  /**
   * Get pending document requests (for operations dashboard)
   */
  app.get('/api/document-requests/pending', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { entityId, priority, overdue } = req.query;

      let requests = Array.from(documentRequests.values())
        .filter(r => r.status === 'pending');

      if (entityId) {
        requests = requests.filter(r => r.businessEntityId === parseInt(entityId as string));
      }
      if (priority) {
        requests = requests.filter(r => r.priority === priority);
      }
      if (overdue === 'true') {
        requests = requests.filter(r => new Date(r.dueDate) < new Date());
      }

      // Get entity names
      const entityIds = [...new Set(requests.map(r => r.businessEntityId))];
      const entities = entityIds.length > 0
        ? await db.select().from(businessEntities).where(inArray(businessEntities.id, entityIds))
        : [];

      const entityMap = new Map(entities.map(e => [e.id, e.entityName]));

      const enrichedRequests = requests.map(r => ({
        ...r,
        entityName: entityMap.get(r.businessEntityId) || 'Unknown',
        isOverdue: new Date(r.dueDate) < new Date(),
        daysOverdue: Math.max(0, Math.floor((Date.now() - new Date(r.dueDate).getTime()) / (24 * 60 * 60 * 1000)))
      }));

      res.json({
        requests: enrichedRequests.sort((a, b) => {
          // Sort by overdue first, then by priority, then by due date
          if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }),
        summary: {
          total: requests.length,
          overdue: requests.filter(r => new Date(r.dueDate) < new Date()).length,
          byPriority: {
            urgent: requests.filter(r => r.priority === 'urgent').length,
            high: requests.filter(r => r.priority === 'high').length,
            medium: requests.filter(r => r.priority === 'medium').length,
            low: requests.filter(r => r.priority === 'low').length
          }
        }
      });

    } catch (error: any) {
      console.error('Error fetching pending requests:', error);
      res.status(500).json({ error: 'Failed to fetch requests' });
    }
  });

  /**
   * Send reminder for document request
   */
  app.post('/api/document-requests/:id/remind', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const request = documentRequests.get(id);

      if (!request) {
        return res.status(404).json({ error: 'Document request not found' });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Can only send reminders for pending requests' });
      }

      // Get entity and contact
      const [entity] = await db.select()
        .from(businessEntities)
        .where(eq(businessEntities.id, request.businessEntityId))
        .limit(1);

      const contact = entity?.primaryContactId
        ? await storage.getUser(entity.primaryContactId)
        : null;

      if (!contact) {
        return res.status(400).json({ error: 'No contact found for this entity' });
      }

      const dueStr = new Date(request.dueDate).toLocaleDateString('en-IN');
      const isOverdue = new Date(request.dueDate) < new Date();

      // Email reminder
      if (contact.email && process.env.NOTIFICATION_EMAIL_ENABLED === 'true') {
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || '"DigiComply" <noreply@digicomply.in>',
          to: contact.email,
          subject: `${isOverdue ? '[URGENT] OVERDUE: ' : 'Reminder: '}Document Required - ${request.documentName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: ${isOverdue ? '#dc2626' : '#f59e0b'};">${isOverdue ? 'Overdue Document Request' : 'Document Reminder'}</h2>
              <p>Dear ${contact.firstName || 'Client'},</p>
              <p>This is a reminder that we are still awaiting the following document for <strong>${entity.entityName}</strong>:</p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>${request.documentName}</strong>
                ${request.description ? `<br><span style="color: #6b7280;">${request.description}</span>` : ''}
              </div>
              <p><strong>Due Date:</strong> <span style="color: ${isOverdue ? '#dc2626' : '#1e40af'};">${dueStr}${isOverdue ? ' (OVERDUE)' : ''}</span></p>
              <p>Please upload this document immediately to avoid any service delays.</p>
              <p><a href="${process.env.FRONTEND_URL}/documents" style="background: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upload Now</a></p>
              <hr style="margin: 20px 0;">
              <p style="color: #6b7280; font-size: 12px;">This is reminder #${request.reminderSent + 1} for this document.</p>
            </div>
          `
        });
      }

      // WhatsApp reminder
      if (contact.phone && process.env.NOTIFICATION_WHATSAPP_ENABLED === 'true') {
        await sendWhatsApp({
          to: contact.phone,
          message: `${isOverdue ? 'URGENT: ' : ''}Reminder for ${entity.entityName}:\n\nDocument needed: ${request.documentName}\nDue: ${dueStr}${isOverdue ? ' (OVERDUE)' : ''}\n\nPlease upload via your DigiComply portal.`
        });
      }

      // Update reminder count
      request.reminderSent++;
      request.lastReminderAt = new Date();
      request.updatedAt = new Date();
      documentRequests.set(id, request);

      res.json({
        success: true,
        message: 'Reminder sent successfully',
        reminderCount: request.reminderSent
      });

    } catch (error: any) {
      console.error('Error sending reminder:', error);
      res.status(500).json({ error: 'Failed to send reminder' });
    }
  });

  /**
   * Approve uploaded document
   */
  app.post('/api/document-requests/:id/approve', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const request = documentRequests.get(id);

      if (!request) {
        return res.status(404).json({ error: 'Document request not found' });
      }

      if (request.status !== 'uploaded') {
        return res.status(400).json({ error: 'Document must be uploaded before approval' });
      }

      request.status = 'approved';
      request.updatedAt = new Date();
      documentRequests.set(id, request);

      res.json({
        success: true,
        message: 'Document approved successfully'
      });

    } catch (error: any) {
      console.error('Error approving document:', error);
      res.status(500).json({ error: 'Failed to approve document' });
    }
  });

  /**
   * Reject uploaded document
   */
  app.post('/api/document-requests/:id/reject', ...requireOpsAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const request = documentRequests.get(id);

      if (!request) {
        return res.status(404).json({ error: 'Document request not found' });
      }

      if (request.status !== 'uploaded') {
        return res.status(400).json({ error: 'Document must be uploaded before rejection' });
      }

      request.status = 'rejected';
      request.rejectionReason = reason || 'Document does not meet requirements';
      request.updatedAt = new Date();
      documentRequests.set(id, request);

      // Notify client about rejection
      const [entity] = await db.select()
        .from(businessEntities)
        .where(eq(businessEntities.id, request.businessEntityId))
        .limit(1);

      const contact = entity?.primaryContactId
        ? await storage.getUser(entity.primaryContactId)
        : null;

      if (contact?.email && process.env.NOTIFICATION_EMAIL_ENABLED === 'true') {
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || '"DigiComply" <noreply@digicomply.in>',
          to: contact.email,
          subject: `Document Rejected - ${request.documentName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Document Rejected</h2>
              <p>Dear ${contact.firstName || 'Client'},</p>
              <p>The document you uploaded has been rejected:</p>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #fecaca;">
                <strong>${request.documentName}</strong><br>
                <span style="color: #dc2626;">Reason: ${request.rejectionReason}</span>
              </div>
              <p>Please upload the correct document as soon as possible.</p>
              <p><a href="${process.env.FRONTEND_URL}/documents" style="background: #1e40af; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Re-upload Document</a></p>
            </div>
          `
        });
      }

      res.json({
        success: true,
        message: 'Document rejected and client notified'
      });

    } catch (error: any) {
      console.error('Error rejecting document:', error);
      res.status(500).json({ error: 'Failed to reject document' });
    }
  });

  // ============================================================
  // CLIENT - VIEW & UPLOAD
  // ============================================================

  /**
   * Get pending document requests for client
   */
  app.get('/api/client/document-requests', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      if (!entityId) {
        return res.status(400).json({ error: 'No business entity associated' });
      }

      const requests = Array.from(documentRequests.values())
        .filter(r => r.businessEntityId === entityId && ['pending', 'rejected'].includes(r.status))
        .map(r => ({
          id: r.id,
          documentName: r.documentName,
          description: r.description,
          priority: r.priority,
          status: r.status,
          dueDate: r.dueDate,
          isOverdue: new Date(r.dueDate) < new Date(),
          rejectionReason: r.rejectionReason
        }))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      res.json({
        requests,
        summary: {
          total: requests.length,
          overdue: requests.filter(r => r.isOverdue).length,
          rejected: requests.filter(r => r.status === 'rejected').length
        }
      });

    } catch (error: any) {
      console.error('Error fetching client document requests:', error);
      res.status(500).json({ error: 'Failed to fetch requests' });
    }
  });

  /**
   * Upload document for a request
   */
  app.post('/api/client/document-requests/:id/upload', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { documentId } = req.body;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const request = documentRequests.get(id);
      if (!request) {
        return res.status(404).json({ error: 'Document request not found' });
      }

      // Verify user has access to this request
      const user = await storage.getUser(userId);
      if (user?.businessEntityId !== request.businessEntityId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update request status
      request.status = 'uploaded';
      request.uploadedDocumentId = documentId;
      request.updatedAt = new Date();
      documentRequests.set(id, request);

      res.json({
        success: true,
        message: 'Document uploaded successfully. Pending review.',
        status: 'uploaded'
      });

    } catch (error: any) {
      console.error('Error uploading document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });

  console.log('✅ Document Request routes registered');
}
