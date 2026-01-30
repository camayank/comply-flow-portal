/**
 * Enterprise Schema Extensions
 *
 * This file contains database schema definitions for enterprise-grade features:
 * - Multi-tenancy support
 * - Advanced RBAC with field-level security
 * - Webhook & integration ecosystem
 * - Advanced analytics & custom reports
 * - Document management system enhancements
 * - Financial management extensions
 * - Customer success platform
 * - Audit & compliance (SOC 2, ISO 27001)
 *
 * Version: 1.0
 * Date: January 2026
 */

import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, decimal, jsonb, uuid, time, bigserial, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, businessEntities, serviceRequests, documentsUploads, leads } from './schema';

// ============================================================================
// 1. MULTI-TENANCY
// ============================================================================

/**
 * Tenants table - Core multi-tenancy support
 * Each tenant represents a separate organization using the platform
 */
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  domain: varchar('domain', { length: 255 }),

  // Branding
  logoUrl: text('logo_url'),
  primaryColor: varchar('primary_color', { length: 7 }).default('#1e40af'),
  secondaryColor: varchar('secondary_color', { length: 7 }).default('#3b82f6'),
  faviconUrl: text('favicon_url'),

  // Configuration
  settings: jsonb('settings').default({}),
  features: jsonb('features').default({}), // Feature flags per tenant

  // Billing
  billingPlan: varchar('billing_plan', { length: 50 }).default('starter'),
  billingEmail: varchar('billing_email', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }).default('active'),

  // Limits
  maxUsers: integer('max_users').default(10),
  maxEntities: integer('max_entities').default(5),
  maxStorageGb: integer('max_storage_gb').default(10),
  currentStorageBytes: bigserial('current_storage_bytes', { mode: 'number' }).default(0),

  // Status
  status: varchar('status', { length: 20 }).default('active'),
  suspendedAt: timestamp('suspended_at'),
  suspendedReason: text('suspended_reason'),

  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  slugIdx: uniqueIndex('idx_tenants_slug').on(table.slug),
  domainIdx: index('idx_tenants_domain').on(table.domain),
  statusIdx: index('idx_tenants_status').on(table.status),
}));

/**
 * Tenant invitations - For inviting users to a tenant
 */
export const tenantInvitations = pgTable('tenant_invitations', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  token: varchar('token', { length: 255 }).unique().notNull(),
  invitedBy: integer('invited_by').references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// 2. ADVANCED RBAC & ACCESS CONTROL
// ============================================================================

/**
 * Permission groups - Custom permission sets
 */
export const permissionGroups = pgTable('permission_groups', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  permissions: jsonb('permissions').notNull().default([]), // Array of permission codes
  isSystem: boolean('is_system').default(false), // System-defined vs custom
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * User permission overrides - Individual permission grants/revokes
 */
export const userPermissionOverrides = pgTable('user_permission_overrides', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  permissionCode: varchar('permission_code', { length: 100 }).notNull(),
  granted: boolean('granted').notNull(), // true = grant, false = revoke
  expiresAt: timestamp('expires_at'),
  grantedBy: integer('granted_by').references(() => users.id),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userPermIdx: index('idx_user_perm_overrides_user').on(table.userId),
}));

/**
 * Field-level security rules
 */
export const fieldSecurityRules = pgTable('field_security_rules', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'user', 'service_request', etc.
  fieldName: varchar('field_name', { length: 100 }).notNull(),
  roleLevel: integer('role_level').notNull(), // Minimum role level to access
  accessType: varchar('access_type', { length: 20 }).notNull(), // 'read', 'write', 'hidden'
  conditions: jsonb('conditions'), // Additional conditions for access
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Access restrictions - IP, geo, time-based access control
 */
export const accessRestrictions = pgTable('access_restrictions', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  userId: integer('user_id').references(() => users.id),
  restrictionType: varchar('restriction_type', { length: 50 }).notNull(), // 'ip', 'geo', 'time'
  config: jsonb('config').notNull(), // { allowedIps: [], blockedCountries: [], etc. }
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Session policies - Configurable session settings
 */
export const sessionPolicies = pgTable('session_policies', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 100 }).notNull(),
  sessionTimeoutMinutes: integer('session_timeout_minutes').default(60),
  maxConcurrentSessions: integer('max_concurrent_sessions').default(5),
  requireMfa: boolean('require_mfa').default(false),
  mfaMethods: jsonb('mfa_methods').default(['totp']), // 'totp', 'sms', 'email'
  trustedDevicesEnabled: boolean('trusted_devices_enabled').default(true),
  trustedDeviceExpiryDays: integer('trusted_device_expiry_days').default(30),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// 3. WEBHOOK & INTEGRATION ECOSYSTEM
// ============================================================================

/**
 * Webhook endpoints - Outbound webhook configuration
 */
export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 200 }).notNull(),
  url: text('url').notNull(),
  secret: varchar('secret', { length: 255 }), // For HMAC signing
  events: jsonb('events').notNull().default([]), // Array of event types to trigger
  headers: jsonb('headers'), // Custom headers to send
  retryPolicy: jsonb('retry_policy').default({ maxRetries: 3, backoffMultiplier: 2 }),
  isActive: boolean('is_active').default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_webhook_endpoints_tenant').on(table.tenantId),
  activeIdx: index('idx_webhook_endpoints_active').on(table.isActive),
}));

/**
 * Webhook deliveries - Delivery attempts and status
 */
export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: serial('id').primaryKey(),
  endpointId: integer('endpoint_id').references(() => webhookEndpoints.id).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  eventId: varchar('event_id', { length: 100 }), // Unique event identifier
  payload: jsonb('payload').notNull(),
  responseStatus: integer('response_status'),
  responseBody: text('response_body'),
  responseTimeMs: integer('response_time_ms'),
  attemptCount: integer('attempt_count').default(1),
  nextRetryAt: timestamp('next_retry_at'),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'success', 'failed', 'retrying'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  deliveredAt: timestamp('delivered_at'),
}, (table) => ({
  endpointIdx: index('idx_webhook_deliveries_endpoint').on(table.endpointId),
  statusIdx: index('idx_webhook_deliveries_status').on(table.status),
  retryIdx: index('idx_webhook_deliveries_retry').on(table.nextRetryAt),
}));

/**
 * API keys - For external API access
 */
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 200 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(), // Hashed API key
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull(), // First chars for identification (e.g., "dc_live_abc")
  permissions: jsonb('permissions').notNull().default([]), // Array of allowed endpoints/scopes
  rateLimitPerMinute: integer('rate_limit_per_minute').default(60),
  rateLimitPerDay: integer('rate_limit_per_day').default(10000),
  allowedIps: jsonb('allowed_ips'), // IP whitelist
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at'),
  usageCount: integer('usage_count').default(0),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  revokedAt: timestamp('revoked_at'),
  revokedBy: integer('revoked_by').references(() => users.id),
}, (table) => ({
  keyPrefixIdx: index('idx_api_keys_prefix').on(table.keyPrefix),
  tenantIdx: index('idx_api_keys_tenant').on(table.tenantId),
}));

/**
 * API usage logs - Track API key usage
 */
export const apiUsageLogs = pgTable('api_usage_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  apiKeyId: integer('api_key_id').references(() => apiKeys.id),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  requestBody: jsonb('request_body'),
  responseStatus: integer('response_status'),
  responseTimeMs: integer('response_time_ms'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  apiKeyIdx: index('idx_api_usage_api_key').on(table.apiKeyId),
  createdAtIdx: index('idx_api_usage_created').on(table.createdAt),
}));

/**
 * Integration templates - Pre-built integrations
 */
export const integrationTemplates = pgTable('integration_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  provider: varchar('provider', { length: 100 }).notNull(), // 'google_sheets', 'slack', 'quickbooks', 'tally'
  description: text('description'),
  category: varchar('category', { length: 50 }), // 'accounting', 'communication', 'storage'
  configSchema: jsonb('config_schema').notNull(), // JSON schema for configuration
  defaultConfig: jsonb('default_config'),
  authType: varchar('auth_type', { length: 50 }), // 'oauth2', 'api_key', 'basic'
  documentationUrl: text('documentation_url'),
  iconUrl: text('icon_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Tenant integrations - Active integrations per tenant
 */
export const tenantIntegrations = pgTable('tenant_integrations', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  templateId: integer('template_id').references(() => integrationTemplates.id),
  name: varchar('name', { length: 200 }).notNull(),
  config: jsonb('config').notNull(),
  credentialsEncrypted: text('credentials_encrypted'), // Encrypted credentials
  status: varchar('status', { length: 20 }).default('active'), // 'active', 'paused', 'error'
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncStatus: varchar('last_sync_status', { length: 20 }),
  lastSyncError: text('last_sync_error'),
  syncFrequencyMinutes: integer('sync_frequency_minutes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// 4. ADVANCED ANALYTICS & CUSTOM REPORTS
// ============================================================================

/**
 * Custom reports - User-created reports
 */
export const customReports = pgTable('custom_reports', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  reportType: varchar('report_type', { length: 50 }).notNull(), // 'table', 'chart', 'pivot', 'dashboard'
  dataSource: varchar('data_source', { length: 100 }).notNull(), // Table or view name
  columns: jsonb('columns').notNull(), // Selected columns with formatting
  filters: jsonb('filters'), // Filter conditions
  grouping: jsonb('grouping'), // Group by configuration
  sorting: jsonb('sorting'), // Sort configuration
  chartConfig: jsonb('chart_config'), // Chart type and settings
  isShared: boolean('is_shared').default(false),
  sharedWith: jsonb('shared_with'), // Array of user IDs or role names
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Report schedules - Automated report delivery
 */
export const reportSchedules = pgTable('report_schedules', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id').references(() => customReports.id).notNull(),
  scheduleType: varchar('schedule_type', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
  scheduleConfig: jsonb('schedule_config').notNull(), // { dayOfWeek, time, dayOfMonth, etc. }
  recipients: jsonb('recipients').notNull(), // Array of email addresses or user IDs
  format: varchar('format', { length: 20 }).default('pdf'), // 'pdf', 'excel', 'csv'
  includeFilters: boolean('include_filters').default(true),
  isActive: boolean('is_active').default(true),
  lastRunAt: timestamp('last_run_at'),
  lastRunStatus: varchar('last_run_status', { length: 20 }),
  nextRunAt: timestamp('next_run_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Custom dashboards - User-created dashboards
 */
export const customDashboards = pgTable('custom_dashboards', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  userId: integer('user_id').references(() => users.id),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  layout: jsonb('layout').notNull(), // Grid layout configuration
  widgets: jsonb('widgets').notNull(), // Array of widget configurations
  refreshInterval: integer('refresh_interval').default(300), // Seconds
  isDefault: boolean('is_default').default(false),
  isShared: boolean('is_shared').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * KPI definitions - Key performance indicators
 */
export const kpiDefinitions = pgTable('kpi_definitions', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }), // 'compliance', 'financial', 'operational'
  calculationQuery: text('calculation_query').notNull(), // SQL for KPI calculation
  unit: varchar('unit', { length: 50 }), // '%', 'count', 'currency', 'days'
  targetValue: decimal('target_value', { precision: 15, scale: 2 }),
  warningThreshold: decimal('warning_threshold', { precision: 15, scale: 2 }),
  criticalThreshold: decimal('critical_threshold', { precision: 15, scale: 2 }),
  thresholdDirection: varchar('threshold_direction', { length: 10 }).default('above'), // 'above' or 'below'
  refreshIntervalMinutes: integer('refresh_interval_minutes').default(60),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * KPI values - Time-series KPI data
 */
export const kpiValues = pgTable('kpi_values', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  kpiId: integer('kpi_id').references(() => kpiDefinitions.id).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  value: decimal('value', { precision: 15, scale: 2 }).notNull(),
  metadata: jsonb('metadata'), // Additional context
  calculatedAt: timestamp('calculated_at').defaultNow(),
}, (table) => ({
  kpiIdx: index('idx_kpi_values_kpi').on(table.kpiId),
  timeIdx: index('idx_kpi_values_time').on(table.calculatedAt),
}));

/**
 * KPI alerts - Threshold breach notifications
 */
export const kpiAlerts = pgTable('kpi_alerts', {
  id: serial('id').primaryKey(),
  kpiId: integer('kpi_id').references(() => kpiDefinitions.id).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  alertType: varchar('alert_type', { length: 20 }).notNull(), // 'warning', 'critical'
  currentValue: decimal('current_value', { precision: 15, scale: 2 }).notNull(),
  thresholdValue: decimal('threshold_value', { precision: 15, scale: 2 }).notNull(),
  message: text('message'),
  isAcknowledged: boolean('is_acknowledged').default(false),
  acknowledgedBy: integer('acknowledged_by').references(() => users.id),
  acknowledgedAt: timestamp('acknowledged_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// 5. NOTIFICATION & COMMUNICATION HUB
// ============================================================================

/**
 * Notification preferences - User notification settings
 */
export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  notificationType: varchar('notification_type', { length: 100 }).notNull(),
  emailEnabled: boolean('email_enabled').default(true),
  smsEnabled: boolean('sms_enabled').default(false),
  whatsappEnabled: boolean('whatsapp_enabled').default(false),
  pushEnabled: boolean('push_enabled').default(true),
  inAppEnabled: boolean('in_app_enabled').default(true),
  frequency: varchar('frequency', { length: 20 }).default('immediate'), // 'immediate', 'hourly', 'daily', 'weekly'
  quietHoursStart: time('quiet_hours_start'),
  quietHoursEnd: time('quiet_hours_end'),
  quietHoursTimezone: varchar('quiet_hours_timezone', { length: 50 }).default('Asia/Kolkata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userTypeIdx: uniqueIndex('idx_notification_prefs_user_type').on(table.userId, table.notificationType),
}));

/**
 * Notification queue - Pending notifications with tracking
 */
export const notificationQueue = pgTable('notification_queue', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  userId: integer('user_id').references(() => users.id),
  notificationType: varchar('notification_type', { length: 100 }).notNull(),
  channel: varchar('channel', { length: 20 }).notNull(), // 'email', 'sms', 'whatsapp', 'push', 'in_app'
  subject: text('subject'),
  content: text('content').notNull(),
  templateId: integer('template_id'),
  templateData: jsonb('template_data'),
  priority: varchar('priority', { length: 20 }).default('normal'), // 'low', 'normal', 'high', 'urgent'
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'sent', 'delivered', 'failed', 'cancelled'
  scheduledFor: timestamp('scheduled_for'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  externalId: varchar('external_id', { length: 255 }), // ID from email/SMS provider
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  statusIdx: index('idx_notification_queue_status').on(table.status),
  userIdx: index('idx_notification_queue_user').on(table.userId),
  scheduledIdx: index('idx_notification_queue_scheduled').on(table.scheduledFor),
}));

/**
 * Communication threads - Unified messaging
 */
export const communicationThreads = pgTable('communication_threads', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'service_request', 'support_ticket', 'lead'
  entityId: integer('entity_id').notNull(),
  subject: varchar('subject', { length: 500 }),
  participantIds: jsonb('participant_ids').notNull(), // Array of user IDs
  lastMessageAt: timestamp('last_message_at'),
  messageCount: integer('message_count').default(0),
  unreadCount: jsonb('unread_count').default({}), // { userId: count }
  isClosed: boolean('is_closed').default(false),
  closedAt: timestamp('closed_at'),
  closedBy: integer('closed_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  entityIdx: index('idx_comm_threads_entity').on(table.entityType, table.entityId),
}));

/**
 * Thread messages - Messages within threads
 */
export const threadMessages = pgTable('thread_messages', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').references(() => communicationThreads.id).notNull(),
  senderId: integer('sender_id').references(() => users.id),
  messageType: varchar('message_type', { length: 20 }).notNull(), // 'text', 'attachment', 'system', 'template'
  content: text('content'),
  attachments: jsonb('attachments'), // Array of { name, url, size, type }
  templateId: integer('template_id'),
  isInternal: boolean('is_internal').default(false), // Internal notes not visible to clients
  readBy: jsonb('read_by').default([]), // Array of { userId, readAt }
  editedAt: timestamp('edited_at'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  threadIdx: index('idx_thread_messages_thread').on(table.threadId),
}));

// ============================================================================
// 6. DOCUMENT MANAGEMENT ENHANCEMENTS
// ============================================================================

/**
 * Document templates - For document generation
 */
export const documentTemplatesV2 = pgTable('document_templates_v2', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 200 }).notNull(),
  category: varchar('category', { length: 100 }),
  templateType: varchar('template_type', { length: 50 }).notNull(), // 'word', 'pdf', 'html', 'excel'
  templateContent: text('template_content').notNull(),
  variables: jsonb('variables'), // Array of { name, type, required, default }
  previewImage: text('preview_image'),
  version: integer('version').default(1),
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Document generation jobs - Track document creation
 */
export const documentGenerationJobs = pgTable('document_generation_jobs', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => documentTemplatesV2.id),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: integer('entity_id'),
  variablesData: jsonb('variables_data').notNull(),
  generatedDocumentId: integer('generated_document_id').references(() => documentsUploads.id),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'processing', 'completed', 'failed'
  errorMessage: text('error_message'),
  requestedBy: integer('requested_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

/**
 * Document annotations - Comments and highlights
 */
export const documentAnnotations = pgTable('document_annotations', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').references(() => documentsUploads.id).notNull(),
  versionId: integer('version_id'),
  userId: integer('user_id').references(() => users.id).notNull(),
  annotationType: varchar('annotation_type', { length: 50 }).notNull(), // 'comment', 'highlight', 'stamp', 'drawing'
  content: text('content'),
  position: jsonb('position'), // { page, x, y, width, height }
  color: varchar('color', { length: 7 }),
  isResolved: boolean('is_resolved').default(false),
  resolvedBy: integer('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  documentIdx: index('idx_doc_annotations_document').on(table.documentId),
}));

/**
 * Document shares - External sharing
 */
export const documentShares = pgTable('document_shares', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').references(() => documentsUploads.id).notNull(),
  shareType: varchar('share_type', { length: 20 }).notNull(), // 'internal', 'external'
  sharedWithUserId: integer('shared_with_user_id').references(() => users.id),
  sharedWithEmail: varchar('shared_with_email', { length: 255 }),
  accessLevel: varchar('access_level', { length: 20 }).notNull(), // 'view', 'download', 'edit'
  shareToken: varchar('share_token', { length: 255 }).unique(),
  expiresAt: timestamp('expires_at'),
  passwordHash: varchar('password_hash', { length: 255 }),
  accessCount: integer('access_count').default(0),
  lastAccessedAt: timestamp('last_accessed_at'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  revokedAt: timestamp('revoked_at'),
});

/**
 * Document search index - Full-text search
 */
export const documentSearchIndex = pgTable('document_search_index', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').references(() => documentsUploads.id).notNull().unique(),
  contentText: text('content_text').notNull(),
  extractedEntities: jsonb('extracted_entities'), // { dates: [], amounts: [], names: [], etc. }
  language: varchar('language', { length: 10 }).default('english'),
  ocrConfidence: decimal('ocr_confidence', { precision: 5, scale: 2 }),
  indexedAt: timestamp('indexed_at').defaultNow(),
});

/**
 * Document retention policies
 */
export const documentRetentionPolicies = pgTable('document_retention_policies', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 200 }).notNull(),
  documentCategory: varchar('document_category', { length: 100 }),
  retentionDays: integer('retention_days').notNull(),
  action: varchar('action', { length: 20 }).notNull(), // 'archive', 'delete', 'notify'
  notifyDaysBeforeAction: integer('notify_days_before_action').default(30),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// 7. FINANCIAL MANAGEMENT EXTENSIONS
// ============================================================================

/**
 * Chart of accounts - Accounting structure
 */
export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  accountCode: varchar('account_code', { length: 20 }).notNull(),
  accountName: varchar('account_name', { length: 200 }).notNull(),
  accountType: varchar('account_type', { length: 50 }).notNull(), // 'asset', 'liability', 'equity', 'revenue', 'expense'
  parentAccountId: integer('parent_account_id').references(() => chartOfAccounts.id),
  description: text('description'),
  currency: varchar('currency', { length: 3 }).default('INR'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantCodeIdx: uniqueIndex('idx_coa_tenant_code').on(table.tenantId, table.accountCode),
}));

/**
 * Journal entries - Double-entry bookkeeping
 */
export const journalEntries = pgTable('journal_entries', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  entryNumber: varchar('entry_number', { length: 50 }).notNull(),
  entryDate: date('entry_date').notNull(),
  description: text('description'),
  referenceType: varchar('reference_type', { length: 50 }), // 'invoice', 'payment', 'expense', 'manual'
  referenceId: integer('reference_id'),
  status: varchar('status', { length: 20 }).default('draft'), // 'draft', 'posted', 'reversed'
  totalDebit: decimal('total_debit', { precision: 15, scale: 2 }).default('0'),
  totalCredit: decimal('total_credit', { precision: 15, scale: 2 }).default('0'),
  createdBy: integer('created_by').references(() => users.id),
  postedBy: integer('posted_by').references(() => users.id),
  postedAt: timestamp('posted_at'),
  reversedBy: integer('reversed_by').references(() => users.id),
  reversedAt: timestamp('reversed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Journal entry lines - Individual debits/credits
 */
export const journalEntryLines = pgTable('journal_entry_lines', {
  id: serial('id').primaryKey(),
  journalEntryId: integer('journal_entry_id').references(() => journalEntries.id).notNull(),
  accountId: integer('account_id').references(() => chartOfAccounts.id).notNull(),
  debitAmount: decimal('debit_amount', { precision: 15, scale: 2 }).default('0'),
  creditAmount: decimal('credit_amount', { precision: 15, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 3 }).default('INR'),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }).default('1'),
  baseDebitAmount: decimal('base_debit_amount', { precision: 15, scale: 2 }).default('0'),
  baseCreditAmount: decimal('base_credit_amount', { precision: 15, scale: 2 }).default('0'),
  narration: text('narration'),
});

/**
 * Exchange rates - Currency conversion
 */
export const exchangeRates = pgTable('exchange_rates', {
  id: serial('id').primaryKey(),
  fromCurrency: varchar('from_currency', { length: 3 }).notNull(),
  toCurrency: varchar('to_currency', { length: 3 }).notNull(),
  rate: decimal('rate', { precision: 10, scale: 6 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  source: varchar('source', { length: 50 }), // 'rbi', 'manual', 'api'
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  currencyDateIdx: index('idx_exchange_rates_currency_date').on(table.fromCurrency, table.toCurrency, table.effectiveDate),
}));

/**
 * Tax configurations - GST, TDS, TCS settings
 */
export const taxConfigurations = pgTable('tax_configurations', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  taxType: varchar('tax_type', { length: 50 }).notNull(), // 'gst', 'tds', 'tcs', 'professional_tax'
  taxCode: varchar('tax_code', { length: 20 }).notNull(),
  taxName: varchar('tax_name', { length: 100 }).notNull(),
  rate: decimal('rate', { precision: 5, scale: 2 }).notNull(),
  accountId: integer('account_id').references(() => chartOfAccounts.id),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Tax transactions - Tax ledger
 */
export const taxTransactions = pgTable('tax_transactions', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // 'gst_output', 'gst_input', 'tds_deducted', 'tds_paid'
  taxConfigId: integer('tax_config_id').references(() => taxConfigurations.id),
  baseAmount: decimal('base_amount', { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).notNull(),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: integer('reference_id'),
  periodMonth: integer('period_month'),
  periodYear: integer('period_year'),
  filingStatus: varchar('filing_status', { length: 20 }).default('pending'), // 'pending', 'filed', 'paid'
  filedAt: timestamp('filed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  periodIdx: index('idx_tax_transactions_period').on(table.periodYear, table.periodMonth),
}));

/**
 * Bank accounts - For reconciliation
 */
export const bankAccounts = pgTable('bank_accounts', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  accountName: varchar('account_name', { length: 200 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }),
  bankName: varchar('bank_name', { length: 200 }),
  ifscCode: varchar('ifsc_code', { length: 20 }),
  branch: varchar('branch', { length: 200 }),
  accountId: integer('account_id').references(() => chartOfAccounts.id),
  openingBalance: decimal('opening_balance', { precision: 15, scale: 2 }).default('0'),
  currentBalance: decimal('current_balance', { precision: 15, scale: 2 }).default('0'),
  lastReconciledDate: date('last_reconciled_date'),
  lastReconciledBalance: decimal('last_reconciled_balance', { precision: 15, scale: 2 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Bank transactions - For reconciliation
 */
export const bankTransactions = pgTable('bank_transactions', {
  id: serial('id').primaryKey(),
  bankAccountId: integer('bank_account_id').references(() => bankAccounts.id).notNull(),
  transactionDate: date('transaction_date').notNull(),
  valueDate: date('value_date'),
  description: text('description'),
  reference: varchar('reference', { length: 100 }),
  debitAmount: decimal('debit_amount', { precision: 15, scale: 2 }).default('0'),
  creditAmount: decimal('credit_amount', { precision: 15, scale: 2 }).default('0'),
  balance: decimal('balance', { precision: 15, scale: 2 }),
  isReconciled: boolean('is_reconciled').default(false),
  reconciledWithType: varchar('reconciled_with_type', { length: 50 }), // 'payment', 'receipt', 'journal'
  reconciledWithId: integer('reconciled_with_id'),
  reconciledAt: timestamp('reconciled_at'),
  reconciledBy: integer('reconciled_by').references(() => users.id),
  importedAt: timestamp('imported_at').defaultNow(),
});

// ============================================================================
// 8. CUSTOMER SUCCESS PLATFORM
// ============================================================================

/**
 * Customer health scores - Enhanced tracking
 */
export const customerHealthScoresV2 = pgTable('customer_health_scores_v2', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => users.id).notNull(),
  entityId: integer('entity_id').references(() => businessEntities.id),
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }).notNull(),
  engagementScore: decimal('engagement_score', { precision: 5, scale: 2 }),
  complianceScore: decimal('compliance_score', { precision: 5, scale: 2 }),
  paymentScore: decimal('payment_score', { precision: 5, scale: 2 }),
  supportScore: decimal('support_score', { precision: 5, scale: 2 }),
  productUsageScore: decimal('product_usage_score', { precision: 5, scale: 2 }),
  trend: varchar('trend', { length: 20 }), // 'improving', 'stable', 'declining'
  riskLevel: varchar('risk_level', { length: 20 }), // 'low', 'medium', 'high', 'critical'
  factors: jsonb('factors'), // Breakdown of score factors
  recommendations: jsonb('recommendations'), // AI-generated recommendations
  calculatedAt: timestamp('calculated_at').defaultNow(),
}, (table) => ({
  clientIdx: index('idx_customer_health_client').on(table.clientId),
  riskIdx: index('idx_customer_health_risk').on(table.riskLevel),
}));

/**
 * Customer engagement events - Activity tracking
 */
export const customerEngagementEvents = pgTable('customer_engagement_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  clientId: integer('client_id').references(() => users.id).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(), // 'login', 'feature_used', 'document_uploaded', 'payment_made'
  eventCategory: varchar('event_category', { length: 50 }), // 'engagement', 'transaction', 'support'
  eventData: jsonb('event_data'),
  sessionId: varchar('session_id', { length: 100 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  clientIdx: index('idx_engagement_events_client').on(table.clientId),
  typeIdx: index('idx_engagement_events_type').on(table.eventType),
  timeIdx: index('idx_engagement_events_time').on(table.createdAt),
}));

/**
 * NPS surveys - Net Promoter Score
 */
export const npsSurveys = pgTable('nps_surveys', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  clientId: integer('client_id').references(() => users.id).notNull(),
  score: integer('score').notNull(), // 0-10
  category: varchar('category', { length: 20 }), // 'promoter', 'passive', 'detractor'
  feedback: text('feedback'),
  touchpoint: varchar('touchpoint', { length: 100 }), // 'service_completed', 'support_ticket', 'quarterly_check'
  serviceRequestId: integer('service_request_id').references(() => serviceRequests.id),
  followUpStatus: varchar('follow_up_status', { length: 20 }).default('pending'), // 'pending', 'contacted', 'resolved'
  followUpNotes: text('follow_up_notes'),
  followUpBy: integer('follow_up_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Success playbooks - Guided customer success journeys
 */
export const successPlaybooks = pgTable('success_playbooks', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(), // 'onboarding', 'risk_detected', 'milestone', 'manual'
  triggerConditions: jsonb('trigger_conditions').notNull(),
  stages: jsonb('stages').notNull(), // Array of { name, tasks: [], durationDays, exitConditions }
  isActive: boolean('is_active').default(true),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Playbook executions - Active playbook instances
 */
export const playbookExecutions = pgTable('playbook_executions', {
  id: serial('id').primaryKey(),
  playbookId: integer('playbook_id').references(() => successPlaybooks.id).notNull(),
  clientId: integer('client_id').references(() => users.id).notNull(),
  currentStage: integer('current_stage').default(1),
  stageProgress: jsonb('stage_progress').default({}), // { stageIndex: { taskIndex: completed } }
  status: varchar('status', { length: 20 }).default('active'), // 'active', 'completed', 'paused', 'cancelled'
  assignedTo: integer('assigned_to').references(() => users.id),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  pausedAt: timestamp('paused_at'),
  pauseReason: text('pause_reason'),
});

/**
 * Renewal opportunities - Contract renewal tracking
 */
export const renewalOpportunities = pgTable('renewal_opportunities', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  clientId: integer('client_id').references(() => users.id).notNull(),
  entityId: integer('entity_id').references(() => businessEntities.id),
  contractType: varchar('contract_type', { length: 50 }), // 'retainer', 'project', 'subscription'
  currentValue: decimal('current_value', { precision: 15, scale: 2 }),
  renewalValue: decimal('renewal_value', { precision: 15, scale: 2 }),
  renewalDate: date('renewal_date').notNull(),
  status: varchar('status', { length: 20 }).default('upcoming'), // 'upcoming', 'in_progress', 'renewed', 'churned', 'downgraded'
  probability: integer('probability'), // 0-100
  riskFactors: jsonb('risk_factors'),
  ownerId: integer('owner_id').references(() => users.id),
  notes: text('notes'),
  renewedAt: timestamp('renewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// 9. AUDIT & COMPLIANCE (SOC 2, ISO 27001)
// ============================================================================

/**
 * Immutable audit log - Tamper-proof logging with hash chain
 */
export const immutableAuditLog = pgTable('immutable_audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  logHash: varchar('log_hash', { length: 64 }).notNull(), // SHA-256 hash of log entry
  previousHash: varchar('previous_hash', { length: 64 }), // Previous entry hash (blockchain-like)
  tenantId: uuid('tenant_id').references(() => tenants.id),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  sessionId: varchar('session_id', { length: 100 }),
  requestId: varchar('request_id', { length: 100 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => ({
  hashIdx: index('idx_immutable_audit_hash').on(table.logHash),
  entityIdx: index('idx_immutable_audit_entity').on(table.entityType, table.entityId),
  userIdx: index('idx_immutable_audit_user').on(table.userId),
  timeIdx: index('idx_immutable_audit_time').on(table.timestamp),
}));

/**
 * Data classifications - PII and sensitive data tagging
 */
export const dataClassifications = pgTable('data_classifications', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  fieldName: varchar('field_name', { length: 100 }).notNull(),
  classification: varchar('classification', { length: 50 }).notNull(), // 'public', 'internal', 'confidential', 'pii', 'sensitive'
  handlingRequirements: text('handling_requirements'),
  retentionDays: integer('retention_days'),
  encryptionRequired: boolean('encryption_required').default(false),
  maskingRequired: boolean('masking_required').default(false),
  maskingPattern: varchar('masking_pattern', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  entityFieldIdx: uniqueIndex('idx_data_class_entity_field').on(table.entityType, table.fieldName),
}));

/**
 * Access reviews - Periodic access certification
 */
export const accessReviews = pgTable('access_reviews', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  reviewPeriodStart: date('review_period_start').notNull(),
  reviewPeriodEnd: date('review_period_end').notNull(),
  reviewType: varchar('review_type', { length: 50 }).notNull(), // 'quarterly', 'annual', 'termination'
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'in_progress', 'completed', 'overdue'
  reviewerId: integer('reviewer_id').references(() => users.id),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at'),
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Access review items - Individual user access reviews
 */
export const accessReviewItems = pgTable('access_review_items', {
  id: serial('id').primaryKey(),
  reviewId: integer('review_id').references(() => accessReviews.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  currentRole: varchar('current_role', { length: 50 }),
  currentPermissions: jsonb('current_permissions'),
  accessHistory: jsonb('access_history'), // Summary of recent access patterns
  decision: varchar('decision', { length: 20 }), // 'approve', 'revoke', 'modify'
  newRole: varchar('new_role', { length: 50 }),
  newPermissions: jsonb('new_permissions'),
  comments: text('comments'),
  reviewedAt: timestamp('reviewed_at'),
});

/**
 * Security incidents - Incident tracking
 */
export const securityIncidents = pgTable('security_incidents', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  incidentId: varchar('incident_id', { length: 50 }).unique().notNull(),
  incidentType: varchar('incident_type', { length: 100 }).notNull(), // 'unauthorized_access', 'data_breach', 'phishing', 'malware'
  severity: varchar('severity', { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').notNull(),
  affectedUsers: jsonb('affected_users'), // Array of user IDs
  affectedData: jsonb('affected_data'), // Types of data affected
  affectedSystems: jsonb('affected_systems'),
  detectionMethod: varchar('detection_method', { length: 100 }),
  containmentActions: text('containment_actions'),
  eradicationActions: text('eradication_actions'),
  recoveryActions: text('recovery_actions'),
  lessonsLearned: text('lessons_learned'),
  status: varchar('status', { length: 20 }).default('open'), // 'open', 'investigating', 'contained', 'resolved', 'closed'
  assignedTo: integer('assigned_to').references(() => users.id),
  detectedAt: timestamp('detected_at').notNull(),
  containedAt: timestamp('contained_at'),
  resolvedAt: timestamp('resolved_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Data deletion requests - GDPR compliance
 */
export const dataDeletionRequests = pgTable('data_deletion_requests', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  requestedBy: integer('requested_by').references(() => users.id),
  subjectEmail: varchar('subject_email', { length: 255 }).notNull(),
  subjectName: varchar('subject_name', { length: 255 }),
  requestType: varchar('request_type', { length: 50 }).notNull(), // 'erasure', 'portability', 'rectification', 'restriction'
  scope: jsonb('scope'), // What data to delete/export
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'verified', 'processing', 'completed', 'rejected'
  verificationToken: varchar('verification_token', { length: 255 }),
  verifiedAt: timestamp('verified_at'),
  processingStartedAt: timestamp('processing_started_at'),
  completedAt: timestamp('completed_at'),
  rejectionReason: text('rejection_reason'),
  exportUrl: text('export_url'), // For data portability requests
  exportExpiresAt: timestamp('export_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// 10. PROJECT MANAGEMENT
// ============================================================================

/**
 * Projects - Full project management
 */
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  projectId: varchar('project_id', { length: 50 }).notNull(), // Readable ID
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  clientId: integer('client_id').references(() => users.id),
  entityId: integer('entity_id').references(() => businessEntities.id),
  projectManagerId: integer('project_manager_id').references(() => users.id),
  startDate: date('start_date'),
  targetEndDate: date('target_end_date'),
  actualEndDate: date('actual_end_date'),
  budgetHours: decimal('budget_hours', { precision: 10, scale: 2 }),
  budgetAmount: decimal('budget_amount', { precision: 15, scale: 2 }),
  actualHours: decimal('actual_hours', { precision: 10, scale: 2 }).default('0'),
  actualAmount: decimal('actual_amount', { precision: 15, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).default('planning'), // 'planning', 'active', 'on_hold', 'completed', 'cancelled'
  priority: varchar('priority', { length: 20 }).default('medium'),
  templateId: integer('template_id'),
  tags: jsonb('tags').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Project milestones
 */
export const projectMilestones = pgTable('project_milestones', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  targetDate: date('target_date'),
  completedDate: date('completed_date'),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'in_progress', 'completed', 'missed'
  sequenceOrder: integer('sequence_order'),
  deliverables: jsonb('deliverables'), // Array of deliverable descriptions
});

/**
 * Project tasks - Enhanced task management
 */
export const projectTasks = pgTable('project_tasks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  milestoneId: integer('milestone_id').references(() => projectMilestones.id),
  parentTaskId: integer('parent_task_id').references(() => projectTasks.id),
  taskId: varchar('task_id', { length: 50 }).notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  assigneeId: integer('assignee_id').references(() => users.id),
  startDate: date('start_date'),
  dueDate: date('due_date'),
  completedDate: date('completed_date'),
  estimatedHours: decimal('estimated_hours', { precision: 10, scale: 2 }),
  actualHours: decimal('actual_hours', { precision: 10, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).default('todo'), // 'todo', 'in_progress', 'review', 'completed', 'blocked'
  priority: varchar('priority', { length: 20 }).default('medium'),
  labels: jsonb('labels').default([]),
  dependencies: jsonb('dependencies').default([]), // Array of task IDs
  blockedReason: text('blocked_reason'),
  sequenceOrder: integer('sequence_order'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Time entries - Time tracking
 */
export const timeEntries = pgTable('time_entries', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => projectTasks.id),
  projectId: integer('project_id').references(() => projects.id),
  userId: integer('user_id').references(() => users.id).notNull(),
  date: date('date').notNull(),
  hours: decimal('hours', { precision: 5, scale: 2 }).notNull(),
  description: text('description'),
  billable: boolean('billable').default(true),
  billedAt: timestamp('billed_at'),
  invoiceId: integer('invoice_id'),
  approved: boolean('approved').default(false),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Resource allocations - Team capacity planning
 */
export const resourceAllocations = pgTable('resource_allocations', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  allocationPercentage: decimal('allocation_percentage', { precision: 5, scale: 2 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  role: varchar('role', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Kanban boards - Visual task management
 */
export const kanbanBoards = pgTable('kanban_boards', {
  id: serial('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  name: varchar('name', { length: 200 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'project', 'team', 'personal'
  entityId: integer('entity_id'),
  columns: jsonb('columns').notNull(), // Array of { id, name, color, limit }
  settings: jsonb('settings').default({}),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// 11. AI & MACHINE LEARNING
// ============================================================================

/**
 * ML models - Model registry
 */
export const mlModels = pgTable('ml_models', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'lead_scoring', 'churn_prediction', 'anomaly_detection'
  version: varchar('version', { length: 20 }).notNull(),
  description: text('description'),
  config: jsonb('config'),
  metrics: jsonb('metrics'), // { accuracy, precision, recall, f1 }
  featureImportance: jsonb('feature_importance'),
  isActive: boolean('is_active').default(false),
  trainedAt: timestamp('trained_at'),
  trainingDataSize: integer('training_data_size'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Lead scores - ML-generated scores
 */
export const leadScores = pgTable('lead_scores', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id).notNull(),
  score: decimal('score', { precision: 5, scale: 2 }).notNull(), // 0-100
  factors: jsonb('factors'), // Explanation of score factors
  modelVersion: varchar('model_version', { length: 20 }),
  previousScore: decimal('previous_score', { precision: 5, scale: 2 }),
  scoreDelta: decimal('score_delta', { precision: 5, scale: 2 }),
  calculatedAt: timestamp('calculated_at').defaultNow(),
}, (table) => ({
  leadIdx: index('idx_lead_scores_lead').on(table.leadId),
}));

/**
 * Churn risk scores
 */
export const clientChurnScores = pgTable('client_churn_scores', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => users.id).notNull(),
  riskScore: decimal('risk_score', { precision: 5, scale: 2 }).notNull(), // 0-100 (higher = more likely to churn)
  riskLevel: varchar('risk_level', { length: 20 }), // 'low', 'medium', 'high', 'critical'
  riskFactors: jsonb('risk_factors'), // Top contributing factors
  recommendedActions: jsonb('recommended_actions'),
  modelVersion: varchar('model_version', { length: 20 }),
  previousScore: decimal('previous_score', { precision: 5, scale: 2 }),
  calculatedAt: timestamp('calculated_at').defaultNow(),
}, (table) => ({
  clientIdx: index('idx_churn_scores_client').on(table.clientId),
  riskIdx: index('idx_churn_scores_risk').on(table.riskLevel),
}));

/**
 * AI recommendations - Next-best-action suggestions
 */
export const aiRecommendations = pgTable('ai_recommendations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  entityType: varchar('entity_type', { length: 50 }), // 'lead', 'client', 'task', 'compliance'
  entityId: integer('entity_id'),
  recommendationType: varchar('recommendation_type', { length: 50 }).notNull(), // 'follow_up', 'upsell', 'risk_mitigation'
  title: varchar('title', { length: 200 }).notNull(),
  recommendation: text('recommendation').notNull(),
  reasoning: text('reasoning'),
  confidence: decimal('confidence', { precision: 3, scale: 2 }), // 0.00-1.00
  priority: varchar('priority', { length: 20 }).default('medium'),
  actionUrl: text('action_url'),
  isDismissed: boolean('is_dismissed').default(false),
  dismissedAt: timestamp('dismissed_at'),
  dismissReason: varchar('dismiss_reason', { length: 100 }),
  isActedUpon: boolean('is_acted_upon').default(false),
  actedUponAt: timestamp('acted_upon_at'),
  outcome: varchar('outcome', { length: 50 }), // 'successful', 'unsuccessful', 'pending'
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_ai_recommendations_user').on(table.userId),
  entityIdx: index('idx_ai_recommendations_entity').on(table.entityType, table.entityId),
}));

/**
 * Document extractions - AI-powered data extraction
 */
export const documentExtractions = pgTable('document_extractions', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').references(() => documentsUploads.id).notNull(),
  extractionType: varchar('extraction_type', { length: 50 }), // 'pan', 'gst', 'invoice', 'bank_statement'
  extractedData: jsonb('extracted_data').notNull(),
  confidence: decimal('confidence', { precision: 3, scale: 2 }),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'verified', 'rejected'
  verifiedBy: integer('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  corrections: jsonb('corrections'), // Manual corrections made
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================================================
// EXPORT ALL TABLES
// ============================================================================

export const enterpriseTables = {
  // Multi-tenancy
  tenants,
  tenantInvitations,

  // Advanced RBAC
  permissionGroups,
  userPermissionOverrides,
  fieldSecurityRules,
  accessRestrictions,
  sessionPolicies,

  // Webhooks & Integrations
  webhookEndpoints,
  webhookDeliveries,
  apiKeys,
  apiUsageLogs,
  integrationTemplates,
  tenantIntegrations,

  // Analytics
  customReports,
  reportSchedules,
  customDashboards,
  kpiDefinitions,
  kpiValues,
  kpiAlerts,

  // Notifications
  notificationPreferences,
  notificationQueue,
  communicationThreads,
  threadMessages,

  // Documents
  documentTemplatesV2,
  documentGenerationJobs,
  documentAnnotations,
  documentShares,
  documentSearchIndex,
  documentRetentionPolicies,

  // Financial
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  exchangeRates,
  taxConfigurations,
  taxTransactions,
  bankAccounts,
  bankTransactions,

  // Customer Success
  customerHealthScoresV2,
  customerEngagementEvents,
  npsSurveys,
  successPlaybooks,
  playbookExecutions,
  renewalOpportunities,

  // Audit & Compliance
  immutableAuditLog,
  dataClassifications,
  accessReviews,
  accessReviewItems,
  securityIncidents,
  dataDeletionRequests,

  // Project Management
  projects,
  projectMilestones,
  projectTasks,
  timeEntries,
  resourceAllocations,
  kanbanBoards,

  // AI/ML
  mlModels,
  leadScores,
  clientChurnScores,
  aiRecommendations,
  documentExtractions,
};

// Count of new tables: 55
console.log('✅ Enterprise schema loaded (55 new tables for enterprise features)');
