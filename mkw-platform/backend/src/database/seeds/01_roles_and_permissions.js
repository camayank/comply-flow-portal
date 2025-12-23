/**
 * Seed Roles and Permissions
 * Creates default system roles with appropriate permissions
 */

exports.seed = async function(knex) {
  // Clear existing entries
  await knex('roles').del();
  
  // Define system roles with permissions
  const roles = [
    {
      name: 'super_admin',
      display_name: 'Super Administrator',
      description: 'Full system access with all permissions',
      is_system_role: true,
      permissions: JSON.stringify([
        // User Management
        'users:create', 'users:read', 'users:update', 'users:delete',
        'roles:create', 'roles:read', 'roles:update', 'roles:delete',
        
        // Service Management
        'services:create', 'services:read', 'services:update', 'services:delete',
        'service_requests:create', 'service_requests:read', 'service_requests:update', 'service_requests:delete',
        'workflows:create', 'workflows:read', 'workflows:update', 'workflows:delete',
        
        // Document Management
        'documents:create', 'documents:read', 'documents:update', 'documents:delete',
        'documents:download', 'documents:approve',
        
        // Quality Control
        'quality:read', 'quality:review', 'quality:approve', 'quality:reject',
        
        // Financial
        'payments:read', 'payments:process', 'payments:refund',
        'invoices:create', 'invoices:read', 'invoices:update',
        
        // Communication
        'notifications:send', 'communications:read', 'communications:create',
        
        // Reporting & Analytics
        'reports:read', 'reports:create', 'analytics:read',
        
        // System Configuration
        'config:read', 'config:update', 'system:maintenance',
        'audit_logs:read', 'backup:create', 'backup:restore'
      ])
    },
    
    {
      name: 'admin',
      display_name: 'Administrator',
      description: 'Administrative access with most permissions except system-level changes',
      is_system_role: true,
      permissions: JSON.stringify([
        // User Management (limited)
        'users:read', 'users:update',
        'roles:read',
        
        // Service Management
        'services:create', 'services:read', 'services:update',
        'service_requests:create', 'service_requests:read', 'service_requests:update',
        'workflows:create', 'workflows:read', 'workflows:update',
        
        // Document Management
        'documents:create', 'documents:read', 'documents:update',
        'documents:download', 'documents:approve',
        
        // Quality Control
        'quality:read', 'quality:review', 'quality:approve',
        
        // Financial
        'payments:read', 'payments:process',
        'invoices:create', 'invoices:read', 'invoices:update',
        
        // Communication
        'notifications:send', 'communications:read', 'communications:create',
        
        // Reporting
        'reports:read', 'reports:create', 'analytics:read',
        
        // Limited Config
        'config:read', 'audit_logs:read'
      ])
    },
    
    {
      name: 'operations_manager',
      display_name: 'Operations Manager',
      description: 'Manages service delivery and operations workflow',
      is_system_role: true,
      permissions: JSON.stringify([
        // Service Operations
        'service_requests:read', 'service_requests:update',
        'services:read',
        'workflows:read', 'workflows:update',
        
        // Team Management
        'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign',
        
        // Document Management
        'documents:read', 'documents:update', 'documents:download',
        
        // Quality Control
        'quality:read', 'quality:review',
        
        // Communication
        'communications:read', 'communications:create',
        'notifications:send',
        
        // Reporting
        'reports:read', 'analytics:read'
      ])
    },
    
    {
      name: 'quality_reviewer',
      display_name: 'Quality Reviewer',
      description: 'Reviews and approves service deliverables',
      is_system_role: true,
      permissions: JSON.stringify([
        // Service Review
        'service_requests:read', 'service_requests:update',
        'services:read',
        
        // Document Review
        'documents:read', 'documents:download',
        
        // Quality Control - Full Access
        'quality:read', 'quality:review', 'quality:approve', 'quality:reject',
        
        // Communication
        'communications:read', 'communications:create',
        'notifications:send',
        
        // Limited Reporting
        'reports:read'
      ])
    },
    
    {
      name: 'service_executive',
      display_name: 'Service Executive',
      description: 'Handles individual service requests and client interaction',
      is_system_role: true,
      permissions: JSON.stringify([
        // Service Execution
        'service_requests:read', 'service_requests:update',
        'services:read',
        
        // Document Management
        'documents:create', 'documents:read', 'documents:update', 'documents:download',
        
        // Task Management
        'tasks:read', 'tasks:update',
        
        // Communication
        'communications:read', 'communications:create',
        
        // Limited Quality
        'quality:read'
      ])
    },
    
    {
      name: 'finance_manager',
      display_name: 'Finance Manager',
      description: 'Manages payments, invoicing, and financial aspects',
      is_system_role: true,
      permissions: JSON.stringify([
        // Service Reading
        'service_requests:read',
        'services:read',
        
        // Financial - Full Access
        'payments:read', 'payments:process', 'payments:refund',
        'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete',
        
        // Communication
        'communications:read', 'communications:create',
        'notifications:send',
        
        // Financial Reporting
        'reports:read', 'analytics:read'
      ])
    },
    
    {
      name: 'support_agent',
      display_name: 'Support Agent',
      description: 'Provides client support and handles inquiries',
      is_system_role: false,
      permissions: JSON.stringify([
        // Service Reading
        'service_requests:read',
        'services:read',
        
        // Communication - Full
        'communications:read', 'communications:create',
        'notifications:send',
        
        // Limited Document Access
        'documents:read',
        
        // Task Reading
        'tasks:read'
      ])
    }
  ];
  
  // Insert roles
  await knex('roles').insert(roles);
  
  console.log('✅ Seeded 7 system roles with comprehensive permissions');
};