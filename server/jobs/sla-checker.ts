/**
 * SLA Checker Job
 *
 * Scheduled job that runs periodically to check SLA status
 * of all open service requests and escalate as needed.
 *
 * Recommended to run every 15-30 minutes via cron or job scheduler.
 */

import { slaService } from '../services/sla-service';
import { logger } from '../logger';

/**
 * Run SLA check for all open service requests
 * This function should be called by a job scheduler
 */
export async function runSLACheck(): Promise<void> {
  const startTime = Date.now();
  logger.info('Starting SLA check job');

  try {
    const result = await slaService.checkBreachesAndEscalate();

    const duration = Date.now() - startTime;
    logger.info(`SLA check completed`, {
      checked: result.checked,
      escalated: result.escalated,
      breached: result.breached,
      errors: result.errors,
      durationMs: duration
    });
  } catch (error) {
    logger.error('SLA check failed:', error);
    throw error;
  }
}

/**
 * Get SLA summary for monitoring
 */
export async function getSLASummary(): Promise<{
  total: number;
  atRisk: number;
  breached: number;
  onTrack: number;
}> {
  try {
    return await slaService.getSLASummary();
  } catch (error) {
    logger.error('Failed to get SLA summary:', error);
    return { total: 0, atRisk: 0, breached: 0, onTrack: 0 };
  }
}

// Export for use as standalone script
if (require.main === module) {
  runSLACheck()
    .then(() => {
      logger.info('SLA check job completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('SLA check job failed:', error);
      process.exit(1);
    });
}
