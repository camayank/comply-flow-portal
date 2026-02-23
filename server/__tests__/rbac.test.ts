/**
 * RBAC Permissions Tests
 * Tests for role-based access control system
 */

import { describe, it, expect } from '@jest/globals';
import {
  USER_ROLES,
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRoleLevel,
  hasEqualOrHigherRole,
  isAdminRole,
  getRoleCapabilities,
} from '@shared/rbac-permissions';

describe('RBAC Permissions', () => {
  describe('Role Hierarchy', () => {
    it('should have super_admin at highest level', () => {
      expect(getRoleLevel(USER_ROLES.SUPER_ADMIN)).toBe(100);
    });

    it('should have client at lowest level', () => {
      expect(getRoleLevel(USER_ROLES.CLIENT)).toBe(10);
    });

    it('should properly order sales roles', () => {
      const salesManagerLevel = getRoleLevel(USER_ROLES.SALES_MANAGER);
      const salesExecLevel = getRoleLevel(USER_ROLES.SALES_EXECUTIVE);
      expect(salesManagerLevel).toBeGreaterThan(salesExecLevel);
    });
  });

  describe('hasPermission', () => {
    it('super_admin should have all permissions', () => {
      expect(hasPermission(USER_ROLES.SUPER_ADMIN, PERMISSIONS.LEADS.DELETE)).toBe(true);
      expect(hasPermission(USER_ROLES.SUPER_ADMIN, PERMISSIONS.SYSTEM.MANAGE_TENANTS)).toBe(true);
    });

    it('sales_manager should have all lead permissions', () => {
      expect(hasPermission(USER_ROLES.SALES_MANAGER, PERMISSIONS.LEADS.VIEW_ALL)).toBe(true);
      expect(hasPermission(USER_ROLES.SALES_MANAGER, PERMISSIONS.LEADS.DELETE)).toBe(true);
      expect(hasPermission(USER_ROLES.SALES_MANAGER, PERMISSIONS.LEADS.ASSIGN)).toBe(true);
    });

    it('sales_executive should NOT have delete/assign permissions', () => {
      expect(hasPermission(USER_ROLES.SALES_EXECUTIVE, PERMISSIONS.LEADS.DELETE)).toBe(false);
      expect(hasPermission(USER_ROLES.SALES_EXECUTIVE, PERMISSIONS.LEADS.ASSIGN)).toBe(false);
    });

    it('client should NOT have lead permissions', () => {
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.LEADS.VIEW_OWN)).toBe(false);
      expect(hasPermission(USER_ROLES.CLIENT, PERMISSIONS.LEADS.CREATE)).toBe(false);
    });
  });

  describe('hasEqualOrHigherRole', () => {
    it('super_admin should have higher role than all others', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN)).toBe(true);
      expect(hasEqualOrHigherRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.CLIENT)).toBe(true);
    });

    it('client should NOT have higher role than staff', () => {
      expect(hasEqualOrHigherRole(USER_ROLES.CLIENT, USER_ROLES.AGENT)).toBe(false);
    });
  });

  describe('isAdminRole', () => {
    it('should return true for admin roles', () => {
      expect(isAdminRole(USER_ROLES.SUPER_ADMIN)).toBe(true);
      expect(isAdminRole(USER_ROLES.ADMIN)).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(isAdminRole(USER_ROLES.SALES_MANAGER)).toBe(false);
      expect(isAdminRole(USER_ROLES.CLIENT)).toBe(false);
    });
  });

  describe('getRoleCapabilities', () => {
    it('sales_manager should have full lead capabilities', () => {
      const caps = getRoleCapabilities(USER_ROLES.SALES_MANAGER);
      expect(caps.leads.create).toBe(true);
      expect(caps.leads.delete).toBe(true);
      expect(caps.leads.assign).toBe(true);
    });

    it('sales_executive should have limited capabilities', () => {
      const caps = getRoleCapabilities(USER_ROLES.SALES_EXECUTIVE);
      expect(caps.leads.create).toBe(true);
      expect(caps.leads.delete).toBe(false);
      expect(caps.leads.assign).toBe(false);
    });

    it('client should NOT have lead capabilities', () => {
      const caps = getRoleCapabilities(USER_ROLES.CLIENT);
      expect(caps.leads.create).toBe(false);
      expect(caps.leads.read).toBe(false);
    });
  });
});
