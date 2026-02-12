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

  {
    ruleCode: 'ROC_MGT7A_ANNUAL',
    regulationCategory: 'companies_act',
    complianceName: 'MGT-7A: Annual Return (OPC & Small Companies)',
    formNumber: 'MGT-7A',
    description: 'Simplified annual return for OPC and Small Companies',
    periodicity: 'annual',
    dueDateInfo: '28th November (60 days from AGM)',
    applicableEntityTypes: ['opc', 'small_company'],
    priorityLevel: 'critical',
    penaltyRiskLevel: 'high',
    penaltyInfo: '₹100 per day additional fee; penalties similar to MGT-7',
    requiredDocuments: ['Annual Return Draft', 'Board Resolution', 'Shareholding Pattern', 'Director Details', 'AOC-4 acknowledgement'],
    metadata: {}
  },

  {
    ruleCode: 'ROC_ADT1_EVENT',
    regulationCategory: 'companies_act',
    complianceName: 'ADT-1: Appointment of Auditor',
    formNumber: 'ADT-1',
    description: 'Filing for appointment/re-appointment of statutory auditor',
    periodicity: 'event_based',
    dueDateInfo: 'Within 15 days of AGM or incorporation',
    applicableEntityTypes: ['pvt_ltd', 'llp', 'opc', 'public_limited'],
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Late filing attracts additional fees and penalties',
    requiredDocuments: ['Board Resolution', 'Auditor Consent Letter', 'Eligibility Certificate', 'Appointment Letter'],
    metadata: { trigger_event: 'agm_or_incorporation' }
  },

  {
    ruleCode: 'ROC_DPT3_ANNUAL',
    regulationCategory: 'companies_act',
    complianceName: 'DPT-3: Return of Deposits',
    formNumber: 'DPT-3',
    description: 'Annual return for deposits and outstanding receipts',
    periodicity: 'annual',
    dueDateInfo: '30th June',
    applicableEntityTypes: ['pvt_ltd', 'public_limited'],
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Additional fees and penalties for non-filing',
    requiredDocuments: ['Audited Financial Statements', 'Deposit Register', 'Board Resolution', 'Auditor Certificate'],
    metadata: {}
  },

  {
    ruleCode: 'ROC_MSME1_HALF_YEARLY',
    regulationCategory: 'companies_act',
    complianceName: 'MSME-1: Half-Yearly Return (Payments to MSME)',
    formNumber: 'MSME-1',
    description: 'Half-yearly return for outstanding payments to MSME vendors',
    periodicity: 'half_yearly',
    dueDateInfo: '30th April (Oct-Mar) and 31st October (Apr-Sep)',
    applicableEntityTypes: ['pvt_ltd', 'public_limited', 'llp'],
    priorityLevel: 'medium',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Penalty for non-filing under MSME Act',
    requiredDocuments: ['MSME Vendor List', 'Outstanding Payables Report', 'Aging Report'],
    metadata: { periods: ['Apr-Sep', 'Oct-Mar'] }
  },

  {
    ruleCode: 'ROC_PAS6_HALF_YEARLY',
    regulationCategory: 'companies_act',
    complianceName: 'PAS-6: Reconciliation of Share Capital Audit',
    formNumber: 'PAS-6',
    description: 'Half-yearly reconciliation for unlisted public companies',
    periodicity: 'half_yearly',
    dueDateInfo: 'Within 60 days of half-year end',
    applicableEntityTypes: ['public_limited'],
    priorityLevel: 'medium',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Late filing attracts additional fees',
    requiredDocuments: ['Share Capital Reconciliation Statement', 'Register of Members', 'Auditor Report'],
    metadata: {}
  },

  {
    ruleCode: 'ROC_BEN2_EVENT',
    regulationCategory: 'companies_act',
    complianceName: 'BEN-2: Significant Beneficial Owner Return',
    formNumber: 'BEN-2',
    description: 'Filing for significant beneficial ownership disclosures',
    periodicity: 'event_based',
    dueDateInfo: 'Within 30 days of receipt of BEN-1 declaration',
    applicableEntityTypes: ['pvt_ltd', 'public_limited'],
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Penalties for non-compliance under Companies Act',
    requiredDocuments: ['BEN-1 Declaration', 'Shareholding Pattern', 'Board Resolution'],
    metadata: { trigger_event: 'beneficial_owner_change' }
  },

  {
    ruleCode: 'ROC_INC20A_ONETIME',
    regulationCategory: 'companies_act',
    complianceName: 'INC-20A: Commencement of Business',
    formNumber: 'INC-20A',
    description: 'Declaration for commencement of business',
    periodicity: 'one_time',
    dueDateInfo: 'Within 180 days of incorporation',
    applicableEntityTypes: ['pvt_ltd', 'public_limited'],
    priorityLevel: 'critical',
    penaltyRiskLevel: 'critical',
    penaltyInfo: 'Company cannot commence business until filed; penalties for default',
    requiredDocuments: ['Bank Account Proof', 'Share Subscription Proof', 'Board Resolution'],
    metadata: { warning: 'Required before starting business operations' }
  },

  {
    ruleCode: 'LLP_FORM11_ANNUAL',
    regulationCategory: 'companies_act',
    complianceName: 'LLP Form 11: Annual Return',
    formNumber: 'Form 11',
    description: 'Annual return for LLPs with partner and contribution details',
    periodicity: 'annual',
    dueDateInfo: '30th May',
    applicableEntityTypes: ['llp'],
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: '₹100 per day late fee for delayed filing',
    requiredDocuments: ['Partner Details', 'Contribution Summary', 'LLP Agreement'],
    metadata: {}
  },

  {
    ruleCode: 'LLP_FORM8_ANNUAL',
    regulationCategory: 'companies_act',
    complianceName: 'LLP Form 8: Statement of Account & Solvency',
    formNumber: 'Form 8',
    description: 'Statement of Account and Solvency for LLPs',
    periodicity: 'annual',
    dueDateInfo: '30th October',
    applicableEntityTypes: ['llp'],
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: '₹100 per day late fee',
    requiredDocuments: ['Statement of Account', 'Solvency Declaration', 'Partner Resolution'],
    metadata: {}
  },

  // ==================== BUSINESS REGISTRATION ====================

  {
    ruleCode: 'REG_PVT_LTD_INCORP',
    regulationCategory: 'business_registration',
    complianceName: 'Private Limited Company Incorporation (SPICe+)',
    formNumber: 'SPICe+ (INC-32)',
    description: 'Incorporation of a Private Limited Company with DIN, PAN, TAN, GST (optional)',
    periodicity: 'one_time',
    dueDateInfo: 'Before commencing business (typically within 30 days of name approval)',
    applicableEntityTypes: ['pvt_ltd'],
    priorityLevel: 'critical',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Delay impacts business start and bank/account opening',
    requiredDocuments: ['Proposed Company Name', 'Director PAN', 'Director Aadhaar', 'Registered Office Proof', 'MOA', 'AOA', 'NOC from Owner', 'Utility Bill'],
    metadata: { includes: ['DIN', 'PAN', 'TAN'], portal: 'MCA' }
  },

  {
    ruleCode: 'REG_OPC_INCORP',
    regulationCategory: 'business_registration',
    complianceName: 'OPC Incorporation (SPICe+)',
    formNumber: 'SPICe+ (INC-32)',
    description: 'Incorporation of One Person Company with nominee appointment',
    periodicity: 'one_time',
    dueDateInfo: 'Before commencing business',
    applicableEntityTypes: ['opc'],
    priorityLevel: 'critical',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Delay impacts business start',
    requiredDocuments: ['Proposed Company Name', 'Promoter PAN', 'Promoter Aadhaar', 'Nominee Consent (INC-3)', 'Registered Office Proof', 'MOA', 'AOA'],
    metadata: { includes: ['DIN', 'PAN', 'TAN'], portal: 'MCA' }
  },

  {
    ruleCode: 'REG_LLP_INCORP',
    regulationCategory: 'business_registration',
    complianceName: 'LLP Incorporation (FiLLiP)',
    formNumber: 'FiLLiP',
    description: 'Incorporation of Limited Liability Partnership',
    periodicity: 'one_time',
    dueDateInfo: 'Before commencing business',
    applicableEntityTypes: ['llp'],
    priorityLevel: 'high',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Delay impacts business start',
    requiredDocuments: ['Partner PAN', 'Partner Aadhaar', 'LLP Agreement Draft', 'Registered Office Proof', 'NOC from Owner'],
    metadata: { portal: 'MCA' }
  },

  {
    ruleCode: 'REG_SOLE_PROP',
    regulationCategory: 'business_registration',
    complianceName: 'Sole Proprietorship Setup',
    description: 'Local registration and bank setup for sole proprietorship',
    periodicity: 'one_time',
    dueDateInfo: 'Before commencing business',
    applicableEntityTypes: ['proprietorship'],
    priorityLevel: 'high',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Delay impacts ability to invoice and open bank accounts',
    requiredDocuments: ['PAN', 'Aadhaar', 'Address Proof', 'Shop & Establishment Registration (if applicable)'],
    metadata: {}
  },

  {
    ruleCode: 'REG_GST',
    regulationCategory: 'gst',
    complianceName: 'GST Registration',
    formNumber: 'GST REG-01',
    description: 'GST registration for businesses crossing threshold or inter-state supply',
    periodicity: 'one_time',
    dueDateInfo: 'Within 30 days of crossing threshold or commencing inter-state supply',
    priorityLevel: 'critical',
    penaltyRiskLevel: 'critical',
    penaltyInfo: 'Penalties for operating without GST registration',
    requiredDocuments: ['PAN', 'Business Proof', 'Bank Account Proof', 'Address Proof', 'Authorized Signatory Details'],
    metadata: { threshold: '₹20L (₹40L for goods in most states)', portal: 'GST' }
  },

  {
    ruleCode: 'REG_MSME_UDYAM',
    regulationCategory: 'business_registration',
    complianceName: 'MSME (Udyam) Registration',
    description: 'Udyam registration for MSME classification and benefits',
    periodicity: 'one_time',
    dueDateInfo: 'Anytime after business setup; recommended early for benefits',
    priorityLevel: 'medium',
    penaltyRiskLevel: 'low',
    penaltyInfo: 'No statutory penalty, but missed benefits',
    requiredDocuments: ['PAN', 'Aadhaar', 'Business Details', 'Bank Account'],
    metadata: { portal: 'Udyam' }
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
    ruleCode: 'GST_GSTR1_QUARTERLY',
    regulationCategory: 'gst',
    complianceName: 'GSTR-1: Quarterly Outward Supplies (QRMP)',
    formNumber: 'GSTR-1',
    description: 'Quarterly GSTR-1 under QRMP scheme',
    periodicity: 'quarterly',
    dueDateInfo: '13th of the month following quarter end',
    turnoverThresholdMax: '50000000',
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Late fee applicable; impacts buyer ITC',
    requiredDocuments: ['Sales Invoices', 'B2B Invoice Details', 'B2C Summary', 'Export Details'],
    metadata: { scheme: 'QRMP' }
  },

  {
    ruleCode: 'GST_GSTR3B_QUARTERLY_X',
    regulationCategory: 'gst',
    complianceName: 'GSTR-3B: Quarterly Return (Category X States)',
    formNumber: 'GSTR-3B',
    description: 'Quarterly GSTR-3B under QRMP scheme (Category X states)',
    periodicity: 'quarterly',
    dueDateInfo: '22nd of the month following quarter end',
    turnoverThresholdMax: '50000000',
    stateSpecific: true,
    applicableStates: ['Maharashtra', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Andhra Pradesh', 'Kerala', 'Goa', 'Madhya Pradesh', 'Chhattisgarh'],
    priorityLevel: 'critical',
    penaltyRiskLevel: 'critical',
    penaltyInfo: 'Late fee + interest 18% p.a.',
    requiredDocuments: ['Sales Register', 'Purchase Register', 'Bank Statements', 'ITC Reconciliation'],
    metadata: { scheme: 'QRMP', pmt06_required: 'Monthly tax payment via PMT-06' }
  },

  {
    ruleCode: 'GST_GSTR3B_QUARTERLY_Y',
    regulationCategory: 'gst',
    complianceName: 'GSTR-3B: Quarterly Return (Category Y States)',
    formNumber: 'GSTR-3B',
    description: 'Quarterly GSTR-3B under QRMP scheme (Category Y states)',
    periodicity: 'quarterly',
    dueDateInfo: '24th of the month following quarter end',
    turnoverThresholdMax: '50000000',
    stateSpecific: true,
    applicableStates: ['Delhi', 'Uttar Pradesh', 'Bihar', 'West Bengal', 'Odisha', 'Punjab', 'Haryana', 'Rajasthan', 'Himachal Pradesh', 'Uttarakhand', 'Jharkhand'],
    priorityLevel: 'critical',
    penaltyRiskLevel: 'critical',
    penaltyInfo: 'Late fee + interest 18% p.a.',
    requiredDocuments: ['Sales Register', 'Purchase Register', 'Bank Statements', 'ITC Reconciliation'],
    metadata: { scheme: 'QRMP', pmt06_required: 'Monthly tax payment via PMT-06' }
  },

  {
    ruleCode: 'GST_CMP08_QUARTERLY',
    regulationCategory: 'gst',
    complianceName: 'CMP-08: Composition Tax Payment',
    formNumber: 'CMP-08',
    description: 'Quarterly tax payment for composition scheme taxpayers',
    periodicity: 'quarterly',
    dueDateInfo: '18th of the month following quarter end',
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Late fee and interest applicable',
    requiredDocuments: ['Composition Tax Ledger', 'Sales Summary', 'Purchase Summary'],
    metadata: { scheme: 'Composition' }
  },

  {
    ruleCode: 'GST_GSTR4_ANNUAL',
    regulationCategory: 'gst',
    complianceName: 'GSTR-4: Annual Return (Composition)',
    formNumber: 'GSTR-4',
    description: 'Annual return for composition scheme taxpayers',
    periodicity: 'annual',
    dueDateInfo: '30th April following FY end',
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Late fee applicable',
    requiredDocuments: ['Composition Tax Ledger', 'Annual Sales Summary', 'Purchase Summary'],
    metadata: { scheme: 'Composition' }
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

  {
    ruleCode: 'TDS_27Q_QUARTERLY',
    regulationCategory: 'income_tax',
    complianceName: 'Form 27Q: TDS on NRI/Foreign Payments',
    formNumber: '27Q',
    description: 'Quarterly TDS return for payments to non-residents',
    periodicity: 'quarterly',
    dueDateInfo: 'Quarterly: 31 July, 31 Oct, 31 Jan, 31 May',
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Late fee: ₹200/day; penalty under 271H',
    requiredDocuments: ['Payment Register', 'Form 15CA/CB', 'PAN/TRC of payee', 'TDS Challans'],
    metadata: {}
  },

  {
    ruleCode: 'TDS_27EQ_QUARTERLY',
    regulationCategory: 'income_tax',
    complianceName: 'Form 27EQ: TCS Return',
    formNumber: '27EQ',
    description: 'Quarterly TCS return for tax collected at source',
    periodicity: 'quarterly',
    dueDateInfo: 'Quarterly: 31 July, 31 Oct, 31 Jan, 31 May',
    priorityLevel: 'medium',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Late fee: ₹200/day; penalty under 271H',
    requiredDocuments: ['TCS Collection Register', 'Customer PAN', 'TCS Challans'],
    metadata: {}
  },

  {
    ruleCode: 'TDS_CHALLAN_281_MONTHLY',
    regulationCategory: 'income_tax',
    complianceName: 'TDS Payment: Challan 281',
    formNumber: 'Challan 281',
    description: 'Monthly deposit of TDS deducted',
    periodicity: 'monthly',
    dueDateInfo: '7th of the following month (30th April for March)',
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Interest 1.5% per month + penalties',
    requiredDocuments: ['TDS Ledger', 'Bank Payment Proof', 'Challan 281'],
    metadata: {}
  },

  {
    ruleCode: 'TDS_FORM16_ANNUAL',
    regulationCategory: 'income_tax',
    complianceName: 'Form 16 Issuance',
    formNumber: 'Form 16',
    description: 'Annual TDS certificate for salary payments',
    periodicity: 'annual',
    dueDateInfo: '15th June following FY end',
    priorityLevel: 'medium',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Penalty for delayed issuance',
    requiredDocuments: ['Form 24Q Acknowledgement', 'Salary Register', 'Employee PAN'],
    metadata: {}
  },

  {
    ruleCode: 'TDS_FORM16A_QUARTERLY',
    regulationCategory: 'income_tax',
    complianceName: 'Form 16A Issuance',
    formNumber: 'Form 16A',
    description: 'Quarterly TDS certificate for non-salary payments',
    periodicity: 'quarterly',
    dueDateInfo: '15 days from due date of TDS return filing',
    priorityLevel: 'medium',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Penalty for delayed issuance',
    requiredDocuments: ['Form 26Q/27Q Acknowledgement', 'Vendor PAN', 'TDS Challans'],
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
  },
  {
    ruleCode: 'ESI_HALFYEARLY_OCT_MAR',
    regulationCategory: 'pf_esi',
    complianceName: 'ESI Half-Yearly Return: October-March',
    formNumber: 'ESI Half-Yearly Return',
    description: 'Half-yearly ESI return covering October to March period',
    periodicity: 'half_yearly',
    dueDateInfo: '11th May',
    employeeCountMin: 10,
    priorityLevel: 'medium',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Penalties for non-filing',
    requiredDocuments: ['ESI Contribution Statement', 'Employee Register'],
    metadata: {}
  },

  // ==================== PROFESSIONAL TAX (PT) ====================

  {
    ruleCode: 'PT_MONTHLY',
    regulationCategory: 'professional_tax',
    complianceName: 'Professional Tax Payment',
    description: 'Monthly professional tax payment and return (state-specific)',
    periodicity: 'monthly',
    dueDateInfo: 'Typically 15th/20th of following month (state-specific)',
    stateSpecific: true,
    applicableStates: ['Maharashtra', 'Karnataka', 'West Bengal', 'Gujarat', 'Tamil Nadu', 'Telangana', 'Andhra Pradesh', 'Kerala'],
    priorityLevel: 'medium',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Late fee and interest as per state PT Act',
    requiredDocuments: ['Salary Register', 'PT Challan', 'State PT Registration Certificate'],
    metadata: {}
  },

  {
    ruleCode: 'PT_ANNUAL_RETURN',
    regulationCategory: 'professional_tax',
    complianceName: 'Professional Tax Annual Return',
    description: 'Annual PT return where applicable (state-specific)',
    periodicity: 'annual',
    dueDateInfo: 'Varies by state (often 30th April)',
    stateSpecific: true,
    applicableStates: ['Maharashtra', 'Karnataka', 'West Bengal'],
    priorityLevel: 'medium',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Late fee and penalties as per state PT Act',
    requiredDocuments: ['PT Payment Summary', 'Employee-wise PT Calculation'],
    metadata: {}
  },

  // ==================== LICENSES & STATE COMPLIANCE ====================

  {
    ruleCode: 'LICENSE_SHOPS_ESTABLISHMENT',
    regulationCategory: 'licenses',
    complianceName: 'Shops & Establishment Registration',
    description: 'State registration under Shops & Establishment Act',
    periodicity: 'one_time',
    dueDateInfo: 'Within 30 days of commencing business (state-specific)',
    stateSpecific: true,
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Penalties for operating without registration',
    requiredDocuments: ['PAN', 'Address Proof', 'Rent Agreement/Ownership Proof', 'Employee Details'],
    metadata: {}
  },

  {
    ruleCode: 'LICENSE_SHOPS_ESTABLISHMENT_RENEWAL',
    regulationCategory: 'licenses',
    complianceName: 'Shops & Establishment Renewal',
    description: 'Periodic renewal of Shops & Establishment registration',
    periodicity: 'annual',
    dueDateInfo: 'Varies by state (often before expiry)',
    stateSpecific: true,
    priorityLevel: 'medium',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Late fee or penalties for non-renewal',
    requiredDocuments: ['Previous Registration Certificate', 'Employee Register', 'Address Proof'],
    metadata: {}
  },

  {
    ruleCode: 'LICENSE_FSSAI_RENEWAL',
    regulationCategory: 'licenses',
    complianceName: 'FSSAI License Renewal',
    description: 'Renewal for FSSAI license/registration',
    periodicity: 'annual',
    dueDateInfo: 'Apply before expiry (recommended 30 days prior)',
    priorityLevel: 'high',
    penaltyRiskLevel: 'high',
    penaltyInfo: 'Late fee per day and penalties for operating without valid license',
    requiredDocuments: ['FSSAI License', 'Food Safety Plan', 'Premises Proof', 'Photo ID'],
    metadata: {}
  },

  {
    ruleCode: 'LICENSE_TRADE_RENEWAL',
    regulationCategory: 'licenses',
    complianceName: 'Trade License Renewal',
    description: 'Municipal trade license renewal',
    periodicity: 'annual',
    dueDateInfo: 'Varies by municipality (often 31st March)',
    stateSpecific: true,
    priorityLevel: 'medium',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Late fee and penalties for non-renewal',
    requiredDocuments: ['Previous Trade License', 'Property Tax Receipt', 'NOC/No dues certificate'],
    metadata: {}
  },

  // ==================== FUNDING READINESS ====================

  {
    ruleCode: 'FUNDING_DUE_DILIGENCE_PACK',
    regulationCategory: 'funding_readiness',
    complianceName: 'Investor Due Diligence Pack',
    description: 'Prepare core diligence documentation before fundraising',
    periodicity: 'event_based',
    dueDateInfo: 'Before any funding round or investor diligence',
    priorityLevel: 'high',
    penaltyRiskLevel: 'medium',
    penaltyInfo: 'Delayed fundraising and adverse terms',
    requiredDocuments: ['Cap Table', 'Shareholder Agreements', 'Board Minutes', 'GST Returns', 'IT Returns', 'Audited Financials'],
    metadata: { trigger_event: 'fundraising' }
  },

  {
    ruleCode: 'FUNDING_CAP_TABLE_UPDATE',
    regulationCategory: 'funding_readiness',
    complianceName: 'Cap Table & ESOP Register Update',
    description: 'Keep cap table and ESOP registers updated for funding readiness',
    periodicity: 'quarterly',
    dueDateInfo: 'Quarterly internal update',
    priorityLevel: 'medium',
    penaltyRiskLevel: 'low',
    penaltyInfo: 'Delays in diligence and valuation discussions',
    requiredDocuments: ['Cap Table', 'ESOP Register', 'Share Certificates'],
    metadata: {}
  },

  {
    ruleCode: 'FUNDING_GOVERNANCE_MINUTES',
    regulationCategory: 'funding_readiness',
    complianceName: 'Board & Shareholder Minutes Archive',
    description: 'Ensure board/shareholder minutes are filed and archived',
    periodicity: 'quarterly',
    dueDateInfo: 'Quarterly internal archive check',
    priorityLevel: 'medium',
    penaltyRiskLevel: 'low',
    penaltyInfo: 'Governance gaps during diligence',
    requiredDocuments: ['Board Minutes', 'Shareholder Resolutions', 'Registers'],
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
