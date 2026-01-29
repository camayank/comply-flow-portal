-- Migration: Add Full Depth Components for Drill-Down
-- Phase 1: Compliance Action Center, Document Verification, Service Lifecycle, Audit Trail
-- Date: 2026-01-22

-- ============================================================================
-- 1. ENHANCE compliance_actions table with subtasks
-- ============================================================================

-- Add checkpoint reference and dependency tracking
ALTER TABLE compliance_actions
ADD COLUMN IF NOT EXISTS checkpoint_id INTEGER REFERENCES compliance_tracking(id),
ADD COLUMN IF NOT EXISTS parent_action_id INTEGER REFERENCES compliance_actions(id),
ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS impact_score INTEGER DEFAULT 0;

-- Create index for parent-child relationships
CREATE INDEX IF NOT EXISTS idx_actions_parent ON compliance_actions(parent_action_id);
CREATE INDEX IF NOT EXISTS idx_actions_checkpoint ON compliance_actions(checkpoint_id);

COMMENT ON COLUMN compliance_actions.checkpoint_id IS 'Links action to specific compliance checkpoint';
COMMENT ON COLUMN compliance_actions.parent_action_id IS 'For nested subtasks - links to parent action';
COMMENT ON COLUMN compliance_actions.dependencies IS 'Array of action IDs that must be completed first';
COMMENT ON COLUMN compliance_actions.subtasks IS 'Array of subtask objects with status tracking';
COMMENT ON COLUMN compliance_actions.impact_score IS 'Points gained when completed (for gamification)';

-- ============================================================================
-- 2. CREATE service_delivery_stages table
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_delivery_stages (
  id SERIAL PRIMARY KEY,
  service_subscription_id INTEGER NOT NULL REFERENCES entity_services(id) ON DELETE CASCADE,
  stage_name VARCHAR(100) NOT NULL, -- 'data_collection', 'processing', 'qc', 'delivery', 'feedback'
  stage_order INTEGER NOT NULL,
  stage_description TEXT,
  assigned_to INTEGER REFERENCES users(id),
  assigned_team VARCHAR(50), -- 'operations', 'qc', 'delivery'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked', 'skipped'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_duration_hours INTEGER,
  actual_duration_hours INTEGER,
  deliverables JSONB DEFAULT '[]'::jsonb,
  quality_score DECIMAL(3,1), -- 0.0 to 10.0
  quality_notes TEXT,
  blocking_issues JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_stages_subscription ON service_delivery_stages(service_subscription_id);
CREATE INDEX idx_delivery_stages_status ON service_delivery_stages(status);
CREATE INDEX idx_delivery_stages_assigned ON service_delivery_stages(assigned_to);

COMMENT ON TABLE service_delivery_stages IS 'Tracks 5-stage service delivery pipeline for each subscription';
COMMENT ON COLUMN service_delivery_stages.stage_order IS 'Order of execution (1-5)';
COMMENT ON COLUMN service_delivery_stages.deliverables IS 'Array of deliverable objects with URLs and status';
COMMENT ON COLUMN service_delivery_stages.blocking_issues IS 'Array of issues preventing progress';

-- ============================================================================
-- 3. ENHANCE document_verifications with workflow stages
-- ============================================================================

ALTER TABLE document_verifications
ADD COLUMN IF NOT EXISTS verification_stage VARCHAR(50) DEFAULT 'uploaded', -- 'uploaded', 'ocr_processing', 'manual_review', 'approved', 'rejected', 'resubmit_requested'
ADD COLUMN IF NOT EXISTS ocr_data JSONB,
ADD COLUMN IF NOT EXISTS ocr_confidence_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS manual_review_notes TEXT,
ADD COLUMN IF NOT EXISTS issues_found JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS resubmit_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_doc_verification_stage ON document_verifications(verification_stage);

COMMENT ON COLUMN document_verifications.verification_stage IS 'Current stage in verification workflow';
COMMENT ON COLUMN document_verifications.ocr_data IS 'Extracted data from OCR: PAN, GSTIN, dates, amounts, etc.';
COMMENT ON COLUMN document_verifications.issues_found IS 'Array of issue objects: {field, expected, found, severity}';

-- ============================================================================
-- 4. ENHANCE audit_logs for comprehensive tracking
-- ============================================================================

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS action_type VARCHAR(50), -- 'document_upload', 'status_change', 'payment', 'task_assign', etc.
ADD COLUMN IF NOT EXISTS action_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS location_data JSONB DEFAULT '{}'::jsonb;

-- Rename timestamp to created_at for consistency
ALTER TABLE audit_logs RENAME COLUMN timestamp TO created_at;

CREATE INDEX IF NOT EXISTS idx_audit_logs_client ON audit_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

COMMENT ON COLUMN audit_logs.action_details IS 'JSON with old_value, new_value, reason, etc.';
COMMENT ON COLUMN audit_logs.device_info IS 'Browser, OS, device type from user agent parsing';

-- ============================================================================
-- 5. CREATE compliance_checkpoint_subtasks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_checkpoint_subtasks (
  id SERIAL PRIMARY KEY,
  checkpoint_id INTEGER NOT NULL REFERENCES compliance_tracking(id) ON DELETE CASCADE,
  action_id INTEGER REFERENCES compliance_actions(id) ON DELETE CASCADE,
  subtask_order INTEGER NOT NULL,
  subtask_name VARCHAR(255) NOT NULL,
  subtask_description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked'
  assigned_to INTEGER REFERENCES users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by INTEGER REFERENCES users(id),
  estimated_hours DECIMAL(4,2),
  actual_hours DECIMAL(4,2),
  dependencies JSONB DEFAULT '[]'::jsonb, -- Array of subtask IDs that must complete first
  documents_required JSONB DEFAULT '[]'::jsonb,
  documents_attached JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkpoint_subtasks_checkpoint ON compliance_checkpoint_subtasks(checkpoint_id);
CREATE INDEX idx_checkpoint_subtasks_action ON compliance_checkpoint_subtasks(action_id);
CREATE INDEX idx_checkpoint_subtasks_status ON compliance_checkpoint_subtasks(status);

COMMENT ON TABLE compliance_checkpoint_subtasks IS 'Granular task breakdown for each compliance checkpoint';

-- ============================================================================
-- 6. CREATE service_delivery_checklist table
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_delivery_checklist (
  id SERIAL PRIMARY KEY,
  service_subscription_id INTEGER NOT NULL REFERENCES entity_services(id) ON DELETE CASCADE,
  delivery_stage_id INTEGER REFERENCES service_delivery_stages(id) ON DELETE CASCADE,
  checklist_item VARCHAR(255) NOT NULL,
  item_description TEXT,
  item_order INTEGER NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'n/a'
  completed_at TIMESTAMPTZ,
  completed_by INTEGER REFERENCES users(id),
  verification_proof JSONB, -- URLs to uploaded proofs
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_checklist_subscription ON service_delivery_checklist(service_subscription_id);
CREATE INDEX idx_delivery_checklist_stage ON service_delivery_checklist(delivery_stage_id);

COMMENT ON TABLE service_delivery_checklist IS 'Detailed checklist for each service delivery stage';

-- ============================================================================
-- 7. CREATE document_verification_history table
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_verification_history (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES client_documents(id) ON DELETE CASCADE,
  verification_id INTEGER REFERENCES document_verifications(id) ON DELETE SET NULL,
  stage_from VARCHAR(50),
  stage_to VARCHAR(50) NOT NULL,
  changed_by INTEGER NOT NULL REFERENCES users(id),
  change_reason TEXT,
  verification_data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_verification_history_document ON document_verification_history(document_id);
CREATE INDEX idx_doc_verification_history_timestamp ON document_verification_history(timestamp);

COMMENT ON TABLE document_verification_history IS 'Complete audit trail of document verification stages';

-- ============================================================================
-- 8. CREATE notification_center table
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_center (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'deadline_approaching', 'document_verified', 'service_completed', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  category VARCHAR(50), -- 'compliance', 'documents', 'services', 'payments', 'system'
  action_required BOOLEAN DEFAULT false,
  action_url TEXT,
  action_label VARCHAR(50),
  related_entity_type VARCHAR(50),
  related_entity_id INTEGER,
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_via JSONB DEFAULT '{"web": true}'::jsonb, -- {web: true, email: false, sms: false, whatsapp: false}
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user ON notification_center(user_id);
CREATE INDEX idx_notifications_client ON notification_center(client_id);
CREATE INDEX idx_notifications_is_read ON notification_center(is_read);
CREATE INDEX idx_notifications_created_at ON notification_center(created_at);
CREATE INDEX idx_notifications_type ON notification_center(notification_type);

COMMENT ON TABLE notification_center IS 'Centralized notification management with multi-channel support';

-- ============================================================================
-- 9. CREATE user_activity_feed table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity_feed (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_title VARCHAR(255) NOT NULL,
  activity_description TEXT,
  actor_id INTEGER REFERENCES users(id), -- Who performed the action
  actor_name VARCHAR(255),
  entity_type VARCHAR(50),
  entity_id INTEGER,
  entity_name VARCHAR(255),
  icon VARCHAR(50), -- Lucide icon name
  color VARCHAR(50), -- Tailwind color class
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_feed_user ON user_activity_feed(user_id);
CREATE INDEX idx_activity_feed_client ON user_activity_feed(client_id);
CREATE INDEX idx_activity_feed_timestamp ON user_activity_feed(timestamp DESC);

COMMENT ON TABLE user_activity_feed IS 'Real-time activity feed for users to see what happened in their account';

-- ============================================================================
-- 10. ADD triggers for automatic history tracking
-- ============================================================================

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log_entry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    client_id,
    action_type,
    entity_type,
    entity_id,
    action_details,
    created_at
  ) VALUES (
    COALESCE(NEW.updated_by, NEW.created_by, 1), -- Default to system user if not specified
    NEW.client_id,
    TG_ARGV[0], -- Action type passed as trigger argument
    TG_TABLE_NAME,
    NEW.id,
    jsonb_build_object(
      'old_value', to_jsonb(OLD),
      'new_value', to_jsonb(NEW)
    ),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to key tables (only if they don't exist)
DO $$
BEGIN
  -- Compliance actions
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_compliance_actions_changes') THEN
    CREATE TRIGGER audit_compliance_actions_changes
    AFTER UPDATE ON compliance_actions
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION create_audit_log_entry('compliance_action_updated');
  END IF;

  -- Document verifications
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_document_verifications_changes') THEN
    CREATE TRIGGER audit_document_verifications_changes
    AFTER INSERT OR UPDATE ON document_verifications
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log_entry('document_verification_updated');
  END IF;

  -- Service delivery stages
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_service_stages_changes') THEN
    CREATE TRIGGER audit_service_stages_changes
    AFTER UPDATE ON service_delivery_stages
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION create_audit_log_entry('service_stage_status_changed');
  END IF;
END $$;

-- ============================================================================
-- 11. CREATE views for quick drill-down queries
-- ============================================================================

-- View: Compliance checkpoint with all subtasks
CREATE OR REPLACE VIEW v_compliance_checkpoints_detailed AS
SELECT 
  ct.id AS checkpoint_id,
  ct.client_id,
  ct.checkpoint_name,
  ct.checkpoint_type,
  ct.due_date,
  ct.status,
  ct.risk_level,
  ct.penalty_amount,
  COUNT(DISTINCT ca.id) AS total_actions,
  COUNT(DISTINCT ca.id) FILTER (WHERE ca.status = 'completed') AS completed_actions,
  COUNT(DISTINCT cs.id) AS total_subtasks,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'completed') AS completed_subtasks,
  COALESCE(AVG(cs.actual_hours), 0) AS avg_hours_per_subtask,
  json_agg(DISTINCT jsonb_build_object(
    'action_id', ca.id,
    'title', ca.title,
    'status', ca.status,
    'due_date', ca.due_date,
    'priority', ca.priority
  )) FILTER (WHERE ca.id IS NOT NULL) AS actions,
  json_agg(DISTINCT jsonb_build_object(
    'subtask_id', cs.id,
    'name', cs.subtask_name,
    'status', cs.status,
    'assigned_to', cs.assigned_to
  )) FILTER (WHERE cs.id IS NOT NULL) AS subtasks
FROM compliance_tracking ct
LEFT JOIN compliance_actions ca ON ct.id = ca.checkpoint_id
LEFT JOIN compliance_checkpoint_subtasks cs ON ct.id = cs.checkpoint_id
GROUP BY ct.id, ct.client_id, ct.checkpoint_name, ct.checkpoint_type, 
         ct.due_date, ct.status, ct.risk_level, ct.penalty_amount;

-- View: Service delivery pipeline status
CREATE OR REPLACE VIEW v_service_delivery_pipeline AS
SELECT 
  es.id AS subscription_id,
  es.client_id,
  es.service_key,
  sc.name AS service_name,
  es.status AS subscription_status,
  COUNT(DISTINCT sds.id) AS total_stages,
  COUNT(DISTINCT sds.id) FILTER (WHERE sds.status = 'completed') AS completed_stages,
  COUNT(DISTINCT sds.id) FILTER (WHERE sds.status = 'in_progress') AS in_progress_stages,
  COUNT(DISTINCT sds.id) FILTER (WHERE sds.status = 'blocked') AS blocked_stages,
  ROUND(AVG(sds.quality_score), 1) AS avg_quality_score,
  json_agg(jsonb_build_object(
    'stage_id', sds.id,
    'stage_name', sds.stage_name,
    'stage_order', sds.stage_order,
    'status', sds.status,
    'assigned_to', sds.assigned_to,
    'started_at', sds.started_at,
    'completed_at', sds.completed_at,
    'quality_score', sds.quality_score
  ) ORDER BY sds.stage_order) AS stages
FROM entity_services es
JOIN services_catalog sc ON es.service_key = sc.service_key
LEFT JOIN service_delivery_stages sds ON es.id = sds.service_subscription_id
GROUP BY es.id, es.client_id, es.service_key, sc.name, es.status;

-- View: Document verification pipeline
CREATE OR REPLACE VIEW v_document_verification_pipeline AS
SELECT 
  cd.id AS document_id,
  cd.client_id,
  cd.document_type,
  cd.document_name,
  cd.uploaded_at,
  cd.status AS document_status,
  dv.verification_stage,
  dv.ocr_confidence_score,
  dv.confidence_score AS overall_confidence_score,
  dv.verified_by,
  dv.verified_at,
  COUNT(dvh.id) AS total_stage_changes,
  json_agg(jsonb_build_object(
    'stage_from', dvh.stage_from,
    'stage_to', dvh.stage_to,
    'changed_by', dvh.changed_by,
    'timestamp', dvh.timestamp
  ) ORDER BY dvh.timestamp DESC) FILTER (WHERE dvh.id IS NOT NULL) AS verification_history
FROM client_documents cd
LEFT JOIN document_verifications dv ON cd.id = dv.document_id
LEFT JOIN document_verification_history dvh ON cd.id = dvh.document_id
GROUP BY cd.id, cd.client_id, cd.document_type, cd.document_name, cd.uploaded_at, 
         cd.status, dv.verification_stage, dv.ocr_confidence_score, 
         dv.confidence_score, dv.verified_by, dv.verified_at;

-- ============================================================================
-- 12. Sample data for testing drill-down
-- ============================================================================

-- Insert sample notification
INSERT INTO notification_center (user_id, client_id, notification_type, title, message, priority, category, action_required, action_url, action_label)
VALUES (1, 1, 'deadline_approaching', 'GST-3B Due in 3 Days', 'Your GST-3B filing for January 2026 is due on 20th Jan. Complete the pending subtasks.', 'high', 'compliance', true, '/lifecycle/compliance', 'Complete Now')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Log migration
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, created_at)
VALUES (1, 'migration_applied', 'database', 'v1_full_depth_components', NOW());

COMMENT ON DATABASE complyflow_dev IS 'DigiComply Platform - Full depth drill-down capabilities enabled (2026-01-22)';
