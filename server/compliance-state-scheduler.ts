/**
 * Compliance State Scheduler
 * 
 * Scheduled jobs for compliance state recalculation:
 * - Nightly: Full recalc of all entities (prevent drift)
 * - Hourly: Recalc AMBER/RED entities (catch time-based state changes)
 * 
 * Design:
 * - Uses node-cron for scheduling
 * - Integrated with job-lifecycle-manager
 * - Metrics tracking
 */

import cron from 'node-cron';
import { ComplianceStateEngine } from './compliance-state-engine';
import { db } from './db';
import { complianceStates } from '../shared/compliance-state-schema';
import { businessEntities } from '../shared/schema';
import { eq, inArray } from 'drizzle-orm';
import { jobManager } from './job-lifecycle-manager';
import { logger } from './logger';
import { syncComplianceTracking } from './compliance-tracking-sync';

interface SchedulerMetrics {
  lastNightlyRun: Date | null;
  lastHourlyRun: Date | null;
  nightlySuccessCount: number;
  nightlyFailureCount: number;
  hourlySuccessCount: number;
  hourlyFailureCount: number;
  lastError: string | null;
}

class ComplianceStateScheduler {
  private engine: ComplianceStateEngine;
  private metrics: SchedulerMetrics;
  private nightlyJob: cron.ScheduledTask | null = null;
  private hourlyJob: cron.ScheduledTask | null = null;

  constructor() {
    this.engine = new ComplianceStateEngine();
    this.metrics = {
      lastNightlyRun: null,
      lastHourlyRun: null,
      nightlySuccessCount: 0,
      nightlyFailureCount: 0,
      hourlySuccessCount: 0,
      hourlyFailureCount: 0,
      lastError: null,
    };
  }

  /**
   * Start all scheduled jobs
   */
  start(): void {
    logger.info('[ComplianceStateScheduler] Starting scheduled jobs...');

    // Nightly job: 2:00 AM every day
    // Recalculate ALL entities to prevent drift
    this.nightlyJob = cron.schedule('0 2 * * *', async () => {
      logger.info('[ComplianceStateScheduler] Starting nightly full recalculation...');
      await this.runNightlyRecalculation();
    });

    // Register with job manager
    jobManager.registerCron(
      'compliance-nightly-recalc',
      this.nightlyJob,
      'Nightly full compliance state recalculation (2:00 AM)'
    );

    // Hourly job: Every hour at :15 past the hour
    // Recalculate only AMBER/RED entities (catch time-based changes)
    this.hourlyJob = cron.schedule('15 * * * *', async () => {
      logger.info('[ComplianceStateScheduler] Starting hourly AMBER/RED recalculation...');
      await this.runHourlyRecalculation();
    });

    // Register with job manager
    jobManager.registerCron(
      'compliance-hourly-recalc',
      this.hourlyJob,
      'Hourly AMBER/RED compliance state recalculation (:15 past hour)'
    );

    logger.info('[ComplianceStateScheduler] Jobs started:');
    logger.info('  - Nightly (2:00 AM): Full recalculation');
    logger.info('  - Hourly (:15 past): AMBER/RED recalculation');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    logger.info('[ComplianceStateScheduler] Stopping scheduled jobs...');
    
    // Jobs are managed by jobManager, just mark them as stopped locally
    if (this.nightlyJob) {
      this.nightlyJob = null;
    }
    
    if (this.hourlyJob) {
      this.hourlyJob = null;
    }
    
    logger.info('[ComplianceStateScheduler] Jobs stopped');
  }

  /**
   * Nightly: Recalculate ALL entities
   * 
   * Purpose:
   * - Prevent state drift
   * - Catch any missed events
   * - Fix corrupted states
   * - Baseline "truth" reset
   */
  private async runNightlyRecalculation(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('[Nightly] Starting full recalculation...');
      
      const syncResult = await syncComplianceTracking();
      logger.info(`[Nightly] Compliance tracking sync created ${syncResult.created} items`);

      // Get all active business entities
      const entities = await db
        .select({ id: businessEntities.id })
        .from(businessEntities)
        .where(eq(businessEntities.isActive, true));

      logger.info(`[Nightly] Found ${entities.length} entities to recalculate`);

      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      // Recalculate each entity
      for (const entity of entities) {
        try {
          await this.engine.calculateEntityState(entity.id);
          successCount++;
        } catch (error) {
          failureCount++;
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push(`Entity ${entity.id}: ${errorMsg}`);
          logger.error(`[Nightly] Failed to recalculate entity ${entity.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      
      // Update metrics
      this.metrics.lastNightlyRun = new Date();
      this.metrics.nightlySuccessCount++;
      this.metrics.lastError = null;

      logger.info(`[Nightly] Completed in ${duration}ms`);
      logger.info(`[Nightly] Success: ${successCount}, Failures: ${failureCount}`);

      if (failureCount > 0) {
        logger.error(`[Nightly] Errors encountered:`, { errors });
        // TODO: Send alert if failures exceed threshold
      }

    } catch (error) {
      this.metrics.nightlyFailureCount++;
      this.metrics.lastError = error instanceof Error ? error.message : String(error);
      
      logger.error('[Nightly] Job failed:', error);
      
      // TODO: Send critical alert
      // If 3 consecutive failures, page someone
    }
  }

  /**
   * Hourly: Recalculate AMBER/RED entities
   * 
   * Purpose:
   * - Catch time-based state changes (due dates approaching)
   * - Update high-risk entities more frequently
   * - Less expensive than full recalc
   */
  private async runHourlyRecalculation(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('[Hourly] Starting AMBER/RED recalculation...');
      
      // Get entities in AMBER or RED state
      const entitiesAtRisk = await db
        .select({ entityId: complianceStates.entityId })
        .from(complianceStates)
        .where(inArray(complianceStates.overallState, ['AMBER', 'RED']));

      logger.info(`[Hourly] Found ${entitiesAtRisk.length} entities at risk`);

      let successCount = 0;
      let failureCount = 0;

      // Recalculate each at-risk entity
      for (const entity of entitiesAtRisk) {
        try {
          await this.engine.calculateEntityState(entity.entityId);
          successCount++;
        } catch (error) {
          failureCount++;
          logger.error(`[Hourly] Failed to recalculate entity ${entity.entityId}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      
      // Update metrics
      this.metrics.lastHourlyRun = new Date();
      this.metrics.hourlySuccessCount++;
      this.metrics.lastError = null;

      logger.info(`[Hourly] Completed in ${duration}ms`);
      logger.info(`[Hourly] Success: ${successCount}, Failures: ${failureCount}`);

    } catch (error) {
      this.metrics.hourlyFailureCount++;
      this.metrics.lastError = error instanceof Error ? error.message : String(error);
      
      logger.error('[Hourly] Job failed:', error);
    }
  }

  /**
   * Manual trigger: Run nightly recalc now (for testing/recovery)
   */
  async triggerNightlyNow(): Promise<void> {
    logger.info('[Manual] Triggering nightly recalculation...');
    await this.runNightlyRecalculation();
  }

  /**
   * Manual trigger: Run hourly recalc now (for testing)
   */
  async triggerHourlyNow(): Promise<void> {
    logger.info('[Manual] Triggering hourly recalculation...');
    await this.runHourlyRecalculation();
  }

  /**
   * Get scheduler metrics
   */
  getMetrics(): SchedulerMetrics {
    return { ...this.metrics };
  }
}

// Export singleton
export const complianceScheduler = new ComplianceStateScheduler();

// Start scheduler on module load (if not in test environment)
if (process.env.NODE_ENV !== 'test') {
  complianceScheduler.start();
  
  logger.info('[ComplianceStateScheduler] Auto-started on module load');
  logger.info('[ComplianceStateScheduler] Jobs registered with job lifecycle manager');
}
