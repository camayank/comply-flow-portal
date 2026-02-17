/**
 * Email Service
 *
 * Handles email sending via SMTP or third-party providers
 */

import nodemailer from 'nodemailer';
import type { NotificationResult } from '../notification-hub';

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
}

// ============================================
// EMAIL SERVICE CLASS
// ============================================
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isMock: boolean;

  constructor() {
    this.isMock = process.env.MOCK_EMAIL === 'true' || !process.env.SMTP_HOST;

    if (!this.isMock) {
      this.initializeTransporter();
    }
  }

  /**
   * Initialize SMTP transporter
   */
  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      // Verify connection
      this.transporter.verify((error) => {
        if (error) {
          console.error('SMTP connection error:', error);
          this.isMock = true;
        } else {
          console.log('✅ Email service connected');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      this.isMock = true;
    }
  }

  /**
   * Send email
   */
  async send(payload: EmailPayload): Promise<NotificationResult> {
    try {
      // Generate HTML from template
      const html = payload.html || this.renderTemplate(payload.templateId, payload.data);
      const text = payload.text || this.stripHtml(html);

      if (this.isMock) {
        console.log(`[MOCK EMAIL] To: ${payload.to}, Subject: ${payload.subject}`);
        console.log(`[MOCK EMAIL] Content preview: ${text.substring(0, 100)}...`);

        return {
          channel: 'email',
          success: true,
          messageId: `mock_${Date.now()}`,
          deliveredAt: new Date(),
        };
      }

      const result = await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM || 'DigiComply <noreply@digicomply.in>',
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        replyTo: payload.replyTo || process.env.EMAIL_REPLY_TO,
        subject: payload.subject,
        html,
        text,
        attachments: payload.attachments,
      });

      return {
        channel: 'email',
        success: true,
        messageId: result.messageId,
        deliveredAt: new Date(),
      };

    } catch (error) {
      console.error('Email send error:', error);
      return {
        channel: 'email',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  /**
   * Render email template
   */
  private renderTemplate(templateId: string | undefined, data: Record<string, any> = {}): string {
    const templates: Record<string, (data: any) => string> = {
      otp: (d) => this.otpTemplate(d),
      welcome: (d) => this.welcomeTemplate(d),
      status_update: (d) => this.statusUpdateTemplate(d),
      proposal: (d) => this.proposalTemplate(d),
      compliance_reminder: (d) => this.complianceReminderTemplate(d),
      password_reset: (d) => this.passwordResetTemplate(d),
      default: (d) => this.defaultTemplate(d),
    };

    const template = templates[templateId || 'default'] || templates.default;
    return template(data);
  }

  /**
   * OTP Email Template
   */
  private otpTemplate(data: { otp: string; purpose: string; expiresInMinutes?: number; userName?: string }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .otp-box { background: #f8f9fa; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
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
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
            <p>This is an automated message. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Welcome Email Template
   */
  private welcomeTemplate(data: { userName?: string; loginUrl?: string }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
          .content { padding: 40px 30px; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature-item { padding: 10px 0; border-bottom: 1px solid #eee; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
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

            <div class="features">
              <h3>What you can do:</h3>
              <div class="feature-item">✅ Track all your compliance deadlines</div>
              <div class="feature-item">✅ Manage GST, ITR, and ROC filings</div>
              <div class="feature-item">✅ Store documents securely</div>
              <div class="feature-item">✅ Get timely reminders</div>
            </div>

            <center>
              <a href="${data.loginUrl || process.env.APP_URL}" class="cta-button">Go to Dashboard</a>
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
  }): string {
    const statusColors: Record<string, string> = {
      pending: '#ffc107',
      in_progress: '#17a2b8',
      completed: '#28a745',
      rejected: '#dc3545',
      on_hold: '#6c757d',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .status-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; color: white; }
          .arrow { color: #666; margin: 0 10px; }
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
              <p>
                <span class="status-badge" style="background: ${statusColors[data.oldStatus] || '#6c757d'}">
                  ${this.formatStatus(data.oldStatus)}
                </span>
                <span class="arrow">→</span>
                <span class="status-badge" style="background: ${statusColors[data.newStatus] || '#6c757d'}">
                  ${this.formatStatus(data.newStatus)}
                </span>
              </p>
              ${data.message ? `<p style="margin-bottom: 0;">${data.message}</p>` : ''}
            </div>

            ${data.actionUrl ? `
              <center>
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
  }

  /**
   * Proposal Email Template
   */
  private proposalTemplate(data: {
    userName?: string;
    proposalId: string;
    amount: number;
    services: string[];
    validUntil: string;
    viewUrl: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .proposal-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .amount { font-size: 28px; font-weight: bold; color: #667eea; }
          .services-list { list-style: none; padding: 0; }
          .services-list li { padding: 8px 0; border-bottom: 1px solid #eee; }
          .cta-button { display: inline-block; background: #28a745; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; }
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
            <p>We're pleased to share our service proposal with you:</p>

            <div class="proposal-box">
              <p><strong>Services Included:</strong></p>
              <ul class="services-list">
                ${data.services.map(s => `<li>✓ ${s}</li>`).join('')}
              </ul>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
              <p><strong>Total Amount:</strong></p>
              <p class="amount">₹${data.amount.toLocaleString('en-IN')}</p>
              <p style="color: #666; font-size: 14px;">Valid until: ${data.validUntil}</p>
            </div>

            <center>
              <a href="${data.viewUrl}" class="cta-button">View & Accept Proposal</a>
            </center>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Compliance Reminder Email Template
   */
  private complianceReminderTemplate(data: {
    userName?: string;
    complianceType: string;
    dueDate: string;
    daysRemaining: number;
    actionUrl?: string;
  }): string {
    const urgencyColor = data.daysRemaining <= 3 ? '#dc3545' : data.daysRemaining <= 7 ? '#ffc107' : '#28a745';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: ${urgencyColor}; color: white; padding: 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .reminder-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor}; }
          .days-badge { display: inline-block; background: ${urgencyColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Compliance Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || 'there'},</p>
            <p>This is a reminder about an upcoming compliance deadline:</p>

            <div class="reminder-box">
              <h3 style="margin-top: 0;">${data.complianceType}</h3>
              <p><strong>Due Date:</strong> ${data.dueDate}</p>
              <p>
                <span class="days-badge">${data.daysRemaining} days remaining</span>
              </p>
            </div>

            ${data.actionUrl ? `
              <center>
                <a href="${data.actionUrl}" class="cta-button">Take Action Now</a>
              </center>
            ` : ''}

            <p style="color: #666; font-size: 14px;">Missing this deadline may result in penalties. Please ensure timely compliance.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password Reset Email Template
   */
  private passwordResetTemplate(data: { userName?: string; resetUrl: string; expiresInMinutes?: number }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 40px 30px; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
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

            <center>
              <a href="${data.resetUrl}" class="cta-button">Reset Password</a>
            </center>

            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>This link expires in ${data.expiresInMinutes || 30} minutes</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DigiComply. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Default Email Template
   */
  private defaultTemplate(data: { userName?: string; content?: string; subject?: string }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
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
  }

  /**
   * Helper: Format purpose for display
   */
  private formatPurpose(purpose: string): string {
    const purposes: Record<string, string> = {
      registration: 'account registration',
      login: 'login verification',
      password_reset: 'password reset',
      verification: 'email verification',
      transaction: 'transaction confirmation',
    };
    return purposes[purpose] || purpose;
  }

  /**
   * Helper: Format status for display
   */
  private formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Helper: Strip HTML tags
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
