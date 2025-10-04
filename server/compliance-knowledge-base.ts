/**
 * Comprehensive Compliance Knowledge Base
 * 
 * In-memory reference library of Indian regulatory compliance rules
 * Covers: Companies Act 2013, GST, Income Tax, PF/ESI, Labour Laws
 * 
 * Data updated as of October 2025 from official government sources
 */

export interface ComplianceRule {
  ruleCode: string;
  regulationCategory: string;
  complianceName: string;
  formNumber?: string;
  description: string;
  periodicity: string;
  dueDateInfo: string;
  applicableEntityTypes?: string[];
  turnoverThresholdMin?: string;
  turnoverThresholdMax?: string;
  employeeCountMin?: number;
  stateSpecific?: boolean;
  applicableStates?: string[];
  priorityLevel: string;
  penaltyRiskLevel: string;
  penaltyInfo: string;
  requiredDocuments: string[];
  metadata?: any;
}

export const COMPLIANCE_KNOWLEDGE_BASE: ComplianceRule[] = [
  // ==================== COMPANIES ACT 2013 ====================
  
  {
    ruleCode: 'ROC_AOC4_ANNUAL',
    regulationCategory: 'companies_act',
    complianceName: 'AOC-4: Annual Financial Statements',
    formNumber: 'AOC-4',
    description: 'Filing of annual financial statements with Registrar of Companies within 30 days from AGM',
    periodicity: 'annual',
    dueDateInfo: '29th October (30 days from AGM, which must be held by 30th September)',
    applicableEntityTypes: ['pvt_ltd', 'llp', 'public_limited'],
    priorityLevel: 'critical',
    penaltyRiskLevel: 'high',
    penaltyInfo: '₹100 per day additional fee; Company: ₹50,000-₹5,00,000; Director: ₹10,000-₹1,00,000',
    requiredDocuments: ['Audited Financial Statements', 'Balance Sheet', 'Profit & Loss Statement', 'Board Resolution', 'Directors Report', 'Auditors Report'],
    metadata: { filing_sequence: 'File after AGM, before MGT-7', mca_v3_update: 'Photo proof of registered office required from July 2025' }
  },

  {
    ruleCode: 'ROC_MGT7_ANNUAL',
    regulationCategory: 'companies_act',
    complianceName: 'MGT-7: Annual Return',
    formNumber: 'MGT-7',
    description: 'Annual return filing with ROC within 60 days from AGM',
    periodicity: 'annual',
    dueDateInfo: '28th November (60 days from AGM or 28th Nov, whichever is earlier)',
    applicableEntityTypes: ['pvt_ltd', 'public_limited'],
    priorityLevel: 'critical',
    penaltyRiskLevel: 'high',
    penaltyInfo: '₹100 per day additional fee; penalties same as AOC-4',
    requiredDocuments: ['Annual Return Draft', 'Board Resolution', 'Shareholding Pattern', 'Director Details', 'AOC-4 acknowledgement'],
    metadata: { prerequisite: 'AOC-4 must be filed first' }
  },

  {
    ruleCode: 'ROC_DIR3KYC_ANNUAL',
    regulationCategory: 'companies_act',
    complianceName: 'DIR-3 KYC: Director KYC Verification',
    formNumber: 'DIR-3 KYC',
    description: 'Annual KYC verification for all directors with active DIN',
    periodicity: 'annual',
    dueDateInfo: '15th October (Extended from 30th September)',
    applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'public_limited'],
    priorityLevel: 'critical',
    penaltyRiskLevel: 'critical',
    penaltyInfo: '₹5,000 late fee + DIN gets deactivated if not filed',
    requiredDocuments: ['Director PAN', 'Aadhaar', 'Address Proof', 'Passport-size Photo'],
    metadata: { warning: 'DIN deactivation impacts all companies where director is associated', extended_deadline_2025: '15-Oct-2025' }
  },

  // ==================== GST (GOODS & SERVICES TAX) ====================

  {
    ruleCode: 'GST_GSTR3B_MONTHLY',
    regulationCategory: 'gst',
    complianceName: 'GSTR-3B: Monthly Summary Return',
    formNumber: 'GSTR-3B',
    description: 'Monthly summary return with tax payment for businesses with turnover >₹5 Cr',
    periodicity: 'monthly',
    dueDateInfo: '20th of the following month (e.g., July return due by 20th August)',
    turnoverThresholdMin: '50000000', // ₹5 Cr
    priorityLevel: 'critical',
    penaltyRiskLevel: 'critical',
    penaltyInfo: 'Late fee: ₹50/day (₹20/day for Nil returns), max ₹5,000; Interest: 18% p.a. on unpaid tax',
    requiredDocuments: ['Sales Register', 'Purchase Register', 'Bank Statements', 'Input Tax Credit Reconciliation'],
    metadata: { hard_lock_from: 'July 2025 onwards - auto-populated fields non-editable' }
  },

  {
    ruleCode: 'GST_GSTR1_MONTHLY',
    regulationCategory: 'gst',
    complianceName: 'GSTR-1: Monthly Outward Supplies',
    formNumber: 'GSTR-1',
    description: 'Details of outward supplies of goods and services',
    periodicity: 'monthly',
    dueDateInfo: '11th of the following month',
    turnoverThresholdMin: '50000000',
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Late fee applicable; impacts GSTR-3B auto-population',
    requiredDocuments: ['Sales Invoices', 'B2B Invoice Details', 'B2C Summary', 'Export Details'],
    metadata: {}
  },

  {
    ruleCode: 'GST_GSTR9_ANNUAL',
    regulationCategory: 'gst',
    complianceName: 'GSTR-9: Annual Return',
    formNumber: 'GSTR-9',
    description: 'Annual consolidated return for regular taxpayers with turnover >₹2 Cr',
    periodicity: 'annual',
    dueDateInfo: '31st December of the following financial year',
    turnoverThresholdMin: '20000000', // ₹2 Cr
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Late fee applicable for delayed filing',
    requiredDocuments: ['Annual Financial Statements', 'GSTR-1/3B Reconciliation', 'ITC Reconciliation'],
    metadata: {}
  },

  {
    ruleCode: 'GST_GSTR9C_ANNUAL',
    regulationCategory: 'gst',
    complianceName: 'GSTR-9C: GST Audit Reconciliation',
    formNumber: 'GSTR-9C',
    description: 'Reconciliation statement certified by CA/CMA for turnover >₹5 Cr',
    periodicity: 'annual',
    dueDateInfo: '31st December of the following financial year',
    turnoverThresholdMin: '500000000', // ₹5 Cr
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Mandatory audit certificate required',
    requiredDocuments: ['Audited Financial Statements', 'GSTR-9 Filed Copy', 'Reconciliation Statement by CA/CMA'],
    metadata: {}
  },

  // ==================== INCOME TAX ====================

  {
    ruleCode: 'ITR_INDIVIDUAL_ANNUAL',
    regulationCategory: 'income_tax',
    complianceName: 'ITR Filing: Individuals & HUFs',
    formNumber: 'ITR-1/2/3',
    description: 'Income Tax Return filing for individuals, HUFs, and proprietorships (non-audit cases)',
    periodicity: 'annual',
    dueDateInfo: '16th September (Extended for FY 2024-25); Belated return allowed till 31st December',
    applicableEntityTypes: ['proprietorship'],
    priorityLevel: 'critical',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Late fee: ₹1,000 (income <₹5L) or ₹5,000 (income ≥₹5L); Interest: 1% per month under Section 234A',
    requiredDocuments: ['Form 16/16A', 'Bank Statements', 'Capital Gains Statement', 'Interest Certificates', 'Salary Slips'],
    metadata: { extended_deadline_fy24_25: '16-Sep-2025' }
  },

  {
    ruleCode: 'ITR_AUDIT_ANNUAL',
    regulationCategory: 'income_tax',
    complianceName: 'ITR Filing: Tax Audit Cases',
    formNumber: 'ITR-5/6/7 + Form 3CD',
    description: 'ITR for companies and businesses requiring tax audit',
    periodicity: 'annual',
    dueDateInfo: '31st October (Tax Audit Report due by 31st Oct; ITR due by 31st Oct)',
    applicableEntityTypes: ['pvt_ltd', 'llp', 'partnership', 'public_limited'],
    priorityLevel: 'critical',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Late fee: ₹5,000; Interest under 234A/234B/234C',
    requiredDocuments: ['Audited Financial Statements', 'Tax Audit Report (Form 3CD)', 'Tax Computation', 'Balance Sheet', 'P&L Statement'],
    metadata: {}
  },

  {
    ruleCode: 'TDS_24Q_QUARTERLY',
    regulationCategory: 'income_tax',
    complianceName: 'Form 24Q: TDS on Salary',
    formNumber: '24Q',
    description: 'Quarterly TDS return for salary payments to employees',
    periodicity: 'quarterly',
    dueDateInfo: 'Q1 (Apr-Jun): 31 July; Q2 (Jul-Sep): 31 Oct; Q3 (Oct-Dec): 31 Jan; Q4 (Jan-Mar): 31 May',
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Late fee: ₹200/day under Section 234E (max = TDS amount); Penalty: ₹10,000-₹1,00,000 under Section 271H',
    requiredDocuments: ['Salary Register', 'Form 16 Issued', 'PAN of Employees', 'TDS Challan Paid by 7th'],
    metadata: { tds_payment_due: '7th of following month' }
  },

  {
    ruleCode: 'TDS_26Q_QUARTERLY',
    regulationCategory: 'income_tax',
    complianceName: 'Form 26Q: TDS on Non-Salary Payments',
    formNumber: '26Q',
    description: 'Quarterly TDS return for payments other than salary (interest, professional fees, rent, etc.)',
    periodicity: 'quarterly',
    dueDateInfo: 'Quarterly: 31 July, 31 Oct, 31 Jan, 31 May',
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Same as 24Q: ₹200/day late fee; ₹10,000-₹1,00,000 penalty',
    requiredDocuments: ['Payment Register', 'TDS Certificates Issued', 'PAN of Vendors', 'TDS Challans'],
    metadata: {}
  },

  // ==================== PF/ESI ====================

  {
    ruleCode: 'PF_ECR_MONTHLY',
    regulationCategory: 'pf_esi',
    complianceName: 'PF ECR: Monthly Provident Fund Return',
    formNumber: 'ECR (Electronic Challan cum Return)',
    description: 'Monthly PF contribution filing and payment for establishments with ≥20 employees',
    periodicity: 'monthly',
    dueDateInfo: '15th of the following month (both filing and payment)',
    employeeCountMin: 20,
    priorityLevel: 'critical',
    penaltyRiskLevel: 'critical',
    penaltyInfo: 'Interest: 12% p.a. on delayed payment; Damages: 5-25% depending on delay duration; No grace period',
    requiredDocuments: ['Payroll Register', 'UAN-verified Employee List', 'Wage Details', 'EPF Challan Paid'],
    metadata: { revamped_ecr_from: 'September 2025 - separate return & payment steps', no_grace_period: true }
  },

  {
    ruleCode: 'ESI_MONTHLY',
    regulationCategory: 'pf_esi',
    complianceName: 'ESI: Monthly Contribution Payment',
    formNumber: 'ESI Challan',
    description: 'Monthly ESI contribution payment for establishments with ≥10 employees',
    periodicity: 'monthly',
    dueDateInfo: '15th of the following month',
    employeeCountMin: 10,
    priorityLevel: 'critical',
    penaltyRiskLevel: 'critical',
    penaltyInfo: 'Interest: 12% p.a. simple interest; Potential prosecution: imprisonment up to 2 years + ₹5,000 fine under ESI Act',
    requiredDocuments: ['Payroll Register', 'ESI Registered Employees', 'Wage Details'],
    metadata: { prosecution_risk: 'High - ESI Act allows criminal prosecution for default' }
  },

  {
    ruleCode: 'PF_ANNUAL_RETURN',
    regulationCategory: 'pf_esi',
    complianceName: 'PF Annual Return: Form 3A & 6A',
    formNumber: 'Form 3A, Form 6A',
    description: 'Annual PF return and annual accounts reconciliation',
    periodicity: 'annual',
    dueDateInfo: '30th April of the following year (e.g., FY 2024-25 return due by 30 April 2025)',
    employeeCountMin: 20,
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Penalties for non-filing; impacts future ECR filings',
    requiredDocuments: ['Annual Payroll Summary', 'ECR Reconciliation', 'PF Ledger'],
    metadata: {}
  },

  {
    ruleCode: 'ESI_HALFYEARLY_APR_SEP',
    regulationCategory: 'pf_esi',
    complianceName: 'ESI Half-Yearly Return: April-September',
    formNumber: 'ESI Half-Yearly Return',
    description: 'Half-yearly ESI return covering April to September period',
    periodicity: 'half_yearly',
    dueDateInfo: '11th November',
    employeeCountMin: 10,
    priorityLevel: 'medium',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Penalties for non-filing',
    requiredDocuments: ['ESI Contribution Statement', 'Employee Register'],
    metadata: {}
  }
];

// Helper functions for compliance knowledge

export function getComplianceByCategory(category: string): ComplianceRule[] {
  return COMPLIANCE_KNOWLEDGE_BASE.filter(rule => rule.regulationCategory === category);
}

export function getComplianceByCode(code: string): ComplianceRule | undefined {
  return COMPLIANCE_KNOWLEDGE_BASE.find(rule => rule.ruleCode === code);
}

export function getApplicableCompliances(
  entityType?: string,
  turnover?: number,
  employeeCount?: number,
  state?: string
): ComplianceRule[] {
  return COMPLIANCE_KNOWLEDGE_BASE.filter(rule => {
    // Check entity type
    if (rule.applicableEntityTypes && entityType) {
      if (!rule.applicableEntityTypes.includes(entityType)) {
        return false;
      }
    }

    // Check turnover threshold
    if (turnover) {
      if (rule.turnoverThresholdMin && turnover < parseFloat(rule.turnoverThresholdMin)) {
        return false;
      }
      if (rule.turnoverThresholdMax && turnover > parseFloat(rule.turnoverThresholdMax)) {
        return false;
      }
    }

    // Check employee count
    if (employeeCount) {
      if (rule.employeeCountMin && employeeCount < rule.employeeCountMin) {
        return false;
      }
    }

    // Check state-specific
    if (rule.stateSpecific && state) {
      if (rule.applicableStates && !rule.applicableStates.includes(state)) {
        return false;
      }
    }

    return true;
  });
}

console.log(`📚 Compliance Knowledge Base loaded: ${COMPLIANCE_KNOWLEDGE_BASE.length} rules`);
