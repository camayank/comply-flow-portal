/**
 * useGovernmentFilings Hook
 *
 * Custom hooks for Government Filing features:
 * - GST Filing (GSTR-1, GSTR-3B)
 * - Income Tax Filing (ITR)
 * - MCA Forms
 * - TDS Returns
 * - PF/ESI Returns
 * - Filing History & Status
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export interface FilingRequest {
  clientId: number;
  entityId?: number;
  period: string;
  assessmentYear?: string;
  financialYear?: string;
  formType?: string;
  itrType?: string;
  quarter?: string;
  data: Record<string, unknown>;
  credentials?: {
    username?: string;
    password?: string;
    apiKey?: string;
  };
}

export interface FilingResponse {
  success: boolean;
  referenceNumber?: string;
  status?: string;
  acknowledgeDate?: string;
  error?: string;
  errorCode?: string;
}

export interface GovernmentFiling {
  id: number;
  clientId: number;
  entityId?: number;
  portalType: string;
  filingType: string;
  period?: string;
  assessmentYear?: string;
  financialYear?: string;
  status: string;
  arnNumber?: string;
  acknowledgmentNumber?: string;
  srnNumber?: string;
  dueDate?: string;
  submittedAt?: string;
  acknowledgedAt?: string;
  filingData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FilingHistoryFilters {
  entityId?: number;
  portalType?: string;
  filingType?: string;
  status?: string;
  limit?: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API Error: ${response.statusText}`);
  }
  return response.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API Error: ${response.statusText}`);
  }
  return response.json();
}

// ============================================================================
// GST Filing Hooks
// ============================================================================

export function useFileGSTR1() {
  const queryClient = useQueryClient();

  return useMutation<FilingResponse, Error, FilingRequest>({
    mutationFn: (request) =>
      postJson('/api/v1/government/gst/gstr1', request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['government', 'filings', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['government', 'pending'] });
    },
  });
}

export function useFileGSTR3B() {
  const queryClient = useQueryClient();

  return useMutation<FilingResponse, Error, FilingRequest>({
    mutationFn: (request) =>
      postJson('/api/v1/government/gst/gstr3b', request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['government', 'filings', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['government', 'pending'] });
    },
  });
}

export function useGSTFilingStatus(gstin: string, arn: string) {
  return useQuery({
    queryKey: ['government', 'gst', 'status', gstin, arn],
    queryFn: () => fetchJson(`/api/v1/government/gst/status/${gstin}/${arn}`),
    enabled: !!gstin && !!arn,
    staleTime: 60000,
  });
}

export function useGSTReturnsCalendar(gstin: string) {
  return useQuery({
    queryKey: ['government', 'gst', 'calendar', gstin],
    queryFn: () => fetchJson(`/api/v1/government/gst/calendar/${gstin}`),
    enabled: !!gstin,
    staleTime: 300000, // 5 minutes
  });
}

// ============================================================================
// Income Tax Filing Hooks
// ============================================================================

export function useFileITR() {
  const queryClient = useQueryClient();

  return useMutation<FilingResponse, Error, FilingRequest & { itrType: string; assessmentYear: string }>({
    mutationFn: (request) =>
      postJson('/api/v1/government/itr/file', request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['government', 'filings', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['government', 'pending'] });
    },
  });
}

export function useForm26AS(pan: string, assessmentYear: string) {
  return useQuery({
    queryKey: ['government', 'itr', 'form26as', pan, assessmentYear],
    queryFn: () => fetchJson(`/api/v1/government/itr/form26as/${pan}/${assessmentYear}`),
    enabled: !!pan && !!assessmentYear,
    staleTime: 300000,
  });
}

export function useAIS(pan: string, financialYear: string) {
  return useQuery({
    queryKey: ['government', 'itr', 'ais', pan, financialYear],
    queryFn: () => fetchJson(`/api/v1/government/itr/ais/${pan}/${financialYear}`),
    enabled: !!pan && !!financialYear,
    staleTime: 300000,
  });
}

// ============================================================================
// MCA Filing Hooks
// ============================================================================

export function useFileMCAForm() {
  const queryClient = useQueryClient();

  return useMutation<FilingResponse, Error, FilingRequest & { formType: string }>({
    mutationFn: (request) =>
      postJson('/api/v1/government/mca/form', request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['government', 'filings', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['government', 'pending'] });
    },
  });
}

export function useCompanyMasterData(cin: string) {
  return useQuery({
    queryKey: ['government', 'mca', 'company', cin],
    queryFn: () => fetchJson(`/api/v1/government/mca/company/${cin}`),
    enabled: !!cin,
    staleTime: 600000, // 10 minutes
  });
}

export function useDirectorDetails(din: string) {
  return useQuery({
    queryKey: ['government', 'mca', 'director', din],
    queryFn: () => fetchJson(`/api/v1/government/mca/director/${din}`),
    enabled: !!din,
    staleTime: 600000,
  });
}

export function useMCASRNStatus(srn: string) {
  return useQuery({
    queryKey: ['government', 'mca', 'srn', srn],
    queryFn: () => fetchJson(`/api/v1/government/mca/srn/${srn}`),
    enabled: !!srn,
    staleTime: 60000,
  });
}

// ============================================================================
// TDS Filing Hooks
// ============================================================================

export function useFileTDSReturn() {
  const queryClient = useQueryClient();

  return useMutation<FilingResponse, Error, FilingRequest & { formType: string; quarter: string }>({
    mutationFn: (request) =>
      postJson('/api/v1/government/tds/return', request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['government', 'filings', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['government', 'pending'] });
    },
  });
}

export function useForm16Download(tan: string, pan: string, financialYear: string) {
  return useQuery({
    queryKey: ['government', 'tds', 'form16', tan, pan, financialYear],
    queryFn: () => fetchJson(`/api/v1/government/tds/form16/${tan}/${pan}/${financialYear}`),
    enabled: !!tan && !!pan && !!financialYear,
    staleTime: 600000,
  });
}

// ============================================================================
// PF/ESI Filing Hooks
// ============================================================================

export function useFilePFReturn() {
  const queryClient = useQueryClient();

  return useMutation<FilingResponse, Error, FilingRequest>({
    mutationFn: (request) =>
      postJson('/api/v1/government/pf/return', request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['government', 'filings', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['government', 'pending'] });
    },
  });
}

export function useFileESIReturn() {
  const queryClient = useQueryClient();

  return useMutation<FilingResponse, Error, FilingRequest>({
    mutationFn: (request) =>
      postJson('/api/v1/government/esi/return', request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['government', 'filings', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['government', 'pending'] });
    },
  });
}

// ============================================================================
// Filing History & Status Hooks
// ============================================================================

export function useFilingHistory(clientId: number, filters?: FilingHistoryFilters) {
  const params = new URLSearchParams();
  if (filters?.entityId) params.set('entityId', String(filters.entityId));
  if (filters?.portalType) params.set('portalType', filters.portalType);
  if (filters?.filingType) params.set('filingType', filters.filingType);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.limit) params.set('limit', String(filters.limit));

  const url = `/api/v1/government/history/${clientId}${params.toString() ? `?${params}` : ''}`;

  return useQuery<{ success: boolean; data: GovernmentFiling[] }>({
    queryKey: ['government', 'filings', clientId, filters],
    queryFn: () => fetchJson(url),
    enabled: !!clientId,
    staleTime: 30000,
  });
}

export function usePendingFilings(clientId?: number) {
  const params = clientId ? `?clientId=${clientId}` : '';

  return useQuery<{ success: boolean; data: GovernmentFiling[] }>({
    queryKey: ['government', 'pending', clientId],
    queryFn: () => fetchJson(`/api/v1/government/pending${params}`),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useUpcomingDeadlines(days: number = 30, clientId?: number) {
  const params = new URLSearchParams();
  params.set('days', String(days));
  if (clientId) params.set('clientId', String(clientId));

  return useQuery<{ success: boolean; data: GovernmentFiling[] }>({
    queryKey: ['government', 'deadlines', days, clientId],
    queryFn: () => fetchJson(`/api/v1/government/deadlines?${params}`),
    staleTime: 60000,
    refetchInterval: 300000, // 5 minutes
  });
}

// ============================================================================
// Query Keys for External Use
// ============================================================================

export const governmentFilingKeys = {
  all: ['government'] as const,
  filings: (clientId: number) => [...governmentFilingKeys.all, 'filings', clientId] as const,
  pending: (clientId?: number) => [...governmentFilingKeys.all, 'pending', clientId] as const,
  deadlines: (days: number, clientId?: number) => [...governmentFilingKeys.all, 'deadlines', days, clientId] as const,
  gst: () => [...governmentFilingKeys.all, 'gst'] as const,
  gstStatus: (gstin: string, arn: string) => [...governmentFilingKeys.gst(), 'status', gstin, arn] as const,
  itr: () => [...governmentFilingKeys.all, 'itr'] as const,
  mca: () => [...governmentFilingKeys.all, 'mca'] as const,
  tds: () => [...governmentFilingKeys.all, 'tds'] as const,
};
