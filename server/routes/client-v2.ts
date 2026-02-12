import { Router } from 'express';
import { db } from '../db';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { and, desc, eq } from 'drizzle-orm';
import { activityLogs, complianceRules, complianceTracking, documentsUploads } from '@shared/schema';

// Import new V2 services (Vanta/Drata pattern)
import * as ClientService from '../services/v2/client-service';
import * as ComplianceService from '../services/v2/compliance-service';

const router = Router();

// Configure multer for file uploads
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
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
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
 * Single aggregated endpoint for entire portal state
 * NOW USING REAL DATABASE WITH VANTA/DRATA PATTERNS
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      // Use new service layer to get client
      const client = await ClientService.getClientByUserId(userId);

      if (!client) {
        // SECURITY: Return proper error instead of fake data
        // User should see onboarding flow or error, not misleading mock data
        return res.status(404).json({
          error: 'Client profile not found',
          message: 'Please complete your client registration to access the dashboard.',
          code: 'CLIENT_NOT_FOUND'
        });
      }

      // ✅ REAL DATA FROM DATABASE (Vanta/Drata pattern)
      const clientId = client.id;
      
      // Get compliance state using new service
      const complianceState = await ComplianceService.getComplianceState(clientId);
      
      // Get next prioritized action
      const nextAction = await ComplianceService.getNextPrioritizedAction(clientId);
      
      // Get recent activities
      const activities = await ComplianceService.getRecentActivities(clientId, 5);

      // Format next deadline
      let nextDeadline: string | undefined;
      if (complianceState?.nextCriticalDeadline) {
        const deadline = new Date(complianceState.nextCriticalDeadline);
        nextDeadline = deadline.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      } else if (nextAction?.dueDate) {
        const deadline = new Date(nextAction.dueDate);
        nextDeadline = deadline.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }

      // Format next action for frontend
      const formattedNextAction = nextAction ? {
        id: `action-${nextAction.id}`,
        title: nextAction.title,
        timeEstimate: `${nextAction.estimatedMinutes || 5} minutes`,
        whyMatters: {
          benefits: nextAction.benefits || [
            nextAction.description,
            nextAction.penaltyAmount ? `Avoid ₹${nextAction.penaltyAmount.toLocaleString('en-IN')} penalty` : 'Maintain compliance',
            'Keep your business running smoothly',
            'Stay compliant with regulations'
          ],
          socialProof: 'Thousands of businesses stay compliant with this action'
        },
        actionType: nextAction.actionType,
        instructions: nextAction.instructions || [
          'Review the requirements',
          'Gather necessary documents',
          'Complete the action below',
          'Submit for verification'
        ],
        documentType: nextAction.documentType,
        dueDate: nextAction.dueDate.toISOString().split('T')[0]
      } : null;

      // Format activities for frontend
      const formattedActivities = activities.map((activity, idx) => ({
        id: `activity-${activity.id}`,
        type: activity.type,
        description: activity.description,
        timestamp: activity.timestamp.toISOString()
      }));

      // Get upcoming deadlines from database
      const upcomingDeadlines = await ComplianceService.getUpcomingDeadlines(clientId, 5);

      // Get quick stats from database
      const quickStats = await ComplianceService.getQuickStats(clientId);

      // Return real database data
      return res.json({
        complianceState: complianceState?.overallState || 'GREEN',
        daysSafe: complianceState?.daysUntilCritical || 30,
        nextDeadline,
        penaltyExposure: complianceState?.totalPenaltyExposure || 0,
        nextAction: formattedNextAction,
        recentActivities: formattedActivities,
        upcomingDeadlines: upcomingDeadlines || [],
        quickStats: quickStats || { tasksCompleted: 0, pendingActions: 0, daysSafe: 0 }
      });

    } catch (dbError: any) {
      console.error('Database error:', dbError);
      // SECURITY: Return proper error response instead of fake data
      // Users should see service unavailable, not misleading mock data
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Unable to fetch compliance data. Please try again later.',
        code: 'DATABASE_ERROR'
      });
    }
  } catch (error: any) {
    console.error('Error in /api/v2/client/status:', error);
    res.status(500).json({
      error: 'Failed to fetch status',
      message: error.message,
    });
  }
});

/**
 * POST /api/v2/client/actions/complete
 * Complete an action (upload, review, confirm, pay)
 */
router.post('/actions/complete', upload.array('files', 10), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { actionId } = req.body;

    if (!actionId) {
      return res.status(400).json({ error: 'Action ID is required' });
    }

    const trackingId = parseTrackingId(String(actionId));
    if (!trackingId) {
      return res.status(400).json({ error: 'Invalid action ID' });
    }

    const client = await ClientService.getClientByUserId(String(userId));
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
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
      return res.status(404).json({ error: 'Compliance action not found' });
    }

    // Process uploaded files
    const uploadedFiles = req.files as Express.Multer.File[];
    if (uploadedFiles && uploadedFiles.length > 0) {
      const docType = String(
        trackingItem.formNumber ||
        trackingItem.ruleCode ||
        trackingItem.serviceType ||
        trackingItem.serviceId ||
        'compliance_document'
      );

      await db.insert(documentsUploads).values(
        uploadedFiles.map(file => ({
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
      action: uploadedFiles && uploadedFiles.length > 0 ? 'document_upload' : 'action_submitted',
      entityType: 'compliance_tracking',
      entityId: trackingId,
      details: `Client submitted ${trackingItem.complianceName || trackingItem.serviceType || 'compliance action'} for review`,
      metadata: {
        complianceRuleId: trackingItem.complianceRuleId,
        filesUploaded: uploadedFiles?.length || 0,
      },
      createdAt: new Date(),
    });

    res.json({
      success: true,
      status: 'in_progress',
      message: 'Submission received and sent for review.',
      trackingId,
    });
  } catch (error: any) {
    console.error('Error in /api/v2/client/actions/complete:', error);
    res.status(500).json({
      error: 'Failed to complete action',
      message: error.message,
    });
  }
});

/**
 * GET /api/v2/client/actions/history
 * Get action completion history (optional, for future use)
 */
router.get('/actions/history', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await ClientService.getClientByUserId(String(userId));
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const history = await db
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
      .limit(50);

    res.json({
      history: history.map(row => ({
        id: row.id,
        title: row.details || row.action,
        eventType: row.action,
        completedAt: row.createdAt,
        metadata: row.metadata,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching action history:', error);
    res.status(500).json({
      error: 'Failed to fetch history',
      message: error.message,
    });
  }
});

export default router;
