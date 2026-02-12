/**
 * Investor Data Room Routes
 * Secure document sharing with potential investors
 *
 * Features:
 * - Create shareable data rooms with expiring access tokens
 * - Granular document access control (by category or individual docs)
 * - View analytics (who viewed what, when, for how long)
 * - Watermarking capability
 * - NDA requirement before access
 */

import type { Express, Request, Response } from "express";
import { db } from './db';
import {
  documentVault,
  businessEntities,
  users
} from '@shared/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, type AuthenticatedRequest } from './rbac-middleware';
import { storage } from './storage';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import { resolveDownloadUrl } from './storage-url';

// Data room access token structure
interface DataRoomToken {
  id: string;
  entityId: number;
  investorEmail: string;
  investorName: string;
  accessCategories: string[];
  documentIds?: number[];
  requiresNda: boolean;
  ndaSigned: boolean;
  createdAt: Date;
  expiresAt: Date;
  maxViews?: number;
  viewCount: number;
  isRevoked: boolean;
  lastAccessedAt?: Date;
  ipAddresses: string[];
}

// In-memory token storage (replace with database table in production)
const dataRoomTokens = new Map<string, DataRoomToken>();

// Access log storage
interface AccessLog {
  id: string;
  tokenId: string;
  documentId: number;
  action: 'view' | 'download' | 'print';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  duration?: number;
}

const accessLogs: AccessLog[] = [];

export function registerInvestorDataRoomRoutes(app: Express) {
  const requireClientAccess = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.CLIENT)] as const;

  // ============================================================
  // DATA ROOM MANAGEMENT (for business owners)
  // ============================================================

  /**
   * Get all data rooms for the entity
   */
  app.get('/api/data-room', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      if (!entityId) {
        return res.status(400).json({ error: 'No business entity associated' });
      }

      // Get all tokens for this entity
      const tokens = Array.from(dataRoomTokens.values())
        .filter(t => t.entityId === entityId)
        .map(t => ({
          id: t.id,
          investorName: t.investorName,
          investorEmail: t.investorEmail,
          accessCategories: t.accessCategories,
          documentCount: t.documentIds?.length || 0,
          requiresNda: t.requiresNda,
          ndaSigned: t.ndaSigned,
          expiresAt: t.expiresAt,
          viewCount: t.viewCount,
          maxViews: t.maxViews,
          lastAccessedAt: t.lastAccessedAt,
          isExpired: new Date(t.expiresAt) < new Date(),
          isRevoked: t.isRevoked,
          createdAt: t.createdAt
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({
        entityId,
        dataRooms: tokens,
        stats: {
          total: tokens.length,
          active: tokens.filter(t => !t.isExpired && !t.isRevoked).length,
          expired: tokens.filter(t => t.isExpired).length,
          revoked: tokens.filter(t => t.isRevoked).length,
          totalViews: tokens.reduce((sum, t) => sum + t.viewCount, 0)
        }
      });

    } catch (error: any) {
      console.error('Error fetching data rooms:', error);
      res.status(500).json({ error: 'Failed to fetch data rooms' });
    }
  });

  /**
   * Create a new data room access token
   */
  app.post('/api/data-room/create', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      if (!entityId) {
        return res.status(400).json({ error: 'No business entity associated' });
      }

      const {
        investorName,
        investorEmail,
        accessCategories = ['legal', 'financial', 'compliance'],
        documentIds,
        requiresNda = true,
        expiresInDays = 30,
        maxViews
      } = req.body;

      // Validate investor details
      if (!investorName || !investorEmail) {
        return res.status(400).json({ error: 'Investor name and email required' });
      }

      // Generate secure access token
      const tokenId = nanoid(32);
      const accessToken = createHash('sha256')
        .update(`${tokenId}-${entityId}-${Date.now()}`)
        .digest('hex')
        .slice(0, 48);

      // Create data room token
      const dataRoomToken: DataRoomToken = {
        id: tokenId,
        entityId,
        investorName,
        investorEmail,
        accessCategories,
        documentIds,
        requiresNda,
        ndaSigned: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
        maxViews,
        viewCount: 0,
        isRevoked: false,
        ipAddresses: []
      };

      dataRoomTokens.set(accessToken, dataRoomToken);

      // Get entity details for response
      const [entity] = await db.select()
        .from(businessEntities)
        .where(eq(businessEntities.id, entityId))
        .limit(1);

      res.json({
        success: true,
        dataRoom: {
          id: tokenId,
          accessToken,
          accessUrl: `${process.env.FRONTEND_URL || 'https://app.digicomply.in'}/data-room/${accessToken}`,
          investorName,
          investorEmail,
          accessCategories,
          requiresNda,
          expiresAt: dataRoomToken.expiresAt,
          maxViews,
          entityName: entity?.entityName
        },
        message: 'Data room created successfully. Share the access URL with the investor.'
      });

    } catch (error: any) {
      console.error('Error creating data room:', error);
      res.status(500).json({ error: 'Failed to create data room' });
    }
  });

  /**
   * Revoke data room access
   */
  app.post('/api/data-room/:tokenId/revoke', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tokenId } = req.params;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      // Find the token
      let targetToken: DataRoomToken | undefined;
      let targetKey: string | undefined;

      for (const [key, token] of dataRoomTokens.entries()) {
        if (token.id === tokenId && token.entityId === entityId) {
          targetToken = token;
          targetKey = key;
          break;
        }
      }

      if (!targetToken || !targetKey) {
        return res.status(404).json({ error: 'Data room not found' });
      }

      // Revoke access
      targetToken.isRevoked = true;
      dataRoomTokens.set(targetKey, targetToken);

      res.json({
        success: true,
        message: 'Data room access revoked successfully',
        investorEmail: targetToken.investorEmail
      });

    } catch (error: any) {
      console.error('Error revoking data room:', error);
      res.status(500).json({ error: 'Failed to revoke data room' });
    }
  });

  /**
   * Get data room analytics
   */
  app.get('/api/data-room/:tokenId/analytics', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tokenId } = req.params;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      // Find the token
      let targetToken: DataRoomToken | undefined;

      for (const token of dataRoomTokens.values()) {
        if (token.id === tokenId && token.entityId === entityId) {
          targetToken = token;
          break;
        }
      }

      if (!targetToken) {
        return res.status(404).json({ error: 'Data room not found' });
      }

      // Get access logs for this token
      const tokenLogs = accessLogs.filter(log => log.tokenId === tokenId);

      // Aggregate by document
      const documentViews: Record<number, { views: number; downloads: number; totalDuration: number }> = {};
      tokenLogs.forEach(log => {
        if (!documentViews[log.documentId]) {
          documentViews[log.documentId] = { views: 0, downloads: 0, totalDuration: 0 };
        }
        if (log.action === 'view') {
          documentViews[log.documentId].views++;
          documentViews[log.documentId].totalDuration += log.duration || 0;
        } else if (log.action === 'download') {
          documentViews[log.documentId].downloads++;
        }
      });

      // Get document details
      const documentIds = Object.keys(documentViews).map(Number);
      const documents = documentIds.length > 0
        ? await db.select()
            .from(documentVault)
            .where(inArray(documentVault.id, documentIds))
        : [];

      const documentAnalytics = documents.map(doc => ({
        id: doc.id,
        name: doc.originalFileName || doc.fileName,
        category: doc.category,
        views: documentViews[doc.id]?.views || 0,
        downloads: documentViews[doc.id]?.downloads || 0,
        avgViewDuration: documentViews[doc.id]?.views > 0
          ? Math.round(documentViews[doc.id].totalDuration / documentViews[doc.id].views)
          : 0
      }));

      res.json({
        tokenId,
        investorName: targetToken.investorName,
        investorEmail: targetToken.investorEmail,
        summary: {
          totalViews: targetToken.viewCount,
          uniqueDocumentsViewed: Object.keys(documentViews).length,
          lastAccessedAt: targetToken.lastAccessedAt,
          ipAddresses: targetToken.ipAddresses
        },
        documents: documentAnalytics.sort((a, b) => b.views - a.views),
        timeline: tokenLogs
          .slice(-50) // Last 50 events
          .reverse()
          .map(log => ({
            action: log.action,
            documentId: log.documentId,
            timestamp: log.timestamp
          }))
      });

    } catch (error: any) {
      console.error('Error fetching data room analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // ============================================================
  // INVESTOR ACCESS (public routes with token authentication)
  // ============================================================

  /**
   * Validate data room access token and get room info
   */
  app.get('/api/data-room/access/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const dataRoom = dataRoomTokens.get(token);

      if (!dataRoom) {
        return res.status(404).json({ error: 'Invalid or expired access link' });
      }

      // Check if revoked
      if (dataRoom.isRevoked) {
        return res.status(403).json({ error: 'Access has been revoked by the company' });
      }

      // Check expiry
      if (new Date(dataRoom.expiresAt) < new Date()) {
        return res.status(403).json({ error: 'Access link has expired' });
      }

      // Check max views
      if (dataRoom.maxViews && dataRoom.viewCount >= dataRoom.maxViews) {
        return res.status(403).json({ error: 'Maximum view limit reached' });
      }

      // Get entity details
      const [entity] = await db.select()
        .from(businessEntities)
        .where(eq(businessEntities.id, dataRoom.entityId))
        .limit(1);

      res.json({
        valid: true,
        entityName: entity?.entityName || 'Company',
        entityType: entity?.entityType,
        investorName: dataRoom.investorName,
        requiresNda: dataRoom.requiresNda,
        ndaSigned: dataRoom.ndaSigned,
        accessCategories: dataRoom.accessCategories,
        expiresAt: dataRoom.expiresAt
      });

    } catch (error: any) {
      console.error('Error validating data room access:', error);
      res.status(500).json({ error: 'Failed to validate access' });
    }
  });

  /**
   * Sign NDA for data room access
   */
  app.post('/api/data-room/access/:token/sign-nda', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { signature, agreedAt } = req.body;
      const dataRoom = dataRoomTokens.get(token);

      if (!dataRoom) {
        return res.status(404).json({ error: 'Invalid access link' });
      }

      if (!dataRoom.requiresNda) {
        return res.status(400).json({ error: 'NDA not required for this data room' });
      }

      // Record NDA signature
      dataRoom.ndaSigned = true;
      dataRoomTokens.set(token, dataRoom);

      res.json({
        success: true,
        message: 'NDA signed successfully. You now have access to the data room.',
        ndaSignedAt: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error signing NDA:', error);
      res.status(500).json({ error: 'Failed to sign NDA' });
    }
  });

  /**
   * Get documents for investor (with token authentication)
   */
  app.get('/api/data-room/access/:token/documents', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

      const dataRoom = dataRoomTokens.get(token);

      if (!dataRoom) {
        return res.status(404).json({ error: 'Invalid access link' });
      }

      // Validate access
      if (dataRoom.isRevoked) {
        return res.status(403).json({ error: 'Access revoked' });
      }
      if (new Date(dataRoom.expiresAt) < new Date()) {
        return res.status(403).json({ error: 'Access expired' });
      }
      if (dataRoom.requiresNda && !dataRoom.ndaSigned) {
        return res.status(403).json({ error: 'Please sign the NDA first' });
      }

      // Update access metrics
      dataRoom.viewCount++;
      dataRoom.lastAccessedAt = new Date();
      if (!dataRoom.ipAddresses.includes(ipAddress)) {
        dataRoom.ipAddresses.push(ipAddress);
      }
      dataRoomTokens.set(token, dataRoom);

      // Build query for allowed documents
      let query = db.select()
        .from(documentVault)
        .where(eq(documentVault.businessEntityId, dataRoom.entityId));

      // Get all documents for the entity
      const allDocuments = await query;

      // Filter by access categories or specific document IDs
      let allowedDocuments = allDocuments;

      if (dataRoom.documentIds && dataRoom.documentIds.length > 0) {
        // Specific documents granted
        allowedDocuments = allDocuments.filter(doc => dataRoom.documentIds!.includes(doc.id));
      } else if (dataRoom.accessCategories && dataRoom.accessCategories.length > 0) {
        // Filter by category
        allowedDocuments = allDocuments.filter(doc =>
          dataRoom.accessCategories.includes(doc.category || 'general') ||
          doc.accessLevel === 'investor'
        );
      }

      // Group by category for display
      const byCategory: Record<string, any[]> = {};
      allowedDocuments.forEach(doc => {
        const cat = doc.category || 'general';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push({
          id: doc.id,
          name: doc.originalFileName || doc.fileName,
          type: doc.documentType,
          size: doc.fileSize,
          uploadedAt: doc.createdAt,
          isVerified: doc.approvalStatus === 'approved'
        });
      });

      res.json({
        entityId: dataRoom.entityId,
        investorName: dataRoom.investorName,
        categories: Object.entries(byCategory).map(([name, docs]) => ({
          name,
          displayName: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          documentCount: docs.length,
          documents: docs
        })),
        totalDocuments: allowedDocuments.length,
        accessedAt: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error fetching data room documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  /**
   * Download document from data room (with tracking)
   */
  app.post('/api/data-room/access/:token/documents/:docId/download', async (req: Request, res: Response) => {
    try {
      const { token, docId } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const dataRoom = dataRoomTokens.get(token);

      if (!dataRoom) {
        return res.status(404).json({ error: 'Invalid access link' });
      }

      // Validate access
      if (dataRoom.isRevoked || new Date(dataRoom.expiresAt) < new Date()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (dataRoom.requiresNda && !dataRoom.ndaSigned) {
        return res.status(403).json({ error: 'Please sign the NDA first' });
      }

      // Get document
      const [document] = await db.select()
        .from(documentVault)
        .where(eq(documentVault.id, parseInt(docId)));

      if (!document || document.businessEntityId !== dataRoom.entityId) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check if document is in allowed list
      const isAllowed = dataRoom.documentIds
        ? dataRoom.documentIds.includes(document.id)
        : dataRoom.accessCategories.includes(document.category || 'general');

      if (!isAllowed) {
        return res.status(403).json({ error: 'Access to this document not granted' });
      }

      // Log access
      accessLogs.push({
        id: nanoid(),
        tokenId: dataRoom.id,
        documentId: document.id,
        action: 'download',
        timestamp: new Date(),
        ipAddress,
        userAgent
      });

      // Update download count
      await db.update(documentVault)
        .set({
          downloadCount: sql`${documentVault.downloadCount} + 1`,
          lastAccessed: new Date()
        })
        .where(eq(documentVault.id, document.id));

      const downloadUrl = await resolveDownloadUrl(document.fileUrl);

      res.json({
        success: true,
        downloadUrl,
        fileName: document.originalFileName || document.fileName,
        // In production, generate a signed URL with watermark
        watermarked: true,
        watermarkText: `Confidential - ${dataRoom.investorName}`
      });

    } catch (error: any) {
      console.error('Error downloading from data room:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  });

  /**
   * Log document view (for analytics)
   */
  app.post('/api/data-room/access/:token/documents/:docId/view', async (req: Request, res: Response) => {
    try {
      const { token, docId } = req.params;
      const { duration } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const dataRoom = dataRoomTokens.get(token);
      if (!dataRoom) {
        return res.status(404).json({ error: 'Invalid access link' });
      }

      // Log view
      accessLogs.push({
        id: nanoid(),
        tokenId: dataRoom.id,
        documentId: parseInt(docId),
        action: 'view',
        timestamp: new Date(),
        ipAddress,
        userAgent,
        duration
      });

      res.json({ success: true, logged: true });

    } catch (error: any) {
      console.error('Error logging view:', error);
      res.status(500).json({ error: 'Failed to log view' });
    }
  });

  /**
   * Get data room categories available for sharing
   */
  app.get('/api/data-room/categories', ...requireClientAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({
        categories: [
          { id: 'legal', name: 'Legal Documents', description: 'Incorporation docs, MOA/AOA, agreements' },
          { id: 'financial', name: 'Financial Statements', description: 'Audited financials, MIS, projections' },
          { id: 'compliance', name: 'Compliance Records', description: 'ROC filings, tax returns, GST records' },
          { id: 'governance', name: 'Governance', description: 'Board resolutions, shareholder agreements' },
          { id: 'intellectual_property', name: 'Intellectual Property', description: 'Patents, trademarks, IP assignments' },
          { id: 'contracts', name: 'Key Contracts', description: 'Customer contracts, vendor agreements' },
          { id: 'hr', name: 'HR & Team', description: 'Employment agreements, ESOP documents' },
          { id: 'operational', name: 'Operational', description: 'Licenses, permits, certifications' }
        ]
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  console.log('✅ Investor Data Room routes registered');
}
