import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import type { LifecycleAction, ActionUrgency } from '../components/LifecycleActionCard';

interface UseLifecycleActionsOptions {
  companyId?: string;
  urgency?: ActionUrgency[];
  category?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const QUERY_KEY = 'lifecycle-actions';

export function useLifecycleActions(options: UseLifecycleActionsOptions = {}) {
  const {
    companyId,
    urgency,
    category,
    limit,
    autoRefresh = true,
    refreshInterval = 60000,
  } = options;

  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const queryKey = useMemo(
    () => [QUERY_KEY, { companyId, urgency, category, limit }],
    [companyId, urgency, category, limit]
  );

  const {
    data: allActions = [],
    isLoading,
    error,
    refetch,
  } = useQuery<LifecycleAction[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (urgency?.length) params.append('urgency', urgency.join(','));
      if (category) params.append('category', category);
      if (limit) params.append('limit', limit.toString());

      const response = await fetch(`/api/v2/lifecycle/actions?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch lifecycle actions');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Filter out locally dismissed for immediate UI feedback
  const actions = useMemo(() => {
    return allActions.filter((action) => !dismissedIds.has(action.id));
  }, [allActions, dismissedIds]);

  const startActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const response = await fetch(`/api/v2/lifecycle/actions/${actionId}/start`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to start action');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const completeActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const response = await fetch(
        `/api/v2/lifecycle/actions/${actionId}/complete`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to complete action');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const dismissActionMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const response = await fetch(
        `/api/v2/lifecycle/actions/${actionId}/dismiss`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to dismiss action');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const startAction = useCallback(
    (actionId: string) => {
      return startActionMutation.mutateAsync(actionId);
    },
    [startActionMutation]
  );

  const completeAction = useCallback(
    (actionId: string) => {
      return completeActionMutation.mutateAsync(actionId);
    },
    [completeActionMutation]
  );

  const dismissAction = useCallback(
    (actionId: string) => {
      // Optimistic update
      setDismissedIds((prev) => new Set(prev).add(actionId));
      return dismissActionMutation.mutateAsync(actionId);
    },
    [dismissActionMutation]
  );

  const getActionsByUrgency = useCallback(
    (urg: ActionUrgency) => {
      return actions.filter((action) => action.urgency === urg);
    },
    [actions]
  );

  const criticalActions = useMemo(() => {
    return actions.filter((a) => a.urgency === 'critical');
  }, [actions]);

  const highPriorityActions = useMemo(() => {
    return actions.filter((a) => a.urgency === 'critical' || a.urgency === 'high');
  }, [actions]);

  const totalImpact = useMemo(() => {
    return actions.reduce((sum, a) => sum + a.impact, 0);
  }, [actions]);

  const actionsByCategory = useMemo(() => {
    return actions.reduce((acc, action) => {
      const cat = action.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(action);
      return acc;
    }, {} as Record<string, LifecycleAction[]>);
  }, [actions]);

  return {
    actions,
    allActions,
    isLoading,
    error,
    refetch,
    startAction,
    completeAction,
    dismissAction,
    isStarting: startActionMutation.isPending,
    isCompleting: completeActionMutation.isPending,
    isDismissing: dismissActionMutation.isPending,
    getActionsByUrgency,
    criticalActions,
    highPriorityActions,
    totalImpact,
    actionsByCategory,
    hasActions: actions.length > 0,
    hasCriticalActions: criticalActions.length > 0,
    actionCount: actions.length,
    criticalCount: criticalActions.length,
  };
}

// Hook for single action details
export function useLifecycleAction(actionId: string) {
  const queryClient = useQueryClient();

  const { data: action, isLoading, error } = useQuery<LifecycleAction & {
    steps?: Array<{ id: string; label: string; completed: boolean }>;
    relatedDocuments?: Array<{ id: string; name: string; url: string }>;
  }>({
    queryKey: ['lifecycle-action', actionId],
    queryFn: async () => {
      const response = await fetch(`/api/v2/lifecycle/actions/${actionId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch action details');
      return response.json();
    },
    enabled: !!actionId,
  });

  const completeStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const response = await fetch(
        `/api/v2/lifecycle/actions/${actionId}/steps/${stepId}/complete`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to complete step');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-action', actionId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    action,
    isLoading,
    error,
    completeStep: completeStepMutation.mutateAsync,
    isCompletingStep: completeStepMutation.isPending,
  };
}
