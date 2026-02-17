/**
 * Role-Based Routing Utility
 * WordPress-style role-based dashboard routing
 */

import {
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  Workflow,
  BarChart3,
  Settings,
  Shield,
  TrendingUp,
  DollarSign,
  Bot,
  UserPlus,
  Target,
  PieChart,
  ListTodo,
  ShieldCheck,
  FolderOpen,
  CheckSquare,
  Building2,
  ShoppingCart,
  Headphones,
  Calendar,
  Wallet,
  Share2,
  Home,
  type LucideIcon
} from 'lucide-react';

// Icon mapping from string names to Lucide components
export const iconMap: Record<string, LucideIcon> = {
  'LayoutDashboard': LayoutDashboard,
  'Users': Users,
  'FileText': FileText,
  'Briefcase': Briefcase,
  'Workflow': Workflow,
  'BarChart3': BarChart3,
  'Settings': Settings,
  'Shield': Shield,
  'TrendingUp': TrendingUp,
  'DollarSign': DollarSign,
  'Bot': Bot,
  'UserPlus': UserPlus,
  'Target': Target,
  'PieChart': PieChart,
  'ListTodo': ListTodo,
  'ShieldCheck': ShieldCheck,
  'FolderOpen': FolderOpen,
  'CheckSquare': CheckSquare,
  'Building2': Building2,
  'ShoppingCart': ShoppingCart,
  'Headphones': Headphones,
  'Calendar': Calendar,
  'Wallet': Wallet,
  'Share2': Share2,
  'Home': Home,
};

/**
 * User Roles Definition
 *
 * ROLE HIERARCHY:
 * - super_admin (100): Full platform access, multi-tenant management
 * - admin (90): Single-tenant administration, user/service management
 * - sales_manager (85): Sales team lead, pipeline analytics
 * - ops_manager (80): Operations team lead, work assignment
 * - sales_executive (75): Individual sales contributor
 * - ops_executive (70): Standard operations role (PREFERRED)
 * - customer_service (60): Client support and ticket handling
 * - qc_executive (55): Quality control and review
 * - accountant (50): Financial operations
 * - agent (40): External sales agent/partner
 * - client (10): End customer
 *
 * NOTE: ops_exec and ops_lead are aliases for ops_executive (legacy support)
 * New implementations should use OPS_EXECUTIVE
 */
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SALES_MANAGER: 'sales_manager',
  SALES_EXECUTIVE: 'sales_executive',
  OPS_MANAGER: 'ops_manager',
  OPS_EXECUTIVE: 'ops_executive', // Preferred operations role
  OPS_EXEC: 'ops_exec',           // Legacy alias for ops_executive
  OPS_LEAD: 'ops_lead',           // Legacy alias for ops_executive
  CUSTOMER_SERVICE: 'customer_service',
  QC_EXECUTIVE: 'qc_executive',
  ACCOUNTANT: 'accountant',
  AGENT: 'agent',
  CLIENT: 'client',
} as const;

// Role hierarchy levels (matches server/middleware/rbac.ts)
export const ROLE_LEVELS: Record<string, number> = {
  'super_admin': 100,
  'admin': 90,
  'sales_manager': 85,
  'ops_manager': 80,
  'sales_executive': 75,
  'ops_executive': 70,
  'ops_exec': 70,
  'ops_lead': 70,
  'customer_service': 60,
  'qc_executive': 55,
  'accountant': 50,
  'agent': 40,
  'client': 10,
};

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Get the default dashboard route for a user role
 * Similar to WordPress wp_redirect after login
 */
export function getRoleDashboardRoute(role: string): string {
  const normalizedRole = role.toLowerCase();

  switch (normalizedRole) {
    case USER_ROLES.SUPER_ADMIN:
      return '/super-admin';

    case USER_ROLES.ADMIN:
      return '/admin';

    case USER_ROLES.SALES_MANAGER:
      return '/sales';

    case USER_ROLES.SALES_EXECUTIVE:
      return '/sales';

    case USER_ROLES.OPS_MANAGER:
    case USER_ROLES.OPS_EXECUTIVE:
    case USER_ROLES.OPS_EXEC:
    case USER_ROLES.OPS_LEAD:
      return '/operations';

    case USER_ROLES.CUSTOMER_SERVICE:
      return '/customer-service';

    case USER_ROLES.QC_EXECUTIVE:
      return '/qc-dashboard';

    case USER_ROLES.ACCOUNTANT:
      return '/financial-management';

    case USER_ROLES.AGENT:
      return '/agent';

    case USER_ROLES.CLIENT:
      return '/portal-v2';

    default:
      // Default fallback based on role level
      const level = ROLE_LEVELS[normalizedRole] || 0;
      if (level >= 90) return '/admin';
      if (level >= 50) return '/operations';
      if (level >= 40) return '/agent';
      return '/portal-v2';
  }
}

/**
 * Get allowed routes for a user role
 * Used for route protection and navigation filtering
 * PRODUCTION READY - Comprehensive route access control
 */
export function getAllowedRoutes(role: string): string[] {
  const normalizedRole = role.toLowerCase();

  // Common routes available to all authenticated users
  const commonRoutes = [
    '/profile',
    '/settings',
    '/config',
    '/configuration',
    '/notifications',
    '/my-dashboard',
    '/role-dashboard',
  ];

  switch (normalizedRole) {
    case USER_ROLES.SUPER_ADMIN:
      // Super admin can access everything
      return [
        '/',
        '/hub',
        '/dev',
        '/admin',
        '/admin-control',
        '/admin-config',
        '/admin/dashboard',
        '/admin/users',
        '/admin/reports',
        '/admin/services',
        '/admin/clients',
        '/admin/blueprints',
        '/admin/webhooks',
        '/admin/api-keys',
        '/admin/access-reviews',
        '/admin/config',
        '/admin/workflow-import',
        '/operations',
        '/ops',
        '/agent',
        '/agent/dashboard',
        '/agent/leads',
        '/agent/commissions',
        '/agent/performance',
        '/agent/profile',
        '/agents',
        '/agent-portal',
        '/partner',
        '/partners',
        '/client-portal',
        '/portal',
        '/portal-v2',
        '/user-management',
        '/workflows',
        '/automation',
        '/analytics',
        '/executive-dashboard',
        '/business-intelligence',
        '/bi',
        '/insights',
        '/financial-management',
        '/financials',
        '/revenue-analytics',
        '/hr',
        '/hr-dashboard',
        '/human-resources',
        '/client-master',
        '/clients',
        '/client-management',
        '/qc',
        '/qc-dashboard',
        '/quality-control',
        '/qc-delivery-handoff',
        '/delivery-handoff',
        '/quality-metrics',
        '/qc-metrics',
        '/autocomply',
        '/taxtracker',
        '/tax',
        '/tax-management',
        '/digiscore',
        '/compliance-score',
        '/score',
        '/tasks',
        '/task-management',
        '/my-tasks',
        '/documents',
        '/document-upload',
        '/ai-documents',
        '/doc-prep',
        '/document-preparation',
        '/doc-generator',
        '/services',
        '/service-catalog',
        '/browse-services',
        '/services-management',
        '/manage-services',
        '/service-requests',
        '/requests',
        '/my-requests',
        '/service-request',
        '/leads',
        '/lead-management',
        '/lead-pipeline',
        '/pipeline',
        '/crm',
        '/proposals',
        '/proposal-management',
        '/pre-sales',
        '/sales-proposals',
        '/referrals',
        '/referral-dashboard',
        '/wallet',
        '/compliance-dashboard',
        '/compliance-calendar',
        '/compliance-management',
        '/compliance-admin',
        '/compliance-ops',
        '/lifecycle',
        '/lifecycle-dashboard',
        '/super-admin',
        '/super-admin/dashboard',
        '/super-admin/tenants',
        '/super-admin/pricing',
        '/super-admin/commissions',
        '/super-admin/security',
        '/super-admin/operations',
        '/super-admin/analytics',
        '/super-admin/services',
        '/super-admin/integrations',
        '/super-admin/health',
        '/customer-service',
        '/status-management',
        '/workflow-statuses',
        '/work-queue',
        '/ops/work-queue',
        '/operations-queue',
        '/workflow-import',
        '/workflow-dashboard',
        '/sync',
        '/blueprint',
        '/master-blueprint',
        '/delivery',
        '/vault',
        '/esign-agreements',
        '/founder',
        '/compliance-state',
        '/my-services',
        '/client/services',
        '/service-tracker',
        ...commonRoutes,
      ];

    case USER_ROLES.ADMIN:
      return [
        '/',
        '/hub',
        '/dev',
        '/admin',
        '/admin-control',
        '/admin-config',
        '/admin/dashboard',
        '/admin/users',
        '/admin/reports',
        '/admin/services',
        '/admin/clients',
        '/admin/blueprints',
        '/admin/webhooks',
        '/admin/api-keys',
        '/admin/access-reviews',
        '/admin/config',
        '/admin/workflow-import',
        '/operations',
        '/ops',
        '/user-management',
        '/workflows',
        '/automation',
        '/analytics',
        '/executive-dashboard',
        '/business-intelligence',
        '/bi',
        '/insights',
        '/financial-management',
        '/financials',
        '/revenue-analytics',
        '/hr',
        '/hr-dashboard',
        '/human-resources',
        '/client-master',
        '/clients',
        '/client-management',
        '/qc',
        '/qc-dashboard',
        '/quality-control',
        '/qc-delivery-handoff',
        '/delivery-handoff',
        '/quality-metrics',
        '/qc-metrics',
        '/autocomply',
        '/taxtracker',
        '/tax',
        '/tax-management',
        '/digiscore',
        '/compliance-score',
        '/score',
        '/tasks',
        '/task-management',
        '/my-tasks',
        '/documents',
        '/document-upload',
        '/ai-documents',
        '/doc-prep',
        '/document-preparation',
        '/doc-generator',
        '/services',
        '/service-catalog',
        '/browse-services',
        '/services-management',
        '/manage-services',
        '/service-requests',
        '/requests',
        '/my-requests',
        '/service-request',
        '/leads',
        '/lead-management',
        '/lead-pipeline',
        '/pipeline',
        '/crm',
        '/proposals',
        '/proposal-management',
        '/pre-sales',
        '/sales-proposals',
        '/compliance-dashboard',
        '/compliance-calendar',
        '/compliance-management',
        '/compliance-admin',
        '/compliance-ops',
        '/lifecycle',
        '/lifecycle-dashboard',
        '/status-management',
        '/workflow-statuses',
        '/work-queue',
        '/ops/work-queue',
        '/operations-queue',
        '/workflow-import',
        '/workflow-dashboard',
        '/sync',
        '/blueprint',
        '/master-blueprint',
        '/delivery',
        '/vault',
        '/esign-agreements',
        ...commonRoutes,
      ];

    case USER_ROLES.SALES_MANAGER:
      // Sales Manager - Full sales pipeline, team management, forecasting
      return [
        '/',
        '/sales',
        '/sales/dashboard',
        '/sales/pipeline',
        '/sales/team',
        '/sales/forecasts',
        '/sales/targets',
        '/sales/reports',
        '/leads',
        '/lead-management',
        '/lead-pipeline',
        '/pipeline',
        '/crm',
        '/proposals',
        '/proposal-management',
        '/pre-sales',
        '/sales-proposals',
        '/client-master',
        '/clients',
        '/client-management',
        '/services',
        '/service-catalog',
        '/browse-services',
        '/analytics',
        '/executive-dashboard',
        '/financial-management', // Read-only for commission/revenue
        '/tasks',
        '/task-management',
        '/my-tasks',
        '/referrals',
        '/referral-dashboard',
        ...commonRoutes,
      ];

    case USER_ROLES.SALES_EXECUTIVE:
      // Sales Executive - Lead management, proposals, personal targets
      return [
        '/',
        '/sales',
        '/sales/dashboard',
        '/sales/pipeline',
        '/sales/my-leads',
        '/sales/my-targets',
        '/leads',
        '/lead-management',
        '/lead-pipeline',
        '/pipeline',
        '/crm',
        '/proposals',
        '/proposal-management',
        '/pre-sales',
        '/sales-proposals',
        '/client-master',
        '/clients',
        '/services',
        '/service-catalog',
        '/browse-services',
        '/tasks',
        '/task-management',
        '/my-tasks',
        '/referrals',
        ...commonRoutes,
      ];

    case USER_ROLES.OPS_MANAGER:
      // Ops Manager has additional team management and analytics access
      return [
        '/',
        '/operations',
        '/ops',
        '/tasks',
        '/task-management',
        '/my-tasks',
        '/service-requests',
        '/requests',
        '/my-requests',
        '/service-request',
        '/documents',
        '/document-upload',
        '/qc',
        '/qc-dashboard',
        '/quality-control',
        '/qc-delivery-handoff',
        '/delivery-handoff',
        '/quality-metrics',
        '/qc-metrics',
        '/client-master',
        '/clients',
        '/client-management',
        '/work-queue',
        '/ops/work-queue',
        '/operations-queue',
        '/delivery',
        '/compliance-management',
        '/compliance-ops',
        '/vault',
        // Manager-specific: team management and analytics
        '/analytics',
        '/executive-dashboard',
        '/status-management',
        '/workflow-statuses',
        '/financial-management', // Read-only financial overview
        ...commonRoutes,
      ];

    case USER_ROLES.OPS_EXECUTIVE:
    case USER_ROLES.OPS_EXEC:
    case USER_ROLES.OPS_LEAD:
      return [
        '/',
        '/operations',
        '/ops',
        '/tasks',
        '/task-management',
        '/my-tasks',
        '/service-requests',
        '/requests',
        '/my-requests',
        '/service-request',
        '/documents',
        '/document-upload',
        '/qc',
        '/qc-dashboard',
        '/quality-control',
        '/quality-metrics',
        '/qc-metrics',
        '/client-master',
        '/clients',
        '/client-management',
        '/work-queue',
        '/ops/work-queue',
        '/operations-queue',
        '/delivery',
        '/compliance-management',
        '/compliance-ops',
        '/vault',
        ...commonRoutes,
      ];

    case USER_ROLES.CUSTOMER_SERVICE:
      return [
        '/',
        '/operations',
        '/ops',
        '/customer-service',
        '/tasks',
        '/task-management',
        '/my-tasks',
        '/service-requests',
        '/requests',
        '/my-requests',
        '/client-master',
        '/clients',
        '/client-management',
        '/documents',
        '/work-queue',
        '/ops/work-queue',
        ...commonRoutes,
      ];

    case USER_ROLES.QC_EXECUTIVE:
      return [
        '/',
        '/qc',
        '/qc-dashboard',
        '/quality-control',
        '/qc-delivery-handoff',
        '/delivery-handoff',
        '/quality-metrics',
        '/qc-metrics',
        '/tasks',
        '/task-management',
        '/my-tasks',
        '/service-requests',
        '/requests',
        '/documents',
        '/delivery',
        '/client-master',
        '/clients',
        ...commonRoutes,
      ];

    case USER_ROLES.ACCOUNTANT:
      return [
        '/',
        '/financial-management',
        '/financials',
        '/revenue-analytics',
        '/tasks',
        '/task-management',
        '/my-tasks',
        '/service-requests',
        '/requests',
        '/client-master',
        '/clients',
        '/documents',
        ...commonRoutes,
      ];

    case USER_ROLES.AGENT:
      return [
        '/',
        '/agent',
        '/agent/dashboard',
        '/agent/leads',
        '/agent/commissions',
        '/agent/performance',
        '/agent/profile',
        '/agents',
        '/agent-portal',
        '/partner',
        '/partners',
        '/leads',
        '/lead-management',
        '/proposals',
        '/proposal-management',
        '/sales-proposals', // Added: sales proposal creation
        '/pre-sales', // Added: pre-sales management
        '/referrals',
        '/referral-dashboard',
        '/wallet',
        '/tasks',
        '/task-management',
        '/my-tasks',
        '/services',
        '/service-catalog',
        '/browse-services', // Added: browse services for proposals
        ...commonRoutes,
      ];

    case USER_ROLES.CLIENT:
      return [
        '/',
        '/client-portal',
        '/portal',
        '/portal-v2',
        '/services',
        '/service-catalog',
        '/browse-services',
        '/service-requests',
        '/requests',
        '/my-requests',
        '/service-request',
        '/my-services',
        '/client/services',
        '/service-tracker',
        '/documents',
        '/document-upload',
        '/referrals',
        '/referral-dashboard',
        '/wallet',
        '/tasks',
        '/task-management',
        '/my-tasks',
        '/compliance-dashboard',
        '/compliance-calendar',
        '/payment-gateway',
        '/lifecycle',
        '/lifecycle-dashboard',
        '/digiscore',
        '/compliance-score',
        '/score',
        '/taxtracker',
        '/tax',
        '/vault',
        '/esign-agreements',
        '/founder',
        '/compliance-state',
        '/client-profile',
        // Support & Help
        '/support', // Added: client support access
        '/help', // Added: help center
        '/tickets', // Added: view own support tickets
        '/autocomply', // Added: AI compliance assistant
        ...commonRoutes,
      ];

    default:
      return ['/', ...commonRoutes];
  }
}

/**
 * Check if a user role can access a specific route
 */
export function canAccessRoute(role: string, route: string): boolean {
  const allowedRoutes = getAllowedRoutes(role);
  
  // Check exact match or if route starts with allowed route
  return allowedRoutes.some(allowedRoute => 
    route === allowedRoute || route.startsWith(allowedRoute + '/')
  );
}

/**
 * Get role-specific navigation items
 * Returns navigation menu items based on user role
 */
export function getRoleNavigation(role: string) {
  const normalizedRole = role.toLowerCase();
  
  switch (normalizedRole) {
    case USER_ROLES.SUPER_ADMIN:
    case USER_ROLES.ADMIN:
      return [
        { label: 'Dashboard', path: '/admin', icon: 'LayoutDashboard' },
        { label: 'Services', path: '/admin', section: 'services', icon: 'Briefcase' },
        { label: 'Workflows', path: '/admin', section: 'workflows', icon: 'Workflow' },
        { label: 'Analytics', path: '/admin', section: 'analytics', icon: 'BarChart3' },
        { label: 'Users', path: '/admin', section: 'users', icon: 'Users' },
        { label: 'Configuration', path: '/admin', section: 'config', icon: 'Settings' },
        { label: 'Roles & Permissions', path: '/admin', section: 'roles', icon: 'Shield' },
        { label: 'Executive Dashboard', path: '/executive-dashboard', icon: 'TrendingUp' },
        { label: 'Financial Management', path: '/financial-management', icon: 'DollarSign' },
        { label: 'AI Products', path: '/autocomply', icon: 'Bot' },
      ];

    case USER_ROLES.SALES_MANAGER:
      return [
        { label: 'Dashboard', path: '/sales', icon: 'LayoutDashboard' },
        { label: 'Pipeline', path: '/sales', section: 'pipeline', icon: 'TrendingUp' },
        { label: 'Leads', path: '/leads', icon: 'UserPlus' },
        { label: 'Proposals', path: '/proposals', icon: 'FileText' },
        { label: 'Team', path: '/sales', section: 'team', icon: 'Users' },
        { label: 'Targets', path: '/sales', section: 'targets', icon: 'Target' },
        { label: 'Forecasts', path: '/sales', section: 'forecasts', icon: 'BarChart3' },
        { label: 'Analytics', path: '/analytics', icon: 'PieChart' },
      ];

    case USER_ROLES.SALES_EXECUTIVE:
      return [
        { label: 'Dashboard', path: '/sales', icon: 'LayoutDashboard' },
        { label: 'My Pipeline', path: '/sales', section: 'my-pipeline', icon: 'TrendingUp' },
        { label: 'My Leads', path: '/leads', icon: 'UserPlus' },
        { label: 'Proposals', path: '/proposals', icon: 'FileText' },
        { label: 'My Targets', path: '/sales', section: 'my-targets', icon: 'Target' },
        { label: 'Clients', path: '/client-master', icon: 'Building2' },
        { label: 'Services', path: '/service-catalog', icon: 'ShoppingCart' },
      ];

    case USER_ROLES.OPS_MANAGER:
      return [
        { label: 'Dashboard', path: '/operations', icon: 'LayoutDashboard' },
        { label: 'Active Services', path: '/operations', section: 'active-services', icon: 'Briefcase' },
        { label: 'Team Management', path: '/operations', section: 'team', icon: 'Users' },
        { label: 'Work Queue', path: '/work-queue', icon: 'ListTodo' },
        { label: 'Service Requests', path: '/service-requests', icon: 'FileText' },
        { label: 'Quality Control', path: '/qc-dashboard', icon: 'ShieldCheck' },
        { label: 'Analytics', path: '/analytics', icon: 'BarChart3' },
        { label: 'Documents', path: '/documents', icon: 'FolderOpen' },
      ];

    case USER_ROLES.OPS_EXECUTIVE:
    case USER_ROLES.OPS_EXEC:
    case USER_ROLES.OPS_LEAD:
      return [
        { label: 'Dashboard', path: '/operations', icon: 'LayoutDashboard' },
        { label: 'Active Services', path: '/operations', section: 'active-services', icon: 'Briefcase' },
        { label: 'My Tasks', path: '/tasks', icon: 'CheckSquare' },
        { label: 'Service Requests', path: '/service-requests', icon: 'FileText' },
        { label: 'Quality Control', path: '/qc-dashboard', icon: 'ShieldCheck' },
        { label: 'Team', path: '/operations', section: 'team', icon: 'Users' },
        { label: 'Documents', path: '/documents', icon: 'FolderOpen' },
      ];
    
    case USER_ROLES.CUSTOMER_SERVICE:
      return [
        { label: 'Dashboard', path: '/customer-service', icon: 'LayoutDashboard' },
        { label: 'Client Support', path: '/customer-service', section: 'support', icon: 'Headphones' },
        { label: 'Service Requests', path: '/service-requests', icon: 'FileText' },
        { label: 'Client Management', path: '/client-master', icon: 'Users' },
        { label: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
      ];

    case USER_ROLES.QC_EXECUTIVE:
      return [
        { label: 'QC Dashboard', path: '/qc-dashboard', icon: 'LayoutDashboard' },
        { label: 'Quality Reviews', path: '/qc-dashboard', section: 'reviews', icon: 'ShieldCheck' },
        { label: 'Delivery Handoff', path: '/qc-delivery-handoff', icon: 'CheckSquare' },
        { label: 'Quality Metrics', path: '/quality-metrics', icon: 'BarChart3' },
        { label: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
      ];

    case USER_ROLES.ACCOUNTANT:
      return [
        { label: 'Financial Dashboard', path: '/financial-management', icon: 'LayoutDashboard' },
        { label: 'Revenue', path: '/financial-management', section: 'revenue', icon: 'DollarSign' },
        { label: 'Invoices', path: '/financial-management', section: 'invoices', icon: 'FileText' },
        { label: 'Reports', path: '/financial-management', section: 'reports', icon: 'BarChart3' },
        { label: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
      ];

    case USER_ROLES.AGENT:
      return [
        { label: 'Dashboard', path: '/agent', icon: 'LayoutDashboard' },
        { label: 'Leads', path: '/leads', icon: 'UserPlus' },
        { label: 'Proposals', path: '/proposals', icon: 'FileText' },
        { label: 'Referrals', path: '/referrals', icon: 'Share2' },
        { label: 'Commissions', path: '/agent', section: 'commissions', icon: 'DollarSign' },
        { label: 'My Tasks', path: '/tasks', icon: 'CheckSquare' },
      ];
    
    case USER_ROLES.CLIENT:
      return [
        { label: 'Overview', path: '/client-portal', section: 'overview', icon: 'Home' },
        { label: 'Business Entities', path: '/client-portal', section: 'entities', icon: 'Building2' },
        { label: 'Service Requests', path: '/client-portal', section: 'services', icon: 'FileText' },
        { label: 'Documents', path: '/client-portal', section: 'documents', icon: 'FolderOpen' },
        { label: 'Browse Services', path: '/services', icon: 'ShoppingCart' },
        { label: 'Compliance Calendar', path: '/compliance-dashboard', icon: 'Calendar' },
        { label: 'Referrals & Wallet', path: '/referrals', icon: 'Wallet' },
        { label: 'Support', path: '/support', icon: 'Headphones' },
      ];
    
    default:
      return [];
  }
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  const normalizedRole = role.toLowerCase();

  switch (normalizedRole) {
    case USER_ROLES.SUPER_ADMIN:
      return 'Super Administrator';
    case USER_ROLES.ADMIN:
      return 'Administrator';
    case USER_ROLES.SALES_MANAGER:
      return 'Sales Manager';
    case USER_ROLES.SALES_EXECUTIVE:
      return 'Sales Executive';
    case USER_ROLES.OPS_MANAGER:
      return 'Operations Manager';
    case USER_ROLES.OPS_EXECUTIVE:
    case USER_ROLES.OPS_EXEC:
      return 'Operations Executive';
    case USER_ROLES.OPS_LEAD:
      return 'Operations Lead';
    case USER_ROLES.CUSTOMER_SERVICE:
      return 'Customer Service';
    case USER_ROLES.QC_EXECUTIVE:
      return 'QC Executive';
    case USER_ROLES.ACCOUNTANT:
      return 'Accountant';
    case USER_ROLES.AGENT:
      return 'Agent';
    case USER_ROLES.CLIENT:
      return 'Client';
    default:
      return 'User';
  }
}

/**
 * Check if role has admin privileges
 */
export function isAdminRole(role: string): boolean {
  const normalizedRole = role.toLowerCase();
  return normalizedRole === USER_ROLES.SUPER_ADMIN || normalizedRole === USER_ROLES.ADMIN;
}

/**
 * Check if role is operations staff
 */
export function isOperationsRole(role: string): boolean {
  const normalizedRole = role.toLowerCase();
  return [
    USER_ROLES.OPS_MANAGER,
    USER_ROLES.OPS_EXECUTIVE,
    USER_ROLES.OPS_EXEC,
    USER_ROLES.OPS_LEAD,
    USER_ROLES.CUSTOMER_SERVICE,
    USER_ROLES.QC_EXECUTIVE,
  ].includes(normalizedRole as UserRole);
}

/**
 * Check if role has QC/Quality privileges
 */
export function isQCRole(role: string): boolean {
  const normalizedRole = role.toLowerCase();
  return normalizedRole === USER_ROLES.QC_EXECUTIVE;
}

/**
 * Check if role has financial access
 */
export function isFinanceRole(role: string): boolean {
  const normalizedRole = role.toLowerCase();
  return [USER_ROLES.ACCOUNTANT, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(normalizedRole as UserRole);
}

/**
 * Check if role is sales staff
 */
export function isSalesRole(role: string): boolean {
  const normalizedRole = role.toLowerCase();
  return [USER_ROLES.SALES_MANAGER, USER_ROLES.SALES_EXECUTIVE].includes(normalizedRole as UserRole);
}

/**
 * Get role level for hierarchy comparison
 */
export function getRoleLevel(role: string): number {
  return ROLE_LEVELS[role.toLowerCase()] || 0;
}

/**
 * Check if one role has equal or higher privileges than another
 */
export function hasEqualOrHigherRole(userRole: string, requiredRole: string): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Get role navigation with actual icon components
 * Converts string icon names to Lucide React components
 */
export function getRoleNavigationWithIcons(role: string) {
  const navigation = getRoleNavigation(role);
  return navigation.map(item => ({
    ...item,
    icon: iconMap[item.icon] || LayoutDashboard
  }));
}

/**
 * Get a single icon component from string name
 */
export function getIconComponent(iconName: string): LucideIcon {
  return iconMap[iconName] || LayoutDashboard;
}
