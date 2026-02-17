# Platform Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete all 30+ incomplete features across 14 user roles to achieve production readiness.

**Architecture:** Three-phase hybrid approach - build shared infrastructure first (notifications, payments, storage), then implement user-specific workflows in parallel, finally add analytics and enhancements.

**Tech Stack:** Node.js/Express, PostgreSQL/Drizzle ORM, React/TanStack Query, BullMQ, SendGrid, Twilio, Razorpay, Firebase FCM, PDFKit

---

## Phase 1: Foundation

---

### Task 1: Payment Webhook Handler - Schema

**Files:**
- Create: `server/db/schema/webhook-events.ts`
- Modify: `server/db/schema/index.ts`

**Step 1: Write the schema for webhook idempotency**

```typescript
// server/db/schema/webhook-events.ts
import { pgTable, serial, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const webhookEvents = pgTable('webhook_events', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull(),
  eventId: varchar('event_id', { length: 255 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  processedAt: timestamp('processed_at'),
  errorMessage: varchar('error_message', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  providerEventIdx: index('webhook_provider_event_idx').on(table.provider, table.eventId),
  statusIdx: index('webhook_status_idx').on(table.status),
}));

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
```

**Step 2: Export from schema index**

Add to `server/db/schema/index.ts`:
```typescript
export * from './webhook-events';
```

**Step 3: Generate migration**

Run: `npm run db:generate`
Expected: Migration file created in `drizzle/` folder

**Step 4: Apply migration**

Run: `npm run db:migrate`
Expected: Table created successfully

**Step 5: Commit**

```bash
git add server/db/schema/webhook-events.ts server/db/schema/index.ts drizzle/
git commit -m "feat(db): add webhook_events table for idempotency"
```

---

### Task 2: Payment Webhook Handler - Route

**Files:**
- Create: `server/routes/webhooks/razorpay.ts`
- Modify: `server/routes/index.ts`

**Step 1: Create Razorpay webhook handler**

```typescript
// server/routes/webhooks/razorpay.ts
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { webhookEvents } from '../db/schema/webhook-events';
import { payments } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../logger';
import { notificationHub } from '../services/notifications';

const router = Router();

// Razorpay webhook secret from environment
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

/**
 * Verify Razorpay webhook signature
 */
function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    logger.warn('RAZORPAY_WEBHOOK_SECRET not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Check if event was already processed (idempotency)
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, eventId),
  });
  return existing?.status === 'processed';
}

/**
 * Record webhook event
 */
async function recordEvent(
  provider: string,
  eventId: string,
  eventType: string,
  payload: any,
  status: 'pending' | 'processed' | 'failed',
  errorMessage?: string
) {
  await db.insert(webhookEvents).values({
    provider,
    eventId,
    eventType,
    payload,
    status,
    processedAt: status !== 'pending' ? new Date() : null,
    errorMessage,
  }).onConflictDoUpdate({
    target: webhookEvents.eventId,
    set: {
      status,
      processedAt: new Date(),
      errorMessage,
    },
  });
}

/**
 * Handle payment.captured event
 */
async function handlePaymentCaptured(payload: any) {
  const { id: razorpayPaymentId, order_id, amount, email, contact } = payload.payment.entity;

  // Update payment record
  await db.update(payments)
    .set({
      status: 'completed',
      razorpayPaymentId,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(payments.razorpayOrderId, order_id));

  // Get payment details for notification
  const payment = await db.query.payments.findFirst({
    where: eq(payments.razorpayOrderId, order_id),
  });

  if (payment?.userId) {
    // Send receipt notification
    await notificationHub.send({
      userId: payment.userId,
      type: 'payment_success',
      channels: ['email', 'in_app'],
      subject: 'Payment Received',
      content: `Your payment of ₹${(amount / 100).toFixed(2)} has been received successfully.`,
      data: {
        paymentId: payment.id,
        amount: amount / 100,
        orderId: order_id,
      },
      referenceType: 'payment',
      referenceId: payment.id,
    });
  }

  logger.info(`Payment captured: ${razorpayPaymentId} for order ${order_id}`);
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payload: any) {
  const { id: razorpayPaymentId, order_id, error_code, error_description } = payload.payment.entity;

  await db.update(payments)
    .set({
      status: 'failed',
      razorpayPaymentId,
      failureReason: `${error_code}: ${error_description}`,
      updatedAt: new Date(),
    })
    .where(eq(payments.razorpayOrderId, order_id));

  const payment = await db.query.payments.findFirst({
    where: eq(payments.razorpayOrderId, order_id),
  });

  if (payment?.userId) {
    await notificationHub.send({
      userId: payment.userId,
      type: 'payment_failed',
      channels: ['email', 'in_app', 'sms'],
      subject: 'Payment Failed',
      content: `Your payment could not be processed. Please try again.`,
      data: {
        paymentId: payment.id,
        errorCode: error_code,
        errorDescription: error_description,
      },
      referenceType: 'payment',
      referenceId: payment.id,
    });
  }

  logger.warn(`Payment failed: ${razorpayPaymentId} - ${error_description}`);
}

/**
 * Handle refund.processed event
 */
async function handleRefundProcessed(payload: any) {
  const { payment_id, amount, id: refundId } = payload.refund.entity;

  // Find original payment
  const payment = await db.query.payments.findFirst({
    where: eq(payments.razorpayPaymentId, payment_id),
  });

  if (payment) {
    await db.update(payments)
      .set({
        status: 'refunded',
        refundedAmount: amount / 100,
        refundedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    if (payment.userId) {
      await notificationHub.send({
        userId: payment.userId,
        type: 'refund_processed',
        channels: ['email', 'in_app'],
        subject: 'Refund Processed',
        content: `Your refund of ₹${(amount / 100).toFixed(2)} has been processed.`,
        data: {
          paymentId: payment.id,
          refundId,
          amount: amount / 100,
        },
        referenceType: 'payment',
        referenceId: payment.id,
      });
    }
  }

  logger.info(`Refund processed: ${refundId} for payment ${payment_id}`);
}

/**
 * Main webhook endpoint
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    // Verify signature
    if (!verifySignature(rawBody, signature)) {
      logger.warn('Invalid Razorpay webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body;
    const eventId = payload?.payment?.entity?.id || payload?.refund?.entity?.id || `${event}_${Date.now()}`;

    // Check idempotency
    if (await isEventProcessed(eventId)) {
      logger.debug(`Webhook event ${eventId} already processed`);
      return res.status(200).json({ status: 'already_processed' });
    }

    // Record event as pending
    await recordEvent('razorpay', eventId, event, req.body, 'pending');

    // Process event
    try {
      switch (event) {
        case 'payment.captured':
          await handlePaymentCaptured(payload);
          break;
        case 'payment.failed':
          await handlePaymentFailed(payload);
          break;
        case 'refund.processed':
          await handleRefundProcessed(payload);
          break;
        default:
          logger.debug(`Unhandled Razorpay event: ${event}`);
      }

      // Mark as processed
      await recordEvent('razorpay', eventId, event, req.body, 'processed');

    } catch (processingError: any) {
      await recordEvent('razorpay', eventId, event, req.body, 'failed', processingError.message);
      throw processingError;
    }

    res.status(200).json({ status: 'ok' });

  } catch (error: any) {
    logger.error('Razorpay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
```

**Step 2: Register webhook route**

Add to `server/routes/index.ts` after line 20:
```typescript
import razorpayWebhookRoutes from './webhooks/razorpay';
```

Add to `registerApiRoutes` function:
```typescript
// Webhook routes (no auth required, signature verified)
app.use('/webhooks/razorpay', razorpayWebhookRoutes);
```

**Step 3: Test locally**

Run: `npm run dev`
Expected: Server starts without errors

**Step 4: Commit**

```bash
git add server/routes/webhooks/razorpay.ts server/routes/index.ts
git commit -m "feat(payments): add Razorpay webhook handler with idempotency"
```

---

### Task 3: Notification Delivery Tracking - Schema

**Files:**
- Create: `server/db/schema/notification-delivery-log.ts`
- Modify: `server/db/schema/index.ts`

**Step 1: Create delivery log schema**

```typescript
// server/db/schema/notification-delivery-log.ts
import { pgTable, serial, integer, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { notifications } from './notifications';

export const notificationDeliveryLog = pgTable('notification_delivery_log', {
  id: serial('id').primaryKey(),
  notificationId: integer('notification_id').references(() => notifications.id),
  channel: varchar('channel', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  deliveredAt: timestamp('delivered_at'),
  errorMessage: varchar('error_message', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  notificationIdx: index('delivery_notification_idx').on(table.notificationId),
  statusIdx: index('delivery_status_idx').on(table.status),
  channelStatusIdx: index('delivery_channel_status_idx').on(table.channel, table.status),
}));

export type NotificationDeliveryLog = typeof notificationDeliveryLog.$inferSelect;
export type NewNotificationDeliveryLog = typeof notificationDeliveryLog.$inferInsert;
```

**Step 2: Export from schema index**

Add to `server/db/schema/index.ts`:
```typescript
export * from './notification-delivery-log';
```

**Step 3: Generate and apply migration**

Run: `npm run db:generate && npm run db:migrate`
Expected: Migration applied successfully

**Step 4: Commit**

```bash
git add server/db/schema/notification-delivery-log.ts server/db/schema/index.ts drizzle/
git commit -m "feat(db): add notification_delivery_log table"
```

---

### Task 4: Email Channel - Production Configuration

**Files:**
- Modify: `server/services/notifications/channels/email.service.ts`

**Step 1: Enhance email service with delivery tracking**

```typescript
// server/services/notifications/channels/email.service.ts
import nodemailer from 'nodemailer';
import { db } from '../../db';
import { notificationDeliveryLog } from '../../db/schema/notification-delivery-log';
import { logger } from '../../logger';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  notificationId?: number;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const provider = process.env.EMAIL_PROVIDER || 'smtp';

    if (provider === 'sendgrid') {
      this.initializeSendGrid();
    } else {
      this.initializeSMTP();
    }
  }

  private initializeSendGrid() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      logger.warn('SENDGRID_API_KEY not configured, email disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: apiKey,
      },
    });

    this.isConfigured = true;
    logger.info('Email service initialized with SendGrid');
  }

  private initializeSMTP() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      logger.warn('SMTP not fully configured, email disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    this.isConfigured = true;
    logger.info(`Email service initialized with SMTP (${host})`);
  }

  async send(payload: EmailPayload): Promise<SendResult> {
    const deliveryLogId = payload.notificationId ? await this.createDeliveryLog(payload.notificationId, 'email') : null;

    if (!this.isConfigured || !this.transporter) {
      logger.warn('Email not configured, skipping send');
      if (deliveryLogId) {
        await this.updateDeliveryLog(deliveryLogId, 'failed', undefined, 'Email service not configured');
      }
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const fromAddress = payload.from || process.env.EMAIL_FROM || 'noreply@digicomply.in';

      const result = await this.transporter.sendMail({
        from: fromAddress,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || this.stripHtml(payload.html),
        replyTo: payload.replyTo,
      });

      if (deliveryLogId) {
        await this.updateDeliveryLog(deliveryLogId, 'delivered', result.messageId);
      }

      logger.info(`Email sent to ${payload.to}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };

    } catch (error: any) {
      logger.error(`Email send failed to ${payload.to}:`, error.message);

      if (deliveryLogId) {
        await this.updateDeliveryLog(deliveryLogId, 'failed', undefined, error.message);
      }

      return { success: false, error: error.message };
    }
  }

  private async createDeliveryLog(notificationId: number, channel: string): Promise<number> {
    const [log] = await db.insert(notificationDeliveryLog).values({
      notificationId,
      channel,
      status: 'pending',
      attempts: 1,
      lastAttemptAt: new Date(),
    }).returning();
    return log.id;
  }

  private async updateDeliveryLog(
    logId: number,
    status: 'delivered' | 'failed',
    messageId?: string,
    errorMessage?: string
  ) {
    await db.update(notificationDeliveryLog)
      .set({
        status,
        providerMessageId: messageId,
        deliveredAt: status === 'delivered' ? new Date() : undefined,
        errorMessage,
      })
      .where(eq(notificationDeliveryLog.id, logId));
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Email templates
  getTemplate(templateId: string, data: Record<string, any>): { subject: string; html: string } {
    const templates: Record<string, (data: any) => { subject: string; html: string }> = {
      otp: (d) => ({
        subject: `Your OTP: ${d.otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">DigiComply Verification</h2>
            <p>Your one-time password is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${d.otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
          </div>
        `,
      }),

      welcome: (d) => ({
        subject: `Welcome to DigiComply, ${d.name}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to DigiComply!</h2>
            <p>Hi ${d.name},</p>
            <p>Your account has been created successfully. Here are your login credentials:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
              <p><strong>Email:</strong> ${d.email}</p>
              <p><strong>Temporary Password:</strong> ${d.tempPassword}</p>
            </div>
            <p style="color: #dc2626;">Please change your password after first login.</p>
            <a href="${d.loginUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Login Now</a>
          </div>
        `,
      }),

      payment_success: (d) => ({
        subject: `Payment Received - ₹${d.amount}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Payment Successful!</h2>
            <p>Your payment of <strong>₹${d.amount}</strong> has been received.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
              <p><strong>Payment ID:</strong> ${d.paymentId}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
            </div>
            <p>Thank you for your payment!</p>
          </div>
        `,
      }),

      proposal: (d) => ({
        subject: `Proposal: ${d.proposalTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Proposal for You</h2>
            <p>Hi ${d.clientName},</p>
            <p>Please find attached our proposal for <strong>${d.proposalTitle}</strong>.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
              <p><strong>Total Amount:</strong> ₹${d.amount}</p>
              <p><strong>Valid Until:</strong> ${d.validUntil}</p>
            </div>
            <a href="${d.viewUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Proposal</a>
          </div>
        `,
      }),

      compliance_reminder: (d) => ({
        subject: `Compliance Reminder: ${d.complianceType} due in ${d.daysRemaining} days`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Compliance Deadline Approaching</h2>
            <p>Your <strong>${d.complianceType}</strong> is due in <strong>${d.daysRemaining} days</strong>.</p>
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p><strong>Due Date:</strong> ${d.dueDate}</p>
              <p><strong>Status:</strong> ${d.status}</p>
            </div>
            <a href="${d.dashboardUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Dashboard</a>
          </div>
        `,
      }),
    };

    const templateFn = templates[templateId] || templates.default;
    if (!templateFn) {
      return {
        subject: data.subject || 'DigiComply Notification',
        html: `<p>${data.content || ''}</p>`,
      };
    }

    return templateFn(data);
  }
}

import { eq } from 'drizzle-orm';

export const emailService = new EmailService();
```

**Step 2: Test email configuration**

Run: `npm run dev`
Expected: Log shows "Email service initialized with SendGrid" or "SMTP"

**Step 3: Commit**

```bash
git add server/services/notifications/channels/email.service.ts
git commit -m "feat(notifications): enhance email service with delivery tracking"
```

---

### Task 5: SMS Channel - Production Configuration

**Files:**
- Modify: `server/services/notifications/channels/sms.service.ts`

**Step 1: Enhance SMS service with Twilio production config**

```typescript
// server/services/notifications/channels/sms.service.ts
import twilio from 'twilio';
import { db } from '../../db';
import { notificationDeliveryLog } from '../../db/schema/notification-delivery-log';
import { eq } from 'drizzle-orm';
import { logger } from '../../logger';

interface SMSPayload {
  to: string;
  message: string;
  notificationId?: number;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSService {
  private client: twilio.Twilio | null = null;
  private fromNumber: string = '';
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      logger.warn('Twilio not fully configured, SMS disabled');
      return;
    }

    try {
      this.client = twilio(accountSid, authToken);
      this.fromNumber = fromNumber;
      this.isConfigured = true;
      logger.info('SMS service initialized with Twilio');
    } catch (error: any) {
      logger.error('Twilio initialization failed:', error.message);
    }
  }

  async send(payload: SMSPayload): Promise<SendResult> {
    const deliveryLogId = payload.notificationId
      ? await this.createDeliveryLog(payload.notificationId, 'sms')
      : null;

    // Format phone number
    const formattedNumber = this.formatPhoneNumber(payload.to);
    if (!formattedNumber) {
      const error = 'Invalid phone number format';
      if (deliveryLogId) {
        await this.updateDeliveryLog(deliveryLogId, 'failed', undefined, error);
      }
      return { success: false, error };
    }

    if (!this.isConfigured || !this.client) {
      logger.warn('SMS not configured, skipping send');
      if (deliveryLogId) {
        await this.updateDeliveryLog(deliveryLogId, 'failed', undefined, 'SMS service not configured');
      }
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const result = await this.client.messages.create({
        body: payload.message,
        from: this.fromNumber,
        to: formattedNumber,
      });

      if (deliveryLogId) {
        await this.updateDeliveryLog(deliveryLogId, 'delivered', result.sid);
      }

      logger.info(`SMS sent to ${formattedNumber}: ${result.sid}`);
      return { success: true, messageId: result.sid };

    } catch (error: any) {
      logger.error(`SMS send failed to ${formattedNumber}:`, error.message);

      if (deliveryLogId) {
        await this.updateDeliveryLog(deliveryLogId, 'failed', undefined, error.message);
      }

      return { success: false, error: error.message };
    }
  }

  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Indian number: should be 10 digits or 12 (with 91)
    if (digits.length === 10) {
      return `+91${digits}`;
    } else if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      return `+91${digits.slice(1)}`;
    }

    // Already formatted with +
    if (phone.startsWith('+') && digits.length >= 10) {
      return phone;
    }

    return null;
  }

  private async createDeliveryLog(notificationId: number, channel: string): Promise<number> {
    const [log] = await db.insert(notificationDeliveryLog).values({
      notificationId,
      channel,
      status: 'pending',
      attempts: 1,
      lastAttemptAt: new Date(),
    }).returning();
    return log.id;
  }

  private async updateDeliveryLog(
    logId: number,
    status: 'delivered' | 'failed',
    messageId?: string,
    errorMessage?: string
  ) {
    await db.update(notificationDeliveryLog)
      .set({
        status,
        providerMessageId: messageId,
        deliveredAt: status === 'delivered' ? new Date() : undefined,
        errorMessage,
      })
      .where(eq(notificationDeliveryLog.id, logId));
  }

  // SMS templates (short format)
  getTemplate(templateId: string, data: Record<string, any>): string {
    const templates: Record<string, (data: any) => string> = {
      otp: (d) => `Your DigiComply OTP is ${d.otp}. Valid for 10 minutes. Do not share.`,
      payment_success: (d) => `Payment of Rs.${d.amount} received. ID: ${d.paymentId}. Thank you! - DigiComply`,
      payment_failed: (d) => `Payment failed. Please retry or contact support. - DigiComply`,
      compliance_reminder: (d) => `Reminder: ${d.complianceType} due on ${d.dueDate}. Login to complete. - DigiComply`,
      service_update: (d) => `Your ${d.serviceName} status: ${d.status}. Track at ${d.trackingUrl} - DigiComply`,
    };

    const templateFn = templates[templateId];
    if (!templateFn) {
      return data.message || data.content || 'DigiComply Notification';
    }

    return templateFn(data);
  }
}

export const smsService = new SMSService();
```

**Step 2: Commit**

```bash
git add server/services/notifications/channels/sms.service.ts
git commit -m "feat(notifications): enhance SMS service with Twilio and delivery tracking"
```

---

### Task 6: OTP Service - Complete Implementation

**Files:**
- Modify: `server/services/notifications/otp.service.ts`
- Modify: `server/routes/client-registration-routes.ts`

**Step 1: Enhance OTP service**

```typescript
// server/services/notifications/otp.service.ts
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { db } from '../../db';
import { otpCodes } from '../../db/schema/notifications';
import { eq, and, gt, desc } from 'drizzle-orm';
import { emailService } from './channels/email.service';
import { smsService } from './channels/sms.service';
import { logger } from '../../logger';

interface OTPResult {
  success: boolean;
  message: string;
  expiresAt?: Date;
}

interface VerifyResult {
  success: boolean;
  message: string;
}

// Rate limit configuration
const RATE_LIMITS = {
  maxAttemptsPerCode: 3,
  maxCodesPerHour: 5,
  codeExpiryMinutes: 10,
  attemptWindowMinutes: 10,
};

class OTPService {
  /**
   * Generate a cryptographically secure 6-digit OTP
   */
  private generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Hash OTP before storage
   */
  private async hashOTP(otp: string): Promise<string> {
    return bcrypt.hash(otp, 10);
  }

  /**
   * Verify OTP against hash
   */
  private async verifyHash(otp: string, hash: string): Promise<boolean> {
    return bcrypt.compare(otp, hash);
  }

  /**
   * Check rate limits
   */
  async checkRateLimit(identifier: string, purpose: string): Promise<{ allowed: boolean; message: string }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Count OTPs sent in the last hour
    const recentOTPs = await db.query.otpCodes.findMany({
      where: and(
        eq(otpCodes.identifier, identifier),
        eq(otpCodes.purpose, purpose),
        gt(otpCodes.createdAt, oneHourAgo)
      ),
    });

    if (recentOTPs.length >= RATE_LIMITS.maxCodesPerHour) {
      return {
        allowed: false,
        message: `Too many OTP requests. Please try again after ${60 - Math.floor((Date.now() - recentOTPs[0].createdAt.getTime()) / 60000)} minutes.`,
      };
    }

    return { allowed: true, message: 'OK' };
  }

  /**
   * Generate and send OTP
   */
  async generateAndSend(
    identifier: string,
    purpose: 'login' | 'registration' | 'password_reset' | 'verification',
    channel: 'sms' | 'email' | 'both' = 'both'
  ): Promise<OTPResult> {
    // Check rate limit
    const rateCheck = await this.checkRateLimit(identifier, purpose);
    if (!rateCheck.allowed) {
      return { success: false, message: rateCheck.message };
    }

    // Invalidate any existing OTPs
    await db.update(otpCodes)
      .set({ isUsed: true })
      .where(and(
        eq(otpCodes.identifier, identifier),
        eq(otpCodes.purpose, purpose),
        eq(otpCodes.isUsed, false)
      ));

    // Generate new OTP
    const otp = this.generateOTP();
    const hashedOTP = await this.hashOTP(otp);
    const expiresAt = new Date(Date.now() + RATE_LIMITS.codeExpiryMinutes * 60 * 1000);

    // Store OTP
    await db.insert(otpCodes).values({
      identifier,
      hashedCode: hashedOTP,
      purpose,
      expiresAt,
      attempts: 0,
      isUsed: false,
    });

    // Send OTP via requested channels
    const isEmail = identifier.includes('@');
    const results: boolean[] = [];

    if (channel === 'email' || channel === 'both') {
      if (isEmail) {
        const emailTemplate = emailService.getTemplate('otp', { otp });
        const emailResult = await emailService.send({
          to: identifier,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });
        results.push(emailResult.success);
      }
    }

    if (channel === 'sms' || channel === 'both') {
      if (!isEmail) {
        const smsMessage = smsService.getTemplate('otp', { otp });
        const smsResult = await smsService.send({
          to: identifier,
          message: smsMessage,
        });
        results.push(smsResult.success);
      }
    }

    // Check if at least one channel succeeded
    if (results.length === 0 || !results.some(r => r)) {
      return { success: false, message: 'Failed to send OTP. Please check your contact details.' };
    }

    logger.info(`OTP sent to ${identifier.substring(0, 4)}*** for ${purpose}`);

    return {
      success: true,
      message: `OTP sent to ${isEmail ? 'your email' : 'your phone'}`,
      expiresAt,
    };
  }

  /**
   * Verify OTP
   */
  async verify(
    identifier: string,
    otp: string,
    purpose: 'login' | 'registration' | 'password_reset' | 'verification'
  ): Promise<VerifyResult> {
    // Find the most recent unused OTP
    const otpRecord = await db.query.otpCodes.findFirst({
      where: and(
        eq(otpCodes.identifier, identifier),
        eq(otpCodes.purpose, purpose),
        eq(otpCodes.isUsed, false)
      ),
      orderBy: [desc(otpCodes.createdAt)],
    });

    if (!otpRecord) {
      return { success: false, message: 'No OTP found. Please request a new one.' };
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      await db.update(otpCodes)
        .set({ isUsed: true })
        .where(eq(otpCodes.id, otpRecord.id));
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    // Check attempts
    if (otpRecord.attempts >= RATE_LIMITS.maxAttemptsPerCode) {
      await db.update(otpCodes)
        .set({ isUsed: true })
        .where(eq(otpCodes.id, otpRecord.id));
      return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    // Verify OTP
    const isValid = await this.verifyHash(otp, otpRecord.hashedCode);

    if (!isValid) {
      // Increment attempts
      await db.update(otpCodes)
        .set({ attempts: otpRecord.attempts + 1 })
        .where(eq(otpCodes.id, otpRecord.id));

      const remainingAttempts = RATE_LIMITS.maxAttemptsPerCode - otpRecord.attempts - 1;
      return {
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
      };
    }

    // Mark as used
    await db.update(otpCodes)
      .set({ isUsed: true, verifiedAt: new Date() })
      .where(eq(otpCodes.id, otpRecord.id));

    logger.info(`OTP verified for ${identifier.substring(0, 4)}*** (${purpose})`);

    return { success: true, message: 'OTP verified successfully' };
  }
}

export const otpService = new OTPService();
```

**Step 2: Update registration route to use OTP**

In `server/routes/client-registration-routes.ts`, replace the TODO comment at line ~135:

```typescript
// Add this endpoint for OTP verification
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { identifier, otp, purpose } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ error: 'Identifier and OTP are required' });
    }

    const result = await otpService.verify(
      identifier,
      otp,
      purpose || 'registration'
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ success: true, message: result.message });

  } catch (error: any) {
    logger.error('OTP verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});
```

**Step 3: Commit**

```bash
git add server/services/notifications/otp.service.ts server/routes/client-registration-routes.ts
git commit -m "feat(auth): complete OTP service with rate limiting and verification"
```

---

### Task 7: Welcome Email Implementation

**Files:**
- Modify: `server/routes/client-registration-routes.ts`

**Step 1: Add welcome email after user creation**

Find the TODO comment "Send welcome email with temporary password" (~line 108) and replace with:

```typescript
// After user creation success, send welcome email
const tempPassword = crypto.randomBytes(8).toString('hex');
const hashedPassword = await bcrypt.hash(tempPassword, 10);

// Update user with temp password
await db.update(users)
  .set({ password: hashedPassword })
  .where(eq(users.id, newUser.id));

// Send welcome email
const emailTemplate = emailService.getTemplate('welcome', {
  name: newUser.fullName || newUser.username,
  email: newUser.email,
  tempPassword,
  loginUrl: `${process.env.APP_URL || 'https://digicomply.in'}/login`,
});

await emailService.send({
  to: newUser.email,
  subject: emailTemplate.subject,
  html: emailTemplate.html,
});

logger.info(`Welcome email sent to ${newUser.email}`);
```

Add imports at the top:
```typescript
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { emailService } from '../services/notifications/channels/email.service';
```

**Step 2: Commit**

```bash
git add server/routes/client-registration-routes.ts
git commit -m "feat(onboarding): implement welcome email with temp password"
```

---

### Task 8: Wallet Service - Complete Implementation

**Files:**
- Create: `server/services/wallet-service.ts`
- Modify: `server/routes/wallet.ts`

**Step 1: Create wallet service**

```typescript
// server/services/wallet-service.ts
import { db } from '../db';
import { wallets, walletTransactions } from '../db/schema/wallet';
import { eq, desc, and, sql } from 'drizzle-orm';
import { logger } from '../logger';

interface TransactionResult {
  success: boolean;
  transactionId?: number;
  newBalance?: number;
  error?: string;
}

class WalletService {
  /**
   * Get or create wallet for user
   */
  async getOrCreateWallet(userId: number) {
    let wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) {
      [wallet] = await db.insert(wallets).values({
        userId,
        balance: '0',
        currency: 'INR',
        isActive: true,
        isFrozen: false,
      }).returning();
      logger.info(`Wallet created for user ${userId}`);
    }

    return wallet;
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: number): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return parseFloat(wallet.balance);
  }

  /**
   * Credit amount to wallet
   */
  async credit(
    userId: number,
    amount: number,
    type: 'credit' | 'referral_bonus' | 'cashback' | 'refund',
    description: string,
    referenceType?: string,
    referenceId?: number
  ): Promise<TransactionResult> {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.isFrozen) {
        return { success: false, error: 'Wallet is frozen' };
      }

      const newBalance = parseFloat(wallet.balance) + amount;

      // Update wallet balance
      await db.update(wallets)
        .set({
          balance: newBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      // Create transaction record
      const [transaction] = await db.insert(walletTransactions).values({
        walletId: wallet.id,
        type,
        amount: amount.toString(),
        balanceAfter: newBalance.toString(),
        description,
        referenceType,
        referenceId,
        status: 'completed',
      }).returning();

      logger.info(`Wallet credit: ${userId} +${amount} (${type})`);

      return {
        success: true,
        transactionId: transaction.id,
        newBalance,
      };

    } catch (error: any) {
      logger.error('Wallet credit error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Debit amount from wallet
   */
  async debit(
    userId: number,
    amount: number,
    description: string,
    referenceType?: string,
    referenceId?: number
  ): Promise<TransactionResult> {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive' };
    }

    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.isFrozen) {
        return { success: false, error: 'Wallet is frozen' };
      }

      const currentBalance = parseFloat(wallet.balance);
      if (currentBalance < amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      const newBalance = currentBalance - amount;

      // Update wallet balance
      await db.update(wallets)
        .set({
          balance: newBalance.toString(),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      // Create transaction record
      const [transaction] = await db.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'debit',
        amount: (-amount).toString(),
        balanceAfter: newBalance.toString(),
        description,
        referenceType,
        referenceId,
        status: 'completed',
      }).returning();

      logger.info(`Wallet debit: ${userId} -${amount}`);

      return {
        success: true,
        transactionId: transaction.id,
        newBalance,
      };

    } catch (error: any) {
      logger.error('Wallet debit error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    userId: number,
    options: { limit?: number; offset?: number; type?: string } = {}
  ) {
    const wallet = await this.getOrCreateWallet(userId);
    const { limit = 50, offset = 0, type } = options;

    const conditions = [eq(walletTransactions.walletId, wallet.id)];
    if (type) {
      conditions.push(eq(walletTransactions.type, type as any));
    }

    const transactions = await db.query.walletTransactions.findMany({
      where: and(...conditions),
      orderBy: [desc(walletTransactions.createdAt)],
      limit,
      offset,
    });

    return transactions;
  }

  /**
   * Freeze/unfreeze wallet
   */
  async setFrozen(userId: number, frozen: boolean): Promise<boolean> {
    const wallet = await this.getOrCreateWallet(userId);

    await db.update(wallets)
      .set({ isFrozen: frozen, updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id));

    logger.info(`Wallet ${frozen ? 'frozen' : 'unfrozen'} for user ${userId}`);
    return true;
  }
}

export const walletService = new WalletService();
```

**Step 2: Update wallet routes to use real service**

Replace the mock implementation in `server/routes/wallet.ts`:

```typescript
// server/routes/wallet.ts
import { Router, Request, Response } from 'express';
import { walletService } from '../services/wallet-service';
import { requireAuth } from '../middleware/auth';
import { logger } from '../logger';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * Get wallet balance and info
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const wallet = await walletService.getOrCreateWallet(userId);
    const transactions = await walletService.getTransactions(userId, { limit: 10 });

    res.json({
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
      isActive: wallet.isActive,
      isFrozen: wallet.isFrozen,
      transactions,
    });
  } catch (error: any) {
    logger.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet' });
  }
});

/**
 * Get transaction history
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit, offset, type } = req.query;

    const transactions = await walletService.getTransactions(userId, {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
      type: type as string,
    });

    res.json({ transactions });
  } catch (error: any) {
    logger.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

export default router;
```

**Step 3: Commit**

```bash
git add server/services/wallet-service.ts server/routes/wallet.ts
git commit -m "feat(wallet): implement real wallet service with transactions"
```

---

### Task 9: SLA Service - Real Implementation

**Files:**
- Create: `server/services/sla-service.ts`
- Modify: `server/routes/operations-routes.ts`

**Step 1: Create SLA service**

```typescript
// server/services/sla-service.ts
import { db } from '../db';
import { serviceRequests, services, users } from '../../shared/schema';
import { eq, and, lt, isNull, sql } from 'drizzle-orm';
import { notificationHub } from './notifications';
import { logger } from '../logger';

interface SLAConfig {
  responseHours: number;
  resolutionHours: number;
  escalationLevels: {
    level: number;
    afterHours: number;
    notifyRoles: string[];
  }[];
}

interface SLAStatus {
  isBreached: boolean;
  breachType?: 'response' | 'resolution';
  hoursRemaining: number;
  hoursElapsed: number;
  escalationLevel: number;
  deadline: Date;
}

class SLAService {
  /**
   * Get SLA configuration for a service
   */
  async getSLAConfig(serviceId: number): Promise<SLAConfig> {
    const service = await db.query.services.findFirst({
      where: eq(services.id, serviceId),
    });

    if (!service) {
      // Default SLA if service not found
      return {
        responseHours: 4,
        resolutionHours: 48,
        escalationLevels: [
          { level: 1, afterHours: 24, notifyRoles: ['ops_lead'] },
          { level: 2, afterHours: 36, notifyRoles: ['ops_manager'] },
          { level: 3, afterHours: 44, notifyRoles: ['admin'] },
        ],
      };
    }

    // Parse SLA from service metadata or use defaults
    const slaHours = service.slaHours || 48;

    return {
      responseHours: Math.min(4, slaHours / 12),
      resolutionHours: slaHours,
      escalationLevels: [
        { level: 1, afterHours: slaHours * 0.5, notifyRoles: ['ops_lead'] },
        { level: 2, afterHours: slaHours * 0.75, notifyRoles: ['ops_manager'] },
        { level: 3, afterHours: slaHours * 0.9, notifyRoles: ['admin'] },
      ],
    };
  }

  /**
   * Calculate SLA deadline for a service request
   */
  async calculateDeadline(
    serviceId: number,
    priority: 'low' | 'medium' | 'high' | 'urgent',
    createdAt: Date
  ): Promise<Date> {
    const config = await this.getSLAConfig(serviceId);

    // Priority multipliers
    const multipliers: Record<string, number> = {
      urgent: 0.25,
      high: 0.5,
      medium: 1,
      low: 1.5,
    };

    const multiplier = multipliers[priority] || 1;
    const hoursToAdd = config.resolutionHours * multiplier;

    // Calculate deadline (excluding weekends for business hours)
    const deadline = new Date(createdAt);
    let hoursAdded = 0;

    while (hoursAdded < hoursToAdd) {
      deadline.setHours(deadline.getHours() + 1);

      // Skip weekends (Saturday = 6, Sunday = 0)
      const day = deadline.getDay();
      if (day !== 0 && day !== 6) {
        // Only count business hours (9 AM - 6 PM)
        const hour = deadline.getHours();
        if (hour >= 9 && hour < 18) {
          hoursAdded++;
        }
      }
    }

    return deadline;
  }

  /**
   * Get SLA status for a service request
   */
  async getStatus(requestId: number): Promise<SLAStatus> {
    const request = await db.query.serviceRequests.findFirst({
      where: eq(serviceRequests.id, requestId),
    });

    if (!request) {
      throw new Error('Service request not found');
    }

    const config = await this.getSLAConfig(request.serviceId!);
    const createdAt = new Date(request.createdAt!);
    const now = new Date();

    // Calculate hours elapsed (business hours only)
    const hoursElapsed = this.calculateBusinessHours(createdAt, now);

    // Calculate deadline
    const deadline = await this.calculateDeadline(
      request.serviceId!,
      (request.priority as any) || 'medium',
      createdAt
    );

    const hoursRemaining = this.calculateBusinessHours(now, deadline);
    const isBreached = now > deadline;

    // Determine escalation level
    let escalationLevel = 0;
    for (const level of config.escalationLevels) {
      if (hoursElapsed >= level.afterHours) {
        escalationLevel = level.level;
      }
    }

    return {
      isBreached,
      breachType: isBreached ? 'resolution' : undefined,
      hoursRemaining: Math.max(0, hoursRemaining),
      hoursElapsed,
      escalationLevel,
      deadline,
    };
  }

  /**
   * Calculate business hours between two dates
   */
  private calculateBusinessHours(start: Date, end: Date): number {
    let hours = 0;
    const current = new Date(start);

    while (current < end) {
      const day = current.getDay();
      const hour = current.getHours();

      // Count only business hours (Mon-Fri, 9 AM - 6 PM)
      if (day !== 0 && day !== 6 && hour >= 9 && hour < 18) {
        hours++;
      }

      current.setHours(current.getHours() + 1);
    }

    return hours;
  }

  /**
   * Check all requests for SLA breaches and escalate
   */
  async checkBreachesAndEscalate(): Promise<{ checked: number; escalated: number }> {
    // Get all open service requests
    const openRequests = await db.query.serviceRequests.findMany({
      where: and(
        sql`${serviceRequests.status} NOT IN ('completed', 'cancelled', 'closed')`,
        isNull(serviceRequests.completedAt)
      ),
    });

    let escalated = 0;

    for (const request of openRequests) {
      try {
        const status = await this.getStatus(request.id);
        const config = await this.getSLAConfig(request.serviceId!);

        // Find if we need to escalate
        for (const level of config.escalationLevels) {
          if (
            status.hoursElapsed >= level.afterHours &&
            (request.escalationLevel || 0) < level.level
          ) {
            await this.escalate(request.id, level.level, level.notifyRoles);
            escalated++;
          }
        }
      } catch (error) {
        logger.error(`SLA check failed for request ${request.id}:`, error);
      }
    }

    return { checked: openRequests.length, escalated };
  }

  /**
   * Escalate a service request
   */
  async escalate(
    requestId: number,
    level: number,
    notifyRoles: string[]
  ): Promise<void> {
    // Update request
    await db.update(serviceRequests)
      .set({
        escalationLevel: level,
        escalatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, requestId));

    // Get users to notify
    const usersToNotify = await db.query.users.findMany({
      where: sql`${users.role} = ANY(ARRAY[${sql.join(notifyRoles.map(r => sql`${r}`), sql`, `)}])`,
    });

    // Send notifications
    for (const user of usersToNotify) {
      await notificationHub.send({
        userId: user.id,
        type: 'escalation',
        channels: ['email', 'in_app', 'push'],
        subject: `SLA Escalation: Request #${requestId}`,
        content: `Service request #${requestId} has been escalated to level ${level} due to SLA breach.`,
        data: { requestId, escalationLevel: level },
        priority: 'high',
        referenceType: 'service_request',
        referenceId: requestId,
      });
    }

    logger.warn(`Request ${requestId} escalated to level ${level}`);
  }
}

export const slaService = new SLAService();
```

**Step 2: Update operations routes to use real SLA**

In `server/routes/operations-routes.ts`, replace mock metrics with real calculations:

```typescript
// Add import at top
import { slaService } from '../services/sla-service';

// Replace the mock metrics endpoint (around line 1000-1020) with:
router.get('/metrics', requireAuth, async (req: Request, res: Response) => {
  try {
    // Get real metrics from database
    const [
      totalRequests,
      completedRequests,
      pendingRequests,
      breachedRequests,
    ] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(serviceRequests),
      db.select({ count: sql`count(*)` }).from(serviceRequests).where(eq(serviceRequests.status, 'completed')),
      db.select({ count: sql`count(*)` }).from(serviceRequests).where(sql`${serviceRequests.status} NOT IN ('completed', 'cancelled')`),
      db.select({ count: sql`count(*)` }).from(serviceRequests).where(sql`${serviceRequests.escalationLevel} > 0`),
    ]);

    // Calculate average completion time from actual data
    const avgCompletionResult = await db.execute(sql`
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) as avg_hours
      FROM service_requests
      WHERE completed_at IS NOT NULL
      AND created_at > NOW() - INTERVAL '30 days'
    `);
    const avgCompletionHours = avgCompletionResult.rows[0]?.avg_hours || 0;

    // Calculate SLA compliance rate
    const slaCompliance = totalRequests[0].count > 0
      ? ((Number(completedRequests[0].count) - Number(breachedRequests[0].count)) / Number(totalRequests[0].count)) * 100
      : 100;

    res.json({
      totalRequests: Number(totalRequests[0].count),
      completedRequests: Number(completedRequests[0].count),
      pendingRequests: Number(pendingRequests[0].count),
      breachedRequests: Number(breachedRequests[0].count),
      avgCompletionTime: Math.round(avgCompletionHours * 10) / 10,
      slaComplianceRate: Math.round(slaCompliance * 10) / 10,
    });
  } catch (error: any) {
    logger.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});
```

**Step 3: Add SLA check cron job**

Create `server/jobs/sla-checker.ts`:

```typescript
// server/jobs/sla-checker.ts
import { slaService } from '../services/sla-service';
import { logger } from '../logger';

/**
 * Run SLA check every 15 minutes
 */
export async function runSLACheck() {
  try {
    const result = await slaService.checkBreachesAndEscalate();
    logger.info(`SLA check complete: ${result.checked} checked, ${result.escalated} escalated`);
  } catch (error) {
    logger.error('SLA check job failed:', error);
  }
}

// Schedule with node-cron or BullMQ
```

**Step 4: Commit**

```bash
git add server/services/sla-service.ts server/routes/operations-routes.ts server/jobs/sla-checker.ts
git commit -m "feat(ops): implement real SLA service with escalation"
```

---

### Task 10: Proposal PDF Generation

**Files:**
- Create: `server/services/proposal-service.ts`
- Modify: `server/routes/proposals-routes.ts`

**Step 1: Create proposal service with PDF generation**

```typescript
// server/services/proposal-service.ts
import PDFDocument from 'pdfkit';
import { db } from '../db';
import { proposals } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { storageService } from './storage';
import { emailService } from './notifications/channels/email.service';
import { logger } from '../logger';

interface ProposalData {
  id: number;
  title: string;
  clientName: string;
  clientEmail: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  validUntil: Date;
  terms?: string;
  notes?: string;
}

class ProposalService {
  /**
   * Generate PDF for proposal
   */
  async generatePDF(proposalId: number): Promise<Buffer> {
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.id, proposalId),
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50 });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).fillColor('#2563eb').text('DigiComply', { align: 'center' });
      doc.moveDown();
      doc.fontSize(18).fillColor('#000').text('PROPOSAL', { align: 'center' });
      doc.moveDown();

      // Proposal details
      doc.fontSize(12);
      doc.text(`Proposal #: ${proposal.id}`);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`);
      doc.text(`Valid Until: ${new Date(proposal.validUntil!).toLocaleDateString('en-IN')}`);
      doc.moveDown();

      // Client details
      doc.fontSize(14).fillColor('#2563eb').text('Prepared For:');
      doc.fontSize(12).fillColor('#000');
      doc.text(proposal.clientName || 'Client');
      doc.text(proposal.clientEmail || '');
      doc.moveDown();

      // Title and description
      doc.fontSize(16).text(proposal.title || 'Service Proposal');
      doc.moveDown();
      if (proposal.description) {
        doc.fontSize(11).text(proposal.description);
        doc.moveDown();
      }

      // Items table
      const items = (proposal.items as any[]) || [];
      if (items.length > 0) {
        doc.fontSize(14).fillColor('#2563eb').text('Services');
        doc.moveDown(0.5);

        // Table header
        const tableTop = doc.y;
        doc.fontSize(10).fillColor('#666');
        doc.text('Description', 50, tableTop);
        doc.text('Qty', 300, tableTop);
        doc.text('Rate', 350, tableTop);
        doc.text('Amount', 450, tableTop);
        doc.moveDown();

        // Table rows
        doc.fillColor('#000');
        items.forEach((item: any) => {
          const y = doc.y;
          doc.text(item.description || item.name, 50, y, { width: 240 });
          doc.text(String(item.quantity || 1), 300, y);
          doc.text(`₹${(item.unitPrice || item.rate || 0).toLocaleString()}`, 350, y);
          doc.text(`₹${(item.total || item.amount || 0).toLocaleString()}`, 450, y);
          doc.moveDown();
        });
      }

      // Totals
      doc.moveDown();
      const totalsX = 350;
      doc.fontSize(11);
      doc.text('Subtotal:', totalsX);
      doc.text(`₹${(proposal.subtotal || 0).toLocaleString()}`, 450, doc.y - 12);

      if (proposal.taxAmount) {
        doc.text('GST (18%):', totalsX);
        doc.text(`₹${proposal.taxAmount.toLocaleString()}`, 450, doc.y - 12);
      }

      doc.moveDown();
      doc.fontSize(14).fillColor('#2563eb');
      doc.text('Total:', totalsX);
      doc.text(`₹${(proposal.totalAmount || 0).toLocaleString()}`, 450, doc.y - 14);

      // Terms
      if (proposal.terms) {
        doc.moveDown(2);
        doc.fontSize(12).fillColor('#000').text('Terms & Conditions:');
        doc.fontSize(10).text(proposal.terms);
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(10).fillColor('#666');
      doc.text('Thank you for your business!', { align: 'center' });
      doc.text('DigiComply - Your Compliance Partner', { align: 'center' });

      doc.end();
    });
  }

  /**
   * Send proposal to client via email
   */
  async sendToClient(proposalId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const proposal = await db.query.proposals.findFirst({
        where: eq(proposals.id, proposalId),
      });

      if (!proposal) {
        return { success: false, error: 'Proposal not found' };
      }

      if (!proposal.clientEmail) {
        return { success: false, error: 'Client email not set' };
      }

      // Generate PDF
      const pdfBuffer = await this.generatePDF(proposalId);

      // Upload to storage
      const storedFile = await storageService.upload(
        {
          buffer: pdfBuffer,
          originalname: `proposal-${proposalId}.pdf`,
          mimetype: 'application/pdf',
          size: pdfBuffer.length,
        },
        {
          category: 'proposals',
          entityType: 'proposal',
          entityId: proposalId,
          userId: proposal.createdBy!,
        }
      );

      // Get signed URL
      const downloadUrl = await storageService.getSignedUrl(storedFile.id, 60 * 24 * 7); // 7 days

      // Send email
      const emailTemplate = emailService.getTemplate('proposal', {
        clientName: proposal.clientName,
        proposalTitle: proposal.title,
        amount: proposal.totalAmount?.toLocaleString(),
        validUntil: new Date(proposal.validUntil!).toLocaleDateString('en-IN'),
        viewUrl: downloadUrl,
      });

      await emailService.send({
        to: proposal.clientEmail,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      // Update proposal status
      await db.update(proposals)
        .set({
          status: 'sent',
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(proposals.id, proposalId));

      logger.info(`Proposal ${proposalId} sent to ${proposal.clientEmail}`);

      return { success: true };

    } catch (error: any) {
      logger.error('Send proposal error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track proposal view
   */
  async trackView(proposalId: number, viewerInfo?: { ip?: string; userAgent?: string }): Promise<void> {
    await db.update(proposals)
      .set({
        status: 'viewed',
        viewedAt: new Date(),
        viewCount: sql`COALESCE(view_count, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, proposalId));

    logger.info(`Proposal ${proposalId} viewed`);
  }
}

import { sql } from 'drizzle-orm';

export const proposalService = new ProposalService();
```

**Step 2: Update proposal routes**

Add to `server/routes/proposals-routes.ts`:

```typescript
import { proposalService } from '../services/proposal-service';

// Generate PDF
router.get('/:id/pdf', requireAuth, async (req: Request, res: Response) => {
  try {
    const proposalId = parseInt(req.params.id);
    const pdfBuffer = await proposalService.generatePDF(proposalId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=proposal-${proposalId}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Send proposal to client
router.post('/:id/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const proposalId = parseInt(req.params.id);
    const result = await proposalService.sendToClient(proposalId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Proposal sent successfully' });
  } catch (error: any) {
    logger.error('Send proposal error:', error);
    res.status(500).json({ error: 'Failed to send proposal' });
  }
});

// Track view (public endpoint with token)
router.get('/:id/view', async (req: Request, res: Response) => {
  try {
    const proposalId = parseInt(req.params.id);
    await proposalService.trackView(proposalId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Redirect to PDF or proposal page
    res.redirect(`/proposals/${proposalId}`);
  } catch (error: any) {
    res.status(404).json({ error: 'Proposal not found' });
  }
});
```

**Step 3: Install PDFKit**

Run: `npm install pdfkit @types/pdfkit`
Expected: Package installed successfully

**Step 4: Commit**

```bash
git add server/services/proposal-service.ts server/routes/proposals-routes.ts package.json
git commit -m "feat(sales): add proposal PDF generation and email sending"
```

---

## Phase 2 Continued: Additional Tasks

Due to document length, remaining tasks follow the same pattern:

### Task 11: Commission Service
- Create `server/services/commission-service.ts`
- Implement tier-based calculation
- Add payout processing via wallet

### Task 12: Lead Assignment Service
- Create `server/services/lead-assignment-service.ts`
- Implement skill matching algorithm
- Add workload balancing

### Task 13: QC Workflow Service
- Create `server/services/qc-workflow-service.ts`
- Implement checklist-based review
- Add handoff with signature capture

### Task 14: Analytics Service
- Create `server/services/analytics-service.ts`
- Replace all `Math.random()` with real queries
- Add Redis caching

### Task 15: Audit Export Service
- Create `server/services/audit-export-service.ts`
- Implement Excel/PDF export
- Add filters and date ranges

### Task 16: User Provisioning Enhancement
- Modify `server/routes/admin-routes.ts`
- Add temp password generation
- Send credentials via email

### Task 17: Government API Adapters
- Modify `server/services/govt-api/*.ts`
- Add real GSP integration
- Add PAN/Aadhaar verification

### Task 18: Report Generator
- Create `server/services/report-generator.ts`
- Add Handlebars templates
- Implement scheduled reports

### Task 19: Frontend Hooks Enhancement
- Update `client/src/hooks/useOperations.ts`
- Connect to real metrics endpoints
- Add real-time WebSocket updates

### Task 20: Integration Testing
- Create E2E tests for critical paths
- Test notification delivery
- Test payment webhooks

---

## Execution Commands

After each task:
```bash
npm run typecheck   # Verify TypeScript
npm run dev         # Test locally
npm test            # Run tests
```

Final verification:
```bash
npm run build       # Production build
npm run test:e2e    # End-to-end tests
```

---

## Success Criteria

- [ ] All `Math.random()` replaced with real calculations
- [ ] All TODO comments resolved
- [ ] All notifications deliver via real channels
- [ ] Payment webhooks process with idempotency
- [ ] Proposals generate PDFs and send emails
- [ ] SLA tracking uses real timestamps
- [ ] Wallet transactions work end-to-end
- [ ] All E2E tests pass
