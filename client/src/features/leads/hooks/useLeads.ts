import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Types
// ============================================================================

export interface Lead {
  id: number;
  leadId: string;
  clientName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  state?: string | null;
  entityType?: string | null;
  serviceInterested?: string | null;
  leadSource?: string | null;
  leadStage?: string | null;
  priority?: string | null;
  estimatedValue?: string | number | null;
  nextFollowupDate?: Date | string | null;
  preSalesExecutive?: string | null;
  remarks?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface LeadCreateInput {
  clientName: string;
  contactPhone: string;
  contactEmail?: string;
  state?: string;
  entityType?: string;
  serviceInterested: string;
  leadSource: string;
  leadStage?: string;
  priority?: string;
  estimatedValue?: string | number;
  nextFollowupDate?: Date | string;
  preSalesExecutive?: string;
  remarks?: string;
}

export interface LeadUpdateInput extends Partial<LeadCreateInput> {
  id: number;
}

export interface FollowUp {
  id: number;
  leadId: number;
  activity: string;
  status: string;
  scheduledAt: Date | string;
  completedAt?: Date | string | null;
  notes?: string | null;
  assignedTo?: string | null;
  outcome?: string | null;
  createdAt?: Date | string;
}

export interface FollowUpCreateInput {
  leadId: number;
  activity: string;
  scheduledAt: Date | string;
  notes?: string;
  assignedTo?: string;
}

export interface LeadFilters {
  stage?: string;
  priority?: string;
  source?: string;
  entityType?: string;
  executive?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface LeadsResponse {
  leads: Lead[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LeadMetrics {
  totalLeads: number;
  newLeadsThisMonth: number;
  qualifiedLeads: number;
  pipelineValue: number;
  conversionRate: number;
  avgDealSize: number;
  avgSalesCycle: number;
  stageDistribution: Array<{
    stage: string;
    count: number;
    value: number;
  }>;
  sourceDistribution: Array<{
    source: string;
    count: number;
  }>;
  priorityDistribution: Array<{
    priority: string;
    count: number;
  }>;
}

export interface FollowUpSummary {
  overdue: number;
  today: number;
  thisWeek: number;
  completed: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: LeadFilters, page: number, limit: number) =>
    [...leadKeys.lists(), { filters, page, limit }] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: number) => [...leadKeys.details(), id] as const,
  metrics: () => [...leadKeys.all, 'metrics'] as const,
  followUps: () => [...leadKeys.all, 'followUps'] as const,
  followUpsList: (leadId?: number) => [...leadKeys.followUps(), { leadId }] as const,
  followUpSummary: () => [...leadKeys.followUps(), 'summary'] as const,
  pipeline: () => [...leadKeys.all, 'pipeline'] as const,
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchLeads(
  filters: LeadFilters,
  page: number,
  limit: number
): Promise<LeadsResponse> {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));

  if (filters.stage) params.append('stage', filters.stage);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.source) params.append('source', filters.source);
  if (filters.entityType) params.append('entityType', filters.entityType);
  if (filters.executive) params.append('executive', filters.executive);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.search) params.append('search', filters.search);

  const response = await fetch(`/api/leads?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch leads');
  }
  return response.json();
}

async function fetchLead(id: number): Promise<Lead> {
  const response = await fetch(`/api/leads/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch lead');
  }
  return response.json();
}

async function createLead(data: LeadCreateInput): Promise<Lead> {
  const response = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create lead');
  }
  return response.json();
}

async function updateLead(data: LeadUpdateInput): Promise<Lead> {
  const { id, ...updateData } = data;
  const response = await fetch(`/api/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    throw new Error('Failed to update lead');
  }
  return response.json();
}

async function deleteLead(id: number): Promise<void> {
  const response = await fetch(`/api/leads/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete lead');
  }
}

async function updateLeadStage(id: number, stage: string): Promise<Lead> {
  const response = await fetch(`/api/leads/${id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  });
  if (!response.ok) {
    throw new Error('Failed to update lead stage');
  }
  return response.json();
}

async function fetchLeadMetrics(): Promise<LeadMetrics> {
  const response = await fetch('/api/leads/metrics');
  if (!response.ok) {
    throw new Error('Failed to fetch lead metrics');
  }
  return response.json();
}

async function fetchFollowUps(leadId?: number): Promise<FollowUp[]> {
  const url = leadId ? `/api/leads/${leadId}/follow-ups` : '/api/leads/follow-ups';
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch follow-ups');
  }
  return response.json();
}

async function fetchFollowUpSummary(): Promise<FollowUpSummary> {
  const response = await fetch('/api/leads/follow-ups/summary');
  if (!response.ok) {
    throw new Error('Failed to fetch follow-up summary');
  }
  return response.json();
}

async function createFollowUp(data: FollowUpCreateInput): Promise<FollowUp> {
  const response = await fetch(`/api/leads/${data.leadId}/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create follow-up');
  }
  return response.json();
}

async function completeFollowUp(id: number, outcome?: string): Promise<FollowUp> {
  const response = await fetch(`/api/leads/follow-ups/${id}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome }),
  });
  if (!response.ok) {
    throw new Error('Failed to complete follow-up');
  }
  return response.json();
}

async function rescheduleFollowUp(id: number, scheduledAt: Date | string): Promise<FollowUp> {
  const response = await fetch(`/api/leads/follow-ups/${id}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduledAt }),
  });
  if (!response.ok) {
    throw new Error('Failed to reschedule follow-up');
  }
  return response.json();
}

async function fetchPipelineData(): Promise<Array<{ stage: string; leads: Lead[] }>> {
  const response = await fetch('/api/leads/pipeline');
  if (!response.ok) {
    throw new Error('Failed to fetch pipeline data');
  }
  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch paginated leads with filters
 */
export function useLeads(
  filters: LeadFilters = {},
  page: number = 1,
  limit: number = 10
) {
  return useQuery({
    queryKey: leadKeys.list(filters, page, limit),
    queryFn: () => fetchLeads(filters, page, limit),
  });
}

/**
 * Fetch a single lead by ID
 */
export function useLead(id: number) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: () => fetchLead(id),
    enabled: !!id,
  });
}

/**
 * Create a new lead
 */
export function useCreateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.metrics() });
      queryClient.invalidateQueries({ queryKey: leadKeys.pipeline() });
      toast({
        title: 'Lead created',
        description: 'The lead has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update an existing lead
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: updateLead,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: leadKeys.metrics() });
      queryClient.invalidateQueries({ queryKey: leadKeys.pipeline() });
      toast({
        title: 'Lead updated',
        description: 'The lead has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a lead
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.metrics() });
      queryClient.invalidateQueries({ queryKey: leadKeys.pipeline() });
      toast({
        title: 'Lead deleted',
        description: 'The lead has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update lead stage (for pipeline drag-drop)
 */
export function useUpdateLeadStage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) => updateLeadStage(id, stage),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: leadKeys.metrics() });
      queryClient.invalidateQueries({ queryKey: leadKeys.pipeline() });
      toast({
        title: 'Stage updated',
        description: 'The lead stage has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Fetch lead metrics
 */
export function useLeadMetrics() {
  return useQuery({
    queryKey: leadKeys.metrics(),
    queryFn: fetchLeadMetrics,
  });
}

/**
 * Fetch follow-ups (optionally for a specific lead)
 */
export function useFollowUps(leadId?: number) {
  return useQuery({
    queryKey: leadKeys.followUpsList(leadId),
    queryFn: () => fetchFollowUps(leadId),
  });
}

/**
 * Fetch follow-up summary
 */
export function useFollowUpSummary() {
  return useQuery({
    queryKey: leadKeys.followUpSummary(),
    queryFn: fetchFollowUpSummary,
  });
}

/**
 * Create a new follow-up
 */
export function useCreateFollowUp() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createFollowUp,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.followUps() });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(data.leadId) });
      toast({
        title: 'Follow-up scheduled',
        description: 'The follow-up has been scheduled successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Complete a follow-up
 */
export function useCompleteFollowUp() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, outcome }: { id: number; outcome?: string }) =>
      completeFollowUp(id, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.followUps() });
      toast({
        title: 'Follow-up completed',
        description: 'The follow-up has been marked as completed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Reschedule a follow-up
 */
export function useRescheduleFollowUp() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: number; scheduledAt: Date | string }) =>
      rescheduleFollowUp(id, scheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.followUps() });
      toast({
        title: 'Follow-up rescheduled',
        description: 'The follow-up has been rescheduled successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Fetch pipeline data for Kanban view
 */
export function usePipeline() {
  return useQuery({
    queryKey: leadKeys.pipeline(),
    queryFn: fetchPipelineData,
  });
}

/**
 * Bulk update leads
 */
export function useBulkUpdateLeads() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Array<{ id: number; data: Partial<LeadCreateInput> }>) => {
      const results = await Promise.all(
        updates.map(({ id, data }) =>
          fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }).then(res => {
            if (!res.ok) throw new Error(`Failed to update lead ${id}`);
            return res.json();
          })
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      toast({
        title: 'Leads updated',
        description: 'The selected leads have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Bulk delete leads
 */
export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(
        ids.map(id =>
          fetch(`/api/leads/${id}`, { method: 'DELETE' }).then(res => {
            if (!res.ok) throw new Error(`Failed to delete lead ${id}`);
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      toast({
        title: 'Leads deleted',
        description: 'The selected leads have been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Export leads
 */
export function useExportLeads() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (filters: LeadFilters) => {
      const params = new URLSearchParams();
      if (filters.stage) params.append('stage', filters.stage);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.source) params.append('source', filters.source);

      const response = await fetch(`/api/leads/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to export leads');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: 'Export complete',
        description: 'The leads have been exported successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
