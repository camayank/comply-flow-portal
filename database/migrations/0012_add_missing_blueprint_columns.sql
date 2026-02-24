-- Migration: Add missing columns to blueprint tables
-- Date: 2026-02-24
-- Issue: Blueprint activation endpoint failing due to missing columns

-- Add notification_template_id to blueprint_compliance_rules
ALTER TABLE blueprint_compliance_rules
  ADD COLUMN IF NOT EXISTS notification_template_id UUID;

-- Add missing columns to blueprint_checklists
ALTER TABLE blueprint_checklists
  ADD COLUMN IF NOT EXISTS workflow_step_id UUID REFERENCES blueprint_workflow_steps(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS checklist_type VARCHAR(50) DEFAULT 'QC',
  ADD COLUMN IF NOT EXISTS minimum_completion_pct INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS requires_signoff BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS signoff_role VARCHAR(100);

-- Create index for workflow_step_id foreign key
CREATE INDEX IF NOT EXISTS idx_bc_workflow_step ON blueprint_checklists(workflow_step_id);
