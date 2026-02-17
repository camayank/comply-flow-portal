/**
 * useReports Hook
 *
 * Custom hooks for Report Generation features:
 * - Generate reports (PDF, Excel, CSV, JSON)
 * - Download reports
 * - Report history
 * - Quick report endpoints
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export type ReportType =
  | 'service_requests'
  | 'revenue'
  | 'compliance'
  | 'user_activity'
  | 'operations_summary'
  | 'government_filings'
  | 'client_portfolio'
  | 'audit_trail';

export type ReportFormat = 'pdf' | 'csv' | 'excel' | 'json';

export interface ReportParameters {
  startDate?: string;
  endDate?: string;
  status?: string;
  clientId?: number;
  entityId?: number;
  limit?: number;
  groupBy?: 'day' | 'week' | 'month';
  customFilters?: Record<string, unknown>;
}

export interface ReportTypeInfo {
  type: ReportType;
  name: string;
  description: string;
}

export interface ReportMetadata {
  reportId: string;
  filename: string;
  format: ReportFormat;
  generatedAt: string;
  metadata: {
    recordCount: number;
    parameters: ReportParameters;
    generationTime: number;
  };
}

export interface ReportHistoryItem {
  id: string;
  type: ReportType;
  format: ReportFormat;
  parameters: ReportParameters;
  status: 'success' | 'failed';
  metadata?: {
    recordCount: number;
    generationTime: number;
  };
  error?: string;
  generatedAt: string;
  generatedBy: number;
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

async function downloadReport(url: string, body: unknown): Promise<Blob> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Download failed: ${response.statusText}`);
  }
  return response.blob();
}

// ============================================================================
// Report Type Hooks
// ============================================================================

export function useReportTypes() {
  return useQuery<{ success: boolean; data: ReportTypeInfo[] }>({
    queryKey: ['reports', 'types'],
    queryFn: () => fetchJson('/api/v1/reports/types'),
    staleTime: 600000, // 10 minutes
  });
}

// ============================================================================
// Report Generation Hooks
// ============================================================================

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; data: ReportMetadata }, Error, {
    type: ReportType;
    format?: ReportFormat;
    parameters?: ReportParameters;
  }>({
    mutationFn: (request) =>
      postJson('/api/v1/reports/generate', request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'history'] });
    },
  });
}

export function useDownloadReport() {
  return useMutation<Blob, Error, {
    type: ReportType;
    format?: ReportFormat;
    parameters?: ReportParameters;
  }>({
    mutationFn: (request) =>
      downloadReport('/api/v1/reports/download', request),
  });
}

// ============================================================================
// Report History Hooks
// ============================================================================

export function useReportHistory(filters?: { type?: ReportType; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.limit) params.set('limit', String(filters.limit));

  const url = `/api/v1/reports/history${params.toString() ? `?${params}` : ''}`;

  return useQuery<{ success: boolean; data: ReportHistoryItem[] }>({
    queryKey: ['reports', 'history', filters],
    queryFn: () => fetchJson(url),
    staleTime: 30000,
  });
}

// ============================================================================
// Quick Report Hooks
// ============================================================================

export function useServiceRequestsReport() {
  return useMutation<Blob | string, Error, {
    format?: ReportFormat;
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
  }>({
    mutationFn: async (request) => {
      if (request.format && request.format !== 'json') {
        return downloadReport('/api/v1/reports/service-requests', request);
      }
      return postJson('/api/v1/reports/service-requests', request);
    },
  });
}

export function useRevenueReport() {
  return useMutation<Blob | string, Error, {
    format?: ReportFormat;
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }>({
    mutationFn: async (request) => {
      if (request.format && request.format !== 'json') {
        return downloadReport('/api/v1/reports/revenue', request);
      }
      return postJson('/api/v1/reports/revenue', request);
    },
  });
}

export function useComplianceReport() {
  return useMutation<Blob | string, Error, {
    format?: ReportFormat;
    startDate?: string;
    endDate?: string;
    status?: string;
  }>({
    mutationFn: async (request) => {
      if (request.format && request.format !== 'json') {
        return downloadReport('/api/v1/reports/compliance', request);
      }
      return postJson('/api/v1/reports/compliance', request);
    },
  });
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Hook to trigger download of generated report
 */
export function useDownloadBlob() {
  return (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };
}

/**
 * Get filename extension for format
 */
export function getFormatExtension(format: ReportFormat): string {
  switch (format) {
    case 'pdf':
      return '.pdf';
    case 'excel':
      return '.xlsx';
    case 'csv':
      return '.csv';
    case 'json':
    default:
      return '.json';
  }
}

/**
 * Get MIME type for format
 */
export function getFormatMimeType(format: ReportFormat): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
      return 'text/csv';
    case 'json':
    default:
      return 'application/json';
  }
}

// ============================================================================
// Query Keys for External Use
// ============================================================================

export const reportKeys = {
  all: ['reports'] as const,
  types: () => [...reportKeys.all, 'types'] as const,
  history: (filters?: { type?: ReportType; limit?: number }) =>
    [...reportKeys.all, 'history', filters] as const,
};
