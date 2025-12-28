import { readFileSync } from 'fs';
import { join } from 'path';
import { DIGICOMPLY_WORKFLOW_TEMPLATES } from './digicomply-workflows';
import { SERVICE_CATALOG } from './service-catalog-data';

// Flexible Workflow Engine for KOSHIKA Services SOPs
export interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  type: string;
  isStandard: boolean;
  version: string;
  steps: WorkflowStepTemplate[];
  metadata: {
    estimatedDuration: string;
    totalCost: number;
    requiredPersonnel: string[];
    complianceDeadlines: string[];
    eligibilityCriteria?: string[];
  };
}

export interface WorkflowStepTemplate {
  id: string;
  name: string;
  description: string;
  type: 'documentation' | 'filing' | 'approval' | 'payment' | 'verification';
  isRequired: boolean;
  canBeModified: boolean;
  estimatedDays: number;
  dependencies: string[];
  requiredDocs: string[];
  formType?: string;
  dscRequirements?: string[];
  mcaPortalSteps?: string[];
  fees?: number;
  deadlines?: string[];
  notes?: string[];
  eligibilityCriteria?: string[];
  customFields?: Record<string, any>;
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  userId: number;
  serviceRequestId: number;
  name: string;
  status: 'created' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  currentStep: string;
  steps: WorkflowStepInstance[];
  customizations: WorkflowCustomization[];
  startDate: Date;
  targetCompletionDate: Date;
  actualCompletionDate?: Date;
  metadata: Record<string, any>;
}

export interface WorkflowStepInstance {
  id: string;
  templateStepId: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'requires_attention';
  assignedTo?: string;
  startDate?: Date;
  completionDate?: Date;
  uploadedDocs: string[];
  notes: string[];
  customizations: Record<string, any>;
}

export interface WorkflowCustomization {
  stepId: string;
  type: 'add_step' | 'modify_step' | 'remove_step' | 'change_sequence' | 'add_document' | 'modify_deadline';
  description: string;
  changes: Record<string, any>;
  reason: string;
  approvedBy?: string;
  appliedAt: Date;
}

// DigiComply Standard Workflow Templates for Indian Companies
const STANDARD_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // INCORPORATION WORKFLOWS
  {
    id: 'company-incorporation-standard',
    name: 'Private Limited Company Incorporation',
    category: 'incorporation',
    type: 'private_limited',
    isStandard: true,
    version: '1.0',
    metadata: {
      estimatedDuration: '20 days from name approval',
      totalCost: 15000,
      requiredPersonnel: ['CA/CS Professional', 'Directors (min 2)', 'Shareholders'],
      complianceDeadlines: [
        'Complete within 20 days of name approval',
        'INC-20A within 180 days of incorporation',
        'First AGM within 18 months'
      ]
    },
    steps: [
      {
        id: 'pre-inc-docs',
        name: 'Pre-Incorporation Documentation',
        description: 'Collect all required documents and prepare for filing',
        type: 'documentation',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 2,
        dependencies: [],
        requiredDocs: [
          'minimum_2_unique_names',
          'minimum_2_directors_details',
          'electricity_bill_not_older_2months',
          'company_moa_objects',
          'share_capital_information',
          'shareholding_percentage',
          'director_pan_aadhaar_photos',
          'unique_email_phone',
          'bank_statements_address_proof',
          'noc_property_owner'
        ],
        notes: [
          'All documents must be signed by directors and property owner',
          'Prepare DIR-2 and company incorporation Word documents'
        ]
      },
      {
        id: 'name-reservation',
        name: 'Company Name Reservation (SPICE Part A)',
        description: 'Reserve company name through MCA portal',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 5,
        dependencies: ['pre-inc-docs'],
        requiredDocs: ['minimum_2_unique_names', 'moa_draft_objects'],
        formType: 'SPICE+ Part A',
        fees: 1000,
        mcaPortalSteps: [
          'Login to MCA portal (mca.gov.in)',
          'Company E-Filing → Incorporation Services',
          'Select SPICE+ form for name reservation',
          'Select: New company → Private → Limited by share → Non Govt.',
          'Enter proposed names and MOA objects',
          'Auto Check → Save and Submit → Pay ₹1,000'
        ],
        deadlines: ['Response from MCA in 3-7 days']
      },
      {
        id: 'dsc-application',
        name: 'Digital Signature Certificate Application',
        description: 'Apply for DSC for all required parties',
        type: 'verification',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 3,
        dependencies: ['name-reservation'],
        requiredDocs: ['director_pan_aadhaar', 'photos', 'professional_details'],
        dscRequirements: ['all_directors', 'all_shareholders', 'ca_cs_professional'],
        notes: ['DSC must be associated on V3 portal', 'Required for all subsequent forms']
      },
      {
        id: 'spice-part-b',
        name: 'SPICE Part B Filing',
        description: 'Main incorporation form with company details',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 1,
        dependencies: ['dsc-application'],
        formType: 'SPICE+ Part B',
        dscRequirements: ['one_director_dsc', 'professional_dsc'],
        requiredDocs: ['approved_name', 'director_shareholder_details', 'registered_office', 'pan_tan_codes'],
        mcaPortalSteps: [
          'Login with professional credentials',
          'Search approved company name in mini dashboard',
          'Fill company address and director information',
          'Get PAN/TAN area codes from NSDL links',
          'Complete all required sections'
        ]
      },
      {
        id: 'agilepro-filing',
        name: 'Agilepro Form Filing',
        description: 'Business activity and compliance declarations',
        type: 'filing',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 1,
        dependencies: ['spice-part-b'],
        formType: 'Agilepro',
        dscRequirements: ['director_dsc_only'],
        requiredDocs: ['business_place_details', 'company_activities', 'esic_pf_declarations', 'bank_info']
      },
      {
        id: 'aoa-filing',
        name: 'Articles of Association Filing',
        description: 'Company governance structure and articles',
        type: 'filing',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 1,
        dependencies: ['agilepro-filing'],
        formType: 'AOA',
        dscRequirements: ['all_directors_dsc', 'all_shareholders_dsc', 'professional_dsc'],
        requiredDocs: ['governance_details', 'board_structure', 'articles_alterations']
      },
      {
        id: 'moa-filing',
        name: 'Memorandum of Association Filing',
        description: 'Company objects and shareholding structure',
        type: 'filing',
        isRequired: true,
        canBeModified: true,
        estimatedDays: 1,
        dependencies: ['aoa-filing'],
        formType: 'MOA',
        dscRequirements: ['all_directors_dsc', 'all_shareholders_dsc', 'professional_dsc'],
        requiredDocs: ['main_objects', 'other_objects', 'shareholder_details', 'capital_structure']
      },
      {
        id: 'inc9-filing',
        name: 'INC-9 Form Filing',
        description: 'Subscriber and director declarations',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 1,
        dependencies: ['moa-filing'],
        formType: 'INC-9',
        dscRequirements: ['all_directors_dsc', 'all_shareholders_dsc'],
        requiredDocs: ['director_declarations', 'subscriber_details']
      },
      {
        id: 'form-upload-payment',
        name: 'Form Upload and Payment',
        description: 'Upload all forms to MCA V3 portal with payment',
        type: 'filing',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 1,
        dependencies: ['inc9-filing'],
        formType: 'MCA V3 Upload',
        requiredDocs: ['all_forms_with_dsc'],
        mcaPortalSteps: [
          'Download all forms from mini dashboard',
          'Affix required DSC on each form',
          'Upload forms to MCA V3 portal sequentially',
          'Make incorporation payment',
          'Submit final application'
        ]
      },
      {
        id: 'certificate-issuance',
        name: 'Certificate of Incorporation',
        description: 'Receive certificate from MCA',
        type: 'approval',
        isRequired: true,
        canBeModified: false,
        estimatedDays: 7,
        dependencies: ['form-upload-payment'],
        deadlines: ['Certificate issued in 5-7 days if documents correct'],
        notes: ['May receive resubmission request if issues found']
      }
    ]
  }
];

const DEFAULT_SLA_DAYS: Record<string, number> = {
  MONTHLY: 5,
  QUARTERLY: 7,
  ANNUAL: 10,
  ONGOING: 3,
  ONE_TIME: 6
};

const buildCatalogWorkflowTemplates = (): WorkflowTemplate[] => {
  return SERVICE_CATALOG.map(service => {
    const totalDays = DEFAULT_SLA_DAYS[service.periodicity] ?? 6;

    const steps: WorkflowStepTemplate[] = [
      {
        id: 'intake',
        name: 'Requirement Intake',
        description: `Collect inputs and documents for ${service.name}`,
        type: 'documentation',
        isRequired: true,
        canBeModified: true,
        estimatedDays: Math.max(1, Math.round(totalDays * 0.3)),
        dependencies: [],
        requiredDocs: []
      },
      {
        id: 'execution',
        name: 'Service Execution',
        description: `Execute ${service.name} workflow`,
        type: 'filing',
        isRequired: true,
        canBeModified: true,
        estimatedDays: Math.max(1, Math.round(totalDays * 0.4)),
        dependencies: ['intake'],
        requiredDocs: []
      },
      {
        id: 'review',
        name: 'Quality Review',
        description: 'Perform QA review and validations',
        type: 'verification',
        isRequired: true,
        canBeModified: true,
        estimatedDays: Math.max(1, Math.round(totalDays * 0.2)),
        dependencies: ['execution'],
        requiredDocs: []
      },
      {
        id: 'delivery',
        name: 'Client Delivery',
        description: 'Deliver outputs and close the service request',
        type: 'approval',
        isRequired: true,
        canBeModified: true,
        estimatedDays: Math.max(1, Math.round(totalDays * 0.1)),
        dependencies: ['review'],
        requiredDocs: []
      }
    ];

    return {
      id: service.serviceKey,
      name: service.name,
      category: service.category,
      type: service.serviceKey,
      isStandard: true,
      version: '1.0',
      metadata: {
        estimatedDuration: `${totalDays} days`,
        totalCost: 0,
        requiredPersonnel: ['Operations Executive', 'QA Reviewer'],
        complianceDeadlines: [`${service.periodicity.toLowerCase()} cycle`],
        eligibilityCriteria: [service.description]
      },
      steps
    };
  });
};

// Workflow Engine Class
export class WorkflowEngine {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();

  constructor() {
    this.loadStandardTemplates();
  }

  private loadStandardTemplates() {
    // Load DigiComply comprehensive workflow templates
    DIGICOMPLY_WORKFLOW_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
    
    // Also load the original incorporation template for backwards compatibility
    STANDARD_WORKFLOW_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });

    // Load catalog-driven templates for every service entry
    buildCatalogWorkflowTemplates().forEach(template => {
      if (!this.templates.has(template.id)) {
        this.templates.set(template.id, template);
      }
    });
  }

  // Get all available templates
  getTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  // Get specific template
  getTemplate(templateId: string): WorkflowTemplate | undefined {
    return this.templates.get(templateId);
  }

  // Create workflow instance from template
  createWorkflowInstance(
    templateId: string, 
    userId: number, 
    serviceRequestId: number,
    customizations: WorkflowCustomization[] = []
  ): WorkflowInstance {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const instanceId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Apply customizations to steps
    let steps = template.steps.map(stepTemplate => ({
      id: `${instanceId}_${stepTemplate.id}`,
      templateStepId: stepTemplate.id,
      name: stepTemplate.name,
      status: 'pending' as const,
      uploadedDocs: [],
      notes: [],
      customizations: {}
    }));

    // Apply customizations
    customizations.forEach(customization => {
      this.applyCustomization(steps, customization);
    });

    const instance: WorkflowInstance = {
      id: instanceId,
      templateId,
      userId,
      serviceRequestId,
      name: `${template.name} - Instance ${instanceId.substr(-6)}`,
      status: 'created',
      currentStep: steps[0]?.id || '',
      steps,
      customizations,
      startDate: new Date(),
      targetCompletionDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      metadata: {}
    };

    this.instances.set(instanceId, instance);
    return instance;
  }

  // Apply customization to workflow steps
  private applyCustomization(steps: WorkflowStepInstance[], customization: WorkflowCustomization) {
    switch (customization.type) {
      case 'add_step':
        // Add new step logic
        break;
      case 'modify_step':
        const stepToModify = steps.find(s => s.templateStepId === customization.stepId);
        if (stepToModify) {
          Object.assign(stepToModify.customizations, customization.changes);
        }
        break;
      case 'remove_step':
        // Mark step as skipped
        const stepToRemove = steps.find(s => s.templateStepId === customization.stepId);
        if (stepToRemove) {
          stepToRemove.status = 'skipped';
        }
        break;
    }
  }

  // Get workflow instance
  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  // Update step status
  updateStepStatus(instanceId: string, stepId: string, status: WorkflowStepInstance['status'], notes?: string[]) {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const step = instance.steps.find(s => s.id === stepId);
    if (!step) return false;

    step.status = status;
    if (status === 'completed') {
      step.completionDate = new Date();
    }
    if (notes) {
      step.notes.push(...notes);
    }

    // Update workflow status
    const allCompleted = instance.steps.every(s => s.status === 'completed' || s.status === 'skipped');
    if (allCompleted) {
      instance.status = 'completed';
      instance.actualCompletionDate = new Date();
    } else if (instance.status === 'created') {
      instance.status = 'in_progress';
    }

    return true;
  }

  // Add custom step to existing workflow
  addCustomStep(
    instanceId: string, 
    afterStepId: string, 
    stepData: Partial<WorkflowStepTemplate>,
    reason: string
  ): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const customization: WorkflowCustomization = {
      stepId: `custom_${Date.now()}`,
      type: 'add_step',
      description: `Added custom step: ${stepData.name}`,
      changes: stepData,
      reason,
      appliedAt: new Date()
    };

    const newStep: WorkflowStepInstance = {
      id: `${instanceId}_${customization.stepId}`,
      templateStepId: customization.stepId,
      name: stepData.name || 'Custom Step',
      status: 'pending',
      uploadedDocs: [],
      notes: [],
      customizations: stepData
    };

    // Insert after specified step
    const afterIndex = instance.steps.findIndex(s => s.templateStepId === afterStepId);
    if (afterIndex >= 0) {
      instance.steps.splice(afterIndex + 1, 0, newStep);
    } else {
      instance.steps.push(newStep);
    }

    instance.customizations.push(customization);
    return true;
  }

  // Get workflow progress
  getProgress(instanceId: string): { completed: number; total: number; percentage: number } {
    const instance = this.instances.get(instanceId);
    if (!instance) return { completed: 0, total: 0, percentage: 0 };

    const completed = instance.steps.filter(s => s.status === 'completed').length;
    const total = instance.steps.filter(s => s.status !== 'skipped').length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { completed, total, percentage };
  }

  // Validate workflow dependencies
  validateDependencies(instanceId: string, stepId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const template = this.templates.get(instance.templateId);
    if (!template) return false;

    const step = instance.steps.find(s => s.id === stepId);
    const stepTemplate = template.steps.find(s => s.id === step?.templateStepId);
    
    if (!stepTemplate || !stepTemplate.dependencies.length) return true;

    // Check if all dependencies are completed
    return stepTemplate.dependencies.every(depId => {
      const depStep = instance.steps.find(s => s.templateStepId === depId);
      return depStep?.status === 'completed';
    });
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();
