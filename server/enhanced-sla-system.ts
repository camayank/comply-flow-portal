import { eq, and, gte } from "drizzle-orm";
import { db } from "./db";
import { serviceRequests, slaTimers, slaExceptions, slaSettings, systemNotifications, workItemQueue } from "@shared/schema";

// Enhanced SLA System for DigiComply
// Implements advanced timer management, escalations, and exceptions

export enum SlaStatus {
  ON_TRACK = "on_track",
  AT_RISK = "at_risk", 
  WARNING = "warning",
  BREACHED = "breached",
  PAUSED = "paused",
  EXCEPTION_GRANTED = "exception_granted"
}

export enum EscalationLevel {
  T_24_WARNING = "t24_warning",
  T_4_WARNING = "t4_warning", 
  BREACH = "breach",
  CRITICAL = "critical"
}

// Enhanced SLA Timer with pause/resume capabilities
export class EnhancedSlaTimer {
  private serviceRequestId: number;
  private standardHours: number;
  private startTime: Date;
  private pausedAt?: Date;
  private totalPausedMinutes: number = 0;
  private pauseReasons: string[] = [];

  constructor(
    serviceRequestId: number,
    standardHours: number,
    options?: {
      startTime?: Date;
      pausedAt?: Date | null;
      totalPausedMinutes?: number | null;
      pauseReasons?: string[] | null;
    }
  ) {
    this.serviceRequestId = serviceRequestId;
    this.standardHours = standardHours;
    this.startTime = options?.startTime ? new Date(options.startTime) : new Date();
    if (options?.pausedAt) {
      this.pausedAt = new Date(options.pausedAt);
    }
    if (options?.totalPausedMinutes) {
      this.totalPausedMinutes = options.totalPausedMinutes;
    }
    if (options?.pauseReasons && Array.isArray(options.pauseReasons)) {
      this.pauseReasons = [...options.pauseReasons];
    }
  }

  // Get current SLA status with enhanced logic
  getCurrentStatus(): { status: SlaStatus; minutesRemaining: number; escalationLevel?: EscalationLevel } {
    const now = new Date();
    const elapsedMinutes = this.getElapsedMinutes(now);
    const totalAllowedMinutes = this.standardHours * 60;
    const minutesRemaining = Math.max(0, totalAllowedMinutes - elapsedMinutes);

    if (this.pausedAt) {
      return { status: SlaStatus.PAUSED, minutesRemaining };
    }

    if (elapsedMinutes >= totalAllowedMinutes) {
      return { status: SlaStatus.BREACHED, minutesRemaining: 0, escalationLevel: EscalationLevel.BREACH };
    }

    // Calculate warning thresholds
    const warningThreshold = totalAllowedMinutes * 0.8; // 80%
    const riskThreshold = totalAllowedMinutes * 0.9; // 90%

    let escalationLevel: EscalationLevel | undefined;
    
    // Check escalation needs
    if (minutesRemaining <= 240) { // 4 hours
      escalationLevel = EscalationLevel.T_4_WARNING;
    } else if (minutesRemaining <= 1440) { // 24 hours
      escalationLevel = EscalationLevel.T_24_WARNING;
    }

    if (elapsedMinutes >= riskThreshold) {
      return { status: SlaStatus.AT_RISK, minutesRemaining, escalationLevel };
    }

    if (elapsedMinutes >= warningThreshold) {
      return { status: SlaStatus.WARNING, minutesRemaining, escalationLevel };
    }

    return { status: SlaStatus.ON_TRACK, minutesRemaining };
  }

  // Pause SLA for client/government waiting
  pauseTimer(reason: string): void {
    if (!this.pausedAt) {
      this.pausedAt = new Date();
      this.pauseReasons.push(`${reason} (paused at: ${this.pausedAt.toISOString()})`);
      console.log(`SLA paused for service ${this.serviceRequestId}: ${reason}`);
    }
  }

  // Extend SLA by additional hours
  extendHours(additionalHours: number): void {
    if (Number.isFinite(additionalHours) && additionalHours > 0) {
      this.standardHours += additionalHours;
    }
  }

  // Resume SLA timer
  resumeTimer(reason: string): void {
    if (this.pausedAt) {
      const pauseDuration = (new Date().getTime() - this.pausedAt.getTime()) / (1000 * 60);
      this.totalPausedMinutes += pauseDuration;
      this.pauseReasons.push(`${reason} (resumed after ${Math.round(pauseDuration)} minutes)`);
      this.pausedAt = undefined;
      console.log(`SLA resumed for service ${this.serviceRequestId}: ${reason}`);
    }
  }

  // Get actual elapsed time accounting for paused periods
  private getElapsedMinutes(currentTime: Date): number {
    const totalElapsed = (currentTime.getTime() - this.startTime.getTime()) / (1000 * 60);
    return Math.max(0, totalElapsed - this.totalPausedMinutes);
  }

  // Get comprehensive timer information
  getTimerInfo() {
    return {
      serviceRequestId: this.serviceRequestId,
      standardHours: this.standardHours,
      startTime: this.startTime,
      currentlyPaused: !!this.pausedAt,
      totalPausedMinutes: this.totalPausedMinutes,
      pauseReasons: this.pauseReasons,
      status: this.getCurrentStatus()
    };
  }

  getPersistenceSnapshot() {
    return {
      startTime: this.startTime,
      pausedAt: this.pausedAt || null,
      totalPausedMinutes: this.totalPausedMinutes,
      pauseReasons: this.pauseReasons,
    };
  }
}

// Enhanced SLA Management System
export class EnhancedSlaSystem {
  private static activeTimers = new Map<number, EnhancedSlaTimer>();

  private static async upsertTimerRecord(
    serviceRequestId: number,
    serviceCode: string | null | undefined,
    standardHours: number,
    updates: Partial<{
      startTime: Date;
      pausedAt: Date | null;
      totalPausedMinutes: number;
      pauseReasons: string[];
      status: SlaStatus;
      escalationLevel: EscalationLevel | null;
      completedAt: Date | null;
      isActive: boolean;
    }>
  ) {
    const [existing] = await db
      .select()
      .from(slaTimers)
      .where(and(eq(slaTimers.serviceRequestId, serviceRequestId), eq(slaTimers.isActive, true)))
      .limit(1);

    if (existing) {
      await db
        .update(slaTimers)
        .set({
          serviceCode: serviceCode || existing.serviceCode,
          standardHours,
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(slaTimers.id, existing.id));
      return existing;
    }

    let resolvedServiceCode = serviceCode;
    if (!resolvedServiceCode) {
      const [serviceRequest] = await db
        .select({ serviceId: serviceRequests.serviceId })
        .from(serviceRequests)
        .where(eq(serviceRequests.id, serviceRequestId))
        .limit(1);
      resolvedServiceCode = serviceRequest?.serviceId || 'unknown';
    }

    await db.insert(slaTimers).values({
      serviceRequestId,
      serviceCode: resolvedServiceCode || 'unknown',
      standardHours,
      startTime: updates.startTime || new Date(),
      pausedAt: updates.pausedAt || null,
      totalPausedMinutes: updates.totalPausedMinutes || 0,
      pauseReasons: updates.pauseReasons || [],
      status: updates.status || SlaStatus.ON_TRACK,
      escalationLevel: updates.escalationLevel || null,
      completedAt: updates.completedAt || null,
      isActive: updates.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return null;
  }

  // Initialize SLA timer for a service request
  static async initializeTimer(serviceRequestId: number, serviceCode: string): Promise<EnhancedSlaTimer> {
    try {
      // Get SLA configuration for service type
      const slaConfig = await this.getSlaConfiguration(serviceCode);

      const [existing] = await db
        .select()
        .from(slaTimers)
        .where(and(eq(slaTimers.serviceRequestId, serviceRequestId), eq(slaTimers.isActive, true)))
        .limit(1);

      const timer = new EnhancedSlaTimer(serviceRequestId, slaConfig.standardHours, {
        startTime: existing?.startTime || undefined,
        pausedAt: existing?.pausedAt || undefined,
        totalPausedMinutes: existing?.totalPausedMinutes || 0,
        pauseReasons: (existing?.pauseReasons as string[] | null) || []
      });

      this.activeTimers.set(serviceRequestId, timer);

      const snapshot = timer.getPersistenceSnapshot();
      await this.upsertTimerRecord(serviceRequestId, serviceCode, slaConfig.standardHours, {
        startTime: snapshot.startTime,
        pausedAt: snapshot.pausedAt,
        totalPausedMinutes: snapshot.totalPausedMinutes,
        pauseReasons: snapshot.pauseReasons
      });

      console.log(`SLA timer initialized for service ${serviceRequestId} with ${slaConfig.standardHours}h limit`);
      return timer;
    } catch (error) {
      console.error(`Failed to initialize SLA timer for service ${serviceRequestId}:`, error);
      // Create default timer with 48 hours if configuration not found
      const timer = new EnhancedSlaTimer(serviceRequestId, 48);
      this.activeTimers.set(serviceRequestId, timer);
      const snapshot = timer.getPersistenceSnapshot();
      await this.upsertTimerRecord(serviceRequestId, serviceCode, 48, {
        startTime: snapshot.startTime,
        pausedAt: snapshot.pausedAt,
        totalPausedMinutes: snapshot.totalPausedMinutes,
        pauseReasons: snapshot.pauseReasons
      });
      return timer;
    }
  }

  // Get existing timer for a service request
  static async getTimer(serviceRequestId: number): Promise<EnhancedSlaTimer | null> {
    if (this.activeTimers.has(serviceRequestId)) {
      return this.activeTimers.get(serviceRequestId) || null;
    }

    const [existing] = await db
      .select()
      .from(slaTimers)
      .where(eq(slaTimers.serviceRequestId, serviceRequestId))
      .limit(1);

    if (!existing) return null;

    const timer = new EnhancedSlaTimer(serviceRequestId, existing.standardHours, {
      startTime: existing.startTime,
      pausedAt: existing.pausedAt,
      totalPausedMinutes: existing.totalPausedMinutes || 0,
      pauseReasons: (existing.pauseReasons as string[] | null) || []
    });

    this.activeTimers.set(serviceRequestId, timer);
    return timer;
  }

  // Get all active timers
  static getAllActiveTimers(): Map<number, EnhancedSlaTimer> {
    return this.activeTimers;
  }

  // Get SLA configuration from database or defaults
  private static async getSlaConfiguration(serviceCode: string): Promise<{ standardHours: number; escalationTiers: any }> {
    try {
      // Try to get from database
      const [config] = await db
        .select()
        .from(slaSettings)
        .where(eq(slaSettings.serviceCode, serviceCode))
        .limit(1);

      if (config) {
        return {
          standardHours: config.standardHours,
          escalationTiers: config.escalationTiers
        };
      }
    } catch (error) {
      console.log(`No SLA configuration found for ${serviceCode}, using defaults`);
    }

    // Default configurations by service type
    const defaultConfigs: Record<string, { standardHours: number; escalationTiers: any }> = {
      company_incorporation: { standardHours: 72, escalationTiers: { warning: 48, critical: 12 } },
      gst_registration: { standardHours: 48, escalationTiers: { warning: 24, critical: 8 } },
      trademark_registration: { standardHours: 168, escalationTiers: { warning: 120, critical: 24 } },
      iso_certification: { standardHours: 336, escalationTiers: { warning: 240, critical: 48 } },
      default: { standardHours: 48, escalationTiers: { warning: 24, critical: 8 } }
    };

    return defaultConfigs[serviceCode] || defaultConfigs.default;
  }

  // Check all active timers and handle escalations
  static async processAllSlaChecks(): Promise<void> {
    try {
      // Get all active service requests
      const activeServices = await db
        .select()
        .from(serviceRequests)
        .where(eq(serviceRequests.status, "in_progress"));

      console.log(`Processing SLA checks for ${activeServices.length} active services`);

      for (const service of activeServices) {
        await this.processSingleServiceSla(service.id, service.serviceId);
      }
    } catch (error) {
      console.error("Error in SLA batch processing:", error);
    }
  }

  // Process SLA for individual service
  private static async processSingleServiceSla(serviceRequestId: number, serviceCode: string): Promise<void> {
    try {
      let timer = this.activeTimers.get(serviceRequestId);
      
      if (!timer) {
        timer = await this.initializeTimer(serviceRequestId, serviceCode);
      }

      const timerInfo = timer.getTimerInfo();
      const { status, escalationLevel } = timerInfo.status;

      const snapshot = timer.getPersistenceSnapshot();
      await this.upsertTimerRecord(serviceRequestId, serviceCode, timerInfo.standardHours, {
        status,
        escalationLevel: escalationLevel || null,
        pausedAt: snapshot.pausedAt,
        totalPausedMinutes: snapshot.totalPausedMinutes,
        pauseReasons: snapshot.pauseReasons
      });

      // Handle escalations
      if (escalationLevel) {
        await this.handleEscalation(serviceRequestId, escalationLevel, timerInfo);
      }

      // Log status if significant
      if ([SlaStatus.WARNING, SlaStatus.AT_RISK, SlaStatus.BREACHED].includes(status)) {
        console.log(`Service ${serviceRequestId} SLA status: ${status}, remaining: ${timerInfo.status.minutesRemaining}min`);
      }

    } catch (error) {
      console.error(`Error processing SLA for service ${serviceRequestId}:`, error);
    }
  }

  // Handle SLA escalations with notifications
  private static async handleEscalation(
    serviceRequestId: number, 
    escalationLevel: EscalationLevel,
    timerInfo: any
  ): Promise<void> {
    console.log(`SLA Escalation: Service ${serviceRequestId} - ${escalationLevel}`);

    try {
      // Create escalation record
      const escalationData = {
        serviceRequestId,
        escalationLevel,
        timeRemaining: timerInfo.status.minutesRemaining,
        escalatedAt: new Date().toISOString(),
        timerDetails: timerInfo
      };

      // Send notifications based on escalation level
      await this.sendEscalationNotifications(escalationLevel, escalationData);

      // For breaches, take immediate action
      if (escalationLevel === EscalationLevel.BREACH) {
        await this.handleSlaBreachAction(serviceRequestId);
      }

    } catch (error) {
      console.error(`Error handling escalation for service ${serviceRequestId}:`, error);
    }
  }

  // Send escalation notifications
  private static async sendEscalationNotifications(
    escalationLevel: EscalationLevel,
    escalationData: any
  ): Promise<void> {
    const notificationMappings = {
      [EscalationLevel.T_24_WARNING]: {
        priority: "medium",
        targets: ["ops_executive"],
        message: `Service ${escalationData.serviceRequestId} has 24 hours remaining until SLA breach`
      },
      [EscalationLevel.T_4_WARNING]: {
        priority: "high", 
        targets: ["ops_executive", "ops_lead"],
        message: `Service ${escalationData.serviceRequestId} has 4 hours remaining until SLA breach`
      },
      [EscalationLevel.BREACH]: {
        priority: "urgent",
        targets: ["ops_executive", "ops_lead", "admin"],
        message: `SLA BREACH: Service ${escalationData.serviceRequestId} has exceeded deadline`
      }
    };

    const notification = notificationMappings[escalationLevel];
    if (notification) {
      console.log(`SLA Notification: ${notification.message} (Priority: ${notification.priority})`);
      
      // In a full implementation, this would integrate with the notification system
      // For now, we'll create a console log and could integrate with email/WhatsApp APIs
      
      try {
        await db.insert(systemNotifications).values({
          notificationType: "sla_escalation",
          priority: notification.priority,
          message: notification.message,
          targetRoles: JSON.stringify(notification.targets),
          isActive: true,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdBy: 0 // System user
        });
      } catch (dbError) {
        console.error("Failed to create notification record:", dbError);
      }
    }
  }

  // Handle SLA breach with immediate actions
  private static async handleSlaBreachAction(serviceRequestId: number): Promise<void> {
    console.log(`CRITICAL: SLA breach detected for service ${serviceRequestId} - Taking immediate action`);
    
    try {
      // Mark service as high priority
      await db
        .update(serviceRequests)
        .set({
          priority: "urgent",
          updatedAt: new Date()
        })
        .where(eq(serviceRequests.id, serviceRequestId));

      // In a full implementation:
      // 1. Auto-assign to operations lead
      // 2. Create incident ticket
      // 3. Notify client about delay
      // 4. Schedule management review
      
      console.log(`Service ${serviceRequestId} marked as urgent priority due to SLA breach`);
      
    } catch (error) {
      console.error(`Error handling SLA breach action for service ${serviceRequestId}:`, error);
    }
  }

  // Grant SLA exception with approval workflow
  static async grantSlaException(
    serviceRequestId: number,
    extensionHours: number,
    reason: string,
    approvedBy: number
  ): Promise<void> {
    try {
      let timer = this.activeTimers.get(serviceRequestId);

      if (!timer) {
        const [serviceRequest] = await db
          .select({ serviceId: serviceRequests.serviceId })
          .from(serviceRequests)
          .where(eq(serviceRequests.id, serviceRequestId))
          .limit(1);

        if (serviceRequest?.serviceId) {
          timer = await this.initializeTimer(serviceRequestId, serviceRequest.serviceId);
        }
      }
      
      if (timer) {
        // Extend the timer by adding hours
        timer.extendHours(extensionHours);
        
        // In production, this would create a formal exception record
        console.log(`SLA exception granted for service ${serviceRequestId}: +${extensionHours}h - ${reason}`);
        
        // Create exception record
        const exceptionRecord = {
          serviceRequestId,
          originalDeadline: new Date(),
          extensionHours,
          reason,
          approvedBy,
          grantedAt: new Date().toISOString()
        };

        console.log("SLA Exception Record:", exceptionRecord);
        
        const [serviceRequest] = await db
          .select({ slaDeadline: serviceRequests.slaDeadline })
          .from(serviceRequests)
          .where(eq(serviceRequests.id, serviceRequestId))
          .limit(1);

        const currentDeadline = serviceRequest?.slaDeadline ? new Date(serviceRequest.slaDeadline) : new Date();
        const newDeadline = new Date(currentDeadline.getTime() + extensionHours * 60 * 60 * 1000);

        await db
          .update(serviceRequests)
          .set({
            slaDeadline: newDeadline,
            updatedAt: new Date()
          })
          .where(eq(serviceRequests.id, serviceRequestId));

        await db
          .update(workItemQueue)
          .set({
            slaDeadline: newDeadline,
            dueDate: newDeadline,
            lastActivityAt: new Date()
          })
          .where(eq(workItemQueue.serviceRequestId, serviceRequestId));

        await db.insert(slaExceptions).values({
          serviceRequestId,
          requestedBy: approvedBy,
          approvedBy,
          exceptionType: "manual_extension",
          reason,
          requestedExtensionHours: extensionHours,
          approvedExtensionHours: extensionHours,
          status: "approved",
          validFrom: currentDeadline,
          validUntil: newDeadline,
          approvalNotes: reason,
          createdAt: new Date(),
          approvedAt: new Date()
        });

        const snapshot = timer.getPersistenceSnapshot();
        await this.upsertTimerRecord(serviceRequestId, null, timer.getTimerInfo().standardHours, {
          pausedAt: snapshot.pausedAt,
          totalPausedMinutes: snapshot.totalPausedMinutes,
          pauseReasons: snapshot.pauseReasons
        });

      }
    } catch (error) {
      console.error(`Error granting SLA exception for service ${serviceRequestId}:`, error);
    }
  }

  // Get comprehensive SLA metrics
  static async getSlaMetrics(days: number = 30): Promise<any> {
    try {
      const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const services = await db
        .select()
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.status, "completed"),
            gte(serviceRequests.createdAt, fromDate)
          )
        );

      const metrics = {
        totalServices: services.length,
        onTimeDeliveries: 0,
        slaBreaches: 0,
        averageCompletionHours: 0,
        compliancePercentage: 0,
        activeTimers: this.activeTimers.size,
        serviceTypeBreakdown: {} as Record<string, any>
      };

      let totalCompletionTime = 0;

      for (const service of services) {
        const serviceCode = service.serviceId;
        const completionTime = service.completedAt && service.createdAt ? 
          (service.completedAt.getTime() - service.createdAt.getTime()) / (1000 * 60 * 60) : 0;
        
        totalCompletionTime += completionTime;

        // Get SLA configuration to check compliance
        const slaConfig = await this.getSlaConfiguration(serviceCode);
        const wasOnTime = completionTime <= slaConfig.standardHours;

        if (wasOnTime) {
          metrics.onTimeDeliveries++;
        } else {
          metrics.slaBreaches++;
        }

        // Track by service type
        if (!metrics.serviceTypeBreakdown[serviceCode]) {
          metrics.serviceTypeBreakdown[serviceCode] = { 
            total: 0, 
            onTime: 0, 
            avgHours: 0,
            totalHours: 0
          };
        }
        
        metrics.serviceTypeBreakdown[serviceCode].total++;
        metrics.serviceTypeBreakdown[serviceCode].totalHours += completionTime;
        
        if (wasOnTime) {
          metrics.serviceTypeBreakdown[serviceCode].onTime++;
        }
      }

      // Calculate final metrics
      metrics.averageCompletionHours = services.length > 0 ? totalCompletionTime / services.length : 0;
      metrics.compliancePercentage = services.length > 0 ? (metrics.onTimeDeliveries / services.length) * 100 : 100;

      // Calculate averages for service types
      Object.keys(metrics.serviceTypeBreakdown).forEach(serviceCode => {
        const breakdown = metrics.serviceTypeBreakdown[serviceCode];
        breakdown.avgHours = breakdown.total > 0 ? breakdown.totalHours / breakdown.total : 0;
        breakdown.complianceRate = breakdown.total > 0 ? (breakdown.onTime / breakdown.total) * 100 : 100;
      });

      return metrics;
      
    } catch (error) {
      console.error("Error calculating SLA metrics:", error);
      return {
        totalServices: 0,
        onTimeDeliveries: 0,
        slaBreaches: 0,
        averageCompletionHours: 0,
        compliancePercentage: 100,
        activeTimers: this.activeTimers.size,
        serviceTypeBreakdown: {}
      };
    }
  }

  // Pause SLA for external dependency (client/government waiting)
  static async pauseServiceSla(serviceRequestId: number, reason: string): Promise<void> {
    const timer = await this.getTimer(serviceRequestId);
    if (timer) {
      timer.pauseTimer(reason);
      const snapshot = timer.getPersistenceSnapshot();
      await this.upsertTimerRecord(serviceRequestId, '', timer.getTimerInfo().standardHours, {
        pausedAt: snapshot.pausedAt,
        totalPausedMinutes: snapshot.totalPausedMinutes,
        pauseReasons: snapshot.pauseReasons,
        status: SlaStatus.PAUSED
      });
    }
  }

  // Resume SLA when dependency is resolved
  static async resumeServiceSla(serviceRequestId: number, reason: string): Promise<void> {
    const timer = await this.getTimer(serviceRequestId);
    if (timer) {
      timer.resumeTimer(reason);
      const snapshot = timer.getPersistenceSnapshot();
      await this.upsertTimerRecord(serviceRequestId, '', timer.getTimerInfo().standardHours, {
        pausedAt: snapshot.pausedAt,
        totalPausedMinutes: snapshot.totalPausedMinutes,
        pauseReasons: snapshot.pauseReasons
      });
    }
  }

  // Get timer status for specific service
  static async getServiceTimerStatus(serviceRequestId: number): Promise<any> {
    const timer = await this.getTimer(serviceRequestId);
    return timer ? timer.getTimerInfo() : null;
  }
}

// Background monitoring service
export class SlaMonitoringService {
  private static monitoringInterval: NodeJS.Timeout | null = null;

  static async startMonitoring(intervalMinutes: number = 15): Promise<void> {
    // Import job manager dynamically to avoid circular dependencies
    const { jobManager } = await import('./job-lifecycle-manager.js');

    if (this.monitoringInterval) {
      jobManager.stopJob('sla-monitoring');
    }

    console.log(`Starting SLA monitoring service (checking every ${intervalMinutes} minutes)`);

    this.monitoringInterval = jobManager.registerInterval(
      'sla-monitoring',
      async () => {
        try {
          await EnhancedSlaSystem.processAllSlaChecks();
        } catch (error) {
          console.error("SLA monitoring cycle error:", error);
        }
      },
      intervalMinutes * 60 * 1000,
      'SLA compliance monitoring and escalation checks'
    );

    // Run initial check
    EnhancedSlaSystem.processAllSlaChecks();
  }

  static async stopMonitoring(): Promise<void> {
    const { jobManager } = await import('./job-lifecycle-manager.js');
    jobManager.stopJob('sla-monitoring');
    this.monitoringInterval = null;
    console.log("SLA monitoring service stopped");
  }

  static async getMonitoringStatus(): Promise<any> {
    return {
      isRunning: !!this.monitoringInterval,
      activeTimers: await EnhancedSlaSystem.getSlaMetrics(1), // Last day
      systemHealth: "operational"
    };
  }
}

// Export for use in main application
export { EnhancedSlaSystem as SlaEngine };
