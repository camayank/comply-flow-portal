/**
 * Client V2 API Routes - Robust US-Style Implementation
 *
 * Following best practices from:
 * - Vanta: Real-time compliance state calculation
 * - Drata: Prioritized action recommendations
 * - Stripe: Activity audit trails and clean API design
 * - Secureframe: Document management with integrity checks
 *
 * SECURITY: All routes require authentication and validate user ownership
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

// Use NEW V2 service layer with proper database architecture
import * as ClientService from '../services/v2/client-service';
import * as ComplianceService from '../services/v2/compliance-service';
import * as ServiceCatalogService from '../services/v2/service-catalog-service';

// Legacy services for document management (will migrate later)
import {
  calculateComplianceState,
  getNextPrioritizedAction,
  getRecentActivities,
  logActivity,
} from '../services/compliance-engine';
import {
  storeDocument,
  getClientDocuments,
} from '../services/document-service';

import {
  sessionAuthMiddleware,
  requireRole,
  USER_ROLES,
  type AuthenticatedRequest
} from '../rbac-middleware';

const router = Router();

// Apply authentication to ALL routes in this router
router.use(sessionAuthMiddleware as any);
router.use(requireRole(USER_ROLES.CLIENT) as any);

// Helper to get authenticated user ID - NEVER accept from query/body params
function getAuthenticatedUserId(req: Request): string | null {
  const user = (req as AuthenticatedRequest).user;
  return user?.id ? String(user.id) : null;
}

// Configure multer for secure file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'client-documents');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|xlsx?|xls|jpg|jpeg|png|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only documents, spreadsheets, and images are allowed'));
  },
});

/**
 * GET /api/v2/client/status
 *
 * Single aggregated endpoint for entire portal dashboard
 * Returns: compliance state, next action, recent activities
 *
 * Vanta-style real-time compliance calculation
 * SECURITY: Uses authenticated user ID only - never from query params
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // SECURITY: Get userId ONLY from authenticated session - never from query/body
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Use V2 service layer (Vanta/Drata architecture)
    const client = await ClientService.getClientByUserId(userId);

    if (!client) {
      // No client profile found - user needs to complete onboarding
      return res.status(404).json({
        error: 'Client profile not found',
        message: 'Please complete your profile setup to access the dashboard',
        needsOnboarding: true
      });
    }

    const clientId = client.id;

    // ✅ USE REAL DATABASE SERVICES (Vanta/Drata pattern)
    const complianceState = await ComplianceService.getComplianceState(clientId);
    const nextActionData = await ComplianceService.getNextPrioritizedAction(clientId);
    const recentActivities = await ComplianceService.getRecentActivities(clientId, 10);

    // Format deadline
    let nextDeadline: string | undefined;
    if (complianceState?.nextCriticalDeadline) {
      const deadline = new Date(complianceState.nextCriticalDeadline);
      nextDeadline = deadline.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } else if (nextActionData?.dueDate) {
      const deadline = new Date(nextActionData.dueDate);
      nextDeadline = deadline.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    // Format response for frontend
    return res.json({
      complianceState: complianceState?.overallState || 'GREEN',
      daysSafe: complianceState?.daysUntilCritical || 30,
      nextDeadline,
      penaltyExposure: complianceState?.totalPenaltyExposure || 0,
      stats: {
        compliantItems: complianceState?.compliantItems || 0,
        pendingItems: complianceState?.pendingItems || 0,
        overdueItems: complianceState?.overdueItems || 0,
      },
      nextAction: nextActionData ? {
        id: `action-${nextActionData.id}`,
        title: nextActionData.title,
        timeEstimate: `${nextActionData.estimatedMinutes || 5} minutes`,
        whyMatters: {
          benefits: nextActionData.benefits || [
            nextActionData.description,
            nextActionData.penaltyAmount ? `Avoid ₹${nextActionData.penaltyAmount.toLocaleString('en-IN')} penalty` : 'Maintain compliance',
            'Keep your business running smoothly',
            'Stay compliant with regulations'
          ],
          socialProof: 'Thousands of businesses stay compliant with this action',
        },
        actionType: nextActionData.actionType,
        instructions: nextActionData.instructions || [
          'Review the requirements',
          'Gather necessary documents',
          'Complete the action below',
          'Submit for verification'
        ],
        documentType: nextActionData.documentType,
        dueDate: nextActionData.dueDate.toISOString().split('T')[0],
      } : null,
      recentActivities: recentActivities.map(activity => ({
        id: `activity-${activity.id}`,
        type: activity.type,
        description: activity.description,
        timestamp: activity.timestamp.toISOString()
      })),
    });

  } catch (dbError) {
    console.error('Database error in /api/v2/client/status:', (dbError as Error).message);
    return res.status(500).json({
      error: 'Failed to fetch compliance status',
      message: 'Please try again later'
    });
  }
});

/**
 * POST /api/v2/client/actions/complete
 *
 * Complete an action with optional document uploads
 * Secureframe-style document handling with integrity checks
 * SECURITY: Uses authenticated user ID only - validates ownership of action
 */
router.post('/actions/complete', upload.array('documents', 10), async (req: Request, res: Response) => {
  try {
    // SECURITY: Get userId ONLY from authenticated session
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { actionId } = req.body;
    if (!actionId) {
      return res.status(400).json({ error: 'actionId is required' });
    }

    const files = req.files as Express.Multer.File[];

    // Get client for authenticated user
    const clientResult = await pool.query(
      'SELECT id FROM clients WHERE user_id = $1',
      [userId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    const clientId = clientResult.rows[0].id;

    // Get action details - verify it belongs to this client
    const actionResult = await pool.query(
      'SELECT * FROM compliance_actions WHERE id = $1 AND client_id = $2',
      [actionId, clientId]
    );

    if (actionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Action not found or access denied' });
    }

    const action = actionResult.rows[0];

    // Store documents if files uploaded
    if (files && files.length > 0) {
      for (const file of files) {
        await storeDocument({
          clientId,
          actionId: action.id,
          documentType: action.document_type,
          fileName: file.originalname,
          filePath: file.path,
          fileSizeBytes: file.size,
          mimeType: file.mimetype,
          uploadedBy: userId,
        });
      }
    }

    // Update action status
    await pool.query(
      `UPDATE compliance_actions
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP, completed_by = $1
       WHERE id = $2`,
      [userId, actionId]
    );

    // Log activity (Stripe-style audit trail)
    await logActivity(
      clientId,
      'action_completed',
      `Completed: ${action.title}`,
      userId,
      { actionId, actionTitle: action.title }
    );

    // Recalculate compliance state
    await calculateComplianceState(clientId);

    return res.json({
      success: true,
      message: 'Action completed successfully',
      filesUploaded: files?.length || 0,
    });
  } catch (error) {
    console.error('Error completing action:', error);
    return res.status(500).json({
      error: 'Failed to complete action',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/v2/client/actions/history
 *
 * Get complete activity timeline (Stripe-style)
 * SECURITY: Uses authenticated user ID only
 */
router.get('/actions/history', async (req: Request, res: Response) => {
  try {
    // SECURITY: Get userId ONLY from authenticated session
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limit = parseInt(req.query.limit as string) || 50;

    // Get client for authenticated user
    const clientResult = await pool.query(
      'SELECT id FROM clients WHERE user_id = $1',
      [userId]
    );

    if (clientResult.rows.length === 0) {
      return res.json({ activities: [], count: 0 });
    }

    const clientId = clientResult.rows[0].id;

    // Get activities using service
    const activities = await getRecentActivities(clientId, limit);

    return res.json({
      activities,
      count: activities.length,
    });
  } catch (error) {
    console.error('Error getting action history:', error);
    return res.status(500).json({
      error: 'Failed to get action history',
    });
  }
});

/**
 * GET /api/v2/client/actions/pending
 *
 * Get all pending actions (Drata-style prioritization)
 * SECURITY: Uses authenticated user ID only
 */
router.get('/actions/pending', async (req: Request, res: Response) => {
  try {
    // SECURITY: Get userId ONLY from authenticated session
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const clientResult = await pool.query(
      'SELECT id FROM clients WHERE user_id = $1',
      [userId]
    );

    if (clientResult.rows.length === 0) {
      return res.json({ actions: [], count: 0 });
    }

    const clientId = clientResult.rows[0].id;

    const actionsResult = await pool.query(
      `SELECT 
        id, title, action_type, document_type, due_date, priority,
        penalty_amount, estimated_time_minutes, benefits, instructions
      FROM compliance_actions
      WHERE client_id = $1 AND status != 'completed'
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        due_date ASC`,
      [clientId]
    );

    return res.json({
      actions: actionsResult.rows.map(action => ({
        id: action.id,
        title: action.title,
        actionType: action.action_type,
        documentType: action.document_type,
        dueDate: action.due_date,
        priority: action.priority,
        penaltyAmount: action.penalty_amount,
        estimatedTimeMinutes: action.estimated_time_minutes,
        benefits: action.benefits || [],
        instructions: action.instructions || [],
      })),
      count: actionsResult.rows.length,
    });
  } catch (error) {
    console.error('Error getting pending actions:', error);
    return res.status(500).json({
      error: 'Failed to get pending actions',
    });
  }
});

/**
 * GET /api/v2/client/documents
 *
 * Get all client documents (Secureframe-style document tracking)
 * SECURITY: Uses authenticated user ID only
 */
router.get('/documents', async (req: Request, res: Response) => {
  try {
    // SECURITY: Get userId ONLY from authenticated session
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const clientResult = await pool.query(
      'SELECT id FROM clients WHERE user_id = $1',
      [userId]
    );

    if (clientResult.rows.length === 0) {
      return res.json({ documents: [], count: 0 });
    }

    const clientId = clientResult.rows[0].id;

    const documents = await getClientDocuments(clientId);

    return res.json({
      documents: documents.map(doc => ({
        id: doc.id,
        documentType: doc.document_type,
        fileName: doc.file_name,
        fileSize: doc.file_size_bytes,
        mimeType: doc.mime_type,
        verificationStatus: doc.verification_status,
        verifiedAt: doc.verified_at,
        verifiedBy: doc.verified_by,
        expiryDate: doc.expiry_date,
        uploadedBy: doc.uploaded_by,
        uploadedAt: doc.created_at,
      })),
      count: documents.length,
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    return res.status(500).json({
      error: 'Failed to get documents',
    });
  }
});

/**
 * GET /api/v2/client/deadlines
 *
 * Get upcoming deadlines with risk assessment
 * SECURITY: Uses authenticated user ID only
 */
router.get('/deadlines', async (req: Request, res: Response) => {
  try {
    // SECURITY: Get userId ONLY from authenticated session
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const daysAhead = parseInt(req.query.daysAhead as string) || 90;

    const clientResult = await pool.query(
      'SELECT id FROM clients WHERE user_id = $1',
      [userId]
    );

    if (clientResult.rows.length === 0) {
      return res.json({ deadlines: [], count: 0 });
    }

    const clientId = clientResult.rows[0].id;

    const deadlinesResult = await pool.query(
      `SELECT 
        id, title, document_type, due_date, priority, penalty_amount
      FROM compliance_actions
      WHERE 
        client_id = $1 
        AND status != 'completed'
        AND due_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
      ORDER BY due_date ASC`,
      [clientId]
    );

    return res.json({
      deadlines: deadlinesResult.rows.map(deadline => {
        const daysUntil = Math.ceil(
          (new Date(deadline.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        return {
          id: deadline.id,
          title: deadline.title,
          documentType: deadline.document_type,
          dueDate: deadline.due_date,
          daysUntil,
          priority: deadline.priority,
          penaltyAmount: deadline.penalty_amount,
          riskLevel: daysUntil <= 7 ? 'high' : daysUntil <= 30 ? 'medium' : 'low',
        };
      }),
      count: deadlinesResult.rows.length,
    });
  } catch (error) {
    console.error('Error getting deadlines:', error);
    return res.status(500).json({
      error: 'Failed to get deadlines',
    });
  }
});

/**
 * GET /api/v2/client/services
 *
 * Get all 96 services from catalog with client subscription status
 * Vanta-style service marketplace
 * SECURITY: Uses authenticated user ID only
 */
router.get('/services', async (req: Request, res: Response) => {
  try {
    // SECURITY: Get userId ONLY from authenticated session
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get client for authenticated user
    const client = await ClientService.getClientByUserId(userId);

    if (!client) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    // Get all services from catalog
    const allServices = await ServiceCatalogService.getAllServices();
    
    // Get client's subscribed services
    const clientServices = await ServiceCatalogService.getClientServices(client.id);
    
    // Get service stats
    const stats = await ServiceCatalogService.getServiceStats(client.id);
    
    // Merge subscription status into service list
    const servicesWithStatus = allServices.map(service => {
      const subscription = clientServices.find(cs => cs.serviceKey === service.serviceKey);
      return {
        ...service,
        subscribed: !!subscription,
        isActive: subscription?.isActive || false,
        subscribedAt: subscription?.createdAt || null
      };
    });

    return res.json({
      services: servicesWithStatus,
      stats,
      subscribed: clientServices.length,
      available: allServices.length
    });
  } catch (error) {
    console.error('Error getting services:', error);
    return res.status(500).json({ error: 'Failed to get services' });
  }
});

/**
 * GET /api/v2/client/services/by-category/:category
 * 
 * Get services filtered by category
 */
router.get('/services/by-category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const services = await ServiceCatalogService.getServicesByCategory(category);
    
    return res.json({
      category,
      services,
      count: services.length
    });
  } catch (error) {
    console.error('Error getting services by category:', error);
    return res.status(500).json({ error: 'Failed to get services' });
  }
});

/**
 * POST /api/v2/client/services/subscribe
 *
 * Subscribe client to a new service
 * Generates initial compliance actions automatically
 * SECURITY: Uses authenticated user ID only
 */
router.post('/services/subscribe', async (req: Request, res: Response) => {
  try {
    // SECURITY: Get userId ONLY from authenticated session
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { serviceKey } = req.body;

    if (!serviceKey) {
      return res.status(400).json({ error: 'serviceKey is required' });
    }

    // Get client for authenticated user
    const client = await ClientService.getClientByUserId(userId);

    if (!client) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    // Subscribe to service
    const entityServiceId = await ServiceCatalogService.subscribeClientToService(
      client.id,
      serviceKey
    );

    return res.json({
      success: true,
      entityServiceId,
      message: `Successfully subscribed to ${serviceKey}`
    });
  } catch (error) {
    console.error('Error subscribing to service:', error);
    return res.status(500).json({ 
      error: 'Failed to subscribe to service',
      details: (error as Error).message
    });
  }
});

/**
 * GET /api/v2/client/services/compliance-summary
 *
 * Get compliance status grouped by subscribed services
 * Shows which services are healthy and which need attention
 * SECURITY: Uses authenticated user ID only
 */
router.get('/services/compliance-summary', async (req: Request, res: Response) => {
  try {
    // SECURITY: Get userId ONLY from authenticated session
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get client for authenticated user
    const client = await ClientService.getClientByUserId(userId);

    if (!client) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    const summary = await ServiceCatalogService.getServiceComplianceSummary(client.id);
    
    return res.json({
      summary,
      totalServices: summary.length,
      servicesNeedingAttention: summary.filter((s: any) => s.pending_actions > 0).length
    });
  } catch (error) {
    console.error('Error getting service compliance summary:', error);
    return res.status(500).json({ error: 'Failed to get compliance summary' });
  }
});

export default router;
