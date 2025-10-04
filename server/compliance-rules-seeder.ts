/**
 * Comprehensive Compliance Rules Seeder
 * 
 * Populates the database with accurate compliance rules covering:
 * - Companies Act 2013 (ROC Filings)
 * - GST (Goods and Services Tax)
 * - Income Tax
 * - PF/ESI (Provident Fund/Employee State Insurance)
 * - Labour Laws and Professional Tax
 * 
 * Data sources: Companies Act 2013, CBDT, CBIC, EPFO, ESIC regulations (updated October 2025)
 */

import type { IStorage } from './storage';

export async function seedComplianceRules(storage: IStorage) {
  console.log('🌱 Seeding comprehensive compliance rules library...');

  const rules = [
    // ==================== COMPANIES ACT 2013 ====================
    
    {
      ruleCode: 'ROC_AOC4_ANNUAL',
      regulationCategory: 'companies_act',
      complianceName: 'AOC-4: Annual Financial Statements',
      formNumber: 'AOC-4',
      description: 'Filing of annual financial statements with Registrar of Companies',
      periodicity: 'annual',
      dueDateCalculationType: 'relative_to_fy_end',
      dueDateFormula: { type: 'fy_end', days_after: 212, reference_date: 'agm_date', max_date: '29-Oct' }, // 30 days from AGM (AGM max 30 Sept)
      applicableEntityTypes: ['pvt_ltd', 'llp', 'public_limited'],
      priorityLevel: 'critical',
      penaltyRiskLevel: 'high',
      metadata: { mca_link: 'https://www.mca.gov.in', filing_sequence: 'File after AGM, before MGT-7' }
    },

    {
      ruleCode: 'ROC_MGT7_ANNUAL',
      regulationCategory: 'companies_act',
      complianceName: 'MGT-7: Annual Return',
      formNumber: 'MGT-7',
      description: 'Filing of annual return with Registrar of Companies',
      periodicity: 'annual',
      dueDateCalculationType: 'relative_to_fy_end',
      dueDateFormula: { type: 'fy_end', days_after: 242, max_date: '28-Nov' }, // 60 days from AGM
      applicableEntityTypes: ['pvt_ltd', 'public_limited'],
      priorityLevel: 'critical',
      penaltyRiskLevel: 'high',
      metadata: { filing_sequence: 'File after AOC-4', prerequisite: 'AOC-4' }
    },

    {
      ruleCode: 'ROC_MGT7A_ANNUAL',
      regulationCategory: 'companies_act',
      complianceName: 'MGT-7A: Annual Return (OPC & Small Companies)',
      formNumber: 'MGT-7A',
      description: 'Simplified annual return for One Person Companies and Small Companies',
      periodicity: 'annual',
      dueDateCalculationType: 'relative_to_fy_end',
      dueDateFormula: { type: 'fy_end', days_after: 242, max_date: '28-Nov' },
      applicableEntityTypes: ['opc'],
      priorityLevel: 'critical',
      penaltyRiskLevel: 'high'
    },

    {
      ruleCode: 'ROC_DIR3KYC_ANNUAL',
      regulationCategory: 'companies_act',
      complianceName: 'DIR-3 KYC: Director KYC Verification',
      formNumber: 'DIR-3 KYC',
      description: 'Annual KYC verification for all directors with active DIN',
      periodicity: 'annual',
      dueDateCalculationType: 'fixed_date',
      dueDateFormula: { type: 'fixed', day: 15, month: 10 }, // 15th October (extended from 30 Sept)
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'public_limited'],
      priorityLevel: 'critical',
      penaltyRiskLevel: 'critical',
      metadata: { warning: 'DIN gets deactivated if not filed', extended_deadline: '15-Oct-2025' }
    },

    {
      ruleCode: 'ROC_ADT1_EVENT',
      regulationCategory: 'companies_act',
      complianceName: 'ADT-1: Appointment of Auditor',
      formNumber: 'ADT-1',
      description: 'Filing for appointment or re-appointment of statutory auditor',
      periodicity: 'event_based',
      dueDateCalculationType: 'event_triggered',
      dueDateFormula: { type: 'event', days_after_event: 15, trigger_event: 'agm_held' },
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'public_limited'],
      priorityLevel: 'high',
      penaltyRiskLevel: 'high'
    },

    {
      ruleCode: 'ROC_DPT3_ANNUAL',
      regulationCategory: 'companies_act',
      complianceName: 'DPT-3: Return of Deposits',
      formNumber: 'DPT-3',
      description: 'Annual return for companies accepting deposits',
      periodicity: 'annual',
      dueDateCalculationType: 'fixed_date',
      dueDateFormula: { type: 'fixed', day: 30, month: 6 },
      applicableEntityTypes: ['pvt_ltd', 'public_limited'],
      priorityLevel: 'high',
      penaltyRiskLevel: 'high'
    },

    {
      ruleCode: 'ROC_INC20A_ONETIME',
      regulationCategory: 'companies_act',
      complianceName: 'INC-20A: Commencement of Business',
      formNumber: 'INC-20A',
      description: 'Declaration for commencement of business',
      periodicity: 'one_time',
      dueDateCalculationType: 'event_triggered',
      dueDateFormula: { type: 'event', days_after_event: 180, trigger_event: 'incorporation_date' },
      applicableEntityTypes: ['pvt_ltd', 'public_limited'],
      priorityLevel: 'critical',
      penaltyRiskLevel: 'critical',
      metadata: { warning: 'Company cannot commence business until filed' }
    },

    // ==================== GST (GOODS & SERVICES TAX) ====================

    {
      ruleCode: 'GST_GSTR3B_MONTHLY',
      regulationCategory: 'gst',
      complianceName: 'GSTR-3B: Monthly Summary Return',
      formNumber: 'GSTR-3B',
      description: 'Monthly summary return with tax payment',
      periodicity: 'monthly',
      dueDateCalculationType: 'relative_to_month_end',
      dueDateFormula: { type: 'relative', day: 20, month_offset: 1 }, // 20th of next month
      turnoverThresholdMin: '500000000', // >₹5 Cr (monthly filing)
      priorityLevel: 'critical',
      penaltyRiskLevel: 'critical',
      metadata: { interest_rate: '18% p.a.', hard_lock_from: 'July 2025' }
    },

    {
      ruleCode: 'GST_GSTR3B_QUARTERLY_X',
      regulationCategory: 'gst',
      complianceName: 'GSTR-3B: Quarterly Return (Category X States)',
      formNumber: 'GSTR-3B',
      description: 'Quarterly GSTR-3B for businesses with turnover ≤₹5 Cr in Category X states',
      periodicity: 'quarterly',
      dueDateCalculationType: 'relative_to_quarter_end',
      dueDateFormula: { type: 'relative', day: 22, month_offset: 1 },
      turnoverThresholdMax: '500000000', // ≤₹5 Cr
      stateSpecific: true,
      applicableStates: ['Maharashtra', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Andhra Pradesh', 'Kerala', 'Goa', 'Madhya Pradesh', 'Chhattisgarh'],
      priorityLevel: 'critical',
      penaltyRiskLevel: 'critical',
      metadata: { scheme: 'QRMP', pmt06_required: 'Monthly tax payment via PMT-06' }
    },

    {
      ruleCode: 'GST_GSTR3B_QUARTERLY_Y',
      regulationCategory: 'gst',
      complianceName: 'GSTR-3B: Quarterly Return (Category Y States)',
      formNumber: 'GSTR-3B',
      description: 'Quarterly GSTR-3B for businesses with turnover ≤₹5 Cr in Category Y states',
      periodicity: 'quarterly',
      dueDateCalculationType: 'relative_to_quarter_end',
      dueDateFormula: { type: 'relative', day: 24, month_offset: 1 },
      turnoverThresholdMax: '500000000',
      stateSpecific: true,
      applicableStates: ['Delhi', 'Uttar Pradesh', 'Bihar', 'West Bengal', 'Odisha', 'Punjab', 'Haryana', 'Rajasthan', 'Himachal Pradesh', 'Uttarakhand', 'Jharkhand'],
      priorityLevel: 'critical',
      penaltyRiskLevel: 'critical'
    },

    {
      ruleCode: 'GST_GSTR1_MONTHLY',
      regulationCategory: 'gst',
      complianceName: 'GSTR-1: Monthly Outward Supplies',
      formNumber: 'GSTR-1',
      description: 'Details of outward supplies of goods and services',
      periodicity: 'monthly',
      dueDateCalculationType: 'relative_to_month_end',
      dueDateFormula: { type: 'relative', day: 11, month_offset: 1 },
      turnoverThresholdMin: '500000000',
      priorityLevel: 'high',
      penaltyRiskLevel: 'high'
    },

    {
      ruleCode: 'GST_GSTR1_QUARTERLY',
      regulationCategory: 'gst',
      complianceName: 'GSTR-1: Quarterly Outward Supplies',
      formNumber: 'GSTR-1',
      description: 'Quarterly details of outward supplies under QRMP scheme',
      periodicity: 'quarterly',
      dueDateCalculationType: 'relative_to_quarter_end',
      dueDateFormula: { type: 'relative', day: 13, month_offset: 1 },
      turnoverThresholdMax: '500000000',
      priorityLevel: 'high',
      penaltyRiskLevel: 'high'
    },

    {
      ruleCode: 'GST_GSTR9_ANNUAL',
      regulationCategory: 'gst',
      complianceName: 'GSTR-9: Annual Return',
      formNumber: 'GSTR-9',
      description: 'Annual consolidated return for regular taxpayers',
      periodicity: 'annual',
      dueDateCalculationType: 'fixed_date',
      dueDateFormula: { type: 'fixed', day: 31, month: 12 }, // 31st December
      turnoverThresholdMin: '20000000', // >₹2 Cr
      priorityLevel: 'high',
      penaltyRiskLevel: 'high'
    },

    {
      ruleCode: 'GST_GSTR9C_ANNUAL',
      regulationCategory: 'gst',
      complianceName: 'GSTR-9C: GST Audit Reconciliation',
      formNumber: 'GSTR-9C',
      description: 'Reconciliation statement certified by CA or CMA',
      periodicity: 'annual',
      dueDateCalculationType: 'fixed_date',
      dueDateFormula: { type: 'fixed', day: 31, month: 12 },
      turnoverThresholdMin: '500000000', // >₹5 Cr
      priorityLevel: 'high',
      penaltyRiskLevel: 'high'
    },

    // ==================== INCOME TAX ====================

    {
      ruleCode: 'ITR_INDIVIDUAL_ANNUAL',
      regulationCategory: 'income_tax',
      complianceName: 'ITR Filing: Individuals & HUFs',
      formNumber: 'ITR-1/2/3',
      description: 'Income Tax Return filing for individuals and HUFs (non-audit cases)',
      periodicity: 'annual',
      dueDateCalculationType: 'fixed_date',
      dueDateFormula: { type: 'fixed', day: 16, month: 9 }, // Extended to 16 September 2025
      applicableEntityTypes: ['proprietorship'],
      priorityLevel: 'critical',
      penaltyRiskLevel: 'high',
      metadata: { extended_deadline: '16-Sep-2025', belated_until: '31-Dec-2025' }
    },

    {
      ruleCode: 'ITR_AUDIT_ANNUAL',
      regulationCategory: 'income_tax',
      complianceName: 'ITR Filing: Tax Audit Cases',
      formNumber: 'ITR-5/6/7',
      description: 'Income Tax Return for companies and businesses requiring tax audit',
      periodicity: 'annual',
      dueDateCalculationType: 'fixed_date',
      dueDateFormula: { type: 'fixed', day: 31, month: 10 }, // 31st October
      applicableEntityTypes: ['pvt_ltd', 'llp', 'partnership', 'public_limited'],
      priorityLevel: 'critical',
      penaltyRiskLevel: 'high'
    },

    {
      ruleCode: 'ITR_TP_ANNUAL',
      regulationCategory: 'income_tax',
      complianceName: 'ITR Filing: Transfer Pricing Cases',
      formNumber: 'ITR + Form 3CEB',
      description: 'ITR filing for cases involving international transactions',
      periodicity: 'annual',
      dueDateCalculationType: 'fixed_date',
      dueDateFormula: { type: 'fixed', day: 30, month: 11 }, // 30th November
      priorityLevel: 'critical',
      penaltyRiskLevel: 'high'
    },

    {
      ruleCode: 'TDS_24Q_QUARTERLY',
      regulationCategory: 'income_tax',
      complianceName: 'Form 24Q: TDS on Salary',
      formNumber: '24Q',
      description: 'Quarterly TDS return for salary payments',
      periodicity: 'quarterly',
      dueDateCalculationType: 'relative_to_quarter_end',
      dueDateFormula: { type: 'quarter_end', days_after: 31 }, // Q1: 31 July, Q2: 31 Oct, Q3: 31 Jan, Q4: 31 May
      priorityLevel: 'high',
      penaltyRiskLevel: 'high',
      metadata: { payment_due: '7th of next month' }
    },

    {
      ruleCode: 'TDS_26Q_QUARTERLY',
      regulationCategory: 'income_tax',
      complianceName: 'Form 26Q: TDS on Non-Salary Payments',
      formNumber: '26Q',
      description: 'Quarterly TDS return for payments other than salary',
      periodicity: 'quarterly',
      dueDateCalculationType: 'relative_to_quarter_end',
      dueDateFormula: { type: 'quarter_end', days_after: 31 },
      priorityLevel: 'high',
      penaltyRiskLevel: 'high'
    },

    {
      ruleCode: 'TDS_27Q_QUARTERLY',
      regulationCategory: 'income_tax',
      complianceName: 'Form 27Q: TDS on NRI/Foreign Payments',
      formNumber: '27Q',
      description: 'Quarterly TDS return for payments to non-residents',
      periodicity: 'quarterly',
      dueDateCalculationType: 'relative_to_quarter_end',
      dueDateFormula: { type: 'quarter_end', days_after: 31 },
      priorityLevel: 'high',
      penaltyRiskLevel: 'high'
    },

    // ==================== PF/ESI ====================

    {
      ruleCode: 'PF_ECR_MONTHLY',
      regulationCategory: 'pf_esi',
      complianceName: 'PF ECR: Monthly Provident Fund Return',
      formNumber: 'ECR',
      description: 'Electronic Challan cum Return for PF contribution',
      periodicity: 'monthly',
      dueDateCalculationType: 'relative_to_month_end',
      dueDateFormula: { type: 'relative', day: 15, month_offset: 1 }, // 15th of next month
      employeeCountMin: 20, // Applicable if employees ≥20
      priorityLevel: 'critical',
      penaltyRiskLevel: 'critical',
      metadata: { revamped_ecr: 'From Sept 2025', payment_and_filing: 'Same day' }
    },

    {
      ruleCode: 'ESI_MONTHLY',
      regulationCategory: 'pf_esi',
      complianceName: 'ESI: Monthly Contribution Payment',
      formNumber: 'ESI Challan',
      description: 'Monthly ESI contribution payment',
      periodicity: 'monthly',
      dueDateCalculationType: 'relative_to_month_end',
      dueDateFormula: { type: 'relative', day: 15, month_offset: 1 },
      employeeCountMin: 10, // Some states have 10 employee threshold
      priorityLevel: 'critical',
      penaltyRiskLevel: 'critical'
    },

    {
      ruleCode: 'PF_ANNUAL_RETURN',
      regulationCategory: 'pf_esi',
      complianceName: 'PF Annual Return: Form 3A & 6A',
      formNumber: 'Form 3A, Form 6A',
      description: 'Annual PF return and reconciliation',
      periodicity: 'annual',
      dueDateCalculationType: 'fixed_date',
      dueDateFormula: { type: 'fixed', day: 30, month: 4 }, // 30th April
      employeeCountMin: 20,
      priorityLevel: 'high',
      penaltyRiskLevel: 'high'
    },

    {
      ruleCode: 'ESI_HALFYEARLY_APR_SEP',
      regulationCategory: 'pf_esi',
      complianceName: 'ESI Half-Yearly Return: Apr-Sep',
      formNumber: 'ESI Half-Yearly Return',
      description: 'Half-yearly ESI return for April to September period',
      periodicity: 'half_yearly',
      dueDateCalculationType: 'fixed_date',
      dueDateFormula: { type: 'fixed', day: 11, month: 11 }, // 11th November
      employeeCountMin: 10,
      priorityLevel: 'medium',
      penaltyRiskLevel: 'medium'
    },

    {
      ruleCode: 'ESI_HALFYEARLY_OCT_MAR',
      regulationCategory: 'pf_esi',
      complianceName: 'ESI Half-Yearly Return: Oct-Mar',
      formNumber: 'ESI Half-Yearly Return',
      description: 'Half-yearly ESI return for October to March period',
      periodicity: 'half_yearly',
      dueDateCalculationType: 'fixed_date',
      dueDateFormula: { type: 'fixed', day: 11, month: 5 }, // 11th May
      employeeCountMin: 10,
      priorityLevel: 'medium',
      penaltyRiskLevel: 'medium'
    }
  ];

  console.log(`📊 Preparing to seed ${rules.length} compliance rules...`);

  for (const rule of rules) {
    const existing = await storage.getComplianceRuleByCode(rule.ruleCode);
    if (!existing) {
      await storage.createComplianceRule(rule);
      console.log(`✅ Created: ${rule.ruleCode} - ${rule.complianceName}`);
    } else {
      console.log(`⏭️  Skipped: ${rule.ruleCode} (already exists)`);
    }
  }

  console.log('✅ Compliance rules library seeded successfully!');
}

export async function seedCompliancePenalties(storage: IStorage) {
  console.log('🌱 Seeding penalty definitions...');

  const penalties = [
    // Companies Act penalties
    {
      complianceRuleCode: 'ROC_AOC4_ANNUAL',
      penaltyType: 'late_fee',
      calculationType: 'per_day',
      calculationFormula: { per_day_rate: 100, max_amount: 500000 },
      gracePeriodDays: 0,
      legalReference: 'Section 137 of Companies Act 2013',
      notes: '₹100 per day additional fee for late filing'
    },
    {
      complianceRuleCode: 'ROC_MGT7_ANNUAL',
      penaltyType: 'late_fee',
      calculationType: 'per_day',
      calculationFormula: { per_day_rate: 100, max_amount: 500000 },
      gracePeriodDays: 0,
      legalReference: 'Section 92 of Companies Act 2013'
    },
    {
      complianceRuleCode: 'ROC_DIR3KYC_ANNUAL',
      penaltyType: 'late_fee',
      calculationType: 'fixed_amount',
      calculationFormula: { fixed_amount: 5000 },
      gracePeriodDays: 0,
      legalReference: 'Companies Act 2013',
      notes: 'DIN gets deactivated + ₹5,000 late fee'
    },

    // GST penalties
    {
      complianceRuleCode: 'GST_GSTR3B_MONTHLY',
      penaltyType: 'late_fee',
      calculationType: 'per_day',
      calculationFormula: { per_day_rate: 50, max_amount: 5000 },
      gracePeriodDays: 0,
      legalReference: 'Section 47 of CGST Act',
      notes: '₹50/day (₹20/day for Nil returns)'
    },
    {
      complianceRuleCode: 'GST_GSTR3B_MONTHLY',
      penaltyType: 'interest',
      calculationType: 'percentage_per_month',
      calculationFormula: { annual_rate: 18, compounding: true },
      gracePeriodDays: 0,
      legalReference: 'Section 50 of CGST Act',
      notes: '18% per annum on unpaid tax'
    },

    // Income Tax penalties
    {
      complianceRuleCode: 'ITR_INDIVIDUAL_ANNUAL',
      penaltyType: 'late_fee',
      calculationType: 'slab_based',
      calculationFormula: {
        slabs: [
          { income_upto: 500000, fee: 1000 },
          { income_above: 500000, fee: 5000 }
        ]
      },
      gracePeriodDays: 0,
      legalReference: 'Section 234F of Income Tax Act'
    },
    {
      complianceRuleCode: 'ITR_INDIVIDUAL_ANNUAL',
      penaltyType: 'interest',
      calculationType: 'percentage_per_month',
      calculationFormula: { monthly_rate: 1, compounding: false },
      gracePeriodDays: 0,
      legalReference: 'Section 234A of Income Tax Act',
      notes: '1% per month or part thereof'
    },
    {
      complianceRuleCode: 'TDS_24Q_QUARTERLY',
      penaltyType: 'late_fee',
      calculationType: 'per_day',
      calculationFormula: { per_day_rate: 200, max_is_tds_amount: true },
      gracePeriodDays: 0,
      legalReference: 'Section 234E of Income Tax Act',
      notes: '₹200/day; max = TDS amount'
    },

    // PF/ESI penalties
    {
      complianceRuleCode: 'PF_ECR_MONTHLY',
      penaltyType: 'interest',
      calculationType: 'percentage_per_month',
      calculationFormula: { annual_rate: 12, compounding: false },
      gracePeriodDays: 0,
      legalReference: 'EPF Act',
      notes: '12% p.a. interest on delayed payment'
    },
    {
      complianceRuleCode: 'PF_ECR_MONTHLY',
      penaltyType: 'additional_penalty',
      calculationType: 'percentage_per_month',
      calculationFormula: { damage_rate_range: [5, 25] },
      gracePeriodDays: 0,
      notes: '5-25% damages depending on delay duration'
    },
    {
      complianceRuleCode: 'ESI_MONTHLY',
      penaltyType: 'interest',
      calculationType: 'percentage_per_month',
      calculationFormula: { annual_rate: 12, compounding: false },
      gracePeriodDays: 0,
      legalReference: 'ESI Act',
      notes: '12% p.a. simple interest; potential prosecution'
    }
  ];

  console.log(`📊 Preparing to seed ${penalties.length} penalty definitions...`);

  for (const penalty of penalties) {
    const rule = await storage.getComplianceRuleByCode(penalty.complianceRuleCode);
    if (rule) {
      await storage.createCompliancePenalty({
        ...penalty,
        complianceRuleId: rule.id
      });
      console.log(`✅ Created penalty for: ${penalty.complianceRuleCode}`);
    }
  }

  console.log('✅ Penalty definitions seeded successfully!');
}
