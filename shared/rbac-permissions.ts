/**
 * Unified RBAC Permissions Configuration
 * Shared between frontend and backend for consistent access control
 *
 * This file defines:
 * 1. All user roles and their hierarchy
 * 2. All permissions organized by resource
 * 3. Role-to-permission mappings
 * 4. Capability matrix for CRUD operations
 */

// ============================================================================
// USER ROLES
// ============================================================================

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SALES_MANAGER: 'sales_manager',
  SALES_EXECUTIVE: 'sales_executive',
  OPS_MANAGER: 'ops_manager',
  OPS_EXECUTIVE: 'ops_executive',
  OPS_LEAD: 'ops_lead',
  CUSTOMER_SERVICE: 'customer_service',
  QC_EXECUTIVE: 'qc_executive',
  ACCOUNTANT: 'accountant',
  COMPLIANCE_OFFICER: 'compliance_officer',
  HR_MANAGER: 'hr_manager',
  AGENT: 'agent',
  CLIENT: 'client',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Role hierarchy levels (higher = more privileges)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [USER_ROLES.SUPER_ADMIN]: 100,
  [USER_ROLES.ADMIN]: 90,
  [USER_ROLES.SALES_MANAGER]: 85,
  [USER_ROLES.OPS_MANAGER]: 80,
  [USER_ROLES.HR_MANAGER]: 78,
  [USER_ROLES.COMPLIANCE_OFFICER]: 75,
  [USER_ROLES.SALES_EXECUTIVE]: 70,
  [USER_ROLES.OPS_EXECUTIVE]: 68,
  [USER_ROLES.OPS_LEAD]: 65,
  [USER_ROLES.CUSTOMER_SERVICE]: 60,
  [USER_ROLES.QC_EXECUTIVE]: 55,
  [USER_ROLES.ACCOUNTANT]: 50,
  [USER_ROLES.AGENT]: 40,
  [USER_ROLES.CLIENT]: 10,
};

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export const PERMISSIONS = {
  // Authentication
  AUTH: {
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    REGISTER: 'auth:register',
    REFRESH: 'auth:refresh',
    RESET_PASSWORD: 'auth:reset_password',
  },

  // User Management
  USERS: {
    VIEW: 'users:view',
    VIEW_ALL: 'users:view_all',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DELETE: 'users:delete',
    ASSIGN_ROLES: 'users:assign_roles',
    MANAGE_PERMISSIONS: 'users:manage_permissions',
    VIEW_AUDIT_LOGS: 'users:view_audit_logs',
  },

  // Client Management
  CLIENTS: {
    VIEW_OWN: 'clients:view_own',
    VIEW_ALL: 'clients:view_all',
    CREATE: 'clients:create',
    UPDATE: 'clients:update',
    DELETE: 'clients:delete',
    MANAGE_DOCUMENTS: 'clients:manage_documents',
    VIEW_COMPLIANCE: 'clients:view_compliance',
  },

  // Service Management
  SERVICES: {
    VIEW: 'services:view',
    CREATE: 'services:create',
    UPDATE: 'services:update',
    DELETE: 'services:delete',
    CONFIGURE: 'services:configure',
    MANAGE_PRICING: 'services:manage_pricing',
    MANAGE_SLA: 'services:manage_sla',
    BULK_OPERATIONS: 'services:bulk_operations',
  },

  // Workflow Management
  WORKFLOWS: {
    VIEW: 'workflows:view',
    CREATE: 'workflows:create',
    UPDATE: 'workflows:update',
    DELETE: 'workflows:delete',
    MANAGE_TEMPLATES: 'workflows:manage_templates',
    IMPORT: 'workflows:import',
    EXPORT: 'workflows:export',
  },

  // Blueprint Management
  BLUEPRINTS: {
    VIEW: 'blueprints:view',
    CREATE: 'blueprints:create',
    UPDATE: 'blueprints:update',
    DELETE: 'blueprints:delete',
    PUBLISH: 'blueprints:publish',
    ARCHIVE: 'blueprints:archive',
  },

  // Service Requests
  SERVICE_REQUESTS: {
    VIEW_OWN: 'service_requests:view_own',
    VIEW_ASSIGNED: 'service_requests:view_assigned',
    VIEW_ALL: 'service_requests:view_all',
    CREATE: 'service_requests:create',
    UPDATE: 'service_requests:update',
    DELETE: 'service_requests:delete',
    ASSIGN: 'service_requests:assign',
    CHANGE_STATUS: 'service_requests:change_status',
    ESCALATE: 'service_requests:escalate',
  },

  // Tasks
  TASKS: {
    VIEW_OWN: 'tasks:view_own',
    VIEW_TEAM: 'tasks:view_team',
    VIEW_ALL: 'tasks:view_all',
    CREATE: 'tasks:create',
    UPDATE: 'tasks:update',
    DELETE: 'tasks:delete',
    ASSIGN: 'tasks:assign',
    COMPLETE: 'tasks:complete',
    REASSIGN: 'tasks:reassign',
  },

  // Leads & Sales
  LEADS: {
    VIEW_OWN: 'leads:view_own',
    VIEW_TEAM: 'leads:view_team',
    VIEW_ALL: 'leads:view_all',
    CREATE: 'leads:create',
    UPDATE: 'leads:update',
    DELETE: 'leads:delete',
    CONVERT: 'leads:convert',
    ASSIGN: 'leads:assign',
  },

  // Proposals
  PROPOSALS: {
    VIEW_OWN: 'proposals:view_own',
    VIEW_ALL: 'proposals:view_all',
    CREATE: 'proposals:create',
    UPDATE: 'proposals:update',
    DELETE: 'proposals:delete',
    SEND: 'proposals:send',
    APPROVE: 'proposals:approve',
  },

  // Documents
  DOCUMENTS: {
    VIEW_OWN: 'documents:view_own',
    VIEW_ALL: 'documents:view_all',
    UPLOAD: 'documents:upload',
    DOWNLOAD: 'documents:download',
    DELETE: 'documents:delete',
    VERIFY: 'documents:verify',
    SHARE: 'documents:share',
  },

  // Payments & Finance
  PAYMENTS: {
    VIEW_OWN: 'payments:view_own',
    VIEW_ALL: 'payments:view_all',
    CREATE: 'payments:create',
    PROCESS: 'payments:process',
    REFUND: 'payments:refund',
    MANAGE_INVOICES: 'payments:manage_invoices',
    VIEW_REPORTS: 'payments:view_reports',
  },

  // Compliance
  COMPLIANCE: {
    VIEW_OWN: 'compliance:view_own',
    VIEW_ALL: 'compliance:view_all',
    MANAGE: 'compliance:manage',
    UPDATE_STATUS: 'compliance:update_status',
    GENERATE_REPORTS: 'compliance:generate_reports',
    CONFIGURE_ALERTS: 'compliance:configure_alerts',
  },

  // Quality Control
  QC: {
    VIEW: 'qc:view',
    REVIEW: 'qc:review',
    APPROVE: 'qc:approve',
    REJECT: 'qc:reject',
    HANDOFF: 'qc:handoff',
    VIEW_METRICS: 'qc:view_metrics',
  },

  // Agent/Partner Management
  AGENTS: {
    VIEW_OWN: 'agents:view_own',
    VIEW_ALL: 'agents:view_all',
    CREATE: 'agents:create',
    UPDATE: 'agents:update',
    DELETE: 'agents:delete',
    MANAGE_COMMISSIONS: 'agents:manage_commissions',
    VIEW_PERFORMANCE: 'agents:view_performance',
  },

  // HR Management
  HR: {
    VIEW_EMPLOYEES: 'hr:view_employees',
    MANAGE_EMPLOYEES: 'hr:manage_employees',
    VIEW_ATTENDANCE: 'hr:view_attendance',
    MANAGE_ATTENDANCE: 'hr:manage_attendance',
    VIEW_PAYROLL: 'hr:view_payroll',
    MANAGE_PAYROLL: 'hr:manage_payroll',
    VIEW_PERFORMANCE: 'hr:view_performance',
    MANAGE_PERFORMANCE: 'hr:manage_performance',
  },

  // Analytics & Reports
  ANALYTICS: {
    VIEW_BASIC: 'analytics:view_basic',
    VIEW_ADVANCED: 'analytics:view_advanced',
    VIEW_EXECUTIVE: 'analytics:view_executive',
    EXPORT: 'analytics:export',
    CONFIGURE_DASHBOARDS: 'analytics:configure_dashboards',
  },

  // System Administration
  SYSTEM: {
    VIEW_SETTINGS: 'system:view_settings',
    MANAGE_SETTINGS: 'system:manage_settings',
    VIEW_AUDIT_LOGS: 'system:view_audit_logs',
    MANAGE_INTEGRATIONS: 'system:manage_integrations',
    MANAGE_API_KEYS: 'system:manage_api_keys',
    MANAGE_WEBHOOKS: 'system:manage_webhooks',
    MANAGE_TENANTS: 'system:manage_tenants',
    BACKUP_RESTORE: 'system:backup_restore',
  },

  // Referrals & Wallet
  REFERRALS: {
    VIEW_OWN: 'referrals:view_own',
    VIEW_ALL: 'referrals:view_all',
    CREATE: 'referrals:create',
    TRACK: 'referrals:track',
    MANAGE_REWARDS: 'referrals:manage_rewards',
  },
} as const;

// ============================================================================
// ROLE-PERMISSION MAPPINGS
// ============================================================================

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [USER_ROLES.SUPER_ADMIN]: [
    // Super Admin has ALL permissions
    ...Object.values(PERMISSIONS.AUTH),
    ...Object.values(PERMISSIONS.USERS),
    ...Object.values(PERMISSIONS.CLIENTS),
    ...Object.values(PERMISSIONS.SERVICES),
    ...Object.values(PERMISSIONS.WORKFLOWS),
    ...Object.values(PERMISSIONS.BLUEPRINTS),
    ...Object.values(PERMISSIONS.SERVICE_REQUESTS),
    ...Object.values(PERMISSIONS.TASKS),
    ...Object.values(PERMISSIONS.LEADS),
    ...Object.values(PERMISSIONS.PROPOSALS),
    ...Object.values(PERMISSIONS.DOCUMENTS),
    ...Object.values(PERMISSIONS.PAYMENTS),
    ...Object.values(PERMISSIONS.COMPLIANCE),
    ...Object.values(PERMISSIONS.QC),
    ...Object.values(PERMISSIONS.AGENTS),
    ...Object.values(PERMISSIONS.HR),
    ...Object.values(PERMISSIONS.ANALYTICS),
    ...Object.values(PERMISSIONS.SYSTEM),
    ...Object.values(PERMISSIONS.REFERRALS),
  ],

  [USER_ROLES.ADMIN]: [
    // Admin has most permissions except system-critical ones
    ...Object.values(PERMISSIONS.AUTH),
    ...Object.values(PERMISSIONS.USERS).filter(p => p !== PERMISSIONS.USERS.DELETE),
    ...Object.values(PERMISSIONS.CLIENTS),
    ...Object.values(PERMISSIONS.SERVICES),
    ...Object.values(PERMISSIONS.WORKFLOWS),
    ...Object.values(PERMISSIONS.BLUEPRINTS),
    ...Object.values(PERMISSIONS.SERVICE_REQUESTS),
    ...Object.values(PERMISSIONS.TASKS),
    ...Object.values(PERMISSIONS.LEADS),
    ...Object.values(PERMISSIONS.PROPOSALS),
    ...Object.values(PERMISSIONS.DOCUMENTS),
    ...Object.values(PERMISSIONS.PAYMENTS),
    ...Object.values(PERMISSIONS.COMPLIANCE),
    ...Object.values(PERMISSIONS.QC),
    ...Object.values(PERMISSIONS.AGENTS),
    ...Object.values(PERMISSIONS.HR),
    ...Object.values(PERMISSIONS.ANALYTICS),
    PERMISSIONS.SYSTEM.VIEW_SETTINGS,
    PERMISSIONS.SYSTEM.MANAGE_SETTINGS,
    PERMISSIONS.SYSTEM.VIEW_AUDIT_LOGS,
    PERMISSIONS.SYSTEM.MANAGE_INTEGRATIONS,
    PERMISSIONS.SYSTEM.MANAGE_API_KEYS,
    PERMISSIONS.SYSTEM.MANAGE_WEBHOOKS,
    ...Object.values(PERMISSIONS.REFERRALS),
  ],

  [USER_ROLES.SALES_MANAGER]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.CLIENTS.VIEW_ALL,
    PERMISSIONS.CLIENTS.CREATE,
    PERMISSIONS.CLIENTS.UPDATE,
    PERMISSIONS.SERVICES.VIEW,
    PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL,
    PERMISSIONS.SERVICE_REQUESTS.CREATE,
    ...Object.values(PERMISSIONS.LEADS),
    ...Object.values(PERMISSIONS.PROPOSALS),
    PERMISSIONS.DOCUMENTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.UPLOAD,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
    PERMISSIONS.PAYMENTS.VIEW_ALL,
    PERMISSIONS.ANALYTICS.VIEW_BASIC,
    PERMISSIONS.ANALYTICS.VIEW_ADVANCED,
    PERMISSIONS.AGENTS.VIEW_ALL,
    PERMISSIONS.REFERRALS.VIEW_ALL,
    PERMISSIONS.REFERRALS.MANAGE_REWARDS,
  ],

  [USER_ROLES.SALES_EXECUTIVE]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.CLIENTS.VIEW_ALL,
    PERMISSIONS.CLIENTS.CREATE,
    PERMISSIONS.CLIENTS.UPDATE,
    PERMISSIONS.SERVICES.VIEW,
    PERMISSIONS.SERVICE_REQUESTS.VIEW_ASSIGNED,
    PERMISSIONS.SERVICE_REQUESTS.CREATE,
    PERMISSIONS.LEADS.VIEW_OWN,
    PERMISSIONS.LEADS.VIEW_TEAM,
    PERMISSIONS.LEADS.CREATE,
    PERMISSIONS.LEADS.UPDATE,
    PERMISSIONS.LEADS.CONVERT,
    PERMISSIONS.PROPOSALS.VIEW_OWN,
    PERMISSIONS.PROPOSALS.CREATE,
    PERMISSIONS.PROPOSALS.UPDATE,
    PERMISSIONS.PROPOSALS.SEND,
    PERMISSIONS.DOCUMENTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.UPLOAD,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
    PERMISSIONS.ANALYTICS.VIEW_BASIC,
    PERMISSIONS.REFERRALS.VIEW_OWN,
    PERMISSIONS.REFERRALS.CREATE,
  ],

  [USER_ROLES.OPS_MANAGER]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.CLIENTS.VIEW_ALL,
    PERMISSIONS.CLIENTS.UPDATE,
    PERMISSIONS.SERVICES.VIEW,
    PERMISSIONS.WORKFLOWS.VIEW,
    ...Object.values(PERMISSIONS.SERVICE_REQUESTS),
    ...Object.values(PERMISSIONS.TASKS),
    PERMISSIONS.DOCUMENTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.UPLOAD,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
    PERMISSIONS.DOCUMENTS.VERIFY,
    ...Object.values(PERMISSIONS.COMPLIANCE),
    ...Object.values(PERMISSIONS.QC),
    PERMISSIONS.ANALYTICS.VIEW_BASIC,
    PERMISSIONS.ANALYTICS.VIEW_ADVANCED,
  ],

  [USER_ROLES.OPS_EXECUTIVE]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.CLIENTS.VIEW_ALL,
    PERMISSIONS.SERVICES.VIEW,
    PERMISSIONS.WORKFLOWS.VIEW,
    PERMISSIONS.SERVICE_REQUESTS.VIEW_ASSIGNED,
    PERMISSIONS.SERVICE_REQUESTS.UPDATE,
    PERMISSIONS.SERVICE_REQUESTS.CHANGE_STATUS,
    PERMISSIONS.TASKS.VIEW_OWN,
    PERMISSIONS.TASKS.VIEW_TEAM,
    PERMISSIONS.TASKS.UPDATE,
    PERMISSIONS.TASKS.COMPLETE,
    PERMISSIONS.DOCUMENTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.UPLOAD,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
    PERMISSIONS.DOCUMENTS.VERIFY,
    PERMISSIONS.COMPLIANCE.VIEW_ALL,
    PERMISSIONS.COMPLIANCE.UPDATE_STATUS,
    PERMISSIONS.QC.VIEW,
    PERMISSIONS.QC.REVIEW,
  ],

  [USER_ROLES.OPS_LEAD]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.CLIENTS.VIEW_ALL,
    PERMISSIONS.SERVICES.VIEW,
    PERMISSIONS.WORKFLOWS.VIEW,
    PERMISSIONS.SERVICE_REQUESTS.VIEW_ASSIGNED,
    PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL,
    PERMISSIONS.SERVICE_REQUESTS.UPDATE,
    PERMISSIONS.SERVICE_REQUESTS.CHANGE_STATUS,
    PERMISSIONS.SERVICE_REQUESTS.ASSIGN,
    PERMISSIONS.TASKS.VIEW_OWN,
    PERMISSIONS.TASKS.VIEW_TEAM,
    PERMISSIONS.TASKS.CREATE,
    PERMISSIONS.TASKS.UPDATE,
    PERMISSIONS.TASKS.COMPLETE,
    PERMISSIONS.TASKS.ASSIGN,
    PERMISSIONS.DOCUMENTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.UPLOAD,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
    PERMISSIONS.DOCUMENTS.VERIFY,
    PERMISSIONS.COMPLIANCE.VIEW_ALL,
    PERMISSIONS.COMPLIANCE.UPDATE_STATUS,
    PERMISSIONS.QC.VIEW,
    PERMISSIONS.QC.REVIEW,
    PERMISSIONS.ANALYTICS.VIEW_BASIC,
  ],

  [USER_ROLES.CUSTOMER_SERVICE]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.CLIENTS.VIEW_ALL,
    PERMISSIONS.CLIENTS.UPDATE,
    PERMISSIONS.SERVICES.VIEW,
    PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL,
    PERMISSIONS.SERVICE_REQUESTS.CREATE,
    PERMISSIONS.SERVICE_REQUESTS.UPDATE,
    PERMISSIONS.SERVICE_REQUESTS.CHANGE_STATUS,
    PERMISSIONS.TASKS.VIEW_OWN,
    PERMISSIONS.TASKS.UPDATE,
    PERMISSIONS.TASKS.COMPLETE,
    PERMISSIONS.DOCUMENTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.UPLOAD,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
    PERMISSIONS.COMPLIANCE.VIEW_ALL,
  ],

  [USER_ROLES.QC_EXECUTIVE]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.CLIENTS.VIEW_ALL,
    PERMISSIONS.SERVICES.VIEW,
    PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL,
    PERMISSIONS.SERVICE_REQUESTS.CHANGE_STATUS,
    PERMISSIONS.TASKS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
    PERMISSIONS.DOCUMENTS.VERIFY,
    ...Object.values(PERMISSIONS.QC),
  ],

  [USER_ROLES.ACCOUNTANT]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.CLIENTS.VIEW_ALL,
    PERMISSIONS.SERVICES.VIEW,
    PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
    ...Object.values(PERMISSIONS.PAYMENTS),
    PERMISSIONS.ANALYTICS.VIEW_BASIC,
    PERMISSIONS.ANALYTICS.VIEW_ADVANCED,
    PERMISSIONS.ANALYTICS.EXPORT,
  ],

  [USER_ROLES.COMPLIANCE_OFFICER]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.CLIENTS.VIEW_ALL,
    PERMISSIONS.CLIENTS.VIEW_COMPLIANCE,
    PERMISSIONS.SERVICES.VIEW,
    PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
    PERMISSIONS.DOCUMENTS.VERIFY,
    ...Object.values(PERMISSIONS.COMPLIANCE),
    PERMISSIONS.ANALYTICS.VIEW_BASIC,
    PERMISSIONS.ANALYTICS.VIEW_ADVANCED,
    PERMISSIONS.ANALYTICS.EXPORT,
  ],

  [USER_ROLES.HR_MANAGER]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.USERS.VIEW_ALL,
    ...Object.values(PERMISSIONS.HR),
    PERMISSIONS.ANALYTICS.VIEW_BASIC,
    PERMISSIONS.ANALYTICS.VIEW_ADVANCED,
    PERMISSIONS.DOCUMENTS.VIEW_ALL,
    PERMISSIONS.DOCUMENTS.UPLOAD,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
  ],

  [USER_ROLES.AGENT]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.CLIENTS.VIEW_OWN,
    PERMISSIONS.CLIENTS.CREATE,
    PERMISSIONS.SERVICES.VIEW,
    PERMISSIONS.SERVICE_REQUESTS.VIEW_OWN,
    PERMISSIONS.LEADS.VIEW_OWN,
    PERMISSIONS.LEADS.CREATE,
    PERMISSIONS.LEADS.UPDATE,
    PERMISSIONS.PROPOSALS.VIEW_OWN,
    PERMISSIONS.PROPOSALS.CREATE,
    PERMISSIONS.PROPOSALS.UPDATE,
    PERMISSIONS.PROPOSALS.SEND,
    PERMISSIONS.DOCUMENTS.VIEW_OWN,
    PERMISSIONS.DOCUMENTS.UPLOAD,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
    PERMISSIONS.AGENTS.VIEW_OWN,
    PERMISSIONS.AGENTS.VIEW_PERFORMANCE,
    PERMISSIONS.REFERRALS.VIEW_OWN,
    PERMISSIONS.REFERRALS.CREATE,
    PERMISSIONS.REFERRALS.TRACK,
    PERMISSIONS.ANALYTICS.VIEW_BASIC,
  ],

  [USER_ROLES.CLIENT]: [
    ...Object.values(PERMISSIONS.AUTH),
    PERMISSIONS.CLIENTS.VIEW_OWN,
    PERMISSIONS.SERVICES.VIEW,
    PERMISSIONS.SERVICE_REQUESTS.VIEW_OWN,
    PERMISSIONS.SERVICE_REQUESTS.CREATE,
    PERMISSIONS.TASKS.VIEW_OWN,
    PERMISSIONS.DOCUMENTS.VIEW_OWN,
    PERMISSIONS.DOCUMENTS.UPLOAD,
    PERMISSIONS.DOCUMENTS.DOWNLOAD,
    PERMISSIONS.PAYMENTS.VIEW_OWN,
    PERMISSIONS.PAYMENTS.CREATE,
    PERMISSIONS.COMPLIANCE.VIEW_OWN,
    PERMISSIONS.REFERRALS.VIEW_OWN,
    PERMISSIONS.REFERRALS.CREATE,
    PERMISSIONS.ANALYTICS.VIEW_BASIC,
  ],
};

// ============================================================================
// CAPABILITY MATRIX
// ============================================================================

export type CrudOperation = 'create' | 'read' | 'update' | 'delete';
export type ResourceCapability = Record<CrudOperation, boolean>;

export interface RoleCapabilities {
  services: ResourceCapability & { configure: boolean; manageWorkflows: boolean };
  workflows: ResourceCapability & { import: boolean; export: boolean };
  blueprints: ResourceCapability & { publish: boolean };
  users: ResourceCapability & { assignRoles: boolean };
  clients: ResourceCapability;
  tasks: ResourceCapability & { assign: boolean };
  serviceRequests: ResourceCapability & { assign: boolean; escalate: boolean };
  leads: ResourceCapability & { convert: boolean; assign: boolean };
  proposals: ResourceCapability & { approve: boolean };
  documents: ResourceCapability & { verify: boolean };
  payments: ResourceCapability & { refund: boolean };
  agents: ResourceCapability & { manageCommissions: boolean };
}

export function getRoleCapabilities(role: UserRole): RoleCapabilities {
  const permissions = ROLE_PERMISSIONS[role] || [];

  const hasPermission = (perm: string) => permissions.includes(perm);

  return {
    services: {
      create: hasPermission(PERMISSIONS.SERVICES.CREATE),
      read: hasPermission(PERMISSIONS.SERVICES.VIEW),
      update: hasPermission(PERMISSIONS.SERVICES.UPDATE),
      delete: hasPermission(PERMISSIONS.SERVICES.DELETE),
      configure: hasPermission(PERMISSIONS.SERVICES.CONFIGURE),
      manageWorkflows: hasPermission(PERMISSIONS.WORKFLOWS.MANAGE_TEMPLATES),
    },
    workflows: {
      create: hasPermission(PERMISSIONS.WORKFLOWS.CREATE),
      read: hasPermission(PERMISSIONS.WORKFLOWS.VIEW),
      update: hasPermission(PERMISSIONS.WORKFLOWS.UPDATE),
      delete: hasPermission(PERMISSIONS.WORKFLOWS.DELETE),
      import: hasPermission(PERMISSIONS.WORKFLOWS.IMPORT),
      export: hasPermission(PERMISSIONS.WORKFLOWS.EXPORT),
    },
    blueprints: {
      create: hasPermission(PERMISSIONS.BLUEPRINTS.CREATE),
      read: hasPermission(PERMISSIONS.BLUEPRINTS.VIEW),
      update: hasPermission(PERMISSIONS.BLUEPRINTS.UPDATE),
      delete: hasPermission(PERMISSIONS.BLUEPRINTS.DELETE),
      publish: hasPermission(PERMISSIONS.BLUEPRINTS.PUBLISH),
    },
    users: {
      create: hasPermission(PERMISSIONS.USERS.CREATE),
      read: hasPermission(PERMISSIONS.USERS.VIEW) || hasPermission(PERMISSIONS.USERS.VIEW_ALL),
      update: hasPermission(PERMISSIONS.USERS.UPDATE),
      delete: hasPermission(PERMISSIONS.USERS.DELETE),
      assignRoles: hasPermission(PERMISSIONS.USERS.ASSIGN_ROLES),
    },
    clients: {
      create: hasPermission(PERMISSIONS.CLIENTS.CREATE),
      read: hasPermission(PERMISSIONS.CLIENTS.VIEW_OWN) || hasPermission(PERMISSIONS.CLIENTS.VIEW_ALL),
      update: hasPermission(PERMISSIONS.CLIENTS.UPDATE),
      delete: hasPermission(PERMISSIONS.CLIENTS.DELETE),
    },
    tasks: {
      create: hasPermission(PERMISSIONS.TASKS.CREATE),
      read: hasPermission(PERMISSIONS.TASKS.VIEW_OWN) || hasPermission(PERMISSIONS.TASKS.VIEW_ALL),
      update: hasPermission(PERMISSIONS.TASKS.UPDATE),
      delete: hasPermission(PERMISSIONS.TASKS.DELETE),
      assign: hasPermission(PERMISSIONS.TASKS.ASSIGN),
    },
    serviceRequests: {
      create: hasPermission(PERMISSIONS.SERVICE_REQUESTS.CREATE),
      read: hasPermission(PERMISSIONS.SERVICE_REQUESTS.VIEW_OWN) || hasPermission(PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL),
      update: hasPermission(PERMISSIONS.SERVICE_REQUESTS.UPDATE),
      delete: hasPermission(PERMISSIONS.SERVICE_REQUESTS.DELETE),
      assign: hasPermission(PERMISSIONS.SERVICE_REQUESTS.ASSIGN),
      escalate: hasPermission(PERMISSIONS.SERVICE_REQUESTS.ESCALATE),
    },
    leads: {
      create: hasPermission(PERMISSIONS.LEADS.CREATE),
      read: hasPermission(PERMISSIONS.LEADS.VIEW_OWN) || hasPermission(PERMISSIONS.LEADS.VIEW_ALL),
      update: hasPermission(PERMISSIONS.LEADS.UPDATE),
      delete: hasPermission(PERMISSIONS.LEADS.DELETE),
      convert: hasPermission(PERMISSIONS.LEADS.CONVERT),
      assign: hasPermission(PERMISSIONS.LEADS.ASSIGN),
    },
    proposals: {
      create: hasPermission(PERMISSIONS.PROPOSALS.CREATE),
      read: hasPermission(PERMISSIONS.PROPOSALS.VIEW_OWN) || hasPermission(PERMISSIONS.PROPOSALS.VIEW_ALL),
      update: hasPermission(PERMISSIONS.PROPOSALS.UPDATE),
      delete: hasPermission(PERMISSIONS.PROPOSALS.DELETE),
      approve: hasPermission(PERMISSIONS.PROPOSALS.APPROVE),
    },
    documents: {
      create: hasPermission(PERMISSIONS.DOCUMENTS.UPLOAD),
      read: hasPermission(PERMISSIONS.DOCUMENTS.VIEW_OWN) || hasPermission(PERMISSIONS.DOCUMENTS.VIEW_ALL),
      update: hasPermission(PERMISSIONS.DOCUMENTS.UPLOAD),
      delete: hasPermission(PERMISSIONS.DOCUMENTS.DELETE),
      verify: hasPermission(PERMISSIONS.DOCUMENTS.VERIFY),
    },
    payments: {
      create: hasPermission(PERMISSIONS.PAYMENTS.CREATE),
      read: hasPermission(PERMISSIONS.PAYMENTS.VIEW_OWN) || hasPermission(PERMISSIONS.PAYMENTS.VIEW_ALL),
      update: hasPermission(PERMISSIONS.PAYMENTS.PROCESS),
      delete: false, // Payments should never be deleted
      refund: hasPermission(PERMISSIONS.PAYMENTS.REFUND),
    },
    agents: {
      create: hasPermission(PERMISSIONS.AGENTS.CREATE),
      read: hasPermission(PERMISSIONS.AGENTS.VIEW_OWN) || hasPermission(PERMISSIONS.AGENTS.VIEW_ALL),
      update: hasPermission(PERMISSIONS.AGENTS.UPDATE),
      delete: hasPermission(PERMISSIONS.AGENTS.DELETE),
      manageCommissions: hasPermission(PERMISSIONS.AGENTS.MANAGE_COMMISSIONS),
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: string[]): boolean {
  return permissions.some(perm => hasPermission(role, perm));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: string[]): boolean {
  return permissions.every(perm => hasPermission(role, perm));
}

/**
 * Get role level for hierarchy comparison
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

/**
 * Check if one role has equal or higher privileges than another
 */
export function hasEqualOrHigherRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Check if role is an admin role
 */
export function isAdminRole(role: UserRole): boolean {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN;
}

/**
 * Check if role can manage services (add/modify/delete)
 */
export function canManageServices(role: UserRole): boolean {
  return hasAnyPermission(role, [
    PERMISSIONS.SERVICES.CREATE,
    PERMISSIONS.SERVICES.UPDATE,
    PERMISSIONS.SERVICES.DELETE,
  ]);
}

/**
 * Check if role can manage workflows
 */
export function canManageWorkflows(role: UserRole): boolean {
  return hasAnyPermission(role, [
    PERMISSIONS.WORKFLOWS.CREATE,
    PERMISSIONS.WORKFLOWS.UPDATE,
    PERMISSIONS.WORKFLOWS.DELETE,
    PERMISSIONS.WORKFLOWS.MANAGE_TEMPLATES,
  ]);
}

/**
 * Get display name for role
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    [USER_ROLES.SUPER_ADMIN]: 'Super Administrator',
    [USER_ROLES.ADMIN]: 'Administrator',
    [USER_ROLES.SALES_MANAGER]: 'Sales Manager',
    [USER_ROLES.SALES_EXECUTIVE]: 'Sales Executive',
    [USER_ROLES.OPS_MANAGER]: 'Operations Manager',
    [USER_ROLES.OPS_EXECUTIVE]: 'Operations Executive',
    [USER_ROLES.OPS_LEAD]: 'Operations Lead',
    [USER_ROLES.CUSTOMER_SERVICE]: 'Customer Service',
    [USER_ROLES.QC_EXECUTIVE]: 'QC Executive',
    [USER_ROLES.ACCOUNTANT]: 'Accountant',
    [USER_ROLES.COMPLIANCE_OFFICER]: 'Compliance Officer',
    [USER_ROLES.HR_MANAGER]: 'HR Manager',
    [USER_ROLES.AGENT]: 'Agent/Partner',
    [USER_ROLES.CLIENT]: 'Client',
  };
  return displayNames[role] ?? 'User';
}

/**
 * Get all permissions for multiple roles (union)
 */
export function getPermissionsForRoles(roles: UserRole[]): string[] {
  const allPermissions = new Set<string>();
  roles.forEach(role => {
    ROLE_PERMISSIONS[role]?.forEach(perm => allPermissions.add(perm));
  });
  return Array.from(allPermissions);
}
