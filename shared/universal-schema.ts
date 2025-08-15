import { sql } from 'drizzle-orm';
import {
  boolean,
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
  varchar,
  decimal,
  pgEnum,
  unique,
  index,
  inet
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums for better type safety
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "ops_exec", 
  "ops_lead",
  "client",
  "agent",
  "super_admin"
]);

export const serviceStatusEnum = pgEnum("service_status", [
  "created",
  "in_progress", 
  "waiting_client",
  "waiting_government",
  "under_review",
  "completed",
  "cancelled",
  "on_hold"
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "assigned",
  "in_progress", 
  "waiting_client",
  "waiting_government",
  "qa_review",
  "completed",
  "rework_required"
]);

export const documentStatusEnum = pgEnum("document_status", [
  "uploaded",
  "pending_review",
  "approved", 
  "rejected",
  "expired"
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "converted",
  "in_progress",
  "completed",
  "lost"
]);

// Core Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("client"),
  status: text("status").notNull().default("active"),
  twofa_secret: text("twofa_secret"),
  is_twofa_enabled: boolean("is_twofa_enabled").default(false),
  last_login_at: timestamp("last_login_at"),
  last_login_ip: inet("last_login_ip"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  phoneIdx: index("users_phone_idx").on(table.phone),
  roleIdx: index("users_role_idx").on(table.role),
}));

// Business Entities (Multi-tenant support)
export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // pvt_ltd, llp, opc, partnership, proprietorship
  name: text("name").notNull(),
  identifiers: jsonb("identifiers"), // {CIN, GSTIN, PAN, etc}
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("entities_user_id_idx").on(table.user_id),
  typeIdx: index("entities_type_idx").on(table.type),
}));

// Service Catalog (Admin-configurable)
export const service_catalog = pgTable("service_catalog", {
  id: serial("id").primaryKey(),
  service_type: text("service_type").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  base_price: decimal("base_price", { precision: 10, scale: 2 }),
  sla_days: integer("sla_days").notNull().default(7),
  is_active: boolean("is_active").default(true),
  workflow_template_id: integer("workflow_template_id"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  serviceTypeIdx: index("service_catalog_type_idx").on(table.service_type),
  categoryIdx: index("service_catalog_category_idx").on(table.category),
}));

// Workflow Templates (No-code builder)
export const workflow_templates = pgTable("workflow_templates", {
  id: serial("id").primaryKey(),
  service_type: text("service_type").notNull(),
  version: integer("version").notNull().default(1),
  name: text("name").notNull(),
  description: text("description"),
  steps: jsonb("steps").notNull(), // Array of workflow steps with dependencies
  is_active: boolean("is_active").default(true),
  created_by: integer("created_by").notNull().references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  serviceTypeIdx: index("workflow_templates_service_type_idx").on(table.service_type),
  versionIdx: index("workflow_templates_version_idx").on(table.version),
  activeIdx: index("workflow_templates_active_idx").on(table.is_active),
  uniqueActiveVersion: unique("unique_active_service_version").on(table.service_type, table.version, table.is_active),
}));

// Service Orders (Main workflow instances)
export const service_orders = pgTable("service_orders", {
  id: serial("id").primaryKey(),
  entity_id: integer("entity_id").notNull().references(() => entities.id),
  service_type: text("service_type").notNull(),
  status: serviceStatusEnum("status").notNull().default("created"),
  workflow_version: integer("workflow_version").notNull().default(1),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  assigned_to: integer("assigned_to").references(() => users.id),
  due_at: timestamp("due_at"),
  flags: jsonb("flags"), // Custom flags/metadata
  progress_percentage: integer("progress_percentage").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  completed_at: timestamp("completed_at"),
}, (table) => ({
  entityIdIdx: index("service_orders_entity_id_idx").on(table.entity_id),
  statusIdx: index("service_orders_status_idx").on(table.status),
  serviceTypeIdx: index("service_orders_service_type_idx").on(table.service_type),
  assignedToIdx: index("service_orders_assigned_to_idx").on(table.assigned_to),
  dueAtIdx: index("service_orders_due_at_idx").on(table.due_at),
}));

// Tasks (Individual workflow steps)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  service_order_id: integer("service_order_id").notNull().references(() => service_orders.id, { onDelete: 'cascade' }),
  step_key: text("step_key").notNull(), // From workflow template
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // ops_task, client_task, qa_review, automated
  status: taskStatusEnum("status").notNull().default("pending"),
  assignee_id: integer("assignee_id").references(() => users.id),
  due_at: timestamp("due_at"),
  checklist: jsonb("checklist"), // Array of checklist items
  dependencies: jsonb("dependencies"), // Array of dependent step keys
  priority: text("priority").notNull().default("medium"),
  estimated_hours: integer("estimated_hours").default(1),
  actual_hours: integer("actual_hours"),
  qa_required: boolean("qa_required").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  completed_at: timestamp("completed_at"),
}, (table) => ({
  serviceOrderIdIdx: index("tasks_service_order_id_idx").on(table.service_order_id),
  statusIdx: index("tasks_status_idx").on(table.status),
  assigneeIdIdx: index("tasks_assignee_id_idx").on(table.assignee_id),
  dueAtIdx: index("tasks_due_at_idx").on(table.due_at),
  stepKeyIdx: index("tasks_step_key_idx").on(table.step_key),
}));

// Documents (Vault with versioning)
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  service_order_id: integer("service_order_id").notNull().references(() => service_orders.id, { onDelete: 'cascade' }),
  uploader_id: integer("uploader_id").notNull().references(() => users.id),
  doctype: text("doctype").notNull(),
  filename: text("filename").notNull(),
  original_filename: text("original_filename").notNull(),
  file_path: text("file_path").notNull(),
  file_size: integer("file_size").notNull(),
  mime_type: text("mime_type").notNull(),
  status: documentStatusEnum("status").notNull().default("uploaded"),
  version: integer("version").notNull().default(1),
  tags: jsonb("tags"), // Array of tags
  metadata: jsonb("metadata"), // Additional metadata
  expiry_at: timestamp("expiry_at"),
  approved_by: integer("approved_by").references(() => users.id),
  approved_at: timestamp("approved_at"),
  rejection_reason: text("rejection_reason"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  serviceOrderIdIdx: index("documents_service_order_id_idx").on(table.service_order_id),
  uploaderIdIdx: index("documents_uploader_id_idx").on(table.uploader_id),
  doctypeIdx: index("documents_doctype_idx").on(table.doctype),
  statusIdx: index("documents_status_idx").on(table.status),
  expiryAtIdx: index("documents_expiry_at_idx").on(table.expiry_at),
}));

// Messages (Threaded communication)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  service_order_id: integer("service_order_id").notNull().references(() => service_orders.id, { onDelete: 'cascade' }),
  thread_id: text("thread_id"), // For threading
  author_id: integer("author_id").notNull().references(() => users.id),
  recipient_id: integer("recipient_id").references(() => users.id),
  subject: text("subject"),
  body: text("body").notNull(),
  visibility: text("visibility").notNull().default("client"), // client, internal, all
  attachments: jsonb("attachments"), // Array of attachment info
  is_read: boolean("is_read").default(false),
  read_at: timestamp("read_at"),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => ({
  serviceOrderIdIdx: index("messages_service_order_id_idx").on(table.service_order_id),
  authorIdIdx: index("messages_author_id_idx").on(table.author_id),
  threadIdIdx: index("messages_thread_id_idx").on(table.thread_id),
  visibilityIdx: index("messages_visibility_idx").on(table.visibility),
}));

// Agents (Sales/partner management)
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  agent_code: text("agent_code").notNull().unique(),
  territory: text("territory"),
  manager_id: integer("manager_id").references(() => users.id),
  commission_rate: decimal("commission_rate", { precision: 5, scale: 2 }).default("5.00"),
  kyc_status: text("kyc_status").default("pending"), // pending, verified, rejected
  kyc_documents: jsonb("kyc_documents"),
  bank_details: jsonb("bank_details"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("agents_user_id_idx").on(table.user_id),
  agentCodeIdx: index("agents_agent_code_idx").on(table.agent_code),
  territoryIdx: index("agents_territory_idx").on(table.territory),
  managerIdIdx: index("agents_manager_id_idx").on(table.manager_id),
}));

// Leads (Agent lead management)
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  agent_id: integer("agent_id").notNull().references(() => agents.id),
  prospect: jsonb("prospect").notNull(), // Contact information
  business_name: text("business_name"),
  contact_person: text("contact_person").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  service_interest: text("service_interest"),
  status: leadStatusEnum("status").notNull().default("new"),
  assigned_to: integer("assigned_to").references(() => users.id),
  notes: text("notes"),
  follow_up_date: timestamp("follow_up_date"),
  converted_service_order_id: integer("converted_service_order_id").references(() => service_orders.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  agentIdIdx: index("leads_agent_id_idx").on(table.agent_id),
  statusIdx: index("leads_status_idx").on(table.status),
  assignedToIdx: index("leads_assigned_to_idx").on(table.assigned_to),
  followUpDateIdx: index("leads_follow_up_date_idx").on(table.follow_up_date),
}));

// Commissions (Agent earnings)
export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  agent_id: integer("agent_id").notNull().references(() => agents.id),
  service_order_id: integer("service_order_id").notNull().references(() => service_orders.id),
  lead_id: integer("lead_id").references(() => leads.id),
  base_amount: decimal("base_amount", { precision: 10, scale: 2 }).notNull(),
  commission_rate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commission_amount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, paid, disputed
  payable_on: timestamp("payable_on"),
  paid_on: timestamp("paid_on"),
  payment_reference: text("payment_reference"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  agentIdIdx: index("commissions_agent_id_idx").on(table.agent_id),
  serviceOrderIdIdx: index("commissions_service_order_id_idx").on(table.service_order_id),
  statusIdx: index("commissions_status_idx").on(table.status),
  payableOnIdx: index("commissions_payable_on_idx").on(table.payable_on),
}));

// Notifications (Multi-channel)
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  event_type: text("event_type").notNull(),
  channel: text("channel").notNull(), // in_app, email, whatsapp, sms
  title: text("title").notNull(),
  message: text("message").notNull(),
  payload: jsonb("payload"), // Additional data
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed
  sent_at: timestamp("sent_at"),
  delivered_at: timestamp("delivered_at"),
  read_at: timestamp("read_at"),
  created_at: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.user_id),
  eventTypeIdx: index("notifications_event_type_idx").on(table.event_type),
  channelIdx: index("notifications_channel_idx").on(table.channel),
  statusIdx: index("notifications_status_idx").on(table.status),
}));

// Audit Logs (WORM compliance)
export const audit_logs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actor_id: integer("actor_id").references(() => users.id),
  action: text("action").notNull(),
  target_type: text("target_type").notNull(),
  target_id: text("target_id").notNull(),
  old_values: jsonb("old_values"),
  new_values: jsonb("new_values"),
  ip_address: inet("ip_address"),
  user_agent: text("user_agent"),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  actorIdIdx: index("audit_logs_actor_id_idx").on(table.actor_id),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  targetTypeIdx: index("audit_logs_target_type_idx").on(table.target_type),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.created_at),
}));

// SLA Settings (Per service configuration)
export const sla_settings = pgTable("sla_settings", {
  id: serial("id").primaryKey(),
  service_type: text("service_type").notNull().unique(),
  baseline_hours: integer("baseline_hours").notNull(),
  warning_threshold_hours: integer("warning_threshold_hours").default(24),
  critical_threshold_hours: integer("critical_threshold_hours").default(4),
  escalation_rules: jsonb("escalation_rules"),
  pause_conditions: jsonb("pause_conditions"), // When to auto-pause SLA
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  serviceTypeIdx: index("sla_settings_service_type_idx").on(table.service_type),
}));

// SLA Tracking (Timer instances)
export const sla_timers = pgTable("sla_timers", {
  id: serial("id").primaryKey(),
  service_order_id: integer("service_order_id").notNull().references(() => service_orders.id),
  task_id: integer("task_id").references(() => tasks.id),
  baseline_hours: integer("baseline_hours").notNull(),
  started_at: timestamp("started_at").notNull(),
  paused_at: timestamp("paused_at"),
  total_paused_minutes: integer("total_paused_minutes").default(0),
  pause_reasons: jsonb("pause_reasons"), // Array of pause reasons
  current_status: text("current_status").notNull().default("running"),
  escalation_level: text("escalation_level"),
  breach_notified: boolean("breach_notified").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  serviceOrderIdIdx: index("sla_timers_service_order_id_idx").on(table.service_order_id),
  taskIdIdx: index("sla_timers_task_id_idx").on(table.task_id),
  statusIdx: index("sla_timers_status_idx").on(table.current_status),
}));

// User Preferences (Notification settings)
export const user_preferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  notification_channels: jsonb("notification_channels").default(['in_app', 'email']),
  quiet_hours_start: text("quiet_hours_start").default("22:00"),
  quiet_hours_end: text("quiet_hours_end").default("08:00"),
  timezone: text("timezone").default("Asia/Kolkata"),
  language: text("language").default("en"),
  dashboard_layout: jsonb("dashboard_layout"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("user_preferences_user_id_idx").on(table.user_id),
}));

// System Settings (Global configuration)
export const system_settings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  is_public: boolean("is_public").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => ({
  keyIdx: index("system_settings_key_idx").on(table.key),
}));

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  entities: many(entities),
  serviceOrders: many(service_orders),
  tasks: many(tasks),
  documents: many(documents),
  messages: many(messages),
  agent: one(agents, {
    fields: [users.id],
    references: [agents.user_id],
  }),
  notifications: many(notifications),
  auditLogs: many(audit_logs),
  preferences: one(user_preferences, {
    fields: [users.id],
    references: [user_preferences.user_id],
  }),
}));

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  owner: one(users, {
    fields: [entities.user_id],
    references: [users.id],
  }),
  serviceOrders: many(service_orders),
}));

export const serviceOrdersRelations = relations(service_orders, ({ one, many }) => ({
  entity: one(entities, {
    fields: [service_orders.entity_id],
    references: [entities.id],
  }),
  assignedTo: one(users, {
    fields: [service_orders.assigned_to],
    references: [users.id],
  }),
  tasks: many(tasks),
  documents: many(documents),
  messages: many(messages),
  slaTimer: one(sla_timers),
  commissions: many(commissions),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  serviceOrder: one(service_orders, {
    fields: [tasks.service_order_id],
    references: [service_orders.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignee_id],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  serviceOrder: one(service_orders, {
    fields: [documents.service_order_id],
    references: [service_orders.id],
  }),
  uploader: one(users, {
    fields: [documents.uploader_id],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [documents.approved_by],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  serviceOrder: one(service_orders, {
    fields: [messages.service_order_id],
    references: [service_orders.id],
  }),
  author: one(users, {
    fields: [messages.author_id],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [messages.recipient_id],
    references: [users.id],
  }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(users, {
    fields: [agents.user_id],
    references: [users.id],
  }),
  manager: one(users, {
    fields: [agents.manager_id],
    references: [users.id],
  }),
  leads: many(leads),
  commissions: many(commissions),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  agent: one(agents, {
    fields: [leads.agent_id],
    references: [agents.id],
  }),
  assignedTo: one(users, {
    fields: [leads.assigned_to],
    references: [users.id],
  }),
  convertedServiceOrder: one(service_orders, {
    fields: [leads.converted_service_order_id],
    references: [service_orders.id],
  }),
}));

// Zod Schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const insertEntitySchema = createInsertSchema(entities);
export const insertServiceCatalogSchema = createInsertSchema(service_catalog);
export const insertWorkflowTemplateSchema = createInsertSchema(workflow_templates);
export const insertServiceOrderSchema = createInsertSchema(service_orders);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertDocumentSchema = createInsertSchema(documents);
export const insertMessageSchema = createInsertSchema(messages);
export const insertAgentSchema = createInsertSchema(agents);
export const insertLeadSchema = createInsertSchema(leads);
export const insertCommissionSchema = createInsertSchema(commissions);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertAuditLogSchema = createInsertSchema(audit_logs);
export const insertSlaSettingsSchema = createInsertSchema(sla_settings);
export const insertSlaTimerSchema = createInsertSchema(sla_timers);
export const insertUserPreferencesSchema = createInsertSchema(user_preferences);
export const insertSystemSettingsSchema = createInsertSchema(system_settings);

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Entity = typeof entities.$inferSelect;
export type InsertEntity = typeof entities.$inferInsert;
export type ServiceCatalog = typeof service_catalog.$inferSelect;
export type InsertServiceCatalog = typeof service_catalog.$inferInsert;
export type WorkflowTemplate = typeof workflow_templates.$inferSelect;
export type InsertWorkflowTemplate = typeof workflow_templates.$inferInsert;
export type ServiceOrder = typeof service_orders.$inferSelect;
export type InsertServiceOrder = typeof service_orders.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = typeof commissions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type AuditLog = typeof audit_logs.$inferSelect;
export type InsertAuditLog = typeof audit_logs.$inferInsert;
export type SlaSettings = typeof sla_settings.$inferSelect;
export type InsertSlaSettings = typeof sla_settings.$inferInsert;
export type SlaTimer = typeof sla_timers.$inferSelect;
export type InsertSlaTimer = typeof sla_timers.$inferInsert;
export type UserPreferences = typeof user_preferences.$inferSelect;
export type InsertUserPreferences = typeof user_preferences.$inferInsert;
export type SystemSettings = typeof system_settings.$inferSelect;
export type InsertSystemSettings = typeof system_settings.$inferInsert;