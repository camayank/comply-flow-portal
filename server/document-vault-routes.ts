import type { Express, Request, Response } from "express";
import { db } from './db';
import { documentVault } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { sessionAuthMiddleware, type AuthenticatedRequest } from './rbac-middleware';
import { storage } from './storage';

export function registerDocumentVaultRoutes(app: Express) {

  // Get all documents for the authenticated user
  app.get('/api/document-vault', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get user's business entity
      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      // Get documents for user or their business entity
      const documents = await db.select()
        .from(documentVault)
        .where(
          entityId
            ? eq(documentVault.businessEntityId, entityId)
            : eq(documentVault.userId, userId)
        )
        .orderBy(desc(documentVault.createdAt));

      // Calculate isExpiringSoon for each document
      const documentsWithMetrics = documents.map(doc => {
        const isExpiringSoon = doc.expiryDate
          ? new Date(doc.expiryDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 // 30 days
          : false;

        return {
          ...doc,
          isExpiringSoon,
        };
      });

      res.json(documentsWithMetrics);
    } catch (error: any) {
      console.error('Error fetching document vault:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  // Download a document (increment counter and return URL)
  app.post('/api/document-vault/:id/download', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get the document
      const [document] = await db.select()
        .from(documentVault)
        .where(eq(documentVault.id, documentId));

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Verify user has access
      const user = await storage.getUser(userId);
      const hasAccess = document.userId === userId ||
                        (user?.businessEntityId && document.businessEntityId === user.businessEntityId) ||
                        document.accessLevel === 'public';

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Increment download count and update last accessed
      await db.update(documentVault)
        .set({
          downloadCount: sql`${documentVault.downloadCount} + 1`,
          lastAccessed: new Date(),
        })
        .where(eq(documentVault.id, documentId));

      res.json({
        success: true,
        downloadUrl: document.fileUrl,
        fileName: document.originalFileName,
      });
    } catch (error: any) {
      console.error('Error downloading document:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  });

  // Delete a document
  app.delete('/api/document-vault/:id', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get the document
      const [document] = await db.select()
        .from(documentVault)
        .where(eq(documentVault.id, documentId));

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Verify user has permission to delete (must be owner or have admin access)
      const user = await storage.getUser(userId);
      const isOwner = document.userId === userId;
      const isEntityAdmin = user?.businessEntityId && document.businessEntityId === user.businessEntityId && user.role === 'admin';

      if (!isOwner && !isEntityAdmin) {
        return res.status(403).json({ error: 'Access denied - only document owner can delete' });
      }

      // Official documents cannot be deleted
      if (document.isOfficial) {
        return res.status(400).json({ error: 'Official documents cannot be deleted' });
      }

      // Delete the document
      await db.delete(documentVault)
        .where(eq(documentVault.id, documentId));

      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  // Upload a new document
  app.post('/api/document-vault/upload', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        documentType,
        category,
        fileName,
        originalFileName,
        fileSize,
        mimeType,
        fileUrl,
        expiryDate,
        tags
      } = req.body;

      // Get user's business entity
      const user = await storage.getUser(userId);

      const [newDocument] = await db.insert(documentVault)
        .values({
          userId,
          businessEntityId: user?.businessEntityId,
          documentType,
          category: category || 'general',
          fileName,
          originalFileName,
          fileSize,
          mimeType,
          fileUrl,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          tags: tags || [],
          accessLevel: 'private',
          approvalStatus: 'pending',
        })
        .returning();

      res.status(201).json(newDocument);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });

  // Get document categories with counts
  app.get('/api/document-vault/categories', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      // Get documents grouped by category
      const documents = await db.select()
        .from(documentVault)
        .where(
          entityId
            ? eq(documentVault.businessEntityId, entityId)
            : eq(documentVault.userId, userId)
        );

      // Group by category
      const categoryCounts: Record<string, { count: number, totalSize: number }> = {};

      documents.forEach(doc => {
        const cat = doc.category || 'general';
        if (!categoryCounts[cat]) {
          categoryCounts[cat] = { count: 0, totalSize: 0 };
        }
        categoryCounts[cat].count++;
        categoryCounts[cat].totalSize += doc.fileSize || 0;
      });

      const categories = Object.entries(categoryCounts).map(([name, data]) => ({
        name,
        count: data.count,
        totalSize: data.totalSize,
      }));

      res.json(categories);
    } catch (error: any) {
      console.error('Error fetching document categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // Register routes at both /api and /api/v1 paths for backward compatibility
  app.get('/api/v1/document-vault', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    // Reuse the same handler logic
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      const documents = await db.select()
        .from(documentVault)
        .where(
          entityId
            ? eq(documentVault.businessEntityId, entityId)
            : eq(documentVault.userId, userId)
        )
        .orderBy(desc(documentVault.createdAt));

      const documentsWithMetrics = documents.map(doc => ({
        ...doc,
        isExpiringSoon: doc.expiryDate
          ? new Date(doc.expiryDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
          : false,
      }));

      res.json(documentsWithMetrics);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  app.post('/api/v1/document-vault/:id/download', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const documentId = parseInt(req.params.id);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const [document] = await db.select().from(documentVault).where(eq(documentVault.id, documentId));
      if (!document) return res.status(404).json({ error: 'Document not found' });

      await db.update(documentVault)
        .set({ downloadCount: sql`${documentVault.downloadCount} + 1`, lastAccessed: new Date() })
        .where(eq(documentVault.id, documentId));

      res.json({ success: true, downloadUrl: document.fileUrl, fileName: document.originalFileName });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to download document' });
    }
  });

  app.delete('/api/v1/document-vault/:id', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const documentId = parseInt(req.params.id);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const [document] = await db.select().from(documentVault).where(eq(documentVault.id, documentId));
      if (!document) return res.status(404).json({ error: 'Document not found' });
      if (document.isOfficial) return res.status(400).json({ error: 'Official documents cannot be deleted' });

      await db.delete(documentVault).where(eq(documentVault.id, documentId));
      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  console.log('✅ Document Vault routes registered');
}
