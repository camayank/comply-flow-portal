/**
 * User Provisioning Service
 *
 * Enhanced user management with bulk operations, role templates,
 * onboarding workflows, and self-service capabilities
 */
import { db } from '../db';
import { eq, and, inArray, sql, count, isNull } from 'drizzle-orm';
import { users, auditLogs, operationsTeam, agents, businessEntities } from '@shared/schema';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { logger } from '../logger';

// Types
interface UserProvisionRequest {
  username: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  phone?: string;
  password?: string;
  sendWelcomeEmail?: boolean;
  activateImmediately?: boolean;
  metadata?: Record<string, any>;
}

interface BulkProvisionRequest {
  users: UserProvisionRequest[];
  defaultRole?: string;
  defaultDepartment?: string;
  sendWelcomeEmails?: boolean;
}

interface RoleTemplate {
  id: string;
  name: string;
  role: string;
  defaultPermissions: string[];
  department?: string;
  workloadSettings?: {
    maxWorkload: number;
    defaultCapacity: number;
  };
  metadata?: Record<string, any>;
}

interface ProvisionResult {
  success: boolean;
  userId?: number;
  username?: string;
  tempPassword?: string;
  error?: string;
}

interface BulkProvisionResult {
  total: number;
  successful: number;
  failed: number;
  results: ProvisionResult[];
}

interface UserOnboardingStatus {
  userId: number;
  steps: {
    accountCreated: boolean;
    emailVerified: boolean;
    profileCompleted: boolean;
    securitySetup: boolean;
    trainingCompleted: boolean;
    firstLogin: boolean;
  };
  completionPercentage: number;
  pendingActions: string[];
}

// Role templates for quick provisioning
const ROLE_TEMPLATES: Record<string, RoleTemplate> = {
  ops_executive: {
    id: 'ops_executive',
    name: 'Operations Executive',
    role: 'ops_executive',
    defaultPermissions: ['read:services', 'update:services', 'create:services'],
    department: 'Operations',
    workloadSettings: {
      maxWorkload: 20,
      defaultCapacity: 15,
    },
  },
  ops_manager: {
    id: 'ops_manager',
    name: 'Operations Manager',
    role: 'ops_manager',
    defaultPermissions: ['read:services', 'update:services', 'create:services', 'manage:team'],
    department: 'Operations',
    workloadSettings: {
      maxWorkload: 30,
      defaultCapacity: 25,
    },
  },
  sales_executive: {
    id: 'sales_executive',
    name: 'Sales Executive',
    role: 'sales_executive',
    defaultPermissions: ['read:leads', 'update:leads', 'create:leads', 'create:proposals'],
    department: 'Sales',
  },
  qc_executive: {
    id: 'qc_executive',
    name: 'QC Executive',
    role: 'qc_executive',
    defaultPermissions: ['read:services', 'update:qc', 'create:reviews'],
    department: 'Quality',
    workloadSettings: {
      maxWorkload: 15,
      defaultCapacity: 12,
    },
  },
  customer_service: {
    id: 'customer_service',
    name: 'Customer Service',
    role: 'customer_service',
    defaultPermissions: ['read:services', 'read:clients', 'create:tickets'],
    department: 'Support',
  },
  client: {
    id: 'client',
    name: 'Client User',
    role: 'client',
    defaultPermissions: ['read:own_services', 'create:own_requests', 'upload:documents'],
  },
};

class UserProvisioningService {
  /**
   * Provision a single user
   */
  async provisionUser(request: UserProvisionRequest, createdBy: number): Promise<ProvisionResult> {
    try {
      // Check if username or email already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, request.username))
        .limit(1);

      if (existingUser.length > 0) {
        return { success: false, error: 'Username already exists' };
      }

      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, request.email))
        .limit(1);

      if (existingEmail.length > 0) {
        return { success: false, error: 'Email already exists' };
      }

      // Generate password if not provided
      const tempPassword = request.password || this.generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          username: request.username,
          email: request.email,
          fullName: request.fullName,
          password: hashedPassword,
          role: request.role,
          department: request.department,
          phone: request.phone,
          isActive: request.activateImmediately !== false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create operations team entry if applicable
      const template = ROLE_TEMPLATES[request.role];
      if (template?.workloadSettings) {
        await db.insert(operationsTeam).values({
          userId: newUser.id,
          department: request.department || template.department,
          maxWorkload: template.workloadSettings.maxWorkload,
          currentWorkload: 0,
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Create audit log
      await this.createAuditLog(createdBy, 'user_provisioned', 'user', String(newUser.id), null, {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      });

      logger.info(`User provisioned: ${newUser.username} (${newUser.role}) by user ${createdBy}`);

      return {
        success: true,
        userId: newUser.id,
        username: newUser.username,
        tempPassword: request.password ? undefined : tempPassword,
      };
    } catch (error: any) {
      logger.error('Provision user error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk provision multiple users
   */
  async bulkProvisionUsers(request: BulkProvisionRequest, createdBy: number): Promise<BulkProvisionResult> {
    const results: ProvisionResult[] = [];

    for (const userReq of request.users) {
      const result = await this.provisionUser(
        {
          ...userReq,
          role: userReq.role || request.defaultRole || 'client',
          department: userReq.department || request.defaultDepartment,
          sendWelcomeEmail: userReq.sendWelcomeEmail ?? request.sendWelcomeEmails,
        },
        createdBy
      );
      results.push(result);
    }

    const successful = results.filter((r) => r.success).length;

    return {
      total: request.users.length,
      successful,
      failed: request.users.length - successful,
      results,
    };
  }

  /**
   * Deprovision (deactivate) a user
   */
  async deprovisionUser(
    userId: number,
    deactivatedBy: number,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Deactivate user
      await db
        .update(users)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Mark as unavailable in operations team if applicable
      await db
        .update(operationsTeam)
        .set({
          isAvailable: false,
          updatedAt: new Date(),
        })
        .where(eq(operationsTeam.userId, userId));

      // Create audit log
      await this.createAuditLog(deactivatedBy, 'user_deprovisioned', 'user', String(userId), {
        isActive: true,
      }, {
        isActive: false,
        reason,
      });

      logger.info(`User deprovisioned: ${user.username} by user ${deactivatedBy}${reason ? `: ${reason}` : ''}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Deprovision user error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reactivate a deprovisioned user
   */
  async reactivateUser(
    userId: number,
    reactivatedBy: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Reactivate user
      await db
        .update(users)
        .set({
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Mark as available in operations team if applicable
      await db
        .update(operationsTeam)
        .set({
          isAvailable: true,
          updatedAt: new Date(),
        })
        .where(eq(operationsTeam.userId, userId));

      // Create audit log
      await this.createAuditLog(reactivatedBy, 'user_reactivated', 'user', String(userId), {
        isActive: false,
      }, {
        isActive: true,
      });

      logger.info(`User reactivated: ${user.username} by user ${reactivatedBy}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Reactivate user error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(
    userId: number,
    newRole: string,
    updatedBy: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const oldRole = user.role;

      // Update role
      await db
        .update(users)
        .set({
          role: newRole,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Update operations team settings if applicable
      const template = ROLE_TEMPLATES[newRole];
      if (template?.workloadSettings) {
        const [existingTeam] = await db
          .select()
          .from(operationsTeam)
          .where(eq(operationsTeam.userId, userId))
          .limit(1);

        if (existingTeam) {
          await db
            .update(operationsTeam)
            .set({
              maxWorkload: template.workloadSettings.maxWorkload,
              department: template.department,
              updatedAt: new Date(),
            })
            .where(eq(operationsTeam.userId, userId));
        } else {
          await db.insert(operationsTeam).values({
            userId,
            department: template.department,
            maxWorkload: template.workloadSettings.maxWorkload,
            currentWorkload: 0,
            isAvailable: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Create audit log
      await this.createAuditLog(updatedBy, 'role_changed', 'user', String(userId), {
        role: oldRole,
      }, {
        role: newRole,
      });

      logger.info(`User role changed: ${user.username} from ${oldRole} to ${newRole} by user ${updatedBy}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Update user role error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset user password
   */
  async resetPassword(
    userId: number,
    resetBy: number,
    newPassword?: string
  ): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const tempPassword = newPassword || this.generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Create audit log
      await this.createAuditLog(resetBy, 'password_reset', 'user', String(userId), null, {
        resetBy,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Password reset for user: ${user.username} by user ${resetBy}`);

      return {
        success: true,
        tempPassword: newPassword ? undefined : tempPassword,
      };
    } catch (error: any) {
      logger.error('Reset password error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user onboarding status
   */
  async getOnboardingStatus(userId: number): Promise<UserOnboardingStatus | null> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user) {
        return null;
      }

      const steps = {
        accountCreated: true,
        emailVerified: user.emailVerified === true,
        profileCompleted: !!(user.fullName && user.phone),
        securitySetup: user.twoFactorEnabled === true,
        trainingCompleted: false, // Would check training records
        firstLogin: user.lastLoginAt !== null,
      };

      const completedSteps = Object.values(steps).filter(Boolean).length;
      const totalSteps = Object.keys(steps).length;

      const pendingActions: string[] = [];
      if (!steps.emailVerified) pendingActions.push('Verify email address');
      if (!steps.profileCompleted) pendingActions.push('Complete profile information');
      if (!steps.securitySetup) pendingActions.push('Enable two-factor authentication');
      if (!steps.trainingCompleted) pendingActions.push('Complete onboarding training');
      if (!steps.firstLogin) pendingActions.push('Login to your account');

      return {
        userId,
        steps,
        completionPercentage: Math.round((completedSteps / totalSteps) * 100),
        pendingActions,
      };
    } catch (error) {
      logger.error('Get onboarding status error:', error);
      return null;
    }
  }

  /**
   * Get role templates
   */
  getRoleTemplates(): RoleTemplate[] {
    return Object.values(ROLE_TEMPLATES);
  }

  /**
   * Get provisioning statistics
   */
  async getProvisioningStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    byRole: Record<string, number>;
    recentProvisioned: number;
    pendingOnboarding: number;
  }> {
    try {
      const [totalCount] = await db.select({ count: count() }).from(users);
      const [activeCount] = await db.select({ count: count() }).from(users).where(eq(users.isActive, true));
      const [inactiveCount] = await db.select({ count: count() }).from(users).where(eq(users.isActive, false));

      const roleCounts = await db
        .select({
          role: users.role,
          count: count(),
        })
        .from(users)
        .groupBy(users.role);

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [recentCount] = await db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.createdAt} >= ${sevenDaysAgo}`);

      const [pendingOnboarding] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            isNull(users.lastLoginAt)
          )
        );

      const byRole: Record<string, number> = {};
      roleCounts.forEach((r) => {
        byRole[r.role || 'unknown'] = r.count;
      });

      return {
        totalUsers: totalCount?.count || 0,
        activeUsers: activeCount?.count || 0,
        inactiveUsers: inactiveCount?.count || 0,
        byRole,
        recentProvisioned: recentCount?.count || 0,
        pendingOnboarding: pendingOnboarding?.count || 0,
      };
    } catch (error) {
      logger.error('Get provisioning stats error:', error);
      throw error;
    }
  }

  /**
   * Generate temporary password
   */
  private generateTempPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';

    // Ensure at least one of each required character type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%'[Math.floor(Math.random() * 5)];

    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    userId: number,
    action: string,
    entityType: string,
    entityId: string | null,
    oldValue: any,
    newValue: any
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId,
        action,
        entityType,
        entityId,
        oldValue,
        newValue,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Create audit log error:', error);
    }
  }
}

export const userProvisioningService = new UserProvisioningService();
