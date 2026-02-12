-- Migration: Fix Missing Columns
-- This migration adds any columns that may be missing from tables
-- All statements are idempotent (safe to run multiple times)

-- ============================================================================
-- SERVICE_REQUESTS TABLE
-- ============================================================================

-- Add entity_id column if not exists (legacy compatibility)
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS entity_id INTEGER;

-- Add service_type column if not exists (legacy compatibility)
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Add period_label column if not exists
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS period_label TEXT;

-- Add periodicity column if not exists
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS periodicity TEXT;

-- Add due_date column if not exists
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;

-- Add is_active column if not exists
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Sync entity_id with business_entity_id where missing
UPDATE service_requests
SET entity_id = business_entity_id
WHERE entity_id IS NULL AND business_entity_id IS NOT NULL;

-- Sync service_type with service_id where missing
UPDATE service_requests
SET service_type = service_id
WHERE service_type IS NULL AND service_id IS NOT NULL;

-- ============================================================================
-- WORK_ITEM_QUEUE TABLE
-- ============================================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS work_item_queue (
    id SERIAL PRIMARY KEY,
    work_item_type VARCHAR(50) NOT NULL,
    reference_id INTEGER NOT NULL,
    service_request_id INTEGER,
    service_key VARCHAR(100),
    entity_id INTEGER,
    entity_name VARCHAR(255),
    current_status VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'MEDIUM',
    sla_deadline TIMESTAMP,
    sla_status VARCHAR(50),
    sla_hours_remaining INTEGER,
    due_date TIMESTAMP,
    assigned_to INTEGER,
    assigned_to_name VARCHAR(255),
    assigned_to_role VARCHAR(100),
    assigned_at TIMESTAMP,
    escalation_level INTEGER DEFAULT 0,
    last_escalated_at TIMESTAMP,
    age_hours INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP,
    service_type_name VARCHAR(255),
    period_label VARCHAR(100),
    client_visible BOOLEAN DEFAULT FALSE,
    client_status_label TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to work_item_queue
ALTER TABLE work_item_queue
ADD COLUMN IF NOT EXISTS client_visible BOOLEAN DEFAULT FALSE;

ALTER TABLE work_item_queue
ADD COLUMN IF NOT EXISTS client_status_label TEXT;

ALTER TABLE work_item_queue
ADD COLUMN IF NOT EXISTS assigned_to_role VARCHAR(100);

ALTER TABLE work_item_queue
ADD COLUMN IF NOT EXISTS entity_id INTEGER;

ALTER TABLE work_item_queue
ADD COLUMN IF NOT EXISTS entity_name VARCHAR(255);

-- ============================================================================
-- WORK_ITEM_ACTIVITY_LOG TABLE
-- ============================================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS work_item_activity_log (
    id SERIAL PRIMARY KEY,
    work_item_queue_id INTEGER,
    service_request_id INTEGER,
    activity_type VARCHAR(100) NOT NULL,
    activity_description TEXT,
    previous_value JSONB,
    new_value JSONB,
    performed_by INTEGER,
    performed_by_name VARCHAR(255),
    performed_by_role VARCHAR(100),
    is_system_generated BOOLEAN DEFAULT FALSE,
    trigger_source VARCHAR(100),
    client_visible BOOLEAN DEFAULT FALSE,
    client_message TEXT,
    occurred_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to work_item_activity_log
ALTER TABLE work_item_activity_log
ADD COLUMN IF NOT EXISTS client_visible BOOLEAN DEFAULT FALSE;

ALTER TABLE work_item_activity_log
ADD COLUMN IF NOT EXISTS client_message TEXT;

-- ============================================================================
-- SLA_BREACH_RECORDS TABLE
-- ============================================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS sla_breach_records (
    id SERIAL PRIMARY KEY,
    service_request_id INTEGER NOT NULL,
    breach_type VARCHAR(50) NOT NULL,
    breach_severity VARCHAR(50) NOT NULL,
    sla_hours INTEGER,
    actual_hours INTEGER,
    breach_hours INTEGER,
    status_at_breach VARCHAR(100),
    assignee_at_breach INTEGER,
    root_cause_category TEXT,
    root_cause_details TEXT,
    was_client_fault BOOLEAN DEFAULT FALSE,
    was_external_fault BOOLEAN DEFAULT FALSE,
    remediation_required BOOLEAN DEFAULT TRUE,
    remediation_status VARCHAR(50) DEFAULT 'pending',
    remediation_notes TEXT,
    remediation_actions JSONB,
    remediated_by VARCHAR(255),
    remediated_at TIMESTAMP,
    remediation_completed_at TIMESTAMP,
    client_notified BOOLEAN DEFAULT FALSE,
    client_notified_at TIMESTAMP,
    client_apology_sent BOOLEAN DEFAULT FALSE,
    compensation_offered BOOLEAN DEFAULT FALSE,
    compensation_details TEXT,
    client_compensation_offered BOOLEAN DEFAULT FALSE,
    compensation_amount DECIMAL(10,2),
    financial_impact DECIMAL(10,2),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by INTEGER,
    reported_by INTEGER,
    breached_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to sla_breach_records
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS root_cause_category TEXT;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS root_cause_details TEXT;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS was_client_fault BOOLEAN DEFAULT FALSE;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS was_external_fault BOOLEAN DEFAULT FALSE;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS remediation_actions JSONB;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS remediation_completed_at TIMESTAMP;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMP;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS client_apology_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS compensation_offered BOOLEAN DEFAULT FALSE;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS compensation_details TEXT;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS financial_impact DECIMAL(10,2);
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT FALSE;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS resolved_by INTEGER;
ALTER TABLE sla_breach_records ADD COLUMN IF NOT EXISTS reported_by INTEGER;

-- ============================================================================
-- ESCALATION_RULES TABLE
-- ============================================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS escalation_rules (
    id SERIAL PRIMARY KEY,
    rule_key VARCHAR(100) UNIQUE NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'time_based',
    trigger_hours INTEGER,
    service_key VARCHAR(100),
    status_code VARCHAR(100),
    priority VARCHAR(50),
    escalation_tiers JSONB DEFAULT '[]',
    auto_reassign BOOLEAN DEFAULT FALSE,
    reassign_to_role VARCHAR(100),
    notify_client BOOLEAN DEFAULT FALSE,
    client_notification_template VARCHAR(255),
    create_incident BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ESCALATION_EXECUTIONS TABLE
-- ============================================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS escalation_executions (
    id SERIAL PRIMARY KEY,
    escalation_rule_id INTEGER,
    service_request_id INTEGER,
    tier_executed INTEGER NOT NULL,
    severity VARCHAR(50) NOT NULL,
    actions_executed JSONB,
    notifications_sent JSONB,
    previous_assignee INTEGER,
    new_assignee INTEGER,
    reassignment_reason TEXT,
    triggered_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'triggered'
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_work_queue_sla_status ON work_item_queue(sla_status);
CREATE INDEX IF NOT EXISTS idx_work_queue_assigned_to ON work_item_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_queue_current_status ON work_item_queue(current_status);
CREATE INDEX IF NOT EXISTS idx_work_queue_entity_id ON work_item_queue(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_work_item ON work_item_activity_log(work_item_queue_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_service_request ON work_item_activity_log(service_request_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_entity_id ON service_requests(entity_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_is_active ON service_requests(is_active);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 010_fix_missing_columns completed successfully';
END $$;
