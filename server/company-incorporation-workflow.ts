// Company Incorporation Workflow - Based on attached DOCX SOPs
export interface CompanyIncorporationStep {
  id: string;
  name: string;
  description: string;
  requiredDocs: string[];
  estimatedDays: number;
  dependencies?: string[];
  formType: string;
  dscRequirements?: string[];
  mcaPortalSteps?: string[];
  deadline?: string;
  notes?: string[];
}

export const COMPANY_INCORPORATION_WORKFLOW: CompanyIncorporationStep[] = [
  {
    id: 'pre-incorporation-prep',
    name: 'Pre-Incorporation Documentation',
    description: 'Collect and prepare all required documents and details',
    requiredDocs: [
      'minimum_2_unique_company_names',
      'minimum_2_directors_details',
      'electricity_bill_gas_bill_telephone_bill_water_bill', // not older than 2 months
      'company_moa_objects',
      'share_capital_information', // Authorized + Paid Up Capital
      'shareholding_percentage',
      'director_pan_cards',
      'director_aadhaar_cards',
      'director_passport_photos',
      'unique_email_ids',
      'unique_phone_numbers',
      'director_bank_statements', // latest as address proof
      'business_place_electricity_bill',
      'noc_from_property_owner'
    ],
    estimatedDays: 2,
    formType: 'Documentation Phase',
    notes: [
      'Collect all documents with client',
      'Prepare Word documents for DIR-2 and company incorporation',
      'Get NOC from business place owner',
      'All documents must be signed by directors and property owner'
    ]
  },
  {
    id: 'name-reservation',
    name: 'Company Name Reservation (SPICE Part A)',
    description: 'Reserve unique company name through MCA portal',
    requiredDocs: [
      'minimum_2_unique_names',
      'moa_draft_objects'
    ],
    estimatedDays: 5, // 3-7 days response from MCA
    formType: 'SPICE+ Part A',
    mcaPortalSteps: [
      'Login to MCA portal (mca.gov.in)',
      'Go to Company E-Filing → Incorporation Services',
      'Select SPICE+ form for company name reservation',
      'Enable SPICE+ Part A form',
      'Select: New company others → Private → Limited by share → Non Govt. company',
      'Select industry sub class',
      'Enter proposed names',
      'Attach MOA draft objects',
      'Click Auto Check tab',
      'Save and Submit',
      'Make payment of ₹1,000 for name reservation'
    ],
    deadline: 'Response from MCA in 3-7 days',
    notes: [
      'DSC can be applied after name approval',
      'Must proceed with incorporation within 20 days of name approval'
    ]
  },
  {
    id: 'dsc-application',
    name: 'Digital Signature Certificate (DSC) Application',
    description: 'Apply for DSC certificates for directors and professionals',
    requiredDocs: [
      'director_pan_cards',
      'director_aadhaar_cards',
      'director_photos',
      'professional_details'
    ],
    estimatedDays: 3,
    formType: 'DSC Application',
    dependencies: ['name-reservation'],
    notes: [
      'Apply DSC after name approval',
      'All directors, shareholders, and professionals need DSC',
      'DSC must be associated on V3 portal, especially for existing DIN holders'
    ]
  },
  {
    id: 'incorporation-forms-preparation',
    name: 'Incorporation Forms Preparation',
    description: 'Prepare all required incorporation attachments and forms',
    requiredDocs: [
      'spice_part_b_attachments',
      'electricity_bill_with_noc',
      'director_photos_pan_aadhaar_bank_statements',
      'dir_2_documents',
      'inc_8_documents'
    ],
    estimatedDays: 2,
    formType: 'Form Preparation',
    dependencies: ['name-reservation', 'dsc-application'],
    notes: [
      'If director has DIN number, some documents not required for SPICE Part B',
      'Prepare DIR-2 + INC-8 forms',
      'Collect Agilepro requirements',
      'Prepare authorized director signatures'
    ]
  },
  {
    id: 'spice-part-b-filing',
    name: 'SPICE Part B Filing',
    description: 'File main incorporation form with company details',
    requiredDocs: [
      'approved_company_name',
      'complete_director_details',
      'shareholder_information',
      'registered_office_address',
      'pan_tan_area_codes'
    ],
    estimatedDays: 1,
    formType: 'SPICE+ Part B',
    dependencies: ['incorporation-forms-preparation'],
    dscRequirements: ['one_director_dsc', 'professional_dsc'],
    mcaPortalSteps: [
      'Login to MCA portal using professional login',
      'Go to Approved tab, search company name',
      'Click mini dashboard to enable SPICE+ Part B',
      'Fill company address details',
      'Provide number of directors and shareholders',
      'Fill director and shareholder personal information',
      'Fill area pin codes for PAN and TAN',
      'Use PAN link: https://tin.tin.nsdl.com/pan/servlet/AOSearch',
      'Use TAN link: https://tin.tin.nsdl.com/tan/servlet/TanAOSearch'
    ],
    notes: [
      'Must be completed within 20 days of name approval',
      'Only one director and professional DSC required for affixing'
    ]
  },
  {
    id: 'agilepro-filing',
    name: 'Agilepro Form Filing',
    description: 'File business activity and compliance declarations',
    requiredDocs: [
      'business_place_details', // rented or owned
      'company_activity_details',
      'director_basic_information',
      'esic_pf_declarations',
      'bank_information'
    ],
    estimatedDays: 1,
    formType: 'Agilepro',
    dependencies: ['spice-part-b-filing'],
    dscRequirements: ['director_dsc_only'],
    notes: [
      'Enabled after SPICE+ Part B completion',
      'Only director DSC required for affixing',
      'Declaration for ESIC, PF, and bank information included'
    ]
  },
  {
    id: 'aoa-filing',
    name: 'Articles of Association (AOA) Filing',
    description: 'File company articles with governance structure',
    requiredDocs: [
      'company_governance_details',
      'articles_alterations',
      'board_structure'
    ],
    estimatedDays: 1,
    formType: 'Articles of Association (AOA)',
    dependencies: ['agilepro-filing'],
    dscRequirements: ['all_directors_dsc', 'all_shareholders_dsc', 'professional_dsc'],
    notes: [
      'Two columns: "Not Applicable" and "For Altered"',
      'Click checkboxes for items to be altered or not applicable',
      'All directors, shareholders, and professional DSC required'
    ]
  },
  {
    id: 'moa-filing',
    name: 'Memorandum of Association (MOA) Filing',
    description: 'File company memorandum with objects and shareholding',
    requiredDocs: [
      'company_main_objects',
      'other_specified_objects',
      'complete_shareholder_details',
      'share_capital_structure'
    ],
    estimatedDays: 1,
    formType: 'Memorandum of Association (MOA)',
    dependencies: ['aoa-filing'],
    dscRequirements: ['all_directors_dsc', 'all_shareholders_dsc', 'professional_dsc'],
    notes: [
      'Fill 3 important sections: Company Objects, Other Objects, Shareholder Details',
      'All directors, shareholders, and professional DSC required'
    ]
  },
  {
    id: 'inc9-filing',
    name: 'INC-9 Form Filing',
    description: 'File subscriber and director declarations',
    requiredDocs: [
      'prefilled_inc9_information',
      'director_declarations',
      'subscriber_details'
    ],
    estimatedDays: 1,
    formType: 'Form INC-9',
    dependencies: ['moa-filing'],
    dscRequirements: ['all_directors_dsc', 'all_shareholders_dsc'],
    notes: [
      'Most information is prefilled',
      'All directors and shareholders DSC required',
      'No professional DSC needed for this form'
    ]
  },
  {
    id: 'form-upload-payment',
    name: 'Form Upload and Payment',
    description: 'Upload all forms to MCA V3 portal and make incorporation payment',
    requiredDocs: [
      'all_completed_forms_with_dsc',
      'spice_part_b_with_dsc',
      'agilepro_with_dsc',
      'aoa_with_dsc',
      'moa_with_dsc',
      'inc9_with_dsc'
    ],
    estimatedDays: 1,
    formType: 'MCA V3 Portal Upload',
    dependencies: ['inc9-filing'],
    mcaPortalSteps: [
      'Download all forms from mini dashboard',
      'Affix required DSC on each form',
      'Upload forms to MCA V3 portal one by one',
      'Make incorporation payment',
      'Submit final application'
    ],
    notes: [
      'All forms must have proper DSC affixed',
      'Upload sequence: SPICE Part B → Agilepro → AOA → MOA → INC-9',
      'Payment must be completed for processing'
    ]
  },
  {
    id: 'incorporation-completion',
    name: 'Certificate of Incorporation',
    description: 'Receive Certificate of Incorporation from MCA',
    requiredDocs: [],
    estimatedDays: 7, // 5-7 days if all details correct
    formType: 'MCA Processing',
    dependencies: ['form-upload-payment'],
    deadline: 'Certificate issued in 5-7 days if documents are correct',
    notes: [
      'Company will be incorporated in 5-7 days if all details are correct',
      'May receive resubmission request with remarks if issues found',
      'Entire process must be completed within 20 days of name approval'
    ]
  }
];

// DSC Requirements Summary
export const DSC_AFFIXING_REQUIREMENTS = {
  'SPICE+ Part B': ['one_director_dsc', 'professional_dsc'],
  'Agilepro': ['director_dsc_only'],
  'AOA': ['all_directors_dsc', 'all_shareholders_dsc', 'professional_dsc'],
  'MOA': ['all_directors_dsc', 'all_shareholders_dsc', 'professional_dsc'],
  'INC-9': ['all_directors_dsc', 'all_shareholders_dsc']
};

// Critical Deadlines
export const INCORPORATION_DEADLINES = {
  name_approval_response: '3-7 days from submission',
  incorporation_completion: '20 days from name approval',
  certificate_issuance: '5-7 days from final submission',
  address_proof_validity: 'Not older than 2 months'
};

// Required Portal Links
export const MCA_PORTAL_LINKS = {
  main_portal: 'https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html',
  pan_search: 'https://tin.tin.nsdl.com/pan/servlet/AOSearch',
  tan_search: 'https://tin.tin.nsdl.com/tan/servlet/TanAOSearch'
};

// Helper function to get next step
export function getNextIncorporationStep(currentStepId: string): CompanyIncorporationStep | undefined {
  const currentIndex = COMPANY_INCORPORATION_WORKFLOW.findIndex(step => step.id === currentStepId);
  return currentIndex >= 0 && currentIndex < COMPANY_INCORPORATION_WORKFLOW.length - 1 
    ? COMPANY_INCORPORATION_WORKFLOW[currentIndex + 1] 
    : undefined;
}

// Helper function to validate dependencies
export function validateIncorporationDependencies(stepId: string, completedSteps: string[]): boolean {
  const step = COMPANY_INCORPORATION_WORKFLOW.find(s => s.id === stepId);
  if (!step || !step.dependencies) return true;
  
  return step.dependencies.every(dep => completedSteps.includes(dep));
}