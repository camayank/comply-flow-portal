/**
 * Database Schema for Compliance State Engine
 * 
 * Drizzle ORM schema definitions for state tracking tables
 */

import { pgTable, serial, integer, text, timestamp, boolean, numeric, json } from 'drizzle-orm/pg-core';

// ============================================================================
// COMPLIANCE STATE TABLE (Current state snapshot)
// ============================================================================

export const complianceStates = pgTable('compliance_states', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull(), // FK to business_entities
  
  // Overall state
  overallState: text('overall_state').notNull(), // GREEN, AMBER, RED
  overallRiskScore: numeric('overall_risk_score', { precision: 5, scale: 2 }).notNull().default('0'),
  
  // Metrics
  totalPenaltyExposure: numeric('total_penalty_exposure', { precision: 12, scale: 2 }).notNull().default('0'),
  totalOverdueItems: integer('total_overdue_items').notNull().default(0),
  totalUpcomingItems: integer('total_upcoming_items').notNull().default(0),
  
  // Next critical action
  nextCriticalDeadline: timestamp('next_critical_deadline'),
  nextCriticalAction: text('next_critical_action'),
  daysUntilNextDeadline: integer('days_until_next_deadline'),
  
  // Domain-level states (JSON for flexibility)
  domainStates: json('domain_states').$type<{
    domain: string;
    state: string;
    riskScore: number;
    activeRequirements: number;
    overdueRequirements: number;
    totalPenaltyExposure: number;
  }[]>(),
  
  // Individual requirement states
  requirementStates: json('requirement_states').$type<{
    requirementId: string;
    name: string;
    domain: string;
    state: string;
    dueDate: string | null;
    daysUntilDue: number | null;
    daysOverdue: number | null;
    penaltyExposure: number;
    priority: string;
    actionRequired: string;
  }[]>(),
  
  // Calculation metadata
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  calculationVersion: text('calculation_version').notNull().default('1.0.0'),
  dataCompletenessScore: numeric('data_completeness_score', { precision: 5, scale: 2 }).default('0'),
  
  // Audit fields
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================================
// COMPLIANCE STATE HISTORY (Time-series tracking)
// ============================================================================

export const complianceStateHistory = pgTable('compliance_state_history', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull(),
  
  // State snapshot
  state: text('state').notNull(), // GREEN, AMBER, RED
  riskScore: numeric('risk_score', { precision: 5, scale: 2 }).notNull(),
  penaltyExposure: numeric('penalty_exposure', { precision: 12, scale: 2 }).notNull(),
  overdueItems: integer('overdue_items').notNull(),
  
  // Full snapshot for analysis
  snapshotData: json('snapshot_data').$type<any>(),
  
  // Timestamp
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
});

// ============================================================================
// COMPLIANCE RULES (Configurable rule engine)
// ============================================================================

export const complianceStateRules = pgTable('compliance_state_rules', {
  id: serial('id').primaryKey(),
  ruleId: text('rule_id').notNull().unique(), // e.g., 'GST_GSTR3B_MONTHLY'
  ruleName: text('rule_name').notNull(),
  domain: text('domain').notNull(), // CORPORATE, TAX_GST, TAX_INCOME, LABOUR, etc.
  
  // Applicability criteria
  applicableEntityTypes: json('applicable_entity_types').$type<string[]>(),
  turnoverMin: numeric('turnover_min', { precision: 15, scale: 2 }),
  turnoverMax: numeric('turnover_max', { precision: 15, scale: 2 }),
  employeeCountMin: integer('employee_count_min'),
  requiresGST: boolean('requires_gst').default(false),
  requiresPF: boolean('requires_pf').default(false),
  requiresESI: boolean('requires_esi').default(false),
  stateSpecific: boolean('state_specific').default(false),
  applicableStates: json('applicable_states').$type<string[]>(),
  
  // Timing
  frequency: text('frequency').notNull(), // ONE_TIME, MONTHLY, QUARTERLY, ANNUAL
  dueDateLogic: text('due_date_logic').notNull(), // JSON or expression
  graceDays: integer('grace_days').default(0),
  
  // Risk assessment
  penaltyPerDay: numeric('penalty_per_day', { precision: 10, scale: 2 }),
  maxPenalty: numeric('max_penalty', { precision: 12, scale: 2 }),
  criticalityScore: integer('criticality_score').notNull(), // 1-10
  
  // State thresholds
  amberThresholdDays: integer('amber_threshold_days').notNull().default(7),
  redThresholdDays: integer('red_threshold_days').notNull().default(0),
  
  // Dependencies
  requiredDocuments: json('required_documents').$type<string[]>(),
  dependsOnRules: json('depends_on_rules').$type<string[]>(),
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
  effectiveUntil: timestamp('effective_until'),
  
  // Metadata
  description: text('description'),
  helpText: text('help_text'),
  referenceUrl: text('reference_url'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),
});

// ============================================================================
// COMPLIANCE ALERTS (State-triggered notifications)
// ============================================================================

export const complianceAlerts = pgTable('compliance_alerts', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull(),
  ruleId: text('rule_id').notNull(),
  
  // Alert details
  alertType: text('alert_type').notNull(), // UPCOMING, OVERDUE, PENALTY_RISK, STATE_CHANGE
  severity: text('severity').notNull(), // INFO, WARNING, CRITICAL
  title: text('title').notNull(),
  message: text('message').notNull(),
  actionRequired: text('action_required'),
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  isAcknowledged: boolean('is_acknowledged').notNull().default(false),
  acknowledgedAt: timestamp('acknowledged_at'),
  acknowledgedBy: integer('acknowledged_by'),
  
  // Timing
  triggeredAt: timestamp('triggered_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
  
  // Associated data
  metadata: json('metadata').$type<any>(),
});

// ============================================================================
// STATE CALCULATION LOG (Debugging and audit)
// ============================================================================

export const stateCalculationLog = pgTable('state_calculation_log', {
  id: serial('id').primaryKey(),
  entityId: integer('entity_id').notNull(),
  
  // Calculation details
  calculationVersion: text('calculation_version').notNull(),
  calculationTimeMs: integer('calculation_time_ms').notNull(),
  rulesApplied: integer('rules_applied').notNull(),
  
  // Results
  previousState: text('previous_state'),
  newState: text('new_state').notNull(),
  stateChanged: boolean('state_changed').notNull().default(false),
  
  // Issues
  errorsCount: integer('errors_count').notNull().default(0),
  warningsCount: integer('warnings_count').notNull().default(0),
  errors: json('errors').$type<string[]>(),
  warnings: json('warnings').$type<string[]>(),
  
  // Metadata
  triggeredBy: text('triggered_by').notNull(), // AUTO, MANUAL, WEBHOOK, etc.
  inputDataHash: text('input_data_hash'), // For detecting data changes
  
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
});

// ============================================================================
// INDEXES for Performance
// ============================================================================

// Note: Create these indexes in migration:
// CREATE INDEX idx_compliance_states_entity ON compliance_states(entity_id);
// CREATE INDEX idx_compliance_states_overall_state ON compliance_states(overall_state);
// CREATE INDEX idx_compliance_states_next_deadline ON compliance_states(next_critical_deadline);
// CREATE INDEX idx_state_history_entity_time ON compliance_state_history(entity_id, recorded_at DESC);
// CREATE INDEX idx_compliance_rules_domain ON compliance_rules(domain, is_active);
// CREATE INDEX idx_compliance_alerts_entity_active ON compliance_alerts(entity_id, is_active, severity);
// CREATE INDEX idx_calculation_log_entity_time ON state_calculation_log(entity_id, calculated_at DESC);
