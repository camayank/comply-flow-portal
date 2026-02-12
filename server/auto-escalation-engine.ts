/**
 * AUTO-ESCALATION ENGINE
 *
 * Enterprise-grade escalation system following US compliance and tax tech stack principles:
 * - Multi-tier escalation paths with automatic progression
 * - Immutable audit logging (SOC 2 compliance)
 * - Automatic reassignment and notification
 * - Real-time SLA breach detection and tracking
 * - Unified work queue management
 *
 * This is the central engine ensuring NO work item is lost and all deadlines are met.
 */

import { db } from './db';
import {
  escalationRules,
  escalationExecutions,
  slaBreachRecords,
  workItemQueue,
  workItemActivityLog,
  serviceRequests,
  taskItems,
  users,
  businessEntities,
  serviceWorkflowStatuses,
  statusTransitionHistory,
  complianceTracking,
  complianceRules,
  notifications
} from '@shared/schema';
import { eq, and, lt, lte, gte, isNull, or, desc, sql, inArray, notInArray, count, ne } from 'drizzle-orm';
import { EventEmitter } from 'events';
import { getEvidenceSummaries } from './compliance-evidence';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export enum EscalationSeverity {
  WARNING = 'warning',
  CRITICAL = 'critical',
  BREACH = 'breach'
}

export enum SlaStatus {
  ON_TRACK = 'on_track',
  AT_RISK = 'at_risk',
  WARNING = 'warning',
  BREACHED = 'breached'
}

export interface EscalationTier {
  tier: number;
  hoursAfterTrigger: number;
  action: 'notify' | 'reassign' | 'both';
  notifyRoles: string[];
  notifyUserIds?: number[];
  reassignToRole?: string;
  reassignToUserId?: number;
  emailTemplate?: string;
  smsTemplate?: string;
  createTask?: boolean;
  taskTitle?: string;
  severity: EscalationSeverity;
}

export interface WorkItemStats {
  total: number;
  onTrack: number;
  atRisk: number;
  warning: number;
  breached: number;
  unassigned: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  byAssignee: Record<string, number>;
}

// ============================================================================
// AUTO-ESCALATION ENGINE CLASS
// ============================================================================

class AutoEscalationEngine extends EventEmitter {
  private static instance: AutoEscalationEngine;
  private processingInterval: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  public static getInstance(): AutoEscalationEngine {
    if (!AutoEscalationEngine.instance) {
      AutoEscalationEngine.instance = new AutoEscalationEngine();
    }
    return AutoEscalationEngine.instance;
  }

  // ============================================================================
  // CORE PROCESSING - Run every 15 minutes
  // ============================================================================

  async startProcessing(intervalMinutes: number = 15): Promise<void> {
    if (this.processingInterval) {
      console.log('⚠️ Escalation engine already running');
      return;
    }

    console.log(`🚀 Starting Auto-Escalation Engine (checking every ${intervalMinutes} minutes)`);

    // Run immediately on start
    await this.processAllWorkItems();

    // Schedule recurring checks
    this.processingInterval = setInterval(async () => {
      await this.processAllWorkItems();
    }, intervalMinutes * 60 * 1000);

    this.emit('engine_started', { intervalMinutes });
  }

  async stopProcessing(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('🛑 Auto-Escalation Engine stopped');
      this.emit('engine_stopped');
    }
  }

  /**
   * Main processing loop - checks all work items and applies escalation rules
   */
  async processAllWorkItems(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏳ Escalation processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      console.log('📊 Processing work item escalations...');

      // Step 1: Refresh the work queue with current data
      await this.refreshWorkQueue();

      // Step 2: Calculate SLA status for all items
      await this.calculateSlaStatuses();

      // Step 3: Get all active escalation rules
      const rules = await db.select()
        .from(escalationRules)
        .where(eq(escalationRules.isActive, true));

      // Step 4: Check each rule against applicable work items
      let escalationsTriggered = 0;
      for (const rule of rules) {
        const triggered = await this.processEscalationRule(rule);
        escalationsTriggered += triggered;
      }

      // Step 5: Auto-detect and record any SLA breaches
      await this.detectAndRecordBreaches();

      const processingTime = Date.now() - startTime;
      console.log(`✅ Escalation processing complete: ${escalationsTriggered} escalations triggered in ${processingTime}ms`);

      this.emit('processing_complete', {
        escalationsTriggered,
        processingTime,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error in escalation processing:', error);
      this.emit('processing_error', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  // ============================================================================
  // WORK QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Refresh the unified work queue with current service request data
   */
  async refreshWorkQueue(): Promise<void> {
    try {
      // Get all active service requests with their details
      // Using raw SQL to avoid ORM issues with complex joins
      const activeRequests = await db.execute(sql`
        SELECT
          sr.id,
          sr.service_type as "serviceType",
          sr.status,
          sr.priority,
          sr.entity_id as "entityId",
          sr.due_date as "dueDate",
          sr.period_label as "periodLabel",
          sr.created_at as "createdAt",
          sr.updated_at as "updatedAt",
          be.name as "entityName"
        FROM service_requests sr
        LEFT JOIN business_entities be ON sr.entity_id = be.id
        WHERE sr.status NOT IN ('completed', 'cancelled', 'Completed', 'Cancelled')
          AND sr.is_active = true
      `) as { rows: any[] };

      // Upsert each request into work queue
      for (const request of activeRequests.rows) {
        await this.upsertWorkItem({
          workItemType: 'service_request',
          referenceId: request.id,
          serviceRequestId: request.id,
          serviceKey: request.serviceType,
          entityId: request.entityId,
          entityName: request.entityName || 'Unknown',
          currentStatus: request.status || 'pending',
          priority: request.priority || 'MEDIUM',
          dueDate: request.dueDate ? new Date(request.dueDate) : null,
          periodLabel: request.periodLabel,
          serviceTypeName: request.serviceType,
          createdAt: request.createdAt ? new Date(request.createdAt) : new Date(),
          lastActivityAt: request.updatedAt ? new Date(request.updatedAt) : new Date()
        });
      }

      // Add compliance tracking items (India compliance obligations)
      // Using raw SQL to avoid ORM issues with complex joins
      const activeComplianceItems = await db.execute(sql`
        SELECT
          ct.id,
          ct.status,
          ct.priority,
          ct.business_entity_id as "entityId",
          be.name as "entityName",
          ct.entity_name as "fallbackEntityName",
          ct.due_date as "dueDate",
          ct.compliance_type as "complianceType",
          ct.service_id as "serviceId",
          ct.service_type as "serviceType",
          cr.rule_code as "ruleCode",
          cr.compliance_name as "complianceName",
          cr.periodicity,
          ct.created_at as "createdAt",
          ct.updated_at as "updatedAt"
        FROM compliance_tracking ct
        LEFT JOIN compliance_rules cr ON ct.compliance_rule_id = cr.id
        LEFT JOIN business_entities be ON ct.business_entity_id = be.id
        WHERE LOWER(ct.status) NOT IN ('completed', 'not_applicable')
      `) as { rows: any[] };

      for (const compliance of activeComplianceItems.rows) {
        await this.upsertWorkItem({
          workItemType: 'compliance',
          referenceId: compliance.id,
          serviceKey: compliance.ruleCode || compliance.serviceId,
          entityId: compliance.entityId,
          entityName: compliance.entityName || compliance.fallbackEntityName || 'Unknown',
          currentStatus: compliance.status || 'pending',
          priority: compliance.priority || 'medium',
          dueDate: compliance.dueDate ? new Date(compliance.dueDate) : null,
          periodLabel: compliance.periodicity || compliance.complianceType || null,
          serviceTypeName: compliance.complianceName || compliance.serviceType || compliance.ruleCode || 'Compliance',
          createdAt: compliance.createdAt ? new Date(compliance.createdAt) : new Date(),
          lastActivityAt: compliance.updatedAt ? new Date(compliance.updatedAt) : new Date()
        });
      }

      console.log(`📋 Work queue refreshed with ${activeRequests.rows.length + activeComplianceItems.rows.length} items`);
    } catch (error) {
      console.error('Error refreshing work queue:', error);
    }
  }

  /**
   * Upsert a work item into the queue
   */
  private async upsertWorkItem(item: {
    workItemType: string;
    referenceId: number;
    serviceRequestId?: number;
    serviceKey?: string;
    entityId?: number | null;
    entityName?: string;
    currentStatus: string;
    priority: string;
    dueDate?: Date | null;
    periodLabel?: string | null;
    serviceTypeName?: string | null;
    createdAt: Date;
    lastActivityAt: Date;
  }): Promise<void> {
    // Check if item exists
    const existing = await db.select()
      .from(workItemQueue)
      .where(
        and(
          eq(workItemQueue.workItemType, item.workItemType),
          eq(workItemQueue.referenceId, item.referenceId)
        )
      )
      .limit(1);

    const ageHours = Math.floor((Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60));

    if (existing.length > 0) {
      // Update existing
      await db.update(workItemQueue)
        .set({
          currentStatus: item.currentStatus,
          priority: item.priority,
          entityName: item.entityName,
          dueDate: item.dueDate,
          lastActivityAt: item.lastActivityAt,
          ageHours,
          serviceTypeName: item.serviceTypeName,
          periodLabel: item.periodLabel
        })
        .where(eq(workItemQueue.id, existing[0].id));
    } else {
      // Insert new
      await db.insert(workItemQueue).values({
        workItemType: item.workItemType,
        referenceId: item.referenceId,
        serviceRequestId: item.serviceRequestId,
        serviceKey: item.serviceKey,
        entityId: item.entityId,
        entityName: item.entityName,
        currentStatus: item.currentStatus,
        priority: item.priority,
        dueDate: item.dueDate,
        periodLabel: item.periodLabel,
        serviceTypeName: item.serviceTypeName,
        ageHours
      });
    }
  }

  // ============================================================================
  // SLA CALCULATION
  // ============================================================================

  /**
   * Calculate and update SLA status for all work items
   */
  async calculateSlaStatuses(): Promise<void> {
    try {
      // Get all work items with due dates
      const items = await db.select()
        .from(workItemQueue)
        .where(sql`${workItemQueue.dueDate} IS NOT NULL`);

      const now = new Date();

      for (const item of items) {
        if (!item.dueDate) continue;

        const dueDate = new Date(item.dueDate);
        const hoursRemaining = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const daysRemaining = hoursRemaining / 24;

        let slaStatus: SlaStatus;
        if (item.workItemType === 'compliance') {
          if (daysRemaining < 0) {
            slaStatus = SlaStatus.BREACHED;
          } else if (daysRemaining <= 3) {
            slaStatus = SlaStatus.WARNING;
          } else if (daysRemaining <= 7) {
            slaStatus = SlaStatus.AT_RISK;
          } else {
            slaStatus = SlaStatus.ON_TRACK;
          }
        } else {
          if (hoursRemaining < 0) {
            slaStatus = SlaStatus.BREACHED;
          } else if (hoursRemaining <= 4) {
            slaStatus = SlaStatus.WARNING;
          } else if (hoursRemaining <= 24) {
            slaStatus = SlaStatus.AT_RISK;
          } else {
            slaStatus = SlaStatus.ON_TRACK;
          }
        }

        // Update work item SLA status
        await db.update(workItemQueue)
          .set({
            slaStatus,
            slaHoursRemaining: Math.max(0, Math.floor(hoursRemaining))
          })
          .where(eq(workItemQueue.id, item.id));
      }
    } catch (error) {
      console.error('Error calculating SLA statuses:', error);
    }
  }

  // ============================================================================
  // ESCALATION RULE PROCESSING
  // ============================================================================

  /**
   * Process a single escalation rule against applicable work items
   */
  private async processEscalationRule(rule: any): Promise<number> {
    let triggeredCount = 0;

    try {
      // Build query conditions based on rule scope
      let conditions: any[] = [];

      if (rule.serviceKey) {
        conditions.push(eq(workItemQueue.serviceKey, rule.serviceKey));
      }

      if (rule.statusCode) {
        conditions.push(eq(workItemQueue.currentStatus, rule.statusCode));
      }

      if (rule.priority) {
        conditions.push(eq(workItemQueue.priority, rule.priority));
      }

      // Get applicable work items
      const applicableItems = conditions.length > 0
        ? await db.select().from(workItemQueue).where(and(...conditions))
        : await db.select().from(workItemQueue);

      // Check each item against the rule
      for (const item of applicableItems) {
        const shouldEscalate = await this.shouldEscalate(item, rule);
        if (shouldEscalate) {
          await this.executeEscalation(item, rule);
          triggeredCount++;
        }
      }

    } catch (error) {
      console.error(`Error processing escalation rule ${rule.ruleKey}:`, error);
    }

    return triggeredCount;
  }

  /**
   * Determine if an item should be escalated based on the rule
   */
  private async shouldEscalate(item: any, rule: any): Promise<boolean> {
    const referenceType = item.workItemType === 'compliance' ? 'compliance_tracking' : 'service_request';
    const referenceId = item.referenceId;

    // Check if already escalated by this rule recently
    const recentEscalation = await db.select()
      .from(escalationExecutions)
      .where(
        and(
          eq(escalationExecutions.escalationRuleId, rule.id),
          item.serviceRequestId
            ? eq(escalationExecutions.serviceRequestId, item.serviceRequestId)
            : and(
                eq(escalationExecutions.referenceType, referenceType),
                eq(escalationExecutions.referenceId, referenceId)
              ),
          sql`${escalationExecutions.triggeredAt} > NOW() - INTERVAL '4 hours'`
        )
      )
      .limit(1);

    if (recentEscalation.length > 0) {
      return false; // Already escalated recently
    }

    // Time-based trigger
    if (rule.triggerType === 'time_based' && rule.triggerHours) {
      const ageHours = item.ageHours || 0;
      return ageHours >= rule.triggerHours;
    }

    // SLA-based trigger
    if (rule.triggerType === 'sla_based') {
      return item.slaStatus === SlaStatus.AT_RISK ||
             item.slaStatus === SlaStatus.WARNING ||
             item.slaStatus === SlaStatus.BREACHED;
    }

    return false;
  }

  /**
   * Execute escalation for a work item
   */
  async executeEscalation(item: any, rule: any): Promise<void> {
    const tiers: EscalationTier[] = rule.escalationTiers || [];

    // Determine which tier to execute based on current escalation level
    const currentLevel = item.escalationLevel || 0;
    const nextTier = tiers.find(t => t.tier === currentLevel + 1);

    if (!nextTier) {
      console.log(`No next tier available for item ${item.id}, currently at level ${currentLevel}`);
      return;
    }

    console.log(`🚨 Escalating work item ${item.id} to tier ${nextTier.tier} (${nextTier.severity})`);

    const actionsExecuted: any[] = [];
    const notificationsSent: any[] = [];
    let newAssignee: number | undefined;

    try {
      // Execute notifications
      if (nextTier.action === 'notify' || nextTier.action === 'both') {
        for (const role of nextTier.notifyRoles) {
          // Get users with this role
          const roleUsers = await db.select()
            .from(users)
            .where(eq(users.role, role));

          for (const user of roleUsers) {
            // Create notification (in production, integrate with email/SMS service)
            const notificationResult = await this.sendEscalationNotification(
              user,
              item,
              nextTier,
              rule
            );

            notificationsSent.push({
              channel: 'in_app',
              recipient: user.email,
              status: notificationResult ? 'sent' : 'failed',
              sentAt: new Date().toISOString()
            });

            actionsExecuted.push({
              action: 'notify',
              target: `${role}:${user.email}`,
              result: notificationResult ? 'success' : 'failed'
            });
          }
        }
      }

      // Execute reassignment
      if ((nextTier.action === 'reassign' || nextTier.action === 'both') && rule.autoReassign) {
        const reassignRole = nextTier.reassignToRole || rule.reassignToRole;
        if (reassignRole) {
          newAssignee = await this.reassignWorkItem(item, reassignRole);
          actionsExecuted.push({
            action: 'reassign',
            target: reassignRole,
            result: newAssignee ? 'success' : 'failed'
          });
        }
      }

      // Create escalation task if configured
      if (nextTier.createTask) {
        await this.createEscalationTask(item, nextTier, rule);
        actionsExecuted.push({
          action: 'create_task',
          target: nextTier.taskTitle || 'Escalation task',
          result: 'success'
        });
      }

      // Record escalation execution (immutable audit log)
      const referenceType = item.workItemType === 'compliance' ? 'compliance_tracking' : 'service_request';
      await db.insert(escalationExecutions).values({
        escalationRuleId: rule.id,
        serviceRequestId: item.serviceRequestId || null,
        referenceType,
        referenceId: item.referenceId,
        tierExecuted: nextTier.tier,
        severity: nextTier.severity,
        actionsExecuted: JSON.stringify(actionsExecuted),
        notificationsSent: JSON.stringify(notificationsSent),
        previousAssignee: item.assignedTo,
        newAssignee: newAssignee,
        reassignmentReason: `Auto-escalation: ${rule.ruleName} - Tier ${nextTier.tier}`
      });

      // Update work item escalation level
      await db.update(workItemQueue)
        .set({
          escalationLevel: nextTier.tier,
          lastEscalatedAt: new Date(),
          assignedTo: newAssignee || item.assignedTo
        })
        .where(eq(workItemQueue.id, item.id));

      // Log activity (immutable)
      await this.logActivity({
        workItemQueueId: item.id,
        serviceRequestId: item.serviceRequestId,
        activityType: 'escalation',
        activityDescription: `Escalated to ${nextTier.severity} level (Tier ${nextTier.tier})`,
        previousValue: { escalationLevel: currentLevel },
        newValue: { escalationLevel: nextTier.tier },
        isSystemGenerated: true,
        triggerSource: 'automation'
      });

      // Emit event for external listeners
      this.emit('escalation_triggered', {
        workItemId: item.id,
        serviceRequestId: item.serviceRequestId,
        rule: rule.ruleKey,
        tier: nextTier.tier,
        severity: nextTier.severity,
        actionsExecuted
      });

    } catch (error) {
      console.error(`Error executing escalation for item ${item.id}:`, error);
    }
  }

  /**
   * Send escalation notification (integrate with notification system)
   */
  private async sendEscalationNotification(
    user: any,
    item: any,
    tier: EscalationTier,
    rule: any
  ): Promise<boolean> {
    try {
      // For now, just log - integrate with actual notification system
      console.log(`📧 Notification to ${user.email}: ${rule.ruleName} - ${tier.severity.toUpperCase()}`);
      console.log(`   Work Item: ${item.serviceTypeName} for ${item.entityName}`);
      console.log(`   Status: ${item.currentStatus}, Age: ${item.ageHours}h`);

      // TODO: Integrate with email/SMS/WhatsApp service
      // await notificationService.send({
      //   to: user.email,
      //   template: tier.emailTemplate,
      //   data: { item, rule, tier }
      // });

      return true;
    } catch (error) {
      console.error('Error sending escalation notification:', error);
      return false;
    }
  }

  /**
   * Reassign work item to a new person based on role
   */
  private async reassignWorkItem(item: any, targetRole: string): Promise<number | undefined> {
    try {
      const roleAliases: Record<string, string> = {
        ops_lead: 'ops_manager',
        ops_exec: 'ops_executive',
        ops_executive: 'ops_executive',
        ops_manager: 'ops_manager'
      };
      const normalizedRole = roleAliases[targetRole] || targetRole;

      // Find available user with the target role
      const availableUsers = await db.select()
        .from(users)
        .where(
          and(
            eq(users.role, normalizedRole),
            eq(users.isActive, true)
          )
        );

      if (availableUsers.length === 0) {
        console.log(`No available users with role ${targetRole} for reassignment`);
        return undefined;
      }

      const candidates = availableUsers.filter(user => user.id !== item.assignedTo);
      const eligibleUsers = candidates.length > 0 ? candidates : availableUsers;

      const candidateIds = eligibleUsers.map(user => user.id);
      const workloads = candidateIds.length > 0
        ? await db.select({
            assigneeId: workItemQueue.assignedTo,
            count: count()
          })
            .from(workItemQueue)
            .where(inArray(workItemQueue.assignedTo, candidateIds))
            .groupBy(workItemQueue.assignedTo)
        : [];

      const workloadMap = new Map<number, number>();
      workloads.forEach(entry => {
        if (entry.assigneeId !== null && entry.assigneeId !== undefined) {
          workloadMap.set(entry.assigneeId, Number(entry.count || 0));
        }
      });

      let selectedUser = eligibleUsers[0];
      let minLoad = workloadMap.get(selectedUser.id) || 0;

      for (const user of eligibleUsers) {
        const load = workloadMap.get(user.id) || 0;
        if (load < minLoad) {
          minLoad = load;
          selectedUser = user;
        }
      }

      // Update service request assignment
      if (item.serviceRequestId) {
        await db.update(serviceRequests)
          .set({
            assignedTeamMember: selectedUser.id,
            updatedAt: new Date()
          })
          .where(eq(serviceRequests.id, item.serviceRequestId));
      }

      await db.update(workItemQueue)
        .set({
          assignedTo: selectedUser.id,
          assignedToName: selectedUser.fullName || selectedUser.email,
          assignedToRole: selectedUser.role,
          lastActivityAt: new Date()
        })
        .where(eq(workItemQueue.id, item.id));

      await this.logActivity({
        workItemQueueId: item.id,
        serviceRequestId: item.serviceRequestId,
        activityType: 'assignment',
        activityDescription: `Auto-reassigned to ${selectedUser.fullName || selectedUser.email}`,
        previousValue: { assignedTo: item.assignedTo },
        newValue: { assignedTo: selectedUser.id, assigneeName: selectedUser.fullName || selectedUser.email },
        isSystemGenerated: true,
        triggerSource: 'auto_escalation'
      });

      if (selectedUser.id) {
        await db.insert(notifications).values({
          userId: selectedUser.id,
          title: 'Work Item Reassigned',
          message: `A work item has been reassigned to you due to escalation.`,
          type: 'task_assignment',
          category: 'service',
          priority: 'high',
          actionUrl: item.serviceRequestId ? `/ops/service-requests/${item.serviceRequestId}` : undefined,
          actionText: item.serviceRequestId ? 'View Service Request' : 'View Work Item',
          createdAt: new Date()
        });
      }

      console.log(`🔄 Reassigned work item ${item.id} to ${selectedUser.fullName || selectedUser.email} (${normalizedRole})`);

      return selectedUser.id;
    } catch (error) {
      console.error('Error reassigning work item:', error);
      return undefined;
    }
  }

  /**
   * Create a task for the escalation
   */
  private async createEscalationTask(item: any, tier: EscalationTier, rule: any): Promise<void> {
    try {
      await db.insert(taskItems).values({
        title: tier.taskTitle || `ESCALATION: ${rule.ruleName}`,
        description: `Auto-escalated work item requires attention.\n\nService: ${item.serviceTypeName}\nClient: ${item.entityName}\nCurrent Status: ${item.currentStatus}\nAge: ${item.ageHours} hours\nEscalation Level: ${tier.severity.toUpperCase()}`,
        taskType: 'escalation',
        priority: tier.severity === 'breach' ? 'urgent' : 'high',
        status: 'pending',
        serviceRequestId: item.serviceRequestId,
        assignedTo: item.assignedTo,
        dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours from now
      });
    } catch (error) {
      console.error('Error creating escalation task:', error);
    }
  }

  // ============================================================================
  // SLA BREACH DETECTION & RECORDING
  // ============================================================================

  /**
   * Detect and record SLA breaches
   */
  async detectAndRecordBreaches(): Promise<void> {
    try {
      // Find breached items that haven't been recorded
      const breachedItems = await db.select()
        .from(workItemQueue)
        .where(eq(workItemQueue.slaStatus, SlaStatus.BREACHED));

      for (const item of breachedItems) {
        // Check if breach already recorded
        const existingBreach = await db.select()
          .from(slaBreachRecords)
          .where(
            and(
              eq(slaBreachRecords.serviceRequestId, item.serviceRequestId || item.referenceId),
              eq(slaBreachRecords.statusAtBreach, item.currentStatus)
            )
          )
          .limit(1);

        if (existingBreach.length === 0 && item.slaDeadline && item.serviceRequestId) {
          // Calculate breach details
          const deadline = new Date(item.slaDeadline);
          const now = new Date();
          const breachHours = Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60));

          await db.insert(slaBreachRecords).values({
            serviceRequestId: item.serviceRequestId,
            breachType: 'overall_sla',
            breachSeverity: breachHours > 48 ? 'critical' : breachHours > 24 ? 'major' : 'minor',
            slaHours: item.slaHoursRemaining ? -item.slaHoursRemaining : 0,
            actualHours: (item.ageHours || 0) + breachHours,
            breachHours,
            statusAtBreach: item.currentStatus,
            assigneeAtBreach: item.assignedTo,
            remediationRequired: true,
            remediationStatus: 'pending'
          });

          // Log breach activity
          await this.logActivity({
            workItemQueueId: item.id,
            serviceRequestId: item.serviceRequestId,
            activityType: 'sla_breach',
            activityDescription: `SLA breached by ${breachHours} hours`,
            newValue: { breachHours, severity: breachHours > 48 ? 'critical' : 'major' },
            isSystemGenerated: true,
            triggerSource: 'automation',
            clientVisible: true,
            clientMessage: 'We apologize for the delay. Our team is prioritizing your request.'
          });

          this.emit('sla_breach', {
            serviceRequestId: item.serviceRequestId,
            breachHours,
            currentStatus: item.currentStatus
          });

          console.log(`🚨 SLA Breach recorded: Service ${item.serviceRequestId} - ${breachHours}h over`);
        }
      }
    } catch (error) {
      console.error('Error detecting breaches:', error);
    }
  }

  // ============================================================================
  // ACTIVITY LOGGING (SOC 2 COMPLIANT - IMMUTABLE)
  // ============================================================================

  /**
   * Log activity to the immutable audit trail
   */
  async logActivity(activity: {
    workItemQueueId: number;
    serviceRequestId?: number | null;
    activityType: string;
    activityDescription: string;
    previousValue?: any;
    newValue?: any;
    performedBy?: number;
    performedByName?: string;
    performedByRole?: string;
    isSystemGenerated?: boolean;
    triggerSource?: string;
    clientVisible?: boolean;
    clientMessage?: string;
  }): Promise<void> {
    try {
      await db.insert(workItemActivityLog).values({
        workItemQueueId: activity.workItemQueueId,
        serviceRequestId: activity.serviceRequestId,
        activityType: activity.activityType,
        activityDescription: activity.activityDescription,
        previousValue: activity.previousValue ? JSON.stringify(activity.previousValue) : null,
        newValue: activity.newValue ? JSON.stringify(activity.newValue) : null,
        performedBy: activity.performedBy,
        performedByName: activity.performedByName,
        performedByRole: activity.performedByRole,
        isSystemGenerated: activity.isSystemGenerated || false,
        triggerSource: activity.triggerSource || 'system',
        clientVisible: activity.clientVisible || false,
        clientMessage: activity.clientMessage
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  // ============================================================================
  // QUERY METHODS FOR DASHBOARDS
  // ============================================================================

  /**
   * Get unified work queue with filters
   */
  async getWorkQueue(filters?: {
    slaStatus?: SlaStatus;
    priority?: string;
    assignedTo?: number;
    serviceKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: any[]; stats: WorkItemStats }> {
    let query = db.select().from(workItemQueue);
    let conditions: any[] = [];

    if (filters?.slaStatus) {
      conditions.push(eq(workItemQueue.slaStatus, filters.slaStatus));
    }
    if (filters?.priority) {
      conditions.push(eq(workItemQueue.priority, filters.priority));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(workItemQueue.assignedTo, filters.assignedTo));
    }
    if (filters?.serviceKey) {
      conditions.push(eq(workItemQueue.serviceKey, filters.serviceKey));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(
      desc(workItemQueue.escalationLevel),
      sql`CASE WHEN ${workItemQueue.slaStatus} = 'breached' THEN 1
               WHEN ${workItemQueue.slaStatus} = 'warning' THEN 2
               WHEN ${workItemQueue.slaStatus} = 'at_risk' THEN 3
               ELSE 4 END`,
      desc(workItemQueue.priority)
    ) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    const items = await query;

    // Enrich compliance items with evidence summary and rule metadata
    let enrichedItems = items as any[];
    const complianceItems = items.filter(item => item.workItemType === 'compliance');
    if (complianceItems.length > 0) {
      const complianceIds = complianceItems.map(item => item.referenceId);
      const trackingRows = await db
        .select({
          id: complianceTracking.id,
          complianceRuleId: complianceTracking.complianceRuleId,
          complianceType: complianceTracking.complianceType,
          serviceId: complianceTracking.serviceId,
          serviceType: complianceTracking.serviceType,
          ruleCode: complianceRules.ruleCode,
          complianceName: complianceRules.complianceName,
        })
        .from(complianceTracking)
        .leftJoin(complianceRules, eq(complianceTracking.complianceRuleId, complianceRules.id))
        .where(inArray(complianceTracking.id, complianceIds));

      const trackingById = new Map<number, typeof trackingRows[number]>();
      trackingRows.forEach(row => trackingById.set(row.id, row));

      const evidenceInputs = complianceItems
        .map(item => {
          const tracking = trackingById.get(item.referenceId);
          return {
            entityId: item.entityId ?? null,
            complianceRuleId: tracking?.complianceRuleId ?? null
          };
        })
        .filter(item => item.entityId && item.complianceRuleId);

      const evidenceMap = await getEvidenceSummaries(evidenceInputs);
      const now = new Date();

      enrichedItems = items.map(item => {
        if (item.workItemType !== 'compliance') return item;
        const tracking = trackingById.get(item.referenceId);
        const evidenceKey = tracking?.complianceRuleId && item.entityId
          ? `${item.entityId}:${tracking.complianceRuleId}`
          : null;
        const evidence = evidenceKey ? evidenceMap.get(evidenceKey) : undefined;
        const dueDate = item.dueDate ? new Date(item.dueDate) : null;
        const daysRemaining = dueDate
          ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...item,
          complianceRuleId: tracking?.complianceRuleId ?? null,
          complianceRuleCode: tracking?.ruleCode ?? null,
          complianceName: tracking?.complianceName ?? item.serviceTypeName ?? null,
          complianceType: tracking?.complianceType ?? item.periodLabel ?? null,
          slaDaysRemaining: daysRemaining,
          evidenceSummary: evidence?.evidenceSummary ?? null,
          missingDocuments: evidence?.missingDocuments?.map(doc => doc.documentName) ?? [],
          requiredDocuments: evidence?.requiredDocuments?.map(doc => doc.documentName) ?? []
        };
      });
    }

    // Calculate stats
    const allItems = await db.select().from(workItemQueue);
    const stats: WorkItemStats = {
      total: allItems.length,
      onTrack: allItems.filter(i => i.slaStatus === SlaStatus.ON_TRACK).length,
      atRisk: allItems.filter(i => i.slaStatus === SlaStatus.AT_RISK).length,
      warning: allItems.filter(i => i.slaStatus === SlaStatus.WARNING).length,
      breached: allItems.filter(i => i.slaStatus === SlaStatus.BREACHED).length,
      unassigned: allItems.filter(i => !i.assignedTo).length,
      byPriority: {},
      byStatus: {},
      byAssignee: {}
    };

    allItems.forEach(item => {
      stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;
      stats.byStatus[item.currentStatus] = (stats.byStatus[item.currentStatus] || 0) + 1;
      if (item.assignedToName) {
        stats.byAssignee[item.assignedToName] = (stats.byAssignee[item.assignedToName] || 0) + 1;
      }
    });

    return { items: enrichedItems, stats };
  }

  /**
   * Get breach records for reporting
   */
  async getBreachRecords(filters?: {
    severity?: string;
    remediationStatus?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    let query = db.select().from(slaBreachRecords);
    let conditions: any[] = [];

    if (filters?.severity) {
      conditions.push(eq(slaBreachRecords.breachSeverity, filters.severity));
    }
    if (filters?.remediationStatus) {
      conditions.push(eq(slaBreachRecords.remediationStatus, filters.remediationStatus));
    }
    if (filters?.fromDate) {
      conditions.push(gte(slaBreachRecords.breachedAt, filters.fromDate));
    }
    if (filters?.toDate) {
      conditions.push(lte(slaBreachRecords.breachedAt, filters.toDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(slaBreachRecords.breachedAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }

  /**
   * Get escalation history for a service request
   */
  async getEscalationHistory(serviceRequestId: number): Promise<any[]> {
    return await db.select()
      .from(escalationExecutions)
      .where(eq(escalationExecutions.serviceRequestId, serviceRequestId))
      .orderBy(desc(escalationExecutions.triggeredAt));
  }

  /**
   * Get activity log for a work item
   */
  async getActivityLog(workItemQueueId: number): Promise<any[]> {
    return await db.select()
      .from(workItemActivityLog)
      .where(eq(workItemActivityLog.workItemQueueId, workItemQueueId))
      .orderBy(desc(workItemActivityLog.occurredAt));
  }

  /**
   * Get client-visible activity for a service request
   */
  async getClientVisibleActivity(serviceRequestId: number): Promise<any[]> {
    return await db.select()
      .from(workItemActivityLog)
      .where(
        and(
          eq(workItemActivityLog.serviceRequestId, serviceRequestId),
          eq(workItemActivityLog.clientVisible, true)
        )
      )
      .orderBy(desc(workItemActivityLog.occurredAt));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const autoEscalationEngine = AutoEscalationEngine.getInstance();

// Helper functions for external use
export async function initializeEscalationEngine(intervalMinutes: number = 15): Promise<void> {
  await autoEscalationEngine.startProcessing(intervalMinutes);
}

export async function stopEscalationEngine(): Promise<void> {
  await autoEscalationEngine.stopProcessing();
}

export async function getUnifiedWorkQueue(filters?: any): Promise<any> {
  return await autoEscalationEngine.getWorkQueue(filters);
}

export async function getSlaBreachReport(filters?: any): Promise<any[]> {
  return await autoEscalationEngine.getBreachRecords(filters);
}

export async function logWorkItemActivity(activity: any): Promise<void> {
  return await autoEscalationEngine.logActivity(activity);
}

// Default escalation rules to seed
export const DEFAULT_ESCALATION_RULES = [
  {
    ruleKey: 'universal_24h_warning',
    ruleName: '24-Hour Warning Escalation',
    triggerType: 'time_based',
    triggerHours: 24,
    escalationTiers: [
      {
        tier: 1,
        hoursAfterTrigger: 0,
        action: 'notify',
        notifyRoles: ['ops_executive'],
        severity: 'warning',
        createTask: true,
        taskTitle: 'Work item approaching 24h mark'
      }
    ],
    autoReassign: false,
    isActive: true
  },
  {
    ruleKey: 'universal_48h_critical',
    ruleName: '48-Hour Critical Escalation',
    triggerType: 'time_based',
    triggerHours: 48,
    escalationTiers: [
      {
        tier: 2,
        hoursAfterTrigger: 0,
        action: 'both',
        notifyRoles: ['ops_executive', 'ops_lead'],
        reassignToRole: 'ops_lead',
        severity: 'critical',
        createTask: true,
        taskTitle: 'CRITICAL: Work item requires immediate attention'
      }
    ],
    autoReassign: true,
    reassignToRole: 'ops_lead',
    isActive: true
  },
  {
    ruleKey: 'sla_breach_alert',
    ruleName: 'SLA Breach Management Alert',
    triggerType: 'sla_based',
    escalationTiers: [
      {
        tier: 3,
        hoursAfterTrigger: 0,
        action: 'both',
        notifyRoles: ['ops_lead', 'admin'],
        reassignToRole: 'admin',
        severity: 'breach',
        createTask: true,
        taskTitle: 'SLA BREACH: Immediate remediation required'
      }
    ],
    autoReassign: true,
    reassignToRole: 'admin',
    createIncident: true,
    notifyClient: true,
    clientNotificationTemplate: 'sla_breach_apology',
    isActive: true
  }
];
