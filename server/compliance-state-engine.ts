/**
 * Compliance State Engine - Core Calculation Logic
 * 
 * This is the heart of the state-based compliance system.
 * Transforms service tracking into compliance status monitoring.
 * 
 * Design Principles:
 * 1. Deterministic - Same inputs always produce same outputs
 * 2. Fast - Calculation should complete in < 500ms per entity
 * 3. Auditable - Every calculation is logged
 * 4. Fail-safe - Errors don't crash, they downgrade gracefully
 */

import { db } from './db';
import { 
  complianceStates, 
  complianceStateHistory, 
  complianceAlerts,
  stateCalculationLog 
} from '../shared/compliance-state-schema';
import { complianceRules, complianceTracking, businessEntities, serviceRequests, documentsUploads, documentVault } from '../shared/schema';
import {
  ComplianceState,
  ComplianceDomain,
  EntityComplianceState,
  DomainComplianceState,
  ComplianceRequirementStatus,
  StateCalculationInput,
  StateCalculationResult,
  ComplianceRule
} from '../shared/compliance-state-types';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { computeDueDateFromFormula } from './compliance-due-date';

const CALCULATION_VERSION = '1.0.0';

// ============================================================================
// MAIN STATE CALCULATION ENGINE
// ============================================================================

export class ComplianceStateEngine {
  
  /**
   * Calculate compliance state for an entity
   * This is the main entry point
   */
  async calculateEntityState(entityId: number): Promise<StateCalculationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Gather input data
      const input = await this.gatherInputData(entityId);
      if (!input) {
        return this.errorResult('Entity not found', startTime);
      }

      // 2. Load applicable rules
      const rules = await this.loadApplicableRules(input);
      console.log(`📋 Loaded ${rules.length} applicable rules for entity ${entityId}`);

      // 3. Calculate state for each domain
      const domainStates = await this.calculateDomainStates(input, rules);

      // 4. Calculate overall state
      const overallState = this.calculateOverallState(domainStates);

      // 5. Identify next critical action
      const nextAction = this.identifyNextCriticalAction(domainStates);

      // 6. Build entity state
      const entityState: EntityComplianceState = {
        entityId: input.entityId,
        entityName: input.entityName || input.entityType,
        entityType: input.entityType,
        overallState: overallState.state,
        overallRiskScore: overallState.riskScore,
        daysUntilNextDeadline: nextAction.daysUntil,
        nextCriticalDeadline: nextAction.deadline,
        nextCriticalAction: nextAction.action,
        totalPenaltyExposure: this.sumPenaltyExposure(domainStates),
        totalOverdueItems: this.countOverdueItems(domainStates),
        totalUpcomingItems: this.countUpcomingItems(domainStates),
        domains: domainStates,
        calculatedAt: new Date(),
        calculationVersion: CALCULATION_VERSION,
        dataCompletenessScore: this.calculateDataCompleteness(input),
      };

      // 7. Save state to database
      await this.saveState(entityState);

      // 8. Log calculation
      await this.logCalculation(entityId, null, overallState.state, rules.length, errors, warnings, Date.now() - startTime);

      // 9. Generate alerts if needed
      await this.generateAlerts(entityState);

      return {
        success: true,
        entityState,
        errors,
        warnings,
        calculationTimeMs: Date.now() - startTime,
      };

    } catch (error: any) {
      console.error(`❌ State calculation failed for entity ${entityId}:`, error);
      errors.push(error.message);
      await this.logCalculation(entityId, null, 'RED', 0, errors, warnings, Date.now() - startTime);
      return this.errorResult(error.message, startTime);
    }
  }

  /**
   * Recalculate all entities (for batch processing)
   */
  async recalculateAllEntities(): Promise<{ success: number; failed: number }> {
    console.log('🔄 Starting batch recalculation of all entities...');
    
    const entities = await db.query.businessEntities.findMany({
      where: (entities: any, { eq }: any) => eq(entities.isActive, true)
    });

    let success = 0;
    let failed = 0;

    for (const entity of entities) {
      try {
        const result = await this.calculateEntityState(entity.id);
        if (result.success) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to calculate state for entity ${entity.id}:`, error);
        failed++;
      }
    }

    console.log(`✅ Batch calculation complete: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  // ============================================================================
  // DATA GATHERING
  // ============================================================================

  private async gatherInputData(entityId: number): Promise<StateCalculationInput | null> {
    // Gather all data needed for state calculation
    const [entity] = await db
      .select()
      .from(businessEntities)
      .where(eq(businessEntities.id, entityId))
      .limit(1);

    if (!entity) return null;

    // Get active service requests
    const serviceRequestsList = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.businessEntityId, entityId));

    // Get document status
    const uploadedDocuments = await db
      .select()
      .from(documentsUploads)
      .where(eq(documentsUploads.entityId, entityId));

    const vaultDocuments = await db
      .select()
      .from(documentVault)
      .where(eq(documentVault.businessEntityId, entityId));

    const trackingItems = await db
      .select({
        complianceRuleId: complianceTracking.complianceRuleId,
        serviceId: complianceTracking.serviceId,
        dueDate: complianceTracking.dueDate,
        nextDueDate: complianceTracking.nextDueDate,
        status: complianceTracking.status,
        lastCompleted: complianceTracking.lastCompleted,
        priority: complianceTracking.priority
      })
      .from(complianceTracking)
      .where(eq(complianceTracking.businessEntityId, entityId));

    // Build input
    const input: StateCalculationInput = {
      entityId: entity.id,
      entityName: (entity as any).name || (entity as any).businessName || null,
      entityType: entity.entityType || 'pvt_ltd',
      incorporationDate: entity.incorporationDate || null,
      turnover: entity.annualTurnover ? parseFloat(entity.annualTurnover) : null,
      employeeCount: entity.employeeCount ?? null,
      state: entity.state || null,
      hasGST: entity.gstin ? true : false,
      hasPF: entity.employeeCount ? entity.employeeCount >= 20 : false,
      hasESI: entity.employeeCount ? entity.employeeCount >= 10 : false,
      hasForeignTransactions: false, // TODO: Detect from services
      
      activeServices: serviceRequestsList.map((sr: any) => ({
        serviceKey: sr.serviceType || '',
        status: sr.status || 'pending',
        dueDate: sr.expectedCompletionDate || null,
        lastCompleted: sr.completedAt || null,
      })),
      
      documentStatus: [
        ...uploadedDocuments.map((doc: any) => ({
          documentType: doc.doctype || '',
          uploaded: true,
          approved: doc.status === 'approved',
          expiryDate: null,
        })),
        ...vaultDocuments.map((doc: any) => ({
          documentType: doc.documentType || '',
          uploaded: true,
          approved: doc.approvalStatus === 'approved',
          expiryDate: doc.expiryDate || null,
        })),
      ],
      
      filingHistory: [], // TODO: Implement filing history tracking
      trackingItems,
    };

    return input;
  }

  // ============================================================================
  // RULE LOADING & FILTERING
  // ============================================================================

  private async loadApplicableRules(input: StateCalculationInput): Promise<ComplianceRule[]> {
    const allRules = await db.select().from(complianceRules).where(eq(complianceRules.isActive, true));
    const now = new Date();
    const normalizedEntityType = this.normalizeEntityType(input.entityType);

    // Filter rules based on applicability
    const applicableRules = allRules.filter((rule: any) => {
      // Check entity type
      if (rule.applicableEntityTypes) {
        const applicableTypes = Array.isArray(rule.applicableEntityTypes)
          ? rule.applicableEntityTypes
          : [rule.applicableEntityTypes];
        const normalizedApplicable = applicableTypes
          .filter(Boolean)
          .map((value: string) => this.normalizeEntityType(value));

        if (normalizedApplicable.length > 0 && !normalizedApplicable.includes(normalizedEntityType)) {
          return false;
        }
      }

      // Check turnover threshold
      if (input.turnover !== null && input.turnover !== undefined) {
        if (rule.turnoverThresholdMin && input.turnover < parseFloat(rule.turnoverThresholdMin)) return false;
        if (rule.turnoverThresholdMax && input.turnover > parseFloat(rule.turnoverThresholdMax)) return false;
      }

      // Check employee count
      if (rule.employeeCountMin && input.employeeCount !== null && input.employeeCount !== undefined) {
        if (input.employeeCount < rule.employeeCountMin) return false;
      }
      if (rule.employeeCountMax && input.employeeCount !== null && input.employeeCount !== undefined) {
        if (input.employeeCount > rule.employeeCountMax) return false;
      }

      // Check effective window (date-granular to avoid time-of-day exclusions)
      if (rule.effectiveFrom) {
        const effectiveFrom = new Date(rule.effectiveFrom);
        const effectiveStart = new Date(
          effectiveFrom.getFullYear(),
          effectiveFrom.getMonth(),
          effectiveFrom.getDate()
        );
        if (now < effectiveStart) return false;
      }
      if (rule.effectiveUntil) {
        const effectiveUntil = new Date(rule.effectiveUntil);
        const effectiveEnd = new Date(
          effectiveUntil.getFullYear(),
          effectiveUntil.getMonth(),
          effectiveUntil.getDate(),
          23,
          59,
          59,
          999
        );
        if (now > effectiveEnd) return false;
      }

      // Check GST/PF/ESI requirement by category
      if (String(rule.regulationCategory || '').toLowerCase() === 'gst' && !input.hasGST) return false;
      if (String(rule.regulationCategory || '').toLowerCase() === 'pf_esi' && !input.hasPF && !input.hasESI) return false;

      // State-specific compliance
      if (rule.stateSpecific && Array.isArray(rule.applicableStates) && rule.applicableStates.length > 0) {
        if (!input.state || !rule.applicableStates.includes(input.state)) {
          return false;
        }
      }

      return true;
    });

    return applicableRules.map((rule: any) => this.convertToComplianceRule(rule));
  }

  private convertToComplianceRule(dbRule: any): ComplianceRule {
    const rawFormula = dbRule.dueDateFormula || {};
    const formulaList = Array.isArray(rawFormula) ? [...rawFormula] : [rawFormula];
    const metadata = dbRule.metadata && typeof dbRule.metadata === 'object' ? dbRule.metadata : null;

    if (metadata?.second_cycle?.day && metadata?.second_cycle?.month) {
      formulaList.push({
        type: 'fixed',
        day: metadata.second_cycle.day,
        month: metadata.second_cycle.month,
      });
    }

    const dueDateLogic = JSON.stringify(
      (formulaList.length > 0 ? formulaList : [{}]).map((formula: any) => ({
        ...formula,
        calcType: formula.calcType || dbRule.dueDateCalculationType || formula.type,
      }))
    );

    return {
      ruleId: dbRule.ruleCode,
      ruleName: dbRule.complianceName || dbRule.ruleCode,
      domain: this.mapRegulationCategoryToDomain(dbRule.regulationCategory),
      complianceRuleId: dbRule.id,
      applicableEntityTypes: dbRule.applicableEntityTypes || [],
      turnoverThreshold: {
        min: dbRule.turnoverThresholdMin ? parseFloat(dbRule.turnoverThresholdMin) : undefined,
        max: dbRule.turnoverThresholdMax ? parseFloat(dbRule.turnoverThresholdMax) : undefined,
      },
      employeeCountThreshold: {
        min: dbRule.employeeCountMin || undefined,
      },
      frequency: this.mapPeriodicityToFrequency(dbRule.periodicity),
      dueDateLogic,
      graceDays: dbRule.graceDays || 0,
      penaltyPerDay: dbRule.penaltyPerDay ? parseFloat(dbRule.penaltyPerDay) : undefined,
      maxPenalty: dbRule.maxPenalty ? parseFloat(dbRule.maxPenalty) : undefined,
      criticalityScore: this.mapPriorityToCriticalityScore(dbRule.priorityLevel),
      amberThresholdDays: dbRule.amberThresholdDays || 7,
      redTriggers: {
        daysOverdue: dbRule.redThresholdDays || 0,
      },
    };
  }

  private mapRegulationCategoryToDomain(category?: string): ComplianceDomain {
    const normalized = (category || '').toLowerCase();
    if (['companies_act', 'business_registration', 'funding_readiness'].includes(normalized)) {
      return 'CORPORATE';
    }
    if (normalized === 'gst') return 'TAX_GST';
    if (['income_tax', 'tds', 'tcs'].includes(normalized)) return 'TAX_INCOME';
    if (['pf_esi', 'labour_laws', 'professional_tax', 'payroll'].includes(normalized)) {
      return 'LABOUR';
    }
    if (normalized === 'fema') return 'FEMA';
    if (normalized === 'licenses' || normalized === 'license') return 'LICENSES';
    if (normalized === 'general') return 'STATUTORY';
    return 'STATUTORY';
  }

  private normalizeEntityType(entityType?: string | null): string {
    if (!entityType) return '';
    const normalized = entityType.toLowerCase().replace(/[^a-z]/g, '');
    switch (normalized) {
      case 'privatelimited':
      case 'privateltd':
      case 'pvtlimited':
      case 'pvtltd':
      case 'pvtltdcompany':
        return 'pvt_ltd';
      case 'publiclimited':
      case 'publicltd':
        return 'public_limited';
      case 'opc':
      case 'onepersoncompany':
        return 'opc';
      case 'llp':
        return 'llp';
      case 'proprietorship':
      case 'soleproprietorship':
      case 'soleprop':
        return 'sole_prop';
      case 'partnership':
        return 'partnership';
      default:
        return entityType.toLowerCase();
    }
  }

  private mapPeriodicityToFrequency(periodicity?: string): ComplianceRule['frequency'] {
    const normalized = (periodicity || '').toLowerCase();
    switch (normalized) {
      case 'monthly':
        return 'MONTHLY';
      case 'quarterly':
        return 'QUARTERLY';
      case 'half_yearly':
        return 'HALF_YEARLY';
      case 'annual':
        return 'ANNUAL';
      case 'event_based':
        return 'EVENT_BASED';
      case 'one_time':
        return 'ONE_TIME';
      default:
        return 'ANNUAL';
    }
  }

  private mapPriorityToCriticalityScore(priority?: string): number {
    const normalized = (priority || '').toLowerCase();
    switch (normalized) {
      case 'critical':
        return 9;
      case 'high':
        return 7;
      case 'low':
        return 3;
      case 'medium':
      default:
        return 5;
    }
  }

  // ============================================================================
  // STATE CALCULATION LOGIC
  // ============================================================================

  private async calculateDomainStates(
    input: StateCalculationInput,
    rules: ComplianceRule[]
  ): Promise<DomainComplianceState[]> {
    const domains: ComplianceDomain[] = ['CORPORATE', 'TAX_GST', 'TAX_INCOME', 'LABOUR', 'FEMA', 'LICENSES', 'STATUTORY'];
    
    const domainStates: DomainComplianceState[] = [];

    for (const domain of domains) {
      const domainRules = rules.filter(r => r.domain === domain);
      if (domainRules.length === 0) continue; // Skip domains with no applicable rules

      const requirements = domainRules.map(rule => 
        this.calculateRequirementStatus(rule, input)
      );

      const domainState: DomainComplianceState = {
        domain,
        state: this.determineDomainState(requirements),
        riskScore: this.calculateDomainRiskScore(requirements),
        activeRequirements: requirements.length,
        overdueRequirements: requirements.filter(r => r.state === 'RED').length,
        upcomingDeadlines: requirements.filter(r => r.daysUntilDue !== null && r.daysUntilDue <= 7).length,
        totalPenaltyExposure: requirements.reduce((sum, r) => sum + r.penaltyExposure, 0),
        requirements,
      };

      domainStates.push(domainState);
    }

    return domainStates;
  }

  private calculateRequirementStatus(
    rule: ComplianceRule,
    input: StateCalculationInput
  ): ComplianceRequirementStatus {
    const tracking = this.findTrackingForRule(rule, input);
    const trackingPriority = this.normalizePriority(tracking?.priority);
    const trackingStatus = tracking?.status ? tracking.status.toLowerCase() : null;
    const trackingDueDate = tracking?.nextDueDate || tracking?.dueDate || null;

    // Calculate due date based on tracking (preferred) or rule logic
    let dueDate = trackingDueDate || this.calculateDueDate(rule, input);
    const now = new Date();
    
    let daysUntilDue: number | null = null;
    let daysOverdue: number | null = null;
    let state: ComplianceState = 'GREEN';

    if (trackingStatus === 'completed' && !tracking?.nextDueDate) {
      return {
        requirementId: rule.ruleId,
        name: rule.ruleName,
        domain: rule.domain,
        state: 'GREEN',
        dueDate: null,
        daysUntilDue: null,
        daysOverdue: null,
        penaltyExposure: 0,
        priority: trackingPriority || this.determinePriority('GREEN', rule.criticalityScore, null),
        isRecurring: rule.frequency !== 'ONE_TIME',
        nextOccurrence: null,
        lastFiled: tracking?.lastCompleted || null,
        blockers: [],
        actionRequired: 'No action required',
      };
    }

    if (trackingStatus === 'not_applicable') {
      return {
        requirementId: rule.ruleId,
        name: rule.ruleName,
        domain: rule.domain,
        state: 'GREEN',
        dueDate: null,
        daysUntilDue: null,
        daysOverdue: null,
        penaltyExposure: 0,
        priority: trackingPriority || this.determinePriority('GREEN', rule.criticalityScore, null),
        isRecurring: rule.frequency !== 'ONE_TIME',
        nextOccurrence: null,
        lastFiled: tracking?.lastCompleted || null,
        blockers: [],
        actionRequired: 'Not applicable',
      };
    }

    if (dueDate) {
      const diffMs = dueDate.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Overdue
        daysOverdue = Math.abs(diffDays);
        state = 'RED';
      } else if (diffDays <= rule.amberThresholdDays) {
        // Upcoming (within threshold)
        daysUntilDue = diffDays;
        state = 'AMBER';
      } else {
        // Safe
        daysUntilDue = diffDays;
        state = 'GREEN';
      }
    }

    // Calculate penalty exposure
    const penaltyExposure = daysOverdue && rule.penaltyPerDay
      ? Math.min(daysOverdue * rule.penaltyPerDay, rule.maxPenalty || Infinity)
      : 0;

    // Determine priority
    const priority = trackingPriority || this.determinePriority(state, rule.criticalityScore, daysUntilDue);

    return {
      requirementId: rule.ruleId,
      name: rule.ruleName,
      domain: rule.domain,
      state,
      dueDate,
      daysUntilDue,
      daysOverdue,
      penaltyExposure,
      priority,
      isRecurring: rule.frequency !== 'ONE_TIME',
      nextOccurrence: dueDate,
      lastFiled: tracking?.lastCompleted || null,
      blockers: this.identifyBlockers(rule, input),
      actionRequired: this.generateActionText(state, rule, daysUntilDue, daysOverdue),
    };
  }

  private findTrackingForRule(rule: ComplianceRule, input: StateCalculationInput) {
    if (!input.trackingItems || input.trackingItems.length === 0) return null;

    const matching = input.trackingItems.filter((item) => {
      if (rule.complianceRuleId && item.complianceRuleId === rule.complianceRuleId) return true;
      if (item.serviceId && item.serviceId === rule.ruleId) return true;
      return false;
    });

    if (matching.length === 0) return null;

    const withEffectiveDueDate = matching.map((item) => ({
      ...item,
      effectiveDueDate: item.nextDueDate || item.dueDate || null,
    }));

    const active = withEffectiveDueDate
      .filter(item => item.status && !['completed', 'not_applicable'].includes(item.status.toLowerCase()))
      .sort((a, b) => {
        const aTime = a.effectiveDueDate ? a.effectiveDueDate.getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.effectiveDueDate ? b.effectiveDueDate.getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });

    if (active.length > 0) {
      return active[0];
    }

    const completedWithNext = withEffectiveDueDate
      .filter(item => item.status && item.status.toLowerCase() === 'completed' && item.nextDueDate)
      .sort((a, b) => {
        const aTime = a.effectiveDueDate ? a.effectiveDueDate.getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.effectiveDueDate ? b.effectiveDueDate.getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });

    if (completedWithNext.length > 0) {
      return completedWithNext[0];
    }

    const completed = withEffectiveDueDate
      .filter(item => item.status && item.status.toLowerCase() === 'completed')
      .sort((a, b) => {
        const aTime = a.lastCompleted ? a.lastCompleted.getTime() : 0;
        const bTime = b.lastCompleted ? b.lastCompleted.getTime() : 0;
        return bTime - aTime;
      });

    return completed[0] || matching[0];
  }

  private normalizePriority(priority?: string | null): 'critical' | 'high' | 'medium' | 'low' | null {
    if (!priority) return null;
    const normalized = priority.toLowerCase();
    if (normalized === 'critical' || normalized === 'high' || normalized === 'medium' || normalized === 'low') {
      return normalized;
    }
    return null;
  }

  private calculateDueDate(rule: ComplianceRule, input: StateCalculationInput): Date | null {
    const now = new Date();
    const formulaInput = (rule as any).dueDateFormula;
    const calcType = (rule as any).dueDateCalculationType;

    if (formulaInput) {
      let baseDate = now;
      const rawFormula = Array.isArray(formulaInput) ? formulaInput : [formulaInput];
      const triggerEvent = rawFormula
        .map((formula: any) => formula?.trigger_event)
        .find((value: any) => typeof value === 'string' && value.trim().length > 0);

      if (calcType === 'event_triggered') {
        if (triggerEvent === 'incorporation_date' && input.incorporationDate) {
          baseDate = new Date(input.incorporationDate);
        } else if (triggerEvent) {
          return null;
        }
      }

      return computeDueDateFromFormula(formulaInput as any, calcType, baseDate);
    }

    const rawLogic = (rule.dueDateLogic || '').trim();

    if (!rawLogic) {
      return null;
    }

    if (rawLogic.startsWith('{') || rawLogic.startsWith('[')) {
      try {
        const parsed = JSON.parse(rawLogic);
        if (parsed && typeof parsed === 'object') {
          const formulaList = Array.isArray(parsed) ? parsed : [parsed];
          const trigger = formulaList
            .map((formula: any) => formula?.trigger_event)
            .find((value: any) => typeof value === 'string' && value.trim().length > 0);

          if (trigger) {
            if (trigger === 'incorporation_date' && input.incorporationDate) {
              return computeDueDateFromFormula(parsed, undefined, new Date(input.incorporationDate));
            }
            return null;
          }

          return computeDueDateFromFormula(parsed, undefined, now);
        }
      } catch (error) {
        // Fall back to string parsing below
      }
    }

    const logic = rawLogic.toLowerCase();

    // Monthly deadlines
    if (logic.includes('20th of next month')) {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 20);
      return next;
    }
    if (logic.includes('15th of next month')) {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      return next;
    }

    // Annual deadlines
    if (logic.includes('31st october')) {
      const year = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
      return new Date(year, 9, 31); // October is month 9
    }
    if (logic.includes('30th september')) {
      const year = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
      return new Date(year, 8, 30); // September is month 8
    }

    // TODO: Implement more date logic parsers
    return null;
  }

  private determineDomainState(requirements: ComplianceRequirementStatus[]): ComplianceState {
    if (requirements.some(r => r.state === 'RED')) return 'RED';
    if (requirements.some(r => r.state === 'AMBER')) return 'AMBER';
    return 'GREEN';
  }

  private calculateDomainRiskScore(requirements: ComplianceRequirementStatus[]): number {
    if (requirements.length === 0) return 0;
    
    // Weighted average based on criticality and state
    const totalScore = requirements.reduce((sum, req) => {
      let score = 0;
      if (req.state === 'RED') score = 100;
      else if (req.state === 'AMBER') score = 50;
      else score = 0;
      return sum + score;
    }, 0);

    return Math.round(totalScore / requirements.length);
  }

  private calculateOverallState(domains: DomainComplianceState[]): { state: ComplianceState; riskScore: number } {
    if (domains.some(d => d.state === 'RED')) {
      return { state: 'RED', riskScore: 75 };
    }
    if (domains.some(d => d.state === 'AMBER')) {
      return { state: 'AMBER', riskScore: 45 };
    }
    return { state: 'GREEN', riskScore: 10 };
  }

  private identifyNextCriticalAction(domains: DomainComplianceState[]): {
    deadline: Date | null;
    daysUntil: number | null;
    action: string | null;
  } {
    // Find the most urgent requirement across all domains
    let mostUrgent: ComplianceRequirementStatus | null = null;
    let minDays = Infinity;

    for (const domain of domains) {
      for (const req of domain.requirements) {
        if (req.state === 'RED' || req.state === 'AMBER') {
          const days = req.daysOverdue ? -req.daysOverdue : (req.daysUntilDue || Infinity);
          if (days < minDays) {
            minDays = days;
            mostUrgent = req;
          }
        }
      }
    }

    if (!mostUrgent) {
      return { deadline: null, daysUntil: null, action: null };
    }

    return {
      deadline: mostUrgent.dueDate,
      daysUntil: mostUrgent.daysUntilDue,
      action: mostUrgent.actionRequired,
    };
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  private determinePriority(
    state: ComplianceState,
    criticalityScore: number,
    daysUntilDue: number | null
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (state === 'RED') return 'critical';
    if (state === 'AMBER' && criticalityScore >= 8) return 'critical';
    if (state === 'AMBER' && daysUntilDue !== null && daysUntilDue <= 3) return 'high';
    if (state === 'AMBER') return 'medium';
    return 'low';
  }

  private identifyBlockers(rule: ComplianceRule, input: StateCalculationInput): string[] {
    const blockers: string[] = [];
    
    // Check for missing documents
    if (rule.requiredDocuments) {
      for (const docType of rule.requiredDocuments) {
        const hasDoc = input.documentStatus.some(d => d.documentType === docType && d.uploaded);
        if (!hasDoc) {
          blockers.push(`Missing document: ${docType}`);
        }
      }
    }

    return blockers;
  }

  private generateActionText(
    state: ComplianceState,
    rule: ComplianceRule,
    daysUntilDue: number | null,
    daysOverdue: number | null
  ): string {
    if (state === 'RED' && daysOverdue) {
      return `File ${rule.ruleName} immediately (${daysOverdue} days overdue)`;
    }
    if (state === 'AMBER' && daysUntilDue !== null) {
      return `Prepare ${rule.ruleName} (due in ${daysUntilDue} days)`;
    }
    return `${rule.ruleName} is up to date`;
  }

  private sumPenaltyExposure(domains: DomainComplianceState[]): number {
    return domains.reduce((sum, d) => sum + d.totalPenaltyExposure, 0);
  }

  private countOverdueItems(domains: DomainComplianceState[]): number {
    return domains.reduce((sum, d) => sum + d.overdueRequirements, 0);
  }

  private countUpcomingItems(domains: DomainComplianceState[]): number {
    return domains.reduce((sum, d) => sum + d.upcomingDeadlines, 0);
  }

  private calculateDataCompleteness(input: StateCalculationInput): number {
    let score = 0;
    let total = 0;

    // Check key data points
    const checks = [
      input.incorporationDate !== null,
      input.turnover !== null && input.turnover > 0,
      input.employeeCount !== null,
      input.state !== null,
      input.activeServices.length > 0,
      input.documentStatus.length > 0,
    ];

    checks.forEach(check => {
      total++;
      if (check) score++;
    });

    return Math.round((score / total) * 100);
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  private async saveState(entityState: EntityComplianceState): Promise<void> {
    // Upsert current state
    await db.insert(complianceStates).values({
      entityId: entityState.entityId,
      overallState: entityState.overallState,
      overallRiskScore: entityState.overallRiskScore.toString(),
      totalPenaltyExposure: entityState.totalPenaltyExposure.toString(),
      totalOverdueItems: entityState.totalOverdueItems,
      totalUpcomingItems: entityState.totalUpcomingItems,
      nextCriticalDeadline: entityState.nextCriticalDeadline,
      nextCriticalAction: entityState.nextCriticalAction,
      daysUntilNextDeadline: entityState.daysUntilNextDeadline,
      domainStates: entityState.domains,
      requirementStates: entityState.domains.flatMap(d => d.requirements),
      calculatedAt: entityState.calculatedAt,
      calculationVersion: entityState.calculationVersion,
      dataCompletenessScore: entityState.dataCompletenessScore.toString(),
    }).onConflictDoUpdate({
      target: [complianceStates.entityId],
      set: {
        overallState: entityState.overallState,
        overallRiskScore: entityState.overallRiskScore.toString(),
        totalPenaltyExposure: entityState.totalPenaltyExposure.toString(),
        totalOverdueItems: entityState.totalOverdueItems,
        totalUpcomingItems: entityState.totalUpcomingItems,
        nextCriticalDeadline: entityState.nextCriticalDeadline,
        nextCriticalAction: entityState.nextCriticalAction,
        daysUntilNextDeadline: entityState.daysUntilNextDeadline,
        domainStates: entityState.domains,
        requirementStates: entityState.domains.flatMap(d => d.requirements),
        calculatedAt: entityState.calculatedAt,
        updatedAt: new Date(),
      },
    });

    // Save to history
    await db.insert(complianceStateHistory).values({
      entityId: entityState.entityId,
      state: entityState.overallState,
      riskScore: entityState.overallRiskScore.toString(),
      penaltyExposure: entityState.totalPenaltyExposure.toString(),
      overdueItems: entityState.totalOverdueItems,
      snapshotData: entityState,
      recordedAt: new Date(),
    });
  }

  private async logCalculation(
    entityId: number,
    previousState: ComplianceState | null,
    newState: ComplianceState,
    rulesApplied: number,
    errors: string[],
    warnings: string[],
    calculationTimeMs: number
  ): Promise<void> {
    await db.insert(stateCalculationLog).values({
      entityId,
      calculationVersion: CALCULATION_VERSION,
      calculationTimeMs,
      rulesApplied,
      previousState,
      newState,
      stateChanged: previousState !== newState,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      errors,
      warnings,
      triggeredBy: 'MANUAL',
      calculatedAt: new Date(),
    });
  }

  private async generateAlerts(entityState: EntityComplianceState): Promise<void> {
    // Generate alerts for critical items
    for (const domain of entityState.domains) {
      for (const req of domain.requirements) {
        if (req.state === 'RED' || (req.state === 'AMBER' && req.priority === 'critical')) {
          // Check if alert already exists
          const existingAlert = await db.select().from(complianceAlerts)
            .where(
              and(
                eq(complianceAlerts.entityId, entityState.entityId),
                eq(complianceAlerts.ruleId, req.requirementId),
                eq(complianceAlerts.isActive, true)
              )
            ).limit(1);

          if (existingAlert.length === 0) {
            // Create new alert
            await db.insert(complianceAlerts).values({
              entityId: entityState.entityId,
              ruleId: req.requirementId,
              alertType: req.state === 'RED' ? 'OVERDUE' : 'UPCOMING',
              severity: req.priority === 'critical' ? 'CRITICAL' : 'WARNING',
              title: `${req.name} ${req.state === 'RED' ? 'Overdue' : 'Due Soon'}`,
              message: req.actionRequired,
              actionRequired: req.actionRequired,
              triggeredAt: new Date(),
              expiresAt: req.dueDate || undefined,
            });
          }
        }
      }
    }
  }

  private errorResult(message: string, startTime: number): StateCalculationResult {
    return {
      success: false,
      entityState: {} as EntityComplianceState,
      errors: [message],
      warnings: [],
      calculationTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const stateEngine = new ComplianceStateEngine();
