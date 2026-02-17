/**
 * WhatsApp Service
 *
 * Handles WhatsApp messaging via WhatsApp Business API
 */

import type { NotificationResult } from '../notification-hub';

// ============================================
// TYPES
// ============================================
export interface WhatsAppPayload {
  to: string;
  templateId: string;
  data?: Record<string, any>;
  mediaUrl?: string;
}

// ============================================
// WHATSAPP SERVICE CLASS
// ============================================
export class WhatsAppService {
  private isMock: boolean;
  private accessToken: string | null = null;
  private phoneNumberId: string | null = null;

  constructor() {
    this.isMock = process.env.MOCK_WHATSAPP === 'true' || !process.env.WHATSAPP_ACCESS_TOKEN;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || null;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;

    if (!this.isMock && this.accessToken) {
      console.log('✅ WhatsApp service initialized');
    }
  }

  /**
   * Send WhatsApp message
   */
  async send(payload: WhatsAppPayload): Promise<NotificationResult> {
    const formattedPhone = this.formatPhoneNumber(payload.to);

    if (this.isMock) {
      console.log(`[MOCK WHATSAPP] To: ${formattedPhone}, Template: ${payload.templateId}`);
      return {
        channel: 'whatsapp',
        success: true,
        messageId: `mock_wa_${Date.now()}`,
        deliveredAt: new Date(),
      };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify(this.buildMessagePayload(formattedPhone, payload)),
        }
      );

      const result = await response.json();

      if (result.messages && result.messages[0]) {
        return {
          channel: 'whatsapp',
          success: true,
          messageId: result.messages[0].id,
          deliveredAt: new Date(),
        };
      }

      throw new Error(result.error?.message || 'WhatsApp API error');
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return {
        channel: 'whatsapp',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send WhatsApp message',
      };
    }
  }

  /**
   * Build WhatsApp API message payload
   */
  private buildMessagePayload(to: string, payload: WhatsAppPayload) {
    // Template-based message
    const templateComponents: any[] = [];

    // Add parameters if provided
    if (payload.data) {
      const parameters = Object.values(payload.data).map(value => ({
        type: 'text',
        text: String(value),
      }));

      if (parameters.length > 0) {
        templateComponents.push({
          type: 'body',
          parameters,
        });
      }
    }

    return {
      messaging_product: 'whatsapp',
      to: to.replace('+', ''),
      type: 'template',
      template: {
        name: payload.templateId,
        language: { code: 'en' },
        components: templateComponents,
      },
    };
  }

  /**
   * Format phone number
   */
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    return cleaned;
  }
}
