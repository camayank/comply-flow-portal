import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import type { LifecycleStage } from '../components/LifecycleStageIndicator';

export interface StageTransition {
  fromStage: LifecycleStage;
  toStage: LifecycleStage;
  readiness: number;
  requirements: Array<{
    id: string;
    label: string;
    completed: boolean;
    impact: number;
  }>;
  estimatedTime?: string;
  blockers?: string[];
}

export interface CompanyLifecycle {
  id: string;
  companyName: string;
  currentStage: LifecycleStage;
  stageEnteredAt: string;
  companyAge: string;
  transition?: StageTransition;
  completedStages: LifecycleStage[];
  stageHistory: Array<{
    stage: LifecycleStage;
    enteredAt: string;
    exitedAt?: string;
    achievements?: string[];
  }>;
}

interface UseLifecycleStageOptions {
  companyId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const QUERY_KEY = 'lifecycle-stage';

export function useLifecycleStage(options: UseLifecycleStageOptions = {}) {
  const { companyId, autoRefresh = false, refreshInterval = 60000 } = options;
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => [QUERY_KEY, companyId], [companyId]);

  const {
    data: lifecycle,
    isLoading,
    error,
    refetch,
  } = useQuery<CompanyLifecycle>({
    queryKey,
    queryFn: async () => {
      const url = companyId
        ? `/api/v2/lifecycle/stage?companyId=${companyId}`
        : '/api/v2/lifecycle/stage';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch lifecycle stage');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const advanceStageMutation = useMutation({
    mutationFn: async (targetStage: LifecycleStage) => {
      const response = await fetch('/api/v2/lifecycle/advance-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStage, companyId }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to advance stage');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const completeRequirementMutation = useMutation({
    mutationFn: async (requirementId: string) => {
      const response = await fetch(
        `/api/v2/lifecycle/requirements/${requirementId}/complete`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to complete requirement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const canAdvanceStage = useMemo(() => {
    if (!lifecycle?.transition) return false;
    return lifecycle.transition.readiness >= 100;
  }, [lifecycle]);

  const pendingRequirements = useMemo(() => {
    if (!lifecycle?.transition) return [];
    return lifecycle.transition.requirements.filter((r) => !r.completed);
  }, [lifecycle]);

  const completedRequirements = useMemo(() => {
    if (!lifecycle?.transition) return [];
    return lifecycle.transition.requirements.filter((r) => r.completed);
  }, [lifecycle]);

  const potentialImpact = useMemo(() => {
    return pendingRequirements.reduce((sum, r) => sum + r.impact, 0);
  }, [pendingRequirements]);

  const advanceStage = useCallback(
    (targetStage: LifecycleStage) => {
      return advanceStageMutation.mutateAsync(targetStage);
    },
    [advanceStageMutation]
  );

  const completeRequirement = useCallback(
    (requirementId: string) => {
      return completeRequirementMutation.mutateAsync(requirementId);
    },
    [completeRequirementMutation]
  );

  return {
    lifecycle,
    currentStage: lifecycle?.currentStage,
    transition: lifecycle?.transition,
    completedStages: lifecycle?.completedStages || [],
    stageHistory: lifecycle?.stageHistory || [],
    isLoading,
    error,
    refetch,
    advanceStage,
    completeRequirement,
    isAdvancing: advanceStageMutation.isPending,
    isCompleting: completeRequirementMutation.isPending,
    canAdvanceStage,
    pendingRequirements,
    completedRequirements,
    potentialImpact,
  };
}

// Hook for stage transition details
export function useStageTransition(targetStage: LifecycleStage) {
  const { data: transition, isLoading, error } = useQuery<StageTransition>({
    queryKey: ['lifecycle-transition', targetStage],
    queryFn: async () => {
      const response = await fetch(
        `/api/v2/lifecycle/transition/${targetStage}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch transition details');
      return response.json();
    },
  });

  return {
    transition,
    isLoading,
    error,
    requirementsCount: transition?.requirements.length || 0,
    completedCount: transition?.requirements.filter((r) => r.completed).length || 0,
    readiness: transition?.readiness || 0,
  };
}
