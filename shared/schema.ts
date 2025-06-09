import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
  serviceId: text("service_id").notNull(),
  status: text("status").notNull().default("initiated"), // initiated, docs_uploaded, in_progress, ready_for_sign, completed, failed
  uploadedDocs: json("uploaded_docs"),
  documentHash: text("document_hash"),
  signatureData: json("signature_data"),
  paymentId: text("payment_id"),
  totalAmount: integer("total_amount").notNull(),
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
  serviceRequestId: integer("service_request_id"),
  documentType: text("document_type").notNull(), // incorporation_certificate, gst_certificate, annual_filing, etc.
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  fileUrl: text("file_url").notNull(),
  downloadCount: integer("download_count").default(0),
  isOfficial: boolean("is_official").default(false), // government issued documents
  expiryDate: timestamp("expiry_date"),
  tags: json("tags"), // for categorization and search
  accessLevel: text("access_level").notNull().default("private"), // private, shared, public
  encryptionKey: text("encryption_key"),
  checksumHash: text("checksum_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  lastAccessed: timestamp("last_accessed"),
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
