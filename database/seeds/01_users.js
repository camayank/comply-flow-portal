/**
 * Seed file for users, roles, and permissions
 * Creates default roles, permissions, and admin users for the system
 */

const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Clear existing data in reverse order of dependencies
  await knex('user_roles').del();
  await knex('role_permissions').del();
  await knex('users').del();
  await knex('permissions').del();
  await knex('roles').del();

  // =====================================================
  // 1. INSERT ROLES
  // =====================================================
  const roles = [
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'super_admin',
      description: 'Super Administrator with full system access'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'admin',
      description: 'Administrator with management access'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'sales_manager',
      description: 'Sales Manager with sales portal access'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'sales_executive',
      description: 'Sales Executive with lead management access'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'ops_manager',
      description: 'Operations Manager with full ops access'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'ops_executive',
      description: 'Operations Executive with task management access'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'customer_service',
      description: 'Customer Service with support access'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'qc_executive',
      description: 'QC Executive with quality control access'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'accountant',
      description: 'Accountant with financial access'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'client',
      description: 'Client with client portal access'
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'agent',
      description: 'Agent/Partner with agent portal access'
    }
  ];

  await knex('roles').insert(roles);

  // =====================================================
  // 2. INSERT PERMISSIONS
  // =====================================================
  const permissions = [
    // User Management
    { id: knex.raw('uuid_generate_v4()'), name: 'users.view', resource: 'users', action: 'view', description: 'View users' },
    { id: knex.raw('uuid_generate_v4()'), name: 'users.create', resource: 'users', action: 'create', description: 'Create users' },
    { id: knex.raw('uuid_generate_v4()'), name: 'users.update', resource: 'users', action: 'update', description: 'Update users' },
    { id: knex.raw('uuid_generate_v4()'), name: 'users.delete', resource: 'users', action: 'delete', description: 'Delete users' },

    // Client Management
    { id: knex.raw('uuid_generate_v4()'), name: 'clients.view', resource: 'clients', action: 'view', description: 'View clients' },
    { id: knex.raw('uuid_generate_v4()'), name: 'clients.create', resource: 'clients', action: 'create', description: 'Create clients' },
    { id: knex.raw('uuid_generate_v4()'), name: 'clients.update', resource: 'clients', action: 'update', description: 'Update clients' },
    { id: knex.raw('uuid_generate_v4()'), name: 'clients.delete', resource: 'clients', action: 'delete', description: 'Delete clients' },

    // Sales Management
    { id: knex.raw('uuid_generate_v4()'), name: 'leads.view', resource: 'leads', action: 'view', description: 'View leads' },
    { id: knex.raw('uuid_generate_v4()'), name: 'leads.create', resource: 'leads', action: 'create', description: 'Create leads' },
    { id: knex.raw('uuid_generate_v4()'), name: 'leads.update', resource: 'leads', action: 'update', description: 'Update leads' },
    { id: knex.raw('uuid_generate_v4()'), name: 'leads.delete', resource: 'leads', action: 'delete', description: 'Delete leads' },
    { id: knex.raw('uuid_generate_v4()'), name: 'proposals.view', resource: 'proposals', action: 'view', description: 'View proposals' },
    { id: knex.raw('uuid_generate_v4()'), name: 'proposals.create', resource: 'proposals', action: 'create', description: 'Create proposals' },
    { id: knex.raw('uuid_generate_v4()'), name: 'proposals.update', resource: 'proposals', action: 'update', description: 'Update proposals' },
    { id: knex.raw('uuid_generate_v4()'), name: 'proposals.delete', resource: 'proposals', action: 'delete', description: 'Delete proposals' },

    // Operations Management
    { id: knex.raw('uuid_generate_v4()'), name: 'tasks.view', resource: 'tasks', action: 'view', description: 'View tasks' },
    { id: knex.raw('uuid_generate_v4()'), name: 'tasks.create', resource: 'tasks', action: 'create', description: 'Create tasks' },
    { id: knex.raw('uuid_generate_v4()'), name: 'tasks.update', resource: 'tasks', action: 'update', description: 'Update tasks' },
    { id: knex.raw('uuid_generate_v4()'), name: 'tasks.delete', resource: 'tasks', action: 'delete', description: 'Delete tasks' },
    { id: knex.raw('uuid_generate_v4()'), name: 'workflows.view', resource: 'workflows', action: 'view', description: 'View workflows' },
    { id: knex.raw('uuid_generate_v4()'), name: 'workflows.create', resource: 'workflows', action: 'create', description: 'Create workflows' },
    { id: knex.raw('uuid_generate_v4()'), name: 'workflows.update', resource: 'workflows', action: 'update', description: 'Update workflows' },
    { id: knex.raw('uuid_generate_v4()'), name: 'workflows.delete', resource: 'workflows', action: 'delete', description: 'Delete workflows' },

    // Payment Management
    { id: knex.raw('uuid_generate_v4()'), name: 'payments.view', resource: 'payments', action: 'view', description: 'View payments' },
    { id: knex.raw('uuid_generate_v4()'), name: 'payments.create', resource: 'payments', action: 'create', description: 'Create payments' },
    { id: knex.raw('uuid_generate_v4()'), name: 'invoices.view', resource: 'invoices', action: 'view', description: 'View invoices' },
    { id: knex.raw('uuid_generate_v4()'), name: 'invoices.create', resource: 'invoices', action: 'create', description: 'Create invoices' },

    // Reports & Analytics
    { id: knex.raw('uuid_generate_v4()'), name: 'reports.view', resource: 'reports', action: 'view', description: 'View reports' },
    { id: knex.raw('uuid_generate_v4()'), name: 'analytics.view', resource: 'analytics', action: 'view', description: 'View analytics' },

    // Settings Management
    { id: knex.raw('uuid_generate_v4()'), name: 'settings.view', resource: 'settings', action: 'view', description: 'View settings' },
    { id: knex.raw('uuid_generate_v4()'), name: 'settings.update', resource: 'settings', action: 'update', description: 'Update settings' },

    // Audit Logs
    { id: knex.raw('uuid_generate_v4()'), name: 'audit_logs.view', resource: 'audit_logs', action: 'view', description: 'View audit logs' }
  ];

  await knex('permissions').insert(permissions);

  // =====================================================
  // 3. GET ROLE AND PERMISSION IDs FOR MAPPING
  // =====================================================
  const rolesData = await knex('roles').select('id', 'name');
  const permissionsData = await knex('permissions').select('id', 'name');

  const roleMap = {};
  rolesData.forEach(role => {
    roleMap[role.name] = role.id;
  });

  const permissionMap = {};
  permissionsData.forEach(perm => {
    permissionMap[perm.name] = perm.id;
  });

  // =====================================================
  // 4. MAP PERMISSIONS TO ROLES
  // =====================================================
  const rolePermissions = [];

  // Super Admin gets ALL permissions
  Object.values(permissionMap).forEach(permId => {
    rolePermissions.push({
      role_id: roleMap['super_admin'],
      permission_id: permId
    });
  });

  // Admin gets most permissions (excluding some sensitive operations)
  const adminPermissions = Object.keys(permissionMap).filter(p => !p.includes('delete'));
  adminPermissions.forEach(permName => {
    rolePermissions.push({
      role_id: roleMap['admin'],
      permission_id: permissionMap[permName]
    });
  });

  // Sales Manager permissions
  const salesPermissions = [
    'clients.view', 'clients.create', 'clients.update',
    'leads.view', 'leads.create', 'leads.update', 'leads.delete',
    'proposals.view', 'proposals.create', 'proposals.update', 'proposals.delete',
    'reports.view', 'analytics.view'
  ];
  salesPermissions.forEach(permName => {
    if (permissionMap[permName]) {
      rolePermissions.push({
        role_id: roleMap['sales_manager'],
        permission_id: permissionMap[permName]
      });
    }
  });

  // Operations Manager permissions
  const opsManagerPermissions = [
    'clients.view', 'clients.update',
    'tasks.view', 'tasks.create', 'tasks.update', 'tasks.delete',
    'workflows.view', 'workflows.create', 'workflows.update',
    'reports.view', 'analytics.view'
  ];
  opsManagerPermissions.forEach(permName => {
    if (permissionMap[permName]) {
      rolePermissions.push({
        role_id: roleMap['ops_manager'],
        permission_id: permissionMap[permName]
      });
    }
  });

  // Sales Executive permissions
  const salesExecPermissions = [
    'clients.view', 'clients.create',
    'leads.view', 'leads.create', 'leads.update',
    'proposals.view', 'proposals.create', 'proposals.update',
    'reports.view'
  ];
  salesExecPermissions.forEach(permName => {
    if (permissionMap[permName]) {
      rolePermissions.push({
        role_id: roleMap['sales_executive'],
        permission_id: permissionMap[permName]
      });
    }
  });

  // Operations Executive permissions
  const opsExecPermissions = [
    'clients.view',
    'tasks.view', 'tasks.create', 'tasks.update',
    'workflows.view',
    'reports.view'
  ];
  opsExecPermissions.forEach(permName => {
    if (permissionMap[permName]) {
      rolePermissions.push({
        role_id: roleMap['ops_executive'],
        permission_id: permissionMap[permName]
      });
    }
  });

  // Customer Service permissions
  const customerServicePermissions = [
    'clients.view', 'clients.update',
    'tasks.view', 'tasks.create', 'tasks.update',
    'reports.view'
  ];
  customerServicePermissions.forEach(permName => {
    if (permissionMap[permName]) {
      rolePermissions.push({
        role_id: roleMap['customer_service'],
        permission_id: permissionMap[permName]
      });
    }
  });

  // QC Executive permissions
  const qcPermissions = [
    'clients.view',
    'tasks.view', 'tasks.create', 'tasks.update',
    'workflows.view',
    'reports.view'
  ];
  qcPermissions.forEach(permName => {
    if (permissionMap[permName]) {
      rolePermissions.push({
        role_id: roleMap['qc_executive'],
        permission_id: permissionMap[permName]
      });
    }
  });

  // Accountant permissions
  const accountantPermissions = [
    'clients.view',
    'invoices.view', 'invoices.create',
    'payments.view', 'payments.create',
    'reports.view', 'analytics.view'
  ];
  accountantPermissions.forEach(permName => {
    if (permissionMap[permName]) {
      rolePermissions.push({
        role_id: roleMap['accountant'],
        permission_id: permissionMap[permName]
      });
    }
  });

  // Client permissions (view only for their own data)
  const clientPermissions = [
    'clients.view',
    'invoices.view',
    'payments.view'
  ];
  clientPermissions.forEach(permName => {
    if (permissionMap[permName]) {
      rolePermissions.push({
        role_id: roleMap['client'],
        permission_id: permissionMap[permName]
      });
    }
  });

  // Agent permissions
  const agentPermissions = [
    'leads.view', 'leads.create',
    'proposals.view', 'proposals.create',
    'reports.view'
  ];
  agentPermissions.forEach(permName => {
    if (permissionMap[permName]) {
      rolePermissions.push({
        role_id: roleMap['agent'],
        permission_id: permissionMap[permName]
      });
    }
  });

  await knex('role_permissions').insert(rolePermissions);

  // =====================================================
  // 5. CREATE DEFAULT USERS FOR ALL ROLES
  // =====================================================
  const users = [
    // Super Admin
    {
      id: knex.raw('uuid_generate_v4()'),
      email: 'admin@complyflow.com',
      password_hash: await bcrypt.hash('Admin@123', 10),
      first_name: 'System',
      last_name: 'Administrator',
      phone: '+919876543210',
      is_active: true,
      email_verified: true
    },
    // Sales Manager
    {
      id: knex.raw('uuid_generate_v4()'),
      email: 'sales@complyflow.com',
      password_hash: await bcrypt.hash('Sales@123', 10),
      first_name: 'Sales',
      last_name: 'Manager',
      phone: '+919876543211',
      is_active: true,
      email_verified: true
    },
    // Sales Executive
    {
      id: knex.raw('uuid_generate_v4()'),
      email: 'salesexec@complyflow.com',
      password_hash: await bcrypt.hash('SalesExec@123', 10),
      first_name: 'Rahul',
      last_name: 'Sharma',
      phone: '+919876543220',
      is_active: true,
      email_verified: true
    },
    // Operations Manager
    {
      id: knex.raw('uuid_generate_v4()'),
      email: 'ops@complyflow.com',
      password_hash: await bcrypt.hash('Ops@123', 10),
      first_name: 'Operations',
      last_name: 'Manager',
      phone: '+919876543212',
      is_active: true,
      email_verified: true
    },
    // Operations Executive
    {
      id: knex.raw('uuid_generate_v4()'),
      email: 'opsexec@complyflow.com',
      password_hash: await bcrypt.hash('OpsExec@123', 10),
      first_name: 'Priya',
      last_name: 'Verma',
      phone: '+919876543221',
      is_active: true,
      email_verified: true
    },
    // Customer Service
    {
      id: knex.raw('uuid_generate_v4()'),
      email: 'support@complyflow.com',
      password_hash: await bcrypt.hash('Support@123', 10),
      first_name: 'Support',
      last_name: 'Team',
      phone: '+919876543222',
      is_active: true,
      email_verified: true
    },
    // QC Executive
    {
      id: knex.raw('uuid_generate_v4()'),
      email: 'qc@complyflow.com',
      password_hash: await bcrypt.hash('Qc@123', 10),
      first_name: 'Quality',
      last_name: 'Controller',
      phone: '+919876543223',
      is_active: true,
      email_verified: true
    },
    // Accountant
    {
      id: knex.raw('uuid_generate_v4()'),
      email: 'accounts@complyflow.com',
      password_hash: await bcrypt.hash('Accounts@123', 10),
      first_name: 'Finance',
      last_name: 'Team',
      phone: '+919876543224',
      is_active: true,
      email_verified: true
    },
    // Client
    {
      id: knex.raw('uuid_generate_v4()'),
      email: 'client@complyflow.com',
      password_hash: await bcrypt.hash('Client@123', 10),
      first_name: 'Demo',
      last_name: 'Client',
      phone: '+919876543225',
      is_active: true,
      email_verified: true
    },
    // Agent
    {
      id: knex.raw('uuid_generate_v4()'),
      email: 'agent@complyflow.com',
      password_hash: await bcrypt.hash('Agent@123', 10),
      first_name: 'Partner',
      last_name: 'Agent',
      phone: '+919876543226',
      is_active: true,
      email_verified: true
    }
  ];

  await knex('users').insert(users);

  // =====================================================
  // 6. ASSIGN ROLES TO USERS
  // =====================================================
  const usersData = await knex('users').select('id', 'email');
  const userMap = {};
  usersData.forEach(user => {
    userMap[user.email] = user.id;
  });

  const userRoles = [
    {
      user_id: userMap['admin@complyflow.com'],
      role_id: roleMap['super_admin']
    },
    {
      user_id: userMap['sales@complyflow.com'],
      role_id: roleMap['sales_manager']
    },
    {
      user_id: userMap['salesexec@complyflow.com'],
      role_id: roleMap['sales_executive']
    },
    {
      user_id: userMap['ops@complyflow.com'],
      role_id: roleMap['ops_manager']
    },
    {
      user_id: userMap['opsexec@complyflow.com'],
      role_id: roleMap['ops_executive']
    },
    {
      user_id: userMap['support@complyflow.com'],
      role_id: roleMap['customer_service']
    },
    {
      user_id: userMap['qc@complyflow.com'],
      role_id: roleMap['qc_executive']
    },
    {
      user_id: userMap['accounts@complyflow.com'],
      role_id: roleMap['accountant']
    },
    {
      user_id: userMap['client@complyflow.com'],
      role_id: roleMap['client']
    },
    {
      user_id: userMap['agent@complyflow.com'],
      role_id: roleMap['agent']
    }
  ];

  await knex('user_roles').insert(userRoles);

  console.log('✓ Users seed completed: 11 roles, 35 permissions, 10 default users');
};
