/**
 * RBAC Middleware Authorization Tests
 *
 * Critical security tests for role-based access control middleware.
 * These tests verify that the role hierarchy is correctly enforced.
 */

import { describe, it, expect } from '@jest/globals';
import {
  USER_ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasPermission,
  hasEqualOrHigherRole,
  isAdminRole,
  canManageServices,
  canManageWorkflows,
  type UserRole,
} from '../../shared/rbac-permissions';

// ============================================================================
// ROLE HIERARCHY TESTS
// ============================================================================

describe('RBAC Role Hierarchy', () => {
  it('should have 14 roles defined', () => {
    expect(Object.keys(USER_ROLES)).toHaveLength(14);
  });

  it('should have super_admin as highest permission level (100)', () => {
    const levels = Object.values(ROLE_HIERARCHY);
    const maxLevel = Math.max(...levels);
    expect(ROLE_HIERARCHY[USER_ROLES.SUPER_ADMIN]).toBe(maxLevel);
    expect(maxLevel).toBe(100);
  });

  it('should have client as lowest permission level (10)', () => {
    const levels = Object.values(ROLE_HIERARCHY);
    const minLevel = Math.min(...levels);
    expect(ROLE_HIERARCHY[USER_ROLES.CLIENT]).toBe(minLevel);
    expect(minLevel).toBe(10);
  });

  it('should have proper hierarchy: super_admin > admin > managers > executives > client', () => {
    expect(ROLE_HIERARCHY[USER_ROLES.SUPER_ADMIN]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.ADMIN]);
    expect(ROLE_HIERARCHY[USER_ROLES.ADMIN]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.SALES_MANAGER]);
    expect(ROLE_HIERARCHY[USER_ROLES.SALES_MANAGER]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.OPS_MANAGER]);
    expect(ROLE_HIERARCHY[USER_ROLES.OPS_MANAGER]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.SALES_EXECUTIVE]);
    expect(ROLE_HIERARCHY[USER_ROLES.OPS_EXECUTIVE]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.CUSTOMER_SERVICE]);
    expect(ROLE_HIERARCHY[USER_ROLES.CUSTOMER_SERVICE]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.AGENT]);
    expect(ROLE_HIERARCHY[USER_ROLES.AGENT]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.CLIENT]);
  });

  it('should have all role keys defined in hierarchy', () => {
    const roleValues = Object.values(USER_ROLES);
    roleValues.forEach(role => {
      expect(ROLE_HIERARCHY[role]).toBeDefined();
      expect(typeof ROLE_HIERARCHY[role]).toBe('number');
    });
  });
});

// ============================================================================
// ROLE CONSTANTS TESTS
// ============================================================================

describe('RBAC Role Constants', () => {
  it('should have role string values matching their keys', () => {
    expect(USER_ROLES.SUPER_ADMIN).toBe('super_admin');
    expect(USER_ROLES.ADMIN).toBe('admin');
    expect(USER_ROLES.SALES_MANAGER).toBe('sales_manager');
    expect(USER_ROLES.SALES_EXECUTIVE).toBe('sales_executive');
    expect(USER_ROLES.OPS_MANAGER).toBe('ops_manager');
    expect(USER_ROLES.OPS_EXECUTIVE).toBe('ops_executive');
    expect(USER_ROLES.CUSTOMER_SERVICE).toBe('customer_service');
    expect(USER_ROLES.QC_EXECUTIVE).toBe('qc_executive');
    expect(USER_ROLES.ACCOUNTANT).toBe('accountant');
    expect(USER_ROLES.AGENT).toBe('agent');
    expect(USER_ROLES.CLIENT).toBe('client');
  });
});

// ============================================================================
// AUTHORIZATION LOGIC TESTS
// ============================================================================

describe('Authorization Logic Verification', () => {
  describe('Super Admin Access', () => {
    it('should allow super_admin to access admin endpoints', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN)).toBe(true);
    });

    it('should allow super_admin to access all lower role endpoints', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.OPS_MANAGER)).toBe(true);
      expect(hasEqualOrHigherRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.OPS_EXECUTIVE)).toBe(true);
      expect(hasEqualOrHigherRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.CUSTOMER_SERVICE)).toBe(true);
      expect(hasEqualOrHigherRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.AGENT)).toBe(true);
      expect(hasEqualOrHigherRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.CLIENT)).toBe(true);
    });

    it('should have all permissions', () => {
      expect(hasPermission(USER_ROLES.SUPER_ADMIN, PERMISSIONS.SERVICES.CREATE)).toBe(true);
      expect(hasPermission(USER_ROLES.SUPER_ADMIN, PERMISSIONS.SERVICES.DELETE)).toBe(true);
      expect(hasPermission(USER_ROLES.SUPER_ADMIN, PERMISSIONS.WORKFLOWS.CREATE)).toBe(true);
      expect(hasPermission(USER_ROLES.SUPER_ADMIN, PERMISSIONS.SYSTEM.MANAGE_TENANTS)).toBe(true);
    });
  });

  describe('Admin Access', () => {
    it('should allow admin to access manager endpoints', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.ADMIN, USER_ROLES.OPS_MANAGER)).toBe(true);
      expect(hasEqualOrHigherRole(USER_ROLES.ADMIN, USER_ROLES.SALES_MANAGER)).toBe(true);
    });

    it('should have service management permissions', () => {
      expect(hasPermission(USER_ROLES.ADMIN, PERMISSIONS.SERVICES.CREATE)).toBe(true);
      expect(hasPermission(USER_ROLES.ADMIN, PERMISSIONS.SERVICES.UPDATE)).toBe(true);
      expect(hasPermission(USER_ROLES.ADMIN, PERMISSIONS.SERVICES.DELETE)).toBe(true);
    });

    it('should NOT have tenant management permission', () => {
      expect(hasPermission(USER_ROLES.ADMIN, PERMISSIONS.SYSTEM.MANAGE_TENANTS)).toBe(false);
    });
  });

  describe('Client Access', () => {
    it('should NOT allow client to access admin endpoints', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.CLIENT, USER_ROLES.ADMIN)).toBe(false);
    });

    it('should NOT allow client to access any higher role endpoints', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.CLIENT, USER_ROLES.SUPER_ADMIN)).toBe(false);
      expect(hasEqualOrHigherRole(USER_ROLES.CLIENT, USER_ROLES.OPS_MANAGER)).toBe(false);
      expect(hasEqualOrHigherRole(USER_ROLES.CLIENT, USER_ROLES.OPS_EXECUTIVE)).toBe(false);
      expect(hasEqualOrHigherRole(USER_ROLES.CLIENT, USER_ROLES.CUSTOMER_SERVICE)).toBe(false);
      expect(hasEqualOrHigherRole(USER_ROLES.CLIENT, USER_ROLES.AGENT)).toBe(false);
    });

    it('should allow client to access client endpoints', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.CLIENT, USER_ROLES.CLIENT)).toBe(true);
    });

    it('should NOT have service management permissions', () => {
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SERVICES.CREATE)).toBe(false);
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SERVICES.UPDATE)).toBe(false);
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SERVICES.DELETE)).toBe(false);
    });

    it('should have view own permissions', () => {
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.CLIENTS.VIEW_OWN)).toBe(true);
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SERVICE_REQUESTS.VIEW_OWN)).toBe(true);
    });
  });

  describe('Mid-Level Roles', () => {
    it('should allow ops_manager to access ops_executive and below', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.OPS_MANAGER, USER_ROLES.OPS_EXECUTIVE)).toBe(true);
      expect(hasEqualOrHigherRole(USER_ROLES.OPS_MANAGER, USER_ROLES.CUSTOMER_SERVICE)).toBe(true);
      expect(hasEqualOrHigherRole(USER_ROLES.OPS_MANAGER, USER_ROLES.CLIENT)).toBe(true);
    });

    it('should NOT allow ops_manager to access admin or super_admin', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.OPS_MANAGER, USER_ROLES.ADMIN)).toBe(false);
      expect(hasEqualOrHigherRole(USER_ROLES.OPS_MANAGER, USER_ROLES.SUPER_ADMIN)).toBe(false);
    });

    it('should allow agent to access client but nothing higher', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.AGENT, USER_ROLES.CLIENT)).toBe(true);
      expect(hasEqualOrHigherRole(USER_ROLES.AGENT, USER_ROLES.CUSTOMER_SERVICE)).toBe(false);
      expect(hasEqualOrHigherRole(USER_ROLES.AGENT, USER_ROLES.OPS_EXECUTIVE)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined roles safely', () => {
      const invalidRole = 'hacker' as UserRole;
      expect(hasPermission(invalidRole, PERMISSIONS.SERVICES.CREATE)).toBe(false);
    });

    it('should handle empty permission string', () => {
      expect(hasPermission(USER_ROLES.SUPER_ADMIN, '')).toBe(false);
    });
  });
});

// ============================================================================
// SERVICE MANAGEMENT PERMISSION TESTS
// ============================================================================

describe('Service Management Permissions', () => {
  it('should allow super_admin to manage services', () => {
    expect(canManageServices(USER_ROLES.SUPER_ADMIN)).toBe(true);
  });

  it('should allow admin to manage services', () => {
    expect(canManageServices(USER_ROLES.ADMIN)).toBe(true);
  });

  it('should NOT allow ops_manager to manage services', () => {
    expect(canManageServices(USER_ROLES.OPS_MANAGER)).toBe(false);
  });

  it('should NOT allow sales_manager to manage services', () => {
    expect(canManageServices(USER_ROLES.SALES_MANAGER)).toBe(false);
  });

  it('should NOT allow client to manage services', () => {
    expect(canManageServices(USER_ROLES.CLIENT)).toBe(false);
  });
});

// ============================================================================
// WORKFLOW MANAGEMENT PERMISSION TESTS
// ============================================================================

describe('Workflow Management Permissions', () => {
  it('should allow super_admin to manage workflows', () => {
    expect(canManageWorkflows(USER_ROLES.SUPER_ADMIN)).toBe(true);
  });

  it('should allow admin to manage workflows', () => {
    expect(canManageWorkflows(USER_ROLES.ADMIN)).toBe(true);
  });

  it('should NOT allow ops_manager to manage workflows', () => {
    expect(canManageWorkflows(USER_ROLES.OPS_MANAGER)).toBe(false);
  });

  it('should NOT allow client to manage workflows', () => {
    expect(canManageWorkflows(USER_ROLES.CLIENT)).toBe(false);
  });
});

// ============================================================================
// ADMIN ROLE DETECTION TESTS
// ============================================================================

describe('Admin Role Detection', () => {
  it('should identify super_admin as admin', () => {
    expect(isAdminRole(USER_ROLES.SUPER_ADMIN)).toBe(true);
  });

  it('should identify admin as admin', () => {
    expect(isAdminRole(USER_ROLES.ADMIN)).toBe(true);
  });

  it('should NOT identify ops_manager as admin', () => {
    expect(isAdminRole(USER_ROLES.OPS_MANAGER)).toBe(false);
  });

  it('should NOT identify sales_manager as admin', () => {
    expect(isAdminRole(USER_ROLES.SALES_MANAGER)).toBe(false);
  });

  it('should NOT identify client as admin', () => {
    expect(isAdminRole(USER_ROLES.CLIENT)).toBe(false);
  });

  it('should NOT identify agent as admin', () => {
    expect(isAdminRole(USER_ROLES.AGENT)).toBe(false);
  });
});

// ============================================================================
// CRITICAL SECURITY TESTS
// ============================================================================

describe('Critical Security Verifications', () => {
  describe('Privilege Escalation Prevention', () => {
    it('client cannot access admin permissions', () => {
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.USERS.CREATE)).toBe(false);
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.USERS.DELETE)).toBe(false);
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SERVICES.CREATE)).toBe(false);
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SYSTEM.MANAGE_SETTINGS)).toBe(false);
    });

    it('agent cannot access admin permissions', () => {
      expect(hasPermission(USER_ROLES.AGENT, PERMISSIONS.USERS.CREATE)).toBe(false);
      expect(hasPermission(USER_ROLES.AGENT, PERMISSIONS.SERVICES.CREATE)).toBe(false);
      expect(hasPermission(USER_ROLES.AGENT, PERMISSIONS.SYSTEM.MANAGE_SETTINGS)).toBe(false);
    });

    it('ops_executive cannot manage services or workflows', () => {
      expect(hasPermission(USER_ROLES.OPS_EXECUTIVE, PERMISSIONS.SERVICES.CREATE)).toBe(false);
      expect(hasPermission(USER_ROLES.OPS_EXECUTIVE, PERMISSIONS.SERVICES.DELETE)).toBe(false);
      expect(hasPermission(USER_ROLES.OPS_EXECUTIVE, PERMISSIONS.WORKFLOWS.CREATE)).toBe(false);
    });

    it('sales_executive cannot manage services or users', () => {
      expect(hasPermission(USER_ROLES.SALES_EXECUTIVE, PERMISSIONS.SERVICES.CREATE)).toBe(false);
      expect(hasPermission(USER_ROLES.SALES_EXECUTIVE, PERMISSIONS.USERS.CREATE)).toBe(false);
    });
  });

  describe('Data Access Boundaries', () => {
    it('client can only view own data', () => {
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.CLIENTS.VIEW_OWN)).toBe(true);
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.CLIENTS.VIEW_ALL)).toBe(false);
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SERVICE_REQUESTS.VIEW_OWN)).toBe(true);
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL)).toBe(false);
    });

    it('agent can only view own data', () => {
      expect(hasPermission(USER_ROLES.AGENT, PERMISSIONS.AGENTS.VIEW_OWN)).toBe(true);
      expect(hasPermission(USER_ROLES.AGENT, PERMISSIONS.LEADS.VIEW_OWN)).toBe(true);
    });

    it('ops_manager can view all data', () => {
      expect(hasPermission(USER_ROLES.OPS_MANAGER, PERMISSIONS.SERVICE_REQUESTS.VIEW_ALL)).toBe(true);
      expect(hasPermission(USER_ROLES.OPS_MANAGER, PERMISSIONS.TASKS.VIEW_ALL)).toBe(true);
    });
  });
});
