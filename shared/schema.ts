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
