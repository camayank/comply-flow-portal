// DigiComply Comprehensive Workflow Templates for Indian Companies
import { WorkflowTemplate } from './workflow-engine';

export const DIGICOMPLY_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // 1. INCORPORATION WORKFLOWS
  {
    id: 'pvt-ltd-incorporation',
    name: 'Private Limited Company Incorporation',
    category: 'incorporation',
    type: 'private_limited',
    isStandard: true,
    version: '1.0',
    metadata: {
      estimatedDuration: '15-20 days',
      totalCost: 15000,
      requiredPersonnel: ['Directors (min 2)', 'Shareholders', 'CA/CS'],
      complianceDeadlines: ['INC-20A within 180 days', 'First AGM within 18 months']
    },
    steps: [
      {
        id: 'name-reservation',
        name: 'Company Name Reservation',
        description: 'Reserve unique company name through MCA',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 3,
        dependencies: [],
        requiredDocs: ['proposed_names', 'moa_objects'],
        formType: 'RUN/SPICE+ Part A',
        fees: 1000
      },
      {
        id: 'incorporation-filing',
        name: 'Incorporation Filing',
        description: 'Complete SPICE+ Part B and related forms',
        type: 'filing',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 7,
        dependencies: ['name-reservation'],
        requiredDocs: ['spice_forms', 'moa_aoa', 'director_docs'],
        formType: 'SPICE+ Part B, MOA, AOA',
        dscRequirements: ['all_directors', 'professional']
      }
    ]
  },

  // 2. POST-INCORPORATION MANDATORY COMPLIANCE
  {
    id: 'post-incorporation-setup',
    name: 'Post-Incorporation Mandatory Setup',
    category: 'post_incorporation',
    type: 'mandatory',
    isStandard: true,
    version: '1.0',
    metadata: {
      estimatedDuration: '30-45 days',
      totalCost: 8000,
      requiredPersonnel: ['Directors', 'CA/CS'],
      complianceDeadlines: ['Complete within 180 days of incorporation']
    },
    steps: [
      {
        id: 'inc-20a-filing',
        name: 'Commencement of Business (INC-20A)',
        description: 'Declaration of commencement of business activities',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 2,
        dependencies: [],
        requiredDocs: ['verification_declaration', 'office_verification'],
        formType: 'INC-20A',
        deadlines: ['Within 180 days of incorporation'],
        fees: 500
      },
      {
        id: 'bank-account-opening',
        name: 'Corporate Bank Account Opening',
        description: 'Open current account for company operations',
        type: 'documentation',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 7,
        dependencies: ['inc-20a-filing'],
        requiredDocs: ['incorporation_certificate', 'pan_card', 'board_resolution', 'kyc_docs']
      },
      {
        id: 'statutory-registers',
        name: 'Statutory Registers Maintenance',
        description: 'Set up mandatory company registers',
        type: 'documentation',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 3,
        dependencies: [],
        requiredDocs: ['member_register', 'director_register', 'charge_register', 'meeting_minutes']
      }
    ]
  },

  // 3. ANNUAL COMPLIANCE WORKFLOWS
  {
    id: 'annual-compliance-package',
    name: 'Annual Compliance Package',
    category: 'annual_compliance',
    type: 'recurring',
    isStandard: true,
    version: '1.0',
    metadata: {
      estimatedDuration: '45-60 days',
      totalCost: 25000,
      requiredPersonnel: ['Auditor', 'CA/CS', 'Directors'],
      complianceDeadlines: ['AGM by 30th September', 'ROC filings by 30th October']
    },
    steps: [
      {
        id: 'agm-conduct',
        name: 'Annual General Meeting',
        description: 'Conduct mandatory AGM and board meetings',
        type: 'verification',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 15,
        dependencies: [],
        requiredDocs: ['agm_notice', 'board_resolutions', 'financial_statements'],
        deadlines: ['Within 6 months of FY end, by 30th September']
      },
      {
        id: 'aoc-4-filing',
        name: 'AOC-4 Financial Statement Filing',
        description: 'File annual financial statements with MCA',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 5,
        dependencies: ['agm-conduct'],
        requiredDocs: ['balance_sheet', 'profit_loss', 'auditor_report', 'directors_report'],
        formType: 'AOC-4',
        deadlines: ['Within 30 days of AGM'],
        fees: 500
      },
      {
        id: 'mgt-7-filing',
        name: 'MGT-7 Annual Return Filing',
        description: 'File annual return with shareholding details',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 3,
        dependencies: ['aoc-4-filing'],
        requiredDocs: ['annual_return', 'shareholding_pattern', 'board_composition'],
        formType: 'MGT-7',
        deadlines: ['Within 60 days of AGM'],
        fees: 300
      }
    ]
  },

  // 4. EVENT-BASED COMPLIANCE
  {
    id: 'director-change-workflow',
    name: 'Director Appointment/Resignation Workflow',
    category: 'event_based',
    type: 'director_changes',
    isStandard: true,
    version: '1.0',
    metadata: {
      estimatedDuration: '7-15 days',
      totalCost: 3500,
      requiredPersonnel: ['Directors', 'CA/CS'],
      complianceDeadlines: ['File within 30 days of appointment/resignation']
    },
    steps: [
      {
        id: 'board-resolution',
        name: 'Board Resolution for Director Change',
        description: 'Pass resolution for appointment/resignation',
        type: 'documentation',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 1,
        dependencies: [],
        requiredDocs: ['board_resolution', 'consent_letter', 'resignation_letter']
      },
      {
        id: 'dir-forms-filing',
        name: 'DIR Forms Filing',
        description: 'File DIR-11/DIR-12 with MCA',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 5,
        dependencies: ['board-resolution'],
        requiredDocs: ['dir_forms', 'supporting_docs'],
        formType: 'DIR-11/DIR-12',
        deadlines: ['Within 30 days of change'],
        fees: 500
      }
    ]
  },

  // 5. TURNOVER-BASED COMPLIANCE
  {
    id: 'turnover-based-audit',
    name: 'Turnover-Based Audit Requirements',
    category: 'turnover_based',
    type: 'audit_mandatory',
    isStandard: true,
    version: '1.0',
    metadata: {
      estimatedDuration: '60-90 days',
      totalCost: 35000,
      requiredPersonnel: ['Statutory Auditor', 'CA', 'Internal Team'],
      complianceDeadlines: ['Audit completion before AGM'],
      eligibilityCriteria: ['Turnover > ₹1 crore', 'OR Paid-up capital > ₹50 lakhs']
    },
    steps: [
      {
        id: 'auditor-appointment',
        name: 'Statutory Auditor Appointment',
        description: 'Appoint qualified statutory auditor',
        type: 'verification',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 7,
        dependencies: [],
        requiredDocs: ['auditor_consent', 'eligibility_certificate'],
        formType: 'ADT-1',
        deadlines: ['Within 30 days of requirement arising']
      },
      {
        id: 'statutory-audit',
        name: 'Statutory Audit Conduct',
        description: 'Complete statutory audit of financial statements',
        type: 'verification',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 45,
        dependencies: ['auditor-appointment'],
        requiredDocs: ['books_of_accounts', 'supporting_vouchers', 'bank_statements']
      }
    ]
  },

  // 6. SPECIFIC CONDITION-BASED WORKFLOWS
  {
    id: 'foreign-investment-compliance',
    name: 'Foreign Investment Compliance',
    category: 'condition_based',
    type: 'fdi_fpi',
    isStandard: true,
    version: '1.0',
    metadata: {
      estimatedDuration: '30-45 days',
      totalCost: 20000,
      requiredPersonnel: ['FEMA Consultant', 'CA', 'Legal Advisor'],
      complianceDeadlines: ['RBI reporting within 30 days'],
      eligibilityCriteria: ['Foreign investment received', 'FDI/FPI transactions']
    },
    steps: [
      {
        id: 'fdi-approval',
        name: 'FDI Approval/Notification',
        description: 'Obtain necessary approvals for foreign investment',
        type: 'approval',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 20,
        dependencies: [],
        requiredDocs: ['investment_proposal', 'sectoral_clearances'],
        notes: ['Automatic route vs approval route determination']
      },
      {
        id: 'rbi-reporting',
        name: 'RBI Reporting (FC-GPR/FC-TRS)',
        description: 'Report foreign investment to RBI',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 5,
        dependencies: ['fdi-approval'],
        requiredDocs: ['investment_details', 'share_certificates'],
        formType: 'FC-GPR/FC-TRS',
        deadlines: ['Within 30 days of investment']
      }
    ]
  },

  // 7. LICENSING AND REGISTRATIONS
  {
    id: 'business-licenses-package',
    name: 'Business Licenses & Registrations',
    category: 'licenses',
    type: 'industry_specific',
    isStandard: true,
    version: '1.0',
    metadata: {
      estimatedDuration: '45-90 days',
      totalCost: 30000,
      requiredPersonnel: ['Legal Team', 'CA', 'Industry Expert'],
      complianceDeadlines: ['Before commencement of business']
    },
    steps: [
      {
        id: 'gst-registration',
        name: 'GST Registration',
        description: 'Register for Goods and Services Tax',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 7,
        dependencies: [],
        requiredDocs: ['business_registration', 'bank_details', 'business_premises'],
        formType: 'GST REG-01',
        eligibilityCriteria: ['Turnover > ₹20 lakhs (₹10 lakhs for NE states)']
      },
      {
        id: 'pf-esi-registration',
        name: 'PF & ESI Registration',
        description: 'Register for employee benefits',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 10,
        dependencies: [],
        requiredDocs: ['employee_details', 'salary_structure'],
        eligibilityCriteria: ['20+ employees for PF', '10+ employees for ESI']
      },
      {
        id: 'professional-tax',
        name: 'Professional Tax Registration',
        description: 'State-wise professional tax registration',
        type: 'filing',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 5,
        dependencies: [],
        requiredDocs: ['employee_list', 'office_address'],
        notes: ['State-specific requirements']
      },
      {
        id: 'trade-license',
        name: 'Trade License',
        description: 'Local municipal trade license',
        type: 'approval',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 15,
        dependencies: [],
        requiredDocs: ['premises_documents', 'noc_certificates'],
        notes: ['Municipal corporation specific']
      }
    ]
  },

  // 8. VOLUNTARY REGISTRATIONS
  {
    id: 'voluntary-registrations',
    name: 'Voluntary Registrations & Certifications',
    category: 'voluntary',
    type: 'optional_compliance',
    isStandard: true,
    version: '1.0',
    metadata: {
      estimatedDuration: '60-120 days',
      totalCost: 50000,
      requiredPersonnel: ['Consultants', 'Internal Team'],
      complianceDeadlines: ['As per business requirements']
    },
    steps: [
      {
        id: 'iso-certification',
        name: 'ISO Certification (9001/14001/45001)',
        description: 'Quality/Environment/Safety management certification',
        type: 'verification',
        isRequired: false,
        canBeModified: true,
        estimatedDays: 90,
        dependencies: [],
        requiredDocs: ['quality_manual', 'process_documentation'],
        notes: ['Business enhancement opportunity']
      },
      {
        id: 'import-export-code',
        name: 'Import Export Code (IEC)',
        description: 'Authorization for international trade',
        type: 'filing',
        isRequired: false,
        canBeModified: false,
        estimatedDays: 7,
        dependencies: [],
        requiredDocs: ['business_documents', 'bank_certificate'],
        formType: 'ANF 2A',
        eligibilityCriteria: ['International trade business']
      },
      {
        id: 'startup-registration',
        name: 'Startup India Registration',
        description: 'Register as recognized startup',
        type: 'approval',
        isRequired: false,
        canBeModified: true,
        estimatedDays: 30,
        dependencies: [],
        requiredDocs: ['business_plan', 'innovation_proof'],
        eligibilityCriteria: ['Innovative business model', 'Less than 10 years old']
      }
    ]
  },

  // 9. AUDIT SERVICES WORKFLOWS
  {
    id: 'comprehensive-audit-services',
    name: 'Comprehensive Audit Services',
    category: 'audit_services',
    type: 'professional_services',
    isStandard: true,
    version: '1.0',
    metadata: {
      estimatedDuration: '90-120 days',
      totalCost: 75000,
      requiredPersonnel: ['Chartered Accountant', 'Audit Team', 'Internal Staff'],
      complianceDeadlines: ['Before AGM and tax filing deadlines']
    },
    steps: [
      {
        id: 'internal-audit',
        name: 'Internal Audit',
        description: 'Comprehensive internal audit of operations',
        type: 'verification',
        isRequired: false,
        canBeModified: true,
        estimatedDays: 30,
        dependencies: [],
        requiredDocs: ['internal_controls', 'process_documentation'],
        eligibilityCriteria: ['Turnover > ₹200 crores OR Borrowings > ₹100 crores']
      },
      {
        id: 'tax-audit',
        name: 'Tax Audit (44AB)',
        description: 'Income tax audit under section 44AB',
        type: 'verification',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 45,
        dependencies: [],
        requiredDocs: ['books_of_accounts', 'tax_records'],
        formType: '3CD Report',
        eligibilityCriteria: ['Business turnover > ₹1 crore', 'Professional income > ₹50 lakhs'],
        deadlines: ['By 30th September']
      },
      {
        id: 'gst-audit',
        name: 'GST Audit',
        description: 'Goods and Services Tax audit',
        type: 'verification',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 20,
        dependencies: [],
        requiredDocs: ['gst_returns', 'input_tax_records'],
        eligibilityCriteria: ['Annual turnover > ₹2 crores'],
        deadlines: ['By 31st December']
      }
    ]
  },

  // 10. SPECIALIZED INDUSTRY WORKFLOWS
  {
    id: 'industry-specific-licenses',
    name: 'Industry-Specific Licenses & Approvals',
    category: 'industry_specific',
    type: 'sector_compliance',
    isStandard: true,
    version: '1.0',
    metadata: {
      estimatedDuration: '60-180 days',
      totalCost: 100000,
      requiredPersonnel: ['Industry Consultants', 'Legal Experts', 'Technical Team'],
      complianceDeadlines: ['Before business commencement']
    },
    steps: [
      {
        id: 'fssai-license',
        name: 'FSSAI Food License',
        description: 'Food Safety and Standards Authority license',
        type: 'approval',
        isRequired: false,
        canBeModified: true,
        estimatedDays: 30,
        dependencies: [],
        requiredDocs: ['food_safety_plan', 'premises_layout'],
        eligibilityCriteria: ['Food business operations']
      },
      {
        id: 'drug-license',
        name: 'Drug License',
        description: 'Pharmaceutical manufacturing/trading license',
        type: 'approval',
        isRequired: false,
        canBeModified: true,
        estimatedDays: 90,
        dependencies: [],
        requiredDocs: ['technical_staff', 'premises_approval'],
        eligibilityCriteria: ['Pharmaceutical business']
      },
      {
        id: 'pollution-clearance',
        name: 'Pollution Control Clearance',
        description: 'Environmental clearances and NOCs',
        type: 'approval',
        isRequired: false,
        canBeModified: true,
        estimatedDays: 60,
        dependencies: [],
        requiredDocs: ['environmental_impact', 'waste_management_plan'],
        eligibilityCriteria: ['Manufacturing/Industrial operations']
      }
    ]
  }
];