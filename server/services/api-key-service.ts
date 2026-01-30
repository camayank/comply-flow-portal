/**
 * API Key Management Service
 *
 * Handles creation, validation, and management of API keys for external integrations:
 * - Secure key generation and hashing
 * - Rate limiting per key
 * - Permission-based access control
 * - Usage logging and analytics
 */

import crypto from 'crypto';
import { db } from '../db';
import { apiKeys, apiUsageLogs } from '../../shared/enterprise-schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ApiKeyCreateOptions {
  tenantId?: string;
  name: string;
  permissions: string[];
  rateLimitPerMinute?: number;
  rateLimitPerDay?: number;
  allowedIps?: string[];
  expiresAt?: Date;
  createdBy: number;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  keyId?: number;
  tenantId?: string;
  permissions?: string[];
  error?: string;
  rateLimited?: boolean;
}

export interface ApiKeyInfo {
  id: number;
  name: string;
  keyPrefix: string;
  tenantId: string | null;
  permissions: string[];
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  allowedIps: string[] | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
}

// ============================================================================
// API KEY SERVICE
// ============================================================================

class ApiKeyService {
  private readonly KEY_PREFIX = 'dc_';
  private readonly KEY_LENGTH = 32; // 256 bits

  /**
   * Generate a new API key
   * Returns the raw key (only shown once) and the key info
   */
  async createKey(options: ApiKeyCreateOptions): Promise<{ rawKey: string; keyInfo: ApiKeyInfo }> {
    try {
      // Generate random key
      const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
      const keyId = crypto.randomBytes(4).toString('hex');
      const rawKey = `${this.KEY_PREFIX}${keyId}_${randomBytes.toString('base64url')}`;

      // Create key prefix for identification (first 12 chars)
      const keyPrefix = rawKey.substring(0, 12);

      // Hash the key for storage
      const keyHash = this.hashKey(rawKey);

      const [apiKey] = await db.insert(apiKeys)
        .values({
          tenantId: options.tenantId || null,
          name: options.name,
          keyHash,
          keyPrefix,
          permissions: options.permissions,
          rateLimitPerMinute: options.rateLimitPerMinute || 60,
          rateLimitPerDay: options.rateLimitPerDay || 10000,
          allowedIps: options.allowedIps || null,
          expiresAt: options.expiresAt || null,
          isActive: true,
          createdBy: options.createdBy,
          createdAt: new Date(),
        })
        .returning();

      const keyInfo: ApiKeyInfo = {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        tenantId: apiKey.tenantId,
        permissions: apiKey.permissions as string[],
        rateLimitPerMinute: apiKey.rateLimitPerMinute || 60,
        rateLimitPerDay: apiKey.rateLimitPerDay || 10000,
        allowedIps: apiKey.allowedIps as string[] | null,
        expiresAt: apiKey.expiresAt,
        lastUsedAt: apiKey.lastUsedAt,
        usageCount: apiKey.usageCount || 0,
        isActive: apiKey.isActive || true,
        createdAt: apiKey.createdAt || new Date(),
      };

      logger.info(`API key created: ${keyPrefix}... for ${options.name}`);

      return { rawKey, keyInfo };
    } catch (error) {
      logger.error('Error creating API key:', error);
      throw error;
    }
  }

  /**
   * Hash an API key for secure storage
   */
  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Validate an API key and check permissions
   */
  async validateKey(
    rawKey: string,
    requiredPermissions: string[] = [],
    ipAddress?: string
  ): Promise<ApiKeyValidationResult> {
    try {
      // Basic format validation
      if (!rawKey || !rawKey.startsWith(this.KEY_PREFIX)) {
        return { valid: false, error: 'Invalid API key format' };
      }

      const keyHash = this.hashKey(rawKey);
      const keyPrefix = rawKey.substring(0, 12);

      // Find the key
      const [apiKey] = await db.select()
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.keyHash, keyHash),
            eq(apiKeys.keyPrefix, keyPrefix)
          )
        );

      if (!apiKey) {
        return { valid: false, error: 'API key not found' };
      }

      // Check if active
      if (!apiKey.isActive) {
        return { valid: false, error: 'API key is inactive' };
      }

      // Check if revoked
      if (apiKey.revokedAt) {
        return { valid: false, error: 'API key has been revoked' };
      }

      // Check expiration
      if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
        return { valid: false, error: 'API key has expired' };
      }

      // Check IP whitelist
      if (apiKey.allowedIps && Array.isArray(apiKey.allowedIps) && apiKey.allowedIps.length > 0) {
        if (!ipAddress || !apiKey.allowedIps.includes(ipAddress)) {
          return { valid: false, error: 'IP address not allowed' };
        }
      }

      // Check rate limits
      const isRateLimited = await this.checkRateLimit(apiKey.id, apiKey.rateLimitPerMinute || 60, apiKey.rateLimitPerDay || 10000);
      if (isRateLimited) {
        return { valid: false, error: 'Rate limit exceeded', rateLimited: true };
      }

      // Check required permissions
      const keyPermissions = (apiKey.permissions as string[]) || [];
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every(perm =>
          keyPermissions.includes(perm) || keyPermissions.includes('*')
        );
        if (!hasAllPermissions) {
          return { valid: false, error: 'Insufficient permissions' };
        }
      }

      // Update last used
      await db.update(apiKeys)
        .set({
          lastUsedAt: new Date(),
          usageCount: (apiKey.usageCount || 0) + 1,
        })
        .where(eq(apiKeys.id, apiKey.id));

      return {
        valid: true,
        keyId: apiKey.id,
        tenantId: apiKey.tenantId || undefined,
        permissions: keyPermissions,
      };
    } catch (error) {
      logger.error('Error validating API key:', error);
      return { valid: false, error: 'Validation error' };
    }
  }

  /**
   * Check rate limits for an API key
   */
  private async checkRateLimit(keyId: number, perMinute: number, perDay: number): Promise<boolean> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    // Check per-minute limit
    const minuteCount = await db.select({ count: sql<number>`count(*)` })
      .from(apiUsageLogs)
      .where(
        and(
          eq(apiUsageLogs.apiKeyId, keyId),
          gte(apiUsageLogs.createdAt, oneMinuteAgo)
        )
      );

    if ((minuteCount[0]?.count || 0) >= perMinute) {
      return true;
    }

    // Check per-day limit
    const dayCount = await db.select({ count: sql<number>`count(*)` })
      .from(apiUsageLogs)
      .where(
        and(
          eq(apiUsageLogs.apiKeyId, keyId),
          gte(apiUsageLogs.createdAt, oneDayAgo)
        )
      );

    if ((dayCount[0]?.count || 0) >= perDay) {
      return true;
    }

    return false;
  }

  /**
   * Log API usage
   */
  async logUsage(
    keyId: number,
    endpoint: string,
    method: string,
    requestBody: any,
    responseStatus: number,
    responseTimeMs: number,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.insert(apiUsageLogs).values({
        apiKeyId: keyId,
        endpoint,
        method,
        requestBody: requestBody ? JSON.parse(JSON.stringify(requestBody)) : null,
        responseStatus,
        responseTimeMs,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        errorMessage: errorMessage || null,
        createdAt: new Date(),
      });
    } catch (error) {
      logger.error('Error logging API usage:', error);
    }
  }

  /**
   * Revoke an API key
   */
  async revokeKey(keyId: number, revokedBy: number, reason?: string): Promise<boolean> {
    try {
      const [updated] = await db.update(apiKeys)
        .set({
          isActive: false,
          revokedAt: new Date(),
          revokedBy,
        })
        .where(eq(apiKeys.id, keyId))
        .returning();

      if (updated) {
        logger.info(`API key ${keyId} revoked by user ${revokedBy}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error revoking API key:', error);
      throw error;
    }
  }

  /**
   * List API keys for a tenant (without secrets)
   */
  async listKeys(tenantId?: string): Promise<ApiKeyInfo[]> {
    try {
      const query = tenantId
        ? eq(apiKeys.tenantId, tenantId)
        : sql`1=1`;

      const keys = await db.select()
        .from(apiKeys)
        .where(query)
        .orderBy(desc(apiKeys.createdAt));

      return keys.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        tenantId: key.tenantId,
        permissions: (key.permissions as string[]) || [],
        rateLimitPerMinute: key.rateLimitPerMinute || 60,
        rateLimitPerDay: key.rateLimitPerDay || 10000,
        allowedIps: key.allowedIps as string[] | null,
        expiresAt: key.expiresAt,
        lastUsedAt: key.lastUsedAt,
        usageCount: key.usageCount || 0,
        isActive: key.isActive || false,
        createdAt: key.createdAt || new Date(),
      }));
    } catch (error) {
      logger.error('Error listing API keys:', error);
      throw error;
    }
  }

  /**
   * Get API key details
   */
  async getKey(keyId: number): Promise<ApiKeyInfo | null> {
    try {
      const [key] = await db.select()
        .from(apiKeys)
        .where(eq(apiKeys.id, keyId));

      if (!key) {
        return null;
      }

      return {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        tenantId: key.tenantId,
        permissions: (key.permissions as string[]) || [],
        rateLimitPerMinute: key.rateLimitPerMinute || 60,
        rateLimitPerDay: key.rateLimitPerDay || 10000,
        allowedIps: key.allowedIps as string[] | null,
        expiresAt: key.expiresAt,
        lastUsedAt: key.lastUsedAt,
        usageCount: key.usageCount || 0,
        isActive: key.isActive || false,
        createdAt: key.createdAt || new Date(),
      };
    } catch (error) {
      logger.error('Error getting API key:', error);
      throw error;
    }
  }

  /**
   * Update API key settings (not the key itself)
   */
  async updateKey(
    keyId: number,
    updates: {
      name?: string;
      permissions?: string[];
      rateLimitPerMinute?: number;
      rateLimitPerDay?: number;
      allowedIps?: string[];
      expiresAt?: Date | null;
      isActive?: boolean;
    }
  ): Promise<ApiKeyInfo | null> {
    try {
      const updateData: Record<string, any> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.permissions !== undefined) updateData.permissions = updates.permissions;
      if (updates.rateLimitPerMinute !== undefined) updateData.rateLimitPerMinute = updates.rateLimitPerMinute;
      if (updates.rateLimitPerDay !== undefined) updateData.rateLimitPerDay = updates.rateLimitPerDay;
      if (updates.allowedIps !== undefined) updateData.allowedIps = updates.allowedIps;
      if (updates.expiresAt !== undefined) updateData.expiresAt = updates.expiresAt;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      const [updated] = await db.update(apiKeys)
        .set(updateData)
        .where(eq(apiKeys.id, keyId))
        .returning();

      if (!updated) {
        return null;
      }

      return this.getKey(keyId);
    } catch (error) {
      logger.error('Error updating API key:', error);
      throw error;
    }
  }

  /**
   * Regenerate an API key (creates new key, same settings)
   */
  async regenerateKey(keyId: number, regeneratedBy: number): Promise<{ rawKey: string; keyInfo: ApiKeyInfo } | null> {
    try {
      const existingKey = await this.getKey(keyId);
      if (!existingKey) {
        return null;
      }

      // Revoke old key
      await this.revokeKey(keyId, regeneratedBy, 'Regenerated');

      // Create new key with same settings
      return this.createKey({
        tenantId: existingKey.tenantId || undefined,
        name: existingKey.name,
        permissions: existingKey.permissions,
        rateLimitPerMinute: existingKey.rateLimitPerMinute,
        rateLimitPerDay: existingKey.rateLimitPerDay,
        allowedIps: existingKey.allowedIps || undefined,
        expiresAt: existingKey.expiresAt || undefined,
        createdBy: regeneratedBy,
      });
    } catch (error) {
      logger.error('Error regenerating API key:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics for an API key
   */
  async getUsageStats(keyId: number, days: number = 30): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    topEndpoints: { endpoint: string; count: number }[];
    requestsByDay: { date: string; count: number }[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await db.select()
        .from(apiUsageLogs)
        .where(
          and(
            eq(apiUsageLogs.apiKeyId, keyId),
            gte(apiUsageLogs.createdAt, startDate)
          )
        );

      const totalRequests = logs.length;
      const successfulRequests = logs.filter(l => l.responseStatus && l.responseStatus >= 200 && l.responseStatus < 300).length;
      const failedRequests = totalRequests - successfulRequests;

      const totalResponseTime = logs.reduce((sum, l) => sum + (l.responseTimeMs || 0), 0);
      const averageResponseTime = totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;

      // Group by endpoint
      const endpointCounts: Record<string, number> = {};
      logs.forEach(l => {
        endpointCounts[l.endpoint] = (endpointCounts[l.endpoint] || 0) + 1;
      });
      const topEndpoints = Object.entries(endpointCounts)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Group by day
      const dateCounts: Record<string, number> = {};
      logs.forEach(l => {
        if (l.createdAt) {
          const dateKey = l.createdAt.toISOString().split('T')[0];
          dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
        }
      });
      const requestsByDay = Object.entries(dateCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        topEndpoints,
        requestsByDay,
      };
    } catch (error) {
      logger.error('Error getting usage stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired API keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      const now = new Date();

      const result = await db.update(apiKeys)
        .set({
          isActive: false,
          revokedAt: now,
        })
        .where(
          and(
            eq(apiKeys.isActive, true),
            lte(apiKeys.expiresAt, now)
          )
        );

      logger.info('Cleaned up expired API keys');
      return 0; // Drizzle doesn't return count directly
    } catch (error) {
      logger.error('Error cleaning up expired keys:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService();

// ============================================================================
// API KEY PERMISSIONS
// ============================================================================

export const API_PERMISSIONS = {
  // Service Requests
  SERVICE_REQUESTS_READ: 'service_requests:read',
  SERVICE_REQUESTS_WRITE: 'service_requests:write',

  // Clients
  CLIENTS_READ: 'clients:read',
  CLIENTS_WRITE: 'clients:write',

  // Documents
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_WRITE: 'documents:write',
  DOCUMENTS_UPLOAD: 'documents:upload',

  // Payments
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_WRITE: 'payments:write',

  // Invoices
  INVOICES_READ: 'invoices:read',
  INVOICES_WRITE: 'invoices:write',

  // Leads
  LEADS_READ: 'leads:read',
  LEADS_WRITE: 'leads:write',

  // Compliance
  COMPLIANCE_READ: 'compliance:read',
  COMPLIANCE_WRITE: 'compliance:write',

  // Reports
  REPORTS_READ: 'reports:read',
  REPORTS_GENERATE: 'reports:generate',

  // Webhooks
  WEBHOOKS_READ: 'webhooks:read',
  WEBHOOKS_MANAGE: 'webhooks:manage',

  // Admin
  ADMIN_READ: 'admin:read',
  ADMIN_WRITE: 'admin:write',

  // Full Access
  FULL_ACCESS: '*',
} as const;

export type ApiPermission = typeof API_PERMISSIONS[keyof typeof API_PERMISSIONS];
