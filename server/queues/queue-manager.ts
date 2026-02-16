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
 * Job processors
 */
const processors: Record<QueueName, (job: Job) => Promise<any>> = {
  // Notification processing
  [QueueNames.NOTIFICATIONS]: async (job) => {
    const { type, recipient, data } = job.data;
    logger.info(`Processing notification: ${type} to ${recipient}`);

    switch (type) {
      case 'email':
        // TODO: Integrate with email service
        break;
      case 'sms':
        // TODO: Integrate with SMS service
        break;
      case 'whatsapp':
        // TODO: Integrate with WhatsApp service
        break;
      case 'push':
        // TODO: Integrate with push notification service
        break;
    }

    return { sent: true, timestamp: new Date().toISOString() };
  },

  // Escalation processing
  [QueueNames.ESCALATIONS]: async (job) => {
    const { serviceRequestId, escalationLevel, reason } = job.data;
    logger.info(`Processing escalation: SR ${serviceRequestId} to level ${escalationLevel}`);

    // TODO: Implement escalation logic
    // - Update SLA timer
    // - Notify appropriate managers
    // - Create escalation record

    return { escalated: true, level: escalationLevel };
  },

  // Compliance processing
  [QueueNames.COMPLIANCE]: async (job) => {
    const { action, entityId, ruleId } = job.data;
    logger.info(`Processing compliance action: ${action} for entity ${entityId}`);

    switch (action) {
      case 'check_deadlines':
        // Check upcoming deadlines and create alerts
        break;
      case 'calculate_health_score':
        // Recalculate compliance health score
        break;
      case 'sync_tracking':
        // Sync compliance tracking records
        break;
    }

    return { processed: true, action };
  },

  // Report generation
  [QueueNames.REPORTS]: async (job) => {
    const { reportType, filters, requestedBy } = job.data;
    logger.info(`Generating report: ${reportType} for user ${requestedBy}`);

    // TODO: Implement report generation
    // - Query data based on filters
    // - Generate report (PDF/Excel)
    // - Store in document vault
    // - Notify user

    return { generated: true, reportType };
  },

  // Data sync operations
  [QueueNames.SYNC]: async (job) => {
    const { source, target, operation } = job.data;
    logger.info(`Sync operation: ${operation} from ${source} to ${target}`);

    // TODO: Implement sync operations
    // - External API sync
    // - Data migration tasks
    // - Cleanup operations

    return { synced: true, operation };
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
