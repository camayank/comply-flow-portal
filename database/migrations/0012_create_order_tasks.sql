-- Migration: Create Order Tasks and Task Activity Log tables
-- Description: Auto-Task Instantiation System - creates workflow tasks from templates
-- Date: 2026-02-24

-- Order Tasks Table - Individual workflow step instances
CREATE TABLE IF NOT EXISTS order_tasks (
    id SERIAL PRIMARY KEY,
    task_id TEXT UNIQUE, -- TK26000001 - human-readable ID

    -- Parent references
    service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    workflow_template_id TEXT,

    -- Step information
    step_number INTEGER NOT NULL,
    step_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL, -- document_upload, review, approval, filing, etc.

    -- Status management
    status TEXT NOT NULL DEFAULT 'pending', -- pending, blocked, ready, in_progress, qc_pending, qc_rejected, completed, skipped, cancelled
    status_reason TEXT,

    -- Assignment
    assigned_role TEXT NOT NULL,
    assigned_to INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP,
    assignment_notes TEXT,

    -- Dependencies
    depends_on JSONB DEFAULT '[]'::jsonb,
    blocked_by JSONB DEFAULT '[]'::jsonb,

    -- QC Integration
    requires_qc BOOLEAN DEFAULT FALSE,
    qc_review_id INTEGER REFERENCES quality_reviews(id),
    qc_status TEXT,
    qc_notes TEXT,

    -- Timing
    estimated_duration INTEGER, -- hours
    due_date TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- SLA tracking
    sla_deadline TIMESTAMP,
    is_overdue BOOLEAN DEFAULT FALSE,

    -- Work details
    work_notes TEXT,
    internal_notes TEXT,
    output_data JSONB,

    -- Rework tracking
    rework_count INTEGER DEFAULT 0,
    last_rework_reason TEXT,

    -- Auto-assignment
    auto_assigned BOOLEAN DEFAULT FALSE,
    assignment_attempts INTEGER DEFAULT 0,

    -- Priority
    priority TEXT DEFAULT 'medium',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Order Task Activity Log - Track all status changes and actions for order tasks
CREATE TABLE IF NOT EXISTS order_task_activity_log (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES order_tasks(id) ON DELETE CASCADE,

    activity_type TEXT NOT NULL, -- status_change, assignment, qc_submit, qc_result, note_added, etc.
    from_status TEXT,
    to_status TEXT,

    performed_by INTEGER REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT NOW(),

    details JSONB,
    notes TEXT
);

-- Indexes for order_tasks
CREATE INDEX IF NOT EXISTS idx_order_tasks_service_request ON order_tasks(service_request_id);
CREATE INDEX IF NOT EXISTS idx_order_tasks_status ON order_tasks(status);
CREATE INDEX IF NOT EXISTS idx_order_tasks_assigned_to ON order_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_order_tasks_assigned_role ON order_tasks(assigned_role);
CREATE INDEX IF NOT EXISTS idx_order_tasks_due_date ON order_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_order_tasks_step_number ON order_tasks(service_request_id, step_number);
CREATE INDEX IF NOT EXISTS idx_order_tasks_qc_review ON order_tasks(qc_review_id);
CREATE INDEX IF NOT EXISTS idx_order_tasks_task_id ON order_tasks(task_id);

-- Indexes for order_task_activity_log
CREATE INDEX IF NOT EXISTS idx_order_task_activity_task_id ON order_task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_order_task_activity_type ON order_task_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_order_task_activity_performed_at ON order_task_activity_log(performed_at);

-- Add trigger to update updated_at on order_tasks
CREATE OR REPLACE FUNCTION update_order_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_tasks_updated_at ON order_tasks;
CREATE TRIGGER trigger_order_tasks_updated_at
    BEFORE UPDATE ON order_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_order_tasks_updated_at();

-- Add trigger to check overdue tasks
CREATE OR REPLACE FUNCTION check_task_overdue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.due_date IS NOT NULL AND NEW.due_date < NOW() AND NEW.status NOT IN ('completed', 'skipped', 'cancelled') THEN
        NEW.is_overdue = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_task_overdue_check ON order_tasks;
CREATE TRIGGER trigger_task_overdue_check
    BEFORE INSERT OR UPDATE ON order_tasks
    FOR EACH ROW
    EXECUTE FUNCTION check_task_overdue();

-- Comments
COMMENT ON TABLE order_tasks IS 'Auto-instantiated workflow tasks for service requests';
COMMENT ON TABLE order_task_activity_log IS 'Activity log for order task status changes and actions';
COMMENT ON COLUMN order_tasks.task_id IS 'Human-readable task ID (TK26000001)';
COMMENT ON COLUMN order_tasks.depends_on IS 'Array of task IDs this task depends on';
COMMENT ON COLUMN order_tasks.blocked_by IS 'Array of task IDs currently blocking this task';
COMMENT ON COLUMN order_tasks.requires_qc IS 'Whether this task requires QC review before completion';
