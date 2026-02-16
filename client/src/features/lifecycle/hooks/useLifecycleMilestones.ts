import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import type { Milestone, MilestoneStatus } from '../components/LifecycleMilestoneCard';
import type { LifecycleStage } from '../components/LifecycleStageIndicator';

interface UseLifecycleMilestonesOptions {
  companyId?: string;
  stage?: LifecycleStage;
  status?: MilestoneStatus[];
  limit?: number;
}

const QUERY_KEY = 'lifecycle-milestones';

export function useLifecycleMilestones(options: UseLifecycleMilestonesOptions = {}) {
  const { companyId, stage, status, limit } = options;
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => [QUERY_KEY, { companyId, stage, status, limit }],
    [companyId, stage, status, limit]
  );

  const {
    data: milestones = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Milestone[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (stage) params.append('stage', stage);
      if (status?.length) params.append('status', status.join(','));
      if (limit) params.append('limit', limit.toString());

      const response = await fetch(`/api/v2/lifecycle/milestones?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch milestones');
      return response.json();
    },
  });

  const completeMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      const response = await fetch(
        `/api/v2/lifecycle/milestones/${milestoneId}/complete`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to complete milestone');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({
      milestoneId,
      updates,
    }: {
      milestoneId: string;
      updates: Partial<Milestone>;
    }) => {
      const response = await fetch(
        `/api/v2/lifecycle/milestones/${milestoneId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to update milestone');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const completeMilestone = useCallback(
    (milestoneId: string) => {
      return completeMilestoneMutation.mutateAsync(milestoneId);
    },
    [completeMilestoneMutation]
  );

  const updateMilestone = useCallback(
    (milestoneId: string, updates: Partial<Milestone>) => {
      return updateMilestoneMutation.mutateAsync({ milestoneId, updates });
    },
    [updateMilestoneMutation]
  );

  const getMilestonesByStatus = useCallback(
    (s: MilestoneStatus) => {
      return milestones.filter((m) => m.status === s);
    },
    [milestones]
  );

  const inProgressMilestones = useMemo(() => {
    return milestones.filter((m) => m.status === 'in_progress');
  }, [milestones]);

  const upcomingMilestones = useMemo(() => {
    return milestones.filter((m) => m.status === 'upcoming');
  }, [milestones]);

  const completedMilestones = useMemo(() => {
    return milestones.filter((m) => m.status === 'completed');
  }, [milestones]);

  const blockedMilestones = useMemo(() => {
    return milestones.filter((m) => m.status === 'blocked');
  }, [milestones]);

  const totalImpact = useMemo(() => {
    return milestones
      .filter((m) => m.status !== 'completed')
      .reduce((sum, m) => sum + (m.impact || 0), 0);
  }, [milestones]);

  const completionRate = useMemo(() => {
    if (milestones.length === 0) return 0;
    return Math.round(
      (completedMilestones.length / milestones.length) * 100
    );
  }, [milestones, completedMilestones]);

  return {
    milestones,
    isLoading,
    error,
    refetch,
    completeMilestone,
    updateMilestone,
    isCompleting: completeMilestoneMutation.isPending,
    isUpdating: updateMilestoneMutation.isPending,
    getMilestonesByStatus,
    inProgressMilestones,
    upcomingMilestones,
    completedMilestones,
    blockedMilestones,
    totalImpact,
    completionRate,
    hasBlockedMilestones: blockedMilestones.length > 0,
  };
}

// Hook for milestone timeline view
export function useLifecycleTimeline(companyId?: string) {
  const { data: timeline, isLoading, error } = useQuery<{
    companyAge: string;
    stages: Array<{
      stage: LifecycleStage;
      completed: boolean;
      current: boolean;
      dateEntered?: string;
      achievements?: string[];
    }>;
    upcomingMilestones: Milestone[];
    recentActivity: Array<{
      id: string;
      type: string;
      title: string;
      description?: string;
      timestamp: string;
    }>;
  }>({
    queryKey: ['lifecycle-timeline', companyId],
    queryFn: async () => {
      const url = companyId
        ? `/api/v2/lifecycle/timeline?companyId=${companyId}`
        : '/api/v2/lifecycle/timeline';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch timeline');
      return response.json();
    },
  });

  const currentStageIndex = useMemo(() => {
    if (!timeline?.stages) return -1;
    return timeline.stages.findIndex((s) => s.current);
  }, [timeline]);

  const completedStagesCount = useMemo(() => {
    if (!timeline?.stages) return 0;
    return timeline.stages.filter((s) => s.completed).length;
  }, [timeline]);

  return {
    timeline,
    isLoading,
    error,
    companyAge: timeline?.companyAge,
    stages: timeline?.stages || [],
    upcomingMilestones: timeline?.upcomingMilestones || [],
    recentActivity: timeline?.recentActivity || [],
    currentStageIndex,
    completedStagesCount,
    totalStages: timeline?.stages?.length || 0,
  };
}
