/**
 * SMS Service
 * Handles SMS sending via Twilio/MSG91/other providers
 */

import { Twilio } from 'twilio';
import { pool } from '../config/database';
import { logger, notificationLogger } from '../config/logger';

// Twilio configuration
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

export interface SMSOptions {
  to: string;
  message: string;
  template?: string;
  variables?: Record<string, any>;
}

/**
 * Send SMS
 */
export async function sendSMS(options: SMSOptions): Promise<boolean> {
  try {
    // Check if SMS is enabled
    if (process.env.NOTIFICATION_SMS_ENABLED !== 'true') {
      notificationLogger.info('SMS notifications disabled');
      return false;
    }

    // Mock SMS in development if configured
    if (process.env.MOCK_SMS === 'true') {
      notificationLogger.info('Mock SMS sent:', options);
      await logSMS(options.to, options.message, 'sent');
      return true;
    }

    let messageContent = options.message;

    // Load template if specified
    if (options.template) {
      const template = await getTemplate(options.template);
      if (template) {
        messageContent = replaceVariables(template.content, options.variables || {});
      }
    }

    // Send via Twilio
    if (twilioClient && TWILIO_PHONE) {
      const result = await twilioClient.messages.create({
        body: messageContent,
        from: TWILIO_PHONE,
        to: options.to,
      });

      notificationLogger.info('SMS sent successfully:', {
        to: options.to,
        sid: result.sid,
      });

      await logSMS(options.to, messageContent, 'sent');
      return true;
    }

    // Add other SMS providers here (MSG91, AWS SNS, etc.)

    throw new Error('No SMS provider configured');
  } catch (error) {
    notificationLogger.error('SMS send failed:', error);

    await logSMS(
      options.to,
      options.message,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return false;
  }
}

/**
 * Get SMS template from database
 */
async function getTemplate(templateName: string): Promise<any> {
  try {
    const result = await pool.query(
      'SELECT content, variables FROM templates WHERE name = $1 AND type = $2 AND is_active = true',
      [templateName, 'sms']
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to get SMS template:', error);
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
 * Log SMS to database
 */
async function logSMS(
  phoneNumber: string,
  message: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO sms_logs (phone_number, message, status, provider, sent_at, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        phoneNumber,
        message,
        status,
        process.env.SMS_PROVIDER || 'twilio',
        status === 'sent' ? new Date() : null,
        errorMessage || null,
      ]
    );
  } catch (error) {
    logger.error('Failed to log SMS:', error);
  }
}

/**
 * Send OTP SMS
 */
export async function sendOTPSMS(phoneNumber: string, otp: string): Promise<boolean> {
  return sendSMS({
    to: phoneNumber,
    message: `Your Comply Flow OTP is ${otp}. Valid for 10 minutes. Do not share this code.`,
    template: 'otp_sms',
    variables: { otp },
  });
}

/**
 * Verify SMS configuration
 */
export async function verifySMSConfig(): Promise<boolean> {
  if (!twilioClient || !TWILIO_PHONE) {
    logger.warn('⚠️  SMS service not configured');
    return false;
  }

  logger.info('✅ SMS service configured successfully');
  return true;
}
