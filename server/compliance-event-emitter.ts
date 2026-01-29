/**
 * Compliance Event Emitter
 * 
 * Central event bus for entity state changes
 * Triggers state recalculation when relevant data changes
 * 
 * Design: Debounced queue to prevent calculation storms
 */

import { EventEmitter } from 'events';
import { stateEngine } from './compliance-state-engine';

export type EntityChangeReason = 
  | 'document_uploaded'
  | 'document_approved'
  | 'document_rejected'
  | 'payment_completed'
  | 'payment_failed'
  | 'service_created'
  | 'service_updated'
  | 'service_completed'
  | 'task_completed'
  | 'due_date_updated'
  | 'filing_submitted'
  | 'manual_trigger'
  | 'scheduled_recalc';

interface EntityChangeEvent {
  entityId: number;
  reason: EntityChangeReason;
  metadata?: any;
  timestamp: Date;
}

class ComplianceEventEmitter extends EventEmitter {
  private recalcQueue: Map<number, EntityChangeEvent> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 5000; // 5 seconds
  private processing = false;

  /**
   * Emit entity change event
   * Will trigger debounced recalculation
   */
  emitEntityChanged(entityId: number, reason: EntityChangeReason, metadata?: any) {
    const event: EntityChangeEvent = {
      entityId,
      reason,
      metadata,
      timestamp: new Date(),
    };

    console.log(`📡 Entity change event: Entity ${entityId} - ${reason}`);

    // Add to queue (overwrites previous event for same entity)
    this.recalcQueue.set(entityId, event);

    // Emit for listeners
    this.emit('entity:changed', event);

    // Schedule debounced processing
    this.scheduleProcessing();
  }

  /**
   * Schedule debounced queue processing
   */
  private scheduleProcessing() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, this.DEBOUNCE_MS);
  }

  /**
   * Process queued recalculations
   */
  private async processQueue() {
    if (this.processing) {
      console.log('⏳ Queue processing already in progress, skipping...');
      return;
    }

    if (this.recalcQueue.size === 0) {
      return;
    }

    this.processing = true;
    const queueSnapshot = new Map(this.recalcQueue);
    this.recalcQueue.clear();

    console.log(`🔄 Processing ${queueSnapshot.size} entity state recalculations...`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { entityId: number; error: string }[],
    };

    for (const [entityId, event] of queueSnapshot) {
      try {
        const result = await stateEngine.calculateEntityState(entityId);
        
        if (result.success) {
          results.success++;
          console.log(`  ✅ Entity ${entityId} - ${event.reason}`);
          
          // Emit completion event
          this.emit('entity:recalculated', {
            entityId,
            reason: event.reason,
            state: result.entityState.overallState,
            riskScore: result.entityState.overallRiskScore,
          });
        } else {
          results.failed++;
          results.errors.push({
            entityId,
            error: result.errors.join(', '),
          });
          console.error(`  ❌ Entity ${entityId} - ${result.errors.join(', ')}`);
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          entityId,
          error: error.message,
        });
        console.error(`  ❌ Entity ${entityId} - ${error.message}`);
      }
    }

    console.log(`✅ Queue processing complete: ${results.success} success, ${results.failed} failed`);

    if (results.errors.length > 0) {
      console.error('Recalculation errors:', results.errors);
    }

    this.processing = false;

    // Emit batch completion
    this.emit('queue:processed', results);
  }

  /**
   * Force immediate processing (bypass debounce)
   */
  async processImmediately() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.processQueue();
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queued: this.recalcQueue.size,
      processing: this.processing,
      entities: Array.from(this.recalcQueue.keys()),
    };
  }

  /**
   * Clear queue (for testing/emergency)
   */
  clearQueue() {
    this.recalcQueue.clear();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    console.log('🧹 Recalculation queue cleared');
  }
}

// Export singleton instance
export const complianceEvents = new ComplianceEventEmitter();

// Convenience function for common usage
export function triggerEntityRecalculation(
  entityId: number, 
  reason: EntityChangeReason,
  metadata?: any
) {
  complianceEvents.emitEntityChanged(entityId, reason, metadata);
}

// Health check endpoint data
export function getEventSystemStatus() {
  return {
    queueSize: complianceEvents.getQueueStatus().queued,
    processing: complianceEvents.getQueueStatus().processing,
    listenerCount: complianceEvents.listenerCount('entity:changed'),
  };
}
