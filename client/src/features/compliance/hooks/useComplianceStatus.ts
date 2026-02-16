import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import type { ComplianceStatus } from '../components/ComplianceStatusBadge';

export interface ComplianceItem {
  id: string;
  name: string;
  type: string;
  status: ComplianceStatus;
  dueDate?: string;
  lastUpdated: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  score?: number;
}

export interface ComplianceStats {
  total: number;
  compliant: number;
  nonCompliant: number;
  pending: number;
  expired: number;
  atRisk: number;
  complianceRate: number;
  trend: number;
}

interface UseComplianceStatusOptions {
  clientId?: string;
  category?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const QUERY_KEY = 'compliance-status';

export function useComplianceStatus(options: UseComplianceStatusOptions = {}) {
  const { clientId, category, autoRefresh = false, refreshInterval = 30000 } = options;
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => [QUERY_KEY, { clientId, category }],
    [clientId, category]
  );

  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ComplianceItem[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.append('clientId', clientId);
      if (category) params.append('category', category);

      const response = await fetch(`/api/compliance/status?${params}`);
      if (!response.ok) throw new Error('Failed to fetch compliance status');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const stats = useMemo<ComplianceStats>(() => {
    const total = items.length;
    const compliant = items.filter((i) => i.status === 'compliant').length;
    const nonCompliant = items.filter((i) => i.status === 'non_compliant').length;
    const pending = items.filter((i) => i.status === 'pending').length;
    const expired = items.filter((i) => i.status === 'expired').length;
    const atRisk = items.filter((i) => i.status === 'at_risk').length;

    return {
      total,
      compliant,
      nonCompliant,
      pending,
      expired,
      atRisk,
      complianceRate: total > 0 ? Math.round((compliant / total) * 100) : 0,
      trend: 0, // Would be calculated from historical data
    };
  }, [items]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      itemId,
      status,
    }: {
      itemId: string;
      status: ComplianceStatus;
    }) => {
      const response = await fetch(`/api/compliance/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update compliance status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const updateStatus = useCallback(
    (itemId: string, status: ComplianceStatus) => {
      return updateStatusMutation.mutateAsync({ itemId, status });
    },
    [updateStatusMutation]
  );

  const getItemsByStatus = useCallback(
    (status: ComplianceStatus) => {
      return items.filter((item) => item.status === status);
    },
    [items]
  );

  const getOverdueItems = useCallback(() => {
    const now = new Date();
    return items.filter((item) => {
      if (!item.dueDate) return false;
      return new Date(item.dueDate) < now && item.status !== 'compliant';
    });
  }, [items]);

  const getUpcomingDeadlines = useCallback(
    (days: number = 7) => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      return items
        .filter((item) => {
          if (!item.dueDate) return false;
          const dueDate = new Date(item.dueDate);
          return dueDate > now && dueDate <= futureDate;
        })
        .sort((a, b) => {
          return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
        });
    },
    [items]
  );

  const getPriorityItems = useCallback(() => {
    return items
      .filter((item) => item.priority === 'critical' || item.priority === 'high')
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (
          priorityOrder[a.priority || 'low'] - priorityOrder[b.priority || 'low']
        );
      });
  }, [items]);

  return {
    items,
    stats,
    isLoading,
    error,
    refetch,
    updateStatus,
    isUpdating: updateStatusMutation.isPending,
    getItemsByStatus,
    getOverdueItems,
    getUpcomingDeadlines,
    getPriorityItems,
  };
}

// Helper hook for single compliance item
export function useComplianceItem(itemId: string) {
  const queryClient = useQueryClient();

  const { data: item, isLoading, error } = useQuery<ComplianceItem>({
    queryKey: [QUERY_KEY, 'item', itemId],
    queryFn: async () => {
      const response = await fetch(`/api/compliance/${itemId}`);
      if (!response.ok) throw new Error('Failed to fetch compliance item');
      return response.json();
    },
    enabled: !!itemId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<ComplianceItem>) => {
      const response = await fetch(`/api/compliance/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update compliance item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    item,
    isLoading,
    error,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
