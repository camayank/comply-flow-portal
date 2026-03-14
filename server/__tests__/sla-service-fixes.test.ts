/**
 * SLA Service Fixes - Unit Tests
 * Tests the IST timezone-aware addBusinessHours method
 *
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, jest } from '@jest/globals';

// Mock all heavy dependencies before importing the service
jest.mock('@shared/schema', () => ({
  serviceRequests: { id: 'id', status: 'status', serviceId: 'service_id', priority: 'priority', slaDeadline: 'sla_deadline', createdAt: 'created_at', requestId: 'request_id', assignedTeamMember: 'assigned_team_member', updatedAt: 'updated_at' },
  slaSettings: { serviceCode: 'service_code', responseHours: 'response_hours', standardHours: 'standard_hours' },
  activityLogs: {},
}));

const mockDb = {
  select: jest.fn(),
  from: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  insert: jest.fn(),
  values: jest.fn(),
  update: jest.fn(),
  set: jest.fn(),
};
// Chain all methods to return mockDb
Object.values(mockDb).forEach(fn => (fn as jest.Mock).mockReturnValue(mockDb));
// @ts-expect-error - mock resolved value type mismatch
mockDb.limit.mockResolvedValue([]);
// @ts-expect-error - mock resolved value type mismatch
mockDb.values.mockResolvedValue([]);

jest.mock('../db', () => ({ db: mockDb }));

jest.mock('../services/notifications', () => {
  const send = jest.fn();
  send.mockResolvedValue(undefined as never);
  return { notificationHub: { send } };
});

jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  sql: jest.fn(),
  lt: jest.fn(),
  notInArray: jest.fn(),
}));

import { SLAService } from '../services/sla-service';

describe('SLA Service Fixes', () => {
  describe('addBusinessHours - IST timezone', () => {
    it('calculates deadline in IST business hours (9AM-6PM)', () => {
      const slaService = new SLAService();
      // Monday 10AM IST = Monday 4:30AM UTC
      const startUtc = new Date('2026-03-16T04:30:00.000Z');
      // Add 4 business hours -> should be Monday 2PM IST = Monday 8:30AM UTC
      const deadline = slaService.addBusinessHours(startUtc, 4);
      expect(deadline.toISOString()).toBe('2026-03-16T08:30:00.000Z');
    });

    it('wraps to next business day when hours exceed 6PM IST', () => {
      const slaService = new SLAService();
      // Monday 4PM IST = Monday 10:30AM UTC
      const startUtc = new Date('2026-03-16T10:30:00.000Z');
      // Add 4 business hours -> 2 hrs Mon + 2 hrs Tue = Tue 11AM IST = Tue 5:30AM UTC
      const deadline = slaService.addBusinessHours(startUtc, 4);
      expect(deadline.toISOString()).toBe('2026-03-17T05:30:00.000Z');
    });

    it('skips weekends', () => {
      const slaService = new SLAService();
      // Friday 5PM IST = Friday 11:30AM UTC
      const startUtc = new Date('2026-03-20T11:30:00.000Z');
      // Add 2 business hours -> 1 hr Fri + skip Sat/Sun + 1 hr Mon = Mon 10AM IST
      const deadline = slaService.addBusinessHours(startUtc, 2);
      expect(deadline.toISOString()).toBe('2026-03-23T04:30:00.000Z');
    });
  });
});
