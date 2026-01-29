-- Migration: Add Friendly Labels to Compliance Rules
-- Purpose: Support US-style client portal with human-friendly language
-- Date: 2026-01-22

-- Add friendly label columns to compliance_rules table
ALTER TABLE compliance_rules 
ADD COLUMN IF NOT EXISTS friendly_label TEXT,
ADD COLUMN IF NOT EXISTS action_verb VARCHAR(20) CHECK (action_verb IN ('upload', 'review', 'confirm', 'pay', 'sign', 'verify')),
ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER CHECK (estimated_time_minutes > 0),
ADD COLUMN IF NOT EXISTS why_matters JSONB,
ADD COLUMN IF NOT EXISTS instructions TEXT[];

-- Create index for faster lookups by friendly label
CREATE INDEX IF NOT EXISTS idx_compliance_rules_friendly_label ON compliance_rules(friendly_label);

-- Create index for action_verb filtering
CREATE INDEX IF NOT EXISTS idx_compliance_rules_action_verb ON compliance_rules(action_verb);

-- Add comments for documentation
COMMENT ON COLUMN compliance_rules.friendly_label IS 'Human-friendly version of compliance requirement (e.g., "Upload purchase invoices" instead of "GSTR-3B Input Credit")';
COMMENT ON COLUMN compliance_rules.action_verb IS 'Primary action type: upload, review, confirm, pay, sign, verify';
COMMENT ON COLUMN compliance_rules.estimated_time_minutes IS 'Expected time for user to complete task (reduces anxiety, improves completion rates)';
COMMENT ON COLUMN compliance_rules.why_matters IS 'JSON object with benefits[] array and socialProof string for user confidence';
COMMENT ON COLUMN compliance_rules.instructions IS 'Step-by-step instructions for completing the action';

-- Update updated_at trigger to include new columns
-- (assumes trigger already exists from previous migrations)

-- Add sample data for testing (will be replaced by seed script)
UPDATE compliance_rules 
SET friendly_label = 'Upload sales invoices for GST',
    action_verb = 'upload',
    estimated_time_minutes = 5,
    why_matters = '{"benefits": ["Avoid ₹5,000 late fee", "Complete monthly GST compliance", "Stay compliant with Indian tax laws"], "socialProof": "Used by 92% businesses like yours"}',
    instructions = ARRAY['Gather all sales invoices from this month', 'Upload PDF or Excel files', 'We''ll file your GST return automatically']
WHERE rule_code = 'GSTR1' AND friendly_label IS NULL;

-- Verification query (run after migration)
-- SELECT rule_code, friendly_label, action_verb, estimated_time_minutes 
-- FROM compliance_rules 
-- WHERE friendly_label IS NOT NULL 
-- LIMIT 10;
