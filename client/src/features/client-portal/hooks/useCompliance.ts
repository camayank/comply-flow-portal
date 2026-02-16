/**
 * useCompliance Hook
 *
 * Custom hooks for compliance state and tracking data fetching
 * Provides typed interfaces for compliance-related API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for compliance data
export interface ComplianceState {
  entityId: number;
  overallState: 'GREEN' | 'AMBER' | 'RED';
  overallRiskScore: number;
  nextCriticalAction?: string;
  nextCriticalDeadline?: string;
  daysUntilNextDeadline?: number;
  totalPenaltyExposure: number;
  totalOverdueItems: number;
  totalUpcomingItems: number;
  domains: DomainState[];
  calculatedAt?: string;
}

export interface DomainState {
  domain: string;
  state: 'GREEN' | 'AMBER' | 'RED';
  riskScore: number;
  overdueRequirements: number;
}

export interface ComplianceScore {
  overallScore: number;
  previousScore: number;
  scoreChange: number;
  grade: string;
  rank: string;
  categories: ScoreCategory[];
  riskFactors: RiskFactor[];
  recommendations: Recommendation[];
  timeline: TimelinePoint[];
}

export interface ScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  status: string;
  weight: number;
}

export interface RiskFactor {
  title: string;
  impact: string;
  count: number;
  status: 'active' | 'resolved';
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

export interface TimelinePoint {
  month: string;
  score: number;
}

export interface ComplianceCalendarItem {
  id: number;
  title: string;
  dueDate: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  entityName?: string;
  description?: string;
  penaltyRisk?: number;
}

export interface ComplianceAlert {
  id: number;
  entityId: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  type: string;
  message: string;
  triggeredAt: string;
  isActive: boolean;
  isAcknowledged: boolean;
}

export interface ComplianceHistory {
  state: string;
  riskScore: number;
  penaltyExposure: number;
  overdueItems: number;
  recordedAt: string;
}

// API functions
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

// Compliance State Hook
export function useComplianceState(entityId: number | string) {
  return useQuery<{ state: ComplianceState; freshlyCalculated: boolean }>({
    queryKey: ['compliance-state', entityId],
    queryFn: () => fetchJson(`/api/compliance-state/${entityId}`),
    enabled: !!entityId,
    staleTime: 30000,
  });
}

// Compliance Score Hook (DigiScore)
export function useComplianceScore(entityId: number | string) {
  return useQuery<ComplianceScore>({
    queryKey: ['compliance-state', entityId, 'score'],
    queryFn: () => fetchJson(`/api/compliance-state/${entityId}/score`),
    enabled: !!entityId,
    staleTime: 60000,
  });
}

// Compliance Calendar Hook
export function useComplianceCalendar() {
  return useQuery<ComplianceCalendarItem[]>({
    queryKey: ['client', 'compliance-calendar'],
    queryFn: () => fetchJson('/api/client/compliance-calendar'),
    staleTime: 30000,
  });
}

// Compliance Alerts Hook
export function useComplianceAlerts(entityId: number | string) {
  return useQuery<{
    entityId: number;
    total: number;
    critical: number;
    warning: number;
    info: number;
    alerts: {
      critical: ComplianceAlert[];
      warning: ComplianceAlert[];
      info: ComplianceAlert[];
    };
  }>({
    queryKey: ['compliance-state', entityId, 'alerts'],
    queryFn: () => fetchJson(`/api/compliance-state/${entityId}/alerts`),
    enabled: !!entityId,
    staleTime: 15000, // 15 seconds for alerts
  });
}

// Compliance History Hook
export function useComplianceHistory(entityId: number | string, days: number = 30) {
  return useQuery<{
    entityId: number;
    days: number;
    history: ComplianceHistory[];
  }>({
    queryKey: ['compliance-state', entityId, 'history', days],
    queryFn: () => fetchJson(`/api/compliance-state/${entityId}/history?days=${days}`),
    enabled: !!entityId,
    staleTime: 60000,
  });
}

// Compliance Summary Hook
export function useComplianceSummary(entityId: number | string) {
  return useQuery<ComplianceState>({
    queryKey: ['compliance-state', entityId, 'summary'],
    queryFn: () => fetchJson(`/api/compliance-state/${entityId}/summary`),
    enabled: !!entityId,
    staleTime: 30000,
  });
}

// Mutation Hooks

// Mark compliance item as complete
export function useCompleteComplianceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      trackingId: number;
      completedBy?: number;
      completionDate?: string;
      evidenceDocId?: number;
    }) => postJson(`/api/compliance-state/tracking/${params.trackingId}/complete`, params),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['compliance-state'] });
      queryClient.invalidateQueries({ queryKey: ['client', 'compliance-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['lifecycle', 'compliance-detail'] });
    },
  });
}

// Request extension for compliance item
export function useRequestExtension() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      trackingId: number;
      reason: string;
      requestedDate: string;
    }) => postJson(`/api/compliance-state/tracking/${params.trackingId}/extension`, {
      reason: params.reason,
      requestedDate: params.requestedDate,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-state'] });
      queryClient.invalidateQueries({ queryKey: ['client', 'compliance-calendar'] });
    },
  });
}

// Acknowledge compliance alert
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: number) =>
      postJson(`/api/compliance-state/alerts/${alertId}/acknowledge`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-state'] });
    },
  });
}

// Recalculate compliance state
export function useRecalculateState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entityId: number) =>
      postJson(`/api/compliance-state/${entityId}/recalculate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-state'] });
    },
  });
}
