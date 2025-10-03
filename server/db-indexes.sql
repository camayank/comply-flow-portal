-- Performance Optimization: Database Indexes for Frequently Queried Columns
-- These indexes significantly improve query performance for filtering and searching
-- Run this after db:push to add indexes to existing tables

-- ============ LEADS TABLE INDEXES ============
-- Improve filtering by leadStage, leadSource, and preSalesExecutive
CREATE INDEX IF NOT EXISTS idx_leads_lead_stage ON leads(lead_stage);
CREATE INDEX IF NOT EXISTS idx_leads_lead_source ON leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_leads_pre_sales_executive ON leads(pre_sales_executive);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Text search optimization (using trigram indexes for ILIKE queries)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_leads_client_name_trgm ON leads USING gin(client_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_contact_email_trgm ON leads USING gin(contact_email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_contact_phone_trgm ON leads USING gin(contact_phone gin_trgm_ops);

-- ============ PROPOSALS TABLE INDEXES ============
-- Improve filtering by proposalStatus and salesExecutive
CREATE INDEX IF NOT EXISTS idx_proposals_status ON sales_proposals(proposal_status);
CREATE INDEX IF NOT EXISTS idx_proposals_executive ON sales_proposals(sales_executive);
CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON sales_proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON sales_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_payment_received ON sales_proposals(payment_received);

-- ============ SERVICE REQUESTS TABLE INDEXES ============
-- Improve filtering by status, priority, businessEntityId
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_priority ON service_requests(priority);
CREATE INDEX IF NOT EXISTS idx_service_requests_business_entity_id ON service_requests(business_entity_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_service_id ON service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_sla_deadline ON service_requests(sla_deadline);

-- Text search for service IDs
CREATE INDEX IF NOT EXISTS idx_service_requests_service_id_trgm ON service_requests USING gin(service_id gin_trgm_ops);

-- ============ BUSINESS ENTITIES TABLE INDEXES ============
-- Improve filtering and searching
CREATE INDEX IF NOT EXISTS idx_business_entities_user_id ON business_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_business_entities_entity_type ON business_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_business_entities_is_active ON business_entities(is_active);
CREATE INDEX IF NOT EXISTS idx_business_entities_created_at ON business_entities(created_at DESC);

-- Text search for entity names, PAN, GST
CREATE INDEX IF NOT EXISTS idx_business_entities_name_trgm ON business_entities USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_business_entities_pan_trgm ON business_entities USING gin(pan gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_business_entities_gstin_trgm ON business_entities USING gin(gstin gin_trgm_ops);

-- ============ PAYMENTS TABLE INDEXES ============
-- Improve filtering by status and serviceRequestId
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_service_request_id ON payments(service_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_mode ON payments(payment_mode);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ============ DOCUMENTS UPLOADS TABLE INDEXES ============
-- Improve filtering for file management
CREATE INDEX IF NOT EXISTS idx_documents_entity_id ON documents_uploads(entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_service_request_id ON documents_uploads(service_request_id);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents_uploads(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents_uploads(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents_uploads(created_at DESC);

-- ============ COMPOSITE INDEXES ============
-- For common query patterns that filter by multiple columns
CREATE INDEX IF NOT EXISTS idx_leads_stage_source ON leads(lead_stage, lead_source);
CREATE INDEX IF NOT EXISTS idx_proposals_status_executive ON sales_proposals(proposal_status, sales_executive);
CREATE INDEX IF NOT EXISTS idx_service_requests_status_priority ON service_requests(status, priority);
CREATE INDEX IF NOT EXISTS idx_service_requests_entity_status ON service_requests(business_entity_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_service_status ON payments(service_request_id, status);

-- ============ PERFORMANCE NOTES ============
-- 1. Indexes speed up SELECT queries but slightly slow down INSERT/UPDATE/DELETE
-- 2. For tables with heavy writes, consider selective indexing
-- 3. Trigram indexes (gin_trgm_ops) enable fast ILIKE searches but use more storage
-- 4. Monitor index usage with: SELECT * FROM pg_stat_user_indexes;
-- 5. Remove unused indexes with: DROP INDEX IF EXISTS index_name;
