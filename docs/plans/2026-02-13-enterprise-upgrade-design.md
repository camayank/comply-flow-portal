# DigiComply Enterprise Platform Upgrade Design

**Date:** 2026-02-13
**Status:** Approved
**Approach:** Compliance-Native Domain-Driven Design

## Executive Summary

This design document outlines the transformation of DigiComply from a compliance management application to an enterprise-grade, AI-native compliance platform that exceeds Salesforce capabilities in the regulatory compliance domain.

### Goals
1. **No-Code Configuration** - Business users can configure services without developer intervention
2. **AI-Native Intelligence** - Domain-specific AI built into every workflow
3. **Compliance-First Design** - Regulatory requirements drive the architecture
4. **Multi-Tenant SaaS** - White-label support for CA firms and enterprises

### Target Users
- Both technical administrators and business users (CA practitioners, compliance managers)

---

## Architecture Overview

The upgrade consists of 7 interconnected pillars:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DigiComply Platform                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │   Service   │  │ Compliance  │  │Jurisdiction │  │     AI      ││
│  │ Blueprints  │  │  Calendar   │  │   Rules     │  │Intelligence ││
│  │   Engine    │  │   Engine    │  │   Engine    │  │   Layer     ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘│
│         │                │                │                │        │
│  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐ │
│  │                    Unified Data Layer                          │ │
│  └──────┬────────────────┬────────────────┬────────────────┬──────┘ │
│         │                │                │                │        │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐                 │
│  │  Document   │  │ Multi-Tenant│  │  No-Code    │                 │
│  │Intelligence │  │   Config    │  │  Builder    │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Pillar 1: Service Blueprints Engine

### Problem
Current service configuration is fragmented across multiple tables without a unified definition model.

### Solution
A single "Service Blueprint" that defines everything about a service: workflow, pricing, documents, SLA, and compliance rules.

### Schema Design

```sql
-- Master service definition (replaces fragmented service tables)
CREATE TABLE service_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),

  -- Identity
  code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'GST_RETURN_3B'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),  -- 'TAX', 'COMPLIANCE', 'REGISTRATION'

  -- Compliance Metadata
  governing_act VARCHAR(255),  -- 'CGST Act 2017'
  section_reference VARCHAR(100),  -- 'Section 39(1)'
  form_number VARCHAR(50),  -- 'GSTR-3B'

  -- Configuration
  workflow_definition JSONB NOT NULL,  -- Full workflow with steps, transitions
  document_requirements JSONB,  -- Required documents with validation rules
  sla_rules JSONB,  -- SLA configuration
  compliance_rules JSONB,  -- Auto-calculated deadlines, penalties

  -- Pricing (can be overridden per tenant)
  base_pricing JSONB,  -- { "standard": 999, "urgent": 1499 }

  -- AI Configuration
  ai_extraction_template_id UUID,  -- Document extraction template
  ai_risk_model_id UUID,  -- Risk assessment model

  -- Versioning
  version INTEGER DEFAULT 1,
  effective_from DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pricing tiers (tiered pricing based on criteria)
CREATE TABLE blueprint_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID REFERENCES service_blueprints(id) ON DELETE CASCADE,
  tier_name VARCHAR(100) NOT NULL,  -- 'Basic', 'Standard', 'Premium'
  criteria JSONB,  -- { "turnover_min": 0, "turnover_max": 10000000 }
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  features JSONB,  -- What's included in this tier
  sort_order INTEGER DEFAULT 0
);

-- Workflow steps definition
CREATE TABLE blueprint_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID REFERENCES service_blueprints(id) ON DELETE CASCADE,
  step_code VARCHAR(50) NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  step_type VARCHAR(50),  -- 'TASK', 'APPROVAL', 'DOCUMENT_COLLECTION', 'GOVERNMENT_FILING'

  -- Assignment
  default_assignee_role VARCHAR(100),  -- 'ACCOUNTANT', 'SENIOR_CA', 'CLIENT'

  -- Automation
  auto_actions JSONB,  -- Actions to trigger automatically
  required_documents TEXT[],  -- Document codes required at this step

  -- SLA
  sla_hours INTEGER,
  escalation_after_hours INTEGER,

  -- Transitions
  allowed_next_steps TEXT[],  -- Array of step_codes
  completion_criteria JSONB,  -- What needs to happen to complete this step

  sort_order INTEGER DEFAULT 0
);

-- Document type requirements
CREATE TABLE blueprint_document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID REFERENCES service_blueprints(id) ON DELETE CASCADE,
  document_code VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  is_mandatory BOOLEAN DEFAULT false,

  -- Validation
  accepted_formats TEXT[] DEFAULT ARRAY['pdf', 'jpg', 'png'],
  max_size_mb INTEGER DEFAULT 10,
  validation_rules JSONB,  -- OCR validation, PAN format check, etc.

  -- AI Extraction
  extraction_fields JSONB,  -- Fields to extract via AI/OCR

  -- Workflow
  required_at_step VARCHAR(50),  -- Which step needs this document

  sort_order INTEGER DEFAULT 0
);

-- Compliance rules (deadline calculation, penalties)
CREATE TABLE blueprint_compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID REFERENCES service_blueprints(id) ON DELETE CASCADE,
  rule_code VARCHAR(50) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50),  -- 'DEADLINE', 'PENALTY', 'NOTIFICATION'

  -- Deadline Formula
  deadline_formula VARCHAR(500),  -- 'MONTH_END + 20 DAYS' or 'QUARTER_END + 22 DAYS'
  base_date_type VARCHAR(50),  -- 'PERIOD_END', 'TRANSACTION_DATE', 'REGISTRATION_DATE'

  -- Penalty Calculation
  penalty_type VARCHAR(50),  -- 'FIXED', 'PERCENTAGE', 'DAILY_INTEREST'
  penalty_formula VARCHAR(500),  -- '25 PER DAY MAX 5000' or '18% PA'

  -- Conditions
  applies_when JSONB,  -- { "turnover_above": 5000000 }

  is_active BOOLEAN DEFAULT true
);

-- Index for performance
CREATE INDEX idx_blueprints_tenant ON service_blueprints(tenant_id);
CREATE INDEX idx_blueprints_category ON service_blueprints(category);
CREATE INDEX idx_blueprints_code ON service_blueprints(code);
```

### Key Differentiators from Salesforce
- **Compliance-aware workflows** - Steps understand regulatory requirements
- **Built-in deadline formulas** - Indian regulatory calendar built-in
- **Document validation rules** - PAN, GSTIN format validation native
- **Versioning** - Track regulatory changes over time

---

## Pillar 2: Compliance Calendar Engine

### Problem
Deadline calculations are hard-coded and don't account for holidays, jurisdiction variations, or penalty rules.

### Solution
A formula-based deadline engine that automatically calculates all compliance deadlines with penalty tracking.

### Schema Design

```sql
-- Compliance calendar entries (auto-generated)
CREATE TABLE compliance_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  client_id UUID REFERENCES clients(id),

  -- What
  blueprint_id UUID REFERENCES service_blueprints(id),
  compliance_rule_id UUID REFERENCES blueprint_compliance_rules(id),

  -- When
  period_type VARCHAR(20),  -- 'MONTHLY', 'QUARTERLY', 'ANNUAL'
  period_start DATE,
  period_end DATE,
  original_due_date DATE NOT NULL,
  adjusted_due_date DATE,  -- After holiday adjustments

  -- Status
  status VARCHAR(50) DEFAULT 'UPCOMING',  -- 'UPCOMING', 'DUE_SOON', 'OVERDUE', 'COMPLETED', 'EXEMPTED'
  filed_date DATE,

  -- Penalty Tracking
  days_overdue INTEGER DEFAULT 0,
  penalty_amount DECIMAL(12,2) DEFAULT 0,
  penalty_paid BOOLEAN DEFAULT false,

  -- Linked Task
  task_id UUID REFERENCES tasks(id),

  -- Metadata
  auto_generated BOOLEAN DEFAULT true,
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Deadline formulas (reusable)
CREATE TABLE deadline_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Formula Definition
  base_date VARCHAR(50) NOT NULL,  -- 'PERIOD_END', 'QUARTER_END', 'FINANCIAL_YEAR_END'
  offset_days INTEGER DEFAULT 0,
  offset_months INTEGER DEFAULT 0,
  adjustment_rule VARCHAR(50),  -- 'NEXT_WORKING_DAY', 'PREVIOUS_WORKING_DAY'

  -- Applicability
  applicable_periods TEXT[],  -- ['MONTHLY', 'QUARTERLY']

  -- Examples for clarity
  example_calculation TEXT,  -- 'For March 2024: Period End (31-Mar) + 20 days = 20-Apr'

  is_active BOOLEAN DEFAULT true
);

-- Penalty calculation rules
CREATE TABLE penalty_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID REFERENCES service_blueprints(id),
  name VARCHAR(255) NOT NULL,

  -- Penalty Type
  penalty_type VARCHAR(50) NOT NULL,  -- 'FLAT', 'DAILY', 'INTEREST', 'SLAB'

  -- Calculation
  flat_amount DECIMAL(10,2),  -- For flat penalties
  daily_amount DECIMAL(10,2),  -- For daily penalties
  interest_rate DECIMAL(5,2),  -- For interest-based (annual %)

  -- Slabs (for slab-based penalties)
  slabs JSONB,  -- [{ "days_from": 1, "days_to": 15, "amount": 25 }, ...]

  -- Caps
  max_penalty DECIMAL(12,2),
  max_days INTEGER,

  -- Conditions
  minimum_tax_liability DECIMAL(12,2),  -- Only apply if tax > X

  effective_from DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true
);

-- Holiday calendars
CREATE TABLE holiday_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  year INTEGER NOT NULL,

  -- Holidays
  holidays JSONB NOT NULL,  -- [{ "date": "2024-01-26", "name": "Republic Day", "type": "NATIONAL" }]

  -- Working day rules
  saturday_working BOOLEAN DEFAULT false,  -- Some banks work alternate Saturdays

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calendar_tenant_status ON compliance_calendar(tenant_id, status);
CREATE INDEX idx_calendar_due_date ON compliance_calendar(adjusted_due_date);
CREATE INDEX idx_calendar_client ON compliance_calendar(client_id);
```

### Key Features
- **Auto-generate deadlines** - When a client subscribes to a service, all future deadlines are auto-created
- **Holiday awareness** - Adjusts for national and bank holidays
- **Penalty tracking** - Real-time penalty calculation for overdue filings
- **Bulk operations** - Generate calendar for entire client base at once

---

## Pillar 3: Jurisdiction Rules Engine

### Problem
India has complex multi-level compliance (Central, State, Local) with different rules per jurisdiction.

### Solution
A rules engine that handles jurisdiction-specific compliance variations.

### Schema Design

```sql
-- Jurisdictions (hierarchical)
CREATE TABLE jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,  -- 'IN', 'IN-MH', 'IN-MH-MUM'
  name VARCHAR(255) NOT NULL,

  -- Hierarchy
  parent_id UUID REFERENCES jurisdictions(id),
  level VARCHAR(20) NOT NULL,  -- 'COUNTRY', 'STATE', 'CITY', 'ZONE'

  -- GST Details (for India)
  gst_state_code VARCHAR(2),  -- '27' for Maharashtra
  tin_prefix VARCHAR(2),

  -- Defaults
  default_currency VARCHAR(3) DEFAULT 'INR',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',

  is_active BOOLEAN DEFAULT true
);

-- Jurisdiction-specific rules
CREATE TABLE jurisdiction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  blueprint_id UUID REFERENCES service_blueprints(id),

  -- Rule Type
  rule_type VARCHAR(50) NOT NULL,  -- 'DEADLINE_OVERRIDE', 'EXEMPTION', 'ADDITIONAL_REQUIREMENT'

  -- Override Values
  deadline_offset_days INTEGER,  -- Additional days for this jurisdiction
  exemption_criteria JSONB,  -- When this jurisdiction is exempt
  additional_documents TEXT[],  -- Extra docs needed
  additional_forms TEXT[],  -- Extra forms needed

  -- Conditions
  applies_when JSONB,  -- { "entity_type": ["pvt_ltd", "llp"] }

  effective_from DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,

  notes TEXT
);

-- Seed common jurisdictions
INSERT INTO jurisdictions (code, name, level, gst_state_code) VALUES
('IN', 'India', 'COUNTRY', NULL),
('IN-MH', 'Maharashtra', 'STATE', '27'),
('IN-KA', 'Karnataka', 'STATE', '29'),
('IN-DL', 'Delhi', 'STATE', '07'),
('IN-TN', 'Tamil Nadu', 'STATE', '33'),
('IN-GJ', 'Gujarat', 'STATE', '24');
```

### Example Use Cases
1. **Professional Tax** - Different rates and deadlines per state
2. **Shop Act Registration** - Municipal-level variations
3. **Factory License** - State-specific requirements
4. **GST Composition** - State-specific turnover limits

---

## Pillar 4: AI Intelligence Layer

### Problem
AI is bolted on rather than integrated into compliance workflows.

### Solution
Domain-specific AI that understands Indian compliance terminology, document formats, and regulatory patterns.

### Schema Design

```sql
-- AI Model registry
CREATE TABLE ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_code VARCHAR(50) UNIQUE NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  model_type VARCHAR(50) NOT NULL,  -- 'EXTRACTION', 'CLASSIFICATION', 'PREDICTION', 'RISK'

  -- Provider
  provider VARCHAR(50),  -- 'OPENAI', 'ANTHROPIC', 'CUSTOM', 'AZURE'
  model_identifier VARCHAR(255),  -- 'gpt-4-turbo', 'claude-3-opus'

  -- Configuration
  config JSONB,  -- Model-specific configuration
  prompt_template TEXT,  -- Base prompt for this model

  -- Domain
  domain VARCHAR(100),  -- 'TAX', 'COMPANY_LAW', 'GENERAL'

  -- Performance Tracking
  accuracy_score DECIMAL(5,4),
  total_invocations INTEGER DEFAULT 0,
  avg_latency_ms INTEGER,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Predictions log
CREATE TABLE ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id),
  tenant_id UUID REFERENCES tenants(id),

  -- Context
  entity_type VARCHAR(50),  -- 'TASK', 'CLIENT', 'DOCUMENT', 'SERVICE'
  entity_id UUID,

  -- Prediction
  prediction_type VARCHAR(50),  -- 'DEADLINE_RISK', 'DOCUMENT_VALIDITY', 'TAX_ESTIMATE'
  prediction_value JSONB,  -- The actual prediction
  confidence DECIMAL(5,4),  -- 0.0 to 1.0

  -- Outcome (for learning)
  actual_outcome JSONB,
  outcome_recorded_at TIMESTAMP,
  was_accurate BOOLEAN,

  -- Performance
  latency_ms INTEGER,
  token_usage JSONB,  -- { "input": 500, "output": 100 }

  created_at TIMESTAMP DEFAULT NOW()
);

-- Document extraction templates
CREATE TABLE document_extraction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type VARCHAR(100) NOT NULL,  -- 'PAN_CARD', 'GST_CERTIFICATE', 'INVOICE'

  -- Extraction Schema
  fields JSONB NOT NULL,  -- [{ "name": "pan_number", "type": "string", "pattern": "^[A-Z]{5}[0-9]{4}[A-Z]$" }]

  -- Validation Rules
  validation_rules JSONB,  -- Cross-field validation

  -- AI Config
  ocr_provider VARCHAR(50),  -- 'GOOGLE_VISION', 'AWS_TEXTRACT', 'AZURE'
  pre_processing JSONB,  -- Image preprocessing steps
  post_processing JSONB,  -- Data cleaning rules

  -- Sample for testing
  sample_document_url TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Smart recommendations
CREATE TABLE smart_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  client_id UUID REFERENCES clients(id),

  -- Recommendation
  recommendation_type VARCHAR(50),  -- 'MISSING_COMPLIANCE', 'OPTIMIZATION', 'RISK_ALERT'
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Action
  suggested_action VARCHAR(50),  -- 'SUBSCRIBE_SERVICE', 'UPLOAD_DOCUMENT', 'FILE_RETURN'
  action_data JSONB,  -- Data needed to take action

  -- Priority
  priority VARCHAR(20),  -- 'HIGH', 'MEDIUM', 'LOW'
  confidence DECIMAL(5,4),

  -- Status
  status VARCHAR(50) DEFAULT 'PENDING',  -- 'PENDING', 'ACCEPTED', 'DISMISSED', 'EXPIRED'
  actioned_at TIMESTAMP,

  -- Expiry
  expires_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### AI Capabilities
1. **Document Intelligence** - Extract data from PAN, GST certificates, invoices
2. **Risk Prediction** - Predict deadline miss risk based on historical patterns
3. **Smart Recommendations** - Suggest missing compliances based on business profile
4. **Anomaly Detection** - Flag unusual patterns in filings

---

## Pillar 5: Document Intelligence

### Problem
Documents are stored as files without extracting the valuable data within them.

### Solution
AI-powered document processing that extracts, validates, and verifies documents.

### Schema Design

```sql
-- Intelligent documents (extends existing document storage)
CREATE TABLE intelligent_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),  -- Link to existing document

  -- Classification
  detected_type VARCHAR(100),  -- AI-detected document type
  confidence DECIMAL(5,4),

  -- Extraction Status
  extraction_status VARCHAR(50) DEFAULT 'PENDING',  -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
  extracted_at TIMESTAMP,

  -- Quality Assessment
  quality_score DECIMAL(5,4),  -- Image quality, readability
  issues JSONB,  -- [{ "type": "BLUR", "severity": "MEDIUM", "location": "top-right" }]

  -- Verification
  verification_status VARCHAR(50),  -- 'UNVERIFIED', 'VERIFIED', 'SUSPICIOUS', 'REJECTED'
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  verification_notes TEXT,

  -- Tampering Detection
  tampering_check_result JSONB,  -- Results of tampering detection

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document extractions (the extracted data)
CREATE TABLE document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intelligent_document_id UUID REFERENCES intelligent_documents(id),
  template_id UUID REFERENCES document_extraction_templates(id),

  -- Extracted Data
  extracted_data JSONB NOT NULL,  -- { "pan_number": "ABCDE1234F", "name": "John Doe" }
  raw_ocr_output JSONB,  -- Raw OCR result for debugging

  -- Field-level Confidence
  field_confidence JSONB,  -- { "pan_number": 0.98, "name": 0.85 }

  -- Validation
  validation_results JSONB,  -- { "pan_format": true, "name_match": false }
  validation_errors TEXT[],

  -- Cross-reference
  cross_reference_status VARCHAR(50),  -- 'PENDING', 'MATCHED', 'MISMATCH'
  cross_reference_results JSONB,  -- Results of checking against govt databases

  created_at TIMESTAMP DEFAULT NOW()
);
```

### Document Types Supported
- **Identity Documents** - PAN Card, Aadhaar, Passport, Voter ID
- **Business Documents** - GST Certificate, Shop Act License, FSSAI License
- **Financial Documents** - Invoices, Bank Statements, ITR Acknowledgments
- **Legal Documents** - MOA, AOA, Board Resolutions, Contracts

---

## Pillar 6: Multi-Tenant Configuration

### Problem
CA firms want white-labeled platforms with their own branding, pricing, and service catalogs.

### Solution
Full multi-tenancy with configuration inheritance and override capabilities.

### Schema Design

```sql
-- Tenants (CA firms, enterprises)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,

  -- Type
  tenant_type VARCHAR(50),  -- 'CA_FIRM', 'ENTERPRISE', 'RESELLER'

  -- Branding
  branding JSONB,  -- { "logo": "url", "primary_color": "#1a73e8", "favicon": "url" }
  custom_domain VARCHAR(255),  -- 'compliance.cafirm.com'

  -- Contact
  admin_email VARCHAR(255),
  support_email VARCHAR(255),
  phone VARCHAR(20),

  -- Address
  address JSONB,

  -- Subscription
  subscription_plan VARCHAR(50),  -- 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'
  subscription_status VARCHAR(50) DEFAULT 'ACTIVE',
  subscription_expires_at TIMESTAMP,

  -- Limits
  max_users INTEGER DEFAULT 5,
  max_clients INTEGER DEFAULT 100,
  storage_limit_gb INTEGER DEFAULT 10,

  -- Features
  features_enabled TEXT[],  -- Array of feature codes

  -- Settings
  settings JSONB,  -- Tenant-level settings

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant-specific configurations
CREATE TABLE tenant_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Config Type
  config_type VARCHAR(50) NOT NULL,  -- 'EMAIL', 'SMS', 'PAYMENT', 'WORKFLOW'

  -- Values (inherits from system if not set)
  config_values JSONB NOT NULL,

  -- Inheritance
  inherit_from_system BOOLEAN DEFAULT true,
  overrides_only BOOLEAN DEFAULT true,  -- Only store differences

  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant pricing (override base blueprint pricing)
CREATE TABLE tenant_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  blueprint_id UUID REFERENCES service_blueprints(id),

  -- Pricing Override
  price_override DECIMAL(10,2),  -- Override base price
  price_multiplier DECIMAL(5,2),  -- Or apply multiplier (1.2 = 20% markup)

  -- Tier Overrides
  tier_overrides JSONB,  -- { "Basic": 799, "Premium": 1999 }

  -- Discount Rules
  volume_discounts JSONB,  -- [{ "min_qty": 10, "discount_pct": 10 }]

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tenant service catalog (which blueprints are available to tenant's clients)
CREATE TABLE tenant_service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  blueprint_id UUID REFERENCES service_blueprints(id),

  -- Visibility
  is_visible BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Customization
  custom_name VARCHAR(255),  -- Override display name
  custom_description TEXT,

  -- Availability
  available_from DATE,
  available_until DATE,

  sort_order INTEGER DEFAULT 0
);
```

### Tenant Features
- **White-labeling** - Custom domain, logo, colors
- **Pricing Control** - Set own prices with markup/markdown
- **Service Catalog** - Choose which services to offer
- **User Management** - Manage their own users and clients
- **Custom Workflows** - Modify workflow steps for their practice

---

## Pillar 7: No-Code Builder

### Problem
Any customization requires developer intervention.

### Solution
Visual tools for creating custom fields, page layouts, automation rules, and dashboards.

### Schema Design

```sql
-- Custom field definitions (EAV pattern)
CREATE TABLE custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),

  -- Target Entity
  entity_type VARCHAR(50) NOT NULL,  -- 'CLIENT', 'TASK', 'SERVICE', 'DOCUMENT'

  -- Field Definition
  field_code VARCHAR(50) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL,  -- 'TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'LOOKUP'

  -- Options (for SELECT/MULTI_SELECT)
  options JSONB,  -- [{ "value": "opt1", "label": "Option 1" }]

  -- Lookup Configuration (for LOOKUP type)
  lookup_entity VARCHAR(50),  -- Entity to lookup
  lookup_display_field VARCHAR(50),  -- Field to display

  -- Validation
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB,  -- { "min": 0, "max": 100, "pattern": "^[A-Z]+" }
  default_value TEXT,

  -- UI
  placeholder TEXT,
  help_text TEXT,
  display_order INTEGER DEFAULT 0,

  -- Visibility
  is_active BOOLEAN DEFAULT true,
  visible_on_create BOOLEAN DEFAULT true,
  visible_on_edit BOOLEAN DEFAULT true,
  visible_on_list BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, entity_type, field_code)
);

-- Custom field values
CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_definition_id UUID REFERENCES custom_field_definitions(id) ON DELETE CASCADE,

  -- Target Record
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,

  -- Value (stored as JSONB for flexibility)
  value JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(field_definition_id, entity_id)
);

-- Page layouts (custom forms)
CREATE TABLE page_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),

  -- Target
  entity_type VARCHAR(50) NOT NULL,
  layout_type VARCHAR(50) NOT NULL,  -- 'CREATE', 'EDIT', 'VIEW', 'LIST'

  -- Layout Definition
  layout_name VARCHAR(255) NOT NULL,
  layout_definition JSONB NOT NULL,  -- Sections, fields, ordering

  -- Conditions (when to use this layout)
  conditions JSONB,  -- { "user_role": "admin", "record_type": "premium" }

  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Automation rules (workflow automation)
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),

  -- Identity
  rule_name VARCHAR(255) NOT NULL,
  rule_code VARCHAR(50) NOT NULL,
  description TEXT,

  -- Trigger
  trigger_type VARCHAR(50) NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE', 'SCHEDULED', 'FIELD_CHANGE'
  trigger_entity VARCHAR(50) NOT NULL,  -- 'TASK', 'CLIENT', 'INVOICE'
  trigger_conditions JSONB,  -- { "status": "completed", "priority": "high" }

  -- Schedule (for SCHEDULED triggers)
  schedule_cron VARCHAR(100),  -- '0 9 * * 1' for Monday 9 AM

  -- Actions
  actions JSONB NOT NULL,  -- [{ "type": "SEND_EMAIL", "template": "...", "to": "client.email" }]

  -- Execution
  is_active BOOLEAN DEFAULT true,
  execution_order INTEGER DEFAULT 0,
  stop_on_error BOOLEAN DEFAULT false,

  -- Stats
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP,
  last_error TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, rule_code)
);

-- Custom dashboards
CREATE TABLE custom_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),  -- NULL for tenant-wide dashboards

  -- Dashboard Definition
  dashboard_name VARCHAR(255) NOT NULL,
  dashboard_type VARCHAR(50),  -- 'PERSONAL', 'TEAM', 'TENANT'

  -- Widgets
  widgets JSONB NOT NULL,  -- Array of widget configurations

  -- Layout
  layout JSONB,  -- Grid layout configuration

  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Report definitions
CREATE TABLE report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),

  -- Report Identity
  report_name VARCHAR(255) NOT NULL,
  report_code VARCHAR(50) NOT NULL,
  description TEXT,

  -- Report Type
  report_type VARCHAR(50),  -- 'TABLE', 'CHART', 'SUMMARY', 'MATRIX'

  -- Data Source
  base_entity VARCHAR(50) NOT NULL,  -- Primary entity
  joins JSONB,  -- Related entities to join

  -- Columns/Measures
  columns JSONB NOT NULL,  -- [{ "field": "name", "label": "Client Name", "type": "dimension" }]
  measures JSONB,  -- [{ "field": "amount", "aggregation": "SUM", "label": "Total Revenue" }]

  -- Filters
  default_filters JSONB,
  user_configurable_filters JSONB,

  -- Grouping
  group_by TEXT[],

  -- Sorting
  default_sort JSONB,

  -- Scheduling
  schedule_cron VARCHAR(100),  -- For scheduled reports
  email_recipients TEXT[],

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, report_code)
);

-- Indexes for custom fields
CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX idx_custom_field_definitions_tenant ON custom_field_definitions(tenant_id, entity_type);
CREATE INDEX idx_automation_rules_trigger ON automation_rules(tenant_id, trigger_entity, trigger_type) WHERE is_active = true;
```

### No-Code Capabilities
1. **Custom Fields** - Add fields to any entity without schema changes
2. **Page Layouts** - Design custom forms with drag-and-drop
3. **Automation Rules** - IF-THEN automation without code
4. **Custom Dashboards** - Build KPI dashboards visually
5. **Report Builder** - Create reports without SQL knowledge

---

## Migration Strategy

### Phase 1: Foundation (Weeks 1-3)
- Create new tables alongside existing ones
- Build migration scripts for existing data
- Implement backward-compatible APIs

### Phase 2: Core Engines (Weeks 4-8)
- Service Blueprints Engine
- Compliance Calendar Engine
- Jurisdiction Rules Engine

### Phase 3: Intelligence (Weeks 9-12)
- AI Intelligence Layer
- Document Intelligence
- Smart Recommendations

### Phase 4: Customization (Weeks 13-16)
- Multi-Tenant Configuration
- No-Code Builder
- Report Builder

### Phase 5: Rollout (Weeks 17-20)
- Migrate existing services to blueprints
- User training and documentation
- Gradual feature enablement

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to add new service | 2-3 days (developer) | 30 minutes (business user) |
| Custom field addition | Not possible | 2 minutes |
| Deadline accuracy | Manual tracking | 100% automated |
| Document processing | Manual data entry | 90% auto-extraction |
| New tenant onboarding | 1 week | 1 hour |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Schema complexity | Implement incrementally, maintain backward compatibility |
| Performance with EAV | Proper indexing, consider materialized views for reports |
| AI accuracy | Human review workflow, confidence thresholds |
| Migration disruption | Feature flags, parallel operation during transition |

---

## Appendix A: Sample Blueprint JSON

```json
{
  "code": "GSTR3B",
  "name": "GSTR-3B Monthly Return",
  "category": "TAX",
  "governing_act": "CGST Act 2017",
  "section_reference": "Section 39(1)",
  "form_number": "GSTR-3B",
  "workflow_definition": {
    "steps": [
      {
        "code": "DATA_COLLECTION",
        "name": "Collect Sales & Purchase Data",
        "type": "DOCUMENT_COLLECTION",
        "assignee_role": "ACCOUNTANT",
        "sla_hours": 48,
        "required_documents": ["SALES_REGISTER", "PURCHASE_REGISTER"]
      },
      {
        "code": "PREPARATION",
        "name": "Prepare GSTR-3B",
        "type": "TASK",
        "assignee_role": "ACCOUNTANT",
        "sla_hours": 24
      },
      {
        "code": "REVIEW",
        "name": "CA Review",
        "type": "APPROVAL",
        "assignee_role": "SENIOR_CA",
        "sla_hours": 12
      },
      {
        "code": "FILING",
        "name": "File on GST Portal",
        "type": "GOVERNMENT_FILING",
        "assignee_role": "ACCOUNTANT",
        "sla_hours": 4
      }
    ]
  },
  "compliance_rules": {
    "deadline_formula": "MONTH_END + 20 DAYS",
    "penalty_rules": [
      {
        "type": "DAILY",
        "amount": 25,
        "max": 5000,
        "condition": "tax_liability > 0"
      },
      {
        "type": "INTEREST",
        "rate": 18,
        "on": "tax_liability"
      }
    ]
  },
  "base_pricing": {
    "standard": 999,
    "urgent": 1499,
    "nil_return": 499
  }
}
```

---

## Appendix B: API Design Principles

1. **RESTful with GraphQL option** for complex queries
2. **Versioned APIs** (/api/v1/, /api/v2/)
3. **Tenant isolation** via headers or subdomain
4. **Rate limiting** per tenant tier
5. **Webhook support** for external integrations

---

*Document prepared for DigiComply enterprise platform upgrade.*
