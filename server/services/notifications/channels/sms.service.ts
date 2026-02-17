/**
 * SMS Service
 *
 * Production-ready SMS service with:
 * - Twilio production configuration
 * - Phone number formatting for Indian numbers (+91)
 * - Delivery tracking via notificationDeliveryLog table
 * - SMS templates for: otp, payment_success, payment_failed, compliance_reminder, service_update
 * - Proper error handling and logging
 */

import twilio from 'twilio';
import { db } from '../../../db';
import { eq } from 'drizzle-orm';
import { notificationDeliveryLog } from '../../../db/schema/notification-delivery-log';
import type { NotificationResult } from '../notification-hub';

// ============================================
// TYPES
// ============================================
export interface SMSPayload {
  to: string;
  message?: string;
  templateId?: string;
  data?: Record<string, any>;
  notificationId?: number; // For delivery tracking
}

export interface SendResult extends NotificationResult {
  deliveryLogId?: number;
}

// ============================================
// SMS SERVICE CLASS
// ============================================
export class SMSService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string = '';
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Twilio client with environment configuration
   */
  private initialize(): void {
    if (process.env.MOCK_SMS === 'true') {
      this.isConfigured = false;
      console.log('[SMSService] Running in mock mode');
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken) {
      console.log('[SMSService] Twilio credentials not configured, running in mock mode');
      this.isConfigured = false;
      return;
    }

    if (!phoneNumber) {
      console.log('[SMSService] TWILIO_PHONE_NUMBER not set, running in mock mode');
      this.isConfigured = false;
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      this.fromNumber = phoneNumber;
      this.isConfigured = true;
      console.log('[SMSService] Twilio initialized successfully');
    } catch (error) {
      console.error('[SMSService] Failed to initialize Twilio:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send SMS with delivery tracking
   */
  async send(payload: SMSPayload): Promise<SendResult> {
    let deliveryLogId: number | undefined;

    try {
      // Format phone number for Indian numbers
      const formattedPhone = this.formatPhoneNumber(payload.to);

      if (!formattedPhone) {
        return {
          channel: 'sms',
          success: false,
          error: 'Invalid phone number format',
        };
      }

      // Create delivery log entry if notificationId provided
      if (payload.notificationId) {
        deliveryLogId = await this.createDeliveryLog(payload.notificationId, 'sms');
      }

      // Generate message from template or use provided message
      const message = payload.templateId
        ? this.getTemplate(payload.templateId, payload.data || {})
        : payload.message || '';

      if (!message) {
        if (deliveryLogId) {
          await this.updateDeliveryLog(deliveryLogId, 'failed', undefined, 'Empty message');
        }
        return {
          channel: 'sms',
          success: false,
          error: 'Message content is required',
          deliveryLogId,
        };
      }

      // Mock mode - log and return success
      if (!this.isConfigured || !this.client) {
        console.log(`[SMSService][MOCK] To: ${formattedPhone}`);
        console.log(`[SMSService][MOCK] Message: ${message.substring(0, 100)}...`);

        const mockMessageId = `mock_sms_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Update delivery log
        if (deliveryLogId) {
          await this.updateDeliveryLog(deliveryLogId, 'delivered', mockMessageId);
        }

        return {
          channel: 'sms',
          success: true,
          messageId: mockMessageId,
          deliveredAt: new Date(),
          deliveryLogId,
        };
      }

      // Send actual SMS via Twilio
      const result = await this.client.messages.create({
        body: message,
        to: formattedPhone,
        from: this.fromNumber,
      });

      console.log(`[SMSService] SMS sent successfully to ${formattedPhone}, SID: ${result.sid}`);

      // Update delivery log with success
      if (deliveryLogId) {
        await this.updateDeliveryLog(deliveryLogId, 'delivered', result.sid);
      }

      return {
        channel: 'sms',
        success: true,
        messageId: result.sid,
        deliveredAt: new Date(),
        deliveryLogId,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SMSService] Send error:', errorMessage);

      // Update delivery log with failure
      if (deliveryLogId) {
        await this.updateDeliveryLog(deliveryLogId, 'failed', undefined, errorMessage);
      }

      return {
        channel: 'sms',
        success: false,
        error: errorMessage,
        deliveryLogId,
      };
    }
  }

  /**
   * Format phone number to E.164 format for Indian numbers (+91XXXXXXXXXX)
   * Returns null if the phone number is invalid
   */
  private formatPhoneNumber(phone: string): string | null {
    if (!phone) return null;

    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // Handle various Indian number formats
    if (cleaned.length === 10) {
      // 10-digit number, add country code
      cleaned = '91' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      // 11-digit with leading 0, remove 0 and add country code
      cleaned = '91' + cleaned.substring(1);
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      // Already has country code
      // Keep as is
    } else if (cleaned.length === 13 && cleaned.startsWith('091')) {
      // Has 0 prefix before country code
      cleaned = cleaned.substring(1);
    } else {
      // Invalid format
      console.warn(`[SMSService] Invalid phone number format: ${phone}`);
      return null;
    }

    // Validate Indian mobile number (starts with 6, 7, 8, or 9)
    const mobileNumber = cleaned.substring(2);
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      console.warn(`[SMSService] Invalid Indian mobile number: ${phone}`);
      return null;
    }

    return '+' + cleaned;
  }

  /**
   * Create delivery log entry
   */
  private async createDeliveryLog(notificationId: number, channel: string): Promise<number> {
    try {
      const [log] = await db.insert(notificationDeliveryLog).values({
        notificationId,
        channel,
        status: 'pending',
        attempts: 1,
        lastAttemptAt: new Date(),
      }).returning();

      return log.id;
    } catch (error) {
      console.error('[SMSService] Failed to create delivery log:', error);
      throw error;
    }
  }

  /**
   * Update delivery log with status
   */
  private async updateDeliveryLog(
    logId: number,
    status: string,
    messageId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: Record<string, any> = {
        status,
        lastAttemptAt: new Date(),
      };

      if (messageId) {
        updateData.providerMessageId = messageId;
      }

      if (errorMessage) {
        updateData.errorMessage = errorMessage.substring(0, 500); // Limit to 500 chars
      }

      if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      await db.update(notificationDeliveryLog)
        .set(updateData)
        .where(eq(notificationDeliveryLog.id, logId));
    } catch (error) {
      console.error('[SMSService] Failed to update delivery log:', error);
      // Don't throw - logging failure shouldn't break SMS send
    }
  }

  /**
   * Get SMS template by ID
   * Returns short SMS messages suitable for SMS character limits
   */
  getTemplate(templateId: string, data: Record<string, any>): string {
    const templates: Record<string, (d: any) => string> = {
      otp: (d) => this.otpTemplate(d),
      payment_success: (d) => this.paymentSuccessTemplate(d),
      payment_failed: (d) => this.paymentFailedTemplate(d),
      compliance_reminder: (d) => this.complianceReminderTemplate(d),
      service_update: (d) => this.serviceUpdateTemplate(d),
    };

    const templateFn = templates[templateId];
    if (!templateFn) {
      console.warn(`[SMSService] Unknown template: ${templateId}`);
      return data.message || '';
    }

    return templateFn(data);
  }

  // ============================================
  // SMS TEMPLATES (Short format for SMS)
  // ============================================

  /**
   * OTP SMS Template
   */
  private otpTemplate(data: {
    otp: string;
    purpose?: string;
    expiresInMinutes?: number;
  }): string {
    const purpose = data.purpose || 'verification';
    const expires = data.expiresInMinutes || 10;
    return `Your DigiComply ${purpose} OTP is ${data.otp}. Valid for ${expires} mins. Do not share this code with anyone.`;
  }

  /**
   * Payment Success SMS Template
   */
  private paymentSuccessTemplate(data: {
    amount: number;
    currency?: string;
    transactionId?: string;
    serviceName?: string;
  }): string {
    const currency = data.currency === 'INR' ? 'Rs.' : (data.currency || 'Rs.');
    const service = data.serviceName ? ` for ${data.serviceName}` : '';
    const txnId = data.transactionId ? ` Ref: ${data.transactionId}` : '';
    return `DigiComply: Payment of ${currency}${data.amount.toLocaleString('en-IN')}${service} received successfully.${txnId}`;
  }

  /**
   * Payment Failed SMS Template
   */
  private paymentFailedTemplate(data: {
    amount: number;
    currency?: string;
    reason?: string;
    retryUrl?: string;
  }): string {
    const currency = data.currency === 'INR' ? 'Rs.' : (data.currency || 'Rs.');
    const reason = data.reason ? ` Reason: ${data.reason}` : '';
    return `DigiComply: Payment of ${currency}${data.amount.toLocaleString('en-IN')} failed.${reason} Please retry or contact support.`;
  }

  /**
   * Compliance Reminder SMS Template
   */
  private complianceReminderTemplate(data: {
    complianceType: string;
    dueDate: string;
    daysRemaining: number;
    companyName?: string;
  }): string {
    const company = data.companyName ? ` for ${data.companyName}` : '';
    const urgency = data.daysRemaining <= 3 ? 'URGENT: ' : '';
    return `${urgency}DigiComply: ${data.complianceType}${company} due on ${data.dueDate} (${data.daysRemaining} days left). Take action now to avoid penalties.`;
  }

  /**
   * Service Update SMS Template
   */
  private serviceUpdateTemplate(data: {
    serviceName: string;
    status: string;
    message?: string;
  }): string {
    const statusText = data.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const msg = data.message ? ` ${data.message}` : '';
    return `DigiComply: ${data.serviceName} status updated to "${statusText}".${msg} Login to view details.`;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if SMS service is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { provider: string; configured: boolean } {
    return {
      provider: this.isConfigured ? 'twilio' : 'mock',
      configured: this.isConfigured,
    };
  }
}
