const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }
  
  async initializeTransporter() {
    try {
      if (process.env.NODE_ENV === 'development' && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
        // Use Ethereal for development if SMTP not configured
        const testAccount = await nodemailer.createTestAccount();
        
        this.transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        
        logger.info('Email service initialized with Ethereal (development)', {
          user: testAccount.user,
          previewUrl: 'https://ethereal.email'
        });
        
      } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        // Use configured SMTP
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          tls: {
            rejectUnauthorized: false // Allow self-signed certificates in development
          }
        });
        
        // Verify SMTP connection
        await this.transporter.verify();
        
        logger.info('Email service initialized with SMTP', {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER
        });
        
      } else {
        logger.warn('Email service not configured - emails will be logged only');
        return;
      }
      
      this.isConfigured = true;
      
    } catch (error) {
      logger.error('Email service initialization failed', {
        error: error.message,
        host: process.env.SMTP_HOST
      });
      
      // Fallback: create a mock transporter that logs emails
      this.transporter = {
        sendMail: async (mailOptions) => {
          logger.info('Mock email sent', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            text: mailOptions.text
          });
          return { messageId: 'mock-' + Date.now() };
        }
      };
    }
  }
  
  async sendEmail(to, subject, content, options = {}) {
    try {
      if (!this.transporter) {
        await this.initializeTransporter();
      }
      
      const fromName = options.fromName || process.env.EMAIL_FROM_NAME || 'MKW Advisors';
      const fromAddress = options.fromAddress || process.env.EMAIL_FROM_ADDRESS || 'noreply@mkwadvisors.com';
      
      const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text: content,
        html: options.html || content.replace(/\n/g, '<br>'),
        ...options
      };
      
      const result = await this.transporter.sendMail(mailOptions);
      
      // Log preview URL for Ethereal
      if (process.env.NODE_ENV === 'development' && result.messageId) {
        const previewUrl = nodemailer.getTestMessageUrl(result);
        if (previewUrl) {
          logger.info('Email sent - preview available', {
            to,
            subject,
            messageId: result.messageId,
            previewUrl
          });
        }
      } else {
        logger.info('Email sent successfully', {
          to,
          subject,
          messageId: result.messageId
        });
      }
      
      return {
        success: true,
        messageId: result.messageId,
        previewUrl: nodemailer.getTestMessageUrl(result)
      };
      
    } catch (error) {
      logger.error('Email send failed', {
        error: error.message,
        to,
        subject
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async sendTemplatedEmail(templateCode, to, variables, options = {}) {
    try {
      // Get template from database
      const db = require('../database/connection');
      
      const template = await db('notification_templates')
        .where('code', templateCode)
        .where('type', 'email')
        .where('is_active', true)
        .first();
      
      if (!template) {
        throw new Error(`Email template '${templateCode}' not found`);
      }
      
      // Replace variables in subject and content
      let subject = template.subject;
      let content = template.content;
      
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        subject = subject.replace(regex, value || '');
        content = content.replace(regex, value || '');
      }
      
      return await this.sendEmail(to, subject, content, options);
      
    } catch (error) {
      logger.error('Templated email send failed', {
        error: error.message,
        templateCode,
        to,
        variables
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async sendServiceRequestNotification(serviceRequest, templateCode) {
    try {
      // Get service details
      const db = require('../database/connection');
      
      const service = await db('services')
        .where('id', serviceRequest.service_id)
        .first();
      
      const assignedUser = serviceRequest.assigned_to ? 
        await db('system_users')
          .select('first_name', 'last_name', 'email')
          .where('id', serviceRequest.assigned_to)
          .first() : null;
      
      // Get company config
      const companyConfig = await db('system_config')
        .whereIn('key', ['name', 'email', 'phone'])
        .where('category', 'company');
      
      const config = companyConfig.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      
      const variables = {
        client_name: serviceRequest.client_name,
        service_name: service.name,
        request_number: serviceRequest.request_number,
        expected_delivery_date: serviceRequest.expected_delivery_date?.toLocaleDateString(),
        assigned_executive: assignedUser ? 
          `${assignedUser.first_name} ${assignedUser.last_name}` : 'TBD',
        company_name: config.name || 'MKW Advisors',
        company_email: config.email || 'info@mkwadvisors.com',
        company_phone: config.phone || '+91-11-4567-8900',
        final_amount: serviceRequest.final_price || serviceRequest.quoted_price,
        payment_status: serviceRequest.payment_status
      };
      
      return await this.sendTemplatedEmail(
        templateCode,
        serviceRequest.client_email,
        variables
      );
      
    } catch (error) {
      logger.error('Service request notification failed', {
        error: error.message,
        serviceRequestId: serviceRequest.id,
        templateCode
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();