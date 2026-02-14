import { Router } from 'express';
import { db } from '../db';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { and, desc, eq, or } from 'drizzle-orm';
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
      const client = await ClientService.getClientByUserId(String(userId));

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

/**
 * GET /api/v2/client/proactive-alerts
 * Smart alerts system with prioritized, actionable notifications
 */
router.get('/proactive-alerts', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await ClientService.getClientByUserId(String(userId));
    if (!client) {
      return res.status(404).json({
        error: 'Client profile not found',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    const clientId = client.id;
    const today = new Date();
    const alerts: Array<{
      id: string;
      type: 'urgent' | 'warning' | 'info' | 'success';
      category: 'deadline' | 'document' | 'payment' | 'compliance' | 'system';
      title: string;
      message: string;
      actionLabel?: string;
      actionUrl?: string;
      dueDate?: string;
      penalty?: number;
      priority: number;
      createdAt: string;
      isRead: boolean;
      metadata?: any;
    }> = [];

    // Get all pending/overdue compliance items
    const trackingItems = await db
      .select({
        id: complianceTracking.id,
        status: complianceTracking.status,
        dueDate: complianceTracking.dueDate,
        priority: complianceTracking.priority,
        estimatedPenalty: complianceTracking.estimatedPenalty,
        complianceType: complianceTracking.complianceType,
        serviceType: complianceTracking.serviceType,
        complianceName: complianceRules.complianceName,
        formNumber: complianceRules.formNumber,
      })
      .from(complianceTracking)
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
      .where(
        and(
          eq(complianceTracking.businessEntityId, clientId),
          or(
            eq(complianceTracking.status, 'pending'),
            eq(complianceTracking.status, 'overdue'),
            eq(complianceTracking.status, 'in_progress')
          )
        )
      );

    // Get pending documents
    const pendingDocs = await db
      .select({
        id: documentsUploads.id,
        status: documentsUploads.status,
        doctype: documentsUploads.doctype,
        filename: documentsUploads.filename,
        createdAt: documentsUploads.createdAt,
      })
      .from(documentsUploads)
      .where(
        and(
          eq(documentsUploads.entityId, clientId),
          or(
            eq(documentsUploads.status, 'pending'),
            eq(documentsUploads.status, 'pending_review'),
            eq(documentsUploads.status, 'rejected')
          )
        )
      );

    // Process compliance items into alerts
    for (const item of trackingItems) {
      const title = item.complianceName || item.serviceType || item.complianceType || 'Compliance Item';
      const dueDate = item.dueDate ? new Date(item.dueDate) : null;

      if (dueDate) {
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Overdue - URGENT
        if (daysUntil < 0) {
          alerts.push({
            id: `overdue-${item.id}`,
            type: 'urgent',
            category: 'deadline',
            title: `Overdue: ${title}`,
            message: `This compliance item is ${Math.abs(daysUntil)} days overdue. Immediate action required to avoid penalties.`,
            actionLabel: 'Complete Now',
            actionUrl: `/compliance-calendar?action=${item.id}`,
            dueDate: dueDate.toISOString(),
            penalty: item.estimatedPenalty || 0,
            priority: 100 + Math.abs(daysUntil),
            createdAt: today.toISOString(),
            isRead: false,
            metadata: { trackingId: item.id, daysOverdue: Math.abs(daysUntil) }
          });
        }
        // Due within 3 days - WARNING
        else if (daysUntil <= 3) {
          alerts.push({
            id: `urgent-${item.id}`,
            type: 'warning',
            category: 'deadline',
            title: `Due Soon: ${title}`,
            message: daysUntil === 0
              ? 'Due today! Complete this before end of day.'
              : `Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}. Take action now to stay compliant.`,
            actionLabel: 'Take Action',
            actionUrl: `/compliance-calendar?action=${item.id}`,
            dueDate: dueDate.toISOString(),
            penalty: item.estimatedPenalty || 0,
            priority: 80 - daysUntil,
            createdAt: today.toISOString(),
            isRead: false,
            metadata: { trackingId: item.id, daysUntil }
          });
        }
        // Due within 7 days - INFO
        else if (daysUntil <= 7) {
          alerts.push({
            id: `upcoming-${item.id}`,
            type: 'info',
            category: 'deadline',
            title: `Upcoming: ${title}`,
            message: `Due in ${daysUntil} days. Plan ahead to complete on time.`,
            actionLabel: 'View Details',
            actionUrl: `/compliance-calendar?action=${item.id}`,
            dueDate: dueDate.toISOString(),
            priority: 50 - daysUntil,
            createdAt: today.toISOString(),
            isRead: false,
            metadata: { trackingId: item.id, daysUntil }
          });
        }
      }
    }

    // Process document alerts
    for (const doc of pendingDocs) {
      if (doc.status === 'rejected') {
        alerts.push({
          id: `doc-rejected-${doc.id}`,
          type: 'warning',
          category: 'document',
          title: 'Document Rejected',
          message: `Your ${doc.doctype || 'document'} "${doc.filename}" was rejected. Please re-upload with corrections.`,
          actionLabel: 'Re-upload',
          actionUrl: '/vault',
          priority: 70,
          createdAt: doc.createdAt?.toISOString() || today.toISOString(),
          isRead: false,
          metadata: { documentId: doc.id, filename: doc.filename }
        });
      } else if (doc.status === 'pending_review') {
        alerts.push({
          id: `doc-review-${doc.id}`,
          type: 'info',
          category: 'document',
          title: 'Document Under Review',
          message: `Your ${doc.doctype || 'document'} is being reviewed. You'll be notified once approved.`,
          priority: 20,
          createdAt: doc.createdAt?.toISOString() || today.toISOString(),
          isRead: false,
          metadata: { documentId: doc.id, filename: doc.filename }
        });
      }
    }

    // Sort by priority (highest first)
    alerts.sort((a, b) => b.priority - a.priority);

    // Calculate summary stats
    const urgentCount = alerts.filter(a => a.type === 'urgent').length;
    const warningCount = alerts.filter(a => a.type === 'warning').length;
    const totalPenaltyRisk = alerts.reduce((sum, a) => sum + (a.penalty || 0), 0);

    return res.json({
      alerts: alerts.slice(0, 20), // Return top 20 alerts
      summary: {
        total: alerts.length,
        urgent: urgentCount,
        warning: warningCount,
        info: alerts.length - urgentCount - warningCount,
        totalPenaltyRisk
      },
      lastUpdated: today.toISOString()
    });

  } catch (error: any) {
    console.error('Error in /api/v2/client/proactive-alerts:', error);
    res.status(500).json({
      error: 'Failed to fetch alerts',
      message: error.message,
    });
  }
});

/**
 * GET /api/v2/client/executive-summary
 * Premium investor-ready compliance summary
 * Returns comprehensive overview for founders to share with investors
 */
router.get('/executive-summary', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const client = await ClientService.getClientByUserId(String(userId));
    if (!client) {
      return res.status(404).json({
        error: 'Client profile not found',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    const clientId = client.id;

    // Get compliance state
    const complianceState = await ComplianceService.getComplianceState(clientId);

    // Get all tracking items for domain breakdown
    const trackingItems = await db
      .select({
        id: complianceTracking.id,
        status: complianceTracking.status,
        dueDate: complianceTracking.dueDate,
        complianceType: complianceTracking.complianceType,
        serviceType: complianceTracking.serviceType,
        lastCompleted: complianceTracking.lastCompleted,
        priority: complianceTracking.priority,
        estimatedPenalty: complianceTracking.estimatedPenalty,
        ruleCode: complianceRules.ruleCode,
        complianceName: complianceRules.complianceName,
        regulationCategory: complianceRules.regulationCategory,
      })
      .from(complianceTracking)
      .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
      .where(eq(complianceTracking.businessEntityId, clientId));

    // Get documents for document health
    const documents = await db
      .select({
        id: documentsUploads.id,
        status: documentsUploads.status,
        doctype: documentsUploads.doctype,
        createdAt: documentsUploads.createdAt,
      })
      .from(documentsUploads)
      .where(eq(documentsUploads.entityId, clientId));

    // Calculate Health Score (0-100)
    const total = trackingItems.length || 1;
    const completed = trackingItems.filter(i => i.status === 'completed').length;
    const overdue = trackingItems.filter(i => {
      if (i.status === 'completed') return false;
      if (!i.dueDate) return false;
      return new Date(i.dueDate) < new Date();
    }).length;

    const baseScore = Math.round((completed / total) * 100);
    const overdueDeduction = Math.min(overdue * 5, 30); // Max 30 point deduction for overdue
    const healthScore = Math.max(0, baseScore - overdueDeduction);

    // Determine health grade
    const healthGrade = healthScore >= 90 ? 'A' :
                        healthScore >= 75 ? 'B' :
                        healthScore >= 60 ? 'C' :
                        healthScore >= 40 ? 'D' : 'F';

    // Domain-wise breakdown
    const domainCategories = {
      'GST': ['gst', 'goods and services tax', 'gstr'],
      'Income Tax': ['income tax', 'itr', 'tds', 'advance tax'],
      'ROC': ['roc', 'mca', 'annual return', 'aoc', 'adt', 'dir'],
      'Labor': ['pf', 'esic', 'labour', 'labor', 'professional tax', 'pt'],
      'Other': []
    };

    const domainBreakdown: Record<string, { total: number; completed: number; pending: number; overdue: number }> = {};

    for (const domain of Object.keys(domainCategories)) {
      domainBreakdown[domain] = { total: 0, completed: 0, pending: 0, overdue: 0 };
    }

    for (const item of trackingItems) {
      const itemText = `${item.regulationCategory || ''} ${item.complianceType || ''} ${item.serviceType || ''} ${item.ruleCode || ''}`.toLowerCase();
      let matched = false;

      for (const [domain, keywords] of Object.entries(domainCategories)) {
        if (domain === 'Other') continue;
        if (keywords.some(kw => itemText.includes(kw))) {
          domainBreakdown[domain].total++;
          if (item.status === 'completed') {
            domainBreakdown[domain].completed++;
          } else if (item.dueDate && new Date(item.dueDate) < new Date()) {
            domainBreakdown[domain].overdue++;
          } else {
            domainBreakdown[domain].pending++;
          }
          matched = true;
          break;
        }
      }

      if (!matched) {
        domainBreakdown['Other'].total++;
        if (item.status === 'completed') {
          domainBreakdown['Other'].completed++;
        } else if (item.dueDate && new Date(item.dueDate) < new Date()) {
          domainBreakdown['Other'].overdue++;
        } else {
          domainBreakdown['Other'].pending++;
        }
      }
    }

    // Format domain breakdown for frontend
    const domains = Object.entries(domainBreakdown)
      .filter(([_, data]) => data.total > 0)
      .map(([name, data]) => ({
        name,
        score: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 100,
        total: data.total,
        completed: data.completed,
        pending: data.pending,
        overdue: data.overdue,
        status: data.overdue > 0 ? 'critical' : data.pending > 0 ? 'attention' : 'compliant'
      }));

    // Attention required items (overdue + high priority pending)
    const attentionItems = trackingItems
      .filter(item => {
        if (item.status === 'completed') return false;
        const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
        const isHighPriority = item.priority === 'critical' || item.priority === 'high';
        return isOverdue || isHighPriority;
      })
      .slice(0, 5)
      .map(item => ({
        id: item.id,
        title: item.complianceName || item.serviceType || item.complianceType || 'Compliance Item',
        dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : null,
        priority: item.priority || 'medium',
        penalty: item.estimatedPenalty || 0,
        isOverdue: item.dueDate ? new Date(item.dueDate) < new Date() : false
      }));

    // Recent completions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCompletions = trackingItems
      .filter(item => {
        if (item.status !== 'completed') return false;
        if (!item.lastCompleted) return false;
        return new Date(item.lastCompleted) >= thirtyDaysAgo;
      })
      .slice(0, 5)
      .map(item => ({
        id: item.id,
        title: item.complianceName || item.serviceType || item.complianceType || 'Compliance Item',
        completedDate: item.lastCompleted ? new Date(item.lastCompleted).toISOString().split('T')[0] : null,
        category: item.regulationCategory || 'General'
      }));

    // Document health
    const docTotal = documents.length || 1;
    const docApproved = documents.filter(d => d.status === 'approved' || d.status === 'verified').length;
    const docPending = documents.filter(d => d.status === 'pending' || d.status === 'pending_review').length;
    const docRejected = documents.filter(d => d.status === 'rejected').length;

    const documentHealth = {
      score: Math.round((docApproved / docTotal) * 100),
      total: documents.length,
      verified: docApproved,
      pending: docPending,
      rejected: docRejected,
      status: docRejected > 0 ? 'attention' : docPending > 3 ? 'review_needed' : 'healthy'
    };

    // Company info from client
    const companyInfo = {
      name: client.businessName || 'Your Company',
      cin: null, // CIN would need to be added to Client interface
      gstin: client.gstin || null,
      pan: client.pan || null,
      incorporationDate: client.incorporationDate || null,
      registeredAddress: client.address ? `${client.address}${client.city ? ', ' + client.city : ''}${client.state ? ', ' + client.state : ''}` : null
    };

    // Generate summary text for investor
    const summaryText = healthScore >= 90
      ? 'Excellent compliance posture. All regulatory obligations are being met on time.'
      : healthScore >= 75
        ? 'Good compliance standing with minor items requiring attention.'
        : healthScore >= 60
          ? 'Moderate compliance status. Some areas need immediate attention.'
          : 'Compliance improvement needed. Multiple items require urgent action.';

    return res.json({
      generatedAt: new Date().toISOString(),
      healthScore,
      healthGrade,
      summaryText,
      companyInfo,
      overallStatus: complianceState?.overallState || 'GREEN',
      totalPenaltyExposure: complianceState?.totalPenaltyExposure || 0,
      domains,
      attentionItems,
      recentCompletions,
      documentHealth,
      statistics: {
        totalCompliances: total,
        completed,
        pending: total - completed - overdue,
        overdue,
        upcomingThisMonth: trackingItems.filter(i => {
          if (i.status === 'completed') return false;
          if (!i.dueDate) return false;
          const due = new Date(i.dueDate);
          const now = new Date();
          return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear() && due >= now;
        }).length
      }
    });

  } catch (error: any) {
    console.error('Error in /api/v2/client/executive-summary:', error);
    res.status(500).json({
      error: 'Failed to generate executive summary',
      message: error.message,
    });
  }
});

export default router;
