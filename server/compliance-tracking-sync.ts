import { db } from './db';
import { businessEntities, complianceRules, complianceTracking } from '../shared/schema';
import { eq, inArray } from 'drizzle-orm';
import { computeDueDateCandidates, computeDueDateFromFormula } from './compliance-due-date';
import { ensureRequiredDocumentsForRuleIds } from './compliance-evidence';

type Entity = typeof businessEntities.$inferSelect;
type Rule = typeof complianceRules.$inferSelect;

const normalizeEntityType = (entityType?: string | null): string => {
  if (!entityType) return '';
  const normalized = entityType.toLowerCase().replace(/[^a-z]/g, '');
  switch (normalized) {
    case 'privatelimited':
    case 'privateltd':
    case 'pvtlimited':
    case 'pvtltd':
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
};

const isRuleApplicable = (rule: Rule, entity: Entity): boolean => {
  const normalizedEntityType = normalizeEntityType(entity.entityType);

  if (rule.applicableEntityTypes) {
    const applicableTypes = Array.isArray(rule.applicableEntityTypes)
      ? rule.applicableEntityTypes
      : [rule.applicableEntityTypes];
    const normalizedApplicable = applicableTypes
      .filter(Boolean)
      .map((value: string) => normalizeEntityType(value));
    if (normalizedApplicable.length > 0 && !normalizedApplicable.includes(normalizedEntityType)) {
      return false;
    }
  }

  if (rule.turnoverThresholdMin && entity.annualTurnover) {
    if (parseFloat(entity.annualTurnover) < parseFloat(rule.turnoverThresholdMin)) return false;
  }
  if (rule.turnoverThresholdMax && entity.annualTurnover) {
    if (parseFloat(entity.annualTurnover) > parseFloat(rule.turnoverThresholdMax)) return false;
  }

  if (rule.employeeCountMin && entity.employeeCount !== null && entity.employeeCount !== undefined) {
    if (entity.employeeCount < rule.employeeCountMin) return false;
  }
  if (rule.employeeCountMax && entity.employeeCount !== null && entity.employeeCount !== undefined) {
    if (entity.employeeCount > rule.employeeCountMax) return false;
  }

  const category = String(rule.regulationCategory || '').toLowerCase();
  if (category === 'gst' && !entity.gstin) return false;

  if (rule.stateSpecific && Array.isArray(rule.applicableStates) && rule.applicableStates.length > 0) {
    if (!entity.state || !rule.applicableStates.includes(entity.state)) {
      return false;
    }
  }

  const now = new Date();
  if (rule.effectiveFrom) {
    const effectiveFrom = new Date(rule.effectiveFrom);
    const effectiveStart = new Date(effectiveFrom.getFullYear(), effectiveFrom.getMonth(), effectiveFrom.getDate());
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

  return true;
};

const shouldSkipEventRule = (rule: Rule, entity: Entity) => {
  if (rule.dueDateCalculationType !== 'event_triggered') return false;
  const triggerEvent = (rule.dueDateFormula as any)?.trigger_event;
  if (triggerEvent === 'incorporation_date' && entity.registrationDate) {
    return false;
  }
  return true;
};

const buildFormulaInput = (rule: Rule) => {
  const rawFormula: any = rule.dueDateFormula || {};
  const formulaList = Array.isArray(rawFormula) ? [...rawFormula] : [rawFormula];
  const metadata = rule.metadata as any;

  if (metadata?.second_cycle?.day && metadata?.second_cycle?.month) {
    formulaList.push({
      type: 'fixed',
      day: metadata.second_cycle.day,
      month: metadata.second_cycle.month,
    });
  }

  if (formulaList.length === 1) {
    return formulaList[0];
  }

  return formulaList;
};

const formatDateKey = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : 'null';

async function syncEntity(entity: Entity, rules: Rule[]) {
  const existing = await db
    .select({
      complianceRuleId: complianceTracking.complianceRuleId,
      dueDate: complianceTracking.dueDate,
    })
    .from(complianceTracking)
    .where(eq(complianceTracking.businessEntityId, entity.id));

  const existingByRule = new Map<number, Set<string>>();
  for (const row of existing) {
    if (!row.complianceRuleId) continue;
    const key = formatDateKey(row.dueDate);
    const bucket = existingByRule.get(row.complianceRuleId) || new Set<string>();
    bucket.add(key);
    existingByRule.set(row.complianceRuleId, bucket);
  }

  const now = new Date();
  const createdRuleIds: number[] = [];
  let created = 0;

  for (const rule of rules) {
    if (!rule.isActive || !rule.id) continue;
    if (!isRuleApplicable(rule, entity)) continue;

    const existingKeys = existingByRule.get(rule.id);
    if (['one_time', 'event_based'].includes(String(rule.periodicity || '').toLowerCase())) {
      if (existingKeys && existingKeys.size > 0) continue;
    }

    if (shouldSkipEventRule(rule, entity)) {
      continue;
    }

    let baseDate = now;
    if (rule.dueDateCalculationType === 'event_triggered') {
      const triggerEvent = (rule.dueDateFormula as any)?.trigger_event;
      if (triggerEvent === 'incorporation_date' && entity.registrationDate) {
        baseDate = new Date(entity.registrationDate);
      }
    }

    const formulaInput = buildFormulaInput(rule);
    let dueDates = computeDueDateCandidates(formulaInput as any, rule.dueDateCalculationType, baseDate);

    if (dueDates.length === 0) {
      dueDates = [computeDueDateFromFormula(formulaInput as any, rule.dueDateCalculationType, baseDate)];
    }

    if (['one_time', 'event_based'].includes(String(rule.periodicity || '').toLowerCase())) {
      dueDates = [computeDueDateFromFormula(formulaInput as any, rule.dueDateCalculationType, baseDate)];
    }

    const uniqueDates = new Map<string, Date>();
    dueDates.forEach(date => uniqueDates.set(formatDateKey(date), date));

    for (const [dueKey, dueDate] of uniqueDates.entries()) {
      if (existingKeys?.has(dueKey)) continue;

      await db.insert(complianceTracking).values({
        userId: entity.ownerId,
        businessEntityId: entity.id,
        entityName: (entity as any).name || null,
        complianceRuleId: rule.id,
        serviceId: rule.ruleCode,
        serviceType: rule.complianceName,
        complianceType: rule.periodicity,
        dueDate,
        status: 'pending',
        priority: rule.priorityLevel || 'medium',
        penaltyRisk: ['high', 'critical'].includes(rule.penaltyRiskLevel || ''),
        estimatedPenalty: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      createdRuleIds.push(rule.id);
      created += 1;
    }
  }

  if (createdRuleIds.length > 0) {
    await ensureRequiredDocumentsForRuleIds(createdRuleIds);
  }

  return created;
}

export async function syncComplianceTracking(options?: { entityIds?: number[] }) {
  const entities = options?.entityIds?.length
    ? await db
        .select()
        .from(businessEntities)
        .where(inArray(businessEntities.id, options.entityIds))
    : await db
        .select()
        .from(businessEntities)
        .where(eq(businessEntities.isActive, true));

  const rules = await db.select().from(complianceRules).where(eq(complianceRules.isActive, true));

  let created = 0;
  for (const entity of entities) {
    created += await syncEntity(entity, rules);
  }

  return { created };
}
