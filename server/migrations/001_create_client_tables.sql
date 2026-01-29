-- Migration: Create client and compliance tables
-- Following best practices from Vanta, Drata, Secureframe architecture

-- Clients table (business entities)
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100) NOT NULL, -- 'pvt_ltd', 'llp', 'partnership', 'proprietorship'
  gstin VARCHAR(15),
  pan VARCHAR(10) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  industry VARCHAR(100),
  incorporation_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id),
  UNIQUE(gstin),
  UNIQUE(pan)
);

-- Compliance state tracking (Vanta-style compliance status)
CREATE TABLE IF NOT EXISTS client_compliance_state (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  overall_state VARCHAR(20) NOT NULL, -- 'GREEN', 'AMBER', 'RED'
  days_until_critical INTEGER NOT NULL DEFAULT 0,
  next_critical_deadline DATE,
  total_penalty_exposure DECIMAL(12,2) DEFAULT 0,
  compliant_items INTEGER DEFAULT 0,
  pending_items INTEGER DEFAULT 0,
  overdue_items INTEGER DEFAULT 0,
  calculation_metadata JSONB, -- Store calculation details
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id)
);

-- Compliance actions (tasks/todos for clients)
CREATE TABLE IF NOT EXISTS compliance_actions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'upload', 'review', 'pay', 'confirm'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  document_type VARCHAR(100),
  due_date DATE NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked'
  penalty_amount DECIMAL(12,2),
  estimated_time_minutes INTEGER,
  benefits TEXT[], -- Array of benefit strings
  instructions TEXT[], -- Step-by-step instructions
  assigned_to VARCHAR(255),
  completed_at TIMESTAMP,
  completed_by VARCHAR(255),
  metadata JSONB, -- Store additional data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document storage (Secureframe-style document tracking)
CREATE TABLE IF NOT EXISTS client_documents (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  action_id INTEGER REFERENCES compliance_actions(id) ON DELETE SET NULL,
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'local', -- 'local', 's3', 'gcs'
  checksum VARCHAR(64), -- SHA-256 hash for integrity
  encryption_status VARCHAR(50) DEFAULT 'encrypted', -- 'encrypted', 'unencrypted'
  verification_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verified_by VARCHAR(255),
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  expiry_date DATE,
  metadata JSONB,
  uploaded_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity log (Stripe-style audit trail)
CREATE TABLE IF NOT EXISTS client_activities (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL, -- 'document_uploaded', 'filing_initiated', etc.
  description TEXT NOT NULL,
  actor_id VARCHAR(255) NOT NULL, -- Who performed the action
  actor_type VARCHAR(50) DEFAULT 'user', -- 'user', 'system', 'admin'
  entity_type VARCHAR(100), -- 'document', 'action', 'payment'
  entity_id VARCHAR(255),
  metadata JSONB, -- Store activity details
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_compliance_state_client_id ON client_compliance_state(client_id);
CREATE INDEX IF NOT EXISTS idx_compliance_state_overall_state ON client_compliance_state(overall_state);
CREATE INDEX IF NOT EXISTS idx_actions_client_id ON compliance_actions(client_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON compliance_actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_due_date ON compliance_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_verification_status ON client_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_activities_client_id ON client_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON client_activities(created_at DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_state_updated_at BEFORE UPDATE ON client_compliance_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_actions_updated_at BEFORE UPDATE ON compliance_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON client_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
