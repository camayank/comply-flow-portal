/**
 * useSales Hook
 *
 * Custom hooks for Sales features:
 * - Leads Management
 * - Pipeline Analytics
 * - Proposals
 * - Follow-ups
 * - Sales Metrics
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type LeadStage, type LeadPriority, type ProposalStatus, type PaymentStatus } from '../config';

// ============================================================================
// Types
// ============================================================================

export interface Lead {
  id: number;
  leadId: string;
  tenantId: string | null;
  clientName: string;
  companyName?: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  state: string | null;
  leadSource: string;
  serviceInterested: string;
  leadStage: LeadStage | string;
  priority: LeadPriority | string;
  estimatedValue: number | string | null;
  preSalesExecutive: string | null;
  nextFollowupDate: string | null;
  notes: string | null;
  qualifiedAt: string | null;
  convertedAt: string | null;
  lostReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadWithScore extends Lead {
  score?: number;
  lastActivity?: string;
  activitiesCount?: number;
}

export interface Proposal {
  id: number;
  tenantId: string | null;
  leadId: number;
  leadRefId?: string;
  salesExecutive: string;
  proposalStatus: ProposalStatus | string;
  requiredServices: Array<{ name: string; price?: number }> | null;
  proposalAmount: number | string | null;
  paymentReceived: PaymentStatus | string | null;
  paymentPending: number | string | null;
  qualifiedLeadStatus: string | null;
  nextFollowupDate: string | null;
  finalRemark: string | null;
  documentsLink: string | null;
  validUntil?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  acceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: number;
  leadId: number;
  type: 'call' | 'email' | 'meeting' | 'demo' | 'proposal_review';
  scheduledAt: string;
  completedAt: string | null;
  notes: string | null;
  outcome: string | null;
  nextAction: string | null;
}

export interface PipelineMetrics {
  totalLeads: number;
  totalValue: number;
  byStage: Record<LeadStage, { count: number; value: number }>;
  conversionRate: number;
  avgDealSize: number;
  avgSalesCycle: number;
}

export interface SalesMetrics {
  period: string;
  newLeads: number;
  qualifiedLeads: number;
  proposalsSent: number;
  dealsWon: number;
  dealsLost: number;
  revenue: number;
  conversionRate: number;
  winRate: number;
  avgDealSize: number;
  avgSalesCycle: number;
}

export interface LeadActivity {
  id: number;
  leadId: number;
  type: string;
  description: string;
  performedBy: string;
  performedAt: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// API Functions
// ============================================================================

const API_BASE = '/api';

async function fetchLeads(params?: {
  stage?: LeadStage | string;
  priority?: LeadPriority | string;
  source?: string;
  executive?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Lead[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.stage) searchParams.set('stage', params.stage);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.source) searchParams.set('source', params.source);
  if (params?.executive) searchParams.set('executive', params.executive);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const response = await fetch(`${API_BASE}/leads?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch leads');
  return response.json();
}

async function fetchLead(id: number): Promise<Lead> {
  const response = await fetch(`${API_BASE}/leads/${id}`);
  if (!response.ok) throw new Error('Failed to fetch lead');
  return response.json();
}

async function createLead(data: Partial<Lead>): Promise<Lead> {
  const response = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create lead');
  return response.json();
}

async function updateLead(id: number, data: Partial<Lead>): Promise<Lead> {
  const response = await fetch(`${API_BASE}/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update lead');
  return response.json();
}

async function deleteLead(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/leads/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete lead');
}

async function updateLeadStage(id: number, stage: LeadStage): Promise<Lead> {
  const response = await fetch(`${API_BASE}/leads/${id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  });
  if (!response.ok) throw new Error('Failed to update lead stage');
  return response.json();
}

async function fetchProposals(params?: {
  status?: ProposalStatus | string;
  leadId?: number;
  page?: number;
  limit?: number;
}): Promise<{ data: Proposal[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.leadId) searchParams.set('leadId', params.leadId.toString());
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const response = await fetch(`${API_BASE}/proposals?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch proposals');
  return response.json();
}

async function fetchProposal(id: number): Promise<Proposal> {
  const response = await fetch(`${API_BASE}/proposals/${id}`);
  if (!response.ok) throw new Error('Failed to fetch proposal');
  return response.json();
}

async function createProposal(data: Partial<Proposal>): Promise<Proposal> {
  const response = await fetch(`${API_BASE}/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create proposal');
  return response.json();
}

async function updateProposal(id: number, data: Partial<Proposal>): Promise<Proposal> {
  const response = await fetch(`${API_BASE}/proposals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update proposal');
  return response.json();
}

async function sendProposal(id: number): Promise<Proposal> {
  const response = await fetch(`${API_BASE}/proposals/${id}/send`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to send proposal');
  return response.json();
}

async function fetchPipelineMetrics(): Promise<PipelineMetrics> {
  const response = await fetch(`${API_BASE}/sales/pipeline-metrics`);
  if (!response.ok) throw new Error('Failed to fetch pipeline metrics');
  return response.json();
}

async function fetchSalesMetrics(period?: string): Promise<SalesMetrics> {
  const searchParams = new URLSearchParams();
  if (period) searchParams.set('period', period);

  const response = await fetch(`${API_BASE}/sales/metrics?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch sales metrics');
  return response.json();
}

async function fetchLeadActivities(leadId: number): Promise<LeadActivity[]> {
  const response = await fetch(`${API_BASE}/leads/${leadId}/activities`);
  if (!response.ok) throw new Error('Failed to fetch lead activities');
  return response.json();
}

async function fetchFollowUps(params?: {
  leadId?: number;
  upcoming?: boolean;
  overdue?: boolean;
}): Promise<FollowUp[]> {
  const searchParams = new URLSearchParams();
  if (params?.leadId) searchParams.set('leadId', params.leadId.toString());
  if (params?.upcoming) searchParams.set('upcoming', 'true');
  if (params?.overdue) searchParams.set('overdue', 'true');

  const response = await fetch(`${API_BASE}/follow-ups?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch follow-ups');
  return response.json();
}

async function createFollowUp(data: Partial<FollowUp>): Promise<FollowUp> {
  const response = await fetch(`${API_BASE}/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create follow-up');
  return response.json();
}

async function completeFollowUp(id: number, outcome: string): Promise<FollowUp> {
  const response = await fetch(`${API_BASE}/follow-ups/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome }),
  });
  if (!response.ok) throw new Error('Failed to complete follow-up');
  return response.json();
}

// ============================================================================
// Query Keys
// ============================================================================

export const salesQueryKeys = {
  all: ['sales'] as const,
  leads: () => [...salesQueryKeys.all, 'leads'] as const,
  leadsList: (params?: Record<string, unknown>) => [...salesQueryKeys.leads(), 'list', params] as const,
  lead: (id: number) => [...salesQueryKeys.leads(), id] as const,
  leadActivities: (id: number) => [...salesQueryKeys.leads(), id, 'activities'] as const,
  proposals: () => [...salesQueryKeys.all, 'proposals'] as const,
  proposalsList: (params?: Record<string, unknown>) => [...salesQueryKeys.proposals(), 'list', params] as const,
  proposal: (id: number) => [...salesQueryKeys.proposals(), id] as const,
  pipeline: () => [...salesQueryKeys.all, 'pipeline'] as const,
  metrics: (period?: string) => [...salesQueryKeys.all, 'metrics', period] as const,
  followUps: (params?: Record<string, unknown>) => [...salesQueryKeys.all, 'follow-ups', params] as const,
};

// ============================================================================
// Leads Hooks
// ============================================================================

export function useLeads(params?: {
  stage?: LeadStage | string;
  priority?: LeadPriority | string;
  source?: string;
  executive?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: salesQueryKeys.leadsList(params),
    queryFn: () => fetchLeads(params),
  });
}

export function useLead(id: number) {
  return useQuery({
    queryKey: salesQueryKeys.lead(id),
    queryFn: () => fetchLead(id),
    enabled: id > 0,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.leads() });
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.pipeline() });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Lead> }) => updateLead(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.lead(id) });
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.leads() });
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.pipeline() });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.leads() });
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.pipeline() });
    },
  });
}

export function useUpdateLeadStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: LeadStage }) => updateLeadStage(id, stage),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.lead(id) });
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.leads() });
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.pipeline() });
    },
  });
}

export function useLeadActivities(leadId: number) {
  return useQuery({
    queryKey: salesQueryKeys.leadActivities(leadId),
    queryFn: () => fetchLeadActivities(leadId),
    enabled: leadId > 0,
  });
}

// ============================================================================
// Proposals Hooks
// ============================================================================

export function useProposals(params?: {
  status?: ProposalStatus | string;
  leadId?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: salesQueryKeys.proposalsList(params),
    queryFn: () => fetchProposals(params),
  });
}

export function useProposal(id: number) {
  return useQuery({
    queryKey: salesQueryKeys.proposal(id),
    queryFn: () => fetchProposal(id),
    enabled: id > 0,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.proposals() });
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Proposal> }) => updateProposal(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.proposal(id) });
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.proposals() });
    },
  });
}

export function useSendProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendProposal,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.proposal(id) });
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.proposals() });
    },
  });
}

// ============================================================================
// Pipeline & Metrics Hooks
// ============================================================================

export function usePipelineMetrics() {
  return useQuery({
    queryKey: salesQueryKeys.pipeline(),
    queryFn: fetchPipelineMetrics,
  });
}

export function useSalesMetrics(period?: string) {
  return useQuery({
    queryKey: salesQueryKeys.metrics(period),
    queryFn: () => fetchSalesMetrics(period),
  });
}

// ============================================================================
// Follow-up Hooks
// ============================================================================

export function useFollowUps(params?: {
  leadId?: number;
  upcoming?: boolean;
  overdue?: boolean;
}) {
  return useQuery({
    queryKey: salesQueryKeys.followUps(params),
    queryFn: () => fetchFollowUps(params),
  });
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFollowUp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.followUps() });
    },
  });
}

export function useCompleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, outcome }: { id: number; outcome: string }) => completeFollowUp(id, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.followUps() });
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Returns leads grouped by stage for pipeline view
 */
export function useLeadsByStage() {
  const { data, isLoading, error } = useLeads({ limit: 1000 });

  const leadsByStage: Record<LeadStage, Lead[]> = {
    new: [],
    contacted: [],
    qualified: [],
    proposal_sent: [],
    negotiation: [],
    won: [],
    lost: [],
  };

  const valuesByStage: Record<LeadStage, number> = {
    new: 0,
    contacted: 0,
    qualified: 0,
    proposal_sent: 0,
    negotiation: 0,
    won: 0,
    lost: 0,
  };

  if (data?.data) {
    data.data.forEach((lead) => {
      const stage = (lead.leadStage as LeadStage) || 'new';
      if (leadsByStage[stage]) {
        leadsByStage[stage].push(lead);
        const value = lead.estimatedValue
          ? typeof lead.estimatedValue === 'string'
            ? parseFloat(lead.estimatedValue)
            : lead.estimatedValue
          : 0;
        valuesByStage[stage] += value;
      }
    });
  }

  return {
    leadsByStage,
    valuesByStage,
    isLoading,
    error,
  };
}

/**
 * Returns upcoming follow-ups for the current user
 */
export function useUpcomingFollowUps() {
  return useFollowUps({ upcoming: true });
}

/**
 * Returns overdue follow-ups for the current user
 */
export function useOverdueFollowUps() {
  return useFollowUps({ overdue: true });
}
