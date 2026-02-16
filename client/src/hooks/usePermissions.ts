/**
 * usePermissions Hook
 * Provides role-based permission checking for UI components
 *
 * Usage:
 * const { canCreateService, canDeleteService, capabilities } = usePermissions();
 *
 * if (canCreateService) {
 *   return <CreateServiceButton />
 * }
 */

import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { UserRole as LegacyUserRole } from '@/types';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  USER_ROLES,
  ROLE_HIERARCHY,
  getRoleCapabilities,
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
  isAdminRole,
  canManageServices,
  canManageWorkflows,
  getRoleDisplayName,
  type UserRole,
} from '../../../shared/rbac-permissions';

// ============================================================================
// LEGACY PERMISSION INTERFACE (for backward compatibility)
// ============================================================================

interface LegacyPermissions {
  canViewClients: boolean;
  canEditClients: boolean;
  canDeleteClients: boolean;
  canViewServices: boolean;
  canEditServices: boolean;
  canViewLeads: boolean;
  canEditLeads: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canApproveCommissions: boolean;
  canViewAllData: boolean;
}

// ============================================================================
// ENHANCED PERMISSION INTERFACE
// ============================================================================

export interface UsePermissionsResult extends LegacyPermissions {
  // Role information
  role: UserRole | null;
  roleName: string;
  roleLevel: number;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;

  // Permission checking functions
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;

  // Service management
  canViewServiceCatalog: boolean;
  canCreateService: boolean;
  canUpdateService: boolean;
  canDeleteService: boolean;
  canConfigureServices: boolean;
  canManageServicePricing: boolean;
  canBulkOperateServices: boolean;

  // Workflow management
  canViewWorkflows: boolean;
  canCreateWorkflow: boolean;
  canUpdateWorkflow: boolean;
  canDeleteWorkflow: boolean;
  canImportWorkflows: boolean;
  canExportWorkflows: boolean;
  canManageWorkflowTemplates: boolean;

  // Blueprint management
  canViewBlueprints: boolean;
  canCreateBlueprint: boolean;
  canUpdateBlueprint: boolean;
  canDeleteBlueprint: boolean;
  canPublishBlueprint: boolean;
  canArchiveBlueprint: boolean;

  // User management
  canViewAllUsers: boolean;
  canCreateUser: boolean;
  canUpdateUser: boolean;
  canDeleteUser: boolean;
  canAssignRoles: boolean;
  canManagePermissions: boolean;

  // Client management
  canViewOwnClients: boolean;
  canViewAllClients: boolean;
  canCreateClient: boolean;
  canUpdateClient: boolean;
  canDeleteClient: boolean;
  canManageClientDocuments: boolean;

  // Lead management
  canViewOwnLeads: boolean;
  canViewTeamLeads: boolean;
  canViewAllLeads: boolean;
  canCreateLead: boolean;
  canUpdateLead: boolean;
  canDeleteLead: boolean;
  canConvertLead: boolean;
  canAssignLead: boolean;

  // Proposal management
  canViewOwnProposals: boolean;
  canViewAllProposals: boolean;
  canCreateProposal: boolean;
  canUpdateProposal: boolean;
  canDeleteProposal: boolean;
  canSendProposal: boolean;
  canApproveProposal: boolean;

  // Service request management
  canViewOwnServiceRequests: boolean;
  canViewAssignedServiceRequests: boolean;
  canViewAllServiceRequests: boolean;
  canCreateServiceRequest: boolean;
  canUpdateServiceRequest: boolean;
  canDeleteServiceRequest: boolean;
  canAssignServiceRequest: boolean;
  canChangeServiceRequestStatus: boolean;
  canEscalateServiceRequest: boolean;

  // Task management
  canViewOwnTasks: boolean;
  canViewTeamTasks: boolean;
  canViewAllTasks: boolean;
  canCreateTask: boolean;
  canUpdateTask: boolean;
  canDeleteTask: boolean;
  canAssignTask: boolean;
  canCompleteTask: boolean;
  canReassignTask: boolean;

  // Document management
  canViewOwnDocuments: boolean;
  canViewAllDocuments: boolean;
  canUploadDocument: boolean;
  canDownloadDocument: boolean;
  canDeleteDocument: boolean;
  canVerifyDocument: boolean;
  canShareDocument: boolean;

  // Payment management
  canViewOwnPayments: boolean;
  canViewAllPayments: boolean;
  canCreatePayment: boolean;
  canProcessPayment: boolean;
  canRefundPayment: boolean;
  canManageInvoices: boolean;
  canViewPaymentReports: boolean;

  // Compliance management
  canViewOwnCompliance: boolean;
  canViewAllCompliance: boolean;
  canManageCompliance: boolean;
  canUpdateComplianceStatus: boolean;
  canGenerateComplianceReports: boolean;
  canConfigureComplianceAlerts: boolean;

  // Quality Control
  canViewQC: boolean;
  canReviewQC: boolean;
  canApproveQC: boolean;
  canRejectQC: boolean;
  canHandoffQC: boolean;
  canViewQCMetrics: boolean;

  // Agent/Partner management
  canViewOwnAgentProfile: boolean;
  canViewAllAgents: boolean;
  canCreateAgent: boolean;
  canUpdateAgent: boolean;
  canDeleteAgent: boolean;
  canManageCommissions: boolean;
  canViewAgentPerformance: boolean;

  // HR management
  canViewEmployees: boolean;
  canManageEmployees: boolean;
  canViewAttendance: boolean;
  canManageAttendance: boolean;
  canViewPayroll: boolean;
  canManagePayroll: boolean;
  canViewHRPerformance: boolean;
  canManageHRPerformance: boolean;

  // Analytics & Reports
  canViewBasicAnalytics: boolean;
  canViewAdvancedAnalytics: boolean;
  canViewExecutiveAnalytics: boolean;
  canExportAnalytics: boolean;
  canConfigureDashboards: boolean;

  // System administration
  canViewSystemSettings: boolean;
  canManageSystemSettings: boolean;
  canViewAuditLogs: boolean;
  canManageIntegrations: boolean;
  canManageApiKeys: boolean;
  canManageWebhooks: boolean;
  canManageTenants: boolean;
  canBackupRestore: boolean;

  // Referrals
  canViewOwnReferrals: boolean;
  canViewAllReferrals: boolean;
  canCreateReferral: boolean;
  canTrackReferrals: boolean;
  canManageReferralRewards: boolean;

  // Capabilities object (for more complex checks)
  capabilities: ReturnType<typeof getRoleCapabilities> | null;
}

// Map legacy roles to new role system
function mapLegacyRole(legacyRole?: LegacyUserRole | string): UserRole | null {
  if (!legacyRole) return null;

  const roleMapping: Record<string, UserRole> = {
    'CLIENT': USER_ROLES.CLIENT,
    'client': USER_ROLES.CLIENT,
    'SALES': USER_ROLES.SALES_EXECUTIVE,
    'sales': USER_ROLES.SALES_EXECUTIVE,
    'sales_manager': USER_ROLES.SALES_MANAGER,
    'sales_executive': USER_ROLES.SALES_EXECUTIVE,
    'OPERATIONS': USER_ROLES.OPS_EXECUTIVE,
    'operations': USER_ROLES.OPS_EXECUTIVE,
    'ops_manager': USER_ROLES.OPS_MANAGER,
    'ops_executive': USER_ROLES.OPS_EXECUTIVE,
    'operations_manager': USER_ROLES.OPS_MANAGER,
    'operations_executive': USER_ROLES.OPS_EXECUTIVE,
    'ADMIN': USER_ROLES.ADMIN,
    'admin': USER_ROLES.ADMIN,
    'SUPER_ADMIN': USER_ROLES.SUPER_ADMIN,
    'super_admin': USER_ROLES.SUPER_ADMIN,
    'AGENT': USER_ROLES.AGENT,
    'agent': USER_ROLES.AGENT,
    'agent_partner': USER_ROLES.AGENT,
    'customer_service': USER_ROLES.CUSTOMER_SERVICE,
    'qc_executive': USER_ROLES.QC_EXECUTIVE,
    'accountant': USER_ROLES.ACCOUNTANT,
    'compliance_officer': USER_ROLES.COMPLIANCE_OFFICER,
    'hr_manager': USER_ROLES.HR_MANAGER,
    'ops_lead': USER_ROLES.OPS_LEAD,
  };

  return roleMapping[legacyRole] || (legacyRole as UserRole);
}

export function usePermissions(): UsePermissionsResult {
  const { user } = useAuthStore();
  const role = mapLegacyRole(user?.role || (user?.roles && user.roles[0]));

  const result = useMemo<UsePermissionsResult>(() => {
    // Helper functions that use the current role
    const can = (permission: string): boolean => {
      if (!role) return false;
      return checkPermission(role, permission);
    };

    const canAny = (permissions: string[]): boolean => {
      if (!role) return false;
      return checkAnyPermission(role, permissions);
    };

    const canAll = (permissions: string[]): boolean => {
      if (!role) return false;
      return checkAllPermissions(role, permissions);
    };

    const capabilities = role ? getRoleCapabilities(role) : null;
    const roleLevel = role ? ROLE_HIERARCHY[role] || 0 : 0;

    return {
      // Role information
      role,
      roleName: role ? getRoleDisplayName(role) : 'Guest',
      roleLevel,
      isAdmin: role ? isAdminRole(role) : false,
      isSuperAdmin: role === USER_ROLES.SUPER_ADMIN,
      isStaff: roleLevel >= 50, // Operations and above

      // Permission checking functions
      can,
      canAny,
      canAll,

      // Legacy permissions (backward compatibility)
      canViewClients: canAny([PERMISSIONS.CLIENTS.VIEW_OWN, PERMISSIONS.CLIENTS.VIEW_ALL]),
      canEditClients: can(PERMISSIONS.CLIENTS.UPDATE),
      canDeleteClients: can(PERMISSIONS.CLIENTS.DELETE),
      canViewServices: can(PERMISSIONS.SERVICES.VIEW),
      canEditServices: can(PERMISSIONS.SERVICES.UPDATE),
      canViewLeads: canAny([PERMISSIONS.LEADS.VIEW_OWN, PERMISSIONS.LEADS.VIEW_ALL]),
      canEditLeads: can(PERMISSIONS.LEADS.UPDATE),
      canViewReports: canAny([PERMISSIONS.ANALYTICS.VIEW_BASIC, PERMISSIONS.ANALYTICS.VIEW_ADVANCED]),
      canManageUsers: can(PERMISSIONS.USERS.CREATE),
      canManageSettings: can(PERMISSIONS.SYSTEM.MANAGE_SETTINGS),
      canApproveCommissions: can(PERMISSIONS.AGENTS.MANAGE_COMMISSIONS),
      canViewAllData: role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN,

      // Service management
      canViewServiceCatalog: can(PERMISSIONS.SERVICES.VIEW),
      canCreateService: can(PERMISSIONS.SERVICES.CREATE),
      canUpdateService: can(PERMISSIONS.SERVICES.UPDATE),
      canDeleteService: can(PERMISSIONS.SERVICES.DELETE),
      canConfigureServices: can(PERMISSIONS.SERVICES.CONFIGURE),
      canManageServicePricing: can(PERMISSIONS.SERVICES.MANAGE_PRICING),
      canBulkOperateServices: can(PERMISSIONS.SERVICES.BULK_OPERATIONS),

      // Workflow management
      canViewWorkflows: can(PERMISSIONS.WORKFLOWS.VIEW),
      canCreateWorkflow: can(PERMISSIONS.WORKFLOWS.CREATE),
      canUpdateWorkflow: can(PERMISSIONS.WORKFLOWS.UPDATE),
      canDeleteWorkflow: can(PERMISSIONS.WORKFLOWS.DELETE),
      canImportWorkflows: can(PERMISSIONS.WORKFLOWS.IMPORT),
      canExportWorkflows: can(PERMISSIONS.WORKFLOWS.EXPORT),
      canManageWorkflowTemplates: can(PERMISSIONS.WORKFLOWS.MANAGE_TEMPLATES),

      // Blueprint management
      canViewBlueprints: can(PERMISSIONS.BLUEPRINTS.VIEW),
      canCreateBlueprint: can(PERMISSIONS.BLUEPRINTS.CREATE),
      canUpdateBlueprint: can(PERMISSIONS.BLUEPRINTS.UPDATE),
      canDeleteBlueprint: can(PERMISSIONS.BLUEPRINTS.DELETE),
      canPublishBlueprint: can(PERMISSIONS.BLUEPRINTS.PUBLISH),
      canArchiveBlueprint: can(PERMISSIONS.BLUEPRINTS.ARCHIVE),

      // User management
      canViewAllUsers: can(PERMISSIONS.USERS.VIEW_ALL),
      canCreateUser: can(PERMISSIONS.USERS.CREATE),
      canUpdateUser: can(PERMISSIONS.USERS.UPDATE),
      canDeleteUser: can(PERMISSIONS.USERS.DELETE),
      canAssignRoles: can(PERMISSIONS.USERS.ASSIGN_ROLES),
      canManagePermissions: can(PERMISSIONS.USERS.MANAGE_PERMISSIONS),

      // Client management
      canViewOwnClients: can(PERMISSIONS.CLIENTS.VIEW_OWN),
      canViewAllClients: can(PERMISSIONS.CLIENTS.VIEW_ALL),
      canCreateClient: can(PERMISSIONS.CLIENTS.CREATE),
      canUpdateClient: can(PERMISSIONS.CLIENTS.UPDATE),
      canDeleteClient: can(PERMISSIONS.CLIENTS.DELETE),
      canManageClientDocuments: can(PERMISSIONS.CLIENTS.MANAGE_DOCUMENTS),

      // Lead management
      canViewOwnLeads: can(PERMISSIONS.LEADS.VIEW_OWN),
      canViewTeamLeads: can(PERMISSIONS.LEADS.VIEW_TEAM),
      canViewAllLeads: can(PERMISSIONS.LEADS.VIEW_ALL),
      canCreateLead: can(PERMISSIONS.LEADS.CREATE),
      canUpdateLead: can(PERMISSIONS.LEADS.UPDATE),
      canDeleteLead: can(PERMISSIONS.LEADS.DELETE),
      canConvertLead: can(PERMISSIONS.LEADS.CONVERT),
      canAssignLead: can(PERMISSIONS.LEADS.ASSIGN),

      // Proposal management
      canViewOwnProposals: can(PERMISSIONS.PROPOSALS.VIEW_OWN),
      canViewAllProposals: can(PERMISSIONS.PROPOSALS.VIEW_ALL),
      canCreateProposal: can(PERMISSIONS.PROPOSALS.CREATE),
      canUpdateProposal: can(PERMISSIONS.PROPOSALS.UPDATE),
      canDeleteProposal: can(PERMISSIONS.PROPOSALS.DELETE),
      canSendProposal: can(PERMISSIONS.PROPOSALS.SEND),
      canApproveProposal: can(PERMISSIONS.PROPOSALS.APPROVE),

      // Service request management
      canViewOwnServiceRequests: can(PERMISSIONS.SERVICE_REQUESTS.VIEW_OWN),
      canViewAssignedServiceRequests: can(PERMISSIONS.SERVICE_REQUESTS.VIEW_ASSIGNED),
      canViewAllServiceRequests: can(PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL),
      canCreateServiceRequest: can(PERMISSIONS.SERVICE_REQUESTS.CREATE),
      canUpdateServiceRequest: can(PERMISSIONS.SERVICE_REQUESTS.UPDATE),
      canDeleteServiceRequest: can(PERMISSIONS.SERVICE_REQUESTS.DELETE),
      canAssignServiceRequest: can(PERMISSIONS.SERVICE_REQUESTS.ASSIGN),
      canChangeServiceRequestStatus: can(PERMISSIONS.SERVICE_REQUESTS.CHANGE_STATUS),
      canEscalateServiceRequest: can(PERMISSIONS.SERVICE_REQUESTS.ESCALATE),

      // Task management
      canViewOwnTasks: can(PERMISSIONS.TASKS.VIEW_OWN),
      canViewTeamTasks: can(PERMISSIONS.TASKS.VIEW_TEAM),
      canViewAllTasks: can(PERMISSIONS.TASKS.VIEW_ALL),
      canCreateTask: can(PERMISSIONS.TASKS.CREATE),
      canUpdateTask: can(PERMISSIONS.TASKS.UPDATE),
      canDeleteTask: can(PERMISSIONS.TASKS.DELETE),
      canAssignTask: can(PERMISSIONS.TASKS.ASSIGN),
      canCompleteTask: can(PERMISSIONS.TASKS.COMPLETE),
      canReassignTask: can(PERMISSIONS.TASKS.REASSIGN),

      // Document management
      canViewOwnDocuments: can(PERMISSIONS.DOCUMENTS.VIEW_OWN),
      canViewAllDocuments: can(PERMISSIONS.DOCUMENTS.VIEW_ALL),
      canUploadDocument: can(PERMISSIONS.DOCUMENTS.UPLOAD),
      canDownloadDocument: can(PERMISSIONS.DOCUMENTS.DOWNLOAD),
      canDeleteDocument: can(PERMISSIONS.DOCUMENTS.DELETE),
      canVerifyDocument: can(PERMISSIONS.DOCUMENTS.VERIFY),
      canShareDocument: can(PERMISSIONS.DOCUMENTS.SHARE),

      // Payment management
      canViewOwnPayments: can(PERMISSIONS.PAYMENTS.VIEW_OWN),
      canViewAllPayments: can(PERMISSIONS.PAYMENTS.VIEW_ALL),
      canCreatePayment: can(PERMISSIONS.PAYMENTS.CREATE),
      canProcessPayment: can(PERMISSIONS.PAYMENTS.PROCESS),
      canRefundPayment: can(PERMISSIONS.PAYMENTS.REFUND),
      canManageInvoices: can(PERMISSIONS.PAYMENTS.MANAGE_INVOICES),
      canViewPaymentReports: can(PERMISSIONS.PAYMENTS.VIEW_REPORTS),

      // Compliance management
      canViewOwnCompliance: can(PERMISSIONS.COMPLIANCE.VIEW_OWN),
      canViewAllCompliance: can(PERMISSIONS.COMPLIANCE.VIEW_ALL),
      canManageCompliance: can(PERMISSIONS.COMPLIANCE.MANAGE),
      canUpdateComplianceStatus: can(PERMISSIONS.COMPLIANCE.UPDATE_STATUS),
      canGenerateComplianceReports: can(PERMISSIONS.COMPLIANCE.GENERATE_REPORTS),
      canConfigureComplianceAlerts: can(PERMISSIONS.COMPLIANCE.CONFIGURE_ALERTS),

      // Quality Control
      canViewQC: can(PERMISSIONS.QC.VIEW),
      canReviewQC: can(PERMISSIONS.QC.REVIEW),
      canApproveQC: can(PERMISSIONS.QC.APPROVE),
      canRejectQC: can(PERMISSIONS.QC.REJECT),
      canHandoffQC: can(PERMISSIONS.QC.HANDOFF),
      canViewQCMetrics: can(PERMISSIONS.QC.VIEW_METRICS),

      // Agent/Partner management
      canViewOwnAgentProfile: can(PERMISSIONS.AGENTS.VIEW_OWN),
      canViewAllAgents: can(PERMISSIONS.AGENTS.VIEW_ALL),
      canCreateAgent: can(PERMISSIONS.AGENTS.CREATE),
      canUpdateAgent: can(PERMISSIONS.AGENTS.UPDATE),
      canDeleteAgent: can(PERMISSIONS.AGENTS.DELETE),
      canManageCommissions: can(PERMISSIONS.AGENTS.MANAGE_COMMISSIONS),
      canViewAgentPerformance: can(PERMISSIONS.AGENTS.VIEW_PERFORMANCE),

      // HR management
      canViewEmployees: can(PERMISSIONS.HR.VIEW_EMPLOYEES),
      canManageEmployees: can(PERMISSIONS.HR.MANAGE_EMPLOYEES),
      canViewAttendance: can(PERMISSIONS.HR.VIEW_ATTENDANCE),
      canManageAttendance: can(PERMISSIONS.HR.MANAGE_ATTENDANCE),
      canViewPayroll: can(PERMISSIONS.HR.VIEW_PAYROLL),
      canManagePayroll: can(PERMISSIONS.HR.MANAGE_PAYROLL),
      canViewHRPerformance: can(PERMISSIONS.HR.VIEW_PERFORMANCE),
      canManageHRPerformance: can(PERMISSIONS.HR.MANAGE_PERFORMANCE),

      // Analytics & Reports
      canViewBasicAnalytics: can(PERMISSIONS.ANALYTICS.VIEW_BASIC),
      canViewAdvancedAnalytics: can(PERMISSIONS.ANALYTICS.VIEW_ADVANCED),
      canViewExecutiveAnalytics: can(PERMISSIONS.ANALYTICS.VIEW_EXECUTIVE),
      canExportAnalytics: can(PERMISSIONS.ANALYTICS.EXPORT),
      canConfigureDashboards: can(PERMISSIONS.ANALYTICS.CONFIGURE_DASHBOARDS),

      // System administration
      canViewSystemSettings: can(PERMISSIONS.SYSTEM.VIEW_SETTINGS),
      canManageSystemSettings: can(PERMISSIONS.SYSTEM.MANAGE_SETTINGS),
      canViewAuditLogs: can(PERMISSIONS.SYSTEM.VIEW_AUDIT_LOGS),
      canManageIntegrations: can(PERMISSIONS.SYSTEM.MANAGE_INTEGRATIONS),
      canManageApiKeys: can(PERMISSIONS.SYSTEM.MANAGE_API_KEYS),
      canManageWebhooks: can(PERMISSIONS.SYSTEM.MANAGE_WEBHOOKS),
      canManageTenants: can(PERMISSIONS.SYSTEM.MANAGE_TENANTS),
      canBackupRestore: can(PERMISSIONS.SYSTEM.BACKUP_RESTORE),

      // Referrals
      canViewOwnReferrals: can(PERMISSIONS.REFERRALS.VIEW_OWN),
      canViewAllReferrals: can(PERMISSIONS.REFERRALS.VIEW_ALL),
      canCreateReferral: can(PERMISSIONS.REFERRALS.CREATE),
      canTrackReferrals: can(PERMISSIONS.REFERRALS.TRACK),
      canManageReferralRewards: can(PERMISSIONS.REFERRALS.MANAGE_REWARDS),

      // Capabilities object
      capabilities,
    };
  }, [role]);

  return result;
}

// Re-export for convenience
export { PERMISSIONS, USER_ROLES } from '../../../shared/rbac-permissions';

/**
 * Legacy hook for backward compatibility
 */
export function useHasPermission(permission: keyof LegacyPermissions): boolean {
  const permissions = usePermissions();
  return permissions[permission];
}

/**
 * Check if user has specific role(s)
 */
export function useHasRole(roles: string | string[]): boolean {
  const { user } = useAuthStore();

  if (!user) {
    return false;
  }

  const userRole = mapLegacyRole(user.role);
  if (!userRole) return false;

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.some(r => mapLegacyRole(r) === userRole);
}

/**
 * Component to conditionally render children based on permission
 */
interface PermissionGateProps {
  permission: string | string[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  permission,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGateProps): React.ReactNode {
  const { can, canAny, canAll } = usePermissions();

  const hasPermission = Array.isArray(permission)
    ? requireAll
      ? canAll(permission)
      : canAny(permission)
    : can(permission);

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component to conditionally render based on admin status
 */
interface AdminGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  superAdminOnly?: boolean;
}

export function AdminGate({
  children,
  fallback = null,
  superAdminOnly = false,
}: AdminGateProps): React.ReactNode {
  const { isAdmin, isSuperAdmin } = usePermissions();

  const hasAccess = superAdminOnly ? isSuperAdmin : isAdmin;

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component to conditionally render based on role level
 */
interface RoleLevelGateProps {
  minLevel: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleLevelGate({
  minLevel,
  children,
  fallback = null,
}: RoleLevelGateProps): React.ReactNode {
  const { roleLevel } = usePermissions();

  return roleLevel >= minLevel ? <>{children}</> : <>{fallback}</>;
}
