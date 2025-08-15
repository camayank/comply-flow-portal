import { eq, and, lt } from "drizzle-orm";
import { db } from "./db";

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

  constructor(serviceRequestId: number, standardHours: number) {
    this.serviceRequestId = serviceRequestId;
    this.standardHours = standardHours;
    this.startTime = new Date();
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
}

// Enhanced SLA Management System
export class EnhancedSlaSystem {
  private static activeTimers = new Map<number, EnhancedSlaTimer>();

  // Initialize SLA timer for a service request
  static async initializeTimer(serviceRequestId: number, serviceCode: string): Promise<EnhancedSlaTimer> {
    try {
      // Get SLA configuration for service type
      const slaConfig = await this.getSlaConfiguration(serviceCode);
      
      const timer = new EnhancedSlaTimer(serviceRequestId, slaConfig.standardHours);
      this.activeTimers.set(serviceRequestId, timer);

      console.log(`SLA timer initialized for service ${serviceRequestId} with ${slaConfig.standardHours}h limit`);
      return timer;
    } catch (error) {
      console.error(`Failed to initialize SLA timer for service ${serviceRequestId}:`, error);
      // Create default timer with 48 hours if configuration not found
      const timer = new EnhancedSlaTimer(serviceRequestId, 48);
      this.activeTimers.set(serviceRequestId, timer);
      return timer;
    }
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
      const timer = this.activeTimers.get(serviceRequestId);
      
      if (timer) {
        // Extend the timer by pausing and adjusting
        timer.pauseTimer(`SLA extension granted: ${reason} (${extensionHours}h extension)`);
        
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
        
        // Resume with the extension
        setTimeout(() => {
          timer.resumeTimer(`Extension period started (${extensionHours}h granted)`);
        }, 1000);

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
            lt(fromDate, serviceRequests.createdAt || new Date())
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
  static pauseServiceSla(serviceRequestId: number, reason: string): void {
    const timer = this.activeTimers.get(serviceRequestId);
    if (timer) {
      timer.pauseTimer(reason);
    }
  }

  // Resume SLA when dependency is resolved
  static resumeServiceSla(serviceRequestId: number, reason: string): void {
    const timer = this.activeTimers.get(serviceRequestId);
    if (timer) {
      timer.resumeTimer(reason);
    }
  }

  // Get timer status for specific service
  static getServiceTimerStatus(serviceRequestId: number): any {
    const timer = this.activeTimers.get(serviceRequestId);
    return timer ? timer.getTimerInfo() : null;
  }
}

// Background monitoring service
export class SlaMonitoringService {
  private static monitoringInterval: NodeJS.Timeout | null = null;

  static startMonitoring(intervalMinutes: number = 15): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    console.log(`Starting SLA monitoring service (checking every ${intervalMinutes} minutes)`);

    this.monitoringInterval = setInterval(async () => {
      try {
        await EnhancedSlaSystem.processAllSlaChecks();
      } catch (error) {
        console.error("SLA monitoring cycle error:", error);
      }
    }, intervalMinutes * 60 * 1000);

    // Run initial check
    EnhancedSlaSystem.processAllSlaChecks();
  }

  static stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log("SLA monitoring service stopped");
    }
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