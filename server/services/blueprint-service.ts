/**
 * BLUEPRINT SERVICE
 *
 * Comprehensive service for managing Service Blueprints - the unified
 * definition for any compliance service including workflow, pricing,
 * documents, SLA, and compliance rules.
 *
 * Features:
 * - Full CRUD for blueprints and related entities
 * - Workflow step management with transitions
 * - Pricing tier configuration
 * - Document requirement management
 * - Compliance rule configuration
 * - Version management
 * - Cloning and templating
 */

import { db } from '../db';
import {
  serviceBlueprints,
  blueprintPricingTiers,
  blueprintWorkflowSteps,
  blueprintDocumentTypes,
  blueprintComplianceRules,
  blueprintChecklists,
  clientServiceSubscriptions,
} from '../../shared/blueprints-schema';
import { eq, and, desc, asc, like, or, sql, inArray, isNull, count } from 'drizzle-orm';
import { logger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateBlueprintInput {
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  category: string;
  subcategory?: string;
  serviceType?: 'RECURRING' | 'ONE_TIME' | 'ON_DEMAND';
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL' | 'AS_NEEDED' | 'ONE_TIME' | 'ON_OCCURRENCE' | 'EVENT_BASED';
  governingAct?: string;
  sectionReference?: string;
  ruleReference?: string;
  formNumber?: string;
  filingPortal?: string;
  applicableEntityTypes?: string[];
  deadlineFormula?: string;
  defaultSlaHours?: number;
  basePricing?: Record<string, unknown>;
  pricingModel?: 'FIXED' | 'TIERED' | 'USAGE' | 'CUSTOM';
  aiExtractionEnabled?: boolean;
  aiRiskScoringEnabled?: boolean;
  tags?: string[];
  tenantId?: string;
  createdBy?: number;
}

export interface UpdateBlueprintInput extends Partial<CreateBlueprintInput> {
  id: string;
  updatedBy?: number;
}

export interface WorkflowStepInput {
  stepCode: string;
  stepName: string;
  description?: string;
  stepType: 'TASK' | 'APPROVAL' | 'REVIEW' | 'DOCUMENT_COLLECTION' | 'GOVERNMENT_FILING' | 'CLIENT_ACTION' | 'AUTO' | 'WAIT' | 'DECISION' | 'DATA_COLLECTION' | 'DOCUMENT_UPLOAD' | 'VERIFICATION' | 'CALCULATION' | 'PAYMENT' | 'ACKNOWLEDGMENT' | 'QC_REVIEW' | 'CLIENT_APPROVAL' | 'DELIVERY';
  defaultAssigneeRole?: string;
  assignmentStrategy?: 'ROUND_ROBIN' | 'LEAST_LOADED' | 'SKILL_BASED' | 'MANUAL';
  requiredSkills?: string[];
  slaHours?: number;
  slaBusinessHoursOnly?: boolean;
  warningThresholdPct?: number;
  escalationAfterHours?: number;
  escalationChain?: Array<{ role: string; afterHours: number }>;
  requiredDocuments?: string[];
  requiredFields?: string[];
  autoActions?: Array<{ trigger: string; action: string; config: Record<string, unknown> }>;
  allowedNextSteps?: string[];
  defaultNextStep?: string;
  completionCriteria?: Record<string, unknown>;
  entryConditions?: Array<{ field: string; operator: string; value: unknown }>;
  exitConditions?: Array<{ field: string; operator: string; value: unknown }>;
  skipConditions?: Array<{ field: string; operator: string; value: unknown }>;
  instructions?: string;
  checklistItems?: Array<{ code: string; label: string; required: boolean }>;
  isMilestone?: boolean;
  isClientVisible?: boolean;
  requiresClientApproval?: boolean;
  canBeSkipped?: boolean;
  sortOrder?: number;
}

export interface PricingTierInput {
  tierCode: string;
  tierName: string;
  description?: string;
  basePrice: string;
  currency?: string;
  criteria?: Record<string, unknown>;
  includedFeatures?: string[];
  excludedFeatures?: string[];
  documentLimit?: number;
  revisionLimit?: number;
  urgentMultiplier?: string;
  superUrgentMultiplier?: string;
  bulkDiscountRules?: Array<{ minQty: number; discountPct: number }>;
  loyaltyDiscountPct?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  sortOrder?: number;
}

export interface DocumentTypeInput {
  documentCode: string;
  documentName: string;
  description?: string;
  category?: 'IDENTITY' | 'FINANCIAL' | 'LEGAL' | 'TAX' | 'SUPPORTING';
  isMandatory?: boolean;
  mandatoryConditions?: Record<string, unknown>;
  acceptedFormats?: string[];
  maxSizeMb?: number;
  minResolutionDpi?: number;
  validationRules?: Array<{ type: string; field?: string; pattern?: string; message?: string }> | Record<string, unknown>;
  requiredFields?: string[];
  aiExtractionEnabled?: boolean;
  extractionFields?: Array<{ name: string; type: string; pattern?: string; confidenceThreshold?: number }>;
  verificationRequired?: boolean;
  verificationMethod?: 'MANUAL' | 'API' | 'AI' | 'BLOCKCHAIN';
  verificationApiEndpoint?: string;
  requiredAtStep?: string;
  dueBeforeDays?: number;
  sampleDocumentUrl?: string;
  templateDocumentUrl?: string;
  instructionsUrl?: string;
  retentionDays?: number;
  isConfidential?: boolean;
  sortOrder?: number;
}

export interface ComplianceRuleInput {
  ruleCode: string;
  ruleName: string;
  description?: string;
  ruleType: 'DEADLINE' | 'PENALTY' | 'NOTIFICATION' | 'EXEMPTION' | 'EXTENSION' | 'THRESHOLD' | 'RATE' | 'VALIDATION';
  deadlineFormula?: string;
  baseDateType?: string;
  offsetDays?: number;
  offsetMonths?: number;
  adjustmentRule?: 'NEXT_WORKING_DAY' | 'PREVIOUS_WORKING_DAY' | 'NONE';
  penaltyType?: 'FLAT' | 'DAILY' | 'INTEREST' | 'SLAB' | 'COMPOUND' | 'MIXED';
  penaltyFormula?: string;
  flatAmount?: string;
  dailyAmount?: string;
  interestRateAnnual?: string;
  penaltySlabs?: Array<{ fromDays: number; toDays: number; amountPerDay: number }>;
  maxPenalty?: string;
  maxPenaltyDays?: number;
  appliesWhen?: Record<string, unknown>;
  exemptWhen?: Record<string, unknown>;
  notificationDaysBefore?: number[];
  legalReference?: string;
  circularReference?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  priority?: number;
}

export interface BlueprintSearchParams {
  tenantId?: string;
  category?: string;
  subcategory?: string;
  serviceType?: string;
  status?: string;
  isActive?: boolean;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Extended blueprint type that includes related entities
export interface BlueprintWithRelations {
  id: string;
  code: string;
  name: string;
  workflowSteps?: Array<Record<string, unknown>>;
  pricingTiers?: Array<Record<string, unknown>>;
  documentTypes?: Array<Record<string, unknown>>;
  complianceRules?: Array<Record<string, unknown>>;
  checklists?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class BlueprintService {
  // ==========================================================================
  // BLUEPRINT CRUD
  // ==========================================================================

  /**
   * Create a new service blueprint
   */
  async createBlueprint(input: CreateBlueprintInput) {
    try {
      const [blueprint] = await db
        .insert(serviceBlueprints)
        .values({
          code: input.code.toUpperCase(),
          name: input.name,
          shortName: input.shortName,
          description: input.description,
          category: input.category,
          subcategory: input.subcategory,
          serviceType: input.serviceType || 'RECURRING',
          frequency: input.frequency,
          governingAct: input.governingAct,
          sectionReference: input.sectionReference,
          ruleReference: input.ruleReference,
          formNumber: input.formNumber,
          filingPortal: input.filingPortal,
          applicableEntityTypes: input.applicableEntityTypes,
          deadlineFormula: input.deadlineFormula,
          defaultSlaHours: input.defaultSlaHours,
          basePricing: input.basePricing,
          pricingModel: input.pricingModel,
          aiExtractionEnabled: input.aiExtractionEnabled,
          aiRiskScoringEnabled: input.aiRiskScoringEnabled,
          tags: input.tags,
          tenantId: input.tenantId,
          createdBy: input.createdBy,
          status: 'DRAFT',
          workflowDefinition: { steps: [], transitions: [] },
        })
        .returning();

      logger.info(`Blueprint created: ${blueprint.code}`, { blueprintId: blueprint.id });
      return blueprint;
    } catch (error) {
      logger.error('Failed to create blueprint', { error, input });
      throw error;
    }
  }

  /**
   * Get blueprint by ID with all related data
   */
  async getBlueprintById(id: string, includeRelated = true) {
    const [blueprint] = await db
      .select()
      .from(serviceBlueprints)
      .where(eq(serviceBlueprints.id, id))
      .limit(1);

    if (!blueprint) return null;

    if (!includeRelated) return blueprint;

    const [workflowSteps, pricingTiers, documentTypes, complianceRules, checklists] = await Promise.all([
      db.select().from(blueprintWorkflowSteps)
        .where(eq(blueprintWorkflowSteps.blueprintId, id))
        .orderBy(asc(blueprintWorkflowSteps.sortOrder)),
      db.select().from(blueprintPricingTiers)
        .where(eq(blueprintPricingTiers.blueprintId, id))
        .orderBy(asc(blueprintPricingTiers.sortOrder)),
      db.select().from(blueprintDocumentTypes)
        .where(eq(blueprintDocumentTypes.blueprintId, id))
        .orderBy(asc(blueprintDocumentTypes.sortOrder)),
      db.select().from(blueprintComplianceRules)
        .where(eq(blueprintComplianceRules.blueprintId, id))
        .orderBy(desc(blueprintComplianceRules.priority)),
      db.select().from(blueprintChecklists)
        .where(eq(blueprintChecklists.blueprintId, id))
        .orderBy(asc(blueprintChecklists.sortOrder)),
    ]);

    return {
      ...blueprint,
      workflowSteps,
      pricingTiers,
      documentTypes,
      complianceRules,
      checklists,
    };
  }

  /**
   * Get blueprint by code
   */
  async getBlueprintByCode(code: string, tenantId?: string) {
    const conditions = [eq(serviceBlueprints.code, code.toUpperCase())];

    if (tenantId) {
      conditions.push(
        or(
          eq(serviceBlueprints.tenantId, tenantId),
          isNull(serviceBlueprints.tenantId)
        )!
      );
    }

    const [blueprint] = await db
      .select()
      .from(serviceBlueprints)
      .where(and(...conditions))
      .limit(1);

    return blueprint || null;
  }

  /**
   * Search and list blueprints with filters
   */
  async searchBlueprints(params: BlueprintSearchParams) {
    const {
      tenantId,
      category,
      subcategory,
      serviceType,
      status,
      isActive = true,
      search,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const offset = (page - 1) * limit;
    const conditions: ReturnType<typeof eq>[] = [];

    if (tenantId) {
      conditions.push(
        or(
          eq(serviceBlueprints.tenantId, tenantId),
          isNull(serviceBlueprints.tenantId)
        )!
      );
    }
    if (category) conditions.push(eq(serviceBlueprints.category, category));
    if (subcategory) conditions.push(eq(serviceBlueprints.subcategory, subcategory));
    if (serviceType) conditions.push(eq(serviceBlueprints.serviceType, serviceType));
    if (status) conditions.push(eq(serviceBlueprints.status, status));
    if (isActive !== undefined) conditions.push(eq(serviceBlueprints.isActive, isActive));

    if (search) {
      conditions.push(
        or(
          like(serviceBlueprints.name, `%${search}%`),
          like(serviceBlueprints.code, `%${search.toUpperCase()}%`),
          like(serviceBlueprints.description, `%${search}%`)
        )!
      );
    }

    const baseQuery = db
      .select()
      .from(serviceBlueprints)
      .where(and(...conditions));

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(serviceBlueprints)
      .where(and(...conditions));

    // Get paginated results
    const sortColumn = serviceBlueprints[sortBy as keyof typeof serviceBlueprints] || serviceBlueprints.createdAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const results = await db
      .select()
      .from(serviceBlueprints)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn as any))
      .limit(limit)
      .offset(offset);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a blueprint
   */
  async updateBlueprint(input: UpdateBlueprintInput) {
    const { id, updatedBy, ...updateData } = input;

    const [updated] = await db
      .update(serviceBlueprints)
      .set({
        ...updateData,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(serviceBlueprints.id, id))
      .returning();

    logger.info(`Blueprint updated: ${updated.code}`, { blueprintId: id });
    return updated;
  }

  /**
   * Activate a blueprint (move from DRAFT to ACTIVE)
   */
  async activateBlueprint(id: string, updatedBy?: number) {
    const blueprint = await this.getBlueprintById(id) as BlueprintWithRelations | null;
    if (!blueprint) throw new Error('Blueprint not found');

    // Validation checks
    if (!blueprint.workflowSteps?.length) {
      throw new Error('Blueprint must have at least one workflow step');
    }

    const [updated] = await db
      .update(serviceBlueprints)
      .set({
        status: 'ACTIVE',
        isActive: true,
        effectiveFrom: new Date().toISOString().split('T')[0],
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(serviceBlueprints.id, id))
      .returning();

    logger.info(`Blueprint activated: ${updated.code}`, { blueprintId: id });
    return updated;
  }

  /**
   * Deactivate a blueprint (set to inactive but keep in system)
   */
  async deactivateBlueprint(id: string, updatedBy?: number) {
    const [updated] = await db
      .update(serviceBlueprints)
      .set({
        status: 'INACTIVE',
        isActive: false,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(serviceBlueprints.id, id))
      .returning();

    logger.info(`Blueprint deactivated: ${updated?.code}`, { blueprintId: id });
    return updated;
  }

  /**
   * Soft delete a blueprint
   */
  async deleteBlueprint(id: string, updatedBy?: number) {
    const [updated] = await db
      .update(serviceBlueprints)
      .set({
        status: 'ARCHIVED',
        isActive: false,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(serviceBlueprints.id, id))
      .returning();

    logger.info(`Blueprint deleted (archived): ${updated?.code}`, { blueprintId: id });
    return updated ? true : false;
  }

  /**
   * Deprecate a blueprint
   */
  async deprecateBlueprint(id: string, replacementId?: string, updatedBy?: number) {
    const [updated] = await db
      .update(serviceBlueprints)
      .set({
        status: 'DEPRECATED',
        effectiveUntil: new Date().toISOString().split('T')[0],
        updatedBy,
        updatedAt: new Date(),
        changeLog: sql`${serviceBlueprints.changeLog} || ${JSON.stringify([{
          action: 'DEPRECATED',
          timestamp: new Date().toISOString(),
          replacementId,
          by: updatedBy,
        }])}::jsonb`,
      })
      .where(eq(serviceBlueprints.id, id))
      .returning();

    return updated;
  }

  /**
   * Clone a blueprint (for creating new version or tenant-specific copy)
   */
  async cloneBlueprint(sourceId: string, newCode: string, targetTenantId?: string, createdBy?: number) {
    const sourceData = await this.getBlueprintById(sourceId);
    if (!sourceData) throw new Error('Source blueprint not found');

    // Use any to avoid type complexity with the extended blueprint type
    const source = sourceData as any;

    // Create new blueprint
    const [newBlueprint] = await db
      .insert(serviceBlueprints)
      .values({
        code: newCode.toUpperCase(),
        name: `${source.name} (Copy)`,
        shortName: source.shortName,
        description: source.description,
        category: source.category,
        subcategory: source.subcategory,
        serviceType: source.serviceType,
        frequency: source.frequency,
        governingAct: source.governingAct,
        sectionReference: source.sectionReference,
        ruleReference: source.ruleReference,
        formNumber: source.formNumber,
        filingPortal: source.filingPortal,
        applicableEntityTypes: source.applicableEntityTypes as string[],
        workflowDefinition: source.workflowDefinition,
        defaultSlaHours: source.defaultSlaHours,
        escalationRules: source.escalationRules,
        documentRequirements: source.documentRequirements,
        basePricing: source.basePricing,
        pricingModel: source.pricingModel,
        deadlineFormula: source.deadlineFormula,
        penaltyRules: source.penaltyRules,
        aiExtractionEnabled: source.aiExtractionEnabled,
        aiRiskScoringEnabled: source.aiRiskScoringEnabled,
        tags: source.tags as string[],
        tenantId: targetTenantId,
        previousVersionId: sourceId,
        status: 'DRAFT',
        createdBy,
      })
      .returning();

    // Clone workflow steps
    if (source.workflowSteps?.length) {
      await db.insert(blueprintWorkflowSteps).values(
        source.workflowSteps.map((step: any) => ({
          ...step,
          id: undefined,
          blueprintId: newBlueprint.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }

    // Clone pricing tiers
    if (source.pricingTiers?.length) {
      await db.insert(blueprintPricingTiers).values(
        source.pricingTiers.map((tier: any) => ({
          ...tier,
          id: undefined,
          blueprintId: newBlueprint.id,
          createdAt: new Date(),
        }))
      );
    }

    // Clone document types
    if (source.documentTypes?.length) {
      await db.insert(blueprintDocumentTypes).values(
        source.documentTypes.map((doc: any) => ({
          ...doc,
          id: undefined,
          blueprintId: newBlueprint.id,
          createdAt: new Date(),
        }))
      );
    }

    // Clone compliance rules
    if (source.complianceRules?.length) {
      await db.insert(blueprintComplianceRules).values(
        source.complianceRules.map((rule: any) => ({
          ...rule,
          id: undefined,
          blueprintId: newBlueprint.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }

    logger.info(`Blueprint cloned: ${source.code} -> ${newBlueprint.code}`, {
      sourceId,
      newId: newBlueprint.id,
    });

    return this.getBlueprintById(newBlueprint.id);
  }

  // ==========================================================================
  // WORKFLOW STEPS
  // ==========================================================================

  /**
   * Get all workflow steps for a blueprint
   */
  async getWorkflowSteps(blueprintId: string) {
    return db
      .select()
      .from(blueprintWorkflowSteps)
      .where(eq(blueprintWorkflowSteps.blueprintId, blueprintId))
      .orderBy(asc(blueprintWorkflowSteps.sortOrder));
  }

  /**
   * Add a workflow step to blueprint
   */
  async addWorkflowStep(blueprintId: string, input: WorkflowStepInput) {
    // Get current max sort order
    const [maxOrder] = await db
      .select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
      .from(blueprintWorkflowSteps)
      .where(eq(blueprintWorkflowSteps.blueprintId, blueprintId));

    const [step] = await db
      .insert(blueprintWorkflowSteps)
      .values({
        blueprintId,
        stepCode: input.stepCode.toUpperCase(),
        stepName: input.stepName,
        description: input.description,
        stepType: input.stepType,
        defaultAssigneeRole: input.defaultAssigneeRole,
        assignmentStrategy: input.assignmentStrategy,
        requiredSkills: input.requiredSkills,
        slaHours: input.slaHours,
        slaBusinessHoursOnly: input.slaBusinessHoursOnly,
        warningThresholdPct: input.warningThresholdPct,
        escalationAfterHours: input.escalationAfterHours,
        escalationChain: input.escalationChain,
        requiredDocuments: input.requiredDocuments,
        requiredFields: input.requiredFields,
        autoActions: input.autoActions,
        allowedNextSteps: input.allowedNextSteps,
        defaultNextStep: input.defaultNextStep,
        completionCriteria: input.completionCriteria,
        entryConditions: input.entryConditions,
        exitConditions: input.exitConditions,
        skipConditions: input.skipConditions,
        instructions: input.instructions,
        checklistItems: input.checklistItems,
        isMilestone: input.isMilestone,
        isClientVisible: input.isClientVisible,
        requiresClientApproval: input.requiresClientApproval,
        canBeSkipped: input.canBeSkipped,
        sortOrder: input.sortOrder ?? (maxOrder.max + 1),
      })
      .returning();

    // Update blueprint's workflow definition
    await this.rebuildWorkflowDefinition(blueprintId);

    return step;
  }

  /**
   * Update a workflow step
   */
  async updateWorkflowStep(stepId: string, input: Partial<WorkflowStepInput>) {
    const [updated] = await db
      .update(blueprintWorkflowSteps)
      .set({
        ...input,
        stepCode: input.stepCode?.toUpperCase(),
        updatedAt: new Date(),
      })
      .where(eq(blueprintWorkflowSteps.id, stepId))
      .returning();

    if (updated) {
      await this.rebuildWorkflowDefinition(updated.blueprintId);
    }

    return updated;
  }

  /**
   * Delete a workflow step
   */
  async deleteWorkflowStep(stepId: string) {
    const [step] = await db
      .select()
      .from(blueprintWorkflowSteps)
      .where(eq(blueprintWorkflowSteps.id, stepId));

    if (!step) return null;

    await db.delete(blueprintWorkflowSteps).where(eq(blueprintWorkflowSteps.id, stepId));
    await this.rebuildWorkflowDefinition(step.blueprintId);

    return step;
  }

  /**
   * Reorder workflow steps
   */
  async reorderWorkflowSteps(blueprintId: string, stepIds: string[]) {
    for (let i = 0; i < stepIds.length; i++) {
      await db
        .update(blueprintWorkflowSteps)
        .set({ sortOrder: i + 1 })
        .where(eq(blueprintWorkflowSteps.id, stepIds[i]));
    }

    await this.rebuildWorkflowDefinition(blueprintId);
  }

  /**
   * Rebuild the workflow definition JSON from steps
   */
  private async rebuildWorkflowDefinition(blueprintId: string) {
    const steps = await db
      .select()
      .from(blueprintWorkflowSteps)
      .where(eq(blueprintWorkflowSteps.blueprintId, blueprintId))
      .orderBy(asc(blueprintWorkflowSteps.sortOrder));

    const workflowDefinition = {
      steps: steps.map(s => ({
        code: s.stepCode,
        name: s.stepName,
        type: s.stepType,
        assigneeRole: s.defaultAssigneeRole,
        slaHours: s.slaHours,
        requiredDocuments: s.requiredDocuments,
      })),
      transitions: steps.flatMap(s => {
        const nextSteps = (s.allowedNextSteps as string[]) || [];
        return nextSteps.map(next => ({
          from: s.stepCode,
          to: next,
          isDefault: next === s.defaultNextStep,
        }));
      }),
    };

    await db
      .update(serviceBlueprints)
      .set({ workflowDefinition, updatedAt: new Date() })
      .where(eq(serviceBlueprints.id, blueprintId));
  }

  // ==========================================================================
  // PRICING TIERS
  // ==========================================================================

  /**
   * Get all pricing tiers for a blueprint
   */
  async getPricingTiers(blueprintId: string) {
    return db
      .select()
      .from(blueprintPricingTiers)
      .where(eq(blueprintPricingTiers.blueprintId, blueprintId))
      .orderBy(asc(blueprintPricingTiers.sortOrder));
  }

  /**
   * Add pricing tier to blueprint
   */
  async addPricingTier(blueprintId: string, input: PricingTierInput) {
    const [tier] = await db
      .insert(blueprintPricingTiers)
      .values({
        blueprintId,
        tierCode: input.tierCode.toUpperCase(),
        tierName: input.tierName,
        description: input.description,
        basePrice: input.basePrice,
        currency: input.currency || 'INR',
        criteria: input.criteria,
        includedFeatures: input.includedFeatures,
        excludedFeatures: input.excludedFeatures,
        documentLimit: input.documentLimit,
        revisionLimit: input.revisionLimit,
        urgentMultiplier: input.urgentMultiplier,
        superUrgentMultiplier: input.superUrgentMultiplier,
        bulkDiscountRules: input.bulkDiscountRules,
        loyaltyDiscountPct: input.loyaltyDiscountPct,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        sortOrder: input.sortOrder,
      })
      .returning();

    return tier;
  }

  /**
   * Get pricing for a client based on criteria
   */
  async calculatePrice(blueprintId: string, criteria: {
    tierId?: string;
    turnover?: number;
    entityType?: string;
    state?: string;
    quantity?: number;
    isUrgent?: boolean;
    isSuperUrgent?: boolean;
    isLoyaltyMember?: boolean;
  }) {
    const tiers = await db
      .select()
      .from(blueprintPricingTiers)
      .where(
        and(
          eq(blueprintPricingTiers.blueprintId, blueprintId),
          eq(blueprintPricingTiers.isActive, true)
        )
      )
      .orderBy(asc(blueprintPricingTiers.sortOrder));

    if (!tiers.length) {
      // Fall back to base pricing
      const [blueprint] = await db
        .select({ basePricing: serviceBlueprints.basePricing })
        .from(serviceBlueprints)
        .where(eq(serviceBlueprints.id, blueprintId));

      return {
        basePrice: (blueprint?.basePricing as any)?.standard || 0,
        finalPrice: (blueprint?.basePricing as any)?.standard || 0,
        currency: 'INR',
        discounts: [],
      };
    }

    // Find matching tier
    let matchingTier = criteria.tierId
      ? tiers.find(t => t.id === criteria.tierId)
      : tiers.find(t => {
          const tierCriteria = t.criteria as any || {};
          if (criteria.turnover !== undefined) {
            if (tierCriteria.turnover_min && criteria.turnover < tierCriteria.turnover_min) return false;
            if (tierCriteria.turnover_max && criteria.turnover > tierCriteria.turnover_max) return false;
          }
          if (criteria.entityType && tierCriteria.entity_types?.length) {
            if (!tierCriteria.entity_types.includes(criteria.entityType)) return false;
          }
          if (criteria.state && tierCriteria.states?.length) {
            if (!tierCriteria.states.includes(criteria.state)) return false;
          }
          return true;
        });

    if (!matchingTier) matchingTier = tiers[0];

    let price = parseFloat(matchingTier.basePrice);
    const discounts: Array<{ type: string; amount: number; description: string }> = [];

    // Apply urgency multiplier
    if (criteria.isSuperUrgent && matchingTier.superUrgentMultiplier) {
      price *= parseFloat(matchingTier.superUrgentMultiplier);
    } else if (criteria.isUrgent && matchingTier.urgentMultiplier) {
      price *= parseFloat(matchingTier.urgentMultiplier);
    }

    // Apply bulk discount
    if (criteria.quantity && matchingTier.bulkDiscountRules) {
      const rules = matchingTier.bulkDiscountRules as Array<{ minQty: number; discountPct: number }>;
      const applicableRule = rules
        .filter(r => criteria.quantity! >= r.minQty)
        .sort((a, b) => b.minQty - a.minQty)[0];

      if (applicableRule) {
        const discount = price * (applicableRule.discountPct / 100);
        discounts.push({
          type: 'BULK',
          amount: discount,
          description: `${applicableRule.discountPct}% bulk discount for ${criteria.quantity} items`,
        });
        price -= discount;
      }
    }

    // Apply loyalty discount
    if (criteria.isLoyaltyMember && matchingTier.loyaltyDiscountPct) {
      const discountPct = parseFloat(matchingTier.loyaltyDiscountPct);
      const discount = price * (discountPct / 100);
      discounts.push({
        type: 'LOYALTY',
        amount: discount,
        description: `${discountPct}% loyalty discount`,
      });
      price -= discount;
    }

    return {
      tierId: matchingTier.id,
      tierName: matchingTier.tierName,
      basePrice: parseFloat(matchingTier.basePrice),
      finalPrice: Math.round(price * 100) / 100,
      currency: matchingTier.currency,
      discounts,
      features: matchingTier.includedFeatures,
    };
  }

  /**
   * Update a pricing tier
   */
  async updatePricingTier(tierId: string, input: Partial<PricingTierInput>) {
    const [updated] = await db
      .update(blueprintPricingTiers)
      .set({
        ...input,
        tierCode: input.tierCode?.toUpperCase(),
        updatedAt: new Date(),
      })
      .where(eq(blueprintPricingTiers.id, tierId))
      .returning();

    return updated;
  }

  /**
   * Delete a pricing tier
   */
  async deletePricingTier(tierId: string) {
    const [tier] = await db
      .select()
      .from(blueprintPricingTiers)
      .where(eq(blueprintPricingTiers.id, tierId));

    if (!tier) return null;

    await db.delete(blueprintPricingTiers).where(eq(blueprintPricingTiers.id, tierId));
    return tier;
  }

  // ==========================================================================
  // DOCUMENT TYPES
  // ==========================================================================

  /**
   * Get all document types for a blueprint
   */
  async getDocumentTypes(blueprintId: string) {
    return db
      .select()
      .from(blueprintDocumentTypes)
      .where(eq(blueprintDocumentTypes.blueprintId, blueprintId))
      .orderBy(asc(blueprintDocumentTypes.sortOrder));
  }

  /**
   * Add document type to blueprint
   */
  async addDocumentType(blueprintId: string, input: DocumentTypeInput) {
    const [docType] = await db
      .insert(blueprintDocumentTypes)
      .values({
        blueprintId,
        documentCode: input.documentCode.toUpperCase(),
        documentName: input.documentName,
        description: input.description,
        category: input.category,
        isMandatory: input.isMandatory,
        mandatoryConditions: input.mandatoryConditions,
        acceptedFormats: input.acceptedFormats,
        maxSizeMb: input.maxSizeMb,
        minResolutionDpi: input.minResolutionDpi,
        validationRules: input.validationRules,
        requiredFields: input.requiredFields,
        aiExtractionEnabled: input.aiExtractionEnabled,
        extractionFields: input.extractionFields,
        verificationRequired: input.verificationRequired,
        verificationMethod: input.verificationMethod,
        verificationApiEndpoint: input.verificationApiEndpoint,
        requiredAtStep: input.requiredAtStep,
        dueBeforeDays: input.dueBeforeDays,
        sampleDocumentUrl: input.sampleDocumentUrl,
        templateDocumentUrl: input.templateDocumentUrl,
        instructionsUrl: input.instructionsUrl,
        retentionDays: input.retentionDays,
        isConfidential: input.isConfidential,
        sortOrder: input.sortOrder,
      })
      .returning();

    return docType;
  }

  /**
   * Get required documents for a step
   */
  async getDocumentsForStep(blueprintId: string, stepCode: string) {
    return db
      .select()
      .from(blueprintDocumentTypes)
      .where(
        and(
          eq(blueprintDocumentTypes.blueprintId, blueprintId),
          eq(blueprintDocumentTypes.requiredAtStep, stepCode),
          eq(blueprintDocumentTypes.isActive, true)
        )
      )
      .orderBy(desc(blueprintDocumentTypes.isMandatory), asc(blueprintDocumentTypes.sortOrder));
  }

  /**
   * Update a document type
   */
  async updateDocumentType(docTypeId: string, input: Partial<DocumentTypeInput>) {
    const [updated] = await db
      .update(blueprintDocumentTypes)
      .set({
        ...input,
        documentCode: input.documentCode?.toUpperCase(),
        updatedAt: new Date(),
      })
      .where(eq(blueprintDocumentTypes.id, docTypeId))
      .returning();

    return updated;
  }

  /**
   * Delete a document type
   */
  async deleteDocumentType(docTypeId: string) {
    const [docType] = await db
      .select()
      .from(blueprintDocumentTypes)
      .where(eq(blueprintDocumentTypes.id, docTypeId));

    if (!docType) return null;

    await db.delete(blueprintDocumentTypes).where(eq(blueprintDocumentTypes.id, docTypeId));
    return docType;
  }

  // ==========================================================================
  // COMPLIANCE RULES
  // ==========================================================================

  /**
   * Get all compliance rules for a blueprint
   */
  async getComplianceRules(blueprintId: string) {
    return db
      .select()
      .from(blueprintComplianceRules)
      .where(eq(blueprintComplianceRules.blueprintId, blueprintId))
      .orderBy(desc(blueprintComplianceRules.priority));
  }

  /**
   * Add compliance rule to blueprint
   */
  async addComplianceRule(blueprintId: string, input: ComplianceRuleInput) {
    const [rule] = await db
      .insert(blueprintComplianceRules)
      .values({
        blueprintId,
        ruleCode: input.ruleCode.toUpperCase(),
        ruleName: input.ruleName,
        description: input.description,
        ruleType: input.ruleType,
        deadlineFormula: input.deadlineFormula,
        baseDateType: input.baseDateType,
        offsetDays: input.offsetDays,
        offsetMonths: input.offsetMonths,
        adjustmentRule: input.adjustmentRule,
        penaltyType: input.penaltyType,
        penaltyFormula: input.penaltyFormula,
        flatAmount: input.flatAmount,
        dailyAmount: input.dailyAmount,
        interestRateAnnual: input.interestRateAnnual,
        penaltySlabs: input.penaltySlabs,
        maxPenalty: input.maxPenalty,
        maxPenaltyDays: input.maxPenaltyDays,
        appliesWhen: input.appliesWhen,
        exemptWhen: input.exemptWhen,
        notificationDaysBefore: input.notificationDaysBefore,
        legalReference: input.legalReference,
        circularReference: input.circularReference,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        priority: input.priority,
      })
      .returning();

    return rule;
  }

  /**
   * Get deadline rules for a blueprint
   */
  async getDeadlineRules(blueprintId: string) {
    return db
      .select()
      .from(blueprintComplianceRules)
      .where(
        and(
          eq(blueprintComplianceRules.blueprintId, blueprintId),
          eq(blueprintComplianceRules.ruleType, 'DEADLINE'),
          eq(blueprintComplianceRules.isActive, true)
        )
      )
      .orderBy(desc(blueprintComplianceRules.priority));
  }

  /**
   * Get penalty rules for a blueprint
   */
  async getPenaltyRules(blueprintId: string) {
    return db
      .select()
      .from(blueprintComplianceRules)
      .where(
        and(
          eq(blueprintComplianceRules.blueprintId, blueprintId),
          or(
            eq(blueprintComplianceRules.ruleType, 'PENALTY'),
            sql`${blueprintComplianceRules.penaltyType} IS NOT NULL`
          ),
          eq(blueprintComplianceRules.isActive, true)
        )
      )
      .orderBy(desc(blueprintComplianceRules.priority));
  }

  /**
   * Update a compliance rule
   */
  async updateComplianceRule(ruleId: string, input: Partial<ComplianceRuleInput>) {
    const [updated] = await db
      .update(blueprintComplianceRules)
      .set({
        ...input,
        ruleCode: input.ruleCode?.toUpperCase(),
        updatedAt: new Date(),
      })
      .where(eq(blueprintComplianceRules.id, ruleId))
      .returning();

    return updated;
  }

  /**
   * Delete a compliance rule
   */
  async deleteComplianceRule(ruleId: string) {
    const [rule] = await db
      .select()
      .from(blueprintComplianceRules)
      .where(eq(blueprintComplianceRules.id, ruleId));

    if (!rule) return null;

    await db.delete(blueprintComplianceRules).where(eq(blueprintComplianceRules.id, ruleId));
    return rule;
  }

  // ==========================================================================
  // CLIENT SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Subscribe a client to a service blueprint
   */
  async subscribeClient(input: {
    tenantId?: string;
    clientId: number;
    entityId?: number;
    blueprintId: string;
    pricingTierId?: string;
    subscriptionType?: 'RECURRING' | 'ONE_TIME' | 'RETAINER';
    startDate: string;
    endDate?: string;
    agreedPrice?: string;
    discountPct?: string;
    billingFrequency?: string;
    configOverrides?: Record<string, unknown>;
    assignedTeam?: Array<{ userId: number; role: string }>;
    primaryAccountManager?: number;
    notes?: string;
    createdBy?: number;
  }) {
    const [subscription] = await db
      .insert(clientServiceSubscriptions)
      .values({
        tenantId: input.tenantId,
        clientId: input.clientId,
        entityId: input.entityId,
        blueprintId: input.blueprintId,
        pricingTierId: input.pricingTierId,
        subscriptionType: input.subscriptionType || 'RECURRING',
        startDate: input.startDate,
        endDate: input.endDate,
        agreedPrice: input.agreedPrice,
        discountPct: input.discountPct,
        billingFrequency: input.billingFrequency,
        configOverrides: input.configOverrides,
        assignedTeam: input.assignedTeam,
        primaryAccountManager: input.primaryAccountManager,
        notes: input.notes,
        createdBy: input.createdBy,
        status: 'ACTIVE',
      })
      .returning();

    logger.info(`Client subscribed to service`, {
      clientId: input.clientId,
      blueprintId: input.blueprintId,
      subscriptionId: subscription.id,
    });

    return subscription;
  }

  /**
   * Get client's active subscriptions
   */
  async getClientSubscriptions(clientId: number, entityId?: number) {
    let query = db
      .select({
        subscription: clientServiceSubscriptions,
        blueprint: serviceBlueprints,
      })
      .from(clientServiceSubscriptions)
      .leftJoin(serviceBlueprints, eq(clientServiceSubscriptions.blueprintId, serviceBlueprints.id))
      .where(
        and(
          eq(clientServiceSubscriptions.clientId, clientId),
          eq(clientServiceSubscriptions.status, 'ACTIVE')
        )
      );

    if (entityId) {
      query = query.where(eq(clientServiceSubscriptions.entityId, entityId));
    }

    return query;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string) {
    const [updated] = await db
      .update(clientServiceSubscriptions)
      .set({
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(clientServiceSubscriptions.id, subscriptionId))
      .returning();

    return updated;
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get blueprint statistics
   */
  async getBlueprintStats(blueprintId: string) {
    const [subscriptionStats] = await db
      .select({
        activeSubscriptions: count(),
      })
      .from(clientServiceSubscriptions)
      .where(
        and(
          eq(clientServiceSubscriptions.blueprintId, blueprintId),
          eq(clientServiceSubscriptions.status, 'ACTIVE')
        )
      );

    const blueprint = await this.getBlueprintById(blueprintId);

    return {
      activeSubscriptions: subscriptionStats?.activeSubscriptions || 0,
      workflowSteps: blueprint?.workflowSteps?.length || 0,
      pricingTiers: blueprint?.pricingTiers?.length || 0,
      documentTypes: blueprint?.documentTypes?.length || 0,
      complianceRules: blueprint?.complianceRules?.length || 0,
    };
  }

  /**
   * Get category-wise blueprint counts
   */
  async getCategoryStats(tenantId?: string) {
    const conditions = [eq(serviceBlueprints.isActive, true)];
    if (tenantId) {
      conditions.push(
        or(
          eq(serviceBlueprints.tenantId, tenantId),
          isNull(serviceBlueprints.tenantId)
        )!
      );
    }

    return db
      .select({
        category: serviceBlueprints.category,
        count: count(),
      })
      .from(serviceBlueprints)
      .where(and(...conditions))
      .groupBy(serviceBlueprints.category);
  }
}

// Export singleton instance
export const blueprintService = new BlueprintService();
