-- Migration: Create client_communications table for communication logging
-- Date: 2026-02-16

-- Create client_communications table if not exists
CREATE TABLE IF NOT EXISTS client_communications (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  business_entity_id INTEGER,
  service_request_id INTEGER,

  -- Communication details
  communication_type TEXT NOT NULL, -- call, email, meeting, whatsapp, portal_message, sms
  direction TEXT NOT NULL, -- inbound, outbound
  subject TEXT,
  summary TEXT NOT NULL,
  full_content TEXT,

  -- Participants
  contacted_by INTEGER, -- staff member
  contacted_person TEXT, -- client person name
  contact_method TEXT, -- phone, email address, etc.

  -- Timing
  scheduled_at TIMESTAMP,
  actual_at TIMESTAMP NOT NULL DEFAULT NOW(),
  duration INTEGER, -- minutes

  -- Categorization
  purpose TEXT, -- follow_up, issue_resolution, service_discussion, payment_reminder, relationship_building, notification, otp, welcome, invoice
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  sentiment TEXT DEFAULT 'neutral', -- positive, neutral, negative

  -- Outcome and follow-up
  outcome TEXT, -- resolved, pending, escalated, no_action_needed, delivered
  action_items JSONB,
  next_follow_up_date TIMESTAMP,
  tags JSONB,

  -- Attachments and references
  attachments JSONB,
  related_documents JSONB,

  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_client_communications_client_id ON client_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_business_entity_id ON client_communications(business_entity_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_service_request_id ON client_communications(service_request_id);
CREATE INDEX IF NOT EXISTS idx_client_communications_type ON client_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_client_communications_actual_at ON client_communications(actual_at);
CREATE INDEX IF NOT EXISTS idx_client_communications_direction ON client_communications(direction);

-- Add comment for documentation
COMMENT ON TABLE client_communications IS 'Audit log of all client communications including email, SMS, WhatsApp, calls';
