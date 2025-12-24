/**
 * Unified Notification Service
 * Orchestrates multi-channel notifications (Email, SMS, WhatsApp, In-App)
 *
 * File: server/services/notificationService.ts
 */

import { db } from '../db';
import { users } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { sendEmail } from './emailService';
import { sendSMS } from './smsService';
import { sendWhatsApp } from './whatsappService';
import { logger } from '../logger';

// ============ TYPES ============

export interface NotificationPayload {
  type: string;
  userId: number;
  channels: ('email' | 'sms' | 'whatsapp' | 'in_app')[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data: Record<string, any>;
  scheduledFor?: Date;
}

export interface NotificationResult {
  success: boolean;
  channels: {
    email?: { sent: boolean; error?: string };
    sms?: { sent: boolean; error?: string };
    whatsapp?: { sent: boolean; error?: string };
    in_app?: { sent: boolean; error?: string };
  };
}

// ============ NOTIFICATION TEMPLATES ============

const NOTIFICATION_TEMPLATES: Record<string, {
  subject: string;
  emailTemplate: string;
  smsTemplate: string;
  whatsappTemplate: string;
}> = {
  COMPLIANCE_REMINDER: {
    subject: '⏰ Compliance Reminder: {{complianceName}}',
    emailTemplate: `
      <h2>Compliance Deadline Approaching</h2>
      <p>Dear {{clientName}},</p>
      <p>This is a reminder that <strong>{{complianceName}}</strong> is due on <strong>{{dueDate}}</strong>.</p>
      <p>Days remaining: <strong>{{daysRemaining}}</strong></p>
      {{#if penalty}}
      <p style="color: #e74c3c;"><strong>Note:</strong> {{penalty.warning}}</p>
      {{/if}}
      <p><a href="{{actionUrl}}" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
      <p>Best regards,<br>Comply Flow Portal</p>
    `,
    smsTemplate: 'Reminder: {{complianceName}} due on {{dueDate}}. {{daysRemaining}} days left. Login to complete: {{actionUrl}}',
    whatsappTemplate: '⏰ *Compliance Reminder*\n\n{{complianceName}} is due on {{dueDate}}.\n\nDays remaining: {{daysRemaining}}\n\n👉 {{actionUrl}}',
  },

  COMPLIANCE_DUE_TODAY: {
    subject: '🚨 URGENT: {{complianceName}} Due Today!',
    emailTemplate: `
      <h2 style="color: #e74c3c;">⚠️ Compliance Due Today!</h2>
      <p>Dear {{clientName}},</p>
      <p><strong>{{complianceName}}</strong> is <strong>DUE TODAY</strong>!</p>
      <p>Please complete this compliance immediately to avoid penalties.</p>
      {{#if penalty}}
      <p style="color: #e74c3c; background: #ffeaea; padding: 10px; border-radius: 5px;">
        <strong>⚠️ Penalty Warning:</strong> {{penalty.warning}}
      </p>
      {{/if}}
      <p><a href="{{actionUrl}}" style="background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Now</a></p>
    `,
    smsTemplate: '🚨 URGENT: {{complianceName}} is DUE TODAY! Complete immediately to avoid penalties. {{actionUrl}}',
    whatsappTemplate: '🚨 *URGENT: DUE TODAY*\n\n{{complianceName}} must be completed TODAY!\n\n⚠️ Late filing will attract penalties.\n\n👉 Complete now: {{actionUrl}}',
  },

  COMPLIANCE_DUE_TOMORROW: {
    subject: '⏰ {{complianceName}} Due Tomorrow',
    emailTemplate: `
      <h2>Compliance Due Tomorrow</h2>
      <p>Dear {{clientName}},</p>
      <p><strong>{{complianceName}}</strong> is due <strong>tomorrow ({{dueDate}})</strong>.</p>
      <p>Please ensure all documents are ready and the compliance is completed on time.</p>
      <p><a href="{{actionUrl}}" style="background: #f39c12; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
    `,
    smsTemplate: '⏰ {{complianceName}} is due TOMORROW ({{dueDate}}). Please complete soon. {{actionUrl}}',
    whatsappTemplate: '⏰ *Due Tomorrow*\n\n{{complianceName}} is due on {{dueDate}}.\n\nPlease complete soon to avoid last-minute rush.\n\n👉 {{actionUrl}}',
  },

  COMPLIANCE_OVERDUE: {
    subject: '🔴 OVERDUE: {{complianceName}} - Immediate Action Required',
    emailTemplate: `
      <h2 style="color: #c0392b;">🔴 Compliance Overdue!</h2>
      <p>Dear {{clientName}},</p>
      <p><strong>{{complianceName}}</strong> was due on <strong>{{dueDate}}</strong> and is now <strong>{{daysOverdue}} days overdue</strong>.</p>
      <div style="background: #ffeaea; padding: 15px; border-radius: 5px; border-left: 4px solid #e74c3c;">
        <h3 style="color: #c0392b; margin-top: 0;">Estimated Penalty</h3>
        <p style="font-size: 24px; font-weight: bold; color: #e74c3c;">₹{{penalty.amount}}</p>
        <p>{{penalty.description}}</p>
      </div>
      <p>Please complete this compliance immediately to minimize further penalties.</p>
      <p><a href="{{actionUrl}}" style="background: #c0392b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Now</a></p>
    `,
    smsTemplate: '🔴 OVERDUE: {{complianceName}} is {{daysOverdue}} days late. Penalty: ₹{{penalty.amount}}. Complete NOW: {{actionUrl}}',
    whatsappTemplate: '🔴 *OVERDUE ALERT*\n\n{{complianceName}}\n\n⏰ {{daysOverdue}} days overdue\n💰 Penalty: ₹{{penalty.amount}}\n\n⚠️ Complete immediately!\n\n👉 {{actionUrl}}',
  },

  SLA_WARNING: {
    subject: '⚠️ Task SLA Warning: {{taskName}}',
    emailTemplate: `
      <h2>⚠️ SLA Warning</h2>
      <p>The following task is approaching its deadline:</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Task</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{taskName}}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Due</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{dueDate}}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Time Remaining</strong></td><td style="padding: 8px; border: 1px solid #ddd; color: #e74c3c;"><strong>{{timeRemaining}}</strong></td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Client</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{clientName}}</td></tr>
      </table>
      <p>Please prioritize this task to avoid SLA breach.</p>
    `,
    smsTemplate: '⚠️ SLA Warning: {{taskName}} due in {{timeRemaining}}. Client: {{clientName}}. Please complete ASAP.',
    whatsappTemplate: '⚠️ *SLA Warning*\n\nTask: {{taskName}}\nDue: {{dueDate}}\nTime left: {{timeRemaining}}\nClient: {{clientName}}\n\nPlease prioritize!',
  },

  ESCALATION: {
    subject: '🔺 Escalation: {{escalationType}} - {{taskName}}',
    emailTemplate: `
      <h2 style="color: #e74c3c;">🔺 Escalation Alert</h2>
      <p>A task has been escalated due to: <strong>{{escalationType}}</strong></p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Task</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{taskName}} ({{taskNumber}})</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Client</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{clientName}}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Assignee</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{assigneeName}}</td></tr>
      </table>
      <p>Please review and take appropriate action.</p>
    `,
    smsTemplate: '🔺 Escalation: {{taskName}} - {{escalationType}}. Client: {{clientName}}. Immediate attention required.',
    whatsappTemplate: '🔺 *Escalation Alert*\n\nType: {{escalationType}}\nTask: {{taskName}}\nClient: {{clientName}}\nAssignee: {{assigneeName}}\n\nPlease review immediately.',
  },

  SYSTEM_ALERT: {
    subject: '🔔 System Alert: {{subject}}',
    emailTemplate: `
      <h2>🔔 System Alert</h2>
      <p><strong>{{subject}}</strong></p>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db;">
        <p>{{message}}</p>
      </div>
      <p style="color: #666; font-size: 12px;">This is an automated system alert from Comply Flow Portal.</p>
    `,
    smsTemplate: '🔔 System Alert: {{subject}} - {{message}}',
    whatsappTemplate: '🔔 *System Alert*\n\n{{subject}}\n\n{{message}}',
  },

  COMPLIANCE_CRITICAL_OVERDUE: {
    subject: '🚨 CRITICAL: {{complianceName}} - {{daysOverdue}} Days Overdue',
    emailTemplate: `
      <h2 style="color: #c0392b;">🚨 CRITICAL OVERDUE ALERT</h2>
      <p>A compliance item for <strong>{{clientName}}</strong> requires immediate attention.</p>
      <div style="background: #ffeaea; padding: 15px; border-radius: 5px; border: 2px solid #e74c3c;">
        <p><strong>Compliance:</strong> {{complianceName}}</p>
        <p><strong>Days Overdue:</strong> {{daysOverdue}}</p>
        <p><strong>Estimated Penalty:</strong> ₹{{estimatedPenalty}}</p>
      </div>
      <p style="color: #e74c3c;"><strong>This requires immediate escalation and client communication.</strong></p>
    `,
    smsTemplate: '🚨 CRITICAL: {{clientName}} - {{complianceName}} is {{daysOverdue}} days overdue. Penalty: ₹{{estimatedPenalty}}',
    whatsappTemplate: '🚨 *CRITICAL OVERDUE*\n\nClient: {{clientName}}\nCompliance: {{complianceName}}\nOverdue: {{daysOverdue}} days\nPenalty: ₹{{estimatedPenalty}}\n\n⚠️ Immediate action required!',
  },
};

// ============ MAIN NOTIFICATION FUNCTION ============

/**
 * Send notification through multiple channels
 */
export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const result: NotificationResult = {
    success: false,
    channels: {},
  };

  try {
    // Get user details
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      logger.warn('User not found for notification', { userId: payload.userId });
      return result;
    }

    // Get template
    const template = NOTIFICATION_TEMPLATES[payload.type];
    if (!template) {
      logger.warn('Unknown notification type', { type: payload.type });
      // Still try to send with raw data
    }

    // Process each channel
    for (const channel of payload.channels) {
      try {
        switch (channel) {
          case 'email':
            if (user.email) {
              const emailContent = template
                ? replaceTemplateVariables(template.emailTemplate, payload.data)
                : `<p>${JSON.stringify(payload.data)}</p>`;
              const emailSubject = template
                ? replaceTemplateVariables(template.subject, payload.data)
                : `Notification: ${payload.type}`;

              const emailSent = await sendEmail({
                to: user.email,
                subject: emailSubject,
                html: emailContent,
              });

              result.channels.email = { sent: emailSent };
            } else {
              result.channels.email = { sent: false, error: 'No email address' };
            }
            break;

          case 'sms':
            if (user.phone) {
              const smsContent = template
                ? replaceTemplateVariables(template.smsTemplate, payload.data)
                : `${payload.type}: ${JSON.stringify(payload.data).substring(0, 100)}`;

              const smsSent = await sendSMS({
                to: user.phone,
                message: smsContent,
              });

              result.channels.sms = { sent: smsSent };
            } else {
              result.channels.sms = { sent: false, error: 'No phone number' };
            }
            break;

          case 'whatsapp':
            if (user.phone) {
              const waContent = template
                ? replaceTemplateVariables(template.whatsappTemplate, payload.data)
                : `*${payload.type}*\n${JSON.stringify(payload.data)}`;

              const waSent = await sendWhatsApp({
                to: user.phone,
                message: waContent,
              });

              result.channels.whatsapp = { sent: waSent };
            } else {
              result.channels.whatsapp = { sent: false, error: 'No phone number' };
            }
            break;

          case 'in_app':
            const inAppSent = await createInAppNotification(
              payload.userId,
              payload.type,
              template ? replaceTemplateVariables(template.subject, payload.data) : payload.type,
              payload.data,
              payload.priority
            );
            result.channels.in_app = { sent: inAppSent };
            break;
        }
      } catch (channelError: any) {
        logger.error(`Failed to send ${channel} notification`, {
          error: channelError.message,
          userId: payload.userId,
          type: payload.type,
        });
        result.channels[channel] = { sent: false, error: channelError.message };
      }
    }

    // Determine overall success (at least one channel succeeded)
    result.success = Object.values(result.channels).some(ch => ch?.sent);

    // Log notification attempt
    await logNotification(payload, result);

    return result;
  } catch (error: any) {
    logger.error('Notification service error', {
      error: error.message,
      payload,
    });
    return result;
  }
}

// ============ HELPER FUNCTIONS ============

/**
 * Replace template variables with actual values
 * Supports {{variable}} and {{#if variable}}...{{/if}} syntax
 */
function replaceTemplateVariables(template: string, data: Record<string, any>): string {
  let result = template;

  // Handle conditional blocks {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(conditionalRegex, (_, key, content) => {
    const value = getNestedValue(data, key);
    return value ? content : '';
  });

  // Handle simple variable replacement {{variable}}
  const variableRegex = /\{\{(\w+(?:\.\w+)*)\}\}/g;
  result = result.replace(variableRegex, (_, key) => {
    const value = getNestedValue(data, key);
    return value !== undefined ? String(value) : '';
  });

  return result;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Create in-app notification
 */
async function createInAppNotification(
  userId: number,
  type: string,
  title: string,
  data: Record<string, any>,
  priority: string
): Promise<boolean> {
  try {
    await db.execute(sql`
      INSERT INTO notifications (user_id, type, title, message, priority, is_read, metadata, created_at)
      VALUES (
        ${userId},
        ${type},
        ${title},
        ${data.message || JSON.stringify(data)},
        ${priority},
        false,
        ${JSON.stringify(data)}::jsonb,
        NOW()
      )
    `);
    return true;
  } catch (error: any) {
    // Table might not exist, try simpler insert
    try {
      await db.execute(sql`
        INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
        VALUES (${userId}, ${type}, ${title}, ${JSON.stringify(data)}, false, NOW())
      `);
      return true;
    } catch {
      logger.debug('Could not create in-app notification', { error: error.message });
      return false;
    }
  }
}

/**
 * Log notification for audit trail
 */
async function logNotification(payload: NotificationPayload, result: NotificationResult): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO notification_logs (
        user_id, notification_type, channels, priority,
        payload, result, created_at
      )
      VALUES (
        ${payload.userId},
        ${payload.type},
        ${JSON.stringify(payload.channels)}::jsonb,
        ${payload.priority},
        ${JSON.stringify(payload.data)}::jsonb,
        ${JSON.stringify(result)}::jsonb,
        NOW()
      )
    `);
  } catch (error) {
    // Silent fail - logging should not break notification flow
    logger.debug('Could not log notification', { error });
  }
}

/**
 * Batch send notifications to multiple users
 */
export async function sendBulkNotification(
  userIds: number[],
  type: string,
  channels: ('email' | 'sms' | 'whatsapp' | 'in_app')[],
  priority: 'low' | 'normal' | 'high' | 'urgent',
  data: Record<string, any>
): Promise<Map<number, NotificationResult>> {
  const results = new Map<number, NotificationResult>();

  for (const userId of userIds) {
    const result = await sendNotification({
      type,
      userId,
      channels,
      priority,
      data,
    });
    results.set(userId, result);
  }

  return results;
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(userId?: number, days: number = 7): Promise<any> {
  try {
    const whereClause = userId ? sql`WHERE user_id = ${userId}` : sql``;

    const stats = await db.execute(sql`
      SELECT
        notification_type as type,
        COUNT(*) as total,
        COUNT(CASE WHEN result->>'success' = 'true' THEN 1 END) as successful,
        COUNT(CASE WHEN result->>'success' = 'false' THEN 1 END) as failed
      FROM notification_logs
      ${whereClause}
      AND created_at >= NOW() - INTERVAL '${sql.raw(String(days))} days'
      GROUP BY notification_type
    `);

    return stats;
  } catch {
    return [];
  }
}

export default sendNotification;
