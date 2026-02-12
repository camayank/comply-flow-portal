export type DueDateFormula = {
  type?: string;
  calcType?: string;
  day?: number | string;
  month?: number | string;
  month_offset?: number | string;
  days_after?: number | string;
  days_after_event?: number | string;
};

export type DueDateFormulaInput = DueDateFormula | DueDateFormula[] | string | null | undefined;

const DEFAULT_DAY = 20;

const toNumber = (value: unknown, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const clampDay = (year: number, monthIndex: number, day: number) => {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Math.max(1, Math.min(day, daysInMonth));
};

const createSafeDate = (year: number, monthIndex: number, day: number) => {
  const safeDay = clampDay(year, monthIndex, day);
  return new Date(year, monthIndex, safeDay);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonthsSafe = (date: Date, months: number) => {
  const year = date.getFullYear();
  const monthIndex = date.getMonth() + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const day = date.getDate();
  return createSafeDate(targetYear, targetMonth, day);
};

const normalizeType = (calcType?: string, formula?: DueDateFormula) => {
  const raw = String(calcType || formula?.calcType || formula?.type || '').toLowerCase();
  switch (raw) {
    case 'fixed_date':
    case 'fixed':
      return 'fixed';
    case 'relative':
      return 'relative';
    case 'relative_to_month_end':
    case 'month_end':
    case 'monthend':
      return 'month_end';
    case 'relative_to_quarter_end':
    case 'quarter_end':
    case 'quarterend':
      return 'quarter_end';
    case 'relative_to_fy_end':
    case 'fy_end':
    case 'financial_year_end':
    case 'fiscal_year_end':
      return 'fy_end';
    case 'event_triggered':
    case 'event':
      return 'event';
    default:
      return raw;
  }
};

const parseFormulaInput = (input: DueDateFormulaInput): DueDateFormula[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (parsed && typeof parsed === 'object') return [parsed as DueDateFormula];
      return [];
    } catch (error) {
      return [];
    }
  }
  if (typeof input === 'object') return [input as DueDateFormula];
  return [];
};

const extractCalcType = (formula: DueDateFormula, fallback?: string | null) =>
  formula?.calcType || formula?.type || fallback;

const pickNearestCandidate = (candidates: Date[], baseDate: Date): Date => {
  if (candidates.length === 0) {
    return createSafeDate(baseDate.getFullYear(), baseDate.getMonth() + 1, DEFAULT_DAY);
  }

  const baseTime = baseDate.getTime();
  const future = candidates.filter(date => date.getTime() >= baseTime);
  if (future.length > 0) {
    future.sort((a, b) => a.getTime() - b.getTime());
    return future[0];
  }

  candidates.sort((a, b) => b.getTime() - a.getTime());
  return candidates[0];
};

const computeSingleDueDate = (
  formula: DueDateFormula,
  calcType: string | null | undefined,
  baseDate: Date
): Date => {
  const normalizedType = normalizeType(calcType || undefined, formula || undefined);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  switch (normalizedType) {
    case 'fixed': {
      const day = toNumber(formula?.day, DEFAULT_DAY);
      const monthOverride = formula?.month !== undefined && formula?.month !== null
        ? toNumber(formula?.month, month + 1) - 1
        : null;
      const monthOffset = toNumber(formula?.month_offset, 0);
      const targetMonth = monthOverride !== null ? monthOverride : month + monthOffset;
      return createSafeDate(year, targetMonth, day);
    }
    case 'relative': {
      if (formula?.day !== undefined || formula?.month_offset !== undefined) {
        const day = toNumber(formula?.day, DEFAULT_DAY);
        const monthOffset = toNumber(formula?.month_offset, 0);
        return createSafeDate(year, month + monthOffset, day);
      }
      const daysAfter = toNumber(formula?.days_after, 0);
      return addDays(baseDate, daysAfter);
    }
    case 'month_end': {
      const monthEnd = new Date(year, month + 1, 0);
      const daysAfter = toNumber(formula?.days_after, 0);
      return addDays(monthEnd, daysAfter);
    }
    case 'quarter_end': {
      const quarterEndMonth = Math.ceil((month + 1) / 3) * 3;
      const quarterEnd = new Date(year, quarterEndMonth, 0);
      const daysAfter = toNumber(formula?.days_after, 0);
      return addDays(quarterEnd, daysAfter);
    }
    case 'fy_end': {
      const fyEndYear = month >= 3 ? year + 1 : year;
      const fyEnd = new Date(fyEndYear, 2, 31);
      const daysAfter = toNumber(formula?.days_after, 0);
      return addDays(fyEnd, daysAfter);
    }
    case 'event': {
      const daysAfterEvent = toNumber(
        formula?.days_after_event,
        toNumber(formula?.days_after, 0)
      );
      return addDays(baseDate, daysAfterEvent);
    }
    default: {
      return createSafeDate(year, month + 1, DEFAULT_DAY);
    }
  }
};

export function computeDueDateFromFormula(
  formulaInput: DueDateFormulaInput,
  calcType: string | null | undefined,
  baseDate: Date
): Date {
  const formulas = parseFormulaInput(formulaInput);
  if (formulas.length === 0) {
    return createSafeDate(baseDate.getFullYear(), baseDate.getMonth() + 1, DEFAULT_DAY);
  }

  if (formulas.length === 1) {
    const formula = formulas[0];
    return computeSingleDueDate(formula, extractCalcType(formula, calcType), baseDate);
  }

  const candidates = formulas.map(formula =>
    computeSingleDueDate(formula, extractCalcType(formula, calcType), baseDate)
  );

  return pickNearestCandidate(candidates, baseDate);
}

export function computeDueDateCandidates(
  formulaInput: DueDateFormulaInput,
  calcType: string | null | undefined,
  baseDate: Date
): Date[] {
  const formulas = parseFormulaInput(formulaInput);
  if (formulas.length === 0) return [];

  return formulas.map(formula =>
    computeSingleDueDate(formula, extractCalcType(formula, calcType), baseDate)
  );
}

const normalizePeriodicity = (value?: string | null) => {
  const raw = String(value || '').toLowerCase().trim();
  switch (raw) {
    case 'half-yearly':
    case 'half_yearly':
    case 'halfyearly':
      return 'half_yearly';
    case 'yearly':
      return 'annual';
    default:
      return raw;
  }
};

const periodToMonths = (period: string) => {
  switch (period) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'half_yearly':
      return 6;
    case 'annual':
      return 12;
    default:
      return 0;
  }
};

export function computeNextDueDate(
  formula: DueDateFormulaInput,
  calcType: string | null | undefined,
  periodicity: string | null | undefined,
  referenceDate: Date
): Date | null {
  const normalizedPeriod = normalizePeriodicity(periodicity);
  if (['one_time', 'event_based', 'event'].includes(normalizedPeriod)) {
    return null;
  }

  const formulas = parseFormulaInput(formula);
  if (formulas.length > 1) {
    const allFixed = formulas.every(f => normalizeType(extractCalcType(f, calcType), f) === 'fixed');
    if (allFixed) {
      const candidates: Date[] = [];
      const startYear = referenceDate.getFullYear();
      for (const year of [startYear, startYear + 1]) {
        const baseDate = new Date(year, 0, 1);
        for (const entry of formulas) {
          candidates.push(
            computeSingleDueDate(entry, extractCalcType(entry, calcType), baseDate)
          );
        }
      }
      const future = candidates
        .filter(date => date.getTime() > referenceDate.getTime())
        .sort((a, b) => a.getTime() - b.getTime());
      return future[0] || null;
    }
  }

  const normalizedType = normalizeType(calcType || undefined, formulas[0] || undefined);
  if (normalizedType === 'event') {
    return null;
  }

  const stepMonths = periodToMonths(normalizedPeriod);
  let baseDate = addDays(referenceDate, 1);

  for (let i = 0; i < 12; i += 1) {
    const candidate = computeDueDateFromFormula(formula, calcType, baseDate);
    if (candidate.getTime() > referenceDate.getTime()) {
      return candidate;
    }

    if (stepMonths > 0) {
      baseDate = addMonthsSafe(baseDate, stepMonths);
    } else {
      baseDate = addDays(baseDate, 1);
    }
  }

  return null;
}
