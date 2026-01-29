-- Fix Views with Correct Column Names

-- Drop existing views first
DROP VIEW IF EXISTS v_compliance_checkpoints_detailed CASCADE;
DROP VIEW IF EXISTS v_service_delivery_pipeline CASCADE;
DROP VIEW IF EXISTS v_document_verification_pipeline CASCADE;

-- View: Compliance checkpoint with all subtasks (FIXED)
CREATE OR REPLACE VIEW v_compliance_checkpoints_detailed AS
SELECT 
  ct.id AS checkpoint_id,
  ct.user_id,
  ct.business_entity_id,
  ct.compliance_type,
  ct.due_date,
  ct.status,
  ct.priority,
  ct.estimated_penalty,
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
GROUP BY ct.id, ct.user_id, ct.business_entity_id, ct.compliance_type, 
         ct.due_date, ct.status, ct.priority, ct.estimated_penalty;

-- View: Service delivery pipeline status (FIXED)
CREATE OR REPLACE VIEW v_service_delivery_pipeline AS
SELECT 
  es.id AS subscription_id,
  es.entity_id,
  es.service_key,
  sc.name AS service_name,
  es.is_active AS subscription_status,
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
GROUP BY es.id, es.entity_id, es.service_key, sc.name, es.is_active;

-- View: Document verification pipeline (FIXED)
CREATE OR REPLACE VIEW v_document_verification_pipeline AS
SELECT 
  cd.id AS document_id,
  cd.client_id,
  cd.document_type,
  cd.document_name,
  cd.uploaded_by,
  cd.created_at AS uploaded_at,
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
GROUP BY cd.id, cd.client_id, cd.document_type, cd.document_name, cd.uploaded_by, 
         cd.created_at, cd.status, dv.verification_stage, dv.ocr_confidence_score, 
         dv.confidence_score, dv.verified_by, dv.verified_at;

COMMENT ON VIEW v_compliance_checkpoints_detailed IS 'Complete checkpoint view with actions and subtasks for drill-down';
COMMENT ON VIEW v_service_delivery_pipeline IS '5-stage service pipeline with quality scores for operations dashboard';
COMMENT ON VIEW v_document_verification_pipeline IS 'Document verification workflow with stage history for QC dashboard';
