-- Document Management System Tables
-- Following Secureframe/Vanta patterns for compliance document tracking

-- Document types catalog (master list of all possible documents)
CREATE TABLE IF NOT EXISTS document_types (
  document_key VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  validity_period_days INTEGER, -- NULL = permanent
  renewal_reminder_days INTEGER,
  mandatory_fields JSONB,
  optional_fields JSONB,
  validation_rules JSONB,
  file_requirements JSONB,
  common_for TEXT[], -- Array of service keys
  sample_template_url TEXT,
  issuing_authority VARCHAR(255),
  ocr_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document requests (smart requests for clients)
CREATE TABLE IF NOT EXISTS document_requests (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,
  action_id INTEGER REFERENCES compliance_actions(id) ON DELETE SET NULL,
  required_documents JSONB NOT NULL, -- Array of document_keys
  optional_documents JSONB,
  due_date DATE NOT NULL,
  instructions TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, partial, completed, expired
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced client_documents table (add if not exists)
-- This extends the existing table with document management features
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='client_documents' AND column_name='document_key') THEN
    ALTER TABLE client_documents ADD COLUMN document_key VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='client_documents' AND column_name='document_name') THEN
    ALTER TABLE client_documents ADD COLUMN document_name VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='client_documents' AND column_name='version') THEN
    ALTER TABLE client_documents ADD COLUMN version INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='client_documents' AND column_name='status') THEN
    ALTER TABLE client_documents ADD COLUMN status VARCHAR(50) DEFAULT 'uploaded';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='client_documents' AND column_name='extracted_data') THEN
    ALTER TABLE client_documents ADD COLUMN extracted_data JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='client_documents' AND column_name='expiry_date') THEN
    ALTER TABLE client_documents ADD COLUMN expiry_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='client_documents' AND column_name='linked_to_action_id') THEN
    ALTER TABLE client_documents ADD COLUMN linked_to_action_id INTEGER 
      REFERENCES compliance_actions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='client_documents' AND column_name='linked_to_service_key') THEN
    ALTER TABLE client_documents ADD COLUMN linked_to_service_key TEXT;
  END IF;
END $$;

-- Document version history (Carta-style version control)
CREATE TABLE IF NOT EXISTS document_versions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES client_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  uploaded_by VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL,
  change_reason TEXT,
  metadata JSONB,
  UNIQUE(document_id, version)
);

-- Document verification audit trail (Secureframe-style)
CREATE TABLE IF NOT EXISTS document_verifications (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES client_documents(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL, -- auto, manual, ai_assisted
  verified_by VARCHAR(255) NOT NULL,
  verification_result VARCHAR(50) NOT NULL, -- approved, rejected, needs_review
  confidence_score DECIMAL(3,2), -- For AI verification (0.00 to 1.00)
  verification_details JSONB,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document checklists (Rippling-style smart checklists)
CREATE TABLE IF NOT EXISTS document_checklists (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,
  checklist_name VARCHAR(255) NOT NULL,
  total_items INTEGER NOT NULL,
  completed_items INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed, blocked
  due_date DATE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Checklist items (individual document requirements)
CREATE TABLE IF NOT EXISTS checklist_items (
  id SERIAL PRIMARY KEY,
  checklist_id INTEGER NOT NULL REFERENCES document_checklists(id) ON DELETE CASCADE,
  document_key VARCHAR(100) NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'pending', -- pending, uploaded, verified, rejected
  document_id INTEGER REFERENCES client_documents(id) ON DELETE SET NULL,
  assigned_to VARCHAR(255),
  notes TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document expiry tracking (Vanta-style proactive management)
CREATE TABLE IF NOT EXISTS document_expiry_alerts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  document_id INTEGER NOT NULL REFERENCES client_documents(id) ON DELETE CASCADE,
  expiry_date DATE NOT NULL,
  alert_date DATE NOT NULL,
  alert_type VARCHAR(50) NOT NULL, -- 60_days, 30_days, 7_days, expired
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, acknowledged, renewed
  sent_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_requests_client_id ON document_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_service_key ON document_requests(service_key);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_due_date ON document_requests(due_date);

CREATE INDEX IF NOT EXISTS idx_client_documents_document_key ON client_documents(document_key);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_documents_expiry_date ON client_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_client_documents_linked_action ON client_documents(linked_to_action_id);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_verifications_document_id ON document_verifications(document_id);

CREATE INDEX IF NOT EXISTS idx_checklists_client_service ON document_checklists(client_id, service_key);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_document_key ON checklist_items(document_key);

CREATE INDEX IF NOT EXISTS idx_expiry_alerts_client ON document_expiry_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_status ON document_expiry_alerts(status);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_alert_date ON document_expiry_alerts(alert_date);

-- Triggers for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_requests_updated_at BEFORE UPDATE ON document_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_checklists_updated_at BEFORE UPDATE ON document_checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE document_types IS 'Master catalog of all document types in the system';
COMMENT ON TABLE document_requests IS 'Smart document collection requests sent to clients';
COMMENT ON TABLE document_versions IS 'Version history for document updates (Carta-style)';
COMMENT ON TABLE document_verifications IS 'Audit trail of document verification actions (Secureframe-style)';
COMMENT ON TABLE document_checklists IS 'Service-specific document checklists (Rippling-style)';
COMMENT ON TABLE checklist_items IS 'Individual items in a document checklist';
COMMENT ON TABLE document_expiry_alerts IS 'Proactive document expiry tracking (Vanta-style)';
