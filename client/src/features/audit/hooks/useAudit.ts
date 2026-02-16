/**
 * useAudit Hook
 *
 * Custom hooks for Audit & Compliance features:
 * - Immutable Audit Logs
 * - Data Deletion Requests (GDPR/DPDP)
 * - Access Reviews
 * - Security Incidents
 * - Data Classifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export interface AuditLogEntry {
  id: number;
  logHash: string;
  previousHash: string | null;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  timestamp: string;
  userName?: string | null;
  userEmail?: string | null;
}

export interface DataDeletionRequest {
  id: number;
  subjectEmail: string;
  subjectName: string | null;
  requestType: 'erasure' | 'portability' | 'rectification' | 'restriction';
  scope: Record<string, unknown> | null;
  status: 'pending' | 'verified' | 'processing' | 'completed' | 'rejected';
  verifiedAt: string | null;
  processingStartedAt: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  exportUrl: string | null;
  exportExpiresAt: string | null;
  createdAt: string;
  requestedByName?: string | null;
}

export interface AccessReview {
  id: number;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  reviewType: 'quarterly' | 'annual' | 'termination';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  reviewerId: number | null;
  reviewerName?: string | null;
  dueDate: string | null;
  completedAt: string | null;
  summary: string | null;
  createdAt: string;
  totalItems?: number;
  completedItems?: number;
}

export interface AccessReviewItem {
  id: number;
  reviewId: number;
  userId: number;
  userName?: string | null;
  userEmail?: string | null;
  currentRole: string | null;
  currentPermissions: Record<string, unknown> | null;
  accessHistory: Record<string, unknown> | null;
  decision: 'approve' | 'revoke' | 'modify' | null;
  newRole: string | null;
  newPermissions: Record<string, unknown> | null;
  comments: string | null;
  reviewedAt: string | null;
}

export interface SecurityIncident {
  id: number;
  incidentId: string;
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedUsers: string[] | null;
  affectedData: string[] | null;
  affectedSystems?: string[] | null;
  detectionMethod?: string | null;
  containmentActions?: string | null;
  eradicationActions?: string | null;
  recoveryActions?: string | null;
  lessonsLearned?: string | null;
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  assignedTo: number | null;
  assignedToName?: string | null;
  detectedAt: string;
  containedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

export interface DataClassification {
  id: number;
  entityType: string;
  fieldName: string;
  classification: 'public' | 'internal' | 'confidential' | 'pii' | 'sensitive';
  handlingRequirements: string | null;
  retentionDays: number | null;
  encryptionRequired: boolean;
  maskingRequired: boolean;
  maskingPattern: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ChainVerificationResult {
  valid: boolean;
  verifiedCount: number;
  totalEntries: number;
  brokenAt: number | null;
  verifiedRange: {
    start: number;
    end: number;
  };
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

async function patchJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

// ============================================================================
// Audit Log Hooks
// ============================================================================

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.entityId) params.set('entityId', filters.entityId);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.action) params.set('action', filters.action);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  const url = `/api/audit/logs${params.toString() ? `?${params}` : ''}`;

  return useQuery<{
    logs: AuditLogEntry[];
    pagination: { total: number; limit: number; offset: number };
  }>({
    queryKey: ['audit', 'logs', filters],
    queryFn: () => fetchJson(url),
    staleTime: 30000,
  });
}

export function useAuditLog(id: number | string) {
  return useQuery<{ log: AuditLogEntry }>({
    queryKey: ['audit', 'logs', id],
    queryFn: () => fetchJson(`/api/audit/logs/${id}`),
    enabled: !!id,
    staleTime: 60000,
  });
}

export function useVerifyAuditChain() {
  return useMutation<ChainVerificationResult, Error, { startId?: number; endId?: number }>({
    mutationFn: (params) => postJson('/api/audit/verify-chain', params),
  });
}

export function useExportAuditLogs() {
  return useMutation<Blob, Error, { startDate: string; endDate: string; format?: 'json' | 'csv' }>({
    mutationFn: async ({ startDate, endDate, format = 'json' }) => {
      const response = await fetch(
        `/api/audit/export?startDate=${startDate}&endDate=${endDate}&format=${format}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Export failed');
      return response.blob();
    },
  });
}

export function useCreateAuditLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      action: string;
      entityType: string;
      entityId?: string;
      oldValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
    }) => postJson('/api/audit/log', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'logs'] });
    },
  });
}

// ============================================================================
// Data Deletion Request Hooks
// ============================================================================

export function useDataRequests(filters: { status?: string; requestType?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.requestType) params.set('requestType', filters.requestType);

  const url = `/api/audit/data-requests${params.toString() ? `?${params}` : ''}`;

  return useQuery<{
    requests: DataDeletionRequest[];
    summary: Record<string, number>;
  }>({
    queryKey: ['audit', 'data-requests', filters],
    queryFn: () => fetchJson(url),
    staleTime: 30000,
  });
}

export function useCreateDataRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      subjectEmail: string;
      subjectName?: string;
      requestType: 'erasure' | 'portability' | 'rectification' | 'restriction';
      scope?: Record<string, unknown>;
    }) => postJson('/api/audit/data-requests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'data-requests'] });
    },
  });
}

export function useVerifyDataRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, token }: { id: number; token: string }) =>
      postJson(`/api/audit/data-requests/${id}/verify`, { token }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'data-requests'] });
    },
  });
}

export function useProcessDataRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => postJson(`/api/audit/data-requests/${id}/process`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'data-requests'] });
    },
  });
}

export function useUpdateDataRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: {
      id: number;
      data: {
        status?: string;
        rejectionReason?: string;
        exportUrl?: string;
        exportExpiresAt?: string;
      };
    }) => patchJson(`/api/audit/data-requests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'data-requests'] });
    },
  });
}

// ============================================================================
// Access Review Hooks
// ============================================================================

export function useAccessReviews(filters: { status?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);

  const url = `/api/audit/access-reviews${params.toString() ? `?${params}` : ''}`;

  return useQuery<{ reviews: AccessReview[] }>({
    queryKey: ['audit', 'access-reviews', filters],
    queryFn: () => fetchJson(url),
    staleTime: 60000,
  });
}

export function useCreateAccessReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      reviewPeriodStart: string;
      reviewPeriodEnd: string;
      reviewType: 'quarterly' | 'annual' | 'termination';
      reviewerId?: number;
      dueDate?: string;
    }) => postJson('/api/audit/access-reviews', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'access-reviews'] });
    },
  });
}

export function useAccessReviewItems(reviewId: number | string, filters: { decision?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.decision) params.set('decision', filters.decision);

  const url = `/api/audit/access-reviews/${reviewId}/items${params.toString() ? `?${params}` : ''}`;

  return useQuery<{ items: AccessReviewItem[] }>({
    queryKey: ['audit', 'access-reviews', reviewId, 'items', filters],
    queryFn: () => fetchJson(url),
    enabled: !!reviewId,
    staleTime: 30000,
  });
}

export function useSubmitReviewDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, itemId, data }: {
      reviewId: number;
      itemId: number;
      data: {
        decision: 'approve' | 'revoke' | 'modify';
        newRole?: string;
        newPermissions?: Record<string, unknown>;
        comments?: string;
      };
    }) => patchJson(`/api/audit/access-reviews/${reviewId}/items/${itemId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'access-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['audit', 'access-reviews', variables.reviewId, 'items'] });
    },
  });
}

// ============================================================================
// Security Incident Hooks
// ============================================================================

export function useSecurityIncidents(filters: { status?: string; severity?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.severity) params.set('severity', filters.severity);

  const url = `/api/audit/security-incidents${params.toString() ? `?${params}` : ''}`;

  return useQuery<{
    incidents: SecurityIncident[];
    summary: { bySeverity: Record<string, number> };
  }>({
    queryKey: ['audit', 'security-incidents', filters],
    queryFn: () => fetchJson(url),
    staleTime: 30000,
  });
}

export function useSecurityIncident(id: number | string) {
  return useQuery<{ incident: SecurityIncident }>({
    queryKey: ['audit', 'security-incidents', id],
    queryFn: () => fetchJson(`/api/audit/security-incidents/${id}`),
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useCreateSecurityIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      incidentType: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      affectedUsers?: string[];
      affectedData?: string[];
      affectedSystems?: string[];
      detectionMethod?: string;
      assignedTo?: number;
    }) => postJson('/api/audit/security-incidents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'security-incidents'] });
    },
  });
}

export function useUpdateSecurityIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: {
      id: number;
      data: {
        status?: string;
        severity?: string;
        assignedTo?: number;
        containmentActions?: string;
        eradicationActions?: string;
        recoveryActions?: string;
        lessonsLearned?: string;
      };
    }) => patchJson(`/api/audit/security-incidents/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'security-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['audit', 'security-incidents', variables.id] });
    },
  });
}

// ============================================================================
// Data Classification Hooks
// ============================================================================

export function useDataClassifications(filters: { entityType?: string; classification?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.classification) params.set('classification', filters.classification);

  const url = `/api/audit/data-classifications${params.toString() ? `?${params}` : ''}`;

  return useQuery<{ classifications: DataClassification[] }>({
    queryKey: ['audit', 'data-classifications', filters],
    queryFn: () => fetchJson(url),
    staleTime: 60000,
  });
}

export function useCreateDataClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      entityType: string;
      fieldName: string;
      classification: string;
      handlingRequirements?: string;
      retentionDays?: number;
      encryptionRequired?: boolean;
      maskingRequired?: boolean;
      maskingPattern?: string;
    }) => postJson('/api/audit/data-classifications', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'data-classifications'] });
    },
  });
}

export function useUpdateDataClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: {
      id: number;
      data: {
        classification?: string;
        handlingRequirements?: string;
        retentionDays?: number;
        encryptionRequired?: boolean;
        maskingRequired?: boolean;
        maskingPattern?: string;
      };
    }) => patchJson(`/api/audit/data-classifications/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', 'data-classifications'] });
    },
  });
}

// ============================================================================
// Query Keys for External Use
// ============================================================================

export const auditKeys = {
  all: ['audit'] as const,
  logs: () => [...auditKeys.all, 'logs'] as const,
  log: (id: number | string) => [...auditKeys.logs(), id] as const,
  dataRequests: () => [...auditKeys.all, 'data-requests'] as const,
  accessReviews: () => [...auditKeys.all, 'access-reviews'] as const,
  reviewItems: (reviewId: number | string) => [...auditKeys.accessReviews(), reviewId, 'items'] as const,
  securityIncidents: () => [...auditKeys.all, 'security-incidents'] as const,
  securityIncident: (id: number | string) => [...auditKeys.securityIncidents(), id] as const,
  dataClassifications: () => [...auditKeys.all, 'data-classifications'] as const,
};
