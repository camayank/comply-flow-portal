import { Express, Request, Response } from 'express';
import { db } from './db';
import { requireAuth } from './auth-middleware';
import Anthropic from '@anthropic-ai/sdk';
import {
  aiDocuments,
  documentVersions,
  documentSignatures,
  documentSignatories,
  documentActivityLog,
  aiDocumentTemplates,
  documentsUploads,
  insertAiDocumentSchema,
  insertDocumentSignatureSchema,
  insertDocumentSignatorySchema,
} from '@shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

// ============================================================================
// AI DOCUMENT PREPARATION AND SIGNATURE MANAGEMENT API
// Comprehensive document generation, editing, signing, and management
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export function registerAiDocumentRoutes(app: Express) {
  
  // ============================================================================
  // AI DOCUMENT GENERATION
  // ============================================================================
  
  // Generate document using AI
  app.post('/api/ai-documents/generate', requireAuth, async (req: Request, res: Response) => {
    try {
      const { prompt, documentType, category, variables, templateId } = req.body;
      const userId = req.user!.id;
      
      // Build AI prompt
      let systemPrompt = `You are an expert legal and business document writer. Generate professional, legally sound documents based on user requirements. Format the output in clean HTML with proper headings, paragraphs, and formatting.`;
      
      let userPrompt = prompt;
      
      // If using template, fetch and apply it
      if (templateId) {
        const [template] = await db
          .select()
          .from(aiDocumentTemplates)
          .where(eq(aiDocumentTemplates.id, parseInt(templateId)))
          .limit(1);
          
        if (template) {
          systemPrompt = template.systemPrompt;
          userPrompt = template.userPromptTemplate;
          
          // Replace variables in template
          if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
              userPrompt = userPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
            });
          }
          
          // Update usage count
          await db
            .update(aiDocumentTemplates)
            .set({ usageCount: sql`${aiDocumentTemplates.usageCount} + 1` })
            .where(eq(aiDocumentTemplates.id, template.id));
        }
      }
      
      // Call Anthropic AI
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: userPrompt
        }],
        system: systemPrompt,
      });
      
      const content = message.content[0].type === 'text' ? message.content[0].text : '';
      
      // Generate document number
      const docCount = await db.select({ count: sql<number>`count(*)` }).from(aiDocuments);
      const documentNumber = `DOC-${new Date().getFullYear()}-${String(docCount[0].count + 1).padStart(4, '0')}`;
      
      // Save to database
      const [document] = await db.insert(aiDocuments).values({
        documentNumber,
        title: req.body.title || `${documentType} - ${new Date().toLocaleDateString()}`,
        documentType: documentType || 'general',
        category: category || 'other',
        generatedBy: 'ai',
        aiPrompt: prompt,
        aiModel: 'claude-sonnet-4',
        content,
        contentFormat: 'html',
        variables: variables || {},
        templateId: templateId ? parseInt(templateId) : null,
        serviceRequestId: req.body.serviceRequestId || null,
        clientId: req.body.clientId || null,
        entityId: req.body.entityId || null,
        status: 'draft',
        version: 1,
        createdBy: userId,
      }).returning();
      
      // Log activity
      await db.insert(documentActivityLog).values({
        documentId: document.id,
        userId,
        action: 'created',
        details: 'Document generated using AI',
        metadata: JSON.stringify({ aiModel: 'claude-sonnet-4', prompt }),
      });
      
      res.json({ success: true, document });
    } catch (error: any) {
      console.error('AI document generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate document' });
    }
  });
  
  // ============================================================================
  // DOCUMENT CRUD
  // ============================================================================
  
  // Get all documents
  app.get('/api/ai-documents', async (req: Request, res: Response) => {
    try {
      const { clientId, status, category, search } = req.query;
      
      let query = db.select().from(aiDocuments).orderBy(desc(aiDocuments.createdAt));
      
      const documents = await query;
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get document by ID
  app.get('/api/ai-documents/:id', async (req: Request, res: Response) => {
    try {
      const [document] = await db
        .select()
        .from(aiDocuments)
        .where(eq(aiDocuments.id, parseInt(req.params.id)))
        .limit(1);
        
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Get signatures
      const signatures = await db
        .select()
        .from(documentSignatures)
        .where(eq(documentSignatures.documentId, document.id));
        
      // Get signatories
      const signatories = await db
        .select()
        .from(documentSignatories)
        .where(eq(documentSignatories.documentId, document.id));
      
      // Log view activity
      const userId = (req as any).user?.id || null;
      await db.insert(documentActivityLog).values({
        documentId: document.id,
        userId,
        action: 'viewed',
        details: 'Document viewed',
      });
      
      res.json({ document, signatures, signatories });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update document content
  app.patch('/api/ai-documents/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const documentId = parseInt(req.params.id);
      
      const [existingDoc] = await db
        .select()
        .from(aiDocuments)
        .where(eq(aiDocuments.id, documentId))
        .limit(1);
        
      if (!existingDoc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const { content, title, status } = req.body;
      
      // Save version if content changed
      if (content && content !== existingDoc.content) {
        await db.insert(documentVersions).values({
          documentId,
          version: existingDoc.version,
          content: existingDoc.content,
          contentFormat: existingDoc.contentFormat,
          changes: req.body.changes || 'Content updated',
          editedBy: userId,
        });
        
        // Increment version
        await db
          .update(aiDocuments)
          .set({
            content,
            version: existingDoc.version + 1,
            lastEditedBy: userId,
            lastEditedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(aiDocuments.id, documentId));
      } else {
        // Update other fields
        await db
          .update(aiDocuments)
          .set({
            ...(title && { title }),
            ...(status && { status }),
            lastEditedBy: userId,
            lastEditedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(aiDocuments.id, documentId));
      }
      
      // Log activity
      await db.insert(documentActivityLog).values({
        documentId,
        userId,
        action: 'edited',
        details: `Document updated: ${req.body.changes || 'Content edited'}`,
      });
      
      const [updated] = await db
        .select()
        .from(aiDocuments)
        .where(eq(aiDocuments.id, documentId))
        .limit(1);
        
      res.json({ success: true, document: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete document
  app.delete('/api/ai-documents/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const documentId = parseInt(req.params.id);
      
      await db.delete(aiDocuments).where(eq(aiDocuments.id, documentId));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // SIGNATURE MANAGEMENT
  // ============================================================================
  
  // Add signatory to document
  app.post('/api/ai-documents/:id/signatories', async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const signatoryData = insertDocumentSignatorySchema.parse({
        ...req.body,
        documentId,
      });
      
      const [signatory] = await db.insert(documentSignatories).values(signatoryData).returning();
      
      // Update document signatory count
      await db
        .update(aiDocuments)
        .set({
          signatoryCount: sql`${aiDocuments.signatoryCount} + 1`,
          requiresSignature: true,
        })
        .where(eq(aiDocuments.id, documentId));
      
      res.json({ success: true, signatory });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Affix signature to document
  app.post('/api/ai-documents/:id/sign', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || null;
      const documentId = parseInt(req.params.id);
      
      const {
        signatureType, // dsc, esign, drawn, uploaded
        signatoryId,
        signatoryName,
        signatoryEmail,
        signatoryRole,
        signatureData, // for drawn signatures
        signatureImageUrl, // for uploaded
        dscDetails, // for DSC
        pageNumber,
        positionX,
        positionY,
      } = req.body;
      
      // Generate signature number
      const sigCount = await db.select({ count: sql<number>`count(*)` }).from(documentSignatures);
      const signatureNumber = `SIG-${new Date().getFullYear()}-${String(sigCount[0].count + 1).padStart(4, '0')}`;
      
      // Create signature
      const signaturePayload: any = {
        documentId,
        signatureNumber,
        signatoryId: signatoryId || userId,
        signatoryName,
        signatoryEmail,
        signatoryRole,
        signatureType,
        status: 'signed',
        signedAt: new Date(),
        pageNumber,
        positionX,
        positionY,
        ipAddress: req.ip || req.socket.remoteAddress,
      };
      
      // Add type-specific data
      if (signatureType === 'dsc' && dscDetails) {
        Object.assign(signaturePayload, {
          dscCertificateId: dscDetails.certificateId,
          dscSerialNumber: dscDetails.serialNumber,
          dscIssuer: dscDetails.issuer,
          dscValidFrom: dscDetails.validFrom,
          dscValidTo: dscDetails.validTo,
        });
      } else if (signatureType === 'drawn') {
        signaturePayload.signatureData = signatureData;
      } else if (signatureType === 'uploaded' || signatureType === 'esign') {
        signaturePayload.signatureImageUrl = signatureImageUrl;
      }
      
      const [signature] = await db.insert(documentSignatures).values(signaturePayload).returning();
      
      // Update signatory status
      if (signatoryId) {
        await db
          .update(documentSignatories)
          .set({
            status: 'signed',
            signedAt: new Date(),
            signatureId: signature.id,
          })
          .where(and(
            eq(documentSignatories.documentId, documentId),
            eq(documentSignatories.userId, signatoryId)
          ));
      }
      
      // Update document signature status
      const [doc] = await db
        .select()
        .from(aiDocuments)
        .where(eq(aiDocuments.id, documentId))
        .limit(1);
        
      const newSignedCount = doc.signedCount + 1;
      const signatureStatus = newSignedCount >= doc.signatoryCount ? 'fully_signed' : 'partially_signed';
      
      await db
        .update(aiDocuments)
        .set({
          signedCount: newSignedCount,
          signatureStatus,
          ...(signatureStatus === 'fully_signed' && { status: 'signed' }),
        })
        .where(eq(aiDocuments.id, documentId));
      
      // Log activity
      await db.insert(documentActivityLog).values({
        documentId,
        userId,
        action: 'signed',
        details: `Document signed by ${signatoryName} using ${signatureType}`,
        metadata: JSON.stringify({ signatureType, signatureNumber }),
      });
      
      res.json({ success: true, signature });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // ============================================================================
  // DOCUMENT TEMPLATES
  // ============================================================================
  
  // Get AI templates
  app.get('/api/ai-document-templates', async (req: Request, res: Response) => {
    try {
      const templates = await db
        .select()
        .from(aiDocumentTemplates)
        .where(eq(aiDocumentTemplates.isActive, true))
        .orderBy(desc(aiDocumentTemplates.usageCount));
        
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Download document as PDF (placeholder - would integrate with PDF generation library)
  app.get('/api/ai-documents/:id/download', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || null;
      const [document] = await db
        .select()
        .from(aiDocuments)
        .where(eq(aiDocuments.id, parseInt(req.params.id)))
        .limit(1);
        
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Log download activity
      await db.insert(documentActivityLog).values({
        documentId: document.id,
        userId,
        action: 'downloaded',
        details: 'Document downloaded',
      });
      
      // Return document content (in production, would generate PDF)
      res.json({
        success: true,
        document: {
          id: document.id,
          documentNumber: document.documentNumber,
          title: document.title,
          content: document.content,
          pdfUrl: document.pdfUrl,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  console.log('✅ AI Document routes registered');
}
