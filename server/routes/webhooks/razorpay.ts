/**
 * Razorpay Webhook Handler
 *
 * Handles webhook events from Razorpay payment gateway:
 * - payment.captured: Successful payment completion
 * - payment.failed: Payment failure
 * - refund.processed: Refund completion
 *
 * Features:
 * - HMAC SHA256 signature verification
 * - Idempotency via webhookEvents table
 * - Notification dispatch via notificationHub
 * - Comprehensive error handling and logging
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../../db';
import { eq, and } from 'drizzle-orm';
import { webhookEvents } from '../../db/schema/webhook-events';
import { payments } from '@shared/schema';
import { notificationHub } from '../../services/notifications';
import { logger } from '../../logger';

const router = Router();

// Environment variables for Razorpay configuration
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// ============================================
// SIGNATURE VERIFICATION
// ============================================

/**
 * Verify Razorpay webhook signature using HMAC SHA256
 * @param body - Raw request body as string
 * @param signature - X-Razorpay-Signature header value
 * @returns boolean indicating if signature is valid
 */
function verifySignature(body: string, signature: string): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    logger.warn('Razorpay webhook secret not configured', {
      category: 'webhook',
      provider: 'razorpay',
    });
    return false;
  }

  if (!signature) {
    logger.warn('Missing webhook signature', {
      category: 'webhook',
      provider: 'razorpay',
    });
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Signature verification error', {
      category: 'webhook',
      provider: 'razorpay',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

// ============================================
// IDEMPOTENCY HANDLING
// ============================================

/**
 * Check if a webhook event has already been processed
 * @param eventId - Razorpay event ID
 * @returns boolean indicating if event was already processed
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const [existing] = await db.select()
    .from(webhookEvents)
    .where(and(
      eq(webhookEvents.provider, 'razorpay'),
      eq(webhookEvents.eventId, eventId)
    ))
    .limit(1);

  return !!existing && existing.status === 'processed';
}

/**
 * Record a webhook event for idempotency tracking
 * @param provider - Webhook provider name
 * @param eventId - Provider's event ID
 * @param eventType - Type of event (e.g., payment.captured)
 * @param payload - Full webhook payload
 * @param status - Processing status
 * @param errorMessage - Optional error message if failed
 */
async function recordEvent(
  provider: string,
  eventId: string,
  eventType: string,
  payload: unknown,
  status: 'pending' | 'processed' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    // Check if event exists
    const [existing] = await db.select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventId, eventId))
      .limit(1);

    if (existing) {
      // Update existing event
      await db.update(webhookEvents)
        .set({
          status,
          processedAt: status === 'processed' ? new Date() : null,
          errorMessage: errorMessage || null,
        })
        .where(eq(webhookEvents.eventId, eventId));
    } else {
      // Insert new event
      await db.insert(webhookEvents).values({
        provider,
        eventId,
        eventType,
        payload: payload as Record<string, unknown>,
        status,
        processedAt: status === 'processed' ? new Date() : null,
        errorMessage: errorMessage || null,
      });
    }
  } catch (error) {
    logger.error('Failed to record webhook event', {
      category: 'webhook',
      provider,
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle successful payment capture
 */
async function handlePaymentCaptured(payload: RazorpayWebhookPayload): Promise<void> {
  const paymentEntity = payload.payload.payment?.entity;
  if (!paymentEntity) {
    throw new Error('Payment entity missing in webhook payload');
  }

  const paymentId = paymentEntity.id;
  const amount = paymentEntity.amount;
  const orderId = paymentEntity.order_id;
  const notes = paymentEntity.notes || {};

  logger.info('Processing payment.captured event', {
    category: 'webhook',
    provider: 'razorpay',
    paymentId,
    amount,
    orderId,
  });

  // Update payment status in database
  const [updatedPayment] = await db.update(payments)
    .set({
      status: 'completed',
      transactionId: paymentId,
      completedAt: new Date(),
    })
    .where(eq(payments.paymentId, orderId))
    .returning();

  if (updatedPayment) {
    // Send notification to user
    const userId = notes.userId ? parseInt(notes.userId, 10) : null;

    if (userId) {
      await notificationHub.send({
        userId,
        type: 'payment',
        channels: ['in_app', 'email'],
        priority: 'normal',
        subject: 'Payment Successful',
        content: `Your payment of ${formatAmount(amount)} has been successfully processed.`,
        data: {
          paymentId,
          amount,
          orderId,
          serviceRequestId: updatedPayment.serviceRequestId,
        },
        referenceType: 'payment',
        referenceId: updatedPayment.id,
      });
    }

    logger.info('Payment capture processed successfully', {
      category: 'webhook',
      provider: 'razorpay',
      paymentId,
      dbPaymentId: updatedPayment.id,
    });
  } else {
    logger.warn('Payment record not found for order', {
      category: 'webhook',
      provider: 'razorpay',
      orderId,
      paymentId,
    });
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(payload: RazorpayWebhookPayload): Promise<void> {
  const paymentEntity = payload.payload.payment?.entity;
  if (!paymentEntity) {
    throw new Error('Payment entity missing in webhook payload');
  }

  const paymentId = paymentEntity.id;
  const orderId = paymentEntity.order_id;
  const errorCode = paymentEntity.error_code;
  const errorDescription = paymentEntity.error_description;
  const notes = paymentEntity.notes || {};

  logger.info('Processing payment.failed event', {
    category: 'webhook',
    provider: 'razorpay',
    paymentId,
    orderId,
    errorCode,
  });

  // Update payment status in database
  const [updatedPayment] = await db.update(payments)
    .set({
      status: 'failed',
      transactionId: paymentId,
    })
    .where(eq(payments.paymentId, orderId))
    .returning();

  if (updatedPayment) {
    // Send notification to user
    const userId = notes.userId ? parseInt(notes.userId, 10) : null;

    if (userId) {
      await notificationHub.send({
        userId,
        type: 'payment',
        channels: ['in_app', 'email'],
        priority: 'high',
        subject: 'Payment Failed',
        content: `Your payment could not be processed. ${errorDescription || 'Please try again or contact support.'}`,
        data: {
          paymentId,
          orderId,
          errorCode,
          errorDescription,
          serviceRequestId: updatedPayment.serviceRequestId,
        },
        referenceType: 'payment',
        referenceId: updatedPayment.id,
      });
    }

    logger.info('Payment failure processed', {
      category: 'webhook',
      provider: 'razorpay',
      paymentId,
      dbPaymentId: updatedPayment.id,
      errorCode,
    });
  } else {
    logger.warn('Payment record not found for failed order', {
      category: 'webhook',
      provider: 'razorpay',
      orderId,
      paymentId,
    });
  }
}

/**
 * Handle processed refund
 */
async function handleRefundProcessed(payload: RazorpayWebhookPayload): Promise<void> {
  const refundEntity = payload.payload.refund?.entity;
  const paymentEntity = payload.payload.payment?.entity;

  if (!refundEntity) {
    throw new Error('Refund entity missing in webhook payload');
  }

  const refundId = refundEntity.id;
  const paymentId = refundEntity.payment_id;
  const amount = refundEntity.amount;
  const notes = refundEntity.notes || paymentEntity?.notes || {};

  logger.info('Processing refund.processed event', {
    category: 'webhook',
    provider: 'razorpay',
    refundId,
    paymentId,
    amount,
  });

  // Find and update the payment record
  const [updatedPayment] = await db.update(payments)
    .set({
      status: 'refunded',
    })
    .where(eq(payments.transactionId, paymentId))
    .returning();

  if (updatedPayment) {
    // Send notification to user
    const userId = notes.userId ? parseInt(notes.userId, 10) : null;

    if (userId) {
      await notificationHub.send({
        userId,
        type: 'payment',
        channels: ['in_app', 'email'],
        priority: 'normal',
        subject: 'Refund Processed',
        content: `Your refund of ${formatAmount(amount)} has been processed. It may take 5-7 business days to reflect in your account.`,
        data: {
          refundId,
          paymentId,
          amount,
          serviceRequestId: updatedPayment.serviceRequestId,
        },
        referenceType: 'payment',
        referenceId: updatedPayment.id,
      });
    }

    logger.info('Refund processed successfully', {
      category: 'webhook',
      provider: 'razorpay',
      refundId,
      paymentId,
      dbPaymentId: updatedPayment.id,
    });
  } else {
    logger.warn('Payment record not found for refund', {
      category: 'webhook',
      provider: 'razorpay',
      paymentId,
      refundId,
    });
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format amount from paise to rupees string
 */
function formatAmount(amountInPaise: number): string {
  const rupees = amountInPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(rupees);
}

// ============================================
// TYPES
// ============================================

interface RazorpayPaymentEntity {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  description?: string;
  error_code?: string;
  error_description?: string;
  notes?: Record<string, string>;
}

interface RazorpayRefundEntity {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  notes?: Record<string, string>;
  status: string;
}

interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: RazorpayPaymentEntity;
    };
    refund?: {
      entity: RazorpayRefundEntity;
    };
  };
  created_at: number;
}

// ============================================
// WEBHOOK ENDPOINT
// ============================================

/**
 * POST /webhooks/razorpay
 * Main webhook handler for Razorpay events
 */
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const signature = req.headers['x-razorpay-signature'] as string;

  // Get raw body for signature verification
  const rawBody = JSON.stringify(req.body);

  try {
    // Step 1: Verify signature
    if (!verifySignature(rawBody, signature)) {
      logger.warn('Invalid webhook signature', {
        category: 'webhook',
        provider: 'razorpay',
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid signature',
      });
    }

    const payload = req.body as RazorpayWebhookPayload;
    const eventId = `${payload.account_id}_${payload.created_at}_${payload.event}`;
    const eventType = payload.event;

    logger.info('Webhook received', {
      category: 'webhook',
      provider: 'razorpay',
      eventId,
      eventType,
    });

    // Step 2: Check idempotency
    if (await isEventProcessed(eventId)) {
      logger.info('Duplicate webhook event, skipping', {
        category: 'webhook',
        provider: 'razorpay',
        eventId,
        eventType,
      });
      return res.status(200).json({
        success: true,
        message: 'Event already processed',
      });
    }

    // Step 3: Record event as pending
    await recordEvent('razorpay', eventId, eventType, payload, 'pending');

    // Step 4: Process based on event type
    try {
      switch (eventType) {
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
          logger.info('Unhandled webhook event type', {
            category: 'webhook',
            provider: 'razorpay',
            eventType,
          });
      }

      // Step 5: Mark event as processed
      await recordEvent('razorpay', eventId, eventType, payload, 'processed');

      const duration = Date.now() - startTime;
      logger.info('Webhook processed successfully', {
        category: 'webhook',
        provider: 'razorpay',
        eventId,
        eventType,
        durationMs: duration,
      });

      return res.status(200).json({
        success: true,
        message: 'Event processed',
      });

    } catch (processingError) {
      // Mark event as failed
      const errorMessage = processingError instanceof Error
        ? processingError.message
        : 'Unknown processing error';

      await recordEvent('razorpay', eventId, eventType, payload, 'failed', errorMessage);

      logger.error('Webhook processing failed', {
        category: 'webhook',
        provider: 'razorpay',
        eventId,
        eventType,
        error: errorMessage,
      });

      // Return 200 to prevent Razorpay from retrying (we've recorded the failure)
      // In production, you might want to return 500 to trigger retries for transient errors
      return res.status(200).json({
        success: false,
        error: 'Processing failed, recorded for retry',
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Webhook handler error', {
      category: 'webhook',
      provider: 'razorpay',
      error: errorMessage,
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
