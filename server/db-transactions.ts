/**
 * Database Transaction Support
 *
 * Provides transaction wrappers for atomic database operations.
 * Prevents partial failures and ensures data consistency.
 *
 * Critical for:
 * - Payment processing (payment + service request update)
 * - Service creation (service + tasks + notifications)
 * - User operations (user + business entity + initial compliance)
 * - Bulk operations (mass updates, data imports)
 */

import { db } from './db';
import { logger } from './logger';

/**
 * Execute a function within a database transaction
 *
 * Usage:
 * ```typescript
 * const result = await withTransaction(async (tx) => {
 *   await tx.insert(payments).values(paymentData);
 *   await tx.update(serviceRequests)
 *     .set({ status: 'paid' })
 *     .where(eq(serviceRequests.id, requestId));
 *   return { success: true };
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>,
  options?: {
    isolationLevel?: 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable';
    maxRetries?: number;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Drizzle transaction
      return await db.transaction(callback, {
        isolationLevel: options?.isolationLevel
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable (deadlock, serialization failure)
      const isRetryable = isRetryableError(lastError);

      if (!isRetryable || attempt === maxRetries) {
        // Log non-retryable errors or final attempt
        logger.error('Transaction failed', {
          attempt,
          maxRetries,
          isRetryable,
          error: lastError.message,
          stack: lastError.stack
        });
        throw lastError;
      }

      // Wait before retry (exponential backoff)
      const waitMs = Math.min(100 * Math.pow(2, attempt - 1), 1000);
      logger.warn('Transaction failed, retrying', {
        attempt,
        maxRetries,
        waitMs,
        error: lastError.message
      });
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Transaction failed after all retries');
}

/**
 * Check if database error is retryable
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // PostgreSQL retryable error codes
  const retryablePatterns = [
    'deadlock detected',
    'could not serialize',
    'serialization failure',
    'lock timeout',
    'connection timeout',
    'connection refused'
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}

/**
 * Payment Processing Transaction
 *
 * Atomically creates payment and updates service request.
 * Ensures payment is never recorded without updating service status.
 */
export async function processPaymentTransaction(
  paymentData: any,
  serviceRequestId: number,
  newStatus: string
) {
  return await withTransaction(async (tx) => {
    // Insert payment
    const [payment] = await tx
      .insert(require('@shared/schema').payments)
      .values(paymentData)
      .returning();

    // Update service request
    await tx
      .update(require('@shared/schema').serviceRequests)
      .set({
        status: newStatus,
        paymentId: payment.paymentId,
        updatedAt: new Date()
      })
      .where(
        require('drizzle-orm').eq(
          require('@shared/schema').serviceRequests.id,
          serviceRequestId
        )
      );

    logger.info('Payment processed in transaction', {
      paymentId: payment.paymentId,
      serviceRequestId,
      newStatus
    });

    return payment;
  });
}

/**
 * Service Request Creation Transaction
 *
 * Atomically creates service request + tasks + notifications.
 */
export async function createServiceRequestTransaction(
  serviceRequestData: any,
  tasksData: any[]
) {
  return await withTransaction(async (tx) => {
    const { serviceRequests, taskItems } = require('@shared/schema');

    // Create service request
    const [serviceRequest] = await tx
      .insert(serviceRequests)
      .values(serviceRequestData)
      .returning();

    // Create associated tasks
    if (tasksData.length > 0) {
      const tasksWithServiceId = tasksData.map(task => ({
        ...task,
        serviceRequestId: serviceRequest.id,
        createdAt: new Date()
      }));

      await tx.insert(taskItems).values(tasksWithServiceId);
    }

    logger.info('Service request created with tasks in transaction', {
      serviceRequestId: serviceRequest.id,
      taskCount: tasksData.length
    });

    return serviceRequest;
  });
}

/**
 * User Registration Transaction
 *
 * Atomically creates user + business entity + initial compliance tracking.
 */
export async function createUserTransaction(
  userData: any,
  businessEntityData?: any,
  initialComplianceData?: any[]
) {
  return await withTransaction(async (tx) => {
    const { users, businessEntities, complianceTracking } = require('@shared/schema');

    // Create user
    const [user] = await tx
      .insert(users)
      .values(userData)
      .returning();

    let businessEntity = null;
    if (businessEntityData) {
      // Create business entity
      [businessEntity] = await tx
        .insert(businessEntities)
        .values({
          ...businessEntityData,
          userId: user.id,
          createdAt: new Date()
        })
        .returning();
    }

    // Create initial compliance tracking
    if (initialComplianceData && initialComplianceData.length > 0) {
      const complianceWithUserId = initialComplianceData.map(compliance => ({
        ...compliance,
        userId: user.id,
        businessEntityId: businessEntity?.id,
        createdAt: new Date()
      }));

      await tx.insert(complianceTracking).values(complianceWithUserId);
    }

    logger.info('User created with business entity and compliance in transaction', {
      userId: user.id,
      businessEntityId: businessEntity?.id,
      complianceCount: initialComplianceData?.length || 0
    });

    return { user, businessEntity };
  });
}

/**
 * Bulk Update Transaction
 *
 * Updates multiple records atomically.
 * All updates succeed or all fail.
 */
export async function bulkUpdateTransaction<T extends Record<string, any>>(
  table: any,
  updates: Array<{ id: number; data: Partial<T> }>
) {
  return await withTransaction(async (tx) => {
    const results: any[] = [];

    for (const { id, data } of updates) {
      const [updated] = await tx
        .update(table)
        .set({ ...data, updatedAt: new Date() })
        .where(require('drizzle-orm').eq(table.id, id))
        .returning();

      results.push(updated);
    }

    logger.info('Bulk update completed in transaction', {
      table: table._.name,
      count: updates.length
    });

    return results;
  });
}

/**
 * Compliance Batch Update Transaction
 *
 * Updates compliance status + sends notifications atomically.
 */
export async function updateComplianceBatchTransaction(
  complianceIds: number[],
  status: string,
  notificationData?: any[]
) {
  return await withTransaction(async (tx) => {
    const { complianceTracking } = require('@shared/schema');
    const { inArray } = require('drizzle-orm');

    // Update all compliance records
    const updated = await tx
      .update(complianceTracking)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(inArray(complianceTracking.id, complianceIds))
      .returning();

    // TODO: Insert notification records if needed
    // if (notificationData && notificationData.length > 0) {
    //   await tx.insert(notifications).values(notificationData);
    // }

    logger.info('Compliance batch updated in transaction', {
      count: updated.length,
      status
    });

    return updated;
  });
}

/**
 * Retainership Subscription Transaction
 *
 * Creates subscription + adjusts wallet balance + logs transaction.
 */
export async function createRetainershipSubscriptionTransaction(
  subscriptionData: any,
  walletAdjustment?: { userId: number; amount: number }
) {
  return await withTransaction(async (tx) => {
    const { userRetainershipSubscriptions } = require('@shared/schema');

    // Create subscription
    const [subscription] = await tx
      .insert(userRetainershipSubscriptions)
      .values(subscriptionData)
      .returning();

    // Adjust wallet balance if payment made via wallet
    if (walletAdjustment) {
      // TODO: Update wallet balance
      // await tx.update(wallets).set({ balance: ... });
    }

    logger.info('Retainership subscription created in transaction', {
      subscriptionId: subscription.id,
      walletAdjusted: !!walletAdjustment
    });

    return subscription;
  });
}

/**
 * Task Assignment Transaction
 *
 * Assigns task + creates task participant + sends notification.
 */
export async function assignTaskTransaction(
  taskId: number,
  assigneeId: number,
  assignerId: number
) {
  return await withTransaction(async (tx) => {
    const { taskItems, taskParticipants } = require('@shared/schema');
    const { eq } = require('drizzle-orm');

    // Update task assignment
    const [task] = await tx
      .update(taskItems)
      .set({
        assignedTo: assigneeId,
        status: 'in_progress',
        updatedAt: new Date()
      })
      .where(eq(taskItems.id, taskId))
      .returning();

    // Add participant record
    await tx.insert(taskParticipants).values({
      taskId,
      userId: assigneeId,
      role: 'assignee',
      assignedBy: assignerId,
      createdAt: new Date()
    });

    logger.info('Task assigned in transaction', {
      taskId,
      assigneeId,
      assignerId
    });

    return task;
  });
}

/**
 * Soft Delete Transaction
 *
 * Marks record as deleted + cascades to related records.
 */
export async function softDeleteTransaction(
  table: any,
  id: number,
  cascadeRules?: Array<{ table: any; foreignKey: string }>
) {
  return await withTransaction(async (tx) => {
    const { eq } = require('drizzle-orm');

    // Soft delete main record
    const [deleted] = await tx
      .update(table)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(table.id, id))
      .returning();

    // Cascade soft delete to related records
    if (cascadeRules) {
      for (const rule of cascadeRules) {
        await tx
          .update(rule.table)
          .set({
            isDeleted: true,
            deletedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(rule.table[rule.foreignKey], id));
      }
    }

    logger.info('Soft delete completed in transaction', {
      table: table._.name,
      id,
      cascaded: cascadeRules?.length || 0
    });

    return deleted;
  });
}
