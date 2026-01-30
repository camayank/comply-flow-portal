/**
 * Tenant Service
 *
 * Multi-tenancy foundation service that handles:
 * - Tenant CRUD operations
 * - Tenant isolation and context
 * - Tenant settings and configuration
 * - Subscription and billing integration
 * - Usage limits and quotas
 */

import crypto from 'crypto';
import { db } from '../db';
import { tenants, tenantInvitations } from '../../shared/enterprise-schema';
import { users, businessEntities } from '../../shared/schema';
import { eq, and, sql, desc, ilike, or, isNull, count as drizzleCount } from 'drizzle-orm';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface TenantCreateOptions {
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  billingPlan?: 'starter' | 'professional' | 'enterprise' | 'custom';
  billingEmail?: string;
  maxUsers?: number;
  maxEntities?: number;
  maxStorageGb?: number;
  settings?: Record<string, any>;
  features?: Record<string, boolean>;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  billingPlan: string;
  subscriptionStatus: string;
  maxUsers: number;
  maxEntities: number;
  maxStorageGb: number;
  currentStorageBytes: number;
  settings: Record<string, any>;
  features: Record<string, boolean>;
  status: string;
  createdAt: Date;
}

export interface TenantUsage {
  users: { current: number; max: number; percentage: number };
  entities: { current: number; max: number; percentage: number };
  storage: { currentGb: number; maxGb: number; percentage: number };
}

export interface TenantInvitation {
  id: number;
  tenantId: string;
  email: string;
  role: string;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

// ============================================================================
// BILLING PLANS
// ============================================================================

export const BILLING_PLANS = {
  starter: {
    name: 'Starter',
    maxUsers: 5,
    maxEntities: 3,
    maxStorageGb: 5,
    features: {
      webhooks: false,
      apiKeys: false,
      customReports: false,
      advancedRbac: false,
      slaTracking: true,
      documentManagement: true,
    },
  },
  professional: {
    name: 'Professional',
    maxUsers: 25,
    maxEntities: 10,
    maxStorageGb: 50,
    features: {
      webhooks: true,
      apiKeys: true,
      customReports: true,
      advancedRbac: false,
      slaTracking: true,
      documentManagement: true,
    },
  },
  enterprise: {
    name: 'Enterprise',
    maxUsers: 100,
    maxEntities: 50,
    maxStorageGb: 500,
    features: {
      webhooks: true,
      apiKeys: true,
      customReports: true,
      advancedRbac: true,
      slaTracking: true,
      documentManagement: true,
      auditLog: true,
      sso: true,
      ipWhitelist: true,
    },
  },
  custom: {
    name: 'Custom',
    maxUsers: 1000,
    maxEntities: 500,
    maxStorageGb: 5000,
    features: {
      webhooks: true,
      apiKeys: true,
      customReports: true,
      advancedRbac: true,
      slaTracking: true,
      documentManagement: true,
      auditLog: true,
      sso: true,
      ipWhitelist: true,
      dedicatedSupport: true,
      customIntegrations: true,
    },
  },
} as const;

export type BillingPlan = keyof typeof BILLING_PLANS;

// ============================================================================
// TENANT SERVICE
// ============================================================================

class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(options: TenantCreateOptions): Promise<TenantInfo> {
    try {
      // Validate slug uniqueness
      const existing = await this.getTenantBySlug(options.slug);
      if (existing) {
        throw new Error('Tenant slug already exists');
      }

      // Get plan defaults
      const plan = BILLING_PLANS[options.billingPlan || 'starter'];

      const [tenant] = await db.insert(tenants).values({
        name: options.name,
        slug: options.slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        domain: options.domain || null,
        logoUrl: options.logoUrl || null,
        primaryColor: options.primaryColor || '#1e40af',
        secondaryColor: options.secondaryColor || '#3b82f6',
        billingPlan: options.billingPlan || 'starter',
        billingEmail: options.billingEmail || null,
        subscriptionStatus: 'active',
        maxUsers: options.maxUsers || plan.maxUsers,
        maxEntities: options.maxEntities || plan.maxEntities,
        maxStorageGb: options.maxStorageGb || plan.maxStorageGb,
        currentStorageBytes: 0,
        settings: options.settings || {},
        features: { ...plan.features, ...(options.features || {}) },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      logger.info(`Tenant created: ${tenant.name} (${tenant.slug})`);

      return this.formatTenantInfo(tenant);
    } catch (error) {
      logger.error('Error creating tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<TenantInfo | null> {
    try {
      const [tenant] = await db.select()
        .from(tenants)
        .where(eq(tenants.id, tenantId));

      if (!tenant) {
        return null;
      }

      return this.formatTenantInfo(tenant);
    } catch (error) {
      logger.error('Error getting tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<TenantInfo | null> {
    try {
      const [tenant] = await db.select()
        .from(tenants)
        .where(eq(tenants.slug, slug.toLowerCase()));

      if (!tenant) {
        return null;
      }

      return this.formatTenantInfo(tenant);
    } catch (error) {
      logger.error('Error getting tenant by slug:', error);
      throw error;
    }
  }

  /**
   * Get tenant by domain
   */
  async getTenantByDomain(domain: string): Promise<TenantInfo | null> {
    try {
      const [tenant] = await db.select()
        .from(tenants)
        .where(eq(tenants.domain, domain.toLowerCase()));

      if (!tenant) {
        return null;
      }

      return this.formatTenantInfo(tenant);
    } catch (error) {
      logger.error('Error getting tenant by domain:', error);
      throw error;
    }
  }

  /**
   * Update tenant settings
   */
  async updateTenant(
    tenantId: string,
    updates: Partial<TenantCreateOptions>
  ): Promise<TenantInfo | null> {
    try {
      const updateData: Record<string, any> = { updatedAt: new Date() };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.domain !== undefined) updateData.domain = updates.domain;
      if (updates.logoUrl !== undefined) updateData.logoUrl = updates.logoUrl;
      if (updates.primaryColor !== undefined) updateData.primaryColor = updates.primaryColor;
      if (updates.secondaryColor !== undefined) updateData.secondaryColor = updates.secondaryColor;
      if (updates.billingEmail !== undefined) updateData.billingEmail = updates.billingEmail;
      if (updates.settings !== undefined) updateData.settings = updates.settings;
      if (updates.features !== undefined) updateData.features = updates.features;

      const [tenant] = await db.update(tenants)
        .set(updateData)
        .where(eq(tenants.id, tenantId))
        .returning();

      if (!tenant) {
        return null;
      }

      logger.info(`Tenant updated: ${tenant.name}`);
      return this.formatTenantInfo(tenant);
    } catch (error) {
      logger.error('Error updating tenant:', error);
      throw error;
    }
  }

  /**
   * Update tenant billing plan
   */
  async updateBillingPlan(
    tenantId: string,
    plan: BillingPlan,
    customLimits?: { maxUsers?: number; maxEntities?: number; maxStorageGb?: number }
  ): Promise<TenantInfo | null> {
    try {
      const planConfig = BILLING_PLANS[plan];

      const [tenant] = await db.update(tenants)
        .set({
          billingPlan: plan,
          maxUsers: customLimits?.maxUsers || planConfig.maxUsers,
          maxEntities: customLimits?.maxEntities || planConfig.maxEntities,
          maxStorageGb: customLimits?.maxStorageGb || planConfig.maxStorageGb,
          features: planConfig.features,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId))
        .returning();

      if (!tenant) {
        return null;
      }

      logger.info(`Tenant ${tenant.name} upgraded to ${plan} plan`);
      return this.formatTenantInfo(tenant);
    } catch (error) {
      logger.error('Error updating billing plan:', error);
      throw error;
    }
  }

  /**
   * Suspend a tenant
   */
  async suspendTenant(tenantId: string, reason: string): Promise<boolean> {
    try {
      const [tenant] = await db.update(tenants)
        .set({
          status: 'suspended',
          suspendedAt: new Date(),
          suspendedReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId))
        .returning();

      if (tenant) {
        logger.warn(`Tenant suspended: ${tenant.name} - ${reason}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error suspending tenant:', error);
      throw error;
    }
  }

  /**
   * Reactivate a suspended tenant
   */
  async reactivateTenant(tenantId: string): Promise<boolean> {
    try {
      const [tenant] = await db.update(tenants)
        .set({
          status: 'active',
          suspendedAt: null,
          suspendedReason: null,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId))
        .returning();

      if (tenant) {
        logger.info(`Tenant reactivated: ${tenant.name}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error reactivating tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(tenantId: string): Promise<TenantUsage | null> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        return null;
      }

      // Count users in tenant
      // For now, we'll count all users - in full implementation, users would have a tenantId
      const userCount = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`1=1`); // Would be: eq(users.tenantId, tenantId)

      // Count business entities
      const entityCount = await db.select({ count: sql<number>`count(*)` })
        .from(businessEntities)
        .where(sql`1=1`); // Would be: eq(businessEntities.tenantId, tenantId)

      const currentUsers = userCount[0]?.count || 0;
      const currentEntities = entityCount[0]?.count || 0;
      const currentStorageGb = tenant.currentStorageBytes / (1024 * 1024 * 1024);

      return {
        users: {
          current: currentUsers,
          max: tenant.maxUsers,
          percentage: Math.round((currentUsers / tenant.maxUsers) * 100),
        },
        entities: {
          current: currentEntities,
          max: tenant.maxEntities,
          percentage: Math.round((currentEntities / tenant.maxEntities) * 100),
        },
        storage: {
          currentGb: Math.round(currentStorageGb * 100) / 100,
          maxGb: tenant.maxStorageGb,
          percentage: Math.round((currentStorageGb / tenant.maxStorageGb) * 100),
        },
      };
    } catch (error) {
      logger.error('Error getting tenant usage:', error);
      throw error;
    }
  }

  /**
   * Check if tenant can add more users
   */
  async canAddUser(tenantId: string): Promise<boolean> {
    try {
      const usage = await this.getTenantUsage(tenantId);
      if (!usage) {
        return false;
      }

      return usage.users.current < usage.users.max;
    } catch (error) {
      logger.error('Error checking user limit:', error);
      return false;
    }
  }

  /**
   * Check if tenant can add more entities
   */
  async canAddEntity(tenantId: string): Promise<boolean> {
    try {
      const usage = await this.getTenantUsage(tenantId);
      if (!usage) {
        return false;
      }

      return usage.entities.current < usage.entities.max;
    } catch (error) {
      logger.error('Error checking entity limit:', error);
      return false;
    }
  }

  /**
   * Check if a feature is enabled for a tenant
   */
  async isFeatureEnabled(tenantId: string, feature: string): Promise<boolean> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        return false;
      }

      return tenant.features[feature] === true;
    } catch (error) {
      logger.error('Error checking feature:', error);
      return false;
    }
  }

  /**
   * List all tenants (admin only)
   */
  async listTenants(options: {
    search?: string;
    status?: string;
    plan?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ tenants: TenantInfo[]; total: number }> {
    try {
      const { search, status, plan, limit = 50, offset = 0 } = options;

      const conditions = [];

      if (search) {
        conditions.push(
          or(
            ilike(tenants.name, `%${search}%`),
            ilike(tenants.slug, `%${search}%`),
            ilike(tenants.domain, `%${search}%`)
          )
        );
      }

      if (status) {
        conditions.push(eq(tenants.status, status));
      }

      if (plan) {
        conditions.push(eq(tenants.billingPlan, plan));
      }

      // Exclude soft-deleted tenants
      conditions.push(isNull(tenants.deletedAt));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [tenantList, countResult] = await Promise.all([
        db.select()
          .from(tenants)
          .where(whereClause)
          .orderBy(desc(tenants.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` })
          .from(tenants)
          .where(whereClause),
      ]);

      return {
        tenants: tenantList.map(t => this.formatTenantInfo(t)),
        total: countResult[0]?.count || 0,
      };
    } catch (error) {
      logger.error('Error listing tenants:', error);
      throw error;
    }
  }

  /**
   * Create tenant invitation
   */
  async createInvitation(
    tenantId: string,
    email: string,
    role: string,
    invitedBy: number,
    expiresInDays: number = 7
  ): Promise<TenantInvitation> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const [invitation] = await db.insert(tenantInvitations).values({
        tenantId,
        email: email.toLowerCase(),
        role,
        token,
        invitedBy,
        expiresAt,
        createdAt: new Date(),
      }).returning();

      logger.info(`Invitation created for ${email} to tenant ${tenantId}`);

      return {
        id: invitation.id,
        tenantId: invitation.tenantId,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        createdAt: invitation.createdAt || new Date(),
      };
    } catch (error) {
      logger.error('Error creating invitation:', error);
      throw error;
    }
  }

  /**
   * Verify invitation token
   */
  async verifyInvitation(token: string): Promise<TenantInvitation | null> {
    try {
      const [invitation] = await db.select()
        .from(tenantInvitations)
        .where(eq(tenantInvitations.token, token));

      if (!invitation) {
        return null;
      }

      // Check if expired
      if (invitation.expiresAt < new Date()) {
        return null;
      }

      // Check if already accepted
      if (invitation.acceptedAt) {
        return null;
      }

      return {
        id: invitation.id,
        tenantId: invitation.tenantId,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        createdAt: invitation.createdAt || new Date(),
      };
    } catch (error) {
      logger.error('Error verifying invitation:', error);
      throw error;
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string): Promise<boolean> {
    try {
      const [updated] = await db.update(tenantInvitations)
        .set({ acceptedAt: new Date() })
        .where(
          and(
            eq(tenantInvitations.token, token),
            isNull(tenantInvitations.acceptedAt)
          )
        )
        .returning();

      return !!updated;
    } catch (error) {
      logger.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Format tenant info from database record
   */
  private formatTenantInfo(tenant: typeof tenants.$inferSelect): TenantInfo {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor || '#1e40af',
      secondaryColor: tenant.secondaryColor || '#3b82f6',
      billingPlan: tenant.billingPlan || 'starter',
      subscriptionStatus: tenant.subscriptionStatus || 'active',
      maxUsers: tenant.maxUsers || 10,
      maxEntities: tenant.maxEntities || 5,
      maxStorageGb: tenant.maxStorageGb || 10,
      currentStorageBytes: Number(tenant.currentStorageBytes) || 0,
      settings: (tenant.settings as Record<string, any>) || {},
      features: (tenant.features as Record<string, boolean>) || {},
      status: tenant.status || 'active',
      createdAt: tenant.createdAt || new Date(),
    };
  }
}

// Export singleton instance
export const tenantService = new TenantService();
