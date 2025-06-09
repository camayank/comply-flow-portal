import { readFileSync } from 'fs';
import { join } from 'path';

// KOSHIKA Services SOPs Configuration based on Excel worksheets
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  requiredDocs: string[];
  estimatedDays: number;
  dependencies?: string[];
  formType?: string;
  deadline?: string;
}

export interface ServiceWorkflow {
  serviceId: string;
  name: string;
  category: string;
  type: string;
  totalPrice: number;
  estimatedDuration: string;
  steps: WorkflowStep[];
  eligibilityCriteria?: string[];
  complianceDeadlines?: string[];
}

// Load KOSHIKA SOPs configuration
let sopsConfig: any = {};
try {
  const configPath = join(__dirname, 'sops-config.json');
  sopsConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
} catch (error) {
  console.warn('KOSHIKA SOPs config not found, using defaults');
}

export const KOSHIKA_WORKFLOWS: ServiceWorkflow[] = [
  // COMPANY INCORPORATION WORKFLOW (Worksheet: Company incorporation)
  {
    serviceId: 'company-incorporation',
    name: 'Company Incorporation',
    category: 'business-setup',
    type: 'Incorporation',
    totalPrice: 15000,
    estimatedDuration: '20 days',
    steps: [
      {
        id: 'name-reservation',
        name: 'Company Name Reservation',
        description: 'Reserve unique company names (minimum 2 options)',
        requiredDocs: ['unique_company_names'],
        estimatedDays: 2,
        formType: 'RUN (Reserve Unique Name)'
      },
      {
        id: 'director-details',
        name: 'Director Documentation',
        description: 'Collect and verify director details (minimum 2 directors)',
        requiredDocs: ['director_pan', 'director_aadhaar', 'director_photos', 'address_proof'],
        estimatedDays: 1,
        dependencies: ['name-reservation']
      },
      {
        id: 'moa-aoa-drafting',
        name: 'MOA & AOA Drafting',
        description: 'Draft Memorandum and Articles of Association',
        requiredDocs: ['business_activities', 'share_capital_details'],
        estimatedDays: 2,
        dependencies: ['director-details']
      },
      {
        id: 'spice-filing',
        name: 'SPICE Part B Filing',
        description: 'File SPICE Part B form with MCA',
        requiredDocs: ['moa_aoa', 'director_documents', 'registered_office_proof'],
        estimatedDays: 7,
        formType: 'SPICE Part B',
        dependencies: ['moa-aoa-drafting']
      },
      {
        id: 'incorporation-certificate',
        name: 'Certificate of Incorporation',
        description: 'Receive Certificate of Incorporation from MCA',
        requiredDocs: [],
        estimatedDays: 5,
        dependencies: ['spice-filing']
      },
      {
        id: 'post-incorporation',
        name: 'Post Incorporation Setup',
        description: 'Bank account opening and compliance setup',
        requiredDocs: ['incorporation_certificate', 'pan_card', 'bank_documents'],
        estimatedDays: 3,
        dependencies: ['incorporation-certificate']
      }
    ],
    complianceDeadlines: [
      'File INC-20A within 180 days of incorporation',
      'Appoint auditor within 30 days using ADT-1',
      'Annual compliance: AOC-4, MGT-7A before 30th September'
    ]
  },

  // LLP INCORPORATION WORKFLOW (Worksheet: LLP Incorporation)
  {
    serviceId: 'llp-incorporation',
    name: 'LLP Incorporation',
    category: 'business-setup',
    type: 'Incorporation',
    totalPrice: 12000,
    estimatedDuration: '3 months',
    steps: [
      {
        id: 'name-approval',
        name: 'LLP Name Approval/Reservation',
        description: 'Reserve unique LLP name',
        requiredDocs: ['unique_name_options'],
        estimatedDays: 3,
        formType: 'LLP-RUN'
      },
      {
        id: 'partner-details',
        name: 'Designated Partners Documentation',
        description: 'Collect details of minimum 2 designated partners',
        requiredDocs: ['partner_pan', 'partner_aadhaar', 'partner_photos', 'address_proof'],
        estimatedDays: 2,
        dependencies: ['name-approval']
      },
      {
        id: 'llp-agreement',
        name: 'LLP Agreement Drafting',
        description: 'Draft comprehensive LLP agreement',
        requiredDocs: ['business_activities', 'profit_sharing_ratio', 'partner_responsibilities'],
        estimatedDays: 5,
        dependencies: ['partner-details']
      },
      {
        id: 'fillip-filing',
        name: 'FiLLiP Form Filing',
        description: 'File FiLLiP form with MCA',
        requiredDocs: ['llp_agreement', 'partner_documents', 'registered_office_proof'],
        estimatedDays: 15,
        formType: 'FiLLiP',
        dependencies: ['llp-agreement']
      },
      {
        id: 'llp-certificate',
        name: 'Certificate of Incorporation',
        description: 'Receive LLP Certificate of Incorporation',
        requiredDocs: [],
        estimatedDays: 10,
        dependencies: ['fillip-filing']
      },
      {
        id: 'post-llp-setup',
        name: 'Post LLP Setup',
        description: 'Bank account and compliance setup',
        requiredDocs: ['llp_certificate', 'llp_pan', 'bank_documents'],
        estimatedDays: 5,
        dependencies: ['llp-certificate']
      }
    ],
    complianceDeadlines: [
      'File Form-3 within 1 month of incorporation',
      'Annual Form-11 by 30th May',
      'Form-8 filing by 30th October'
    ]
  },

  // OPC INCORPORATION WORKFLOW (Worksheet: OPC incorporation)
  {
    serviceId: 'opc-incorporation',
    name: 'OPC Incorporation',
    category: 'business-setup',
    type: 'Incorporation',
    totalPrice: 13000,
    estimatedDuration: '20 days',
    steps: [
      {
        id: 'opc-name-reservation',
        name: 'OPC Name Reservation',
        description: 'Reserve unique OPC name (maximum 2 options)',
        requiredDocs: ['unique_opc_names'],
        estimatedDays: 2,
        formType: 'RUN'
      },
      {
        id: 'single-director-docs',
        name: 'Director & Nominee Documentation',
        description: 'Single director and nominee details (maximum 1 director)',
        requiredDocs: ['director_pan', 'director_aadhaar', 'nominee_details', 'nominee_consent'],
        estimatedDays: 1,
        dependencies: ['opc-name-reservation']
      },
      {
        id: 'opc-moa-aoa',
        name: 'OPC MOA & AOA',
        description: 'Draft OPC specific MOA and AOA',
        requiredDocs: ['business_activities', 'single_member_details'],
        estimatedDays: 2,
        dependencies: ['single-director-docs']
      },
      {
        id: 'opc-spice-filing',
        name: 'OPC SPICE Filing',
        description: 'File SPICE Part B for OPC',
        requiredDocs: ['opc_moa_aoa', 'director_nominee_docs', 'office_proof'],
        estimatedDays: 7,
        formType: 'SPICE Part B',
        dependencies: ['opc-moa-aoa']
      },
      {
        id: 'opc-certificate',
        name: 'OPC Certificate',
        description: 'Receive OPC Certificate of Incorporation',
        requiredDocs: [],
        estimatedDays: 5,
        dependencies: ['opc-spice-filing']
      },
      {
        id: 'opc-post-setup',
        name: 'OPC Post Setup',
        description: 'Bank account and compliance setup',
        requiredDocs: ['opc_certificate', 'opc_pan', 'bank_documents'],
        estimatedDays: 3,
        dependencies: ['opc-certificate']
      }
    ],
    eligibilityCriteria: [
      'Only one member allowed',
      'Member must be Indian citizen and resident',
      'Cannot convert to public company',
      'Nominee appointment mandatory'
    ],
    complianceDeadlines: [
      'File INC-20A within 180 days',
      'Annual MGT-7A by 30th September',
      'AOC-4 filing by 30th September'
    ]
  },

  // SECTION 8 COMPANY WORKFLOW (Worksheet: Sec - 8 Company)
  {
    serviceId: 'section8-incorporation',
    name: 'Section 8 Company Incorporation',
    category: 'business-setup',
    type: 'Incorporation',
    totalPrice: 18000,
    estimatedDuration: '45 days',
    steps: [
      {
        id: 'section8-name-approval',
        name: 'Section 8 Name Approval',
        description: 'Name approval for Section 8 company',
        requiredDocs: ['proposed_names', 'charitable_objects'],
        estimatedDays: 5,
        formType: 'RUN with charitable suffix'
      },
      {
        id: 'moa-objects-drafting',
        name: 'MOA Objects & Activity Drafting',
        description: 'Draft MOA with charitable objects and activities',
        requiredDocs: ['charitable_activities', 'non_profit_objects', 'area_of_operation'],
        estimatedDays: 7,
        dependencies: ['section8-name-approval']
      },
      {
        id: 'section8-license-application',
        name: 'Section 8 License Application',
        description: 'Apply for Section 8 license from Central Government',
        requiredDocs: ['moa_draft', 'aoa_draft', 'financial_projections', 'promoter_details'],
        estimatedDays: 21,
        formType: 'Section 8 License Application',
        dependencies: ['moa-objects-drafting']
      },
      {
        id: 'section8-incorporation-filing',
        name: 'Section 8 Incorporation Filing',
        description: 'File incorporation documents after license approval',
        requiredDocs: ['section8_license', 'final_moa_aoa', 'director_documents'],
        estimatedDays: 7,
        formType: 'SPICE Part B with Section 8 License',
        dependencies: ['section8-license-application']
      },
      {
        id: 'section8-certificate',
        name: 'Section 8 Certificate',
        description: 'Receive Certificate of Incorporation',
        requiredDocs: [],
        estimatedDays: 5,
        dependencies: ['section8-incorporation-filing']
      }
    ],
    eligibilityCriteria: [
      'Charitable or non-profit objectives only',
      'No dividend distribution to members',
      'Surplus to be used for charitable purposes',
      'Minimum 3 directors required'
    ],
    complianceDeadlines: [
      'Annual return filing mandatory',
      'Compliance report to be filed annually',
      'Any change in objects requires government approval'
    ]
  },

  // DIRECTOR APPOINTMENT WORKFLOW (Worksheet: Director Change in company)
  {
    serviceId: 'director-appointment',
    name: 'Director Appointment',
    category: 'director-services',
    type: 'Change',
    totalPrice: 4000,
    estimatedDuration: '15 days',
    steps: [
      {
        id: 'board-resolution-appointment',
        name: 'Board Resolution for Appointment',
        description: 'Pass board resolution for new director appointment',
        requiredDocs: ['board_resolution_draft', 'meeting_minutes'],
        estimatedDays: 1
      },
      {
        id: 'new-director-documents',
        name: 'New Director Documentation',
        description: 'Collect new director documents and consent',
        requiredDocs: ['new_director_pan', 'aadhaar', 'photo', 'consent_letter', 'address_proof'],
        estimatedDays: 2,
        dependencies: ['board-resolution-appointment']
      },
      {
        id: 'dir12-filing',
        name: 'DIR-12 Filing',
        description: 'File DIR-12 for director appointment',
        requiredDocs: ['board_resolution', 'director_documents', 'consent_letter'],
        estimatedDays: 7,
        formType: 'DIR-12',
        deadline: 'Within 1 month of board meeting',
        dependencies: ['new-director-documents']
      },
      {
        id: 'appointment-confirmation',
        name: 'Appointment Confirmation',
        description: 'Receive confirmation from MCA',
        requiredDocs: [],
        estimatedDays: 5,
        dependencies: ['dir12-filing']
      }
    ]
  },

  // DIRECTOR RESIGNATION WORKFLOW (Worksheet: Director resignation in company)
  {
    serviceId: 'director-resignation',
    name: 'Director Resignation',
    category: 'director-services',
    type: 'Change',
    totalPrice: 3500,
    estimatedDuration: '15 days',
    steps: [
      {
        id: 'resignation-resolution',
        name: 'Board Resolution for Resignation',
        description: 'Pass board resolution accepting director resignation',
        requiredDocs: ['board_resolution_resignation', 'resignation_letter'],
        estimatedDays: 1
      },
      {
        id: 'dir11-dir12-filing',
        name: 'DIR-11 & DIR-12 Filing',
        description: 'File DIR-11 & DIR-12 for director resignation',
        requiredDocs: ['board_resolution', 'resignation_letter', 'director_details'],
        estimatedDays: 7,
        formType: 'DIR-11 and DIR-12',
        deadline: 'Within 1 month of board meeting',
        dependencies: ['resignation-resolution']
      },
      {
        id: 'resignation-confirmation',
        name: 'Resignation Confirmation',
        description: 'Receive confirmation from MCA',
        requiredDocs: [],
        estimatedDays: 7,
        dependencies: ['dir11-dir12-filing']
      }
    ]
  },

  // CONVERSION PVT TO OPC WORKFLOW (Worksheet: Conversion PVT to OPC)
  {
    serviceId: 'pvt-to-opc-conversion',
    name: 'Private Limited to OPC Conversion',
    category: 'conversion-services',
    type: 'Conversion',
    totalPrice: 12000,
    estimatedDuration: '45 days',
    steps: [
      {
        id: 'eligibility-verification',
        name: 'Eligibility Verification',
        description: 'Verify eligibility criteria for conversion',
        requiredDocs: ['financial_statements_3years', 'share_capital_details', 'turnover_details'],
        estimatedDays: 3
      },
      {
        id: 'member-resolution',
        name: 'Member Resolution & Consent',
        description: 'Pass special resolution and obtain member consent',
        requiredDocs: ['special_resolution', 'member_consent', 'board_resolution'],
        estimatedDays: 5,
        dependencies: ['eligibility-verification']
      },
      {
        id: 'compliance-certificate',
        name: 'Compliance Certificate',
        description: 'Obtain compliance certificate from company secretary',
        requiredDocs: ['compliance_report', 'cs_certificate', 'statutory_registers'],
        estimatedDays: 7,
        dependencies: ['member-resolution']
      },
      {
        id: 'conversion-filing',
        name: 'Conversion Application Filing',
        description: 'File conversion application with MCA',
        requiredDocs: ['conversion_application', 'compliance_certificate', 'financial_statements', 'member_consent'],
        estimatedDays: 21,
        dependencies: ['compliance-certificate']
      },
      {
        id: 'opc-certificate-issuance',
        name: 'OPC Certificate Issuance',
        description: 'Receive fresh Certificate of Incorporation as OPC',
        requiredDocs: [],
        estimatedDays: 9,
        dependencies: ['conversion-filing']
      }
    ],
    eligibilityCriteria: [
      'Paid-up share capital less than Rs. 50 lakh',
      'Annual turnover for 3 preceding years less than Rs. 2 crore',
      'Only one member should remain',
      'All statutory compliances must be up to date'
    ]
  }
];

// Helper function to get workflow by service ID
export function getWorkflowByServiceId(serviceId: string): ServiceWorkflow | undefined {
  return KOSHIKA_WORKFLOWS.find(workflow => workflow.serviceId === serviceId);
}

// Helper function to get next step in workflow
export function getNextStep(serviceId: string, currentStepId: string): WorkflowStep | undefined {
  const workflow = getWorkflowByServiceId(serviceId);
  if (!workflow) return undefined;
  
  const currentIndex = workflow.steps.findIndex(step => step.id === currentStepId);
  return currentIndex >= 0 && currentIndex < workflow.steps.length - 1 
    ? workflow.steps[currentIndex + 1] 
    : undefined;
}

// Helper function to validate step dependencies
export function validateStepDependencies(serviceId: string, stepId: string, completedSteps: string[]): boolean {
  const workflow = getWorkflowByServiceId(serviceId);
  if (!workflow) return false;
  
  const step = workflow.steps.find(s => s.id === stepId);
  if (!step || !step.dependencies) return true;
  
  return step.dependencies.every(dep => completedSteps.includes(dep));
}