import type { Express } from "express";
import { db } from './db';
import { payments, serviceRequests, businessEntities, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

// Payment gateway structure - Ready for Stripe integration
// NOTE: STRIPE_SECRET_KEY and VITE_STRIPE_PUBLIC_KEY will be added when needed

const getStripeInstance = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️  STRIPE_SECRET_KEY not configured - payment processing disabled');
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });
};

export function registerPaymentRoutes(app: Express) {

  // Create payment intent for service
  app.post('/api/payments/create-intent', async (req, res) => {
    try {
      const { serviceRequestId, amount, currency = 'inr' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const stripe = getStripeInstance();
      if (!stripe) {
        return res.status(503).json({ 
          error: 'Payment gateway not configured',
          message: 'Please contact support to enable payments'
        });
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to smallest currency unit
        currency,
        metadata: {
          serviceRequestId: serviceRequestId?.toString() || 'direct',
        },
      });

      // Record payment in database
      const [payment] = await db
        .insert(payments)
        .values({
          serviceRequestId: serviceRequestId || null,
          amount: amount.toString(),
          paymentMethod: 'stripe',
          paymentStatus: 'pending',
          transactionId: paymentIntent.id,
        })
        .returning();

      res.json({
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        amount: payment.amount,
      });
    } catch (error: any) {
      console.error('Create payment intent error:', error);
      res.status(500).json({ 
        error: 'Failed to create payment',
        message: error.message 
      });
    }
  });

  // Webhook to handle Stripe events
  app.post('/api/payments/webhook', async (req, res) => {
    try {
      const stripe = getStripeInstance();
      if (!stripe) {
        return res.status(503).json({ error: 'Payment gateway not configured' });
      }

      const sig = req.headers['stripe-signature'];
      if (!sig) {
        return res.status(400).json({ error: 'Missing signature' });
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET || ''
        );
      } catch (err: any) {
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          
          // Update payment status
          await db
            .update(payments)
            .set({
              paymentStatus: 'completed',
              paidAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(payments.transactionId, paymentIntent.id));

          // Update service request if applicable
          const serviceRequestId = paymentIntent.metadata?.serviceRequestId;
          if (serviceRequestId && serviceRequestId !== 'direct') {
            await db
              .update(serviceRequests)
              .set({
                status: 'in_progress',
                updatedAt: new Date(),
              })
              .where(eq(serviceRequests.id, parseInt(serviceRequestId)));
          }
          
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          
          await db
            .update(payments)
            .set({
              paymentStatus: 'failed',
              updatedAt: new Date(),
            })
            .where(eq(payments.transactionId, paymentIntent.id));
          
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Get payment history for a client
  app.get('/api/payments/client/:clientId', async (req, res) => {
    try {
      const clientId = req.params.clientId;

      // Get business entity
      const [entity] = await db
        .select()
        .from(businessEntities)
        .where(eq(businessEntities.clientId, clientId))
        .limit(1);

      if (!entity) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Get all payments for this client's service requests
      const clientPayments = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
          paymentStatus: payments.paymentStatus,
          transactionId: payments.transactionId,
          paidAt: payments.paidAt,
          createdAt: payments.createdAt,
          serviceRequestId: payments.serviceRequestId,
        })
        .from(payments)
        .leftJoin(serviceRequests, eq(payments.serviceRequestId, serviceRequests.id))
        .where(eq(serviceRequests.businessEntityId, entity.id))
        .orderBy(payments.createdAt);

      res.json(clientPayments);
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({ error: 'Failed to fetch payment history' });
    }
  });

  // Get payment details
  app.get('/api/payments/:id', async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);

      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.json(payment);
    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({ error: 'Failed to fetch payment' });
    }
  });

  // Generate invoice PDF (placeholder for future implementation)
  app.get('/api/payments/:id/invoice', async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);

      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      // TODO: Generate PDF invoice using a library like pdfkit or puppeteer
      // For now, return JSON invoice data
      res.json({
        invoiceNumber: `INV-${payment.id.toString().padStart(6, '0')}`,
        payment,
        message: 'PDF generation not yet implemented',
      });
    } catch (error) {
      console.error('Generate invoice error:', error);
      res.status(500).json({ error: 'Failed to generate invoice' });
    }
  });

  // Refund payment
  app.post('/api/payments/:id/refund', async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { amount, reason } = req.body;

      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.paymentStatus !== 'completed') {
        return res.status(400).json({ error: 'Can only refund completed payments' });
      }

      const stripe = getStripeInstance();
      if (!stripe) {
        return res.status(503).json({ error: 'Payment gateway not configured' });
      }

      // Create refund with Stripe
      const refund = await stripe.refunds.create({
        payment_intent: payment.transactionId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason || 'requested_by_customer',
      });

      // Update payment status
      await db
        .update(payments)
        .set({
          paymentStatus: amount ? 'partial' : 'refunded',
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId));

      res.json({
        success: true,
        refundId: refund.id,
        message: 'Refund processed successfully',
      });
    } catch (error: any) {
      console.error('Refund error:', error);
      res.status(500).json({ 
        error: 'Failed to process refund',
        message: error.message 
      });
    }
  });

  console.log('✅ Payment routes registered (Stripe integration ready)');
}
