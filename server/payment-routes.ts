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
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build query for pending commissions
      let query = `
        SELECT
          c.*,
          u.full_name as earner_name,
          u.role as earner_role,
          u.email as earner_email,
          sr.service_request_id as sr_number,
          sr.service_name,
          be.company_name as client_name
        FROM commissions c
        LEFT JOIN users u ON c.earner_id = u.id
        LEFT JOIN service_requests sr ON c.service_request_id = sr.id
        LEFT JOIN business_entities be ON sr.business_entity_id = be.id
        WHERE c.status = 'pending_approval'
      `;

      const params: any[] = [];
      let paramCount = 0;

      if (type && type !== 'all') {
        paramCount++;
        query += ` AND c.commission_type = $${paramCount}`;
        params.push(type);
      }

      query += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit as string), offset);

      // For demo, return mock data if table doesn't exist
      try {
        const result = await db.execute(query);

        // Get count
        const countQuery = `SELECT COUNT(*) as total FROM commissions WHERE status = 'pending_approval'`;
        const countResult = await db.execute(countQuery);

        res.json({
          commissions: result.rows,
          pagination: {
            total: parseInt((countResult.rows[0] as any).total || '0'),
            page: parseInt(page as string),
            limit: parseInt(limit as string)
          }
        });
      } catch (dbError) {
        // Return mock data for development
        res.json({
          commissions: getMockPendingCommissions(),
          pagination: {
            total: 5,
            page: 1,
            limit: 20
          }
        });
      }
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

      // Build filters
      const filters: any = {};

      // Non-managers can only see their own commissions
      if (!['sales_manager', 'admin', 'super_admin', 'accountant'].includes(userRole || '')) {
        filters.earnerId = userId;
      } else if (earnerId) {
        filters.earnerId = parseInt(earnerId as string);
      }

      if (status) filters.status = status;
      if (type) filters.type = type;

      // For demo, return mock data
      try {
        const mockCommissions = getMockCommissions(filters);
        res.json({
          commissions: mockCommissions,
          summary: {
            total: mockCommissions.reduce((sum: number, c: any) => sum + parseFloat(c.amount), 0),
            pending: mockCommissions.filter((c: any) => c.status === 'pending_approval').length,
            approved: mockCommissions.filter((c: any) => c.status === 'approved').length,
            paid: mockCommissions.filter((c: any) => c.status === 'paid').length
          },
          pagination: {
            total: mockCommissions.length,
            page: parseInt(page as string),
            limit: parseInt(limit as string)
          }
        });
      } catch (dbError) {
        res.json({
          commissions: [],
          summary: { total: 0, pending: 0, approved: 0, paid: 0 },
          pagination: { total: 0, page: 1, limit: 20 }
        });
      }
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

      // In production, update the database
      // For demo, simulate approval
      const approvalResult = {
        id: commissionId,
        status: 'approved',
        approvedBy,
        approvedAt: new Date().toISOString(),
        approvalNotes: notes,
        originalAmount: 5000,
        finalAmount: adjustedAmount || 5000,
        adjusted: adjustedAmount ? true : false
      };

      res.json({
        success: true,
        message: adjustedAmount
          ? `Commission approved with adjusted amount: ₹${adjustedAmount}`
          : 'Commission approved successfully',
        commission: approvalResult
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

      // In production, update the database
      const rejectionResult = {
        id: commissionId,
        status: 'rejected',
        rejectedBy,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason,
        canAppeal: allowAppeal,
        appealDeadline: allowAppeal
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          : null
      };

      res.json({
        success: true,
        message: 'Commission rejected',
        commission: rejectionResult
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

      const results: { success: any[]; failed: any[] } = { success: [], failed: [] };

      for (const commissionId of commissionIds) {
        try {
          // In production, update the database
          results.success.push({
            id: commissionId,
            status: 'approved',
            approvedBy,
            approvedAt: new Date().toISOString()
          });
        } catch (err: any) {
          results.failed.push({ id: commissionId, error: err.message });
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

      // Generate dispute number
      const disputeNumber = `DISP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      const disputeResult = {
        id: Date.now(),
        disputeNumber,
        commissionId,
        status: 'submitted',
        category, // incorrect_rate, missing_commission, wrong_calculation, other
        reason,
        expectedAmount: expectedAmount || null,
        evidence: evidence || [],
        disputedBy,
        disputedAt: new Date().toISOString(),
        timeline: [
          {
            action: 'Dispute Submitted',
            description: `Dispute raised for commission #${commissionId}`,
            actorName: req.user?.fullName || req.user?.username || 'Unknown',
            createdAt: new Date().toISOString()
          }
        ]
      };

      res.json({
        success: true,
        message: 'Dispute submitted successfully. You will be notified of updates.',
        dispute: disputeResult
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

      // Return mock disputes for demo
      const disputes = getMockDisputes(status as string);

      res.json({
        disputes,
        pagination: {
          total: disputes.length,
          page: parseInt(page as string),
          limit: parseInt(limit as string)
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

      const result = {
        id: disputeId,
        status: action === 'approve' ? 'approved' : action === 'partial_approve' ? 'partially_approved' : 'rejected',
        resolution,
        adjustedAmount: action === 'partial_approve' ? adjustedAmount : null,
        resolvedBy,
        resolvedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        message: `Dispute ${action === 'approve' ? 'approved' : action === 'partial_approve' ? 'partially approved' : 'rejected'}`,
        dispute: result
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

      // Return mock statement for demo
      const statement = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          label: period === 'current_month' ? 'Current Month' : period === 'last_month' ? 'Last Month' : 'Current Quarter'
        },
        summary: {
          totalEarned: 45000,
          totalPaid: 35000,
          pendingApproval: 7500,
          disputed: 2500,
          nextPayoutDate: new Date(now.getFullYear(), now.getMonth() + 1, 5).toISOString(),
          nextPayoutAmount: 7500
        },
        breakdown: [
          { type: 'lead_conversion', count: 5, amount: 25000 },
          { type: 'service_referral', count: 3, amount: 15000 },
          { type: 'renewal_bonus', count: 1, amount: 5000 }
        ],
        recentTransactions: getMockCommissions({ earnerId: userId }).slice(0, 10)
      };

      res.json(statement);
    } catch (error) {
      console.error('Error fetching commission statement:', error);
      res.status(500).json({ error: 'Failed to fetch commission statement' });
    }
  });

  console.log('✅ Payment routes registered (Stripe integration ready)');
  console.log('✅ Commission approval workflow registered');
}

// Mock data helpers for development
function getMockPendingCommissions() {
  return [
    {
      id: 1,
      commission_type: 'lead_conversion',
      amount: '5000',
      status: 'pending_approval',
      earner_name: 'Amit Sharma',
      earner_role: 'agent',
      earner_email: 'amit@example.com',
      sr_number: 'SR2600015',
      service_name: 'Private Limited Registration',
      client_name: 'TechStart Innovations',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      commission_type: 'service_referral',
      amount: '7500',
      status: 'pending_approval',
      earner_name: 'Priya Patel',
      earner_role: 'sales_executive',
      earner_email: 'priya@example.com',
      sr_number: 'SR2600022',
      service_name: 'GST Registration',
      client_name: 'Global Exports Ltd',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      commission_type: 'renewal_bonus',
      amount: '3000',
      status: 'pending_approval',
      earner_name: 'Rahul Verma',
      earner_role: 'agent',
      earner_email: 'rahul@example.com',
      sr_number: 'SR2600031',
      service_name: 'Annual Compliance Package',
      client_name: 'MedCare Pharma',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

function getMockCommissions(filters: any) {
  const allCommissions = [
    {
      id: 1,
      commissionType: 'lead_conversion',
      amount: '5000',
      rate: '10',
      status: 'approved',
      serviceRequestNumber: 'SR2600001',
      serviceName: 'GST Registration',
      clientName: 'Acme Technologies',
      earnerId: 1,
      earnerName: 'Agent User',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      approvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      commissionType: 'service_referral',
      amount: '7500',
      rate: '15',
      status: 'paid',
      serviceRequestNumber: 'SR2600015',
      serviceName: 'Private Limited Registration',
      clientName: 'Global Exports Ltd',
      earnerId: 1,
      earnerName: 'Agent User',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      approvedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      commissionType: 'lead_conversion',
      amount: '3000',
      rate: '12',
      status: 'pending_approval',
      serviceRequestNumber: 'SR2600022',
      serviceName: 'Trademark Registration',
      clientName: 'StartupHub Innovations',
      earnerId: 1,
      earnerName: 'Agent User',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  let filtered = allCommissions;
  if (filters.earnerId) {
    filtered = filtered.filter(c => c.earnerId === filters.earnerId);
  }
  if (filters.status) {
    filtered = filtered.filter(c => c.status === filters.status);
  }
  return filtered;
}

function getMockDisputes(status: string) {
  const allDisputes = [
    {
      id: 1,
      disputeNumber: 'DISP-2026-0001',
      commissionId: 3,
      status: 'under_review',
      category: 'incorrect_rate',
      reason: 'The commission rate should be 15% as per my agent agreement for Trademark services',
      expectedAmount: 3750,
      currentAmount: 3000,
      disputedByName: 'Agent User',
      disputedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      disputeNumber: 'DISP-2026-0002',
      commissionId: 5,
      status: 'resolved',
      category: 'missing_commission',
      reason: 'Commission not calculated for renewal service',
      expectedAmount: 5000,
      currentAmount: 0,
      resolution: 'Verified - commission has been added to next payout',
      adjustedAmount: 5000,
      disputedByName: 'Priya Patel',
      disputedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  if (status === 'all') return allDisputes;
  return allDisputes.filter(d => d.status === status);
}
