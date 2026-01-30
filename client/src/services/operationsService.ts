import apiClient from './api';

// ============= Type Definitions =============

export interface CreateTaskData {
  title: string;
  description: string;
  serviceInstanceId?: string;
  assignedTo?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  metadata?: Record<string, any>;
}

export interface QCReviewData {
  decision: 'approved' | 'rejected' | 'revision_required';
  comments: string;
  checklist?: Record<string, boolean>;
  rejectionReasons?: string[];
}

export interface DocumentVerificationData {
  verificationStatus: 'verified' | 'rejected' | 'needs_resubmission';
  notes?: string;
  verifiedFields?: Record<string, boolean>;
}

export interface StatusTransitionData {
  toStatus: string;
  notes?: string;
  performedBy?: number;
}

export interface WorkQueueFilters {
  slaStatus?: 'on_track' | 'at_risk' | 'warning' | 'breached';
  assignedTo?: number;
  priority?: string;
  serviceKey?: string;
  status?: string;
}

export interface EscalationRuleData {
  ruleKey: string;
  ruleName: string;
  description?: string;
  triggerType: 'time_based' | 'sla_based' | 'status_based';
  triggerHours?: number;
  serviceKey?: string;
  statusCode?: string;
  priority?: string;
  escalationTiers: EscalationTier[];
  autoReassign?: boolean;
  reassignToRole?: string;
  notifyClient?: boolean;
  createIncident?: boolean;
}

export interface EscalationTier {
  tier: number;
  thresholdPercent: number;
  severity: 'warning' | 'critical' | 'breach';
  notifyRoles: string[];
  actions: string[];
}

export interface SLABreachData {
  serviceRequestId: number;
  breachType: 'overall_sla' | 'status_sla' | 'response_sla';
  breachSeverity: 'minor' | 'major' | 'critical';
  slaHours: number;
  actualHours: number;
}

export const operationsService = {
  // Get operations dashboard
  getDashboard: async () => {
    const response = await apiClient.get('/operations/dashboard');
    return response.data;
  },

  // Get tasks
  getTasks: async (filters?: any) => {
    const response = await apiClient.get('/operations/tasks', { params: filters });
    return response.data;
  },

  // Create task
  createTask: async (data: CreateTaskData) => {
    const response = await apiClient.post('/operations/tasks', data);
    return response.data;
  },

  // Get task by ID
  getTaskById: async (id: string) => {
    const response = await apiClient.get(`/operations/tasks/${id}`);
    return response.data;
  },

  // Update task
  updateTask: async (id: string, data: Partial<CreateTaskData>) => {
    const response = await apiClient.patch(`/operations/tasks/${id}`, data);
    return response.data;
  },

  // Start task
  startTask: async (id: string) => {
    const response = await apiClient.post(`/operations/tasks/${id}/start`);
    return response.data;
  },

  // Complete task
  completeTask: async (id: string, notes?: string) => {
    const response = await apiClient.post(`/operations/tasks/${id}/complete`, { notes });
    return response.data;
  },

  // Request documents for task
  requestDocuments: async (id: string, documents: string[]) => {
    const response = await apiClient.post(`/operations/tasks/${id}/request-documents`, {
      documents,
    });
    return response.data;
  },

  // Get government filings
  getGovernmentFilings: async (filters?: any) => {
    const response = await apiClient.get('/operations/government-filings', {
      params: filters,
    });
    return response.data;
  },

  // Update government filing
  updateGovernmentFiling: async (id: string, data: any) => {
    const response = await apiClient.patch(`/operations/government-filings/${id}`, data);
    return response.data;
  },

  // Get workflows
  getWorkflows: async (filters?: any) => {
    const response = await apiClient.get('/operations/workflows', { params: filters });
    return response.data;
  },

  // Get workflow by ID
  getWorkflowById: async (id: string) => {
    const response = await apiClient.get(`/operations/workflows/${id}`);
    return response.data;
  },

  // Get team members
  getTeamMembers: async () => {
    const response = await apiClient.get('/operations/team');
    return response.data;
  },

  // Get performance metrics
  getPerformanceMetrics: async (userId?: string, period?: string) => {
    const response = await apiClient.get('/operations/metrics', {
      params: { userId, period },
    });
    return response.data;
  },

  // ============= QC WORKFLOW METHODS =============

  // Get service requests pending QC review
  getQCPendingReviews: async (filters?: { assignedTo?: number; priority?: string }) => {
    const response = await apiClient.get('/qc/pending-reviews', { params: filters });
    return response.data;
  },

  // Get single service request QC details
  getQCReviewDetails: async (serviceRequestId: number) => {
    const response = await apiClient.get(`/qc/service-requests/${serviceRequestId}/review`);
    return response.data;
  },

  // Start QC review (claim the review)
  startQCReview: async (serviceRequestId: number) => {
    const response = await apiClient.post(`/qc/service-requests/${serviceRequestId}/start-review`);
    return response.data;
  },

  // Submit QC review decision
  submitQCReview: async (serviceRequestId: number, data: QCReviewData) => {
    const response = await apiClient.post(`/qc/service-requests/${serviceRequestId}/submit-review`, data);
    return response.data;
  },

  // Assign QC review to specific reviewer
  assignQCReview: async (serviceRequestId: number, reviewerId: number) => {
    const response = await apiClient.post(`/qc/service-requests/${serviceRequestId}/assign`, {
      reviewerId,
    });
    return response.data;
  },

  // Get QC metrics dashboard
  getQCMetrics: async (period?: string) => {
    const response = await apiClient.get('/qc/metrics', { params: { period } });
    return response.data;
  },

  // Get QC review history for a service request
  getQCReviewHistory: async (serviceRequestId: number) => {
    const response = await apiClient.get(`/qc/service-requests/${serviceRequestId}/history`);
    return response.data;
  },

  // ============= DOCUMENT VERIFICATION METHODS =============

  // Get document verification status for service request
  getDocumentVerificationStatus: async (serviceRequestId: number) => {
    const response = await apiClient.get(
      `/service-requests/${serviceRequestId}/documents/verification-status`
    );
    return response.data;
  },

  // Verify a single document
  verifyDocument: async (documentId: number, data: DocumentVerificationData) => {
    const response = await apiClient.post(`/documents/${documentId}/verify`, data);
    return response.data;
  },

  // Bulk verify documents for a service request
  bulkVerifyDocuments: async (
    serviceRequestId: number,
    documentVerifications: { documentId: number; data: DocumentVerificationData }[]
  ) => {
    const response = await apiClient.post(
      `/service-requests/${serviceRequestId}/documents/bulk-verify`,
      { verifications: documentVerifications }
    );
    return response.data;
  },

  // Get required documents for service request
  getRequiredDocuments: async (serviceRequestId: number) => {
    const response = await apiClient.get(
      `/service-requests/${serviceRequestId}/required-documents`
    );
    return response.data;
  },

  // ============= STATUS TRANSITION METHODS =============

  // Transition service request status
  transitionStatus: async (serviceRequestId: number, data: StatusTransitionData) => {
    const response = await apiClient.post(
      `/service-requests/${serviceRequestId}/transition`,
      data
    );
    return response.data;
  },

  // Get valid next statuses for current state
  getValidNextStatuses: async (serviceRequestId: number) => {
    const response = await apiClient.get(
      `/service-requests/${serviceRequestId}/valid-transitions`
    );
    return response.data;
  },

  // Get status history for service request
  getStatusHistory: async (serviceRequestId: number) => {
    const response = await apiClient.get(
      `/service-requests/${serviceRequestId}/status-history`
    );
    return response.data;
  },

  // ============= WORK QUEUE METHODS =============

  // Get work queue items
  getWorkQueue: async (filters?: WorkQueueFilters) => {
    const response = await apiClient.get('/escalation/work-queue', { params: filters });
    return response.data;
  },

  // Get at-risk work items (approaching SLA)
  getAtRiskItems: async () => {
    const response = await apiClient.get('/escalation/work-queue', {
      params: { slaStatus: 'at_risk' },
    });
    return response.data;
  },

  // Get breached work items (past SLA)
  getBreachedItems: async () => {
    const response = await apiClient.get('/escalation/work-queue', {
      params: { slaStatus: 'breached' },
    });
    return response.data;
  },

  // Get work queue summary statistics
  getWorkQueueStats: async () => {
    const response = await apiClient.get('/escalation/work-queue/stats');
    return response.data;
  },

  // ============= ESCALATION METHODS =============

  // Get all escalation rules
  getEscalationRules: async (filters?: { isActive?: boolean; serviceKey?: string }) => {
    const response = await apiClient.get('/escalation/rules', { params: filters });
    return response.data;
  },

  // Get single escalation rule
  getEscalationRule: async (ruleId: number) => {
    const response = await apiClient.get(`/escalation/rules/${ruleId}`);
    return response.data;
  },

  // Create escalation rule
  createEscalationRule: async (data: EscalationRuleData) => {
    const response = await apiClient.post('/escalation/rules', data);
    return response.data;
  },

  // Update escalation rule
  updateEscalationRule: async (ruleId: number, data: Partial<EscalationRuleData>) => {
    const response = await apiClient.patch(`/escalation/rules/${ruleId}`, data);
    return response.data;
  },

  // Toggle escalation rule active status
  toggleEscalationRule: async (ruleId: number, isActive: boolean) => {
    const response = await apiClient.patch(`/escalation/rules/${ruleId}`, { isActive });
    return response.data;
  },

  // Get SLA breaches
  getSLABreaches: async (filters?: { status?: string; severity?: string }) => {
    const response = await apiClient.get('/escalation/sla-breaches', { params: filters });
    return response.data;
  },

  // Acknowledge SLA breach
  acknowledgeSLABreach: async (breachId: number, notes?: string) => {
    const response = await apiClient.post(`/escalation/sla-breaches/${breachId}/acknowledge`, {
      notes,
    });
    return response.data;
  },

  // Resolve SLA breach
  resolveSLABreach: async (breachId: number, resolutionNotes: string) => {
    const response = await apiClient.post(`/escalation/sla-breaches/${breachId}/resolve`, {
      resolutionNotes,
    });
    return response.data;
  },

  // Get escalation executions (history)
  getEscalationExecutions: async (serviceRequestId?: number) => {
    const response = await apiClient.get('/escalation/executions', {
      params: { serviceRequestId },
    });
    return response.data;
  },

  // Get escalation engine status
  getEscalationEngineStatus: async () => {
    const response = await apiClient.get('/escalation/engine/status');
    return response.data;
  },

  // Trigger manual escalation check
  triggerEscalationCheck: async () => {
    const response = await apiClient.post('/escalation/engine/check');
    return response.data;
  },

  // ============= DELIVERY WORKFLOW METHODS =============

  // Mark service request as ready for delivery
  markReadyForDelivery: async (serviceRequestId: number) => {
    const response = await apiClient.post(
      `/operations/service-requests/${serviceRequestId}/ready-for-delivery`
    );
    return response.data;
  },

  // Mark service request as delivered
  markDelivered: async (serviceRequestId: number, deliveryDetails?: {
    deliveryMethod?: string;
    trackingNumber?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post(
      `/operations/service-requests/${serviceRequestId}/deliver`,
      deliveryDetails
    );
    return response.data;
  },

  // Confirm client receipt
  confirmClientReceipt: async (serviceRequestId: number, feedback?: string) => {
    const response = await apiClient.post(
      `/operations/service-requests/${serviceRequestId}/confirm-receipt`,
      { feedback }
    );
    return response.data;
  },

  // Complete service request
  completeServiceRequest: async (serviceRequestId: number) => {
    const response = await apiClient.post(
      `/operations/service-requests/${serviceRequestId}/complete`
    );
    return response.data;
  },

  // ============= ACTIVITY LOG METHODS =============

  // Get activity log for service request
  getActivityLog: async (serviceRequestId: number) => {
    const response = await apiClient.get(
      `/service-requests/${serviceRequestId}/activity-log`
    );
    return response.data;
  },

  // Add activity note
  addActivityNote: async (serviceRequestId: number, note: string, isClientVisible?: boolean) => {
    const response = await apiClient.post(
      `/service-requests/${serviceRequestId}/activity-log`,
      { note, isClientVisible }
    );
    return response.data;
  },
};
