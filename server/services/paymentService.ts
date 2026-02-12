/**
 * Payment Service
 * Razorpay integration for payments
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { pool } from '../config/database';
import { logger, paymentLogger } from '../config/logger';

// Initialize Razorpay
const razorpay = process.env.RAZORPAY_ENABLED === 'true' && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

export interface CreateOrderOptions {
  amount: number; // in INR
  currency?: string;
  receipt: string;
  notes?: Record<string, any>;
}

export interface VerifyPaymentOptions {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Create Razorpay order
 */
export async function createPaymentOrder(options: CreateOrderOptions): Promise<any> {
  try {
    // Mock payment in development if configured (check FIRST before razorpay null check)
    if (process.env.MOCK_PAYMENT === 'true') {
      const mockOrder = {
        id: `order_mock_${Date.now()}`,
        amount: options.amount * 100, // Convert to paise
        currency: options.currency || 'INR',
        receipt: options.receipt,
        status: 'created',
      };

      paymentLogger.info('Mock payment order created:', mockOrder);
      return mockOrder;
    }

    if (!razorpay) {
      throw new Error('Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or enable MOCK_PAYMENT=true for development.');
    }

    // Create order in Razorpay
    const order = await razorpay.orders.create({
      amount: options.amount * 100, // Convert to paise
      currency: options.currency || 'INR',
      receipt: options.receipt,
      notes: options.notes || {},
    });

    paymentLogger.info('Razorpay order created:', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });

    return order;
  } catch (error) {
    paymentLogger.error('Failed to create payment order:', error);
    throw error;
  }
}

/**
 * Verify Razorpay payment signature
 */
export function verifyPaymentSignature(options: VerifyPaymentOptions): boolean {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = options;

    // Generate signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(text)
      .digest('hex');

    // Compare signatures
    const isValid = generated_signature === razorpay_signature;

    if (isValid) {
      paymentLogger.info('Payment signature verified successfully', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    } else {
      paymentLogger.warn('Payment signature verification failed', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    }

    return isValid;
  } catch (error) {
    paymentLogger.error('Payment signature verification error:', error);
    return false;
  }
}

/**
 * Capture payment
 */
export async function capturePayment(paymentId: string, amount: number): Promise<any> {
  try {
    // Mock capture in development
    if (process.env.MOCK_PAYMENT === 'true') {
      const mockCapture = {
        id: paymentId,
        amount: amount * 100,
        currency: 'INR',
        status: 'captured',
        captured: true,
      };
      paymentLogger.info('Mock payment captured:', mockCapture);
      return mockCapture;
    }

    if (!razorpay) {
      throw new Error('Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or enable MOCK_PAYMENT=true for development.');
    }

    const payment = await razorpay.payments.capture(paymentId, amount * 100, 'INR');

    paymentLogger.info('Payment captured successfully:', {
      paymentId,
      amount,
      status: payment.status,
    });

    return payment;
  } catch (error) {
    paymentLogger.error('Failed to capture payment:', error);
    throw error;
  }
}

/**
 * Create refund
 */
export async function createRefund(paymentId: string, amount?: number): Promise<any> {
  try {
    // Mock refund in development
    if (process.env.MOCK_PAYMENT === 'true') {
      const mockRefund = {
        id: `rfnd_mock_${Date.now()}`,
        payment_id: paymentId,
        amount: amount ? amount * 100 : 0,
        currency: 'INR',
        status: 'processed',
      };
      paymentLogger.info('Mock refund created:', mockRefund);
      return mockRefund;
    }

    if (!razorpay) {
      throw new Error('Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or enable MOCK_PAYMENT=true for development.');
    }

    const refundOptions: any = { payment_id: paymentId };
    if (amount) {
      refundOptions.amount = amount * 100; // Convert to paise
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);

    paymentLogger.info('Refund created successfully:', {
      paymentId,
      refundId: refund.id,
      amount: refund.amount,
    });

    return refund;
  } catch (error) {
    paymentLogger.error('Failed to create refund:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    const isValid = expectedSignature === signature;

    if (!isValid) {
      paymentLogger.warn('Webhook signature verification failed');
    }

    return isValid;
  } catch (error) {
    paymentLogger.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Get payment details
 */
export async function getPaymentDetails(paymentId: string): Promise<any> {
  try {
    // Mock payment details in development
    if (process.env.MOCK_PAYMENT === 'true') {
      const mockPayment = {
        id: paymentId,
        amount: 10000, // Mock amount in paise
        currency: 'INR',
        status: 'captured',
        method: 'mock',
        captured: true,
        created_at: Date.now(),
      };
      paymentLogger.info('Mock payment details fetched:', mockPayment);
      return mockPayment;
    }

    if (!razorpay) {
      throw new Error('Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or enable MOCK_PAYMENT=true for development.');
    }

    const payment = await razorpay.payments.fetch(paymentId);

    return payment;
  } catch (error) {
    paymentLogger.error('Failed to fetch payment details:', error);
    throw error;
  }
}

/**
 * Save transaction to database
 */
export async function saveTransaction(data: {
  invoiceId?: string;
  transactionId: string;
  amount: number;
  paymentMethod?: string;
  paymentGateway?: string;
  status: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}): Promise<string> {
  try {
    const result = await pool.query(
      `INSERT INTO transactions (
        invoice_id, transaction_id, amount, payment_method,
        payment_gateway, status, razorpay_order_id, razorpay_payment_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        data.invoiceId || null,
        data.transactionId,
        data.amount,
        data.paymentMethod || 'razorpay',
        data.paymentGateway || 'razorpay',
        data.status,
        data.razorpayOrderId || null,
        data.razorpayPaymentId || null,
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    logger.error('Failed to save transaction:', error);
    throw error;
  }
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: string
): Promise<void> {
  try {
    await pool.query(
      'UPDATE transactions SET status = $1, transaction_date = CURRENT_TIMESTAMP WHERE id = $2',
      [status, transactionId]
    );

    paymentLogger.info('Transaction status updated:', { transactionId, status });
  } catch (error) {
    logger.error('Failed to update transaction status:', error);
    throw error;
  }
}

/**
 * Verify payment service configuration
 */
export function verifyPaymentConfig(): boolean {
  if (!razorpay && process.env.RAZORPAY_ENABLED === 'true') {
    logger.warn('⚠️  Razorpay payment service not properly configured');
    return false;
  }

  if (razorpay) {
    logger.info('✅ Razorpay payment service configured successfully');
    return true;
  }

  logger.info('ℹ️  Payment service disabled');
  return false;
}
