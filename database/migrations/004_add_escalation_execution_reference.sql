ALTER TABLE escalation_executions
  ADD COLUMN IF NOT EXISTS reference_type text,
  ADD COLUMN IF NOT EXISTS reference_id integer;

ALTER TABLE escalation_executions
  ALTER COLUMN service_request_id DROP NOT NULL;
