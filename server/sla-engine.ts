// DEPRECATED: This legacy SLA engine is kept for reference only.
// Use server/enhanced-sla-system.ts for all SLA operations.
import { eq, and, lt, gte } from "drizzle-orm";
import { db } from "./db";
import { 
  serviceRequests, 
  slaSettings, 
  slaExceptions, 
  operationsTasks, 
  auditLogs,
  systemNotifications
} from "@shared/schema";

// SLA Status Definitions
export enum SlaStatus {
  ON_TRACK = "on_track",
  AT_RISK = "at_risk", 
  WARNING = "warning",
  BREACHED = "breached",
  PAUSED = "paused",
  EXCEPTION_GRANTED = "exception_granted"
}

// Escalation Levels
export enum EscalationLevel {
  T_24_WARNING = "t24_warning",
  T_4_WARNING = "t4_warning", 
  BREACH = "breach",
  CRITICAL = "critical"
}

// SLA Timer Management Class
export class SlaTimer {
  private serviceRequestId: number;
  private taskId?: number;
  private baselineMinutes: number;
  private graceMinutes: number;
  private startTime: Date;
  private pausedTime?: Date;
  private totalPausedMinutes: number = 0;

  constructor(
    serviceRequestId: number,
    baselineMinutes: number,
    graceMinutes: number = 0,
    taskId?: number
  ) {
    this.serviceRequestId = serviceRequestId;
    this.taskId = taskId;
    this.baselineMinutes = baselineMinutes;
    this.graceMinutes = graceMinutes;
    this.startTime = new Date();
  }

  // Calculate current SLA status
  getCurrentStatus(): SlaStatus {
    const now = new Date();
    const elapsedMinutes = this.getElapsedMinutes(now);
    const totalAllowedMinutes = this.baselineMinutes + this.graceMinutes;

    if (this.pausedTime) {
      return SlaStatus.PAUSED;
    }

    if (elapsedMinutes >= totalAllowedMinutes) {
      return SlaStatus.BREACHED;
    }

    const warningThreshold = totalAllowedMinutes * 0.8; // 80% threshold
    const riskThreshold = totalAllowedMinutes * 0.9; // 90% threshold

    if (elapsedMinutes >= riskThreshold) {
      return SlaStatus.AT_RISK;
    }

    if (elapsedMinutes >= warningThreshold) {
      return SlaStatus.WARNING;
    }

    return SlaStatus.ON_TRACK;
  }

  // Get elapsed minutes accounting for paused time
  private getElapsedMinutes(currentTime: Date): number {
    const totalElapsed = (currentTime.getTime() - this.startTime.getTime()) / (1000 * 60);
    return Math.max(0, totalElapsed - this.totalPausedMinutes);
  }

  // Pause SLA timer (for client/government waiting states)
  pause(reason: string): void {
    if (!this.pausedTime) {
      this.pausedTime = new Date();
      this.logSlaEvent("paused", { reason });
    }
  }

  // Resume SLA timer
  resume(reason: string): void {
    if (this.pausedTime) {
      const pauseDuration = (new Date().getTime() - this.pausedTime.getTime()) / (1000 * 60);
      this.totalPausedMinutes += pauseDuration;
      this.pausedTime = undefined;
      this.logSlaEvent("resumed", { reason, pauseDurationMinutes: pauseDuration });
    }
  }

  // Check if escalation is needed
  shouldEscalate(): EscalationLevel | null {
    const status = this.getCurrentStatus();
    const now = new Date();
    const elapsedMinutes = this.getElapsedMinutes(now);
    const totalAllowedMinutes = this.baselineMinutes + this.graceMinutes;

    if (status === SlaStatus.BREACHED) {
      return EscalationLevel.BREACH;
    }

    // T-4 hours warning (240 minutes before breach)
    if (totalAllowedMinutes - elapsedMinutes <= 240) {
      return EscalationLevel.T_4_WARNING;
    }

    // T-24 hours warning (1440 minutes before breach)
    if (totalAllowedMinutes - elapsedMinutes <= 1440) {
      return EscalationLevel.T_24_WARNING;
    }

    return null;
  }

  // Get time remaining until breach
  getTimeRemaining(): number {
    const now = new Date();
    const elapsedMinutes = this.getElapsedMinutes(now);
    const totalAllowedMinutes = this.baselineMinutes + this.graceMinutes;
    return Math.max(0, totalAllowedMinutes - elapsedMinutes);
  }

  // Log SLA events for audit trail
  private logSlaEvent(action: string, metadata: any): void {
    // This would integrate with the audit logging system
    console.log(`SLA Event: ${action}`, {
      serviceRequestId: this.serviceRequestId,
      taskId: this.taskId,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }
}

// SLA Engine Main Class
export class SlaEngine {
  // Initialize SLA timer for a service request
  static async initializeSlaTimer(serviceRequestId: number, serviceCode: string): Promise<SlaTimer> {
    // Get SLA settings for this service type
    const [slaConfig] = await db
      .select()
      .from(slaSettings)
      .where(eq(slaSettings.serviceCode, serviceCode))
      .limit(1);

    if (!slaConfig) {
      throw new Error(`No SLA configuration found for service: ${serviceCode}`);
    }

    const timer = new SlaTimer(
      serviceRequestId,
      slaConfig.baselineMinutes,
      slaConfig.graceMinutes || 0
    );

    // Log SLA initialization
    await db.insert(auditLogs).values({
      userId: 0, // System user
      action: "sla_timer_initialized",
      entityType: "service_request",
      entityId: serviceRequestId.toString(),
      details: {
        serviceCode,
        baselineMinutes: slaConfig.baselineMinutes,
        graceMinutes: slaConfig.graceMinutes
      }
    });

    return timer;
  }

  // Check all active services for SLA violations
  static async checkAllSlaStatuses(): Promise<void> {
    try {
      // Get all active service requests
      const activeServices = await db
        .select()
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.status, "in_progress"),
            lt(serviceRequests.createdAt, new Date(Date.now() - 60 * 1000)) // At least 1 minute old
          )
        );

      for (const service of activeServices) {
        await this.checkServiceSla(service.id, service.serviceCode);
      }
    } catch (error) {
      console.error("Error checking SLA statuses:", error);
    }
  }

  // Check SLA status for a specific service
  static async checkServiceSla(serviceRequestId: number, serviceCode: string): Promise<void> {
    try {
      const timer = await this.initializeSlaTimer(serviceRequestId, serviceCode);
      const status = timer.getCurrentStatus();
      const escalationLevel = timer.shouldEscalate();

      // Update service request with current SLA status
      await db
        .update(serviceRequests)
        .set({
          slaStatus: status,
          updatedAt: new Date()
        })
        .where(eq(serviceRequests.id, serviceRequestId));

      // Handle escalations
      if (escalationLevel) {
        await this.handleEscalation(serviceRequestId, escalationLevel, timer);
      }
    } catch (error) {
      console.error(`Error checking SLA for service ${serviceRequestId}:`, error);
    }
  }

  // Handle SLA escalations
  private static async handleEscalation(
    serviceRequestId: number,
    escalationLevel: EscalationLevel,
    timer: SlaTimer
  ): Promise<void> {
    const timeRemaining = timer.getTimeRemaining();
    
    // Create escalation incident
    const [incident] = await db.insert(auditLogs).values({
      userId: 0, // System user
      action: "sla_escalation",
      entityType: "service_request", 
      entityId: serviceRequestId.toString(),
      details: {
        escalationLevel,
        timeRemainingMinutes: timeRemaining,
        timestamp: new Date().toISOString()
      }
    }).returning();

    // Send escalation notifications
    await this.sendEscalationNotifications(serviceRequestId, escalationLevel, timeRemaining);

    // For breach, create critical incident and reassign
    if (escalationLevel === EscalationLevel.BREACH) {
      await this.handleSlaBreach(serviceRequestId);
    }
  }

  // Send escalation notifications to appropriate stakeholders
  private static async sendEscalationNotifications(
    serviceRequestId: number,
    escalationLevel: EscalationLevel,
    timeRemaining: number
  ): Promise<void> {
    let notificationLevel = "medium";
    let targetRoles = ["ops_executive"];

    switch (escalationLevel) {
      case EscalationLevel.T_24_WARNING:
        notificationLevel = "medium";
        targetRoles = ["ops_executive"];
        break;
      case EscalationLevel.T_4_WARNING:
        notificationLevel = "high";
        targetRoles = ["ops_executive", "ops_lead"];
        break;
      case EscalationLevel.BREACH:
        notificationLevel = "urgent";
        targetRoles = ["ops_executive", "ops_lead", "admin"];
        break;
    }

    // Insert notification for processing
    await db.insert(systemNotifications).values({
      title: `SLA ${escalationLevel.replace('_', ' ').toUpperCase()}`,
      message: `Service request ${serviceRequestId} has ${Math.round(timeRemaining)} minutes remaining until SLA breach`,
      notificationType: "sla_escalation",
      priority: notificationLevel,
      targetRoles: JSON.stringify(targetRoles),
      isActive: true,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // Valid for 24 hours
    });
  }

  // Handle SLA breach with incident creation and reassignment
  private static async handleSlaBreach(serviceRequestId: number): Promise<void> {
    // Get service details
    const [service] = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (!service) return;

    // Create critical incident
    await db.insert(auditLogs).values({
      userId: 0, // System user
      action: "sla_breach_incident",
      entityType: "service_request",
      entityId: serviceRequestId.toString(),
      details: {
        serviceCode: service.serviceCode,
        originalAssignee: service.assignedTo,
        breachTime: new Date().toISOString(),
        clientId: service.clientId
      }
    });

    // Auto-assign to operations lead for immediate attention
    const [opsLead] = await db
      .select()
      .from(operationsTasks)
      .where(eq(operationsTasks.role, "ops_lead"))
      .limit(1);

    if (opsLead) {
      await db
        .update(serviceRequests)
        .set({
          assignedTo: opsLead.userId,
          priority: "urgent",
          updatedAt: new Date()
        })
        .where(eq(serviceRequests.id, serviceRequestId));
    }

    // Notify client about delay and remediation steps
    await this.notifyClientOfDelay(serviceRequestId);
  }

  // Notify client about SLA breach and remediation
  private static async notifyClientOfDelay(serviceRequestId: number): Promise<void> {
    // Insert client notification
    await db.insert(systemNotifications).values({
      title: "Service Delay Notification",
      message: `We're working to resolve a delay with your service request. Our team lead has been assigned and will contact you within 2 hours with an update.`,
      notificationType: "client_delay_alert",
      priority: "high",
      targetRoles: JSON.stringify(["client"]),
      isActive: true,
      validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000) // Valid for 48 hours
    });
  }

  // Grant SLA exception with approval workflow
  static async grantSlaException(
    serviceRequestId: number,
    extensionMinutes: number,
    reason: string,
    approvedBy: number
  ): Promise<void> {
    // Create SLA exception record
    await db.insert(slaExceptions).values({
      serviceRequestId,
      originalSlaMinutes: 0, // Will be populated based on service
      extensionMinutes,
      reason,
      approvedBy,
      status: "approved"
    });

    // Update service request status
    await db
      .update(serviceRequests)
      .set({
        slaStatus: SlaStatus.EXCEPTION_GRANTED,
        updatedAt: new Date()
      })
      .where(eq(serviceRequests.id, serviceRequestId));

    // Log exception grant
    await db.insert(auditLogs).values({
      userId: approvedBy,
      action: "sla_exception_granted",
      entityType: "service_request",
      entityId: serviceRequestId.toString(),
      details: {
        extensionMinutes,
        reason,
        grantedAt: new Date().toISOString()
      }
    });
  }

  // Get SLA performance metrics
  static async getSlaMetrics(dateRange?: { from: Date; to: Date }) {
    const fromDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const toDate = dateRange?.to || new Date();

    // Get all completed services in date range
    const services = await db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.status, "completed"),
          lt(serviceRequests.createdAt, toDate),
          lt(fromDate, serviceRequests.updatedAt)
        )
      );

    const metrics = {
      totalServices: services.length,
      onTimeCompletions: 0,
      slaBreaches: 0,
      averageCompletionMinutes: 0,
      compliancePercentage: 0,
      topBreachReasons: [] as { reason: string; count: number }[],
      serviceTypeBreakdown: {} as Record<string, { total: number; breached: number }>
    };

    let totalCompletionTime = 0;
    const breachReasons: Record<string, number> = {};

    for (const service of services) {
      const completionTime = service.updatedAt && service.createdAt ? 
        (service.updatedAt.getTime() - service.createdAt.getTime()) / (1000 * 60) : 0;
      
      totalCompletionTime += completionTime;

      // Check if service had SLA breach
      if (service.slaStatus === SlaStatus.BREACHED) {
        metrics.slaBreaches++;
        // Track breach reasons (would come from audit logs)
      } else {
        metrics.onTimeCompletions++;
      }

      // Track by service type
      if (!metrics.serviceTypeBreakdown[service.serviceCode]) {
        metrics.serviceTypeBreakdown[service.serviceCode] = { total: 0, breached: 0 };
      }
      metrics.serviceTypeBreakdown[service.serviceCode].total++;
      if (service.slaStatus === SlaStatus.BREACHED) {
        metrics.serviceTypeBreakdown[service.serviceCode].breached++;
      }
    }

    metrics.averageCompletionMinutes = services.length > 0 ? totalCompletionTime / services.length : 0;
    metrics.compliancePercentage = services.length > 0 ? (metrics.onTimeCompletions / services.length) * 100 : 100;

    return metrics;
  }
}

// Background job to continuously monitor SLA status
export async function startSlaMonitoring(): Promise<void> {
  console.log("Starting SLA monitoring background job...");
  
  // Run SLA check every 5 minutes
  setInterval(async () => {
    try {
      await SlaEngine.checkAllSlaStatuses();
    } catch (error) {
      console.error("SLA monitoring error:", error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  console.log("SLA monitoring initialized");
}
