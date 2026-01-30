/**
 * Webhook Routes
 *
 * API endpoints for managing outbound webhooks:
 * - CRUD operations for webhook endpoints
 * - Delivery history and retry management
 * - Testing and monitoring
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { webhookEndpoints, webhookDeliveries } from '../../shared/enterprise-schema';
import { eq, and, desc, sql, lte, gte } from 'drizzle-orm';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from '../rbac-middleware';
import { webhookService, WEBHOOK_EVENTS } from '../services/webhook-service';
import { logger } from '../logger';

const router = Router();

// All routes require authentication
router.use(sessionAuthMiddleware);

// ============================================================================
// WEBHOOK ENDPOINTS MANAGEMENT
// ============================================================================

/**
 * GET /api/webhooks/endpoints
 * List all webhook endpoints for the current tenant
 */
router.get('/endpoints', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user?.tenantId || null;

    const endpoints = await db.select()
      .from(webhookEndpoints)
      .where(tenantId ? eq(webhookEndpoints.tenantId, tenantId) : sql`1=1`)
      .orderBy(desc(webhookEndpoints.createdAt));

    // Hide secrets in response
    const sanitizedEndpoints = endpoints.map(endpoint => ({
      ...endpoint,
      secret: endpoint.secret ? '********' : null,
    }));

    res.json({ endpoints: sanitizedEndpoints });
  } catch (error) {
    logger.error('Error fetching webhook endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch webhook endpoints' });
  }
});

/**
 * GET /api/webhooks/endpoints/:id
 * Get a specific webhook endpoint
 */
router.get('/endpoints/:id', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const [endpoint] = await db.select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, parseInt(id)));

    if (!endpoint) {
      return res.status(404).json({ error: 'Webhook endpoint not found' });
    }

    // Get delivery statistics
    const stats = await webhookService.getDeliveryStats(endpoint.id);

    res.json({
      endpoint: {
        ...endpoint,
        secret: endpoint.secret ? '********' : null,
      },
      stats,
    });
  } catch (error) {
    logger.error('Error fetching webhook endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch webhook endpoint' });
  }
});

/**
 * POST /api/webhooks/endpoints
 * Create a new webhook endpoint
 */
router.post('/endpoints', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      name,
      url,
      events = [],
      headers = {},
      retryPolicy,
      isActive = true,
    } = req.body;

    // Validate required fields
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Generate a secure secret
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

    const [endpoint] = await db.insert(webhookEndpoints)
      .values({
        tenantId: user?.tenantId || null,
        name,
        url,
        secret,
        events,
        headers,
        retryPolicy: retryPolicy || { maxRetries: 3, backoffMultiplier: 2 },
        isActive,
        createdBy: user?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Return with secret visible only on creation
    res.status(201).json({
      message: 'Webhook endpoint created successfully',
      endpoint: {
        ...endpoint,
        secret, // Show secret only on creation
      },
      note: 'Save the secret securely - it will not be shown again.',
    });
  } catch (error) {
    logger.error('Error creating webhook endpoint:', error);
    res.status(500).json({ error: 'Failed to create webhook endpoint' });
  }
});

/**
 * PUT /api/webhooks/endpoints/:id
 * Update a webhook endpoint
 */
router.put('/endpoints/:id', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      url,
      events,
      headers,
      retryPolicy,
      isActive,
    } = req.body;

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (events !== undefined) updates.events = events;
    if (headers !== undefined) updates.headers = headers;
    if (retryPolicy !== undefined) updates.retryPolicy = retryPolicy;
    if (isActive !== undefined) updates.isActive = isActive;

    const [endpoint] = await db.update(webhookEndpoints)
      .set(updates)
      .where(eq(webhookEndpoints.id, parseInt(id)))
      .returning();

    if (!endpoint) {
      return res.status(404).json({ error: 'Webhook endpoint not found' });
    }

    res.json({
      message: 'Webhook endpoint updated successfully',
      endpoint: {
        ...endpoint,
        secret: endpoint.secret ? '********' : null,
      },
    });
  } catch (error) {
    logger.error('Error updating webhook endpoint:', error);
    res.status(500).json({ error: 'Failed to update webhook endpoint' });
  }
});

/**
 * DELETE /api/webhooks/endpoints/:id
 * Delete a webhook endpoint
 */
router.delete('/endpoints/:id', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Cancel any pending deliveries first
    await webhookService.cancelPendingDeliveries(parseInt(id));

    const [endpoint] = await db.delete(webhookEndpoints)
      .where(eq(webhookEndpoints.id, parseInt(id)))
      .returning();

    if (!endpoint) {
      return res.status(404).json({ error: 'Webhook endpoint not found' });
    }

    res.json({ message: 'Webhook endpoint deleted successfully' });
  } catch (error) {
    logger.error('Error deleting webhook endpoint:', error);
    res.status(500).json({ error: 'Failed to delete webhook endpoint' });
  }
});

/**
 * POST /api/webhooks/endpoints/:id/rotate-secret
 * Rotate the webhook secret
 */
router.post('/endpoints/:id/rotate-secret', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const newSecret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

    const [endpoint] = await db.update(webhookEndpoints)
      .set({
        secret: newSecret,
        updatedAt: new Date(),
      })
      .where(eq(webhookEndpoints.id, parseInt(id)))
      .returning();

    if (!endpoint) {
      return res.status(404).json({ error: 'Webhook endpoint not found' });
    }

    res.json({
      message: 'Webhook secret rotated successfully',
      secret: newSecret,
      note: 'Save the new secret securely - it will not be shown again.',
    });
  } catch (error) {
    logger.error('Error rotating webhook secret:', error);
    res.status(500).json({ error: 'Failed to rotate webhook secret' });
  }
});

/**
 * POST /api/webhooks/endpoints/:id/test
 * Send a test webhook to the endpoint
 */
router.post('/endpoints/:id/test', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await webhookService.testEndpoint(parseInt(id));

    if (result.success) {
      res.json({
        message: 'Test webhook delivered successfully',
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
      });
    } else {
      res.status(400).json({
        message: 'Test webhook delivery failed',
        error: result.error,
        statusCode: result.statusCode,
      });
    }
  } catch (error) {
    logger.error('Error testing webhook endpoint:', error);
    res.status(500).json({ error: 'Failed to test webhook endpoint' });
  }
});

/**
 * POST /api/webhooks/endpoints/:id/toggle
 * Toggle endpoint active status
 */
router.post('/endpoints/:id/toggle', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [current] = await db.select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, parseInt(id)));

    if (!current) {
      return res.status(404).json({ error: 'Webhook endpoint not found' });
    }

    const [endpoint] = await db.update(webhookEndpoints)
      .set({
        isActive: !current.isActive,
        updatedAt: new Date(),
      })
      .where(eq(webhookEndpoints.id, parseInt(id)))
      .returning();

    res.json({
      message: `Webhook endpoint ${endpoint.isActive ? 'enabled' : 'disabled'} successfully`,
      isActive: endpoint.isActive,
    });
  } catch (error) {
    logger.error('Error toggling webhook endpoint:', error);
    res.status(500).json({ error: 'Failed to toggle webhook endpoint' });
  }
});

// ============================================================================
// WEBHOOK DELIVERIES
// ============================================================================

/**
 * GET /api/webhooks/deliveries
 * List webhook deliveries with filtering
 */
router.get('/deliveries', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const {
      endpointId,
      status,
      eventType,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
    } = req.query;

    // Build conditions
    const conditions = [];

    if (endpointId) {
      conditions.push(eq(webhookDeliveries.endpointId, parseInt(endpointId as string)));
    }

    if (status) {
      conditions.push(eq(webhookDeliveries.status, status as string));
    }

    if (eventType) {
      conditions.push(eq(webhookDeliveries.eventType, eventType as string));
    }

    if (startDate) {
      conditions.push(gte(webhookDeliveries.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      conditions.push(lte(webhookDeliveries.createdAt, new Date(endDate as string)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const deliveries = await db.select()
      .from(webhookDeliveries)
      .where(whereClause)
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ deliveries });
  } catch (error) {
    logger.error('Error fetching webhook deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch webhook deliveries' });
  }
});

/**
 * GET /api/webhooks/deliveries/:id
 * Get a specific delivery with full details
 */
router.get('/deliveries/:id', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [delivery] = await db.select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.id, parseInt(id)));

    if (!delivery) {
      return res.status(404).json({ error: 'Webhook delivery not found' });
    }

    // Get endpoint info
    const [endpoint] = await db.select({
      id: webhookEndpoints.id,
      name: webhookEndpoints.name,
      url: webhookEndpoints.url,
    })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, delivery.endpointId));

    res.json({
      delivery,
      endpoint,
    });
  } catch (error) {
    logger.error('Error fetching webhook delivery:', error);
    res.status(500).json({ error: 'Failed to fetch webhook delivery' });
  }
});

/**
 * POST /api/webhooks/deliveries/:id/retry
 * Manually retry a failed delivery
 */
router.post('/deliveries/:id/retry', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await webhookService.retryDelivery(parseInt(id));

    if (result.success) {
      res.json({
        message: 'Webhook delivery retried successfully',
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
      });
    } else {
      res.status(400).json({
        message: 'Webhook delivery retry failed',
        error: result.error,
        statusCode: result.statusCode,
      });
    }
  } catch (error) {
    logger.error('Error retrying webhook delivery:', error);
    res.status(500).json({ error: 'Failed to retry webhook delivery' });
  }
});

// ============================================================================
// WEBHOOK EVENTS & STATS
// ============================================================================

/**
 * GET /api/webhooks/events
 * List available webhook event types
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const events = Object.entries(WEBHOOK_EVENTS).map(([key, value]) => ({
      key,
      type: value,
      category: value.split('.')[0],
    }));

    // Group by category
    const grouped = events.reduce((acc, event) => {
      if (!acc[event.category]) {
        acc[event.category] = [];
      }
      acc[event.category].push(event);
      return acc;
    }, {} as Record<string, typeof events>);

    res.json({
      events,
      categories: Object.keys(grouped),
      grouped,
    });
  } catch (error) {
    logger.error('Error fetching webhook events:', error);
    res.status(500).json({ error: 'Failed to fetch webhook events' });
  }
});

/**
 * GET /api/webhooks/stats
 * Get overall webhook statistics
 */
router.get('/stats', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user?.tenantId || null;

    // Get endpoint counts
    const endpoints = await db.select()
      .from(webhookEndpoints)
      .where(tenantId ? eq(webhookEndpoints.tenantId, tenantId) : sql`1=1`);

    const activeEndpoints = endpoints.filter(e => e.isActive).length;
    const inactiveEndpoints = endpoints.length - activeEndpoints;

    // Get delivery stats
    const overallStats = await webhookService.getDeliveryStats();

    // Calculate success rate
    const totalDelivered = overallStats.success + overallStats.failed;
    const successRate = totalDelivered > 0
      ? ((overallStats.success / totalDelivered) * 100).toFixed(2)
      : '0.00';

    res.json({
      endpoints: {
        total: endpoints.length,
        active: activeEndpoints,
        inactive: inactiveEndpoints,
      },
      deliveries: overallStats,
      successRate: `${successRate}%`,
      summary: {
        totalEndpoints: endpoints.length,
        totalDeliveries: overallStats.total,
        pendingDeliveries: overallStats.pending + overallStats.retrying,
        failedDeliveries: overallStats.failed,
      },
    });
  } catch (error) {
    logger.error('Error fetching webhook stats:', error);
    res.status(500).json({ error: 'Failed to fetch webhook stats' });
  }
});

/**
 * POST /api/webhooks/process
 * Manually trigger processing of pending webhooks (admin only)
 */
router.post('/process', requireMinimumRole(USER_ROLES.SUPER_ADMIN), async (req: Request, res: Response) => {
  try {
    const { batchSize = 10 } = req.body;

    const processed = await webhookService.processPendingDeliveries(batchSize);

    res.json({
      message: `Processed ${processed} webhook deliveries`,
      processed,
    });
  } catch (error) {
    logger.error('Error processing webhooks:', error);
    res.status(500).json({ error: 'Failed to process webhooks' });
  }
});

export default router;
