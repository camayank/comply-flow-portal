/**
 * SMS Service
 *
 * Handles SMS sending via Twilio or MSG91
 */

import type { NotificationResult } from '../notification-hub';

// ============================================
// TYPES
// ============================================
export interface SMSPayload {
  to: string;
  message: string;
  templateId?: string;
}

// ============================================
// SMS SERVICE CLASS
// ============================================
export class SMSService {
  private provider: 'twilio' | 'msg91' | 'mock';
  private twilioClient: any = null;

  constructor() {
    this.provider = this.determineProvider();

    if (this.provider === 'twilio') {
      this.initializeTwilio();
    }
  }

  private determineProvider(): 'twilio' | 'msg91' | 'mock' {
    if (process.env.MOCK_SMS === 'true') return 'mock';
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) return 'twilio';
    if (process.env.MSG91_AUTH_KEY) return 'msg91';
    return 'mock';
  }

  private initializeTwilio() {
    try {
      const twilio = require('twilio');
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      console.log('✅ SMS service (Twilio) initialized');
    } catch (error) {
      console.error('Failed to initialize Twilio:', error);
      this.provider = 'mock';
    }
  }

  /**
   * Send SMS
   */
  async send(payload: SMSPayload): Promise<NotificationResult> {
    const formattedPhone = this.formatPhoneNumber(payload.to);

    if (this.provider === 'mock') {
      console.log(`[MOCK SMS] To: ${formattedPhone}, Message: ${payload.message.substring(0, 50)}...`);
      return {
        channel: 'sms',
        success: true,
        messageId: `mock_sms_${Date.now()}`,
        deliveredAt: new Date(),
      };
    }

    try {
      if (this.provider === 'twilio') {
        return await this.sendViaTwilio(formattedPhone, payload.message);
      } else if (this.provider === 'msg91') {
        return await this.sendViaMSG91(formattedPhone, payload.message, payload.templateId);
      }

      throw new Error('No SMS provider configured');
    } catch (error) {
      console.error('SMS send error:', error);
      return {
        channel: 'sms',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS',
      };
    }
  }

  /**
   * Send via Twilio
   */
  private async sendViaTwilio(to: string, message: string): Promise<NotificationResult> {
    const result = await this.twilioClient.messages.create({
      body: message,
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
    });

    return {
      channel: 'sms',
      success: true,
      messageId: result.sid,
      deliveredAt: new Date(),
    };
  }

  /**
   * Send via MSG91
   */
  private async sendViaMSG91(to: string, message: string, templateId?: string): Promise<NotificationResult> {
    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': process.env.MSG91_AUTH_KEY!,
      },
      body: JSON.stringify({
        template_id: templateId || process.env.MSG91_DEFAULT_TEMPLATE,
        sender: process.env.MSG91_SENDER_ID,
        short_url: '0',
        mobiles: to.replace('+', ''),
        VAR1: message, // Template variable
      }),
    });

    const result = await response.json();

    if (result.type === 'success') {
      return {
        channel: 'sms',
        success: true,
        messageId: result.request_id,
        deliveredAt: new Date(),
      };
    }

    throw new Error(result.message || 'MSG91 API error');
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // Add country code if missing (default to India)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }

    // Add + prefix
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }
}
