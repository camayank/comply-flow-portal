/**
 * RBAC Permissions Configuration Tests
 *
 * Comprehensive tests for the unified RBAC permissions system.
 * These tests verify role definitions, permission mappings, and capability checks.
 */

import { describe, it, expect } from '@jest/globals';
import {
  USER_ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRoleLevel,
  hasEqualOrHigherRole,
  isAdminRole,
  canManageServices,
  canManageWorkflows,
  getRoleDisplayName,
  getRoleCapabilities,
  getPermissionsForRoles,
  type UserRole,
} from '../rbac-permissions';

// ============================================================================
// ROLE DEFINITIONS TESTS
// ============================================================================

describe('Role Definitions', () => {
  it('should have all 14 roles defined', () => {
    expect(Object.keys(USER_ROLES)).toHaveLength(14);
  });

  it('should have correct role string values', () => {
    expect(USER_ROLES.SUPER_ADMIN).toBe('super_admin');
    expect(USER_ROLES.ADMIN).toBe('admin');
    expect(USER_ROLES.SALES_MANAGER).toBe('sales_manager');
    expect(USER_ROLES.SALES_EXECUTIVE).toBe('sales_executive');
    expect(USER_ROLES.OPS_MANAGER).toBe('ops_manager');
    expect(USER_ROLES.OPS_EXECUTIVE).toBe('ops_executive');
    expect(USER_ROLES.OPS_LEAD).toBe('ops_lead');
    expect(USER_ROLES.CUSTOMER_SERVICE).toBe('customer_service');
    expect(USER_ROLES.QC_EXECUTIVE).toBe('qc_executive');
    expect(USER_ROLES.ACCOUNTANT).toBe('accountant');
    expect(USER_ROLES.COMPLIANCE_OFFICER).toBe('compliance_officer');
    expect(USER_ROLES.HR_MANAGER).toBe('hr_manager');
    expect(USER_ROLES.AGENT).toBe('agent');
    expect(USER_ROLES.CLIENT).toBe('client');
  });
});

// ============================================================================
// ROLE HIERARCHY TESTS
// ============================================================================

describe('Role Hierarchy', () => {
  it('should have super_admin as highest level (100)', () => {
    expect(ROLE_HIERARCHY[USER_ROLES.SUPER_ADMIN]).toBe(100);
  });

  it('should have client as lowest level (10)', () => {
    expect(ROLE_HIERARCHY[USER_ROLES.CLIENT]).toBe(10);
  });

  it('should have admin below super_admin', () => {
    expect(ROLE_HIERARCHY[USER_ROLES.ADMIN]).toBeLessThan(ROLE_HIERARCHY[USER_ROLES.SUPER_ADMIN]);
    expect(ROLE_HIERARCHY[USER_ROLES.ADMIN]).toBe(90);
  });

  it('should have correct manager hierarchy', () => {
    expect(ROLE_HIERARCHY[USER_ROLES.SALES_MANAGER]).toBe(85);
    expect(ROLE_HIERARCHY[USER_ROLES.OPS_MANAGER]).toBe(80);
    expect(ROLE_HIERARCHY[USER_ROLES.HR_MANAGER]).toBe(78);
    expect(ROLE_HIERARCHY[USER_ROLES.COMPLIANCE_OFFICER]).toBe(75);
  });

  it('should have executives below managers', () => {
    expect(ROLE_HIERARCHY[USER_ROLES.SALES_EXECUTIVE]).toBeLessThan(ROLE_HIERARCHY[USER_ROLES.SALES_MANAGER]);
    expect(ROLE_HIERARCHY[USER_ROLES.OPS_EXECUTIVE]).toBeLessThan(ROLE_HIERARCHY[USER_ROLES.OPS_MANAGER]);
  });

  it('should have all roles in hierarchy', () => {
    const roleValues = Object.values(USER_ROLES);
    roleValues.forEach(role => {
      expect(ROLE_HIERARCHY[role]).toBeDefined();
      expect(typeof ROLE_HIERARCHY[role]).toBe('number');
    });
  });
});

// ============================================================================
// PERMISSION STRUCTURE TESTS
// ============================================================================

describe('Permission Structure', () => {
  it('should have all permission categories defined', () => {
    expect(PERMISSIONS.AUTH).toBeDefined();
    expect(PERMISSIONS.USERS).toBeDefined();
    expect(PERMISSIONS.CLIENTS).toBeDefined();
    expect(PERMISSIONS.SERVICES).toBeDefined();
    expect(PERMISSIONS.WORKFLOWS).toBeDefined();
    expect(PERMISSIONS.BLUEPRINTS).toBeDefined();
    expect(PERMISSIONS.SERVICE_REQUESTS).toBeDefined();
    expect(PERMISSIONS.TASKS).toBeDefined();
    expect(PERMISSIONS.LEADS).toBeDefined();
    expect(PERMISSIONS.PROPOSALS).toBeDefined();
    expect(PERMISSIONS.DOCUMENTS).toBeDefined();
    expect(PERMISSIONS.PAYMENTS).toBeDefined();
    expect(PERMISSIONS.COMPLIANCE).toBeDefined();
    expect(PERMISSIONS.QC).toBeDefined();
    expect(PERMISSIONS.AGENTS).toBeDefined();
    expect(PERMISSIONS.HR).toBeDefined();
    expect(PERMISSIONS.ANALYTICS).toBeDefined();
    expect(PERMISSIONS.SYSTEM).toBeDefined();
    expect(PERMISSIONS.REFERRALS).toBeDefined();
  });

  it('should have correct service permission strings', () => {
    expect(PERMISSIONS.SERVICES.VIEW).toBe('services:view');
    expect(PERMISSIONS.SERVICES.CREATE).toBe('services:create');
    expect(PERMISSIONS.SERVICES.UPDATE).toBe('services:update');
    expect(PERMISSIONS.SERVICES.DELETE).toBe('services:delete');
    expect(PERMISSIONS.SERVICES.CONFIGURE).toBe('services:configure');
  });

  it('should have correct workflow permission strings', () => {
    expect(PERMISSIONS.WORKFLOWS.VIEW).toBe('workflows:view');
    expect(PERMISSIONS.WORKFLOWS.CREATE).toBe('workflows:create');
    expect(PERMISSIONS.WORKFLOWS.UPDATE).toBe('workflows:update');
    expect(PERMISSIONS.WORKFLOWS.DELETE).toBe('workflows:delete');
    expect(PERMISSIONS.WORKFLOWS.MANAGE_TEMPLATES).toBe('workflows:manage_templates');
    expect(PERMISSIONS.WORKFLOWS.IMPORT).toBe('workflows:import');
    expect(PERMISSIONS.WORKFLOWS.EXPORT).toBe('workflows:export');
  });
});

// ============================================================================
// ROLE-PERMISSION MAPPING TESTS
// ============================================================================

describe('Role-Permission Mappings', () => {
  describe('Super Admin Permissions', () => {
    const role = USER_ROLES.SUPER_ADMIN;

    it('should have ALL permissions', () => {
      // Super admin should have more permissions than any other role
      const superAdminPerms = ROLE_PERMISSIONS[role].length;
      Object.values(USER_ROLES).forEach(otherRole => {
        if (otherRole !== role) {
          expect(superAdminPerms).toBeGreaterThanOrEqual(ROLE_PERMISSIONS[otherRole].length);
        }
      });
    });

    it('should have all service permissions', () => {
      expect(hasPermission(role, PERMISSIONS.SERVICES.VIEW)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICES.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICES.UPDATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICES.DELETE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICES.CONFIGURE)).toBe(true);
    });

    it('should have all workflow permissions', () => {
      expect(hasPermission(role, PERMISSIONS.WORKFLOWS.VIEW)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.WORKFLOWS.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.WORKFLOWS.UPDATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.WORKFLOWS.DELETE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.WORKFLOWS.MANAGE_TEMPLATES)).toBe(true);
    });

    it('should have all system permissions', () => {
      expect(hasPermission(role, PERMISSIONS.SYSTEM.MANAGE_SETTINGS)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SYSTEM.MANAGE_TENANTS)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SYSTEM.BACKUP_RESTORE)).toBe(true);
    });
  });

  describe('Admin Permissions', () => {
    const role = USER_ROLES.ADMIN;

    it('should have service management permissions', () => {
      expect(hasPermission(role, PERMISSIONS.SERVICES.VIEW)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICES.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICES.UPDATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICES.DELETE)).toBe(true);
    });

    it('should have workflow management permissions', () => {
      expect(hasPermission(role, PERMISSIONS.WORKFLOWS.VIEW)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.WORKFLOWS.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.WORKFLOWS.UPDATE)).toBe(true);
    });

    it('should NOT have user delete permission', () => {
      expect(hasPermission(role, PERMISSIONS.USERS.DELETE)).toBe(false);
    });

    it('should NOT have tenant management', () => {
      expect(hasPermission(role, PERMISSIONS.SYSTEM.MANAGE_TENANTS)).toBe(false);
    });
  });

  describe('Sales Manager Permissions', () => {
    const role = USER_ROLES.SALES_MANAGER;

    it('should have lead management permissions', () => {
      expect(hasPermission(role, PERMISSIONS.LEADS.VIEW_ALL)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.LEADS.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.LEADS.UPDATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.LEADS.DELETE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.LEADS.ASSIGN)).toBe(true);
    });

    it('should have proposal management permissions', () => {
      expect(hasPermission(role, PERMISSIONS.PROPOSALS.VIEW_ALL)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.PROPOSALS.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.PROPOSALS.APPROVE)).toBe(true);
    });

    it('should NOT have service create/update permissions', () => {
      expect(hasPermission(role, PERMISSIONS.SERVICES.CREATE)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.SERVICES.UPDATE)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.SERVICES.DELETE)).toBe(false);
    });

    it('should have view-only service permission', () => {
      expect(hasPermission(role, PERMISSIONS.SERVICES.VIEW)).toBe(true);
    });
  });

  describe('Operations Manager Permissions', () => {
    const role = USER_ROLES.OPS_MANAGER;

    it('should have full service request permissions', () => {
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.UPDATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.ASSIGN)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.ESCALATE)).toBe(true);
    });

    it('should have full task permissions', () => {
      expect(hasPermission(role, PERMISSIONS.TASKS.VIEW_ALL)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.TASKS.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.TASKS.ASSIGN)).toBe(true);
    });

    it('should have compliance permissions', () => {
      expect(hasPermission(role, PERMISSIONS.COMPLIANCE.VIEW_ALL)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.COMPLIANCE.MANAGE)).toBe(true);
    });
  });

  describe('Operations Executive Permissions', () => {
    const role = USER_ROLES.OPS_EXECUTIVE;

    it('should have limited service request permissions', () => {
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.VIEW_ASSIGNED)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.UPDATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.CHANGE_STATUS)).toBe(true);
    });

    it('should NOT have assign permission', () => {
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.ASSIGN)).toBe(false);
    });

    it('should have limited task permissions', () => {
      expect(hasPermission(role, PERMISSIONS.TASKS.VIEW_OWN)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.TASKS.VIEW_TEAM)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.TASKS.UPDATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.TASKS.COMPLETE)).toBe(true);
    });

    it('should NOT have task assign/delete permissions', () => {
      expect(hasPermission(role, PERMISSIONS.TASKS.ASSIGN)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.TASKS.DELETE)).toBe(false);
    });
  });

  describe('Client Permissions', () => {
    const role = USER_ROLES.CLIENT;

    it('should only have view own permissions', () => {
      expect(hasPermission(role, PERMISSIONS.CLIENTS.VIEW_OWN)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.VIEW_OWN)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.TASKS.VIEW_OWN)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.DOCUMENTS.VIEW_OWN)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.PAYMENTS.VIEW_OWN)).toBe(true);
    });

    it('should NOT have view all permissions', () => {
      expect(hasPermission(role, PERMISSIONS.CLIENTS.VIEW_ALL)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.TASKS.VIEW_ALL)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.DOCUMENTS.VIEW_ALL)).toBe(false);
    });

    it('should NOT have any management permissions', () => {
      expect(hasPermission(role, PERMISSIONS.SERVICES.CREATE)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.WORKFLOWS.CREATE)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.USERS.CREATE)).toBe(false);
    });

    it('should be able to create service requests', () => {
      expect(hasPermission(role, PERMISSIONS.SERVICE_REQUESTS.CREATE)).toBe(true);
    });

    it('should be able to upload documents', () => {
      expect(hasPermission(role, PERMISSIONS.DOCUMENTS.UPLOAD)).toBe(true);
    });
  });

  describe('Agent Permissions', () => {
    const role = USER_ROLES.AGENT;

    it('should have lead creation permissions', () => {
      expect(hasPermission(role, PERMISSIONS.LEADS.VIEW_OWN)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.LEADS.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.LEADS.UPDATE)).toBe(true);
    });

    it('should have proposal permissions', () => {
      expect(hasPermission(role, PERMISSIONS.PROPOSALS.VIEW_OWN)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.PROPOSALS.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.PROPOSALS.SEND)).toBe(true);
    });

    it('should have referral permissions', () => {
      expect(hasPermission(role, PERMISSIONS.REFERRALS.VIEW_OWN)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.REFERRALS.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.REFERRALS.TRACK)).toBe(true);
    });

    it('should NOT have admin permissions', () => {
      expect(hasPermission(role, PERMISSIONS.SERVICES.CREATE)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.USERS.CREATE)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.SYSTEM.MANAGE_SETTINGS)).toBe(false);
    });
  });

  describe('QC Executive Permissions', () => {
    const role = USER_ROLES.QC_EXECUTIVE;

    it('should have QC permissions', () => {
      expect(hasPermission(role, PERMISSIONS.QC.VIEW)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.QC.REVIEW)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.QC.APPROVE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.QC.REJECT)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.QC.HANDOFF)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.QC.VIEW_METRICS)).toBe(true);
    });

    it('should have document verify permission', () => {
      expect(hasPermission(role, PERMISSIONS.DOCUMENTS.VERIFY)).toBe(true);
    });
  });

  describe('Accountant Permissions', () => {
    const role = USER_ROLES.ACCOUNTANT;

    it('should have full payment permissions', () => {
      expect(hasPermission(role, PERMISSIONS.PAYMENTS.VIEW_ALL)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.PAYMENTS.CREATE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.PAYMENTS.PROCESS)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.PAYMENTS.REFUND)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.PAYMENTS.MANAGE_INVOICES)).toBe(true);
    });

    it('should have analytics export permission', () => {
      expect(hasPermission(role, PERMISSIONS.ANALYTICS.EXPORT)).toBe(true);
    });
  });

  describe('HR Manager Permissions', () => {
    const role = USER_ROLES.HR_MANAGER;

    it('should have full HR permissions', () => {
      expect(hasPermission(role, PERMISSIONS.HR.VIEW_EMPLOYEES)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.HR.MANAGE_EMPLOYEES)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.HR.VIEW_ATTENDANCE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.HR.MANAGE_ATTENDANCE)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.HR.VIEW_PAYROLL)).toBe(true);
      expect(hasPermission(role, PERMISSIONS.HR.MANAGE_PAYROLL)).toBe(true);
    });
  });
});

// ============================================================================
// PERMISSION HELPER FUNCTION TESTS
// ============================================================================

describe('Permission Helper Functions', () => {
  describe('hasPermission', () => {
    it('should return true for valid permissions', () => {
      expect(hasPermission(USER_ROLES.SUPER_ADMIN, PERMISSIONS.SERVICES.CREATE)).toBe(true);
    });

    it('should return false for invalid permissions', () => {
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SERVICES.CREATE)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has any of the permissions', () => {
      expect(hasAnyPermission(USER_ROLES.CLIENT, [
        PERMISSIONS.SERVICES.CREATE,
        PERMISSIONS.SERVICES.VIEW,
      ])).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      expect(hasAnyPermission(USER_ROLES.CLIENT, [
        PERMISSIONS.SERVICES.CREATE,
        PERMISSIONS.SERVICES.DELETE,
      ])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      expect(hasAllPermissions(USER_ROLES.SUPER_ADMIN, [
        PERMISSIONS.SERVICES.CREATE,
        PERMISSIONS.SERVICES.UPDATE,
        PERMISSIONS.SERVICES.DELETE,
      ])).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      expect(hasAllPermissions(USER_ROLES.SALES_MANAGER, [
        PERMISSIONS.SERVICES.VIEW,
        PERMISSIONS.SERVICES.CREATE, // Sales manager doesn't have this
      ])).toBe(false);
    });
  });

  describe('getRoleLevel', () => {
    it('should return correct level for each role', () => {
      expect(getRoleLevel(USER_ROLES.SUPER_ADMIN)).toBe(100);
      expect(getRoleLevel(USER_ROLES.ADMIN)).toBe(90);
      expect(getRoleLevel(USER_ROLES.CLIENT)).toBe(10);
    });

    it('should return 0 for invalid role', () => {
      expect(getRoleLevel('invalid_role' as UserRole)).toBe(0);
    });
  });

  describe('hasEqualOrHigherRole', () => {
    it('should return true for same role', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.ADMIN, USER_ROLES.ADMIN)).toBe(true);
    });

    it('should return true for higher role', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN)).toBe(true);
      expect(hasEqualOrHigherRole(USER_ROLES.ADMIN, USER_ROLES.OPS_MANAGER)).toBe(true);
    });

    it('should return false for lower role', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.CLIENT, USER_ROLES.ADMIN)).toBe(false);
      expect(hasEqualOrHigherRole(USER_ROLES.AGENT, USER_ROLES.OPS_EXECUTIVE)).toBe(false);
    });
  });

  describe('isAdminRole', () => {
    it('should return true for super_admin', () => {
      expect(isAdminRole(USER_ROLES.SUPER_ADMIN)).toBe(true);
    });

    it('should return true for admin', () => {
      expect(isAdminRole(USER_ROLES.ADMIN)).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(isAdminRole(USER_ROLES.OPS_MANAGER)).toBe(false);
      expect(isAdminRole(USER_ROLES.SALES_MANAGER)).toBe(false);
      expect(isAdminRole(USER_ROLES.CLIENT)).toBe(false);
    });
  });

  describe('canManageServices', () => {
    it('should return true for admin roles', () => {
      expect(canManageServices(USER_ROLES.SUPER_ADMIN)).toBe(true);
      expect(canManageServices(USER_ROLES.ADMIN)).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(canManageServices(USER_ROLES.OPS_MANAGER)).toBe(false);
      expect(canManageServices(USER_ROLES.SALES_MANAGER)).toBe(false);
      expect(canManageServices(USER_ROLES.CLIENT)).toBe(false);
    });
  });

  describe('canManageWorkflows', () => {
    it('should return true for admin roles', () => {
      expect(canManageWorkflows(USER_ROLES.SUPER_ADMIN)).toBe(true);
      expect(canManageWorkflows(USER_ROLES.ADMIN)).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(canManageWorkflows(USER_ROLES.OPS_MANAGER)).toBe(false);
      expect(canManageWorkflows(USER_ROLES.CLIENT)).toBe(false);
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return correct display names', () => {
      expect(getRoleDisplayName(USER_ROLES.SUPER_ADMIN)).toBe('Super Administrator');
      expect(getRoleDisplayName(USER_ROLES.ADMIN)).toBe('Administrator');
      expect(getRoleDisplayName(USER_ROLES.SALES_MANAGER)).toBe('Sales Manager');
      expect(getRoleDisplayName(USER_ROLES.OPS_EXECUTIVE)).toBe('Operations Executive');
      expect(getRoleDisplayName(USER_ROLES.CLIENT)).toBe('Client');
    });
  });
});

// ============================================================================
// CAPABILITY MATRIX TESTS
// ============================================================================

describe('Role Capabilities', () => {
  describe('Super Admin Capabilities', () => {
    const caps = getRoleCapabilities(USER_ROLES.SUPER_ADMIN);

    it('should have full service capabilities', () => {
      expect(caps.services.create).toBe(true);
      expect(caps.services.read).toBe(true);
      expect(caps.services.update).toBe(true);
      expect(caps.services.delete).toBe(true);
      expect(caps.services.configure).toBe(true);
      expect(caps.services.manageWorkflows).toBe(true);
    });

    it('should have full workflow capabilities', () => {
      expect(caps.workflows.create).toBe(true);
      expect(caps.workflows.read).toBe(true);
      expect(caps.workflows.update).toBe(true);
      expect(caps.workflows.delete).toBe(true);
      expect(caps.workflows.import).toBe(true);
      expect(caps.workflows.export).toBe(true);
    });

    it('should have full user capabilities', () => {
      expect(caps.users.create).toBe(true);
      expect(caps.users.read).toBe(true);
      expect(caps.users.update).toBe(true);
      expect(caps.users.delete).toBe(true);
      expect(caps.users.assignRoles).toBe(true);
    });
  });

  describe('Client Capabilities', () => {
    const caps = getRoleCapabilities(USER_ROLES.CLIENT);

    it('should NOT have service management capabilities', () => {
      expect(caps.services.create).toBe(false);
      expect(caps.services.update).toBe(false);
      expect(caps.services.delete).toBe(false);
      expect(caps.services.configure).toBe(false);
    });

    it('should have service read capability', () => {
      expect(caps.services.read).toBe(true);
    });

    it('should NOT have workflow capabilities', () => {
      expect(caps.workflows.create).toBe(false);
      expect(caps.workflows.update).toBe(false);
      expect(caps.workflows.delete).toBe(false);
    });

    it('should have service request create capability', () => {
      expect(caps.serviceRequests.create).toBe(true);
      expect(caps.serviceRequests.read).toBe(true);
    });

    it('should have document upload capability', () => {
      expect(caps.documents.create).toBe(true);
      expect(caps.documents.read).toBe(true);
    });
  });

  describe('Sales Manager Capabilities', () => {
    const caps = getRoleCapabilities(USER_ROLES.SALES_MANAGER);

    it('should have full lead capabilities', () => {
      expect(caps.leads.create).toBe(true);
      expect(caps.leads.read).toBe(true);
      expect(caps.leads.update).toBe(true);
      expect(caps.leads.delete).toBe(true);
      expect(caps.leads.convert).toBe(true);
      expect(caps.leads.assign).toBe(true);
    });

    it('should have proposal approval capability', () => {
      expect(caps.proposals.create).toBe(true);
      expect(caps.proposals.approve).toBe(true);
    });
  });

  describe('Operations Manager Capabilities', () => {
    const caps = getRoleCapabilities(USER_ROLES.OPS_MANAGER);

    it('should have full task capabilities', () => {
      expect(caps.tasks.create).toBe(true);
      expect(caps.tasks.read).toBe(true);
      expect(caps.tasks.update).toBe(true);
      expect(caps.tasks.delete).toBe(true);
      expect(caps.tasks.assign).toBe(true);
    });

    it('should have service request assignment capability', () => {
      expect(caps.serviceRequests.assign).toBe(true);
      expect(caps.serviceRequests.escalate).toBe(true);
    });
  });
});

// ============================================================================
// EDGE CASES AND SECURITY TESTS
// ============================================================================

describe('Security Edge Cases', () => {
  it('should deny all permissions for undefined role', () => {
    const fakeRole = 'hacker_role' as UserRole;
    expect(hasPermission(fakeRole, PERMISSIONS.SERVICES.CREATE)).toBe(false);
    expect(hasPermission(fakeRole, PERMISSIONS.SYSTEM.MANAGE_SETTINGS)).toBe(false);
  });

  it('should handle empty permission arrays', () => {
    expect(hasAnyPermission(USER_ROLES.ADMIN, [])).toBe(false);
    expect(hasAllPermissions(USER_ROLES.ADMIN, [])).toBe(true); // All of nothing = true
  });

  it('should handle invalid permission strings', () => {
    expect(hasPermission(USER_ROLES.SUPER_ADMIN, 'invalid:permission')).toBe(false);
  });

  it('should ensure client cannot escalate to admin permissions', () => {
    // Critical security test - client should never have admin capabilities
    expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.USERS.CREATE)).toBe(false);
    expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.USERS.DELETE)).toBe(false);
    expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SYSTEM.MANAGE_SETTINGS)).toBe(false);
    expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SERVICES.CREATE)).toBe(false);
    expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SERVICES.DELETE)).toBe(false);
  });

  it('should ensure agent cannot access admin functions', () => {
    expect(hasPermission(USER_ROLES.AGENT, PERMISSIONS.USERS.CREATE)).toBe(false);
    expect(hasPermission(USER_ROLES.AGENT, PERMISSIONS.SERVICES.CREATE)).toBe(false);
    expect(hasPermission(USER_ROLES.AGENT, PERMISSIONS.SYSTEM.MANAGE_SETTINGS)).toBe(false);
  });
});

// ============================================================================
// MULTI-ROLE PERMISSION TESTS
// ============================================================================

describe('Multi-Role Permissions', () => {
  it('should combine permissions for multiple roles', () => {
    const permissions = getPermissionsForRoles([USER_ROLES.SALES_EXECUTIVE, USER_ROLES.OPS_EXECUTIVE]);

    // Should have permissions from both roles
    expect(permissions).toContain(PERMISSIONS.LEADS.CREATE); // From sales
    expect(permissions).toContain(PERMISSIONS.TASKS.COMPLETE); // From ops
  });

  it('should deduplicate permissions', () => {
    const permissions = getPermissionsForRoles([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
    const uniquePermissions = new Set(permissions);

    // Should have no duplicates
    expect(permissions.length).toBe(uniquePermissions.size);
  });
});
