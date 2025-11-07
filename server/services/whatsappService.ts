/**
 * WhatsApp Service
 * Handles WhatsApp messages via Twilio/WhatsApp Business API
 */

import { Twilio } from 'twilio';
import { pool } from '../config/database';
import { logger, notificationLogger } from '../config/logger';

// Twilio WhatsApp configuration
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

export interface WhatsAppOptions {
  to: string;
  message: string;
  template?: string;
  variables?: Record<string, any>;
}

/**
 * Send WhatsApp message
 */
export async function sendWhatsApp(options: WhatsAppOptions): Promise<boolean> {
  try {
    // Check if WhatsApp is enabled
    if (process.env.NOTIFICATION_WHATSAPP_ENABLED !== 'true') {
      notificationLogger.info('WhatsApp notifications disabled');
      return false;
    }

    let messageContent = options.message;

    // Load template if specified
    if (options.template) {
      const template = await getTemplate(options.template);
      if (template) {
        messageContent = replaceVariables(template.content, options.variables || {});
      }
    }

    // Ensure phone number has whatsapp: prefix
    const toNumber = options.to.startsWith('whatsapp:') ? options.to : `whatsapp:${options.to}`;

    // Send via Twilio WhatsApp
    if (twilioClient) {
      const result = await twilioClient.messages.create({
        body: messageContent,
        from: TWILIO_WHATSAPP_NUMBER,
        to: toNumber,
      });

      notificationLogger.info('WhatsApp message sent successfully:', {
        to: options.to,
        sid: result.sid,
      });

      await logWhatsApp(options.to, messageContent, 'sent');
      return true;
    }

    throw new Error('No WhatsApp provider configured');
  } catch (error) {
    notificationLogger.error('WhatsApp send failed:', error);

    await logWhatsApp(
      options.to,
      options.message,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return false;
  }
}

/**
 * Get WhatsApp template from database
 */
async function getTemplate(templateName: string): Promise<any> {
  try {
    const result = await pool.query(
      'SELECT content, variables FROM templates WHERE name = $1 AND type = $2 AND is_active = true',
      [templateName, 'whatsapp']
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to get WhatsApp template:', error);
    return null;
  }
}

/**
 * Replace variables in template
 */
function replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;

  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(variables[key]));
  });

  return result;
}

/**
 * Log WhatsApp message to database
 */
async function logWhatsApp(
  phoneNumber: string,
  message: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO whatsapp_logs (phone_number, message, status, sent_at, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        phoneNumber,
        message,
        status,
        status === 'sent' ? new Date() : null,
        errorMessage || null,
      ]
    );
  } catch (error) {
    logger.error('Failed to log WhatsApp message:', error);
  }
}

/**
 * Verify WhatsApp configuration
 */
export async function verifyWhatsAppConfig(): Promise<boolean> {
  if (!twilioClient || !TWILIO_WHATSAPP_NUMBER) {
    logger.warn('⚠️  WhatsApp service not configured');
    return false;
  }

  logger.info('✅ WhatsApp service configured successfully');
  return true;
}
