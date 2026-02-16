import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { LifecycleStage } from '../components/LifecycleStageIndicator';
import type { ComplianceType, ComplianceHealth, FundingRound, Achievement } from '../config';
import { getComplianceHealth, getStageProgress } from '../config';

// ============================================================================
// Types
// ============================================================================

export interface LifecycleMetrics {
  companyId: string;
  companyName: string;
  incorporationDate: string;
  currentStage: LifecycleStage;
  stageEnteredAt: string;
  companyAge: string;
  complianceScore: number;
  complianceHealth: ComplianceHealth;
  fundingReadiness: number;
  currentFundingRound: FundingRound;
  targetFundingRound?: FundingRound;
  stageProgress: number;
  pendingActions: number;
  criticalActions: number;
  completedMilestones: number;
  totalMilestones: number;
  achievementPoints: number;
  achievementsUnlocked: number;
  totalAchievements: number;
  trend: {
    complianceScore: { value: number; direction: 'up' | 'down' | 'stable' };
    stageProgress: { value: number; direction: 'up' | 'down' | 'stable' };
    fundingReadiness: { value: number; direction: 'up' | 'down' | 'stable' };
  };
}

export interface ComplianceOverview {
  score: number;
  health: ComplianceHealth;
  trend: {
    value: number;
    direction: 'up' | 'down' | 'stable';
    period: string;
  };
  byType: Array<{
    type: ComplianceType;
    score: number;
    completed: number;
    pending: number;
    overdue: number;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    type: ComplianceType;
    dueDate: string;
    daysRemaining: number;
  }>;
  overdueItems: Array<{
    id: string;
    title: string;
    type: ComplianceType;
    dueDate: string;
    daysOverdue: number;
  }>;
  recentlyCompleted: Array<{
    id: string;
    title: string;
    type: ComplianceType;
    completedAt: string;
    impact: number;
  }>;
}

export interface FundingOverview {
  currentRound: FundingRound;
  targetRound: FundingRound;
  readiness: number;
  totalRaised: number;
  currentValuation?: number;
  requirements: Array<{
    id: string;
    label: string;
    completed: boolean;
    category: string;
  }>;
  history: Array<{
    round: FundingRound;
    amount: number;
    valuation?: number;
    date: string;
    investors: string[];
  }>;
}

export interface AchievementOverview {
  totalPoints: number;
  unlockedCount: number;
  totalCount: number;
  recentAchievements: Achievement[];
  nextAchievements: Achievement[];
  byType: Record<string, { unlocked: number; total: number }>;
}

// ============================================================================
// Query Keys
// ============================================================================

export const lifecycleMetricsKeys = {
  all: ['lifecycle-metrics'] as const,
  metrics: (companyId?: string) => [...lifecycleMetricsKeys.all, 'overview', companyId] as const,
  compliance: (companyId?: string) => [...lifecycleMetricsKeys.all, 'compliance', companyId] as const,
  funding: (companyId?: string) => [...lifecycleMetricsKeys.all, 'funding', companyId] as const,
  achievements: (companyId?: string) => [...lifecycleMetricsKeys.all, 'achievements', companyId] as const,
  timeline: (companyId?: string) => [...lifecycleMetricsKeys.all, 'timeline', companyId] as const,
};

// ============================================================================
// useLifecycleMetrics Hook
// ============================================================================

interface UseLifecycleMetricsOptions {
  companyId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useLifecycleMetrics(options: UseLifecycleMetricsOptions = {}) {
  const { companyId, autoRefresh = true, refreshInterval = 60000 } = options;

  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useQuery<LifecycleMetrics>({
    queryKey: lifecycleMetricsKeys.metrics(companyId),
    queryFn: async () => {
      const url = companyId
        ? `/api/v2/lifecycle/metrics?companyId=${companyId}`
        : '/api/v2/lifecycle/metrics';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch lifecycle metrics');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  const healthStatus = useMemo(() => {
    if (!metrics) return null;
    return getComplianceHealth(metrics.complianceScore);
  }, [metrics]);

  const stageProgressPercent = useMemo(() => {
    if (!metrics) return 0;
    return getStageProgress(metrics.currentStage);
  }, [metrics]);

  const hasUrgentItems = useMemo(() => {
    return (metrics?.criticalActions ?? 0) > 0;
  }, [metrics]);

  return {
    metrics,
    isLoading,
    error,
    refetch,
    healthStatus,
    stageProgressPercent,
    hasUrgentItems,
    complianceScore: metrics?.complianceScore ?? 0,
    currentStage: metrics?.currentStage,
    pendingActions: metrics?.pendingActions ?? 0,
    criticalActions: metrics?.criticalActions ?? 0,
  };
}

// ============================================================================
// useComplianceHealth Hook
// ============================================================================

interface UseComplianceHealthOptions {
  companyId?: string;
  autoRefresh?: boolean;
}

export function useComplianceHealth(options: UseComplianceHealthOptions = {}) {
  const { companyId, autoRefresh = true } = options;
  const queryClient = useQueryClient();

  const {
    data: compliance,
    isLoading,
    error,
    refetch,
  } = useQuery<ComplianceOverview>({
    queryKey: lifecycleMetricsKeys.compliance(companyId),
    queryFn: async () => {
      const url = companyId
        ? `/api/v2/lifecycle/compliance?companyId=${companyId}`
        : '/api/v2/lifecycle/compliance';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch compliance overview');
      return response.json();
    },
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const completeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/v2/lifecycle/compliance/${itemId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to complete compliance item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleMetricsKeys.compliance(companyId) });
      queryClient.invalidateQueries({ queryKey: lifecycleMetricsKeys.metrics(companyId) });
    },
  });

  const healthStatus = useMemo(() => {
    if (!compliance) return 'RED' as ComplianceHealth;
    return compliance.health;
  }, [compliance]);

  const hasOverdueItems = useMemo(() => {
    return (compliance?.overdueItems?.length ?? 0) > 0;
  }, [compliance]);

  const upcomingDeadlinesCount = useMemo(() => {
    return compliance?.upcomingDeadlines?.length ?? 0;
  }, [compliance]);

  const getComplianceByType = useMemo(() => {
    if (!compliance) return {};
    return compliance.byType.reduce((acc, item) => {
      acc[item.type] = item;
      return acc;
    }, {} as Record<ComplianceType, typeof compliance.byType[0]>);
  }, [compliance]);

  return {
    compliance,
    isLoading,
    error,
    refetch,
    completeItem: completeItemMutation.mutateAsync,
    isCompleting: completeItemMutation.isPending,
    healthStatus,
    hasOverdueItems,
    upcomingDeadlinesCount,
    getComplianceByType,
    score: compliance?.score ?? 0,
    overdueItems: compliance?.overdueItems ?? [],
    upcomingDeadlines: compliance?.upcomingDeadlines ?? [],
  };
}

// ============================================================================
// useFundingOverview Hook
// ============================================================================

interface UseFundingOverviewOptions {
  companyId?: string;
}

export function useFundingOverview(options: UseFundingOverviewOptions = {}) {
  const { companyId } = options;
  const queryClient = useQueryClient();

  const {
    data: funding,
    isLoading,
    error,
    refetch,
  } = useQuery<FundingOverview>({
    queryKey: lifecycleMetricsKeys.funding(companyId),
    queryFn: async () => {
      const url = companyId
        ? `/api/v2/lifecycle/funding?companyId=${companyId}`
        : '/api/v2/lifecycle/funding';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch funding overview');
      return response.json();
    },
  });

  const completeRequirementMutation = useMutation({
    mutationFn: async (requirementId: string) => {
      const response = await fetch(
        `/api/v2/lifecycle/funding/requirements/${requirementId}/complete`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to complete requirement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleMetricsKeys.funding(companyId) });
      queryClient.invalidateQueries({ queryKey: lifecycleMetricsKeys.metrics(companyId) });
    },
  });

  const completedRequirementsCount = useMemo(() => {
    return funding?.requirements.filter((r) => r.completed).length ?? 0;
  }, [funding]);

  const pendingRequirementsCount = useMemo(() => {
    return funding?.requirements.filter((r) => !r.completed).length ?? 0;
  }, [funding]);

  const isReadyForFunding = useMemo(() => {
    return (funding?.readiness ?? 0) >= 80;
  }, [funding]);

  return {
    funding,
    isLoading,
    error,
    refetch,
    completeRequirement: completeRequirementMutation.mutateAsync,
    isCompleting: completeRequirementMutation.isPending,
    completedRequirementsCount,
    pendingRequirementsCount,
    isReadyForFunding,
    readiness: funding?.readiness ?? 0,
    currentRound: funding?.currentRound,
    targetRound: funding?.targetRound,
    totalRaised: funding?.totalRaised ?? 0,
  };
}

// ============================================================================
// useAchievements Hook
// ============================================================================

interface UseAchievementsOptions {
  companyId?: string;
}

export function useAchievements(options: UseAchievementsOptions = {}) {
  const { companyId } = options;
  const queryClient = useQueryClient();

  const {
    data: achievements,
    isLoading,
    error,
    refetch,
  } = useQuery<AchievementOverview>({
    queryKey: lifecycleMetricsKeys.achievements(companyId),
    queryFn: async () => {
      const url = companyId
        ? `/api/v2/lifecycle/achievements?companyId=${companyId}`
        : '/api/v2/lifecycle/achievements';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch achievements');
      return response.json();
    },
  });

  const claimAchievementMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      const response = await fetch(
        `/api/v2/lifecycle/achievements/${achievementId}/claim`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to claim achievement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifecycleMetricsKeys.achievements(companyId) });
      queryClient.invalidateQueries({ queryKey: lifecycleMetricsKeys.metrics(companyId) });
    },
  });

  const completionPercentage = useMemo(() => {
    if (!achievements || achievements.totalCount === 0) return 0;
    return Math.round((achievements.unlockedCount / achievements.totalCount) * 100);
  }, [achievements]);

  return {
    achievements,
    isLoading,
    error,
    refetch,
    claimAchievement: claimAchievementMutation.mutateAsync,
    isClaiming: claimAchievementMutation.isPending,
    completionPercentage,
    totalPoints: achievements?.totalPoints ?? 0,
    unlockedCount: achievements?.unlockedCount ?? 0,
    recentAchievements: achievements?.recentAchievements ?? [],
    nextAchievements: achievements?.nextAchievements ?? [],
  };
}

// ============================================================================
// useLifecycleEvents Hook (Timeline)
// ============================================================================

export interface LifecycleEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  stage?: LifecycleStage;
  impact?: number;
  metadata?: Record<string, unknown>;
}

interface UseLifecycleEventsOptions {
  companyId?: string;
  limit?: number;
  eventTypes?: string[];
}

export function useLifecycleEvents(options: UseLifecycleEventsOptions = {}) {
  const { companyId, limit, eventTypes } = options;

  const {
    data: events = [],
    isLoading,
    error,
    refetch,
  } = useQuery<LifecycleEvent[]>({
    queryKey: [...lifecycleMetricsKeys.timeline(companyId), { limit, eventTypes }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (limit) params.append('limit', limit.toString());
      if (eventTypes?.length) params.append('types', eventTypes.join(','));

      const response = await fetch(`/api/v2/lifecycle/events?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch lifecycle events');
      return response.json();
    },
  });

  const eventsByDate = useMemo(() => {
    return events.reduce((acc, event) => {
      const date = new Date(event.timestamp).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {} as Record<string, LifecycleEvent[]>);
  }, [events]);

  const recentEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [events]);

  return {
    events,
    isLoading,
    error,
    refetch,
    eventsByDate,
    recentEvents,
    eventCount: events.length,
  };
}
