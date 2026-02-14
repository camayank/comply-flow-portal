/**
 * Centralized Route Configuration
 * Single source of truth for all application routes
 *
 * Purpose:
 * - Document canonical routes (preferred URLs)
 * - Provide URL builder utilities
 * - Support route aliasing for backward compatibility
 * - Enable type-safe navigation
 */

// ============================================
// Route Definitions
// ============================================

export const ROUTES = {
  // Public Routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ONBOARDING: '/smart-start',
  PLATFORM_DEMO: '/platform-demo',
  DESIGN_SYSTEM: '/design-system',
  SCORECARD: '/10k',

  // Client Portal Routes
  CLIENT_PORTAL: '/portal-v2',
  CLIENT_SERVICES: '/my-services',
  CLIENT_DOCUMENTS: '/vault',
  CLIENT_COMPLIANCE: '/compliance-calendar',
  CLIENT_PROFILE: '/client-profile',
  CLIENT_SUPPORT: '/support',
  EXECUTIVE_SUMMARY: '/executive-summary',

  // Client Account Routes
  ACCOUNT: '/portal-v2/account',
  ACCOUNT_BUSINESSES: '/portal-v2/account/businesses',
  ACCOUNT_BILLING: '/portal-v2/account/billing',
  ACCOUNT_DOCUMENTS: '/portal-v2/account/documents',
  ACCOUNT_SECURITY: '/portal-v2/account/security',
  ACCOUNT_NOTIFICATIONS: '/portal-v2/account/notifications',

  // Lifecycle Dashboard Routes
  LIFECYCLE: '/lifecycle',
  LIFECYCLE_COMPLIANCE: '/lifecycle/compliance',
  LIFECYCLE_SERVICES: '/lifecycle/services',
  LIFECYCLE_DOCUMENTS: '/lifecycle/documents',
  LIFECYCLE_FUNDING: '/lifecycle/funding',
  LIFECYCLE_TIMELINE: '/lifecycle/timeline',

  // Service Routes
  SERVICE_CATALOG: '/services',
  SERVICE_REQUEST_CREATE: '/service-request/create',
  SERVICE_REQUEST_DETAIL: (id: string | number) => `/service-request/${id}`,
  SERVICE_FLOW: '/service-flow',

  // Operations Routes
  OPERATIONS: '/operations',
  WORK_QUEUE: '/work-queue',
  DOCUMENT_REVIEW: '/document-review',
  ESCALATIONS: '/escalations',

  // Admin Routes
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_CLIENTS: '/admin/clients',
  ADMIN_SERVICES: '/admin/services',
  ADMIN_BLUEPRINTS: '/admin/blueprints',
  ADMIN_WEBHOOKS: '/admin/webhooks',
  ADMIN_API_KEYS: '/admin/api-keys',
  ADMIN_ACCESS_REVIEWS: '/admin/access-reviews',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_CONFIG: '/config',

  // Agent Routes
  AGENT_PORTAL: '/agent',
  AGENT_DASHBOARD: '/agent/dashboard',
  AGENT_LEADS: '/agent/leads',
  AGENT_COMMISSIONS: '/agent/commissions',
  AGENT_PERFORMANCE: '/agent/performance',
  AGENT_PROFILE: '/agent/profile',
  AGENT_KYC: '/agent/kyc',
  AGENT_DISPUTES: '/agent/disputes',

  // Sales Routes
  SALES: '/sales',
  SALES_PIPELINE: '/sales/pipeline',
  PRE_SALES: '/pre-sales',
  PROPOSALS: '/proposals',
  LEAD_PIPELINE: '/lead-pipeline',

  // QC Routes
  QC: '/qc',
  QC_QUEUE: '/qc/queue',
  QC_DELIVERY: '/qc-delivery-handoff',
  QUALITY_METRICS: '/quality-metrics',

  // Analytics Routes
  ANALYTICS: '/analytics',
  BUSINESS_INTELLIGENCE: '/bi',
  EXECUTIVE_DASHBOARD: '/executive-dashboard',
  FINANCIALS: '/financials',

  // HR Routes
  HR: '/hr',

  // Customer Success Routes
  PLAYBOOKS: '/playbooks',
  RENEWALS: '/renewals',

  // Communication Routes
  NOTIFICATIONS: '/notifications',
  MESSAGES: '/messages',

  // Security Routes
  SECURITY_INCIDENTS: '/security/incidents',
  AUDIT_LOG: '/audit-log',

  // Super Admin Routes
  SUPER_ADMIN: '/super-admin',
  SUPER_ADMIN_DASHBOARD: '/super-admin/dashboard',
  SUPER_ADMIN_TENANTS: '/super-admin/tenants',
  SUPER_ADMIN_TENANT_DETAIL: (id: string | number) => `/super-admin/tenants/${id}`,
  SUPER_ADMIN_SERVICES: '/super-admin/services',
  SUPER_ADMIN_PRICING: '/super-admin/pricing',
  SUPER_ADMIN_COMMISSIONS: '/super-admin/commissions',
  SUPER_ADMIN_INTEGRATIONS: '/super-admin/integrations',
  SUPER_ADMIN_SECURITY: '/super-admin/security',
  SUPER_ADMIN_OPERATIONS: '/super-admin/operations',
  SUPER_ADMIN_ANALYTICS: '/super-admin/analytics',

  // Misc Routes
  TASKS: '/tasks',
  AUTOCOMPLY: '/autocomply',
  TAX_TRACKER: '/taxtracker',
  DIGISCORE: '/digiscore',
  BULK_UPLOAD: '/bulk-upload',
} as const;

// ============================================
// Route Aliases (backward compatibility)
// ============================================

export const ROUTE_ALIASES: Record<string, string> = {
  // Login aliases
  '/signin': ROUTES.LOGIN,

  // Registration aliases
  '/client-registration': ROUTES.REGISTER,
  '/signup': ROUTES.REGISTER,

  // Onboarding aliases
  '/onboarding': ROUTES.ONBOARDING,
  '/streamlined-onboarding': ROUTES.ONBOARDING,
  '/whatsapp-onboarding': ROUTES.ONBOARDING,

  // Client portal aliases
  '/portal': ROUTES.CLIENT_PORTAL,
  '/client-portal': ROUTES.CLIENT_PORTAL,
  '/mobile-dashboard': ROUTES.CLIENT_PORTAL,
  '/mobile': ROUTES.CLIENT_PORTAL,
  '/command-center': ROUTES.CLIENT_PORTAL,
  '/founder': ROUTES.CLIENT_PORTAL,

  // Service aliases
  '/service-catalog': ROUTES.SERVICE_CATALOG,
  '/browse-services': ROUTES.SERVICE_CATALOG,
  '/my-requests': '/service-requests',
  '/requests': '/service-requests',

  // Operations aliases
  '/ops': ROUTES.OPERATIONS,
  '/universal-ops': ROUTES.OPERATIONS,
  '/ops/work-queue': ROUTES.WORK_QUEUE,
  '/operations/work-queue': ROUTES.WORK_QUEUE,
  '/operations-queue': ROUTES.WORK_QUEUE,
  '/ops/document-review': ROUTES.DOCUMENT_REVIEW,
  '/operations/document-review': ROUTES.DOCUMENT_REVIEW,
  '/ops/escalations': ROUTES.ESCALATIONS,
  '/escalation-dashboard': ROUTES.ESCALATIONS,

  // Admin aliases
  '/admin-control': ROUTES.ADMIN,
  '/configuration': ROUTES.ADMIN_CONFIG,
  '/settings': ROUTES.ADMIN_CONFIG,
  '/admin/config': ROUTES.ADMIN_CONFIG,
  '/services-management': ROUTES.ADMIN_SERVICES,
  '/manage-services': ROUTES.ADMIN_SERVICES,
  '/admin/enterprise': ROUTES.ADMIN_BLUEPRINTS,
  '/enterprise-config': ROUTES.ADMIN_BLUEPRINTS,
  '/developer/api-keys': ROUTES.ADMIN_API_KEYS,
  '/access-reviews': ROUTES.ADMIN_ACCESS_REVIEWS,

  // Agent aliases
  '/agents': ROUTES.AGENT_PORTAL,
  '/agent-portal': ROUTES.AGENT_PORTAL,
  '/partner': ROUTES.AGENT_PORTAL,
  '/partners': ROUTES.AGENT_PORTAL,
  '/agent/clients': ROUTES.AGENT_LEADS,
  '/agent/commission-disputes': ROUTES.AGENT_DISPUTES,
  '/commission-disputes': ROUTES.AGENT_DISPUTES,

  // Sales aliases
  '/sales/dashboard': ROUTES.SALES,
  '/sales/team': ROUTES.SALES,
  '/sales/forecasts': ROUTES.SALES,
  '/sales/targets': ROUTES.SALES,
  '/crm': ROUTES.LEAD_PIPELINE,
  '/pipeline': ROUTES.LEAD_PIPELINE,
  '/proposal-management': ROUTES.PROPOSALS,
  '/sales-proposals': ROUTES.PROPOSALS,

  // Lead aliases
  '/leads': '/lead-management',
  '/lead-management': ROUTES.LEAD_PIPELINE,

  // QC aliases
  '/qc-dashboard': ROUTES.QC,
  '/quality-control': ROUTES.QC,
  '/delivery-handoff': ROUTES.QC_DELIVERY,
  '/qc-metrics': ROUTES.QUALITY_METRICS,

  // Analytics aliases
  '/insights': ROUTES.BUSINESS_INTELLIGENCE,
  '/executive-dashboard': ROUTES.ANALYTICS,
  '/revenue-analytics': ROUTES.FINANCIALS,
  '/financial-management': ROUTES.FINANCIALS,

  // HR aliases
  '/hr-dashboard': ROUTES.HR,
  '/human-resources': ROUTES.HR,

  // Customer Success aliases
  '/customer-success/playbooks': ROUTES.PLAYBOOKS,
  '/customer-success/renewals': ROUTES.RENEWALS,
  '/renewal-pipeline': ROUTES.RENEWALS,

  // Communication aliases
  '/notification-center': ROUTES.NOTIFICATIONS,
  '/alerts': ROUTES.NOTIFICATIONS,
  '/messaging': ROUTES.MESSAGES,
  '/conversations': ROUTES.MESSAGES,
  '/inbox': ROUTES.MESSAGES,

  // Security aliases
  '/incidents': ROUTES.SECURITY_INCIDENTS,
  '/security-incidents': ROUTES.SECURITY_INCIDENTS,
  '/compliance/audit-log': ROUTES.AUDIT_LOG,

  // Misc aliases
  '/task-management': ROUTES.TASKS,
  '/my-tasks': ROUTES.TASKS,
  '/workflows': ROUTES.AUTOCOMPLY,
  '/automation': ROUTES.AUTOCOMPLY,
  '/tax': ROUTES.TAX_TRACKER,
  '/tax-management': ROUTES.TAX_TRACKER,
  '/compliance-score': ROUTES.DIGISCORE,
  '/score': ROUTES.DIGISCORE,
  '/bulk-import': ROUTES.BULK_UPLOAD,
  '/data-import': ROUTES.BULK_UPLOAD,
  '/admin/bulk-upload': ROUTES.BULK_UPLOAD,
  '/compliance-scorecard': ROUTES.SCORECARD,
  '/help': ROUTES.CLIENT_SUPPORT,
  '/tickets': ROUTES.CLIENT_SUPPORT,
  '/investor-summary': ROUTES.EXECUTIVE_SUMMARY,
  '/compliance-report': ROUTES.EXECUTIVE_SUMMARY,

  // Lifecycle aliases
  '/lifecycle-dashboard': ROUTES.LIFECYCLE,
};

// ============================================
// URL Utilities
// ============================================

/**
 * Get the canonical route for a given path
 */
export function getCanonicalRoute(path: string): string {
  return ROUTE_ALIASES[path] || path;
}

/**
 * Check if two paths point to the same destination
 */
export function isSameRoute(path1: string, path2: string): boolean {
  return getCanonicalRoute(path1) === getCanonicalRoute(path2);
}

/**
 * Build a service request detail URL
 */
export function buildServiceRequestUrl(id: string | number): string {
  return ROUTES.SERVICE_REQUEST_DETAIL(id);
}

/**
 * Build a delivery confirmation URL
 */
export function buildDeliveryUrl(deliveryId: string | number): string {
  return `/delivery/${deliveryId}`;
}

// ============================================
// Route Groups (for navigation menus)
// ============================================

export const ROUTE_GROUPS = {
  client: [
    { path: ROUTES.CLIENT_PORTAL, label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: ROUTES.CLIENT_SERVICES, label: 'My Services', icon: 'Briefcase' },
    { path: ROUTES.SERVICE_CATALOG, label: 'Service Catalog', icon: 'ShoppingCart' },
    { path: ROUTES.CLIENT_COMPLIANCE, label: 'Compliance Calendar', icon: 'Calendar' },
    { path: ROUTES.CLIENT_DOCUMENTS, label: 'Documents', icon: 'FolderOpen' },
    { path: ROUTES.EXECUTIVE_SUMMARY, label: 'Executive Summary', icon: 'FileText' },
    { path: ROUTES.CLIENT_SUPPORT, label: 'Support', icon: 'Headphones' },
  ],
  agent: [
    { path: ROUTES.AGENT_DASHBOARD, label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: ROUTES.AGENT_LEADS, label: 'Leads', icon: 'UserPlus' },
    { path: ROUTES.PROPOSALS, label: 'Proposals', icon: 'FileText' },
    { path: ROUTES.AGENT_COMMISSIONS, label: 'Commissions', icon: 'DollarSign' },
    { path: ROUTES.AGENT_PERFORMANCE, label: 'Performance', icon: 'TrendingUp' },
  ],
  operations: [
    { path: ROUTES.OPERATIONS, label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: ROUTES.WORK_QUEUE, label: 'Work Queue', icon: 'CheckSquare' },
    { path: ROUTES.DOCUMENT_REVIEW, label: 'Document Review', icon: 'FileText' },
    { path: ROUTES.ESCALATIONS, label: 'Escalations', icon: 'Shield' },
    { path: ROUTES.QC, label: 'Quality Control', icon: 'ShieldCheck' },
  ],
  admin: [
    { path: ROUTES.ADMIN_DASHBOARD, label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: ROUTES.ADMIN_USERS, label: 'Users', icon: 'Users' },
    { path: ROUTES.ADMIN_CLIENTS, label: 'Clients', icon: 'Building2' },
    { path: ROUTES.ADMIN_SERVICES, label: 'Services', icon: 'Briefcase' },
    { path: ROUTES.ADMIN_REPORTS, label: 'Reports', icon: 'FileBarChart' },
    { path: ROUTES.ADMIN_BLUEPRINTS, label: 'Blueprints', icon: 'Workflow' },
    { path: ROUTES.ADMIN_CONFIG, label: 'Configuration', icon: 'Settings' },
  ],
  superAdmin: [
    { path: ROUTES.SUPER_ADMIN_DASHBOARD, label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: ROUTES.SUPER_ADMIN_TENANTS, label: 'Tenants', icon: 'Building2' },
    { path: ROUTES.SUPER_ADMIN_SERVICES, label: 'Services', icon: 'Briefcase' },
    { path: ROUTES.SUPER_ADMIN_PRICING, label: 'Pricing', icon: 'DollarSign' },
    { path: ROUTES.SUPER_ADMIN_COMMISSIONS, label: 'Commissions', icon: 'Percent' },
    { path: ROUTES.SUPER_ADMIN_INTEGRATIONS, label: 'Integrations', icon: 'Link' },
    { path: ROUTES.SUPER_ADMIN_SECURITY, label: 'Security', icon: 'ShieldCheck' },
    { path: ROUTES.SUPER_ADMIN_OPERATIONS, label: 'Operations', icon: 'Settings' },
    { path: ROUTES.SUPER_ADMIN_ANALYTICS, label: 'Analytics', icon: 'BarChart3' },
    { path: ROUTES.AUDIT_LOG, label: 'Audit Log', icon: 'FileText' },
  ],
} as const;

// ============================================
// Type Exports
// ============================================

export type RouteKey = keyof typeof ROUTES;
export type RouteGroup = keyof typeof ROUTE_GROUPS;
