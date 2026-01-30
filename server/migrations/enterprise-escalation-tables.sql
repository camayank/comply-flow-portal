-- Enterprise Escalation Tables Migration
-- Creates tables required for auto-escalation engine

-- Escalation Rules - Configures when and how to escalate
CREATE TABLE IF NOT EXISTS escalation_rules (
    id SERIAL PRIMARY KEY,
    rule_key VARCHAR(100) UNIQUE NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Trigger conditions
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'time_based', -- 'time_based', 'sla_based', 'status_based'
    trigger_hours INTEGER, -- Hours before triggering (for time_based)
    service_key VARCHAR(100), -- Apply to specific service
    status_code VARCHAR(100), -- Apply to specific status
    priority VARCHAR(50), -- Apply to specific priority

    -- Escalation configuration
    escalation_tiers JSONB DEFAULT '[]', -- Array of tier configs
    auto_reassign BOOLEAN DEFAULT FALSE,
    reassign_to_role VARCHAR(100),
    notify_client BOOLEAN DEFAULT FALSE,
    client_notification_template VARCHAR(255),
    create_incident BOOLEAN DEFAULT FALSE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Escalation Executions - Audit log of triggered escalations
CREATE TABLE IF NOT EXISTS escalation_executions (
    id SERIAL PRIMARY KEY,
    escalation_rule_id INTEGER REFERENCES escalation_rules(id),
    service_request_id INTEGER,

    -- Execution details
    tier_executed INTEGER NOT NULL,
    severity VARCHAR(50) NOT NULL, -- 'warning', 'critical', 'breach'
    actions_executed JSONB, -- What actions were taken
    notifications_sent JSONB, -- Who was notified

    -- Reassignment tracking
    previous_assignee INTEGER,
    new_assignee INTEGER,
    reassignment_reason TEXT,

    -- Timestamps
    triggered_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,

    -- Status
    status VARCHAR(50) DEFAULT 'triggered' -- 'triggered', 'in_progress', 'completed', 'failed'
);

-- SLA Breach Records - Track all SLA violations
CREATE TABLE IF NOT EXISTS sla_breach_records (
    id SERIAL PRIMARY KEY,
    service_request_id INTEGER NOT NULL,

    -- Breach details
    breach_type VARCHAR(50) NOT NULL, -- 'overall_sla', 'status_sla', 'response_sla'
    breach_severity VARCHAR(50) NOT NULL, -- 'minor', 'major', 'critical'

    -- SLA metrics
    sla_hours INTEGER, -- Expected SLA hours
    actual_hours INTEGER, -- Actual hours taken
    breach_hours INTEGER, -- Hours over SLA

    -- Context at breach
    status_at_breach VARCHAR(100),
    assignee_at_breach INTEGER,

    -- Remediation
    remediation_required BOOLEAN DEFAULT TRUE,
    remediation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved', 'waived'
    remediation_notes TEXT,
    remediated_by VARCHAR(255),
    remediated_at TIMESTAMP,

    -- Client impact
    client_notified BOOLEAN DEFAULT FALSE,
    client_compensation_offered BOOLEAN DEFAULT FALSE,
    compensation_amount DECIMAL(10,2),

    -- Timestamps
    breached_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Work Item Queue - Unified view of all work items
CREATE TABLE IF NOT EXISTS work_item_queue (
    id SERIAL PRIMARY KEY,

    -- Work item reference
    work_item_type VARCHAR(50) NOT NULL, -- 'service_request', 'task', 'document_request'
    reference_id INTEGER NOT NULL, -- ID of the referenced item
    service_request_id INTEGER,
    service_key VARCHAR(100),

    -- Entity context
    entity_id INTEGER,
    entity_name VARCHAR(255),

    -- Status tracking
    current_status VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'MEDIUM',

    -- SLA tracking
    sla_deadline TIMESTAMP,
    sla_status VARCHAR(50), -- 'on_track', 'at_risk', 'warning', 'breached'
    sla_hours_remaining INTEGER,
    due_date TIMESTAMP,

    -- Assignment
    assigned_to INTEGER,
    assigned_to_name VARCHAR(255),
    assigned_at TIMESTAMP,

    -- Escalation tracking
    escalation_level INTEGER DEFAULT 0,
    last_escalated_at TIMESTAMP,

    -- Activity metrics
    age_hours INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP,

    -- Display fields
    service_type_name VARCHAR(255),
    period_label VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Work Item Activity Log - Immutable audit trail
CREATE TABLE IF NOT EXISTS work_item_activity_log (
    id SERIAL PRIMARY KEY,
    work_item_queue_id INTEGER REFERENCES work_item_queue(id),
    service_request_id INTEGER,

    -- Activity details
    activity_type VARCHAR(100) NOT NULL, -- 'status_change', 'escalation', 'assignment', 'note', etc.
    activity_description TEXT,

    -- Values
    previous_value JSONB,
    new_value JSONB,

    -- Performer
    performed_by INTEGER,
    performed_by_name VARCHAR(255),
    performed_by_role VARCHAR(100),

    -- Source
    is_system_generated BOOLEAN DEFAULT FALSE,
    trigger_source VARCHAR(100), -- 'user', 'automation', 'system'

    -- Client visibility
    client_visible BOOLEAN DEFAULT FALSE,
    client_message TEXT,

    -- Timestamp (immutable)
    occurred_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_escalation_rules_active ON escalation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_service ON escalation_rules(service_key);
CREATE INDEX IF NOT EXISTS idx_escalation_executions_sr ON escalation_executions(service_request_id);
CREATE INDEX IF NOT EXISTS idx_escalation_executions_time ON escalation_executions(triggered_at);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_sr ON sla_breach_records(service_request_id);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_status ON sla_breach_records(remediation_status);
CREATE INDEX IF NOT EXISTS idx_work_queue_sla ON work_item_queue(sla_status);
CREATE INDEX IF NOT EXISTS idx_work_queue_assigned ON work_item_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_queue_status ON work_item_queue(current_status);
CREATE INDEX IF NOT EXISTS idx_activity_log_sr ON work_item_activity_log(service_request_id);

-- Grant message
DO $$
BEGIN
    RAISE NOTICE 'Enterprise escalation tables created successfully';
END $$;
