// client/src/features/admin/components/WorkflowStepEditor/types.ts

export interface WorkflowStep {
  id: string;
  blueprintId: string;
  stepCode: string;
  stepName: string;
  stepType: string;
  description: string | null;
  defaultAssigneeRole: string | null;
  slaHours: number | null;
  isMilestone: boolean | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStepFormData {
  stepCode: string;
  stepName: string;
  stepType: string;
  description: string;
  slaHours: number;
  defaultAssigneeRole: string;
  isMilestone: boolean;
}

// Step types matching the backend STEP_TYPE_MAP
export const STEP_TYPES = [
  { value: 'DATA_COLLECTION', label: 'Data Collection' },
  { value: 'DOCUMENT_UPLOAD', label: 'Document Upload' },
  { value: 'DOCUMENT_COLLECTION', label: 'Document Collection' },
  { value: 'VERIFICATION', label: 'Verification' },
  { value: 'GOVERNMENT_FILING', label: 'Government Filing' },
  { value: 'FILING', label: 'Filing' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'APPROVAL', label: 'Approval' },
  { value: 'QC_REVIEW', label: 'QC Review' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'CLIENT_ACTION', label: 'Client Action' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'TASK', label: 'General Task' },
] as const;

// Roles matching the backend TASK_TYPE_ROLE_MAP and operations_team roles
export const ROLES = [
  { value: 'ops_executive', label: 'Operations Executive' },
  { value: 'ops_lead', label: 'Operations Lead' },
  { value: 'qc_reviewer', label: 'QC Reviewer' },
  { value: 'admin', label: 'Admin' },
] as const;

export const DEFAULT_FORM_DATA: WorkflowStepFormData = {
  stepCode: '',
  stepName: '',
  stepType: 'DATA_COLLECTION',
  description: '',
  slaHours: 8,
  defaultAssigneeRole: 'ops_executive',
  isMilestone: false,
};
