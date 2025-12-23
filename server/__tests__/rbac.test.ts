/**
 * RBAC Authorization Tests
 *
 * Critical security tests for role-based access control.
 * These tests verify that the role hierarchy is correctly enforced.
 */

import { describe, it, expect } from '@jest/globals';
import { USER_ROLES, ROLE_HIERARCHY } from '../rbac-middleware';

describe('RBAC Role Hierarchy', () => {
  it('should have exactly 6 roles defined', () => {
    expect(Object.keys(ROLE_HIERARCHY)).toHaveLength(6);
  });

  it('should have super_admin as highest permission level', () => {
    const levels = Object.values(ROLE_HIERARCHY);
    const maxLevel = Math.max(...levels);
    expect(ROLE_HIERARCHY[USER_ROLES.SUPER_ADMIN]).toBe(maxLevel);
    expect(maxLevel).toBe(6);
  });

  it('should have client as lowest permission level', () => {
    const levels = Object.values(ROLE_HIERARCHY);
    const minLevel = Math.min(...levels);
    expect(ROLE_HIERARCHY[USER_ROLES.CLIENT]).toBe(minLevel);
    expect(minLevel).toBe(1);
  });

  it('should have sequential hierarchy: super_admin > admin > ops > customer_service > agent > client', () => {
    expect(ROLE_HIERARCHY[USER_ROLES.SUPER_ADMIN]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.ADMIN]);
    expect(ROLE_HIERARCHY[USER_ROLES.ADMIN]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.OPS_EXECUTIVE]);
    expect(ROLE_HIERARCHY[USER_ROLES.OPS_EXECUTIVE]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.CUSTOMER_SERVICE]);
    expect(ROLE_HIERARCHY[USER_ROLES.CUSTOMER_SERVICE]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.AGENT]);
    expect(ROLE_HIERARCHY[USER_ROLES.AGENT]).toBeGreaterThan(ROLE_HIERARCHY[USER_ROLES.CLIENT]);
  });

  it('should have all role keys match USER_ROLES constants', () => {
    const roleKeys = Object.keys(ROLE_HIERARCHY);
    const expectedRoles = Object.values(USER_ROLES);

    expect(roleKeys.sort()).toEqual(expectedRoles.sort());
  });

  it('should have no duplicate permission levels', () => {
    const levels = Object.values(ROLE_HIERARCHY);
    const uniqueLevels = new Set(levels);
    expect(uniqueLevels.size).toBe(levels.length);
  });

  it('should have contiguous levels from 1 to 6', () => {
    const levels = Object.values(ROLE_HIERARCHY).sort();
    expect(levels).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('RBAC Role Constants', () => {
  it('should have role string values matching their keys', () => {
    expect(USER_ROLES.SUPER_ADMIN).toBe('super_admin');
    expect(USER_ROLES.ADMIN).toBe('admin');
    expect(USER_ROLES.OPS_EXECUTIVE).toBe('ops_executive');
    expect(USER_ROLES.CUSTOMER_SERVICE).toBe('customer_service');
    expect(USER_ROLES.AGENT).toBe('agent');
    expect(USER_ROLES.CLIENT).toBe('client');
  });

  it('should be immutable (as const)', () => {
    // @ts-expect-error - Testing immutability
    expect(() => { USER_ROLES.SUPER_ADMIN = 'hacker'; }).toThrow();
  });
});

describe('Authorization Logic Verification', () => {
  /**
   * Simulate the requireMinimumRole logic
   */
  function hasMinimumRole(userRole: string, minimumRole: string): boolean {
    const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
    const minLevel = ROLE_HIERARCHY[minimumRole as keyof typeof ROLE_HIERARCHY] || 0;
    return userLevel >= minLevel;
  }

  describe('Super Admin Access', () => {
    it('should allow super_admin to access admin endpoints', () => {
      expect(hasMinimumRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN)).toBe(true);
    });

    it('should allow super_admin to access all lower role endpoints', () => {
      expect(hasMinimumRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.OPS_EXECUTIVE)).toBe(true);
      expect(hasMinimumRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.CUSTOMER_SERVICE)).toBe(true);
      expect(hasMinimumRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.AGENT)).toBe(true);
      expect(hasMinimumRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.CLIENT)).toBe(true);
    });
  });

  describe('Client Access', () => {
    it('should NOT allow client to access admin endpoints', () => {
      expect(hasMinimumRole(USER_ROLES.CLIENT, USER_ROLES.ADMIN)).toBe(false);
    });

    it('should NOT allow client to access any higher role endpoints', () => {
      expect(hasMinimumRole(USER_ROLES.CLIENT, USER_ROLES.SUPER_ADMIN)).toBe(false);
      expect(hasMinimumRole(USER_ROLES.CLIENT, USER_ROLES.OPS_EXECUTIVE)).toBe(false);
      expect(hasMinimumRole(USER_ROLES.CLIENT, USER_ROLES.CUSTOMER_SERVICE)).toBe(false);
      expect(hasMinimumRole(USER_ROLES.CLIENT, USER_ROLES.AGENT)).toBe(false);
    });

    it('should allow client to access client endpoints', () => {
      expect(hasMinimumRole(USER_ROLES.CLIENT, USER_ROLES.CLIENT)).toBe(true);
    });
  });

  describe('Mid-Level Roles', () => {
    it('should allow ops_executive to access customer_service and below', () => {
      expect(hasMinimumRole(USER_ROLES.OPS_EXECUTIVE, USER_ROLES.CUSTOMER_SERVICE)).toBe(true);
      expect(hasMinimumRole(USER_ROLES.OPS_EXECUTIVE, USER_ROLES.AGENT)).toBe(true);
      expect(hasMinimumRole(USER_ROLES.OPS_EXECUTIVE, USER_ROLES.CLIENT)).toBe(true);
    });

    it('should NOT allow ops_executive to access admin or super_admin', () => {
      expect(hasMinimumRole(USER_ROLES.OPS_EXECUTIVE, USER_ROLES.ADMIN)).toBe(false);
      expect(hasMinimumRole(USER_ROLES.OPS_EXECUTIVE, USER_ROLES.SUPER_ADMIN)).toBe(false);
    });

    it('should allow agent to access client but nothing higher', () => {
      expect(hasMinimumRole(USER_ROLES.AGENT, USER_ROLES.CLIENT)).toBe(true);
      expect(hasMinimumRole(USER_ROLES.AGENT, USER_ROLES.CUSTOMER_SERVICE)).toBe(false);
      expect(hasMinimumRole(USER_ROLES.AGENT, USER_ROLES.OPS_EXECUTIVE)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should deny access for undefined roles', () => {
      expect(hasMinimumRole('hacker', USER_ROLES.CLIENT)).toBe(false);
      expect(hasMinimumRole(USER_ROLES.CLIENT, 'super_hacker')).toBe(false);
    });

    it('should deny access when both roles are invalid', () => {
      expect(hasMinimumRole('invalid', 'also_invalid')).toBe(false);
    });
  });
});
