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

// Roles matching USER_ROLES from server/rbac-middleware.ts
export const ROLES = [
  { value: 'ops_executive', label: 'Operations Executive' },
  { value: 'ops_manager', label: 'Operations Manager' },
  { value: 'qc_executive', label: 'QC Executive' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
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
