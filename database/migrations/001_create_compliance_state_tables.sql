-- Migration: Create Compliance State Engine Tables
-- Version: 001
-- Description: Adds state-tracking infrastructure for compliance monitoring

-- ============================================================================
-- 1. COMPLIANCE STATES (Current state snapshot)
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_states (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  
  -- Overall state
  overall_state TEXT NOT NULL CHECK (overall_state IN ('GREEN', 'AMBER', 'RED')),
  overall_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
  
  -- Metrics
  total_penalty_exposure NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_overdue_items INTEGER NOT NULL DEFAULT 0,
  total_upcoming_items INTEGER NOT NULL DEFAULT 0,
  
  -- Next critical action
  next_critical_deadline TIMESTAMP,
  next_critical_action TEXT,
  days_until_next_deadline INTEGER,
  
  -- Domain-level states (JSON)
  domain_states JSONB,
  
  -- Individual requirement states (JSON)
  requirement_states JSONB,
  
  -- Calculation metadata
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  calculation_version TEXT NOT NULL DEFAULT '1.0.0',
  data_completeness_score NUMERIC(5,2) DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_entity FOREIGN KEY (entity_id) 
    REFERENCES business_entities(id) ON DELETE CASCADE,
  CONSTRAINT unique_entity_state UNIQUE (entity_id)
);

-- Indexes
CREATE INDEX idx_compliance_states_entity ON compliance_states(entity_id);
CREATE INDEX idx_compliance_states_overall_state ON compliance_states(overall_state);
CREATE INDEX idx_compliance_states_next_deadline ON compliance_states(next_critical_deadline);
CREATE INDEX idx_compliance_states_risk_score ON compliance_states(overall_risk_score DESC);

-- ============================================================================
-- 2. COMPLIANCE STATE HISTORY (Time-series tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_state_history (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  
  -- State snapshot
  state TEXT NOT NULL CHECK (state IN ('GREEN', 'AMBER', 'RED')),
  risk_score NUMERIC(5,2) NOT NULL,
  penalty_exposure NUMERIC(12,2) NOT NULL,
  overdue_items INTEGER NOT NULL,
  
  -- Full snapshot
  snapshot_data JSONB,
  
  -- Timestamp
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_entity_history FOREIGN KEY (entity_id) 
    REFERENCES business_entities(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_state_history_entity ON compliance_state_history(entity_id);
CREATE INDEX idx_state_history_time ON compliance_state_history(recorded_at DESC);
CREATE INDEX idx_state_history_entity_time ON compliance_state_history(entity_id, recorded_at DESC);

-- ============================================================================
-- 3. COMPLIANCE RULES (Configurable rule engine)
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_rules (
  id SERIAL PRIMARY KEY,
  rule_id TEXT NOT NULL UNIQUE,
  rule_name TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('CORPORATE', 'TAX_GST', 'TAX_INCOME', 'LABOUR', 'FEMA', 'LICENSES', 'STATUTORY')),
  
  -- Applicability criteria
  applicable_entity_types JSONB,
  turnover_min NUMERIC(15,2),
  turnover_max NUMERIC(15,2),
  employee_count_min INTEGER,
  requires_gst BOOLEAN DEFAULT FALSE,
  requires_pf BOOLEAN DEFAULT FALSE,
  requires_esi BOOLEAN DEFAULT FALSE,
  state_specific BOOLEAN DEFAULT FALSE,
  applicable_states JSONB,
  
  -- Timing
  frequency TEXT NOT NULL CHECK (frequency IN ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'EVENT_BASED')),
  due_date_logic TEXT NOT NULL,
  grace_days INTEGER DEFAULT 0,
  
  -- Risk assessment
  penalty_per_day NUMERIC(10,2),
  max_penalty NUMERIC(12,2),
  criticality_score INTEGER NOT NULL CHECK (criticality_score BETWEEN 1 AND 10),
  
  -- State thresholds
  amber_threshold_days INTEGER NOT NULL DEFAULT 7,
  red_threshold_days INTEGER NOT NULL DEFAULT 0,
  
  -- Dependencies
  required_documents JSONB,
  depends_on_rules JSONB,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMP,
  
  -- Metadata
  description TEXT,
  help_text TEXT,
  reference_url TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER
);

-- Indexes
CREATE INDEX idx_compliance_rules_rule_id ON compliance_rules(rule_id);
CREATE INDEX idx_compliance_rules_domain ON compliance_rules(domain);
CREATE INDEX idx_compliance_rules_active ON compliance_rules(is_active);
CREATE INDEX idx_compliance_rules_domain_active ON compliance_rules(domain, is_active);

-- ============================================================================
-- 4. COMPLIANCE ALERTS (State-triggered notifications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_alerts (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  rule_id TEXT NOT NULL,
  
  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('UPCOMING', 'OVERDUE', 'PENALTY_RISK', 'STATE_CHANGE', 'DOCUMENT_MISSING')),
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_required TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMP,
  acknowledged_by INTEGER,
  
  -- Timing
  triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  -- Associated data
  metadata JSONB,
  
  -- Constraints
  CONSTRAINT fk_entity_alert FOREIGN KEY (entity_id) 
    REFERENCES business_entities(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_compliance_alerts_entity ON compliance_alerts(entity_id);
CREATE INDEX idx_compliance_alerts_active ON compliance_alerts(is_active);
CREATE INDEX idx_compliance_alerts_severity ON compliance_alerts(severity);
CREATE INDEX idx_compliance_alerts_entity_active ON compliance_alerts(entity_id, is_active);
CREATE INDEX idx_compliance_alerts_entity_severity ON compliance_alerts(entity_id, severity, is_active);

-- ============================================================================
-- 5. STATE CALCULATION LOG (Debugging and audit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS state_calculation_log (
  id SERIAL PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  
  -- Calculation details
  calculation_version TEXT NOT NULL,
  calculation_time_ms INTEGER NOT NULL,
  rules_applied INTEGER NOT NULL,
  
  -- Results
  previous_state TEXT CHECK (previous_state IN ('GREEN', 'AMBER', 'RED')),
  new_state TEXT NOT NULL CHECK (new_state IN ('GREEN', 'AMBER', 'RED')),
  state_changed BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Issues
  errors_count INTEGER NOT NULL DEFAULT 0,
  warnings_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  warnings JSONB,
  
  -- Metadata
  triggered_by TEXT NOT NULL,
  input_data_hash TEXT,
  
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_entity_log FOREIGN KEY (entity_id) 
    REFERENCES business_entities(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_calculation_log_entity ON state_calculation_log(entity_id);
CREATE INDEX idx_calculation_log_time ON state_calculation_log(calculated_at DESC);
CREATE INDEX idx_calculation_log_entity_time ON state_calculation_log(entity_id, calculated_at DESC);
CREATE INDEX idx_calculation_log_errors ON state_calculation_log(errors_count) WHERE errors_count > 0;

-- ============================================================================
-- 6. TRIGGERS for auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_compliance_states_updated_at
  BEFORE UPDATE ON compliance_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_rules_updated_at
  BEFORE UPDATE ON compliance_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. COMMENTS for documentation
-- ============================================================================

COMMENT ON TABLE compliance_states IS 'Current compliance state snapshot for each business entity';
COMMENT ON TABLE compliance_state_history IS 'Time-series history of compliance state changes';
COMMENT ON TABLE compliance_rules IS 'Configurable rules that drive state calculations';
COMMENT ON TABLE compliance_alerts IS 'Active alerts triggered by state changes or thresholds';
COMMENT ON TABLE state_calculation_log IS 'Audit log of all state calculations for debugging';

COMMENT ON COLUMN compliance_states.overall_state IS 'GREEN=compliant, AMBER=action needed soon, RED=overdue/critical';
COMMENT ON COLUMN compliance_states.overall_risk_score IS 'Weighted risk score 0-100 across all domains';
COMMENT ON COLUMN compliance_states.domain_states IS 'JSON array of state for each compliance domain';
COMMENT ON COLUMN compliance_states.requirement_states IS 'JSON array of state for individual requirements';

-- ============================================================================
-- DONE
-- ============================================================================

-- Verify tables created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('compliance_states', 'compliance_state_history', 'compliance_rules', 'compliance_alerts', 'state_calculation_log')
ORDER BY table_name;
