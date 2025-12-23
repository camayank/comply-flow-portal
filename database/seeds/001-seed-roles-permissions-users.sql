-- =======================================================================
-- Seed Data: Roles, Permissions, and Initial Users
-- File: 001-seed-roles-permissions-users.sql
-- Description: Seeds roles, permissions, and default users
-- Date: November 2025
-- =======================================================================

-- =======================================================================
-- 1. SEED ROLES
-- =======================================================================

INSERT INTO roles (id, name, description) VALUES
('11111111-1111-1111-1111-111111111111', 'super_admin', 'Super Administrator with full system access'),
('22222222-2222-2222-2222-222222222222', 'admin', 'Administrator with management access'),
('33333333-3333-3333-3333-333333333333', 'sales_manager', 'Sales Manager with sales team access'),
('44444444-4444-4444-4444-444444444444', 'sales_executive', 'Sales Executive with lead management'),
('55555555-5555-5555-5555-555555555555', 'operations_manager', 'Operations Manager with task oversight'),
('66666666-6666-6666-6666-666666666666', 'operations_executive', 'Operations Executive with task execution'),
('77777777-7777-7777-7777-777777777777', 'client', 'Client user with client portal access'),
('88888888-8888-8888-8888-888888888888', 'agent_partner', 'Agent/Partner with referral access'),
('99999999-9999-9999-9999-999999999999', 'accountant', 'Accountant with financial access'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'compliance_officer', 'Compliance Officer with compliance access')
ON CONFLICT (id) DO NOTHING;

-- =======================================================================
-- 2. SEED PERMISSIONS
-- =======================================================================

-- Authentication Permissions
INSERT INTO permissions (name, resource, action, description) VALUES
('auth.login', 'auth', 'login', 'Login to the system'),
('auth.register', 'auth', 'register', 'Register new account'),
('auth.logout', 'auth', 'logout', 'Logout from system'),
('auth.refresh', 'auth', 'refresh', 'Refresh authentication token')
ON CONFLICT (name) DO NOTHING;

-- Client Management Permissions
INSERT INTO permissions (name, resource, action, description) VALUES
('client.view', 'client', 'view', 'View client information'),
('client.create', 'client', 'create', 'Create new client'),
('client.edit', 'client', 'edit', 'Edit client information'),
('client.delete', 'client', 'delete', 'Delete client'),
('client.dashboard', 'client', 'dashboard', 'Access client dashboard'),
('client.services', 'client', 'services', 'View client services'),
('client.documents', 'client', 'documents', 'Manage client documents')
ON CONFLICT (name) DO NOTHING;

-- Sales Permissions
INSERT INTO permissions (name, resource, action, description) VALUES
('sales.view_leads', 'sales', 'view_leads', 'View sales leads'),
('sales.create_lead', 'sales', 'create_lead', 'Create new lead'),
('sales.edit_lead', 'sales', 'edit_lead', 'Edit lead information'),
('sales.delete_lead', 'sales', 'delete_lead', 'Delete lead'),
('sales.convert_lead', 'sales', 'convert_lead', 'Convert lead to client'),
('sales.view_pipeline', 'sales', 'view_pipeline', 'View sales pipeline'),
('sales.manage_proposals', 'sales', 'manage_proposals', 'Manage proposals')
ON CONFLICT (name) DO NOTHING;

-- Operations Permissions
INSERT INTO permissions (name, resource, action, description) VALUES
('operations.view_tasks', 'operations', 'view_tasks', 'View tasks'),
('operations.create_task', 'operations', 'create_task', 'Create new task'),
('operations.edit_task', 'operations', 'edit_task', 'Edit task'),
('operations.delete_task', 'operations', 'delete_task', 'Delete task'),
('operations.assign_task', 'operations', 'assign_task', 'Assign task to user'),
('operations.complete_task', 'operations', 'complete_task', 'Mark task as complete'),
('operations.view_workflows', 'operations', 'view_workflows', 'View workflows'),
('operations.manage_filings', 'operations', 'manage_filings', 'Manage government filings')
ON CONFLICT (name) DO NOTHING;

-- Admin Permissions
INSERT INTO permissions (name, resource, action, description) VALUES
('admin.view_users', 'admin', 'view_users', 'View all users'),
('admin.create_user', 'admin', 'create_user', 'Create new user'),
('admin.edit_user', 'admin', 'edit_user', 'Edit user information'),
('admin.delete_user', 'admin', 'delete_user', 'Delete user'),
('admin.manage_roles', 'admin', 'manage_roles', 'Manage roles and permissions'),
('admin.view_audit_logs', 'admin', 'view_audit_logs', 'View audit logs'),
('admin.manage_settings', 'admin', 'manage_settings', 'Manage system settings'),
('admin.view_analytics', 'admin', 'view_analytics', 'View analytics and reports'),
('admin.manage_services', 'admin', 'manage_services', 'Manage service catalog'),
('admin.manage_agents', 'admin', 'manage_agents', 'Manage agents and partners')
ON CONFLICT (name) DO NOTHING;

-- Payment Permissions
INSERT INTO permissions (name, resource, action, description) VALUES
('payment.view', 'payment', 'view', 'View payment information'),
('payment.create', 'payment', 'create', 'Create payment'),
('payment.process', 'payment', 'process', 'Process payment'),
('payment.refund', 'payment', 'refund', 'Process refund'),
('payment.view_invoices', 'payment', 'view_invoices', 'View invoices')
ON CONFLICT (name) DO NOTHING;

-- Document Permissions
INSERT INTO permissions (name, resource, action, description) VALUES
('document.view', 'document', 'view', 'View documents'),
('document.upload', 'document', 'upload', 'Upload documents'),
('document.download', 'document', 'download', 'Download documents'),
('document.delete', 'document', 'delete', 'Delete documents')
ON CONFLICT (name) DO NOTHING;

-- =======================================================================
-- 3. ASSIGN PERMISSIONS TO ROLES
-- =======================================================================

-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM permissions
ON CONFLICT DO NOTHING;

-- Admin gets most permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', id FROM permissions
WHERE name NOT LIKE 'admin.delete_user'
ON CONFLICT DO NOTHING;

-- Sales Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333', id FROM permissions
WHERE resource IN ('auth', 'sales', 'client', 'document')
  OR name IN ('payment.view', 'payment.view_invoices')
ON CONFLICT DO NOTHING;

-- Sales Executive permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '44444444-4444-4444-4444-444444444444', id FROM permissions
WHERE resource IN ('auth', 'sales', 'document')
  AND name NOT IN ('sales.delete_lead')
ON CONFLICT DO NOTHING;

-- Operations Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '55555555-5555-5555-5555-555555555555', id FROM permissions
WHERE resource IN ('auth', 'operations', 'client', 'document')
ON CONFLICT DO NOTHING;

-- Operations Executive permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '66666666-6666-6666-6666-666666666666', id FROM permissions
WHERE resource IN ('auth', 'operations', 'document')
  AND name NOT IN ('operations.delete_task', 'operations.assign_task')
ON CONFLICT DO NOTHING;

-- Client permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '77777777-7777-7777-7777-777777777777', id FROM permissions
WHERE resource IN ('auth', 'client', 'payment', 'document')
  AND action IN ('view', 'dashboard', 'services', 'documents', 'upload', 'download')
ON CONFLICT DO NOTHING;

-- Agent/Partner permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '88888888-8888-8888-8888-888888888888', id FROM permissions
WHERE name IN ('auth.login', 'auth.logout', 'sales.create_lead', 'sales.view_leads')
ON CONFLICT DO NOTHING;

-- =======================================================================
-- 4. SEED DEFAULT USERS
-- =======================================================================
-- Default password for all users: Admin@123 (hashed with bcrypt)

INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_active, email_verified) VALUES
-- Super Admin
('a0000000-0000-0000-0000-000000000001',
 'superadmin@complyflow.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7dqm3PUWU6',
 'Super', 'Admin', '+919876543210', true, true),

-- Admin
('a0000000-0000-0000-0000-000000000002',
 'admin@complyflow.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7dqm3PUWU6',
 'Admin', 'User', '+919876543211', true, true),

-- Sales Manager
('a0000000-0000-0000-0000-000000000003',
 'sales.manager@complyflow.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7dqm3PUWU6',
 'Sales', 'Manager', '+919876543212', true, true),

-- Sales Executive
('a0000000-0000-0000-0000-000000000004',
 'sales.exec@complyflow.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7dqm3PUWU6',
 'Sales', 'Executive', '+919876543213', true, true),

-- Operations Manager
('a0000000-0000-0000-0000-000000000005',
 'ops.manager@complyflow.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7dqm3PUWU6',
 'Operations', 'Manager', '+919876543214', true, true),

-- Operations Executive
('a0000000-0000-0000-0000-000000000006',
 'ops.exec@complyflow.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7dqm3PUWU6',
 'Operations', 'Executive', '+919876543215', true, true),

-- Demo Client
('a0000000-0000-0000-0000-000000000007',
 'client.demo@example.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7dqm3PUWU6',
 'Demo', 'Client', '+919876543216', true, true),

-- Demo Agent
('a0000000-0000-0000-0000-000000000008',
 'agent.demo@example.com',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7dqm3PUWU6',
 'Demo', 'Agent', '+919876543217', true, true)
ON CONFLICT (id) DO NOTHING;

-- =======================================================================
-- 5. ASSIGN ROLES TO USERS
-- =======================================================================

INSERT INTO user_roles (user_id, role_id) VALUES
('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'), -- Super Admin
('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222'), -- Admin
('a0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333'), -- Sales Manager
('a0000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444'), -- Sales Executive
('a0000000-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555'), -- Operations Manager
('a0000000-0000-0000-0000-000000000006', '66666666-6666-6666-6666-666666666666'), -- Operations Executive
('a0000000-0000-0000-0000-000000000007', '77777777-7777-7777-7777-777777777777'), -- Client
('a0000000-0000-0000-0000-000000000008', '88888888-8888-8888-8888-888888888888')  -- Agent
ON CONFLICT DO NOTHING;

-- =======================================================================
-- 6. CREATE DEMO CLIENT RECORD
-- =======================================================================

INSERT INTO clients (id, user_id, company_name, contact_person, email, phone, address, city, state, country, postal_code, status) VALUES
('c0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000007',
 'Demo Company Pvt Ltd',
 'Demo Client',
 'client.demo@example.com',
 '+919876543216',
 '123 Demo Street, Demo Area',
 'Mumbai',
 'Maharashtra',
 'India',
 '400001',
 'active')
ON CONFLICT (id) DO NOTHING;

-- =======================================================================
-- 7. CREATE DEMO AGENT RECORD
-- =======================================================================

INSERT INTO agents (id, user_id, company_name, contact_person, email, phone, commission_rate, status) VALUES
('g0000000-0000-0000-0000-000000000001',
 'a0000000-0000-0000-0000-000000000008',
 'Demo Agent Partners',
 'Demo Agent',
 'agent.demo@example.com',
 '+919876543217',
 10.00,
 'active')
ON CONFLICT (id) DO NOTHING;

-- =======================================================================
-- SEED COMPLETE
-- =======================================================================
