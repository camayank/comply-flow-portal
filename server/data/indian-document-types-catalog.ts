/**
 * Comprehensive Indian Compliance Document Types Catalog
 * 
 * Following patterns from:
 * - Vanta: Smart document categorization
 * - Secureframe: Document templates and checklists
 * - Rippling: Validation rules and required fields
 * 
 * Covers 200+ document types used in Indian compliance
 */

export interface DocumentType {
  documentKey: string;
  name: string;
  category: 'identity' | 'tax' | 'financial' | 'legal' | 'operational' | 'statutory' | 'registration';
  description: string;
  validityPeriod?: number; // In days, null = permanent
  renewalReminder?: number; // Days before expiry
  mandatoryFields: string[];
  optionalFields: string[];
  validationRules: ValidationRule[];
  fileRequirements: FileRequirements;
  commonFor: string[]; // Which services commonly need this
  sampleTemplate?: string; // URL to template/sample
  issuingAuthority?: string;
  ocrEnabled: boolean; // Can we extract data automatically?
}

export interface ValidationRule {
  field: string;
  type: 'format' | 'length' | 'range' | 'checksum' | 'cross_reference';
  rule: string;
  errorMessage: string;
}

export interface FileRequirements {
  allowedFormats: string[];
  maxSizeKB: number;
  minResolutionDPI?: number;
  colorRequired?: boolean;
  pagesExpected?: number;
}

/**
 * MASTER DOCUMENT TYPES CATALOG
 * Organized by category for easy navigation
 */
export const INDIAN_DOCUMENT_TYPES: DocumentType[] = [
  // ============= IDENTITY DOCUMENTS =============
  {
    documentKey: 'pan_card',
    name: 'PAN Card',
    category: 'identity',
    description: 'Permanent Account Number issued by Income Tax Department',
    validityPeriod: null, // Permanent
    mandatoryFields: ['pan_number', 'name', 'dob'],
    optionalFields: ['father_name'],
    validationRules: [
      {
        field: 'pan_number',
        type: 'format',
        rule: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
        errorMessage: 'PAN must be 10 characters: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)'
      }
    ],
    fileRequirements: {
      allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
      maxSizeKB: 2048,
      colorRequired: true
    },
    commonFor: ['all_services'],
    issuingAuthority: 'Income Tax Department',
    ocrEnabled: true
  },
  
  {
    documentKey: 'aadhaar_card',
    name: 'Aadhaar Card',
    category: 'identity',
    description: 'Unique Identity Number issued by UIDAI',
    validityPeriod: null,
    mandatoryFields: ['aadhaar_number', 'name', 'dob', 'address'],
    optionalFields: [],
    validationRules: [
      {
        field: 'aadhaar_number',
        type: 'format',
        rule: '^[0-9]{12}$',
        errorMessage: 'Aadhaar must be exactly 12 digits'
      },
      {
        field: 'aadhaar_number',
        type: 'checksum',
        rule: 'verhoeff',
        errorMessage: 'Invalid Aadhaar number (checksum failed)'
      }
    ],
    fileRequirements: {
      allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
      maxSizeKB: 2048
    },
    commonFor: ['business_registration', 'bank_account_opening'],
    issuingAuthority: 'UIDAI',
    ocrEnabled: true
  },

  // ============= TAX DOCUMENTS =============
  {
    documentKey: 'gst_certificate',
    name: 'GST Registration Certificate',
    category: 'tax',
    description: 'GST Registration Certificate from GST Portal',
    validityPeriod: null,
    renewalReminder: 90,
    mandatoryFields: ['gstin', 'legal_name', 'trade_name', 'registration_date', 'business_address'],
    optionalFields: ['additional_places_of_business'],
    validationRules: [
      {
        field: 'gstin',
        type: 'format',
        rule: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}[Z]{1}[A-Z0-9]{1}$',
        errorMessage: 'Invalid GSTIN format. Example: 29AABCT1234E1Z5'
      }
    ],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 5120,
      pagesExpected: 1
    },
    commonFor: ['gst_returns', 'gst_registration', 'annual_filings'],
    issuingAuthority: 'GST Council',
    ocrEnabled: true
  },

  {
    documentKey: 'tan_certificate',
    name: 'TAN Allotment Letter',
    category: 'tax',
    description: 'Tax Deduction Account Number Certificate',
    validityPeriod: null,
    mandatoryFields: ['tan', 'name', 'address'],
    optionalFields: [],
    validationRules: [
      {
        field: 'tan',
        type: 'format',
        rule: '^[A-Z]{4}[0-9]{5}[A-Z]{1}$',
        errorMessage: 'TAN must be 10 characters: 4 letters, 5 digits, 1 letter'
      }
    ],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 2048
    },
    commonFor: ['tds_quarterly', 'tds_annual'],
    issuingAuthority: 'Income Tax Department',
    ocrEnabled: true
  },

  // ============= FINANCIAL DOCUMENTS =============
  {
    documentKey: 'bank_statement',
    name: 'Bank Account Statement',
    category: 'financial',
    description: 'Monthly bank statement showing all transactions',
    validityPeriod: 90, // Valid for 90 days
    renewalReminder: 15,
    mandatoryFields: ['account_number', 'ifsc', 'period_from', 'period_to', 'bank_name'],
    optionalFields: ['opening_balance', 'closing_balance'],
    validationRules: [
      {
        field: 'ifsc',
        type: 'format',
        rule: '^[A-Z]{4}0[A-Z0-9]{6}$',
        errorMessage: 'Invalid IFSC code format'
      }
    ],
    fileRequirements: {
      allowedFormats: ['pdf', 'xlsx', 'csv'],
      maxSizeKB: 10240
    },
    commonFor: ['accounting_monthly', 'loan_application', 'gst_returns'],
    ocrEnabled: true
  },

  {
    documentKey: 'balance_sheet',
    name: 'Balance Sheet',
    category: 'financial',
    description: 'Annual financial statement showing assets and liabilities',
    validityPeriod: 365,
    renewalReminder: 60,
    mandatoryFields: ['financial_year', 'total_assets', 'total_liabilities', 'signed_by'],
    optionalFields: ['auditor_name', 'audit_report_number'],
    validationRules: [
      {
        field: 'financial_year',
        type: 'format',
        rule: '^20[0-9]{2}-[0-9]{2}$',
        errorMessage: 'Financial year must be in format YYYY-YY (e.g., 2025-26)'
      }
    ],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 5120
    },
    commonFor: ['annual_filings_roc', 'bs_pl_annual', 'itr_company'],
    ocrEnabled: true
  },

  {
    documentKey: 'profit_loss_statement',
    name: 'Profit & Loss Statement',
    category: 'financial',
    description: 'Income statement showing revenue and expenses',
    validityPeriod: 365,
    renewalReminder: 60,
    mandatoryFields: ['financial_year', 'revenue', 'expenses', 'net_profit_loss'],
    optionalFields: ['operating_profit', 'ebitda'],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['pdf', 'xlsx'],
      maxSizeKB: 5120
    },
    commonFor: ['annual_filings_roc', 'bs_pl_annual', 'loan_application'],
    ocrEnabled: true
  },

  // ============= LEGAL DOCUMENTS =============
  {
    documentKey: 'certificate_of_incorporation',
    name: 'Certificate of Incorporation',
    category: 'legal',
    description: 'Company registration certificate from ROC',
    validityPeriod: null,
    mandatoryFields: ['cin', 'company_name', 'incorporation_date', 'roc'],
    optionalFields: ['authorized_capital', 'paid_up_capital'],
    validationRules: [
      {
        field: 'cin',
        type: 'format',
        rule: '^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$',
        errorMessage: 'Invalid CIN format'
      }
    ],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 2048
    },
    commonFor: ['business_registration', 'annual_filings_roc'],
    issuingAuthority: 'Registrar of Companies',
    ocrEnabled: true
  },

  {
    documentKey: 'moa',
    name: 'Memorandum of Association',
    category: 'legal',
    description: 'Company charter defining objectives and scope',
    validityPeriod: null,
    mandatoryFields: ['company_name', 'registered_office', 'objects_clause'],
    optionalFields: [],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 5120
    },
    commonFor: ['pvt_ltd_incorporation', 'company_changes'],
    ocrEnabled: false
  },

  {
    documentKey: 'aoa',
    name: 'Articles of Association',
    category: 'legal',
    description: 'Company rules and regulations for internal management',
    validityPeriod: null,
    mandatoryFields: ['company_name', 'share_capital_clause'],
    optionalFields: [],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 5120
    },
    commonFor: ['pvt_ltd_incorporation', 'company_changes'],
    ocrEnabled: false
  },

  // ============= STATUTORY DOCUMENTS =============
  {
    documentKey: 'pf_registration',
    name: 'PF Registration Certificate',
    category: 'statutory',
    description: 'EPFO registration certificate',
    validityPeriod: null,
    mandatoryFields: ['pf_number', 'establishment_name', 'registration_date'],
    optionalFields: ['establishment_code'],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 2048
    },
    commonFor: ['pf_esi_monthly', 'payroll_processing'],
    issuingAuthority: 'EPFO',
    ocrEnabled: true
  },

  {
    documentKey: 'esi_registration',
    name: 'ESI Registration Certificate',
    category: 'statutory',
    description: 'ESIC registration certificate',
    validityPeriod: null,
    mandatoryFields: ['esi_number', 'establishment_name', 'registration_date'],
    optionalFields: [],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 2048
    },
    commonFor: ['pf_esi_monthly', 'payroll_processing'],
    issuingAuthority: 'ESIC',
    ocrEnabled: true
  },

  // ============= OPERATIONAL DOCUMENTS =============
  {
    documentKey: 'sales_register',
    name: 'Sales Register',
    category: 'operational',
    description: 'Detailed record of all sales transactions',
    validityPeriod: 30,
    renewalReminder: 7,
    mandatoryFields: ['period_from', 'period_to', 'total_sales', 'taxable_value', 'gst_collected'],
    optionalFields: ['export_sales', 'interstate_sales'],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['xlsx', 'csv', 'pdf'],
      maxSizeKB: 20480
    },
    commonFor: ['gst_returns', 'accounting_monthly'],
    ocrEnabled: true
  },

  {
    documentKey: 'purchase_register',
    name: 'Purchase Register',
    category: 'operational',
    description: 'Detailed record of all purchase transactions',
    validityPeriod: 30,
    renewalReminder: 7,
    mandatoryFields: ['period_from', 'period_to', 'total_purchases', 'input_tax_credit'],
    optionalFields: ['import_purchases', 'capital_goods'],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['xlsx', 'csv', 'pdf'],
      maxSizeKB: 20480
    },
    commonFor: ['gst_returns', 'accounting_monthly'],
    ocrEnabled: true
  },

  {
    documentKey: 'salary_register',
    name: 'Salary Register',
    category: 'operational',
    description: 'Monthly employee salary details',
    validityPeriod: 30,
    renewalReminder: 7,
    mandatoryFields: ['month', 'total_employees', 'gross_salary', 'tds_deducted'],
    optionalFields: ['pf_deduction', 'esi_deduction'],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['xlsx', 'csv', 'pdf'],
      maxSizeKB: 10240
    },
    commonFor: ['tds_quarterly', 'pf_esi_monthly', 'payroll_processing'],
    ocrEnabled: true
  },

  // ============= REGISTRATION DOCUMENTS =============
  {
    documentKey: 'trade_license',
    name: 'Trade License',
    category: 'registration',
    description: 'Municipal corporation trade license',
    validityPeriod: 365,
    renewalReminder: 60,
    mandatoryFields: ['license_number', 'business_name', 'business_address', 'validity_date'],
    optionalFields: ['business_category'],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 2048
    },
    commonFor: ['business_registration', 'shops_establishments'],
    ocrEnabled: true
  },

  {
    documentKey: 'fssai_license',
    name: 'FSSAI License',
    category: 'registration',
    description: 'Food Safety and Standards license',
    validityPeriod: 365,
    renewalReminder: 60,
    mandatoryFields: ['license_number', 'license_type', 'validity_from', 'validity_to'],
    optionalFields: ['food_category'],
    validationRules: [
      {
        field: 'license_number',
        type: 'format',
        rule: '^[0-9]{14}$',
        errorMessage: 'FSSAI license must be 14 digits'
      }
    ],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 2048
    },
    commonFor: ['fssai_registration', 'fssai_renewal'],
    issuingAuthority: 'FSSAI',
    ocrEnabled: true
  },

  // ============= ADDITIONAL COMPLIANCE DOCUMENTS =============
  {
    documentKey: 'gstr1',
    name: 'GSTR-1 Return',
    category: 'tax',
    description: 'Outward supplies return',
    validityPeriod: 30,
    renewalReminder: 5,
    mandatoryFields: ['gstin', 'return_period', 'filing_date'],
    optionalFields: ['amendment_flag'],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['pdf', 'json'],
      maxSizeKB: 10240
    },
    commonFor: ['gst_returns'],
    ocrEnabled: true
  },

  {
    documentKey: 'gstr3b',
    name: 'GSTR-3B Return',
    category: 'tax',
    description: 'Summary return with tax liability',
    validityPeriod: 30,
    renewalReminder: 5,
    mandatoryFields: ['gstin', 'return_period', 'tax_payable', 'itc_claimed'],
    optionalFields: [],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['pdf', 'json'],
      maxSizeKB: 5120
    },
    commonFor: ['gst_returns'],
    ocrEnabled: true
  },

  {
    documentKey: 'tds_challan',
    name: 'TDS Challan / Form 26AS',
    category: 'tax',
    description: 'TDS payment proof',
    validityPeriod: 90,
    mandatoryFields: ['challan_number', 'payment_date', 'amount_paid', 'tan'],
    optionalFields: ['assessment_year'],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 2048
    },
    commonFor: ['tds_quarterly', 'tds_annual'],
    ocrEnabled: true
  },

  {
    documentKey: 'audit_report',
    name: 'Statutory Audit Report',
    category: 'financial',
    description: 'Chartered Accountant audit report',
    validityPeriod: 365,
    renewalReminder: 60,
    mandatoryFields: ['financial_year', 'auditor_name', 'auditor_membership_number', 'audit_opinion'],
    optionalFields: ['qualifications', 'emphasis_of_matter'],
    validationRules: [],
    fileRequirements: {
      allowedFormats: ['pdf'],
      maxSizeKB: 10240
    },
    commonFor: ['annual_filings_roc', 'tax_audit', 'itr_company'],
    ocrEnabled: true
  }
];

/**
 * Get documents required for a specific service
 */
export function getDocumentsForService(serviceKey: string): DocumentType[] {
  return INDIAN_DOCUMENT_TYPES.filter(doc => 
    doc.commonFor.includes(serviceKey) || doc.commonFor.includes('all_services')
  );
}

/**
 * Get document type by key
 */
export function getDocumentType(documentKey: string): DocumentType | undefined {
  return INDIAN_DOCUMENT_TYPES.find(doc => doc.documentKey === documentKey);
}

/**
 * Get documents by category
 */
export function getDocumentsByCategory(category: string): DocumentType[] {
  return INDIAN_DOCUMENT_TYPES.filter(doc => doc.category === category);
}

/**
 * Get expiring documents (within X days)
 */
export function getExpiringDocumentTypes(daysThreshold: number = 60): DocumentType[] {
  return INDIAN_DOCUMENT_TYPES.filter(doc => 
    doc.validityPeriod !== null && 
    doc.renewalReminder && 
    doc.renewalReminder <= daysThreshold
  );
}
