import type { Express, Response } from "express";
import { db } from './db';
import { payments, serviceRequests, businessEntities, users } from '@shared/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import Stripe from 'stripe';
import {
  sessionAuthMiddleware,
  requireRole,
  requireMinimumRole,
  USER_ROLES,
  type AuthenticatedRequest
} from './rbac-middleware';

// Client authentication middleware
const clientAuth = [sessionAuthMiddleware, requireRole(USER_ROLES.CLIENT)] as const;
const staffAuth = [sessionAuthMiddleware, requireMinimumRole(USER_ROLES.OPS_EXECUTIVE)] as const;

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

// Helper to get user's business entity ID
async function getUserEntityId(userId: number): Promise<number | null> {
  try {
    const [entity] = await db
      .select()
      .from(businessEntities)
      .where(or(
        eq(businessEntities.primaryContactId, userId),
        eq(businessEntities.clientId, `U${userId}`)
      ));
    return entity?.id || null;
  } catch (error) {
    console.error('Error getting user entity ID:', error);
    return null;
  }
}

export function registerPaymentRoutes(app: Express) {

  // ==========================================================================
  // CLIENT PAYMENT ENDPOINTS - Authenticated client access
  // ==========================================================================

  // Get pending payments for authenticated client
  app.get('/api/client/payments/pending', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const entityId = await getUserEntityId(userId);
      if (!entityId) {
        return res.json([]);
      }

      // Get service requests with pending payments
      const pendingRequests = await db
        .select({
          id: serviceRequests.id,
          serviceType: serviceRequests.serviceType,
          serviceName: serviceRequests.serviceName,
          status: serviceRequests.status,
          totalAmount: serviceRequests.totalAmount,
          createdAt: serviceRequests.createdAt,
        })
        .from(serviceRequests)
        .where(and(
          eq(serviceRequests.businessEntityId, entityId),
          eq(serviceRequests.status, 'pending_payment')
        ))
        .orderBy(desc(serviceRequests.createdAt));

      res.json(pendingRequests);
    } catch (error) {
      console.error('Get pending payments error:', error);
      res.status(500).json({ error: 'Failed to fetch pending payments' });
    }
  });

  // Get payment history for authenticated client
  app.get('/api/client/payments/history', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const entityId = await getUserEntityId(userId);
      if (!entityId) {
        return res.json([]);
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
          serviceName: serviceRequests.serviceName,
        })
        .from(payments)
        .leftJoin(serviceRequests, eq(payments.serviceRequestId, serviceRequests.id))
        .where(eq(serviceRequests.businessEntityId, entityId))
        .orderBy(desc(payments.createdAt));

      res.json(clientPayments);
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({ error: 'Failed to fetch payment history' });
    }
  });

  // Initiate payment for a service request (client)
  app.post('/api/client/payments/initiate', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { serviceRequestId, amount, paymentMethod = 'card' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const entityId = await getUserEntityId(userId);

      // Verify service request belongs to user if provided
      if (serviceRequestId) {
        const [request] = await db
          .select()
          .from(serviceRequests)
          .where(and(
            eq(serviceRequests.id, serviceRequestId),
            eq(serviceRequests.businessEntityId, entityId!)
          ))
          .limit(1);

        if (!request) {
          return res.status(403).json({ error: 'Service request not found or access denied' });
        }
      }

      const stripe = getStripeInstance();

      // If Stripe is not configured, create a simulation payment record
      if (!stripe) {
        // Create a simulated payment record for demo/development
        const [payment] = await db
          .insert(payments)
          .values({
            serviceRequestId: serviceRequestId || null,
            amount: amount.toString(),
            paymentMethod: paymentMethod,
            paymentStatus: 'pending',
            transactionId: `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          })
          .returning();

        return res.json({
          paymentId: payment.id,
          mode: 'simulation',
          message: 'Payment gateway not configured - running in simulation mode',
          simulationUrl: `/api/client/payments/${payment.id}/simulate-success`
        });
      }

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to smallest currency unit (paise)
        currency: 'inr',
        metadata: {
          serviceRequestId: serviceRequestId?.toString() || 'direct',
          userId: userId.toString(),
        },
      });

      // Record payment in database
      const [payment] = await db
        .insert(payments)
        .values({
          serviceRequestId: serviceRequestId || null,
          amount: amount.toString(),
          paymentMethod: paymentMethod,
          paymentStatus: 'pending',
          transactionId: paymentIntent.id,
        })
        .returning();

      res.json({
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        amount: payment.amount,
        mode: 'live'
      });
    } catch (error: any) {
      console.error('Initiate payment error:', error);
      res.status(500).json({
        error: 'Failed to initiate payment',
        message: error.message
      });
    }
  });

  // Simulate successful payment (for demo/development when Stripe not configured)
  app.post('/api/client/payments/:id/simulate-success', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const paymentId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get payment
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      // Only allow simulation for simulated payments
      if (!payment.transactionId?.startsWith('SIM_')) {
        return res.status(400).json({ error: 'Cannot simulate real payments' });
      }

      // Update payment status to completed
      await db
        .update(payments)
        .set({
          paymentStatus: 'completed',
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId));

      // Update service request status if applicable
      if (payment.serviceRequestId) {
        await db
          .update(serviceRequests)
          .set({
            status: 'in_progress',
            updatedAt: new Date(),
          })
          .where(eq(serviceRequests.id, payment.serviceRequestId));
      }

      res.json({
        success: true,
        message: 'Payment simulated successfully',
        paymentId: payment.id,
        status: 'completed'
      });
    } catch (error) {
      console.error('Simulate payment error:', error);
      res.status(500).json({ error: 'Failed to simulate payment' });
    }
  });

  // Get payment receipt/details (client)
  app.get('/api/client/payments/:id', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const paymentId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const entityId = await getUserEntityId(userId);

      // Get payment with service request to verify ownership
      const [payment] = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
          paymentStatus: payments.paymentStatus,
          transactionId: payments.transactionId,
          paidAt: payments.paidAt,
          createdAt: payments.createdAt,
          serviceRequestId: payments.serviceRequestId,
          serviceName: serviceRequests.serviceName,
          entityId: serviceRequests.businessEntityId,
        })
        .from(payments)
        .leftJoin(serviceRequests, eq(payments.serviceRequestId, serviceRequests.id))
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      // Verify ownership
      if (payment.entityId && payment.entityId !== entityId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({
        ...payment,
        invoiceNumber: `INV-${payment.id.toString().padStart(6, '0')}`,
      });
    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({ error: 'Failed to fetch payment details' });
    }
  });

  // ==========================================================================
  // STAFF/ADMIN PAYMENT ENDPOINTS
  // ==========================================================================

  // Create payment intent for service (staff - for creating payments on behalf of clients)
  app.post('/api/payments/create-intent', ...staffAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { serviceRequestId, amount, currency = 'inr' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const stripe = getStripeInstance();
      if (!stripe) {
        // Create simulation record for demo
        const [payment] = await db
          .insert(payments)
          .values({
            serviceRequestId: serviceRequestId || null,
            amount: amount.toString(),
            paymentMethod: 'stripe',
            paymentStatus: 'pending',
            transactionId: `SIM_STAFF_${Date.now()}`,
          })
          .returning();

        return res.json({
          paymentId: payment.id,
          mode: 'simulation',
          message: 'Payment gateway not configured - simulation mode'
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
        mode: 'live'
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

  // Get payment history for a client (staff access)
  app.get('/api/payments/client/:clientId', ...staffAuth, async (req: AuthenticatedRequest, res: Response) => {
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

  // Get payment details (staff access)
  app.get('/api/payments/:id', ...staffAuth, async (req: AuthenticatedRequest, res: Response) => {
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

  // Generate invoice PDF (staff access)
  app.get('/api/payments/:id/invoice', ...staffAuth, async (req: AuthenticatedRequest, res: Response) => {
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

  // Refund payment (staff access - requires accountant or higher)
  app.post('/api/payments/:id/refund', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.ACCOUNTANT), async (req: AuthenticatedRequest, res: Response) => {
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
