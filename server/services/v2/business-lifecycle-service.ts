/**
 * Business Lifecycle Management Service
 * 
 * CORE PRINCIPLE: Compliance and Documentation drive everything
 * 
 * Lifecycle Stages (All compliance-driven):
 * 1. FORMATION: Registration → Licensing → Setup Compliance
 * 2. OPERATION: Monthly/Quarterly/Annual Compliance → Documentation
 * 3. GROWTH: Funding Readiness → Due Diligence → Investment Compliance
 * 4. SCALE: Enterprise Compliance → Listing Readiness → Board Governance
 * 5. EXIT: Closure/M&A Compliance → Final Audits → Deregistration
 * 
 * Following patterns from:
 * - Carta: Cap table + compliance integration
 * - Stripe Atlas: Company formation + compliance automation
 * - Gusto: Payroll compliance lifecycle
 * - Clerky: Legal + compliance documentation
 */

import { pool } from '../../db';
import * as ComplianceService from './compliance-service';
import * as DocumentService from './document-management-service';
import * as ServiceCatalogService from './service-catalog-service';

export type BusinessStage = 
  | 'idea'              // Pre-registration
  | 'formation'         // Registration in progress
  | 'early_stage'       // 0-2 years, basic compliance
  | 'growth'            // 2-5 years, scaling compliance
  | 'funded'            // Post-funding, investor compliance
  | 'mature'            // 5+ years, enterprise compliance
  | 'pre_ipo'           // Listing readiness
  | 'public'            // Listed company compliance
  | 'exit'              // M&A or closure process
  | 'closed';           // Deregistered

export type BusinessSize = 'startup' | 'sme' | 'enterprise';

export type IndustryType = 
  | 'technology'
  | 'fintech'
  | 'healthcare'
  | 'ecommerce'
  | 'manufacturing'
  | 'services'
  | 'education'
  | 'retail'
  | 'consulting'
  | 'other';

export type IndianStateCode = 
  | 'MH' | 'KA' | 'DL' | 'GJ' | 'TN' | 'UP' | 'MP' | 'RJ' | 'HR' | 'PB'
  | 'WB' | 'OR' | 'AP' | 'TS' | 'KL' | 'AS' | 'BR' | 'CG' | 'GA' | 'HP'
  | 'JH' | 'UK' | 'MN' | 'ML' | 'MZ' | 'NL' | 'SK' | 'TR' | 'AR';

export interface BusinessMetrics {
  annualRevenue?: number;
  monthlyRevenue?: number;
  employeeCount?: number;
  fundingRaised?: number;
  profitabilityStatus?: 'pre_revenue' | 'loss_making' | 'profitable';
  burnRate?: number;
  runwayMonths?: number;
  revenueGrowthRate?: number;
  employeeGrowthRate?: number;
}

export interface ComplianceGap {
  id: string;
  type: 'service' | 'document' | 'checkpoint' | 'license';
  identifier: string;
  category: 'critical' | 'high' | 'medium' | 'low';
  deadline?: Date;
  estimatedResolutionHours: number;
  estimatedCost?: number;
  impactOnFunding: 'blocker' | 'high' | 'medium' | 'low';
  impactOnOperations?: string;
  penaltyExposure?: number;
  recommendedActions: {
    action: string;
    serviceKey?: string;
    estimatedCost?: number;
    timeline?: string;
  }[];
  status: 'open' | 'in_progress' | 'resolved' | 'waived';
}

export interface RiskScore {
  regulatoryRisk: number;  // 0-100
  financialRisk: number;   // 0-100
  operationalRisk: number; // 0-100
  complianceRisk: number;  // 0-100
  overallRisk: number;     // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: {
    factor: string;
    severity: number;
    mitigation: string;
  }[];
  trend?: 'improving' | 'stable' | 'deteriorating';
}

export interface StageTransitionTrigger {
  triggerType: 'time_based' | 'metric_based' | 'completion_based' | 'manual';
  condition: string;
  targetStage: BusinessStage;
  notificationTemplate?: string;
  autoTransition: boolean;
}

export interface LifecycleStageConfig {
  stage: BusinessStage;
  displayName: string;
  description: string;
  typicalDuration: string;
  complianceIntensity: 'low' | 'medium' | 'high' | 'critical';
  requiredServices: string[]; // Service keys that are mandatory
  recommendedServices: string[]; // Service keys that are recommended
  criticalDocuments: string[]; // Document keys that must be maintained
  governanceRequirements: string[];
  complianceCheckpoints: ComplianceCheckpoint[];
  fundingReadinessScore?: number; // 0-100 for funded stages
}

export interface ComplianceCheckpoint {
  name: string;
  description: string;
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  penaltyForMiss: string;
  documentationRequired: string[];
}

/**
 * LIFECYCLE STAGE CONFIGURATIONS
 * Each stage is compliance-centric with specific documentation requirements
 */
export const LIFECYCLE_STAGES: Record<BusinessStage, LifecycleStageConfig> = {
  idea: {
    stage: 'idea',
    displayName: 'Idea Stage',
    description: 'Pre-registration planning phase',
    typicalDuration: '1-3 months',
    complianceIntensity: 'low',
    requiredServices: [],
    recommendedServices: ['startup_india_registration'],
    criticalDocuments: ['founder_agreement'],
    governanceRequirements: ['Founder discussions documented'],
    complianceCheckpoints: []
  },

  formation: {
    stage: 'formation',
    displayName: 'Company Formation',
    description: 'Registration and initial compliance setup',
    typicalDuration: '2-4 weeks',
    complianceIntensity: 'high',
    requiredServices: [
      'pvt_ltd_incorporation',
      'pan_application',
      'tan_registration',
      'gst_registration',
      'bank_account_opening'
    ],
    recommendedServices: [
      'trademark_registration',
      'startup_india_registration',
      'shops_establishments'
    ],
    criticalDocuments: [
      'certificate_of_incorporation',
      'pan_card',
      'moa',
      'aoa',
      'gst_certificate',
      'bank_account_details'
    ],
    governanceRequirements: [
      'First Board Meeting conducted',
      'Statutory registers maintained',
      'Company seal created'
    ],
    complianceCheckpoints: [
      {
        name: 'ROC Filing - Incorporation',
        description: 'File incorporation documents with ROC',
        frequency: 'one_time',
        penaltyForMiss: 'Registration rejected',
        documentationRequired: ['moa', 'aoa', 'id_proofs']
      }
    ]
  },

  early_stage: {
    stage: 'early_stage',
    displayName: 'Early Stage (0-2 Years)',
    description: 'Basic operational compliance',
    typicalDuration: '0-24 months',
    complianceIntensity: 'medium',
    requiredServices: [
      'gst_returns',
      'tds_quarterly',
      'annual_filings_roc',
      'itr_company',
      'accounting_monthly'
    ],
    recommendedServices: [
      'pf_esi_monthly',
      'payroll_processing',
      'bookkeeping',
      'virtual_cfo'
    ],
    criticalDocuments: [
      'gstr1',
      'gstr3b',
      'balance_sheet',
      'profit_loss_statement',
      'bank_statement',
      'sales_register',
      'purchase_register'
    ],
    governanceRequirements: [
      'Quarterly board meetings',
      'Annual General Meeting (AGM)',
      'Financial statements preparation',
      'Statutory audit completion'
    ],
    complianceCheckpoints: [
      {
        name: 'GST Returns',
        description: 'File GSTR-1 and GSTR-3B monthly',
        frequency: 'monthly',
        penaltyForMiss: '₹200/day, max ₹5,000',
        documentationRequired: ['sales_register', 'purchase_register']
      },
      {
        name: 'TDS Returns',
        description: 'File quarterly TDS returns',
        frequency: 'quarterly',
        penaltyForMiss: '₹200/day',
        documentationRequired: ['salary_register', 'tds_challan']
      },
      {
        name: 'Annual ROC Filing',
        description: 'File AOC-4 and MGT-7',
        frequency: 'annual',
        penaltyForMiss: '₹100/day, director penalties',
        documentationRequired: ['balance_sheet', 'profit_loss_statement', 'audit_report']
      }
    ],
    fundingReadinessScore: 40
  },

  growth: {
    stage: 'growth',
    displayName: 'Growth Stage (2-5 Years)',
    description: 'Scaling with enhanced compliance',
    typicalDuration: '24-60 months',
    complianceIntensity: 'high',
    requiredServices: [
      'gst_returns',
      'tds_quarterly',
      'annual_filings_roc',
      'itr_company',
      'accounting_monthly',
      'pf_esi_monthly',
      'tax_audit'
    ],
    recommendedServices: [
      'virtual_cfo',
      'financial_projections',
      'mis_reporting',
      'internal_audit',
      'secretarial_compliance'
    ],
    criticalDocuments: [
      'audited_financials',
      'tax_audit_report',
      'compliance_certificates',
      'board_resolutions',
      'shareholder_agreements',
      'employment_contracts'
    ],
    governanceRequirements: [
      'Monthly board meetings',
      'Quarterly financial reviews',
      'Annual audit completion',
      'Secretarial audit (if applicable)',
      'Policy documentation (HR, Finance, IT)'
    ],
    complianceCheckpoints: [
      {
        name: 'Tax Audit',
        description: 'Mandatory if turnover > ₹1 crore',
        frequency: 'annual',
        penaltyForMiss: '0.5% of turnover',
        documentationRequired: ['complete_books', 'bank_statements', 'invoices']
      },
      {
        name: 'Secretarial Audit',
        description: 'If paid-up capital > ₹50L or turnover > ₹25Cr',
        frequency: 'annual',
        penaltyForMiss: '₹1 lakh + ₹500/day',
        documentationRequired: ['board_minutes', 'agm_minutes', 'statutory_registers']
      }
    ],
    fundingReadinessScore: 70
  },

  funded: {
    stage: 'funded',
    displayName: 'Funded Company',
    description: 'Post-funding compliance and investor reporting',
    typicalDuration: 'Ongoing',
    complianceIntensity: 'critical',
    requiredServices: [
      'gst_returns',
      'tds_quarterly',
      'annual_filings_roc',
      'itr_company',
      'accounting_monthly',
      'pf_esi_monthly',
      'tax_audit',
      'secretarial_compliance',
      'virtual_cfo',
      'mis_reporting'
    ],
    recommendedServices: [
      'quarterly_investor_reporting',
      'cap_table_management',
      'esop_management',
      'internal_audit',
      'transfer_pricing_study'
    ],
    criticalDocuments: [
      'audited_financials',
      'investor_reports',
      'board_resolutions',
      'shareholder_agreements',
      'sha_amendments',
      'valuation_reports',
      'cap_table',
      'esop_grant_letters',
      'compliance_certificates'
    ],
    governanceRequirements: [
      'Monthly board meetings with investor directors',
      'Quarterly investor reporting (MIS)',
      'Annual audit + tax audit',
      'Cap table reconciliation',
      'Compliance certifications for investors',
      'Budget vs actual variance reporting'
    ],
    complianceCheckpoints: [
      {
        name: 'Investor Reporting',
        description: 'Quarterly MIS reports to investors',
        frequency: 'quarterly',
        penaltyForMiss: 'SHA breach, funding issues',
        documentationRequired: ['financial_statements', 'metrics_dashboard', 'variance_analysis']
      },
      {
        name: 'ESOP Compliance',
        description: 'ESOP grants, vesting, and reporting',
        frequency: 'quarterly',
        penaltyForMiss: 'Tax implications for employees',
        documentationRequired: ['esop_scheme', 'grant_letters', 'vesting_schedule']
      },
      {
        name: 'Transfer Pricing',
        description: 'If international transactions',
        frequency: 'annual',
        penaltyForMiss: '100-300% of tax shortfall',
        documentationRequired: ['tp_study', 'form_3ceb', 'international_invoices']
      }
    ],
    fundingReadinessScore: 85
  },

  mature: {
    stage: 'mature',
    displayName: 'Mature Enterprise',
    description: 'Enterprise-level compliance and governance',
    typicalDuration: '5+ years',
    complianceIntensity: 'critical',
    requiredServices: [
      'gst_returns',
      'tds_quarterly',
      'annual_filings_roc',
      'itr_company',
      'accounting_monthly',
      'pf_esi_monthly',
      'tax_audit',
      'secretarial_audit',
      'internal_audit',
      'virtual_cfo'
    ],
    recommendedServices: [
      'cost_audit',
      'transfer_pricing_study',
      'esg_reporting',
      'data_privacy_compliance',
      'iso_certification'
    ],
    criticalDocuments: [
      'audited_financials',
      'audit_committee_reports',
      'internal_audit_reports',
      'secretarial_audit_report',
      'cost_audit_report',
      'board_evaluation_reports',
      'whistle_blower_policy',
      'related_party_transactions'
    ],
    governanceRequirements: [
      'Independent directors on board',
      'Audit committee formation',
      'Nomination & remuneration committee',
      'Quarterly board meetings',
      'Annual board evaluation',
      'CSR compliance (if applicable)',
      'Robust internal controls'
    ],
    complianceCheckpoints: [
      {
        name: 'Internal Audit',
        description: 'Quarterly internal audit reviews',
        frequency: 'quarterly',
        penaltyForMiss: 'Governance failure, fraud risk',
        documentationRequired: ['audit_reports', 'control_matrices', 'finding_trackers']
      },
      {
        name: 'Cost Audit',
        description: 'If turnover > ₹35 crore (manufacturing)',
        frequency: 'annual',
        penaltyForMiss: '₹5 lakh penalty',
        documentationRequired: ['cost_records', 'production_data', 'inventory_records']
      }
    ],
    fundingReadinessScore: 90
  },

  pre_ipo: {
    stage: 'pre_ipo',
    displayName: 'Pre-IPO / Listing Readiness',
    description: 'Preparing for public listing',
    typicalDuration: '12-24 months',
    complianceIntensity: 'critical',
    requiredServices: [
      'listing_compliance_setup',
      'sebi_filing_preparation',
      'corporate_governance_audit',
      'internal_financial_controls',
      'quarterly_results_preparation'
    ],
    recommendedServices: [
      'investor_relations_setup',
      'press_release_management',
      'analyst_coverage_prep'
    ],
    criticalDocuments: [
      'drhp',
      'prospectus',
      'due_diligence_reports',
      'legal_opinions',
      'valuation_reports',
      'materiality_policies',
      'vigil_mechanism_policy',
      'code_of_conduct'
    ],
    governanceRequirements: [
      'Independent director majority',
      'All 4 board committees active',
      'Quarterly compliance certificates',
      'Related party transaction approvals',
      'Material event disclosures',
      'Insider trading regulations'
    ],
    complianceCheckpoints: [
      {
        name: 'SEBI Due Diligence',
        description: 'Complete due diligence for listing',
        frequency: 'one_time',
        penaltyForMiss: 'IPO rejection',
        documentationRequired: ['3_years_audited_financials', 'all_statutory_compliances', 'litigation_details']
      },
      {
        name: 'Corporate Governance',
        description: 'SEBI Listing Regulations compliance',
        frequency: 'quarterly',
        penaltyForMiss: 'Listing rejection/suspension',
        documentationRequired: ['governance_reports', 'board_minutes', 'committee_minutes']
      }
    ],
    fundingReadinessScore: 95
  },

  public: {
    stage: 'public',
    displayName: 'Listed Company',
    description: 'Public company compliance',
    typicalDuration: 'Ongoing',
    complianceIntensity: 'critical',
    requiredServices: [
      'quarterly_results_filing',
      'annual_report_preparation',
      'shareholder_meeting_management',
      'continuous_disclosure_management'
    ],
    recommendedServices: [
      'investor_relations',
      'analyst_coverage',
      'esg_reporting'
    ],
    criticalDocuments: [
      'quarterly_results',
      'annual_report',
      'disclosure_filings',
      'material_event_disclosures',
      'shareholding_pattern'
    ],
    governanceRequirements: [
      'Full SEBI compliance',
      'Quarterly board meetings',
      'All committee meetings',
      'Timely disclosures to exchanges',
      'Insider trading monitoring'
    ],
    complianceCheckpoints: [
      {
        name: 'Quarterly Results',
        description: 'File results within 45 days',
        frequency: 'quarterly',
        penaltyForMiss: '₹1 lakh/day',
        documentationRequired: ['financial_statements', 'limited_review_report']
      }
    ],
    fundingReadinessScore: 100
  },

  exit: {
    stage: 'exit',
    displayName: 'Exit / Closure',
    description: 'M&A or company closure process',
    typicalDuration: '3-12 months',
    complianceIntensity: 'high',
    requiredServices: [
      'strike_off_filing',
      'final_accounts_preparation',
      'noc_from_authorities'
    ],
    recommendedServices: [
      'due_diligence_support',
      'valuation_services'
    ],
    criticalDocuments: [
      'final_accounts',
      'clearance_certificates',
      'noc_documents',
      'closure_resolutions'
    ],
    governanceRequirements: [
      'Shareholder approval for closure',
      'Creditor settlements',
      'Employee settlements',
      'Final statutory filings'
    ],
    complianceCheckpoints: [
      {
        name: 'ROC Strike-off',
        description: 'File for company strike-off',
        frequency: 'one_time',
        penaltyForMiss: 'Continued compliance burden',
        documentationRequired: ['final_returns', 'bank_closure', 'noc_from_authorities']
      }
    ]
  },

  closed: {
    stage: 'closed',
    displayName: 'Closed',
    description: 'Company deregistered',
    typicalDuration: 'Terminal state',
    complianceIntensity: 'low',
    requiredServices: [],
    recommendedServices: [],
    criticalDocuments: ['closure_certificate'],
    governanceRequirements: ['Archive all records for 8 years'],
    complianceCheckpoints: []
  }
};

/**
 * Log stage transition for audit trail
 */
export async function logStageTransition(
  clientId: number,
  fromStage: BusinessStage | null,
  toStage: BusinessStage,
  triggeredBy: 'system' | 'user' | 'compliance' | 'manual',
  triggeredByUserId?: string,
  reason?: string,
  metricsSnapshot?: BusinessMetrics,
  complianceSnapshot?: any
): Promise<void> {
  await pool.query(
    `INSERT INTO client_stage_history 
     (client_id, from_stage, to_stage, triggered_by, triggered_by_user_id, reason, metrics_snapshot, compliance_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      clientId,
      fromStage,
      toStage,
      triggeredBy,
      triggeredByUserId || null,
      reason || null,
      metricsSnapshot ? JSON.stringify(metricsSnapshot) : null,
      complianceSnapshot ? JSON.stringify(complianceSnapshot) : null
    ]
  );

  // Update client's current stage
  await pool.query(
    'UPDATE clients SET current_lifecycle_stage = $1, stage_last_updated = CURRENT_TIMESTAMP WHERE id = $2',
    [toStage, clientId]
  );
}

/**
 * Get stage transition history
 */
export async function getStageHistory(clientId: number): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM client_stage_history 
     WHERE client_id = $1 
     ORDER BY transitioned_at DESC`,
    [clientId]
  );
  return result.rows;
}

/**
 * Get client's current lifecycle stage
 */
export async function getClientLifecycleStage(clientId: number): Promise<{
  currentStage: BusinessStage;
  stageConfig: LifecycleStageConfig;
  stageProgress: number;
  nextStage?: BusinessStage;
  complianceGaps: string[];
  documentationGaps: string[];
}> {
  const client = await pool.query(
    'SELECT incorporation_date, business_type, industry, status FROM clients WHERE id = $1',
    [clientId]
  );

  if (client.rows.length === 0) {
    throw new Error('Client not found');
  }

  // Determine current stage based on age and metrics
  const incorporationDate = client.rows[0].incorporation_date;
  const currentStage = await determineStage(clientId, incorporationDate);
  const stageConfig = LIFECYCLE_STAGES[currentStage];

  // Calculate progress in current stage
  const progress = await calculateStageProgress(clientId, currentStage);

  // Identify gaps
  const gaps = await identifyComplianceGaps(clientId, stageConfig);

  return {
    currentStage,
    stageConfig,
    stageProgress: progress,
    nextStage: getNextStage(currentStage),
    complianceGaps: gaps.complianceGaps,
    documentationGaps: gaps.documentationGaps
  };
}

/**
 * Determine current stage based on business metrics
 */
async function determineStage(clientId: number, incorporationDate: Date | null): Promise<BusinessStage> {
  if (!incorporationDate) return 'idea';

  const ageInMonths = Math.floor(
    (Date.now() - new Date(incorporationDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  // Check for funding indicators
  const fundingResult = await pool.query(
    `SELECT COUNT(*) as funding_rounds 
     FROM client_funding_rounds 
     WHERE client_id = $1`,
    [clientId]
  );

  const hasFunding = fundingResult.rows[0]?.funding_rounds > 0;

  // Check for listing indicators
  const listingResult = await pool.query(
    `SELECT listing_status FROM clients WHERE id = $1`,
    [clientId]
  );

  if (listingResult.rows[0]?.listing_status === 'listed') return 'public';
  if (listingResult.rows[0]?.listing_status === 'pre_ipo') return 'pre_ipo';

  // Age-based + funding-based determination
  if (hasFunding) return 'funded';
  if (ageInMonths < 24) return 'early_stage';
  if (ageInMonths < 60) return 'growth';
  return 'mature';
}

/**
 * Calculate progress in current stage (0-100)
 */
async function calculateStageProgress(clientId: number, stage: BusinessStage): Promise<number> {
  const config = LIFECYCLE_STAGES[stage];
  
  // Get subscribed services
  const services = await ServiceCatalogService.getClientServices(clientId);
  const subscribedServices = services.map(s => s.serviceKey);
  
  // Calculate service completion
  const requiredServicesCount = config.requiredServices.length;
  const subscribedRequiredCount = config.requiredServices.filter(s => 
    subscribedServices.includes(s)
  ).length;
  
  // Get documents
  const documents = await pool.query(
    'SELECT document_key FROM client_documents WHERE client_id = $1 AND status = \'verified\'',
    [clientId]
  );
  const verifiedDocs = documents.rows.map(d => d.document_key);
  
  // Calculate document completion
  const criticalDocsCount = config.criticalDocuments.length;
  const verifiedCriticalCount = config.criticalDocuments.filter(d => 
    verifiedDocs.includes(d)
  ).length;
  
  // Weighted average: 60% services, 40% documents
  const serviceScore = requiredServicesCount > 0 
    ? (subscribedRequiredCount / requiredServicesCount) * 60 
    : 60;
    
  const docScore = criticalDocsCount > 0 
    ? (verifiedCriticalCount / criticalDocsCount) * 40 
    : 40;
  
  return Math.round(serviceScore + docScore);
}

/**
 * Identify compliance and documentation gaps
 */
async function identifyComplianceGaps(
  clientId: number, 
  config: LifecycleStageConfig
): Promise<{ complianceGaps: string[]; documentationGaps: string[] }> {
  const services = await ServiceCatalogService.getClientServices(clientId);
  const subscribedServices = services.map(s => s.serviceKey);
  
  const complianceGaps = config.requiredServices.filter(s => 
    !subscribedServices.includes(s)
  );
  
  const documents = await pool.query(
    'SELECT document_key FROM client_documents WHERE client_id = $1 AND status = \'verified\'',
    [clientId]
  );
  const verifiedDocs = documents.rows.map(d => d.document_key);
  
  const documentationGaps = config.criticalDocuments.filter(d => 
    !verifiedDocs.includes(d)
  );
  
  return { complianceGaps, documentationGaps };
}

/**
 * Get next stage in lifecycle
 */
function getNextStage(currentStage: BusinessStage): BusinessStage | undefined {
  const progression: Record<BusinessStage, BusinessStage | undefined> = {
    idea: 'formation',
    formation: 'early_stage',
    early_stage: 'growth',
    growth: 'mature',
    funded: 'mature',
    mature: 'pre_ipo',
    pre_ipo: 'public',
    public: undefined,
    exit: 'closed',
    closed: undefined
  };
  
  return progression[currentStage];
}

/**
 * Get funding readiness assessment (compliance-driven)
 */
export async function getFundingReadinessAssessment(clientId: number): Promise<{
  overallScore: number;
  complianceScore: number;
  documentationScore: number;
  governanceScore: number;
  gaps: string[];
  recommendations: string[];
}> {
  const lifecycle = await getClientLifecycleStage(clientId);
  const complianceState = await ComplianceService.getComplianceState(clientId);
  
  // Compliance score (40%)
  const complianceScore = complianceState?.overallState === 'GREEN' ? 100 : 
                         complianceState?.overallState === 'AMBER' ? 70 : 40;
  
  // Documentation score (35%)
  const docResult = await pool.query(
    `SELECT COUNT(*) as total, 
            COUNT(*) FILTER (WHERE status = 'verified') as verified
     FROM client_documents 
     WHERE client_id = $1`,
    [clientId]
  );
  const docScore = docResult.rows[0].total > 0 
    ? (docResult.rows[0].verified / docResult.rows[0].total) * 100 
    : 0;
  
  // Governance score (25%)
  const governanceScore = lifecycle.stageProgress;
  
  // Overall weighted score
  const overallScore = Math.round(
    (complianceScore * 0.4) + (docScore * 0.35) + (governanceScore * 0.25)
  );
  
  const gaps = [
    ...lifecycle.complianceGaps.map(g => `Missing service: ${g}`),
    ...lifecycle.documentationGaps.map(g => `Missing document: ${g}`)
  ];
  
  const recommendations = generateFundingRecommendations(
    overallScore,
    complianceScore,
    docScore,
    governanceScore
  );
  
  return {
    overallScore,
    complianceScore,
    documentationScore: Math.round(docScore),
    governanceScore: Math.round(governanceScore),
    gaps,
    recommendations
  };
}

/**
 * Calculate comprehensive risk score
 */
export async function calculateComplianceRiskScore(clientId: number): Promise<RiskScore> {
  const lifecycle = await getClientLifecycleStage(clientId);
  const complianceState = await ComplianceService.getComplianceState(clientId);
  
  const riskFactors: RiskScore['riskFactors'] = [];
  
  // Regulatory Risk (0-100, higher = more risk)
  let regulatoryRisk = 0;
  if (complianceState?.overallState === 'RED') {
    regulatoryRisk = 80;
    riskFactors.push({
      factor: 'Critical compliance violations',
      severity: 80,
      mitigation: 'Resolve all RED compliance items immediately'
    });
  } else if (complianceState?.overallState === 'AMBER') {
    regulatoryRisk = 40;
    riskFactors.push({
      factor: 'Pending compliance actions',
      severity: 40,
      mitigation: 'Complete pending compliance actions within deadlines'
    });
  }
  
  // Add penalty exposure risk
  const penaltyExposure = complianceState?.totalPenaltyExposure || 0;
  if (penaltyExposure > 100000) {
    regulatoryRisk = Math.min(100, regulatoryRisk + 20);
    riskFactors.push({
      factor: `High penalty exposure: ₹${penaltyExposure.toLocaleString()}`,
      severity: 70,
      mitigation: 'Prioritize high-penalty compliance items'
    });
  }
  
  // Financial Risk
  const metrics = await getClientMetrics(clientId);
  let financialRisk = 0;
  if (metrics) {
    if (metrics.profitabilityStatus === 'loss_making' && metrics.runwayMonths && metrics.runwayMonths < 6) {
      financialRisk = 80;
      riskFactors.push({
        factor: 'Low cash runway (<6 months)',
        severity: 80,
        mitigation: 'Secure funding or reduce burn rate'
      });
    } else if (metrics.profitabilityStatus === 'loss_making') {
      financialRisk = 40;
    }
  }
  
  // Operational Risk
  let operationalRisk = 0;
  const docGaps = lifecycle.documentationGaps.length;
  if (docGaps > 5) {
    operationalRisk = 60;
    riskFactors.push({
      factor: `${docGaps} critical documents missing`,
      severity: 60,
      mitigation: 'Upload and verify all critical documents'
    });
  } else if (docGaps > 0) {
    operationalRisk = 30;
  }
  
  // Compliance Risk (process maturity)
  let complianceRisk = 0;
  const stageProgress = lifecycle.stageProgress;
  if (stageProgress < 50) {
    complianceRisk = 60;
    riskFactors.push({
      factor: 'Low compliance maturity for current stage',
      severity: 60,
      mitigation: 'Complete required services and document uploads'
    });
  } else if (stageProgress < 80) {
    complianceRisk = 30;
  }
  
  // Calculate overall risk (weighted average)
  const overallRisk = Math.round(
    (regulatoryRisk * 0.35) + 
    (financialRisk * 0.25) + 
    (operationalRisk * 0.20) + 
    (complianceRisk * 0.20)
  );
  
  // Determine risk level
  let riskLevel: RiskScore['riskLevel'];
  if (overallRisk >= 70) riskLevel = 'critical';
  else if (overallRisk >= 50) riskLevel = 'high';
  else if (overallRisk >= 30) riskLevel = 'medium';
  else riskLevel = 'low';
  
  const riskScore: RiskScore = {
    regulatoryRisk,
    financialRisk,
    operationalRisk,
    complianceRisk,
    overallRisk,
    riskLevel,
    riskFactors
  };
  
  // Save to history
  await pool.query(
    `INSERT INTO client_risk_scores 
     (client_id, regulatory_risk_score, financial_risk_score, operational_risk_score, 
      compliance_risk_score, overall_risk_score, risk_level, risk_factors)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      clientId,
      regulatoryRisk,
      financialRisk,
      operationalRisk,
      complianceRisk,
      overallRisk,
      riskLevel,
      JSON.stringify(riskFactors)
    ]
  );
  
  return riskScore;
}

/**
 * Get or update client metrics
 */
export async function getClientMetrics(clientId: number): Promise<BusinessMetrics | null> {
  const result = await pool.query(
    `SELECT * FROM client_business_metrics 
     WHERE client_id = $1 
     ORDER BY metric_date DESC 
     LIMIT 1`,
    [clientId]
  );
  
  if (result.rows.length === 0) {
    // Try to get from clients table
    const clientResult = await pool.query(
      'SELECT annual_revenue, employee_count, funding_raised FROM clients WHERE id = $1',
      [clientId]
    );
    
    if (clientResult.rows.length > 0) {
      return {
        annualRevenue: clientResult.rows[0].annual_revenue,
        employeeCount: clientResult.rows[0].employee_count,
        fundingRaised: clientResult.rows[0].funding_raised
      };
    }
    
    return null;
  }
  
  const row = result.rows[0];
  return {
    annualRevenue: row.annual_revenue,
    monthlyRevenue: row.monthly_revenue,
    employeeCount: row.employee_count,
    fundingRaised: row.funding_raised,
    profitabilityStatus: row.profitability_status,
    burnRate: row.burn_rate,
    runwayMonths: row.runway_months,
    revenueGrowthRate: row.revenue_growth_rate,
    employeeGrowthRate: row.employee_growth_rate
  };
}

/**
 * Update client metrics
 */
export async function updateClientMetrics(
  clientId: number,
  metrics: BusinessMetrics,
  metricDate: Date = new Date()
): Promise<void> {
  await pool.query(
    `INSERT INTO client_business_metrics 
     (client_id, metric_date, annual_revenue, monthly_revenue, employee_count, 
      funding_raised, profitability_status, burn_rate, runway_months,
      revenue_growth_rate, employee_growth_rate)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (client_id, metric_date) 
     DO UPDATE SET
       annual_revenue = EXCLUDED.annual_revenue,
       monthly_revenue = EXCLUDED.monthly_revenue,
       employee_count = EXCLUDED.employee_count,
       funding_raised = EXCLUDED.funding_raised,
       profitability_status = EXCLUDED.profitability_status,
       burn_rate = EXCLUDED.burn_rate,
       runway_months = EXCLUDED.runway_months,
       revenue_growth_rate = EXCLUDED.revenue_growth_rate,
       employee_growth_rate = EXCLUDED.employee_growth_rate,
       updated_at = CURRENT_TIMESTAMP`,
    [
      clientId,
      metricDate,
      metrics.annualRevenue || null,
      metrics.monthlyRevenue || null,
      metrics.employeeCount || null,
      metrics.fundingRaised || null,
      metrics.profitabilityStatus || null,
      metrics.burnRate || null,
      metrics.runwayMonths || null,
      metrics.revenueGrowthRate || null,
      metrics.employeeGrowthRate || null
    ]
  );
}

/**
 * Get prioritized compliance gaps with actionable recommendations
 */
export async function getPrioritizedGaps(clientId: number): Promise<ComplianceGap[]> {
  const lifecycle = await getClientLifecycleStage(clientId);
  const gaps: ComplianceGap[] = [];
  
  // Service gaps
  for (const serviceKey of lifecycle.complianceGaps) {
    gaps.push({
      id: `service_${serviceKey}`,
      type: 'service',
      identifier: serviceKey,
      category: 'critical', // All required services are critical
      estimatedResolutionHours: 8,
      estimatedCost: 5000,
      impactOnFunding: 'high',
      impactOnOperations: 'Required for compliance in current stage',
      recommendedActions: [
        {
          action: `Subscribe to ${serviceKey} service`,
          serviceKey,
          estimatedCost: 5000,
          timeline: '1-2 weeks'
        }
      ],
      status: 'open'
    });
  }
  
  // Document gaps
  for (const docKey of lifecycle.documentationGaps) {
    gaps.push({
      id: `document_${docKey}`,
      type: 'document',
      identifier: docKey,
      category: 'high',
      estimatedResolutionHours: 4,
      impactOnFunding: docKey.includes('audited') || docKey.includes('financial') ? 'blocker' : 'medium',
      impactOnOperations: 'Critical document missing',
      recommendedActions: [
        {
          action: `Upload and verify ${docKey}`,
          timeline: '1-3 days'
        }
      ],
      status: 'open'
    });
  }
  
  // Save gaps to database
  for (const gap of gaps) {
    await pool.query(
      `INSERT INTO compliance_gap_analysis 
       (client_id, gap_type, gap_identifier, gap_category, impact_on_funding, 
        impact_on_operations, estimated_resolution_hours, estimated_cost, 
        recommended_actions, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      [
        clientId,
        gap.type,
        gap.identifier,
        gap.category,
        gap.impactOnFunding,
        gap.impactOnOperations,
        gap.estimatedResolutionHours,
        gap.estimatedCost || null,
        JSON.stringify(gap.recommendedActions),
        gap.status
      ]
    );
  }
  
  return gaps.sort((a, b) => {
    // Sort by impact on funding, then category
    const fundingImpact = { blocker: 4, high: 3, medium: 2, low: 1 };
    const categoryImpact = { critical: 4, high: 3, medium: 2, low: 1 };
    
    const aScore = (fundingImpact[a.impactOnFunding] * 10) + categoryImpact[a.category];
    const bScore = (fundingImpact[b.impactOnFunding] * 10) + categoryImpact[b.category];
    
    return bScore - aScore;
  });
}

/**
 * Get industry-specific requirements
 */
export async function getIndustryRequirements(
  industryType: IndustryType,
  stage: BusinessStage
): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM industry_compliance_requirements
     WHERE industry_type = $1 
     AND $2 = ANY(applicable_stages)
     ORDER BY is_mandatory DESC, compliance_category`,
    [industryType, stage]
  );
  return result.rows;
}

/**
 * Get state-specific requirements
 */
export async function getStateRequirements(
  stateCode: IndianStateCode,
  businessType?: string
): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM state_compliance_requirements
     WHERE state_code = $1
     AND (applicable_business_types = ARRAY['all'] OR $2 = ANY(applicable_business_types))
     ORDER BY is_mandatory DESC, compliance_category`,
    [stateCode, businessType || 'all']
  );
  return result.rows;
}

/**
 * Generate funding readiness recommendations
 */
function generateFundingRecommendations(
  overall: number,
  compliance: number,
  docs: number,
  governance: number
): string[] {
  const recommendations: string[] = [];
  
  if (compliance < 80) {
    recommendations.push('Achieve GREEN compliance status across all areas');
    recommendations.push('Resolve all pending compliance actions before fundraising');
  }
  
  if (docs < 80) {
    recommendations.push('Complete all critical documentation for investor due diligence');
    recommendations.push('Ensure all financial statements are audited and updated');
  }
  
  if (governance < 70) {
    recommendations.push('Strengthen board governance structure');
    recommendations.push('Implement investor-friendly policies (ESOP, SHA, etc.)');
  }
  
  if (overall < 75) {
    recommendations.push('Recommended timeline: 3-6 months before fundraising');
  } else if (overall < 85) {
    recommendations.push('Recommended timeline: 1-3 months before fundraising');
  } else {
    recommendations.push('Funding ready! Maintain compliance during process');
  }
  
  return recommendations;
}
