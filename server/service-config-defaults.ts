import type { ServiceCatalogEntry } from './service-catalog-data';

export type DefaultDocType = {
  doctype: string;
  label: string;
  clientUploads?: boolean;
  isDeliverable?: boolean;
  isInternal?: boolean;
  stepKey?: string;
  mandatory?: boolean;
};

const normalizeCategory = (value?: string | null) =>
  (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');

export const estimateSlaDays = (periodicity: string, category?: string) => {
  const normalized = normalizeCategory(category);
  switch (periodicity) {
    case 'MONTHLY':
      return normalized.includes('payroll') ? 4 : 5;
    case 'QUARTERLY':
      return 7;
    case 'ANNUAL':
      return normalized.includes('audit') ? 14 : 10;
    case 'ONGOING':
      return 3;
    case 'ONE_TIME':
    default:
      return normalized.includes('registration') ? 12 : 6;
  }
};

export const buildDefaultWorkflowTemplate = (service: ServiceCatalogEntry) => {
  const slaDays = estimateSlaDays(service.periodicity, service.category);
  const category = normalizeCategory(service.category);

  const steps = (() => {
    if (['business_registration', 'tax_registration', 'licenses'].includes(category)) {
      return [
        {
          stepKey: 'intake',
          name: 'Requirement Intake',
          description: `Collect inputs and documents for ${service.name}`,
          estimatedDays: Math.max(1, Math.round(slaDays * 0.25)),
          assigneeRole: 'client',
          clientTasks: ['Share required details', 'Upload supporting documents'],
          opsChecklist: ['Validate inputs', 'Confirm eligibility'],
          qaRequired: false
        },
        {
          stepKey: 'documentation',
          name: 'Documentation & Drafting',
          description: 'Prepare forms and supporting documentation',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.35)),
          assigneeRole: 'ops_executive',
          opsChecklist: ['Draft forms', 'Review checklists', 'Prepare submissions'],
          qaRequired: true
        },
        {
          stepKey: 'filing',
          name: 'Submission & Filing',
          description: 'Submit application and track acknowledgments',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.25)),
          assigneeRole: 'ops_executive',
          opsChecklist: ['Submit application', 'Track acknowledgment', 'Handle queries'],
          qaRequired: false
        },
        {
          stepKey: 'delivery',
          name: 'Approval & Delivery',
          description: 'Deliver certificates and close the service request',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.15)),
          assigneeRole: 'ops_executive',
          deliverables: ['certificate', 'final_report'],
          qaRequired: false
        }
      ];
    }

    if (category.includes('compliance') || category.includes('tax') || category.includes('payroll')) {
      return [
        {
          stepKey: 'data_collection',
          name: 'Data Collection',
          description: 'Collect transactional data and documents',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.25)),
          assigneeRole: 'client',
          clientTasks: ['Upload required registers', 'Confirm period data'],
          opsChecklist: ['Validate datasets', 'Check completeness'],
          qaRequired: false
        },
        {
          stepKey: 'preparation',
          name: 'Preparation & Computation',
          description: 'Prepare returns, computations, and summaries',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.35)),
          assigneeRole: 'ops_executive',
          opsChecklist: ['Reconcile data', 'Prepare computations'],
          qaRequired: true
        },
        {
          stepKey: 'review',
          name: 'Quality Review',
          description: 'QC review and client approval',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.2)),
          assigneeRole: 'qc_reviewer',
          opsChecklist: ['QC checks', 'Resolve discrepancies'],
          qaRequired: true
        },
        {
          stepKey: 'filing',
          name: 'Filing & Delivery',
          description: 'File returns and deliver acknowledgments',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.2)),
          assigneeRole: 'ops_executive',
          deliverables: ['acknowledgment', 'summary_report'],
          qaRequired: false
        }
      ];
    }

    if (category.includes('intellectual_property')) {
      return [
        {
          stepKey: 'search',
          name: 'Search & Feasibility',
          description: 'Conduct search and assess registrability',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.25)),
          assigneeRole: 'ops_executive',
          opsChecklist: ['Conduct search', 'Prepare search report'],
          qaRequired: false
        },
        {
          stepKey: 'drafting',
          name: 'Drafting & Filing',
          description: 'Prepare and file application',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.35)),
          assigneeRole: 'ops_executive',
          opsChecklist: ['Draft application', 'Submit filing'],
          qaRequired: true
        },
        {
          stepKey: 'review',
          name: 'Review & Response',
          description: 'Handle objections and responses',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.25)),
          assigneeRole: 'qc_reviewer',
          qaRequired: true
        },
        {
          stepKey: 'delivery',
          name: 'Registration & Delivery',
          description: 'Deliver registration certificate and summary',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.15)),
          assigneeRole: 'ops_executive',
          deliverables: ['registration_certificate', 'final_report'],
          qaRequired: false
        }
      ];
    }

    if (category.includes('legal') || category.includes('funding')) {
      return [
        {
          stepKey: 'intake',
          name: 'Requirement Intake',
          description: 'Gather inputs and documents',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.25)),
          assigneeRole: 'client',
          clientTasks: ['Provide inputs', 'Share documents'],
          qaRequired: false
        },
        {
          stepKey: 'drafting',
          name: 'Drafting',
          description: 'Draft documentation and agreements',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.4)),
          assigneeRole: 'ops_executive',
          qaRequired: true
        },
        {
          stepKey: 'review',
          name: 'Review & Negotiation',
          description: 'Review, iterate, and finalize',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.2)),
          assigneeRole: 'qc_reviewer',
          qaRequired: true
        },
        {
          stepKey: 'delivery',
          name: 'Finalization',
          description: 'Deliver final documents',
          estimatedDays: Math.max(1, Math.round(slaDays * 0.15)),
          assigneeRole: 'ops_executive',
          deliverables: ['final_document'],
          qaRequired: false
        }
      ];
    }

    return [
      {
        stepKey: 'intake',
        name: 'Requirement Intake',
        description: `Collect inputs and documents for ${service.name}`,
        estimatedDays: Math.max(1, Math.round(slaDays * 0.3)),
        assigneeRole: 'client',
        clientTasks: ['Share required details', 'Upload supporting documents'],
        opsChecklist: ['Validate inputs', 'Confirm scope with client'],
        qaRequired: false
      },
      {
        stepKey: 'execution',
        name: 'Service Execution',
        description: `Execute ${service.name} workflow`,
        estimatedDays: Math.max(1, Math.round(slaDays * 0.4)),
        assigneeRole: 'ops_executive',
        opsChecklist: ['Prepare working papers', 'Complete filing or submission'],
        qaRequired: true
      },
      {
        stepKey: 'review',
        name: 'Quality Review',
        description: 'Perform QA review and validations',
        estimatedDays: Math.max(1, Math.round(slaDays * 0.2)),
        assigneeRole: 'qc_reviewer',
        opsChecklist: ['Review outputs', 'Verify compliance requirements'],
        qaRequired: true
      },
      {
        stepKey: 'delivery',
        name: 'Client Delivery',
        description: 'Deliver outputs and close the service request',
        estimatedDays: Math.max(1, Math.round(slaDays * 0.1)),
        assigneeRole: 'ops_executive',
        deliverables: ['final_report', 'acknowledgment'],
        qaRequired: false
      }
    ];
  })();

  return {
    version: 1,
    steps,
    slaPolicy: {
      totalDays: slaDays,
      escalationThresholds: [Math.max(1, slaDays - 2), Math.max(1, slaDays - 1)]
    },
    metadata: {
      description: service.description,
      periodicity: service.periodicity,
      category: service.category
    }
  };
};

export const buildDefaultDocTypes = (service: ServiceCatalogEntry): DefaultDocType[] => {
  const category = normalizeCategory(service.category);

  const docs: DefaultDocType[] = [
    {
      doctype: 'supporting_documents',
      label: 'Supporting Documents',
      clientUploads: true,
      mandatory: true,
      stepKey: 'intake'
    }
  ];

  if (category.includes('compliance') || category.includes('tax') || category.includes('payroll')) {
    docs.push(
      {
        doctype: 'data_register',
        label: 'Data Register / Working Sheet',
        clientUploads: true,
        mandatory: true,
        stepKey: 'data_collection'
      },
      {
        doctype: 'filing_receipt',
        label: 'Filing Acknowledgment',
        clientUploads: false,
        isDeliverable: true,
        stepKey: 'filing'
      }
    );
  } else if (category.includes('registration') || category.includes('licenses')) {
    docs.push(
      {
        doctype: 'authorization_letter',
        label: 'Authorization Letter',
        clientUploads: true,
        mandatory: false,
        stepKey: 'documentation'
      },
      {
        doctype: 'certificate',
        label: 'Registration Certificate',
        clientUploads: false,
        isDeliverable: true,
        stepKey: 'delivery'
      }
    );
  } else if (category.includes('intellectual_property')) {
    docs.push(
      {
        doctype: 'search_report',
        label: 'Search Report',
        clientUploads: false,
        isDeliverable: true,
        stepKey: 'search'
      },
      {
        doctype: 'filing_receipt',
        label: 'Filing Receipt',
        clientUploads: false,
        isDeliverable: true,
        stepKey: 'delivery'
      }
    );
  } else if (category.includes('legal') || category.includes('funding')) {
    docs.push(
      {
        doctype: 'draft_document',
        label: 'Draft Document',
        clientUploads: false,
        isDeliverable: true,
        stepKey: 'drafting'
      },
      {
        doctype: 'final_document',
        label: 'Final Document',
        clientUploads: false,
        isDeliverable: true,
        stepKey: 'delivery'
      }
    );
  } else {
    docs.push({
      doctype: 'final_report',
      label: 'Final Report',
      clientUploads: false,
      isDeliverable: true,
      stepKey: 'delivery'
    });
  }

  return docs;
};

export const buildDefaultDueDateRule = (periodicity: string) => {
  switch (periodicity) {
    case 'MONTHLY':
      return {
        periodicity: 'MONTHLY',
        dueDayOfMonth: 20,
        nudges: { tMinus: [7, 3, 1], fixedDays: [1, 2] }
      };
    case 'QUARTERLY':
      return {
        periodicity: 'QUARTERLY',
        quarterDue: {
          Q1: '07-31',
          Q2: '10-31',
          Q3: '01-31',
          Q4: '05-31'
        },
        nudges: { tMinus: [10, 5, 2] }
      };
    case 'ANNUAL':
      return {
        periodicity: 'ANNUAL',
        fallbackDue: '09-30',
        nudges: { tMinus: [30, 15, 7, 1] }
      };
    case 'ONGOING':
    case 'ONE_TIME':
    default:
      return {
        periodicity,
        dueInDays: 14,
        nudges: { tMinus: [7, 3, 1] }
      };
  }
};
