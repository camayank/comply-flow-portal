/**
 * STRIPE WEBHOOK HANDLERS
 * File: server/stripe-webhook-routes.ts
 *
 * Handles Stripe webhook events for payment processing
 * Must use raw body for signature verification
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from './config/database';
import { payments, serviceRequests, taskItems, users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from './config/logger';
import { getSocketManager } from './socket';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia'
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// ============ WEBHOOK ENDPOINT ============

/**
 * Main Stripe webhook handler
 * IMPORTANT: This endpoint must receive raw body, not parsed JSON
 */
router.post('/webhooks/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    logger.warn('Stripe webhook missing signature');
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature using raw body
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    logger.info('Stripe webhook received', { type: event.type, id: event.id });
  } catch (err: any) {
    logger.error('Stripe webhook signature verification failed', { error: err.message });
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        await handleDispute(event.data.object as Stripe.Dispute);
        break;

      default:
        logger.info('Unhandled Stripe event type', { type: event.type });
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Error processing Stripe webhook', {
      type: event.type,
      error: error.message
    });
    // Return 200 to acknowledge receipt (Stripe will retry on 4xx/5xx)
    res.status(200).json({ received: true, error: error.message });
  }
});

// ============ EVENT HANDLERS ============

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { id, amount, metadata } = paymentIntent;
  const serviceRequestId = metadata?.serviceRequestId ? parseInt(metadata.serviceRequestId) : null;

  logger.info('Payment succeeded', {
    paymentIntentId: id,
    amount: amount / 100,
    serviceRequestId
  });

  if (!serviceRequestId) {
    logger.warn('Payment intent missing serviceRequestId metadata', { id });
    return;
  }

  // Update payment record
  await db.update(payments)
    .set({
      status: 'completed',
      stripePaymentIntentId: id,
      paidAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(payments.serviceRequestId, serviceRequestId));

  // Update service request status
  await db.update(serviceRequests)
    .set({
      status: 'payment_completed',
      paymentStatus: 'paid',
      updatedAt: new Date()
    })
    .where(eq(serviceRequests.id, serviceRequestId));

  // Create task for operations team
  await createPaymentTask(serviceRequestId, 'Payment received - Begin service execution');

  // Notify via socket
  await notifyPaymentReceived(serviceRequestId, amount / 100);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { id, metadata, last_payment_error } = paymentIntent;
  const serviceRequestId = metadata?.serviceRequestId ? parseInt(metadata.serviceRequestId) : null;

  logger.warn('Payment failed', {
    paymentIntentId: id,
    error: last_payment_error?.message,
    serviceRequestId
  });

  if (!serviceRequestId) return;

  // Update payment record
  await db.update(payments)
    .set({
      status: 'failed',
      failureReason: last_payment_error?.message || 'Payment failed',
      updatedAt: new Date()
    })
    .where(eq(payments.serviceRequestId, serviceRequestId));

  // Update service request
  await db.update(serviceRequests)
    .set({
      paymentStatus: 'failed',
      updatedAt: new Date()
    })
    .where(eq(serviceRequests.id, serviceRequestId));
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const { id, customer, amount_paid, subscription } = invoice;

  logger.info('Invoice paid', {
    invoiceId: id,
    customerId: customer,
    amount: (amount_paid || 0) / 100
  });

  // Handle subscription renewal or one-time invoice payment
  if (subscription) {
    // This is a subscription renewal
    logger.info('Subscription payment received', { subscriptionId: subscription });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const { id, customer, subscription } = invoice;

  logger.warn('Invoice payment failed', {
    invoiceId: id,
    customerId: customer
  });

  if (subscription) {
    // Subscription payment failed - may need to notify user
    logger.warn('Subscription payment failed', { subscriptionId: subscription });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { id, status, customer, current_period_end, items } = subscription;

  logger.info('Subscription updated', {
    subscriptionId: id,
    status,
    customerId: customer
  });

  // Update user's subscription status in database if needed
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const { id, customer } = subscription;

  logger.info('Subscription cancelled', {
    subscriptionId: id,
    customerId: customer
  });

  // Handle subscription cancellation - may need to downgrade user access
}

async function handleRefund(charge: Stripe.Charge) {
  const { id, amount_refunded, payment_intent, metadata } = charge;
  const serviceRequestId = metadata?.serviceRequestId ? parseInt(metadata.serviceRequestId) : null;

  logger.info('Payment refunded', {
    chargeId: id,
    refundedAmount: (amount_refunded || 0) / 100,
    serviceRequestId
  });

  if (!serviceRequestId) return;

  // Update payment record
  await db.update(payments)
    .set({
      status: 'refunded',
      refundedAmount: String((amount_refunded || 0) / 100),
      refundedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(payments.serviceRequestId, serviceRequestId));

  // Update service request
  await db.update(serviceRequests)
    .set({
      paymentStatus: 'refunded',
      status: 'cancelled',
      updatedAt: new Date()
    })
    .where(eq(serviceRequests.id, serviceRequestId));
}

async function handleDispute(dispute: Stripe.Dispute) {
  const { id, charge, amount, reason, status } = dispute;

  logger.warn('Payment dispute created', {
    disputeId: id,
    chargeId: charge,
    amount: amount / 100,
    reason
  });

  // Alert admin about dispute
  const socketManager = getSocketManager();
  if (socketManager) {
    socketManager.io.to('admin').emit('system:alert', {
      type: 'error',
      title: 'Payment Dispute',
      message: `A payment dispute has been created. Amount: ₹${amount / 100}. Reason: ${reason}`,
      timestamp: new Date()
    });
  }
}

// ============ HELPER FUNCTIONS ============

async function createPaymentTask(serviceRequestId: number, description: string) {
  try {
    // Get service request details
    const [request] = await db.select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!request) return;

    // Generate task number
    const taskNumber = `TASK-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Create task for ops team
    await db.insert(taskItems).values({
      taskNumber,
      title: `Payment Received - ${request.serviceName || 'Service'}`,
      description,
      taskType: 'service_related',
      initiatorId: 1, // System
      status: 'pending',
      priority: 'high',
      serviceRequestId,
      businessEntityId: request.businessEntityId,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
      createdAt: new Date(),
      updatedAt: new Date()
    });

    logger.info('Payment task created', { serviceRequestId, taskNumber });
  } catch (error: any) {
    logger.error('Failed to create payment task', { error: error.message, serviceRequestId });
  }
}

async function notifyPaymentReceived(serviceRequestId: number, amount: number) {
  try {
    const socketManager = getSocketManager();
    if (!socketManager) return;

    // Get service request with client info
    const [request] = await db.select({
      request: serviceRequests,
      clientId: serviceRequests.userId
    })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!request) return;

    // Notify client via client namespace
    const { notifyPaymentReceived: notifyClient } = await import('./socket/clients');
    notifyClient(
      socketManager.clients,
      request.clientId,
      `PAY-${serviceRequestId}`,
      amount,
      request.request.serviceName || 'Service'
    );

    // Notify ops team
    socketManager.operations.to('admin').emit('notification', {
      id: `payment_${serviceRequestId}_${Date.now()}`,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      message: `Payment of ₹${amount.toLocaleString('en-IN')} received for ${request.request.serviceName}`,
      data: { serviceRequestId, amount },
      priority: 'medium',
      read: false,
      timestamp: new Date()
    });

  } catch (error: any) {
    logger.error('Failed to send payment notification', { error: error.message });
  }
}

// ============ STRIPE UTILITY ENDPOINTS ============

/**
 * Create a payment intent for a service request
 */
router.post('/create-payment-intent', async (req: Request, res: Response) => {
  try {
    const { serviceRequestId, amount, currency = 'inr' } = req.body;

    if (!serviceRequestId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      metadata: {
        serviceRequestId: String(serviceRequestId)
      }
    });

    // Create payment record
    await db.insert(payments).values({
      serviceRequestId,
      amount: String(amount),
      currency,
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
      paymentMethod: 'stripe',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error: any) {
    logger.error('Failed to create payment intent', { error: error.message });
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * Get Stripe publishable key
 */
router.get('/stripe-config', (req: Request, res: Response) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

export default router;
