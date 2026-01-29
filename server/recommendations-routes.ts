import { Router, Request, Response } from 'express';
import { db } from './db';
import {
  businessEntities,
  services,
  serviceRequests,
  complianceTracking
} from '@shared/schema';
import { eq, and, ne, notInArray, sql, desc, count } from 'drizzle-orm';

const router = Router();

// ============================================================================
// SMART SUGGESTIONS / RECOMMENDATIONS ROUTES
// ============================================================================

// Service recommendation engine based on entity profile
router.get('/services/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Get entity details
    const [entity] = await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.id, Number(entityId)))
      .limit(1);

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Get services already requested by this entity
    const existingServices = await db.select({ serviceId: serviceRequests.serviceId })
      .from(serviceRequests)
      .where(eq(serviceRequests.businessEntityId, Number(entityId)));

    const existingServiceIds = existingServices.map(s => s.serviceId).filter(Boolean);

    // Get all available services
    const allServices = await db.select()
      .from(services)
      .where(eq(services.isActive, true));

    // Score and rank services based on entity profile
    const recommendations = allServices
      .filter(service => !existingServiceIds.includes(service.id))
      .map(service => {
        let score = 50; // Base score
        let reasons: string[] = [];

        // Score based on entity type matching
        if (entity.entityType === 'private_limited') {
          if (service.category === 'company_compliance') {
            score += 30;
            reasons.push('Essential for Private Limited companies');
          }
          if (service.name?.toLowerCase().includes('roc') ||
              service.name?.toLowerCase().includes('annual')) {
            score += 20;
            reasons.push('Annual compliance requirement');
          }
        } else if (entity.entityType === 'llp') {
          if (service.name?.toLowerCase().includes('llp')) {
            score += 30;
            reasons.push('Specific to LLP entities');
          }
        }

        // Score based on GST registration
        if (entity.gstin) {
          if (service.category === 'gst' || service.name?.toLowerCase().includes('gst')) {
            score += 25;
            reasons.push('GST registered entity');
          }
        }

        // Score based on lifecycle stage
        const incorporationDate = entity.incorporationDate ? new Date(entity.incorporationDate) : null;
        if (incorporationDate) {
          const monthsOld = Math.floor((Date.now() - incorporationDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

          if (monthsOld < 6) {
            if (service.name?.toLowerCase().includes('incorporation') ||
                service.name?.toLowerCase().includes('starter')) {
              score += 20;
              reasons.push('Recommended for new businesses');
            }
          } else if (monthsOld >= 12) {
            if (service.name?.toLowerCase().includes('annual') ||
                service.name?.toLowerCase().includes('filing')) {
              score += 15;
              reasons.push('Due for annual compliance');
            }
          }
        }

        // Add seasonality bonus (tax season, filing deadlines)
        const currentMonth = new Date().getMonth();
        if (currentMonth >= 0 && currentMonth <= 2) { // Jan-Mar
          if (service.name?.toLowerCase().includes('income tax') ||
              service.name?.toLowerCase().includes('tax return')) {
            score += 20;
            reasons.push('Tax filing season');
          }
        }
        if (currentMonth >= 2 && currentMonth <= 3) { // Mar-Apr
          if (service.name?.toLowerCase().includes('annual') ||
              service.name?.toLowerCase().includes('year-end')) {
            score += 15;
            reasons.push('Financial year-end');
          }
        }

        return {
          service,
          score,
          reasons,
          priority: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
          matchPercentage: Math.min(score, 100)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.json({
      entityId: Number(entityId),
      entityType: entity.entityType,
      recommendations,
      totalAvailable: allServices.length - existingServiceIds.length,
      alreadySubscribed: existingServiceIds.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating service recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compliance action recommendations
router.get('/compliance/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Get pending and overdue compliance items
    const complianceItems = await db.select()
      .from(complianceTracking)
      .where(
        and(
          eq(complianceTracking.businessEntityId, Number(entityId)),
          ne(complianceTracking.status, 'completed')
        )
      )
      .orderBy(complianceTracking.dueDate);

    const now = new Date();
    const recommendations = complianceItems.map(item => {
      const dueDate = item.dueDate ? new Date(item.dueDate) : null;
      const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

      let priority = 'medium';
      let action = '';
      let urgencyScore = 50;

      if (item.status === 'overdue') {
        priority = 'critical';
        action = 'File immediately to avoid penalties';
        urgencyScore = 100;
      } else if (daysUntilDue !== null) {
        if (daysUntilDue <= 3) {
          priority = 'critical';
          action = 'Due very soon - take action now';
          urgencyScore = 95;
        } else if (daysUntilDue <= 7) {
          priority = 'high';
          action = 'Due this week - prepare documents';
          urgencyScore = 80;
        } else if (daysUntilDue <= 15) {
          priority = 'medium';
          action = 'Plan for upcoming deadline';
          urgencyScore = 60;
        } else {
          priority = 'low';
          action = 'Schedule in advance';
          urgencyScore = 30;
        }
      }

      return {
        item,
        daysUntilDue,
        priority,
        action,
        urgencyScore,
        estimatedPenalty: calculateEstimatedPenalty(item)
      };
    }).sort((a, b) => b.urgencyScore - a.urgencyScore);

    const summary = {
      critical: recommendations.filter(r => r.priority === 'critical').length,
      high: recommendations.filter(r => r.priority === 'high').length,
      medium: recommendations.filter(r => r.priority === 'medium').length,
      low: recommendations.filter(r => r.priority === 'low').length,
      totalPendingItems: recommendations.length,
      estimatedTotalPenalty: recommendations.reduce((sum, r) => sum + r.estimatedPenalty, 0)
    };

    res.json({
      entityId: Number(entityId),
      summary,
      recommendations,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating compliance recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Document recommendations (what documents are missing)
router.get('/documents/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Get entity details
    const [entity] = await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.id, Number(entityId)))
      .limit(1);

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Define required documents based on entity type
    const requiredDocs = getRequiredDocuments(entity.entityType);

    // Mock: would check actual uploaded documents
    const uploadedDocs: string[] = []; // Would fetch from documentsUploads table

    const recommendations = requiredDocs.map(doc => ({
      documentType: doc.type,
      name: doc.name,
      category: doc.category,
      required: doc.required,
      uploaded: uploadedDocs.includes(doc.type),
      priority: doc.required ? 'high' : 'medium',
      reason: doc.reason
    })).filter(doc => !doc.uploaded);

    res.json({
      entityId: Number(entityId),
      entityType: entity.entityType,
      totalRequired: requiredDocs.length,
      uploaded: uploadedDocs.length,
      missing: recommendations.length,
      recommendations,
      completionPercentage: Math.round((uploadedDocs.length / requiredDocs.length) * 100),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating document recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Growth recommendations based on business profile
router.get('/growth/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Get entity details
    const [entity] = await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.id, Number(entityId)))
      .limit(1);

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const recommendations = [];

    // Based on entity type and lifecycle
    const incorporationDate = entity.incorporationDate ? new Date(entity.incorporationDate) : null;
    const monthsOld = incorporationDate
      ? Math.floor((Date.now() - incorporationDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 12;

    // Funding readiness
    if (monthsOld >= 6 && monthsOld <= 24) {
      recommendations.push({
        category: 'funding',
        title: 'Prepare for Funding',
        description: 'Your company is at the right stage to start preparing for seed/Series A funding',
        actions: [
          'Complete all statutory compliance',
          'Organize financial statements',
          'Prepare pitch deck',
          'Clean up cap table'
        ],
        priority: 'high',
        estimatedImpact: 'High - Access to growth capital'
      });
    }

    // GST registration
    if (!entity.gstin) {
      recommendations.push({
        category: 'compliance',
        title: 'Get GST Registration',
        description: 'GST registration enables interstate sales and B2B transactions',
        actions: [
          'Gather required documents',
          'Submit GST application',
          'Complete verification'
        ],
        priority: 'medium',
        estimatedImpact: 'Medium - Expanded business capabilities'
      });
    }

    // Trademark
    if (monthsOld >= 3) {
      recommendations.push({
        category: 'intellectual_property',
        title: 'Register Your Trademark',
        description: 'Protect your brand identity with trademark registration',
        actions: [
          'Conduct trademark search',
          'File trademark application',
          'Monitor registration status'
        ],
        priority: 'medium',
        estimatedImpact: 'Medium - Brand protection'
      });
    }

    // Digital presence
    recommendations.push({
      category: 'digital',
      title: 'Establish Digital Presence',
      description: 'Build credibility with professional digital presence',
      actions: [
        'Create company website',
        'Set up professional email',
        'Establish social media profiles'
      ],
      priority: 'low',
      estimatedImpact: 'Low-Medium - Market visibility'
    });

    res.json({
      entityId: Number(entityId),
      stage: getBusinessStage(monthsOld),
      recommendations,
      nextMilestone: getNextMilestone(monthsOld),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating growth recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI-powered suggestions summary
router.get('/summary/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Aggregate all recommendations
    const summary = {
      entityId: Number(entityId),
      overallHealth: 78, // Would calculate from actual data
      urgentActions: 2,
      recommendations: {
        compliance: 3,
        services: 5,
        documents: 2,
        growth: 4
      },
      topPriorities: [
        { type: 'compliance', title: 'GST Return Due', deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), priority: 'high' },
        { type: 'document', title: 'Upload Board Resolution', deadline: null, priority: 'medium' },
        { type: 'service', title: 'Annual ROC Filing', deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), priority: 'medium' }
      ],
      savingsOpportunity: 25000, // Potential savings from on-time compliance
      nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      generatedAt: new Date().toISOString()
    };

    res.json(summary);
  } catch (error) {
    console.error('Error generating recommendations summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function calculateEstimatedPenalty(item: any): number {
  const type = item.complianceType?.toLowerCase() || '';

  if (type.includes('gst')) return 5000;
  if (type.includes('tds')) return 1000;
  if (type.includes('roc') || type.includes('annual')) return 10000;
  if (type.includes('income tax')) return 5000;

  return 2000; // Default penalty estimate
}

function getRequiredDocuments(entityType: string | null) {
  const baseDocs = [
    { type: 'pan_card', name: 'PAN Card', category: 'identity', required: true, reason: 'Required for all tax filings' },
    { type: 'aadhaar', name: 'Aadhaar Card', category: 'identity', required: true, reason: 'KYC requirement' },
    { type: 'address_proof', name: 'Address Proof', category: 'identity', required: true, reason: 'Registered office verification' },
    { type: 'bank_statement', name: 'Bank Statement', category: 'financial', required: true, reason: 'Financial verification' }
  ];

  if (entityType === 'private_limited' || entityType === 'llp') {
    baseDocs.push(
      { type: 'incorporation_certificate', name: 'Certificate of Incorporation', category: 'legal', required: true, reason: 'Proof of registration' },
      { type: 'moa_aoa', name: 'MOA/AOA', category: 'legal', required: true, reason: 'Company constitution' },
      { type: 'board_resolution', name: 'Board Resolution', category: 'legal', required: false, reason: 'For authorized signatories' }
    );
  }

  if (entityType === 'private_limited') {
    baseDocs.push(
      { type: 'share_certificates', name: 'Share Certificates', category: 'legal', required: false, reason: 'Equity documentation' },
      { type: 'statutory_registers', name: 'Statutory Registers', category: 'compliance', required: true, reason: 'MCA compliance' }
    );
  }

  return baseDocs;
}

function getBusinessStage(monthsOld: number): string {
  if (monthsOld < 3) return 'Formation';
  if (monthsOld < 12) return 'Early Stage';
  if (monthsOld < 36) return 'Growth';
  if (monthsOld < 60) return 'Scaling';
  return 'Mature';
}

function getNextMilestone(monthsOld: number): { name: string; description: string } {
  if (monthsOld < 3) return { name: 'Complete Formation', description: 'Finish all incorporation formalities' };
  if (monthsOld < 6) return { name: 'First GST Return', description: 'File your first GST return' };
  if (monthsOld < 12) return { name: 'First Annual Compliance', description: 'Complete first year ROC filings' };
  if (monthsOld < 24) return { name: 'Growth Funding', description: 'Prepare for seed/Series A funding' };
  return { name: 'Scale Operations', description: 'Focus on expansion and scaling' };
}

export default router;
