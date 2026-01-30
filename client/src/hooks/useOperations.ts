/**
 * useOperations Hooks
 *
 * Custom hooks for Operations features:
 * - QC Workflow
 * - Document Verification
 * - Status Transitions
 * - Work Queue
 * - Escalations
 * - Delivery Workflow
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  operationsService,
  QCReviewData,
  DocumentVerificationData,
  StatusTransitionData,
  WorkQueueFilters,
  EscalationRuleData,
} from '@/services/operationsService';

// ============================================================================
// Types
// ============================================================================

export interface QCReview {
  id: number;
  serviceRequestId: number;
  reviewerId: number | null;
  reviewerName?: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'revision_required';
  qualityScore: number | null;
  checklist: Record<string, boolean> | null;
  comments: string | null;
  rejectionReasons: string[] | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface WorkQueueItem {
  id: number;
  workItemType: string;
  referenceId: number;
  serviceRequestId: number | null;
  serviceKey: string | null;
  entityId: number | null;
  entityName: string | null;
  currentStatus: string | null;
  priority: string;
  slaDeadline: string | null;
  slaStatus: string | null;
  slaHoursRemaining: number | null;
  dueDate: string | null;
  assignedTo: number | null;
  assignedToName: string | null;
  escalationLevel: number;
  lastEscalatedAt: string | null;
  ageHours: number;
  lastActivityAt: string | null;
  serviceTypeName: string | null;
  periodLabel: string | null;
  createdAt: string;
}

export interface SLABreach {
  id: number;
  serviceRequestId: number;
  breachType: string;
  breachSeverity: string;
  slaHours: number | null;
  actualHours: number | null;
  breachHours: number | null;
  statusAtBreach: string | null;
  assigneeAtBreach: number | null;
  remediationRequired: boolean;
  remediationStatus: string;
  remediationNotes: string | null;
  remediatedBy: string | null;
  remediatedAt: string | null;
  clientNotified: boolean;
  breachedAt: string;
  createdAt: string;
}

export interface EscalationRule {
  id: number;
  ruleKey: string;
  ruleName: string;
  description: string | null;
  triggerType: string;
  triggerHours: number | null;
  serviceKey: string | null;
  statusCode: string | null;
  priority: string | null;
  escalationTiers: unknown[];
  autoReassign: boolean;
  reassignToRole: string | null;
  notifyClient: boolean;
  createIncident: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface DocumentVerificationStatus {
  serviceRequestId: number;
  totalDocuments: number;
  verifiedCount: number;
  pendingCount: number;
  rejectedCount: number;
  allVerified: boolean;
  documents: Array<{
    id: number;
    name: string;
    status: string;
    verifiedBy: number | null;
    verifiedAt: string | null;
  }>;
}

// ============================================================================
// QC Workflow Hooks
// ============================================================================

export function useQCPendingReviews(filters?: { assignedTo?: number; priority?: string }) {
  return useQuery({
    queryKey: ['operations', 'qc', 'pending-reviews', filters],
    queryFn: () => operationsService.getQCPendingReviews(filters),
    staleTime: 30000,
  });
}

export function useQCReviewDetails(serviceRequestId: number) {
  return useQuery({
    queryKey: ['operations', 'qc', 'review', serviceRequestId],
    queryFn: () => operationsService.getQCReviewDetails(serviceRequestId),
    enabled: !!serviceRequestId,
    staleTime: 30000,
  });
}

export function useStartQCReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceRequestId: number) =>
      operationsService.startQCReview(serviceRequestId),
    onSuccess: (_, serviceRequestId) => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'qc'] });
      queryClient.invalidateQueries({
        queryKey: ['operations', 'qc', 'review', serviceRequestId],
      });
    },
  });
}

export function useSubmitQCReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceRequestId, data }: { serviceRequestId: number; data: QCReviewData }) =>
      operationsService.submitQCReview(serviceRequestId, data),
    onSuccess: (_, { serviceRequestId }) => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'qc'] });
      queryClient.invalidateQueries({
        queryKey: ['operations', 'qc', 'review', serviceRequestId],
      });
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    },
  });
}

export function useAssignQCReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceRequestId, reviewerId }: { serviceRequestId: number; reviewerId: number }) =>
      operationsService.assignQCReview(serviceRequestId, reviewerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'qc'] });
    },
  });
}

export function useQCMetrics(period?: string) {
  return useQuery({
    queryKey: ['operations', 'qc', 'metrics', period],
    queryFn: () => operationsService.getQCMetrics(period),
    staleTime: 60000,
  });
}

export function useQCReviewHistory(serviceRequestId: number) {
  return useQuery({
    queryKey: ['operations', 'qc', 'history', serviceRequestId],
    queryFn: () => operationsService.getQCReviewHistory(serviceRequestId),
    enabled: !!serviceRequestId,
    staleTime: 60000,
  });
}

// ============================================================================
// Document Verification Hooks
// ============================================================================

export function useDocumentVerificationStatus(serviceRequestId: number) {
  return useQuery<DocumentVerificationStatus>({
    queryKey: ['operations', 'documents', 'verification-status', serviceRequestId],
    queryFn: () => operationsService.getDocumentVerificationStatus(serviceRequestId),
    enabled: !!serviceRequestId,
    staleTime: 30000,
  });
}

export function useVerifyDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, data }: { documentId: number; data: DocumentVerificationData }) =>
      operationsService.verifyDocument(documentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useBulkVerifyDocuments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceRequestId,
      verifications,
    }: {
      serviceRequestId: number;
      verifications: { documentId: number; data: DocumentVerificationData }[];
    }) => operationsService.bulkVerifyDocuments(serviceRequestId, verifications),
    onSuccess: (_, { serviceRequestId }) => {
      queryClient.invalidateQueries({
        queryKey: ['operations', 'documents', 'verification-status', serviceRequestId],
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useRequiredDocuments(serviceRequestId: number) {
  return useQuery({
    queryKey: ['operations', 'documents', 'required', serviceRequestId],
    queryFn: () => operationsService.getRequiredDocuments(serviceRequestId),
    enabled: !!serviceRequestId,
    staleTime: 60000,
  });
}

// ============================================================================
// Status Transition Hooks
// ============================================================================

export function useTransitionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceRequestId,
      data,
    }: {
      serviceRequestId: number;
      data: StatusTransitionData;
    }) => operationsService.transitionStatus(serviceRequestId, data),
    onSuccess: (_, { serviceRequestId }) => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({
        queryKey: ['service-requests', serviceRequestId],
      });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
  });
}

export function useValidNextStatuses(serviceRequestId: number) {
  return useQuery({
    queryKey: ['operations', 'transitions', 'valid', serviceRequestId],
    queryFn: () => operationsService.getValidNextStatuses(serviceRequestId),
    enabled: !!serviceRequestId,
    staleTime: 30000,
  });
}

export function useStatusHistory(serviceRequestId: number) {
  return useQuery({
    queryKey: ['operations', 'status-history', serviceRequestId],
    queryFn: () => operationsService.getStatusHistory(serviceRequestId),
    enabled: !!serviceRequestId,
    staleTime: 60000,
  });
}

// ============================================================================
// Work Queue Hooks
// ============================================================================

export function useWorkQueue(filters?: WorkQueueFilters) {
  return useQuery<{ items: WorkQueueItem[]; stats: Record<string, number> }>({
    queryKey: ['operations', 'work-queue', filters],
    queryFn: () => operationsService.getWorkQueue(filters),
    staleTime: 30000,
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

export function useAtRiskItems() {
  return useQuery<{ items: WorkQueueItem[] }>({
    queryKey: ['operations', 'work-queue', 'at-risk'],
    queryFn: () => operationsService.getAtRiskItems(),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useBreachedItems() {
  return useQuery<{ items: WorkQueueItem[] }>({
    queryKey: ['operations', 'work-queue', 'breached'],
    queryFn: () => operationsService.getBreachedItems(),
    staleTime: 30000,
    refetchInterval: 30000, // More frequent refresh for breaches
  });
}

export function useWorkQueueStats() {
  return useQuery({
    queryKey: ['operations', 'work-queue', 'stats'],
    queryFn: () => operationsService.getWorkQueueStats(),
    staleTime: 30000,
  });
}

// ============================================================================
// Escalation Hooks
// ============================================================================

export function useEscalationRules(filters?: { isActive?: boolean; serviceKey?: string }) {
  return useQuery<{ rules: EscalationRule[] }>({
    queryKey: ['operations', 'escalation', 'rules', filters],
    queryFn: () => operationsService.getEscalationRules(filters),
    staleTime: 60000,
  });
}

export function useEscalationRule(ruleId: number) {
  return useQuery<{ rule: EscalationRule }>({
    queryKey: ['operations', 'escalation', 'rules', ruleId],
    queryFn: () => operationsService.getEscalationRule(ruleId),
    enabled: !!ruleId,
    staleTime: 60000,
  });
}

export function useCreateEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EscalationRuleData) =>
      operationsService.createEscalationRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'escalation', 'rules'] });
    },
  });
}

export function useUpdateEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: number; data: Partial<EscalationRuleData> }) =>
      operationsService.updateEscalationRule(ruleId, data),
    onSuccess: (_, { ruleId }) => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'escalation', 'rules'] });
      queryClient.invalidateQueries({
        queryKey: ['operations', 'escalation', 'rules', ruleId],
      });
    },
  });
}

export function useToggleEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: number; isActive: boolean }) =>
      operationsService.toggleEscalationRule(ruleId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'escalation', 'rules'] });
    },
  });
}

export function useSLABreaches(filters?: { status?: string; severity?: string }) {
  return useQuery<{ breaches: SLABreach[] }>({
    queryKey: ['operations', 'escalation', 'sla-breaches', filters],
    queryFn: () => operationsService.getSLABreaches(filters),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useAcknowledgeSLABreach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ breachId, notes }: { breachId: number; notes?: string }) =>
      operationsService.acknowledgeSLABreach(breachId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'escalation', 'sla-breaches'] });
    },
  });
}

export function useResolveSLABreach() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ breachId, resolutionNotes }: { breachId: number; resolutionNotes: string }) =>
      operationsService.resolveSLABreach(breachId, resolutionNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'escalation', 'sla-breaches'] });
    },
  });
}

export function useEscalationExecutions(serviceRequestId?: number) {
  return useQuery({
    queryKey: ['operations', 'escalation', 'executions', serviceRequestId],
    queryFn: () => operationsService.getEscalationExecutions(serviceRequestId),
    staleTime: 60000,
  });
}

export function useEscalationEngineStatus() {
  return useQuery({
    queryKey: ['operations', 'escalation', 'engine', 'status'],
    queryFn: () => operationsService.getEscalationEngineStatus(),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useTriggerEscalationCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => operationsService.triggerEscalationCheck(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations', 'escalation'] });
      queryClient.invalidateQueries({ queryKey: ['operations', 'work-queue'] });
    },
  });
}

// ============================================================================
// Delivery Workflow Hooks
// ============================================================================

export function useMarkReadyForDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceRequestId: number) =>
      operationsService.markReadyForDelivery(serviceRequestId),
    onSuccess: (_, serviceRequestId) => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({
        queryKey: ['service-requests', serviceRequestId],
      });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
  });
}

export function useMarkDelivered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceRequestId,
      deliveryDetails,
    }: {
      serviceRequestId: number;
      deliveryDetails?: {
        deliveryMethod?: string;
        trackingNumber?: string;
        notes?: string;
      };
    }) => operationsService.markDelivered(serviceRequestId, deliveryDetails),
    onSuccess: (_, { serviceRequestId }) => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({
        queryKey: ['service-requests', serviceRequestId],
      });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
  });
}

export function useConfirmClientReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceRequestId,
      feedback,
    }: {
      serviceRequestId: number;
      feedback?: string;
    }) => operationsService.confirmClientReceipt(serviceRequestId, feedback),
    onSuccess: (_, { serviceRequestId }) => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({
        queryKey: ['service-requests', serviceRequestId],
      });
    },
  });
}

export function useCompleteServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceRequestId: number) =>
      operationsService.completeServiceRequest(serviceRequestId),
    onSuccess: (_, serviceRequestId) => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({
        queryKey: ['service-requests', serviceRequestId],
      });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
  });
}

// ============================================================================
// Activity Log Hooks
// ============================================================================

export function useActivityLog(serviceRequestId: number) {
  return useQuery({
    queryKey: ['operations', 'activity-log', serviceRequestId],
    queryFn: () => operationsService.getActivityLog(serviceRequestId),
    enabled: !!serviceRequestId,
    staleTime: 30000,
  });
}

export function useAddActivityNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceRequestId,
      note,
      isClientVisible,
    }: {
      serviceRequestId: number;
      note: string;
      isClientVisible?: boolean;
    }) => operationsService.addActivityNote(serviceRequestId, note, isClientVisible),
    onSuccess: (_, { serviceRequestId }) => {
      queryClient.invalidateQueries({
        queryKey: ['operations', 'activity-log', serviceRequestId],
      });
    },
  });
}

// ============================================================================
// Dashboard Hooks
// ============================================================================

export function useOperationsDashboard() {
  return useQuery({
    queryKey: ['operations', 'dashboard'],
    queryFn: () => operationsService.getDashboard(),
    staleTime: 60000,
  });
}

export function useOperationsTasks(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['operations', 'tasks', filters],
    queryFn: () => operationsService.getTasks(filters),
    staleTime: 30000,
  });
}

export function useOperationsPerformanceMetrics(userId?: string, period?: string) {
  return useQuery({
    queryKey: ['operations', 'metrics', userId, period],
    queryFn: () => operationsService.getPerformanceMetrics(userId, period),
    staleTime: 60000,
  });
}

// ============================================================================
// Query Keys for External Use
// ============================================================================

export const operationsKeys = {
  all: ['operations'] as const,
  qc: () => [...operationsKeys.all, 'qc'] as const,
  qcPendingReviews: () => [...operationsKeys.qc(), 'pending-reviews'] as const,
  qcReview: (id: number) => [...operationsKeys.qc(), 'review', id] as const,
  qcMetrics: (period?: string) => [...operationsKeys.qc(), 'metrics', period] as const,
  documents: () => [...operationsKeys.all, 'documents'] as const,
  documentVerification: (id: number) =>
    [...operationsKeys.documents(), 'verification-status', id] as const,
  workQueue: () => [...operationsKeys.all, 'work-queue'] as const,
  escalation: () => [...operationsKeys.all, 'escalation'] as const,
  escalationRules: () => [...operationsKeys.escalation(), 'rules'] as const,
  escalationRule: (id: number) => [...operationsKeys.escalationRules(), id] as const,
  slaBreaches: () => [...operationsKeys.escalation(), 'sla-breaches'] as const,
  activityLog: (id: number) => [...operationsKeys.all, 'activity-log', id] as const,
  dashboard: () => [...operationsKeys.all, 'dashboard'] as const,
  tasks: () => [...operationsKeys.all, 'tasks'] as const,
  metrics: () => [...operationsKeys.all, 'metrics'] as const,
};
