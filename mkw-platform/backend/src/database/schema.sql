-- MKW Platform Complete Database Schema
-- PostgreSQL 14+ Compatible
-- Enterprise CRM Schema with Full Relationship Management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Users table (System users)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    profile_picture_url TEXT,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'sales_rep', 'user')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    two_factor_secret VARCHAR(100),
    two_factor_enabled BOOLEAN DEFAULT false,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Accounts table (Companies/Organizations)
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'small_business' CHECK (type IN ('enterprise', 'mid_market', 'small_business', 'startup')),
    industry VARCHAR(100),
    sub_industry VARCHAR(100),
    website TEXT,
    phone VARCHAR(20),
    fax VARCHAR(20),
    email VARCHAR(255),
    
    -- Billing Address
    billing_street TEXT,
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(100) DEFAULT 'India',
    
    -- Shipping Address  
    shipping_street TEXT,
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(100) DEFAULT 'India',
    
    -- Financial Information
    annual_revenue DECIMAL(15,2),
    number_of_employees INTEGER,
    
    -- Indian Business Identifiers
    gstin VARCHAR(15),
    pan VARCHAR(10),
    cin VARCHAR(21),
    
    -- Relationship Management
    parent_account_id INTEGER REFERENCES accounts(id),
    account_source VARCHAR(50) DEFAULT 'manual' CHECK (account_source IN ('manual', 'website', 'referral', 'campaign', 'import', 'api')),
    rating VARCHAR(20) DEFAULT 'warm' CHECK (rating IN ('hot', 'warm', 'cold')),
    sla VARCHAR(50) DEFAULT 'standard' CHECK (sla IN ('premium', 'standard', 'basic')),
    tier VARCHAR(20) DEFAULT 'tier_2' CHECK (tier IN ('tier_1', 'tier_2', 'tier_3')),
    health_score INTEGER DEFAULT 75 CHECK (health_score >= 0 AND health_score <= 100),
    
    -- Ownership and Status
    owner_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
    
    -- Metadata
    description TEXT,
    notes TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Contacts table (People)
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    account_id INTEGER REFERENCES accounts(id),
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    title VARCHAR(100),
    department VARCHAR(100),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    fax VARCHAR(20),
    
    -- Address (if different from account)
    mailing_street TEXT,
    mailing_city VARCHAR(100),
    mailing_state VARCHAR(100),
    mailing_postal_code VARCHAR(20),
    mailing_country VARCHAR(100),
    
    -- Social and Professional
    linkedin_url TEXT,
    twitter_handle VARCHAR(100),
    reports_to_id INTEGER REFERENCES contacts(id),
    
    -- Relationship Data
    lead_source VARCHAR(50),
    contact_source VARCHAR(50) DEFAULT 'manual',
    is_primary_contact BOOLEAN DEFAULT false,
    is_decision_maker BOOLEAN DEFAULT false,
    authority_level VARCHAR(20) DEFAULT 'low' CHECK (authority_level IN ('high', 'medium', 'low')),
    
    -- Status and Ownership
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'opted_out')),
    owner_id INTEGER REFERENCES users(id),
    
    -- Metadata
    description TEXT,
    notes TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Opportunities table (Sales Deals)
CREATE TABLE opportunities (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    primary_contact_id INTEGER REFERENCES contacts(id),
    
    -- Opportunity Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Sales Process
    stage VARCHAR(50) DEFAULT 'prospecting' CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
    amount DECIMAL(15,2),
    probability INTEGER DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
    close_date DATE,
    stage_change_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Lead Information
    lead_source VARCHAR(50),
    opportunity_type VARCHAR(50) DEFAULT 'new_business' CHECK (opportunity_type IN ('new_business', 'existing_customer', 'renewal')),
    
    -- Campaign and Marketing
    campaign_id INTEGER, -- Will reference campaigns table
    
    -- Sales Process Details
    competitors TEXT,
    decision_process TEXT,
    next_step TEXT,
    
    -- Ownership and Assignment
    owner_id INTEGER REFERENCES users(id),
    team VARCHAR(100),
    
    -- Status and Forecasting
    is_closed BOOLEAN DEFAULT false,
    is_won BOOLEAN DEFAULT false,
    forecast_category VARCHAR(20) DEFAULT 'pipeline' CHECK (forecast_category IN ('omitted', 'pipeline', 'best_case', 'commit')),
    
    -- Metadata
    notes TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Leads table (Potential customers)
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    title VARCHAR(100),
    company VARCHAR(255),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    
    -- Address
    street TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    
    -- Lead Qualification
    lead_source VARCHAR(50),
    lead_status VARCHAR(50) DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'unqualified', 'converted')),
    rating VARCHAR(20) DEFAULT 'warm' CHECK (rating IN ('hot', 'warm', 'cold')),
    
    -- Lead Scoring
    lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    interest_level VARCHAR(20) DEFAULT 'medium' CHECK (interest_level IN ('high', 'medium', 'low')),
    budget_range VARCHAR(50),
    timeline VARCHAR(50),
    
    -- Business Information
    industry VARCHAR(100),
    annual_revenue DECIMAL(15,2),
    number_of_employees INTEGER,
    
    -- Conversion Tracking
    converted_account_id INTEGER REFERENCES accounts(id),
    converted_contact_id INTEGER REFERENCES contacts(id),
    converted_opportunity_id INTEGER REFERENCES opportunities(id),
    converted_date TIMESTAMP WITH TIME ZONE,
    
    -- Ownership
    owner_id INTEGER REFERENCES users(id),
    
    -- Metadata
    description TEXT,
    notes TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Cases table (Support tickets)
CREATE TABLE cases (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    account_id INTEGER REFERENCES accounts(id),
    contact_id INTEGER REFERENCES contacts(id),
    
    -- Case Details
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'pending', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    case_type VARCHAR(50) DEFAULT 'support' CHECK (case_type IN ('support', 'bug', 'feature_request', 'complaint')),
    
    -- Resolution
    resolution TEXT,
    resolution_date TIMESTAMP WITH TIME ZONE,
    
    -- Assignment
    owner_id INTEGER REFERENCES users(id),
    assigned_team VARCHAR(100),
    
    -- SLA Tracking
    sla_target_date TIMESTAMP WITH TIME ZONE,
    first_response_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Activities table (Tasks, Meetings, Calls, Emails)
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Activity Details
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('task', 'meeting', 'call', 'email', 'note')),
    activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled', 'deferred')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    
    -- Relationships (What/Who pattern)
    what_id INTEGER, -- Related record ID (account, opportunity, case)
    what_type VARCHAR(50), -- Type of related record
    who_id INTEGER, -- Related person ID (contact, lead)
    who_type VARCHAR(50), -- Type of related person
    
    -- Assignment
    owner_id INTEGER REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),
    
    -- Meeting/Call specific
    location TEXT,
    meeting_link TEXT,
    
    -- Metadata
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Campaigns table (Marketing campaigns)
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Campaign Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) DEFAULT 'email' CHECK (campaign_type IN ('email', 'social', 'webinar', 'event', 'content', 'paid_ads')),
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'paused', 'cancelled')),
    
    -- Timeline
    start_date DATE,
    end_date DATE,
    
    -- Budget and Goals
    budget_allocated DECIMAL(15,2),
    budget_spent DECIMAL(15,2) DEFAULT 0,
    target_leads INTEGER,
    target_opportunities INTEGER,
    target_revenue DECIMAL(15,2),
    
    -- Performance Metrics
    leads_generated INTEGER DEFAULT 0,
    opportunities_created INTEGER DEFAULT 0,
    revenue_generated DECIMAL(15,2) DEFAULT 0,
    
    -- Ownership
    owner_id INTEGER REFERENCES users(id),
    
    -- Metadata
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Services table (Service catalog)
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Service Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_code VARCHAR(50) UNIQUE,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    
    -- Pricing
    base_price DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'INR',
    billing_frequency VARCHAR(20) DEFAULT 'one_time' CHECK (billing_frequency IN ('one_time', 'monthly', 'quarterly', 'annual')),
    
    -- Service Level Agreement
    sla_hours INTEGER DEFAULT 48,
    delivery_timeline_days INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    
    -- Requirements
    requirements TEXT,
    deliverables TEXT,
    
    -- Metadata
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Service Instances table (Active service deliveries)
CREATE TABLE service_instances (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    service_id INTEGER NOT NULL REFERENCES services(id),
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    opportunity_id INTEGER REFERENCES opportunities(id),
    primary_contact_id INTEGER REFERENCES contacts(id),
    
    -- Instance Details
    instance_name VARCHAR(255),
    description TEXT,
    
    -- Pricing (can override service base price)
    agreed_price DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'INR',
    
    -- Timeline
    start_date DATE,
    planned_end_date DATE,
    actual_end_date DATE,
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'delivered', 'completed', 'cancelled', 'on_hold')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Quality and Performance
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
    client_satisfaction INTEGER CHECK (client_satisfaction >= 1 AND client_satisfaction <= 5),
    
    -- Assignment
    owner_id INTEGER REFERENCES users(id),
    assigned_team VARCHAR(100),
    
    -- Financial
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
    amount_paid DECIMAL(15,2) DEFAULT 0,
    
    -- Deliverables
    deliverables_status TEXT,
    final_deliverable_url TEXT,
    
    -- Metadata
    notes TEXT,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Documents table (File attachments)
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- File Details
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(255),
    
    -- Categorization
    document_type VARCHAR(50) DEFAULT 'general' CHECK (document_type IN ('contract', 'invoice', 'proposal', 'report', 'compliance', 'general')),
    category VARCHAR(100),
    
    -- Relationships
    related_to_id INTEGER, -- Can relate to any entity
    related_to_type VARCHAR(50), -- Entity type (account, contact, opportunity, etc.)
    
    -- Access Control
    is_public BOOLEAN DEFAULT false,
    access_level VARCHAR(20) DEFAULT 'internal' CHECK (access_level IN ('public', 'internal', 'restricted', 'confidential')),
    
    -- Metadata
    title VARCHAR(255),
    description TEXT,
    tags TEXT[],
    
    -- Ownership
    uploaded_by INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log table (System audit trail)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc.
    table_name VARCHAR(100),
    record_id INTEGER,
    record_uuid UUID,
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id UUID,
    
    -- Additional Data
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Accounts indexes
CREATE INDEX idx_accounts_name ON accounts USING gin(name gin_trgm_ops);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_industry ON accounts(industry);
CREATE INDEX idx_accounts_owner_id ON accounts(owner_id);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_created_at ON accounts(created_at);
CREATE INDEX idx_accounts_parent_id ON accounts(parent_account_id);
CREATE INDEX idx_accounts_tags ON accounts USING gin(tags);

-- Contacts indexes
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_name ON contacts(first_name, last_name);
CREATE INDEX idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX idx_contacts_status ON contacts(status);

-- Opportunities indexes
CREATE INDEX idx_opportunities_account_id ON opportunities(account_id);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_owner_id ON opportunities(owner_id);
CREATE INDEX idx_opportunities_close_date ON opportunities(close_date);
CREATE INDEX idx_opportunities_amount ON opportunities(amount);
CREATE INDEX idx_opportunities_created_at ON opportunities(created_at);
CREATE INDEX idx_opportunities_forecast ON opportunities(forecast_category);
CREATE INDEX idx_opportunities_status ON opportunities(is_closed, is_won);

-- Leads indexes
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_company ON leads USING gin(company gin_trgm_ops);
CREATE INDEX idx_leads_status ON leads(lead_status);
CREATE INDEX idx_leads_source ON leads(lead_source);
CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_score ON leads(lead_score);
CREATE INDEX idx_leads_created_at ON leads(created_at);

-- Cases indexes
CREATE INDEX idx_cases_account_id ON cases(account_id);
CREATE INDEX idx_cases_contact_id ON cases(contact_id);
CREATE INDEX idx_cases_case_number ON cases(case_number);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_priority ON cases(priority);
CREATE INDEX idx_cases_owner_id ON cases(owner_id);
CREATE INDEX idx_cases_created_at ON cases(created_at);

-- Activities indexes
CREATE INDEX idx_activities_what ON activities(what_id, what_type);
CREATE INDEX idx_activities_who ON activities(who_id, who_type);
CREATE INDEX idx_activities_owner_id ON activities(owner_id);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_date ON activities(activity_date);
CREATE INDEX idx_activities_status ON activities(status);

-- Documents indexes
CREATE INDEX idx_documents_related_to ON documents(related_to_id, related_to_type);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_instances_updated_at BEFORE UPDATE ON service_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.case_number IS NULL THEN
        NEW.case_number = 'CASE-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYY') || '-' || LPAD(nextval('case_number_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for case numbers
CREATE SEQUENCE IF NOT EXISTS case_number_seq START 1;

-- Apply case number trigger
CREATE TRIGGER generate_case_number_trigger BEFORE INSERT ON cases FOR EACH ROW EXECUTE FUNCTION generate_case_number();

-- Initial Admin User (default password: admin123 - CHANGE IN PRODUCTION)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, email_verified) 
VALUES (
    'admin',
    'admin@mkwadvisors.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBjPWP8/URcVum', -- admin123
    'System',
    'Administrator',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Sample data for development
INSERT INTO accounts (name, type, industry, website, phone, billing_city, billing_state, billing_country, owner_id) 
SELECT 
    'MKW Advisors',
    'enterprise',
    'financial_services',
    'https://mkwadvisors.com',
    '+91-99999-99999',
    'Delhi',
    'Delhi',
    'India',
    u.id
FROM users u WHERE u.email = 'admin@mkwadvisors.com'
ON CONFLICT DO NOTHING;

-- Create indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_accounts_search ON accounts USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_opportunities_search ON opportunities USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(title, '')));
CREATE INDEX IF NOT EXISTS idx_leads_search ON leads USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(company, '')));

-- Database schema version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version) VALUES ('1.0.0') ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ MKW Platform database schema created successfully!';
    RAISE NOTICE '📊 Tables: users, accounts, contacts, opportunities, leads, cases, activities, campaigns, services, service_instances';
    RAISE NOTICE '🔧 Indexes: Performance indexes created for all major queries';
    RAISE NOTICE '⚡ Triggers: Auto-update timestamps and case number generation';
    RAISE NOTICE '👤 Default admin user created (admin@mkwadvisors.com / admin123)';
    RAISE NOTICE '🚀 Ready for application deployment!';
END $$;