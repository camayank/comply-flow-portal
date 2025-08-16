// Intelligent service configuration based on service type and name
export interface ServiceSuggestions {
  documents: string[];
  workflowSteps: string[];
}

// Service patterns for intelligent matching
const servicePatterns: Record<string, { keywords: string[]; documents: string[]; workflowSteps: string[] }> = {
  // GST Related Services
  gst: {
    keywords: ['gst', 'goods service tax', 'gstr', 'returns'],
    documents: [
      'PAN Card', 'Aadhaar Card', 'Address Proof', 'Bank Statement',
      'Business Registration Certificate', 'Rental Agreement',
      'Sales Register', 'Purchase Register', 'GSTR-3B', 'GSTR-1'
    ],
    workflowSteps: [
      'Document Collection', 'Eligibility Verification', 'Application Preparation',
      'Online Filing', 'Application Tracking', 'Registration Certificate',
      'GST Number Allocation', 'Client Delivery'
    ]
  },

  // Company Incorporation
  incorporation: {
    keywords: ['incorporation', 'company registration', 'pvt ltd', 'limited', 'startup'],
    documents: [
      'Director PAN Card', 'Director Aadhaar Card', 'Address Proof',
      'MOA/AOA Draft', 'Name Availability Certificate', 'Registered Office Proof',
      'Board Resolution', 'Form INC-1', 'Form INC-7', 'Form INC-22'
    ],
    workflowSteps: [
      'Name Reservation', 'Document Collection', 'MOA/AOA Preparation',
      'Form Filing', 'Government Processing', 'Certificate of Incorporation',
      'PAN/TAN Application', 'Bank Account Opening Assistance', 'Compliance Setup'
    ]
  },

  // Income Tax Returns
  itr: {
    keywords: ['itr', 'income tax', 'return filing', 'tax return'],
    documents: [
      'PAN Card', 'Aadhaar Card', 'Form 16', 'Salary Slips',
      'Bank Statements', 'Investment Proofs', 'TDS Certificates',
      'House Property Documents', 'Capital Gains Documents'
    ],
    workflowSteps: [
      'Document Collection', 'Income Calculation', 'Tax Computation',
      'Return Preparation', 'Client Review', 'Online Filing',
      'ITR-V Generation', 'Acknowledgment Receipt', 'Refund Tracking'
    ]
  },

  // TDS Services
  tds: {
    keywords: ['tds', 'tax deducted source', 'quarterly', 'challan'],
    documents: [
      'PAN Card', 'TAN Certificate', 'Payroll Register',
      'Vendor Payment Details', 'Bank Statements', 'Form 16A',
      'TDS Certificates', 'Challan Details'
    ],
    workflowSteps: [
      'Data Collection', 'TDS Calculation', 'Challan Preparation',
      'Online Payment', 'Return Filing', 'TDS Certificate Generation',
      'Quarterly Compliance', 'Annual Statement'
    ]
  },

  // Accounting Services
  accounting: {
    keywords: ['accounting', 'bookkeeping', 'financial', 'ledger', 'books'],
    documents: [
      'Bank Statements', 'Cash Book', 'Purchase Invoices',
      'Sales Invoices', 'Expense Receipts', 'Petty Cash Vouchers',
      'Journal Entries', 'Trial Balance'
    ],
    workflowSteps: [
      'Document Collection', 'Data Entry', 'Bank Reconciliation',
      'Expense Categorization', 'Trial Balance Preparation',
      'Profit & Loss Statement', 'Balance Sheet', 'Client Review'
    ]
  },

  // Audit Services
  audit: {
    keywords: ['audit', 'statutory', 'internal', 'compliance audit'],
    documents: [
      'Audited Financials', 'Books of Accounts', 'Bank Statements',
      'Fixed Asset Register', 'Stock Statements', 'Loan Documents',
      'Board Resolutions', 'Statutory Registers'
    ],
    workflowSteps: [
      'Planning & Risk Assessment', 'Document Collection',
      'Internal Control Testing', 'Substantive Testing',
      'Draft Report Preparation', 'Management Discussion',
      'Final Audit Report', 'Compliance Certificate'
    ]
  },

  // ROC Filing
  roc: {
    keywords: ['roc', 'annual filing', 'aoc', 'mgt', 'registrar'],
    documents: [
      'Audited Financials', 'Board Resolutions', 'Annual Return',
      'Director Details', 'Share Capital Details', 'AOC-4',
      'MGT-7', 'ADT-1'
    ],
    workflowSteps: [
      'Financial Statement Preparation', 'Board Approval',
      'Form Preparation', 'Digital Signature', 'Online Filing',
      'Fee Payment', 'SRN Generation', 'Compliance Certificate'
    ]
  },

  // Licensing Services
  license: {
    keywords: ['license', 'registration', 'permit', 'approval'],
    documents: [
      'Application Form', 'Identity Proof', 'Address Proof',
      'Business Plan', 'NOC Documents', 'Fee Payment Receipt',
      'Site Plan', 'Compliance Certificates'
    ],
    workflowSteps: [
      'Requirement Analysis', 'Document Preparation', 'Application Filing',
      'Site Inspection', 'Compliance Verification', 'Approval Process',
      'License Issuance', 'Renewal Setup'
    ]
  },

  // Trademark Services
  trademark: {
    keywords: ['trademark', 'brand', 'logo', 'intellectual property'],
    documents: [
      'Trademark Application', 'Logo/Brand Design', 'Priority Documents',
      'Power of Attorney', 'Identity Proof', 'Address Proof',
      'User Affidavit', 'Classification Details'
    ],
    workflowSteps: [
      'Trademark Search', 'Application Preparation', 'Filing',
      'Examination Response', 'Publication', 'Opposition Handling',
      'Registration Certificate', 'Renewal Management'
    ]
  }
};

// Common document types for fallback
const commonDocuments = [
  'PAN Card', 'Aadhaar Card', 'Address Proof', 'Bank Statement',
  'Business Registration Certificate', 'Board Resolution',
  'Identity Proof', 'Application Form'
];

// Common workflow steps for fallback
const commonWorkflowSteps = [
  'Document Collection', 'Document Verification', 'Application Preparation',
  'Client Review', 'Filing/Submission', 'Processing',
  'Certificate/Approval', 'Client Delivery'
];

export function getIntelligentSuggestions(
  serviceName: string,
  serviceType: string
): ServiceSuggestions {
  const searchText = `${serviceName} ${serviceType}`.toLowerCase();
  
  // Find matching service pattern
  for (const [key, pattern] of Object.entries(servicePatterns)) {
    const hasMatch = pattern.keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
    
    if (hasMatch) {
      return {
        documents: pattern.documents,
        workflowSteps: pattern.workflowSteps
      };
    }
  }

  // Service type based fallback suggestions
  const typeBasedSuggestions = getTypeBasedSuggestions(serviceType);
  if (typeBasedSuggestions.documents.length > 0) {
    return typeBasedSuggestions;
  }

  // Default fallback
  return {
    documents: commonDocuments,
    workflowSteps: commonWorkflowSteps
  };
}

function getTypeBasedSuggestions(serviceType: string): ServiceSuggestions {
  switch (serviceType.toLowerCase()) {
    case 'compliance':
      return {
        documents: [
          'PAN Card', 'Registration Certificate', 'Compliance Documents',
          'Previous Filings', 'Bank Statements', 'Statutory Records'
        ],
        workflowSteps: [
          'Compliance Review', 'Document Collection', 'Filing Preparation',
          'Regulatory Submission', 'Approval/Acknowledgment', 'Record Keeping'
        ]
      };

    case 'registration':
      return {
        documents: [
          'Application Form', 'Identity Proof', 'Address Proof',
          'Business Plan', 'Fee Payment Receipt', 'Supporting Documents'
        ],
        workflowSteps: [
          'Eligibility Check', 'Document Preparation', 'Application Filing',
          'Processing & Review', 'Approval', 'Certificate Issuance'
        ]
      };

    case 'consultation':
      return {
        documents: [
          'Business Details', 'Financial Statements', 'Legal Documents',
          'Previous Consultations', 'Specific Query Documents'
        ],
        workflowSteps: [
          'Initial Consultation', 'Document Review', 'Analysis',
          'Solution Development', 'Presentation', 'Implementation Guidance'
        ]
      };

    case 'filing':
      return {
        documents: [
          'Forms to be Filed', 'Supporting Documents', 'Previous Filings',
          'Identity Proof', 'Authorization Documents', 'Fee Receipts'
        ],
        workflowSteps: [
          'Document Collection', 'Form Preparation', 'Review & Validation',
          'Online Filing', 'Payment', 'Acknowledgment', 'Follow-up'
        ]
      };

    default:
      return {
        documents: [],
        workflowSteps: []
      };
  }
}

// Additional helper functions
export function getServiceKeywords(serviceName: string): string[] {
  const keywords = [];
  
  for (const [key, pattern] of Object.entries(servicePatterns)) {
    const hasMatch = pattern.keywords.some(keyword => 
      serviceName.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasMatch) {
      keywords.push(...pattern.keywords);
    }
  }
  
  return [...new Set(keywords)];
}

export function getRelatedServices(serviceName: string): string[] {
  const currentKeywords = getServiceKeywords(serviceName);
  const related = [];
  
  for (const [key, pattern] of Object.entries(servicePatterns)) {
    const hasCommonKeyword = pattern.keywords.some(keyword => 
      currentKeywords.includes(keyword)
    );
    
    if (hasCommonKeyword && !pattern.keywords.some(k => 
      serviceName.toLowerCase().includes(k.toLowerCase())
    )) {
      related.push(key);
    }
  }
  
  return related;
}