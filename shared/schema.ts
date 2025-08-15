import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enhanced user system with multi-business support and security
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role").notNull().default("client"), // client, admin, ops, ca
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  twoFactorSecret: text("two_factor_secret"),
  isTwoFactorEnabled: boolean("is_two_factor_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business entities managed by users
export const businessEntities = pgTable("business_entities", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(), // pvt_ltd, llp, opc, partnership, proprietorship
  cin: text("cin"),
  gstin: text("gstin"),
  pan: text("pan"),
  registrationDate: timestamp("registration_date"),
  complianceScore: integer("compliance_score").default(100),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User sessions for login tracking
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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
  userId: integer("user_id"),
  businessEntityId: integer("business_entity_id"),
  serviceId: text("service_id").notNull(),
  status: text("status").notNull().default("initiated"), // initiated, docs_uploaded, in_progress, ready_for_sign, completed, failed, on_hold
  progress: integer("progress").default(0), // 0-100
  currentMilestone: text("current_milestone"),
  milestoneHistory: json("milestone_history"), // [{milestone, date, status}]
  uploadedDocs: json("uploaded_docs"),
  documentHash: text("document_hash"),
  signatureData: json("signature_data"),
  paymentId: text("payment_id"),
  totalAmount: integer("total_amount").notNull(),
  slaDeadline: timestamp("sla_deadline"),
  expectedCompletion: timestamp("expected_completion"),
  actualCompletion: timestamp("actual_completion"),
  assignedTeamMember: integer("assigned_team_member"),
  dependsOnService: integer("depends_on_service"), // foreign key to other service
  priority: text("priority").default("medium"), // low, medium, high, urgent
  clientNotes: text("client_notes"),
  internalNotes: text("internal_notes"),
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
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const complianceTracking = pgTable("compliance_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  serviceId: text("service_id").notNull(),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

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

export const insertComplianceTrackingSchema = createInsertSchema(complianceTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type ComplianceTracking = typeof complianceTracking.$inferSelect;
export type InsertComplianceTracking = z.infer<typeof insertComplianceTrackingSchema>;
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

// Enhanced type exports for client portal
export type BusinessEntity = typeof businessEntities.$inferSelect;
export type InsertBusinessEntity = z.infer<typeof insertBusinessEntitySchema>;
export type ClientTask = typeof clientTasks.$inferSelect;
export type InsertClientTask = z.infer<typeof insertClientTaskSchema>;
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

// Operations Team Panel - Additional Schema
export const operationsTeam = pgTable("operations_team", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(), // ops_executive, ops_lead, qa_reviewer, admin
  specialization: json("specialization"), // service types they handle
  workloadCapacity: integer("workload_capacity").default(10),
  currentWorkload: integer("current_workload").default(0),
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

// SLA Exceptions table moved to line 142 to avoid duplicates

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
export type SystemIntegration = typeof systemIntegrations.$inferSelect;
export type InsertSystemIntegration = z.infer<typeof insertSystemIntegrationSchema>;
export type SystemNotification = typeof systemNotifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SystemConfiguration = typeof systemConfiguration.$inferSelect;
export type PerformanceDashboard = typeof performanceDashboard.$inferSelect;
export type AgentPartner = typeof agentPartners.$inferSelect;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;

// Agent/Partner Portal - Additional Schema
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
  totalCommissionEarned: decimal("total_commission_earned", { precision: 10, scale: 2 }).default(0),
  pendingPayouts: decimal("pending_payouts", { precision: 10, scale: 2 }).default(0),
  clearedPayouts: decimal("cleared_payouts", { precision: 10, scale: 2 }).default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  clientName: text("client_name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone").notNull(),
  entityType: text("entity_type"), // pvt_ltd, partnership, proprietorship, etc
  requiredServices: json("required_services"), // array of service codes
  leadSource: text("lead_source"), // whatsapp, referral, cold_call, etc
  status: text("status").default("new"), // new, contacted, converted, in_progress, closed, lost
  priority: text("priority").default("medium"), // low, medium, high
  kycDocuments: json("kyc_documents"), // uploaded document references
  leadLocation: json("lead_location"), // geo-tagging data
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  conversionProbability: integer("conversion_probability"), // AI lead scoring 0-100
  lastContactDate: timestamp("last_contact_date"),
  nextFollowupDate: timestamp("next_followup_date"),
  notes: text("notes"),
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
  totalCommissionEarned: decimal("total_commission_earned", { precision: 10, scale: 2 }).default(0),
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
  overrideCommissionRate: decimal("override_commission_rate", { precision: 5, scale: 2 }).default(5.00),
  totalOverrideEarned: decimal("total_override_earned", { precision: 10, scale: 2 }).default(0),
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
