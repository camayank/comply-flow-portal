/**
 * Bull Queue Manager
 *
 * Background job processing infrastructure for:
 * - Email/SMS/WhatsApp notifications
 * - SLA escalation checks
 * - Compliance deadline processing
 * - Report generation
 * - Data sync operations
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { logger } from '../logger';

// Queue names
export const QueueNames = {
  NOTIFICATIONS: 'notifications',
  ESCALATIONS: 'escalations',
  COMPLIANCE: 'compliance',
  REPORTS: 'reports',
  SYNC: 'sync',
} as const;

type QueueName = typeof QueueNames[keyof typeof QueueNames];

// Connection configuration
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return null;
  }
};

// Queue instances
const queues = new Map<QueueName, Queue>();
const workers = new Map<QueueName, Worker>();
const queueEvents = new Map<QueueName, QueueEvents>();

/**
 * Initialize a queue with its worker
 */
function createQueue(
  name: QueueName,
  processor: (job: Job) => Promise<any>,
  concurrency: number = 5
): Queue | null {
  const connection = getRedisConnection();

  if (!connection) {
    logger.warn(`Queue ${name}: Redis not configured, using in-process fallback`);
    return null;
  }

  try {
    // Create queue
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          count: 5000, // Keep last 5000 failed jobs for debugging
        },
      },
    });

    // Create worker
    const worker = new Worker(name, processor, {
      connection,
      concurrency,
      limiter: {
        max: 100, // Max 100 jobs per duration
        duration: 1000, // Per second
      },
    });

    // Create queue events for monitoring
    const events = new QueueEvents(name, { connection });

    // Event handlers
    worker.on('completed', (job) => {
      logger.debug(`Job ${job.id} completed in queue ${name}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed in queue ${name}:`, err.message);
    });

    worker.on('error', (err) => {
      logger.error(`Worker error in queue ${name}:`, err.message);
    });

    events.on('waiting', ({ jobId }) => {
      logger.debug(`Job ${jobId} waiting in queue ${name}`);
    });

    // Store references
    queues.set(name, queue);
    workers.set(name, worker);
    queueEvents.set(name, events);

    logger.info(`Queue ${name} initialized with concurrency ${concurrency}`);
    return queue;
  } catch (error) {
    logger.error(`Failed to create queue ${name}:`, error);
    return null;
  }
}

/**
 * Job processors - Now integrated with notification hub
 */
const processors: Record<QueueName, (job: Job) => Promise<any>> = {
  // Notification processing - Uses notification hub
  [QueueNames.NOTIFICATIONS]: async (job) => {
    const { type, userId, to, channels, subject, content, data, referenceType, referenceId } = job.data;
    logger.info(`Processing notification: ${type} to ${userId || to}`);

    try {
      // Dynamic import to avoid circular dependencies
      const { notificationHub } = await import('../services/notifications');

      const result = await notificationHub.send({
        userId,
        to,
        type,
        channels: channels || ['in_app'],
        subject,
        content,
        data,
        referenceType,
        referenceId,
        immediate: true,
        respectPreferences: true,
      });

      return {
        sent: result.allSucceeded,
        results: result.results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Notification processing failed:', error);
      throw error;
    }
  },

  // Escalation processing - Notifies managers
  [QueueNames.ESCALATIONS]: async (job) => {
    const { serviceRequestId, escalationLevel, reason, assignedTo, clientId } = job.data;
    logger.info(`Processing escalation: SR ${serviceRequestId} to level ${escalationLevel}`);

    try {
      const { notificationHub } = await import('../services/notifications');
      const { db } = await import('../db');
      const { sql } = await import('drizzle-orm');

      // Get managers for this escalation level
      const managers = await db.execute(sql`
        SELECT id, full_name, email
        FROM users
        WHERE role IN ('ops_manager', 'admin', 'super_admin')
        AND is_active = true
        LIMIT 5
      `);

      // Notify each manager
      for (const manager of managers.rows) {
        await notificationHub.send({
          userId: manager.id as number,
          type: 'escalation',
          channels: ['in_app', 'email', 'push'],
          subject: `Escalation Alert: Service Request #${serviceRequestId}`,
          content: `Service request has been escalated to level ${escalationLevel}. Reason: ${reason}`,
          data: { serviceRequestId, escalationLevel, reason },
          referenceType: 'service_request',
          referenceId: serviceRequestId,
          priority: 'high',
        });
      }

      return { escalated: true, level: escalationLevel, notifiedManagers: managers.rows.length };
    } catch (error) {
      logger.error('Escalation processing failed:', error);
      throw error;
    }
  },

  // Compliance processing - Checks deadlines and sends reminders
  [QueueNames.COMPLIANCE]: async (job) => {
    const { action, entityId, clientId, daysAhead = 7 } = job.data;
    logger.info(`Processing compliance action: ${action} for entity ${entityId || 'all'}`);

    try {
      const { notificationHub } = await import('../services/notifications');
      const { db } = await import('../db');
      const { sql } = await import('drizzle-orm');

      switch (action) {
        case 'check_deadlines': {
          // Find upcoming deadlines
          const deadlines = await db.execute(sql`
            SELECT ct.*, u.id as user_id, u.full_name, u.email
            FROM compliance_tracking ct
            JOIN users u ON ct.client_id = u.id
            WHERE ct.due_date BETWEEN NOW() AND NOW() + INTERVAL '${daysAhead} days'
            AND ct.status NOT IN ('completed', 'filed')
          `);

          // Send reminders
          for (const deadline of deadlines.rows) {
            const daysRemaining = Math.ceil(
              (new Date(deadline.due_date as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            await notificationHub.send({
              userId: deadline.user_id as number,
              type: 'compliance_reminder',
              channels: ['in_app', 'email'],
              templateId: 'compliance_reminder',
              subject: `Compliance Reminder: ${deadline.compliance_type}`,
              content: `Your ${deadline.compliance_type} is due in ${daysRemaining} days.`,
              data: {
                complianceType: deadline.compliance_type,
                dueDate: deadline.due_date,
                daysRemaining,
              },
              referenceType: 'compliance',
              referenceId: deadline.id as number,
            });
          }

          return { processed: true, action, remindersent: deadlines.rows.length };
        }

        case 'calculate_health_score': {
          // Placeholder for health score calculation
          return { processed: true, action, entityId };
        }

        default:
          return { processed: true, action };
      }
    } catch (error) {
      logger.error('Compliance processing failed:', error);
      throw error;
    }
  },

  // Report generation - Creates and notifies
  [QueueNames.REPORTS]: async (job) => {
    const { reportType, filters, requestedBy, format = 'pdf' } = job.data;
    logger.info(`Generating report: ${reportType} for user ${requestedBy}`);

    try {
      const { notificationHub } = await import('../services/notifications');

      // Placeholder: Report would be generated here
      // In a real implementation, you'd query data, generate PDF/Excel, store it

      // Notify user that report is ready
      await notificationHub.send({
        userId: requestedBy,
        type: 'report_ready',
        channels: ['in_app', 'email'],
        subject: `Your ${reportType} Report is Ready`,
        content: `The ${reportType} report you requested has been generated and is ready for download.`,
        data: {
          reportType,
          format,
          // downloadUrl would be included here
        },
      });

      return { generated: true, reportType, format };
    } catch (error) {
      logger.error('Report generation failed:', error);
      throw error;
    }
  },

  // Data sync operations
  [QueueNames.SYNC]: async (job) => {
    const { source, target, operation, entityType, entityId } = job.data;
    logger.info(`Sync operation: ${operation} from ${source} to ${target}`);

    try {
      switch (operation) {
        case 'kyc_verification': {
          // Queue for KYC document OCR verification
          // Would integrate with OCR service
          return { synced: true, operation, entityId };
        }

        case 'external_api_sync': {
          // Placeholder for external API sync
          return { synced: true, operation, source, target };
        }

        default:
          return { synced: true, operation };
      }
    } catch (error) {
      logger.error('Sync operation failed:', error);
      throw error;
    }
  },
};

/**
 * Initialize all queues
 */
export async function initializeQueues(): Promise<boolean> {
  const connection = getRedisConnection();

  if (!connection) {
    logger.warn('Queues: Redis not available, background jobs will run in-process');
    return false;
  }

  try {
    // Initialize each queue
    createQueue(QueueNames.NOTIFICATIONS, processors[QueueNames.NOTIFICATIONS], 10);
    createQueue(QueueNames.ESCALATIONS, processors[QueueNames.ESCALATIONS], 5);
    createQueue(QueueNames.COMPLIANCE, processors[QueueNames.COMPLIANCE], 5);
    createQueue(QueueNames.REPORTS, processors[QueueNames.REPORTS], 2);
    createQueue(QueueNames.SYNC, processors[QueueNames.SYNC], 3);

    logger.info('All queues initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize queues:', error);
    return false;
  }
}

/**
 * Add job to queue
 */
export async function addJob<T>(
  queueName: QueueName,
  jobName: string,
  data: T,
  options?: {
    delay?: number;
    priority?: number;
    jobId?: string;
  }
): Promise<string | null> {
  const queue = queues.get(queueName);

  if (!queue) {
    // Fallback: process immediately in-process
    logger.debug(`Queue ${queueName} not available, processing ${jobName} in-process`);
    try {
      await processors[queueName]({ data, name: jobName } as Job);
      return `inline-${Date.now()}`;
    } catch (error) {
      logger.error(`In-process job ${jobName} failed:`, error);
      return null;
    }
  }

  try {
    const job = await queue.add(jobName, data, {
      delay: options?.delay,
      priority: options?.priority,
      jobId: options?.jobId,
    });
    return job.id || null;
  } catch (error) {
    logger.error(`Failed to add job ${jobName} to queue ${queueName}:`, error);
    return null;
  }
}

/**
 * Add recurring job (cron-based)
 */
export async function addRecurringJob<T>(
  queueName: QueueName,
  jobName: string,
  data: T,
  cronExpression: string
): Promise<boolean> {
  const queue = queues.get(queueName);

  if (!queue) {
    logger.warn(`Cannot add recurring job ${jobName}: queue ${queueName} not available`);
    return false;
  }

  try {
    await queue.upsertJobScheduler(
      jobName,
      { pattern: cronExpression },
      {
        name: jobName,
        data,
      }
    );
    logger.info(`Recurring job ${jobName} scheduled with cron: ${cronExpression}`);
    return true;
  } catch (error) {
    logger.error(`Failed to add recurring job ${jobName}:`, error);
    return false;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<Record<string, any>> {
  const stats: Record<string, any> = {
    available: queues.size > 0,
    queues: {},
  };

  for (const [name, queue] of queues) {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      stats.queues[name] = { waiting, active, completed, failed, delayed };
    } catch {
      stats.queues[name] = { error: 'Unable to fetch stats' };
    }
  }

  return stats;
}

/**
 * Graceful shutdown
 */
export async function closeQueues(): Promise<void> {
  logger.info('Closing all queues...');

  // Close workers first
  for (const [name, worker] of workers) {
    try {
      await worker.close();
      logger.debug(`Worker ${name} closed`);
    } catch (error) {
      logger.error(`Error closing worker ${name}:`, error);
    }
  }

  // Close queue events
  for (const [name, events] of queueEvents) {
    try {
      await events.close();
      logger.debug(`QueueEvents ${name} closed`);
    } catch (error) {
      logger.error(`Error closing queue events ${name}:`, error);
    }
  }

  // Close queues
  for (const [name, queue] of queues) {
    try {
      await queue.close();
      logger.debug(`Queue ${name} closed`);
    } catch (error) {
      logger.error(`Error closing queue ${name}:`, error);
    }
  }

  queues.clear();
  workers.clear();
  queueEvents.clear();

  logger.info('All queues closed');
}
