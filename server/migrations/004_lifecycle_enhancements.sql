/**
 * Migration 004: Business Lifecycle Enhancements
 * 
 * Adds:
 * 1. Stage transition history (audit trail)
 * 2. Business metrics tracking
 * 3. Industry-specific compliance tracking
 * 4. State-specific compliance requirements
 * 5. Risk scoring history
 */

-- 1. Client Stage History (Audit Trail)
CREATE TABLE IF NOT EXISTS client_stage_history (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  from_stage VARCHAR(50),
  to_stage VARCHAR(50) NOT NULL,
  transitioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  triggered_by VARCHAR(50) NOT NULL, -- 'system', 'user', 'compliance', 'manual'
  triggered_by_user_id VARCHAR(255),
  reason TEXT,
  metrics_snapshot JSONB, -- Capture metrics at transition time
  compliance_snapshot JSONB, -- Compliance state at transition
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stage_history_client ON client_stage_history(client_id);
CREATE INDEX idx_stage_history_transition ON client_stage_history(transitioned_at DESC);
CREATE INDEX idx_stage_history_to_stage ON client_stage_history(to_stage);

COMMENT ON TABLE client_stage_history IS 'Audit trail of lifecycle stage transitions';

-- 2. Client Business Metrics (Financial tracking)
CREATE TABLE IF NOT EXISTS client_business_metrics (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  annual_revenue DECIMAL(15,2),
  monthly_revenue DECIMAL(15,2),
  employee_count INTEGER,
  funding_raised DECIMAL(15,2),
  profitability_status VARCHAR(50), -- 'pre_revenue', 'loss_making', 'profitable'
  burn_rate DECIMAL(15,2),
  runway_months INTEGER,
  
  -- Growth metrics
  revenue_growth_rate DECIMAL(5,2), -- percentage
  employee_growth_rate DECIMAL(5,2),
  
  -- Operational metrics
  gross_margin DECIMAL(5,2),
  operating_margin DECIMAL(5,2),
  
  metadata JSONB, -- Additional custom metrics
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(client_id, metric_date)
);

CREATE INDEX idx_client_metrics_client ON client_business_metrics(client_id);
CREATE INDEX idx_client_metrics_date ON client_business_metrics(metric_date DESC);

COMMENT ON TABLE client_business_metrics IS 'Financial and operational metrics for stage determination';

-- 3. Industry-Specific Compliance Requirements
CREATE TABLE IF NOT EXISTS industry_compliance_requirements (
  id SERIAL PRIMARY KEY,
  industry_type VARCHAR(100) NOT NULL,
  compliance_category VARCHAR(100) NOT NULL,
  requirement_name VARCHAR(255) NOT NULL,
  description TEXT,
  applicable_stages TEXT[], -- Which lifecycle stages this applies to
  regulatory_authority VARCHAR(255),
  penalty_for_non_compliance TEXT,
  estimated_cost_range VARCHAR(100),
  timeline_to_complete VARCHAR(100),
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(industry_type, requirement_name)
);

CREATE INDEX idx_industry_compliance_industry ON industry_compliance_requirements(industry_type);
CREATE INDEX idx_industry_compliance_category ON industry_compliance_requirements(compliance_category);

COMMENT ON TABLE industry_compliance_requirements IS 'Industry-specific compliance requirements';

-- Seed industry-specific requirements
INSERT INTO industry_compliance_requirements (industry_type, compliance_category, requirement_name, description, applicable_stages, regulatory_authority, is_mandatory) VALUES
  ('fintech', 'licensing', 'NBFC License', 'Non-Banking Financial Company License from RBI', ARRAY['early_stage', 'growth', 'funded'], 'RBI', true),
  ('fintech', 'compliance', 'AML/KYC Policy', 'Anti-Money Laundering and Know Your Customer policies', ARRAY['formation', 'early_stage'], 'RBI', true),
  ('fintech', 'compliance', 'FEMA Compliance', 'Foreign Exchange Management Act compliance for international transactions', ARRAY['funded', 'mature'], 'RBI', true),
  
  ('healthcare', 'licensing', 'Clinical Establishment License', 'License to operate healthcare facility', ARRAY['formation', 'early_stage'], 'State Health Dept', true),
  ('healthcare', 'compliance', 'Biomedical Waste Management', 'Compliance with biomedical waste disposal regulations', ARRAY['early_stage', 'growth'], 'CPCB', true),
  
  ('ecommerce', 'compliance', 'Consumer Protection Compliance', 'Compliance with Consumer Protection Act 2019', ARRAY['early_stage', 'growth'], 'Consumer Affairs', true),
  ('ecommerce', 'licensing', 'FSSAI License', 'Food Safety License if selling food products', ARRAY['formation', 'early_stage'], 'FSSAI', false),
  
  ('manufacturing', 'licensing', 'Factory License', 'License under Factories Act', ARRAY['formation', 'early_stage'], 'State Labour Dept', true),
  ('manufacturing', 'compliance', 'Pollution Control Clearance', 'Environmental clearance from SPCB', ARRAY['formation', 'early_stage'], 'SPCB', true),
  ('manufacturing', 'compliance', 'Cost Audit', 'Mandatory cost audit for certain industries', ARRAY['growth', 'mature'], 'MCA', true)
ON CONFLICT (industry_type, requirement_name) DO NOTHING;

-- 4. State-Specific Compliance
CREATE TABLE IF NOT EXISTS state_compliance_requirements (
  id SERIAL PRIMARY KEY,
  state_code VARCHAR(10) NOT NULL, -- 'MH', 'KA', 'DL', etc.
  state_name VARCHAR(100) NOT NULL,
  compliance_category VARCHAR(100) NOT NULL,
  requirement_name VARCHAR(255) NOT NULL,
  description TEXT,
  applicable_business_types TEXT[], -- Which business types this applies to
  regulatory_authority VARCHAR(255),
  filing_frequency VARCHAR(50), -- 'monthly', 'quarterly', 'annual', 'one_time'
  penalty_for_non_compliance TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(state_code, requirement_name)
);

CREATE INDEX idx_state_compliance_state ON state_compliance_requirements(state_code);
CREATE INDEX idx_state_compliance_category ON state_compliance_requirements(compliance_category);

COMMENT ON TABLE state_compliance_requirements IS 'State-specific compliance requirements for India';

-- Seed state-specific requirements (Major states)
INSERT INTO state_compliance_requirements (state_code, state_name, compliance_category, requirement_name, description, applicable_business_types, filing_frequency, is_mandatory) VALUES
  -- Maharashtra
  ('MH', 'Maharashtra', 'labour', 'Maharashtra Shops and Establishments Act', 'Registration under Shops Act', ARRAY['all'], 'one_time', true),
  ('MH', 'Maharashtra', 'labour', 'Labour Welfare Fund', 'Contribution to Maharashtra Labour Welfare Fund', ARRAY['all'], 'annual', true),
  ('MH', 'Maharashtra', 'tax', 'Professional Tax', 'Maharashtra Professional Tax registration and filing', ARRAY['all'], 'monthly', true),
  
  -- Karnataka
  ('KA', 'Karnataka', 'labour', 'Karnataka Shops and Commercial Establishments Act', 'Registration under Shops Act', ARRAY['all'], 'one_time', true),
  ('KA', 'Karnataka', 'tax', 'Professional Tax', 'Karnataka Professional Tax', ARRAY['all'], 'monthly', true),
  ('KA', 'Karnataka', 'industrial', 'KIADB Compliance', 'Karnataka Industrial Areas Development Board compliance', ARRAY['manufacturing'], 'annual', false),
  
  -- Delhi
  ('DL', 'Delhi', 'labour', 'Delhi Shops and Establishments Act', 'Registration under Shops Act', ARRAY['all'], 'one_time', true),
  ('DL', 'Delhi', 'tax', 'VAT/CST Returns', 'Delhi VAT and CST compliance', ARRAY['all'], 'monthly', true),
  
  -- Gujarat
  ('GJ', 'Gujarat', 'labour', 'Gujarat Shops and Establishments Act', 'Registration under Shops Act', ARRAY['all'], 'one_time', true),
  ('GJ', 'Gujarat', 'tax', 'Professional Tax', 'Gujarat Professional Tax', ARRAY['all'], 'annual', true),
  
  -- Tamil Nadu
  ('TN', 'Tamil Nadu', 'labour', 'Tamil Nadu Shops and Establishments Act', 'Registration under Shops Act', ARRAY['all'], 'one_time', true),
  ('TN', 'Tamil Nadu', 'tax', 'Professional Tax', 'Tamil Nadu Professional Tax', ARRAY['all'], 'annual', true)
ON CONFLICT (state_code, requirement_name) DO NOTHING;

-- 5. Client Risk Scores
CREATE TABLE IF NOT EXISTS client_risk_scores (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Risk components (0-100, higher = more risk)
  regulatory_risk_score INTEGER NOT NULL,
  financial_risk_score INTEGER NOT NULL,
  operational_risk_score INTEGER NOT NULL,
  compliance_risk_score INTEGER NOT NULL,
  
  -- Overall risk
  overall_risk_score INTEGER NOT NULL,
  risk_level VARCHAR(50) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  
  -- Risk factors
  risk_factors JSONB NOT NULL, -- Array of {factor, severity, mitigation}
  
  -- Trending
  trend VARCHAR(50), -- 'improving', 'stable', 'deteriorating'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_risk_scores_client ON client_risk_scores(client_id);
CREATE INDEX idx_risk_scores_calculated ON client_risk_scores(calculated_at DESC);
CREATE INDEX idx_risk_scores_level ON client_risk_scores(risk_level);

COMMENT ON TABLE client_risk_scores IS 'Historical risk scoring for clients';

-- 6. Prioritized Compliance Gaps
CREATE TABLE IF NOT EXISTS compliance_gap_analysis (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  gap_type VARCHAR(50) NOT NULL, -- 'service', 'document', 'checkpoint', 'license'
  gap_identifier VARCHAR(255) NOT NULL, -- service_key or document_key
  gap_category VARCHAR(50) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  
  -- Impact
  impact_on_funding VARCHAR(50) NOT NULL, -- 'blocker', 'high', 'medium', 'low'
  impact_on_operations VARCHAR(50),
  penalty_exposure DECIMAL(15,2),
  
  -- Resolution
  deadline DATE,
  estimated_resolution_hours INTEGER,
  estimated_cost DECIMAL(15,2),
  recommended_actions JSONB, -- Array of action objects
  
  -- Status
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'waived'
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gap_analysis_client ON compliance_gap_analysis(client_id);
CREATE INDEX idx_gap_analysis_status ON compliance_gap_analysis(status);
CREATE INDEX idx_gap_analysis_category ON compliance_gap_analysis(gap_category);
CREATE INDEX idx_gap_analysis_deadline ON compliance_gap_analysis(deadline);

COMMENT ON TABLE compliance_gap_analysis IS 'Prioritized compliance gap tracking with actionable recommendations';

-- 7. Add columns to clients table for lifecycle tracking
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS current_lifecycle_stage VARCHAR(50) DEFAULT 'idea',
  ADD COLUMN IF NOT EXISTS stage_last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS industry_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funding_raised DECIMAL(15,2) DEFAULT 0;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_clients_lifecycle_stage ON clients(current_lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_clients_industry ON clients(industry_type);
CREATE INDEX IF NOT EXISTS idx_clients_state ON clients(state_code);

-- Triggers for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_client_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_metrics_updated_at
  BEFORE UPDATE ON client_business_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_client_metrics_updated_at();

CREATE TRIGGER trigger_update_gap_analysis_updated_at
  BEFORE UPDATE ON compliance_gap_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_client_metrics_updated_at();

-- Comments
COMMENT ON COLUMN clients.current_lifecycle_stage IS 'Current business lifecycle stage';
COMMENT ON COLUMN clients.stage_last_updated IS 'When lifecycle stage was last updated';
COMMENT ON COLUMN clients.industry_type IS 'Industry classification for compliance rules';
COMMENT ON COLUMN clients.state_code IS 'Primary state of operation for state-specific compliance';

-- Success message
SELECT 'Migration 004 completed successfully' AS status;
