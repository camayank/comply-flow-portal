/**
 * Role-Based Routing Utility
 * WordPress-style role-based dashboard routing
 */

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPS_EXECUTIVE: 'ops_executive',
  OPS_EXEC: 'ops_exec',
  OPS_LEAD: 'ops_lead',
  CUSTOMER_SERVICE: 'customer_service',
  AGENT: 'agent',
  CLIENT: 'client',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * Get the default dashboard route for a user role
 * Similar to WordPress wp_redirect after login
 */
export function getRoleDashboardRoute(role: string): string {
  const normalizedRole = role.toLowerCase();
  
  switch (normalizedRole) {
    case USER_ROLES.SUPER_ADMIN:
    case USER_ROLES.ADMIN:
      return '/admin';
    
    case USER_ROLES.OPS_EXECUTIVE:
    case USER_ROLES.OPS_EXEC:
    case USER_ROLES.OPS_LEAD:
      return '/operations';
    
    case USER_ROLES.CUSTOMER_SERVICE:
      return '/operations'; // Customer service uses ops panel with limited permissions
    
    case USER_ROLES.AGENT:
      return '/agent';
    
    case USER_ROLES.CLIENT:
      return '/client-portal';
    
    default:
      // Default fallback
      return '/client-portal';
  }
}

/**
 * Get allowed routes for a user role
 * Used for route protection and navigation filtering
 */
export function getAllowedRoutes(role: string): string[] {
  const normalizedRole = role.toLowerCase();
  
  // Common routes available to all authenticated users
  const commonRoutes = [
    '/profile',
    '/settings',
    '/notifications',
  ];
  
  switch (normalizedRole) {
    case USER_ROLES.SUPER_ADMIN:
      // Super admin can access everything
      return [
        '/',
        '/admin',
        '/operations',
        '/agent',
        '/client-portal',
        '/user-management',
        '/workflows',
        '/analytics',
        '/executive-dashboard',
        '/business-intelligence',
        '/financial-management',
        '/hr-dashboard',
        '/client-master',
        '/qc-dashboard',
        '/autocomply',
        '/taxtracker',
        '/digiscore',
        '/tasks',
        '/documents',
        ...commonRoutes,
      ];
    
    case USER_ROLES.ADMIN:
      return [
        '/',
        '/admin',
        '/operations',
        '/user-management',
        '/workflows',
        '/analytics',
        '/executive-dashboard',
        '/financial-management',
        '/client-master',
        '/qc-dashboard',
        '/autocomply',
        '/taxtracker',
        '/digiscore',
        '/tasks',
        '/documents',
        ...commonRoutes,
      ];
    
    case USER_ROLES.OPS_EXECUTIVE:
    case USER_ROLES.OPS_EXEC:
    case USER_ROLES.OPS_LEAD:
      return [
        '/',
        '/operations',
        '/tasks',
        '/service-requests',
        '/documents',
        '/qc-dashboard',
        '/client-master',
        ...commonRoutes,
      ];
    
    case USER_ROLES.CUSTOMER_SERVICE:
      return [
        '/',
        '/operations',
        '/tasks',
        '/service-requests',
        '/client-master',
        ...commonRoutes,
      ];
    
    case USER_ROLES.AGENT:
      return [
        '/',
        '/agent',
        '/leads',
        '/proposals',
        '/referrals',
        '/tasks',
        ...commonRoutes,
      ];
    
    case USER_ROLES.CLIENT:
      return [
        '/',
        '/client-portal',
        '/services',
        '/service-requests',
        '/documents',
        '/referrals',
        '/tasks',
        '/compliance-dashboard',
        '/payment-gateway',
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
        { label: 'Dashboard', path: '/operations', icon: 'LayoutDashboard' },
        { label: 'Client Support', path: '/operations', section: 'support', icon: 'Headphones' },
        { label: 'Service Requests', path: '/service-requests', icon: 'FileText' },
        { label: 'Client Management', path: '/client-master', icon: 'Users' },
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
    case USER_ROLES.OPS_EXECUTIVE:
    case USER_ROLES.OPS_EXEC:
      return 'Operations Executive';
    case USER_ROLES.OPS_LEAD:
      return 'Operations Lead';
    case USER_ROLES.CUSTOMER_SERVICE:
      return 'Customer Service';
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
    USER_ROLES.OPS_EXECUTIVE,
    USER_ROLES.OPS_EXEC,
    USER_ROLES.OPS_LEAD,
    USER_ROLES.CUSTOMER_SERVICE,
  ].includes(normalizedRole as UserRole);
}
