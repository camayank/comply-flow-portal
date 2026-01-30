/**
 * Webhook Service
 *
 * Enterprise-grade outbound webhook delivery system with:
 * - HMAC signature verification
 * - Exponential backoff retry logic
 * - Delivery tracking and status management
 * - Event filtering and routing
 */

import crypto from 'crypto';
import { db } from '../db';
import { webhookEndpoints, webhookDeliveries } from '../../shared/enterprise-schema';
import { eq, and, lt, isNull, or, lte } from 'drizzle-orm';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookEvent {
  type: string;
  data: Record<string, any>;
  tenantId?: string;
  userId?: number;
  entityType?: string;
  entityId?: string | number;
  timestamp?: Date;
}

export interface WebhookPayload {
  id: string;
  type: string;
  created: string;
  data: Record<string, any>;
  meta?: {
    tenantId?: string;
    userId?: number;
    entityType?: string;
    entityId?: string | number;
  };
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  responseTimeMs?: number;
  error?: string;
}

// Default retry policy
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
};

// ============================================================================
// WEBHOOK SERVICE
// ============================================================================

class WebhookService {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify HMAC signature (for incoming webhooks)
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Create webhook payload from event
   */
  createPayload(event: WebhookEvent): WebhookPayload {
    return {
      id: this.generateEventId(),
      type: event.type,
      created: (event.timestamp || new Date()).toISOString(),
      data: event.data,
      meta: {
        tenantId: event.tenantId,
        userId: event.userId,
        entityType: event.entityType,
        entityId: event.entityId,
      },
    };
  }

  /**
   * Trigger webhooks for an event
   * This queues deliveries for all matching endpoints
   */
  async trigger(event: WebhookEvent): Promise<number> {
    try {
      // Find all active endpoints that subscribe to this event type
      const endpoints = await db.select()
        .from(webhookEndpoints)
        .where(
          and(
            eq(webhookEndpoints.isActive, true),
            event.tenantId
              ? eq(webhookEndpoints.tenantId, event.tenantId)
              : isNull(webhookEndpoints.tenantId)
          )
        );

      const payload = this.createPayload(event);
      let queued = 0;

      for (const endpoint of endpoints) {
        // Check if endpoint subscribes to this event type
        const subscribedEvents = (endpoint.events as string[]) || [];
        if (subscribedEvents.length > 0 && !subscribedEvents.includes(event.type) && !subscribedEvents.includes('*')) {
          continue;
        }

        // Queue delivery
        await db.insert(webhookDeliveries).values({
          endpointId: endpoint.id,
          eventType: event.type,
          eventId: payload.id,
          payload: payload,
          status: 'pending',
          attemptCount: 0,
          createdAt: new Date(),
        });

        queued++;
      }

      logger.info(`Queued ${queued} webhook deliveries for event: ${event.type}`);
      return queued;
    } catch (error) {
      logger.error('Error triggering webhooks:', error);
      throw error;
    }
  }

  /**
   * Deliver a single webhook
   */
  async deliver(deliveryId: number): Promise<DeliveryResult> {
    const startTime = Date.now();

    try {
      // Get delivery and endpoint info
      const [delivery] = await db.select()
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.id, deliveryId));

      if (!delivery) {
        return { success: false, error: 'Delivery not found' };
      }

      const [endpoint] = await db.select()
        .from(webhookEndpoints)
        .where(eq(webhookEndpoints.id, delivery.endpointId));

      if (!endpoint) {
        await this.markDeliveryFailed(deliveryId, 'Endpoint not found');
        return { success: false, error: 'Endpoint not found' };
      }

      if (!endpoint.isActive) {
        await this.markDeliveryFailed(deliveryId, 'Endpoint is inactive');
        return { success: false, error: 'Endpoint is inactive' };
      }

      // Prepare request
      const payloadString = JSON.stringify(delivery.payload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'DigiComply-Webhook/1.0',
        'X-Webhook-Event': delivery.eventType,
        'X-Webhook-Delivery-Id': delivery.id.toString(),
        'X-Webhook-Timestamp': new Date().toISOString(),
      };

      // Add signature if secret is configured
      if (endpoint.secret) {
        headers['X-Webhook-Signature'] = this.generateSignature(payloadString, endpoint.secret);
      }

      // Add custom headers
      if (endpoint.headers) {
        Object.assign(headers, endpoint.headers);
      }

      // Make the request
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseTimeMs = Date.now() - startTime;
      const responseBody = await response.text();

      if (response.ok) {
        // Success
        await db.update(webhookDeliveries)
          .set({
            status: 'success',
            responseStatus: response.status,
            responseBody: responseBody.substring(0, 5000), // Limit stored response
            responseTimeMs,
            deliveredAt: new Date(),
            attemptCount: (delivery.attemptCount || 0) + 1,
          })
          .where(eq(webhookDeliveries.id, deliveryId));

        // Update endpoint stats
        await db.update(webhookEndpoints)
          .set({
            lastTriggeredAt: new Date(),
            successCount: (endpoint.successCount || 0) + 1,
          })
          .where(eq(webhookEndpoints.id, endpoint.id));

        return {
          success: true,
          statusCode: response.status,
          responseBody,
          responseTimeMs,
        };
      } else {
        // HTTP error - may retry
        return this.handleDeliveryFailure(
          deliveryId,
          endpoint,
          (delivery.attemptCount || 0) + 1,
          `HTTP ${response.status}: ${responseBody.substring(0, 500)}`,
          response.status,
          responseBody,
          responseTimeMs
        );
      }
    } catch (error: any) {
      const responseTimeMs = Date.now() - startTime;
      const [delivery] = await db.select()
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.id, deliveryId));

      if (!delivery) {
        return { success: false, error: 'Delivery not found' };
      }

      const [endpoint] = await db.select()
        .from(webhookEndpoints)
        .where(eq(webhookEndpoints.id, delivery.endpointId));

      if (!endpoint) {
        return { success: false, error: 'Endpoint not found' };
      }

      return this.handleDeliveryFailure(
        deliveryId,
        endpoint,
        (delivery.attemptCount || 0) + 1,
        error.message || 'Network error',
        undefined,
        undefined,
        responseTimeMs
      );
    }
  }

  /**
   * Handle delivery failure with retry logic
   */
  private async handleDeliveryFailure(
    deliveryId: number,
    endpoint: typeof webhookEndpoints.$inferSelect,
    attemptCount: number,
    errorMessage: string,
    statusCode?: number,
    responseBody?: string,
    responseTimeMs?: number
  ): Promise<DeliveryResult> {
    const retryPolicy: RetryPolicy = {
      ...DEFAULT_RETRY_POLICY,
      ...(endpoint.retryPolicy as RetryPolicy || {}),
    };

    const shouldRetry = attemptCount < retryPolicy.maxRetries;

    if (shouldRetry) {
      // Calculate next retry time with exponential backoff
      const delayMs = Math.min(
        (retryPolicy.initialDelayMs || 1000) * Math.pow(retryPolicy.backoffMultiplier, attemptCount - 1),
        retryPolicy.maxDelayMs || 60000
      );
      const nextRetryAt = new Date(Date.now() + delayMs);

      await db.update(webhookDeliveries)
        .set({
          status: 'retrying',
          responseStatus: statusCode,
          responseBody: responseBody?.substring(0, 5000),
          responseTimeMs,
          errorMessage,
          attemptCount,
          nextRetryAt,
        })
        .where(eq(webhookDeliveries.id, deliveryId));

      logger.info(`Webhook delivery ${deliveryId} will retry at ${nextRetryAt.toISOString()}`);
    } else {
      // Max retries reached
      await this.markDeliveryFailed(deliveryId, errorMessage, statusCode, responseBody, responseTimeMs, attemptCount);

      // Update endpoint failure count
      await db.update(webhookEndpoints)
        .set({
          lastTriggeredAt: new Date(),
          failureCount: (endpoint.failureCount || 0) + 1,
        })
        .where(eq(webhookEndpoints.id, endpoint.id));
    }

    return {
      success: false,
      statusCode,
      responseBody,
      responseTimeMs,
      error: errorMessage,
    };
  }

  /**
   * Mark delivery as permanently failed
   */
  private async markDeliveryFailed(
    deliveryId: number,
    errorMessage: string,
    statusCode?: number,
    responseBody?: string,
    responseTimeMs?: number,
    attemptCount?: number
  ): Promise<void> {
    await db.update(webhookDeliveries)
      .set({
        status: 'failed',
        responseStatus: statusCode,
        responseBody: responseBody?.substring(0, 5000),
        responseTimeMs,
        errorMessage,
        attemptCount: attemptCount || 1,
        nextRetryAt: null,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    logger.warn(`Webhook delivery ${deliveryId} permanently failed: ${errorMessage}`);
  }

  /**
   * Process pending deliveries (call this from a job scheduler)
   */
  async processPendingDeliveries(batchSize: number = 10): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let processed = 0;

    try {
      // Get pending and retry-ready deliveries
      const now = new Date();
      const pendingDeliveries = await db.select()
        .from(webhookDeliveries)
        .where(
          or(
            eq(webhookDeliveries.status, 'pending'),
            and(
              eq(webhookDeliveries.status, 'retrying'),
              lte(webhookDeliveries.nextRetryAt, now)
            )
          )
        )
        .limit(batchSize);

      for (const delivery of pendingDeliveries) {
        await this.deliver(delivery.id);
        processed++;
      }

      return processed;
    } catch (error) {
      logger.error('Error processing pending deliveries:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start background processing of webhooks
   */
  startBackgroundProcessor(intervalMs: number = 5000): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(async () => {
      try {
        await this.processPendingDeliveries();
      } catch (error) {
        logger.error('Background webhook processor error:', error);
      }
    }, intervalMs);

    logger.info('Webhook background processor started');
  }

  /**
   * Stop background processing
   */
  stopBackgroundProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info('Webhook background processor stopped');
    }
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(endpointId?: number, tenantId?: string): Promise<{
    total: number;
    pending: number;
    success: number;
    failed: number;
    retrying: number;
  }> {
    const query = endpointId
      ? eq(webhookDeliveries.endpointId, endpointId)
      : undefined;

    const deliveries = await db.select()
      .from(webhookDeliveries)
      .where(query);

    return {
      total: deliveries.length,
      pending: deliveries.filter(d => d.status === 'pending').length,
      success: deliveries.filter(d => d.status === 'success').length,
      failed: deliveries.filter(d => d.status === 'failed').length,
      retrying: deliveries.filter(d => d.status === 'retrying').length,
    };
  }

  /**
   * Retry a failed delivery manually
   */
  async retryDelivery(deliveryId: number): Promise<DeliveryResult> {
    // Reset status to pending
    await db.update(webhookDeliveries)
      .set({
        status: 'pending',
        nextRetryAt: null,
        errorMessage: null,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    // Attempt delivery
    return this.deliver(deliveryId);
  }

  /**
   * Cancel pending deliveries for an endpoint
   */
  async cancelPendingDeliveries(endpointId: number): Promise<number> {
    const result = await db.update(webhookDeliveries)
      .set({
        status: 'cancelled' as any,
        errorMessage: 'Cancelled by user',
      })
      .where(
        and(
          eq(webhookDeliveries.endpointId, endpointId),
          or(
            eq(webhookDeliveries.status, 'pending'),
            eq(webhookDeliveries.status, 'retrying')
          )
        )
      );

    return 0; // Drizzle doesn't return affected rows directly
  }

  /**
   * Test a webhook endpoint with a test payload
   */
  async testEndpoint(endpointId: number): Promise<DeliveryResult> {
    const [endpoint] = await db.select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, endpointId));

    if (!endpoint) {
      return { success: false, error: 'Endpoint not found' };
    }

    const testEvent: WebhookEvent = {
      type: 'webhook.test',
      data: {
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString(),
        endpointId,
      },
      tenantId: endpoint.tenantId || undefined,
    };

    // Queue and immediately deliver
    await this.trigger(testEvent);

    // Get the just-created delivery
    const [delivery] = await db.select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, endpointId))
      .orderBy(webhookDeliveries.id)
      .limit(1);

    if (delivery) {
      return this.deliver(delivery.id);
    }

    return { success: false, error: 'Failed to queue test delivery' };
  }
}

// Export singleton instance
export const webhookService = new WebhookService();

// ============================================================================
// WEBHOOK EVENT TYPES
// ============================================================================

export const WEBHOOK_EVENTS = {
  // Service Request Events
  SERVICE_REQUEST_CREATED: 'service_request.created',
  SERVICE_REQUEST_UPDATED: 'service_request.updated',
  SERVICE_REQUEST_STATUS_CHANGED: 'service_request.status_changed',
  SERVICE_REQUEST_COMPLETED: 'service_request.completed',
  SERVICE_REQUEST_CANCELLED: 'service_request.cancelled',

  // Payment Events
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Invoice Events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_OVERDUE: 'invoice.overdue',

  // Document Events
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_VERIFIED: 'document.verified',
  DOCUMENT_REJECTED: 'document.rejected',
  DOCUMENT_EXPIRING: 'document.expiring',

  // Lead Events
  LEAD_CREATED: 'lead.created',
  LEAD_QUALIFIED: 'lead.qualified',
  LEAD_CONVERTED: 'lead.converted',
  LEAD_LOST: 'lead.lost',

  // Compliance Events
  COMPLIANCE_DUE: 'compliance.due',
  COMPLIANCE_COMPLETED: 'compliance.completed',
  COMPLIANCE_OVERDUE: 'compliance.overdue',
  COMPLIANCE_STATE_CHANGED: 'compliance.state_changed',

  // Client Events
  CLIENT_CREATED: 'client.created',
  CLIENT_UPDATED: 'client.updated',
  CLIENT_ONBOARDED: 'client.onboarded',

  // Support Events
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  TICKET_RESOLVED: 'ticket.resolved',

  // Task Events
  TASK_CREATED: 'task.created',
  TASK_ASSIGNED: 'task.assigned',
  TASK_COMPLETED: 'task.completed',
  TASK_OVERDUE: 'task.overdue',

  // Quality Events
  QC_REVIEW_PASSED: 'qc.review_passed',
  QC_REVIEW_FAILED: 'qc.review_failed',
  QC_REWORK_REQUIRED: 'qc.rework_required',

  // Test Event
  WEBHOOK_TEST: 'webhook.test',
} as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS];
