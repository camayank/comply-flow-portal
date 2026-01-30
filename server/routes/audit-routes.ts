/**
 * Audit & Compliance Routes
 *
 * API endpoints for DPDP Act compliance:
 * - Immutable Audit Log with hash chain verification
 * - Data Deletion Requests (GDPR Article 17)
 * - Access Reviews (periodic certification)
 * - Security Incidents (incident tracking)
 * - Data Classifications (PII tagging)
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import {
  immutableAuditLog,
  dataDeletionRequests,
  accessReviews,
  accessReviewItems,
  securityIncidents,
  dataClassifications,
} from '../../shared/enterprise-schema';
import { users } from '../../shared/schema';
import { eq, and, desc, asc, sql, gte, lte, count, or, isNull } from 'drizzle-orm';
import { sessionAuthMiddleware, requireMinimumRole, USER_ROLES } from '../rbac-middleware';
import { logger } from '../logger';

const router = Router();

// All routes require authentication
router.use(sessionAuthMiddleware);

// ============================================================================
// IMMUTABLE AUDIT LOG
// ============================================================================

/**
 * Create hash for audit log entry (blockchain-like)
 */
function createAuditHash(entry: {
  previousHash: string | null;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: unknown;
  newValues: unknown;
  timestamp: Date;
}): string {
  const data = JSON.stringify({
    previousHash: entry.previousHash,
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    oldValues: entry.oldValues,
    newValues: entry.newValues,
    timestamp: entry.timestamp.toISOString(),
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * GET /api/audit/logs
 * Get paginated audit logs with filtering
 */
router.get('/logs', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      entityType,
      entityId,
      userId,
      action,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
    } = req.query;

    const conditions = [];

    if (user.tenantId) {
      conditions.push(eq(immutableAuditLog.tenantId, user.tenantId));
    }

    if (entityType) {
      conditions.push(eq(immutableAuditLog.entityType, entityType as string));
    }

    if (entityId) {
      conditions.push(eq(immutableAuditLog.entityId, entityId as string));
    }

    if (userId) {
      conditions.push(eq(immutableAuditLog.userId, parseInt(userId as string)));
    }

    if (action) {
      conditions.push(eq(immutableAuditLog.action, action as string));
    }

    if (startDate) {
      conditions.push(gte(immutableAuditLog.timestamp, new Date(startDate as string)));
    }

    if (endDate) {
      conditions.push(lte(immutableAuditLog.timestamp, new Date(endDate as string)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db.select({
      id: immutableAuditLog.id,
      logHash: immutableAuditLog.logHash,
      previousHash: immutableAuditLog.previousHash,
      userId: immutableAuditLog.userId,
      action: immutableAuditLog.action,
      entityType: immutableAuditLog.entityType,
      entityId: immutableAuditLog.entityId,
      oldValues: immutableAuditLog.oldValues,
      newValues: immutableAuditLog.newValues,
      ipAddress: immutableAuditLog.ipAddress,
      timestamp: immutableAuditLog.timestamp,
      userName: users.name,
      userEmail: users.email,
    })
      .from(immutableAuditLog)
      .leftJoin(users, eq(immutableAuditLog.userId, users.id))
      .where(whereClause)
      .orderBy(desc(immutableAuditLog.timestamp))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    const [countResult] = await db.select({ total: count() })
      .from(immutableAuditLog)
      .where(whereClause);

    res.json({
      logs,
      pagination: {
        total: countResult?.total || 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/audit/logs/:id
 * Get a single audit log entry with full details
 */
router.get('/logs/:id', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [log] = await db.select({
      id: immutableAuditLog.id,
      logHash: immutableAuditLog.logHash,
      previousHash: immutableAuditLog.previousHash,
      tenantId: immutableAuditLog.tenantId,
      userId: immutableAuditLog.userId,
      action: immutableAuditLog.action,
      entityType: immutableAuditLog.entityType,
      entityId: immutableAuditLog.entityId,
      oldValues: immutableAuditLog.oldValues,
      newValues: immutableAuditLog.newValues,
      ipAddress: immutableAuditLog.ipAddress,
      userAgent: immutableAuditLog.userAgent,
      sessionId: immutableAuditLog.sessionId,
      requestId: immutableAuditLog.requestId,
      timestamp: immutableAuditLog.timestamp,
      userName: users.name,
      userEmail: users.email,
    })
      .from(immutableAuditLog)
      .leftJoin(users, eq(immutableAuditLog.userId, users.id))
      .where(eq(immutableAuditLog.id, parseInt(id)));

    if (!log) {
      return res.status(404).json({ error: 'Audit log entry not found' });
    }

    res.json({ log });
  } catch (error) {
    logger.error('Error fetching audit log entry:', error);
    res.status(500).json({ error: 'Failed to fetch audit log entry' });
  }
});

/**
 * POST /api/audit/verify-chain
 * Verify the integrity of the audit log hash chain
 */
router.post('/verify-chain', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { startId, endId } = req.body;

    const conditions = [];
    if (user.tenantId) {
      conditions.push(eq(immutableAuditLog.tenantId, user.tenantId));
    }
    if (startId) {
      conditions.push(gte(immutableAuditLog.id, parseInt(startId)));
    }
    if (endId) {
      conditions.push(lte(immutableAuditLog.id, parseInt(endId)));
    }

    const logs = await db.select()
      .from(immutableAuditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(immutableAuditLog.id))
      .limit(10000); // Max entries to verify at once

    let valid = true;
    let brokenAt: number | null = null;
    let verifiedCount = 0;

    for (let i = 1; i < logs.length; i++) {
      const currentLog = logs[i];
      const previousLog = logs[i - 1];

      // Verify previous hash matches
      if (currentLog.previousHash !== previousLog.logHash) {
        valid = false;
        brokenAt = currentLog.id;
        break;
      }

      // Verify hash integrity
      const expectedHash = createAuditHash({
        previousHash: currentLog.previousHash,
        userId: currentLog.userId,
        action: currentLog.action,
        entityType: currentLog.entityType,
        entityId: currentLog.entityId,
        oldValues: currentLog.oldValues,
        newValues: currentLog.newValues,
        timestamp: currentLog.timestamp,
      });

      if (expectedHash !== currentLog.logHash) {
        valid = false;
        brokenAt = currentLog.id;
        break;
      }

      verifiedCount++;
    }

    res.json({
      valid,
      verifiedCount,
      totalEntries: logs.length,
      brokenAt,
      verifiedRange: {
        start: logs[0]?.id,
        end: logs[logs.length - 1]?.id,
      },
    });
  } catch (error) {
    logger.error('Error verifying audit chain:', error);
    res.status(500).json({ error: 'Failed to verify audit chain' });
  }
});

/**
 * GET /api/audit/export
 * Export audit logs for compliance reporting
 */
router.get('/export', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { startDate, endDate, format = 'json' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const conditions = [
      gte(immutableAuditLog.timestamp, new Date(startDate as string)),
      lte(immutableAuditLog.timestamp, new Date(endDate as string)),
    ];

    if (user.tenantId) {
      conditions.push(eq(immutableAuditLog.tenantId, user.tenantId));
    }

    const logs = await db.select({
      id: immutableAuditLog.id,
      logHash: immutableAuditLog.logHash,
      previousHash: immutableAuditLog.previousHash,
      userId: immutableAuditLog.userId,
      action: immutableAuditLog.action,
      entityType: immutableAuditLog.entityType,
      entityId: immutableAuditLog.entityId,
      oldValues: immutableAuditLog.oldValues,
      newValues: immutableAuditLog.newValues,
      ipAddress: immutableAuditLog.ipAddress,
      timestamp: immutableAuditLog.timestamp,
      userName: users.name,
    })
      .from(immutableAuditLog)
      .leftJoin(users, eq(immutableAuditLog.userId, users.id))
      .where(and(...conditions))
      .orderBy(asc(immutableAuditLog.timestamp));

    if (format === 'csv') {
      const csv = [
        'ID,Hash,Timestamp,User,Action,Entity Type,Entity ID,IP Address',
        ...logs.map(l =>
          `${l.id},${l.logHash},${l.timestamp},${l.userName || 'System'},${l.action},${l.entityType},${l.entityId || ''},${l.ipAddress || ''}`
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-log-${startDate}-${endDate}.csv`);
      return res.send(csv);
    }

    res.json({
      exportedAt: new Date().toISOString(),
      dateRange: { startDate, endDate },
      totalEntries: logs.length,
      logs,
    });
  } catch (error) {
    logger.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

/**
 * POST /api/audit/log
 * Create a new audit log entry (internal use)
 */
router.post('/log', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { action, entityType, entityId, oldValues, newValues } = req.body;

    if (!action || !entityType) {
      return res.status(400).json({ error: 'Action and entity type are required' });
    }

    // Get the last log entry to chain hashes
    const [lastLog] = await db.select({ logHash: immutableAuditLog.logHash })
      .from(immutableAuditLog)
      .where(user.tenantId ? eq(immutableAuditLog.tenantId, user.tenantId) : sql`1=1`)
      .orderBy(desc(immutableAuditLog.id))
      .limit(1);

    const timestamp = new Date();
    const logHash = createAuditHash({
      previousHash: lastLog?.logHash || null,
      userId: user.id,
      action,
      entityType,
      entityId: entityId || null,
      oldValues: oldValues || null,
      newValues: newValues || null,
      timestamp,
    });

    const [entry] = await db.insert(immutableAuditLog)
      .values({
        logHash,
        previousHash: lastLog?.logHash || null,
        tenantId: user.tenantId || null,
        userId: user.id,
        action,
        entityType,
        entityId: entityId || null,
        oldValues: oldValues || null,
        newValues: newValues || null,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null,
        timestamp,
      })
      .returning();

    res.status(201).json({ entry });
  } catch (error) {
    logger.error('Error creating audit log entry:', error);
    res.status(500).json({ error: 'Failed to create audit log entry' });
  }
});

// ============================================================================
// DATA DELETION REQUESTS (GDPR/DPDP)
// ============================================================================

/**
 * GET /api/audit/data-requests
 * List all data deletion/portability requests
 */
router.get('/data-requests', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, requestType, limit = '50', offset = '0' } = req.query;

    const conditions = [];

    if (user.tenantId) {
      conditions.push(eq(dataDeletionRequests.tenantId, user.tenantId));
    }

    if (status) {
      conditions.push(eq(dataDeletionRequests.status, status as string));
    }

    if (requestType) {
      conditions.push(eq(dataDeletionRequests.requestType, requestType as string));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const requests = await db.select({
      id: dataDeletionRequests.id,
      subjectEmail: dataDeletionRequests.subjectEmail,
      subjectName: dataDeletionRequests.subjectName,
      requestType: dataDeletionRequests.requestType,
      scope: dataDeletionRequests.scope,
      status: dataDeletionRequests.status,
      verifiedAt: dataDeletionRequests.verifiedAt,
      processingStartedAt: dataDeletionRequests.processingStartedAt,
      completedAt: dataDeletionRequests.completedAt,
      rejectionReason: dataDeletionRequests.rejectionReason,
      exportUrl: dataDeletionRequests.exportUrl,
      exportExpiresAt: dataDeletionRequests.exportExpiresAt,
      createdAt: dataDeletionRequests.createdAt,
      requestedByName: users.name,
    })
      .from(dataDeletionRequests)
      .leftJoin(users, eq(dataDeletionRequests.requestedBy, users.id))
      .where(whereClause)
      .orderBy(desc(dataDeletionRequests.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get summary stats
    const stats = await db.select({
      status: dataDeletionRequests.status,
      count: count(),
    })
      .from(dataDeletionRequests)
      .where(user.tenantId ? eq(dataDeletionRequests.tenantId, user.tenantId) : undefined)
      .groupBy(dataDeletionRequests.status);

    res.json({
      requests,
      summary: stats.reduce((acc, s) => {
        acc[s.status || 'unknown'] = s.count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    logger.error('Error fetching data requests:', error);
    res.status(500).json({ error: 'Failed to fetch data requests' });
  }
});

/**
 * POST /api/audit/data-requests
 * Create a new data deletion/portability request
 */
router.post('/data-requests', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { subjectEmail, subjectName, requestType, scope } = req.body;

    if (!subjectEmail || !requestType) {
      return res.status(400).json({ error: 'Subject email and request type are required' });
    }

    const validTypes = ['erasure', 'portability', 'rectification', 'restriction'];
    if (!validTypes.includes(requestType)) {
      return res.status(400).json({ error: `Invalid request type. Must be one of: ${validTypes.join(', ')}` });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const [request] = await db.insert(dataDeletionRequests)
      .values({
        tenantId: user.tenantId || null,
        requestedBy: user.id,
        subjectEmail,
        subjectName: subjectName || null,
        requestType,
        scope: scope || null,
        status: 'pending',
        verificationToken,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({
      message: 'Data request created. Verification email will be sent.',
      request: {
        ...request,
        verificationToken: undefined, // Don't expose token in response
      },
    });
  } catch (error) {
    logger.error('Error creating data request:', error);
    res.status(500).json({ error: 'Failed to create data request' });
  }
});

/**
 * POST /api/audit/data-requests/:id/verify
 * Verify a data request via token
 */
router.post('/data-requests/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const [request] = await db.select()
      .from(dataDeletionRequests)
      .where(eq(dataDeletionRequests.id, parseInt(id)));

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.verificationToken !== token) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been verified' });
    }

    const [updated] = await db.update(dataDeletionRequests)
      .set({
        status: 'verified',
        verifiedAt: new Date(),
      })
      .where(eq(dataDeletionRequests.id, parseInt(id)))
      .returning();

    res.json({
      message: 'Request verified successfully',
      request: updated,
    });
  } catch (error) {
    logger.error('Error verifying data request:', error);
    res.status(500).json({ error: 'Failed to verify data request' });
  }
});

/**
 * POST /api/audit/data-requests/:id/process
 * Start processing a verified data request
 */
router.post('/data-requests/:id/process', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [request] = await db.select()
      .from(dataDeletionRequests)
      .where(eq(dataDeletionRequests.id, parseInt(id)));

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'verified') {
      return res.status(400).json({ error: 'Request must be verified before processing' });
    }

    const [updated] = await db.update(dataDeletionRequests)
      .set({
        status: 'processing',
        processingStartedAt: new Date(),
      })
      .where(eq(dataDeletionRequests.id, parseInt(id)))
      .returning();

    // In a real implementation, this would trigger a background job
    // to actually delete/export the data based on request type

    res.json({
      message: 'Processing started',
      request: updated,
    });
  } catch (error) {
    logger.error('Error processing data request:', error);
    res.status(500).json({ error: 'Failed to process data request' });
  }
});

/**
 * PATCH /api/audit/data-requests/:id
 * Update a data request (complete, reject, etc.)
 */
router.patch('/data-requests/:id', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, exportUrl, exportExpiresAt } = req.body;

    const updates: Record<string, any> = {};

    if (status) {
      updates.status = status;
      if (status === 'completed') {
        updates.completedAt = new Date();
      }
    }

    if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;
    if (exportUrl !== undefined) updates.exportUrl = exportUrl;
    if (exportExpiresAt !== undefined) updates.exportExpiresAt = new Date(exportExpiresAt);

    const [updated] = await db.update(dataDeletionRequests)
      .set(updates)
      .where(eq(dataDeletionRequests.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({
      message: 'Request updated successfully',
      request: updated,
    });
  } catch (error) {
    logger.error('Error updating data request:', error);
    res.status(500).json({ error: 'Failed to update data request' });
  }
});

// ============================================================================
// ACCESS REVIEWS
// ============================================================================

/**
 * GET /api/audit/access-reviews
 * List all access review cycles
 */
router.get('/access-reviews', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, limit = '50', offset = '0' } = req.query;

    const conditions = [];

    if (user.tenantId) {
      conditions.push(eq(accessReviews.tenantId, user.tenantId));
    }

    if (status) {
      conditions.push(eq(accessReviews.status, status as string));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const reviews = await db.select({
      id: accessReviews.id,
      reviewPeriodStart: accessReviews.reviewPeriodStart,
      reviewPeriodEnd: accessReviews.reviewPeriodEnd,
      reviewType: accessReviews.reviewType,
      status: accessReviews.status,
      reviewerId: accessReviews.reviewerId,
      dueDate: accessReviews.dueDate,
      completedAt: accessReviews.completedAt,
      summary: accessReviews.summary,
      createdAt: accessReviews.createdAt,
      reviewerName: users.name,
    })
      .from(accessReviews)
      .leftJoin(users, eq(accessReviews.reviewerId, users.id))
      .where(whereClause)
      .orderBy(desc(accessReviews.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get item counts per review
    const reviewsWithCounts = await Promise.all(
      reviews.map(async (review) => {
        const [itemCount] = await db.select({ total: count() })
          .from(accessReviewItems)
          .where(eq(accessReviewItems.reviewId, review.id));

        const [completedCount] = await db.select({ total: count() })
          .from(accessReviewItems)
          .where(and(
            eq(accessReviewItems.reviewId, review.id),
            sql`${accessReviewItems.decision} IS NOT NULL`
          ));

        return {
          ...review,
          totalItems: itemCount?.total || 0,
          completedItems: completedCount?.total || 0,
        };
      })
    );

    res.json({ reviews: reviewsWithCounts });
  } catch (error) {
    logger.error('Error fetching access reviews:', error);
    res.status(500).json({ error: 'Failed to fetch access reviews' });
  }
});

/**
 * POST /api/audit/access-reviews
 * Create a new access review cycle
 */
router.post('/access-reviews', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { reviewPeriodStart, reviewPeriodEnd, reviewType, reviewerId, dueDate } = req.body;

    if (!reviewPeriodStart || !reviewPeriodEnd || !reviewType) {
      return res.status(400).json({ error: 'Review period and type are required' });
    }

    // Create the review
    const [review] = await db.insert(accessReviews)
      .values({
        tenantId: user.tenantId || null,
        reviewPeriodStart,
        reviewPeriodEnd,
        reviewType,
        status: 'pending',
        reviewerId: reviewerId || user.id,
        dueDate: dueDate || null,
        createdAt: new Date(),
      })
      .returning();

    // Auto-populate review items with all active users
    const activeUsers = await db.select({
      id: users.id,
      role: users.role,
    })
      .from(users)
      .where(eq(users.isActive, true));

    if (activeUsers.length > 0) {
      await db.insert(accessReviewItems)
        .values(activeUsers.map(u => ({
          reviewId: review.id,
          userId: u.id,
          currentRole: u.role,
          currentPermissions: null, // Would be populated with actual permissions
        })));
    }

    res.status(201).json({
      message: 'Access review created',
      review,
      itemsCreated: activeUsers.length,
    });
  } catch (error) {
    logger.error('Error creating access review:', error);
    res.status(500).json({ error: 'Failed to create access review' });
  }
});

/**
 * GET /api/audit/access-reviews/:id/items
 * Get items for a specific access review
 */
router.get('/access-reviews/:id/items', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decision } = req.query;

    const conditions = [eq(accessReviewItems.reviewId, parseInt(id))];

    if (decision === 'pending') {
      conditions.push(isNull(accessReviewItems.decision));
    } else if (decision) {
      conditions.push(eq(accessReviewItems.decision, decision as string));
    }

    const items = await db.select({
      id: accessReviewItems.id,
      reviewId: accessReviewItems.reviewId,
      userId: accessReviewItems.userId,
      currentRole: accessReviewItems.currentRole,
      currentPermissions: accessReviewItems.currentPermissions,
      accessHistory: accessReviewItems.accessHistory,
      decision: accessReviewItems.decision,
      newRole: accessReviewItems.newRole,
      newPermissions: accessReviewItems.newPermissions,
      comments: accessReviewItems.comments,
      reviewedAt: accessReviewItems.reviewedAt,
      userName: users.name,
      userEmail: users.email,
    })
      .from(accessReviewItems)
      .leftJoin(users, eq(accessReviewItems.userId, users.id))
      .where(and(...conditions))
      .orderBy(asc(accessReviewItems.id));

    res.json({ items });
  } catch (error) {
    logger.error('Error fetching access review items:', error);
    res.status(500).json({ error: 'Failed to fetch access review items' });
  }
});

/**
 * PATCH /api/audit/access-reviews/:reviewId/items/:itemId
 * Submit decision for an access review item
 */
router.patch('/access-reviews/:reviewId/items/:itemId', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { reviewId, itemId } = req.params;
    const { decision, newRole, newPermissions, comments } = req.body;

    if (!decision) {
      return res.status(400).json({ error: 'Decision is required' });
    }

    const validDecisions = ['approve', 'revoke', 'modify'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({ error: `Invalid decision. Must be one of: ${validDecisions.join(', ')}` });
    }

    const [item] = await db.update(accessReviewItems)
      .set({
        decision,
        newRole: newRole || null,
        newPermissions: newPermissions || null,
        comments: comments || null,
        reviewedAt: new Date(),
      })
      .where(and(
        eq(accessReviewItems.id, parseInt(itemId)),
        eq(accessReviewItems.reviewId, parseInt(reviewId))
      ))
      .returning();

    if (!item) {
      return res.status(404).json({ error: 'Review item not found' });
    }

    // Check if all items are reviewed to auto-complete the review
    const [pendingCount] = await db.select({ total: count() })
      .from(accessReviewItems)
      .where(and(
        eq(accessReviewItems.reviewId, parseInt(reviewId)),
        isNull(accessReviewItems.decision)
      ));

    if (pendingCount?.total === 0) {
      await db.update(accessReviews)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(accessReviews.id, parseInt(reviewId)));
    } else {
      await db.update(accessReviews)
        .set({ status: 'in_progress' })
        .where(eq(accessReviews.id, parseInt(reviewId)));
    }

    res.json({
      message: 'Review decision submitted',
      item,
    });
  } catch (error) {
    logger.error('Error updating access review item:', error);
    res.status(500).json({ error: 'Failed to update access review item' });
  }
});

// ============================================================================
// SECURITY INCIDENTS
// ============================================================================

/**
 * GET /api/audit/security-incidents
 * List all security incidents
 */
router.get('/security-incidents', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { status, severity, limit = '50', offset = '0' } = req.query;

    const conditions = [];

    if (user.tenantId) {
      conditions.push(eq(securityIncidents.tenantId, user.tenantId));
    }

    if (status) {
      conditions.push(eq(securityIncidents.status, status as string));
    }

    if (severity) {
      conditions.push(eq(securityIncidents.severity, severity as string));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const incidents = await db.select({
      id: securityIncidents.id,
      incidentId: securityIncidents.incidentId,
      incidentType: securityIncidents.incidentType,
      severity: securityIncidents.severity,
      title: securityIncidents.title,
      description: securityIncidents.description,
      affectedUsers: securityIncidents.affectedUsers,
      affectedData: securityIncidents.affectedData,
      status: securityIncidents.status,
      assignedTo: securityIncidents.assignedTo,
      detectedAt: securityIncidents.detectedAt,
      containedAt: securityIncidents.containedAt,
      resolvedAt: securityIncidents.resolvedAt,
      closedAt: securityIncidents.closedAt,
      createdAt: securityIncidents.createdAt,
      assignedToName: users.name,
    })
      .from(securityIncidents)
      .leftJoin(users, eq(securityIncidents.assignedTo, users.id))
      .where(whereClause)
      .orderBy(desc(securityIncidents.detectedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get summary by severity
    const severityCounts = await db.select({
      severity: securityIncidents.severity,
      count: count(),
    })
      .from(securityIncidents)
      .where(and(
        user.tenantId ? eq(securityIncidents.tenantId, user.tenantId) : sql`1=1`,
        or(
          eq(securityIncidents.status, 'open'),
          eq(securityIncidents.status, 'investigating'),
          eq(securityIncidents.status, 'contained')
        )
      ))
      .groupBy(securityIncidents.severity);

    res.json({
      incidents,
      summary: {
        bySeverity: severityCounts.reduce((acc, s) => {
          acc[s.severity] = s.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    logger.error('Error fetching security incidents:', error);
    res.status(500).json({ error: 'Failed to fetch security incidents' });
  }
});

/**
 * GET /api/audit/security-incidents/:id
 * Get a single security incident with full details
 */
router.get('/security-incidents/:id', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [incident] = await db.select({
      id: securityIncidents.id,
      incidentId: securityIncidents.incidentId,
      incidentType: securityIncidents.incidentType,
      severity: securityIncidents.severity,
      title: securityIncidents.title,
      description: securityIncidents.description,
      affectedUsers: securityIncidents.affectedUsers,
      affectedData: securityIncidents.affectedData,
      affectedSystems: securityIncidents.affectedSystems,
      detectionMethod: securityIncidents.detectionMethod,
      containmentActions: securityIncidents.containmentActions,
      eradicationActions: securityIncidents.eradicationActions,
      recoveryActions: securityIncidents.recoveryActions,
      lessonsLearned: securityIncidents.lessonsLearned,
      status: securityIncidents.status,
      assignedTo: securityIncidents.assignedTo,
      detectedAt: securityIncidents.detectedAt,
      containedAt: securityIncidents.containedAt,
      resolvedAt: securityIncidents.resolvedAt,
      closedAt: securityIncidents.closedAt,
      createdAt: securityIncidents.createdAt,
      assignedToName: users.name,
    })
      .from(securityIncidents)
      .leftJoin(users, eq(securityIncidents.assignedTo, users.id))
      .where(eq(securityIncidents.id, parseInt(id)));

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({ incident });
  } catch (error) {
    logger.error('Error fetching security incident:', error);
    res.status(500).json({ error: 'Failed to fetch security incident' });
  }
});

/**
 * POST /api/audit/security-incidents
 * Report a new security incident
 */
router.post('/security-incidents', requireMinimumRole(USER_ROLES.OPS_EXECUTIVE), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      incidentType,
      severity,
      title,
      description,
      affectedUsers,
      affectedData,
      affectedSystems,
      detectionMethod,
      assignedTo,
    } = req.body;

    if (!incidentType || !severity || !title || !description) {
      return res.status(400).json({ error: 'Incident type, severity, title, and description are required' });
    }

    // Generate unique incident ID
    const incidentId = `INC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const [incident] = await db.insert(securityIncidents)
      .values({
        tenantId: user.tenantId || null,
        incidentId,
        incidentType,
        severity,
        title,
        description,
        affectedUsers: affectedUsers || null,
        affectedData: affectedData || null,
        affectedSystems: affectedSystems || null,
        detectionMethod: detectionMethod || null,
        status: 'open',
        assignedTo: assignedTo || null,
        detectedAt: new Date(),
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({
      message: 'Security incident reported',
      incident,
    });
  } catch (error) {
    logger.error('Error creating security incident:', error);
    res.status(500).json({ error: 'Failed to create security incident' });
  }
});

/**
 * PATCH /api/audit/security-incidents/:id
 * Update a security incident
 */
router.patch('/security-incidents/:id', requireMinimumRole(USER_ROLES.OPS_MANAGER), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      severity,
      assignedTo,
      containmentActions,
      eradicationActions,
      recoveryActions,
      lessonsLearned,
    } = req.body;

    const updates: Record<string, any> = {};

    if (status) {
      updates.status = status;
      if (status === 'contained') updates.containedAt = new Date();
      if (status === 'resolved') updates.resolvedAt = new Date();
      if (status === 'closed') updates.closedAt = new Date();
    }

    if (severity !== undefined) updates.severity = severity;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (containmentActions !== undefined) updates.containmentActions = containmentActions;
    if (eradicationActions !== undefined) updates.eradicationActions = eradicationActions;
    if (recoveryActions !== undefined) updates.recoveryActions = recoveryActions;
    if (lessonsLearned !== undefined) updates.lessonsLearned = lessonsLearned;

    const [incident] = await db.update(securityIncidents)
      .set(updates)
      .where(eq(securityIncidents.id, parseInt(id)))
      .returning();

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({
      message: 'Incident updated successfully',
      incident,
    });
  } catch (error) {
    logger.error('Error updating security incident:', error);
    res.status(500).json({ error: 'Failed to update security incident' });
  }
});

// ============================================================================
// DATA CLASSIFICATIONS
// ============================================================================

/**
 * GET /api/audit/data-classifications
 * List all data classification rules
 */
router.get('/data-classifications', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { entityType, classification } = req.query;

    const conditions = [];

    if (entityType) {
      conditions.push(eq(dataClassifications.entityType, entityType as string));
    }

    if (classification) {
      conditions.push(eq(dataClassifications.classification, classification as string));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const classifications = await db.select()
      .from(dataClassifications)
      .where(whereClause)
      .orderBy(asc(dataClassifications.entityType), asc(dataClassifications.fieldName));

    res.json({ classifications });
  } catch (error) {
    logger.error('Error fetching data classifications:', error);
    res.status(500).json({ error: 'Failed to fetch data classifications' });
  }
});

/**
 * POST /api/audit/data-classifications
 * Create a new data classification rule
 */
router.post('/data-classifications', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const {
      entityType,
      fieldName,
      classification,
      handlingRequirements,
      retentionDays,
      encryptionRequired,
      maskingRequired,
      maskingPattern,
    } = req.body;

    if (!entityType || !fieldName || !classification) {
      return res.status(400).json({ error: 'Entity type, field name, and classification are required' });
    }

    const [rule] = await db.insert(dataClassifications)
      .values({
        entityType,
        fieldName,
        classification,
        handlingRequirements: handlingRequirements || null,
        retentionDays: retentionDays || null,
        encryptionRequired: encryptionRequired || false,
        maskingRequired: maskingRequired || false,
        maskingPattern: maskingPattern || null,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json({
      message: 'Data classification rule created',
      rule,
    });
  } catch (error) {
    logger.error('Error creating data classification:', error);
    res.status(500).json({ error: 'Failed to create data classification' });
  }
});

/**
 * PATCH /api/audit/data-classifications/:id
 * Update a data classification rule
 */
router.patch('/data-classifications/:id', requireMinimumRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      classification,
      handlingRequirements,
      retentionDays,
      encryptionRequired,
      maskingRequired,
      maskingPattern,
    } = req.body;

    const updates: Record<string, any> = {};

    if (classification !== undefined) updates.classification = classification;
    if (handlingRequirements !== undefined) updates.handlingRequirements = handlingRequirements;
    if (retentionDays !== undefined) updates.retentionDays = retentionDays;
    if (encryptionRequired !== undefined) updates.encryptionRequired = encryptionRequired;
    if (maskingRequired !== undefined) updates.maskingRequired = maskingRequired;
    if (maskingPattern !== undefined) updates.maskingPattern = maskingPattern;

    const [rule] = await db.update(dataClassifications)
      .set(updates)
      .where(eq(dataClassifications.id, parseInt(id)))
      .returning();

    if (!rule) {
      return res.status(404).json({ error: 'Classification rule not found' });
    }

    res.json({
      message: 'Classification rule updated',
      rule,
    });
  } catch (error) {
    logger.error('Error updating data classification:', error);
    res.status(500).json({ error: 'Failed to update data classification' });
  }
});

export default router;
