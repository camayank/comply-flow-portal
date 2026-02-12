import { db } from './db';
import {
  serviceRequests,
  businessEntities,
  users,
  notificationRules,
  notificationOutbox,
  notificationTemplates
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import cron from 'node-cron';
import { EventEmitter } from 'events';
import { sendWhatsApp, verifyWhatsAppConfig } from './services/whatsappService';
import nodemailer from 'nodemailer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// SMS provider configuration (Twilio)
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
const twilioClient = twilioAccountSid.startsWith('AC') && twilioAuthToken
  ? new (require('twilio'))(twilioAccountSid, twilioAuthToken)
  : null;

// Enterprise Notification Engine for Universal Service Provider Platform
export class NotificationEngine {
  private eventBus: EventEmitter;
  private scheduledJobs: Map<string, any> = new Map();

  constructor() {
    this.eventBus = new EventEmitter();
    this.initializeEngine();
  }

  private async initializeEngine() {
    console.log('🔔 Initializing Enterprise Notification Engine...');
    
    // Load and register all active notification rules
    await this.loadNotificationRules();
    
    // Start the outbox processor
    await this.startOutboxProcessor();
    
    // Register event handlers
    this.registerEventHandlers();
    
    console.log('✅ Notification Engine initialized successfully');
  }

  private async loadNotificationRules() {
    try {
      const rules = await db
        .select()
        .from(notificationRules)
        .where(eq(notificationRules.isEnabled, true));

      const resolvedRules = rules.length > 0
        ? rules
        : (process.env.NODE_ENV !== 'production' ? this.getSampleNotificationRules() : []);

      for (const rule of resolvedRules) {
        if (rule.type === 'SCHEDULE' && !rule.scheduleJson) {
          console.warn(`⚠️  Notification rule ${rule.ruleKey} is missing scheduleJson, skipping.`);
          continue;
        }
        if (rule.type === 'SCHEDULE') {
          await this.registerScheduledRule(rule);
        } else if (rule.type === 'EVENT') {
          this.registerEventRule(rule);
        }
      }

      if (rules.length === 0) {
        if (resolvedRules.length > 0) {
          console.log(`📋 Loaded ${resolvedRules.length} sample notification rules (no DB rules found)`);
        } else {
          console.log('📋 No notification rules configured');
        }
      } else {
        console.log(`📋 Loaded ${resolvedRules.length} notification rules from database`);
      }
    } catch (error) {
      console.error('❌ Error loading notification rules:', error);
    }
  }

  private getSampleNotificationRules() {
    return [
      {
        ruleKey: 'gst_monthly_reminder',
        type: 'SCHEDULE',
        name: 'GST Monthly Reminder',
        scopeJson: JSON.stringify({ serviceType: 'gst_returns' }),
        scheduleJson: JSON.stringify({ cron: '0 9 1,2 * *', timezone: 'Asia/Kolkata' }),
        filtersJson: JSON.stringify([
          { field: 'status', op: 'IN', value: ['Created', 'In Progress', 'Waiting on Client'] }
        ]),
        channelsJson: JSON.stringify(['EMAIL', 'CONSOLE']),
        templateKey: 'GST_REMINDER_GENERIC',
        dedupeWindowMins: 120,
        isEnabled: true
      }
    ];
  }

  private async registerScheduledRule(rule: any) {
    try {
      const { jobManager } = await import('./job-lifecycle-manager.js');
      const scheduleConfig = JSON.parse(rule.scheduleJson);
      const { cron: cronExpr, timezone = 'Asia/Kolkata' } = scheduleConfig;

      const job = cron.schedule(cronExpr, async () => {
        await this.executeScheduledRule(rule);
      }, {
        scheduled: false, // Don't start automatically
        timezone
      });

      jobManager.registerCron(
        `notification-rule-${rule.ruleKey}`,
        job,
        `Notification rule: ${rule.name || rule.ruleKey} - ${cronExpr}`
      );

      job.start();
      this.scheduledJobs.set(rule.ruleKey, job);
      console.log(`⏰ Scheduled rule: ${rule.ruleKey} with cron: ${cronExpr} - managed by JobLifecycleManager`);
    } catch (error) {
      console.error(`❌ Error registering scheduled rule ${rule.ruleKey}:`, error);
    }
  }

  private registerEventRule(rule: any) {
    try {
      const logicConfig = rule.logicJson ? JSON.parse(rule.logicJson) : {};
      
      // Register for service status changes
      this.eventBus.on('service_status_changed', async (payload) => {
        await this.processEventRule(rule, payload);
      });

      // Register for document events
      this.eventBus.on('document_rejected', async (payload) => {
        await this.processEventRule(rule, payload);
      });

      console.log(`🎯 Registered event rule: ${rule.ruleKey}`);
    } catch (error) {
      console.error(`❌ Error registering event rule ${rule.ruleKey}:`, error);
    }
  }

  private async executeScheduledRule(rule: any) {
    try {
      const scope = JSON.parse(rule.scopeJson);
      const filters = rule.filtersJson ? JSON.parse(rule.filtersJson) : [];
      const logic = rule.logicJson ? JSON.parse(rule.logicJson) : {};

      // Get eligible service requests
      let query = db
        .select({
          serviceRequest: serviceRequests,
          entity: businessEntities,
          contact: users
        })
        .from(serviceRequests)
        .leftJoin(businessEntities, eq(serviceRequests.entityId, businessEntities.id))
        .leftJoin(users, eq(businessEntities.primaryContactId, users.id));

      // Apply scope filters
      if (scope.serviceType) {
        query = query.where(eq(serviceRequests.serviceId, scope.serviceType));
      }

      const results = await query;

      for (const result of results) {
        const { serviceRequest, entity, contact } = result;

        // Apply additional filters
        if (!this.evaluateFilters(serviceRequest, filters)) {
          continue;
        }

        // Check for smart due date logic (T-7, T-3, T-1)
        if (logic.relativeDueDays) {
          const dueDate = new Date(serviceRequest.slaDeadline || serviceRequest.expectedCompletion || '');
          const today = new Date();
          const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (!logic.relativeDueDays.includes(daysDiff)) {
            continue;
          }
        }

        // Queue notifications
        await this.queueNotification(rule, serviceRequest, entity, contact);
      }
    } catch (error) {
      console.error(`❌ Error executing scheduled rule ${rule.ruleKey}:`, error);
    }
  }

  private async processEventRule(rule: any, eventPayload: any) {
    try {
      const logic = rule.logicJson ? JSON.parse(rule.logicJson) : {};
      
      // Handle service status transitions
      if (logic.transitions && eventPayload.type === 'status_change') {
        const transition = logic.transitions.find((t: any) => 
          t.from.includes(eventPayload.fromStatus) && t.to === eventPayload.toStatus
        );

        if (transition) {
          // Get service request details
          const serviceRequest = await db
            .select()
            .from(serviceRequests)
            .where(eq(serviceRequests.id, eventPayload.serviceRequestId))
            .limit(1);

          if (serviceRequest.length > 0) {
            const entity = await db
              .select()
              .from(businessEntities)
              .where(eq(businessEntities.id, serviceRequest[0].entityId))
              .limit(1);

            const contact = entity.length > 0 ? await db
              .select()
              .from(users)
              .where(eq(users.id, entity[0].primaryContactId || 0))
              .limit(1) : [];

            await this.queueNotification(
              rule, 
              serviceRequest[0], 
              entity[0], 
              contact[0],
              transition.action.template || rule.templateKey
            );
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing event rule ${rule.ruleKey}:`, error);
    }
  }

  private evaluateFilters(serviceRequest: any, filters: any[]): boolean {
    return filters.every(filter => {
      switch (filter.op) {
        case 'EQ':
          return serviceRequest[filter.field.replace('serviceOrder.', '')] === filter.value;
        case 'NE':
          return serviceRequest[filter.field.replace('serviceOrder.', '')] !== filter.value;
        case 'IN':
          return filter.value.includes(serviceRequest[filter.field.replace('serviceOrder.', '')]);
        case 'NOT_IN':
          return !filter.value.includes(serviceRequest[filter.field.replace('serviceOrder.', '')]);
        default:
          return true;
      }
    });
  }

  private async queueNotification(
    rule: any, 
    serviceRequest: any, 
    entity: any, 
    contact: any, 
    templateKey?: string
  ) {
    try {
      const channels = JSON.parse(rule.channelsJson);
      const template = templateKey || rule.templateKey;

      // Prepare template variables
      const portalBase = process.env.FRONTEND_URL || '';
      const templateVars = {
        entityName: entity?.name || 'Your Business',
        clientFirstName: contact?.firstName || 'Client',
        serviceName: serviceRequest.serviceId || serviceRequest.serviceType,
        periodLabel: serviceRequest.periodLabel || 'Current Period',
        dueDate: serviceRequest.slaDeadline
          ? new Date(serviceRequest.slaDeadline).toLocaleDateString('en-IN')
          : serviceRequest.expectedCompletion
            ? new Date(serviceRequest.expectedCompletion).toLocaleDateString('en-IN')
            : 'TBD',
        nextClientAction: 'Please check your portal for next steps',
        portalDeepLink: `${portalBase}/service-request/${serviceRequest.id}`,
        pendingItem: 'Document review and approval',
        reason: 'Please review and resubmit'
      };

      // Create dedupe fingerprint
      const dedupeFingerprint = `${rule.ruleKey}|${serviceRequest.id}|${template}|${Date.now()}`;

      for (const channel of channels) {
        // Check for existing notification in dedupe window
        const existingNotification = await db
          .select()
          .from(notificationOutbox)
          .where(
            and(
              eq(notificationOutbox.ruleKey, rule.ruleKey),
              eq(notificationOutbox.serviceRequestId, serviceRequest.id),
              eq(notificationOutbox.channel, channel),
              sql`${notificationOutbox.createdAt} > NOW() - INTERVAL '${rule.dedupeWindowMins || 120} minutes'`
            )
          )
          .limit(1);

        if (existingNotification.length > 0) {
          console.log(`⏭️ Skipping duplicate notification for ${rule.ruleKey}|${serviceRequest.id}|${channel}`);
          continue;
        }

        // Queue the notification
        await db.insert(notificationOutbox).values({
          ruleKey: rule.ruleKey,
          serviceRequestId: serviceRequest.id,
          entityId: serviceRequest.entityId,
          recipientEmail: contact?.email || null,
          recipientPhone: contact?.phone || null,
          channel,
          templateKey: template,
          payloadJson: JSON.stringify(templateVars),
          dedupeFingerprint,
          scheduledAt: new Date().toISOString(),
          status: 'QUEUED'
        });

        console.log(`📤 Queued ${channel} notification for ${rule.ruleKey}|${serviceRequest.id}`);
      }
    } catch (error) {
      console.error('❌ Error queueing notification:', error);
    }
  }

  private async startOutboxProcessor() {
    const { jobManager } = await import('./job-lifecycle-manager.js');

    // Process outbox every 30 seconds
    jobManager.registerInterval(
      'notification-outbox-processor',
      async () => {
        await this.processOutbox();
      },
      30000, // 30 seconds
      'Notification outbox processor - sends queued notifications via email/SMS/WhatsApp'
    );

    console.log('📦 Outbox processor started (30-second intervals) - managed by JobLifecycleManager');
  }

  private async processOutbox() {
    try {
      const queuedNotifications = await db
        .select()
        .from(notificationOutbox)
        .where(eq(notificationOutbox.status, 'QUEUED'))
        .limit(50);

      for (const notification of queuedNotifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('❌ Error processing outbox:', error);
    }
  }

  private async sendNotification(notification: any) {
    try {
      // Get template
      const template = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.templateKey, notification.templateKey))
        .limit(1);

      if (template.length === 0) {
        console.error(`❌ Template not found: ${notification.templateKey}`);
        return;
      }

      const templateData = template[0];
      const payload = JSON.parse(notification.payloadJson);

      // Render template
      const subject = this.renderTemplate(templateData.subject || '', payload);
      const body = this.renderTemplate(templateData.body, payload);

      let result;
      switch (notification.channel) {
        case 'EMAIL':
          result = await this.sendEmail(notification.recipientEmail, subject, body);
          break;
        case 'WHATSAPP':
          result = await this.sendWhatsApp(notification.recipientPhone, body);
          break;
        case 'SMS':
          result = await this.sendSMS(notification.recipientPhone, body);
          break;
        default:
          console.log(`📱 [${notification.channel}] → ${notification.recipientEmail || notification.recipientPhone} | ${body.slice(0, 100)}...`);
          result = { success: true, providerId: 'demo' };
      }

      // Update notification status
      await db
        .update(notificationOutbox)
        .set({
          status: result.success ? 'SENT' : 'FAILED',
          error: result.error || null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(notificationOutbox.id, notification.id));

    } catch (error) {
      console.error(`❌ Error sending notification ${notification.id}:`, error);
      
      await db
        .update(notificationOutbox)
        .set({
          status: 'FAILED',
          error: error.message,
          updatedAt: new Date().toISOString()
        })
        .where(eq(notificationOutbox.id, notification.id));
    }
  }

  private renderTemplate(template: string, variables: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  private async sendEmail(to: string, subject: string, body: string) {
    try {
      // Check if email is enabled
      if (process.env.NOTIFICATION_EMAIL_ENABLED !== 'true') {
        console.log(`📧 [EMAIL-DISABLED] → ${to} | ${subject}`);
        return { success: true, providerId: 'disabled', message: 'Email notifications disabled' };
      }

      // Send real email via nodemailer
      const info = await emailTransporter.sendMail({
        from: process.env.SMTP_FROM || '"DigiComply" <noreply@digicomply.in>',
        to,
        subject,
        html: body.replace(/\n/g, '<br>')
      });

      console.log(`📧 [EMAIL-SENT] → ${to} | ${subject} | MessageId: ${info.messageId}`);
      return { success: true, providerId: info.messageId };
    } catch (error: any) {
      console.error(`📧 [EMAIL-ERROR] → ${to} | ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async sendWhatsApp(to: string, body: string) {
    try {
      // Check if WhatsApp is enabled
      if (process.env.NOTIFICATION_WHATSAPP_ENABLED !== 'true') {
        console.log(`📱 [WHATSAPP-DISABLED] → ${to}`);
        return { success: true, providerId: 'disabled', message: 'WhatsApp notifications disabled' };
      }

      // Use the WhatsApp service
      const success = await sendWhatsApp({
        to: to.startsWith('+') ? to : `+91${to}`,
        message: body
      });

      if (success) {
        console.log(`📱 [WHATSAPP-SENT] → ${to}`);
        return { success: true, providerId: `wa-${Date.now()}` };
      } else {
        return { success: false, error: 'WhatsApp send failed' };
      }
    } catch (error: any) {
      console.error(`📱 [WHATSAPP-ERROR] → ${to} | ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async sendSMS(to: string, body: string) {
    try {
      // Check if SMS is enabled
      if (process.env.NOTIFICATION_SMS_ENABLED !== 'true') {
        console.log(`💬 [SMS-DISABLED] → ${to}`);
        return { success: true, providerId: 'disabled', message: 'SMS notifications disabled' };
      }

      // Send real SMS via Twilio
      if (!twilioClient) {
        console.log(`💬 [SMS-NO-PROVIDER] → ${to}`);
        return { success: false, error: 'SMS provider not configured' };
      }

      const message = await twilioClient.messages.create({
        body: body.slice(0, 160), // SMS character limit
        from: process.env.TWILIO_SMS_NUMBER,
        to: to.startsWith('+') ? to : `+91${to}`
      });

      console.log(`💬 [SMS-SENT] → ${to} | SID: ${message.sid}`);
      return { success: true, providerId: message.sid };
    } catch (error: any) {
      console.error(`💬 [SMS-ERROR] → ${to} | ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Public methods for triggering events
  public emitServiceStatusChanged(serviceRequestId: number, fromStatus: string, toStatus: string) {
    this.eventBus.emit('service_status_changed', {
      type: 'status_change',
      serviceRequestId,
      fromStatus,
      toStatus,
      timestamp: new Date().toISOString()
    });
  }

  public emitDocumentRejected(serviceRequestId: number, documentType: string, reason: string) {
    this.eventBus.emit('document_rejected', {
      type: 'document_rejected',
      serviceRequestId,
      documentType,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  // Admin methods for rule management
  public async reloadRules() {
    const { jobManager } = await import('./job-lifecycle-manager.js');

    // Stop existing scheduled jobs using JobLifecycleManager
    for (const [ruleKey, job] of this.scheduledJobs) {
      jobManager.stopJob(`notification-rule-${ruleKey}`);
    }
    this.scheduledJobs.clear();

    // Reload all rules
    await this.loadNotificationRules();
  }

  public async createRule(ruleData: any) {
    try {
      const [rule] = await db.insert(notificationRules).values(ruleData).returning();
      
      if (rule.type === 'SCHEDULE') {
        this.registerScheduledRule(rule);
      } else if (rule.type === 'EVENT') {
        this.registerEventRule(rule);
      }

      return rule;
    } catch (error) {
      console.error('❌ Error creating notification rule:', error);
      throw error;
    }
  }

  public async updateRule(ruleId: number, updates: any) {
    try {
      const [updatedRule] = await db
        .update(notificationRules)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(notificationRules.id, ruleId))
        .returning();

      // Reload rules to apply changes
      await this.reloadRules();

      return updatedRule;
    } catch (error) {
      console.error('❌ Error updating notification rule:', error);
      throw error;
    }
  }

  private registerEventHandlers() {
    // Listen for domain events
    this.eventBus.on('service_created', async (payload) => {
      console.log('🆕 Service created:', payload);
    });

    this.eventBus.on('payment_received', async (payload) => {
      console.log('💰 Payment received:', payload);
    });

    this.eventBus.on('sla_breach', async (payload) => {
      console.log('⚠️ SLA breach detected:', payload);
    });
  }
}

// Global notification engine instance
export const notificationEngine = new NotificationEngine();
