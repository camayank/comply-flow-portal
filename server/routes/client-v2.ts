import { Router } from 'express';
import { getNextPrioritizedAction, getRecentActivities, completeAction } from '../services/next-action-recommender';
import { pool } from '../db';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

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

/**
 * GET /api/v2/client/status
 * Single aggregated endpoint for entire portal state
 * NOW USING REAL DATABASE WITH VANTA/DRATA PATTERNS
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?.id || 'dev-user-123';
    
    // 🔓 DEV MODE: Return mock data if no client exists (fallback only)
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

    const { actionId, confirmationData, paymentReference } = req.body;

    if (!actionId) {
      return res.status(400).json({ error: 'Action ID is required' });
    }

    // Get client entity ID
    const clientResult = await pool.query(
      'SELECT id FROM clients WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const clientId = clientResult.rows[0].id;

    // Process uploaded files
    const uploadedFiles = req.files as Express.Multer.File[];
    const filePaths = uploadedFiles?.map(file => file.path) || [];

    // Complete the action
    const result = await completeAction(actionId, clientId, {
      files: filePaths,
      confirmationData: confirmationData ? JSON.parse(confirmationData) : null,
      paymentReference,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
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

    const clientResult = await pool.query(
      'SELECT id FROM clients WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const clientId = clientResult.rows[0].id;

    const history = await pool.query(
      `SELECT 
        csh.id,
        csh.rule_code,
        cr.friendly_label,
        csh.event_type,
        csh.description,
        csh.created_at,
        csh.metadata
      FROM compliance_state_history csh
      LEFT JOIN compliance_rules cr ON cr.rule_code = csh.rule_code
      WHERE csh.entity_id = $1
        AND csh.event_type IN ('ACTION_COMPLETED', 'FILING_COMPLETED', 'DOCUMENT_UPLOADED')
      ORDER BY csh.created_at DESC
      LIMIT 50`,
      [clientId]
    );

    res.json({
      history: history.rows.map(row => ({
        id: row.id,
        ruleCode: row.rule_code,
        title: row.friendly_label || row.description,
        eventType: row.event_type,
        completedAt: row.created_at,
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
