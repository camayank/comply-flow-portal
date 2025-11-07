/**
 * Payment Routes
 * Razorpay payment processing
 */

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import {
  createPaymentOrder,
  verifyPaymentSignature,
  saveTransaction,
  updateTransactionStatus,
  verifyWebhookSignature,
} from '../services/paymentService';
import { paymentLogger } from '../config/logger';

const router = Router();

router.use(apiLimiter);

/**
 * POST /api/v1/payments/create-order
 * Create Razorpay order
 */
router.post('/create-order', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { amount, currency, receipt, notes } = req.body;

  if (!amount || !receipt) {
    throw new ValidationError('Amount and receipt are required');
  }

  const order = await createPaymentOrder({
    amount,
    currency: currency || 'INR',
    receipt,
    notes: { userId: req.userId, ...notes },
  });

  res.json({
    success: true,
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    },
  });
}));

/**
 * POST /api/v1/payments/verify
 * Verify payment signature
 */
router.post('/verify', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ValidationError('Order ID, payment ID, and signature are required');
  }

  const isValid = verifyPaymentSignature({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!isValid) {
    throw new ValidationError('Invalid payment signature');
  }

  // Save transaction
  await saveTransaction({
    transactionId: razorpay_payment_id,
    amount: 0, // Get from order
    status: 'success',
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
  });

  res.json({
    success: true,
    message: 'Payment verified successfully',
  });
}));

/**
 * POST /api/v1/payments/webhook
 * Razorpay webhook handler
 */
router.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const payload = JSON.stringify(req.body);

  const isValid = verifyWebhookSignature(payload, signature);

  if (!isValid) {
    throw new ValidationError('Invalid webhook signature');
  }

  const event = req.body.event;
  const paymentEntity = req.body.payload.payment.entity;

  paymentLogger.info('Webhook received:', { event, paymentId: paymentEntity.id });

  // Handle different events
  switch (event) {
    case 'payment.captured':
      await updateTransactionStatus(paymentEntity.id, 'success');
      break;
    case 'payment.failed':
      await updateTransactionStatus(paymentEntity.id, 'failed');
      break;
    default:
      paymentLogger.info('Unhandled webhook event:', event);
  }

  res.json({ success: true });
}));

/**
 * GET /api/v1/payments/history
 * Get payment history
 */
router.get('/history', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { page = 1, limit = 20 } = req.query;

  const offset = (Number(page) - 1) * Number(limit);

  const result = await pool.query(
    `SELECT t.*, i.invoice_number, i.total_amount
     FROM transactions t
     LEFT JOIN invoices i ON t.invoice_id = i.id
     LEFT JOIN clients c ON i.client_id = c.id
     WHERE c.user_id = $1
     ORDER BY t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  res.json({
    success: true,
    data: result.rows,
  });
}));

export default router;
