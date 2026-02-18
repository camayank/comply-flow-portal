/**
 * Email Service
 * Handles email sending via SMTP/SendGrid/other providers
 */

import * as nodemailerModule from 'nodemailer';
import { pool } from '../config/database';

// Handle ESM/CJS interop - nodemailer may export as default or module
const nodemailer = (nodemailerModule as any).default || nodemailerModule;
import { logger, notificationLogger } from '../config/logger';

// Email configuration
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

const FROM_EMAIL = {
  name: process.env.EMAIL_FROM_NAME || 'Comply Flow Portal',
  address: process.env.EMAIL_FROM_ADDRESS || 'noreply@complyflow.com',
};

// Create transporter
let transporter: nodemailer.Transporter;

try {
  transporter = nodemailer.createTransporter(SMTP_CONFIG);
} catch (error) {
  logger.error('Failed to create email transporter:', error);
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  variables?: Record<string, any>;
  attachments?: any[];
}

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Check if email is enabled
    if (process.env.NOTIFICATION_EMAIL_ENABLED !== 'true') {
      notificationLogger.info('Email notifications disabled');
      return false;
    }

    // Mock email in development if configured
    if (process.env.MOCK_EMAIL === 'true') {
      notificationLogger.info('Mock email sent:', options);
      await logEmail(options.to as string, options.subject, options.html || options.text || '', 'sent');
      return true;
    }

    let emailContent = options.html || options.text;

    // Load template if specified
    if (options.template) {
      const template = await getTemplate(options.template);
      if (template) {
        emailContent = replaceVariables(template.content, options.variables || {});
        if (!options.subject && template.subject) {
          options.subject = replaceVariables(template.subject, options.variables || {});
        }
      }
    }

    // Send email
    const mailOptions = {
      from: `${FROM_EMAIL.name} <${FROM_EMAIL.address}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: emailContent,
      text: options.text,
      attachments: options.attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    notificationLogger.info('Email sent successfully:', {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
    });

    // Log email
    await logEmail(
      Array.isArray(options.to) ? options.to[0] : options.to,
      options.subject,
      emailContent || '',
      'sent'
    );

    return true;
  } catch (error) {
    notificationLogger.error('Email send failed:', error);

    // Log failed email
    await logEmail(
      Array.isArray(options.to) ? options.to[0] : options.to,
      options.subject,
      options.html || options.text || '',
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return false;
  }
}

/**
 * Get email template from database
 */
async function getTemplate(templateName: string): Promise<any> {
  try {
    const result = await pool.query(
      'SELECT subject, content, variables FROM templates WHERE name = $1 AND type = $2 AND is_active = true',
      [templateName, 'email']
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to get email template:', error);
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
 * Log email to database
 */
async function logEmail(
  to: string,
  subject: string,
  body: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO email_logs (to_email, subject, body, status, sent_at, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        to,
        subject,
        body,
        status,
        status === 'sent' ? new Date() : null,
        errorMessage || null,
      ]
    );
  } catch (error) {
    logger.error('Failed to log email:', error);
  }
}

/**
 * Send OTP email
 */
export async function sendOTPEmail(email: string, firstName: string, otp: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Your OTP for Comply Flow Portal',
    template: 'otp_verification',
    variables: { firstName, otp },
  });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Welcome to Comply Flow Portal!',
    template: 'welcome_email',
    variables: { firstName, email },
  });
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    if (!transporter) {
      return false;
    }
    await transporter.verify();
    logger.info('✅ Email service configured successfully');
    return true;
  } catch (error) {
    logger.error('❌ Email service configuration failed:', error);
    return false;
  }
}
