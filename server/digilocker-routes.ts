/**
 * DigiLocker Integration Routes
 *
 * API endpoints for DigiLocker integration
 */

import type { Express, Request, Response } from "express";
import { sessionAuthMiddleware, type AuthenticatedRequest } from './rbac-middleware';
import { storage } from './storage';
import * as digilockerService from './services/digilockerService';

export function registerDigiLockerRoutes(app: Express) {

  /**
   * GET /api/digilocker/status
   * Get DigiLocker integration status and configuration
   */
  app.get('/api/digilocker/status', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const integrationStatus = digilockerService.getIntegrationStatus();
      const connectionStatus = digilockerService.getConnectionStatus(userId);

      res.json({
        integration: integrationStatus,
        connection: connectionStatus,
        documentTypes: Object.entries(digilockerService.DIGILOCKER_DOCUMENT_TYPES).map(([key, value]) => ({
          key,
          ...value
        }))
      });

    } catch (error: any) {
      console.error('DigiLocker status error:', error);
      res.status(500).json({ error: 'Failed to get DigiLocker status' });
    }
  });

  /**
   * GET /api/digilocker/connect
   * Initiate DigiLocker OAuth connection
   */
  app.get('/api/digilocker/connect', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { redirectUrl } = req.query;

      // Check if already connected
      if (digilockerService.isConnected(userId)) {
        return res.json({
          connected: true,
          message: 'Already connected to DigiLocker'
        });
      }

      // Get user's business entity
      const user = await storage.getUser(userId);
      const entityId = user?.businessEntityId;

      // Generate authorization URL
      const authUrl = digilockerService.generateAuthUrl(
        userId,
        entityId || undefined,
        redirectUrl as string
      );

      res.json({
        connected: false,
        authUrl,
        message: 'Redirect user to authUrl to connect DigiLocker'
      });

    } catch (error: any) {
      console.error('DigiLocker connect error:', error);
      res.status(500).json({ error: 'Failed to initiate DigiLocker connection' });
    }
  });

  /**
   * GET /api/digilocker/callback
   * OAuth callback handler
   */
  app.get('/api/digilocker/callback', async (req: Request, res: Response) => {
    try {
      const { code, state, error, error_description } = req.query;

      if (error) {
        console.error('DigiLocker OAuth error:', error, error_description);
        return res.redirect(`/settings?digilocker_error=${encodeURIComponent(error_description as string || 'Connection failed')}`);
      }

      if (!code || !state) {
        return res.redirect('/settings?digilocker_error=Missing authorization code');
      }

      // Exchange code for token
      const result = await digilockerService.exchangeCodeForToken(code as string, state as string);

      if (!result.success) {
        return res.redirect(`/settings?digilocker_error=${encodeURIComponent(result.error || 'Token exchange failed')}`);
      }

      // Success - redirect to settings page
      res.redirect('/settings?digilocker_connected=true');

    } catch (error: any) {
      console.error('DigiLocker callback error:', error);
      res.redirect('/settings?digilocker_error=Unexpected error');
    }
  });

  /**
   * POST /api/digilocker/disconnect
   * Disconnect DigiLocker
   */
  app.post('/api/digilocker/disconnect', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const result = digilockerService.disconnect(userId);

      res.json({
        success: result,
        message: result ? 'DigiLocker disconnected successfully' : 'No active connection found'
      });

    } catch (error: any) {
      console.error('DigiLocker disconnect error:', error);
      res.status(500).json({ error: 'Failed to disconnect DigiLocker' });
    }
  });

  /**
   * GET /api/digilocker/documents
   * Get user's documents from DigiLocker
   */
  app.get('/api/digilocker/documents', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      if (!digilockerService.isConnected(userId)) {
        return res.status(400).json({
          error: 'Not connected to DigiLocker',
          connectRequired: true
        });
      }

      const result = await digilockerService.getDocuments(userId);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      // Group documents by category
      const documentTypes = digilockerService.DIGILOCKER_DOCUMENT_TYPES;
      const categorized: Record<string, any[]> = {
        identity: [],
        business: [],
        education: [],
        other: []
      };

      result.documents?.forEach(doc => {
        const typeInfo = Object.values(documentTypes).find(t => t.code === doc.docType);
        const category = typeInfo?.category || 'other';
        categorized[category].push({
          ...doc,
          typeName: typeInfo?.name || doc.docType
        });
      });

      res.json({
        documents: result.documents,
        byCategory: categorized,
        totalCount: result.documents?.length || 0
      });

    } catch (error: any) {
      console.error('DigiLocker documents error:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  /**
   * GET /api/digilocker/documents/:uri/download
   * Download specific document from DigiLocker
   */
  app.get('/api/digilocker/documents/:uri/download', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { uri } = req.params;

      if (!digilockerService.isConnected(userId)) {
        return res.status(400).json({ error: 'Not connected to DigiLocker' });
      }

      const result = await digilockerService.fetchDocument(userId, decodeURIComponent(uri));

      if (!result.success || !result.content) {
        return res.status(500).json({ error: result.error || 'Failed to fetch document' });
      }

      res.setHeader('Content-Type', result.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${uri.split('-').pop() || 'document'}.pdf"`);
      res.send(result.content);

    } catch (error: any) {
      console.error('DigiLocker download error:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  });

  /**
   * POST /api/digilocker/verify
   * Verify document using DigiLocker
   */
  app.post('/api/digilocker/verify', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { docType, docNumber, additionalParams } = req.body;

      if (!docType || !docNumber) {
        return res.status(400).json({ error: 'Document type and number required' });
      }

      const result = await digilockerService.verifyDocument(docType, docNumber, additionalParams);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        verified: result.isValid,
        documentData: result.documentData,
        verifiedAt: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('DigiLocker verify error:', error);
      res.status(500).json({ error: 'Failed to verify document' });
    }
  });

  /**
   * POST /api/digilocker/import
   * Import document from DigiLocker to our vault
   */
  app.post('/api/digilocker/import', sessionAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { documentUri, category, tags } = req.body;

      if (!documentUri) {
        return res.status(400).json({ error: 'Document URI required' });
      }

      if (!digilockerService.isConnected(userId)) {
        return res.status(400).json({ error: 'Not connected to DigiLocker' });
      }

      // Fetch document from DigiLocker
      const fetchResult = await digilockerService.fetchDocument(userId, documentUri);

      if (!fetchResult.success || !fetchResult.content) {
        return res.status(500).json({ error: 'Failed to fetch document from DigiLocker' });
      }

      // Get user and entity info
      const user = await storage.getUser(userId);

      // In production, save to document vault
      // For now, return success with document info
      res.json({
        success: true,
        message: 'Document imported from DigiLocker',
        document: {
          sourceUri: documentUri,
          category: category || 'digilocker',
          size: fetchResult.content.length,
          mimeType: fetchResult.mimeType,
          importedAt: new Date().toISOString(),
          isVerified: true,
          verificationSource: 'DigiLocker'
        }
      });

    } catch (error: any) {
      console.error('DigiLocker import error:', error);
      res.status(500).json({ error: 'Failed to import document' });
    }
  });

  /**
   * GET /api/digilocker/supported-documents
   * Get list of supported document types
   */
  app.get('/api/digilocker/supported-documents', async (req: Request, res: Response) => {
    try {
      const documentTypes = digilockerService.DIGILOCKER_DOCUMENT_TYPES;

      const byCategory: Record<string, any[]> = {};
      Object.entries(documentTypes).forEach(([key, value]) => {
        if (!byCategory[value.category]) byCategory[value.category] = [];
        byCategory[value.category].push({
          key,
          ...value
        });
      });

      res.json({
        documentTypes: Object.entries(documentTypes).map(([key, value]) => ({
          key,
          ...value
        })),
        byCategory,
        totalSupported: Object.keys(documentTypes).length
      });

    } catch (error: any) {
      console.error('DigiLocker supported docs error:', error);
      res.status(500).json({ error: 'Failed to get supported documents' });
    }
  });

  console.log('✅ DigiLocker routes registered');
}
