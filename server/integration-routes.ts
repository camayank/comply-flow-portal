import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { integrationHub } from './integration-hub';
import { 
  insertIntegrationCredentialSchema,
  insertGovernmentFilingSchema,
  insertIntegrationJobSchema
} from '@shared/schema';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES, AuthenticatedRequest } from './rbac-middleware';

// ============================================================================
// INTEGRATION SYSTEM API ROUTES - Separate from Portal
// Handles Government API Integration (GSP, ERI, MCA21) and Google Sheets Sync
// ============================================================================

export function registerIntegrationRoutes(app: Express) {
  
  // ========================================================================
  // CREDENTIAL MANAGEMENT ROUTES
  // ========================================================================
  
  // Store new integration credentials
  app.post(
    '/api/integration/credentials',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const validatedData = insertIntegrationCredentialSchema.parse({
          ...req.body,
          createdBy: req.user?.id
        });
        
        const credential = await integrationHub.storeCredentials(validatedData);
        
        res.json({
          success: true,
          credential: {
            ...credential,
            apiKey: undefined,
            clientSecret: undefined,
            tokenData: undefined
          }
        });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Get credentials for a client
  app.get(
    '/api/integration/credentials/:clientId/:portalType',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const portalType = req.params.portalType;
        
        const credential = await integrationHub.getCredentials(clientId, portalType);
        
        if (!credential) {
          return res.status(404).json({ error: 'Credentials not found' });
        }
        
        res.json({
          success: true,
          credential: {
            ...credential,
            apiKey: undefined,
            clientSecret: undefined,
            tokenData: undefined
          }
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Update credentials
  app.put(
    '/api/integration/credentials/:id',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const updated = await integrationHub.updateCredentials(id, req.body);
        
        res.json({
          success: true,
          credential: {
            ...updated,
            apiKey: undefined,
            clientSecret: undefined,
            tokenData: undefined
          }
        });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Deactivate credentials
  app.delete(
    '/api/integration/credentials/:id',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        await integrationHub.deactivateCredentials(id);
        
        res.json({ success: true, message: 'Credentials deactivated' });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ========================================================================
  // FILING MANAGEMENT ROUTES
  // ========================================================================

  // Create new filing
  app.post(
    '/api/integration/filings',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const validatedData = insertGovernmentFilingSchema.parse(req.body);
        const filing = await integrationHub.createFiling(validatedData);
        
        res.json({ success: true, filing });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Get filings for a client
  app.get(
    '/api/integration/filings/:clientId',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const portalType = req.query.portalType as string | undefined;
        
        const filings = await integrationHub.getFilingsByClient(clientId, portalType);
        
        res.json({ success: true, filings });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get single filing
  app.get(
    '/api/integration/filings/detail/:id',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const filing = await integrationHub.getFilingById(id);
        
        if (!filing) {
          return res.status(404).json({ error: 'Filing not found' });
        }
        
        res.json({ success: true, filing });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Update filing status
  app.patch(
    '/api/integration/filings/:id',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const updated = await integrationHub.updateFiling(id, req.body);
        
        res.json({ success: true, filing: updated });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // ========================================================================
  // JOB QUEUE ROUTES
  // ========================================================================

  // Create new integration job
  app.post(
    '/api/integration/jobs',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const validatedData = insertIntegrationJobSchema.parse(req.body);
        const job = await integrationHub.createJob(validatedData);
        
        res.json({ success: true, job });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // Get jobs by status
  app.get(
    '/api/integration/jobs/status/:status',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const status = req.params.status;
        const limit = parseInt(req.query.limit as string) || 50;
        
        const jobs = await integrationHub.getJobsByStatus(status, limit);
        
        res.json({ success: true, jobs });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // Get single job
  app.get(
    '/api/integration/jobs/:id',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.OPS_EXECUTIVE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const job = await integrationHub.getJobById(id);
        
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }
        
        res.json({ success: true, job });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ========================================================================
  // API AUDIT LOG ROUTES
  // ========================================================================

  // Get API audit logs
  app.get(
    '/api/integration/audit-logs',
    sessionAuthMiddleware,
    requireMinimumRole(USER_ROLES.ADMIN),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : 0;
        const portalType = req.query.portalType as string | undefined;
        const limit = parseInt(req.query.limit as string) || 100;
        
        const logs = await integrationHub.getApiLogs(clientId, portalType, limit);
        
        res.json({ success: true, logs });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ========================================================================
  // HEALTH CHECK & STATUS
  // ========================================================================

  app.get(
    '/api/integration/health',
    async (req: Request, res: Response) => {
      res.json({
        success: true,
        status: 'operational',
        services: {
          gsp: 'ready',
          eri: 'ready',
          mca21: 'ready',
          sheets: 'ready'
        },
        timestamp: new Date().toISOString()
      });
    }
  );

  console.log('✅ Integration System routes registered (separate from portal)');
}
