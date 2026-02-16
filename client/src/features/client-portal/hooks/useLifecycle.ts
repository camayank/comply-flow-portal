/**
 * useLifecycle Hook
 *
 * Custom hooks for lifecycle data fetching with React Query
 * Provides typed interfaces for all lifecycle-related API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for lifecycle data
export interface LifecycleDashboard {
  company: {
    name: string;
    stage: string;
    cin?: string;
    gstin?: string;
  };
  summary: {
    complianceHealth: 'GREEN' | 'AMBER' | 'RED';
    fundingReadiness: number;
    documentsCount: number;
    servicesActive: number;
  };
  upcomingDeadlines: Array<{
    id: number;
    title: string;
    dueDate: string;
    type: string;
    priority: string;
  }>;
  recentActivity: Array<{
    id: number;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export interface ComplianceDetail {
  entityId: number;
  entityName: string;
  overallState: 'GREEN' | 'AMBER' | 'RED';
  monthly: ComplianceItem[];
  quarterly: ComplianceItem[];
  annual: ComplianceItem[];
  penaltyExposure: {
    total: number;
    byCategory: Record<string, number>;
  };
}

export interface ComplianceItem {
  id: number;
  name: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'overdue';
  category: string;
  penalty?: number;
}

export interface ServicesDetail {
  active: ServiceItem[];
  recommended: ServiceItem[];
  history: ServiceItem[];
}

export interface ServiceItem {
  id: string;
  name: string;
  status: string;
  category: string;
  price?: number;
  description?: string;
}

export interface DocumentsDetail {
  categories: DocumentCategory[];
  totalCount: number;
  pendingVerification: number;
}

export interface DocumentCategory {
  name: string;
  count: number;
  documents: DocumentItem[];
}

export interface DocumentItem {
  id: number;
  name: string;
  type: string;
  uploadDate: string;
  status: 'pending' | 'verified' | 'rejected';
}

export interface FundingDetail {
  overallScore: number;
  scoreBreakdown: Record<string, {
    score: number;
    weight: string;
    description: string;
    status: string;
  }>;
  timeline: {
    currentReadiness: number;
    targetReadiness: number;
    estimatedTimeToReady: string;
    milestones: Array<{
      name: string;
      target: string;
      timeframe: string;
    }>;
  };
  dueDiligenceChecklist: {
    legal: ChecklistSection;
    financial: ChecklistSection;
    compliance: ChecklistSection;
  };
  criticalGaps: string[];
  recommendations: string[];
}

export interface ChecklistSection {
  completionRate: number;
  items: Array<{
    name: string;
    status: 'completed' | 'in_progress' | 'pending';
  }>;
}

export interface Timeline {
  companyAge: string;
  stages: Array<{
    stage: string;
    completed: boolean;
    current: boolean;
    dateEntered?: string;
    achievements?: string[];
  }>;
  upcomingMilestones: Array<{
    name: string;
    description: string;
    targetDate?: string;
  }>;
  history: Array<{
    type: string;
    title?: string;
    description?: string;
    timestamp: string;
  }>;
}

// API base URL
const API_BASE = '/api/v2/lifecycle';

// Fetch functions
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

// Dashboard Hook
export function useLifecycleDashboard() {
  return useQuery<LifecycleDashboard>({
    queryKey: ['lifecycle', 'dashboard'],
    queryFn: () => fetchJson<LifecycleDashboard>(`${API_BASE}/dashboard`),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

// Compliance Detail Hook
export function useComplianceDetail() {
  return useQuery<ComplianceDetail>({
    queryKey: ['lifecycle', 'compliance-detail'],
    queryFn: () => fetchJson<ComplianceDetail>(`${API_BASE}/compliance-detail`),
    staleTime: 30000,
  });
}

// Services Detail Hook
export function useServicesDetail() {
  return useQuery<ServicesDetail>({
    queryKey: ['lifecycle', 'services-detail'],
    queryFn: () => fetchJson<ServicesDetail>(`${API_BASE}/services-detail`),
    staleTime: 60000, // 1 minute
  });
}

// Documents Detail Hook
export function useDocumentsDetail() {
  return useQuery<DocumentsDetail>({
    queryKey: ['lifecycle', 'documents-detail'],
    queryFn: () => fetchJson<DocumentsDetail>(`${API_BASE}/documents-detail`),
    staleTime: 30000,
  });
}

// Funding Detail Hook
export function useFundingDetail() {
  return useQuery<FundingDetail>({
    queryKey: ['lifecycle', 'funding-detail'],
    queryFn: () => fetchJson<FundingDetail>(`${API_BASE}/funding-detail`),
    staleTime: 60000,
  });
}

// Timeline Hook
export function useTimeline() {
  return useQuery<Timeline>({
    queryKey: ['lifecycle', 'timeline'],
    queryFn: () => fetchJson<Timeline>(`${API_BASE}/timeline`),
    staleTime: 60000,
  });
}

// Combined lifecycle data hook (for dashboards that need multiple pieces)
export function useLifecycleData() {
  const dashboard = useLifecycleDashboard();
  const compliance = useComplianceDetail();

  return {
    dashboard,
    compliance,
    isLoading: dashboard.isLoading || compliance.isLoading,
    error: dashboard.error || compliance.error,
  };
}
