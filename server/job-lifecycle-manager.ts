/**
 * Background Job Lifecycle Manager
 *
 * Centralized management for all background jobs (cron, intervals, timeouts).
 * Prevents resource leaks, duplicate processing, and zombie processes.
 *
 * Critical for:
 * - Horizontal scaling (prevent duplicate job execution)
 * - Graceful shutdown (stop jobs before closing server)
 * - Resource management (clear intervals, cancel pending timers)
 * - Debugging (track active jobs)
 */

import { logger } from './logger';

export interface ManagedJob {
  id: string;
  type: 'interval' | 'cron' | 'timeout';
  description: string;
  handle: NodeJS.Timeout | any; // 'any' for cron jobs
  startedAt: Date;
  lastRun?: Date;
  runCount: number;
}

export class JobLifecycleManager {
  private static instance: JobLifecycleManager;
  private jobs: Map<string, ManagedJob> = new Map();
  private isShuttingDown: boolean = false;

  private constructor() {}

  static getInstance(): JobLifecycleManager {
    if (!JobLifecycleManager.instance) {
      JobLifecycleManager.instance = new JobLifecycleManager();
    }
    return JobLifecycleManager.instance;
  }

  /**
   * Register a setInterval job
   */
  registerInterval(
    id: string,
    callback: () => void | Promise<void>,
    intervalMs: number,
    description: string
  ): NodeJS.Timeout {
    if (this.isShuttingDown) {
      logger.warn('Attempted to register job during shutdown', { id, description });
      throw new Error('Cannot register jobs during shutdown');
    }

    if (this.jobs.has(id)) {
      logger.error('Job ID already exists', { id, existingJob: this.jobs.get(id) });
      throw new Error(`Job ${id} is already registered`);
    }

    const wrappedCallback = async () => {
      const job = this.jobs.get(id);
      if (!job) return;

      try {
        job.lastRun = new Date();
        job.runCount++;
        await callback();
      } catch (error) {
        logger.error('Background job failed', {
          jobId: id,
          description,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    };

    const handle = setInterval(wrappedCallback, intervalMs);

    this.jobs.set(id, {
      id,
      type: 'interval',
      description,
      handle,
      startedAt: new Date(),
      runCount: 0
    });

    logger.info('Background job registered', {
      id,
      type: 'interval',
      description,
      intervalMs
    });

    return handle;
  }

  /**
   * Register a cron job
   */
  registerCron(
    id: string,
    cronHandle: any,
    description: string
  ): void {
    if (this.isShuttingDown) {
      logger.warn('Attempted to register cron during shutdown', { id, description });
      throw new Error('Cannot register jobs during shutdown');
    }

    if (this.jobs.has(id)) {
      logger.error('Job ID already exists', { id });
      throw new Error(`Job ${id} is already registered`);
    }

    this.jobs.set(id, {
      id,
      type: 'cron',
      description,
      handle: cronHandle,
      startedAt: new Date(),
      runCount: 0
    });

    logger.info('Cron job registered', { id, description });
  }

  /**
   * Register a setTimeout job
   */
  registerTimeout(
    id: string,
    callback: () => void | Promise<void>,
    timeoutMs: number,
    description: string
  ): NodeJS.Timeout {
    if (this.isShuttingDown) {
      logger.warn('Attempted to register timeout during shutdown', { id, description });
      throw new Error('Cannot register jobs during shutdown');
    }

    if (this.jobs.has(id)) {
      logger.error('Job ID already exists', { id });
      throw new Error(`Job ${id} is already registered`);
    }

    const wrappedCallback = async () => {
      try {
        await callback();
      } catch (error) {
        logger.error('Timeout job failed', {
          jobId: id,
          description,
          error: error instanceof Error ? error.message : error
        });
      } finally {
        // Auto-remove after execution
        this.jobs.delete(id);
      }
    };

    const handle = setTimeout(wrappedCallback, timeoutMs);

    this.jobs.set(id, {
      id,
      type: 'timeout',
      description,
      handle,
      startedAt: new Date(),
      runCount: 0
    });

    logger.info('Timeout job registered', { id, description, timeoutMs });

    return handle;
  }

  /**
   * Stop a specific job
   */
  stopJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) {
      logger.warn('Attempted to stop non-existent job', { id });
      return false;
    }

    try {
      if (job.type === 'interval' || job.type === 'timeout') {
        clearInterval(job.handle);
        clearTimeout(job.handle);
      } else if (job.type === 'cron') {
        // Cron jobs from node-cron have a .stop() method
        if (job.handle && typeof job.handle.stop === 'function') {
          job.handle.stop();
        }
      }

      this.jobs.delete(id);

      logger.info('Background job stopped', {
        id,
        type: job.type,
        description: job.description,
        runCount: job.runCount,
        uptime: Date.now() - job.startedAt.getTime()
      });

      return true;
    } catch (error) {
      logger.error('Failed to stop job', {
        id,
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  /**
   * Stop all jobs (for graceful shutdown)
   */
  async stopAll(): Promise<void> {
    this.isShuttingDown = true;

    logger.info('Stopping all background jobs', {
      totalJobs: this.jobs.size,
      jobs: Array.from(this.jobs.keys())
    });

    const stopPromises: Promise<boolean>[] = [];

    for (const [id] of this.jobs) {
      stopPromises.push(
        Promise.resolve(this.stopJob(id))
      );
    }

    await Promise.all(stopPromises);

    logger.info('All background jobs stopped', {
      stoppedCount: stopPromises.length
    });
  }

  /**
   * Get status of all jobs (for monitoring)
   */
  getStatus(): ManagedJob[] {
    return Array.from(this.jobs.values()).map(job => ({
      ...job,
      handle: undefined // Don't expose handles in status
    }));
  }

  /**
   * Get status of a specific job
   */
  getJobStatus(id: string): ManagedJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    return {
      ...job,
      handle: undefined
    };
  }

  /**
   * Check if a job is running
   */
  isJobRunning(id: string): boolean {
    return this.jobs.has(id);
  }

  /**
   * Get count of active jobs
   */
  getActiveJobCount(): number {
    return this.jobs.size;
  }
}

// Export singleton instance
export const jobManager = JobLifecycleManager.getInstance();
