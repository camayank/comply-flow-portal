/**
 * Email Service
 *
 * Production-ready email service with:
 * - SendGrid support (via SMTP with apikey auth)
 * - Standard SMTP support as fallback
 * - Delivery tracking via notificationDeliveryLog table
 * - Email templates for: otp, welcome, payment_success, proposal, compliance_reminder
 * - Proper error handling and logging
 */

import * as nodemailerModule from 'nodemailer';
import { db } from '../../../db';
import { eq } from 'drizzle-orm';
import { notificationDeliveryLog } from '../../../db/schema/notification-delivery-log';
import type { NotificationResult } from '../notification-hub';

// Handle ESM/CJS interop - nodemailer may export as default or module
const nodemailer = (nodemailerModule as any).default || nodemailerModule;

// ============================================
// TYPES
// ============================================
export interface EmailPayload {
  to: string;
  subject: string;
  templateId?: string;
  data?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  notificationId?: number; // For delivery tracking
}

export interface SendResult extends NotificationResult {
  deliveryLogId?: number;
}

// ============================================
// EMAIL SERVICE CLASS
// ============================================
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;
  private provider: 'sendgrid' | 'smtp' | 'mock' = 'mock';

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the email transporter based on environment configuration
   */
  private initialize(): void {
    const emailProvider = process.env.EMAIL_PROVIDER?.toLowerCase();

    if (process.env.MOCK_EMAIL === 'true') {
      this.provider = 'mock';
      this.isConfigured = false;
      console.log('[EmailService] Running in mock mode');
      return;
    }

    if (emailProvider === 'sendgrid') {
      this.initializeSendGrid();
    } else if (emailProvider === 'smtp' || process.env.SMTP_HOST) {
      this.initializeSMTP();
    } else {
      this.provider = 'mock';
      this.isConfigured = false;
      console.log('[EmailService] No email provider configured, running in mock mode');
    }
  }

  /**
   * Initialize SendGrid transporter via SMTP
   * SendGrid uses smtp.sendgrid.net with API key authentication
   */
  private initializeSendGrid(): void {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      console.error('[EmailService] SENDGRID_API_KEY not set, falling back to mock mode');
      this.provider = 'mock';
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
          user: 'apikey', // SendGrid requires 'apikey' as username
          pass: apiKey,
        },
        pool: true, // Use connection pooling
        maxConnections: 5,
        maxMessages: 100,
      });

      // Verify connection asynchronously
      this.transporter.verify((error) => {
        if (error) {
          console.error('[EmailService] SendGrid connection error:', error.message);
          this.isConfigured = false;
        } else {
          console.log('[EmailService] SendGrid connected successfully');
          this.isConfigured = true;
        }
      });

      this.provider = 'sendgrid';
      this.isConfigured = true;
    } catch (error) {
      console.error('[EmailService] Failed to initialize SendGrid:', error);
      this.provider = 'mock';
      this.isConfigured = false;
    }
  }

  /**
   * Initialize standard SMTP transporter
   */
  private initializeSMTP(): void {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (!host) {
      console.error('[EmailService] SMTP_HOST not set, falling back to mock mode');
      this.provider = 'mock';
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // Use SSL for port 465
        auth: user && pass ? { user, pass } : undefined,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      });

      // Verify connection asynchronously
      this.transporter.verify((error) => {
        if (error) {
          console.error('[EmailService] SMTP connection error:', error.message);
          this.isConfigured = false;
        } else {
          console.log('[EmailService] SMTP connected successfully');
          this.isConfigured = true;
        }
      });

      this.provider = 'smtp';
      this.isConfigured = true;
    } catch (error) {
      console.error('[EmailService] Failed to initialize SMTP:', error);
      this.provider = 'mock';
      this.isConfigured = false;
    }
  }

  /**
   * Send email with delivery tracking
   */
  async send(payload: EmailPayload): Promise<SendResult> {
    let deliveryLogId: number | undefined;

    try {
      // Create delivery log entry if notificationId provided
      if (payload.notificationId) {
        deliveryLogId = await this.createDeliveryLog(payload.notificationId, 'email');
      }

      // Generate content from template or use provided
      const templateResult = payload.templateId
        ? this.getTemplate(payload.templateId, payload.data || {})
        : null;

      const subject = payload.subject || templateResult?.subject || 'DigiComply Notification';
      const html = payload.html || templateResult?.html || this.getTemplate('default', payload.data || {}).html;
      const text = payload.text || this.stripHtml(html);

      // Mock mode - log and return success
      if (this.provider === 'mock' || !this.transporter) {
        console.log(`[EmailService][MOCK] To: ${payload.to}`);
        console.log(`[EmailService][MOCK] Subject: ${subject}`);
        console.log(`[EmailService][MOCK] Preview: ${text.substring(0, 100)}...`);

        const mockMessageId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Update delivery log
        if (deliveryLogId) {
          await this.updateDeliveryLog(deliveryLogId, 'delivered', mockMessageId);
        }

        return {
          channel: 'email',
          success: true,
          messageId: mockMessageId,
          deliveredAt: new Date(),
          deliveryLogId,
        };
      }

      // Send actual email
      const fromAddress = process.env.EMAIL_FROM || 'DigiComply <noreply@digicomply.in>';
      const replyTo = payload.replyTo || process.env.EMAIL_REPLY_TO;

      const result = await this.transporter.sendMail({
        from: fromAddress,
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        replyTo,
        subject,
        html,
        text,
        attachments: payload.attachments,
      });

      console.log(`[EmailService] Email sent successfully to ${payload.to}, messageId: ${result.messageId}`);

      // Update delivery log with success
      if (deliveryLogId) {
        await this.updateDeliveryLog(deliveryLogId, 'delivered', result.messageId);
      }

      return {
        channel: 'email',
        success: true,
        messageId: result.messageId,
        deliveredAt: new Date(),
        deliveryLogId,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] Send error:', errorMessage);

      // Update delivery log with failure
      if (deliveryLogId) {
        await this.updateDeliveryLog(deliveryLogId, 'failed', undefined, errorMessage);
      }

      return {
        channel: 'email',
        success: false,
        error: errorMessage,
        deliveryLogId,
      };
    }
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
      console.error('[EmailService] Failed to create delivery log:', error);
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
      console.error('[EmailService] Failed to update delivery log:', error);
      // Don't throw - logging failure shouldn't break email send
    }
  }

  /**
   * Strip HTML tags to generate plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script blocks
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace nbsp
      .replace(/&amp;/g, '&') // Replace amp
      .replace(/&lt;/g, '<') // Replace lt
      .replace(/&gt;/g, '>') // Replace gt
      .replace(/&quot;/g, '"') // Replace quot
      .replace(/&#39;/g, "'") // Replace apostrophe
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
  }

  /**
   * Get email template by ID
   */
  getTemplate(templateId: string, data: Record<string, any>): { subject: string; html: string } {
    const templates: Record<string, (d: any) => { subject: string; html: string }> = {
      otp: (d) => this.otpTemplate(d),
      welcome: (d) => this.welcomeTemplate(d),
      payment_success: (d) => this.paymentSuccessTemplate(d),
      proposal: (d) => this.proposalTemplate(d),
      compliance_reminder: (d) => this.complianceReminderTemplate(d),
      status_update: (d) => this.statusUpdateTemplate(d),
      password_reset: (d) => this.passwordResetTemplate(d),
      default: (d) => this.defaultTemplate(d),
    };

    const templateFn = templates[templateId] || templates.default;
    return templateFn(data);
  }

  // ============================================
  // EMAIL TEMPLATES
  // ============================================

  /**
   * OTP Email Template
   */
  private otpTemplate(data: {
    otp: string;
    purpose: string;
    expiresInMinutes?: number;
    userName?: string;
  }): { subject: string; html: string } {
    const subject = 'Your Verification Code - DigiComply';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 40px 30px; }
          .otp-box { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333; font-family: monospace; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { color: #dc3545; font-size: 14px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verification Code</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <p>Your verification code for ${this.formatPurpose(data.purpose)} is:</p>
            <div class="otp-box">
              <div class="otp-code">${data.otp}</div>
            </div>
            <p><strong>This code expires in ${data.expiresInMinutes || 10} minutes.</strong></p>
            <p class="warning">If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
            <p>This is an automated message. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  }

  /**
   * Welcome Email Template (with temporary password)
   */
  private welcomeTemplate(data: {
    userName?: string;
    email?: string;
    tempPassword?: string;
    loginUrl?: string;
  }): { subject: string; html: string } {
    const subject = 'Welcome to DigiComply - Your Account is Ready!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 10px 0 0; opacity: 0.9; }
          .content { padding: 40px 30px; }
          .credentials-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; }
          .credentials-box p { margin: 8px 0; }
          .credentials-box .label { color: #666; font-size: 12px; text-transform: uppercase; }
          .credentials-box .value { font-weight: bold; color: #333; font-size: 16px; font-family: monospace; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature-item { padding: 10px 0; border-bottom: 1px solid #eee; }
          .feature-item:last-child { border-bottom: none; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .security-notice { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to DigiComply!</h1>
            <p>Your compliance journey starts here</p>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <p>Thank you for joining DigiComply! We're excited to help you manage your business compliance effortlessly.</p>

            ${data.tempPassword ? `
              <div class="credentials-box">
                <p><span class="label">Email:</span></p>
                <p><span class="value">${data.email || data.userName}</span></p>
                <p style="margin-top: 15px;"><span class="label">Temporary Password:</span></p>
                <p><span class="value">${data.tempPassword}</span></p>
              </div>
              <div class="security-notice">
                <strong>Important:</strong> Please change your password after your first login for security purposes.
              </div>
            ` : ''}

            <div class="features">
              <h3 style="margin-top: 0;">What you can do:</h3>
              <div class="feature-item">Track all your compliance deadlines</div>
              <div class="feature-item">Manage GST, ITR, and ROC filings</div>
              <div class="feature-item">Store documents securely</div>
              <div class="feature-item">Get timely reminders</div>
            </div>

            <center>
              <a href="${data.loginUrl || process.env.APP_URL || 'https://app.digicomply.in'}" class="cta-button">Go to Dashboard</a>
            </center>

            <p>If you have any questions, our support team is always here to help.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  }

  /**
   * Payment Success Email Template
   */
  private paymentSuccessTemplate(data: {
    userName?: string;
    amount: number;
    currency?: string;
    transactionId: string;
    serviceName?: string;
    invoiceUrl?: string;
    paidAt?: string;
  }): { subject: string; html: string } {
    const currency = data.currency || 'INR';
    const currencySymbol = currency === 'INR' ? '₹' : currency;
    const subject = `Payment Received - ${currencySymbol}${data.amount.toLocaleString('en-IN')}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .checkmark { font-size: 48px; margin-bottom: 10px; }
          .content { padding: 40px 30px; }
          .receipt-box { background: #f8f9fa; border-radius: 8px; padding: 25px; margin: 20px 0; }
          .receipt-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
          .receipt-row:last-child { border-bottom: none; }
          .receipt-label { color: #666; }
          .receipt-value { font-weight: bold; color: #333; }
          .amount { font-size: 32px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="checkmark">&#10003;</div>
            <h1>Payment Successful</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <p>Thank you for your payment! Your transaction has been completed successfully.</p>

            <div class="amount">${currencySymbol}${data.amount.toLocaleString('en-IN')}</div>

            <div class="receipt-box">
              <div class="receipt-row">
                <span class="receipt-label">Transaction ID</span>
                <span class="receipt-value">${data.transactionId}</span>
              </div>
              ${data.serviceName ? `
                <div class="receipt-row">
                  <span class="receipt-label">Service</span>
                  <span class="receipt-value">${data.serviceName}</span>
                </div>
              ` : ''}
              <div class="receipt-row">
                <span class="receipt-label">Date</span>
                <span class="receipt-value">${data.paidAt || new Date().toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Status</span>
                <span class="receipt-value" style="color: #28a745;">Paid</span>
              </div>
            </div>

            ${data.invoiceUrl ? `
              <center>
                <a href="${data.invoiceUrl}" class="cta-button">Download Invoice</a>
              </center>
            ` : ''}

            <p style="margin-top: 20px;">If you have any questions about this payment, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
            <p>This receipt was generated automatically.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  }

  /**
   * Proposal Email Template
   */
  private proposalTemplate(data: {
    userName?: string;
    proposalId: string;
    amount: number;
    currency?: string;
    services: string[];
    validUntil: string;
    viewUrl: string;
    companyName?: string;
    notes?: string;
  }): { subject: string; html: string } {
    const currency = data.currency || 'INR';
    const currencySymbol = currency === 'INR' ? '₹' : currency;
    const subject = `Service Proposal #${data.proposalId} - DigiComply`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 10px 0 0; opacity: 0.9; }
          .content { padding: 40px 30px; }
          .proposal-box { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #667eea; }
          .services-list { list-style: none; padding: 0; margin: 15px 0; }
          .services-list li { padding: 10px 0; border-bottom: 1px solid #eee; display: flex; align-items: center; }
          .services-list li:last-child { border-bottom: none; }
          .services-list li:before { content: "\\2713"; color: #28a745; font-weight: bold; margin-right: 10px; }
          .cta-button { display: inline-block; background: #28a745; color: white; padding: 16px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; }
          .validity { background: #fff3cd; padding: 12px; border-radius: 6px; text-align: center; margin: 20px 0; font-size: 14px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Service Proposal</h1>
            <p>Proposal #${data.proposalId}</p>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <p>We're pleased to share our service proposal${data.companyName ? ` for <strong>${data.companyName}</strong>` : ''}:</p>

            <div class="proposal-box">
              <p style="margin: 0 0 15px; color: #666;"><strong>Services Included:</strong></p>
              <ul class="services-list">
                ${data.services.map(s => `<li>${s}</li>`).join('')}
              </ul>
              <hr style="border: none; border-top: 2px solid #eee; margin: 20px 0;">
              <p style="margin: 0; color: #666;"><strong>Total Investment:</strong></p>
              <p class="amount" style="margin: 10px 0 0;">${currencySymbol}${data.amount.toLocaleString('en-IN')}</p>
            </div>

            ${data.notes ? `
              <p><strong>Notes:</strong> ${data.notes}</p>
            ` : ''}

            <div class="validity">
              <strong>Valid until:</strong> ${data.validUntil}
            </div>

            <center>
              <a href="${data.viewUrl}" class="cta-button">View & Accept Proposal</a>
            </center>

            <p style="margin-top: 25px; color: #666; font-size: 14px;">
              Have questions? Reply to this email or contact our team. We're happy to discuss your specific needs.
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  }

  /**
   * Compliance Reminder Email Template
   */
  private complianceReminderTemplate(data: {
    userName?: string;
    complianceType: string;
    companyName?: string;
    dueDate: string;
    daysRemaining: number;
    actionUrl?: string;
    consequences?: string;
    requiredDocuments?: string[];
  }): { subject: string; html: string } {
    const urgencyLevel = data.daysRemaining <= 3 ? 'critical' : data.daysRemaining <= 7 ? 'warning' : 'normal';
    const urgencyColor = urgencyLevel === 'critical' ? '#dc3545' : urgencyLevel === 'warning' ? '#ffc107' : '#28a745';
    const urgencyBg = urgencyLevel === 'critical' ? '#f8d7da' : urgencyLevel === 'warning' ? '#fff3cd' : '#d4edda';

    const subject = urgencyLevel === 'critical'
      ? `URGENT: ${data.complianceType} Due in ${data.daysRemaining} Days!`
      : `Reminder: ${data.complianceType} Due on ${data.dueDate}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: ${urgencyColor}; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .urgency-icon { font-size: 48px; margin-bottom: 10px; }
          .content { padding: 40px 30px; }
          .reminder-box { background: ${urgencyBg}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor}; }
          .days-badge { display: inline-block; background: ${urgencyColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 16px; }
          .documents-list { background: #f8f9fa; padding: 15px 20px; border-radius: 6px; margin: 15px 0; }
          .documents-list ul { margin: 10px 0 0; padding-left: 20px; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; }
          .consequences { background: #f8d7da; padding: 15px; border-radius: 6px; margin: 15px 0; color: #721c24; font-size: 14px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="urgency-icon">${urgencyLevel === 'critical' ? '&#9888;' : '&#128339;'}</div>
            <h1>Compliance Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <p>This is a reminder about an upcoming compliance deadline${data.companyName ? ` for <strong>${data.companyName}</strong>` : ''}:</p>

            <div class="reminder-box">
              <h3 style="margin-top: 0; color: #333;">${data.complianceType}</h3>
              <p style="margin: 10px 0;"><strong>Due Date:</strong> ${data.dueDate}</p>
              <p style="margin: 10px 0;">
                <span class="days-badge">${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''} remaining</span>
              </p>
            </div>

            ${data.requiredDocuments && data.requiredDocuments.length > 0 ? `
              <div class="documents-list">
                <strong>Required Documents:</strong>
                <ul>
                  ${data.requiredDocuments.map(doc => `<li>${doc}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${data.consequences ? `
              <div class="consequences">
                <strong>Non-compliance consequences:</strong> ${data.consequences}
              </div>
            ` : ''}

            ${data.actionUrl ? `
              <center style="margin-top: 25px;">
                <a href="${data.actionUrl}" class="cta-button">Take Action Now</a>
              </center>
            ` : ''}

            <p style="margin-top: 25px; color: #666; font-size: 14px;">
              Missing this deadline may result in penalties. Please ensure timely compliance.
              If you need assistance, our team is here to help.
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  }

  /**
   * Status Update Email Template
   */
  private statusUpdateTemplate(data: {
    userName?: string;
    serviceName: string;
    oldStatus: string;
    newStatus: string;
    message?: string;
    actionUrl?: string;
  }): { subject: string; html: string } {
    const statusColors: Record<string, string> = {
      pending: '#ffc107',
      in_progress: '#17a2b8',
      completed: '#28a745',
      rejected: '#dc3545',
      on_hold: '#6c757d',
      under_review: '#6610f2',
      approved: '#28a745',
    };

    const subject = `Service Update: ${data.serviceName} - ${this.formatStatus(data.newStatus)}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 40px 30px; }
          .status-box { background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; color: white; }
          .arrow { color: #666; margin: 0 15px; font-size: 20px; }
          .message-box { background: #e9ecef; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Service Status Update</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <p>Your service request has been updated:</p>

            <div class="status-box">
              <h3 style="margin-top: 0;">${data.serviceName}</h3>
              <p style="margin: 20px 0;">
                <span class="status-badge" style="background: ${statusColors[data.oldStatus] || '#6c757d'}">
                  ${this.formatStatus(data.oldStatus)}
                </span>
                <span class="arrow">&#8594;</span>
                <span class="status-badge" style="background: ${statusColors[data.newStatus] || '#6c757d'}">
                  ${this.formatStatus(data.newStatus)}
                </span>
              </p>
            </div>

            ${data.message ? `
              <div class="message-box">
                <strong>Message:</strong>
                <p style="margin: 10px 0 0;">${data.message}</p>
              </div>
            ` : ''}

            ${data.actionUrl ? `
              <center style="margin-top: 25px;">
                <a href="${data.actionUrl}" class="cta-button">View Details</a>
              </center>
            ` : ''}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  }

  /**
   * Password Reset Email Template
   */
  private passwordResetTemplate(data: {
    userName?: string;
    resetUrl: string;
    expiresInMinutes?: number;
  }): { subject: string; html: string } {
    const subject = 'Reset Your Password - DigiComply';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 40px 30px; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .warning ul { margin: 10px 0 0; padding-left: 20px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>

            <center style="margin: 25px 0;">
              <a href="${data.resetUrl}" class="cta-button">Reset Password</a>
            </center>

            <div class="warning">
              <strong>Security Notice:</strong>
              <ul>
                <li>This link expires in ${data.expiresInMinutes || 30} minutes</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>

            <p style="color: #666; font-size: 14px;">
              If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
              <span style="word-break: break-all; color: #667eea;">${data.resetUrl}</span>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  }

  /**
   * Default Email Template
   */
  private defaultTemplate(data: {
    userName?: string;
    content?: string;
    subject?: string;
  }): { subject: string; html: string } {
    const subject = data.subject || 'DigiComply Notification';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 40px 30px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DigiComply</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <div>${data.content || ''}</div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Format purpose for display
   */
  private formatPurpose(purpose: string): string {
    const purposes: Record<string, string> = {
      registration: 'account registration',
      login: 'login verification',
      password_reset: 'password reset',
      verification: 'email verification',
      transaction: 'transaction confirmation',
      two_factor: 'two-factor authentication',
    };
    return purposes[purpose] || purpose.replace(/_/g, ' ');
  }

  /**
   * Format status for display
   */
  private formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Check if email service is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get current provider info
   */
  getProviderInfo(): { provider: string; configured: boolean } {
    return {
      provider: this.provider,
      configured: this.isConfigured,
    };
  }
}
