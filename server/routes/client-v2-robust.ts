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

import { Router, Request, Response } from 'express';
import { db } from '../db';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { and, desc, eq, inArray, or, count } from 'drizzle-orm';
import {
  activityLogs,
  complianceRequiredDocuments,
  complianceRules,
  complianceTracking,
  documentsUploads,
  documentVault
} from '@shared/schema';

// Use NEW V2 service layer with proper database architecture
import * as ClientService from '../services/v2/client-service';
import * as ComplianceService from '../services/v2/compliance-service';
import * as ServiceCatalogService from '../services/v2/service-catalog-service';

import {
  sessionAuthMiddleware,
  requireRole,
  USER_ROLES,
  type AuthenticatedRequest
} from '../rbac-middleware';
import { ensureRequiredDocumentsForRuleIds } from '../compliance-evidence';

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

const parseTrackingId = (rawId: string) => {
  if (!rawId) return null;
  const match = rawId.match(/(\d+)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

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
router.post('/actions/complete', upload.array('files', 10), async (req: Request, res: Response) => {
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
    const trackingId = parseTrackingId(String(actionId));
    if (!trackingId) {
      return res.status(400).json({ error: 'Invalid action ID' });
    }

    const client = await ClientService.getClientByUserId(userId);
    if (!client) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    const [trackingItem] = await db
      .select({
        id: complianceTracking.id,
        businessEntityId: complianceTracking.businessEntityId,
        complianceRuleId: complianceTracking.complianceRuleId,
        serviceType: complianceTracking.serviceType,
        serviceId: complianceTracking.serviceId,
        ruleCode: complianceRules.ruleCode,
        formNumber: complianceRules.formNumber,
        complianceName: complianceRules.complianceName,
      })
      .from(complianceTracking)
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
      .where(
        and(
          eq(complianceTracking.id, trackingId),
          eq(complianceTracking.businessEntityId, client.id)
        )
      )
      .limit(1);

    if (!trackingItem) {
      return res.status(404).json({ error: 'Action not found or access denied' });
    }

    // Store documents if files uploaded
    if (files && files.length > 0) {
      const docType = String(
        trackingItem.formNumber ||
        trackingItem.ruleCode ||
        trackingItem.serviceType ||
        trackingItem.serviceId ||
        'compliance_document'
      );

      await db.insert(documentsUploads).values(
        files.map(file => ({
          entityId: client.id,
          doctype: docType,
          filename: file.originalname,
          path: file.path,
          sizeBytes: file.size,
          mimeType: file.mimetype,
          uploader: 'client',
          status: 'pending_review',
        }))
      );
    }

    await db
      .update(complianceTracking)
      .set({
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(complianceTracking.id, trackingId));

    const parsedUserId = Number(userId);
    await db.insert(activityLogs).values({
      userId: Number.isFinite(parsedUserId) ? parsedUserId : null,
      businessEntityId: client.id,
      action: files && files.length > 0 ? 'document_upload' : 'action_submitted',
      entityType: 'compliance_tracking',
      entityId: trackingId,
      details: `Client submitted ${trackingItem.complianceName || trackingItem.serviceType || 'compliance action'} for review`,
      metadata: {
        complianceRuleId: trackingItem.complianceRuleId,
        filesUploaded: files?.length || 0,
      },
      createdAt: new Date(),
    });

    return res.json({
      success: true,
      status: 'in_progress',
      message: 'Submission received and sent for review.',
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
    const client = await ClientService.getClientByUserId(userId);
    if (!client) {
      return res.json({ activities: [], count: 0 });
    }

    const activities = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        details: activityLogs.details,
        createdAt: activityLogs.createdAt,
        metadata: activityLogs.metadata,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.businessEntityId, client.id),
          eq(activityLogs.entityType, 'compliance_tracking')
        )
      )
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);

    return res.json({
      activities: activities.map(item => ({
        id: item.id,
        type: item.action,
        description: item.details || item.action,
        timestamp: item.createdAt?.toISOString(),
        metadata: item.metadata,
      })),
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

    const client = await ClientService.getClientByUserId(userId);
    if (!client) {
      return res.json({ actions: [], count: 0 });
    }

    const actions = await db
      .select({
        id: complianceTracking.id,
        dueDate: complianceTracking.dueDate,
        status: complianceTracking.status,
        priority: complianceTracking.priority,
        estimatedPenalty: complianceTracking.estimatedPenalty,
        complianceType: complianceTracking.complianceType,
        serviceType: complianceTracking.serviceType,
        complianceRuleId: complianceTracking.complianceRuleId,
        ruleCode: complianceRules.ruleCode,
        complianceName: complianceRules.complianceName,
        description: complianceRules.description,
        formNumber: complianceRules.formNumber,
      })
      .from(complianceTracking)
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
      .where(
        and(
          eq(complianceTracking.businessEntityId, client.id),
          or(
            eq(complianceTracking.status, 'pending'),
            eq(complianceTracking.status, 'overdue'),
            eq(complianceTracking.status, 'in_progress')
          )
        )
      )
      .orderBy(desc(complianceTracking.dueDate));

    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    actions.sort((a, b) => {
      const pa = priorityOrder[(a.priority || 'medium').toLowerCase()] ?? 2;
      const pb = priorityOrder[(b.priority || 'medium').toLowerCase()] ?? 2;
      if (pa !== pb) return pa - pb;
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });

    const ruleIds = actions
      .map(action => action.complianceRuleId)
      .filter((id): id is number => typeof id === 'number');

    if (ruleIds.length > 0) {
      await ensureRequiredDocumentsForRuleIds(ruleIds);
    }

    const docCounts = ruleIds.length > 0
      ? await db
          .select({
            complianceRuleId: complianceRequiredDocuments.complianceRuleId,
            count: count(),
          })
          .from(complianceRequiredDocuments)
          .where(inArray(complianceRequiredDocuments.complianceRuleId, ruleIds))
          .groupBy(complianceRequiredDocuments.complianceRuleId)
      : [];

    const docCountMap = new Map<number, number>(
      docCounts.map(row => [row.complianceRuleId, Number(row.count || 0)])
    );

    const estimateMinutes = (priority?: string | null) => {
      const normalized = (priority || '').toLowerCase();
      if (normalized === 'critical' || normalized === 'high') return 45;
      if (normalized === 'low') return 15;
      return 25;
    };

    return res.json({
      actions: actions.map(action => {
        const requiresDocuments = action.complianceRuleId
          ? (docCountMap.get(action.complianceRuleId) || 0) > 0
          : false;

        return {
          id: action.id,
          title: action.complianceName || action.serviceType || action.complianceType || 'Compliance Action',
          actionType: requiresDocuments ? 'upload' : 'review',
          documentType: action.formNumber || action.complianceType || undefined,
          dueDate: action.dueDate,
          priority: action.priority || 'medium',
          penaltyAmount: action.estimatedPenalty || 0,
          estimatedTimeMinutes: estimateMinutes(action.priority),
          benefits: action.description ? [action.description] : [],
          instructions: action.description ? [action.description] : [],
        };
      }),
      count: actions.length,
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

    const client = await ClientService.getClientByUserId(userId);
    if (!client) {
      return res.json({ documents: [], count: 0 });
    }

    const vaultDocs = await db
      .select({
        id: documentVault.id,
        documentType: documentVault.documentType,
        fileName: documentVault.fileName,
        fileSize: documentVault.fileSize,
        mimeType: documentVault.mimeType,
        approvalStatus: documentVault.approvalStatus,
        approvedAt: documentVault.approvedAt,
        approvedBy: documentVault.approvedBy,
        rejectionReason: documentVault.rejectionReason,
        expiryDate: documentVault.expiryDate,
        uploadedBy: documentVault.userId,
        uploadedAt: documentVault.createdAt,
      })
      .from(documentVault)
      .where(eq(documentVault.businessEntityId, client.id));

    const uploadDocs = await db
      .select({
        id: documentsUploads.id,
        documentType: documentsUploads.doctype,
        fileName: documentsUploads.filename,
        fileSize: documentsUploads.sizeBytes,
        mimeType: documentsUploads.mimeType,
        status: documentsUploads.status,
        reviewedAt: documentsUploads.reviewedAt,
        reviewedBy: documentsUploads.reviewedBy,
        rejectionReason: documentsUploads.rejectionReason,
        uploadedBy: documentsUploads.uploader,
        uploadedAt: documentsUploads.uploadedAt,
      })
      .from(documentsUploads)
      .where(eq(documentsUploads.entityId, client.id));

    const documents = [
      ...vaultDocs.map(doc => ({
        id: doc.id,
        source: 'vault',
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        verificationStatus: doc.approvalStatus,
        verifiedAt: doc.approvedAt,
        verifiedBy: doc.approvedBy,
        rejectionReason: doc.rejectionReason,
        expiryDate: doc.expiryDate,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.uploadedAt,
      })),
      ...uploadDocs.map(doc => ({
        id: doc.id,
        source: 'upload',
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        verificationStatus: doc.status,
        verifiedAt: doc.reviewedAt,
        verifiedBy: doc.reviewedBy,
        rejectionReason: doc.rejectionReason,
        expiryDate: null,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.uploadedAt,
      })),
    ].sort((a, b) => {
      const at = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const bt = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return bt - at;
    });

    return res.json({
      documents,
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

    const client = await ClientService.getClientByUserId(userId);
    if (!client) {
      return res.json({ deadlines: [], count: 0 });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const deadlines = await db
      .select({
        id: complianceTracking.id,
        dueDate: complianceTracking.dueDate,
        priority: complianceTracking.priority,
        estimatedPenalty: complianceTracking.estimatedPenalty,
        complianceType: complianceTracking.complianceType,
        serviceType: complianceTracking.serviceType,
        ruleCode: complianceRules.ruleCode,
        complianceName: complianceRules.complianceName,
        formNumber: complianceRules.formNumber,
      })
      .from(complianceTracking)
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
      .where(
        and(
          eq(complianceTracking.businessEntityId, client.id),
          or(
            eq(complianceTracking.status, 'pending'),
            eq(complianceTracking.status, 'overdue'),
            eq(complianceTracking.status, 'in_progress')
          )
        )
      );

    const filteredDeadlines = deadlines
      .filter(item => item.dueDate && new Date(item.dueDate) <= cutoffDate)
      .map(item => {
        const dueDate = item.dueDate ? new Date(item.dueDate) : null;
        const daysUntil = dueDate
          ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          id: item.id,
          title: item.complianceName || item.serviceType || item.complianceType || 'Compliance',
          documentType: item.formNumber || item.complianceType || undefined,
          dueDate,
          daysUntil,
          priority: item.priority || 'medium',
          penaltyAmount: item.estimatedPenalty || 0,
          riskLevel: daysUntil <= 7 ? 'high' : daysUntil <= 30 ? 'medium' : 'low',
        };
      });

    return res.json({
      deadlines: filteredDeadlines,
      count: filteredDeadlines.length,
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
