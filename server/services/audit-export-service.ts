/**
 * Audit Export Service
 *
 * Handles audit log querying, filtering, and export in various formats
 * Supports compliance reporting and security auditing requirements
 */
import { db } from '../db';
import { eq, and, gte, lte, desc, sql, count, like, or, inArray } from 'drizzle-orm';
import { auditLogs, users } from '@shared/schema';
import { logger } from '../logger';

// Types
interface AuditLogEntry {
  id: number;
  userId: number;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: any;
  newValue: any;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  timestamp: Date | null;
}

interface AuditQueryFilters {
  userId?: number;
  action?: string | string[];
  entityType?: string | string[];
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  search?: string;
}

interface AuditExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  filters?: AuditQueryFilters;
  includeDetails?: boolean;
  limit?: number;
  offset?: number;
}

interface AuditSummary {
  totalLogs: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byUser: Array<{ userId: number; userName: string; count: number }>;
  recentActivity: AuditLogEntry[];
  securityEvents: AuditLogEntry[];
}

// Action categories for filtering
const ACTION_CATEGORIES = {
  authentication: ['login', 'logout', 'password_change', 'password_reset', 'mfa_enable', 'mfa_disable'],
  data_access: ['view', 'read', 'download', 'export'],
  data_modification: ['create', 'update', 'delete', 'bulk_update', 'bulk_delete'],
  system: ['config_change', 'permission_change', 'role_change', 'backup', 'restore'],
  security: ['failed_login', 'account_locked', 'suspicious_activity', 'ip_blocked'],
};

class AuditExportService {
  /**
   * Query audit logs with filters
   */
  async queryAuditLogs(
    filters: AuditQueryFilters,
    options?: { limit?: number; offset?: number; sortOrder?: 'asc' | 'desc' }
  ): Promise<{ logs: AuditLogEntry[]; total: number }> {
    try {
      const conditions = [];

      if (filters.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }

      if (filters.action) {
        if (Array.isArray(filters.action)) {
          conditions.push(inArray(auditLogs.action, filters.action));
        } else {
          conditions.push(eq(auditLogs.action, filters.action));
        }
      }

      if (filters.entityType) {
        if (Array.isArray(filters.entityType)) {
          conditions.push(inArray(auditLogs.entityType, filters.entityType));
        } else {
          conditions.push(eq(auditLogs.entityType, filters.entityType));
        }
      }

      if (filters.entityId) {
        conditions.push(eq(auditLogs.entityId, filters.entityId));
      }

      if (filters.startDate) {
        conditions.push(gte(auditLogs.timestamp, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(auditLogs.timestamp, filters.endDate));
      }

      if (filters.ipAddress) {
        conditions.push(eq(auditLogs.ipAddress, filters.ipAddress));
      }

      if (filters.search) {
        conditions.push(
          or(
            like(auditLogs.action, `%${filters.search}%`),
            like(auditLogs.entityType, `%${filters.search}%`),
            like(auditLogs.entityId || '', `%${filters.search}%`)
          )
        );
      }

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get logs with user names
      const logs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: users.fullName,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          oldValue: auditLogs.oldValue,
          newValue: auditLogs.newValue,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          sessionId: auditLogs.sessionId,
          timestamp: auditLogs.timestamp,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(options?.sortOrder === 'asc' ? auditLogs.timestamp : desc(auditLogs.timestamp))
        .limit(options?.limit || 100)
        .offset(options?.offset || 0);

      return {
        logs: logs.map((log) => ({
          ...log,
          userName: log.userName || `User ${log.userId}`,
        })),
        total: countResult?.count || 0,
      };
    } catch (error) {
      logger.error('Query audit logs error:', error);
      throw error;
    }
  }

  /**
   * Get audit summary statistics
   */
  async getAuditSummary(dateRange: number = 30): Promise<AuditSummary> {
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);

    try {
      // Total logs
      const [totalResult] = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(gte(auditLogs.timestamp, startDate));

      // By action
      const actionCounts = await db
        .select({
          action: auditLogs.action,
          count: count(),
        })
        .from(auditLogs)
        .where(gte(auditLogs.timestamp, startDate))
        .groupBy(auditLogs.action);

      // By entity type
      const entityCounts = await db
        .select({
          entityType: auditLogs.entityType,
          count: count(),
        })
        .from(auditLogs)
        .where(gte(auditLogs.timestamp, startDate))
        .groupBy(auditLogs.entityType);

      // By user (top 10)
      const userCounts = await db
        .select({
          userId: auditLogs.userId,
          userName: users.fullName,
          count: count(),
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(gte(auditLogs.timestamp, startDate))
        .groupBy(auditLogs.userId, users.fullName)
        .orderBy(desc(count()))
        .limit(10);

      // Recent activity (last 20)
      const recentLogs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: users.fullName,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          oldValue: auditLogs.oldValue,
          newValue: auditLogs.newValue,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          sessionId: auditLogs.sessionId,
          timestamp: auditLogs.timestamp,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.timestamp))
        .limit(20);

      // Security events
      const securityLogs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: users.fullName,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          oldValue: auditLogs.oldValue,
          newValue: auditLogs.newValue,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          sessionId: auditLogs.sessionId,
          timestamp: auditLogs.timestamp,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(
          and(
            gte(auditLogs.timestamp, startDate),
            inArray(auditLogs.action, ACTION_CATEGORIES.security)
          )
        )
        .orderBy(desc(auditLogs.timestamp))
        .limit(20);

      const byAction: Record<string, number> = {};
      actionCounts.forEach((a) => {
        byAction[a.action] = a.count;
      });

      const byEntityType: Record<string, number> = {};
      entityCounts.forEach((e) => {
        byEntityType[e.entityType] = e.count;
      });

      return {
        totalLogs: totalResult?.count || 0,
        byAction,
        byEntityType,
        byUser: userCounts.map((u) => ({
          userId: u.userId,
          userName: u.userName || `User ${u.userId}`,
          count: u.count,
        })),
        recentActivity: recentLogs.map((log) => ({
          ...log,
          userName: log.userName || `User ${log.userId}`,
        })),
        securityEvents: securityLogs.map((log) => ({
          ...log,
          userName: log.userName || `User ${log.userId}`,
        })),
      };
    } catch (error) {
      logger.error('Get audit summary error:', error);
      throw error;
    }
  }

  /**
   * Export audit logs to specified format
   */
  async exportAuditLogs(options: AuditExportOptions): Promise<string | Buffer> {
    try {
      const { logs } = await this.queryAuditLogs(options.filters || {}, {
        limit: options.limit || 10000,
        offset: options.offset || 0,
      });

      switch (options.format) {
        case 'csv':
          return this.toCSV(logs, options.includeDetails);
        case 'json':
          return JSON.stringify(
            options.includeDetails
              ? logs
              : logs.map(({ oldValue, newValue, ...rest }) => rest),
            null,
            2
          );
        default:
          return JSON.stringify(logs);
      }
    } catch (error) {
      logger.error('Export audit logs error:', error);
      throw error;
    }
  }

  /**
   * Convert logs to CSV format
   */
  private toCSV(logs: AuditLogEntry[], includeDetails?: boolean): string {
    const headers = [
      'ID',
      'User ID',
      'User Name',
      'Action',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'Timestamp',
    ];

    if (includeDetails) {
      headers.push('Old Value', 'New Value', 'User Agent', 'Session ID');
    }

    const rows = logs.map((log) => {
      const row = [
        log.id,
        log.userId,
        `"${log.userName || ''}"`,
        log.action,
        log.entityType,
        log.entityId || '',
        log.ipAddress || '',
        log.timestamp?.toISOString() || '',
      ];

      if (includeDetails) {
        row.push(
          `"${JSON.stringify(log.oldValue || '').replace(/"/g, '""')}"`,
          `"${JSON.stringify(log.newValue || '').replace(/"/g, '""')}"`,
          `"${(log.userAgent || '').replace(/"/g, '""')}"`,
          log.sessionId || ''
        );
      }

      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get logs by action category
   */
  async getLogsByCategory(
    category: keyof typeof ACTION_CATEGORIES,
    dateRange: number = 30
  ): Promise<AuditLogEntry[]> {
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
    const actions = ACTION_CATEGORIES[category] || [];

    if (actions.length === 0) {
      return [];
    }

    try {
      const logs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: users.fullName,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          oldValue: auditLogs.oldValue,
          newValue: auditLogs.newValue,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          sessionId: auditLogs.sessionId,
          timestamp: auditLogs.timestamp,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(gte(auditLogs.timestamp, startDate), inArray(auditLogs.action, actions)))
        .orderBy(desc(auditLogs.timestamp))
        .limit(500);

      return logs.map((log) => ({
        ...log,
        userName: log.userName || `User ${log.userId}`,
      }));
    } catch (error) {
      logger.error('Get logs by category error:', error);
      throw error;
    }
  }

  /**
   * Create an audit log entry
   */
  async createAuditLog(entry: {
    userId: number;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }): Promise<number> {
    try {
      const [result] = await db
        .insert(auditLogs)
        .values({
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          sessionId: entry.sessionId,
          timestamp: new Date(),
        })
        .returning({ id: auditLogs.id });

      logger.info(`Audit log created: ${entry.action} on ${entry.entityType} by user ${entry.userId}`);

      return result.id;
    } catch (error) {
      logger.error('Create audit log error:', error);
      throw error;
    }
  }

  /**
   * Get user activity timeline
   */
  async getUserActivityTimeline(
    userId: number,
    dateRange: number = 30
  ): Promise<{
    timeline: AuditLogEntry[];
    summary: {
      totalActions: number;
      mostCommonAction: string;
      lastActivity: Date | null;
      ipAddresses: string[];
    };
  }> {
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);

    try {
      const logs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: users.fullName,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          oldValue: auditLogs.oldValue,
          newValue: auditLogs.newValue,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          sessionId: auditLogs.sessionId,
          timestamp: auditLogs.timestamp,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(eq(auditLogs.userId, userId), gte(auditLogs.timestamp, startDate)))
        .orderBy(desc(auditLogs.timestamp))
        .limit(500);

      // Calculate summary
      const actionCounts: Record<string, number> = {};
      const ipSet = new Set<string>();

      logs.forEach((log) => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        if (log.ipAddress) {
          ipSet.add(log.ipAddress);
        }
      });

      const mostCommonAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      return {
        timeline: logs.map((log) => ({
          ...log,
          userName: log.userName || `User ${log.userId}`,
        })),
        summary: {
          totalActions: logs.length,
          mostCommonAction,
          lastActivity: logs[0]?.timestamp || null,
          ipAddresses: Array.from(ipSet),
        },
      };
    } catch (error) {
      logger.error('Get user activity timeline error:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: 'data_access' | 'security' | 'changes' | 'full',
    dateRange: number = 90
  ): Promise<{
    reportType: string;
    generatedAt: string;
    period: { start: string; end: string };
    summary: any;
    details: any[];
  }> {
    const startDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    try {
      let actions: string[] = [];
      let summary: any = {};
      let details: any[] = [];

      switch (reportType) {
        case 'data_access':
          actions = ACTION_CATEGORIES.data_access;
          break;
        case 'security':
          actions = ACTION_CATEGORIES.security;
          break;
        case 'changes':
          actions = ACTION_CATEGORIES.data_modification;
          break;
        case 'full':
          actions = [];
          break;
      }

      const { logs, total } = await this.queryAuditLogs(
        {
          action: actions.length > 0 ? actions : undefined,
          startDate,
          endDate,
        },
        { limit: 5000 }
      );

      // Generate summary
      const byUser: Record<number, number> = {};
      const byAction: Record<string, number> = {};
      const byEntityType: Record<string, number> = {};

      logs.forEach((log) => {
        byUser[log.userId] = (byUser[log.userId] || 0) + 1;
        byAction[log.action] = (byAction[log.action] || 0) + 1;
        byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1;
      });

      summary = {
        totalEvents: total,
        uniqueUsers: Object.keys(byUser).length,
        topActions: Object.entries(byAction)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([action, count]) => ({ action, count })),
        topEntityTypes: Object.entries(byEntityType)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([entityType, count]) => ({ entityType, count })),
      };

      details = logs.slice(0, 1000).map((log) => ({
        timestamp: log.timestamp,
        user: log.userName,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        ipAddress: log.ipAddress,
      }));

      return {
        reportType,
        generatedAt: new Date().toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        summary,
        details,
      };
    } catch (error) {
      logger.error('Generate compliance report error:', error);
      throw error;
    }
  }

  /**
   * Get entity change history
   */
  async getEntityHistory(
    entityType: string,
    entityId: string
  ): Promise<{
    history: AuditLogEntry[];
    changeCount: number;
    firstChange: Date | null;
    lastChange: Date | null;
    contributors: Array<{ userId: number; userName: string; changeCount: number }>;
  }> {
    try {
      const logs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: users.fullName,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          oldValue: auditLogs.oldValue,
          newValue: auditLogs.newValue,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          sessionId: auditLogs.sessionId,
          timestamp: auditLogs.timestamp,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
        .orderBy(desc(auditLogs.timestamp));

      // Calculate contributors
      const contributorMap: Record<number, { name: string; count: number }> = {};
      logs.forEach((log) => {
        if (!contributorMap[log.userId]) {
          contributorMap[log.userId] = { name: log.userName || `User ${log.userId}`, count: 0 };
        }
        contributorMap[log.userId].count++;
      });

      return {
        history: logs.map((log) => ({
          ...log,
          userName: log.userName || `User ${log.userId}`,
        })),
        changeCount: logs.length,
        firstChange: logs[logs.length - 1]?.timestamp || null,
        lastChange: logs[0]?.timestamp || null,
        contributors: Object.entries(contributorMap).map(([userId, data]) => ({
          userId: parseInt(userId),
          userName: data.name,
          changeCount: data.count,
        })),
      };
    } catch (error) {
      logger.error('Get entity history error:', error);
      throw error;
    }
  }
}

export const auditExportService = new AuditExportService();
