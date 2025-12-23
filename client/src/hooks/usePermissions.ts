import { useAuthStore, User } from '@/store/authStore';
import { UserRole } from '@/types';

interface Permissions {
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

const rolePermissions: Record<UserRole, Permissions> = {
  CLIENT: {
    canViewClients: false,
    canEditClients: false,
    canDeleteClients: false,
    canViewServices: true,
    canEditServices: false,
    canViewLeads: false,
    canEditLeads: false,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
    canApproveCommissions: false,
    canViewAllData: false,
  },
  SALES: {
    canViewClients: true,
    canEditClients: true,
    canDeleteClients: false,
    canViewServices: true,
    canEditServices: false,
    canViewLeads: true,
    canEditLeads: true,
    canViewReports: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveCommissions: false,
    canViewAllData: false,
  },
  OPERATIONS: {
    canViewClients: true,
    canEditClients: true,
    canDeleteClients: false,
    canViewServices: true,
    canEditServices: false,
    canViewLeads: false,
    canEditLeads: false,
    canViewReports: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveCommissions: false,
    canViewAllData: false,
  },
  ADMIN: {
    canViewClients: true,
    canEditClients: true,
    canDeleteClients: true,
    canViewServices: true,
    canEditServices: true,
    canViewLeads: true,
    canEditLeads: true,
    canViewReports: true,
    canManageUsers: true,
    canManageSettings: true,
    canApproveCommissions: true,
    canViewAllData: true,
  },
  AGENT: {
    canViewClients: false,
    canEditClients: false,
    canDeleteClients: false,
    canViewServices: true,
    canEditServices: false,
    canViewLeads: true,
    canEditLeads: true,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
    canApproveCommissions: false,
    canViewAllData: false,
  },
  SUPER_ADMIN: {
    canViewClients: true,
    canEditClients: true,
    canDeleteClients: true,
    canViewServices: true,
    canEditServices: true,
    canViewLeads: true,
    canEditLeads: true,
    canViewReports: true,
    canManageUsers: true,
    canManageSettings: true,
    canApproveCommissions: true,
    canViewAllData: true,
  },
};

export function usePermissions(): Permissions {
  const { user } = useAuthStore();

  if (!user) {
    return rolePermissions.CLIENT; // Default to minimal permissions
  }

  return rolePermissions[user.role];
}

export function useHasPermission(permission: keyof Permissions): boolean {
  const permissions = usePermissions();
  return permissions[permission];
}

export function useHasRole(roles: UserRole | UserRole[]): boolean {
  const { user } = useAuthStore();

  if (!user) {
    return false;
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return allowedRoles.includes(user.role);
}
