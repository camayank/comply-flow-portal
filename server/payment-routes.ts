import type { Express, Response } from "express";
import { db } from './db';
import { payments, serviceRequests, businessEntities, users, commissions, commissionDisputes, services, leads, agentPartners } from '@shared/schema';
import { eq, and, desc, or, sql, inArray, gte, lte } from 'drizzle-orm';
import Stripe from 'stripe';
import {
  sessionAuthMiddleware,
  requireRole,
  requireMinimumRole,
  USER_ROLES,
  type AuthenticatedRequest
} from './rbac-middleware';
import { parseIdParam } from './middleware/id-validator';

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

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getPeriodKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getPeriodLabel(date: Date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function normalizeLineItemStatus(status?: string) {
  if (!status) return 'pending';
  if (status === 'disputed') return 'disputed';
  if (status === 'rejected') return 'adjusted';
  if (status === 'approved' || status === 'paid') return 'approved';
  return 'pending';
}

async function maybeCreateCommissionForServiceRequest(serviceRequestId: number, paymentAmount?: number) {
  if (!serviceRequestId) return;

  const [existing] = await db
    .select({ id: commissions.id })
    .from(commissions)
    .where(eq(commissions.serviceRequestId, serviceRequestId))
    .limit(1);

  if (existing) return;

  const [serviceRequest] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, serviceRequestId))
    .limit(1);

  if (!serviceRequest || !serviceRequest.businessEntityId) return;

  const preferredAgentId = serviceRequest.assignedAgentId
    ? Number(serviceRequest.assignedAgentId)
    : null;

  const [entity] = await db
    .select()
    .from(businessEntities)
    .where(eq(businessEntities.id, serviceRequest.businessEntityId))
    .limit(1);

  if (!entity) return;

  let agentId: number | null = preferredAgentId;
  let leadId: number | null = null;

  if (!agentId) {
    const leadFilters = [];
    if (entity.contactEmail) leadFilters.push(eq(leads.contactEmail, entity.contactEmail));
    if (entity.contactPhone) leadFilters.push(eq(leads.contactPhone, entity.contactPhone));
    if (leadFilters.length === 0) return;

    const [lead] = await db
      .select()
      .from(leads)
      .where(and(sql`${leads.agentId} IS NOT NULL`, or(...leadFilters)))
      .orderBy(desc(leads.createdAt))
      .limit(1);

    if (!lead || !lead.agentId) return;
    agentId = Number(lead.agentId);
    leadId = lead.id;
  }

  const baseAmount = Number(paymentAmount ?? serviceRequest.totalAmount ?? 0);
  if (!baseAmount || Number.isNaN(baseAmount)) return;

  let commissionRate = 10;
  const [partner] = await db
    .select()
    .from(agentPartners)
    .where(eq(agentPartners.userId, agentId))
    .limit(1);

  if (partner?.commissionRate) {
    commissionRate = Number(partner.commissionRate);
  }

  const commissionAmount = Math.round(baseAmount * (commissionRate / 100) * 100) / 100;
  const payableOn = new Date();
  payableOn.setDate(payableOn.getDate() + 7);

  await db.insert(commissions).values({
    agentId,
    serviceRequestId,
    leadId: leadId || null,
    commissionType: 'lead_conversion',
    baseAmount: baseAmount.toFixed(2),
    commissionRate: commissionRate.toFixed(2),
    commissionAmount: commissionAmount.toFixed(2),
    status: 'pending_approval',
    payableOn,
    notes: `Auto-generated commission for ${serviceRequest.requestId || `SR-${serviceRequest.id}`}`,
  });

  if (partner?.id) {
    await db
      .update(agentPartners)
      .set({
        totalCommissionEarned: sql`${agentPartners.totalCommissionEarned} + ${commissionAmount}`,
        lastActivity: new Date(),
      })
      .where(eq(agentPartners.id, partner.id));
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

        await maybeCreateCommissionForServiceRequest(payment.serviceRequestId, Number(payment.amount));
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

          const [payment] = await db
            .select()
            .from(payments)
            .where(eq(payments.transactionId, paymentIntent.id))
            .limit(1);

          if (payment?.serviceRequestId) {
            await maybeCreateCommissionForServiceRequest(payment.serviceRequestId, Number(payment.amount));
          } else if (serviceRequestId && serviceRequestId !== 'direct') {
            await maybeCreateCommissionForServiceRequest(parseInt(serviceRequestId), paymentIntent.amount ? paymentIntent.amount / 100 : undefined);
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
  // Supports both numeric ID and readable ID (PAY26000001)
  app.get('/api/payments/:id', ...staffAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = parseIdParam(req.params.id);
      let payment;

      if (parsed.isNumeric) {
        [payment] = await db.select()
          .from(payments)
          .where(eq(payments.id, parsed.numericId!))
          .limit(1);
      } else {
        // Lookup by readable payment ID
        [payment] = await db.select()
          .from(payments)
          .where(eq(payments.paymentId, parsed.readableId!))
          .limit(1);
      }

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      // Include displayId for consistent frontend display
      res.json({
        ...payment,
        displayId: payment.paymentId || `PAY-${payment.id}`
      });
    } catch (error) {
      console.error('Get payment error:', error);
      res.status(500).json({ error: 'Failed to fetch payment' });
    }
  });

  // Generate invoice data (staff access)
  app.get('/api/payments/:id/invoice', ...staffAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { format = 'json' } = req.query;

      const { generateInvoiceData, generateInvoiceHTML } = await import('./services/invoice-generator');

      const invoiceData = await generateInvoiceData(paymentId);

      if (!invoiceData) {
        return res.status(404).json({ error: 'Payment not found or invoice data unavailable' });
      }

      // Return HTML for PDF generation or browser preview
      if (format === 'html') {
        const html = generateInvoiceHTML(invoiceData);
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }

      // Return JSON data for frontend rendering
      res.json(invoiceData);
    } catch (error) {
      console.error('Generate invoice error:', error);
      res.status(500).json({ error: 'Failed to generate invoice' });
    }
  });

  // Generate invoice HTML for client (client access)
  app.get('/api/client/payments/:id/invoice', ...clientAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const paymentId = parseInt(req.params.id);
      const userId = req.user?.id;
      const { format = 'json' } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify payment belongs to user
      const entityId = await getUserEntityId(userId);
      const [payment] = await db
        .select({
          id: payments.id,
          entityId: serviceRequests.businessEntityId
        })
        .from(payments)
        .leftJoin(serviceRequests, eq(payments.serviceRequestId, serviceRequests.id))
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.entityId && payment.entityId !== entityId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { generateInvoiceData, generateInvoiceHTML } = await import('./services/invoice-generator');

      const invoiceData = await generateInvoiceData(paymentId);

      if (!invoiceData) {
        return res.status(404).json({ error: 'Invoice data unavailable' });
      }

      // Return HTML for PDF generation or browser preview
      if (format === 'html') {
        const html = generateInvoiceHTML(invoiceData);
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }

      // Return JSON data for frontend rendering
      res.json(invoiceData);
    } catch (error) {
      console.error('Generate client invoice error:', error);
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

  // ==========================================================================
  // COMMISSION APPROVAL WORKFLOW - CRITICAL FOR AGENTS & SALES
  // ==========================================================================

  // Get commissions pending approval (Sales Manager / Finance)
  app.get('/api/commissions/pending-approval', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = '1', limit = '20', type } = req.query;
      const pageNumber = Math.max(1, parseInt(page as string) || 1);
      const limitNumber = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNumber - 1) * limitNumber;

      const filters = [inArray(commissions.status, ['pending', 'pending_approval'])];
      if (type && type !== 'all') {
        filters.push(eq(commissions.commissionType, String(type)));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      let query = db
        .select({
          id: commissions.id,
          commission_type: commissions.commissionType,
          amount: commissions.commissionAmount,
          status: commissions.status,
          created_at: commissions.createdAt,
          earner_name: users.fullName,
          earner_role: users.role,
          earner_email: users.email,
          sr_number: serviceRequests.requestId,
          service_name: services.name,
          client_name: businessEntities.name,
        })
        .from(commissions)
        .leftJoin(users, eq(commissions.agentId, users.id))
        .leftJoin(serviceRequests, eq(commissions.serviceRequestId, serviceRequests.id))
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .leftJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .orderBy(desc(commissions.createdAt))
        .limit(limitNumber)
        .offset(offset);

      if (whereClause) {
        query = query.where(whereClause) as any;
      }

      const [rows, countResult] = await Promise.all([
        query,
        whereClause
          ? db.select({ total: sql<number>`count(*)::int` }).from(commissions).where(whereClause)
          : db.select({ total: sql<number>`count(*)::int` }).from(commissions),
      ]);

      res.json({
        commissions: rows,
        pagination: {
          total: countResult[0]?.total || 0,
          page: pageNumber,
          limit: limitNumber,
        },
      });
    } catch (error) {
      console.error('Error fetching pending commissions:', error);
      res.status(500).json({ error: 'Failed to fetch pending commissions' });
    }
  });

  // Get all commissions with filtering
  app.get('/api/commissions', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.AGENT), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { status, type, earnerId, page = '1', limit = '20', startDate, endDate } = req.query;
      const pageNumber = Math.max(1, parseInt(page as string) || 1);
      const limitNumber = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNumber - 1) * limitNumber;

      const filters = [];

      // Non-managers can only see their own commissions
      if (!['sales_manager', 'admin', 'super_admin', 'accountant'].includes(userRole || '')) {
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        filters.push(eq(commissions.agentId, Number(userId)));
      } else if (earnerId) {
        filters.push(eq(commissions.agentId, parseInt(earnerId as string)));
      }

      if (status && status !== 'all') {
        filters.push(eq(commissions.status, String(status)));
      }
      if (type && type !== 'all') {
        filters.push(eq(commissions.commissionType, String(type)));
      }

      if (startDate) {
        const start = new Date(startDate as string);
        if (!Number.isNaN(start.getTime())) {
          filters.push(gte(commissions.createdAt, start));
        }
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if (!Number.isNaN(end.getTime())) {
          filters.push(lte(commissions.createdAt, end));
        }
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      let query = db
        .select({
          id: commissions.id,
          commissionType: commissions.commissionType,
          amount: commissions.commissionAmount,
          commissionAmount: commissions.commissionAmount,
          rate: commissions.commissionRate,
          status: commissions.status,
          serviceRequestNumber: serviceRequests.requestId,
          serviceName: services.name,
          clientName: businessEntities.name,
          earnerId: commissions.agentId,
          earnerName: users.fullName,
          createdAt: commissions.createdAt,
          approvedAt: commissions.approvedAt,
          paidAt: commissions.paidOn,
          payableOn: commissions.payableOn,
          adjustedAmount: commissions.adjustedAmount,
        })
        .from(commissions)
        .leftJoin(users, eq(commissions.agentId, users.id))
        .leftJoin(serviceRequests, eq(commissions.serviceRequestId, serviceRequests.id))
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .leftJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .orderBy(desc(commissions.createdAt))
        .limit(limitNumber)
        .offset(offset);

      if (whereClause) {
        query = query.where(whereClause) as any;
      }

      const [rows, countResult, statusCounts] = await Promise.all([
        query,
        whereClause
          ? db.select({ total: sql<number>`count(*)::int` }).from(commissions).where(whereClause)
          : db.select({ total: sql<number>`count(*)::int` }).from(commissions),
        whereClause
          ? db.select({
              status: commissions.status,
              count: sql<number>`count(*)::int`,
            })
              .from(commissions)
              .where(whereClause)
              .groupBy(commissions.status)
          : db
              .select({
                status: commissions.status,
                count: sql<number>`count(*)::int`,
              })
              .from(commissions)
              .groupBy(commissions.status),
      ]);

      const summary = { total: countResult[0]?.total || 0, pending: 0, approved: 0, paid: 0 };
      statusCounts.forEach((row) => {
        if (!row.status) return;
        if (['pending', 'pending_approval'].includes(row.status)) summary.pending += row.count;
        if (row.status === 'approved') summary.approved += row.count;
        if (row.status === 'paid') summary.paid += row.count;
      });

      res.json({
        commissions: rows,
        summary,
        pagination: { total: summary.total, page: pageNumber, limit: limitNumber },
      });
    } catch (error) {
      console.error('Error fetching commissions:', error);
      res.status(500).json({ error: 'Failed to fetch commissions' });
    }
  });

  // Approve commission (Sales Manager / Finance)
  app.patch('/api/commissions/:id/approve', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const commissionId = parseInt(req.params.id);
      const { notes, adjustedAmount } = req.body;
      const approvedBy = req.user?.id;

      const updates: Record<string, any> = {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        approvalNotes: notes || null,
        updatedAt: new Date(),
      };

      if (adjustedAmount !== undefined && adjustedAmount !== null) {
        updates.adjustedAmount = adjustedAmount;
        updates.commissionAmount = adjustedAmount;
      }

      const [updated] = await db
        .update(commissions)
        .set(updates)
        .where(eq(commissions.id, commissionId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Commission not found' });
      }

      res.json({
        success: true,
        message: adjustedAmount
          ? `Commission approved with adjusted amount: ₹${adjustedAmount}`
          : 'Commission approved successfully',
        commission: updated
      });
    } catch (error) {
      console.error('Error approving commission:', error);
      res.status(500).json({ error: 'Failed to approve commission' });
    }
  });

  // Reject commission (Sales Manager / Finance)
  app.patch('/api/commissions/:id/reject', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const commissionId = parseInt(req.params.id);
      const { reason, allowAppeal = true } = req.body;
      const rejectedBy = req.user?.id;

      if (!reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const [updated] = await db
        .update(commissions)
        .set({
          status: 'rejected',
          rejectedBy,
          rejectedAt: new Date(),
          rejectionReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(commissions.id, commissionId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Commission not found' });
      }

      res.json({
        success: true,
        message: 'Commission rejected',
        commission: {
          ...updated,
          canAppeal: allowAppeal,
          appealDeadline: allowAppeal
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : null
        }
      });
    } catch (error) {
      console.error('Error rejecting commission:', error);
      res.status(500).json({ error: 'Failed to reject commission' });
    }
  });

  // Bulk approve commissions (Sales Manager / Finance)
  app.post('/api/commissions/bulk-approve', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { commissionIds, notes } = req.body;
      const approvedBy = req.user?.id;

      if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
        return res.status(400).json({ error: 'commissionIds array is required' });
      }

      const updated = await db
        .update(commissions)
        .set({
          status: 'approved',
          approvedBy,
          approvedAt: new Date(),
          approvalNotes: notes || null,
          updatedAt: new Date(),
        })
        .where(inArray(commissions.id, commissionIds))
        .returning({ id: commissions.id });

      const updatedIds = new Set(updated.map(row => row.id));
      const results: { success: any[]; failed: any[] } = { success: [], failed: [] };

      for (const commissionId of commissionIds) {
        if (updatedIds.has(commissionId)) {
          results.success.push({
            id: commissionId,
            status: 'approved',
            approvedBy,
            approvedAt: new Date().toISOString()
          });
        } else {
          results.failed.push({ id: commissionId, error: 'Not found or not updated' });
        }
      }

      res.json({
        success: true,
        message: `Approved ${results.success.length} of ${commissionIds.length} commissions`,
        results
      });
    } catch (error) {
      console.error('Error bulk approving commissions:', error);
      res.status(500).json({ error: 'Failed to bulk approve commissions' });
    }
  });

  // Submit commission dispute (Agent / Sales Executive)
  app.post('/api/commissions/:id/dispute', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.AGENT), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const commissionId = parseInt(req.params.id);
      const { reason, category, expectedAmount, evidence } = req.body;
      const disputedBy = req.user?.id;

      if (!reason) {
        return res.status(400).json({ error: 'Dispute reason is required' });
      }

      if (!category) {
        return res.status(400).json({ error: 'Dispute category is required' });
      }

      const [commission] = await db
        .select()
        .from(commissions)
        .where(eq(commissions.id, commissionId));

      if (!commission) {
        return res.status(404).json({ error: 'Commission not found' });
      }

      if (req.user?.role === USER_ROLES.AGENT && commission.agentId !== disputedBy) {
        return res.status(403).json({ error: 'You can only dispute your own commissions' });
      }

      // Generate dispute number
      const disputeNumber = `DISP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const now = new Date();

      const timeline = [
        {
          action: 'Dispute Submitted',
          description: `Dispute raised for commission #${commissionId}`,
          actorName: req.user?.fullName || req.user?.username || 'Unknown',
          actorRole: req.user?.role || 'agent',
          createdAt: now.toISOString(),
        }
      ];

      const [dispute] = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(commissionDisputes)
          .values({
            disputeNumber,
            commissionId,
            status: 'submitted',
            category,
            reason,
            expectedAmount: expectedAmount || null,
            evidence: evidence || [],
            disputedBy: disputedBy || 0,
            disputedAt: now,
            timeline,
          })
          .returning();

        await tx
          .update(commissions)
          .set({ status: 'disputed', updatedAt: now })
          .where(eq(commissions.id, commissionId));

        return [created];
      });

      res.json({
        success: true,
        message: 'Dispute submitted successfully. You will be notified of updates.',
        dispute
      });
    } catch (error) {
      console.error('Error submitting dispute:', error);
      res.status(500).json({ error: 'Failed to submit dispute' });
    }
  });

  // Get commission disputes (Sales Manager / Finance)
  app.get('/api/commissions/disputes', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status = 'all', page = '1', limit = '20' } = req.query;
      const pageNumber = Math.max(1, parseInt(page as string) || 1);
      const limitNumber = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offset = (pageNumber - 1) * limitNumber;

      const filters = [];
      if (status && status !== 'all') {
        filters.push(eq(commissionDisputes.status, String(status)));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      let query = db
        .select({
          id: commissionDisputes.id,
          disputeNumber: commissionDisputes.disputeNumber,
          commissionId: commissionDisputes.commissionId,
          status: commissionDisputes.status,
          category: commissionDisputes.category,
          reason: commissionDisputes.reason,
          expectedAmount: commissionDisputes.expectedAmount,
          evidence: commissionDisputes.evidence,
          disputedBy: commissionDisputes.disputedBy,
          disputedAt: commissionDisputes.disputedAt,
          resolvedBy: commissionDisputes.resolvedBy,
          resolvedAt: commissionDisputes.resolvedAt,
          resolution: commissionDisputes.resolution,
          action: commissionDisputes.action,
          adjustedAmount: commissionDisputes.adjustedAmount,
          timeline: commissionDisputes.timeline,
          commissionAmount: commissions.commissionAmount,
          commissionType: commissions.commissionType,
          serviceRequestNumber: serviceRequests.requestId,
          serviceName: services.name,
          clientName: businessEntities.name,
          disputedByName: users.fullName,
        })
        .from(commissionDisputes)
        .leftJoin(commissions, eq(commissionDisputes.commissionId, commissions.id))
        .leftJoin(users, eq(commissionDisputes.disputedBy, users.id))
        .leftJoin(serviceRequests, eq(commissions.serviceRequestId, serviceRequests.id))
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .leftJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .orderBy(desc(commissionDisputes.createdAt))
        .limit(limitNumber)
        .offset(offset);

      if (whereClause) {
        query = query.where(whereClause) as any;
      }

      const [rows, countResult] = await Promise.all([
        query,
        whereClause
          ? db.select({ total: sql<number>`count(*)::int` }).from(commissionDisputes).where(whereClause)
          : db.select({ total: sql<number>`count(*)::int` }).from(commissionDisputes),
      ]);

      res.json({
        disputes: rows,
        pagination: {
          total: countResult[0]?.total || 0,
          page: pageNumber,
          limit: limitNumber,
        }
      });
    } catch (error) {
      console.error('Error fetching disputes:', error);
      res.status(500).json({ error: 'Failed to fetch disputes' });
    }
  });

  // Resolve commission dispute (Sales Manager / Finance)
  app.patch('/api/commissions/disputes/:id/resolve', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.SALES_MANAGER), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const disputeId = parseInt(req.params.id);
      const { resolution, action, adjustedAmount } = req.body;
      const resolvedBy = req.user?.id;

      if (!resolution) {
        return res.status(400).json({ error: 'Resolution is required' });
      }

      if (!action || !['approve', 'partial_approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Valid action is required (approve, partial_approve, reject)' });
      }

      const [existing] = await db
        .select()
        .from(commissionDisputes)
        .where(eq(commissionDisputes.id, disputeId));

      if (!existing) {
        return res.status(404).json({ error: 'Dispute not found' });
      }

      const now = new Date();
      const status =
        action === 'approve'
          ? 'approved'
          : action === 'partial_approve'
            ? 'partially_approved'
            : 'rejected';

      const timeline = Array.isArray(existing.timeline) ? existing.timeline : [];
      timeline.push({
        action: `Dispute ${status.replace('_', ' ')}`,
        description: resolution,
        actorName: req.user?.fullName || req.user?.username || 'System',
        actorRole: req.user?.role || 'admin',
        createdAt: now.toISOString(),
      });

      const [updatedDispute] = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(commissionDisputes)
          .set({
            status,
            resolution,
            action,
            adjustedAmount: action === 'partial_approve' ? adjustedAmount : null,
            resolvedBy,
            resolvedAt: now,
            timeline,
            updatedAt: now,
          })
          .where(eq(commissionDisputes.id, disputeId))
          .returning();

        // Update underlying commission
        const commissionUpdates: Record<string, any> = {
          status: action === 'reject' ? 'rejected' : 'approved',
          updatedAt: now,
        };

        if (action === 'partial_approve') {
          commissionUpdates.adjustedAmount = adjustedAmount || null;
          if (adjustedAmount !== undefined && adjustedAmount !== null) {
            commissionUpdates.commissionAmount = adjustedAmount;
          }
        }

        if (action === 'reject') {
          commissionUpdates.rejectedBy = resolvedBy;
          commissionUpdates.rejectedAt = now;
          commissionUpdates.rejectionReason = resolution;
        } else {
          commissionUpdates.approvedBy = resolvedBy;
          commissionUpdates.approvedAt = now;
          commissionUpdates.approvalNotes = resolution;
        }

        await tx
          .update(commissions)
          .set(commissionUpdates)
          .where(eq(commissions.id, existing.commissionId));

        return [updated];
      });

      res.json({
        success: true,
        message: `Dispute ${action === 'approve' ? 'approved' : action === 'partial_approve' ? 'partially approved' : 'rejected'}`,
        dispute: updatedDispute
      });
    } catch (error) {
      console.error('Error resolving dispute:', error);
      res.status(500).json({ error: 'Failed to resolve dispute' });
    }
  });

  // Get commission summary/statement for agent
  app.get('/api/agent/commission-statement', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.AGENT), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { period = 'current_month' } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Calculate period dates
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      if (period === 'current_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === 'last_month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      } else if (period === 'current_quarter') {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const rows = await db
        .select({
          id: commissions.id,
          commissionAmount: commissions.commissionAmount,
          status: commissions.status,
          createdAt: commissions.createdAt,
          payableOn: commissions.payableOn,
          paidOn: commissions.paidOn,
          serviceRequestNumber: serviceRequests.requestId,
          serviceName: services.name,
          clientName: businessEntities.name,
        })
        .from(commissions)
        .leftJoin(serviceRequests, eq(commissions.serviceRequestId, serviceRequests.id))
        .leftJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .where(and(
          eq(commissions.agentId, Number(userId)),
          gte(commissions.createdAt, startDate),
          lte(commissions.createdAt, endDate),
        ))
        .orderBy(desc(commissions.createdAt));

      const toNumber = (value: any) => Number(value || 0);

      const totalEarned = rows.reduce((sum, r) => sum + toNumber(r.commissionAmount), 0);
      const totalPaid = rows
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + toNumber(r.commissionAmount), 0);
      const pendingApproval = rows
        .filter(r => ['pending', 'pending_approval'].includes(r.status || 'pending'))
        .reduce((sum, r) => sum + toNumber(r.commissionAmount), 0);
      const disputed = rows
        .filter(r => r.status === 'disputed')
        .reduce((sum, r) => sum + toNumber(r.commissionAmount), 0);

      const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);
      const nextPayoutAmount = rows
        .filter(r => r.status === 'approved' && !r.paidOn)
        .reduce((sum, r) => sum + toNumber(r.commissionAmount), 0);

      res.json({
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          label: period === 'current_month' ? 'Current Month' : period === 'last_month' ? 'Last Month' : 'Current Quarter'
        },
        summary: {
          totalEarned,
          totalPaid,
          pendingApproval,
          disputed,
          nextPayoutDate: nextPayoutDate.toISOString(),
          nextPayoutAmount
        },
        breakdown: [
          { status: 'pending', amount: pendingApproval },
          { status: 'approved', amount: rows.filter(r => r.status === 'approved').reduce((sum, r) => sum + toNumber(r.commissionAmount), 0) },
          { status: 'paid', amount: totalPaid },
          { status: 'disputed', amount: disputed },
        ],
        recentTransactions: rows.slice(0, 10).map(r => ({
          id: r.id,
          serviceRequestNumber: r.serviceRequestNumber,
          serviceName: r.serviceName,
          clientName: r.clientName,
          amount: r.commissionAmount,
          status: r.status,
          createdAt: r.createdAt,
          paidOn: r.paidOn,
          payableOn: r.payableOn,
        }))
      });
    } catch (error) {
      console.error('Error fetching commission statement:', error);
      res.status(500).json({ error: 'Failed to fetch commission statement' });
    }
  });

  // Commission statements for disputes (agent)
  app.get('/api/agent/commission-statements', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.AGENT), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const commissionRows = await db
        .select({
          id: commissions.id,
          commissionAmount: commissions.commissionAmount,
          commissionRate: commissions.commissionRate,
          status: commissions.status,
          createdAt: commissions.createdAt,
          serviceRequestId: commissions.serviceRequestId,
          serviceRequestNumber: serviceRequests.requestId,
          serviceValue: serviceRequests.totalAmount,
          serviceName: services.name,
          serviceId: serviceRequests.serviceId,
          clientName: businessEntities.name,
          clientId: businessEntities.clientId,
          completedAt: serviceRequests.actualCompletion,
          updatedAt: serviceRequests.updatedAt,
        })
        .from(commissions)
        .leftJoin(serviceRequests, eq(commissions.serviceRequestId, serviceRequests.id))
        .leftJoin(services, eq(serviceRequests.serviceId, services.serviceId))
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .where(eq(commissions.agentId, Number(userId)))
        .orderBy(desc(commissions.createdAt));

      const commissionIds = commissionRows.map((row) => row.id);
      const disputeRows = commissionIds.length > 0
        ? await db
            .select({
              id: commissionDisputes.id,
              commissionId: commissionDisputes.commissionId,
              disputedAt: commissionDisputes.disputedAt,
            })
            .from(commissionDisputes)
            .where(inArray(commissionDisputes.commissionId, commissionIds))
        : [];

      const disputeMap = new Map<number, { id: number; disputedAt?: Date | null }>();
      for (const dispute of disputeRows) {
        const existing = disputeMap.get(dispute.commissionId);
        if (!existing || (dispute.disputedAt && existing.disputedAt && dispute.disputedAt > existing.disputedAt)) {
          disputeMap.set(dispute.commissionId, dispute);
        }
      }

      const statementsMap = new Map<string, any>();
      const nowIso = new Date().toISOString();

      for (const row of commissionRows) {
        const createdAt = row.createdAt ? new Date(row.createdAt) : new Date();
        const periodKey = getPeriodKey(createdAt);
        const statementId = `stmt-${periodKey}`;

        if (!statementsMap.has(periodKey)) {
          statementsMap.set(periodKey, {
            id: statementId,
            period: periodKey,
            periodLabel: getPeriodLabel(createdAt),
            totalCommission: 0,
            totalPaid: 0,
            totalPending: 0,
            totalDisputed: 0,
            lineItems: [],
            status: 'finalized',
            generatedAt: nowIso,
          });
        }

        const statement = statementsMap.get(periodKey);
        const commissionAmount = Number(row.commissionAmount || 0);
        const lineStatus = normalizeLineItemStatus(row.status);

        statement.totalCommission += commissionAmount;
        if (row.status === 'paid') statement.totalPaid += commissionAmount;
        if (row.status === 'disputed') statement.totalDisputed += commissionAmount;
        if (['pending', 'pending_approval'].includes(row.status || '')) statement.totalPending += commissionAmount;

        const dispute = disputeMap.get(row.id);

        statement.lineItems.push({
          id: String(row.id),
          statementId,
          clientName: row.clientName || 'Client',
          clientId: row.clientId || '',
          serviceType: row.serviceName || row.serviceId || 'Service',
          serviceRequestId: row.serviceRequestId ? String(row.serviceRequestId) : '',
          serviceRequestNumber: row.serviceRequestNumber || '',
          serviceValue: Number(row.serviceValue || 0),
          commissionRate: Number(row.commissionRate || 0),
          commissionAmount,
          status: lineStatus,
          disputeId: dispute ? String(dispute.id) : undefined,
          completedAt: row.completedAt
            ? new Date(row.completedAt).toISOString()
            : row.updatedAt
              ? new Date(row.updatedAt).toISOString()
              : nowIso,
        });
      }

      const statements = Array.from(statementsMap.values()).map((statement) => {
        if (statement.totalCommission === 0) {
          statement.status = 'draft';
        } else if (statement.totalPaid >= statement.totalCommission) {
          statement.status = 'paid';
        } else if (statement.totalPaid > 0) {
          statement.status = 'partial_paid';
        } else if (statement.totalPending > 0 || statement.totalDisputed > 0) {
          statement.status = 'draft';
        } else {
          statement.status = 'finalized';
        }
        return statement;
      });

      statements.sort((a, b) => b.period.localeCompare(a.period));

      res.json(statements);
    } catch (error) {
      console.error('Error fetching commission statements:', error);
      res.status(500).json({ error: 'Failed to fetch commission statements' });
    }
  });

  // Agent commission disputes list
  app.get('/api/agent/commission-disputes', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.AGENT), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { status = 'all' } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const filters = [eq(commissions.agentId, Number(userId))];
      if (status && status !== 'all') {
        filters.push(eq(commissionDisputes.status, String(status)));
      }

      const rows = await db
        .select({
          id: commissionDisputes.id,
          disputeNumber: commissionDisputes.disputeNumber,
          commissionId: commissionDisputes.commissionId,
          status: commissionDisputes.status,
          category: commissionDisputes.category,
          reason: commissionDisputes.reason,
          expectedAmount: commissionDisputes.expectedAmount,
          evidence: commissionDisputes.evidence,
          disputedAt: commissionDisputes.disputedAt,
          resolvedAt: commissionDisputes.resolvedAt,
          resolvedBy: commissionDisputes.resolvedBy,
          resolution: commissionDisputes.resolution,
          adjustedAmount: commissionDisputes.adjustedAmount,
          timeline: commissionDisputes.timeline,
          commissionAmount: commissions.commissionAmount,
          serviceRequestNumber: serviceRequests.requestId,
          clientName: businessEntities.name,
        })
        .from(commissionDisputes)
        .leftJoin(commissions, eq(commissionDisputes.commissionId, commissions.id))
        .leftJoin(serviceRequests, eq(commissions.serviceRequestId, serviceRequests.id))
        .leftJoin(businessEntities, eq(serviceRequests.businessEntityId, businessEntities.id))
        .where(and(...filters))
        .orderBy(desc(commissionDisputes.disputedAt));

      const disputes = rows.map((row) => {
        const submittedAt = row.disputedAt ? new Date(row.disputedAt) : new Date();
        const statementId = `stmt-${getPeriodKey(submittedAt)}`;
        const originalAmount = Number(row.commissionAmount || 0);
        const disputedAmount = Number(row.expectedAmount || row.commissionAmount || 0);
        const approvedAmount = row.adjustedAmount !== null && row.adjustedAmount !== undefined
          ? Number(row.adjustedAmount)
          : row.status === 'approved'
            ? originalAmount
            : null;

        return {
          id: String(row.id),
          disputeNumber: row.disputeNumber,
          statementId,
          lineItemId: String(row.commissionId),
          clientName: row.clientName || 'Client',
          serviceRequestNumber: row.serviceRequestNumber || '',
          originalAmount,
          disputedAmount,
          reason: row.reason,
          category: row.category,
          status: row.status,
          approvedAmount,
          resolution: row.resolution || null,
          submittedAt: submittedAt.toISOString(),
          resolvedAt: row.resolvedAt ? new Date(row.resolvedAt).toISOString() : null,
          resolvedBy: row.resolvedBy ? `User ${row.resolvedBy}` : null,
          attachments: Array.isArray(row.evidence) ? row.evidence : [],
          timeline: Array.isArray(row.timeline) ? row.timeline : [],
        };
      });

      res.json(disputes);
    } catch (error) {
      console.error('Error fetching agent disputes:', error);
      res.status(500).json({ error: 'Failed to fetch disputes' });
    }
  });

  // Submit commission dispute (agent)
  app.post('/api/agent/commission-disputes', sessionAuthMiddleware, requireMinimumRole(USER_ROLES.AGENT), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { commissionId, lineItemId, reason, category, expectedAmount, evidence } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!reason || !category) {
        return res.status(400).json({ error: 'Reason and category are required' });
      }

      const rawId = commissionId ?? lineItemId;
      const parsedId = typeof rawId === 'string'
        ? parseInt(rawId.replace(/[^\d]/g, ''), 10)
        : Number(rawId);

      if (!parsedId || Number.isNaN(parsedId)) {
        return res.status(400).json({ error: 'Invalid commission id' });
      }

      const [commission] = await db
        .select()
        .from(commissions)
        .where(and(eq(commissions.id, parsedId), eq(commissions.agentId, Number(userId))))
        .limit(1);

      if (!commission) {
        return res.status(404).json({ error: 'Commission not found' });
      }

      const disputeNumber = `DISP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const now = new Date();

      const timeline = [
        {
          action: 'Dispute Submitted',
          description: `Dispute raised for commission #${parsedId}`,
          actorName: req.user?.fullName || req.user?.username || 'Unknown',
          actorRole: req.user?.role || 'agent',
          createdAt: now.toISOString(),
        }
      ];

      const [dispute] = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(commissionDisputes)
          .values({
            disputeNumber,
            commissionId: parsedId,
            status: 'submitted',
            category,
            reason,
            expectedAmount: expectedAmount || null,
            evidence: evidence || [],
            disputedBy: Number(userId),
            disputedAt: now,
            timeline,
          })
          .returning();

        await tx
          .update(commissions)
          .set({ status: 'disputed', updatedAt: now })
          .where(eq(commissions.id, parsedId));

        return [created];
      });

      res.json({
        success: true,
        message: 'Dispute submitted successfully. You will be notified of updates.',
        dispute
      });
    } catch (error) {
      console.error('Error submitting agent dispute:', error);
      res.status(500).json({ error: 'Failed to submit dispute' });
    }
  });

  console.log('✅ Payment routes registered (Stripe integration ready)');
  console.log('✅ Commission approval workflow registered');
}
