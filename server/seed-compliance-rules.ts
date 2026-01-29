/**
 * Compliance Rules Seeder
 * 
 * Seeds the database with Indian compliance rules
 * Covers: MCA, GST, Income Tax, TDS, PF/ESI
 * 
 * Priority: P0 rules (most common and critical)
 */

import { db } from './db';
import { complianceStateRules } from '@shared/compliance-state-schema';

export async function seedComplianceRules() {
  console.log('🌱 Seeding compliance rules...');

  const rules = [
    // ========================================================================
    // CORPORATE / MCA RULES
    // ========================================================================
    {
      ruleId: 'MCA_AOC4_ANNUAL',
      ruleName: 'AOC-4: Annual Financial Statements Filing',
      domain: 'CORPORATE',
      applicableEntityTypes: ['pvt_ltd', 'public_limited'],
      frequency: 'ANNUAL',
      dueDateLogic: '30 days from AGM (AGM by 30th September, so typically 29th October)',
      graceDays: 0,
      penaltyPerDay: 100,
      maxPenalty: 500000,
      criticalityScore: 10,
      amberThresholdDays: 15,
      redThresholdDays: 0,
      requiredDocuments: ['audited_financials', 'board_resolution', 'directors_report', 'auditors_report'],
      description: 'Annual filing of financial statements with ROC',
      helpText: 'Must be filed within 30 days from the date of AGM. AGM must be held within 6 months from FY end.',
      referenceUrl: 'https://www.mca.gov.in/content/mca/global/en/acts-rules/eFiling/forms-download.html',
    },
    {
      ruleId: 'MCA_MGT7_ANNUAL',
      ruleName: 'MGT-7: Annual Return Filing',
      domain: 'CORPORATE',
      applicableEntityTypes: ['pvt_ltd', 'public_limited'],
      frequency: 'ANNUAL',
      dueDateLogic: '60 days from AGM or 28th November, whichever is earlier',
      graceDays: 0,
      penaltyPerDay: 100,
      maxPenalty: 500000,
      criticalityScore: 10,
      amberThresholdDays: 15,
      redThresholdDays: 0,
      requiredDocuments: ['aoc4_acknowledgement', 'shareholding_pattern', 'director_details'],
      dependsOnRules: ['MCA_AOC4_ANNUAL'],
      description: 'Annual return of the company with ROC',
      helpText: 'Cannot be filed before AOC-4. Contains details of members, directors, and shareholding.',
    },
    {
      ruleId: 'MCA_DIR3KYC_ANNUAL',
      ruleName: 'DIR-3 KYC: Director KYC Verification',
      domain: 'CORPORATE',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'public_limited'],
      frequency: 'ANNUAL',
      dueDateLogic: '15th October every year',
      graceDays: 0,
      penaltyPerDay: 0, // Fixed penalty
      maxPenalty: 5000,
      criticalityScore: 10,
      amberThresholdDays: 15,
      redThresholdDays: 0,
      requiredDocuments: ['director_pan', 'director_aadhaar', 'address_proof', 'photo'],
      description: 'Mandatory annual KYC for all directors',
      helpText: 'DIN will be deactivated if not filed by due date. Affects all companies where director is associated.',
    },

    // ========================================================================
    // GST RULES
    // ========================================================================
    {
      ruleId: 'GST_GSTR3B_MONTHLY',
      ruleName: 'GSTR-3B: Monthly Summary Return',
      domain: 'TAX_GST',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'proprietorship', 'partnership'],
      turnoverMin: 50000000, // ₹5 Cr+
      frequency: 'MONTHLY',
      dueDateLogic: '20th of next month',
      graceDays: 0,
      penaltyPerDay: 50,
      maxPenalty: 5000,
      criticalityScore: 10,
      amberThresholdDays: 5,
      redThresholdDays: 0,
      requiresGST: true,
      requiredDocuments: ['sales_register', 'purchase_register', 'bank_statements'],
      description: 'Monthly summary GST return with tax payment',
      helpText: 'Late fee: ₹50/day (₹20/day for Nil). Interest @18% p.a. on unpaid tax.',
    },
    {
      ruleId: 'GST_GSTR3B_QUARTERLY',
      ruleName: 'GSTR-3B: Quarterly Return (QRMP)',
      domain: 'TAX_GST',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'proprietorship', 'partnership'],
      turnoverMax: 50000000, // Under ₹5 Cr
      frequency: 'QUARTERLY',
      dueDateLogic: '22nd/24th of month after quarter end',
      graceDays: 0,
      penaltyPerDay: 50,
      maxPenalty: 5000,
      criticalityScore: 9,
      amberThresholdDays: 5,
      redThresholdDays: 0,
      requiresGST: true,
      description: 'Quarterly GST return under QRMP scheme',
      helpText: 'For taxpayers with turnover < ₹5 Cr. Monthly PMT-06 still required.',
    },
    {
      ruleId: 'GST_GSTR1_MONTHLY',
      ruleName: 'GSTR-1: Monthly Outward Supplies',
      domain: 'TAX_GST',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'proprietorship', 'partnership'],
      turnoverMin: 50000000,
      frequency: 'MONTHLY',
      dueDateLogic: '11th of next month',
      graceDays: 0,
      penaltyPerDay: 0, // Indirect penalty via GSTR-3B lock
      criticalityScore: 8,
      amberThresholdDays: 5,
      redThresholdDays: 0,
      requiresGST: true,
      requiredDocuments: ['sales_invoices', 'b2b_details', 'export_details'],
      description: 'Monthly details of outward supplies',
      helpText: 'Must be filed before GSTR-3B. Auto-populates ITC in GSTR-3B.',
    },
    {
      ruleId: 'GST_GSTR9_ANNUAL',
      ruleName: 'GSTR-9: Annual GST Return',
      domain: 'TAX_GST',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'proprietorship', 'partnership'],
      turnoverMin: 20000000, // ₹2 Cr+
      frequency: 'ANNUAL',
      dueDateLogic: '31st December of following year',
      graceDays: 0,
      penaltyPerDay: 0,
      criticalityScore: 7,
      amberThresholdDays: 30,
      redThresholdDays: 0,
      requiresGST: true,
      requiredDocuments: ['gstr1_gstr3b_data', 'annual_financials', 'itc_reconciliation'],
      description: 'Annual consolidated GST return',
      helpText: 'Mandatory for turnover > ₹2 Cr. Reconciliation of monthly returns.',
    },

    // ========================================================================
    // INCOME TAX RULES
    // ========================================================================
    {
      ruleId: 'IT_ITR_COMPANY_AUDIT',
      ruleName: 'ITR Filing: Company (Audit Cases)',
      domain: 'TAX_INCOME',
      applicableEntityTypes: ['pvt_ltd', 'public_limited'],
      frequency: 'ANNUAL',
      dueDateLogic: '31st October (with tax audit)',
      graceDays: 0,
      penaltyPerDay: 0, // Fixed penalty
      maxPenalty: 5000,
      criticalityScore: 10,
      amberThresholdDays: 30,
      redThresholdDays: 0,
      requiredDocuments: ['audited_financials', 'tax_audit_report', 'form_3cd', 'tax_computation'],
      description: 'Income Tax Return for companies requiring audit',
      helpText: 'Late fee ₹5,000. Interest @1% p.m. under Section 234A on refund/tax due.',
    },
    {
      ruleId: 'IT_ITR_INDIVIDUAL',
      ruleName: 'ITR Filing: Individual/Proprietorship',
      domain: 'TAX_INCOME',
      applicableEntityTypes: ['proprietorship'],
      frequency: 'ANNUAL',
      dueDateLogic: '31st July (extended to 15th September for some FYs)',
      graceDays: 0,
      penaltyPerDay: 0,
      maxPenalty: 5000,
      criticalityScore: 9,
      amberThresholdDays: 30,
      redThresholdDays: 0,
      requiredDocuments: ['form16', 'bank_statements', 'capital_gains', 'interest_certificates'],
      description: 'ITR for individuals, HUFs, proprietorships',
      helpText: 'Late fee: ₹1,000 (income <₹5L) or ₹5,000. Belated till 31st Dec.',
    },
    {
      ruleId: 'IT_TDS_24Q_QUARTERLY',
      ruleName: 'Form 24Q: TDS on Salary',
      domain: 'TAX_INCOME',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'proprietorship'],
      employeeCountMin: 1,
      frequency: 'QUARTERLY',
      dueDateLogic: 'Q1:31Jul, Q2:31Oct, Q3:31Jan, Q4:31May',
      graceDays: 0,
      penaltyPerDay: 200,
      maxPenalty: 100000,
      criticalityScore: 9,
      amberThresholdDays: 7,
      redThresholdDays: 0,
      requiredDocuments: ['salary_register', 'tds_challans', 'employee_pan'],
      description: 'Quarterly TDS return for salary payments',
      helpText: 'Late fee: ₹200/day. Max = TDS amount. Penalty ₹10K-₹1L under 271H.',
    },
    {
      ruleId: 'IT_TDS_26Q_QUARTERLY',
      ruleName: 'Form 26Q: TDS on Non-Salary',
      domain: 'TAX_INCOME',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'proprietorship'],
      frequency: 'QUARTERLY',
      dueDateLogic: 'Q1:31Jul, Q2:31Oct, Q3:31Jan, Q4:31May',
      graceDays: 0,
      penaltyPerDay: 200,
      maxPenalty: 100000,
      criticalityScore: 8,
      amberThresholdDays: 7,
      redThresholdDays: 0,
      requiredDocuments: ['payment_register', 'tds_certificates', 'vendor_pan', 'tds_challans'],
      description: 'Quarterly TDS return for interest, rent, professional fees, etc.',
      helpText: 'Same penalty as 24Q. TDS payment due by 7th of next month.',
    },

    // ========================================================================
    // LABOUR / PF / ESI RULES
    // ========================================================================
    {
      ruleId: 'LABOUR_PF_ECR_MONTHLY',
      ruleName: 'PF ECR: Monthly Provident Fund Return',
      domain: 'LABOUR',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'proprietorship'],
      employeeCountMin: 20,
      frequency: 'MONTHLY',
      dueDateLogic: '15th of next month',
      graceDays: 0,
      penaltyPerDay: 0, // Interest-based
      criticalityScore: 10,
      amberThresholdDays: 5,
      redThresholdDays: 0,
      requiresPF: true,
      requiredDocuments: ['payroll_register', 'uan_list', 'wage_details'],
      description: 'Monthly PF contribution filing and payment',
      helpText: 'Interest @12% p.a. Damages 5-25% on delay. No grace period.',
    },
    {
      ruleId: 'LABOUR_ESI_MONTHLY',
      ruleName: 'ESI: Monthly Contribution Payment',
      domain: 'LABOUR',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'proprietorship'],
      employeeCountMin: 10,
      frequency: 'MONTHLY',
      dueDateLogic: '15th of next month',
      graceDays: 0,
      penaltyPerDay: 0,
      criticalityScore: 10,
      amberThresholdDays: 5,
      redThresholdDays: 0,
      requiresESI: true,
      requiredDocuments: ['payroll_register', 'esi_employee_list', 'wage_details'],
      description: 'Monthly ESI contribution payment',
      helpText: 'Interest @12% p.a. Prosecution risk: imprisonment + ₹5,000 fine.',
    },
    {
      ruleId: 'LABOUR_PT_MONTHLY',
      ruleName: 'Professional Tax: Monthly Payment',
      domain: 'LABOUR',
      applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'partnership', 'proprietorship'],
      employeeCountMin: 1,
      frequency: 'MONTHLY',
      dueDateLogic: 'Varies by state (typically 15th-21st)',
      graceDays: 0,
      stateSpecific: true,
      criticalityScore: 6,
      amberThresholdDays: 5,
      redThresholdDays: 0,
      description: 'State-level professional tax payment',
      helpText: 'Applicable in most states. Maharashtra, Karnataka, etc. have PT.',
    },
  ];

  console.log(`📋 Inserting ${rules.length} compliance rules...`);

  for (const rule of rules) {
    try {
      await db.insert(complianceStateRules).values({
        ...rule,
        isActive: true,
        effectiveFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [complianceStateRules.ruleId],
        set: {
          ...rule,
          updatedAt: new Date(),
        },
      });
      console.log(`  ✅ ${rule.ruleId}`);
    } catch (error) {
      console.error(`  ❌ Failed to insert ${rule.ruleId}:`, error);
    }
  }

  console.log('✅ Compliance rules seeding complete!');
  console.log(`
📊 Summary:
   - Corporate/MCA: 3 rules
   - GST: 5 rules
   - Income Tax: 4 rules
   - Labour: 3 rules
   - Total: ${rules.length} rules
  `);
}

// Run if called directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedComplianceRules()
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
