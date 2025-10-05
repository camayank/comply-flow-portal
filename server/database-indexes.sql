-- Production-Ready Database Indexes for DigiComply Platform
-- Run this SQL to add performance indexes

-- OTP Store indexes
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_store(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_store(expires_at);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

-- Service requests indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Proposals indexes
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_service_request_id ON payments(service_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Referrals indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referral_codes(code);

-- Wallet transactions indexes
CREATE INDEX IF NOT EXISTS idx_wallet_txn_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_created_at ON wallet_transactions(created_at);

-- Task items indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON task_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON task_items(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON task_items(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_service_request ON task_items(related_service_request_id);

-- Integration credentials indexes
CREATE INDEX IF NOT EXISTS idx_integration_creds_client ON integration_credentials(client_id);
CREATE INDEX IF NOT EXISTS idx_integration_creds_portal ON integration_credentials(portal_type);
CREATE INDEX IF NOT EXISTS idx_integration_creds_active ON integration_credentials(is_active);

-- Government filings indexes
CREATE INDEX IF NOT EXISTS idx_gov_filings_client ON government_filings(client_id);
CREATE INDEX IF NOT EXISTS idx_gov_filings_portal ON government_filings(portal_type);
CREATE INDEX IF NOT EXISTS idx_gov_filings_status ON government_filings(status);

-- AI documents indexes
CREATE INDEX IF NOT EXISTS idx_ai_docs_client ON ai_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_docs_service_req ON ai_documents(service_request_id);
CREATE INDEX IF NOT EXISTS idx_ai_docs_created_at ON ai_documents(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_service_requests_user_status ON service_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_status_assigned ON leads(status, assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON task_items(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_payments_service_status ON payments(service_request_id, status);

-- Full-text search indexes (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_leads_company_search ON leads USING gin(to_tsvector('english', company_name));
CREATE INDEX IF NOT EXISTS idx_service_requests_search ON service_requests USING gin(to_tsvector('english', service_id));

COMMENT ON INDEX idx_otp_email IS 'Fast OTP lookup by email';
COMMENT ON INDEX idx_tasks_due_date IS 'Performance for reminder processor queries';
COMMENT ON INDEX idx_service_requests_user_status IS 'Composite index for user dashboard queries';
