/**
 * SLA Service
 *
 * Comprehensive SLA management service for service requests.
 * Handles SLA configuration, deadline calculation with business hours,
 * breach detection, and escalation management.
 */

import { db } from '../db';
import { serviceRequests, slaSettings, activityLogs } from '@shared/schema';
import { eq, and, sql, lt, notInArray } from 'drizzle-orm';
import { notificationHub } from './notifications';
import { logger } from '../logger';

// ============================================
// TYPES
// ============================================

export interface SLAConfig {
  responseHours: number;
  resolutionHours: number;
  escalationLevels: EscalationLevel[];
}

export interface EscalationLevel {
  level: number;
  afterHours: number;
  notifyRoles: string[];
}

export interface SLAStatus {
  isBreached: boolean;
  breachType?: 'response' | 'resolution';
  hoursRemaining: number;
  hoursElapsed: number;
  escalationLevel: number;
  deadline: Date;
  percentageUsed: number;
}

export interface SLACheckResult {
  checked: number;
  escalated: number;
  breached: number;
  errors: number;
}

// Priority multipliers for SLA calculation
const PRIORITY_MULTIPLIERS: Record<string, number> = {
  urgent: 0.25,
  high: 0.5,
  medium: 1.0,
  low: 1.5
};

// Default SLA configuration
const DEFAULT_SLA_CONFIG: SLAConfig = {
  responseHours: 4,
  resolutionHours: 48,
  escalationLevels: [
    { level: 1, afterHours: 24, notifyRoles: ['ops_executive'] },      // 50% of 48h
    { level: 2, afterHours: 36, notifyRoles: ['ops_manager'] },        // 75% of 48h
    { level: 3, afterHours: 43.2, notifyRoles: ['admin', 'ops_manager'] } // 90% of 48h
  ]
};

// Business hours configuration (Mon-Fri, 9 AM - 6 PM IST)
const BUSINESS_HOURS = {
  start: 9,  // 9 AM
  end: 18,   // 6 PM
  workDays: [1, 2, 3, 4, 5] // Monday to Friday
};

// IST timezone constants for environment-agnostic business hour calculations
const IST_OFFSET_MS = 330 * 60 * 1000; // UTC + 5:30 (330 minutes)
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// ============================================
// SLA SERVICE CLASS
// ============================================

class SLAService {
  /**
   * Get SLA configuration for a specific service
   */
  async getSLAConfig(serviceId: string): Promise<SLAConfig> {
    try {
      const [config] = await db
        .select()
        .from(slaSettings)
        .where(eq(slaSettings.serviceCode, serviceId))
        .limit(1);

      if (config) {
        return {
          responseHours: config.responseHours || DEFAULT_SLA_CONFIG.responseHours,
          resolutionHours: config.standardHours || DEFAULT_SLA_CONFIG.resolutionHours,
          escalationLevels: this.buildEscalationLevels(config.standardHours || DEFAULT_SLA_CONFIG.resolutionHours)
        };
      }

      return DEFAULT_SLA_CONFIG;
    } catch (error) {
      logger.error('Error getting SLA config:', { serviceId, error });
      return DEFAULT_SLA_CONFIG;
    }
  }

  /**
   * Build escalation levels based on total resolution hours
   * Levels are at 50%, 75%, and 90% of total SLA time
   */
  private buildEscalationLevels(totalHours: number): EscalationLevel[] {
    return [
      { level: 1, afterHours: totalHours * 0.5, notifyRoles: ['ops_executive'] },
      { level: 2, afterHours: totalHours * 0.75, notifyRoles: ['ops_manager'] },
      { level: 3, afterHours: totalHours * 0.9, notifyRoles: ['admin', 'ops_manager'] }
    ];
  }

  /**
   * Calculate SLA deadline considering priority and business hours
   */
  async calculateDeadline(
    serviceId: string,
    priority: string = 'medium',
    createdAt: Date = new Date()
  ): Promise<Date> {
    const config = await this.getSLAConfig(serviceId);
    const multiplier = PRIORITY_MULTIPLIERS[priority.toLowerCase()] || 1.0;
    const adjustedHours = config.resolutionHours * multiplier;

    // Calculate deadline using business hours
    return this.addBusinessHours(createdAt, adjustedHours);
  }

  /**
   * Add business hours to a date, using IST (UTC+05:30) millisecond arithmetic.
   * Environment-agnostic: never uses getHours/setHours/getDay which depend on local TZ.
   * Only counts hours during business days (Mon-Fri) and business hours (9 AM - 6 PM IST).
   */
  addBusinessHours(startDate: Date, hours: number): Date {
    let istMs = startDate.getTime() + IST_OFFSET_MS;
    let remaining = hours;
    const BUSINESS_START = 9;
    const BUSINESS_END = 18;

    while (remaining > 0) {
      const msInDay = ((istMs % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY;
      const hour = Math.floor(msInDay / MS_PER_HOUR);
      const minute = Math.floor((msInDay % MS_PER_HOUR) / MS_PER_MINUTE);
      const dayOfWeek = new Date(istMs).getUTCDay();
      const dayStart = istMs - msInDay;

      // Skip weekends
      if (dayOfWeek === 0) { istMs = dayStart + MS_PER_DAY + BUSINESS_START * MS_PER_HOUR; continue; }
      if (dayOfWeek === 6) { istMs = dayStart + 2 * MS_PER_DAY + BUSINESS_START * MS_PER_HOUR; continue; }

      // Before business hours -> snap to start
      if (hour < BUSINESS_START) { istMs = dayStart + BUSINESS_START * MS_PER_HOUR; continue; }

      // After business hours -> snap to next day start
      if (hour >= BUSINESS_END) { istMs = dayStart + MS_PER_DAY + BUSINESS_START * MS_PER_HOUR; continue; }

      const availableMs = (BUSINESS_END * MS_PER_HOUR) - (hour * MS_PER_HOUR + minute * MS_PER_MINUTE);
      const remainingMs = remaining * MS_PER_HOUR;

      if (remainingMs <= availableMs) {
        istMs += remainingMs;
        remaining = 0;
      } else {
        remaining -= availableMs / MS_PER_HOUR;
        istMs = dayStart + MS_PER_DAY + BUSINESS_START * MS_PER_HOUR;
      }
    }

    return new Date(istMs - IST_OFFSET_MS);
  }

  /**
   * Calculate business hours between two dates
   */
  calculateBusinessHours(start: Date, end: Date): number {
    if (end <= start) return 0;

    let totalHours = 0;
    const current = new Date(start);

    while (current < end) {
      const dayOfWeek = current.getDay();

      // Only count business days
      if (BUSINESS_HOURS.workDays.includes(dayOfWeek)) {
        const currentHour = current.getHours();

        // Calculate hours in this day
        if (currentHour >= BUSINESS_HOURS.start && currentHour < BUSINESS_HOURS.end) {
          const endOfDay = new Date(current);
          endOfDay.setHours(BUSINESS_HOURS.end, 0, 0, 0);

          const dayEnd = end < endOfDay ? end : endOfDay;
          const hoursInDay = (dayEnd.getTime() - current.getTime()) / (1000 * 60 * 60);
          totalHours += Math.max(0, hoursInDay);

          // Move to next day's start
          current.setDate(current.getDate() + 1);
          current.setHours(BUSINESS_HOURS.start, 0, 0, 0);
        } else if (currentHour < BUSINESS_HOURS.start) {
          // Move to business hours start
          current.setHours(BUSINESS_HOURS.start, 0, 0, 0);
        } else {
          // After business hours, move to next day
          current.setDate(current.getDate() + 1);
          current.setHours(BUSINESS_HOURS.start, 0, 0, 0);
        }
      } else {
        // Weekend - move to next business day
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        current.setDate(current.getDate() + daysUntilMonday);
        current.setHours(BUSINESS_HOURS.start, 0, 0, 0);
      }
    }

    return Math.round(totalHours * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get SLA status for a service request
   */
  async getStatus(requestId: number): Promise<SLAStatus | null> {
    try {
      const [request] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, requestId))
        .limit(1);

      if (!request) {
        logger.warn('Service request not found for SLA status', { requestId });
        return null;
      }

      const now = new Date();
      const createdAt = new Date(request.createdAt || now);
      const deadline = request.slaDeadline ? new Date(request.slaDeadline) : await this.calculateDeadline(
        request.serviceId,
        request.priority || 'medium',
        createdAt
      );

      // Get SLA config for escalation levels
      const config = await this.getSLAConfig(request.serviceId);

      // Calculate hours elapsed and remaining
      const hoursElapsed = this.calculateBusinessHours(createdAt, now);
      const hoursRemaining = this.calculateBusinessHours(now, deadline);
      const totalSlaHours = config.resolutionHours * (PRIORITY_MULTIPLIERS[request.priority?.toLowerCase() || 'medium'] || 1.0);
      const percentageUsed = Math.min(100, Math.round((hoursElapsed / totalSlaHours) * 100));

      // Determine breach status
      const isBreached = now > deadline;
      const breachType = isBreached ? 'resolution' : undefined;

      // Determine escalation level based on percentage used
      // Handle case where escalationLevel field might not exist
      let escalationLevel = (request as any).escalationLevel || 0;

      if (!isBreached) {
        for (const level of config.escalationLevels) {
          if (hoursElapsed >= level.afterHours) {
            escalationLevel = Math.max(escalationLevel, level.level);
          }
        }
      } else {
        // If breached, set to maximum escalation level
        escalationLevel = config.escalationLevels.length;
      }

      return {
        isBreached,
        breachType,
        hoursRemaining: Math.max(0, hoursRemaining),
        hoursElapsed,
        escalationLevel,
        deadline,
        percentageUsed
      };
    } catch (error) {
      logger.error('Error getting SLA status:', { requestId, error });
      return null;
    }
  }

  /**
   * Check all open requests for SLA breaches and escalate as needed
   */
  async checkBreachesAndEscalate(): Promise<SLACheckResult> {
    const result: SLACheckResult = {
      checked: 0,
      escalated: 0,
      breached: 0,
      errors: 0
    };

    try {
      // Get all open service requests (not completed/cancelled)
      const openRequests = await db
        .select()
        .from(serviceRequests)
        .where(
          notInArray(serviceRequests.status, ['completed', 'cancelled', 'delivered'])
        );

      result.checked = openRequests.length;
      logger.info(`SLA check started: ${openRequests.length} open requests`);

      for (const request of openRequests) {
        try {
          const status = await this.getStatus(request.id);

          if (!status) continue;

          // Check for breach
          if (status.isBreached) {
            result.breached++;
            await this.handleBreach(request.id, status);
          }

          // Check for escalation
          const currentLevel = (request as any).escalationLevel || 0;
          if (status.escalationLevel > currentLevel) {
            const config = await this.getSLAConfig(request.serviceId);
            const escalationConfig = config.escalationLevels.find(
              e => e.level === status.escalationLevel
            );

            if (escalationConfig) {
              await this.escalate(
                request.id,
                status.escalationLevel,
                escalationConfig.notifyRoles
              );
              result.escalated++;
            }
          }
        } catch (error) {
          logger.error('Error checking SLA for request:', { requestId: request.id, error });
          result.errors++;
        }
      }

      logger.info('SLA check completed', result);
      return result;
    } catch (error) {
      logger.error('SLA bulk check failed:', error);
      throw error;
    }
  }

  /**
   * Handle SLA breach
   */
  private async handleBreach(requestId: number, status: SLAStatus): Promise<void> {
    try {
      // Log breach in activity
      await db.insert(activityLogs).values({
        userId: 0, // System
        action: 'sla_breach',
        entityType: 'service_request',
        entityId: requestId,
        details: JSON.stringify({
          breachType: status.breachType,
          hoursElapsed: status.hoursElapsed,
          deadline: status.deadline
        }),
        createdAt: new Date()
      });

      // Get request details
      const [request] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, requestId))
        .limit(1);

      if (!request) return;

      // Notify admins and managers about breach
      await notificationHub.send({
        type: 'sla_breach',
        channels: ['email', 'in_app'],
        priority: 'urgent',
        subject: `SLA Breach Alert: Service Request #${request.requestId || requestId}`,
        content: `Service request has breached its SLA deadline. ${status.hoursElapsed.toFixed(1)} hours elapsed, deadline was ${status.deadline.toISOString()}.`,
        data: {
          requestId,
          serviceRequestId: request.requestId,
          serviceId: request.serviceId,
          hoursElapsed: status.hoursElapsed,
          deadline: status.deadline.toISOString(),
          breachType: status.breachType
        },
        referenceType: 'service_request',
        referenceId: requestId
      });

      logger.warn('SLA breach detected', {
        requestId,
        breachType: status.breachType,
        hoursElapsed: status.hoursElapsed
      });
    } catch (error) {
      logger.error('Error handling SLA breach:', { requestId, error });
    }
  }

  /**
   * Escalate a service request and notify relevant roles
   */
  async escalate(
    requestId: number,
    level: number,
    notifyRoles: string[]
  ): Promise<boolean> {
    try {
      // Get request details
      const [request] = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.id, requestId))
        .limit(1);

      if (!request) {
        logger.warn('Request not found for escalation', { requestId });
        return false;
      }

      // Update escalation level on the request
      // BUG: The serviceRequests table (shared/schema.ts) does NOT have an
      // escalationLevel column. This .set() only updates updatedAt, meaning
      // escalation level is never persisted. To fix properly, add an
      // "escalation_level" integer column to the serviceRequests table schema,
      // run a migration, then uncomment the escalationLevel line below.
      await db
        .update(serviceRequests)
        .set({
          // escalationLevel: level, // TODO: uncomment after adding column to serviceRequests schema
          updatedAt: new Date()
        })
        .where(eq(serviceRequests.id, requestId));

      // Log escalation activity
      await db.insert(activityLogs).values({
        userId: 0, // System
        action: 'sla_escalation',
        entityType: 'service_request',
        entityId: requestId,
        details: JSON.stringify({
          level,
          notifyRoles,
          escalatedAt: new Date().toISOString()
        }),
        createdAt: new Date()
      });

      // Send notifications to relevant roles
      const escalationMessages: Record<number, string> = {
        1: 'SLA Warning: 50% of SLA time elapsed',
        2: 'SLA Alert: 75% of SLA time elapsed',
        3: 'SLA Critical: 90% of SLA time elapsed - Immediate attention required'
      };

      await notificationHub.send({
        type: 'sla_escalation',
        channels: ['email', 'in_app'],
        priority: level >= 3 ? 'urgent' : 'high',
        subject: `SLA Escalation Level ${level}: Service Request #${request.requestId || requestId}`,
        content: escalationMessages[level] || `SLA Escalation to level ${level}`,
        data: {
          requestId,
          serviceRequestId: request.requestId,
          serviceId: request.serviceId,
          escalationLevel: level,
          notifyRoles,
          assignedTo: request.assignedTeamMember
        },
        referenceType: 'service_request',
        referenceId: requestId
      });

      logger.info('SLA escalation sent', {
        requestId,
        level,
        notifyRoles
      });

      return true;
    } catch (error) {
      logger.error('Error escalating request:', { requestId, level, error });
      return false;
    }
  }

  /**
   * Get SLA summary for dashboard
   */
  async getSLASummary(): Promise<{
    total: number;
    atRisk: number;
    breached: number;
    onTrack: number;
  }> {
    try {
      const openRequests = await db
        .select()
        .from(serviceRequests)
        .where(
          notInArray(serviceRequests.status, ['completed', 'cancelled', 'delivered'])
        );

      let atRisk = 0;
      let breached = 0;
      let onTrack = 0;

      for (const request of openRequests) {
        const status = await this.getStatus(request.id);
        if (!status) continue;

        if (status.isBreached) {
          breached++;
        } else if (status.percentageUsed >= 75) {
          atRisk++;
        } else {
          onTrack++;
        }
      }

      return {
        total: openRequests.length,
        atRisk,
        breached,
        onTrack
      };
    } catch (error) {
      logger.error('Error getting SLA summary:', error);
      return { total: 0, atRisk: 0, breached: 0, onTrack: 0 };
    }
  }
}

// Export singleton instance
export const slaService = new SLAService();

// Export class for testing
export { SLAService };
