/**
 * Compliance State Engine - Type Definitions
 * 
 * Core types for the state-based compliance monitoring system.
 * This is the single source of truth for compliance status across the platform.
 */

// ============================================================================
// PRIMARY STATE MODEL
// ============================================================================

/**
 * Overall compliance state for an entity
 * - GREEN: All compliances current, no action needed
 * - AMBER: Action required soon (within 7 days) or minor issues
 * - RED: Overdue, penalty risk, or critical action required
 */
export type ComplianceState = 'GREEN' | 'AMBER' | 'RED';

/**
 * Domain-specific compliance areas
 */
export type ComplianceDomain = 
  | 'CORPORATE'     // MCA, ROC, Company Law
  | 'TAX_GST'       // GST, VAT
  | 'TAX_INCOME'    // Income Tax, TDS, TCS
  | 'LABOUR'        // PF, ESI, PT, Labour laws
  | 'FEMA'          // Foreign exchange, imports/exports
  | 'LICENSES'      // FSSAI, Trade licenses, etc
  | 'STATUTORY';    // Other statutory requirements

/**
 * Detailed compliance status for a specific requirement
 */
export interface ComplianceRequirementStatus {
  requirementId: string;
  name: string;
  domain: ComplianceDomain;
  state: ComplianceState;
  dueDate: Date | null;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  penaltyExposure: number; // in ₹
  priority: 'critical' | 'high' | 'medium' | 'low';
  isRecurring: boolean;
  nextOccurrence: Date | null;
  lastFiled: Date | null;
  blockers: string[]; // What's preventing compliance
  actionRequired: string; // Plain English next step
}

/**
 * Domain-level compliance state
 */
export interface DomainComplianceState {
  domain: ComplianceDomain;
  state: ComplianceState;
  riskScore: number; // 0-100
  activeRequirements: number;
  overdueRequirements: number;
  upcomingDeadlines: number; // within 7 days
  totalPenaltyExposure: number;
  requirements: ComplianceRequirementStatus[];
}

/**
 * Entity-level compliance state (the big picture)
 */
export interface EntityComplianceState {
  entityId: number;
  entityName: string;
  entityType: string; // pvt_ltd, llp, proprietorship, etc.
  
  // Overall state
  overallState: ComplianceState;
  overallRiskScore: number; // 0-100 (weighted across domains)
  
  // Time-based metrics
  daysUntilNextDeadline: number | null;
  nextCriticalDeadline: Date | null;
  nextCriticalAction: string | null;
  
  // Exposure metrics
  totalPenaltyExposure: number;
  totalOverdueItems: number;
  totalUpcomingItems: number; // within 7 days
  
  // Domain breakdown
  domains: DomainComplianceState[];
  
  // Calculation metadata
  calculatedAt: Date;
  calculationVersion: string; // For tracking rule changes
  dataCompletenessScore: number; // 0-100 (how much data we have)
}

// ============================================================================
// STATE CALCULATION INPUTS
// ============================================================================

/**
 * Input data for state calculation
 */
export interface StateCalculationInput {
  entityId: number;
  entityType: string;
  incorporationDate: Date | null;
  turnover: number | null; // annual turnover
  employeeCount: number | null;
  state: string | null; // for state-specific compliances
  hasGST: boolean;
  hasPF: boolean;
  hasESI: boolean;
  hasForeignTransactions: boolean;
  
  // Active services and their status
  activeServices: {
    serviceKey: string;
    status: string;
    dueDate: Date | null;
    lastCompleted: Date | null;
  }[];
  
  // Document status
  documentStatus: {
    documentType: string;
    uploaded: boolean;
    approved: boolean;
    expiryDate: Date | null;
  }[];
  
  // Filing history
  filingHistory: {
    complianceType: string;
    filedDate: Date;
    period: string;
  }[];
}

// ============================================================================
// STATE CALCULATION RULES
// ============================================================================

/**
 * Rule for determining compliance state
 */
export interface ComplianceRule {
  ruleId: string;
  ruleName: string;
  domain: ComplianceDomain;
  
  // Applicability
  applicableEntityTypes: string[];
  turnoverThreshold?: { min?: number; max?: number };
  employeeCountThreshold?: { min?: number };
  hasGSTRequired?: boolean;
  
  // Timing
  frequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'EVENT_BASED';
  dueDateLogic: string; // e.g., "20th of next month", "31st October"
  graceDays?: number;
  
  // Risk assessment
  penaltyPerDay?: number;
  maxPenalty?: number;
  criticalityScore: number; // 1-10
  
  // Required documents
  requiredDocuments?: string[];
  
  // State logic
  amberThresholdDays: number; // days before due date to turn amber
  redTriggers: {
    daysOverdue?: number;
    missingDocuments?: string[];
    dependenciesNotMet?: string[];
  };
}

/**
 * State calculation result
 */
export interface StateCalculationResult {
  success: boolean;
  entityState: EntityComplianceState;
  errors: string[];
  warnings: string[];
  calculationTimeMs: number;
}

// ============================================================================
// DATABASE SCHEMA EXTENSIONS
// ============================================================================

/**
 * These will be added to the existing schema
 */
export interface ComplianceStateRecord {
  id: number;
  entityId: number;
  
  // State
  overallState: ComplianceState;
  overallRiskScore: number;
  
  // Metrics
  totalPenaltyExposure: number;
  totalOverdueItems: number;
  totalUpcomingItems: number;
  nextCriticalDeadline: Date | null;
  nextCriticalAction: string | null;
  
  // JSON fields for flexibility
  domainStates: any; // DomainComplianceState[]
  requirementStates: any; // ComplianceRequirementStatus[]
  
  // Metadata
  calculatedAt: Date;
  calculationVersion: string;
  dataCompletenessScore: number;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Historical state tracking
 */
export interface ComplianceStateHistory {
  id: number;
  entityId: number;
  state: ComplianceState;
  riskScore: number;
  penaltyExposure: number;
  snapshotData: any; // Full state snapshot
  recordedAt: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface StateEngineConfig {
  enableAutoCalculation: boolean;
  calculationIntervalHours: number;
  enablePredictiveAlerts: boolean;
  riskToleranceLevel: 'conservative' | 'moderate' | 'aggressive';
}

export interface StateDelta {
  entityId: number;
  previousState: ComplianceState;
  newState: ComplianceState;
  changedDomains: ComplianceDomain[];
  newIssues: string[];
  resolvedIssues: string[];
  timestamp: Date;
}
