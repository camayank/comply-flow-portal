/**
 * Business Lifecycle Stages & Service Catalog
 * 
 * Complete journey mapping for Indian businesses:
 * Stage 1: Pre-Incorporation → Registration
 * Stage 2: Post-Incorporation → Licensing & Setup
 * Stage 3: Operations → Regular Compliance
 * Stage 4: Growth → Funding Readiness
 * Stage 5: Funded → Investor Compliance
 * Stage 6: Scale → Multi-entity Management
 * Stage 7: Exit → Closure/M&A
 */

export interface BusinessStage {
  stageKey: string;
  stageName: string;
  description: string;
  typicalDuration: string;
  order: number;
  milestones: string[];
  criticalServices: string[];
  optionalServices: string[];
  fundingRelevance: 'pre_funding' | 'funding_ready' | 'post_funding' | 'all' | 'none';
  complianceIntensity: 'low' | 'medium' | 'high' | 'very_high';
}

export interface LifecycleService {
  serviceKey: string;
  name: string;
  stage: string;
  category: string;
  subcategory?: string;
  mandatoryFor: string[]; // Client types: startup, sme, enterprise
  optionalFor: string[];
  fundingImpact: 'critical' | 'recommended' | 'nice_to_have' | 'none';
  dueDiligenceRelevance: boolean;
  listingRelevance: boolean; // For IPO preparation
  investorVisibility: 'high' | 'medium' | 'low';
  estimatedCost?: { min: number; max: number };
  estimatedTimeline?: string; // "3-5 days", "2-4 weeks"
}

/**
 * BUSINESS LIFECYCLE STAGES
 * Comprehensive stage mapping for Indian businesses
 */
export const BUSINESS_LIFECYCLE_STAGES: BusinessStage[] = [
  {
    stageKey: 'stage_0_ideation',
    stageName: 'Ideation & Planning',
    description: 'Business idea validation, market research, and structure planning',
    typicalDuration: '1-3 months',
    order: 0,
    milestones: [
      'Market research completed',
      'Business model defined',
      'Legal structure decided',
      'Funding requirement estimated'
    ],
    criticalServices: [],
    optionalServices: ['trademark_search', 'business_plan_prep', 'market_research'],
    fundingRelevance: 'pre_funding',
    complianceIntensity: 'low'
  },

  {
    stageKey: 'stage_1_incorporation',
    stageName: 'Business Registration',
    description: 'Company incorporation, trademark registration, and basic compliance setup',
    typicalDuration: '2-4 weeks',
    order: 1,
    milestones: [
      'Company incorporated (CIN issued)',
      'PAN obtained',
      'Bank account opened',
      'Trademark applied/registered'
    ],
    criticalServices: [
      'pvt_ltd_incorporation',
      'llp_incorporation',
      'pan_application',
      'trademark_registration'
    ],
    optionalServices: [
      'startup_india_registration',
      'copyright_registration',
      'domain_registration'
    ],
    fundingRelevance: 'pre_funding',
    complianceIntensity: 'medium'
  },

  {
    stageKey: 'stage_2_licensing',
    stageName: 'Licensing & Permits',
    description: 'Obtain all necessary licenses, registrations, and operational permits',
    typicalDuration: '1-2 months',
    order: 2,
    milestones: [
      'GST registration obtained',
      'Industry-specific licenses secured',
      'PF/ESI registration (if employees)',
      'Professional tax registration'
    ],
    criticalServices: [
      'gst_registration',
      'tan_registration',
      'shops_establishments',
      'trade_license'
    ],
    optionalServices: [
      'fssai_registration',
      'iec_registration',
      'msme_registration',
      'import_export_code'
    ],
    fundingRelevance: 'pre_funding',
    complianceIntensity: 'medium'
  },

  {
    stageKey: 'stage_3_operations',
    stageName: 'Regular Operations',
    description: 'Day-to-day business operations with ongoing compliance',
    typicalDuration: 'Ongoing (6-24 months typically before next stage)',
    order: 3,
    milestones: [
      'First revenue generated',
      'Regular compliance rhythm established',
      'Basic accounting systems in place',
      'Annual filings completed'
    ],
    criticalServices: [
      'gst_returns',
      'tds_quarterly',
      'accounting_monthly',
      'payroll_processing',
      'annual_filings_roc',
      'itr_company'
    ],
    optionalServices: [
      'mis_reports',
      'virtual_cfo',
      'expense_management'
    ],
    fundingRelevance: 'all',
    complianceIntensity: 'high'
  },

  {
    stageKey: 'stage_4_funding_prep',
    stageName: 'Funding Readiness',
    description: 'Preparing for investment with robust compliance and documentation',
    typicalDuration: '3-6 months',
    order: 4,
    milestones: [
      'Data room prepared',
      'Financial statements audited',
      'Valuation report obtained',
      'Due diligence checklist ready',
      'Cap table organized'
    ],
    criticalServices: [
      'statutory_audit',
      'tax_audit',
      'valuation_report',
      'due_diligence_support',
      'financial_projections',
      'cap_table_management'
    ],
    optionalServices: [
      'business_valuation',
      'pitch_deck_financials',
      'investor_ready_compliance'
    ],
    fundingRelevance: 'funding_ready',
    complianceIntensity: 'very_high'
  },

  {
    stageKey: 'stage_5_funded',
    stageName: 'Post-Funding Growth',
    description: 'Managing investor compliance, reporting, and rapid scaling',
    typicalDuration: '12-24 months',
    order: 5,
    milestones: [
      'Investment received and accounted',
      'RBI compliance (if FDI)',
      'Board meetings regularized',
      'MIS reporting to investors',
      'Hire employees and scale operations'
    ],
    criticalServices: [
      'rbi_fdi_reporting',
      'form_fc_gpr',
      'board_meetings',
      'shareholder_agreements',
      'investor_reporting',
      'virtual_cfo'
    ],
    optionalServices: [
      'esop_management',
      'transfer_pricing',
      'internal_audit'
    ],
    fundingRelevance: 'post_funding',
    complianceIntensity: 'very_high'
  },

  {
    stageKey: 'stage_6_scale',
    stageName: 'Scaling & Multi-Entity',
    description: 'Managing multiple entities, subsidiaries, and complex structures',
    typicalDuration: '24+ months',
    order: 6,
    milestones: [
      'Subsidiary companies established',
      'Multi-location operations',
      'International expansion started',
      'Advanced compliance systems',
      'Preparation for Series B/C funding'
    ],
    criticalServices: [
      'holding_subsidiary_structure',
      'transfer_pricing',
      'consolidated_financials',
      'multi_entity_compliance',
      'internal_audit',
      'secretarial_audit'
    ],
    optionalServices: [
      'international_tax_planning',
      'cross_border_transactions',
      'group_restructuring'
    ],
    fundingRelevance: 'post_funding',
    complianceIntensity: 'very_high'
  },

  {
    stageKey: 'stage_7_exit_prep',
    stageName: 'Exit Preparation',
    description: 'IPO readiness, M&A preparation, or strategic exit planning',
    typicalDuration: '12-36 months',
    order: 7,
    milestones: [
      'Listing-grade compliance achieved',
      'Advanced governance structures',
      'Clean legal & tax position',
      'All past compliance rectified',
      'Exit-ready documentation'
    ],
    criticalServices: [
      'ipo_readiness',
      'sebi_compliance',
      'forensic_audit',
      'past_compliance_rectification',
      'legal_due_diligence',
      'exit_structuring'
    ],
    optionalServices: [
      'esg_reporting',
      'corporate_governance',
      'md_a_reporting'
    ],
    fundingRelevance: 'post_funding',
    complianceIntensity: 'very_high'
  },

  {
    stageKey: 'stage_8_closure',
    stageName: 'Closure / Wind-up',
    description: 'Orderly business closure or restructuring',
    typicalDuration: '6-12 months',
    order: 8,
    milestones: [
      'Board resolution for closure',
      'Creditors settled',
      'Employee obligations cleared',
      'Tax clearances obtained',
      'Company struck off'
    ],
    criticalServices: [
      'company_strike_off',
      'llp_closure',
      'tax_clearance',
      'final_returns'
    ],
    optionalServices: [
      'asset_liquidation',
      'legal_closure_support'
    ],
    fundingRelevance: 'none',
    complianceIntensity: 'medium'
  }
];

/**
 * EXTENDED SERVICE CATALOG
 * 150+ services covering entire business lifecycle
 */
export const LIFECYCLE_SERVICES: LifecycleService[] = [
  // ========== STAGE 0: IDEATION ===========
  {
    serviceKey: 'trademark_search',
    name: 'Trademark Availability Search',
    stage: 'stage_0_ideation',
    category: 'intellectual_property',
    mandatoryFor: [],
    optionalFor: ['startup', 'sme', 'enterprise'],
    fundingImpact: 'recommended',
    dueDiligenceRelevance: true,
    listingRelevance: false,
    investorVisibility: 'medium',
    estimatedCost: { min: 2000, max: 5000 },
    estimatedTimeline: '1-2 days'
  },

  // ========== STAGE 1: INCORPORATION ===========
  {
    serviceKey: 'pvt_ltd_incorporation',
    name: 'Private Limited Company Incorporation',
    stage: 'stage_1_incorporation',
    category: 'business_registration',
    mandatoryFor: ['startup', 'enterprise'],
    optionalFor: ['sme'],
    fundingImpact: 'critical',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 15000, max: 25000 },
    estimatedTimeline: '7-15 days'
  },

  {
    serviceKey: 'startup_india_registration',
    name: 'Startup India (DPIIT) Registration',
    stage: 'stage_1_incorporation',
    category: 'certifications',
    mandatoryFor: [],
    optionalFor: ['startup'],
    fundingImpact: 'recommended',
    dueDiligenceRelevance: true,
    listingRelevance: false,
    investorVisibility: 'high',
    estimatedCost: { min: 5000, max: 10000 },
    estimatedTimeline: '3-5 days'
  },

  // ========== STAGE 4: FUNDING PREP ===========
  {
    serviceKey: 'statutory_audit',
    name: 'Statutory Audit (Annual)',
    stage: 'stage_4_funding_prep',
    category: 'financial_services',
    subcategory: 'audit',
    mandatoryFor: ['startup', 'sme', 'enterprise'],
    optionalFor: [],
    fundingImpact: 'critical',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 30000, max: 200000 },
    estimatedTimeline: '2-4 weeks'
  },

  {
    serviceKey: 'valuation_report',
    name: 'Business Valuation Report (For Funding)',
    stage: 'stage_4_funding_prep',
    category: 'financial_services',
    subcategory: 'valuation',
    mandatoryFor: [],
    optionalFor: ['startup', 'sme', 'enterprise'],
    fundingImpact: 'critical',
    dueDiligenceRelevance: true,
    listingRelevance: false,
    investorVisibility: 'high',
    estimatedCost: { min: 25000, max: 100000 },
    estimatedTimeline: '5-10 days'
  },

  {
    serviceKey: 'due_diligence_support',
    name: 'Due Diligence Preparation & Support',
    stage: 'stage_4_funding_prep',
    category: 'financial_services',
    subcategory: 'advisory',
    mandatoryFor: [],
    optionalFor: ['startup', 'sme', 'enterprise'],
    fundingImpact: 'critical',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 50000, max: 300000 },
    estimatedTimeline: '2-4 weeks'
  },

  {
    serviceKey: 'cap_table_management',
    name: 'Cap Table Design & Management',
    stage: 'stage_4_funding_prep',
    category: 'financial_services',
    subcategory: 'equity',
    mandatoryFor: [],
    optionalFor: ['startup', 'sme', 'enterprise'],
    fundingImpact: 'critical',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 15000, max: 50000 },
    estimatedTimeline: '3-5 days'
  },

  {
    serviceKey: 'financial_projections',
    name: 'Financial Projections & Modeling',
    stage: 'stage_4_funding_prep',
    category: 'financial_services',
    subcategory: 'planning',
    mandatoryFor: [],
    optionalFor: ['startup', 'sme', 'enterprise'],
    fundingImpact: 'critical',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 30000, max: 100000 },
    estimatedTimeline: '1-2 weeks'
  },

  // ========== STAGE 5: POST-FUNDING ===========
  {
    serviceKey: 'rbi_fdi_reporting',
    name: 'RBI FDI Compliance (Foreign Investment)',
    stage: 'stage_5_funded',
    category: 'regulatory_compliance',
    subcategory: 'fdi',
    mandatoryFor: ['startup', 'sme', 'enterprise'], // if FDI received
    optionalFor: [],
    fundingImpact: 'critical',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 20000, max: 75000 },
    estimatedTimeline: '7-15 days'
  },

  {
    serviceKey: 'form_fc_gpr',
    name: 'Form FC-GPR Filing (FDI Reporting)',
    stage: 'stage_5_funded',
    category: 'regulatory_compliance',
    subcategory: 'fdi',
    mandatoryFor: ['startup', 'sme', 'enterprise'],
    optionalFor: [],
    fundingImpact: 'critical',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 15000, max: 40000 },
    estimatedTimeline: '5-10 days'
  },

  {
    serviceKey: 'investor_reporting',
    name: 'Investor MIS & Reporting',
    stage: 'stage_5_funded',
    category: 'financial_services',
    subcategory: 'reporting',
    mandatoryFor: [],
    optionalFor: ['startup', 'sme', 'enterprise'],
    fundingImpact: 'critical',
    dueDiligenceRelevance: false,
    listingRelevance: false,
    investorVisibility: 'high',
    estimatedCost: { min: 10000, max: 50000 },
    estimatedTimeline: 'Monthly'
  },

  {
    serviceKey: 'esop_management',
    name: 'ESOP Plan Design & Management',
    stage: 'stage_5_funded',
    category: 'financial_services',
    subcategory: 'equity',
    mandatoryFor: [],
    optionalFor: ['startup', 'sme', 'enterprise'],
    fundingImpact: 'recommended',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 50000, max: 150000 },
    estimatedTimeline: '2-4 weeks'
  },

  // ========== STAGE 6: SCALING ===========
  {
    serviceKey: 'transfer_pricing',
    name: 'Transfer Pricing Study & Compliance',
    stage: 'stage_6_scale',
    category: 'tax_services',
    subcategory: 'international',
    mandatoryFor: ['enterprise'],
    optionalFor: ['sme'],
    fundingImpact: 'recommended',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'medium',
    estimatedCost: { min: 75000, max: 300000 },
    estimatedTimeline: '3-6 weeks'
  },

  {
    serviceKey: 'consolidated_financials',
    name: 'Consolidated Financial Statements',
    stage: 'stage_6_scale',
    category: 'financial_services',
    subcategory: 'accounting',
    mandatoryFor: ['enterprise'],
    optionalFor: ['sme'],
    fundingImpact: 'critical',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 50000, max: 200000 },
    estimatedTimeline: '2-4 weeks'
  },

  {
    serviceKey: 'internal_audit',
    name: 'Internal Audit & Controls',
    stage: 'stage_6_scale',
    category: 'financial_services',
    subcategory: 'audit',
    mandatoryFor: [],
    optionalFor: ['sme', 'enterprise'],
    fundingImpact: 'recommended',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'medium',
    estimatedCost: { min: 40000, max: 150000 },
    estimatedTimeline: '2-3 weeks'
  },

  // ========== STAGE 7: EXIT PREP ===========
  {
    serviceKey: 'ipo_readiness',
    name: 'IPO Readiness Assessment & Support',
    stage: 'stage_7_exit_prep',
    category: 'regulatory_compliance',
    subcategory: 'listing',
    mandatoryFor: [],
    optionalFor: ['enterprise'],
    fundingImpact: 'none',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 500000, max: 2000000 },
    estimatedTimeline: '6-12 months'
  },

  {
    serviceKey: 'sebi_compliance',
    name: 'SEBI Compliance & Listing Support',
    stage: 'stage_7_exit_prep',
    category: 'regulatory_compliance',
    subcategory: 'listing',
    mandatoryFor: [],
    optionalFor: ['enterprise'],
    fundingImpact: 'none',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 300000, max: 1000000 },
    estimatedTimeline: '6-9 months'
  },

  {
    serviceKey: 'forensic_audit',
    name: 'Forensic Audit & Compliance Review',
    stage: 'stage_7_exit_prep',
    category: 'financial_services',
    subcategory: 'audit',
    mandatoryFor: [],
    optionalFor: ['sme', 'enterprise'],
    fundingImpact: 'recommended',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 100000, max: 500000 },
    estimatedTimeline: '4-8 weeks'
  },

  {
    serviceKey: 'past_compliance_rectification',
    name: 'Past Compliance Gaps Rectification',
    stage: 'stage_7_exit_prep',
    category: 'regulatory_compliance',
    subcategory: 'rectification',
    mandatoryFor: [],
    optionalFor: ['startup', 'sme', 'enterprise'],
    fundingImpact: 'critical',
    dueDiligenceRelevance: true,
    listingRelevance: true,
    investorVisibility: 'high',
    estimatedCost: { min: 50000, max: 300000 },
    estimatedTimeline: '1-3 months'
  },

  // ========== STAGE 8: CLOSURE ===========
  {
    serviceKey: 'company_strike_off',
    name: 'Company Strike Off / Closure',
    stage: 'stage_8_closure',
    category: 'closure_services',
    mandatoryFor: [],
    optionalFor: ['startup', 'sme', 'enterprise'],
    fundingImpact: 'none',
    dueDiligenceRelevance: false,
    listingRelevance: false,
    investorVisibility: 'low',
    estimatedCost: { min: 25000, max: 75000 },
    estimatedTimeline: '3-6 months'
  }
];

/**
 * Get services for a specific business stage
 */
export function getServicesForStage(stageKey: string): LifecycleService[] {
  return LIFECYCLE_SERVICES.filter(service => service.stage === stageKey);
}

/**
 * Get recommended services for client type and stage
 */
export function getRecommendedServices(
  clientType: 'startup' | 'sme' | 'enterprise',
  currentStage: string,
  isFunded: boolean = false
): LifecycleService[] {
  return LIFECYCLE_SERVICES.filter(service => {
    // Must be in current stage or adjacent stages
    const stage = BUSINESS_LIFECYCLE_STAGES.find(s => s.stageKey === service.stage);
    const currentStageObj = BUSINESS_LIFECYCLE_STAGES.find(s => s.stageKey === currentStage);
    
    if (!stage || !currentStageObj) return false;
    
    // Include current stage and ±1 stage
    const stageMatch = Math.abs(stage.order - currentStageObj.order) <= 1;
    
    // Must be mandatory or optional for client type
    const typeMatch = 
      service.mandatoryFor.includes(clientType) || 
      service.optionalFor.includes(clientType);
    
    // Funding relevance
    const fundingMatch = !isFunded || 
      service.fundingRelevance === 'all' ||
      service.fundingRelevance === 'post_funding';
    
    return stageMatch && typeMatch && fundingMatch;
  });
}

/**
 * Get funding-critical services
 */
export function getFundingCriticalServices(currentStage: string): LifecycleService[] {
  return LIFECYCLE_SERVICES.filter(
    service => 
      service.fundingImpact === 'critical' &&
      service.dueDiligenceRelevance === true
  );
}

/**
 * Get next stage recommendations
 */
export function getNextStageRecommendation(currentStage: string): BusinessStage | null {
  const current = BUSINESS_LIFECYCLE_STAGES.find(s => s.stageKey === currentStage);
  if (!current) return null;
  
  return BUSINESS_LIFECYCLE_STAGES.find(s => s.order === current.order + 1) || null;
}
