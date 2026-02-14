/**
 * SEED COMPLIANCE BLUEPRINTS
 *
 * Seeds the database with comprehensive Indian compliance service blueprints:
 * - GST Compliances (GSTR-1, GSTR-3B, GSTR-9, etc.)
 * - Income Tax Compliances (ITR, TDS, Advance Tax)
 * - ROC Compliances (AOC-4, MGT-7, etc.)
 * - Labor Law Compliances (PF, ESI, Professional Tax)
 * - Other Statutory Compliances
 *
 * Run with: npx tsx scripts/seed-compliance-blueprints.ts
 */

import { db } from '../server/db';
import { eq } from 'drizzle-orm';
import {
  serviceBlueprints,
  blueprintWorkflowSteps,
  blueprintPricingTiers,
  blueprintDocumentTypes,
  blueprintComplianceRules,
  jurisdictions,
  holidayCalendars,
  deadlineFormulas,
  penaltyRulesMaster,
} from '../shared/blueprints-schema';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function seedJurisdictions() {
  console.log('📍 Seeding jurisdictions...');

  const jurisdictionData = [
    // Country
    { code: 'IN', name: 'India', level: 'COUNTRY', gstStateCode: null, timezone: 'Asia/Kolkata' },

    // States with GST codes
    { code: 'IN-AP', name: 'Andhra Pradesh', level: 'STATE', gstStateCode: '37', parentCode: 'IN' },
    { code: 'IN-AR', name: 'Arunachal Pradesh', level: 'STATE', gstStateCode: '12', parentCode: 'IN' },
    { code: 'IN-AS', name: 'Assam', level: 'STATE', gstStateCode: '18', parentCode: 'IN' },
    { code: 'IN-BR', name: 'Bihar', level: 'STATE', gstStateCode: '10', parentCode: 'IN' },
    { code: 'IN-CG', name: 'Chhattisgarh', level: 'STATE', gstStateCode: '22', parentCode: 'IN' },
    { code: 'IN-GA', name: 'Goa', level: 'STATE', gstStateCode: '30', parentCode: 'IN' },
    { code: 'IN-GJ', name: 'Gujarat', level: 'STATE', gstStateCode: '24', parentCode: 'IN' },
    { code: 'IN-HR', name: 'Haryana', level: 'STATE', gstStateCode: '06', parentCode: 'IN' },
    { code: 'IN-HP', name: 'Himachal Pradesh', level: 'STATE', gstStateCode: '02', parentCode: 'IN' },
    { code: 'IN-JH', name: 'Jharkhand', level: 'STATE', gstStateCode: '20', parentCode: 'IN' },
    { code: 'IN-KA', name: 'Karnataka', level: 'STATE', gstStateCode: '29', parentCode: 'IN' },
    { code: 'IN-KL', name: 'Kerala', level: 'STATE', gstStateCode: '32', parentCode: 'IN' },
    { code: 'IN-MP', name: 'Madhya Pradesh', level: 'STATE', gstStateCode: '23', parentCode: 'IN' },
    { code: 'IN-MH', name: 'Maharashtra', level: 'STATE', gstStateCode: '27', parentCode: 'IN' },
    { code: 'IN-MN', name: 'Manipur', level: 'STATE', gstStateCode: '14', parentCode: 'IN' },
    { code: 'IN-ML', name: 'Meghalaya', level: 'STATE', gstStateCode: '17', parentCode: 'IN' },
    { code: 'IN-MZ', name: 'Mizoram', level: 'STATE', gstStateCode: '15', parentCode: 'IN' },
    { code: 'IN-NL', name: 'Nagaland', level: 'STATE', gstStateCode: '13', parentCode: 'IN' },
    { code: 'IN-OR', name: 'Odisha', level: 'STATE', gstStateCode: '21', parentCode: 'IN' },
    { code: 'IN-PB', name: 'Punjab', level: 'STATE', gstStateCode: '03', parentCode: 'IN' },
    { code: 'IN-RJ', name: 'Rajasthan', level: 'STATE', gstStateCode: '08', parentCode: 'IN' },
    { code: 'IN-SK', name: 'Sikkim', level: 'STATE', gstStateCode: '11', parentCode: 'IN' },
    { code: 'IN-TN', name: 'Tamil Nadu', level: 'STATE', gstStateCode: '33', parentCode: 'IN' },
    { code: 'IN-TS', name: 'Telangana', level: 'STATE', gstStateCode: '36', parentCode: 'IN' },
    { code: 'IN-TR', name: 'Tripura', level: 'STATE', gstStateCode: '16', parentCode: 'IN' },
    { code: 'IN-UP', name: 'Uttar Pradesh', level: 'STATE', gstStateCode: '09', parentCode: 'IN' },
    { code: 'IN-UK', name: 'Uttarakhand', level: 'STATE', gstStateCode: '05', parentCode: 'IN' },
    { code: 'IN-WB', name: 'West Bengal', level: 'STATE', gstStateCode: '19', parentCode: 'IN' },

    // Union Territories
    { code: 'IN-AN', name: 'Andaman and Nicobar Islands', level: 'STATE', gstStateCode: '35', parentCode: 'IN' },
    { code: 'IN-CH', name: 'Chandigarh', level: 'STATE', gstStateCode: '04', parentCode: 'IN' },
    { code: 'IN-DL', name: 'Delhi', level: 'STATE', gstStateCode: '07', parentCode: 'IN' },
    { code: 'IN-DN', name: 'Dadra and Nagar Haveli and Daman and Diu', level: 'STATE', gstStateCode: '26', parentCode: 'IN' },
    { code: 'IN-JK', name: 'Jammu and Kashmir', level: 'STATE', gstStateCode: '01', parentCode: 'IN' },
    { code: 'IN-LA', name: 'Ladakh', level: 'STATE', gstStateCode: '38', parentCode: 'IN' },
    { code: 'IN-LD', name: 'Lakshadweep', level: 'STATE', gstStateCode: '31', parentCode: 'IN' },
    { code: 'IN-PY', name: 'Puducherry', level: 'STATE', gstStateCode: '34', parentCode: 'IN' },
  ];

  // First insert India
  const india = jurisdictionData.find(j => j.code === 'IN')!;
  await db.insert(jurisdictions).values({
    code: india.code,
    name: india.name,
    level: india.level,
    timezone: india.timezone,
    defaultCurrency: 'INR',
  }).onConflictDoNothing();

  // Get India's ID
  const [indiaRecord] = await db.select().from(jurisdictions).where(eq(jurisdictions.code, 'IN'));

  // Insert states
  for (const state of jurisdictionData.filter(j => j.level === 'STATE')) {
    await db.insert(jurisdictions).values({
      code: state.code,
      name: state.name,
      level: state.level,
      gstStateCode: state.gstStateCode,
      parentId: indiaRecord?.id,
      timezone: 'Asia/Kolkata',
      defaultCurrency: 'INR',
    }).onConflictDoNothing();
  }

  console.log(`✅ Seeded ${jurisdictionData.length} jurisdictions`);
}

async function seedHolidays2024_2025() {
  console.log('📅 Seeding holidays for 2024-2025...');

  const holidays2024 = [
    { date: '2024-01-26', name: 'Republic Day', type: 'NATIONAL' },
    { date: '2024-03-08', name: 'Maha Shivaratri', type: 'BANK' },
    { date: '2024-03-25', name: 'Holi', type: 'NATIONAL' },
    { date: '2024-03-29', name: 'Good Friday', type: 'BANK' },
    { date: '2024-04-11', name: 'Id-ul-Fitr', type: 'BANK' },
    { date: '2024-04-14', name: 'Dr. Ambedkar Jayanti', type: 'BANK' },
    { date: '2024-04-17', name: 'Ram Navami', type: 'BANK' },
    { date: '2024-04-21', name: 'Mahavir Jayanti', type: 'BANK' },
    { date: '2024-05-23', name: 'Buddha Purnima', type: 'BANK' },
    { date: '2024-06-17', name: 'Id-ul-Zuha (Bakrid)', type: 'BANK' },
    { date: '2024-07-17', name: 'Muharram', type: 'BANK' },
    { date: '2024-08-15', name: 'Independence Day', type: 'NATIONAL' },
    { date: '2024-08-26', name: 'Janmashtami', type: 'BANK' },
    { date: '2024-09-16', name: 'Milad un-Nabi', type: 'BANK' },
    { date: '2024-10-02', name: 'Gandhi Jayanti', type: 'NATIONAL' },
    { date: '2024-10-12', name: 'Dussehra', type: 'BANK' },
    { date: '2024-10-31', name: 'Diwali (Lakshmi Puja)', type: 'BANK' },
    { date: '2024-11-01', name: 'Diwali Holiday', type: 'BANK' },
    { date: '2024-11-15', name: 'Guru Nanak Jayanti', type: 'BANK' },
    { date: '2024-12-25', name: 'Christmas', type: 'NATIONAL' },
  ];

  const holidays2025 = [
    { date: '2025-01-26', name: 'Republic Day', type: 'NATIONAL' },
    { date: '2025-02-26', name: 'Maha Shivaratri', type: 'BANK' },
    { date: '2025-03-14', name: 'Holi', type: 'NATIONAL' },
    { date: '2025-03-31', name: 'Id-ul-Fitr', type: 'BANK' },
    { date: '2025-04-06', name: 'Ram Navami', type: 'BANK' },
    { date: '2025-04-10', name: 'Mahavir Jayanti', type: 'BANK' },
    { date: '2025-04-14', name: 'Dr. Ambedkar Jayanti', type: 'BANK' },
    { date: '2025-04-18', name: 'Good Friday', type: 'BANK' },
    { date: '2025-05-12', name: 'Buddha Purnima', type: 'BANK' },
    { date: '2025-06-07', name: 'Id-ul-Zuha (Bakrid)', type: 'BANK' },
    { date: '2025-07-06', name: 'Muharram', type: 'BANK' },
    { date: '2025-08-15', name: 'Independence Day', type: 'NATIONAL' },
    { date: '2025-08-16', name: 'Janmashtami', type: 'BANK' },
    { date: '2025-09-05', name: 'Milad un-Nabi', type: 'BANK' },
    { date: '2025-10-02', name: 'Gandhi Jayanti/Dussehra', type: 'NATIONAL' },
    { date: '2025-10-20', name: 'Diwali', type: 'BANK' },
    { date: '2025-10-21', name: 'Diwali Holiday', type: 'BANK' },
    { date: '2025-11-05', name: 'Guru Nanak Jayanti', type: 'BANK' },
    { date: '2025-12-25', name: 'Christmas', type: 'NATIONAL' },
  ];

  await db.insert(holidayCalendars).values([
    { year: 2024, holidays: holidays2024, calendarType: 'BANK' },
    { year: 2025, holidays: holidays2025, calendarType: 'BANK' },
  ]).onConflictDoNothing();

  console.log('✅ Seeded holidays for 2024 and 2025');
}

async function seedDeadlineFormulas() {
  console.log('📐 Seeding deadline formulas...');

  const formulas = [
    {
      code: 'MONTH_END_PLUS_11',
      name: 'Month End + 11 Days (GSTR-1 Quarterly)',
      description: 'Due on 11th of month following the quarter end',
      baseDateType: 'QUARTER_END',
      offsetDays: 11,
      adjustmentRule: 'NEXT_WORKING_DAY',
      applicablePeriods: ['QUARTERLY'],
      exampleCalculation: 'For Q1 (Apr-Jun): Quarter End (30-Jun) + 11 days = 11-Jul',
    },
    {
      code: 'MONTH_END_PLUS_13',
      name: 'Month End + 13 Days (GSTR-1 Monthly)',
      description: 'Due on 13th of following month',
      baseDateType: 'MONTH_END',
      offsetDays: 13,
      adjustmentRule: 'NEXT_WORKING_DAY',
      applicablePeriods: ['MONTHLY'],
      exampleCalculation: 'For March: Month End (31-Mar) + 13 days = 13-Apr',
    },
    {
      code: 'MONTH_END_PLUS_20',
      name: 'Month End + 20 Days (GSTR-3B)',
      description: 'Due on 20th of following month',
      baseDateType: 'MONTH_END',
      offsetDays: 20,
      adjustmentRule: 'NEXT_WORKING_DAY',
      applicablePeriods: ['MONTHLY'],
      exampleCalculation: 'For March: Month End (31-Mar) + 20 days = 20-Apr',
    },
    {
      code: 'MONTH_END_PLUS_22',
      name: 'Month End + 22 Days (GSTR-3B Quarterly)',
      description: 'Due on 22nd of month following quarter',
      baseDateType: 'QUARTER_END',
      offsetDays: 22,
      adjustmentRule: 'NEXT_WORKING_DAY',
      applicablePeriods: ['QUARTERLY'],
      exampleCalculation: 'For Q1: Quarter End (30-Jun) + 22 days = 22-Jul',
    },
    {
      code: 'FY_END_PLUS_6M',
      name: 'FY End + 6 Months (ITR Non-Audit)',
      description: 'Due on 31st July following FY end',
      baseDateType: 'FY_END',
      offsetMonths: 4,
      adjustmentRule: 'NONE',
      applicablePeriods: ['ANNUAL'],
      exampleCalculation: 'For FY 2024-25: FY End (31-Mar-25) + 4 months = 31-Jul-25',
    },
    {
      code: 'FY_END_PLUS_7M',
      name: 'FY End + 7 Months (ITR Audit)',
      description: 'Due on 31st October following FY end',
      baseDateType: 'FY_END',
      offsetMonths: 7,
      adjustmentRule: 'NONE',
      applicablePeriods: ['ANNUAL'],
      exampleCalculation: 'For FY 2024-25: FY End (31-Mar-25) + 7 months = 31-Oct-25',
    },
    {
      code: 'FY_END_PLUS_9M',
      name: 'FY End + 9 Months (AOC-4)',
      description: 'Due within 30 days of AGM or 9 months from FY end',
      baseDateType: 'FY_END',
      offsetMonths: 9,
      adjustmentRule: 'NONE',
      applicablePeriods: ['ANNUAL'],
      exampleCalculation: 'For FY 2024-25: FY End (31-Mar-25) + 9 months = 31-Dec-25',
    },
    {
      code: 'QUARTER_END_PLUS_7',
      name: 'Quarter End + 7 Days (TDS Return)',
      description: 'TDS return due on 7th of month following quarter',
      baseDateType: 'QUARTER_END',
      offsetDays: 7,
      adjustmentRule: 'NEXT_WORKING_DAY',
      applicablePeriods: ['QUARTERLY'],
      exampleCalculation: 'For Q1 (Apr-Jun): Quarter End (30-Jun) + 7 days = 7-Jul',
    },
    {
      code: 'ADVANCE_TAX_15TH',
      name: 'Advance Tax Due (15th)',
      description: 'Advance tax due on 15th of Jun/Sep/Dec/Mar',
      baseDateType: 'PERIOD_END',
      offsetDays: 15,
      adjustmentRule: 'NONE',
      applicablePeriods: ['QUARTERLY'],
      exampleCalculation: 'For Q1 installment: 15-Jun, Q2: 15-Sep, Q3: 15-Dec, Q4: 15-Mar',
    },
  ];

  for (const formula of formulas) {
    await db.insert(deadlineFormulas).values(formula).onConflictDoNothing();
  }

  console.log(`✅ Seeded ${formulas.length} deadline formulas`);
}

async function seedPenaltyRules() {
  console.log('💰 Seeding penalty rules...');

  const rules = [
    {
      code: 'GST_LATE_FEE_3B',
      name: 'GSTR-3B Late Fee',
      description: 'Late fee for GSTR-3B filing',
      category: 'GST',
      penaltyType: 'DAILY',
      dailyAmount: '50.00',
      maxPenalty: '10000.00',
      legalSection: 'Section 47 of CGST Act',
    },
    {
      code: 'GST_LATE_FEE_NIL',
      name: 'GSTR-3B Late Fee (Nil Return)',
      description: 'Late fee for nil GSTR-3B filing',
      category: 'GST',
      penaltyType: 'DAILY',
      dailyAmount: '20.00',
      maxPenalty: '500.00',
      legalSection: 'Section 47 of CGST Act',
    },
    {
      code: 'GST_INTEREST',
      name: 'GST Interest on Tax',
      description: 'Interest on delayed tax payment',
      category: 'GST',
      penaltyType: 'INTEREST',
      interestRateAnnual: '18.00',
      legalSection: 'Section 50 of CGST Act',
    },
    {
      code: 'TDS_LATE_FEE',
      name: 'TDS Late Filing Fee',
      description: 'Fee for late filing of TDS return',
      category: 'INCOME_TAX',
      penaltyType: 'DAILY',
      dailyAmount: '200.00',
      maxPenalty: null,
      legalSection: 'Section 234E of Income Tax Act',
    },
    {
      code: 'TDS_INTEREST_DEDUCTION',
      name: 'TDS Interest - Late Deduction',
      description: 'Interest for not deducting TDS',
      category: 'INCOME_TAX',
      penaltyType: 'INTEREST',
      interestRateAnnual: '12.00',
      legalSection: 'Section 201(1A)(i) of Income Tax Act',
    },
    {
      code: 'TDS_INTEREST_PAYMENT',
      name: 'TDS Interest - Late Payment',
      description: 'Interest for late payment of TDS',
      category: 'INCOME_TAX',
      penaltyType: 'INTEREST',
      interestRateAnnual: '18.00',
      legalSection: 'Section 201(1A)(ii) of Income Tax Act',
    },
    {
      code: 'ITR_LATE_FEE',
      name: 'ITR Late Filing Fee',
      description: 'Fee for late filing of ITR',
      category: 'INCOME_TAX',
      penaltyType: 'SLAB',
      slabs: [
        { fromDays: 1, toDays: 90, amountPerDay: 0, type: 'FIXED', amount: 1000 },
        { fromDays: 91, toDays: 365, amountPerDay: 0, type: 'FIXED', amount: 5000 },
        { fromDays: 366, toDays: 9999, amountPerDay: 0, type: 'FIXED', amount: 10000 },
      ],
      maxPenalty: '10000.00',
      legalSection: 'Section 234F of Income Tax Act',
    },
    {
      code: 'ADVANCE_TAX_INTEREST',
      name: 'Advance Tax Interest',
      description: 'Interest for shortfall in advance tax',
      category: 'INCOME_TAX',
      penaltyType: 'INTEREST',
      interestRateAnnual: '12.00',
      legalSection: 'Section 234B/234C of Income Tax Act',
    },
    {
      code: 'ROC_LATE_FEE',
      name: 'ROC Late Filing Additional Fee',
      description: 'Additional fee for late ROC filing',
      category: 'ROC',
      penaltyType: 'SLAB',
      slabs: [
        { fromDays: 1, toDays: 30, amountPerDay: 100 },
        { fromDays: 31, toDays: 60, amountPerDay: 200 },
        { fromDays: 61, toDays: 90, amountPerDay: 400 },
        { fromDays: 91, toDays: 180, amountPerDay: 500 },
        { fromDays: 181, toDays: 270, amountPerDay: 700 },
        { fromDays: 271, toDays: 9999, amountPerDay: 800 },
      ],
      legalSection: 'Companies (Registration Offices and Fees) Rules',
    },
  ];

  for (const rule of rules) {
    await db.insert(penaltyRulesMaster).values(rule).onConflictDoNothing();
  }

  console.log(`✅ Seeded ${rules.length} penalty rules`);
}

// ============================================================================
// GST BLUEPRINTS
// ============================================================================

async function seedGSTBlueprints() {
  console.log('🧾 Seeding GST blueprints...');

  const gstBlueprints = [
    // GSTR-1 Monthly
    {
      code: 'GSTR1_MONTHLY',
      name: 'GSTR-1 Monthly Return',
      shortName: 'GSTR-1',
      description: 'Statement of outward supplies for taxpayers with turnover > Rs. 5 Crore',
      category: 'TAX',
      subcategory: 'GST',
      serviceType: 'RECURRING',
      frequency: 'MONTHLY',
      governingAct: 'Central Goods and Services Tax Act, 2017',
      sectionReference: 'Section 37',
      formNumber: 'GSTR-1',
      filingPortal: 'https://www.gst.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'proprietorship', 'public_limited'],
      defaultSlaHours: 48,
      basePricing: { standard: 999, urgent: 1499, nil: 499 },
      pricingModel: 'TIERED',
    },
    // GSTR-3B Monthly
    {
      code: 'GSTR3B_MONTHLY',
      name: 'GSTR-3B Monthly Return',
      shortName: 'GSTR-3B',
      description: 'Summary return with self-assessed tax payment',
      category: 'TAX',
      subcategory: 'GST',
      serviceType: 'RECURRING',
      frequency: 'MONTHLY',
      governingAct: 'Central Goods and Services Tax Act, 2017',
      sectionReference: 'Section 39(1)',
      formNumber: 'GSTR-3B',
      filingPortal: 'https://www.gst.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'proprietorship', 'public_limited'],
      defaultSlaHours: 24,
      basePricing: { standard: 799, urgent: 1199, nil: 399 },
      pricingModel: 'TIERED',
    },
    // GSTR-9 Annual
    {
      code: 'GSTR9_ANNUAL',
      name: 'GSTR-9 Annual Return',
      shortName: 'GSTR-9',
      description: 'Annual return for regular taxpayers',
      category: 'TAX',
      subcategory: 'GST',
      serviceType: 'RECURRING',
      frequency: 'ANNUAL',
      governingAct: 'Central Goods and Services Tax Act, 2017',
      sectionReference: 'Section 44',
      formNumber: 'GSTR-9',
      filingPortal: 'https://www.gst.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'proprietorship', 'public_limited'],
      defaultSlaHours: 120,
      basePricing: { standard: 4999, urgent: 7499, basic: 2999 },
      pricingModel: 'TIERED',
    },
    // GSTR-9C Audit
    {
      code: 'GSTR9C_AUDIT',
      name: 'GSTR-9C Reconciliation Statement',
      shortName: 'GSTR-9C',
      description: 'GST audit certification for turnover > Rs. 5 Crore',
      category: 'TAX',
      subcategory: 'GST',
      serviceType: 'RECURRING',
      frequency: 'ANNUAL',
      governingAct: 'Central Goods and Services Tax Act, 2017',
      sectionReference: 'Section 35(5)',
      formNumber: 'GSTR-9C',
      filingPortal: 'https://www.gst.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'public_limited'],
      defaultSlaHours: 240,
      basePricing: { standard: 14999, premium: 24999 },
      pricingModel: 'TIERED',
    },
  ];

  for (const bp of gstBlueprints) {
    const [blueprint] = await db.insert(serviceBlueprints).values({
      ...bp,
      workflowDefinition: { steps: [], transitions: [] },
      status: 'ACTIVE',
      isActive: true,
      isSystemDefault: true,
    }).returning();

    // Add workflow steps
    const steps = [
      { stepCode: 'DATA_COLLECTION', stepName: 'Collect Sales & Purchase Data', stepType: 'DOCUMENT_COLLECTION', slaHours: 24, sortOrder: 1 },
      { stepCode: 'RECONCILIATION', stepName: 'Reconcile with Books', stepType: 'TASK', slaHours: 12, sortOrder: 2 },
      { stepCode: 'PREPARATION', stepName: 'Prepare Return', stepType: 'TASK', slaHours: 8, sortOrder: 3 },
      { stepCode: 'REVIEW', stepName: 'Senior Review', stepType: 'APPROVAL', slaHours: 4, sortOrder: 4 },
      { stepCode: 'CLIENT_APPROVAL', stepName: 'Client Approval', stepType: 'CLIENT_ACTION', slaHours: 12, sortOrder: 5 },
      { stepCode: 'FILING', stepName: 'File on GST Portal', stepType: 'GOVERNMENT_FILING', slaHours: 2, sortOrder: 6 },
      { stepCode: 'ACKNOWLEDGMENT', stepName: 'Save Acknowledgment', stepType: 'TASK', slaHours: 1, sortOrder: 7 },
    ];

    for (const step of steps) {
      await db.insert(blueprintWorkflowSteps).values({
        blueprintId: blueprint.id,
        ...step,
        defaultAssigneeRole: step.stepType === 'CLIENT_ACTION' ? 'CLIENT' : 'ACCOUNTANT',
        isClientVisible: true,
      });
    }

    // Add compliance rules
    if (bp.code === 'GSTR3B_MONTHLY') {
      await db.insert(blueprintComplianceRules).values({
        blueprintId: blueprint.id,
        ruleCode: 'GSTR3B_DEADLINE',
        ruleName: 'GSTR-3B Monthly Deadline',
        ruleType: 'DEADLINE',
        baseDateType: 'MONTH_END',
        offsetDays: 20,
        adjustmentRule: 'NEXT_WORKING_DAY',
        penaltyType: 'MIXED',
        dailyAmount: '50.00',
        interestRateAnnual: '18.00',
        maxPenalty: '10000.00',
        notificationDaysBefore: [15, 7, 3, 1],
        legalReference: 'Section 39(1) read with Section 47 and Section 50 of CGST Act',
      });
    }

    if (bp.code === 'GSTR1_MONTHLY') {
      await db.insert(blueprintComplianceRules).values({
        blueprintId: blueprint.id,
        ruleCode: 'GSTR1_DEADLINE',
        ruleName: 'GSTR-1 Monthly Deadline',
        ruleType: 'DEADLINE',
        baseDateType: 'MONTH_END',
        offsetDays: 11,
        adjustmentRule: 'NEXT_WORKING_DAY',
        penaltyType: 'DAILY',
        dailyAmount: '50.00',
        maxPenalty: '10000.00',
        notificationDaysBefore: [10, 5, 2, 1],
        legalReference: 'Section 37 read with Section 47 of CGST Act',
      });
    }

    // Add pricing tiers
    await db.insert(blueprintPricingTiers).values([
      {
        blueprintId: blueprint.id,
        tierCode: 'BASIC',
        tierName: 'Basic (Nil Return)',
        basePrice: String((bp.basePricing as any).nil || (bp.basePricing as any).basic || 499),
        criteria: { is_nil_return: true },
        includedFeatures: ['Filing', 'Acknowledgment'],
        sortOrder: 1,
      },
      {
        blueprintId: blueprint.id,
        tierCode: 'STANDARD',
        tierName: 'Standard',
        basePrice: String((bp.basePricing as any).standard),
        criteria: { turnover_max: 50000000 },
        includedFeatures: ['Data Entry', 'Reconciliation', 'Filing', 'Follow-up'],
        sortOrder: 2,
      },
      {
        blueprintId: blueprint.id,
        tierCode: 'PREMIUM',
        tierName: 'Premium (High Volume)',
        basePrice: String((bp.basePricing as any).urgent || (bp.basePricing as any).premium || 1999),
        criteria: { turnover_min: 50000000 },
        includedFeatures: ['Priority Processing', 'Dedicated Support', 'All Standard Features'],
        sortOrder: 3,
      },
    ]);

    // Add required documents
    const docs = [
      { documentCode: 'SALES_REGISTER', documentName: 'Sales Register', category: 'FINANCIAL', isMandatory: true },
      { documentCode: 'PURCHASE_REGISTER', documentName: 'Purchase Register', category: 'FINANCIAL', isMandatory: true },
      { documentCode: 'ITC_DETAILS', documentName: 'ITC Claim Details', category: 'TAX', isMandatory: false },
      { documentCode: 'BANK_STATEMENT', documentName: 'Bank Statement', category: 'FINANCIAL', isMandatory: false },
    ];

    for (const doc of docs) {
      await db.insert(blueprintDocumentTypes).values({
        blueprintId: blueprint.id,
        ...doc,
        acceptedFormats: ['pdf', 'xlsx', 'csv'],
        maxSizeMb: 10,
      });
    }

    console.log(`  ✓ Created ${bp.code}`);
  }

  console.log('✅ Seeded GST blueprints');
}

// ============================================================================
// INCOME TAX BLUEPRINTS
// ============================================================================

async function seedIncomeTaxBlueprints() {
  console.log('📊 Seeding Income Tax blueprints...');

  const itBlueprints = [
    {
      code: 'ITR_INDIVIDUAL',
      name: 'Income Tax Return - Individual',
      shortName: 'ITR',
      description: 'Annual income tax return for individuals',
      category: 'TAX',
      subcategory: 'INCOME_TAX',
      serviceType: 'RECURRING',
      frequency: 'ANNUAL',
      governingAct: 'Income Tax Act, 1961',
      sectionReference: 'Section 139',
      formNumber: 'ITR-1/2/3',
      filingPortal: 'https://www.incometax.gov.in',
      applicableEntityTypes: ['individual', 'huf'],
      defaultSlaHours: 72,
      basePricing: { basic: 999, standard: 1999, complex: 4999 },
    },
    {
      code: 'ITR_COMPANY',
      name: 'Income Tax Return - Company',
      shortName: 'ITR-6',
      description: 'Annual income tax return for companies',
      category: 'TAX',
      subcategory: 'INCOME_TAX',
      serviceType: 'RECURRING',
      frequency: 'ANNUAL',
      governingAct: 'Income Tax Act, 1961',
      sectionReference: 'Section 139',
      formNumber: 'ITR-6',
      filingPortal: 'https://www.incometax.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'public_limited', 'opc'],
      defaultSlaHours: 120,
      basePricing: { standard: 4999, premium: 9999 },
    },
    {
      code: 'TDS_RETURN_24Q',
      name: 'TDS Return - Salary (24Q)',
      shortName: 'Form 24Q',
      description: 'Quarterly TDS return for salary deductions',
      category: 'TAX',
      subcategory: 'TDS',
      serviceType: 'RECURRING',
      frequency: 'QUARTERLY',
      governingAct: 'Income Tax Act, 1961',
      sectionReference: 'Section 200(3)',
      formNumber: '24Q',
      filingPortal: 'https://www.tdscpc.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'public_limited'],
      defaultSlaHours: 48,
      basePricing: { standard: 1499, premium: 2499 },
    },
    {
      code: 'TDS_RETURN_26Q',
      name: 'TDS Return - Non-Salary (26Q)',
      shortName: 'Form 26Q',
      description: 'Quarterly TDS return for non-salary deductions',
      category: 'TAX',
      subcategory: 'TDS',
      serviceType: 'RECURRING',
      frequency: 'QUARTERLY',
      governingAct: 'Income Tax Act, 1961',
      sectionReference: 'Section 200(3)',
      formNumber: '26Q',
      filingPortal: 'https://www.tdscpc.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'public_limited'],
      defaultSlaHours: 48,
      basePricing: { standard: 1499, premium: 2499 },
    },
    {
      code: 'ADVANCE_TAX',
      name: 'Advance Tax Payment',
      shortName: 'Advance Tax',
      description: 'Quarterly advance tax calculation and payment',
      category: 'TAX',
      subcategory: 'INCOME_TAX',
      serviceType: 'RECURRING',
      frequency: 'QUARTERLY',
      governingAct: 'Income Tax Act, 1961',
      sectionReference: 'Section 208-211',
      filingPortal: 'https://www.incometax.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'public_limited', 'individual'],
      defaultSlaHours: 24,
      basePricing: { standard: 999, premium: 1999 },
    },
  ];

  for (const bp of itBlueprints) {
    const [blueprint] = await db.insert(serviceBlueprints).values({
      ...bp,
      workflowDefinition: { steps: [], transitions: [] },
      status: 'ACTIVE',
      isActive: true,
      isSystemDefault: true,
    }).returning();

    // Add basic workflow steps
    const steps = [
      { stepCode: 'DATA_COLLECTION', stepName: 'Gather Financial Data', stepType: 'DOCUMENT_COLLECTION', slaHours: 24, sortOrder: 1 },
      { stepCode: 'COMPUTATION', stepName: 'Compute Tax Liability', stepType: 'TASK', slaHours: 12, sortOrder: 2 },
      { stepCode: 'REVIEW', stepName: 'Review & Verification', stepType: 'APPROVAL', slaHours: 4, sortOrder: 3 },
      { stepCode: 'FILING', stepName: 'File Return', stepType: 'GOVERNMENT_FILING', slaHours: 2, sortOrder: 4 },
    ];

    for (const step of steps) {
      await db.insert(blueprintWorkflowSteps).values({
        blueprintId: blueprint.id,
        ...step,
        defaultAssigneeRole: 'TAX_CONSULTANT',
        isClientVisible: true,
      });
    }

    console.log(`  ✓ Created ${bp.code}`);
  }

  console.log('✅ Seeded Income Tax blueprints');
}

// ============================================================================
// ROC BLUEPRINTS
// ============================================================================

async function seedROCBlueprints() {
  console.log('🏛️ Seeding ROC blueprints...');

  const rocBlueprints = [
    {
      code: 'AOC4_ANNUAL',
      name: 'AOC-4 Financial Statements',
      shortName: 'AOC-4',
      description: 'Filing of financial statements with ROC',
      category: 'COMPLIANCE',
      subcategory: 'ROC',
      serviceType: 'RECURRING',
      frequency: 'ANNUAL',
      governingAct: 'Companies Act, 2013',
      sectionReference: 'Section 137',
      formNumber: 'AOC-4',
      filingPortal: 'https://www.mca.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'public_limited', 'opc'],
      defaultSlaHours: 120,
      basePricing: { standard: 2999, premium: 4999 },
    },
    {
      code: 'MGT7_ANNUAL',
      name: 'MGT-7 Annual Return',
      shortName: 'MGT-7',
      description: 'Annual return filing with ROC',
      category: 'COMPLIANCE',
      subcategory: 'ROC',
      serviceType: 'RECURRING',
      frequency: 'ANNUAL',
      governingAct: 'Companies Act, 2013',
      sectionReference: 'Section 92',
      formNumber: 'MGT-7',
      filingPortal: 'https://www.mca.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'public_limited', 'opc'],
      defaultSlaHours: 96,
      basePricing: { standard: 2499, premium: 3999 },
    },
    {
      code: 'DIR3_KYC',
      name: 'DIR-3 KYC',
      shortName: 'DIR-3 KYC',
      description: 'Annual KYC update for directors',
      category: 'COMPLIANCE',
      subcategory: 'ROC',
      serviceType: 'RECURRING',
      frequency: 'ANNUAL',
      governingAct: 'Companies Act, 2013',
      formNumber: 'DIR-3 KYC',
      filingPortal: 'https://www.mca.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'public_limited', 'opc', 'llp'],
      defaultSlaHours: 48,
      basePricing: { perDirector: 499 },
    },
    {
      code: 'LLP_FORM11',
      name: 'LLP Form 11 Annual Return',
      shortName: 'Form 11',
      description: 'Annual return for LLPs',
      category: 'COMPLIANCE',
      subcategory: 'ROC',
      serviceType: 'RECURRING',
      frequency: 'ANNUAL',
      governingAct: 'Limited Liability Partnership Act, 2008',
      sectionReference: 'Section 34(1)',
      formNumber: 'Form 11',
      filingPortal: 'https://www.mca.gov.in',
      applicableEntityTypes: ['llp'],
      defaultSlaHours: 72,
      basePricing: { standard: 1999, premium: 2999 },
    },
    {
      code: 'LLP_FORM8',
      name: 'LLP Form 8 Statement of Account',
      shortName: 'Form 8',
      description: 'Statement of Account and Solvency for LLPs',
      category: 'COMPLIANCE',
      subcategory: 'ROC',
      serviceType: 'RECURRING',
      frequency: 'ANNUAL',
      governingAct: 'Limited Liability Partnership Act, 2008',
      sectionReference: 'Section 34(2)',
      formNumber: 'Form 8',
      filingPortal: 'https://www.mca.gov.in',
      applicableEntityTypes: ['llp'],
      defaultSlaHours: 72,
      basePricing: { standard: 1999, premium: 2999 },
    },
  ];

  for (const bp of rocBlueprints) {
    const [_blueprint] = await db.insert(serviceBlueprints).values({
      ...bp,
      workflowDefinition: { steps: [], transitions: [] },
      status: 'ACTIVE',
      isActive: true,
      isSystemDefault: true,
    }).returning();

    console.log(`  ✓ Created ${bp.code}`);
  }

  console.log('✅ Seeded ROC blueprints');
}

// ============================================================================
// LABOR LAW BLUEPRINTS
// ============================================================================

async function seedLaborLawBlueprints() {
  console.log('👷 Seeding Labor Law blueprints...');

  const laborBlueprints = [
    {
      code: 'PF_MONTHLY',
      name: 'PF Monthly Return',
      shortName: 'PF Return',
      description: 'Monthly PF contribution and return filing',
      category: 'LABOR',
      subcategory: 'PF',
      serviceType: 'RECURRING',
      frequency: 'MONTHLY',
      governingAct: 'Employees Provident Funds and Miscellaneous Provisions Act, 1952',
      filingPortal: 'https://unifiedportal.epfindia.gov.in',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'public_limited'],
      defaultSlaHours: 48,
      basePricing: { standard: 999, premium: 1499 },
    },
    {
      code: 'ESI_MONTHLY',
      name: 'ESI Monthly Return',
      shortName: 'ESI Return',
      description: 'Monthly ESI contribution and return filing',
      category: 'LABOR',
      subcategory: 'ESI',
      serviceType: 'RECURRING',
      frequency: 'MONTHLY',
      governingAct: 'Employees State Insurance Act, 1948',
      filingPortal: 'https://www.esic.in',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'public_limited'],
      defaultSlaHours: 48,
      basePricing: { standard: 799, premium: 1199 },
    },
    {
      code: 'PT_MONTHLY',
      name: 'Professional Tax Return',
      shortName: 'PT Return',
      description: 'Monthly/Annual Professional Tax filing (state-specific)',
      category: 'LABOR',
      subcategory: 'PROFESSIONAL_TAX',
      serviceType: 'RECURRING',
      frequency: 'MONTHLY',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'public_limited'],
      defaultSlaHours: 24,
      basePricing: { standard: 499, premium: 799 },
    },
  ];

  for (const bp of laborBlueprints) {
    const [_blueprint] = await db.insert(serviceBlueprints).values({
      ...bp,
      workflowDefinition: { steps: [], transitions: [] },
      status: 'ACTIVE',
      isActive: true,
      isSystemDefault: true,
    }).returning();

    console.log(`  ✓ Created ${bp.code}`);
  }

  console.log('✅ Seeded Labor Law blueprints');
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🚀 Starting compliance blueprint seeding...\n');

  try {
    await seedJurisdictions();
    await seedHolidays2024_2025();
    await seedDeadlineFormulas();
    await seedPenaltyRules();
    await seedGSTBlueprints();
    await seedIncomeTaxBlueprints();
    await seedROCBlueprints();
    await seedLaborLawBlueprints();

    console.log('\n✅ All compliance blueprints seeded successfully!');
    console.log('\nSummary:');
    console.log('  - Jurisdictions: 36+ states/UTs');
    console.log('  - Holidays: 2024-2025');
    console.log('  - Deadline Formulas: 9+');
    console.log('  - Penalty Rules: 9+');
    console.log('  - Service Blueprints: 15+');

  } catch (error) {
    console.error('❌ Error seeding blueprints:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
