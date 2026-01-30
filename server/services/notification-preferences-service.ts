/**
 * Notification Preferences Service
 *
 * Manages user notification preferences across channels:
 * - Email notifications
 * - SMS notifications
 * - WhatsApp notifications
 * - Push notifications
 * - In-app notifications
 *
 * Features:
 * - Per-notification-type preferences
 * - Frequency control (immediate, daily digest, weekly)
 * - Quiet hours support
 * - Channel-specific opt-out
 */

import { db } from '../db';
import { notificationPreferences, notificationQueue } from '../../shared/enterprise-schema';
import { users } from '../../shared/schema';
import { eq, and, or, isNull, lte, gte, sql, desc } from 'drizzle-orm';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app';
export type NotificationFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationPreference {
  userId: number;
  notificationType: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  frequency: NotificationFrequency;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone: string;
}

export interface NotificationRequest {
  tenantId?: string;
  userId: number;
  notificationType: string;
  subject?: string;
  content: string;
  priority?: NotificationPriority;
  templateId?: number;
  templateData?: Record<string, any>;
  scheduledFor?: Date;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
}

export interface QueuedNotification {
  id: number;
  userId: number;
  notificationType: string;
  channel: NotificationChannel;
  subject?: string;
  content: string;
  priority: NotificationPriority;
  status: string;
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  errorMessage?: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export const NOTIFICATION_TYPES = {
  // Service Request Notifications
  SERVICE_REQUEST_CREATED: 'service_request.created',
  SERVICE_REQUEST_STATUS_CHANGED: 'service_request.status_changed',
  SERVICE_REQUEST_COMPLETED: 'service_request.completed',
  SERVICE_REQUEST_CANCELLED: 'service_request.cancelled',
  SERVICE_REQUEST_DOCUMENTS_REQUIRED: 'service_request.documents_required',

  // Payment Notifications
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REMINDER: 'payment.reminder',
  PAYMENT_OVERDUE: 'payment.overdue',

  // Invoice Notifications
  INVOICE_GENERATED: 'invoice.generated',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_OVERDUE: 'invoice.overdue',

  // Document Notifications
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_VERIFIED: 'document.verified',
  DOCUMENT_REJECTED: 'document.rejected',
  DOCUMENT_EXPIRING: 'document.expiring',
  DOCUMENT_EXPIRED: 'document.expired',

  // Compliance Notifications
  COMPLIANCE_DUE_REMINDER: 'compliance.due_reminder',
  COMPLIANCE_OVERDUE: 'compliance.overdue',
  COMPLIANCE_COMPLETED: 'compliance.completed',
  COMPLIANCE_STATE_CHANGED: 'compliance.state_changed',
  COMPLIANCE_PENALTY_WARNING: 'compliance.penalty_warning',

  // Task Notifications
  TASK_ASSIGNED: 'task.assigned',
  TASK_DUE_REMINDER: 'task.due_reminder',
  TASK_OVERDUE: 'task.overdue',
  TASK_COMPLETED: 'task.completed',
  TASK_COMMENT_ADDED: 'task.comment_added',

  // Support Notifications
  TICKET_CREATED: 'ticket.created',
  TICKET_RESPONSE: 'ticket.response',
  TICKET_RESOLVED: 'ticket.resolved',
  TICKET_ESCALATED: 'ticket.escalated',

  // Account Notifications
  ACCOUNT_WELCOME: 'account.welcome',
  ACCOUNT_PASSWORD_CHANGED: 'account.password_changed',
  ACCOUNT_LOGIN_ALERT: 'account.login_alert',
  ACCOUNT_SECURITY_ALERT: 'account.security_alert',

  // Report Notifications
  REPORT_READY: 'report.ready',
  REPORT_SCHEDULED: 'report.scheduled',

  // System Notifications
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_ANNOUNCEMENT: 'system.announcement',
  SYSTEM_UPDATE: 'system.update',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Default preferences for new users
const DEFAULT_PREFERENCES: Partial<NotificationPreference> = {
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  pushEnabled: true,
  inAppEnabled: true,
  frequency: 'immediate',
  quietHoursTimezone: 'Asia/Kolkata',
};

// ============================================================================
// NOTIFICATION PREFERENCES SERVICE
// ============================================================================

class NotificationPreferencesService {
  /**
   * Get user's notification preferences for a specific type
   */
  async getPreference(userId: number, notificationType: string): Promise<NotificationPreference | null> {
    try {
      const [pref] = await db.select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.userId, userId),
            eq(notificationPreferences.notificationType, notificationType)
          )
        );

      if (!pref) {
        return null;
      }

      return {
        userId: pref.userId,
        notificationType: pref.notificationType,
        emailEnabled: pref.emailEnabled ?? true,
        smsEnabled: pref.smsEnabled ?? false,
        whatsappEnabled: pref.whatsappEnabled ?? false,
        pushEnabled: pref.pushEnabled ?? true,
        inAppEnabled: pref.inAppEnabled ?? true,
        frequency: (pref.frequency as NotificationFrequency) || 'immediate',
        quietHoursStart: pref.quietHoursStart || undefined,
        quietHoursEnd: pref.quietHoursEnd || undefined,
        quietHoursTimezone: pref.quietHoursTimezone || 'Asia/Kolkata',
      };
    } catch (error) {
      logger.error('Error getting notification preference:', error);
      throw error;
    }
  }

  /**
   * Get all notification preferences for a user
   */
  async getAllPreferences(userId: number): Promise<NotificationPreference[]> {
    try {
      const prefs = await db.select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId));

      return prefs.map(pref => ({
        userId: pref.userId,
        notificationType: pref.notificationType,
        emailEnabled: pref.emailEnabled ?? true,
        smsEnabled: pref.smsEnabled ?? false,
        whatsappEnabled: pref.whatsappEnabled ?? false,
        pushEnabled: pref.pushEnabled ?? true,
        inAppEnabled: pref.inAppEnabled ?? true,
        frequency: (pref.frequency as NotificationFrequency) || 'immediate',
        quietHoursStart: pref.quietHoursStart || undefined,
        quietHoursEnd: pref.quietHoursEnd || undefined,
        quietHoursTimezone: pref.quietHoursTimezone || 'Asia/Kolkata',
      }));
    } catch (error) {
      logger.error('Error getting all notification preferences:', error);
      throw error;
    }
  }

  /**
   * Set notification preference for a user
   */
  async setPreference(preference: NotificationPreference): Promise<NotificationPreference> {
    try {
      // Check if preference exists
      const existing = await this.getPreference(preference.userId, preference.notificationType);

      if (existing) {
        // Update existing
        await db.update(notificationPreferences)
          .set({
            emailEnabled: preference.emailEnabled,
            smsEnabled: preference.smsEnabled,
            whatsappEnabled: preference.whatsappEnabled,
            pushEnabled: preference.pushEnabled,
            inAppEnabled: preference.inAppEnabled,
            frequency: preference.frequency,
            quietHoursStart: preference.quietHoursStart || null,
            quietHoursEnd: preference.quietHoursEnd || null,
            quietHoursTimezone: preference.quietHoursTimezone,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(notificationPreferences.userId, preference.userId),
              eq(notificationPreferences.notificationType, preference.notificationType)
            )
          );
      } else {
        // Insert new
        await db.insert(notificationPreferences).values({
          userId: preference.userId,
          notificationType: preference.notificationType,
          emailEnabled: preference.emailEnabled,
          smsEnabled: preference.smsEnabled,
          whatsappEnabled: preference.whatsappEnabled,
          pushEnabled: preference.pushEnabled,
          inAppEnabled: preference.inAppEnabled,
          frequency: preference.frequency,
          quietHoursStart: preference.quietHoursStart || null,
          quietHoursEnd: preference.quietHoursEnd || null,
          quietHoursTimezone: preference.quietHoursTimezone,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return preference;
    } catch (error) {
      logger.error('Error setting notification preference:', error);
      throw error;
    }
  }

  /**
   * Bulk update preferences for a user
   */
  async bulkSetPreferences(userId: number, preferences: Partial<NotificationPreference>[]): Promise<void> {
    try {
      for (const pref of preferences) {
        await this.setPreference({
          ...DEFAULT_PREFERENCES,
          ...pref,
          userId,
        } as NotificationPreference);
      }
    } catch (error) {
      logger.error('Error bulk setting preferences:', error);
      throw error;
    }
  }

  /**
   * Initialize default preferences for a new user
   */
  async initializeDefaults(userId: number): Promise<void> {
    try {
      const allTypes = Object.values(NOTIFICATION_TYPES);

      for (const notificationType of allTypes) {
        const existing = await this.getPreference(userId, notificationType);
        if (!existing) {
          await this.setPreference({
            ...DEFAULT_PREFERENCES,
            userId,
            notificationType,
          } as NotificationPreference);
        }
      }

      logger.info(`Initialized notification preferences for user ${userId}`);
    } catch (error) {
      logger.error('Error initializing default preferences:', error);
      throw error;
    }
  }

  /**
   * Get effective channels for a notification
   * Considers user preferences, quiet hours, and frequency settings
   */
  async getEnabledChannels(
    userId: number,
    notificationType: string,
    priority: NotificationPriority = 'normal'
  ): Promise<NotificationChannel[]> {
    try {
      let pref = await this.getPreference(userId, notificationType);

      // If no specific preference, use default
      if (!pref) {
        pref = {
          ...DEFAULT_PREFERENCES,
          userId,
          notificationType,
        } as NotificationPreference;
      }

      const channels: NotificationChannel[] = [];

      // Check each channel
      if (pref.emailEnabled) channels.push('email');
      if (pref.smsEnabled) channels.push('sms');
      if (pref.whatsappEnabled) channels.push('whatsapp');
      if (pref.pushEnabled) channels.push('push');
      if (pref.inAppEnabled) channels.push('in_app');

      // If quiet hours are set and it's not urgent, check if we're in quiet hours
      if (pref.quietHoursStart && pref.quietHoursEnd && priority !== 'urgent') {
        const inQuietHours = this.isInQuietHours(
          pref.quietHoursStart,
          pref.quietHoursEnd,
          pref.quietHoursTimezone
        );

        if (inQuietHours) {
          // During quiet hours, only allow in-app notifications
          return channels.filter(c => c === 'in_app');
        }
      }

      // For urgent notifications, override and enable all configured channels
      if (priority === 'urgent') {
        const user = await this.getUserContactInfo(userId);
        if (user.email && !channels.includes('email')) channels.push('email');
        if (user.phone && !channels.includes('sms')) channels.push('sms');
      }

      return channels;
    } catch (error) {
      logger.error('Error getting enabled channels:', error);
      return ['in_app']; // Fallback to in-app only
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(start: string, end: string, timezone: string): boolean {
    try {
      const now = new Date();

      // Parse time strings (format: "HH:MM")
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);

      // Get current time in the user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        timeZone: timezone,
      });

      const parts = formatter.formatToParts(now);
      const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const currentMin = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

      const currentMinutes = currentHour * 60 + currentMin;
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Handle overnight quiet hours (e.g., 22:00 to 07:00)
      if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch {
      return false;
    }
  }

  /**
   * Get user contact info for notifications
   */
  private async getUserContactInfo(userId: number): Promise<{ email?: string; phone?: string }> {
    try {
      const [user] = await db.select({
        email: users.email,
        phone: users.phone,
      })
        .from(users)
        .where(eq(users.id, userId));

      return {
        email: user?.email || undefined,
        phone: user?.phone || undefined,
      };
    } catch {
      return {};
    }
  }

  /**
   * Queue a notification based on user preferences
   */
  async queueNotification(request: NotificationRequest): Promise<number[]> {
    try {
      const enabledChannels = request.channels ||
        await this.getEnabledChannels(request.userId, request.notificationType, request.priority);

      const queuedIds: number[] = [];

      for (const channel of enabledChannels) {
        const [queued] = await db.insert(notificationQueue).values({
          tenantId: request.tenantId || null,
          userId: request.userId,
          notificationType: request.notificationType,
          channel,
          subject: request.subject || null,
          content: request.content,
          templateId: request.templateId || null,
          templateData: request.templateData || null,
          priority: request.priority || 'normal',
          status: 'pending',
          scheduledFor: request.scheduledFor || null,
          maxRetries: 3,
          createdAt: new Date(),
        }).returning();

        queuedIds.push(queued.id);
      }

      logger.info(`Queued ${queuedIds.length} notifications for user ${request.userId}`);
      return queuedIds;
    } catch (error) {
      logger.error('Error queueing notification:', error);
      throw error;
    }
  }

  /**
   * Get pending notifications for processing
   */
  async getPendingNotifications(batchSize: number = 50): Promise<QueuedNotification[]> {
    try {
      const now = new Date();

      const pending = await db.select()
        .from(notificationQueue)
        .where(
          and(
            eq(notificationQueue.status, 'pending'),
            or(
              isNull(notificationQueue.scheduledFor),
              lte(notificationQueue.scheduledFor, now)
            )
          )
        )
        .orderBy(
          sql`CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END`,
          notificationQueue.createdAt
        )
        .limit(batchSize);

      return pending.map(n => ({
        id: n.id,
        userId: n.userId!,
        notificationType: n.notificationType,
        channel: n.channel as NotificationChannel,
        subject: n.subject || undefined,
        content: n.content,
        priority: (n.priority as NotificationPriority) || 'normal',
        status: n.status || 'pending',
        scheduledFor: n.scheduledFor || undefined,
        sentAt: n.sentAt || undefined,
        deliveredAt: n.deliveredAt || undefined,
        errorMessage: n.errorMessage || undefined,
      }));
    } catch (error) {
      logger.error('Error getting pending notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as sent
   */
  async markAsSent(notificationId: number, externalId?: string): Promise<void> {
    try {
      await db.update(notificationQueue)
        .set({
          status: 'sent',
          sentAt: new Date(),
          externalId: externalId || null,
        })
        .where(eq(notificationQueue.id, notificationId));
    } catch (error) {
      logger.error('Error marking notification as sent:', error);
      throw error;
    }
  }

  /**
   * Mark notification as delivered
   */
  async markAsDelivered(notificationId: number): Promise<void> {
    try {
      await db.update(notificationQueue)
        .set({
          status: 'delivered',
          deliveredAt: new Date(),
        })
        .where(eq(notificationQueue.id, notificationId));
    } catch (error) {
      logger.error('Error marking notification as delivered:', error);
      throw error;
    }
  }

  /**
   * Mark notification as failed
   */
  async markAsFailed(notificationId: number, errorMessage: string): Promise<void> {
    try {
      const [notification] = await db.select()
        .from(notificationQueue)
        .where(eq(notificationQueue.id, notificationId));

      if (!notification) return;

      const retryCount = (notification.retryCount || 0) + 1;
      const maxRetries = notification.maxRetries || 3;

      if (retryCount < maxRetries) {
        // Schedule retry with exponential backoff
        const delayMs = Math.pow(2, retryCount) * 1000;
        const scheduledFor = new Date(Date.now() + delayMs);

        await db.update(notificationQueue)
          .set({
            status: 'pending',
            retryCount,
            errorMessage,
            scheduledFor,
          })
          .where(eq(notificationQueue.id, notificationId));
      } else {
        await db.update(notificationQueue)
          .set({
            status: 'failed',
            retryCount,
            errorMessage,
          })
          .where(eq(notificationQueue.id, notificationId));
      }
    } catch (error) {
      logger.error('Error marking notification as failed:', error);
      throw error;
    }
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(
    userId: number,
    options: {
      channel?: NotificationChannel;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<QueuedNotification[]> {
    try {
      const { channel, status, limit = 50, offset = 0 } = options;

      const conditions = [eq(notificationQueue.userId, userId)];

      if (channel) {
        conditions.push(eq(notificationQueue.channel, channel));
      }

      if (status) {
        conditions.push(eq(notificationQueue.status, status));
      }

      const notifications = await db.select()
        .from(notificationQueue)
        .where(and(...conditions))
        .orderBy(desc(notificationQueue.createdAt))
        .limit(limit)
        .offset(offset);

      return notifications.map(n => ({
        id: n.id,
        userId: n.userId!,
        notificationType: n.notificationType,
        channel: n.channel as NotificationChannel,
        subject: n.subject || undefined,
        content: n.content,
        priority: (n.priority as NotificationPriority) || 'normal',
        status: n.status || 'pending',
        scheduledFor: n.scheduledFor || undefined,
        sentAt: n.sentAt || undefined,
        deliveredAt: n.deliveredAt || undefined,
        errorMessage: n.errorMessage || undefined,
      }));
    } catch (error) {
      logger.error('Error getting notification history:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from all notifications of a type
   */
  async unsubscribeFromType(userId: number, notificationType: string): Promise<void> {
    try {
      await this.setPreference({
        userId,
        notificationType,
        emailEnabled: false,
        smsEnabled: false,
        whatsappEnabled: false,
        pushEnabled: false,
        inAppEnabled: false,
        frequency: 'immediate',
        quietHoursTimezone: 'Asia/Kolkata',
      });

      logger.info(`User ${userId} unsubscribed from ${notificationType}`);
    } catch (error) {
      logger.error('Error unsubscribing from notification type:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from all notifications
   */
  async unsubscribeFromAll(userId: number): Promise<void> {
    try {
      await db.update(notificationPreferences)
        .set({
          emailEnabled: false,
          smsEnabled: false,
          whatsappEnabled: false,
          pushEnabled: false,
          inAppEnabled: false,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, userId));

      logger.info(`User ${userId} unsubscribed from all notifications`);
    } catch (error) {
      logger.error('Error unsubscribing from all notifications:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationPreferencesService = new NotificationPreferencesService();
