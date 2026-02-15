import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { logEmail } from './services/communication-logger';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  // For logging
  clientId?: number;
  businessEntityId?: number;
  serviceRequestId?: number;
  purpose?: 'follow_up' | 'issue_resolution' | 'service_discussion' | 'payment_reminder' | 'relationship_building' | 'notification' | 'otp' | 'welcome' | 'invoice';
}

interface OTPEmailData {
  email: string;
  otp: string;
  expiryMinutes: number;
  userName?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Check if email configuration exists
      const emailConfig = {
        host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
        port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER || process.env.SMTP_USER,
          pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
        },
      };

      // If no configuration, use development mode
      if (!emailConfig.auth.user || !emailConfig.auth.pass) {
        console.warn('⚠️  Email service not configured - Using development mode (logs only)');
        console.warn('⚠️  Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env for production');
        this.isConfigured = false;
        return;
      }

      this.transporter = nodemailer.createTransporter(emailConfig);

      // Verify connection
      this.transporter.verify((error) => {
        if (error) {
          console.error('❌ Email service connection failed:', error.message);
          this.isConfigured = false;
        } else {
          console.log('✅ Email service connected successfully');
          this.isConfigured = true;
        }
      });
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send OTP email to user
   */
  async sendOTP(data: OTPEmailData): Promise<boolean> {
    const { email, otp, expiryMinutes, userName } = data;

    const subject = 'Your Login OTP - DigiComply';
    const html = this.getOTPEmailTemplate(otp, expiryMinutes, userName);

    try {
      if (!this.isConfigured) {
        // Development mode: log to console
        console.log('📧 [DEV MODE] OTP Email:', {
          to: email,
          subject,
          otp: `${otp.substring(0, 3)}***`, // Partially masked
          expiryMinutes,
        });
        console.log(`🔐 OTP for ${email}: ${otp} (expires in ${expiryMinutes} minutes)`);
      } else {
        await this.send({
          to: email,
          subject,
          html,
        });
      }

      // Log communication (always, even in dev mode)
      await logEmail({
        to: email,
        subject,
        body: `OTP sent to ${userName || email}. Expires in ${expiryMinutes} minutes.`,
        purpose: 'otp',
        templateId: 'otp_email',
      });

      console.log(`✅ OTP email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email: string, fullName: string, clientId?: number): Promise<boolean> {
    const subject = 'Welcome to DigiComply!';
    const html = this.getWelcomeEmailTemplate(fullName);

    try {
      if (!this.isConfigured) {
        console.log(`📧 [DEV MODE] Welcome email to ${email}`);
      } else {
        await this.send({
          to: email,
          subject,
          html,
        });
      }

      // Log communication
      await logEmail({
        to: email,
        subject,
        body: `Welcome email sent to ${fullName}`,
        clientId,
        purpose: 'welcome',
        templateId: 'welcome_email',
      });

      console.log(`✅ Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, resetToken: string, clientId?: number): Promise<boolean> {
    const subject = 'Reset Your Password - DigiComply';
    const resetLink = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    const html = this.getPasswordResetTemplate(resetLink);

    try {
      if (!this.isConfigured) {
        console.log(`📧 [DEV MODE] Password reset email to ${email}`);
        console.log(`🔗 Reset link: ${resetLink}`);
      } else {
        await this.send({
          to: email,
          subject,
          html,
        });
      }

      // Log communication
      await logEmail({
        to: email,
        subject,
        body: 'Password reset link sent',
        clientId,
        purpose: 'notification',
        templateId: 'password_reset',
      });

      console.log(`✅ Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Send invoice email
   */
  async sendInvoice(
    email: string,
    invoiceNumber: string,
    pdfBuffer?: Buffer,
    options?: { clientId?: number; businessEntityId?: number }
  ): Promise<boolean> {
    const subject = `Invoice ${invoiceNumber} - DigiComply`;
    const html = this.getInvoiceEmailTemplate(invoiceNumber);

    try {
      if (!this.isConfigured) {
        console.log(`📧 [DEV MODE] Invoice email to ${email} (Invoice: ${invoiceNumber})`);
      } else {
        const emailOptions: any = {
          to: email,
          subject,
          html,
        };

        // Attach PDF if provided
        if (pdfBuffer) {
          emailOptions.attachments = [
            {
              filename: `invoice-${invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ];
        }

        await this.send(emailOptions);
      }

      // Log communication
      await logEmail({
        to: email,
        subject,
        body: `Invoice ${invoiceNumber} sent`,
        clientId: options?.clientId,
        businessEntityId: options?.businessEntityId,
        purpose: 'invoice',
        templateId: 'invoice_email',
      });

      console.log(`✅ Invoice email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send invoice email:', error);
      return false;
    }
  }

  /**
   * Send generic email
   */
  private async send(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: options.from || process.env.EMAIL_FROM || '"DigiComply" <noreply@digicomply.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      ...options,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Email Templates
   */

  private getOTPEmailTemplate(otp: string, expiryMinutes: number, userName?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login OTP</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">DigiComply</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${userName ? `<p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi ${userName},</p>` : ''}

              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Your One-Time Password (OTP) for logging into DigiComply is:
              </p>

              <div style="background-color: #f8fafc; border: 2px dashed #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <h2 style="color: #2563eb; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold;">
                  ${otp}
                </h2>
              </div>

              <p style="font-size: 14px; color: #666; margin: 20px 0;">
                ⏰ This OTP will expire in <strong>${expiryMinutes} minutes</strong>.
              </p>

              <p style="font-size: 14px; color: #666; margin: 20px 0;">
                If you didn't request this OTP, please ignore this email or contact our support team.
              </p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #999; margin: 0;">
                  This is an automated message. Please do not reply to this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">
                © ${new Date().getFullYear()} DigiComply. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getWelcomeEmailTemplate(fullName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to DigiComply</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="background-color: #2563eb; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">Welcome to DigiComply!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #333; margin-top: 0;">Hi ${fullName},</h2>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Welcome to DigiComply - your complete compliance management solution!
              </p>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                We're excited to have you on board. Get started by logging in to your account.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.APP_URL || 'http://localhost:5000'}"
                   style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center;">
              <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} DigiComply</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getPasswordResetTemplate(resetLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Click the button below to reset your password:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}"
                   style="background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="font-size: 14px; color: #666;">
                This link will expire in 1 hour. If you didn't request this, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  private getInvoiceEmailTemplate(invoiceNumber: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #333; margin-top: 0;">Invoice ${invoiceNumber}</h2>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Please find your invoice attached to this email.
              </p>
              <p style="font-size: 14px; color: #666;">
                Thank you for your business!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center;">
              <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} DigiComply</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService();
