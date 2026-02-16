/**
 * useCustomerSuccess Hook
 *
 * Custom hooks for Customer Success features:
 * - Health Scores
 * - Success Playbooks
 * - Playbook Executions
 * - Renewal Opportunities
 * - AI Recommendations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export interface PlaybookStage {
  name: string;
  duration?: string;
  tasks?: string[];
}

export interface SuccessPlaybook {
  id: number;
  tenantId: string | null;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConditions: Record<string, unknown> | null;
  stages: PlaybookStage[];
  isActive: boolean;
  activeExecutions: number;
  completedExecutions: number;
  createdBy: number | null;
  createdAt: string;
}

export interface PlaybookExecution {
  id: number;
  playbookId: number;
  playbookName?: string;
  clientId: number;
  clientName?: string;
  client?: { id: number; name: string };
  currentStage: number;
  totalStages: number;
  stageProgress: Record<string, unknown> | null;
  status: string;
  assignedTo: number | null;
  startedAt: string;
  completedAt: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
}

export interface RenewalOpportunity {
  id: number;
  clientId: number;
  client: { id: number; name: string } | null;
  entityId: number | null;
  contractType: string | null;
  currentValue: number | null;
  renewalValue: number | null;
  renewalDate: string;
  daysUntilRenewal: number;
  status: string;
  probability: number | null;
  riskFactors: string[];
  owner: { id: number; name: string } | null;
  notes: string | null;
  renewedAt: string | null;
  createdAt: string;
}

export interface CustomerHealthScore {
  id: number;
  clientId: number;
  clientName?: string;
  clientEmail?: string;
  overallScore: number;
  engagementScore: number | null;
  complianceScore: number | null;
  paymentScore: number | null;
  supportScore: number | null;
  productUsageScore: number | null;
  trend: string | null;
  riskLevel: string | null;
  factors: Record<string, unknown> | null;
  recommendations: unknown[] | null;
  calculatedAt: string;
}

export interface AiRecommendation {
  id: number;
  userId: number;
  type: string;
  title: string;
  description: string;
  actionUrl: string | null;
  priority: string;
  confidence: number;
  isActive: boolean;
  dismissedAt: string | null;
  actedAt: string | null;
  outcome: string | null;
  createdAt: string;
}

export interface PlaybookFilters {
  isActive?: boolean;
}

export interface RenewalFilters {
  status?: string;
  daysUntil?: number;
}

export interface HealthScoreFilters {
  riskLevel?: string;
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
// Health Score Hooks
// ============================================================================

export function useHealthScores(filters: HealthScoreFilters = {}) {
  const params = new URLSearchParams();
  if (filters.riskLevel) params.set('riskLevel', filters.riskLevel);

  const url = `/api/customer-success/health-scores${params.toString() ? `?${params}` : ''}`;

  return useQuery<{
    healthScores: CustomerHealthScore[];
    summary: {
      total: number;
      avgScore: number;
      byRiskLevel: Record<string, number>;
    };
  }>({
    queryKey: ['customer-success', 'health-scores', filters],
    queryFn: () => fetchJson(url),
    staleTime: 60000,
  });
}

export function useHealthScore(clientId: number | string) {
  return useQuery<{ healthScore: CustomerHealthScore }>({
    queryKey: ['customer-success', 'health-scores', clientId],
    queryFn: () => fetchJson(`/api/customer-success/health-scores/${clientId}`),
    enabled: !!clientId,
    staleTime: 60000,
  });
}

export function useRecalculateHealthScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => postJson('/api/customer-success/health-scores/recalculate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'health-scores'] });
    },
  });
}

// ============================================================================
// Playbook Hooks
// ============================================================================

export function usePlaybooks(filters: PlaybookFilters = {}) {
  const params = new URLSearchParams();
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));

  const url = `/api/customer-success/playbooks${params.toString() ? `?${params}` : ''}`;

  return useQuery<{
    playbooks: SuccessPlaybook[];
    summary: {
      total: number;
      active: number;
      totalActiveExecutions: number;
      totalCompletedExecutions: number;
    };
  }>({
    queryKey: ['customer-success', 'playbooks', filters],
    queryFn: () => fetchJson(url),
    staleTime: 60000,
  });
}

export function usePlaybook(id: number | string) {
  return useQuery<{
    playbook: SuccessPlaybook;
    executions: PlaybookExecution[];
  }>({
    queryKey: ['customer-success', 'playbooks', id],
    queryFn: () => fetchJson(`/api/customer-success/playbooks/${id}`),
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useCreatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      triggerType: string;
      triggerConditions?: Record<string, unknown>;
      stages: PlaybookStage[];
      isActive?: boolean;
    }) => postJson('/api/customer-success/playbooks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'playbooks'] });
    },
  });
}

export function useUpdatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SuccessPlaybook> }) =>
      patchJson(`/api/customer-success/playbooks/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'playbooks'] });
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'playbooks', variables.id] });
    },
  });
}

// ============================================================================
// Execution Hooks
// ============================================================================

export function useExecutions(filters: { status?: string; clientId?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.clientId) params.set('clientId', filters.clientId);

  const url = `/api/customer-success/executions${params.toString() ? `?${params}` : ''}`;

  return useQuery<{ executions: PlaybookExecution[] }>({
    queryKey: ['customer-success', 'executions', filters],
    queryFn: () => fetchJson(url),
    staleTime: 30000,
  });
}

export function useStartExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playbookId, data }: {
      playbookId: number;
      data: { clientId: number; assignedToId?: number; notes?: string };
    }) => postJson(`/api/customer-success/playbooks/${playbookId}/executions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'playbooks'] });
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'executions'] });
    },
  });
}

export function useUpdateExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: {
      id: number;
      data: {
        action?: 'advance' | 'pause' | 'resume' | 'cancel' | 'complete';
        notes?: string;
        stageProgress?: Record<string, unknown>;
      };
    }) => patchJson(`/api/customer-success/executions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'executions'] });
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'playbooks'] });
    },
  });
}

// ============================================================================
// Renewal Hooks
// ============================================================================

export function useRenewals(filters: RenewalFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.daysUntil) params.set('daysUntil', String(filters.daysUntil));

  const url = `/api/customer-success/renewals${params.toString() ? `?${params}` : ''}`;

  return useQuery<{
    renewals: RenewalOpportunity[];
    summary: {
      total: number;
      totalPipeline: number;
      atRiskValue: number;
      dueIn30Days: number;
      avgProbability: number;
    };
  }>({
    queryKey: ['customer-success', 'renewals', filters],
    queryFn: () => fetchJson(url),
    staleTime: 60000,
  });
}

export function useRenewal(id: number | string) {
  return useQuery<{ renewal: RenewalOpportunity }>({
    queryKey: ['customer-success', 'renewals', id],
    queryFn: () => fetchJson(`/api/customer-success/renewals/${id}`),
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useCreateRenewal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      clientId: number;
      entityId?: number;
      contractType?: string;
      currentValue?: number;
      renewalValue?: number;
      renewalDate: string;
      probability?: number;
      ownerId?: number;
      notes?: string;
    }) => postJson('/api/customer-success/renewals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'renewals'] });
    },
  });
}

export function useUpdateRenewal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RenewalOpportunity> }) =>
      patchJson(`/api/customer-success/renewals/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'renewals'] });
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'renewals', variables.id] });
    },
  });
}

// ============================================================================
// Recommendation Hooks
// ============================================================================

export function useRecommendations() {
  return useQuery<{ recommendations: AiRecommendation[] }>({
    queryKey: ['customer-success', 'recommendations'],
    queryFn: () => fetchJson('/api/customer-success/recommendations'),
    staleTime: 30000,
  });
}

export function useDismissRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      patchJson(`/api/customer-success/recommendations/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'recommendations'] });
    },
  });
}

export function useActOnRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, outcome }: { id: number; outcome?: string }) =>
      patchJson(`/api/customer-success/recommendations/${id}/act`, { outcome }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-success', 'recommendations'] });
    },
  });
}

// ============================================================================
// Query Keys for External Use
// ============================================================================

export const customerSuccessKeys = {
  all: ['customer-success'] as const,
  healthScores: () => [...customerSuccessKeys.all, 'health-scores'] as const,
  healthScore: (clientId: number | string) => [...customerSuccessKeys.healthScores(), clientId] as const,
  playbooks: () => [...customerSuccessKeys.all, 'playbooks'] as const,
  playbook: (id: number | string) => [...customerSuccessKeys.playbooks(), id] as const,
  executions: () => [...customerSuccessKeys.all, 'executions'] as const,
  renewals: () => [...customerSuccessKeys.all, 'renewals'] as const,
  renewal: (id: number | string) => [...customerSuccessKeys.renewals(), id] as const,
  recommendations: () => [...customerSuccessKeys.all, 'recommendations'] as const,
};
