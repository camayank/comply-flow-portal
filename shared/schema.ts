import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ============================================================================
// SHARED ENUMS AND CONSTANTS
// ============================================================================

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPS_EXECUTIVE: 'ops_executive', // Execution team
  CUSTOMER_SERVICE: 'customer_service',
  CLIENT: 'client',
  AGENT: 'agent'
} as const;

// ⚠️ ROLE HIERARCHY MOVED TO server/rbac-middleware.ts
// DO NOT re-add here - this caused a security vulnerability (conflicting values)
// Authorization uses server/rbac-middleware.ts as the single source of truth

export const LEAD_STAGES = {
  NEW: 'new',
  HOT: 'hot_lead',
  WARM: 'warm_lead',
  COLD: 'cold_lead',
  NOT_ANSWERED: 'not_answered',
  NOT_INTERESTED: 'not_interested',
  CONVERTED: 'converted',
  LOST: 'lost'
} as const;

export const SERVICE_REQUEST_STATUS = {
  INITIATED: 'initiated',
  DOCS_UPLOADED: 'docs_uploaded',
  IN_PROGRESS: 'in_progress',
  READY_FOR_SIGN: 'ready_for_sign',
  QC_REVIEW: 'qc_review',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ON_HOLD: 'on_hold'
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIAL: 'partial'
} as const;

export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
  CRITICAL: 'critical'
} as const;

export const ENTITY_TYPES = {
  PVT_LTD: 'pvt_ltd',
  LLP: 'llp',
  OPC: 'opc',
  PARTNERSHIP: 'partnership',
  PROPRIETORSHIP: 'proprietorship',
  PUBLIC_LIMITED: 'public_limited'
} as const;

export const CLIENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DORMANT: 'dormant',
  CHURNED: 'churned'
} as const;

export const DEPARTMENTS = {
  PRE_SALES: 'pre_sales',
  SALES: 'sales',
  OPERATIONS: 'operations',
  QC: 'qc',
  ADMIN: 'admin',
  HR: 'hr',
  FINANCE: 'finance'
} as const;

export const ACTIVITY_TYPES = {
  STATUS_CHANGE: 'status_change',
  NOTE_ADDED: 'note_added',
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_REQUESTED: 'document_requested',
  FILING_UPDATE: 'filing_update',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  ASSIGNMENT_CHANGE: 'assignment_change',
  SLA_UPDATE: 'sla_update',
  ESCALATION: 'escalation',
  COMMUNICATION: 'communication',
  CASE_CREATED: 'case_created',
  CASE_COMPLETED: 'case_completed',
} as const;

export const FILING_STAGES = {
  NOT_FILED: 'not_filed',
  FILED: 'filed',
  ACKNOWLEDGED: 'acknowledged',
  QUERY_RAISED: 'query_raised',
  RESPONSE_SUBMITTED: 'response_submitted',
  UNDER_PROCESSING: 'under_processing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// Enhanced user system with multi-business support and security
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  fullName: text("full_name"),
  role: text("role").notNull().default("client"), // super_admin, admin, ops_executive, customer_service, client, agent
  department: text("department"), // operations, sales, admin, etc.
  businessEntityId: integer("business_entity_id"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  twoFactorSecret: text("two_factor_secret"),
  isTwoFactorEnabled: boolean("is_two_factor_enabled").default(false),
  createdBy: integer("created_by"), // User ID of creator (for audit trail)
  leadId: integer("lead_id"), // FK to leads.id - tracks original lead source
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced business entities with client master functionality
export const businessEntities = pgTable("business_entities", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  clientId: text("client_id").notNull().unique(), // C0001, C0002, etc.
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(), // pvt_ltd, llp, opc, partnership, proprietorship
  cin: text("cin"),
  gstin: text("gstin"),
  pan: text("pan"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  registrationDate: timestamp("registration_date"),
  complianceScore: integer("compliance_score").default(100),
  annualTurnover: decimal("annual_turnover", { precision: 15, scale: 2 }),
  employeeCount: integer("employee_count"),
  // Enhanced client master fields
  alternatePhone: text("alternate_phone"),
  state: text("state"),
  city: text("city"),
  address: text("address"),
  industryType: text("industry_type"),
  leadSource: text("lead_source"),
  referredBy: text("referred_by"),
  onboardingStage: text("onboarding_stage"),
  metadata: json("metadata"),
  acquisitionDate: timestamp("acquisition_date").defaultNow(),
  totalServicesAvailed: integer("total_services_availed").default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0.00"),
  lastServiceDate: timestamp("last_service_date"),
  clientStatus: text("client_status").default(CLIENT_STATUS.ACTIVE),
  pincode: text("pincode"),
  relationshipManager: text("relationship_manager"),
  communicationPreference: json("communication_preference"), // {email: true, whatsapp: true, call: false}
  documents: json("documents"), // stored document references
  notes: text("notes"),
  leadId: integer("lead_id"), // FK to leads.id - tracks conversion source
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User sessions for login tracking (enhanced with security features)
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  fingerprint: text("fingerprint"), // Session fingerprinting for hijack detection
  csrfToken: text("csrf_token"), // CSRF protection token
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(), // Track session activity
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  serviceId: text("service_id").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  deadline: text("deadline"),
  description: text("description"),
  requiredDocs: json("required_docs"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").unique(), // SR2600001 - human-readable ID
  userId: integer("user_id"),
  businessEntityId: integer("business_entity_id"),
  entityId: integer("entity_id"), // legacy compatibility (maps to business_entity_id)
  serviceId: text("service_id").notNull(),
  serviceType: text("service_type"), // legacy compatibility (maps to service_id)
  status: text("status").notNull().default("initiated"), // initiated, docs_uploaded, in_progress, ready_for_sign, completed, failed, on_hold
  periodLabel: text("period_label"),
  periodicity: text("periodicity"),
  progress: integer("progress").default(0), // 0-100
  currentMilestone: text("current_milestone"),
  milestoneHistory: json("milestone_history"), // [{milestone, date, status}]
  uploadedDocs: json("uploaded_docs"),
  documentHash: text("document_hash"),
  signatureData: json("signature_data"),
  paymentId: text("payment_id"),
  totalAmount: integer("total_amount").notNull(),
  slaDeadline: timestamp("sla_deadline"),
  dueDate: timestamp("due_date"),
  expectedCompletion: timestamp("expected_completion"),
  actualCompletion: timestamp("actual_completion"),
  assignedTeamMember: integer("assigned_team_member"),
  assignedAgentId: integer("assigned_agent_id"), // preferred agent for commission attribution
  dependsOnService: integer("depends_on_service"), // foreign key to other service
  priority: text("priority").default("medium"), // low, medium, high, urgent
  clientNotes: text("client_notes"),
  internalNotes: text("internal_notes"),
  description: text("description"),
  leadId: integer("lead_id"), // FK to leads.id - tracks original lead
  // Filing status tracking
  filingStage: text("filing_stage").default("not_filed"), // not_filed, filed, acknowledged, query_raised, response_submitted, under_processing, approved, rejected
  filingDate: timestamp("filing_date"),
  filingPortal: text("filing_portal"), // GST Portal, MCA, FSSAI, ITR, etc.
  arnNumber: text("arn_number"), // Application Reference Number
  queryDetails: text("query_details"),
  queryRaisedAt: timestamp("query_raised_at"),
  responseSubmittedAt: timestamp("response_submitted_at"),
  finalStatus: text("final_status"), // approved, rejected
  finalStatusDate: timestamp("final_status_date"),
  certificateUrl: text("certificate_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  paymentId: text("payment_id").notNull().unique(),
  serviceRequestId: integer("service_request_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed, refunded
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  leadId: integer("lead_id"), // FK to leads.id - tracks revenue attribution
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Commission approvals and payouts
export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(), // earner user id / agent id
  serviceOrderId: integer("service_order_id"), // legacy universal service order id
  serviceRequestId: integer("service_request_id"), // core service request id
  leadId: integer("lead_id"),
  commissionType: text("commission_type").default("service"), // lead_conversion, referral, renewal, bonus
  baseAmount: decimal("base_amount", { precision: 12, scale: 2 }),
  commissionRate: decimal("commission_rate", { precision: 6, scale: 2 }),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, pending_approval, approved, paid, rejected, disputed
  payableOn: timestamp("payable_on"),
  paidOn: timestamp("paid_on"),
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
  adjustedAmount: decimal("adjusted_amount", { precision: 12, scale: 2 }),
  rejectedBy: integer("rejected_by"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Commission dispute management
export const commissionDisputes = pgTable("commission_disputes", {
  id: serial("id").primaryKey(),
  disputeNumber: text("dispute_number").notNull().unique(),
  commissionId: integer("commission_id").notNull(),
  status: text("status").notNull().default("submitted"), // submitted, under_review, approved, partially_approved, rejected
  category: text("category").notNull(),
  reason: text("reason").notNull(),
  expectedAmount: decimal("expected_amount", { precision: 12, scale: 2 }),
  evidence: json("evidence"),
  disputedBy: integer("disputed_by").notNull(),
  disputedAt: timestamp("disputed_at").defaultNow(),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  action: text("action"), // approve, partial_approve, reject
  adjustedAmount: decimal("adjusted_amount", { precision: 12, scale: 2 }),
  timeline: json("timeline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const complianceTracking = pgTable("compliance_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessEntityId: integer("business_entity_id"), // link to specific business entity
  complianceRuleId: integer("compliance_rule_id"), // link to compliance_rules table
  serviceId: text("service_id").notNull(),
  serviceType: text("service_type"), // descriptive name for display
  entityName: text("entity_name"), // business entity name for display
  complianceType: text("compliance_type").notNull(), // monthly, quarterly, annual, event-based
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, overdue, completed, not_applicable
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  healthScore: integer("health_score").default(100), // 0-100
  lastCompleted: timestamp("last_completed"),
  nextDueDate: timestamp("next_due_date"),
  remindersSent: integer("reminders_sent").default(0),
  penaltyRisk: boolean("penalty_risk").default(false),
  estimatedPenalty: integer("estimated_penalty").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comprehensive Compliance Rules Library
// Covers Companies Act 2013, GST, Income Tax, PF/ESI, and other Indian regulations
export const complianceRules = pgTable("compliance_rules", {
  id: serial("id").primaryKey(),
  ruleCode: text("rule_code").notNull().unique(), // e.g., "GST_GSTR3B_MONTHLY", "ROC_AOC4_ANNUAL"
  regulationCategory: text("regulation_category").notNull(), // companies_act, gst, income_tax, pf_esi, labour_laws, professional_tax
  complianceName: text("compliance_name").notNull(), // "GSTR-3B Monthly Return", "AOC-4 Financial Statements"
  formNumber: text("form_number"), // "GSTR-3B", "AOC-4", "24Q", "DIR-3 KYC"
  description: text("description"),
  periodicity: text("periodicity").notNull(), // monthly, quarterly, half_yearly, annual, event_based, one_time
  dueDateCalculationType: text("due_date_calculation_type").notNull(), // fixed_date, relative_to_month_end, relative_to_quarter_end, relative_to_fy_end, event_triggered
  dueDateFormula: json("due_date_formula").notNull(), // {type: "fixed", day: 20, month_offset: 1} or {type: "fy_end", days_after: 180}
  applicableEntityTypes: json("applicable_entity_types"), // ["pvt_ltd", "llp", "opc"] or null for all
  turnoverThresholdMin: decimal("turnover_threshold_min", { precision: 15, scale: 2 }), // minimum turnover for applicability
  turnoverThresholdMax: decimal("turnover_threshold_max", { precision: 15, scale: 2 }), // maximum turnover for applicability
  employeeCountMin: integer("employee_count_min"), // minimum employee count for applicability (PF/ESI)
  employeeCountMax: integer("employee_count_max"), // maximum employee count
  stateSpecific: boolean("state_specific").default(false), // true for Professional Tax, Shops & Establishments
  applicableStates: json("applicable_states"), // ["Maharashtra", "Karnataka"] or null for all India
  priorityLevel: text("priority_level").notNull().default("medium"), // low, medium, high, critical
  penaltyRiskLevel: text("penalty_risk_level").notNull().default("medium"), // low, medium, high, critical
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"), // null means currently effective
  version: integer("version").default(1), // for tracking regulatory changes
  replacesRuleId: integer("replaces_rule_id"), // link to previous version if law changed
  metadata: json("metadata"), // additional info like links to official govt circulars
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Required Documents Matrix
// Maps each compliance to its required documentation
export const complianceRequiredDocuments = pgTable("compliance_required_documents", {
  id: serial("id").primaryKey(),
  complianceRuleId: integer("compliance_rule_id").notNull(),
  documentType: text("document_type").notNull(), // "audited_financials", "bank_statements", "sales_register"
  documentName: text("document_name").notNull(), // "Audited Financial Statements"
  isMandatory: boolean("is_mandatory").default(true),
  description: text("description"),
  format: json("format"), // ["PDF", "Excel"] accepted formats
  validityPeriod: text("validity_period"), // "current_fy", "last_12_months", "as_of_filing_date"
  order: integer("order").default(1), // display order
  createdAt: timestamp("created_at").defaultNow(),
});

// Penalty Calculation Rules
// Formulas for calculating late filing penalties and interest
export const compliancePenaltyDefinitions = pgTable("compliance_penalty_definitions", {
  id: serial("id").primaryKey(),
  complianceRuleId: integer("compliance_rule_id").notNull(),
  penaltyType: text("penalty_type").notNull(), // late_fee, interest, additional_penalty
  calculationType: text("calculation_type").notNull(), // per_day, percentage_per_month, fixed_amount, slab_based
  calculationFormula: json("calculation_formula").notNull(), // {base_amount: 50, per_day_rate: 50, max_amount: 5000} for GST
  gracePeriodDays: integer("grace_period_days").default(0),
  minPenalty: decimal("min_penalty", { precision: 12, scale: 2 }),
  maxPenalty: decimal("max_penalty", { precision: 12, scale: 2 }),
  compoundingAllowed: boolean("compounding_allowed").default(false),
  notes: text("notes"), // additional context for penalty calculation
  legalReference: text("legal_reference"), // section number of the act
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// State-Specific Rule Overrides
// Handles variations like Professional Tax rates, Shops & Establishments rules by state
export const complianceJurisdictionOverrides = pgTable("compliance_jurisdiction_overrides", {
  id: serial("id").primaryKey(),
  complianceRuleId: integer("compliance_rule_id").notNull(),
  state: text("state").notNull(), // "Maharashtra", "Karnataka", etc.
  overrideField: text("override_field").notNull(), // "due_date_formula", "penalty_definition", "turnover_threshold"
  overrideValue: json("override_value").notNull(), // the state-specific value
  description: text("description"),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

// SLA Timers for enhanced monitoring
export const slaTimers = pgTable("sla_timers", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  serviceCode: text("service_code").notNull(),
  standardHours: integer("standard_hours").notNull(),
  startTime: timestamp("start_time").notNull(),
  pausedAt: timestamp("paused_at"),
  totalPausedMinutes: integer("total_paused_minutes").default(0),
  pauseReasons: json("pause_reasons"),
  status: text("status").notNull().default("on_track"), // on_track, at_risk, warning, breached, paused
  escalationLevel: text("escalation_level"), // t24_warning, t4_warning, breach, critical
  lastEscalationAt: timestamp("last_escalation_at"),
  completedAt: timestamp("completed_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SLA Exceptions for handling special cases
export const slaExceptions = pgTable("sla_exceptions", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  requestedBy: integer("requested_by").notNull(),
  approvedBy: integer("approved_by"),
  exceptionType: text("exception_type").notNull(), // client_delay, external_dependency, system_issue
  reason: text("reason").notNull(),
  requestedExtensionHours: integer("requested_extension_hours").notNull(),
  approvedExtensionHours: integer("approved_extension_hours"),
  status: text("status").default("pending"), // pending, approved, rejected
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  approvalNotes: text("approval_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
});

export const retainershipPlans = pgTable("retainership_plans", {
  id: serial("id").primaryKey(),
  planId: text("plan_id").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(), // basic, standard, premium, enterprise
  monthlyFee: integer("monthly_fee").notNull(),
  yearlyFee: integer("yearly_fee"),
  discountPercentage: integer("discount_percentage").default(0),
  maxServices: integer("max_services"), // null for unlimited
  includedServices: json("included_services").notNull(),
  features: json("features").notNull(),
  dedicatedSupport: boolean("dedicated_support").default(false),
  priorityHandling: boolean("priority_handling").default(false),
  customReporting: boolean("custom_reporting").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRetainershipSubscriptions = pgTable("user_retainership_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planId: text("plan_id").notNull(),
  status: text("status").notNull().default("active"), // active, paused, cancelled, expired
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly, yearly
  nextBillingDate: timestamp("next_billing_date"),
  servicesUsed: integer("services_used").default(0),
  totalSavings: integer("total_savings").default(0),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const smartSuggestions = pgTable("smart_suggestions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  suggestionType: text("suggestion_type").notNull(), // service_combo, compliance_alert, cost_optimization, timeline_optimization
  title: text("title").notNull(),
  description: text("description").notNull(),
  suggestedServices: json("suggested_services"),
  potentialSavings: integer("potential_savings").default(0),
  confidenceScore: integer("confidence_score").default(0), // 0-100
  priority: text("priority").notNull().default("medium"), // low, medium, high
  status: text("status").notNull().default("pending"), // pending, accepted, dismissed, expired
  validUntil: timestamp("valid_until"),
  metadata: json("metadata"), // additional context for the suggestion
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentVault = pgTable("document_vault", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessEntityId: integer("business_entity_id"),
  serviceRequestId: integer("service_request_id"),
  documentType: text("document_type").notNull(), // incorporation_certificate, gst_certificate, annual_filing, etc.
  category: text("category").notNull().default("general"), // kyc, tax, license, compliance, legal
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  fileUrl: text("file_url").notNull(),
  version: integer("version").default(1),
  parentDocumentId: integer("parent_document_id"), // for version control
  downloadCount: integer("download_count").default(0),
  isOfficial: boolean("is_official").default(false), // government issued documents
  approvalStatus: text("approval_status").default("pending"), // pending, approved, rejected, under_review
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  expiryDate: timestamp("expiry_date"),
  reminderSent: boolean("reminder_sent").default(false),
  tags: json("tags"), // for categorization and search
  accessLevel: text("access_level").notNull().default("private"), // private, shared, public
  encryptionKey: text("encryption_key"),
  checksumHash: text("checksum_hash"),
  ocrData: json("ocr_data"), // extracted text and metadata
  aiVerificationStatus: text("ai_verification_status").default("pending"), // pending, verified, failed
  createdAt: timestamp("created_at").defaultNow(),
  lastAccessed: timestamp("last_accessed"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client tasks and pending actions
export const clientTasks = pgTable("client_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessEntityId: integer("business_entity_id"),
  serviceRequestId: integer("service_request_id"),
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull(), // document_upload, form_fill, approval, payment, info_required
  status: text("status").default("pending"), // pending, completed, overdue, cancelled
  priority: text("priority").default("medium"), // low, medium, high, urgent
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  requiredDocuments: json("required_documents"),
  templateUrl: text("template_url"),
  assignedBy: integer("assigned_by"),
  remindersSent: integer("reminders_sent").default(0),
  nextReminderAt: timestamp("next_reminder_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// UNIVERSAL TASK MANAGEMENT SYSTEM
// ============================================================================

// Universal tasks - works for all user types (client, admin, ops, agent)
export const taskItems = pgTable("task_items", {
  id: serial("id").primaryKey(),
  taskNumber: text("task_number").notNull().unique(), // TASK-2024-001
  title: text("title").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull(), // user_created, service_related, compliance, reminder, approval
  
  // User assignments
  initiatorId: integer("initiator_id").notNull(), // Who created the task
  assigneeId: integer("assignee_id"), // Primary assignee
  assigneeRole: text("assignee_role"), // Role-based assignment (admin, ops_executive, etc.)
  
  // Status and progress
  status: text("status").notNull().default("pending"), // pending, in_progress, awaiting_verification, completed, reopened, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  progress: integer("progress").default(0), // 0-100%
  
  // Timing
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"),
  completedAt: timestamp("completed_at"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  
  // Workflow and approval
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  requiresChecklist: boolean("requires_checklist").default(false),
  checklist: json("checklist"), // [{item: string, checked: boolean}]
  
  // Recurrence
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"), // daily, weekly, monthly, quarterly
  nextOccurrence: timestamp("next_occurrence"),
  
  // Related entities
  serviceRequestId: integer("service_request_id"),
  businessEntityId: integer("business_entity_id"),
  parentTaskId: integer("parent_task_id"),
  templateId: integer("template_id"),
  
  // Additional data
  tags: json("tags"), // ["urgent", "compliance", "client-facing"]
  attachments: json("attachments"),
  metadata: json("metadata"),
  
  // Tracking
  reopenCount: integer("reopen_count").default(0),
  lastReminderSent: timestamp("last_reminder_sent"),
  reminderCount: integer("reminder_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task participants - watchers and secondary assignees
export const taskParticipants = pgTable("task_participants", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(), // watcher, contributor, approver
  notifyOnUpdate: boolean("notify_on_update").default(true),
  addedAt: timestamp("added_at").defaultNow(),
});

// Task dependencies
export const taskDependencies = pgTable("task_dependencies", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(), // This task
  dependsOnTaskId: integer("depends_on_task_id").notNull(), // Depends on this
  dependencyType: text("dependency_type").default("blocks"), // blocks, related_to
  createdAt: timestamp("created_at").defaultNow(),
});

// Task subtasks
export const taskSubtasks = pgTable("task_subtasks", {
  id: serial("id").primaryKey(),
  parentTaskId: integer("parent_task_id").notNull(),
  childTaskId: integer("child_task_id").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task activity log - full audit trail
export const taskActivityLog = pgTable("task_activity_log", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // created, assigned, updated, completed, reopened, commented
  fieldChanged: text("field_changed"), // status, assignee, due_date, etc.
  oldValue: text("old_value"),
  newValue: text("new_value"),
  comment: text("comment"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Task templates for quick creation
export const userTaskTemplates = pgTable("user_task_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull(),
  defaultAssigneeRole: text("default_assignee_role"),
  defaultPriority: text("default_priority").default("medium"),
  defaultDurationHours: integer("default_duration_hours"),
  requiresApproval: boolean("requires_approval").default(false),
  checklist: json("checklist"),
  tags: json("tags"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task reminders - stores reminder schedules
export const taskReminders = pgTable("task_reminders", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  reminderType: text("reminder_type").notNull(), // due_date, overdue, custom
  daysOffset: integer("days_offset"), // -7, -3, -1, 0 (negative = before due)
  reminderTime: timestamp("reminder_time"), // Specific time for reminder
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at"),
  channels: json("channels"), // ["email", "whatsapp", "in_app"]
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// In-app messaging system
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  serviceRequestId: integer("service_request_id"),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id"),
  messageType: text("message_type").default("text"), // text, file, system_notification
  content: text("content"),
  attachments: json("attachments"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  isSystemMessage: boolean("is_system_message").default(false),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notification system
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // status_change, task_assignment, document_approval, sla_breach, reminder
  category: text("category").default("general"), // service, document, task, payment, system
  priority: text("priority").default("normal"), // low, normal, high, urgent
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  actionUrl: text("action_url"),
  actionText: text("action_text"),
  channelPreferences: json("channel_preferences"), // {email: true, whatsapp: true, in_app: true}
  sentChannels: json("sent_channels"), // track which channels message was sent to
  metadata: json("metadata"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service history and completed services
export const serviceHistory = pgTable("service_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessEntityId: integer("business_entity_id"),
  serviceId: text("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  status: text("status").notNull(), // completed, cancelled, refunded
  startDate: timestamp("start_date").notNull(),
  completedDate: timestamp("completed_date"),
  duration: integer("duration"), // days taken
  totalAmount: integer("total_amount"),
  deliverables: json("deliverables"), // list of delivered documents/certificates
  clientSatisfaction: integer("client_satisfaction"), // 1-5 rating
  feedbackNotes: text("feedback_notes"),
  certificates: json("certificates"), // government certificates/approvals
  complianceImpact: text("compliance_impact"), // how it affected compliance score
  renewalRequired: boolean("renewal_required").default(false),
  nextRenewalDate: timestamp("next_renewal_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs for audit trail
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  businessEntityId: integer("business_entity_id"),
  serviceRequestId: integer("service_request_id"),
  action: text("action").notNull(), // login, document_upload, status_change, etc.
  entityType: text("entity_type"), // user, service, document, task
  entityId: integer("entity_id"),
  details: text("details"),
  metadata: json("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// FAQ and knowledge base
export const faqCategories = pgTable("faq_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentCategoryId: integer("parent_category_id"),
  serviceId: text("service_id"), // link to specific service
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  tags: json("tags"),
  viewCount: integer("view_count").default(0),
  isHelpful: integer("is_helpful").default(0), // +/- votes
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document templates
export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  templateType: text("template_type").notNull(), // board_resolution, agreement, declaration, form
  category: text("category"), // incorporation, compliance, tax, legal
  fileUrl: text("file_url").notNull(),
  version: text("version").default("1.0"),
  isActive: boolean("is_active").default(true),
  downloadCount: integer("download_count").default(0),
  requiredFields: json("required_fields"), // fields that need to be filled
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// QC AND DELIVERY TRACKING TABLES
// ============================================================================

export const QC_REVIEW_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress', 
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REWORK_REQUIRED: 'rework_required',
  ESCALATED: 'escalated'
} as const;

export const QUALITY_SCORE = {
  EXCELLENT: 95,
  GOOD: 85,
  SATISFACTORY: 75,
  NEEDS_IMPROVEMENT: 65,
  POOR: 50
} as const;

export const DELIVERY_STATUS = {
  PENDING_QC: 'pending_qc',
  QC_APPROVED: 'qc_approved',
  READY_FOR_DELIVERY: 'ready_for_delivery',
  DELIVERED: 'delivered',
  CLIENT_CONFIRMED: 'client_confirmed',
  DELIVERY_REJECTED: 'delivery_rejected'
} as const;

// Quality Control Reviews
export const qualityReviews = pgTable("quality_reviews", {
  id: serial("id").primaryKey(),
  reviewId: text("review_id").unique(), // QC26000001 - human-readable ID
  serviceRequestId: integer("service_request_id").notNull(),
  reviewerId: integer("reviewer_id").notNull(), // QC team member
  assignedAt: timestamp("assigned_at").defaultNow(),
  status: text("status").notNull().default(QC_REVIEW_STATUS.PENDING),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  
  // Quality assessment
  qualityScore: integer("quality_score"), // 0-100
  checklist: json("checklist").notNull(), // quality checklist items with completion status
  checklistCompleted: boolean("checklist_completed").default(false),
  
  // Document review
  documentsReviewed: json("documents_reviewed"), // document IDs and their review status
  documentIssues: json("document_issues"), // issues found in documents
  
  // Review details
  reviewNotes: text("review_notes"),
  internalComments: text("internal_comments"),
  clientFacingNotes: text("client_facing_notes"),
  
  // Approval workflow
  approvalLevel: integer("approval_level").default(1), // multi-level approvals
  approvedBy: json("approved_by"), // array of approver user IDs
  rejectionReason: text("rejection_reason"),
  reworkInstructions: text("rework_instructions"),
  
  // Timing
  reviewStartedAt: timestamp("review_started_at"),
  reviewCompletedAt: timestamp("review_completed_at"),
  slaDeadline: timestamp("sla_deadline"),
  
  // Issue tracking
  issuesFound: json("issues_found"), // categorized issues
  criticalIssues: integer("critical_issues").default(0),
  minorIssues: integer("minor_issues").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Delivery Confirmations
export const deliveryConfirmations = pgTable("delivery_confirmations", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  qualityReviewId: integer("quality_review_id").notNull(),
  clientId: integer("client_id").notNull(),
  
  // Delivery details
  deliveryMethod: text("delivery_method").notNull(), // email, portal_download, physical_delivery
  deliveredBy: integer("delivered_by").notNull(), // ops team member
  deliveredAt: timestamp("delivered_at").defaultNow(),
  
  // Client confirmation
  clientConfirmedAt: timestamp("client_confirmed_at"),
  confirmationMethod: text("confirmation_method"), // portal_click, email_reply, phone_call
  clientSignature: text("client_signature"), // digital signature data
  
  // Delivery status
  status: text("status").notNull().default(DELIVERY_STATUS.READY_FOR_DELIVERY),
  deliveryNotes: text("delivery_notes"),
  clientInstructions: text("client_instructions"),
  
  // Handoff documentation
  handoffDocument: json("handoff_document"), // structured handoff details
  deliverables: json("deliverables").notNull(), // list of delivered items
  accessInstructions: text("access_instructions"),
  
  // Follow-up
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  
  // Client satisfaction
  satisfactionRating: integer("satisfaction_rating"), // 1-5 stars
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quality Metrics and Analytics
export const qualityMetrics = pgTable("quality_metrics", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  qualityReviewId: integer("quality_review_id"),
  
  // Performance metrics
  timeToQc: integer("time_to_qc"), // minutes from completion to QC start
  qcDuration: integer("qc_duration"), // minutes for QC review
  timeToDelivery: integer("time_to_delivery"), // minutes from QC approval to delivery
  totalProcessingTime: integer("total_processing_time"), // end-to-end time
  
  // Quality scores
  overallQualityScore: integer("overall_quality_score"), // 0-100
  documentQuality: integer("document_quality"), // 0-100
  processAdherence: integer("process_adherence"), // 0-100
  clientCommunication: integer("client_communication"), // 0-100
  
  // Issue metrics
  defectCount: integer("defect_count").default(0),
  reworkCount: integer("rework_count").default(0),
  escalationCount: integer("escalation_count").default(0),
  
  // SLA performance
  slaCompliance: boolean("sla_compliance").default(true),
  slaVariance: integer("sla_variance"), // minutes over/under SLA
  
  // Team performance
  reviewerEfficiency: integer("reviewer_efficiency"), // 0-100
  firstPassSuccess: boolean("first_pass_success").default(true),
  
  // Client satisfaction
  clientSatisfaction: integer("client_satisfaction"), // 1-5
  npsScore: integer("nps_score"), // Net Promoter Score
  
  // Benchmarking
  performanceCategory: text("performance_category"), // excellent, good, average, poor
  improvementAreas: json("improvement_areas"),
  
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Client Feedback System
export const clientFeedback = pgTable("client_feedback", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  deliveryConfirmationId: integer("delivery_confirmation_id"),
  clientId: integer("client_id").notNull(),
  
  // Feedback details
  overallRating: integer("overall_rating").notNull(), // 1-5 stars
  serviceQuality: integer("service_quality"), // 1-5
  timeliness: integer("timeliness"), // 1-5
  communication: integer("communication"), // 1-5
  documentation: integer("documentation"), // 1-5
  
  // Written feedback
  positiveAspects: text("positive_aspects"),
  improvementSuggestions: text("improvement_suggestions"),
  additionalComments: text("additional_comments"),
  
  // NPS and recommendation
  npsScore: integer("nps_score"), // 0-10 likelihood to recommend
  wouldRecommend: boolean("would_recommend"),
  referralPotential: text("referral_potential"), // high, medium, low
  
  // Service specific
  serviceCategory: text("service_category"), // incorporation, compliance, tax, etc.
  specificService: text("specific_service"),
  
  // Follow-up
  requestsFollowUp: boolean("requests_follow_up").default(false),
  followUpType: text("follow_up_type"), // call, meeting, email
  followUpCompleted: boolean("follow_up_completed").default(false),
  
  // Resolution
  hasIssues: boolean("has_issues").default(false),
  issuesDescription: text("issues_description"),
  issueResolved: boolean("issue_resolved").default(false),
  resolutionNotes: text("resolution_notes"),
  
  // Metadata
  feedbackChannel: text("feedback_channel").default("portal"), // portal, email, call, survey
  isAnonymous: boolean("is_anonymous").default(false),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  submittedAt: timestamp("submitted_at").defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quality Checklist Templates
export const qualityChecklists = pgTable("quality_checklists", {
  id: serial("id").primaryKey(),
  serviceType: text("service_type").notNull(),
  checklistName: text("checklist_name").notNull(),
  version: text("version").default("1.0"),
  
  // Checklist structure
  checklistItems: json("checklist_items").notNull(), // array of checklist items
  mandatoryItems: json("mandatory_items"), // items that must pass
  scoringCriteria: json("scoring_criteria"), // how to calculate quality score
  
  // Configuration
  approvalThreshold: integer("approval_threshold").default(80), // minimum score to approve
  escalationThreshold: integer("escalation_threshold").default(60), // score below which to escalate
  
  // Metadata
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  category: text("category"),
  description: text("description"),
  
  createdBy: integer("created_by"),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User management schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
  twoFactorSecret: true,
});

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  password: true, // Password updates handled separately
  twoFactorSecret: true,
}).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  rejectedAt: true,
  paidOn: true,
  payableOn: true,
});

export const insertCommissionDisputeSchema = createInsertSchema(commissionDisputes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  disputedAt: true,
  resolvedAt: true,
});

export const insertComplianceTrackingSchema = createInsertSchema(complianceTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceRuleSchema = createInsertSchema(complianceRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceRequiredDocumentSchema = createInsertSchema(complianceRequiredDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertCompliancePenaltyDefinitionSchema = createInsertSchema(compliancePenaltyDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceJurisdictionOverrideSchema = createInsertSchema(complianceJurisdictionOverrides).omit({
  id: true,
  createdAt: true,
});

export const insertRetainershipPlanSchema = createInsertSchema(retainershipPlans).omit({
  id: true,
  createdAt: true,
});

export const insertUserRetainershipSubscriptionSchema = createInsertSchema(userRetainershipSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSmartSuggestionSchema = createInsertSchema(smartSuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentVaultSchema = createInsertSchema(documentVault).omit({
  id: true,
  createdAt: true,
});

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type CommissionDispute = typeof commissionDisputes.$inferSelect;
export type InsertCommissionDispute = z.infer<typeof insertCommissionDisputeSchema>;
export type ComplianceTracking = typeof complianceTracking.$inferSelect;
export type InsertComplianceTracking = z.infer<typeof insertComplianceTrackingSchema>;
export type ComplianceRule = typeof complianceRules.$inferSelect;
export type InsertComplianceRule = z.infer<typeof insertComplianceRuleSchema>;
export type ComplianceRequiredDocument = typeof complianceRequiredDocuments.$inferSelect;
export type InsertComplianceRequiredDocument = z.infer<typeof insertComplianceRequiredDocumentSchema>;
export type CompliancePenaltyDefinition = typeof compliancePenaltyDefinitions.$inferSelect;
export type InsertCompliancePenaltyDefinition = z.infer<typeof insertCompliancePenaltyDefinitionSchema>;
export type ComplianceJurisdictionOverride = typeof complianceJurisdictionOverrides.$inferSelect;
export type InsertComplianceJurisdictionOverride = z.infer<typeof insertComplianceJurisdictionOverrideSchema>;
export type RetainershipPlan = typeof retainershipPlans.$inferSelect;
export type InsertRetainershipPlan = z.infer<typeof insertRetainershipPlanSchema>;
export type UserRetainershipSubscription = typeof userRetainershipSubscriptions.$inferSelect;
export type InsertUserRetainershipSubscription = z.infer<typeof insertUserRetainershipSubscriptionSchema>;
export type SmartSuggestion = typeof smartSuggestions.$inferSelect;
export type InsertSmartSuggestion = z.infer<typeof insertSmartSuggestionSchema>;
export type DocumentVault = typeof documentVault.$inferSelect;
export type InsertDocumentVault = z.infer<typeof insertDocumentVaultSchema>;

// Add new schema exports for client portal
export const insertBusinessEntitySchema = createInsertSchema(businessEntities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientTaskSchema = createInsertSchema(clientTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Universal Task System Schemas
export const insertTaskItemSchema = createInsertSchema(taskItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskParticipantSchema = createInsertSchema(taskParticipants).omit({
  id: true,
  addedAt: true,
});

export const insertTaskDependencySchema = createInsertSchema(taskDependencies).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSubtaskSchema = createInsertSchema(taskSubtasks).omit({
  id: true,
  createdAt: true,
});

export const insertTaskActivityLogSchema = createInsertSchema(taskActivityLog).omit({
  id: true,
  createdAt: true,
});

export const insertUserTaskTemplateSchema = createInsertSchema(userTaskTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskReminderSchema = createInsertSchema(taskReminders).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertServiceHistorySchema = createInsertSchema(serviceHistory).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

// Tables are defined later in the file

// Enhanced type exports for client portal
export type BusinessEntity = typeof businessEntities.$inferSelect;
export type InsertBusinessEntity = z.infer<typeof insertBusinessEntitySchema>;
export type ClientTask = typeof clientTasks.$inferSelect;
export type InsertClientTask = z.infer<typeof insertClientTaskSchema>;

// Universal Task System Types
export type TaskItem = typeof taskItems.$inferSelect;
export type InsertTaskItem = z.infer<typeof insertTaskItemSchema>;
export type TaskParticipant = typeof taskParticipants.$inferSelect;
export type InsertTaskParticipant = z.infer<typeof insertTaskParticipantSchema>;
export type TaskDependency = typeof taskDependencies.$inferSelect;
export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;
export type TaskSubtask = typeof taskSubtasks.$inferSelect;
export type InsertTaskSubtask = z.infer<typeof insertTaskSubtaskSchema>;
export type TaskActivityLog = typeof taskActivityLog.$inferSelect;
export type InsertTaskActivityLog = z.infer<typeof insertTaskActivityLogSchema>;
export type UserTaskTemplate = typeof userTaskTemplates.$inferSelect;
export type InsertUserTaskTemplate = z.infer<typeof insertUserTaskTemplateSchema>;
export type TaskReminder = typeof taskReminders.$inferSelect;
export type InsertTaskReminder = z.infer<typeof insertTaskReminderSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ServiceHistory = typeof serviceHistory.$inferSelect;
export type InsertServiceHistory = z.infer<typeof insertServiceHistorySchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type FAQ = typeof faqs.$inferSelect;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;

// Enhanced operations team with HR functionality
export const operationsTeam = pgTable("operations_team", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  employeeId: text("employee_id").notNull().unique(), // EMP001, EMP002, etc.
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  department: text("department").notNull(), // Pre-Sales, Sales, Operations, QC, Admin, etc.
  role: text("role").notNull(), // ops_executive, ops_lead, qa_reviewer, admin, executive, manager
  joiningDate: timestamp("joining_date").notNull(),
  specialization: json("specialization"), // service types they handle
  workloadCapacity: integer("workload_capacity").default(10),
  currentWorkload: integer("current_workload").default(0),
  performanceRating: decimal("performance_rating", { precision: 3, scale: 2 }),
  targetAchievement: decimal("target_achievement", { precision: 5, scale: 2 }),
  managerId: integer("manager_id"),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  incentives: decimal("incentives", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskTemplates = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  serviceId: text("service_id").notNull(),
  templateName: text("template_name").notNull(),
  taskList: json("task_list").notNull(), // [{name, description, estimatedHours, dependencies, mandatory}]
  defaultDeadlines: json("default_deadlines"), // days per task
  qaRequired: boolean("qa_required").default(false),
  instructions: text("instructions"),
  requiredDocuments: json("required_documents"),
  checklistItems: json("checklist_items"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const operationsTasks = pgTable("operations_tasks", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  assignedTo: integer("assigned_to"),
  assignedBy: integer("assigned_by"),
  taskName: text("task_name").notNull(),
  description: text("description"),
  status: text("status").default("to_do"), // to_do, in_progress, waiting, completed, rework_required
  priority: text("priority").default("medium"), // low, medium, high, urgent
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  dependencies: json("dependencies"), // task IDs this depends on
  isParallel: boolean("is_parallel").default(true),
  qaRequired: boolean("qa_required").default(false),
  qaStatus: text("qa_status").default("pending"), // pending, approved, rejected
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reworkCount: integer("rework_count").default(0),
  internalNotes: text("internal_notes"),
  checklistCompleted: json("checklist_completed"), // completed checklist items
  attachments: json("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const internalComments = pgTable("internal_comments", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // service_request, task, client
  entityId: integer("entity_id").notNull(),
  authorId: integer("author_id").notNull(),
  content: text("content").notNull(),
  mentions: json("mentions"), // user IDs mentioned
  attachments: json("attachments"),
  isPrivate: boolean("is_private").default(true),
  parentCommentId: integer("parent_comment_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const handoverHistory = pgTable("handover_history", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id"),
  taskId: integer("task_id"),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  handoverReason: text("handover_reason"),
  handoverNotes: text("handover_notes"),
  completedTasks: json("completed_tasks"),
  pendingTasks: json("pending_tasks"),
  contextNotes: text("context_notes"),
  handoverDate: timestamp("handover_date").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  isAccepted: boolean("is_accepted").default(false),
});

export const performanceMetrics = pgTable("performance_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  period: text("period").notNull(), // daily, weekly, monthly
  periodDate: timestamp("period_date").notNull(),
  tasksCompleted: integer("tasks_completed").default(0),
  tasksOnTime: integer("tasks_on_time").default(0),
  tasksReworked: integer("tasks_reworked").default(0),
  totalHoursWorked: integer("total_hours_worked").default(0),
  avgTaskCompletionTime: integer("avg_task_completion_time"), // in hours
  slaComplianceRate: decimal("sla_compliance_rate", { precision: 5, scale: 2 }),
  errorRate: decimal("error_rate", { precision: 5, scale: 2 }),
  serviceTypeMetrics: json("service_type_metrics"), // per service type performance
  createdAt: timestamp("created_at").defaultNow(),
});

export const opsKnowledgeBase = pgTable("ops_knowledge_base", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // sop, reference, template, guide
  serviceType: text("service_type"), // specific to service
  tags: json("tags"),
  attachments: json("attachments"),
  quickLinks: json("quick_links"), // external links
  viewCount: integer("view_count").default(0),
  lastViewed: timestamp("last_viewed"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskAssignments = pgTable("task_assignments", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  assignedTo: integer("assigned_to").notNull(),
  assignedBy: integer("assigned_by").notNull(),
  assignmentType: text("assignment_type").default("manual"), // manual, auto
  priority: text("priority").default("medium"),
  estimatedWorkload: integer("estimated_workload"), // hours
  assignmentNotes: text("assignment_notes"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  isAccepted: boolean("is_accepted").default(false),
});

// Insert schemas for operations
export const insertOperationsTeamSchema = createInsertSchema(operationsTeam).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOperationsTaskSchema = createInsertSchema(operationsTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInternalCommentSchema = createInsertSchema(internalComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHandoverHistorySchema = createInsertSchema(handoverHistory).omit({
  id: true,
  handoverDate: true,
});

// Type exports for operations
export type OperationsTeam = typeof operationsTeam.$inferSelect;
export type InsertOperationsTeam = z.infer<typeof insertOperationsTeamSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type OperationsTask = typeof operationsTasks.$inferSelect;
export type InsertOperationsTask = z.infer<typeof insertOperationsTaskSchema>;
export type InternalComment = typeof internalComments.$inferSelect;
export type InsertInternalComment = z.infer<typeof insertInternalCommentSchema>;
export type HandoverHistory = typeof handoverHistory.$inferSelect;
export type InsertHandoverHistory = z.infer<typeof insertHandoverHistorySchema>;
export type PerformanceMetrics = typeof performanceMetrics.$inferSelect;
export type OpsKnowledgeBase = typeof opsKnowledgeBase.$inferSelect;
export type TaskAssignment = typeof taskAssignments.$inferSelect;

// Admin Control Panel - Additional Schema
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(), // super_admin, sub_admin, viewer
  permissions: json("permissions").notNull(), // detailed permission matrix
  accessLevel: text("access_level").default("limited"), // full, limited, readonly
  ipRestrictions: json("ip_restrictions"), // allowed IP addresses
  sessionTimeout: integer("session_timeout").default(3600), // seconds
  lastLogin: timestamp("last_login"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serviceCatalogue = pgTable("service_catalogue", {
  id: serial("id").primaryKey(),
  serviceCode: text("service_code").notNull().unique(),
  serviceName: text("service_name").notNull(),
  description: text("description"),
  category: text("category"), // incorporation, tax, license, compliance
  documentsRequired: json("documents_required"), // list of required documents
  standardSLA: integer("standard_sla_hours").default(72), // hours
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  complexity: text("complexity").default("medium"), // low, medium, high
  isActive: boolean("is_active").default(true),
  workflowTemplateId: integer("workflow_template_id"),
  customFields: json("custom_fields"), // service-specific data fields
  dependencies: json("dependencies"), // other services this depends on
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workflowTemplates = pgTable("workflow_templates", {
  id: serial("id").primaryKey(),
  templateName: text("template_name").notNull(),
  serviceCode: text("service_code").notNull(),
  workflowSteps: json("workflow_steps").notNull(), // drag-drop workflow definition
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  globalTemplate: boolean("global_template").default(true), // affects all services
  customForms: json("custom_forms"), // custom data collection forms
  approvalNodes: json("approval_nodes"), // QA checkpoints
  escalationRules: json("escalation_rules"), // SLA escalation logic
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const slaSettings = pgTable("sla_settings", {
  id: serial("id").primaryKey(),
  serviceCode: text("service_code").notNull(),
  taskType: text("task_type"), // specific task or entire service
  standardHours: integer("standard_hours").notNull(),
  escalationTiers: json("escalation_tiers"), // multi-level escalation
  clientNotificationHours: integer("client_notification_hours").default(24),
  exceptionRules: json("exception_rules"), // holiday adjustments, etc
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification System Tables
export const notificationRules = pgTable("notification_rules", {
  id: serial("id").primaryKey(),
  ruleKey: text("rule_key").unique().notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // SCHEDULE, EVENT
  scopeJson: text("scope_json").notNull(), // service types, entities, etc.
  scheduleJson: text("schedule_json"), // cron expression and timezone
  logicJson: text("logic_json"), // smart logic for T-7, T-3, T-1, etc.
  filtersJson: text("filters_json"), // additional filters
  channelsJson: text("channels_json").notNull(), // EMAIL, WHATSAPP, SMS
  templateKey: text("template_key").notNull(),
  dedupeWindowMins: integer("dedupe_window_mins").default(120),
  respectQuietHours: boolean("respect_quiet_hours").default(true),
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationOutbox = pgTable("notification_outbox", {
  id: serial("id").primaryKey(),
  ruleKey: text("rule_key").notNull(),
  serviceRequestId: integer("service_request_id").notNull(),
  entityId: integer("entity_id").notNull(),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  channel: text("channel").notNull(), // EMAIL, WHATSAPP, SMS, INAPP
  templateKey: text("template_key").notNull(),
  payloadJson: text("payload_json").notNull(),
  dedupeFingerprint: text("dedupe_fingerprint"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").default("QUEUED"), // QUEUED, SENT, DELIVERED, FAILED, CANCELLED
  error: text("error"),
  providerId: text("provider_id"), // external provider reference
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationTemplates = pgTable("notification_templates", {
  templateKey: text("template_key").primaryKey(),
  name: text("name").notNull(),
  channel: text("channel").notNull(), // EMAIL, WHATSAPP, SMS
  subject: text("subject"), // for email
  body: text("body").notNull(),
  variables: json("variables"), // available template variables
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin-Configurable Service Management Tables
export const servicesCatalog = pgTable("services_catalog", {
  id: serial("id").primaryKey(),
  serviceKey: text("service_key").unique().notNull(), // e.g., 'gst_returns', 'tds_quarterly'
  name: text("name").notNull(), // display name
  periodicity: text("periodicity").notNull(), // ONE_TIME, MONTHLY, QUARTERLY, ANNUAL
  description: text("description"),
  category: text("category"), // incorporation, compliance, accounting, annual
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workflowTemplatesAdmin = pgTable("workflow_templates_admin", {
  id: serial("id").primaryKey(),
  serviceKey: text("service_key").notNull(), // FK to services_catalog.service_key
  version: integer("version").notNull().default(1),
  templateJson: text("template_json").notNull(), // full JSON of steps, dependencies, doc rules, QA, SLA
  isPublished: boolean("is_published").default(false), // true when live
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workflow Automation Rules (AutoComply)
export const workflowAutomationRules = pgTable("workflow_automation_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),
  conditions: json("conditions"), // array of condition objects
  actions: json("actions").notNull(), // array of action objects
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workflow Automation Execution History
export const workflowAutomationHistory = pgTable("workflow_automation_history", {
  id: serial("id").primaryKey(),
  workflowRuleId: integer("workflow_rule_id"),
  workflowName: text("workflow_name"),
  trigger: text("trigger").notNull(),
  entityId: integer("entity_id"),
  status: text("status").default("success"),
  actionsExecuted: integer("actions_executed").default(0),
  executedAt: timestamp("executed_at").defaultNow(),
  details: json("details"),
});

export const serviceDocTypes = pgTable("service_doc_types", {
  id: serial("id").primaryKey(),
  serviceKey: text("service_key").notNull(),
  doctype: text("doctype").notNull(), // e.g., 'sales_register_csv'
  label: text("label").notNull(), // 'Sales Register (CSV)'
  clientUploads: boolean("client_uploads").default(true), // client can upload?
  versioned: boolean("versioned").default(true), // keep versions?
  isDeliverable: boolean("is_deliverable").default(false), // visible to client as final output?
  isInternal: boolean("is_internal").default(false), // ops-only workpaper
  stepKey: text("step_key"), // which workflow step requires this doc
  mandatory: boolean("mandatory").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dueDateMaster = pgTable("due_date_master", {
  id: serial("id").primaryKey(),
  serviceKey: text("service_key").notNull(), // e.g., 'gst_returns'
  jurisdiction: text("jurisdiction").default("IN"), // e.g., 'IN', 'IN-DL', 'IN-MH'
  ruleJson: text("rule_json").notNull(), // JSON rules for computing due dates
  effectiveFrom: timestamp("effective_from").notNull(), // '2025-04-01'
  effectiveTo: timestamp("effective_to"), // nullable (current)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const entityServices = pgTable("entity_services", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").notNull(),
  serviceKey: text("service_key").notNull(),
  periodicityOverride: text("periodicity_override"), // optional override (e.g., 'QUARTERLY')
  jurisdiction: text("jurisdiction").default("IN"),
  metaJson: text("meta_json"), // { "scheme": "QRMP", "turnoverBand": "<5cr", ...}
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemIntegrations = pgTable("system_integrations", {
  id: serial("id").primaryKey(),
  integrationName: text("integration_name").notNull(), // MCA, GSTN, EPFO, etc
  apiEndpoint: text("api_endpoint"),
  authType: text("auth_type"), // oauth, api_key, certificate
  credentials: text("credentials"), // encrypted credentials
  isActive: boolean("is_active").default(true),
  lastSync: timestamp("last_sync"),
  syncStatus: text("sync_status").default("healthy"), // healthy, error, syncing
  errorDetails: text("error_details"),
  rateLimits: json("rate_limits"), // API rate limiting info
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemNotifications = pgTable("system_notifications", {
  id: serial("id").primaryKey(),
  notificationType: text("notification_type").notNull(), // sla_breach, client_delay, etc
  triggerConditions: json("trigger_conditions"), // when to trigger
  recipients: json("recipients"), // who gets notified
  channels: json("channels"), // email, whatsapp, in_app
  messageTemplate: text("message_template"),
  isActive: boolean("is_active").default(true),
  priority: text("priority").default("medium"), // low, medium, high, critical
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // create, update, delete, login, etc
  entityType: text("entity_type").notNull(), // user, service, client, etc
  entityId: text("entity_id"),
  oldValue: json("old_value"),
  newValue: json("new_value"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const systemConfiguration = pgTable("system_configuration", {
  id: serial("id").primaryKey(),
  configKey: text("config_key").notNull().unique(),
  configValue: json("config_value").notNull(),
  category: text("category").notNull(), // branding, security, integration, etc
  description: text("description"),
  isEncrypted: boolean("is_encrypted").default(false),
  lastModifiedBy: integer("last_modified_by"),
  lastModified: timestamp("last_modified").defaultNow(),
});

export const performanceDashboard = pgTable("performance_dashboard", {
  id: serial("id").primaryKey(),
  metricType: text("metric_type").notNull(), // sla_compliance, team_performance, etc
  period: text("period").notNull(), // daily, weekly, monthly
  periodDate: timestamp("period_date").notNull(),
  metricData: json("metric_data").notNull(), // aggregated performance data
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const agentPartners = pgTable("agent_partners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  agentCode: text("agent_code").notNull().unique(),
  territory: text("territory"), // state, city, region
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("15.00"),
  leadConversionRate: decimal("lead_conversion_rate", { precision: 5, scale: 2 }),
  totalCommissionEarned: decimal("total_commission_earned", { precision: 10, scale: 2 }).default("0"),
  leadsGenerated: integer("leads_generated").default(0),
  leadsConverted: integer("leads_converted").default(0),
  performanceRating: decimal("performance_rating", { precision: 3, scale: 2 }),
  isActive: boolean("is_active").default(true),
  onboardedAt: timestamp("onboarded_at").defaultNow(),
  lastActivity: timestamp("last_activity"),
});

export const workflowExecutions = pgTable("workflow_executions", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  workflowTemplateId: integer("workflow_template_id").notNull(),
  currentStep: integer("current_step").default(0),
  executionData: json("execution_data"), // current state and variables
  bottleneckDetected: boolean("bottleneck_detected").default(false),
  averageStepTime: json("average_step_time"), // timing analytics per step
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  status: text("status").default("in_progress"), // in_progress, completed, failed, paused
});

// Insert schemas for admin
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceCatalogueSchema = createInsertSchema(serviceCatalogue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSlaSettingSchema = createInsertSchema(slaSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemIntegrationSchema = createInsertSchema(systemIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for admin
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type ServiceCatalogue = typeof serviceCatalogue.$inferSelect;
export type InsertServiceCatalogue = z.infer<typeof insertServiceCatalogueSchema>;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;
export type SlaSettings = typeof slaSettings.$inferSelect;
export type InsertSlaSettings = z.infer<typeof insertSlaSettingSchema>;
export type SlaException = typeof slaExceptions.$inferSelect;

// Export types for notification system
export type NotificationRule = typeof notificationRules.$inferSelect;
export type InsertNotificationRule = typeof notificationRules.$inferInsert;
export type NotificationOutboxItem = typeof notificationOutbox.$inferSelect;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type SystemIntegration = typeof systemIntegrations.$inferSelect;
export type InsertSystemIntegration = z.infer<typeof insertSystemIntegrationSchema>;
export type SystemNotification = typeof systemNotifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SystemConfiguration = typeof systemConfiguration.$inferSelect;
export type PerformanceDashboard = typeof performanceDashboard.$inferSelect;
export type AgentPartner = typeof agentPartners.$inferSelect;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;

// Agent/Partner Portal - Additional Schema
// Client document uploads table
export const documentsUploads = pgTable("documents", {
  id: serial("id").primaryKey(),
  documentId: text("document_id").unique(), // DOC26000001 - human-readable ID
  serviceOrderId: integer("service_order_id"),
  serviceRequestId: integer("service_request_id"),
  entityId: integer("entity_id").notNull(),
  doctype: text("doctype").notNull(),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  sizeBytes: integer("size_bytes"),
  mimeType: text("mime_type"),
  uploader: text("uploader").notNull(), // 'client' | 'ops'
  status: text("status").default("pending_review"), // 'pending_review' | 'approved' | 'rejected' | 'archived'
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  reviewNotes: text("review_notes"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  version: integer("version").default(1),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentProfiles = pgTable("agent_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  agentCode: text("agent_code").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  assignedTerritory: text("assigned_territory"), // state, city, region
  joiningDate: timestamp("joining_date").defaultNow(),
  role: text("role").default("agent"), // agent, regional_manager
  isActive: boolean("is_active").default(true),
  deviceRestrictions: json("device_restrictions"), // allowed devices/IPs
  performanceRating: decimal("performance_rating", { precision: 3, scale: 2 }),
  totalCommissionEarned: decimal("total_commission_earned", { precision: 10, scale: 2 }).default("0.00"),
  pendingPayouts: decimal("pending_payouts", { precision: 10, scale: 2 }).default("0.00"),
  clearedPayouts: decimal("cleared_payouts", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced leads table with pre-sales functionality
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  leadId: text("lead_id").notNull().unique(), // L0001, L0002, etc.
  agentId: integer("agent_id"),
  clientName: text("client_name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone").notNull(),
  state: text("state"),
  entityType: text("entity_type"), // pvt_ltd, partnership, proprietorship, etc
  requiredServices: json("required_services"), // array of service codes
  serviceInterested: text("service_interested").notNull(),
  leadSource: text("lead_source").notNull(), // Google Ads, Referral, Facebook Ads, Website, etc
  preSalesExecutive: text("pre_sales_executive"),
  leadStage: text("lead_stage").default(LEAD_STAGES.NEW), // Hot Lead, Warm Lead, Cold Lead, Not Answered, Not Interested
  status: text("status").default(LEAD_STAGES.NEW), // new, contacted, converted, in_progress, closed, lost
  priority: text("priority").default(PRIORITY_LEVELS.MEDIUM), // low, medium, high
  kycDocuments: json("kyc_documents"), // uploaded document references
  leadLocation: json("lead_location"), // geo-tagging data
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  conversionProbability: integer("conversion_probability"), // AI lead scoring 0-100
  lastContactDate: timestamp("last_contact_date"),
  nextFollowupDate: timestamp("next_followup_date"),
  remarks: text("remarks"),
  notes: text("notes"),
  interactionHistory: json("interaction_history"), // [{date, type, notes, executive}]
  convertedAt: timestamp("converted_at"),
  closedAt: timestamp("closed_at"),
  lostReason: text("lost_reason"),
  assignedTo: integer("assigned_to"), // for lead transfer
  transferApprovalStatus: text("transfer_approval_status").default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commissionRecords = pgTable("commission_records", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  leadId: integer("lead_id"),
  serviceRequestId: integer("service_request_id"),
  serviceCode: text("service_code").notNull(),
  clientName: text("client_name").notNull(),
  commissionType: text("commission_type").default("direct"), // direct, override, bonus
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
  serviceValue: decimal("service_value", { precision: 10, scale: 2 }),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  status: text("status").default("pending"), // pending, cleared, disputed
  earnedDate: timestamp("earned_date").defaultNow(),
  payoutDate: timestamp("payout_date"),
  disputeReason: text("dispute_reason"),
  disputeStatus: text("dispute_status"), // raised, under_review, resolved, rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketingResources = pgTable("marketing_resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // brochure, presentation, creative, training, case_study
  fileType: text("file_type"), // pdf, pptx, jpg, mp4, etc
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"), // in bytes
  downloadCount: integer("download_count").default(0),
  isActive: boolean("is_active").default(true),
  targetAudience: text("target_audience"), // new_agents, experienced, all
  lastUpdated: timestamp("last_updated").defaultNow(),
  uploadedBy: integer("uploaded_by"),
  tags: json("tags"), // searchable tags
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentCommunications = pgTable("agent_communications", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  adminUserId: integer("admin_user_id"),
  messageType: text("message_type").notNull(), // chat, announcement, support_ticket
  subject: text("subject"),
  message: text("message").notNull(),
  attachments: json("attachments"),
  status: text("status").default("open"), // open, in_progress, resolved, closed
  priority: text("priority").default("medium"), // low, medium, high, urgent
  isRead: boolean("is_read").default(false),
  responseTime: integer("response_time"), // in minutes
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentPerformanceMetrics = pgTable("agent_performance_metrics", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  period: text("period").notNull(), // daily, weekly, monthly
  periodDate: timestamp("period_date").notNull(),
  leadsSubmitted: integer("leads_submitted").default(0),
  leadsContacted: integer("leads_contacted").default(0),
  leadsConverted: integer("leads_converted").default(0),
  leadsLost: integer("leads_lost").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }),
  totalCommissionEarned: decimal("total_commission_earned", { precision: 10, scale: 2 }).default("0.00"),
  topServices: json("top_services"), // service breakdown
  averageLeadValue: decimal("average_lead_value", { precision: 10, scale: 2 }),
  responseTime: integer("response_time"), // average response time in hours
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentAnnouncements = pgTable("agent_announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  announcementType: text("announcement_type").default("general"), // general, promotion, compliance, training
  priority: text("priority").default("medium"), // low, medium, high, urgent
  targetAudience: json("target_audience"), // specific agents or all
  isActive: boolean("is_active").default(true),
  validUntil: timestamp("valid_until"),
  readByAgents: json("read_by_agents"), // array of agent IDs who read it
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leadAutomation = pgTable("lead_automation", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  automationType: text("automation_type").notNull(), // nurturing, reminder, revival
  scheduledAt: timestamp("scheduled_at").notNull(),
  executedAt: timestamp("executed_at"),
  status: text("status").default("scheduled"), // scheduled, executed, failed, cancelled
  messageChannel: text("message_channel"), // whatsapp, email, sms
  messageContent: text("message_content"),
  responseReceived: boolean("response_received").default(false),
  nextActionScheduled: timestamp("next_action_scheduled"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentReferrals = pgTable("agent_referrals", {
  id: serial("id").primaryKey(),
  parentAgentId: integer("parent_agent_id").notNull(),
  subAgentId: integer("sub_agent_id").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  referralStatus: text("referral_status").default("active"), // active, inactive, suspended
  overrideCommissionRate: decimal("override_commission_rate", { precision: 5, scale: 2 }).default("5.00"),
  totalOverrideEarned: decimal("total_override_earned", { precision: 10, scale: 2 }).default("0.00"),
  onboardedAt: timestamp("onboarded_at").defaultNow(),
  lastActivityAt: timestamp("last_activity_at"),
});

export const incentivePrograms = pgTable("incentive_programs", {
  id: serial("id").primaryKey(),
  programName: text("program_name").notNull(),
  description: text("description"),
  programType: text("program_type").notNull(), // monthly_target, quarterly_bonus, annual_award
  qualificationCriteria: json("qualification_criteria"), // targets and conditions
  rewardStructure: json("reward_structure"), // rewards and amounts
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  isActive: boolean("is_active").default(true),
  participatingAgents: json("participating_agents"), // eligible agent IDs
  winnersRecord: json("winners_record"), // historical winners
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentAuditLogs = pgTable("agent_audit_logs", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  action: text("action").notNull(), // login, lead_submit, commission_view, etc
  entityType: text("entity_type"), // lead, commission, resource, etc
  entityId: text("entity_id"),
  details: json("details"), // action-specific details
  ipAddress: text("ip_address"),
  deviceInfo: text("device_info"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas for agent portal
export const insertAgentProfileSchema = createInsertSchema(agentProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommissionRecordSchema = createInsertSchema(commissionRecords).omit({
  id: true,
  createdAt: true,
});

// QC and Delivery Insert Schemas
export const insertQualityReviewSchema = createInsertSchema(qualityReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeliveryConfirmationSchema = createInsertSchema(deliveryConfirmations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQualityMetricsSchema = createInsertSchema(qualityMetrics).omit({
  id: true,
  createdAt: true,
  calculatedAt: true,
});

export const insertClientFeedbackSchema = createInsertSchema(clientFeedback).omit({
  id: true,
  createdAt: true,
  submittedAt: true,
});

export const insertQualityChecklistSchema = createInsertSchema(qualityChecklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMarketingResourceSchema = createInsertSchema(marketingResources).omit({
  id: true,
  createdAt: true,
});

export const insertAgentCommunicationSchema = createInsertSchema(agentCommunications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for agent portal
export type AgentProfile = typeof agentProfiles.$inferSelect;
export type InsertAgentProfile = z.infer<typeof insertAgentProfileSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type CommissionRecord = typeof commissionRecords.$inferSelect;
export type InsertCommissionRecord = z.infer<typeof insertCommissionRecordSchema>;
export type MarketingResource = typeof marketingResources.$inferSelect;
export type InsertMarketingResource = z.infer<typeof insertMarketingResourceSchema>;
export type AgentCommunication = typeof agentCommunications.$inferSelect;
export type InsertAgentCommunication = z.infer<typeof insertAgentCommunicationSchema>;
export type AgentPerformanceMetrics = typeof agentPerformanceMetrics.$inferSelect;
export type AgentAnnouncement = typeof agentAnnouncements.$inferSelect;
export type LeadAutomation = typeof leadAutomation.$inferSelect;
export type AgentReferral = typeof agentReferrals.$inferSelect;
export type IncentiveProgram = typeof incentivePrograms.$inferSelect;
export type AgentAuditLog = typeof agentAuditLogs.$inferSelect;

// ============================================================================
// PRACTICE MANAGEMENT SYSTEM EXTENSIONS
// New tables that add functionality not covered by existing tables
// ============================================================================

// Sales Proposal and Conversion Management
export const salesProposals = pgTable("sales_proposals", {
  id: serial("id").primaryKey(),
  leadId: text("lead_id").notNull(),
  salesExecutive: text("sales_executive").notNull(),
  qualifiedLeadStatus: text("qualified_lead_status"), // Proposal Sent, Payment Pending, etc.
  proposalStatus: text("proposal_status"), // Sent, Revised Sent, Approved, etc.
  proposalAmount: decimal("proposal_amount", { precision: 10, scale: 2 }),
  requiredServices: json("required_services"), // services they need
  nextFollowupDate: timestamp("next_followup_date"),
  interactionLog: json("interaction_log"), // sales interaction history
  finalRemark: text("final_remark"),
  documentsLink: text("documents_link"),
  paymentReceived: text("payment_received").default("pending"), // Pending, Partial, Full
  paymentPending: decimal("payment_pending", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// QC and Delivery Management (enhances existing service management)
export const qcDeliveryTracking = pgTable("qc_delivery_tracking", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  assignedQcManager: text("assigned_qc_manager"),
  qcStatus: text("qc_status").default("pending"), // pending, in_review, approved, rejected
  deliveryStatus: text("delivery_status").default("pending"), // pending, in_progress, delivered, delayed
  clientDeliveryDate: timestamp("client_delivery_date"),
  qcNotes: text("qc_notes"),
  deliveryNotes: text("delivery_notes"),
  clientFeedback: text("client_feedback"),
  deliveryMethod: text("delivery_method"), // email, portal, physical, etc.
  documentsDelivered: json("documents_delivered"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Post-Sales Management (Client Feedback, Upselling, Relationship Management)
export const postSalesManagement = pgTable("post_sales_management", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  clientId: integer("client_id").notNull(),
  servicesAvailed: json("services_availed"),
  upsellOpportunityIdentified: boolean("upsell_opportunity_identified").default(false),
  feedbackStatus: text("feedback_status").default("pending"), // pending, collected, analyzed
  feedbackLink: text("feedback_link"),
  feedbackRating: integer("feedback_rating"), // 1-5 stars
  feedbackComments: text("feedback_comments"),
  upsellNotes: text("upsell_notes"),
  upsellStatus: text("upsell_status").default("none"), // none, identified, proposed, converted
  complianceDeadlines: json("compliance_deadlines"), // upcoming renewals/deadlines
  reconnectDate: timestamp("reconnect_date"),
  relationshipNotes: text("relationship_notes"),
  lifetimeValue: decimal("lifetime_value", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Health Scoring and Relationship Tracking
export const clientHealthScores = pgTable("client_health_scores", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  businessEntityId: integer("business_entity_id").notNull(),
  
  // Health Score Components (0-100 each)
  overallHealthScore: integer("overall_health_score").default(100),
  engagementScore: integer("engagement_score").default(100), // login frequency, portal usage
  satisfactionScore: integer("satisfaction_score").default(100), // from feedback ratings
  paymentHealthScore: integer("payment_health_score").default(100), // payment timeliness
  communicationScore: integer("communication_score").default(100), // response rates
  complianceScore: integer("compliance_score").default(100), // compliance adherence
  
  // Risk Indicators
  churnRisk: text("churn_risk").default("low"), // low, medium, high, critical
  riskFactors: json("risk_factors"), // array of identified risk factors
  lastInteractionDate: timestamp("last_interaction_date"),
  daysInactive: integer("days_inactive").default(0),
  missedDeadlines: integer("missed_deadlines").default(0),
  overduePayments: integer("overdue_payments").default(0),
  
  // Engagement Metrics
  totalLogins: integer("total_logins").default(0),
  avgResponseTime: integer("avg_response_time"), // hours
  documentsSubmittedOnTime: integer("documents_submitted_on_time").default(0),
  totalDocumentsRequired: integer("total_documents_required").default(0),
  
  // Financial Health
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0.00"),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }).default("0.00"),
  paymentDelays: integer("payment_delays").default(0),
  outstandingAmount: decimal("outstanding_amount", { precision: 10, scale: 2 }).default("0.00"),
  
  // Calculated Metrics
  predictedLifetimeValue: decimal("predicted_lifetime_value", { precision: 12, scale: 2 }).default("0.00"),
  churnProbability: decimal("churn_probability", { precision: 5, scale: 4 }).default("0.0000"),
  
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Upselling Opportunities Management
export const upsellOpportunities = pgTable("upsell_opportunities", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  businessEntityId: integer("business_entity_id").notNull(),
  
  // Opportunity Details
  opportunityType: text("opportunity_type").notNull(), // cross_sell, up_sell, renewal, add_on
  suggestedServices: json("suggested_services").notNull(), // array of service IDs with reasons
  currentServices: json("current_services"), // services client already has
  
  // Scoring and Priority
  confidenceScore: integer("confidence_score").default(0), // 0-100 confidence in opportunity
  priority: text("priority").default("medium"), // low, medium, high, urgent
  potentialRevenue: decimal("potential_revenue", { precision: 10, scale: 2 }).default("0.00"),
  
  // Trigger Information
  triggerEvent: text("trigger_event"), // service_completion, compliance_due, business_growth
  triggerData: json("trigger_data"), // contextual data that triggered the opportunity
  identifiedAt: timestamp("identified_at").defaultNow(),
  
  // Engagement Tracking
  status: text("status").default("identified"), // identified, contacted, presented, negotiating, won, lost, ignored
  contactAttempts: integer("contact_attempts").default(0),
  lastContactDate: timestamp("last_contact_date"),
  nextFollowUpDate: timestamp("next_follow_up_date"),
  
  // Proposal Information
  proposalSent: boolean("proposal_sent").default(false),
  proposalSentDate: timestamp("proposal_sent_date"),
  proposalValue: decimal("proposal_value", { precision: 10, scale: 2 }).default("0.00"),
  proposalId: integer("proposal_id"), // link to sales proposal
  
  // Outcome Tracking
  conversionDate: timestamp("conversion_date"),
  actualRevenue: decimal("actual_revenue", { precision: 10, scale: 2 }).default("0.00"),
  lostReason: text("lost_reason"),
  
  // Automated Follow-up
  automatedFollowUp: boolean("automated_follow_up").default(true),
  maxFollowUpAttempts: integer("max_follow_up_attempts").default(3),
  
  // Assignment
  assignedTo: integer("assigned_to"), // sales person/relationship manager
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loyalty Programs and Retention Management
export const loyaltyPrograms = pgTable("loyalty_programs", {
  id: serial("id").primaryKey(),
  programId: text("program_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Program Configuration
  programType: text("program_type").notNull(), // points, tiers, cashback, discounts
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  
  // Earning Rules
  pointsPerRupee: decimal("points_per_rupee", { precision: 5, scale: 2 }).default("0.00"),
  bonusPointsServices: json("bonus_points_services"), // services that earn bonus points
  referralBonus: integer("referral_bonus").default(0),
  
  // Redemption Rules
  redemptionThreshold: integer("redemption_threshold").default(100),
  redemptionValue: decimal("redemption_value", { precision: 5, scale: 2 }).default("1.00"), // points to rupee conversion
  
  // Tier Configuration
  tiers: json("tiers"), // tier definitions with benefits
  tierUpgradeThreshold: json("tier_upgrade_threshold"), // revenue/points needed for each tier
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Loyalty Status and Points
export const clientLoyaltyStatus = pgTable("client_loyalty_status", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  programId: text("program_id").notNull(),
  
  // Current Status
  currentTier: text("current_tier").default("bronze"), // bronze, silver, gold, platinum
  totalPoints: integer("total_points").default(0),
  availablePoints: integer("available_points").default(0),
  lifetimePoints: integer("lifetime_points").default(0),
  
  // Tier Progress
  nextTier: text("next_tier"),
  pointsToNextTier: integer("points_to_next_tier").default(0),
  revenueToNextTier: decimal("revenue_to_next_tier", { precision: 10, scale: 2 }).default("0.00"),
  
  // Engagement
  enrolledDate: timestamp("enrolled_date").defaultNow(),
  lastActivity: timestamp("last_activity"),
  totalRedemptions: integer("total_redemptions").default(0),
  totalReferrals: integer("total_referrals").default(0),
  
  // Benefits Tracking
  currentBenefits: json("current_benefits"), // active benefits for current tier
  usedBenefits: json("used_benefits"), // benefits used this period
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relationship Events and Touchpoint Tracking
export const relationshipEvents = pgTable("relationship_events", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  businessEntityId: integer("business_entity_id"),
  
  // Event Details
  eventType: text("event_type").notNull(), // call, email, meeting, service_completion, complaint, compliment, renewal
  eventTitle: text("event_title").notNull(),
  eventDescription: text("event_description"),
  
  // Classification
  category: text("category").default("general"), // sales, support, billing, service, relationship
  sentiment: text("sentiment").default("neutral"), // positive, negative, neutral
  importance: text("importance").default("medium"), // low, medium, high, critical
  
  // Context
  serviceRequestId: integer("service_request_id"),
  triggerEvent: text("trigger_event"), // what caused this interaction
  channel: text("channel").default("portal"), // portal, phone, email, whatsapp, in_person
  
  // People Involved
  initiatedBy: text("initiated_by").default("client"), // client, team, system
  handledBy: integer("handled_by"), // team member who handled
  participantIds: json("participant_ids"), // other people involved
  
  // Outcome and Follow-up
  outcome: text("outcome"), // resolved, escalated, follow_up_needed, information_provided
  actionItems: json("action_items"), // tasks that came out of this interaction
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  followUpCompleted: boolean("follow_up_completed").default(false),
  
  // Metadata
  duration: integer("duration"), // minutes for calls/meetings
  attachments: json("attachments"),
  tags: json("tags"), // custom tags for categorization
  
  eventDate: timestamp("event_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});




// Dashboard Analytics and KPIs
export const dashboardMetrics = pgTable("dashboard_metrics", {
  id: serial("id").primaryKey(),
  metricDate: timestamp("metric_date").defaultNow(),
  totalLeads: integer("total_leads").default(0),
  convertedLeads: integer("converted_leads").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0.00"),
  activeClients: integer("active_clients").default(0),
  servicesInProgress: integer("services_in_progress").default(0),
  servicesCompleted: integer("services_completed").default(0),
  pendingQcItems: integer("pending_qc_items").default(0),
  pendingDeliveries: integer("pending_deliveries").default(0),
  employeeUtilization: decimal("employee_utilization", { precision: 5, scale: 2 }).default("0.00"),
  averageServiceTime: integer("average_service_time").default(0), // in days
  clientSatisfactionScore: decimal("client_satisfaction_score", { precision: 3, scale: 2 }).default("0.00"),
  slaBreaches: integer("sla_breaches").default(0),
  monthlyRecurringRevenue: decimal("monthly_recurring_revenue", { precision: 12, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas for new tables

export const insertSalesProposalSchema = createInsertSchema(salesProposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQcDeliveryTrackingSchema = createInsertSchema(qcDeliveryTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSalesManagementSchema = createInsertSchema(postSalesManagement).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientHealthScoreSchema = createInsertSchema(clientHealthScores).omit({
  id: true,
  calculatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUpsellOpportunitySchema = createInsertSchema(upsellOpportunities).omit({
  id: true,
  identifiedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoyaltyProgramSchema = createInsertSchema(loyaltyPrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientLoyaltyStatusSchema = createInsertSchema(clientLoyaltyStatus).omit({
  id: true,
  enrolledDate: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRelationshipEventSchema = createInsertSchema(relationshipEvents).omit({
  id: true,
  eventDate: true,
  createdAt: true,
  updatedAt: true,
});




export const insertDashboardMetricsSchema = createInsertSchema(dashboardMetrics).omit({
  id: true,
  createdAt: true,
});

// Add missing insert schemas for enhanced tables
export const insertBusinessEntityEnhancedSchema = createInsertSchema(businessEntities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOperationsTeamEnhancedSchema = createInsertSchema(operationsTeam).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadEnhancedSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for Practice Management System (new tables only)
export type SalesProposal = typeof salesProposals.$inferSelect;
export type InsertSalesProposal = z.infer<typeof insertSalesProposalSchema>;
export type QcDeliveryTracking = typeof qcDeliveryTracking.$inferSelect;
export type InsertQcDeliveryTracking = z.infer<typeof insertQcDeliveryTrackingSchema>;
export type PostSalesManagement = typeof postSalesManagement.$inferSelect;
export type InsertPostSalesManagement = z.infer<typeof insertPostSalesManagementSchema>;
export type ClientHealthScore = typeof clientHealthScores.$inferSelect;
export type InsertClientHealthScore = z.infer<typeof insertClientHealthScoreSchema>;
export type UpsellOpportunity = typeof upsellOpportunities.$inferSelect;
export type InsertUpsellOpportunity = z.infer<typeof insertUpsellOpportunitySchema>;
export type LoyaltyProgram = typeof loyaltyPrograms.$inferSelect;
export type InsertLoyaltyProgram = z.infer<typeof insertLoyaltyProgramSchema>;
export type ClientLoyaltyStatus = typeof clientLoyaltyStatus.$inferSelect;
export type InsertClientLoyaltyStatus = z.infer<typeof insertClientLoyaltyStatusSchema>;
export type RelationshipEvent = typeof relationshipEvents.$inferSelect;
export type InsertRelationshipEvent = z.infer<typeof insertRelationshipEventSchema>;
export type DashboardMetrics = typeof dashboardMetrics.$inferSelect;
export type InsertDashboardMetrics = z.infer<typeof insertDashboardMetricsSchema>;

// Enhanced type exports for existing tables with new functionality
export type BusinessEntityEnhanced = typeof businessEntities.$inferSelect;
export type InsertBusinessEntityEnhanced = z.infer<typeof insertBusinessEntityEnhancedSchema>;
export type OperationsTeamEnhanced = typeof operationsTeam.$inferSelect;
export type InsertOperationsTeamEnhanced = z.infer<typeof insertOperationsTeamEnhancedSchema>;
export type LeadEnhanced = typeof leads.$inferSelect;
export type InsertLeadEnhanced = z.infer<typeof insertLeadEnhancedSchema>;

// QC and Delivery Type Exports
export type QualityReview = typeof qualityReviews.$inferSelect;
export type InsertQualityReview = z.infer<typeof insertQualityReviewSchema>;
export type DeliveryConfirmation = typeof deliveryConfirmations.$inferSelect;
export type InsertDeliveryConfirmation = z.infer<typeof insertDeliveryConfirmationSchema>;
export type QualityMetrics = typeof qualityMetrics.$inferSelect;
export type InsertQualityMetrics = z.infer<typeof insertQualityMetricsSchema>;
export type ClientFeedback = typeof clientFeedback.$inferSelect;
export type InsertClientFeedback = z.infer<typeof insertClientFeedbackSchema>;
export type QualityChecklist = typeof qualityChecklists.$inferSelect;
export type InsertQualityChecklist = z.infer<typeof insertQualityChecklistSchema>;

// ============================================================================
// COMPREHENSIVE HR MANAGEMENT SYSTEM
// ============================================================================

// Employee Skills and Competencies
export const employeeSkills = pgTable("employee_skills", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  skillCategory: text("skill_category").notNull(), // technical, soft_skills, domain_expertise, certifications
  skillName: text("skill_name").notNull(),
  proficiencyLevel: integer("proficiency_level").notNull().default(1), // 1-5 scale
  experienceYears: decimal("experience_years", { precision: 4, scale: 1 }).default("0.0"),
  lastAssessed: timestamp("last_assessed"),
  assessedBy: integer("assessed_by"),
  certificationLevel: text("certification_level"), // beginner, intermediate, advanced, expert
  isVerified: boolean("is_verified").default(false),
  verificationDate: timestamp("verification_date"),
  skillTags: json("skill_tags"), // array of related tags
  practicalExperience: text("practical_experience"), // description of real-world usage
  developmentPlan: text("development_plan"), // next steps for improvement
  targetProficiency: integer("target_proficiency"), // goal level
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Skills Master Database
export const skillsMaster = pgTable("skills_master", {
  id: serial("id").primaryKey(),
  skillName: text("skill_name").notNull().unique(),
  category: text("category").notNull(), // technical, soft_skills, domain_expertise
  subCategory: text("sub_category"),
  description: text("description"),
  levelDescriptions: json("level_descriptions"), // descriptions for each proficiency level
  assessmentCriteria: json("assessment_criteria"), // how to evaluate this skill
  relatedSkills: json("related_skills"), // complementary skills
  industryRelevance: json("industry_relevance"), // which industries use this skill
  marketDemand: text("market_demand").default("medium"), // low, medium, high
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training Programs and Learning Management
export const trainingPrograms = pgTable("training_programs", {
  id: serial("id").primaryKey(),
  programCode: text("program_code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // technical, compliance, leadership, soft_skills
  level: text("level").notNull(), // beginner, intermediate, advanced
  duration: integer("duration").notNull(), // hours
  format: text("format").notNull(), // online, offline, hybrid, self_paced
  provider: text("provider"), // internal, external provider name
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0.00"),
  maxParticipants: integer("max_participants"),
  prerequisites: json("prerequisites"), // required skills/certifications
  learningObjectives: json("learning_objectives"),
  curriculum: json("curriculum"), // modules and topics
  assessmentMethod: text("assessment_method"), // test, project, presentation, practical
  certificationOffered: boolean("certification_offered").default(false),
  certificationValidityMonths: integer("certification_validity_months"),
  targetSkills: json("target_skills"), // skills this program develops
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee Training Enrollments
export const trainingEnrollments = pgTable("training_enrollments", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  programId: integer("program_id").notNull(),
  enrollmentDate: timestamp("enrollment_date").defaultNow(),
  startDate: timestamp("start_date"),
  completionDate: timestamp("completion_date"),
  status: text("status").notNull().default("enrolled"), // enrolled, in_progress, completed, failed, withdrawn
  progress: integer("progress").default(0), // 0-100%
  attendanceRate: decimal("attendance_rate", { precision: 5, scale: 2 }),
  assessmentScore: decimal("assessment_score", { precision: 5, scale: 2 }),
  passingScore: decimal("passing_score", { precision: 5, scale: 2 }).default("70.00"),
  attempts: integer("attempts").default(1),
  feedback: text("feedback"), // employee feedback
  instructorNotes: text("instructor_notes"),
  certificationIssued: boolean("certification_issued").default(false),
  certificationNumber: text("certification_number"),
  certificationExpiryDate: timestamp("certification_expiry_date"),
  skillsGained: json("skills_gained"), // skills acquired through this training
  postTrainingAssessment: json("post_training_assessment"),
  isPriority: boolean("is_priority").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Performance Reviews and Goal Setting
export const performanceReviews = pgTable("performance_reviews", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  reviewerId: integer("reviewer_id").notNull(),
  reviewPeriod: text("review_period").notNull(), // Q1_2024, H1_2024, ANNUAL_2024
  reviewType: text("review_type").notNull(), // quarterly, annual, probation, promotion
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").default("draft"), // draft, in_progress, completed, approved, published
  overallRating: decimal("overall_rating", { precision: 3, scale: 2 }),
  
  // Performance Categories
  technicalCompetency: decimal("technical_competency", { precision: 3, scale: 2 }),
  qualityOfWork: decimal("quality_of_work", { precision: 3, scale: 2 }),
  productivity: decimal("productivity", { precision: 3, scale: 2 }),
  communication: decimal("communication", { precision: 3, scale: 2 }),
  teamwork: decimal("teamwork", { precision: 3, scale: 2 }),
  leadership: decimal("leadership", { precision: 3, scale: 2 }),
  innovation: decimal("innovation", { precision: 3, scale: 2 }),
  punctuality: decimal("punctuality", { precision: 3, scale: 2 }),
  
  // Detailed Assessments
  achievements: text("achievements"),
  strengthsIdentified: text("strengths_identified"),
  areasForImprovement: text("areas_for_improvement"),
  trainingRecommendations: json("training_recommendations"),
  careerDevelopmentPlan: text("career_development_plan"),
  promotionReadiness: text("promotion_readiness"), // ready, needs_development, not_ready
  
  // Goal Setting
  previousGoalsAchieved: json("previous_goals_achieved"),
  newGoals: json("new_goals"), // for next period
  kpiTargets: json("kpi_targets"),
  
  // Manager Comments
  managerComments: text("manager_comments"),
  employeeSelfAssessment: text("employee_self_assessment"),
  employeeComments: text("employee_comments"),
  developmentDiscussion: text("development_discussion"),
  
  // Final Actions
  salaryRecommendation: decimal("salary_recommendation", { precision: 10, scale: 2 }),
  bonusRecommendation: decimal("bonus_recommendation", { precision: 10, scale: 2 }),
  actionPlan: text("action_plan"),
  followUpDate: timestamp("follow_up_date"),
  
  submittedAt: timestamp("submitted_at"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee Goals and KPIs
export const employeeGoals = pgTable("employee_goals", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  goalType: text("goal_type").notNull(), // performance, learning, project, behavior, career
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"), // productivity, quality, skills, leadership, innovation
  priority: text("priority").default("medium"), // low, medium, high, critical
  targetValue: decimal("target_value", { precision: 15, scale: 2 }),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).default("0.00"),
  unit: text("unit"), // hours, percentage, count, rating
  startDate: timestamp("start_date").notNull(),
  targetDate: timestamp("target_date").notNull(),
  status: text("status").default("active"), // active, achieved, failed, cancelled, on_hold
  progress: integer("progress").default(0), // 0-100%
  milestones: json("milestones"), // intermediate checkpoints
  resources: json("resources"), // resources needed to achieve goal
  barriers: text("barriers"), // challenges faced
  supportNeeded: text("support_needed"),
  managerId: integer("manager_id"),
  linkedToReview: integer("linked_to_review"),
  measurementCriteria: text("measurement_criteria"),
  achievementNotes: text("achievement_notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Attendance and Time Tracking
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  attendanceDate: timestamp("attendance_date").notNull(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  totalHours: decimal("total_hours", { precision: 4, scale: 2 }),
  breakHours: decimal("break_hours", { precision: 4, scale: 2 }).default("0.00"),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }).default("0.00"),
  status: text("status").notNull(), // present, absent, late, half_day, work_from_home, on_leave
  workLocation: text("work_location").default("office"), // office, home, client_site, field
  lateMinutes: integer("late_minutes").default(0),
  earlyLeaveMinutes: integer("early_leave_minutes").default(0),
  productiveHours: decimal("productive_hours", { precision: 4, scale: 2 }),
  tasksCompleted: integer("tasks_completed").default(0),
  notes: text("notes"),
  isHoliday: boolean("is_holiday").default(false),
  holidayType: text("holiday_type"), // national, regional, company
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  systemGenerated: boolean("system_generated").default(false),
  ipAddress: text("ip_address"),
  deviceInfo: text("device_info"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leave Management System
export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  typeName: text("type_name").notNull().unique(),
  description: text("description"),
  maxDaysPerYear: integer("max_days_per_year"),
  maxConsecutiveDays: integer("max_consecutive_days"),
  minNoticeDays: integer("min_notice_days").default(1),
  isCarryForward: boolean("is_carry_forward").default(false),
  maxCarryForwardDays: integer("max_carry_forward_days"),
  isPaid: boolean("is_paid").default(true),
  requiresApproval: boolean("requires_approval").default(true),
  requiresDocuments: boolean("requires_documents").default(false),
  applicableGender: text("applicable_gender").default("all"), // all, male, female
  minimumServiceMonths: integer("minimum_service_months").default(0),
  isActive: boolean("is_active").default(true),
  approvalWorkflow: json("approval_workflow"), // approval hierarchy
  autoApprovalConditions: json("auto_approval_conditions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee Leave Balances
export const leaveBalances = pgTable("leave_balance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  leaveTypeId: integer("leave_type_id").notNull(),
  year: integer("year").notNull(),
  totalAllocated: decimal("total_allocated", { precision: 4, scale: 2 }).notNull(),
  utilized: decimal("utilized", { precision: 4, scale: 2 }).default("0.00"),
  pending: decimal("pending", { precision: 4, scale: 2 }).default("0.00"),
  available: decimal("available", { precision: 4, scale: 2 }).notNull(),
  carriedForward: decimal("carried_forward", { precision: 4, scale: 2 }).default("0.00"),
  expired: decimal("expired", { precision: 4, scale: 2 }).default("0.00"),
  encashed: decimal("encashed", { precision: 4, scale: 2 }).default("0.00"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Leave Applications
export const leaveApplications = pgTable("leave_applications", {
  id: serial("id").primaryKey(),
  applicationNumber: text("application_number").notNull().unique(),
  employeeId: integer("employee_id").notNull(),
  leaveTypeId: integer("leave_type_id").notNull(),
  fromDate: timestamp("from_date").notNull(),
  toDate: timestamp("to_date").notNull(),
  totalDays: decimal("total_days", { precision: 4, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("pending"), // pending, approved, rejected, cancelled, withdrawn
  priority: text("priority").default("normal"), // low, normal, high, emergency
  appliedDate: timestamp("applied_date").defaultNow(),
  approvedBy: integer("approved_by"),
  approvedDate: timestamp("approved_date"),
  rejectionReason: text("rejection_reason"),
  emergencyContact: text("emergency_contact"),
  alternateContactNumber: text("alternate_contact_number"),
  addressDuringLeave: text("address_during_leave"),
  workHandoverNotes: text("work_handover_notes"),
  delegatedTo: integer("delegated_to"),
  supportingDocuments: json("supporting_documents"),
  managerComments: text("manager_comments"),
  hrComments: text("hr_comments"),
  isHalfDay: boolean("is_half_day").default(false),
  halfDayPeriod: text("half_day_period"), // first_half, second_half
  leaveBalanceAfter: decimal("leave_balance_after", { precision: 4, scale: 2 }),
  approvalWorkflowStatus: json("approval_workflow_status"),
  notificationsSent: json("notifications_sent"),
  cancelledBy: integer("cancelled_by"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Career Development and Progression
export const careerPaths = pgTable("career_paths", {
  id: serial("id").primaryKey(),
  pathName: text("path_name").notNull(),
  department: text("department").notNull(),
  fromRole: text("from_role").notNull(),
  toRole: text("to_role").notNull(),
  minimumExperience: integer("minimum_experience").notNull(), // months
  requiredSkills: json("required_skills"),
  requiredCertifications: json("required_certifications"),
  requiredPerformanceRating: decimal("required_performance_rating", { precision: 3, scale: 2 }),
  developmentPrograms: json("development_programs"),
  approximateTimeframe: integer("approximate_timeframe"), // months
  salaryGrowthPercentage: decimal("salary_growth_percentage", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee Career Progress Tracking
export const careerProgress = pgTable("career_progress", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  careerPathId: integer("career_path_id").notNull(),
  currentStage: text("current_stage"), // skills_development, experience_building, assessment, promotion_ready
  progressPercentage: integer("progress_percentage").default(0),
  skillsAchieved: json("skills_achieved"),
  skillsRemaining: json("skills_remaining"),
  certificationsCompleted: json("certifications_completed"),
  certificationsRequired: json("certifications_required"),
  performanceMetric: decimal("performance_metric", { precision: 3, scale: 2 }),
  mentorId: integer("mentor_id"),
  targetPromotionDate: timestamp("target_promotion_date"),
  estimatedReadiness: timestamp("estimated_readiness"),
  developmentPlan: text("development_plan"),
  mentorNotes: text("mentor_notes"),
  managerAssessment: text("manager_assessment"),
  selfAssessment: text("self_assessment"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workload and Capacity Management
export const workloadMetrics = pgTable("workload_metrics", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  metricDate: timestamp("metric_date").notNull(),
  totalCapacity: integer("total_capacity").notNull(), // hours per week
  allocatedHours: integer("allocated_hours").default(0),
  actualHours: integer("actual_hours").default(0),
  utilizationRate: decimal("utilization_rate", { precision: 5, scale: 2 }),
  overloadIndicator: boolean("overload_indicator").default(false),
  burnoutRisk: text("burnout_risk").default("low"), // low, medium, high, critical
  activeProjects: integer("active_projects").default(0),
  averageTaskComplexity: decimal("average_task_complexity", { precision: 3, scale: 2 }),
  stressLevel: integer("stress_level"), // 1-10 self-reported
  workLifeBalance: integer("work_life_balance"), // 1-10 self-reported
  overtimeHours: integer("overtime_hours").default(0),
  breaksTaken: integer("breaks_taken").default(0),
  focusTimeHours: decimal("focus_time_hours", { precision: 4, scale: 2 }),
  meetingHours: decimal("meeting_hours", { precision: 4, scale: 2 }),
  interruptionCount: integer("interruption_count").default(0),
  productivityScore: decimal("productivity_score", { precision: 3, scale: 2 }),
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team Analytics and Reporting
export const teamMetrics = pgTable("team_metrics", {
  id: serial("id").primaryKey(),
  department: text("department").notNull(),
  teamLead: integer("team_lead"),
  metricPeriod: text("metric_period").notNull(), // daily, weekly, monthly, quarterly
  periodDate: timestamp("period_date").notNull(),
  teamSize: integer("team_size").notNull(),
  averageExperience: decimal("average_experience", { precision: 4, scale: 2 }),
  totalCapacity: integer("total_capacity"),
  totalUtilization: decimal("total_utilization", { precision: 5, scale: 2 }),
  averagePerformance: decimal("average_performance", { precision: 3, scale: 2 }),
  turnoverRate: decimal("turnover_rate", { precision: 5, scale: 2 }),
  absenteeismRate: decimal("absenteeism_rate", { precision: 5, scale: 2 }),
  trainingHours: integer("training_hours").default(0),
  skillsGapIndex: decimal("skills_gap_index", { precision: 3, scale: 2 }),
  teamSatisfaction: decimal("team_satisfaction", { precision: 3, scale: 2 }),
  collaborationScore: decimal("collaboration_score", { precision: 3, scale: 2 }),
  innovationIndex: decimal("innovation_index", { precision: 3, scale: 2 }),
  costPerEmployee: decimal("cost_per_employee", { precision: 10, scale: 2 }),
  revenuePerEmployee: decimal("revenue_per_employee", { precision: 10, scale: 2 }),
  customerSatisfactionImpact: decimal("customer_satisfaction_impact", { precision: 3, scale: 2 }),
  keyInsights: json("key_insights"),
  recommendedActions: json("recommended_actions"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// HR SCHEMA EXPORTS AND TYPES
// ============================================================================

// Insert schemas for HR tables
export const insertEmployeeSkillsSchema = createInsertSchema(employeeSkills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSkillsMasterSchema = createInsertSchema(skillsMaster).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainingProgramsSchema = createInsertSchema(trainingPrograms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainingEnrollmentsSchema = createInsertSchema(trainingEnrollments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPerformanceReviewsSchema = createInsertSchema(performanceReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeGoalsSchema = createInsertSchema(employeeGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttendanceRecordsSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveTypesSchema = createInsertSchema(leaveTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveBalancesSchema = createInsertSchema(leaveBalances).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveApplicationsSchema = createInsertSchema(leaveApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCareerPathsSchema = createInsertSchema(careerPaths).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCareerProgressSchema = createInsertSchema(careerProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkloadMetricsSchema = createInsertSchema(workloadMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertTeamMetricsSchema = createInsertSchema(teamMetrics).omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// ENHANCED KNOWLEDGE BASE SYSTEM
// ============================================================================

export const CONTENT_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review', 
  APPROVED: 'approved',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  REJECTED: 'rejected'
} as const;

export const CONTENT_TYPES = {
  ARTICLE: 'article',
  GUIDE: 'guide',
  PROCEDURE: 'procedure',
  BEST_PRACTICE: 'best_practice',
  FAQ: 'faq',
  TEMPLATE: 'template',
  CHECKLIST: 'checklist'
} as const;

// Enhanced Knowledge Base Articles with version control
export const knowledgeArticles = pgTable("knowledge_articles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content").notNull(),
  contentType: text("content_type").notNull().default(CONTENT_TYPES.ARTICLE),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  tags: json("tags").$type<string[]>().notNull().default([]),
  
  // SEO and organization
  metaDescription: text("meta_description"),
  keywords: text("keywords"),
  difficulty: text("difficulty").default("beginner"), // beginner, intermediate, advanced
  estimatedReadTime: integer("estimated_read_time"), // minutes
  
  // Status and workflow
  status: text("status").notNull().default(CONTENT_STATUS.DRAFT),
  publishedVersion: integer("published_version"),
  
  // Authoring and approval
  authorId: integer("author_id").notNull(),
  reviewerId: integer("reviewer_id"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  reviewNotes: text("review_notes"),
  
  // Analytics and tracking
  viewCount: integer("view_count").default(0),
  helpfulVotes: integer("helpful_votes").default(0),
  unhelpfulVotes: integer("unhelpful_votes").default(0),
  searchScore: decimal("search_score", { precision: 5, scale: 2 }).default("0.00"),
  
  // Dependencies and relations
  relatedArticles: json("related_articles").$type<number[]>().default([]),
  prerequisites: json("prerequisites").$type<number[]>().default([]),
  attachments: json("attachments"),
  
  // Scheduling
  publishedAt: timestamp("published_at"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  nextReviewDue: timestamp("next_review_due"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Article version history for complete version control
export const articleVersions = pgTable("article_versions", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  changeLog: text("change_log"),
  
  // Version metadata
  versionType: text("version_type").default("minor"), // major, minor, patch
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  
  // Author tracking
  createdBy: integer("created_by").notNull(),
  reviewedBy: integer("reviewed_by"),
  approvedBy: integer("approved_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Knowledge categories with hierarchical structure
export const knowledgeCategories = pgTable("knowledge_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  parentId: integer("parent_id"),
  level: integer("level").default(1), // for hierarchy depth
  
  // Display and organization
  displayOrder: integer("display_order").default(0),
  icon: text("icon"),
  color: text("color"),
  
  // Access control
  isPublic: boolean("is_public").default(true),
  requiredRole: text("required_role"), // minimum role to access
  
  // Metrics
  articleCount: integer("article_count").default(0),
  totalViews: integer("total_views").default(0),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge base analytics and usage tracking
export const knowledgeAnalytics = pgTable("knowledge_analytics", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull(),
  userId: integer("user_id"),
  sessionId: text("session_id"),
  
  // Event tracking
  eventType: text("event_type").notNull(), // view, search, helpful_vote, unhelpful_vote, share, download
  searchQuery: text("search_query"),
  referrer: text("referrer"),
  timeOnPage: integer("time_on_page"), // seconds
  
  // User context
  userRole: text("user_role"),
  deviceType: text("device_type"), // desktop, tablet, mobile
  ipAddress: text("ip_address"),
  
  // Engagement metrics
  scrollDepth: integer("scroll_depth"), // percentage
  actionsPerformed: json("actions_performed"), // clicks, copies, etc.
  
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Knowledge gaps identification
export const knowledgeGaps = pgTable("knowledge_gaps", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  description: text("description"),
  category: text("category"),
  
  // Gap analysis
  priority: text("priority").default("medium"), // low, medium, high, critical
  impactLevel: text("impact_level").default("medium"), // low, medium, high
  effortEstimate: text("effort_estimate"), // small, medium, large
  
  // Source tracking
  identifiedBy: integer("identified_by"),
  identificationSource: text("identification_source"), // user_request, analytics, audit, feedback
  relatedSearches: json("related_searches").$type<string[]>().default([]),
  frequencyCount: integer("frequency_count").default(1),
  
  // Resolution tracking
  status: text("status").default("identified"), // identified, assigned, in_progress, resolved, declined
  assignedTo: integer("assigned_to"),
  assignedAt: timestamp("assigned_at"),
  resolvedAt: timestamp("resolved_at"),
  resolvedByArticleId: integer("resolved_by_article_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content approval workflow
export const contentApprovals = pgTable("content_approvals", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull(),
  versionId: integer("version_id").notNull(),
  
  // Workflow details
  workflowStage: text("workflow_stage").notNull(), // initial_review, expert_review, final_approval
  currentReviewerId: integer("current_reviewer_id").notNull(),
  reviewerRole: text("reviewer_role").notNull(), // editor, subject_matter_expert, admin
  
  // Approval status
  status: text("status").default("pending"), // pending, approved, rejected, needs_revision
  feedback: text("feedback"),
  changes_requested: json("changes_requested"),
  
  // Timing
  requestedAt: timestamp("requested_at").defaultNow(),
  responseAt: timestamp("response_at"),
  deadline: timestamp("deadline"),
  
  // Escalation
  escalationLevel: integer("escalation_level").default(0),
  escalatedTo: integer("escalated_to"),
  escalatedAt: timestamp("escalated_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// ENHANCED SERVICES & TASKS MANAGEMENT SYSTEM
// ============================================================================

// Enhanced service definitions with advanced configuration
export const serviceDefinitions = pgTable("service_definitions", {
  id: serial("id").primaryKey(),
  serviceCode: text("service_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  detailedDescription: text("detailed_description"),
  
  // Classification
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  businessLine: text("business_line"), // incorporation, tax, compliance, etc.
  serviceType: text("service_type").default("standard"), // standard, custom, premium, enterprise
  
  // Pricing and commercial details
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  pricingModel: text("pricing_model").default("fixed"), // fixed, hourly, milestone, custom
  currency: text("currency").default("INR"),
  taxCategory: text("tax_category"),
  discountEligible: boolean("discount_eligible").default(true),
  
  // Service configuration
  isConfigurable: boolean("is_configurable").default(false),
  configurationSchema: json("configuration_schema"), // JSON schema for configuration options
  defaultConfiguration: json("default_configuration"),
  variations: json("variations"), // service variations/packages
  
  // Operational details
  averageDuration: integer("average_duration"), // hours
  slaHours: integer("sla_hours").notNull(),
  complexityLevel: text("complexity_level").default("medium"), // low, medium, high, expert
  resourceRequirements: json("resource_requirements"),
  
  // Prerequisites and dependencies
  prerequisites: json("prerequisites").$type<string[]>().default([]),
  serviceDependencies: json("service_dependencies").$type<string[]>().default([]),
  documentRequirements: json("document_requirements"),
  clientEligibility: json("client_eligibility"),
  
  // Automation and workflow
  workflowTemplateId: integer("workflow_template_id"),
  isAutomated: boolean("is_automated").default(false),
  automationLevel: text("automation_level").default("manual"), // manual, semi_automated, fully_automated
  
  // Quality and compliance
  qualityChecklist: json("quality_checklist"),
  complianceRequirements: json("compliance_requirements"),
  deliverables: json("deliverables"),
  
  // Performance tracking
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }).default("0.00"),
  onTimeDeliveryRate: decimal("on_time_delivery_rate", { precision: 5, scale: 2 }).default("0.00"),
  clientSatisfactionScore: decimal("client_satisfaction_score", { precision: 3, scale: 2 }),
  
  // Metadata
  tags: json("tags").$type<string[]>().default([]),
  keywords: text("keywords"),
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(true),
  
  createdBy: integer("created_by").notNull(),
  lastModifiedBy: integer("last_modified_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Advanced task templates with dependencies and conditions
export const advancedTaskTemplates = pgTable("advanced_task_templates", {
  id: serial("id").primaryKey(),
  templateCode: text("template_code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Task classification
  taskType: text("task_type").notNull(), // data_collection, document_preparation, review, approval, delivery
  category: text("category").notNull(),
  skillLevel: text("skill_level").default("intermediate"), // beginner, intermediate, advanced, expert
  
  // Task configuration
  estimatedDuration: integer("estimated_duration"), // minutes
  estimatedEffort: text("estimated_effort"), // low, medium, high
  priority: text("priority").default("medium"),
  
  // Dependencies and conditions
  dependencies: json("dependencies"), // task dependencies with conditions
  prerequisiteConditions: json("prerequisite_conditions"),
  triggerConditions: json("trigger_conditions"),
  
  // Task definition
  instructions: text("instructions").notNull(),
  checklistItems: json("checklist_items"),
  inputFields: json("input_fields"), // custom form fields
  validationRules: json("validation_rules"),
  
  // Resources and tools
  requiredSkills: json("required_skills").$type<string[]>().default([]),
  requiredTools: json("required_tools").$type<string[]>().default([]),
  referenceDocuments: json("reference_documents"),
  templateFiles: json("template_files"),
  
  // Quality control
  qualityGates: json("quality_gates"),
  approvalRequired: boolean("approval_required").default(false),
  reviewerRole: text("reviewer_role"),
  
  // Automation
  isAutomatable: boolean("is_automatable").default(false),
  automationScript: text("automation_script"),
  apiIntegrations: json("api_integrations"),
  
  // Performance tracking
  usageCount: integer("usage_count").default(0),
  averageCompletionTime: integer("average_completion_time"), // minutes
  successRate: decimal("success_rate", { precision: 5, scale: 2 }).default("0.00"),
  
  tags: json("tags").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service configuration instances
export const serviceConfigurations = pgTable("service_configurations", {
  id: serial("id").primaryKey(),
  serviceDefinitionId: integer("service_definition_id").notNull(),
  configurationName: text("configuration_name").notNull(),
  
  // Configuration details
  configurationData: json("configuration_data").notNull(),
  pricingOverrides: json("pricing_overrides"),
  slaOverrides: json("sla_overrides"),
  workflowOverrides: json("workflow_overrides"),
  
  // Applicability
  clientTypes: json("client_types").$type<string[]>().default([]),
  entityTypes: json("entity_types").$type<string[]>().default([]),
  jurisdictions: json("jurisdictions").$type<string[]>().default(["IN"]),
  
  // Versioning
  version: text("version").default("1.0"),
  parentConfigurationId: integer("parent_configuration_id"),
  
  // Status
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service performance metrics
export const servicePerformanceMetrics = pgTable("service_performance_metrics", {
  id: serial("id").primaryKey(),
  serviceCode: text("service_code").notNull(),
  metricDate: timestamp("metric_date").notNull(),
  
  // Volume metrics
  requestsReceived: integer("requests_received").default(0),
  requestsCompleted: integer("requests_completed").default(0),
  requestsPending: integer("requests_pending").default(0),
  requestsCancelled: integer("requests_cancelled").default(0),
  
  // Performance metrics
  averageCompletionTime: decimal("average_completion_time", { precision: 8, scale: 2 }), // hours
  onTimeDeliveryCount: integer("on_time_delivery_count").default(0),
  lateDeliveryCount: integer("late_delivery_count").default(0),
  slaBreaches: integer("sla_breaches").default(0),
  
  // Quality metrics
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }),
  reworkRequired: integer("rework_required").default(0),
  clientSatisfactionTotal: integer("client_satisfaction_total").default(0),
  clientSatisfactionCount: integer("client_satisfaction_count").default(0),
  
  // Revenue metrics
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0.00"),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }),
  
  // Resource utilization
  totalHoursSpent: decimal("total_hours_spent", { precision: 8, scale: 2 }),
  resourceEfficiency: decimal("resource_efficiency", { precision: 5, scale: 2 }),
  
  // Trends and analysis
  monthOverMonthGrowth: decimal("month_over_month_growth", { precision: 5, scale: 2 }),
  trendDirection: text("trend_direction"), // improving, stable, declining
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Task execution tracking
export const taskExecutions = pgTable("task_executions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull(),
  serviceRequestId: integer("service_request_id").notNull(),
  taskInstanceId: text("task_instance_id").notNull().unique(),
  
  // Execution context
  executionContext: json("execution_context"),
  inputData: json("input_data"),
  outputData: json("output_data"),
  
  // Status and progress
  status: text("status").default("pending"), // pending, in_progress, completed, failed, cancelled
  progress: integer("progress").default(0), // 0-100
  currentStep: text("current_step"),
  
  // Assignment and execution
  assignedTo: integer("assigned_to"),
  assignedAt: timestamp("assigned_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Quality and validation
  qualityChecksPassed: json("quality_checks_passed"),
  validationErrors: json("validation_errors"),
  reviewRequired: boolean("review_required").default(false),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  
  // Performance tracking
  actualDuration: integer("actual_duration"), // minutes
  effortSpent: decimal("effort_spent", { precision: 6, scale: 2 }), // hours
  resourcesUsed: json("resources_used"),
  
  // Issue tracking
  issuesEncountered: json("issues_encountered"),
  resolutionNotes: text("resolution_notes"),
  escalationLevel: integer("escalation_level").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// CONTENT SEARCH AND INDEXING
// ============================================================================

// Search index for full-text search across all content
export const contentSearchIndex = pgTable("content_search_index", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(), // article, faq, template, procedure
  contentId: integer("content_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  
  // Search optimization
  searchVector: text("search_vector"), // Full-text search vector
  keywords: text("keywords"),
  tags: json("tags").$type<string[]>().default([]),
  category: text("category"),
  
  // Relevance scoring
  searchScore: decimal("search_score", { precision: 5, scale: 2 }).default("0.00"),
  popularityScore: decimal("popularity_score", { precision: 5, scale: 2 }).default("0.00"),
  freshnessScore: decimal("freshness_score", { precision: 5, scale: 2 }).default("1.00"),
  
  // Content metadata
  lastIndexedAt: timestamp("last_indexed_at").defaultNow(),
  contentUpdatedAt: timestamp("content_updated_at"),
  
  isActive: boolean("is_active").default(true),
});

// ============================================================================
// CLIENT MASTER AND FINANCIAL MANAGEMENT EXTENSIONS
// ============================================================================

// Client Contracts and Agreements Management
export const clientContracts = pgTable("client_contracts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  businessEntityId: integer("business_entity_id").notNull(),
  contractType: text("contract_type").notNull(), // service_agreement, retainer, project_based, maintenance
  contractNumber: text("contract_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  
  // Contract details
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  renewalType: text("renewal_type").default("manual"), // manual, automatic, conditional
  renewalPeriod: integer("renewal_period"), // months
  noticePeriod: integer("notice_period").default(30), // days
  
  // Financial terms
  contractValue: decimal("contract_value", { precision: 12, scale: 2 }).notNull(),
  billingCycle: text("billing_cycle").default("monthly"), // monthly, quarterly, annually, one_time
  paymentTerms: integer("payment_terms").default(30), // days
  lateFeePercentage: decimal("late_fee_percentage", { precision: 5, scale: 2 }).default("0.00"),
  
  // Services and scope
  includedServices: json("included_services").notNull(),
  serviceLevel: text("service_level").default("standard"), // basic, standard, premium, enterprise
  maxServiceRequests: integer("max_service_requests"), // per billing cycle
  
  // Contract status
  status: text("status").notNull().default("draft"), // draft, pending_approval, active, suspended, terminated, expired
  signedByClient: boolean("signed_by_client").default(false),
  signedByCompany: boolean("signed_by_company").default(false),
  clientSignedAt: timestamp("client_signed_at"),
  companySignedAt: timestamp("company_signed_at"),
  
  // Document management
  contractDocument: text("contract_document"), // file path
  signedDocument: text("signed_document"), // file path
  amendments: json("amendments"), // contract amendments
  
  // Terms and conditions
  specificTerms: json("specific_terms"),
  slaTerms: json("sla_terms"),
  cancellationClause: text("cancellation_clause"),
  
  // Tracking
  createdBy: integer("created_by").notNull(),
  approvedBy: integer("approved_by"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  nextReviewDate: timestamp("next_review_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Invoice Management System
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  clientId: integer("client_id").notNull(),
  businessEntityId: integer("business_entity_id").notNull(),
  contractId: integer("contract_id"), // linked to contract if applicable
  
  // Invoice details
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  billingPeriodStart: timestamp("billing_period_start"),
  billingPeriodEnd: timestamp("billing_period_end"),
  
  // Amounts
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0.00"),
  outstandingAmount: decimal("outstanding_amount", { precision: 12, scale: 2 }).notNull(),
  
  // Invoice items
  lineItems: json("line_items").notNull(), // array of {description, quantity, rate, amount, serviceId}
  
  // Status and payment
  status: text("status").notNull().default("draft"), // draft, sent, viewed, paid, partially_paid, overdue, cancelled
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, partially_paid, failed, refunded
  paymentMethod: text("payment_method"), // bank_transfer, card, cheque, online
  paymentReference: text("payment_reference"),
  
  // Tracking
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  paidAt: timestamp("paid_at"),
  lastReminderSent: timestamp("last_reminder_sent"),
  reminderCount: integer("reminder_count").default(0),
  
  // Additional details
  currency: text("currency").default("INR"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }).default("1.0000"),
  notes: text("notes"),
  terms: text("terms"),
  
  // File management
  documentPath: text("document_path"),
  
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Communication Logs
export const clientCommunications = pgTable("client_communications", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  businessEntityId: integer("business_entity_id"),
  serviceRequestId: integer("service_request_id"),
  
  // Communication details
  communicationType: text("communication_type").notNull(), // call, email, meeting, whatsapp, portal_message, sms
  direction: text("direction").notNull(), // inbound, outbound
  subject: text("subject"),
  summary: text("summary").notNull(),
  fullContent: text("full_content"),
  
  // Participants
  contactedBy: integer("contacted_by"), // staff member
  contactedPerson: text("contacted_person"), // client person name
  contactMethod: text("contact_method"), // phone, email address, etc.
  
  // Timing
  scheduledAt: timestamp("scheduled_at"),
  actualAt: timestamp("actual_at").notNull(),
  duration: integer("duration"), // minutes
  
  // Categorization
  purpose: text("purpose"), // follow_up, issue_resolution, service_discussion, payment_reminder, relationship_building
  priority: text("priority").default("medium"), // low, medium, high, urgent
  sentiment: text("sentiment").default("neutral"), // positive, neutral, negative
  
  // Outcome and follow-up
  outcome: text("outcome"), // resolved, pending, escalated, no_action_needed
  actionItems: json("action_items"), // array of follow-up actions
  nextFollowUpDate: timestamp("next_follow_up_date"),
  tags: json("tags"), // for categorization
  
  // Attachments and references
  attachments: json("attachments"),
  relatedDocuments: json("related_documents"),
  
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial Analytics and KPIs
export const financialAnalytics = pgTable("financial_analytics", {
  id: serial("id").primaryKey(),
  period: text("period").notNull(), // daily, weekly, monthly, quarterly, yearly
  periodDate: timestamp("period_date").notNull(), // specific date for the period
  
  // Revenue metrics
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0.00"),
  recurringRevenue: decimal("recurring_revenue", { precision: 12, scale: 2 }).default("0.00"),
  oneTimeRevenue: decimal("one_time_revenue", { precision: 12, scale: 2 }).default("0.00"),
  upsellRevenue: decimal("upsell_revenue", { precision: 12, scale: 2 }).default("0.00"),
  
  // Collection metrics
  invoicesGenerated: integer("invoices_generated").default(0),
  invoicesPaid: integer("invoices_paid").default(0),
  totalInvoiced: decimal("total_invoiced", { precision: 12, scale: 2 }).default("0.00"),
  totalCollected: decimal("total_collected", { precision: 12, scale: 2 }).default("0.00"),
  outstandingAmount: decimal("outstanding_amount", { precision: 12, scale: 2 }).default("0.00"),
  
  // Client metrics
  newClientsAcquired: integer("new_clients_acquired").default(0),
  clientsChurned: integer("clients_churned").default(0),
  activeClients: integer("active_clients").default(0),
  avgRevenuePerClient: decimal("avg_revenue_per_client", { precision: 12, scale: 2 }).default("0.00"),
  
  // Service metrics
  servicesCompleted: integer("services_completed").default(0),
  avgServiceValue: decimal("avg_service_value", { precision: 12, scale: 2 }).default("0.00"),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }).default("0.00"), // percentage
  
  // Performance indicators
  collectionEfficiency: decimal("collection_efficiency", { precision: 5, scale: 2 }).default("0.00"), // percentage
  avgPaymentDays: integer("avg_payment_days").default(0),
  overdueRate: decimal("overdue_rate", { precision: 5, scale: 2 }).default("0.00"), // percentage
  
  // Growth metrics
  revenueGrowth: decimal("revenue_growth", { precision: 5, scale: 2 }).default("0.00"), // percentage
  clientGrowth: decimal("client_growth", { precision: 5, scale: 2 }).default("0.00"), // percentage
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Budget and Forecasting
export const budgetPlan = pgTable("budget_plan", {
  id: serial("id").primaryKey(),
  planName: text("plan_name").notNull(),
  fiscalYear: text("fiscal_year").notNull(), // 2024-25, 2025-26, etc.
  planType: text("plan_type").notNull(), // annual, quarterly, monthly
  
  // Budget categories
  revenueTarget: decimal("revenue_target", { precision: 12, scale: 2 }).notNull(),
  clientAcquisitionTarget: integer("client_acquisition_target").default(0),
  retentionTarget: decimal("retention_target", { precision: 5, scale: 2 }).default("0.00"), // percentage
  
  // Service-wise targets
  serviceTargets: json("service_targets"), // {serviceId, target_revenue, target_count}
  
  // Expense categories
  operatingExpenses: decimal("operating_expenses", { precision: 12, scale: 2 }).default("0.00"),
  marketingBudget: decimal("marketing_budget", { precision: 12, scale: 2 }).default("0.00"),
  technologyBudget: decimal("technology_budget", { precision: 12, scale: 2 }).default("0.00"),
  staffCosts: decimal("staff_costs", { precision: 12, scale: 2 }).default("0.00"),
  
  // Profit projections
  grossProfitTarget: decimal("gross_profit_target", { precision: 12, scale: 2 }).default("0.00"),
  netProfitTarget: decimal("net_profit_target", { precision: 12, scale: 2 }).default("0.00"),
  profitMarginTarget: decimal("profit_margin_target", { precision: 5, scale: 2 }).default("0.00"),
  
  status: text("status").default("draft"), // draft, approved, active, archived
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Portfolio Segmentation
export const clientPortfolios = pgTable("client_portfolios", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  businessEntityId: integer("business_entity_id").notNull(),
  
  // Segmentation
  valueSegment: text("value_segment").notNull(), // high_value, medium_value, low_value, strategic
  riskLevel: text("risk_level").default("low"), // low, medium, high
  loyaltyTier: text("loyalty_tier").default("bronze"), // bronze, silver, gold, platinum, diamond
  
  // Financial classification  
  lifetimeValue: decimal("lifetime_value", { precision: 12, scale: 2 }).default("0.00"),
  avgMonthlyValue: decimal("avg_monthly_value", { precision: 12, scale: 2 }).default("0.00"),
  paymentBehavior: text("payment_behavior").default("prompt"), // prompt, delayed, irregular, defaulter
  creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).default("0.00"),
  
  // Relationship metrics
  relationshipLength: integer("relationship_length").default(0), // months
  serviceUtilization: decimal("service_utilization", { precision: 5, scale: 2 }).default("0.00"), // percentage
  satisfactionScore: integer("satisfaction_score").default(0), // 0-100
  engagementLevel: text("engagement_level").default("medium"), // low, medium, high
  
  // Growth potential
  expansionPotential: text("expansion_potential").default("medium"), // low, medium, high
  upsellReadiness: text("upsell_readiness").default("neutral"), // not_ready, neutral, ready, eager
  referralPotential: text("referral_potential").default("medium"), // low, medium, high
  
  // Strategic importance
  industryInfluence: text("industry_influence").default("low"), // low, medium, high
  referencePotential: boolean("reference_potential").default(false),
  strategicValue: text("strategic_value").default("standard"), // standard, important, strategic, key_account
  
  // Portfolio manager
  portfolioManager: integer("portfolio_manager").notNull(),
  lastReviewDate: timestamp("last_review_date"),
  nextReviewDate: timestamp("next_review_date"),
  
  // Notes and strategy
  portfolioNotes: text("portfolio_notes"),
  retentionStrategy: json("retention_strategy"),
  growthStrategy: json("growth_strategy"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// SCHEMA EXTENSIONS AND IMPROVEMENTS
// ============================================================================

// Extend existing FAQs table with enhanced features (via new columns)
// This would be done via migration in practice, but showing the intent here
export const enhancedFaqs = pgTable("enhanced_faqs", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  
  // Enhanced features
  difficulty: text("difficulty").default("beginner"),
  answerFormat: text("answer_format").default("text"), // text, video, image, link
  videoUrl: text("video_url"),
  relatedArticles: json("related_articles").$type<number[]>().default([]),
  
  // Analytics and feedback
  viewCount: integer("view_count").default(0),
  helpfulVotes: integer("helpful_votes").default(0),
  unhelpfulVotes: integer("unhelpful_votes").default(0),
  avgRating: decimal("avg_rating", { precision: 3, scale: 2 }),
  
  // SEO and search
  tags: json("tags").$type<string[]>().default([]),
  keywords: text("keywords"),
  searchableContent: text("searchable_content"),
  
  // Workflow
  status: text("status").default("published"), // draft, pending_review, published, archived
  approvedBy: integer("approved_by"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// INSERT SCHEMAS AND TYPE EXPORTS FOR ENHANCED SYSTEMS
// ============================================================================

// Knowledge Base Insert Schemas
export const insertKnowledgeArticleSchema = createInsertSchema(knowledgeArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertArticleVersionSchema = createInsertSchema(articleVersions).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeCategorySchema = createInsertSchema(knowledgeCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKnowledgeAnalyticsSchema = createInsertSchema(knowledgeAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeGapSchema = createInsertSchema(knowledgeGaps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentApprovalSchema = createInsertSchema(contentApprovals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Service Management Insert Schemas
export const insertServiceDefinitionSchema = createInsertSchema(serviceDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdvancedTaskTemplateSchema = createInsertSchema(advancedTaskTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceConfigurationSchema = createInsertSchema(serviceConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServicePerformanceMetricsSchema = createInsertSchema(servicePerformanceMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertTaskExecutionSchema = createInsertSchema(taskExecutions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentSearchIndexSchema = createInsertSchema(contentSearchIndex).omit({
  id: true,
});

export const insertEnhancedFaqSchema = createInsertSchema(enhancedFaqs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Client Master and Financial Management Insert Schemas
export const insertClientContractSchema = createInsertSchema(clientContracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientCommunicationSchema = createInsertSchema(clientCommunications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinancialAnalyticsSchema = createInsertSchema(financialAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBudgetPlanSchema = createInsertSchema(budgetPlan).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientPortfolioSchema = createInsertSchema(clientPortfolios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================================
// TYPE EXPORTS FOR ENHANCED SYSTEMS
// ============================================================================

// Knowledge Base Types
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;
export type InsertKnowledgeArticle = z.infer<typeof insertKnowledgeArticleSchema>;
export type ArticleVersion = typeof articleVersions.$inferSelect;
export type InsertArticleVersion = z.infer<typeof insertArticleVersionSchema>;
export type KnowledgeCategory = typeof knowledgeCategories.$inferSelect;
export type InsertKnowledgeCategory = z.infer<typeof insertKnowledgeCategorySchema>;
export type KnowledgeAnalytics = typeof knowledgeAnalytics.$inferSelect;
export type InsertKnowledgeAnalytics = z.infer<typeof insertKnowledgeAnalyticsSchema>;
export type KnowledgeGap = typeof knowledgeGaps.$inferSelect;
export type InsertKnowledgeGap = z.infer<typeof insertKnowledgeGapSchema>;
export type ContentApproval = typeof contentApprovals.$inferSelect;
export type InsertContentApproval = z.infer<typeof insertContentApprovalSchema>;

// Service Management Types
export type ServiceDefinition = typeof serviceDefinitions.$inferSelect;
export type InsertServiceDefinition = z.infer<typeof insertServiceDefinitionSchema>;
export type AdvancedTaskTemplate = typeof advancedTaskTemplates.$inferSelect;
export type InsertAdvancedTaskTemplate = z.infer<typeof insertAdvancedTaskTemplateSchema>;
export type ServiceConfiguration = typeof serviceConfigurations.$inferSelect;
export type InsertServiceConfiguration = z.infer<typeof insertServiceConfigurationSchema>;
export type ServicePerformanceMetrics = typeof servicePerformanceMetrics.$inferSelect;
export type InsertServicePerformanceMetrics = z.infer<typeof insertServicePerformanceMetricsSchema>;
export type TaskExecution = typeof taskExecutions.$inferSelect;
export type InsertTaskExecution = z.infer<typeof insertTaskExecutionSchema>;
export type ContentSearchIndex = typeof contentSearchIndex.$inferSelect;
export type InsertContentSearchIndex = z.infer<typeof insertContentSearchIndexSchema>;
export type EnhancedFaq = typeof enhancedFaqs.$inferSelect;
export type InsertEnhancedFaq = z.infer<typeof insertEnhancedFaqSchema>;

// Client Master and Financial Management Types
export type ClientContract = typeof clientContracts.$inferSelect;
export type InsertClientContract = z.infer<typeof insertClientContractSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type ClientCommunication = typeof clientCommunications.$inferSelect;
export type InsertClientCommunication = z.infer<typeof insertClientCommunicationSchema>;
export type FinancialAnalytics = typeof financialAnalytics.$inferSelect;
export type InsertFinancialAnalytics = z.infer<typeof insertFinancialAnalyticsSchema>;
export type BudgetPlan = typeof budgetPlan.$inferSelect;
export type InsertBudgetPlan = z.infer<typeof insertBudgetPlanSchema>;
export type ClientPortfolio = typeof clientPortfolios.$inferSelect;
export type InsertClientPortfolio = z.infer<typeof insertClientPortfolioSchema>;

// ============================================================================
// REFERRAL & WALLET CREDIT SYSTEM
// ============================================================================

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(), // Owner of this referral code
  code: text("code").notNull().unique(), // Unique referral code (e.g., "LEGAL2024XYZ")
  isActive: boolean("is_active").default(true),
  totalReferrals: integer("total_referrals").default(0),
  successfulReferrals: integer("successful_referrals").default(0),
  totalCreditsEarned: decimal("total_credits_earned", { precision: 12, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(), // Client who referred
  referralCode: text("referral_code").notNull(), // Code used for referral
  refereeEmail: text("referee_email").notNull(), // Email of referred person
  refereeClientId: integer("referee_client_id"), // Assigned after onboarding
  status: text("status").notNull().default("pending"), // pending, registered, onboarded, credited, expired
  creditAmount: decimal("credit_amount", { precision: 12, scale: 2 }).default("0.00"),
  firstServiceAmount: decimal("first_service_amount", { precision: 12, scale: 2 }), // Amount of first service purchased by referee
  creditPercentage: integer("credit_percentage").default(10), // % of first service as credit
  isCredited: boolean("is_credited").default(false),
  creditedAt: timestamp("credited_at"),
  referredAt: timestamp("referred_at").defaultNow(),
  registeredAt: timestamp("registered_at"),
  onboardedAt: timestamp("onboarded_at"),
  expiresAt: timestamp("expires_at"), // Referral link expiry
});

export const walletCredits = pgTable("wallet_credits", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().unique(), // One wallet per client
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0.00"), // Current available balance
  totalEarned: decimal("total_earned", { precision: 12, scale: 2 }).default("0.00"), // Lifetime earned
  totalSpent: decimal("total_spent", { precision: 12, scale: 2 }).default("0.00"), // Lifetime spent
  totalReferralEarnings: decimal("total_referral_earnings", { precision: 12, scale: 2 }).default("0.00"),
  lifetimeReferrals: integer("lifetime_referrals").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  type: text("type").notNull(), // credit_referral, credit_bonus, debit_service, debit_invoice, credit_refund
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 12, scale: 2 }),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }),
  description: text("description").notNull(),
  relatedReferralId: integer("related_referral_id"), // If this is from a referral
  relatedServiceRequestId: integer("related_service_request_id"), // If used for a service
  relatedInvoiceId: integer("related_invoice_id"), // If used for an invoice payment
  metadata: json("metadata"), // Additional context
  createdBy: integer("created_by"), // Admin/system user who created this
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertReferralCodeSchema = createInsertSchema(referralCodes);
export const insertReferralSchema = createInsertSchema(referrals);
export const insertWalletCreditsSchema = createInsertSchema(walletCredits);
export const insertWalletTransactionSchema = createInsertSchema(walletTransactions);

// Type exports for referral system
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type WalletCredit = typeof walletCredits.$inferSelect;
export type InsertWalletCredit = z.infer<typeof insertWalletCreditsSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

// Type exports for HR system
export type EmployeeSkill = typeof employeeSkills.$inferSelect;
export type InsertEmployeeSkill = z.infer<typeof insertEmployeeSkillsSchema>;
export type SkillMaster = typeof skillsMaster.$inferSelect;
export type InsertSkillMaster = z.infer<typeof insertSkillsMasterSchema>;
export type TrainingProgram = typeof trainingPrograms.$inferSelect;
export type InsertTrainingProgram = z.infer<typeof insertTrainingProgramsSchema>;
export type TrainingEnrollment = typeof trainingEnrollments.$inferSelect;
export type InsertTrainingEnrollment = z.infer<typeof insertTrainingEnrollmentsSchema>;
export type PerformanceReview = typeof performanceReviews.$inferSelect;
export type InsertPerformanceReview = z.infer<typeof insertPerformanceReviewsSchema>;
export type EmployeeGoal = typeof employeeGoals.$inferSelect;
export type InsertEmployeeGoal = z.infer<typeof insertEmployeeGoalsSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordsSchema>;
export type LeaveType = typeof leaveTypes.$inferSelect;
export type InsertLeaveType = z.infer<typeof insertLeaveTypesSchema>;
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type InsertLeaveBalance = z.infer<typeof insertLeaveBalancesSchema>;
export type LeaveApplication = typeof leaveApplications.$inferSelect;
export type InsertLeaveApplication = z.infer<typeof insertLeaveApplicationsSchema>;
export type CareerPath = typeof careerPaths.$inferSelect;
export type InsertCareerPath = z.infer<typeof insertCareerPathsSchema>;
export type CareerProgress = typeof careerProgress.$inferSelect;
export type InsertCareerProgress = z.infer<typeof insertCareerProgressSchema>;
export type WorkloadMetric = typeof workloadMetrics.$inferSelect;
export type InsertWorkloadMetric = z.infer<typeof insertWorkloadMetricsSchema>;
export type TeamMetric = typeof teamMetrics.$inferSelect;
export type InsertTeamMetric = z.infer<typeof insertTeamMetricsSchema>;

// ============================================================================
// AI DOCUMENT PREPARATION AND SIGNATURE MANAGEMENT
// ============================================================================

// AI-Generated Documents
export const aiDocuments = pgTable("ai_documents", {
  id: serial("id").primaryKey(),
  documentNumber: text("document_number").notNull().unique(), // DOC-2024-0001
  title: text("title").notNull(),
  documentType: text("document_type").notNull(), // agreement, moa, aoa, board_resolution, notice, letter, etc.
  category: text("category").notNull(), // incorporation, compliance, tax, legal, hr, other
  
  // AI Generation
  generatedBy: text("generated_by").notNull().default('ai'), // ai, manual, template
  aiPrompt: text("ai_prompt"), // original prompt used for generation
  aiModel: text("ai_model").default('claude-sonnet-4'), // AI model used
  
  // Content
  content: text("content").notNull(), // document content (HTML or markdown)
  contentFormat: text("content_format").default('html'), // html, markdown, docx
  variables: json("variables"), // template variables used {companyName, date, etc}
  
  // Metadata
  templateId: integer("template_id"), // if generated from template
  serviceRequestId: integer("service_request_id"),
  clientId: integer("client_id"),
  entityId: integer("entity_id"),
  
  // Status
  status: text("status").notNull().default('draft'), // draft, pending_review, approved, signed, archived
  version: integer("version").default(1),
  
  // File storage
  pdfUrl: text("pdf_url"), // generated PDF file
  docxUrl: text("docx_url"), // editable Word file
  originalUrl: text("original_url"), // original uploaded file if any
  
  // Signature tracking
  requiresSignature: boolean("requires_signature").default(false),
  signatureStatus: text("signature_status").default('unsigned'), // unsigned, partially_signed, fully_signed
  signatoryCount: integer("signatory_count").default(0),
  signedCount: integer("signed_count").default(0),
  
  // Approval workflow
  approvalRequired: boolean("approval_required").default(false),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  
  // Audit
  createdBy: integer("created_by").notNull(),
  lastEditedBy: integer("last_edited_by"),
  lastEditedAt: timestamp("last_edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Versions (for edit history)
export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  contentFormat: text("content_format").default('html'),
  changes: text("changes"), // description of changes made
  editedBy: integer("edited_by").notNull(),
  editedAt: timestamp("edited_at").defaultNow(),
});

// Document Signatures
export const documentSignatures = pgTable("document_signatures", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  signatureNumber: text("signature_number").notNull().unique(), // SIG-2024-0001
  
  // Signatory details
  signatoryId: integer("signatory_id"), // user ID if registered user
  signatoryName: text("signatory_name").notNull(),
  signatoryEmail: text("signatory_email"),
  signatoryRole: text("signatory_role"), // director, partner, authorized_signatory, witness
  
  // Signature type
  signatureType: text("signature_type").notNull(), // dsc, esign, drawn, uploaded
  
  // DSC (Digital Signature Certificate) details
  dscCertificateId: text("dsc_certificate_id"),
  dscSerialNumber: text("dsc_serial_number"),
  dscIssuer: text("dsc_issuer"),
  dscValidFrom: timestamp("dsc_valid_from"),
  dscValidTo: timestamp("dsc_valid_to"),
  
  // E-Signature / Drawn signature
  signatureImageUrl: text("signature_image_url"), // URL to signature image
  signatureData: text("signature_data"), // base64 signature data for drawn signatures
  
  // Verification
  ipAddress: text("ip_address"),
  deviceInfo: text("device_info"),
  location: text("location"), // geo-location if captured
  
  // Status
  status: text("status").notNull().default('pending'), // pending, signed, verified, rejected
  signedAt: timestamp("signed_at"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: integer("verified_by"),
  
  // Coordinates (position on document)
  pageNumber: integer("page_number").default(1),
  positionX: integer("position_x"),
  positionY: integer("position_y"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document Signatories (required signatures)
export const documentSignatories = pgTable("document_signatories", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  userId: integer("user_id"), // if registered user
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(), // director, partner, witness, authorized_signatory
  signatureRequired: text("signature_required").notNull(), // dsc, esign, any
  order: integer("order").default(1), // signing order
  status: text("status").notNull().default('pending'), // pending, invited, signed, declined
  invitedAt: timestamp("invited_at"),
  signedAt: timestamp("signed_at"),
  signatureId: integer("signature_id"), // link to actual signature
  createdAt: timestamp("created_at").defaultNow(),
});

// Document Activity Log
export const documentActivityLog = pgTable("document_activity_log", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  userId: integer("user_id"),
  action: text("action").notNull(), // created, edited, viewed, downloaded, signed, approved, rejected
  details: text("details"),
  metadata: json("metadata"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Document AI Generation Templates
export const aiDocumentTemplates = pgTable("ai_document_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  documentType: text("document_type").notNull(),
  category: text("category").notNull(),
  
  // AI Prompt template
  systemPrompt: text("system_prompt").notNull(),
  userPromptTemplate: text("user_prompt_template").notNull(), // with {{variables}}
  
  // Required variables
  requiredVariables: json("required_variables").notNull(), // [{name, type, description, required}]
  
  // Output configuration
  outputFormat: text("output_format").default('html'), // html, markdown
  includeFormatting: boolean("include_formatting").default(true),
  
  // Usage
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for AI Documents
export const insertAiDocumentSchema = createInsertSchema(aiDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSignatureSchema = createInsertSchema(documentSignatures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentSignatorySchema = createInsertSchema(documentSignatories).omit({
  id: true,
  createdAt: true,
});

export const insertAiDocumentTemplateSchema = createInsertSchema(aiDocumentTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types
export type AiDocument = typeof aiDocuments.$inferSelect;
export type InsertAiDocument = z.infer<typeof insertAiDocumentSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type DocumentSignature = typeof documentSignatures.$inferSelect;
export type InsertDocumentSignature = z.infer<typeof insertDocumentSignatureSchema>;
export type DocumentSignatory = typeof documentSignatories.$inferSelect;
export type InsertDocumentSignatory = z.infer<typeof insertDocumentSignatorySchema>;
export type DocumentActivityLogEntry = typeof documentActivityLog.$inferSelect;
export type AiDocumentTemplate = typeof aiDocumentTemplates.$inferSelect;
export type InsertAiDocumentTemplate = z.infer<typeof insertAiDocumentTemplateSchema>;

// ============================================================================
// OTP STORAGE - Production-Ready Database Storage
// ============================================================================

export const otpStore = pgTable("otp_store", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOtpSchema = createInsertSchema(otpStore).omit({
  id: true,
  createdAt: true,
});

export type OtpStore = typeof otpStore.$inferSelect;
export type InsertOtp = z.infer<typeof insertOtpSchema>;

// ============================================================================
// GOVERNMENT INTEGRATION SYSTEM - Separate Input/Output Layer
// ============================================================================

// Integration Credentials - Secure storage for government API credentials
export const integrationCredentials = pgTable("integration_credentials", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(), // which client this credential belongs to
  
  // Portal identification
  portalType: text("portal_type").notNull(), // gsp, eri, mca21, sheets
  portalName: text("portal_name").notNull(), // display name
  
  // Credentials (encrypted)
  username: text("username"),
  apiKey: text("api_key"),
  clientSecret: text("client_secret"),
  tokenData: json("token_data"), // access tokens, refresh tokens
  
  // Google Sheets specific
  sheetId: text("sheet_id"),
  serviceAccountEmail: text("service_account_email"),
  
  // Status and metadata
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  expiresAt: timestamp("expires_at"),
  
  // Auto-refresh configuration
  autoRefresh: boolean("auto_refresh").default(true),
  refreshSchedule: text("refresh_schedule"), // cron expression
  
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Government Filings - Track all submissions to government portals
export const governmentFilings = pgTable("government_filings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  entityId: integer("entity_id"), // business entity
  
  // Filing identification
  portalType: text("portal_type").notNull(), // gsp, eri, mca21
  filingType: text("filing_type").notNull(), // gstr1, gstr3b, itr, dir3_kyc, aoc4, etc.
  
  // Filing details
  period: text("period"), // tax period (MM-YYYY)
  assessmentYear: text("assessment_year"), // for IT returns (2024-25)
  financialYear: text("financial_year"), // for MCA filings
  
  // Status tracking
  status: text("status").notNull().default('pending'), // pending, submitted, acknowledged, processed, rejected, failed
  arnNumber: text("arn_number"), // Acknowledgment Reference Number (GST)
  acknowledgmentNumber: text("acknowledgment_number"), // ITR acknowledgment
  srnNumber: text("srn_number"), // Service Request Number (MCA)
  
  // Important dates
  dueDate: timestamp("due_date"),
  submittedAt: timestamp("submitted_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  
  // Filing data
  filingData: json("filing_data"), // complete filing payload
  responseData: json("response_data"), // portal response
  
  // Google Sheets sync
  sheetRowId: text("sheet_row_id"), // reference to Google Sheets row
  lastSyncedAt: timestamp("last_synced_at"),
  syncStatus: text("sync_status").default('pending'), // pending, synced, conflict, error
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sheet Sync Logs - Track Google Sheets bidirectional synchronization
export const sheetSyncLogs = pgTable("sheet_sync_logs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  sheetId: text("sheet_id").notNull(),
  
  // Sync operation details
  syncDirection: text("sync_direction").notNull(), // to_sheet, from_sheet, bidirectional
  syncType: text("sync_type").notNull(), // full, incremental, conflict_resolution
  
  // Sync status
  status: text("status").notNull().default('in_progress'), // in_progress, completed, failed, partial
  recordsProcessed: integer("records_processed").default(0),
  recordsSucceeded: integer("records_succeeded").default(0),
  recordsFailed: integer("records_failed").default(0),
  
  // Conflict resolution
  conflictsDetected: integer("conflicts_detected").default(0),
  conflictsResolved: integer("conflicts_resolved").default(0),
  conflictResolutionStrategy: text("conflict_resolution_strategy"), // latest_wins, manual, portal_priority
  
  // Sync metadata
  lastSyncCheckpoint: text("last_sync_checkpoint"), // watermark for incremental sync
  dataChecksum: text("data_checksum"), // hash for change detection
  errorDetails: json("error_details"),
  
  // Timing
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // milliseconds
});

// API Audit Logs - Complete audit trail for all government API calls
export const apiAuditLogs = pgTable("api_audit_logs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  
  // API call details
  portalType: text("portal_type").notNull(), // gsp, eri, mca21, sheets
  apiEndpoint: text("api_endpoint").notNull(),
  httpMethod: text("http_method").notNull(), // GET, POST, PUT
  
  // Request/Response
  requestPayload: json("request_payload"),
  responsePayload: json("response_payload"),
  statusCode: integer("status_code"),
  
  // Outcome
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  errorCategory: text("error_category"), // auth_failure, rate_limit, validation, server_error, network
  
  // Retry tracking
  retryAttempt: integer("retry_attempt").default(0),
  maxRetries: integer("max_retries").default(3),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Performance
  responseTime: integer("response_time"), // milliseconds
  
  // Context
  initiatedBy: integer("initiated_by"), // user who triggered
  relatedFilingId: integer("related_filing_id"),
  
  timestamp: timestamp("timestamp").defaultNow(),
});

// Integration Job Queue - Background job processing for API calls
export const integrationJobs = pgTable("integration_jobs", {
  id: serial("id").primaryKey(),
  
  // Job identification
  jobType: text("job_type").notNull(), // filing_submission, status_check, sheet_sync, token_refresh
  portalType: text("portal_type").notNull(),
  
  // Job payload
  payload: json("payload").notNull(),
  priority: integer("priority").default(5), // 1-10, higher = more priority
  
  // Status
  status: text("status").notNull().default('queued'), // queued, processing, completed, failed, retry
  progress: integer("progress").default(0), // 0-100
  
  // Retry mechanism
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextAttemptAt: timestamp("next_attempt_at"),
  
  // Result
  result: json("result"),
  errorMessage: text("error_message"),
  
  // Timing
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// ============================================================================
// CUSTOMER SERVICE & SUPPORT TICKET SYSTEM
// ============================================================================

// Support Tickets - Customer service ticket management
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(), // T00001, T00002, etc.
  
  // Client information
  clientId: integer("client_id").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  
  // Ticket details
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // billing, technical, service_request, complaint, inquiry
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed, reopened
  
  // Assignment
  assignedTo: integer("assigned_to"), // customer service rep ID
  assignedBy: integer("assigned_by"),
  assignedAt: timestamp("assigned_at"),
  
  // SLA tracking
  slaStatus: text("sla_status").default("on_track"), // on_track, at_risk, breached
  firstResponseDue: timestamp("first_response_due"),
  firstRespondedAt: timestamp("first_responded_at"),
  resolutionDue: timestamp("resolution_due"),
  resolutionSlaHours: integer("resolution_sla_hours").default(24), // default 24 hours
  
  // Escalation
  escalationLevel: integer("escalation_level").default(0), // 0=none, 1=supervisor, 2=manager, 3=admin
  escalatedAt: timestamp("escalated_at"),
  escalatedTo: integer("escalated_to"),
  escalationReason: text("escalation_reason"),
  
  // Satisfaction
  satisfactionRating: integer("satisfaction_rating"), // 1-5 stars
  satisfactionComment: text("satisfaction_comment"),
  ratedAt: timestamp("rated_at"),
  
  // Related entities
  serviceRequestId: integer("service_request_id"),
  businessEntityId: integer("business_entity_id"),
  
  // Metadata
  source: text("source").default("portal"), // portal, email, phone, whatsapp, chat
  tags: json("tags"), // custom tags for categorization
  attachments: json("attachments"),
  internalNotes: text("internal_notes"),
  
  // Resolution
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by"),
  closedAt: timestamp("closed_at"),
  closedBy: integer("closed_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Response Templates - Pre-written responses for common queries
export const responseTemplates = pgTable("response_templates", {
  id: serial("id").primaryKey(),
  
  // Template identification
  templateCode: text("template_code").notNull().unique(), // STATUS_UPDATE, DOC_REQUEST, etc.
  title: text("title").notNull(),
  category: text("category").notNull(), // service_status, billing, technical, general
  
  // Content
  subject: text("subject"),
  body: text("body").notNull(),
  
  // Variables supported in template
  variables: json("variables"), // ["clientName", "serviceName", "dueDate"]
  
  // Usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  
  // Configuration
  isActive: boolean("is_active").default(true),
  department: text("department").default("customer_service"),
  
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ticket Messages - Communication thread for each ticket
export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  
  // Message details
  message: text("message").notNull(),
  messageType: text("message_type").default("reply"), // reply, internal_note, status_change, assignment
  
  // Author
  authorId: integer("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull(), // customer_service, client, admin
  
  // Metadata
  isInternal: boolean("is_internal").default(false), // internal notes not visible to client
  attachments: json("attachments"),
  templateUsed: integer("template_used"), // ID of template if used
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Ticket Assignments History - Track assignment changes
export const ticketAssignments = pgTable("ticket_assignments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  
  assignedFrom: integer("assigned_from"), // previous assignee
  assignedTo: integer("assigned_to").notNull(), // new assignee
  assignedBy: integer("assigned_by").notNull(), // who made the assignment
  
  reason: text("reason"), // transfer reason
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for Integration System
export const insertIntegrationCredentialSchema = createInsertSchema(integrationCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGovernmentFilingSchema = createInsertSchema(governmentFilings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSheetSyncLogSchema = createInsertSchema(sheetSyncLogs).omit({
  id: true,
  startedAt: true,
});

export const insertApiAuditLogSchema = createInsertSchema(apiAuditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertIntegrationJobSchema = createInsertSchema(integrationJobs).omit({
  id: true,
  createdAt: true,
});

// Export types for Integration System
export type IntegrationCredential = typeof integrationCredentials.$inferSelect;
export type InsertIntegrationCredential = z.infer<typeof insertIntegrationCredentialSchema>;
export type GovernmentFiling = typeof governmentFilings.$inferSelect;
export type InsertGovernmentFiling = z.infer<typeof insertGovernmentFilingSchema>;
export type SheetSyncLog = typeof sheetSyncLogs.$inferSelect;
export type InsertSheetSyncLog = z.infer<typeof insertSheetSyncLogSchema>;
export type ApiAuditLog = typeof apiAuditLogs.$inferSelect;
export type InsertApiAuditLog = z.infer<typeof insertApiAuditLogSchema>;
export type IntegrationJob = typeof integrationJobs.$inferSelect;
export type InsertIntegrationJob = z.infer<typeof insertIntegrationJobSchema>;

// Zod schemas for Customer Service & Support Ticket System
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResponseTemplateSchema = createInsertSchema(responseTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  createdAt: true,
});

export const insertTicketAssignmentSchema = createInsertSchema(ticketAssignments).omit({
  id: true,
  createdAt: true,
});

// Export types for Customer Service & Support Ticket System
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type ResponseTemplate = typeof responseTemplates.$inferSelect;
export type InsertResponseTemplate = z.infer<typeof insertResponseTemplateSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketAssignment = typeof ticketAssignments.$inferSelect;
export type InsertTicketAssignment = z.infer<typeof insertTicketAssignmentSchema>;
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
// UNIFIED STATUS MANAGEMENT SYSTEM
// Configurable workflow statuses per service with admin management
// ============================================================================

// Master table defining all possible statuses per service
export const serviceWorkflowStatuses = pgTable("service_workflow_statuses", {
  id: serial("id").primaryKey(),
  serviceKey: text("service_key").notNull(), // Links to services_catalog.service_key
  statusCode: text("status_code").notNull(), // e.g., 'initiated', 'docs_pending', 'govt_submission'
  statusName: text("status_name").notNull(), // Human-readable name: "Document Collection"
  statusDescription: text("status_description"), // Detailed description of this status

  // Status category and type
  statusCategory: text("status_category").notNull().default("process"), // process, milestone, terminal
  isTerminal: boolean("is_terminal").default(false), // true for final statuses (completed, cancelled)

  // Ordering and display
  displayOrder: integer("display_order").notNull().default(0), // Workflow sequence order
  color: text("color").default("#6b7280"), // UI display color (hex)
  icon: text("icon"), // Optional icon name

  // Workflow behavior
  autoProgress: boolean("auto_progress").default(false), // Auto-move to next status
  autoProgressDelayHours: integer("auto_progress_delay_hours"), // Hours before auto-progress
  requiresApproval: boolean("requires_approval").default(false), // Needs manager approval
  requiresDocument: boolean("requires_document").default(false), // Needs document upload

  // SLA and triggers
  slaHours: integer("sla_hours"), // SLA time for this status
  triggerTasks: boolean("trigger_tasks").default(true), // Auto-create tasks on entering this status
  triggerNotification: boolean("trigger_notification").default(true), // Send notifications

  // Assignee rules
  defaultAssigneeRole: text("default_assignee_role"), // ops_executive, qc_reviewer, admin
  escalateToRole: text("escalate_to_role"), // Role to escalate if SLA breached

  // Client visibility
  clientVisible: boolean("client_visible").default(true), // Show to client
  clientStatusLabel: text("client_status_label"), // Client-friendly status name
  clientMessage: text("client_message"), // Message to show client at this status

  // Metadata
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Defines valid transitions between statuses
export const statusTransitionRules = pgTable("status_transition_rules", {
  id: serial("id").primaryKey(),
  serviceKey: text("service_key").notNull(),
  fromStatusCode: text("from_status_code").notNull(), // Current status
  toStatusCode: text("to_status_code").notNull(), // Target status

  // Transition conditions
  transitionName: text("transition_name").notNull(), // e.g., "Submit for QC", "Approve"
  transitionDescription: text("transition_description"),

  // Permissions
  allowedRoles: json("allowed_roles").$type<string[]>(), // Roles that can trigger this transition
  requiresApproval: boolean("requires_approval").default(false),
  approverRoles: json("approver_roles").$type<string[]>(), // Roles that can approve

  // Conditions and validations
  conditionsJson: json("conditions_json"), // Custom conditions {field: "documents.count", operator: ">=", value: 1}
  validationMessage: text("validation_message"), // Error message if conditions not met

  // Actions on transition
  onTransitionTasks: json("on_transition_tasks"), // Tasks to create
  onTransitionNotifications: json("on_transition_notifications"), // Notifications to send
  onTransitionWebhook: text("on_transition_webhook"), // Webhook URL to call

  // UI settings
  buttonLabel: text("button_label"), // Label for transition button
  buttonColor: text("button_color").default("primary"), // primary, success, warning, danger
  confirmationRequired: boolean("confirmation_required").default(false),
  confirmationMessage: text("confirmation_message"),

  // Ordering
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Complete history of all status transitions (transparency/audit)
export const statusTransitionHistory = pgTable("status_transition_history", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  serviceKey: text("service_key").notNull(),
  businessEntityId: integer("business_entity_id"),

  // Transition details
  fromStatusCode: text("from_status_code"), // null for initial status
  toStatusCode: text("to_status_code").notNull(),
  fromStatusName: text("from_status_name"),
  toStatusName: text("to_status_name").notNull(),

  // Who and when
  changedBy: integer("changed_by").notNull(), // User ID who made the change
  changedByName: text("changed_by_name"), // Denormalized for easy display
  changedByRole: text("changed_by_role"),
  changedAt: timestamp("changed_at").defaultNow(),

  // Context
  transitionReason: text("transition_reason"), // Why this transition was made
  notes: text("notes"), // Additional notes

  // Auto-generated info
  durationInPreviousStatus: integer("duration_in_previous_status"), // Minutes in previous status
  isAutomatic: boolean("is_automatic").default(false), // True if system-triggered
  triggerSource: text("trigger_source"), // 'manual', 'auto', 'api', 'webhook', 'scheduler'

  // Approval tracking
  wasApprovalRequired: boolean("was_approval_required").default(false),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),

  // Associated actions
  tasksCreated: json("tasks_created").$type<number[]>(), // Task IDs created by this transition
  notificationsSent: json("notifications_sent").$type<number[]>(), // Notification IDs sent

  // Snapshot of request state at transition time
  requestSnapshot: json("request_snapshot"), // Important fields at time of transition

  createdAt: timestamp("created_at").defaultNow(),
});

// Workflow step definitions (process drill-down)
export const serviceWorkflowSteps = pgTable("service_workflow_steps", {
  id: serial("id").primaryKey(),
  serviceKey: text("service_key").notNull(),
  statusCode: text("status_code").notNull(), // Links to serviceWorkflowStatuses

  // Step details
  stepOrder: integer("step_order").notNull().default(0),
  stepName: text("step_name").notNull(),
  stepDescription: text("step_description"),

  // Step type and category
  stepType: text("step_type").notNull().default("task"), // task, document, verification, approval, government, delivery

  // Assignee
  assigneeRole: text("assignee_role"), // Role responsible for this step
  assigneeUserId: integer("assignee_user_id"), // Specific user (optional)

  // Requirements
  requiredDocuments: json("required_documents").$type<string[]>(), // Document types needed
  requiredFields: json("required_fields").$type<string[]>(), // Form fields required
  checklistItems: json("checklist_items").$type<{item: string, mandatory: boolean}[]>(),

  // Time estimates
  estimatedMinutes: integer("estimated_minutes"),
  slaMinutes: integer("sla_minutes"),

  // Dependencies
  dependsOnSteps: json("depends_on_steps").$type<number[]>(), // Step IDs that must complete first
  blocksSteps: json("blocks_steps").$type<number[]>(), // Step IDs blocked by this

  // Instructions
  internalInstructions: text("internal_instructions"), // For ops team
  clientInstructions: text("client_instructions"), // For client

  // Automation
  canAutoComplete: boolean("can_auto_complete").default(false),
  autoCompleteTrigger: text("auto_complete_trigger"), // Condition that auto-completes

  // Status
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service request step tracking (runtime instance of workflow steps)
export const serviceRequestSteps = pgTable("service_request_steps", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  workflowStepId: integer("workflow_step_id").notNull(),

  // Step instance status
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, skipped, blocked

  // Assignee
  assignedTo: integer("assigned_to"),
  assignedAt: timestamp("assigned_at"),

  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  durationMinutes: integer("duration_minutes"),

  // Completion details
  completedBy: integer("completed_by"),
  completionNotes: text("completion_notes"),

  // Checklist progress
  checklistProgress: json("checklist_progress"), // {itemIndex: boolean}

  // Documents collected at this step
  collectedDocuments: json("collected_documents").$type<number[]>(), // Document IDs

  // Issues and blocks
  blockedReason: text("blocked_reason"),
  blockedAt: timestamp("blocked_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for unified status management
export const insertServiceWorkflowStatusSchema = createInsertSchema(serviceWorkflowStatuses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStatusTransitionRuleSchema = createInsertSchema(statusTransitionRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStatusTransitionHistorySchema = createInsertSchema(statusTransitionHistory).omit({
  id: true,
  createdAt: true,
});

export const insertServiceWorkflowStepSchema = createInsertSchema(serviceWorkflowSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceRequestStepSchema = createInsertSchema(serviceRequestSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for unified status management
export type ServiceWorkflowStatus = typeof serviceWorkflowStatuses.$inferSelect;
export type InsertServiceWorkflowStatus = z.infer<typeof insertServiceWorkflowStatusSchema>;
export type StatusTransitionRule = typeof statusTransitionRules.$inferSelect;
export type InsertStatusTransitionRule = z.infer<typeof insertStatusTransitionRuleSchema>;
export type StatusTransitionHistory = typeof statusTransitionHistory.$inferSelect;
export type InsertStatusTransitionHistory = z.infer<typeof insertStatusTransitionHistorySchema>;
export type ServiceWorkflowStep = typeof serviceWorkflowSteps.$inferSelect;
export type InsertServiceWorkflowStep = z.infer<typeof insertServiceWorkflowStepSchema>;
export type ServiceRequestStep = typeof serviceRequestSteps.$inferSelect;
export type InsertServiceRequestStep = z.infer<typeof insertServiceRequestStepSchema>;

// ============================================================================
// AUTO-ESCALATION & WORK QUEUE MANAGEMENT (Transparency & Control)
// ============================================================================

// Auto-Escalation Rules - Configurable per service/status
export const escalationRules = pgTable("escalation_rules", {
  id: serial("id").primaryKey(),
  ruleKey: text("rule_key").unique().notNull(), // e.g., 'gst_registration_docs_pending_24h'
  ruleName: text("rule_name").notNull(),

  // Scope - what this rule applies to
  serviceKey: text("service_key"), // null = all services
  statusCode: text("status_code"), // null = all statuses
  priority: text("priority"), // HIGH, MEDIUM, LOW - or null for all

  // Trigger conditions
  triggerType: text("trigger_type").notNull(), // 'time_based', 'threshold', 'event'
  triggerHours: integer("trigger_hours"), // Hours until escalation (for time_based)
  triggerCondition: json("trigger_condition"), // Complex conditions as JSON

  // Escalation tiers (executed in order)
  escalationTiers: json("escalation_tiers").$type<{
    tier: number;
    hoursAfterTrigger: number;
    action: 'notify' | 'reassign' | 'both';
    notifyRoles: string[];
    notifyUserIds?: number[];
    reassignToRole?: string;
    reassignToUserId?: number;
    emailTemplate?: string;
    smsTemplate?: string;
    createTask?: boolean;
    taskTitle?: string;
    severity: 'warning' | 'critical' | 'breach';
  }[]>(),

  // Actions
  autoReassign: boolean("auto_reassign").default(false),
  reassignToRole: text("reassign_to_role"),
  createIncident: boolean("create_incident").default(false),
  notifyClient: boolean("notify_client").default(false),
  clientNotificationTemplate: text("client_notification_template"),

  // Metadata
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Escalation Executions - Audit trail of all escalations
export const escalationExecutions = pgTable("escalation_executions", {
  id: serial("id").primaryKey(),
  escalationRuleId: integer("escalation_rule_id").notNull(),
  serviceRequestId: integer("service_request_id"),
  referenceType: text("reference_type"), // service_request | compliance_tracking | other
  referenceId: integer("reference_id"),

  // Current tier executed
  tierExecuted: integer("tier_executed").notNull(),
  severity: text("severity").notNull(), // warning, critical, breach

  // What happened
  actionsExecuted: json("actions_executed").$type<{
    action: string;
    target: string;
    result: 'success' | 'failed';
    details?: string;
  }[]>(),

  // Notifications sent
  notificationsSent: json("notifications_sent").$type<{
    channel: string;
    recipient: string;
    status: 'sent' | 'failed';
    sentAt: string;
  }[]>(),

  // Reassignment details
  previousAssignee: integer("previous_assignee"),
  newAssignee: integer("new_assignee"),
  reassignmentReason: text("reassignment_reason"),

  // Timing
  triggeredAt: timestamp("triggered_at").defaultNow(),
  executedAt: timestamp("executed_at").defaultNow(),

  // Resolution
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedBy: integer("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolved: boolean("resolved").default(false),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
});

// SLA Breach Records - Track all SLA breaches for reporting and remediation
export const slaBreachRecords = pgTable("sla_breach_records", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),

  // Breach details
  breachType: text("breach_type").notNull(), // 'status_sla', 'overall_sla', 'document_sla', 'response_sla'
  breachSeverity: text("breach_severity").notNull(), // 'minor', 'major', 'critical'

  // SLA details
  slaHours: integer("sla_hours").notNull(),
  actualHours: integer("actual_hours").notNull(),
  breachHours: integer("breach_hours").notNull(), // How much over SLA

  // Status at breach
  statusAtBreach: text("status_at_breach").notNull(),
  assigneeAtBreach: integer("assignee_at_breach"),

  // Root cause analysis
  rootCauseCategory: text("root_cause_category"), // 'client_delay', 'govt_delay', 'ops_delay', 'system_issue', 'resource_constraint'
  rootCauseDetails: text("root_cause_details"),
  wasClientFault: boolean("was_client_fault").default(false),
  wasExternalFault: boolean("was_external_fault").default(false),

  // Remediation
  remediationRequired: boolean("remediation_required").default(false),
  remediationStatus: text("remediation_status").default("pending"), // 'pending', 'in_progress', 'completed', 'waived'
  remediationActions: json("remediation_actions").$type<{
    action: string;
    assignedTo: number;
    dueDate: string;
    status: 'pending' | 'done';
  }[]>(),

  // Client impact
  clientNotified: boolean("client_notified").default(false),
  clientNotifiedAt: timestamp("client_notified_at"),
  compensationOffered: boolean("compensation_offered").default(false),
  compensationDetails: text("compensation_details"),

  // Timestamps
  breachedAt: timestamp("breached_at").defaultNow(),
  reportedBy: integer("reported_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unified Work Queue - Operations team's single source of truth
export const workItemQueue = pgTable("work_item_queue", {
  id: serial("id").primaryKey(),

  // Work item reference
  workItemType: text("work_item_type").notNull(), // 'service_request', 'task', 'qc_review', 'document_review', 'escalation'
  referenceId: integer("reference_id").notNull(), // ID of the actual item

  // Service context
  serviceRequestId: integer("service_request_id"),
  serviceKey: text("service_key"),
  entityId: integer("entity_id"),
  entityName: text("entity_name"),

  // Current state
  currentStatus: text("current_status").notNull(),
  priority: text("priority").notNull().default("MEDIUM"),

  // Assignment
  assignedTo: integer("assigned_to"),
  assignedToName: text("assigned_to_name"),
  assignedToRole: text("assigned_to_role"),

  // SLA tracking
  slaDeadline: timestamp("sla_deadline"),
  slaStatus: text("sla_status").default("on_track"), // 'on_track', 'at_risk', 'warning', 'breached'
  slaHoursRemaining: integer("sla_hours_remaining"),

  // Escalation status
  escalationLevel: integer("escalation_level").default(0), // 0=none, 1=warning, 2=critical, 3=breach
  lastEscalatedAt: timestamp("last_escalated_at"),

  // Timeline
  createdAt: timestamp("created_at").defaultNow(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  ageHours: integer("age_hours").default(0),

  // Visibility
  clientVisible: boolean("client_visible").default(false),
  clientStatusLabel: text("client_status_label"),

  // Quick access fields (denormalized for dashboard performance)
  dueDate: timestamp("due_date"),
  serviceTypeName: text("service_type_name"),
  periodLabel: text("period_label"),
});

// Work Item Activity Log - Immutable audit trail (SOC 2 compliant)
export const workItemActivityLog = pgTable("work_item_activity_log", {
  id: serial("id").primaryKey(),
  workItemQueueId: integer("work_item_queue_id").notNull(),
  serviceRequestId: integer("service_request_id"),

  // Activity details
  activityType: text("activity_type").notNull(), // 'status_change', 'assignment', 'escalation', 'note', 'document', 'client_update'
  activityDescription: text("activity_description").notNull(),

  // Changes
  previousValue: json("previous_value"),
  newValue: json("new_value"),

  // Actor
  performedBy: integer("performed_by"),
  performedByName: text("performed_by_name"),
  performedByRole: text("performed_by_role"),

  // System generated
  isSystemGenerated: boolean("is_system_generated").default(false),
  triggerSource: text("trigger_source"), // 'api', 'ui', 'automation', 'escalation', 'webhook'

  // Immutable timestamp (SOC 2 requirement)
  occurredAt: timestamp("occurred_at").defaultNow(),

  // Client visibility
  clientVisible: boolean("client_visible").default(false),
  clientMessage: text("client_message"),
});

// Insert schemas for auto-escalation
export const insertEscalationRuleSchema = createInsertSchema(escalationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEscalationExecutionSchema = createInsertSchema(escalationExecutions).omit({
  id: true,
  triggeredAt: true,
  executedAt: true,
});

export const insertSlaBreachRecordSchema = createInsertSchema(slaBreachRecords).omit({
  id: true,
  breachedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkItemQueueSchema = createInsertSchema(workItemQueue).omit({
  id: true,
  createdAt: true,
});

export const insertWorkItemActivityLogSchema = createInsertSchema(workItemActivityLog).omit({
  id: true,
  occurredAt: true,
});

// Type exports
export type EscalationRule = typeof escalationRules.$inferSelect;
export type InsertEscalationRule = z.infer<typeof insertEscalationRuleSchema>;
export type EscalationExecution = typeof escalationExecutions.$inferSelect;
export type InsertEscalationExecution = z.infer<typeof insertEscalationExecutionSchema>;
export type SlaBreachRecord = typeof slaBreachRecords.$inferSelect;
export type InsertSlaBreachRecord = z.infer<typeof insertSlaBreachRecordSchema>;
export type WorkItemQueue = typeof workItemQueue.$inferSelect;
export type InsertWorkItemQueue = z.infer<typeof insertWorkItemQueueSchema>;
export type WorkItemActivityLog = typeof workItemActivityLog.$inferSelect;
export type InsertWorkItemActivityLog = z.infer<typeof insertWorkItemActivityLogSchema>;

// ============================================================================
// ID SEQUENCE MANAGEMENT
// ============================================================================

/**
 * ID Sequences Table
 * Centralized ID generation with atomic counters for all entity types
 * Ensures unique, sequential IDs across the platform
 */
export const idSequences = pgTable("id_sequences", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // CLIENT, ENTITY, SERVICE_REQUEST, etc.
  year: text("year").notNull(), // 4-digit year or 'ALL' for non-yearly IDs
  month: text("month"), // Optional 2-digit month for monthly sequences
  currentSequence: integer("current_sequence").notNull().default(0),
  prefix: text("prefix").notNull(), // C, E, SR, WI, etc.
  lastGeneratedId: text("last_generated_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unique constraint on entity_type + year + month combination
// Note: Add in migration: CREATE UNIQUE INDEX idx_id_sequences_unique ON id_sequences(entity_type, year, COALESCE(month, ''));

export const insertIdSequenceSchema = createInsertSchema(idSequences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type IdSequence = typeof idSequences.$inferSelect;
export type InsertIdSequence = z.infer<typeof insertIdSequenceSchema>;

// ============================================================================
// UNIFIED CLIENT ACTIVITY TIMELINE
// ============================================================================

// Unified activity timeline for clients - single source of truth
export const clientActivities = pgTable("client_activities", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(), // FK to business_entities.id
  serviceRequestId: integer("service_request_id"), // optional, links to specific case
  activityType: text("activity_type").notNull(), // from ACTIVITY_TYPES
  title: text("title").notNull(),
  description: text("description"),
  oldValue: text("old_value"), // for status changes
  newValue: text("new_value"), // for status changes
  metadata: json("metadata"), // flexible additional data
  performedBy: integer("performed_by"), // user who performed action
  performedByName: text("performed_by_name"), // denormalized for display
  isClientVisible: boolean("is_client_visible").default(false),
  isSystemGenerated: boolean("is_system_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientActivitySchema = createInsertSchema(clientActivities).omit({
  id: true,
  createdAt: true,
});

export type ClientActivity = typeof clientActivities.$inferSelect;
export type InsertClientActivity = z.infer<typeof insertClientActivitySchema>;

// Internal notes for ops team collaboration on cases
export const caseNotes = pgTable("case_notes", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  authorId: integer("author_id").notNull(),
  content: text("content").notNull(),
  isClientVisible: boolean("is_client_visible").default(false),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCaseNoteSchema = createInsertSchema(caseNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CaseNote = typeof caseNotes.$inferSelect;
export type InsertCaseNote = z.infer<typeof insertCaseNoteSchema>;

// ============================================================================
// ID TYPE CONSTANTS
// ============================================================================

export const ID_TYPES = {
  // Core Entities
  CLIENT: 'CLIENT',
  ENTITY: 'ENTITY',
  CONTACT: 'CONTACT',
  USER: 'USER',
  STAFF: 'STAFF',
  AGENT: 'AGENT',
  TEAM: 'TEAM',

  // Service & Work
  SERVICE_REQUEST: 'SERVICE_REQUEST',
  WORK_ITEM: 'WORK_ITEM',
  TASK: 'TASK',
  SUB_TASK: 'SUB_TASK',
  WORKFLOW_INSTANCE: 'WORKFLOW_INSTANCE',

  // Financial
  INVOICE: 'INVOICE',
  PAYMENT: 'PAYMENT',
  RECEIPT: 'RECEIPT',
  CREDIT_NOTE: 'CREDIT_NOTE',
  DEBIT_NOTE: 'DEBIT_NOTE',
  COMMISSION: 'COMMISSION',
  WALLET_TXN: 'WALLET_TXN',
  PAYOUT: 'PAYOUT',

  // Documents
  DOCUMENT: 'DOCUMENT',
  DOC_REQUEST: 'DOC_REQUEST',
  SIGNATURE: 'SIGNATURE',
  CERTIFICATE: 'CERTIFICATE',

  // Compliance
  COMPLIANCE_ITEM: 'COMPLIANCE_ITEM',
  DEADLINE: 'DEADLINE',
  PENALTY: 'PENALTY',
  FILING: 'FILING',

  // Sales & CRM
  LEAD: 'LEAD',
  OPPORTUNITY: 'OPPORTUNITY',
  PROPOSAL: 'PROPOSAL',
  CONTRACT: 'CONTRACT',
  QUOTE: 'QUOTE',

  // Support
  TICKET: 'TICKET',
  ESCALATION: 'ESCALATION',
  FEEDBACK: 'FEEDBACK',
  MESSAGE: 'MESSAGE',

  // Quality
  QC_REVIEW: 'QC_REVIEW',
  DELIVERY: 'DELIVERY',
  REJECTION: 'REJECTION',
} as const;

export type IdType = typeof ID_TYPES[keyof typeof ID_TYPES];

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
// CREATE INDEX idx_workflow_statuses_service ON service_workflow_statuses(service_key, is_active);
// CREATE INDEX idx_transition_rules_service ON status_transition_rules(service_key, from_status_code);
// CREATE INDEX idx_transition_history_request ON status_transition_history(service_request_id, changed_at DESC);
// CREATE INDEX idx_workflow_steps_service ON service_workflow_steps(service_key, status_code);
// CREATE INDEX idx_request_steps_request ON service_request_steps(service_request_id, status);

// ============================================================================
// SUPER ADMIN SCHEMA EXPORTS
// ============================================================================
export * from "./super-admin-schema";
