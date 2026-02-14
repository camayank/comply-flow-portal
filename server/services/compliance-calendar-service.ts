/**
 * COMPLIANCE CALENDAR SERVICE
 *
 * World-class compliance deadline management with:
 * - Formula-based deadline calculation
 * - Holiday-aware date adjustments
 * - Penalty calculations (flat, daily, interest, slab, compound)
 * - Automatic calendar generation
 * - Notification scheduling
 * - Overdue tracking
 *
 * Supports Indian compliance requirements:
 * - GST deadlines (GSTR-1, GSTR-3B, GSTR-9, etc.)
 * - Income Tax deadlines (Advance Tax, ITR, TDS)
 * - ROC deadlines (AOC-4, MGT-7, etc.)
 * - Professional Tax, PF, ESI
 */

import { db } from '../db';
import {
  complianceCalendar,
  serviceBlueprints,
  blueprintComplianceRules,
  holidayCalendars,
  deadlineFormulas,
  penaltyRulesMaster,
  jurisdictions,
  jurisdictionRules,
  clientServiceSubscriptions,
} from '../../shared/blueprints-schema';
import { users, businessEntities } from '../../shared/schema';
import { eq, and, gte, lte, lt, gt, or, sql, desc, asc, inArray, isNull, count } from 'drizzle-orm';
import { logger } from '../logger';
import {
  addDays,
  addMonths,
  addYears,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  isWeekend,
  nextMonday,
  previousFriday,
  format,
  parseISO,
  differenceInDays,
  isBefore,
  isAfter,
  isToday,
  getMonth,
  getYear,
  setMonth,
  setDate,
} from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export interface DeadlineCalculationInput {
  baseDateType: string;
  periodStart?: string;
  periodEnd?: string;
  transactionDate?: string;
  registrationDate?: string;
  previousFilingDate?: string;
  offsetDays?: number;
  offsetMonths?: number;
  offsetYears?: number;
  adjustmentRule?: 'NEXT_WORKING_DAY' | 'PREVIOUS_WORKING_DAY' | 'NONE';
  jurisdictionId?: string;
  fiscalYear?: string;
}

export interface PenaltyCalculationInput {
  penaltyType: 'FLAT' | 'DAILY' | 'INTEREST' | 'SLAB' | 'COMPOUND' | 'MIXED';
  dueDate: string;
  currentDate?: string;
  filedDate?: string;
  taxLiability?: number;
  flatAmount?: number;
  dailyAmount?: number;
  interestRateAnnual?: number;
  slabs?: Array<{ fromDays: number; toDays: number; amountPerDay?: number; rate?: number; type?: string }>;
  maxPenalty?: number;
  maxDays?: number;
  minPenalty?: number;
  compoundingFrequency?: 'DAILY' | 'MONTHLY' | 'QUARTERLY';
}

export interface CalendarGenerationInput {
  clientId: number;
  entityId?: number;
  blueprintId: string;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  tenantId?: string;
  jurisdictionId?: string;
  forceRegenerate?: boolean;
}

export interface CalendarSearchParams {
  tenantId?: string;
  clientId?: number;
  entityId?: number;
  blueprintId?: string;
  status?: string | string[];
  fiscalYear?: string;
  periodType?: string;
  fromDate?: string;
  toDate?: string;
  isOverdue?: boolean;
  page?: number;
  limit?: number;
}

export type PeriodType = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL';

// ============================================================================
// PERIOD CALCULATION UTILITIES
// ============================================================================

/**
 * Get period info for a given date
 */
function getPeriodInfo(date: Date, periodType: PeriodType, fiscalYearStart: number = 4): {
  periodCode: string;
  periodStart: Date;
  periodEnd: Date;
  fiscalYear: string;
} {
  const month = getMonth(date) + 1; // 1-12
  const year = getYear(date);

  // Determine fiscal year (Indian FY: Apr-Mar)
  const fiscalYearStartMonth = fiscalYearStart; // April = 4
  let fyStart: number, fyEnd: number;

  if (month >= fiscalYearStartMonth) {
    fyStart = year;
    fyEnd = year + 1;
  } else {
    fyStart = year - 1;
    fyEnd = year;
  }

  const fiscalYear = `${fyStart}-${String(fyEnd).slice(-2)}`;

  let periodCode: string;
  let periodStart: Date;
  let periodEnd: Date;

  switch (periodType) {
    case 'MONTHLY':
      periodCode = format(date, 'MMM-yyyy').toUpperCase();
      periodStart = startOfMonth(date);
      periodEnd = endOfMonth(date);
      break;

    case 'QUARTERLY':
      const quarter = Math.ceil(month / 3);
      // Adjust for fiscal year quarters (Q1 = Apr-Jun, Q2 = Jul-Sep, etc.)
      const fyMonth = month >= fiscalYearStartMonth
        ? month - fiscalYearStartMonth + 1
        : month + (12 - fiscalYearStartMonth + 1);
      const fyQuarter = Math.ceil(fyMonth / 3);
      periodCode = `Q${fyQuarter}-${fiscalYear}`;
      periodStart = startOfQuarter(date);
      periodEnd = endOfQuarter(date);
      break;

    case 'HALF_YEARLY':
      const fyMonthH = month >= fiscalYearStartMonth
        ? month - fiscalYearStartMonth + 1
        : month + (12 - fiscalYearStartMonth + 1);
      const half = fyMonthH <= 6 ? 1 : 2;
      periodCode = `H${half}-${fiscalYear}`;
      if (half === 1) {
        periodStart = new Date(fyStart, fiscalYearStartMonth - 1, 1);
        periodEnd = new Date(fyStart, fiscalYearStartMonth + 5, 0);
      } else {
        periodStart = new Date(fyStart, fiscalYearStartMonth + 5, 1);
        periodEnd = new Date(fyEnd, fiscalYearStartMonth - 1, 0);
      }
      break;

    case 'ANNUAL':
      periodCode = `FY${fiscalYear}`;
      periodStart = new Date(fyStart, fiscalYearStartMonth - 1, 1);
      periodEnd = new Date(fyEnd, fiscalYearStartMonth - 1, 0);
      break;

    default:
      periodCode = format(date, 'MMM-yyyy').toUpperCase();
      periodStart = startOfMonth(date);
      periodEnd = endOfMonth(date);
  }

  return { periodCode, periodStart, periodEnd, fiscalYear };
}

/**
 * Generate all periods for a fiscal year
 */
function generatePeriodsForFiscalYear(
  fiscalYearStart: string,
  fiscalYearEnd: string,
  periodType: PeriodType
): Array<{ periodCode: string; periodStart: Date; periodEnd: Date; fiscalYear: string }> {
  const periods: Array<{ periodCode: string; periodStart: Date; periodEnd: Date; fiscalYear: string }> = [];
  const start = parseISO(fiscalYearStart);
  const end = parseISO(fiscalYearEnd);

  let current = start;
  while (isBefore(current, end) || format(current, 'yyyy-MM') === format(end, 'yyyy-MM')) {
    const periodInfo = getPeriodInfo(current, periodType);

    // Avoid duplicates
    if (!periods.find(p => p.periodCode === periodInfo.periodCode)) {
      periods.push(periodInfo);
    }

    // Move to next period
    switch (periodType) {
      case 'MONTHLY':
        current = addMonths(current, 1);
        break;
      case 'QUARTERLY':
        current = addMonths(current, 3);
        break;
      case 'HALF_YEARLY':
        current = addMonths(current, 6);
        break;
      case 'ANNUAL':
        current = addYears(current, 1);
        break;
    }
  }

  return periods;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ComplianceCalendarService {
  // ==========================================================================
  // DEADLINE CALCULATION
  // ==========================================================================

  /**
   * Calculate deadline based on formula
   */
  async calculateDeadline(input: DeadlineCalculationInput): Promise<string> {
    let baseDate: Date;

    // Determine base date
    switch (input.baseDateType) {
      case 'PERIOD_END':
        if (!input.periodEnd) throw new Error('periodEnd required for PERIOD_END base date');
        baseDate = parseISO(input.periodEnd);
        break;

      case 'MONTH_END':
        if (!input.periodEnd) throw new Error('periodEnd required for MONTH_END base date');
        baseDate = endOfMonth(parseISO(input.periodEnd.substring(0, 7) + '-01'));
        break;

      case 'QUARTER_END':
        if (!input.periodEnd) throw new Error('periodEnd required for QUARTER_END base date');
        baseDate = endOfQuarter(parseISO(input.periodEnd));
        break;

      case 'FY_END':
      case 'FINANCIAL_YEAR_END':
        if (!input.fiscalYear) throw new Error('fiscalYear required for FY_END base date');
        const [startYear, endYearShort] = input.fiscalYear.split('-');
        const endYear = endYearShort.length === 2 ? '20' + endYearShort : endYearShort;
        baseDate = new Date(parseInt(endYear), 2, 31); // March 31st
        break;

      case 'TRANSACTION_DATE':
        if (!input.transactionDate) throw new Error('transactionDate required');
        baseDate = parseISO(input.transactionDate);
        break;

      case 'REGISTRATION_DATE':
        if (!input.registrationDate) throw new Error('registrationDate required');
        baseDate = parseISO(input.registrationDate);
        break;

      case 'PREVIOUS_FILING':
        if (!input.previousFilingDate) throw new Error('previousFilingDate required');
        baseDate = parseISO(input.previousFilingDate);
        break;

      default:
        if (!input.periodEnd) throw new Error('periodEnd required as fallback');
        baseDate = parseISO(input.periodEnd);
    }

    // Apply offsets
    let deadline = baseDate;

    if (input.offsetYears) {
      deadline = addYears(deadline, input.offsetYears);
    }
    if (input.offsetMonths) {
      deadline = addMonths(deadline, input.offsetMonths);
    }
    if (input.offsetDays) {
      deadline = addDays(deadline, input.offsetDays);
    }

    // Apply adjustment rule
    if (input.adjustmentRule && input.adjustmentRule !== 'NONE') {
      deadline = await this.adjustForHolidays(
        deadline,
        input.adjustmentRule,
        input.jurisdictionId
      );
    }

    return format(deadline, 'yyyy-MM-dd');
  }

  /**
   * Adjust date for holidays and weekends
   */
  async adjustForHolidays(
    date: Date,
    adjustmentRule: 'NEXT_WORKING_DAY' | 'PREVIOUS_WORKING_DAY',
    jurisdictionId?: string
  ): Promise<Date> {
    const year = getYear(date);
    let adjusted = date;

    // Get holidays for the year
    const holidays = await this.getHolidaysForYear(year, jurisdictionId);
    const holidayDates = new Set(holidays.map(h => format(parseISO(h.date), 'yyyy-MM-dd')));

    const isHoliday = (d: Date) => {
      return isWeekend(d) || holidayDates.has(format(d, 'yyyy-MM-dd'));
    };

    // Adjust until we find a working day
    let maxIterations = 30; // Safety limit
    while (isHoliday(adjusted) && maxIterations > 0) {
      if (adjustmentRule === 'NEXT_WORKING_DAY') {
        adjusted = addDays(adjusted, 1);
      } else {
        adjusted = subDays(adjusted, 1);
      }
      maxIterations--;
    }

    return adjusted;
  }

  /**
   * Get holidays for a year
   */
  async getHolidaysForYear(year: number, jurisdictionId?: string): Promise<Array<{ date: string; name: string; type: string }>> {
    const conditions = [eq(holidayCalendars.year, year), eq(holidayCalendars.isActive, true)];

    if (jurisdictionId) {
      conditions.push(
        or(
          eq(holidayCalendars.jurisdictionId, jurisdictionId),
          isNull(holidayCalendars.jurisdictionId)
        )!
      );
    }

    const calendars = await db
      .select()
      .from(holidayCalendars)
      .where(and(...conditions));

    const allHolidays: Array<{ date: string; name: string; type: string }> = [];
    for (const cal of calendars) {
      const holidays = cal.holidays as Array<{ date: string; name: string; type: string }>;
      allHolidays.push(...holidays);
    }

    return allHolidays;
  }

  /**
   * Check if a date is a working day
   */
  async isWorkingDay(date: Date, jurisdictionId?: string): Promise<boolean> {
    if (isWeekend(date)) return false;

    const holidays = await this.getHolidaysForYear(getYear(date), jurisdictionId);
    const dateStr = format(date, 'yyyy-MM-dd');
    return !holidays.some(h => h.date === dateStr);
  }

  // ==========================================================================
  // PENALTY CALCULATION
  // ==========================================================================

  /**
   * Calculate penalty for late filing
   */
  calculatePenalty(input: PenaltyCalculationInput): {
    penaltyAmount: number;
    interestAmount: number;
    totalAmount: number;
    daysOverdue: number;
    breakdown: Array<{ type: string; amount: number; description: string }>;
  } {
    const dueDate = parseISO(input.dueDate);
    const referenceDate = input.filedDate
      ? parseISO(input.filedDate)
      : input.currentDate
        ? parseISO(input.currentDate)
        : new Date();

    const daysOverdue = Math.max(0, differenceInDays(referenceDate, dueDate));

    if (daysOverdue === 0) {
      return {
        penaltyAmount: 0,
        interestAmount: 0,
        totalAmount: 0,
        daysOverdue: 0,
        breakdown: [],
      };
    }

    let penaltyAmount = 0;
    let interestAmount = 0;
    const breakdown: Array<{ type: string; amount: number; description: string }> = [];

    // Apply max days cap
    const effectiveDays = input.maxDays
      ? Math.min(daysOverdue, input.maxDays)
      : daysOverdue;

    switch (input.penaltyType) {
      case 'FLAT':
        penaltyAmount = input.flatAmount || 0;
        breakdown.push({
          type: 'FLAT',
          amount: penaltyAmount,
          description: `Flat penalty for late filing`,
        });
        break;

      case 'DAILY':
        penaltyAmount = (input.dailyAmount || 0) * effectiveDays;
        breakdown.push({
          type: 'DAILY',
          amount: penaltyAmount,
          description: `Rs. ${input.dailyAmount} per day x ${effectiveDays} days`,
        });
        break;

      case 'INTEREST':
        if (input.taxLiability && input.interestRateAnnual) {
          // Simple interest: P * R * T / 365
          interestAmount = (input.taxLiability * (input.interestRateAnnual / 100) * effectiveDays) / 365;
          breakdown.push({
            type: 'INTEREST',
            amount: interestAmount,
            description: `${input.interestRateAnnual}% p.a. on Rs. ${input.taxLiability.toLocaleString()} for ${effectiveDays} days`,
          });
        }
        break;

      case 'SLAB':
        if (input.slabs) {
          let remainingDays = effectiveDays;
          let accumulatedDays = 0;

          for (const slab of input.slabs.sort((a, b) => a.fromDays - b.fromDays)) {
            if (remainingDays <= 0) break;
            if (accumulatedDays >= slab.toDays) continue;

            const slabStartDay = Math.max(slab.fromDays, accumulatedDays + 1);
            const slabEndDay = Math.min(slab.toDays, accumulatedDays + remainingDays);
            const daysInSlab = slabEndDay - slabStartDay + 1;

            if (daysInSlab > 0) {
              let slabPenalty = 0;
              if (slab.amountPerDay) {
                slabPenalty = slab.amountPerDay * daysInSlab;
              } else if (slab.rate && input.taxLiability) {
                slabPenalty = (input.taxLiability * (slab.rate / 100) * daysInSlab) / 365;
              }

              penaltyAmount += slabPenalty;
              breakdown.push({
                type: 'SLAB',
                amount: slabPenalty,
                description: `Days ${slabStartDay}-${slabEndDay}: Rs. ${slab.amountPerDay || slab.rate + '%'} x ${daysInSlab} days`,
              });

              remainingDays -= daysInSlab;
              accumulatedDays = slabEndDay;
            }
          }
        }
        break;

      case 'COMPOUND':
        if (input.taxLiability && input.interestRateAnnual) {
          const ratePerPeriod = input.interestRateAnnual / 100;
          let periods: number;

          switch (input.compoundingFrequency) {
            case 'DAILY':
              periods = effectiveDays;
              interestAmount = input.taxLiability * (Math.pow(1 + ratePerPeriod / 365, periods) - 1);
              break;
            case 'MONTHLY':
              periods = Math.floor(effectiveDays / 30);
              interestAmount = input.taxLiability * (Math.pow(1 + ratePerPeriod / 12, periods) - 1);
              break;
            case 'QUARTERLY':
              periods = Math.floor(effectiveDays / 90);
              interestAmount = input.taxLiability * (Math.pow(1 + ratePerPeriod / 4, periods) - 1);
              break;
            default:
              periods = Math.floor(effectiveDays / 30);
              interestAmount = input.taxLiability * (Math.pow(1 + ratePerPeriod / 12, periods) - 1);
          }

          breakdown.push({
            type: 'COMPOUND_INTEREST',
            amount: interestAmount,
            description: `${input.interestRateAnnual}% p.a. compounded ${input.compoundingFrequency?.toLowerCase() || 'monthly'} for ${effectiveDays} days`,
          });
        }
        break;

      case 'MIXED':
        // Apply both flat/daily penalty AND interest
        if (input.flatAmount) {
          penaltyAmount += input.flatAmount;
          breakdown.push({
            type: 'FLAT',
            amount: input.flatAmount,
            description: `Fixed late fee`,
          });
        }

        if (input.dailyAmount) {
          const dailyPenalty = input.dailyAmount * effectiveDays;
          penaltyAmount += dailyPenalty;
          breakdown.push({
            type: 'DAILY',
            amount: dailyPenalty,
            description: `Rs. ${input.dailyAmount} per day x ${effectiveDays} days`,
          });
        }

        if (input.taxLiability && input.interestRateAnnual) {
          const interest = (input.taxLiability * (input.interestRateAnnual / 100) * effectiveDays) / 365;
          interestAmount += interest;
          breakdown.push({
            type: 'INTEREST',
            amount: interest,
            description: `${input.interestRateAnnual}% p.a. interest on tax`,
          });
        }
        break;
    }

    // Apply caps
    if (input.maxPenalty && penaltyAmount > input.maxPenalty) {
      const capped = penaltyAmount;
      penaltyAmount = input.maxPenalty;
      breakdown.push({
        type: 'CAP_APPLIED',
        amount: -(capped - input.maxPenalty),
        description: `Penalty capped at Rs. ${input.maxPenalty.toLocaleString()}`,
      });
    }

    // Apply minimum
    if (input.minPenalty && penaltyAmount > 0 && penaltyAmount < input.minPenalty) {
      penaltyAmount = input.minPenalty;
      breakdown.push({
        type: 'MIN_APPLIED',
        amount: input.minPenalty,
        description: `Minimum penalty Rs. ${input.minPenalty.toLocaleString()}`,
      });
    }

    // Round to 2 decimal places
    penaltyAmount = Math.round(penaltyAmount * 100) / 100;
    interestAmount = Math.round(interestAmount * 100) / 100;
    const totalAmount = penaltyAmount + interestAmount;

    return {
      penaltyAmount,
      interestAmount,
      totalAmount,
      daysOverdue,
      breakdown,
    };
  }

  // ==========================================================================
  // CALENDAR GENERATION
  // ==========================================================================

  /**
   * Generate compliance calendar entries for a client
   */
  async generateCalendarForClient(input: CalendarGenerationInput) {
    const { clientId, entityId, blueprintId, fiscalYearStart, fiscalYearEnd, tenantId, jurisdictionId, forceRegenerate } = input;

    // Get blueprint with compliance rules
    const [blueprint] = await db
      .select()
      .from(serviceBlueprints)
      .where(eq(serviceBlueprints.id, blueprintId))
      .limit(1);

    if (!blueprint) throw new Error('Blueprint not found');

    // Get compliance rules
    const rules = await db
      .select()
      .from(blueprintComplianceRules)
      .where(
        and(
          eq(blueprintComplianceRules.blueprintId, blueprintId),
          eq(blueprintComplianceRules.ruleType, 'DEADLINE'),
          eq(blueprintComplianceRules.isActive, true)
        )
      );

    if (!rules.length) {
      logger.warn('No deadline rules found for blueprint', { blueprintId });
      return [];
    }

    // Determine period type from frequency
    const periodType: PeriodType = (blueprint.frequency as PeriodType) || 'MONTHLY';

    // Generate periods
    const periods = generatePeriodsForFiscalYear(fiscalYearStart, fiscalYearEnd, periodType);

    // Check for existing entries if not force regenerating
    if (!forceRegenerate) {
      const existing = await db
        .select({ id: complianceCalendar.id })
        .from(complianceCalendar)
        .where(
          and(
            eq(complianceCalendar.clientId, clientId),
            eq(complianceCalendar.blueprintId, blueprintId),
            eq(complianceCalendar.fiscalYear, getPeriodInfo(parseISO(fiscalYearStart), periodType).fiscalYear)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        logger.info('Calendar entries already exist, skipping generation', { clientId, blueprintId });
        return [];
      }
    }

    const entries: Array<typeof complianceCalendar.$inferInsert> = [];

    for (const period of periods) {
      for (const rule of rules) {
        // Calculate deadline
        const deadline = await this.calculateDeadline({
          baseDateType: rule.baseDateType || 'PERIOD_END',
          periodEnd: format(period.periodEnd, 'yyyy-MM-dd'),
          periodStart: format(period.periodStart, 'yyyy-MM-dd'),
          fiscalYear: period.fiscalYear,
          offsetDays: rule.offsetDays || 0,
          offsetMonths: rule.offsetMonths || 0,
          adjustmentRule: (rule.adjustmentRule as any) || 'NEXT_WORKING_DAY',
          jurisdictionId,
        });

        // Apply jurisdiction overrides if any
        let adjustedDeadline = deadline;
        if (jurisdictionId) {
          const overrides = await db
            .select()
            .from(jurisdictionRules)
            .where(
              and(
                eq(jurisdictionRules.jurisdictionId, jurisdictionId),
                eq(jurisdictionRules.blueprintId, blueprintId),
                eq(jurisdictionRules.ruleType, 'DEADLINE_OVERRIDE'),
                eq(jurisdictionRules.isActive, true)
              )
            )
            .limit(1);

          if (overrides.length > 0 && overrides[0].deadlineOffsetDays) {
            adjustedDeadline = format(
              addDays(parseISO(deadline), overrides[0].deadlineOffsetDays),
              'yyyy-MM-dd'
            );
          }
        }

        entries.push({
          tenantId,
          clientId,
          entityId,
          blueprintId,
          complianceRuleId: rule.id,
          periodType,
          periodCode: period.periodCode,
          periodStart: format(period.periodStart, 'yyyy-MM-dd'),
          periodEnd: format(period.periodEnd, 'yyyy-MM-dd'),
          fiscalYear: period.fiscalYear,
          originalDueDate: deadline,
          adjustedDueDate: adjustedDeadline,
          status: 'UPCOMING',
          autoGenerated: true,
        });
      }
    }

    // Bulk insert
    if (entries.length > 0) {
      await db.insert(complianceCalendar).values(entries);
      logger.info(`Generated ${entries.length} calendar entries`, { clientId, blueprintId });
    }

    return entries;
  }

  /**
   * Generate calendar for all active subscriptions of a client
   */
  async generateFullCalendarForClient(
    clientId: number,
    fiscalYearStart: string,
    fiscalYearEnd: string,
    tenantId?: string
  ) {
    // Get all active subscriptions
    const subscriptions = await db
      .select()
      .from(clientServiceSubscriptions)
      .where(
        and(
          eq(clientServiceSubscriptions.clientId, clientId),
          eq(clientServiceSubscriptions.status, 'ACTIVE')
        )
      );

    const allEntries: Array<typeof complianceCalendar.$inferInsert> = [];

    for (const sub of subscriptions) {
      try {
        const entries = await this.generateCalendarForClient({
          clientId,
          entityId: sub.entityId || undefined,
          blueprintId: sub.blueprintId,
          fiscalYearStart,
          fiscalYearEnd,
          tenantId: sub.tenantId || tenantId,
        });
        allEntries.push(...entries);
      } catch (error) {
        logger.error(`Failed to generate calendar for subscription`, {
          subscriptionId: sub.id,
          error,
        });
      }
    }

    return allEntries;
  }

  // ==========================================================================
  // CALENDAR QUERIES
  // ==========================================================================

  /**
   * Get calendar entries with filters
   */
  async getCalendarEntries(params: CalendarSearchParams) {
    const {
      tenantId,
      clientId,
      entityId,
      blueprintId,
      status,
      fiscalYear,
      periodType,
      fromDate,
      toDate,
      isOverdue,
      page = 1,
      limit = 50,
    } = params;

    const conditions: ReturnType<typeof eq>[] = [];

    if (tenantId) conditions.push(eq(complianceCalendar.tenantId, tenantId));
    if (clientId) conditions.push(eq(complianceCalendar.clientId, clientId));
    if (entityId) conditions.push(eq(complianceCalendar.entityId, entityId));
    if (blueprintId) conditions.push(eq(complianceCalendar.blueprintId, blueprintId));

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(inArray(complianceCalendar.status, status));
      } else {
        conditions.push(eq(complianceCalendar.status, status));
      }
    }

    if (fiscalYear) conditions.push(eq(complianceCalendar.fiscalYear, fiscalYear));
    if (periodType) conditions.push(eq(complianceCalendar.periodType, periodType));
    if (fromDate) conditions.push(gte(complianceCalendar.adjustedDueDate, fromDate));
    if (toDate) conditions.push(lte(complianceCalendar.adjustedDueDate, toDate));

    if (isOverdue) {
      const today = format(new Date(), 'yyyy-MM-dd');
      conditions.push(lt(complianceCalendar.adjustedDueDate, today));
      conditions.push(
        or(
          eq(complianceCalendar.status, 'UPCOMING'),
          eq(complianceCalendar.status, 'DUE_SOON'),
          eq(complianceCalendar.status, 'OVERDUE')
        )!
      );
    }

    const offset = (page - 1) * limit;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(complianceCalendar)
      .where(and(...conditions));

    // Get entries with blueprint info
    const entries = await db
      .select({
        calendar: complianceCalendar,
        blueprint: {
          code: serviceBlueprints.code,
          name: serviceBlueprints.name,
          category: serviceBlueprints.category,
          formNumber: serviceBlueprints.formNumber,
        },
      })
      .from(complianceCalendar)
      .leftJoin(serviceBlueprints, eq(complianceCalendar.blueprintId, serviceBlueprints.id))
      .where(and(...conditions))
      .orderBy(asc(complianceCalendar.adjustedDueDate))
      .limit(limit)
      .offset(offset);

    return {
      data: entries.map(e => ({
        ...e.calendar,
        blueprint: e.blueprint,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get upcoming deadlines
   */
  async getUpcomingDeadlines(tenantId: string, daysAhead: number = 30, clientId?: number) {
    const today = new Date();
    const futureDate = addDays(today, daysAhead);

    const conditions = [
      eq(complianceCalendar.tenantId, tenantId),
      inArray(complianceCalendar.status, ['UPCOMING', 'DUE_SOON', 'DUE_TODAY']),
      gte(complianceCalendar.adjustedDueDate, format(today, 'yyyy-MM-dd')),
      lte(complianceCalendar.adjustedDueDate, format(futureDate, 'yyyy-MM-dd')),
    ];

    if (clientId) {
      conditions.push(eq(complianceCalendar.clientId, clientId));
    }

    return db
      .select({
        calendar: complianceCalendar,
        blueprint: {
          code: serviceBlueprints.code,
          name: serviceBlueprints.name,
          formNumber: serviceBlueprints.formNumber,
        },
        client: {
          id: users.id,
          username: users.username,
          email: users.email,
        },
      })
      .from(complianceCalendar)
      .leftJoin(serviceBlueprints, eq(complianceCalendar.blueprintId, serviceBlueprints.id))
      .leftJoin(users, eq(complianceCalendar.clientId, users.id))
      .where(and(...conditions))
      .orderBy(asc(complianceCalendar.adjustedDueDate));
  }

  /**
   * Get overdue entries
   */
  async getOverdueEntries(tenantId: string, clientId?: number) {
    const today = format(new Date(), 'yyyy-MM-dd');

    const conditions = [
      eq(complianceCalendar.tenantId, tenantId),
      inArray(complianceCalendar.status, ['UPCOMING', 'DUE_SOON', 'DUE_TODAY', 'OVERDUE']),
      lt(complianceCalendar.adjustedDueDate, today),
    ];

    if (clientId) {
      conditions.push(eq(complianceCalendar.clientId, clientId));
    }

    return db
      .select({
        calendar: complianceCalendar,
        blueprint: {
          code: serviceBlueprints.code,
          name: serviceBlueprints.name,
          formNumber: serviceBlueprints.formNumber,
        },
        client: {
          id: users.id,
          username: users.username,
          email: users.email,
        },
      })
      .from(complianceCalendar)
      .leftJoin(serviceBlueprints, eq(complianceCalendar.blueprintId, serviceBlueprints.id))
      .leftJoin(users, eq(complianceCalendar.clientId, users.id))
      .where(and(...conditions))
      .orderBy(asc(complianceCalendar.adjustedDueDate));
  }

  /**
   * Alias for getOverdueEntries - for API compatibility
   */
  async getOverdueDeadlines(tenantId: string, clientId?: number) {
    return this.getOverdueEntries(tenantId, clientId);
  }

  /**
   * Generate calendar for multiple blueprints at once
   */
  async generateCalendarForBlueprints(input: {
    clientId: number;
    entityId?: number;
    blueprintIds: string[];
    fiscalYearStart: string;
    fiscalYearEnd: string;
    tenantId?: string;
    jurisdictionId?: string;
    forceRegenerate?: boolean;
  }) {
    const allEntries: Array<typeof complianceCalendar.$inferInsert> = [];

    for (const blueprintId of input.blueprintIds) {
      try {
        const entries = await this.generateCalendarForClient({
          clientId: input.clientId,
          entityId: input.entityId,
          blueprintId,
          fiscalYearStart: input.fiscalYearStart,
          fiscalYearEnd: input.fiscalYearEnd,
          tenantId: input.tenantId,
          jurisdictionId: input.jurisdictionId,
          forceRegenerate: input.forceRegenerate,
        });
        allEntries.push(...entries);
      } catch (error) {
        logger.error(`Failed to generate calendar for blueprint`, {
          blueprintId,
          clientId: input.clientId,
          error,
        });
      }
    }

    return allEntries;
  }

  // ==========================================================================
  // CALENDAR UPDATES
  // ==========================================================================

  /**
   * Mark entry as filed
   */
  async markAsFiled(
    entryId: string,
    filedDate: string,
    filingReference?: string,
    filingProofUrl?: string,
    completedBy?: number
  ) {
    const [entry] = await db
      .select()
      .from(complianceCalendar)
      .where(eq(complianceCalendar.id, entryId))
      .limit(1);

    if (!entry) throw new Error('Calendar entry not found');

    // Calculate if there was any penalty
    let penaltyInfo = { penaltyAmount: 0, interestAmount: 0, daysOverdue: 0, breakdown: [] as any[] };

    if (entry.adjustedDueDate && isBefore(parseISO(entry.adjustedDueDate), parseISO(filedDate))) {
      // Get penalty rules for this blueprint
      const penaltyRules = await db
        .select()
        .from(blueprintComplianceRules)
        .where(
          and(
            eq(blueprintComplianceRules.blueprintId, entry.blueprintId!),
            or(
              eq(blueprintComplianceRules.ruleType, 'PENALTY'),
              sql`${blueprintComplianceRules.penaltyType} IS NOT NULL`
            ),
            eq(blueprintComplianceRules.isActive, true)
          )
        )
        .limit(1);

      if (penaltyRules.length > 0) {
        const rule = penaltyRules[0];
        penaltyInfo = this.calculatePenalty({
          penaltyType: (rule.penaltyType as any) || 'DAILY',
          dueDate: entry.adjustedDueDate,
          filedDate,
          taxLiability: entry.taxLiability ? parseFloat(entry.taxLiability) : undefined,
          dailyAmount: rule.dailyAmount ? parseFloat(rule.dailyAmount) : undefined,
          flatAmount: rule.flatAmount ? parseFloat(rule.flatAmount) : undefined,
          interestRateAnnual: rule.interestRateAnnual ? parseFloat(rule.interestRateAnnual) : undefined,
          maxPenalty: rule.maxPenalty ? parseFloat(rule.maxPenalty) : undefined,
          maxDays: rule.maxPenaltyDays || undefined,
          slabs: rule.penaltySlabs as any,
        });
      }
    }

    const [updated] = await db
      .update(complianceCalendar)
      .set({
        status: 'COMPLETED',
        filedDate,
        filingReference,
        filingProofUrl,
        daysOverdue: penaltyInfo.daysOverdue,
        penaltyAmount: String(penaltyInfo.penaltyAmount),
        interestAmount: String(penaltyInfo.interestAmount),
        totalLiability: String(penaltyInfo.penaltyAmount + penaltyInfo.interestAmount),
        completedBy,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(complianceCalendar.id, entryId))
      .returning();

    logger.info(`Calendar entry marked as filed`, { entryId, filedDate, penaltyInfo });
    return updated;
  }

  /**
   * Grant extension
   */
  async grantExtension(
    entryId: string,
    newDueDate: string,
    reason: string,
    approvedBy: number
  ) {
    const [updated] = await db
      .update(complianceCalendar)
      .set({
        extendedDueDate: newDueDate,
        adjustedDueDate: newDueDate,
        extensionReason: reason,
        extensionApprovedBy: approvedBy,
        status: 'UPCOMING',
        updatedAt: new Date(),
      })
      .where(eq(complianceCalendar.id, entryId))
      .returning();

    logger.info(`Extension granted`, { entryId, newDueDate, approvedBy });
    return updated;
  }

  /**
   * Mark as exempted/not applicable
   */
  async markAsExempted(entryId: string, reason: string, _updatedBy?: number) {
    const [updated] = await db
      .update(complianceCalendar)
      .set({
        status: 'EXEMPTED',
        notes: reason,
        updatedAt: new Date(),
      })
      .where(eq(complianceCalendar.id, entryId))
      .returning();

    return updated;
  }

  // ==========================================================================
  // STATUS UPDATES (Scheduled Job)
  // ==========================================================================

  /**
   * Update statuses for all calendar entries (run as scheduled job)
   */
  async updateAllStatuses() {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const soonDate = format(addDays(today, 7), 'yyyy-MM-dd');

    // Update OVERDUE
    await db
      .update(complianceCalendar)
      .set({ status: 'OVERDUE', updatedAt: new Date() })
      .where(
        and(
          inArray(complianceCalendar.status, ['UPCOMING', 'DUE_SOON', 'DUE_TODAY']),
          lt(complianceCalendar.adjustedDueDate, todayStr)
        )
      );

    // Update DUE_TODAY
    await db
      .update(complianceCalendar)
      .set({ status: 'DUE_TODAY', updatedAt: new Date() })
      .where(
        and(
          inArray(complianceCalendar.status, ['UPCOMING', 'DUE_SOON']),
          eq(complianceCalendar.adjustedDueDate, todayStr)
        )
      );

    // Update DUE_SOON (within 7 days)
    await db
      .update(complianceCalendar)
      .set({ status: 'DUE_SOON', updatedAt: new Date() })
      .where(
        and(
          eq(complianceCalendar.status, 'UPCOMING'),
          gt(complianceCalendar.adjustedDueDate, todayStr),
          lte(complianceCalendar.adjustedDueDate, soonDate)
        )
      );

    // Update penalty amounts for overdue entries
    const overdueEntries = await db
      .select()
      .from(complianceCalendar)
      .where(eq(complianceCalendar.status, 'OVERDUE'));

    for (const entry of overdueEntries) {
      if (!entry.adjustedDueDate) continue;

      const daysOverdue = differenceInDays(today, parseISO(entry.adjustedDueDate));

      // Get penalty rules
      const penaltyRules = await db
        .select()
        .from(blueprintComplianceRules)
        .where(
          and(
            eq(blueprintComplianceRules.blueprintId, entry.blueprintId!),
            or(
              eq(blueprintComplianceRules.ruleType, 'PENALTY'),
              sql`${blueprintComplianceRules.penaltyType} IS NOT NULL`
            ),
            eq(blueprintComplianceRules.isActive, true)
          )
        )
        .limit(1);

      if (penaltyRules.length > 0) {
        const rule = penaltyRules[0];
        const penaltyInfo = this.calculatePenalty({
          penaltyType: (rule.penaltyType as any) || 'DAILY',
          dueDate: entry.adjustedDueDate,
          currentDate: todayStr,
          taxLiability: entry.taxLiability ? parseFloat(entry.taxLiability) : undefined,
          dailyAmount: rule.dailyAmount ? parseFloat(rule.dailyAmount) : undefined,
          flatAmount: rule.flatAmount ? parseFloat(rule.flatAmount) : undefined,
          interestRateAnnual: rule.interestRateAnnual ? parseFloat(rule.interestRateAnnual) : undefined,
          maxPenalty: rule.maxPenalty ? parseFloat(rule.maxPenalty) : undefined,
          maxDays: rule.maxPenaltyDays || undefined,
          slabs: rule.penaltySlabs as any,
        });

        await db
          .update(complianceCalendar)
          .set({
            daysOverdue,
            penaltyAmount: String(penaltyInfo.penaltyAmount),
            interestAmount: String(penaltyInfo.interestAmount),
            totalLiability: String(penaltyInfo.totalAmount),
            updatedAt: new Date(),
          })
          .where(eq(complianceCalendar.id, entry.id));
      }
    }

    logger.info('Compliance calendar statuses updated');
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get compliance dashboard stats
   */
  async getDashboardStats(tenantId: string, fiscalYear?: string) {
    const conditions = [eq(complianceCalendar.tenantId, tenantId)];
    if (fiscalYear) {
      conditions.push(eq(complianceCalendar.fiscalYear, fiscalYear));
    }

    const stats = await db
      .select({
        status: complianceCalendar.status,
        count: count(),
      })
      .from(complianceCalendar)
      .where(and(...conditions))
      .groupBy(complianceCalendar.status);

    const statusMap: Record<string, number> = {};
    for (const stat of stats) {
      statusMap[stat.status || 'UNKNOWN'] = stat.count;
    }

    // Get total penalty amount for overdue
    const [penaltyStats] = await db
      .select({
        totalPenalty: sql<string>`COALESCE(SUM(CAST(penalty_amount AS NUMERIC)), 0)`,
        totalInterest: sql<string>`COALESCE(SUM(CAST(interest_amount AS NUMERIC)), 0)`,
      })
      .from(complianceCalendar)
      .where(
        and(
          ...conditions,
          eq(complianceCalendar.status, 'OVERDUE')
        )
      );

    return {
      upcoming: statusMap['UPCOMING'] || 0,
      dueSoon: statusMap['DUE_SOON'] || 0,
      dueToday: statusMap['DUE_TODAY'] || 0,
      overdue: statusMap['OVERDUE'] || 0,
      completed: statusMap['COMPLETED'] || 0,
      exempted: statusMap['EXEMPTED'] || 0,
      totalPenalty: parseFloat(penaltyStats?.totalPenalty || '0'),
      totalInterest: parseFloat(penaltyStats?.totalInterest || '0'),
    };
  }

  /**
   * Get client compliance summary
   */
  async getClientComplianceSummary(clientId: number, fiscalYear?: string) {
    const conditions = [eq(complianceCalendar.clientId, clientId)];
    if (fiscalYear) {
      conditions.push(eq(complianceCalendar.fiscalYear, fiscalYear));
    }

    const [totals] = await db
      .select({
        total: count(),
        completed: sql<number>`COUNT(*) FILTER (WHERE status = 'COMPLETED')`,
        overdue: sql<number>`COUNT(*) FILTER (WHERE status = 'OVERDUE')`,
        pending: sql<number>`COUNT(*) FILTER (WHERE status IN ('UPCOMING', 'DUE_SOON', 'DUE_TODAY'))`,
        totalPenalty: sql<string>`COALESCE(SUM(CAST(penalty_amount AS NUMERIC)), 0)`,
      })
      .from(complianceCalendar)
      .where(and(...conditions));

    const complianceScore = totals?.total
      ? Math.round((totals.completed / totals.total) * 100)
      : 100;

    return {
      total: totals?.total || 0,
      completed: totals?.completed || 0,
      overdue: totals?.overdue || 0,
      pending: totals?.pending || 0,
      complianceScore,
      totalPenalty: parseFloat(totals?.totalPenalty || '0'),
    };
  }
}

// Export singleton instance
export const complianceCalendarService = new ComplianceCalendarService();
