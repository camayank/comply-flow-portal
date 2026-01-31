-- Performance Indexes for Query Optimization
-- Created: 2026-01-31
-- Purpose: Add missing indexes to frequently queried tables

-- ============================================================================
-- COMPLIANCE_TRACKING INDEXES
-- ============================================================================

-- Index for user-based queries (dashboard, filters)
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_user_id
ON compliance_tracking(user_id);

-- Index for status filtering (very common filter)
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_status
ON compliance_tracking(status);

-- Index for due date queries (upcoming deadlines)
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_due_date
ON compliance_tracking(due_date);

-- Composite index for common dashboard query pattern
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_user_status_due
ON compliance_tracking(user_id, status, due_date);

-- Index for business entity filtering
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_entity
ON compliance_tracking(business_entity_id) WHERE business_entity_id IS NOT NULL;

-- Index for priority-based sorting
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_priority
ON compliance_tracking(priority);

-- ============================================================================
-- CLIENT DOCUMENTS INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_client_documents_client_id
ON client_documents(client_id);

CREATE INDEX IF NOT EXISTS idx_client_documents_status
ON client_documents(status);

CREATE INDEX IF NOT EXISTS idx_client_documents_upload_date
ON client_documents(upload_date DESC);

-- ============================================================================
-- CLIENT SERVICES INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_client_services_client_id
ON client_services(client_id);

CREATE INDEX IF NOT EXISTS idx_client_services_status
ON client_services(status);

-- ============================================================================
-- INVOICES INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_invoices_client_id
ON invoices(client_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_issue_date
ON invoices(issue_date DESC);

-- ============================================================================
-- LEADS INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_tenant_id
ON leads(tenant_id);

CREATE INDEX IF NOT EXISTS idx_leads_stage
ON leads(stage);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
ON leads(assigned_to);

CREATE INDEX IF NOT EXISTS idx_leads_created_at
ON leads(created_at DESC);

-- ============================================================================
-- SERVICE REQUESTS INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_service_requests_client_id
ON service_requests(client_id);

CREATE INDEX IF NOT EXISTS idx_service_requests_status
ON service_requests(status);

CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_to
ON service_requests(assigned_to);

-- ============================================================================
-- BUSINESS ENTITIES INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_business_entities_tenant_id
ON business_entities(tenant_id);

CREATE INDEX IF NOT EXISTS idx_business_entities_pan
ON business_entities(pan) WHERE pan IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_entities_gstin
ON business_entities(gstin) WHERE gstin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_entities_status
ON business_entities(status);

-- ============================================================================
-- USERS INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_is_active
ON users(is_active) WHERE is_active = true;

-- ============================================================================
-- CLIENT ACTIVITIES INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_client_activities_client_id
ON client_activities(client_id);

CREATE INDEX IF NOT EXISTS idx_client_activities_created_at
ON client_activities(created_at DESC);

-- ============================================================================
-- COMPLIANCE STATE HISTORY INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_compliance_state_history_entity
ON compliance_state_history(entity_id);

CREATE INDEX IF NOT EXISTS idx_compliance_state_history_created
ON compliance_state_history(created_at DESC);

-- Analysis comments
COMMENT ON INDEX idx_compliance_tracking_user_status_due IS 'Composite index for common dashboard query: SELECT * FROM compliance_tracking WHERE user_id = ? AND status = ? ORDER BY due_date';
