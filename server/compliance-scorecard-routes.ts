import { Router, Request, Response } from 'express';
import { db } from './db';
import {
  businessEntities,
  complianceTracking,
  serviceRequests,
  documentsUploads,
  payments
} from '@shared/schema';
import { eq, and, gte, lte, sql, count, desc } from 'drizzle-orm';

const router = Router();

// ============================================================================
// 10K COMPLIANCE SCORECARD ROUTES
// Comprehensive scoring system for funding readiness & compliance health
// ============================================================================

// Scorecard categories and their weights
const SCORECARD_CATEGORIES = {
  statutory_compliance: { weight: 2500, label: 'Statutory Compliance' },
  tax_compliance: { weight: 2000, label: 'Tax Compliance' },
  documentation: { weight: 2000, label: 'Documentation' },
  financial_health: { weight: 1500, label: 'Financial Health' },
  governance: { weight: 1000, label: 'Corporate Governance' },
  legal_standing: { weight: 1000, label: 'Legal Standing' }
};

// Get comprehensive 10K scorecard
router.get('/:entityId', async (req: Request, res: Response) => {
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

    // Calculate each category score
    const scores = await calculateAllScores(Number(entityId), entity);

    // Calculate overall score (out of 10000)
    const overallScore = Object.values(scores.categories).reduce((sum, cat) => sum + cat.score, 0);
    const fundingReadiness = Math.round(overallScore / 100); // Convert to percentage

    // Determine funding stage eligibility
    const fundingStage = determineFundingStage(overallScore, fundingReadiness);

    res.json({
      entityId: Number(entityId),
      entityName: entity.entityName,
      entityType: entity.entityType,
      overallScore,
      maxScore: 10000,
      fundingReadiness,
      fundingStage,
      categories: scores.categories,
      improvements: scores.improvements,
      timeline: scores.timeline,
      investorView: generateInvestorView(scores, entity),
      benchmarks: generateBenchmarks(overallScore, entity.entityType),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating compliance scorecard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get category-specific breakdown
router.get('/:entityId/category/:category', async (req: Request, res: Response) => {
  try {
    const { entityId, category } = req.params;

    if (!SCORECARD_CATEGORIES[category as keyof typeof SCORECARD_CATEGORIES]) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const breakdown = await getCategoryBreakdown(Number(entityId), category);

    res.json({
      entityId: Number(entityId),
      category,
      ...breakdown
    });
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get improvement recommendations
router.get('/:entityId/improvements', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { priority } = req.query;

    const improvements = await getDetailedImprovements(Number(entityId), priority as string);

    res.json({
      entityId: Number(entityId),
      improvements,
      estimatedScoreGain: improvements.reduce((sum, i) => sum + i.scoreImpact, 0),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching improvements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get funding readiness checklist
router.get('/:entityId/funding-checklist', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { stage = 'seed' } = req.query;

    const checklist = await getFundingChecklist(Number(entityId), stage as string);

    res.json({
      entityId: Number(entityId),
      targetStage: stage,
      checklist,
      completionPercentage: Math.round(
        (checklist.filter(i => i.status === 'complete').length / checklist.length) * 100
      ),
      blockers: checklist.filter(i => i.status === 'missing' && i.critical),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching funding checklist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get historical score trend
router.get('/:entityId/trend', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { months = 6 } = req.query;

    // Generate trend data (would come from historical snapshots in production)
    const trend = [];
    const currentDate = new Date();

    for (let i = Number(months) - 1; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);

      trend.push({
        month: date.toISOString().slice(0, 7),
        score: Math.floor(7000 + Math.random() * 2000 + (Number(months) - i) * 100),
        fundingReadiness: Math.floor(65 + Math.random() * 20 + (Number(months) - i) * 2)
      });
    }

    res.json({
      entityId: Number(entityId),
      trend,
      improvement: trend.length > 1 ? trend[trend.length - 1].score - trend[0].score : 0,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching score trend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare with industry benchmarks
router.get('/:entityId/benchmarks', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    const [entity] = await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.id, Number(entityId)))
      .limit(1);

    const scores = await calculateAllScores(Number(entityId), entity);
    const overallScore = Object.values(scores.categories).reduce((sum, cat) => sum + cat.score, 0);

    const benchmarks = generateBenchmarks(overallScore, entity?.entityType);

    res.json({
      entityId: Number(entityId),
      entityScore: overallScore,
      benchmarks,
      ranking: {
        percentile: Math.round((overallScore / 10000) * 100),
        position: overallScore >= 8000 ? 'Top Quartile' : overallScore >= 6000 ? 'Above Average' : 'Below Average'
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate PDF report
router.get('/:entityId/report', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { format = 'summary' } = req.query;

    // In production, this would generate an actual PDF
    const reportData = {
      entityId: Number(entityId),
      reportType: format,
      generatedAt: new Date().toISOString(),
      downloadUrl: `/api/reports/scorecard-${entityId}-${Date.now()}.pdf`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    res.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate Compliance Certificate PDF
router.get('/:entityId/certificate/:type', async (req: Request, res: Response) => {
  try {
    const { entityId, type } = req.params;
    const { download = 'false' } = req.query;

    // Import certificate service
    const { generateComplianceCertificate, getCertificateStream } = await import('./services/certificateService');

    // Validate certificate type
    const validTypes = ['compliance_status', 'gst_filing', 'roc_filing', 'tax_clearance', 'funding_readiness', 'digicomply_score'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid certificate type', validTypes });
    }

    // Get additional data from query params
    const additionalData: Record<string, any> = {};
    if (req.query.period) additionalData.period = req.query.period;
    if (req.query.returnType) additionalData.returnType = req.query.returnType;
    if (req.query.formType) additionalData.formType = req.query.formType;
    if (req.query.year) additionalData.year = parseInt(req.query.year as string);
    if (req.query.assessmentYear) additionalData.assessmentYear = req.query.assessmentYear;

    // Generate certificate
    const result = await generateComplianceCertificate({
      entityId: Number(entityId),
      certificateType: type as any,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
      additionalData
    });

    if (!result.success || !result.pdfBuffer) {
      return res.status(500).json({ error: result.error || 'Failed to generate certificate' });
    }

    // Set response headers
    const filename = `DigiComply-Certificate-${result.certificateId}.pdf`;

    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', result.pdfBuffer.length);
    res.setHeader('X-Certificate-ID', result.certificateId || '');

    // Send PDF
    res.send(result.pdfBuffer);

  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List available certificate types
router.get('/:entityId/certificates', async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;

    // Get entity to check eligibility
    const [entity] = await db.select()
      .from(businessEntities)
      .where(eq(businessEntities.id, Number(entityId)))
      .limit(1);

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const certificates = [
      {
        type: 'compliance_status',
        name: 'Compliance Status Certificate',
        description: 'Overall compliance standing across all checkpoints',
        available: true,
        downloadUrl: `/api/compliance-scorecard/${entityId}/certificate/compliance_status`
      },
      {
        type: 'digicomply_score',
        name: 'DigiComply Score Certificate',
        description: '10K compliance scorecard certificate',
        available: true,
        downloadUrl: `/api/compliance-scorecard/${entityId}/certificate/digicomply_score`
      },
      {
        type: 'funding_readiness',
        name: 'Funding Readiness Certificate',
        description: 'Investor due diligence readiness score',
        available: true,
        downloadUrl: `/api/compliance-scorecard/${entityId}/certificate/funding_readiness`
      },
      {
        type: 'gst_filing',
        name: 'GST Filing Certificate',
        description: 'GST return filing confirmation',
        available: !!entity.gstin,
        downloadUrl: `/api/compliance-scorecard/${entityId}/certificate/gst_filing`
      },
      {
        type: 'roc_filing',
        name: 'ROC Filing Certificate',
        description: 'Registrar of Companies filing confirmation',
        available: !!entity.cin,
        downloadUrl: `/api/compliance-scorecard/${entityId}/certificate/roc_filing`
      },
      {
        type: 'tax_clearance',
        name: 'Tax Clearance Certificate',
        description: 'No outstanding tax liabilities confirmation',
        available: true,
        downloadUrl: `/api/compliance-scorecard/${entityId}/certificate/tax_clearance`
      }
    ];

    res.json({
      entityId: Number(entityId),
      entityName: entity.entityName,
      certificates,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error listing certificates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function calculateAllScores(entityId: number, entity: any) {
  const categories: Record<string, any> = {};
  const improvements: any[] = [];
  const timeline: any[] = [];

  // Statutory Compliance Score
  const statutoryScore = await calculateStatutoryScore(entityId);
  categories.statutory_compliance = {
    ...SCORECARD_CATEGORIES.statutory_compliance,
    score: statutoryScore.score,
    items: statutoryScore.items,
    status: statutoryScore.score >= 2000 ? 'excellent' : statutoryScore.score >= 1500 ? 'good' : 'needs_attention'
  };
  if (statutoryScore.improvements.length > 0) {
    improvements.push(...statutoryScore.improvements);
  }

  // Tax Compliance Score
  const taxScore = await calculateTaxScore(entityId);
  categories.tax_compliance = {
    ...SCORECARD_CATEGORIES.tax_compliance,
    score: taxScore.score,
    items: taxScore.items,
    status: taxScore.score >= 1600 ? 'excellent' : taxScore.score >= 1200 ? 'good' : 'needs_attention'
  };
  if (taxScore.improvements.length > 0) {
    improvements.push(...taxScore.improvements);
  }

  // Documentation Score
  const docScore = await calculateDocumentationScore(entityId);
  categories.documentation = {
    ...SCORECARD_CATEGORIES.documentation,
    score: docScore.score,
    items: docScore.items,
    status: docScore.score >= 1600 ? 'excellent' : docScore.score >= 1200 ? 'good' : 'needs_attention'
  };
  if (docScore.improvements.length > 0) {
    improvements.push(...docScore.improvements);
  }

  // Financial Health Score
  const financialScore = await calculateFinancialScore(entityId);
  categories.financial_health = {
    ...SCORECARD_CATEGORIES.financial_health,
    score: financialScore.score,
    items: financialScore.items,
    status: financialScore.score >= 1200 ? 'excellent' : financialScore.score >= 900 ? 'good' : 'needs_attention'
  };
  if (financialScore.improvements.length > 0) {
    improvements.push(...financialScore.improvements);
  }

  // Governance Score
  const governanceScore = calculateGovernanceScore(entity);
  categories.governance = {
    ...SCORECARD_CATEGORIES.governance,
    score: governanceScore.score,
    items: governanceScore.items,
    status: governanceScore.score >= 800 ? 'excellent' : governanceScore.score >= 600 ? 'good' : 'needs_attention'
  };
  if (governanceScore.improvements.length > 0) {
    improvements.push(...governanceScore.improvements);
  }

  // Legal Standing Score
  const legalScore = calculateLegalScore(entity);
  categories.legal_standing = {
    ...SCORECARD_CATEGORIES.legal_standing,
    score: legalScore.score,
    items: legalScore.items,
    status: legalScore.score >= 800 ? 'excellent' : legalScore.score >= 600 ? 'good' : 'needs_attention'
  };
  if (legalScore.improvements.length > 0) {
    improvements.push(...legalScore.improvements);
  }

  // Sort improvements by score impact
  improvements.sort((a, b) => b.scoreImpact - a.scoreImpact);

  return { categories, improvements: improvements.slice(0, 10), timeline };
}

async function calculateStatutoryScore(entityId: number) {
  const items: any[] = [];
  let score = 0;
  const improvements: any[] = [];

  // Check compliance tracking items
  const complianceItems = await db.select()
    .from(complianceTracking)
    .where(eq(complianceTracking.businessEntityId, entityId));

  const totalItems = complianceItems.length || 10;
  const completedItems = complianceItems.filter(i => i.status === 'completed').length;
  const complianceRate = totalItems > 0 ? completedItems / totalItems : 0.5;

  // ROC Filings
  const rocScore = Math.round(complianceRate * 800);
  score += rocScore;
  items.push({ name: 'ROC Filings', score: rocScore, max: 800, status: rocScore >= 600 ? 'complete' : 'pending' });

  // Annual Returns
  const annualScore = Math.round(complianceRate * 600);
  score += annualScore;
  items.push({ name: 'Annual Returns', score: annualScore, max: 600, status: annualScore >= 450 ? 'complete' : 'pending' });

  // Board Meetings
  const boardScore = Math.round(complianceRate * 500);
  score += boardScore;
  items.push({ name: 'Board Meetings', score: boardScore, max: 500, status: boardScore >= 375 ? 'complete' : 'pending' });

  // Statutory Registers
  const registersScore = Math.round(complianceRate * 400);
  score += registersScore;
  items.push({ name: 'Statutory Registers', score: registersScore, max: 400, status: registersScore >= 300 ? 'complete' : 'pending' });

  // Share Capital
  const capitalScore = Math.round(complianceRate * 200);
  score += capitalScore;
  items.push({ name: 'Share Capital Compliance', score: capitalScore, max: 200, status: capitalScore >= 150 ? 'complete' : 'pending' });

  if (score < 2000) {
    improvements.push({
      category: 'statutory_compliance',
      action: 'Complete pending ROC filings',
      scoreImpact: 2500 - score,
      priority: 'high',
      deadline: '30 days'
    });
  }

  return { score, items, improvements };
}

async function calculateTaxScore(entityId: number) {
  const items: any[] = [];
  let score = 0;
  const improvements: any[] = [];

  // Check service requests for tax-related services
  const taxServices = await db.select()
    .from(serviceRequests)
    .where(eq(serviceRequests.businessEntityId, entityId));

  const completedTax = taxServices.filter(s => s.status === 'completed').length;
  const taxCompletionRate = taxServices.length > 0 ? completedTax / taxServices.length : 0.6;

  // GST Compliance
  const gstScore = Math.round(taxCompletionRate * 700);
  score += gstScore;
  items.push({ name: 'GST Returns', score: gstScore, max: 700, status: gstScore >= 525 ? 'complete' : 'pending' });

  // TDS Compliance
  const tdsScore = Math.round(taxCompletionRate * 500);
  score += tdsScore;
  items.push({ name: 'TDS Returns', score: tdsScore, max: 500, status: tdsScore >= 375 ? 'complete' : 'pending' });

  // Income Tax
  const itScore = Math.round(taxCompletionRate * 500);
  score += itScore;
  items.push({ name: 'Income Tax', score: itScore, max: 500, status: itScore >= 375 ? 'complete' : 'pending' });

  // Advance Tax
  const advScore = Math.round(taxCompletionRate * 300);
  score += advScore;
  items.push({ name: 'Advance Tax', score: advScore, max: 300, status: advScore >= 225 ? 'complete' : 'pending' });

  if (score < 1600) {
    improvements.push({
      category: 'tax_compliance',
      action: 'File pending GST returns',
      scoreImpact: 2000 - score,
      priority: 'high',
      deadline: '15 days'
    });
  }

  return { score, items, improvements };
}

async function calculateDocumentationScore(entityId: number) {
  const items: any[] = [];
  let score = 0;
  const improvements: any[] = [];

  // Check uploaded documents
  const documents = await db.select()
    .from(documentsUploads)
    .where(eq(documentsUploads.businessEntityId, entityId));

  const docCount = documents.length;
  const verifiedDocs = documents.filter(d => d.verificationStatus === 'verified').length;
  const docRate = docCount > 0 ? verifiedDocs / Math.max(docCount, 10) : 0.3;

  // Incorporation Documents
  const incorpScore = Math.round(docRate * 600);
  score += incorpScore;
  items.push({ name: 'Incorporation Documents', score: incorpScore, max: 600, status: incorpScore >= 450 ? 'complete' : 'pending' });

  // Financial Statements
  const finScore = Math.round(docRate * 500);
  score += finScore;
  items.push({ name: 'Financial Statements', score: finScore, max: 500, status: finScore >= 375 ? 'complete' : 'pending' });

  // Contracts & Agreements
  const contractScore = Math.round(docRate * 400);
  score += contractScore;
  items.push({ name: 'Contracts & Agreements', score: contractScore, max: 400, status: contractScore >= 300 ? 'complete' : 'pending' });

  // KYC Documents
  const kycScore = Math.round(docRate * 300);
  score += kycScore;
  items.push({ name: 'KYC Documents', score: kycScore, max: 300, status: kycScore >= 225 ? 'complete' : 'pending' });

  // IP Documents
  const ipScore = Math.round(docRate * 200);
  score += ipScore;
  items.push({ name: 'IP Documentation', score: ipScore, max: 200, status: ipScore >= 150 ? 'complete' : 'pending' });

  if (score < 1600) {
    improvements.push({
      category: 'documentation',
      action: 'Upload and verify pending documents',
      scoreImpact: 2000 - score,
      priority: 'medium',
      deadline: '45 days'
    });
  }

  return { score, items, improvements };
}

async function calculateFinancialScore(entityId: number) {
  const items: any[] = [];
  let score = 0;
  const improvements: any[] = [];

  // Check payments history
  const paymentsData = await db.select()
    .from(payments)
    .where(eq(payments.businessEntityId, entityId));

  const completedPayments = paymentsData.filter(p => p.status === 'completed').length;
  const paymentRate = paymentsData.length > 0 ? completedPayments / paymentsData.length : 0.7;

  // Payment History
  const paymentScore = Math.round(paymentRate * 500);
  score += paymentScore;
  items.push({ name: 'Payment History', score: paymentScore, max: 500, status: paymentScore >= 375 ? 'good' : 'needs_attention' });

  // Bank Statements
  const bankScore = Math.round(paymentRate * 400);
  score += bankScore;
  items.push({ name: 'Bank Statements', score: bankScore, max: 400, status: bankScore >= 300 ? 'complete' : 'pending' });

  // Audited Financials
  const auditScore = Math.round(paymentRate * 400);
  score += auditScore;
  items.push({ name: 'Audited Financials', score: auditScore, max: 400, status: auditScore >= 300 ? 'complete' : 'pending' });

  // MIS Reports
  const misScore = Math.round(paymentRate * 200);
  score += misScore;
  items.push({ name: 'MIS Reports', score: misScore, max: 200, status: misScore >= 150 ? 'complete' : 'pending' });

  if (score < 1200) {
    improvements.push({
      category: 'financial_health',
      action: 'Complete financial audit',
      scoreImpact: 1500 - score,
      priority: 'medium',
      deadline: '60 days'
    });
  }

  return { score, items, improvements };
}

function calculateGovernanceScore(entity: any) {
  const items: any[] = [];
  let score = 0;
  const improvements: any[] = [];

  // Board Composition
  const boardScore = entity?.directors?.length >= 2 ? 400 : 200;
  score += boardScore;
  items.push({ name: 'Board Composition', score: boardScore, max: 400, status: boardScore >= 300 ? 'complete' : 'pending' });

  // Shareholder Agreement
  const shaScore = entity?.shareholderAgreement ? 300 : 100;
  score += shaScore;
  items.push({ name: 'Shareholder Agreement', score: shaScore, max: 300, status: shaScore >= 200 ? 'complete' : 'pending' });

  // ESOP Policy
  const esopScore = entity?.esopPolicy ? 200 : 50;
  score += esopScore;
  items.push({ name: 'ESOP Policy', score: esopScore, max: 200, status: esopScore >= 150 ? 'complete' : 'pending' });

  // Conflict of Interest Policy
  const coiScore = 100; // Default partial
  score += coiScore;
  items.push({ name: 'Conflict of Interest Policy', score: coiScore, max: 100, status: 'partial' });

  if (score < 800) {
    improvements.push({
      category: 'governance',
      action: 'Establish formal governance policies',
      scoreImpact: 1000 - score,
      priority: 'low',
      deadline: '90 days'
    });
  }

  return { score, items, improvements };
}

function calculateLegalScore(entity: any) {
  const items: any[] = [];
  let score = 0;
  const improvements: any[] = [];

  // No Litigation
  const litScore = 400;
  score += litScore;
  items.push({ name: 'Litigation Status', score: litScore, max: 400, status: 'clear' });

  // IP Protection
  const ipScore = entity?.trademarkRegistered ? 300 : 100;
  score += ipScore;
  items.push({ name: 'IP Protection', score: ipScore, max: 300, status: ipScore >= 200 ? 'protected' : 'pending' });

  // Regulatory Compliance
  const regScore = 200;
  score += regScore;
  items.push({ name: 'Regulatory Compliance', score: regScore, max: 200, status: 'compliant' });

  // Data Protection
  const dataScore = 100;
  score += dataScore;
  items.push({ name: 'Data Protection', score: dataScore, max: 100, status: 'partial' });

  if (score < 800) {
    improvements.push({
      category: 'legal_standing',
      action: 'Register trademark and strengthen IP protection',
      scoreImpact: 1000 - score,
      priority: 'medium',
      deadline: '60 days'
    });
  }

  return { score, items, improvements };
}

function determineFundingStage(score: number, readiness: number): any {
  if (score >= 8500 && readiness >= 85) {
    return { stage: 'Series A+', eligible: true, confidence: 'high' };
  } else if (score >= 7500 && readiness >= 75) {
    return { stage: 'Series A', eligible: true, confidence: 'high' };
  } else if (score >= 6500 && readiness >= 65) {
    return { stage: 'Seed', eligible: true, confidence: 'medium' };
  } else if (score >= 5000 && readiness >= 50) {
    return { stage: 'Pre-Seed', eligible: true, confidence: 'medium' };
  } else {
    return { stage: 'Angel', eligible: readiness >= 40, confidence: 'low' };
  }
}

function generateInvestorView(scores: any, entity: any) {
  const overallScore = Object.values(scores.categories).reduce((sum: number, cat: any) => sum + cat.score, 0);

  return {
    summary: overallScore >= 7500 ? 'Investment Ready' : overallScore >= 5000 ? 'Needs Improvement' : 'Early Stage',
    highlights: [
      { label: 'Compliance Status', value: scores.categories.statutory_compliance.status },
      { label: 'Tax Standing', value: scores.categories.tax_compliance.status },
      { label: 'Documentation', value: scores.categories.documentation.status }
    ],
    risks: scores.improvements.filter((i: any) => i.priority === 'high').map((i: any) => i.action),
    recommendation: overallScore >= 7500 ? 'Proceed with due diligence' : 'Address critical gaps first'
  };
}

function generateBenchmarks(score: number, entityType: string | null) {
  return {
    industry: {
      average: 6500,
      top25: 8000,
      bottom25: 5000
    },
    entityType: {
      average: entityType === 'private_limited' ? 7000 : 6000,
      yourPosition: score >= 7000 ? 'Above Average' : 'Below Average'
    },
    funding: {
      seedReady: 6500,
      seriesAReady: 7500,
      yourStatus: score >= 7500 ? 'Series A Ready' : score >= 6500 ? 'Seed Ready' : 'Pre-Seed'
    }
  };
}

async function getCategoryBreakdown(entityId: number, category: string) {
  // Return detailed breakdown for specific category
  const categoryConfig = SCORECARD_CATEGORIES[category as keyof typeof SCORECARD_CATEGORIES];

  return {
    label: categoryConfig.label,
    maxScore: categoryConfig.weight,
    currentScore: Math.round(categoryConfig.weight * 0.7),
    percentage: 70,
    items: [],
    history: [],
    recommendations: []
  };
}

async function getDetailedImprovements(entityId: number, priority?: string) {
  const improvements = [
    { id: 1, action: 'File pending GST returns', category: 'tax_compliance', scoreImpact: 200, priority: 'high', effort: 'low', deadline: '7 days' },
    { id: 2, action: 'Complete ROC annual filing', category: 'statutory_compliance', scoreImpact: 300, priority: 'high', effort: 'medium', deadline: '15 days' },
    { id: 3, action: 'Upload audited financial statements', category: 'documentation', scoreImpact: 150, priority: 'medium', effort: 'medium', deadline: '30 days' },
    { id: 4, action: 'Register trademark', category: 'legal_standing', scoreImpact: 100, priority: 'low', effort: 'high', deadline: '60 days' },
    { id: 5, action: 'Establish ESOP policy', category: 'governance', scoreImpact: 100, priority: 'low', effort: 'high', deadline: '90 days' }
  ];

  if (priority) {
    return improvements.filter(i => i.priority === priority);
  }
  return improvements;
}

async function getFundingChecklist(entityId: number, stage: string) {
  const seedChecklist = [
    { item: 'Certificate of Incorporation', status: 'complete', critical: true },
    { item: 'PAN & TAN Registration', status: 'complete', critical: true },
    { item: 'GST Registration', status: 'complete', critical: true },
    { item: 'Bank Account', status: 'complete', critical: true },
    { item: 'Shareholder Agreement', status: 'pending', critical: true },
    { item: 'Audited Financials', status: 'missing', critical: true },
    { item: 'Board Resolutions', status: 'pending', critical: false },
    { item: 'IP Assignment', status: 'missing', critical: false },
    { item: 'Employment Agreements', status: 'pending', critical: false },
    { item: 'ESOP Pool', status: 'missing', critical: false }
  ];

  const seriesAChecklist = [
    ...seedChecklist,
    { item: '2 Years Audited Financials', status: 'missing', critical: true },
    { item: 'Board Composition (Independent Director)', status: 'missing', critical: true },
    { item: 'D&O Insurance', status: 'missing', critical: false },
    { item: 'Trademark Registration', status: 'pending', critical: false }
  ];

  return stage === 'series_a' ? seriesAChecklist : seedChecklist;
}

export default router;
