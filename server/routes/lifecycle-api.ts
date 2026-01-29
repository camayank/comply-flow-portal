/**
 * Client Portal V2 - Comprehensive Lifecycle API
 * 
 * High-level dashboard with drill-down capabilities
 * Following US compliance leaders: Vanta, Secureframe, Drata
 * 
 * Architecture:
 * - Top level: Executive summary (compliance health, lifecycle stage)
 * - Mid level: Category breakdowns (services, documents, checkpoints)
 * - Detail level: Individual items with full context
 * 
 * Robustness Features:
 * - Input validation with Zod schemas
 * - Performance monitoring
 * - Error handling with proper status codes
 * - Request logging
 */

import { Router } from 'express';
import * as ClientService from '../services/v2/client-service';
import * as ComplianceService from '../services/v2/compliance-service';
import * as ServiceCatalogService from '../services/v2/service-catalog-service';
import * as DocumentService from '../services/v2/document-management-service';
import * as LifecycleService from '../services/v2/business-lifecycle-service';
import { 
  validateRequest, 
  performanceMonitor, 
  withTimeout,
  NotFoundError,
  AppError,
  lifecycleSchemas
} from '../robustness-middleware';

const router = Router();

// Apply performance monitoring to all routes
router.use(performanceMonitor(500)); // Warn if request takes > 500ms

/**
 * GET /api/v2/lifecycle/dashboard
 * 
 * TOP-LEVEL: Executive dashboard view
 * Shows compliance health, lifecycle stage, funding readiness
 */
router.get('/dashboard', validateRequest(lifecycleSchemas.userId, 'query'), async (req, res, next) => {
  try {
    const userId = (req as any).user?.id || req.query.userId as string || 'dev-user-123';
    
    const client = await withTimeout(
      ClientService.getClientByUserId(userId),
      3000,
      'Client lookup timeout'
    );
    
    if (!client) {
      throw new NotFoundError('Client');
    }

    // Get all high-level metrics with timeout protection
    const [
      complianceState,
      lifecycleStage,
      fundingReadiness,
      serviceStats,
      nextAction
    ] = await Promise.all([
      withTimeout(ComplianceService.getComplianceState(client.id), 2000),
      withTimeout(LifecycleService.getClientLifecycleStage(client.id), 2000),
      withTimeout(LifecycleService.getFundingReadinessAssessment(client.id), 2000),
      withTimeout(ServiceCatalogService.getServiceStats(client.id), 2000),
      withTimeout(ComplianceService.getNextPrioritizedAction(client.id), 2000)
    ]);

    // Executive summary
    return res.json({
      // Company overview
      company: {
        name: client.businessName,
        type: client.businessType,
        industry: client.industry,
        age: calculateCompanyAge(client.incorporationDate),
        stage: lifecycleStage.currentStage,
        stageProgress: lifecycleStage.stageProgress
      },

      // Compliance health (traffic light system)
      compliance: {
        status: complianceState?.overallState || 'UNKNOWN',
        daysSafe: complianceState?.daysUntilCritical || 0,
        penaltyExposure: complianceState?.totalPenaltyExposure || 0,
        nextDeadline: complianceState?.nextCriticalDeadline,
        stats: {
          compliant: complianceState?.compliantItems || 0,
          pending: complianceState?.pendingItems || 0,
          overdue: complianceState?.overdueItems || 0
        }
      },

      // Lifecycle insights
      lifecycle: {
        currentStage: lifecycleStage.stageConfig.displayName,
        stageDescription: lifecycleStage.stageConfig.description,
        progress: lifecycleStage.stageProgress,
        nextStage: lifecycleStage.nextStage,
        complianceIntensity: lifecycleStage.stageConfig.complianceIntensity,
        criticalGaps: {
          compliance: lifecycleStage.complianceGaps.length,
          documentation: lifecycleStage.documentationGaps.length
        }
      },

      // Funding readiness (for investors/growth)
      fundingReadiness: {
        score: fundingReadiness.overallScore,
        breakdown: {
          compliance: fundingReadiness.complianceScore,
          documentation: fundingReadiness.documentationScore,
          governance: fundingReadiness.governanceScore
        },
        status: fundingReadiness.overallScore >= 85 ? 'ready' : 
                fundingReadiness.overallScore >= 70 ? 'nearly_ready' : 'needs_work',
        topGaps: fundingReadiness.gaps.slice(0, 5)
      },

      // Services overview
      services: {
        total: serviceStats.totalAvailable,
        subscribed: serviceStats.subscribed?.active || 0,
        categories: Object.keys(serviceStats.byCategory).length
      },

      // Next critical action
      nextAction: nextAction ? {
        title: nextAction.title,
        priority: nextAction.priority,
        dueDate: nextAction.dueDate,
        estimatedTime: nextAction.estimatedMinutes
      } : null,

      // Quick drill-down links
      drillDowns: {
        compliance: '/api/v2/lifecycle/compliance-detail',
        services: '/api/v2/lifecycle/services-detail',
        documents: '/api/v2/lifecycle/documents-detail',
        funding: '/api/v2/lifecycle/funding-detail',
        timeline: '/api/v2/lifecycle/timeline'
      }
    });

  } catch (error) {
    console.error('Error getting lifecycle dashboard:', error);
    return res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

/**
 * GET /api/v2/lifecycle/compliance-detail
 * 
 * MID-LEVEL: Compliance breakdown by category
 */
router.get('/compliance-detail', async (req, res) => {
  try {
    const userId = (req as any).user?.id || req.query.userId as string || 'dev-user-123';
    const client = await ClientService.getClientByUserId(userId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const lifecycleStage = await LifecycleService.getClientLifecycleStage(client.id);
    const complianceState = await ComplianceService.getComplianceState(client.id);

    // Get all compliance checkpoints for current stage
    const checkpoints = lifecycleStage.stageConfig.complianceCheckpoints;

    // Get actual compliance actions
    const actionsResult = await ComplianceService.getComplianceState(client.id);

    return res.json({
      summary: {
        overallStatus: complianceState?.overallState,
        totalCheckpoints: checkpoints.length,
        completedCheckpoints: complianceState?.compliantItems || 0,
        upcomingCheckpoints: complianceState?.pendingItems || 0
      },

      // Checkpoints by frequency
      monthly: checkpoints.filter(c => c.frequency === 'monthly').map(c => ({
        name: c.name,
        description: c.description,
        nextDue: calculateNextDue(c.frequency),
        penaltyForMiss: c.penaltyForMiss,
        documentsRequired: c.documentationRequired,
        status: 'pending' // TODO: Calculate actual status
      })),

      quarterly: checkpoints.filter(c => c.frequency === 'quarterly').map(c => ({
        name: c.name,
        description: c.description,
        nextDue: calculateNextDue(c.frequency),
        penaltyForMiss: c.penaltyForMiss,
        documentsRequired: c.documentationRequired,
        status: 'pending'
      })),

      annual: checkpoints.filter(c => c.frequency === 'annual').map(c => ({
        name: c.name,
        description: c.description,
        nextDue: calculateNextDue(c.frequency),
        penaltyForMiss: c.penaltyForMiss,
        documentsRequired: c.documentationRequired,
        status: 'pending'
      })),

      // Risk analysis
      riskAnalysis: {
        highRisk: checkpoints.filter(c => c.penaltyForMiss.includes('lakh')).length,
        mediumRisk: checkpoints.filter(c => c.penaltyForMiss.includes('₹') && !c.penaltyForMiss.includes('lakh')).length,
        lowRisk: checkpoints.filter(c => !c.penaltyForMiss.includes('₹')).length
      }
    });

  } catch (error) {
    console.error('Error getting compliance detail:', error);
    return res.status(500).json({ error: 'Failed to get compliance detail' });
  }
});

/**
 * GET /api/v2/lifecycle/services-detail
 * 
 * MID-LEVEL: Services breakdown by lifecycle stage
 */
router.get('/services-detail', async (req, res) => {
  try {
    const userId = (req as any).user?.id || req.query.userId as string || 'dev-user-123';
    const client = await ClientService.getClientByUserId(userId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const lifecycleStage = await LifecycleService.getClientLifecycleStage(client.id);
    const allServices = await ServiceCatalogService.getAllServices();
    const subscribedServices = await ServiceCatalogService.getClientServices(client.id);
    const subscribedKeys = subscribedServices.map(s => s.serviceKey);

    // Categorize services by lifecycle requirement
    const required = lifecycleStage.stageConfig.requiredServices.map(key => {
      const service = allServices.find(s => s.serviceKey === key);
      return {
        ...service,
        subscribed: subscribedKeys.includes(key),
        importance: 'critical'
      };
    });

    const recommended = lifecycleStage.stageConfig.recommendedServices.map(key => {
      const service = allServices.find(s => s.serviceKey === key);
      return {
        ...service,
        subscribed: subscribedKeys.includes(key),
        importance: 'recommended'
      };
    });

    return res.json({
      summary: {
        stage: lifecycleStage.currentStage,
        totalRequired: required.length,
        subscribedRequired: required.filter(s => s.subscribed).length,
        totalRecommended: recommended.length,
        subscribedRecommended: recommended.filter(s => s.subscribed).length
      },

      required: required,
      recommended: recommended,

      // Service gaps with impact
      gaps: lifecycleStage.complianceGaps.map(key => {
        const service = allServices.find(s => s.serviceKey === key);
        return {
          serviceKey: key,
          serviceName: service?.name,
          impact: 'Compliance gap - required for current stage',
          priority: 'high'
        };
      }),

      // Next stage preview
      nextStagePreview: lifecycleStage.nextStage ? {
        stage: lifecycleStage.nextStage,
        additionalServices: LifecycleService.LIFECYCLE_STAGES[lifecycleStage.nextStage]?.requiredServices.filter(
          s => !lifecycleStage.stageConfig.requiredServices.includes(s)
        )
      } : null
    });

  } catch (error) {
    console.error('Error getting services detail:', error);
    return res.status(500).json({ error: 'Failed to get services detail' });
  }
});

/**
 * GET /api/v2/lifecycle/documents-detail
 * 
 * MID-LEVEL: Document breakdown by category and status
 */
router.get('/documents-detail', async (req, res) => {
  try {
    const userId = (req as any).user?.id || req.query.userId as string || 'dev-user-123';
    const client = await ClientService.getClientByUserId(userId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const lifecycleStage = await LifecycleService.getClientLifecycleStage(client.id);
    const documents = await DocumentService.getClientDocuments(client.id, { latestOnly: true });
    const expiringDocs = await DocumentService.checkExpiringDocuments(client.id, 60);

    // Categorize documents
    const critical = lifecycleStage.stageConfig.criticalDocuments;
    const documentsByCategory: Record<string, any[]> = {
      identity: [],
      tax: [],
      financial: [],
      legal: [],
      operational: [],
      statutory: [],
      registration: []
    };

    documents.forEach(doc => {
      const category = doc.category || 'operational';
      if (documentsByCategory[category]) {
        documentsByCategory[category].push(doc);
      }
    });

    return res.json({
      summary: {
        totalRequired: critical.length,
        uploaded: documents.filter(d => d.status === 'uploaded' || d.status === 'verified').length,
        verified: documents.filter(d => d.status === 'verified').length,
        expiringSoon: expiringDocs.length,
        rejected: documents.filter(d => d.status === 'rejected').length
      },

      // By category
      byCategory: Object.entries(documentsByCategory).map(([category, docs]) => ({
        category,
        count: docs.length,
        verified: docs.filter(d => d.status === 'verified').length,
        documents: docs
      })),

      // Critical documents status
      criticalDocuments: critical.map(docKey => {
        const doc = documents.find(d => d.document_key === docKey);
        return {
          documentKey: docKey,
          status: doc ? doc.status : 'missing',
          uploaded: !!doc,
          verified: doc?.status === 'verified',
          expiryDate: doc?.expiry_date,
          lastUpdated: doc?.updated_at
        };
      }),

      // Expiry alerts
      expiringDocuments: expiringDocs.map(doc => ({
        documentName: doc.document_name,
        expiryDate: doc.expiry_date,
        daysUntilExpiry: doc.days_until_expiry,
        urgency: doc.days_until_expiry <= 7 ? 'critical' :
                 doc.days_until_expiry <= 30 ? 'high' : 'medium'
      })),

      // Missing critical documents
      missingCritical: lifecycleStage.documentationGaps.map(docKey => ({
        documentKey: docKey,
        importance: 'Required for compliance and funding readiness'
      }))
    });

  } catch (error) {
    console.error('Error getting documents detail:', error);
    return res.status(500).json({ error: 'Failed to get documents detail' });
  }
});

/**
 * GET /api/v2/lifecycle/funding-detail
 * 
 * MID-LEVEL: Funding readiness with detailed breakdown
 */
router.get('/funding-detail', async (req, res) => {
  try {
    const userId = (req as any).user?.id || req.query.userId as string || 'dev-user-123';
    const client = await ClientService.getClientByUserId(userId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const assessment = await LifecycleService.getFundingReadinessAssessment(client.id);
    const lifecycleStage = await LifecycleService.getClientLifecycleStage(client.id);

    return res.json({
      overallScore: assessment.overallScore,
      status: assessment.overallScore >= 85 ? 'ready' : 
              assessment.overallScore >= 70 ? 'nearly_ready' : 'needs_work',
      
      // Detailed breakdown
      scoreBreakdown: {
        compliance: {
          score: assessment.complianceScore,
          weight: '40%',
          status: assessment.complianceScore >= 80 ? 'good' : 'needs_improvement',
          description: 'All statutory compliances up to date'
        },
        documentation: {
          score: assessment.documentationScore,
          weight: '35%',
          status: assessment.documentationScore >= 80 ? 'good' : 'needs_improvement',
          description: 'Financial statements, legal docs, and records'
        },
        governance: {
          score: assessment.governanceScore,
          weight: '25%',
          status: assessment.governanceScore >= 70 ? 'good' : 'needs_improvement',
          description: 'Board structure, policies, and processes'
        }
      },

      // Investor due diligence checklist
      dueDiligenceChecklist: {
        legal: {
          items: [
            { name: 'Certificate of Incorporation', status: 'completed' },
            { name: 'MOA & AOA', status: 'completed' },
            { name: 'Shareholder Agreements', status: 'pending' },
            { name: 'Board Resolutions', status: 'in_progress' }
          ],
          completionRate: 50
        },
        financial: {
          items: [
            { name: '3 Years Audited Financials', status: 'completed' },
            { name: 'Tax Returns Filed', status: 'completed' },
            { name: 'Cap Table', status: 'pending' },
            { name: 'Financial Projections', status: 'pending' }
          ],
          completionRate: 50
        },
        compliance: {
          items: [
            { name: 'GST Compliance', status: 'completed' },
            { name: 'TDS Compliance', status: 'completed' },
            { name: 'PF/ESI Compliance', status: 'completed' },
            { name: 'ROC Filings', status: 'completed' }
          ],
          completionRate: 100
        }
      },

      // Critical gaps preventing funding
      criticalGaps: assessment.gaps,

      // Actionable recommendations
      recommendations: assessment.recommendations,

      // Timeline estimate
      timeline: {
        currentReadiness: assessment.overallScore,
        targetReadiness: 85,
        estimatedTimeToReady: estimateTimeToFundingReady(assessment.overallScore),
        milestones: generateFundingMilestones(assessment.overallScore)
      }
    });

  } catch (error) {
    console.error('Error getting funding detail:', error);
    return res.status(500).json({ error: 'Failed to get funding detail' });
  }
});

/**
 * GET /api/v2/lifecycle/timeline
 * 
 * Visual timeline of compliance journey
 */
router.get('/timeline', async (req, res) => {
  try {
    const userId = (req as any).user?.id || req.query.userId as string || 'dev-user-123';
    const client = await ClientService.getClientByUserId(userId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const activities = await ComplianceService.getRecentActivities(client.id, 50);
    const lifecycleStage = await LifecycleService.getClientLifecycleStage(client.id);

    // Group activities by month
    const timeline = activities.reduce((acc: any, activity) => {
      const monthKey = new Date(activity.timestamp).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push({
        type: activity.type,
        description: activity.description,
        date: activity.timestamp
      });
      return acc;
    }, {});

    return res.json({
      currentStage: lifecycleStage.currentStage,
      companyAge: calculateCompanyAge(client.incorporationDate),
      
      // Historical timeline
      history: Object.entries(timeline).map(([month, events]) => ({
        month,
        eventCount: (events as any[]).length,
        events
      })),

      // Future milestones
      upcomingMilestones: [
        {
          name: 'Q1 GST Filing',
          dueDate: '2026-04-20',
          daysUntil: 88,
          importance: 'high'
        },
        {
          name: 'Annual ROC Filing',
          dueDate: '2026-09-30',
          daysUntil: 252,
          importance: 'critical'
        }
      ],

      // Lifecycle progression
      stages: Object.keys(LifecycleService.LIFECYCLE_STAGES).map(stage => ({
        stage,
        completed: isStageCompleted(stage as any, lifecycleStage.currentStage),
        current: stage === lifecycleStage.currentStage
      }))
    });

  } catch (error) {
    console.error('Error getting timeline:', error);
    return res.status(500).json({ error: 'Failed to get timeline' });
  }
});

// Helper functions
function calculateCompanyAge(incorporationDate: Date | null | undefined): string {
  if (!incorporationDate) return 'N/A';
  
  const months = Math.floor(
    (Date.now() - new Date(incorporationDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) return `${months} months`;
  if (remainingMonths === 0) return `${years} years`;
  return `${years} years, ${remainingMonths} months`;
}

function calculateNextDue(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, 20).toISOString().split('T')[0];
    case 'quarterly':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 20).toISOString().split('T')[0];
    case 'annual':
      return new Date(now.getFullYear(), 9, 30).toISOString().split('T')[0]; // Sept 30
    default:
      return '';
  }
}

function estimateTimeToFundingReady(currentScore: number): string {
  if (currentScore >= 85) return 'Ready now';
  if (currentScore >= 70) return '1-3 months';
  if (currentScore >= 50) return '3-6 months';
  return '6-12 months';
}

function generateFundingMilestones(currentScore: number): any[] {
  const milestones = [];
  
  if (currentScore < 70) {
    milestones.push({
      name: 'Achieve GREEN compliance',
      target: '70% score',
      timeframe: '1-2 months'
    });
  }
  
  if (currentScore < 85) {
    milestones.push({
      name: 'Complete critical documentation',
      target: '85% score',
      timeframe: '2-3 months'
    });
  }
  
  milestones.push({
    name: 'Investor due diligence',
    target: 'All documents verified',
    timeframe: 'Ongoing'
  });
  
  return milestones;
}

function isStageCompleted(stage: LifecycleService.BusinessStage, currentStage: LifecycleService.BusinessStage): boolean {
  const stageOrder: LifecycleService.BusinessStage[] = [
    'idea', 'formation', 'early_stage', 'growth', 'funded', 'mature', 'pre_ipo', 'public'
  ];
  
  const stageIndex = stageOrder.indexOf(stage);
  const currentIndex = stageOrder.indexOf(currentStage);
  
  return stageIndex < currentIndex;
}

// Catch-all error handler for this router
router.use((error: any, req: any, res: any, next: any) => {
  console.error('Lifecycle API Error:', error);
  
  if (error instanceof NotFoundError) {
    return res.status(404).json({
      error: error.message,
      code: 'NOT_FOUND'
    });
  }
  
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details
    });
  }
  
  // Generic error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

export default router;

