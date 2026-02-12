# DigiComply Enterprise Roadmap
## World-Class Compliance Platform Strategy

**Version:** 1.0
**Date:** January 2026
**Goal:** Build the world's most robust compliance & task management platform

---

## Executive Summary

DigiComply is currently a **sophisticated platform with 120+ database tables, 200+ API endpoints, and 113 frontend pages**. To compete with Salesforce, Zoho, and Odoo, we need strategic upgrades across **15 critical areas**.

### Current Enterprise Readiness: 6.5/10
### Target Enterprise Readiness: 9.5/10

---

## Part 1: Critical Modules Requiring Upgrades

### 1. MULTI-TENANCY & WHITE-LABEL SYSTEM

**Current State:** Single-tenant architecture
**Enterprise Requirement:** Full multi-tenant SaaS with white-label support

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Tenant Isolation** | Row-level security (RLS) on all 120+ tables | CRITICAL |
| **Tenant Context** | Middleware to inject tenant_id in every query | CRITICAL |
| **Tenant Configuration** | Separate settings per tenant (SLA, workflows, branding) | HIGH |
| **Tenant Billing** | Per-tenant billing, usage tracking, quotas | HIGH |
| **White-Label** | Custom domains, logos, colors, email templates | MEDIUM |
| **Tenant Migration** | Data import/export per tenant | MEDIUM |
| **Tenant Admin** | Super-admin view across all tenants | HIGH |

#### Database Changes:
```sql
-- Add tenant_id to all tables
ALTER TABLE users ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE business_entities ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE service_requests ADD COLUMN tenant_id UUID NOT NULL;
-- ... repeat for all 120+ tables

-- Create tenant table
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255),
  branding JSONB,
  settings JSONB,
  billing_plan VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row-level security policies
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

#### New Endpoints:
```
POST   /api/tenants                    - Create tenant (super-admin)
GET    /api/tenants                    - List tenants
GET    /api/tenants/:id                - Get tenant details
PATCH  /api/tenants/:id                - Update tenant
DELETE /api/tenants/:id                - Delete tenant (soft)
POST   /api/tenants/:id/branding       - Update branding
GET    /api/tenants/:id/usage          - Usage statistics
POST   /api/tenants/:id/migrate        - Data migration
```

---

### 2. ADVANCED RBAC & ACCESS CONTROL

**Current State:** 9-tier role hierarchy with 100+ permissions
**Enterprise Requirement:** Field-level security, dynamic permissions, delegation

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Field-Level Security** | Control visibility of specific fields per role | HIGH |
| **Dynamic Permissions** | Context-based permissions (e.g., only own records) | HIGH |
| **Permission Groups** | Custom permission sets for complex organizations | MEDIUM |
| **Delegation Rules** | Manager can delegate specific permissions | MEDIUM |
| **Time-Based Access** | Temporary elevated permissions with expiry | MEDIUM |
| **IP/Geo Restrictions** | Access control by IP range or geography | HIGH |
| **Device Management** | Trusted devices, MFA enforcement | HIGH |
| **Session Policies** | Configurable session timeout, concurrent sessions | MEDIUM |

#### Database Changes:
```sql
-- Permission groups
CREATE TABLE permission_groups (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL, -- Array of permission codes
  created_at TIMESTAMP DEFAULT NOW()
);

-- User permission overrides
CREATE TABLE user_permission_overrides (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  permission_code VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL,
  expires_at TIMESTAMP,
  granted_by INTEGER REFERENCES users(id),
  reason TEXT
);

-- Field-level security rules
CREATE TABLE field_security_rules (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  role_level INTEGER NOT NULL,
  access_type VARCHAR(20) NOT NULL, -- 'read', 'write', 'hidden'
  conditions JSONB
);

-- Access restrictions
CREATE TABLE access_restrictions (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id INTEGER REFERENCES users(id),
  restriction_type VARCHAR(50) NOT NULL, -- 'ip', 'geo', 'time'
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true
);
```

---

### 3. AI & MACHINE LEARNING LAYER

**Current State:** Event-triggered notifications only
**Enterprise Requirement:** Predictive analytics, intelligent automation

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Lead Scoring** | ML-based conversion probability prediction | HIGH |
| **Churn Prediction** | Client health score with proactive alerts | HIGH |
| **Next-Best-Action** | Contextual recommendations for users | HIGH |
| **Document Intelligence** | OCR + AI extraction from documents | MEDIUM |
| **Anomaly Detection** | Unusual activity alerts (fraud, errors) | MEDIUM |
| **Compliance Prediction** | Predict deadline risks before they occur | HIGH |
| **Resource Optimization** | Workload balancing recommendations | MEDIUM |
| **Smart Search** | Natural language search across platform | MEDIUM |

#### New Tables:
```sql
-- ML model registry
CREATE TABLE ml_models (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'lead_scoring', 'churn', 'anomaly'
  version VARCHAR(20) NOT NULL,
  config JSONB,
  metrics JSONB, -- accuracy, precision, recall
  is_active BOOLEAN DEFAULT false,
  trained_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lead scores
CREATE TABLE lead_scores (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id),
  score DECIMAL(5,2) NOT NULL, -- 0-100
  factors JSONB, -- Explanation of score factors
  model_version VARCHAR(20),
  calculated_at TIMESTAMP DEFAULT NOW()
);

-- Churn risk scores
CREATE TABLE client_churn_scores (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES users(id),
  risk_score DECIMAL(5,2) NOT NULL, -- 0-100
  risk_factors JSONB,
  recommended_actions JSONB,
  model_version VARCHAR(20),
  calculated_at TIMESTAMP DEFAULT NOW()
);

-- AI recommendations
CREATE TABLE ai_recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  entity_type VARCHAR(50), -- 'lead', 'client', 'task'
  entity_id INTEGER,
  recommendation_type VARCHAR(50),
  recommendation TEXT NOT NULL,
  confidence DECIMAL(3,2),
  is_dismissed BOOLEAN DEFAULT false,
  acted_upon BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document intelligence
CREATE TABLE document_extractions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents_uploads(id),
  extraction_type VARCHAR(50), -- 'pan', 'gst', 'invoice'
  extracted_data JSONB,
  confidence DECIMAL(3,2),
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### New Endpoints:
```
GET    /api/ai/lead-score/:leadId           - Get lead score
POST   /api/ai/lead-score/batch             - Batch score leads
GET    /api/ai/churn-risk/:clientId         - Get churn risk
GET    /api/ai/recommendations              - Get user recommendations
POST   /api/ai/recommendations/:id/dismiss  - Dismiss recommendation
POST   /api/ai/recommendations/:id/act      - Mark as acted upon
POST   /api/ai/document/extract             - Extract data from document
GET    /api/ai/compliance-forecast          - Predict compliance risks
GET    /api/ai/workload-balance             - Resource optimization
```

---

### 4. ADVANCED WORKFLOW AUTOMATION

**Current State:** Basic sequential workflows
**Enterprise Requirement:** Visual workflow builder, parallel execution, conditions

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Visual Workflow Builder** | Drag-and-drop workflow designer | HIGH |
| **Parallel Execution** | Multiple branches executing simultaneously | HIGH |
| **Conditional Branching** | IF/ELSE/SWITCH logic in workflows | HIGH |
| **Loop Support** | FOR/WHILE loops for repetitive tasks | MEDIUM |
| **Sub-Workflows** | Reusable workflow components | MEDIUM |
| **Approval Chains** | Multi-level approval with escalation | HIGH |
| **Time-Based Triggers** | Scheduled workflow execution | HIGH |
| **External Triggers** | Webhook-triggered workflows | HIGH |
| **Workflow Versioning** | Version control for workflow definitions | MEDIUM |
| **Workflow Analytics** | Execution metrics, bottleneck analysis | MEDIUM |

#### Database Changes:
```sql
-- Enhanced workflow templates
CREATE TABLE workflow_templates_v2 (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL, -- 'manual', 'event', 'schedule', 'webhook'
  trigger_config JSONB,
  canvas_data JSONB, -- Visual builder data
  version INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

-- Workflow nodes (steps in workflow)
CREATE TABLE workflow_nodes (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES workflow_templates_v2(id),
  node_type VARCHAR(50) NOT NULL, -- 'action', 'condition', 'parallel', 'loop', 'subworkflow'
  node_config JSONB NOT NULL,
  position_x INTEGER,
  position_y INTEGER,
  next_nodes JSONB, -- Array of node IDs for simple flow
  condition_branches JSONB -- For conditional nodes: {condition: nodeId}
);

-- Workflow execution instances
CREATE TABLE workflow_executions_v2 (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES workflow_templates_v2(id),
  entity_type VARCHAR(50),
  entity_id INTEGER,
  status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed', 'paused'
  current_nodes JSONB, -- Array of currently active node IDs
  execution_data JSONB, -- Variables and context
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Node execution history
CREATE TABLE workflow_node_executions (
  id SERIAL PRIMARY KEY,
  execution_id INTEGER REFERENCES workflow_executions_v2(id),
  node_id INTEGER REFERENCES workflow_nodes(id),
  status VARCHAR(20) NOT NULL,
  input_data JSONB,
  output_data JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Approval chains
CREATE TABLE approval_chains (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  levels JSONB NOT NULL, -- Array of {level, approvers, conditions}
  timeout_hours INTEGER,
  escalation_config JSONB,
  is_active BOOLEAN DEFAULT true
);

-- Approval requests
CREATE TABLE approval_requests (
  id SERIAL PRIMARY KEY,
  chain_id INTEGER REFERENCES approval_chains(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  current_level INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending',
  requested_by INTEGER REFERENCES users(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Approval decisions
CREATE TABLE approval_decisions (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES approval_requests(id),
  level INTEGER NOT NULL,
  approver_id INTEGER REFERENCES users(id),
  decision VARCHAR(20) NOT NULL, -- 'approved', 'rejected', 'delegated'
  comments TEXT,
  decided_at TIMESTAMP DEFAULT NOW()
);
```

---

### 5. ADVANCED ANALYTICS & BUSINESS INTELLIGENCE

**Current State:** 20+ basic dashboards
**Enterprise Requirement:** Custom reports, pivot tables, data export, scheduled reports

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Custom Report Builder** | Drag-and-drop report creation | HIGH |
| **Pivot Tables** | Multi-dimensional data analysis | HIGH |
| **Chart Library** | 20+ chart types with customization | HIGH |
| **Dashboard Builder** | Custom dashboard creation per user | HIGH |
| **Scheduled Reports** | Email reports on schedule | MEDIUM |
| **Data Export** | Excel, CSV, PDF export with formatting | HIGH |
| **Report Sharing** | Share reports with specific users/roles | MEDIUM |
| **Drill-Down** | Click-through to detailed data | HIGH |
| **Real-Time Dashboards** | Live data refresh | MEDIUM |
| **KPI Alerts** | Threshold-based notifications | HIGH |

#### Database Changes:
```sql
-- Custom reports
CREATE TABLE custom_reports (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL, -- 'table', 'chart', 'pivot'
  data_source VARCHAR(100) NOT NULL, -- Table or view name
  columns JSONB NOT NULL, -- Selected columns with formatting
  filters JSONB, -- Filter conditions
  grouping JSONB, -- Group by configuration
  sorting JSONB, -- Sort configuration
  chart_config JSONB, -- Chart type and settings
  created_by INTEGER REFERENCES users(id),
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Report schedules
CREATE TABLE report_schedules (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES custom_reports(id),
  schedule_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  schedule_config JSONB NOT NULL, -- Day of week, time, etc.
  recipients JSONB NOT NULL, -- Array of user IDs or emails
  format VARCHAR(20) DEFAULT 'pdf', -- 'pdf', 'excel', 'csv'
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP
);

-- Custom dashboards
CREATE TABLE custom_dashboards (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  layout JSONB NOT NULL, -- Grid layout configuration
  widgets JSONB NOT NULL, -- Array of widget configurations
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- KPI definitions
CREATE TABLE kpi_definitions (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  calculation_query TEXT NOT NULL, -- SQL for KPI calculation
  unit VARCHAR(50), -- '%', 'count', 'currency'
  target_value DECIMAL(15,2),
  warning_threshold DECIMAL(15,2),
  critical_threshold DECIMAL(15,2),
  refresh_interval_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true
);

-- KPI values (time-series)
CREATE TABLE kpi_values (
  id SERIAL PRIMARY KEY,
  kpi_id INTEGER REFERENCES kpi_definitions(id),
  tenant_id UUID NOT NULL,
  value DECIMAL(15,2) NOT NULL,
  calculated_at TIMESTAMP DEFAULT NOW()
);

-- KPI alerts
CREATE TABLE kpi_alerts (
  id SERIAL PRIMARY KEY,
  kpi_id INTEGER REFERENCES kpi_definitions(id),
  tenant_id UUID NOT NULL,
  alert_type VARCHAR(20) NOT NULL, -- 'warning', 'critical'
  current_value DECIMAL(15,2) NOT NULL,
  threshold_value DECIMAL(15,2) NOT NULL,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 6. INTEGRATION ECOSYSTEM

**Current State:** 10-12 direct integrations
**Enterprise Requirement:** Webhook system, API marketplace, Zapier/Make connectors

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Outbound Webhooks** | Send events to external systems | CRITICAL |
| **Webhook Management** | CRUD for webhook endpoints | HIGH |
| **Webhook Retry** | Automatic retry with exponential backoff | HIGH |
| **Webhook Signing** | HMAC signature verification | HIGH |
| **API Keys** | Per-tenant API key management | HIGH |
| **Rate Limiting** | Per-key rate limits | HIGH |
| **Zapier Integration** | Official Zapier connector | MEDIUM |
| **Make Integration** | Official Make connector | MEDIUM |
| **Integration Templates** | Pre-built integrations | MEDIUM |
| **Integration Logs** | Detailed logging for debugging | HIGH |

#### Database Changes:
```sql
-- Webhook endpoints
CREATE TABLE webhook_endpoints (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255), -- For HMAC signing
  events JSONB NOT NULL, -- Array of event types to trigger
  headers JSONB, -- Custom headers to send
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Webhook deliveries
CREATE TABLE webhook_deliveries (
  id SERIAL PRIMARY KEY,
  endpoint_id INTEGER REFERENCES webhook_endpoints(id),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt_count INTEGER DEFAULT 1,
  next_retry_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP
);

-- API keys
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  key_hash VARCHAR(255) NOT NULL, -- Hashed API key
  key_prefix VARCHAR(10) NOT NULL, -- First 10 chars for identification
  permissions JSONB NOT NULL,
  rate_limit_per_minute INTEGER DEFAULT 60,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- API usage logs
CREATE TABLE api_usage_logs (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES api_keys(id),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_body JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Integration templates
CREATE TABLE integration_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  provider VARCHAR(100) NOT NULL, -- 'google_sheets', 'slack', 'quickbooks'
  description TEXT,
  config_schema JSONB NOT NULL, -- JSON schema for configuration
  default_config JSONB,
  documentation_url TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Tenant integrations
CREATE TABLE tenant_integrations (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  template_id INTEGER REFERENCES integration_templates(id),
  name VARCHAR(200) NOT NULL,
  config JSONB NOT NULL,
  credentials_encrypted TEXT, -- Encrypted credentials
  status VARCHAR(20) DEFAULT 'active',
  last_sync_at TIMESTAMP,
  sync_frequency_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 7. DOCUMENT MANAGEMENT SYSTEM

**Current State:** Basic upload, versioning, e-signature
**Enterprise Requirement:** Full DMS with collaboration, templates, OCR

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Document Templates** | Template library with variable substitution | HIGH |
| **Document Generation** | Auto-generate documents from templates | HIGH |
| **Full-Text Search** | Search within document content | HIGH |
| **OCR Extraction** | Extract text from scanned documents | HIGH |
| **Document Collaboration** | Comments, annotations, co-editing | MEDIUM |
| **Version Comparison** | Visual diff between versions | MEDIUM |
| **Document Workflows** | Review, approval, publishing workflows | HIGH |
| **Retention Policies** | Auto-archive, auto-delete policies | MEDIUM |
| **Document Sharing** | Secure external sharing with expiry | HIGH |
| **Bulk Operations** | Batch upload, download, categorize | HIGH |

#### Database Changes:
```sql
-- Document templates
CREATE TABLE document_templates_v2 (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  template_type VARCHAR(50) NOT NULL, -- 'word', 'pdf', 'html'
  template_content TEXT NOT NULL,
  variables JSONB, -- Array of variable definitions
  preview_image TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document generation jobs
CREATE TABLE document_generation_jobs (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES document_templates_v2(id),
  entity_type VARCHAR(50),
  entity_id INTEGER,
  variables_data JSONB NOT NULL,
  generated_document_id INTEGER REFERENCES documents_uploads(id),
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Document annotations
CREATE TABLE document_annotations (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents_uploads(id),
  version_id INTEGER,
  user_id INTEGER REFERENCES users(id),
  annotation_type VARCHAR(50) NOT NULL, -- 'comment', 'highlight', 'stamp'
  content TEXT,
  position JSONB, -- Page, coordinates
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document sharing
CREATE TABLE document_shares (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents_uploads(id),
  share_type VARCHAR(20) NOT NULL, -- 'internal', 'external'
  shared_with_user_id INTEGER REFERENCES users(id),
  shared_with_email VARCHAR(255),
  access_level VARCHAR(20) NOT NULL, -- 'view', 'download', 'edit'
  share_token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP,
  password_hash VARCHAR(255),
  access_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document full-text search index
CREATE TABLE document_search_index (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents_uploads(id),
  content_text TEXT NOT NULL,
  content_vector TSVECTOR,
  extracted_entities JSONB, -- Named entities (dates, amounts, names)
  language VARCHAR(10) DEFAULT 'english',
  indexed_at TIMESTAMP DEFAULT NOW()
);

-- Retention policies
CREATE TABLE document_retention_policies (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  document_category VARCHAR(100),
  retention_days INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'archive', 'delete', 'notify'
  is_active BOOLEAN DEFAULT true
);
```

---

### 8. FINANCIAL MANAGEMENT

**Current State:** Basic invoicing, Stripe integration
**Enterprise Requirement:** Full accounting, multi-currency, tax automation

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Chart of Accounts** | Configurable account structure | HIGH |
| **Journal Entries** | Double-entry bookkeeping | HIGH |
| **Multi-Currency** | Currency conversion, exchange rates | HIGH |
| **Tax Automation** | GST calculation, TDS deduction | HIGH |
| **Bank Reconciliation** | Match transactions with bank | MEDIUM |
| **Expense Management** | Expense claims, approval workflow | MEDIUM |
| **Financial Reports** | P&L, Balance Sheet, Cash Flow | HIGH |
| **Budgeting** | Budget creation, variance tracking | MEDIUM |
| **Revenue Recognition** | Deferred revenue, accruals | MEDIUM |
| **Tally Integration** | Two-way sync with Tally | HIGH |

#### Database Changes:
```sql
-- Chart of accounts
CREATE TABLE chart_of_accounts (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
  parent_account_id INTEGER REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, account_code)
);

-- Journal entries
CREATE TABLE journal_entries (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entry_number VARCHAR(50) NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  reference_type VARCHAR(50), -- 'invoice', 'payment', 'expense'
  reference_id INTEGER,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'posted', 'reversed'
  created_by INTEGER REFERENCES users(id),
  posted_by INTEGER REFERENCES users(id),
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Journal entry lines
CREATE TABLE journal_entry_lines (
  id SERIAL PRIMARY KEY,
  journal_entry_id INTEGER REFERENCES journal_entries(id),
  account_id INTEGER REFERENCES chart_of_accounts(id),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'INR',
  exchange_rate DECIMAL(10,6) DEFAULT 1,
  base_debit_amount DECIMAL(15,2) DEFAULT 0,
  base_credit_amount DECIMAL(15,2) DEFAULT 0,
  narration TEXT
);

-- Currency exchange rates
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  effective_date DATE NOT NULL,
  source VARCHAR(50), -- 'rbi', 'manual', 'api'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tax configurations
CREATE TABLE tax_configurations (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  tax_type VARCHAR(50) NOT NULL, -- 'gst', 'tds', 'tcs'
  tax_code VARCHAR(20) NOT NULL,
  tax_name VARCHAR(100) NOT NULL,
  rate DECIMAL(5,2) NOT NULL,
  account_id INTEGER REFERENCES chart_of_accounts(id),
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true
);

-- Tax transactions
CREATE TABLE tax_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'gst_output', 'gst_input', 'tds_deducted'
  tax_config_id INTEGER REFERENCES tax_configurations(id),
  base_amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) NOT NULL,
  reference_type VARCHAR(50),
  reference_id INTEGER,
  period_month INTEGER,
  period_year INTEGER,
  filing_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bank accounts
CREATE TABLE bank_accounts (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_number VARCHAR(50),
  bank_name VARCHAR(200),
  ifsc_code VARCHAR(20),
  account_id INTEGER REFERENCES chart_of_accounts(id),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  last_reconciled_date DATE,
  is_active BOOLEAN DEFAULT true
);

-- Bank transactions (for reconciliation)
CREATE TABLE bank_transactions (
  id SERIAL PRIMARY KEY,
  bank_account_id INTEGER REFERENCES bank_accounts(id),
  transaction_date DATE NOT NULL,
  description TEXT,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  balance DECIMAL(15,2),
  reference_number VARCHAR(100),
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_with_id INTEGER, -- ID of matching payment/receipt
  imported_at TIMESTAMP DEFAULT NOW()
);
```

---

### 9. NOTIFICATION & COMMUNICATION HUB

**Current State:** Email, SMS, WhatsApp notifications
**Enterprise Requirement:** Unified inbox, templates, preferences, channels

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Unified Inbox** | All communications in one place | HIGH |
| **Channel Preferences** | User-selectable notification channels | HIGH |
| **Smart Batching** | Batch similar notifications | MEDIUM |
| **Notification Center** | In-app notification history | HIGH |
| **Push Notifications** | Mobile push (when apps ready) | MEDIUM |
| **Do Not Disturb** | Quiet hours configuration | MEDIUM |
| **Template Builder** | Visual email template editor | MEDIUM |
| **Delivery Tracking** | Open rates, click tracking | MEDIUM |
| **Escalation Rules** | Notify manager if unread | HIGH |

#### Database Changes:
```sql
-- Notification preferences
CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  notification_type VARCHAR(100) NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  frequency VARCHAR(20) DEFAULT 'immediate', -- 'immediate', 'hourly', 'daily'
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  UNIQUE(user_id, notification_type)
);

-- Notification queue with tracking
CREATE TABLE notification_queue (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id INTEGER REFERENCES users(id),
  notification_type VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'whatsapp', 'push', 'in_app'
  subject TEXT,
  content TEXT NOT NULL,
  template_id INTEGER,
  template_data JSONB,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'pending',
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Communication threads
CREATE TABLE communication_threads (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  subject VARCHAR(500),
  participant_ids JSONB NOT NULL, -- Array of user IDs
  last_message_at TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Thread messages
CREATE TABLE thread_messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER REFERENCES communication_threads(id),
  sender_id INTEGER REFERENCES users(id),
  message_type VARCHAR(20) NOT NULL, -- 'text', 'attachment', 'system'
  content TEXT,
  attachments JSONB,
  read_by JSONB, -- Array of {userId, readAt}
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 10. MOBILE APPLICATIONS

**Current State:** Web-responsive only
**Enterprise Requirement:** Native iOS and Android apps

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **iOS App** | Native Swift/SwiftUI app | HIGH |
| **Android App** | Native Kotlin app | HIGH |
| **Offline Support** | Work offline, sync when connected | HIGH |
| **Push Notifications** | Native push integration | HIGH |
| **Biometric Auth** | Face ID, fingerprint login | HIGH |
| **Camera Integration** | Document scanning, photo upload | HIGH |
| **Location Services** | Attendance, field visits | MEDIUM |
| **Deep Linking** | Open specific screens from notifications | MEDIUM |

#### Recommended Architecture:
- **React Native** for cross-platform development
- **Redux** for state management
- **AsyncStorage** for offline data
- **Firebase** for push notifications
- **CodePush** for OTA updates

---

### 11. COMPLIANCE ENGINE ENHANCEMENTS

**Current State:** GREEN/AMBER/RED calculation with 50+ rules
**Enterprise Requirement:** Dynamic rules, jurisdiction support, penalty calculation

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Rule Engine UI** | Admin-configurable rules | HIGH |
| **Jurisdiction Support** | State-specific rules (GST, PT) | HIGH |
| **Entity Type Rules** | Rules vary by company type | HIGH |
| **Penalty Calculator** | Accurate penalty computation | HIGH |
| **What-If Analysis** | Simulate compliance scenarios | MEDIUM |
| **Compliance Score** | Comprehensive scoring model | HIGH |
| **Risk Assessment** | Identify high-risk areas | HIGH |
| **Auto-Remediation** | Suggest corrective actions | MEDIUM |

#### Database Changes:
```sql
-- Enhanced compliance rules
CREATE TABLE compliance_rules_v2 (
  id SERIAL PRIMARY KEY,
  tenant_id UUID,
  rule_code VARCHAR(50) NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  frequency VARCHAR(50) NOT NULL, -- 'monthly', 'quarterly', 'annual', 'event'
  due_day_type VARCHAR(20) NOT NULL, -- 'fixed', 'relative', 'conditional'
  due_day_config JSONB NOT NULL,
  grace_period_days INTEGER DEFAULT 0,
  penalty_config JSONB, -- {base, perDay, max, interest}
  entity_types JSONB, -- Array of applicable entity types
  jurisdictions JSONB, -- Array of applicable jurisdictions
  turnover_thresholds JSONB, -- Min/max turnover for applicability
  conditions JSONB, -- Additional conditions (GST registered, etc.)
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Compliance scoring model
CREATE TABLE compliance_score_models (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  categories JSONB NOT NULL, -- Array of {category, weight}
  thresholds JSONB NOT NULL, -- {green: 80, amber: 60}
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Compliance risk assessments
CREATE TABLE compliance_risk_assessments (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER REFERENCES business_entities(id),
  assessment_date DATE NOT NULL,
  overall_risk_level VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  risk_factors JSONB NOT NULL,
  recommended_actions JSONB,
  next_review_date DATE,
  assessed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Compliance what-if scenarios
CREATE TABLE compliance_scenarios (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entity_id INTEGER REFERENCES business_entities(id),
  scenario_name VARCHAR(200) NOT NULL,
  scenario_type VARCHAR(50) NOT NULL, -- 'delay', 'skip', 'change'
  parameters JSONB NOT NULL,
  impact_analysis JSONB, -- Calculated impact
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 12. TASK & PROJECT MANAGEMENT

**Current State:** Basic task management with SLA
**Enterprise Requirement:** Full project management, resource planning, Gantt charts

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Project Hierarchy** | Projects → Milestones → Tasks → Subtasks | HIGH |
| **Gantt Charts** | Visual timeline with dependencies | HIGH |
| **Resource Planning** | Team capacity, allocation | HIGH |
| **Time Tracking** | Actual vs estimated time | HIGH |
| **Project Templates** | Reusable project structures | MEDIUM |
| **Kanban Boards** | Visual task management | HIGH |
| **Sprint Planning** | Agile methodology support | MEDIUM |
| **Burndown Charts** | Progress visualization | MEDIUM |
| **Critical Path** | Identify bottlenecks | MEDIUM |

#### Database Changes:
```sql
-- Projects
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  project_id VARCHAR(50) NOT NULL, -- Readable ID
  name VARCHAR(200) NOT NULL,
  description TEXT,
  client_id INTEGER REFERENCES users(id),
  entity_id INTEGER REFERENCES business_entities(id),
  project_manager_id INTEGER REFERENCES users(id),
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  budget_hours DECIMAL(10,2),
  budget_amount DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'planning',
  priority VARCHAR(20) DEFAULT 'medium',
  template_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project milestones
CREATE TABLE project_milestones (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  target_date DATE,
  completed_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  sequence_order INTEGER
);

-- Project tasks (enhanced)
CREATE TABLE project_tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  milestone_id INTEGER REFERENCES project_milestones(id),
  parent_task_id INTEGER REFERENCES project_tasks(id),
  task_id VARCHAR(50) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  assignee_id INTEGER REFERENCES users(id),
  start_date DATE,
  due_date DATE,
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'medium',
  labels JSONB,
  dependencies JSONB, -- Array of task IDs
  created_at TIMESTAMP DEFAULT NOW()
);

-- Time entries
CREATE TABLE time_entries (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES project_tasks(id),
  user_id INTEGER REFERENCES users(id),
  date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  description TEXT,
  billable BOOLEAN DEFAULT true,
  approved BOOLEAN DEFAULT false,
  approved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Resource allocations
CREATE TABLE resource_allocations (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  user_id INTEGER REFERENCES users(id),
  allocation_percentage DECIMAL(5,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  role VARCHAR(100),
  notes TEXT
);

-- Kanban boards
CREATE TABLE kanban_boards (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'project', 'team', 'personal'
  entity_id INTEGER,
  columns JSONB NOT NULL, -- Array of {id, name, color, limit}
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 13. CUSTOMER SUCCESS & RELATIONSHIP MANAGEMENT

**Current State:** Basic client health scores
**Enterprise Requirement:** Full customer success platform

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Health Score Dashboard** | Real-time client health | HIGH |
| **Engagement Tracking** | Login frequency, feature usage | HIGH |
| **NPS Surveys** | Net Promoter Score collection | MEDIUM |
| **Success Playbooks** | Guided success journeys | MEDIUM |
| **Renewal Management** | Contract renewal tracking | HIGH |
| **Expansion Opportunities** | Upsell/cross-sell identification | HIGH |
| **Customer Journey Map** | Lifecycle stage tracking | MEDIUM |
| **Risk Alerts** | Churn risk notifications | HIGH |

#### Database Changes:
```sql
-- Customer health scores (enhanced)
CREATE TABLE customer_health_scores_v2 (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES users(id),
  entity_id INTEGER REFERENCES business_entities(id),
  overall_score DECIMAL(5,2) NOT NULL,
  engagement_score DECIMAL(5,2),
  compliance_score DECIMAL(5,2),
  payment_score DECIMAL(5,2),
  support_score DECIMAL(5,2),
  trend VARCHAR(20), -- 'improving', 'stable', 'declining'
  risk_level VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  factors JSONB,
  calculated_at TIMESTAMP DEFAULT NOW()
);

-- Customer engagement events
CREATE TABLE customer_engagement_events (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL, -- 'login', 'feature_used', 'document_uploaded'
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- NPS surveys
CREATE TABLE nps_surveys (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  client_id INTEGER REFERENCES users(id),
  score INTEGER NOT NULL, -- 0-10
  category VARCHAR(20), -- 'promoter', 'passive', 'detractor'
  feedback TEXT,
  touchpoint VARCHAR(100), -- 'service_completed', 'support_ticket', 'quarterly'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Success playbooks
CREATE TABLE success_playbooks (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  trigger_condition JSONB NOT NULL, -- Conditions to trigger playbook
  stages JSONB NOT NULL, -- Array of {name, tasks, duration}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Playbook executions
CREATE TABLE playbook_executions (
  id SERIAL PRIMARY KEY,
  playbook_id INTEGER REFERENCES success_playbooks(id),
  client_id INTEGER REFERENCES users(id),
  current_stage INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Renewal tracking
CREATE TABLE renewal_opportunities (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  client_id INTEGER REFERENCES users(id),
  contract_id INTEGER,
  renewal_date DATE NOT NULL,
  contract_value DECIMAL(15,2),
  status VARCHAR(20) DEFAULT 'upcoming', -- 'upcoming', 'in_progress', 'renewed', 'churned'
  owner_id INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 14. AUDIT & COMPLIANCE (SOC 2, ISO 27001)

**Current State:** Basic audit logging
**Enterprise Requirement:** Full compliance with security certifications

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Immutable Audit Log** | Tamper-proof logging | CRITICAL |
| **Data Classification** | PII, sensitive data tagging | HIGH |
| **Access Reviews** | Periodic access certification | HIGH |
| **Encryption at Rest** | Database encryption | HIGH |
| **Key Management** | Secure key rotation | HIGH |
| **Penetration Testing** | Regular security testing | HIGH |
| **Compliance Reports** | SOC 2, ISO 27001 reports | HIGH |
| **Data Retention** | Policy enforcement | HIGH |
| **GDPR Compliance** | Right to be forgotten | MEDIUM |
| **Incident Response** | Security incident tracking | HIGH |

#### Database Changes:
```sql
-- Immutable audit log (append-only)
CREATE TABLE immutable_audit_log (
  id BIGSERIAL PRIMARY KEY,
  log_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
  previous_hash VARCHAR(64), -- Previous log entry hash (blockchain-like)
  tenant_id UUID NOT NULL,
  user_id INTEGER,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Data classification
CREATE TABLE data_classifications (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(100) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  classification VARCHAR(50) NOT NULL, -- 'public', 'internal', 'confidential', 'pii', 'sensitive'
  handling_requirements TEXT,
  retention_days INTEGER,
  encryption_required BOOLEAN DEFAULT false
);

-- Access reviews
CREATE TABLE access_reviews (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  reviewer_id INTEGER REFERENCES users(id),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Access review items
CREATE TABLE access_review_items (
  id SERIAL PRIMARY KEY,
  review_id INTEGER REFERENCES access_reviews(id),
  user_id INTEGER REFERENCES users(id),
  current_role VARCHAR(50),
  current_permissions JSONB,
  decision VARCHAR(20), -- 'approve', 'revoke', 'modify'
  new_permissions JSONB,
  reviewed_at TIMESTAMP,
  comments TEXT
);

-- Security incidents
CREATE TABLE security_incidents (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  incident_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  description TEXT NOT NULL,
  affected_users JSONB,
  affected_data JSONB,
  detection_method VARCHAR(100),
  status VARCHAR(20) DEFAULT 'open',
  assigned_to INTEGER REFERENCES users(id),
  resolution TEXT,
  detected_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Data deletion requests (GDPR)
CREATE TABLE data_deletion_requests (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  requested_by INTEGER REFERENCES users(id),
  subject_email VARCHAR(255) NOT NULL,
  request_type VARCHAR(50) NOT NULL, -- 'erasure', 'portability', 'rectification'
  status VARCHAR(20) DEFAULT 'pending',
  verification_token VARCHAR(255),
  verified_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 15. PERFORMANCE & SCALABILITY

**Current State:** Single-server deployment
**Enterprise Requirement:** Horizontally scalable, globally distributed

#### What's Needed:

| Component | Description | Priority |
|-----------|-------------|----------|
| **Database Replication** | Read replicas for scaling | HIGH |
| **Connection Pooling** | PgBouncer or similar | HIGH |
| **Caching Layer** | Redis for session, query cache | HIGH |
| **CDN Integration** | Static asset delivery | MEDIUM |
| **Queue System** | Background job processing | HIGH |
| **Auto-Scaling** | Kubernetes/ECS auto-scaling | MEDIUM |
| **Global Distribution** | Multi-region deployment | LOW |
| **Performance Monitoring** | APM integration | HIGH |

---

## Part 2: User Roles & Access Matrix (Nth Level Detail)

### Complete Role Hierarchy

```
SUPER_ADMIN (Level 100)
├── Platform Configuration
├── Tenant Management (Multi-tenant)
├── System Health Monitoring
├── Global Audit Access
├── Billing & Subscription Management
│
├── ADMIN (Level 90)
│   ├── User Management (CRUD all users)
│   ├── Service Configuration
│   ├── Workflow Management
│   ├── System Settings
│   ├── Analytics Access (All)
│   ├── Compliance Configuration
│   │
│   ├── OPS_MANAGER (Level 80)
│   │   ├── Team Management
│   │   ├── Work Assignment
│   │   ├── Performance Monitoring
│   │   ├── Escalation Handling
│   │   ├── SLA Management
│   │   ├── Quality Oversight
│   │   │
│   │   ├── OPS_EXECUTIVE (Level 70)
│   │   │   ├── Task Execution
│   │   │   ├── Document Processing
│   │   │   ├── Client Communication
│   │   │   ├── Status Updates
│   │   │   ├── Delivery Preparation
│   │   │   └── Own Task Analytics
│   │   │
│   │   ├── CUSTOMER_SERVICE (Level 60)
│   │   │   ├── Ticket Management
│   │   │   ├── Client Support
│   │   │   ├── FAQ Management
│   │   │   ├── Response Templates
│   │   │   └── Satisfaction Tracking
│   │   │
│   │   ├── QC_EXECUTIVE (Level 55)
│   │   │   ├── Quality Reviews
│   │   │   ├── Document Verification
│   │   │   ├── Delivery Approval
│   │   │   ├── Rejection Handling
│   │   │   └── Quality Metrics
│   │   │
│   │   └── ACCOUNTANT (Level 50)
│   │       ├── Invoice Management
│   │       ├── Payment Processing
│   │       ├── Financial Reports
│   │       ├── Expense Tracking
│   │       └── Tax Compliance
│   │
│   └── AGENT (Level 40)
│       ├── Lead Generation
│       ├── Client Onboarding
│       ├── Commission Tracking
│       ├── Performance Dashboard
│       ├── Referral Management
│       └── Own Client Portfolio
│
└── CLIENT (Level 10)
    ├── Dashboard Access
    ├── Service Request Creation
    ├── Document Upload
    ├── Compliance View
    ├── Payment Processing
    ├── Support Tickets
    └── Profile Management
```

### Detailed Permission Matrix

| Permission | Super Admin | Admin | Ops Mgr | Ops Exec | CS | QC | Acct | Agent | Client |
|------------|:-----------:|:-----:|:-------:|:--------:|:--:|:--:|:----:|:-----:|:------:|
| **USER MANAGEMENT** |
| Create Admin Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create Staff Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage User Roles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reset Passwords | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View All Users | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SERVICE MANAGEMENT** |
| Configure Services | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Set Pricing | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Workflows | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Service Catalog | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **OPERATIONS** |
| Assign Tasks | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Execute Tasks | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve Delivery | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Escalate Issues | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Work Queue | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **COMPLIANCE** |
| Configure Rules | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View All Compliance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Own Compliance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mark Complete | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **FINANCIAL** |
| Create Invoices | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Process Payments | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| View All Financials | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Make Payments | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Own Invoices | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **ANALYTICS** |
| View System Metrics | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Team Metrics | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Own Metrics | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export Reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **AUDIT** |
| View All Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Team Audit | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Part 3: Implementation Roadmap

### Phase 1: Foundation (Months 1-3)
**Investment:** Core platform stability

| Week | Deliverable | Effort |
|------|-------------|--------|
| 1-2 | Testing suite (70% coverage) | 2 devs |
| 3-4 | Monitoring & alerting (Datadog) | 1 dev |
| 5-6 | Disaster recovery setup | 1 dev |
| 7-8 | API documentation (OpenAPI) | 1 dev |
| 9-10 | Performance optimization | 2 devs |
| 11-12 | Security hardening | 1 dev |

### Phase 2: Multi-Tenancy (Months 4-6)
**Investment:** SaaS scaling capability

| Week | Deliverable | Effort |
|------|-------------|--------|
| 1-4 | Database multi-tenancy (RLS) | 2 devs |
| 5-6 | Tenant management APIs | 1 dev |
| 7-8 | White-label support | 1 dev |
| 9-10 | Tenant billing | 1 dev |
| 11-12 | Testing & migration | 2 devs |

### Phase 3: AI & Analytics (Months 7-9)
**Investment:** Competitive differentiation

| Week | Deliverable | Effort |
|------|-------------|--------|
| 1-3 | Lead scoring ML model | 1 ML eng |
| 4-5 | Churn prediction | 1 ML eng |
| 6-8 | Custom report builder | 2 devs |
| 9-10 | Dashboard builder | 1 dev |
| 11-12 | Next-best-action | 1 ML eng |

### Phase 4: Integration Ecosystem (Months 10-12)
**Investment:** Network effects

| Week | Deliverable | Effort |
|------|-------------|--------|
| 1-2 | Webhook system | 1 dev |
| 3-4 | API key management | 1 dev |
| 5-6 | Zapier connector | 1 dev |
| 7-8 | Integration templates | 1 dev |
| 9-12 | Partner marketplace | 2 devs |

### Phase 5: Mobile & Global (Months 13-18)
**Investment:** Market expansion

| Week | Deliverable | Effort |
|------|-------------|--------|
| 1-8 | React Native apps | 2 devs |
| 9-12 | Multi-currency support | 1 dev |
| 13-16 | Internationalization | 1 dev |
| 17-20 | Multi-region deployment | 1 DevOps |
| 21-24 | Compliance certifications | 1 analyst |

---

## Part 4: Success Metrics

### Technical KPIs
- **Uptime:** 99.9% availability
- **Response Time:** < 200ms P95
- **Test Coverage:** > 80%
- **Security Score:** A+ (SSL Labs)
- **Accessibility:** WCAG 2.1 AA

### Business KPIs
- **User Satisfaction:** NPS > 50
- **Churn Rate:** < 5% annually
- **Feature Adoption:** > 60% of core features used
- **Support Tickets:** < 0.5 per user/month
- **Time to Value:** < 2 weeks to first service

### Enterprise Readiness
- **SOC 2 Type II:** Certified
- **ISO 27001:** Certified
- **GDPR:** Compliant
- **Multi-Tenancy:** Full isolation
- **API Coverage:** 100% of features

---

## Conclusion

To compete with Salesforce, Zoho, and Odoo, DigiComply needs strategic investments across 15 critical areas. The platform already has a strong foundation with 120+ tables, 200+ APIs, and comprehensive compliance features.

**Priority Focus Areas:**
1. Multi-tenancy (SaaS scaling)
2. AI/ML layer (competitive advantage)
3. Advanced analytics (enterprise sales)
4. Integration ecosystem (stickiness)
5. Mobile apps (user adoption)

**Timeline:** 18 months to enterprise-ready
**Investment:** 8-10 developers, 1-2 ML engineers, 1 DevOps

The compliance domain specificity is a significant advantage - no competitor has the depth of Indian regulatory compliance knowledge that DigiComply has built.
