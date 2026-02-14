/**
 * ENTERPRISE SERVICE BLUEPRINTS SCHEMA
 *
 * World-class compliance platform schema implementing:
 * 1. Service Blueprints Engine - Unified service definition
 * 2. Compliance Calendar Engine - Formula-based deadline calculation
 * 3. Jurisdiction Rules Engine - India-specific regulatory handling
 * 4. No-Code Builder - Custom fields, layouts, automation
 * 5. AI Intelligence Layer - Document extraction, predictions
 *
 * Version: 2.0
 * Date: February 2026
 */

import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, decimal, jsonb, uuid, time, bigserial, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users, businessEntities, documentsUploads } from './schema';
import { tenants } from './enterprise-schema';

// ============================================================================
// PART 1: SERVICE BLUEPRINTS ENGINE
// The heart of the compliance platform - unified service definition
// ============================================================================

/**
 * Service Blueprints - Master definition for any compliance service
 * Combines: workflow, pricing, documents, SLA, compliance rules into ONE source of truth
 */
export const serviceBlueprints = pgTable('service_blueprints', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),

  // === IDENTITY ===
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  shortName: varchar('short_name', { length: 50 }),
  description: text('description'),

  // === CLASSIFICATION ===
  category: varchar('category', { length: 100 }).notNull(), // 'TAX', 'COMPLIANCE', 'REGISTRATION', 'LABOR', 'CORPORATE'
  subcategory: varchar('subcategory', { length: 100 }),
  serviceType: varchar('service_type', { length: 50 }).default('RECURRING'), // 'RECURRING', 'ONE_TIME', 'ON_DEMAND'
  frequency: varchar('frequency', { length: 20 }), // 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'AS_NEEDED'

  // === COMPLIANCE METADATA ===
  governingAct: varchar('governing_act', { length: 255 }),
  sectionReference: varchar('section_reference', { length: 100 }),
  ruleReference: varchar('rule_reference', { length: 100 }),
  formNumber: varchar('form_number', { length: 50 }),
  filingPortal: varchar('filing_portal', { length: 255 }), // URL of government portal
  applicableEntityTypes: jsonb('applicable_entity_types').default(['pvt_ltd', 'llp', 'opc']),

  // === WORKFLOW CONFIGURATION ===
  workflowDefinition: jsonb('workflow_definition').notNull().default({
    steps: [],
    transitions: [],
    parallelSteps: [],
    conditionalBranches: []
  }),

  // === SLA CONFIGURATION ===
  defaultSlaHours: integer('default_sla_hours').default(48),
  escalationRules: jsonb('escalation_rules').default([]),

  // === DOCUMENT REQUIREMENTS ===
  documentRequirements: jsonb('document_requirements').default([]),
  outputDocuments: jsonb('output_documents').default([]),

  // === PRICING ===
  basePricing: jsonb('base_pricing').default({}),
  pricingModel: varchar('pricing_model', { length: 50 }).default('FIXED'), // 'FIXED', 'TIERED', 'USAGE', 'CUSTOM'

  // === COMPLIANCE RULES ===
  deadlineFormula: varchar('deadline_formula', { length: 500 }),
  penaltyRules: jsonb('penalty_rules').default([]),
  complianceCheckpoints: jsonb('compliance_checkpoints').default([]),

  // === AI CONFIGURATION ===
  aiExtractionEnabled: boolean('ai_extraction_enabled').default(false),
  aiExtractionTemplateId: uuid('ai_extraction_template_id'),
  aiRiskScoringEnabled: boolean('ai_risk_scoring_enabled').default(false),
  aiRiskModelId: uuid('ai_risk_model_id'),

  // === VERSIONING ===
  version: integer('version').default(1),
  previousVersionId: uuid('previous_version_id'),
  effectiveFrom: date('effective_from').default(sql`CURRENT_DATE`),
  effectiveUntil: date('effective_until'),
  changeLog: jsonb('change_log').default([]),

  // === STATUS ===
  status: varchar('status', { length: 20 }).default('DRAFT'), // 'DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'
  isActive: boolean('is_active').default(true),
  isSystemDefault: boolean('is_system_default').default(false),

  // === TAGS & SEARCH ===
  tags: jsonb('tags').default([]),
  searchKeywords: text('search_keywords'),

  // === AUDIT ===
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_bp_tenant').on(table.tenantId),
  categoryIdx: index('idx_bp_category').on(table.category),
  codeIdx: uniqueIndex('idx_bp_code').on(table.code),
  statusIdx: index('idx_bp_status').on(table.status),
  activeIdx: index('idx_bp_active').on(table.isActive),
}));

/**
 * Blueprint Pricing Tiers - Flexible pricing based on criteria
 */
export const blueprintPricingTiers = pgTable('blueprint_pricing_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  blueprintId: uuid('blueprint_id').references(() => serviceBlueprints.id, { onDelete: 'cascade' }).notNull(),

  // === TIER DEFINITION ===
  tierCode: varchar('tier_code', { length: 50 }).notNull(),
  tierName: varchar('tier_name', { length: 100 }).notNull(),
  description: text('description'),

  // === PRICING ===
  basePrice: decimal('base_price', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('INR'),

  // === CRITERIA (when this tier applies) ===
  criteria: jsonb('criteria').default({}), // { turnover_min, turnover_max, entity_type, state, etc. }

  // === WHAT'S INCLUDED ===
  includedFeatures: jsonb('included_features').default([]),
  excludedFeatures: jsonb('excluded_features').default([]),
  documentLimit: integer('document_limit'),
  revisionLimit: integer('revision_limit'),

  // === URGENCY PRICING ===
  urgentMultiplier: decimal('urgent_multiplier', { precision: 3, scale: 2 }).default('1.5'),
  superUrgentMultiplier: decimal('super_urgent_multiplier', { precision: 3, scale: 2 }).default('2.0'),

  // === DISCOUNTS ===
  bulkDiscountRules: jsonb('bulk_discount_rules').default([]), // [{ min_qty, discount_pct }]
  loyaltyDiscountPct: decimal('loyalty_discount_pct', { precision: 5, scale: 2 }).default('0'),

  // === VALIDITY ===
  effectiveFrom: date('effective_from').default(sql`CURRENT_DATE`),
  effectiveUntil: date('effective_until'),
  isActive: boolean('is_active').default(true),

  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  blueprintIdx: index('idx_bpt_blueprint').on(table.blueprintId),
  tierCodeIdx: index('idx_bpt_tier_code').on(table.blueprintId, table.tierCode),
}));

/**
 * Blueprint Workflow Steps - Detailed step definitions
 */
export const blueprintWorkflowSteps = pgTable('blueprint_workflow_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  blueprintId: uuid('blueprint_id').references(() => serviceBlueprints.id, { onDelete: 'cascade' }).notNull(),

  // === STEP IDENTITY ===
  stepCode: varchar('step_code', { length: 50 }).notNull(),
  stepName: varchar('step_name', { length: 255 }).notNull(),
  description: text('description'),

  // === STEP TYPE ===
  stepType: varchar('step_type', { length: 50 }).notNull(), // 'TASK', 'APPROVAL', 'REVIEW', 'DOCUMENT_COLLECTION', 'GOVERNMENT_FILING', 'CLIENT_ACTION', 'AUTO', 'WAIT', 'DECISION'

  // === ASSIGNMENT ===
  defaultAssigneeRole: varchar('default_assignee_role', { length: 100 }),
  assignmentStrategy: varchar('assignment_strategy', { length: 50 }).default('ROUND_ROBIN'), // 'ROUND_ROBIN', 'LEAST_LOADED', 'SKILL_BASED', 'MANUAL'
  requiredSkills: jsonb('required_skills').default([]),

  // === SLA ===
  slaHours: integer('sla_hours'),
  slaBusinessHoursOnly: boolean('sla_business_hours_only').default(true),
  warningThresholdPct: integer('warning_threshold_pct').default(75),
  escalationAfterHours: integer('escalation_after_hours'),
  escalationChain: jsonb('escalation_chain').default([]),

  // === REQUIRED INPUTS ===
  requiredDocuments: jsonb('required_documents').default([]),
  requiredFields: jsonb('required_fields').default([]),
  requiredApprovals: jsonb('required_approvals').default([]),

  // === AUTOMATION ===
  autoActions: jsonb('auto_actions').default([]), // Actions to trigger on entry/exit
  webhooks: jsonb('webhooks').default([]),
  emailTemplateId: uuid('email_template_id'),
  smsTemplateId: uuid('sms_template_id'),

  // === TRANSITIONS ===
  allowedNextSteps: jsonb('allowed_next_steps').default([]),
  defaultNextStep: varchar('default_next_step', { length: 50 }),
  completionCriteria: jsonb('completion_criteria').default({}),

  // === CONDITIONS ===
  entryConditions: jsonb('entry_conditions').default([]),
  exitConditions: jsonb('exit_conditions').default([]),
  skipConditions: jsonb('skip_conditions').default([]),

  // === UI CONFIGURATION ===
  formLayoutId: uuid('form_layout_id'),
  instructions: text('instructions'),
  checklistItems: jsonb('checklist_items').default([]),

  // === FLAGS ===
  isMilestone: boolean('is_milestone').default(false),
  isClientVisible: boolean('is_client_visible').default(true),
  requiresClientApproval: boolean('requires_client_approval').default(false),
  canBeSkipped: boolean('can_be_skipped').default(false),
  canBeRepeated: boolean('can_be_repeated').default(false),

  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  blueprintIdx: index('idx_bws_blueprint').on(table.blueprintId),
  stepCodeIdx: uniqueIndex('idx_bws_step_code').on(table.blueprintId, table.stepCode),
}));

/**
 * Blueprint Document Types - Required documents with validation
 */
export const blueprintDocumentTypes = pgTable('blueprint_document_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  blueprintId: uuid('blueprint_id').references(() => serviceBlueprints.id, { onDelete: 'cascade' }).notNull(),

  // === DOCUMENT IDENTITY ===
  documentCode: varchar('document_code', { length: 50 }).notNull(),
  documentName: varchar('document_name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }), // 'IDENTITY', 'FINANCIAL', 'LEGAL', 'TAX', 'SUPPORTING'

  // === REQUIREMENTS ===
  isMandatory: boolean('is_mandatory').default(false),
  mandatoryConditions: jsonb('mandatory_conditions'), // When is it mandatory

  // === FILE VALIDATION ===
  acceptedFormats: jsonb('accepted_formats').default(['pdf', 'jpg', 'jpeg', 'png']),
  maxSizeMb: integer('max_size_mb').default(10),
  minResolutionDpi: integer('min_resolution_dpi'),

  // === CONTENT VALIDATION ===
  validationRules: jsonb('validation_rules').default([]), // [{ type: 'PAN_FORMAT', field: 'pan_number', pattern: '^[A-Z]{5}[0-9]{4}[A-Z]$' }]
  requiredFields: jsonb('required_fields').default([]), // Fields that must be extracted

  // === AI EXTRACTION ===
  aiExtractionEnabled: boolean('ai_extraction_enabled').default(false),
  extractionFields: jsonb('extraction_fields').default([]), // [{ name, type, pattern, confidence_threshold }]
  extractionTemplateId: uuid('extraction_template_id'),

  // === VERIFICATION ===
  verificationRequired: boolean('verification_required').default(false),
  verificationMethod: varchar('verification_method', { length: 50 }), // 'MANUAL', 'API', 'AI', 'BLOCKCHAIN'
  verificationApiEndpoint: text('verification_api_endpoint'),

  // === WORKFLOW ===
  requiredAtStep: varchar('required_at_step', { length: 50 }),
  dueBeforeDays: integer('due_before_days'),

  // === TEMPLATES ===
  sampleDocumentUrl: text('sample_document_url'),
  templateDocumentUrl: text('template_document_url'),
  instructionsUrl: text('instructions_url'),

  // === RETENTION ===
  retentionDays: integer('retention_days'),
  isConfidential: boolean('is_confidential').default(false),

  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  blueprintIdx: index('idx_bdt_blueprint').on(table.blueprintId),
  docCodeIdx: uniqueIndex('idx_bdt_doc_code').on(table.blueprintId, table.documentCode),
}));

/**
 * Blueprint Compliance Rules - Deadline and penalty calculations
 */
export const blueprintComplianceRules = pgTable('blueprint_compliance_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  blueprintId: uuid('blueprint_id').references(() => serviceBlueprints.id, { onDelete: 'cascade' }).notNull(),

  // === RULE IDENTITY ===
  ruleCode: varchar('rule_code', { length: 50 }).notNull(),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  description: text('description'),
  ruleType: varchar('rule_type', { length: 50 }).notNull(), // 'DEADLINE', 'PENALTY', 'NOTIFICATION', 'EXEMPTION', 'EXTENSION'

  // === DEADLINE CALCULATION ===
  deadlineFormula: text('deadline_formula'), // e.g., 'MONTH_END + 20 DAYS', 'QUARTER_END + 22 DAYS'
  baseDateType: varchar('base_date_type', { length: 50 }), // 'PERIOD_END', 'TRANSACTION_DATE', 'REGISTRATION_DATE', 'PREVIOUS_FILING'
  offsetDays: integer('offset_days').default(0),
  offsetMonths: integer('offset_months').default(0),
  adjustmentRule: varchar('adjustment_rule', { length: 50 }), // 'NEXT_WORKING_DAY', 'PREVIOUS_WORKING_DAY', 'NONE'

  // === PENALTY CALCULATION ===
  penaltyType: varchar('penalty_type', { length: 50 }), // 'FLAT', 'DAILY', 'INTEREST', 'SLAB', 'COMPOUND'
  penaltyFormula: text('penalty_formula'),
  flatAmount: decimal('flat_amount', { precision: 12, scale: 2 }),
  dailyAmount: decimal('daily_amount', { precision: 10, scale: 2 }),
  interestRateAnnual: decimal('interest_rate_annual', { precision: 5, scale: 2 }),
  penaltySlabs: jsonb('penalty_slabs').default([]), // [{ from_days, to_days, amount_per_day }]
  maxPenalty: decimal('max_penalty', { precision: 15, scale: 2 }),
  maxPenaltyDays: integer('max_penalty_days'),

  // === CONDITIONS ===
  appliesWhen: jsonb('applies_when').default({}), // { turnover_above, entity_type, state, etc. }
  exemptWhen: jsonb('exempt_when').default({}),

  // === NOTIFICATIONS ===
  notificationDaysBefore: jsonb('notification_days_before').default([30, 15, 7, 3, 1]),
  notificationTemplateId: uuid('notification_template_id'),

  // === REFERENCES ===
  legalReference: text('legal_reference'),
  circularReference: varchar('circular_reference', { length: 255 }),

  // === VALIDITY ===
  effectiveFrom: date('effective_from'),
  effectiveUntil: date('effective_until'),
  isActive: boolean('is_active').default(true),

  priority: integer('priority').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  blueprintIdx: index('idx_bcr_blueprint').on(table.blueprintId),
  ruleCodeIdx: uniqueIndex('idx_bcr_rule_code').on(table.blueprintId, table.ruleCode),
  ruleTypeIdx: index('idx_bcr_rule_type').on(table.ruleType),
}));

/**
 * Blueprint Checklists - Quality control checklists
 */
export const blueprintChecklists = pgTable('blueprint_checklists', {
  id: uuid('id').primaryKey().defaultRandom(),
  blueprintId: uuid('blueprint_id').references(() => serviceBlueprints.id, { onDelete: 'cascade' }).notNull(),
  workflowStepId: uuid('workflow_step_id').references(() => blueprintWorkflowSteps.id, { onDelete: 'cascade' }),

  // === CHECKLIST IDENTITY ===
  checklistCode: varchar('checklist_code', { length: 50 }).notNull(),
  checklistName: varchar('checklist_name', { length: 255 }).notNull(),
  description: text('description'),
  checklistType: varchar('checklist_type', { length: 50 }).default('QC'), // 'QC', 'COMPLIANCE', 'REVIEW', 'PRE_FILING', 'POST_FILING'

  // === ITEMS ===
  items: jsonb('items').notNull().default([]), // [{ code, label, type, required, help_text, validation }]

  // === REQUIREMENTS ===
  minimumCompletionPct: integer('minimum_completion_pct').default(100),
  requiresSignoff: boolean('requires_signoff').default(false),
  signoffRole: varchar('signoff_role', { length: 100 }),

  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  blueprintIdx: index('idx_bc_blueprint').on(table.blueprintId),
}));


// ============================================================================
// PART 2: COMPLIANCE CALENDAR ENGINE
// Automatic deadline tracking with penalty calculations
// ============================================================================

/**
 * Compliance Calendar - Auto-generated deadline entries
 */
export const complianceCalendar = pgTable('compliance_calendar', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  clientId: integer('client_id').references(() => users.id),
  entityId: integer('entity_id').references(() => businessEntities.id),

  // === WHAT ===
  blueprintId: uuid('blueprint_id').references(() => serviceBlueprints.id),
  complianceRuleId: uuid('compliance_rule_id').references(() => blueprintComplianceRules.id),
  taskId: integer('task_id'), // Link to actual task when created

  // === PERIOD ===
  periodType: varchar('period_type', { length: 20 }).notNull(), // 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL'
  periodCode: varchar('period_code', { length: 20 }), // 'Q1-2024', 'MAR-2024', 'FY2024'
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  fiscalYear: varchar('fiscal_year', { length: 10 }), // '2024-25'

  // === DEADLINES ===
  originalDueDate: date('original_due_date').notNull(),
  adjustedDueDate: date('adjusted_due_date'), // After holiday adjustments
  extendedDueDate: date('extended_due_date'), // If extension granted
  extensionReason: text('extension_reason'),
  extensionApprovedBy: integer('extension_approved_by').references(() => users.id),

  // === STATUS ===
  status: varchar('status', { length: 50 }).default('UPCOMING'), // 'UPCOMING', 'DUE_SOON', 'DUE_TODAY', 'OVERDUE', 'COMPLETED', 'EXEMPTED', 'NOT_APPLICABLE'
  filedDate: date('filed_date'),
  filingReference: varchar('filing_reference', { length: 255 }), // ARN, acknowledgment number
  filingProofUrl: text('filing_proof_url'),

  // === PENALTY TRACKING ===
  daysOverdue: integer('days_overdue').default(0),
  penaltyAmount: decimal('penalty_amount', { precision: 15, scale: 2 }).default('0'),
  interestAmount: decimal('interest_amount', { precision: 15, scale: 2 }).default('0'),
  totalLiability: decimal('total_liability', { precision: 15, scale: 2 }).default('0'),
  penaltyPaid: boolean('penalty_paid').default(false),
  penaltyPaidDate: date('penalty_paid_date'),
  penaltyPaidReference: varchar('penalty_paid_reference', { length: 255 }),

  // === TAX LIABILITY ===
  taxLiability: decimal('tax_liability', { precision: 15, scale: 2 }),
  taxPaid: decimal('tax_paid', { precision: 15, scale: 2 }),

  // === METADATA ===
  autoGenerated: boolean('auto_generated').default(true),
  notificationsSent: jsonb('notifications_sent').default([]),
  lastNotificationDate: timestamp('last_notification_date'),
  notes: text('notes'),

  // === AUDIT ===
  completedBy: integer('completed_by').references(() => users.id),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantStatusIdx: index('idx_cc_tenant_status').on(table.tenantId, table.status),
  clientIdx: index('idx_cc_client').on(table.clientId),
  entityIdx: index('idx_cc_entity').on(table.entityId),
  dueDateIdx: index('idx_cc_due_date').on(table.adjustedDueDate),
  blueprintIdx: index('idx_cc_blueprint').on(table.blueprintId),
  periodIdx: index('idx_cc_period').on(table.fiscalYear, table.periodType),
}));

/**
 * Deadline Formulas - Reusable deadline calculation patterns
 */
export const deadlineFormulas = pgTable('deadline_formulas', {
  id: uuid('id').primaryKey().defaultRandom(),

  // === IDENTITY ===
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }), // 'GST', 'INCOME_TAX', 'ROC', 'LABOR'

  // === FORMULA DEFINITION ===
  baseDateType: varchar('base_date_type', { length: 50 }).notNull(), // 'PERIOD_END', 'QUARTER_END', 'FY_END', 'TRANSACTION_DATE'
  offsetDays: integer('offset_days').default(0),
  offsetMonths: integer('offset_months').default(0),
  offsetYears: integer('offset_years').default(0),

  // === ADJUSTMENTS ===
  adjustmentRule: varchar('adjustment_rule', { length: 50 }).default('NEXT_WORKING_DAY'),
  excludeWeekends: boolean('exclude_weekends').default(true),
  excludeHolidays: boolean('exclude_holidays').default(true),

  // === APPLICABILITY ===
  applicablePeriods: jsonb('applicable_periods').default(['MONTHLY', 'QUARTERLY', 'ANNUAL']),
  applicableJurisdictions: jsonb('applicable_jurisdictions').default([]),

  // === EXAMPLES ===
  exampleCalculation: text('example_calculation'),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Penalty Rules Master - Standalone penalty calculation rules
 */
export const penaltyRulesMaster = pgTable('penalty_rules_master', {
  id: uuid('id').primaryKey().defaultRandom(),

  // === IDENTITY ===
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }), // 'GST', 'INCOME_TAX', 'ROC'

  // === PENALTY TYPE ===
  penaltyType: varchar('penalty_type', { length: 50 }).notNull(), // 'FLAT', 'DAILY', 'INTEREST', 'SLAB', 'COMPOUND', 'MIXED'

  // === CALCULATION PARAMETERS ===
  flatAmount: decimal('flat_amount', { precision: 12, scale: 2 }),
  dailyAmount: decimal('daily_amount', { precision: 10, scale: 2 }),
  interestRateAnnual: decimal('interest_rate_annual', { precision: 5, scale: 2 }),
  compoundingFrequency: varchar('compounding_frequency', { length: 20 }), // 'DAILY', 'MONTHLY', 'QUARTERLY'

  // === SLABS ===
  slabs: jsonb('slabs').default([]), // [{ from_days, to_days, amount_or_rate, type: 'FIXED'|'PER_DAY' }]

  // === CAPS ===
  maxPenalty: decimal('max_penalty', { precision: 15, scale: 2 }),
  maxPenaltyDays: integer('max_penalty_days'),
  minPenalty: decimal('min_penalty', { precision: 12, scale: 2 }),

  // === CONDITIONS ===
  minimumTaxLiability: decimal('minimum_tax_liability', { precision: 15, scale: 2 }),
  conditions: jsonb('conditions').default({}),

  // === LEGAL REFERENCE ===
  legalSection: varchar('legal_section', { length: 255 }),
  circularReference: varchar('circular_reference', { length: 255 }),

  // === VALIDITY ===
  effectiveFrom: date('effective_from'),
  effectiveUntil: date('effective_until'),
  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Holiday Calendars - National and state holidays
 */
export const holidayCalendars = pgTable('holiday_calendars', {
  id: uuid('id').primaryKey().defaultRandom(),

  // === SCOPE ===
  jurisdictionId: uuid('jurisdiction_id').references(() => jurisdictions.id),
  calendarType: varchar('calendar_type', { length: 50 }).default('BANK'), // 'BANK', 'GOVERNMENT', 'STOCK_EXCHANGE', 'CUSTOM'
  year: integer('year').notNull(),

  // === HOLIDAYS ===
  holidays: jsonb('holidays').notNull(), // [{ date, name, type: 'NATIONAL'|'REGIONAL'|'BANK', is_optional }]

  // === WORKING DAYS ===
  weekendDays: jsonb('weekend_days').default([0, 6]), // Sunday=0, Saturday=6
  saturdayRules: jsonb('saturday_rules'), // For alternate Saturdays

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  yearIdx: index('idx_hc_year').on(table.year),
  jurisdictionIdx: index('idx_hc_jurisdiction').on(table.jurisdictionId),
}));


// ============================================================================
// PART 3: JURISDICTION RULES ENGINE
// India-specific multi-level compliance handling
// ============================================================================

/**
 * Jurisdictions - Hierarchical jurisdiction structure
 */
export const jurisdictions = pgTable('jurisdictions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // === IDENTITY ===
  code: varchar('code', { length: 20 }).notNull().unique(), // 'IN', 'IN-MH', 'IN-MH-MUM'
  name: varchar('name', { length: 255 }).notNull(),
  shortName: varchar('short_name', { length: 50 }),

  // === HIERARCHY ===
  parentId: uuid('parent_id').references(() => jurisdictions.id),
  level: varchar('level', { length: 20 }).notNull(), // 'COUNTRY', 'STATE', 'CITY', 'ZONE'
  path: text('path'), // Materialized path for efficient queries: 'IN/IN-MH/IN-MH-MUM'

  // === TAX IDENTIFIERS ===
  gstStateCode: varchar('gst_state_code', { length: 2 }),
  tinPrefix: varchar('tin_prefix', { length: 4 }),
  stateCode: varchar('state_code', { length: 5 }),

  // === DEFAULTS ===
  defaultCurrency: varchar('default_currency', { length: 3 }).default('INR'),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Kolkata'),
  locale: varchar('locale', { length: 10 }).default('en-IN'),
  dateFormat: varchar('date_format', { length: 20 }).default('DD/MM/YYYY'),

  // === CONTACT ===
  taxAuthorityName: varchar('tax_authority_name', { length: 255 }),
  taxAuthorityWebsite: text('tax_authority_website'),
  helplineNumber: varchar('helpline_number', { length: 20 }),

  // === STATUS ===
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  codeIdx: uniqueIndex('idx_j_code').on(table.code),
  parentIdx: index('idx_j_parent').on(table.parentId),
  levelIdx: index('idx_j_level').on(table.level),
}));

/**
 * Jurisdiction Rules - Override rules per jurisdiction
 */
export const jurisdictionRules = pgTable('jurisdiction_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  jurisdictionId: uuid('jurisdiction_id').references(() => jurisdictions.id).notNull(),
  blueprintId: uuid('blueprint_id').references(() => serviceBlueprints.id),

  // === RULE TYPE ===
  ruleType: varchar('rule_type', { length: 50 }).notNull(), // 'DEADLINE_OVERRIDE', 'EXEMPTION', 'ADDITIONAL_REQUIREMENT', 'RATE_OVERRIDE', 'FORM_OVERRIDE'
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  description: text('description'),

  // === OVERRIDES ===
  deadlineOffsetDays: integer('deadline_offset_days'),
  exemptionCriteria: jsonb('exemption_criteria'),
  additionalDocuments: jsonb('additional_documents'),
  additionalForms: jsonb('additional_forms'),
  rateOverride: decimal('rate_override', { precision: 5, scale: 2 }),
  formOverride: varchar('form_override', { length: 100 }),

  // === CONDITIONS ===
  appliesWhen: jsonb('applies_when').default({}), // { entity_type, turnover_range, etc. }

  // === REFERENCE ===
  legalReference: text('legal_reference'),
  notificationReference: varchar('notification_reference', { length: 255 }),

  // === VALIDITY ===
  effectiveFrom: date('effective_from'),
  effectiveUntil: date('effective_until'),
  isActive: boolean('is_active').default(true),

  priority: integer('priority').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  jurisdictionIdx: index('idx_jr_jurisdiction').on(table.jurisdictionId),
  blueprintIdx: index('idx_jr_blueprint').on(table.blueprintId),
  ruleTypeIdx: index('idx_jr_rule_type').on(table.ruleType),
}));

/**
 * Professional Tax Rates - State-wise PT configuration
 */
export const professionalTaxRates = pgTable('professional_tax_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  jurisdictionId: uuid('jurisdiction_id').references(() => jurisdictions.id).notNull(),

  // === RATE STRUCTURE ===
  salarySlabs: jsonb('salary_slabs').notNull(), // [{ from, to, monthly_tax, annual_tax }]

  // === EMPLOYER LIABILITY ===
  employerRegistrationThreshold: integer('employer_registration_threshold'),
  employerAnnualFee: decimal('employer_annual_fee', { precision: 10, scale: 2 }),

  // === EXEMPTIONS ===
  exemptedCategories: jsonb('exempted_categories').default([]),

  // === FILING ===
  filingFrequency: varchar('filing_frequency', { length: 20 }), // 'MONTHLY', 'QUARTERLY', 'ANNUAL'
  dueDay: integer('due_day'),

  effectiveFrom: date('effective_from').notNull(),
  effectiveUntil: date('effective_until'),
  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at').defaultNow(),
});


// ============================================================================
// PART 4: NO-CODE BUILDER
// Visual customization without code changes
// ============================================================================

/**
 * Custom Field Definitions - EAV pattern for extensibility
 */
export const customFieldDefinitions = pgTable('custom_field_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),

  // === TARGET ===
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'CLIENT', 'TASK', 'SERVICE_REQUEST', 'DOCUMENT', 'LEAD'

  // === FIELD DEFINITION ===
  fieldCode: varchar('field_code', { length: 50 }).notNull(),
  fieldLabel: varchar('field_label', { length: 255 }).notNull(),
  fieldType: varchar('field_type', { length: 50 }).notNull(), // 'TEXT', 'NUMBER', 'DECIMAL', 'DATE', 'DATETIME', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'LOOKUP', 'FILE', 'RICH_TEXT', 'EMAIL', 'PHONE', 'URL', 'CURRENCY', 'PERCENTAGE', 'FORMULA'

  // === OPTIONS (for SELECT types) ===
  options: jsonb('options'), // [{ value, label, color, icon }]
  optionsSource: varchar('options_source', { length: 50 }), // 'STATIC', 'API', 'LOOKUP'
  optionsApiEndpoint: text('options_api_endpoint'),

  // === LOOKUP CONFIG ===
  lookupEntity: varchar('lookup_entity', { length: 50 }),
  lookupDisplayField: varchar('lookup_display_field', { length: 50 }),
  lookupValueField: varchar('lookup_value_field', { length: 50 }),
  lookupFilters: jsonb('lookup_filters'),

  // === FORMULA CONFIG ===
  formulaExpression: text('formula_expression'),
  formulaDependencies: jsonb('formula_dependencies'),

  // === VALIDATION ===
  isRequired: boolean('is_required').default(false),
  isUnique: boolean('is_unique').default(false),
  validationRules: jsonb('validation_rules').default([]), // [{ type, value, message }]
  minValue: decimal('min_value', { precision: 15, scale: 4 }),
  maxValue: decimal('max_value', { precision: 15, scale: 4 }),
  minLength: integer('min_length'),
  maxLength: integer('max_length'),
  pattern: varchar('pattern', { length: 500 }),
  patternMessage: varchar('pattern_message', { length: 255 }),

  // === DEFAULTS ===
  defaultValue: text('default_value'),
  defaultValueType: varchar('default_value_type', { length: 20 }).default('STATIC'), // 'STATIC', 'FORMULA', 'CURRENT_USER', 'CURRENT_DATE'

  // === UI ===
  placeholder: text('placeholder'),
  helpText: text('help_text'),
  tooltipText: text('tooltip_text'),
  displayFormat: varchar('display_format', { length: 100 }),
  inputMask: varchar('input_mask', { length: 100 }),

  // === VISIBILITY ===
  displayOrder: integer('display_order').default(0),
  groupName: varchar('group_name', { length: 100 }),
  isActive: boolean('is_active').default(true),
  visibleOnCreate: boolean('visible_on_create').default(true),
  visibleOnEdit: boolean('visible_on_edit').default(true),
  visibleOnView: boolean('visible_on_view').default(true),
  visibleOnList: boolean('visible_on_list').default(false),
  visibleOnExport: boolean('visible_on_export').default(true),

  // === PERMISSIONS ===
  editableByRoles: jsonb('editable_by_roles').default([]),
  viewableByRoles: jsonb('viewable_by_roles').default([]),

  // === AUDIT ===
  trackHistory: boolean('track_history').default(false),
  isEncrypted: boolean('is_encrypted').default(false),

  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantEntityIdx: index('idx_cfd_tenant_entity').on(table.tenantId, table.entityType),
  fieldCodeIdx: uniqueIndex('idx_cfd_field_code').on(table.tenantId, table.entityType, table.fieldCode),
}));

/**
 * Custom Field Values - Stores actual values
 */
export const customFieldValues = pgTable('custom_field_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  fieldDefinitionId: uuid('field_definition_id').references(() => customFieldDefinitions.id, { onDelete: 'cascade' }).notNull(),

  // === TARGET RECORD ===
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),

  // === VALUE (stored as JSONB for flexibility) ===
  value: jsonb('value'),

  // === AUDIT ===
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  entityIdx: index('idx_cfv_entity').on(table.entityType, table.entityId),
  fieldIdx: index('idx_cfv_field').on(table.fieldDefinitionId),
  uniqueFieldEntity: uniqueIndex('idx_cfv_unique').on(table.fieldDefinitionId, table.entityId),
}));

/**
 * Custom Field History - Track changes
 */
export const customFieldHistory = pgTable('custom_field_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  fieldValueId: uuid('field_value_id').references(() => customFieldValues.id, { onDelete: 'cascade' }).notNull(),

  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  changedBy: integer('changed_by').references(() => users.id),
  changedAt: timestamp('changed_at').defaultNow(),
  changeReason: text('change_reason'),
});

/**
 * Page Layouts - Custom form layouts
 */
export const pageLayouts = pgTable('page_layouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),

  // === TARGET ===
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  layoutType: varchar('layout_type', { length: 50 }).notNull(), // 'CREATE', 'EDIT', 'VIEW', 'LIST', 'KANBAN', 'CALENDAR'

  // === LAYOUT DEFINITION ===
  layoutName: varchar('layout_name', { length: 255 }).notNull(),
  layoutCode: varchar('layout_code', { length: 50 }).notNull(),
  description: text('description'),

  // === LAYOUT CONFIG ===
  layoutDefinition: jsonb('layout_definition').notNull(), // { sections: [{ title, columns, fields: [{ fieldCode, width, ... }] }] }

  // === CONDITIONS ===
  conditions: jsonb('conditions'), // When to use this layout

  // === STATUS ===
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),

  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantEntityIdx: index('idx_pl_tenant_entity').on(table.tenantId, table.entityType),
  layoutCodeIdx: uniqueIndex('idx_pl_layout_code').on(table.tenantId, table.entityType, table.layoutCode),
}));

/**
 * Automation Rules - IF-THEN workflow automation
 */
export const automationRules = pgTable('automation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),

  // === IDENTITY ===
  ruleCode: varchar('rule_code', { length: 50 }).notNull(),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),

  // === TRIGGER ===
  triggerType: varchar('trigger_type', { length: 50 }).notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'FIELD_CHANGE', 'SCHEDULED', 'MANUAL', 'WEBHOOK'
  triggerEntity: varchar('trigger_entity', { length: 50 }).notNull(),
  triggerConditions: jsonb('trigger_conditions').default({}), // { field: value, operator, ... }
  triggerFields: jsonb('trigger_fields'), // For FIELD_CHANGE type

  // === SCHEDULE ===
  scheduleCron: varchar('schedule_cron', { length: 100 }),
  scheduleTimezone: varchar('schedule_timezone', { length: 50 }).default('Asia/Kolkata'),

  // === CONDITIONS (additional filters) ===
  filterConditions: jsonb('filter_conditions').default([]), // [{ field, operator, value }]

  // === ACTIONS ===
  actions: jsonb('actions').notNull(), // [{ type, config }]
  /*
    Action types:
    - UPDATE_FIELD: { field, value }
    - CREATE_RECORD: { entity, data }
    - SEND_EMAIL: { template, to, cc }
    - SEND_SMS: { template, to }
    - SEND_NOTIFICATION: { type, users, message }
    - CREATE_TASK: { template, assignee }
    - CALL_WEBHOOK: { url, method, headers, body }
    - RUN_SCRIPT: { script }
    - DELAY: { duration, unit }
    - BRANCH: { conditions, actions }
  */

  // === EXECUTION ===
  isActive: boolean('is_active').default(true),
  executionOrder: integer('execution_order').default(0),
  stopOnError: boolean('stop_on_error').default(false),
  retryOnError: boolean('retry_on_error').default(true),
  maxRetries: integer('max_retries').default(3),

  // === STATS ===
  executionCount: integer('execution_count').default(0),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  lastExecutedAt: timestamp('last_executed_at'),
  lastError: text('last_error'),
  lastErrorAt: timestamp('last_error_at'),

  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_ar_tenant').on(table.tenantId),
  triggerIdx: index('idx_ar_trigger').on(table.triggerEntity, table.triggerType),
  ruleCodeIdx: uniqueIndex('idx_ar_rule_code').on(table.tenantId, table.ruleCode),
}));

/**
 * Automation Execution Log - Track rule executions
 */
export const automationExecutionLog = pgTable('automation_execution_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: uuid('rule_id').references(() => automationRules.id).notNull(),

  // === TRIGGER CONTEXT ===
  triggerType: varchar('trigger_type', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  triggerData: jsonb('trigger_data'),

  // === EXECUTION ===
  status: varchar('status', { length: 20 }).notNull(), // 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),

  // === RESULTS ===
  actionsExecuted: jsonb('actions_executed'), // [{ action, status, result }]
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),

  // === RETRY ===
  retryCount: integer('retry_count').default(0),
  nextRetryAt: timestamp('next_retry_at'),
}, (table) => ({
  ruleIdx: index('idx_ael_rule').on(table.ruleId),
  statusIdx: index('idx_ael_status').on(table.status),
  startedIdx: index('idx_ael_started').on(table.startedAt),
}));


// ============================================================================
// PART 5: AI INTELLIGENCE LAYER
// Document extraction, predictions, smart recommendations
// ============================================================================

/**
 * Document Extraction Templates - AI/OCR extraction configuration
 */
export const documentExtractionTemplates = pgTable('document_extraction_templates', {
  id: uuid('id').primaryKey().defaultRandom(),

  // === IDENTITY ===
  templateCode: varchar('template_code', { length: 50 }).notNull().unique(),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  documentType: varchar('document_type', { length: 100 }).notNull(), // 'PAN_CARD', 'AADHAAR', 'GST_CERTIFICATE', 'INVOICE', 'BANK_STATEMENT', 'ITR_V'
  description: text('description'),

  // === EXTRACTION FIELDS ===
  fields: jsonb('fields').notNull(), // [{ name, label, type, pattern, required, confidence_threshold, location_hint }]

  // === VALIDATION RULES ===
  validationRules: jsonb('validation_rules').default([]), // Cross-field validation

  // === AI CONFIG ===
  ocrProvider: varchar('ocr_provider', { length: 50 }).default('GOOGLE_VISION'), // 'GOOGLE_VISION', 'AWS_TEXTRACT', 'AZURE_FORM_RECOGNIZER', 'CUSTOM'
  ocrConfig: jsonb('ocr_config').default({}),

  // === PREPROCESSING ===
  preProcessing: jsonb('pre_processing').default([]), // [{ type: 'DESKEW'|'DENOISE'|'CONTRAST', params }]

  // === POSTPROCESSING ===
  postProcessing: jsonb('post_processing').default([]), // [{ type: 'FORMAT_DATE'|'NORMALIZE_NAME', params }]

  // === SAMPLE ===
  sampleDocumentUrl: text('sample_document_url'),
  annotatedSampleUrl: text('annotated_sample_url'),

  // === STATS ===
  totalExtractions: integer('total_extractions').default(0),
  avgConfidence: decimal('avg_confidence', { precision: 5, scale: 4 }),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  docTypeIdx: index('idx_det_doc_type').on(table.documentType),
}));

/**
 * Intelligent Documents - AI-processed document metadata
 */
export const intelligentDocuments = pgTable('intelligent_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: integer('document_id').references(() => documentsUploads.id).notNull(),

  // === CLASSIFICATION ===
  detectedType: varchar('detected_type', { length: 100 }),
  classificationConfidence: decimal('classification_confidence', { precision: 5, scale: 4 }),
  alternativeTypes: jsonb('alternative_types'), // [{ type, confidence }]

  // === EXTRACTION ===
  extractionTemplateId: uuid('extraction_template_id').references(() => documentExtractionTemplates.id),
  extractionStatus: varchar('extraction_status', { length: 50 }).default('PENDING'), // 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVIEW_REQUIRED'
  extractedData: jsonb('extracted_data'),
  extractionConfidence: decimal('extraction_confidence', { precision: 5, scale: 4 }),
  fieldConfidences: jsonb('field_confidences'), // { field_name: confidence }
  rawOcrOutput: jsonb('raw_ocr_output'),
  extractedAt: timestamp('extracted_at'),

  // === QUALITY ===
  qualityScore: decimal('quality_score', { precision: 5, scale: 4 }),
  qualityIssues: jsonb('quality_issues'), // [{ type, severity, location, message }]

  // === VERIFICATION ===
  verificationStatus: varchar('verification_status', { length: 50 }).default('UNVERIFIED'), // 'UNVERIFIED', 'VERIFIED', 'REJECTED', 'SUSPICIOUS'
  verificationMethod: varchar('verification_method', { length: 50 }),
  verifiedBy: integer('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  verificationNotes: text('verification_notes'),
  corrections: jsonb('corrections'), // { field: { old, new, corrected_by, corrected_at } }

  // === CROSS-REFERENCE ===
  crossReferenceStatus: varchar('cross_reference_status', { length: 50 }), // 'PENDING', 'MATCHED', 'MISMATCH', 'NOT_FOUND'
  crossReferenceResults: jsonb('cross_reference_results'),

  // === TAMPERING DETECTION ===
  tamperingScore: decimal('tampering_score', { precision: 5, scale: 4 }),
  tamperingIndicators: jsonb('tampering_indicators'),

  // === METADATA ===
  documentHash: varchar('document_hash', { length: 64 }),
  fileMetadata: jsonb('file_metadata'), // { pages, dimensions, dpi, etc. }

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  documentIdx: index('idx_id_document').on(table.documentId),
  statusIdx: index('idx_id_status').on(table.extractionStatus),
  verificationIdx: index('idx_id_verification').on(table.verificationStatus),
}));

/**
 * AI Predictions - Model predictions with outcome tracking
 */
export const aiPredictions = pgTable('ai_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),

  // === MODEL ===
  modelCode: varchar('model_code', { length: 50 }).notNull(),
  modelVersion: varchar('model_version', { length: 20 }),

  // === CONTEXT ===
  predictionType: varchar('prediction_type', { length: 50 }).notNull(), // 'DEADLINE_RISK', 'CHURN_RISK', 'UPSELL_OPPORTUNITY', 'DOCUMENT_VALIDITY', 'TAX_ESTIMATE', 'COMPLIANCE_SCORE'
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),

  // === INPUT ===
  inputFeatures: jsonb('input_features'),

  // === PREDICTION ===
  predictionValue: jsonb('prediction_value').notNull(),
  confidence: decimal('confidence', { precision: 5, scale: 4 }),
  explanation: jsonb('explanation'), // Feature importance, reasoning

  // === OUTCOME (for model learning) ===
  actualOutcome: jsonb('actual_outcome'),
  outcomeRecordedAt: timestamp('outcome_recorded_at'),
  wasAccurate: boolean('was_accurate'),

  // === ACTION ===
  recommendedAction: text('recommended_action'),
  actionTaken: varchar('action_taken', { length: 100 }),
  actionTakenAt: timestamp('action_taken_at'),
  actionTakenBy: integer('action_taken_by').references(() => users.id),

  // === PERFORMANCE ===
  latencyMs: integer('latency_ms'),
  tokenUsage: jsonb('token_usage'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_aip_tenant').on(table.tenantId),
  typeIdx: index('idx_aip_type').on(table.predictionType),
  entityIdx: index('idx_aip_entity').on(table.entityType, table.entityId),
  createdIdx: index('idx_aip_created').on(table.createdAt),
}));

/**
 * Smart Recommendations - AI-generated next-best-action
 */
export const smartRecommendations = pgTable('smart_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  userId: integer('user_id').references(() => users.id),
  clientId: integer('client_id').references(() => users.id),

  // === RECOMMENDATION ===
  recommendationType: varchar('recommendation_type', { length: 50 }).notNull(), // 'MISSING_COMPLIANCE', 'UPSELL', 'CROSS_SELL', 'RISK_ALERT', 'OPTIMIZATION', 'ACTION_REQUIRED'
  category: varchar('category', { length: 100 }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),

  // === CONTEXT ===
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  relatedEntities: jsonb('related_entities'), // [{ type, id }]

  // === ACTION ===
  suggestedAction: varchar('suggested_action', { length: 50 }), // 'SUBSCRIBE_SERVICE', 'UPLOAD_DOCUMENT', 'FILE_RETURN', 'CONTACT_CLIENT'
  actionData: jsonb('action_data'),
  actionUrl: text('action_url'),

  // === PRIORITY ===
  priority: varchar('priority', { length: 20 }).default('MEDIUM'), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  confidence: decimal('confidence', { precision: 5, scale: 4 }),
  impactScore: decimal('impact_score', { precision: 5, scale: 2 }),

  // === VALUE ===
  potentialRevenue: decimal('potential_revenue', { precision: 15, scale: 2 }),
  potentialSavings: decimal('potential_savings', { precision: 15, scale: 2 }),
  riskReduction: decimal('risk_reduction', { precision: 5, scale: 2 }),

  // === STATUS ===
  status: varchar('status', { length: 50 }).default('PENDING'), // 'PENDING', 'VIEWED', 'ACCEPTED', 'DISMISSED', 'COMPLETED', 'EXPIRED'
  viewedAt: timestamp('viewed_at'),
  actionedAt: timestamp('actioned_at'),
  actionResult: varchar('action_result', { length: 50 }),
  dismissReason: text('dismiss_reason'),

  // === EXPIRY ===
  expiresAt: timestamp('expires_at'),

  // === SOURCE ===
  sourceModel: varchar('source_model', { length: 100 }),
  generatedBy: varchar('generated_by', { length: 50 }).default('AI'), // 'AI', 'RULE', 'MANUAL'

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_sr_tenant').on(table.tenantId),
  userIdx: index('idx_sr_user').on(table.userId),
  clientIdx: index('idx_sr_client').on(table.clientId),
  statusIdx: index('idx_sr_status').on(table.status),
  priorityIdx: index('idx_sr_priority').on(table.priority),
}));


// ============================================================================
// PART 6: CLIENT SERVICE SUBSCRIPTIONS
// Track which services clients are subscribed to
// ============================================================================

/**
 * Client Service Subscriptions - Active services per client
 */
export const clientServiceSubscriptions = pgTable('client_service_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  clientId: integer('client_id').references(() => users.id).notNull(),
  entityId: integer('entity_id').references(() => businessEntities.id),
  blueprintId: uuid('blueprint_id').references(() => serviceBlueprints.id).notNull(),

  // === SUBSCRIPTION DETAILS ===
  pricingTierId: uuid('pricing_tier_id').references(() => blueprintPricingTiers.id),
  subscriptionType: varchar('subscription_type', { length: 50 }).default('RECURRING'), // 'RECURRING', 'ONE_TIME', 'RETAINER'

  // === PERIOD ===
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  renewalDate: date('renewal_date'),

  // === PRICING ===
  agreedPrice: decimal('agreed_price', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('INR'),
  discountPct: decimal('discount_pct', { precision: 5, scale: 2 }).default('0'),
  billingFrequency: varchar('billing_frequency', { length: 20 }), // 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'PER_FILING'

  // === STATUS ===
  status: varchar('status', { length: 50 }).default('ACTIVE'), // 'PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: text('cancel_reason'),

  // === CONFIG OVERRIDES ===
  configOverrides: jsonb('config_overrides').default({}),
  assignedTeam: jsonb('assigned_team'), // [{ userId, role }]
  primaryAccountManager: integer('primary_account_manager').references(() => users.id),

  // === NOTES ===
  notes: text('notes'),

  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  clientIdx: index('idx_css_client').on(table.clientId),
  entityIdx: index('idx_css_entity').on(table.entityId),
  blueprintIdx: index('idx_css_blueprint').on(table.blueprintId),
  statusIdx: index('idx_css_status').on(table.status),
}));


// ============================================================================
// EXPORTS
// ============================================================================

export const blueprintsTables = {
  // Service Blueprints
  serviceBlueprints,
  blueprintPricingTiers,
  blueprintWorkflowSteps,
  blueprintDocumentTypes,
  blueprintComplianceRules,
  blueprintChecklists,

  // Compliance Calendar
  complianceCalendar,
  deadlineFormulas,
  penaltyRulesMaster,
  holidayCalendars,

  // Jurisdictions
  jurisdictions,
  jurisdictionRules,
  professionalTaxRates,

  // No-Code Builder
  customFieldDefinitions,
  customFieldValues,
  customFieldHistory,
  pageLayouts,
  automationRules,
  automationExecutionLog,

  // AI Intelligence
  documentExtractionTemplates,
  intelligentDocuments,
  aiPredictions,
  smartRecommendations,

  // Client Subscriptions
  clientServiceSubscriptions,
};

console.log('✅ Blueprints schema loaded (26 enterprise tables for compliance platform)');
