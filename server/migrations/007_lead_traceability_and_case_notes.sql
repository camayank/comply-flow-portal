-- Migration: Add lead traceability and case notes
-- Date: 2026-02-16

-- Add lead_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS lead_id INTEGER;

-- Add lead_id to business_entities table
ALTER TABLE business_entities ADD COLUMN IF NOT EXISTS lead_id INTEGER;

-- Add lead_id and filing status to service_requests table
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS lead_id INTEGER;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS filing_stage TEXT DEFAULT 'not_filed';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS filing_date TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS filing_portal TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS arn_number TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS query_details TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS query_raised_at TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS response_submitted_at TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS final_status TEXT;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS final_status_date TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- Add lead_id to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS lead_id INTEGER;

-- Create case_notes table
CREATE TABLE IF NOT EXISTS case_notes (
  id SERIAL PRIMARY KEY,
  service_request_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_client_visible BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create client_activities table
CREATE TABLE IF NOT EXISTS client_activities (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  service_request_id INTEGER,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  performed_by INTEGER,
  performed_by_name TEXT,
  is_client_visible BOOLEAN DEFAULT FALSE,
  is_system_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_users_lead_id ON users(lead_id);
CREATE INDEX IF NOT EXISTS idx_business_entities_lead_id ON business_entities(lead_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_lead_id ON service_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_filing_stage ON service_requests(filing_stage);
CREATE INDEX IF NOT EXISTS idx_payments_lead_id ON payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_service_request_id ON case_notes(service_request_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_author_id ON case_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_client_id ON client_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activities_service_request_id ON client_activities(service_request_id);

-- Add foreign key constraints (if leads table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_lead_id
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
    ALTER TABLE business_entities ADD CONSTRAINT fk_business_entities_lead_id
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
    ALTER TABLE service_requests ADD CONSTRAINT fk_service_requests_lead_id
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
    ALTER TABLE payments ADD CONSTRAINT fk_payments_lead_id
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Constraints already exist
END $$;
