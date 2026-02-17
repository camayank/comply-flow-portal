/**
 * Notification Hub Service
 *
 * Central service for sending notifications across all channels
 */

import { db } from '../../db';
import { eq, and, desc } from 'drizzle-orm';
import { notifications, notificationPreferences, NewNotification } from '../../db/schema/notifications';
import { users } from '../../db/schema/users';
import { EmailService } from './channels/email.service';
import { SMSService } from './channels/sms.service';
import { WhatsAppService } from './channels/whatsapp.service';
import { PushService } from './channels/push.service';
import { queueManager } from '../../queues';

// ============================================
// TYPES
// ============================================
export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app';

export interface NotificationPayload {
  userId?: number;
  to?: string; // Direct email/phone for non-users
  type: string;
  channels: NotificationChannel[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  // Content
  subject?: string;
  content: string;
  templateId?: string;
  data?: Record<string, any>;

  // Reference
  referenceType?: string;
  referenceId?: number;

  // Options
  immediate?: boolean; // Skip queue, send immediately
  respectPreferences?: boolean; // Check user preferences (default: true)
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
}

export interface SendResult {
  notificationId?: number;
  results: NotificationResult[];
  allSucceeded: boolean;
}

// ============================================
// NOTIFICATION HUB CLASS
// ============================================
export class NotificationHub {
  private emailService: EmailService;
  private smsService: SMSService;
  private whatsappService: WhatsAppService;
  private pushService: PushService;

  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.whatsappService = new WhatsAppService();
    this.pushService = new PushService();
  }

  /**
   * Send notification through specified channels
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    const results: NotificationResult[] = [];
    let notificationId: number | undefined;

    try {
      // Get user info if userId provided
      let user: any = null;
      let preferences: any = null;

      if (payload.userId) {
        user = await db.query.users.findFirst({
          where: eq(users.id, payload.userId),
        });

        if (payload.respectPreferences !== false) {
          preferences = await this.getUserPreferences(payload.userId);
        }
      }

      // Determine recipient info
      const recipientEmail = payload.to || user?.email;
      const recipientPhone = payload.to || user?.phone;

      // Filter channels based on preferences
      const activeChannels = this.filterChannelsByPreferences(
        payload.channels,
        preferences,
        payload.priority
      );

      // Check quiet hours
      if (preferences && this.isQuietHours(preferences)) {
        // Queue for later unless urgent
        if (payload.priority !== 'urgent') {
          await this.queueForLater(payload, preferences);
          return {
            notificationId: undefined,
            results: [{ channel: 'email', success: true, messageId: 'queued_quiet_hours' }],
            allSucceeded: true,
          };
        }
      }

      // Send through each channel
      for (const channel of activeChannels) {
        try {
          const result = await this.sendToChannel(channel, {
            ...payload,
            to: channel === 'email' ? recipientEmail : recipientPhone,
            userName: user?.fullName || user?.username,
          });
          results.push(result);
        } catch (error) {
          results.push({
            channel,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Create in-app notification record
      if (payload.userId && activeChannels.includes('in_app')) {
        const [notification] = await db.insert(notifications).values({
          userId: payload.userId,
          type: payload.type,
          channel: 'in_app',
          status: 'delivered',
          subject: payload.subject,
          content: payload.content,
          payload: payload.data,
          referenceType: payload.referenceType,
          referenceId: payload.referenceId,
          deliveredAt: new Date(),
        }).returning();
        notificationId = notification.id;
      }

      // Log other channel deliveries
      for (const result of results) {
        if (result.success && result.channel !== 'in_app' && payload.userId) {
          await db.insert(notifications).values({
            userId: payload.userId,
            type: payload.type,
            channel: result.channel,
            status: 'sent',
            subject: payload.subject,
            content: payload.content,
            payload: payload.data,
            referenceType: payload.referenceType,
            referenceId: payload.referenceId,
            sentAt: new Date(),
          });
        }
      }

      return {
        notificationId,
        results,
        allSucceeded: results.every(r => r.success),
      };

    } catch (error) {
      console.error('NotificationHub.send error:', error);
      throw error;
    }
  }

  /**
   * Send to specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    payload: NotificationPayload & { to?: string; userName?: string }
  ): Promise<NotificationResult> {
    switch (channel) {
      case 'email':
        if (!payload.to) throw new Error('Email address required');
        return this.emailService.send({
          to: payload.to,
          subject: payload.subject || this.getDefaultSubject(payload.type),
          templateId: payload.templateId,
          data: {
            ...payload.data,
            userName: payload.userName,
            content: payload.content,
          },
        });

      case 'sms':
        if (!payload.to) throw new Error('Phone number required');
        return this.smsService.send({
          to: payload.to,
          message: payload.content,
          templateId: payload.templateId,
        });

      case 'whatsapp':
        if (!payload.to) throw new Error('Phone number required');
        return this.whatsappService.send({
          to: payload.to,
          templateId: payload.templateId || 'default',
          data: payload.data,
        });

      case 'push':
        if (!payload.userId) throw new Error('User ID required for push');
        return this.pushService.send({
          userId: payload.userId,
          title: payload.subject || this.getDefaultSubject(payload.type),
          body: payload.content,
          data: payload.data,
        });

      case 'in_app':
        // Handled separately in main send method
        return { channel: 'in_app', success: true };

      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: number) {
    let prefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });

    // Create default preferences if none exist
    if (!prefs) {
      const [newPrefs] = await db.insert(notificationPreferences)
        .values({ userId })
        .returning();
      prefs = newPrefs;
    }

    return prefs;
  }

  /**
   * Filter channels based on user preferences
   */
  private filterChannelsByPreferences(
    channels: NotificationChannel[],
    preferences: any,
    priority?: string
  ): NotificationChannel[] {
    if (!preferences) return channels;

    // Urgent notifications bypass preferences
    if (priority === 'urgent') return channels;

    return channels.filter(channel => {
      switch (channel) {
        case 'email': return preferences.emailEnabled;
        case 'sms': return preferences.smsEnabled;
        case 'push': return preferences.pushEnabled;
        case 'whatsapp': return preferences.whatsappEnabled;
        case 'in_app': return preferences.inAppEnabled;
        default: return true;
      }
    });
  }

  /**
   * Check if current time is in user's quiet hours
   */
  private isQuietHours(preferences: any): boolean {
    if (!preferences.quietHoursEnabled) return false;
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return false;

    const now = new Date();
    const timezone = preferences.quietHoursTimezone || 'Asia/Kolkata';

    // Get current time in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const currentTime = formatter.format(now);

    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }

    return currentTime >= start && currentTime < end;
  }

  /**
   * Queue notification for later (after quiet hours)
   */
  private async queueForLater(payload: NotificationPayload, preferences: any) {
    const endTime = preferences.quietHoursEnd;
    const timezone = preferences.quietHoursTimezone || 'Asia/Kolkata';

    // Calculate delay until quiet hours end
    const now = new Date();
    const endDate = new Date(now.toISOString().split('T')[0] + 'T' + endTime);

    // If end time is past, schedule for next day
    if (endDate <= now) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const delay = endDate.getTime() - now.getTime();

    await queueManager.addJob('notifications', {
      type: 'delayed_notification',
      payload,
    }, { delay });
  }

  /**
   * Get default subject for notification type
   */
  private getDefaultSubject(type: string): string {
    const subjects: Record<string, string> = {
      otp: 'Your Verification Code',
      welcome: 'Welcome to DigiComply',
      status_update: 'Service Status Update',
      reminder: 'Reminder',
      alert: 'Important Alert',
      payment: 'Payment Notification',
      compliance: 'Compliance Update',
    };
    return subjects[type] || 'DigiComply Notification';
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId: number): Promise<number> {
    const result = await db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, userId),
        eq(notifications.channel, 'in_app'),
        eq(notifications.status, 'delivered')
      ),
    });
    return result.length;
  }

  /**
   * Get user's in-app notifications
   */
  async getNotifications(userId: number, options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  } = {}) {
    const { limit = 20, offset = 0, unreadOnly = false } = options;

    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.channel, 'in_app'),
    ];

    if (unreadOnly) {
      conditions.push(eq(notifications.status, 'delivered'));
    }

    return db.query.notifications.findMany({
      where: and(...conditions),
      orderBy: desc(notifications.createdAt),
      limit,
      offset,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number, userId: number) {
    await db.update(notifications)
      .set({ status: 'read', readAt: new Date() })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: number) {
    await db.update(notifications)
      .set({ status: 'read', readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.channel, 'in_app'),
        eq(notifications.status, 'delivered')
      ));
  }
}

// Export singleton instance
export const notificationHub = new NotificationHub();
