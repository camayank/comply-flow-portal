import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import type { AlertSeverity } from '../components/ComplianceAlertCard';

export interface ComplianceAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description?: string;
  dueDate?: string;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
  category?: string;
  itemId?: string;
  actionUrl?: string;
}

interface UseComplianceAlertsOptions {
  clientId?: string;
  includeRead?: boolean;
  includeDismissed?: boolean;
  severity?: AlertSeverity[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const QUERY_KEY = 'compliance-alerts';

export function useComplianceAlerts(options: UseComplianceAlertsOptions = {}) {
  const {
    clientId,
    includeRead = false,
    includeDismissed = false,
    severity,
    autoRefresh = true,
    refreshInterval = 60000,
  } = options;

  const queryClient = useQueryClient();
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set());

  const queryKey = useMemo(
    () => [QUERY_KEY, { clientId, includeRead, includeDismissed, severity }],
    [clientId, includeRead, includeDismissed, severity]
  );

  const {
    data: allAlerts = [],
    isLoading,
    error,
    refetch,
  } = useQuery<ComplianceAlert[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.append('clientId', clientId);
      if (includeRead) params.append('includeRead', 'true');
      if (includeDismissed) params.append('includeDismissed', 'true');
      if (severity?.length) params.append('severity', severity.join(','));

      const response = await fetch(`/api/compliance/alerts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch compliance alerts');
      return response.json();
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Filter out locally dismissed alerts for immediate UI feedback
  const alerts = useMemo(() => {
    return allAlerts.filter((alert) => !localDismissed.has(alert.id));
  }, [allAlerts, localDismissed]);

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/compliance/alerts/${alertId}/dismiss`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to dismiss alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/compliance/alerts/${alertId}/read`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to mark alert as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/compliance/alerts/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      if (!response.ok) throw new Error('Failed to mark all alerts as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const dismiss = useCallback(
    (alertId: string) => {
      // Optimistic update
      setLocalDismissed((prev) => new Set(prev).add(alertId));
      return dismissMutation.mutateAsync(alertId);
    },
    [dismissMutation]
  );

  const markAsRead = useCallback(
    (alertId: string) => {
      return markReadMutation.mutateAsync(alertId);
    },
    [markReadMutation]
  );

  const markAllAsRead = useCallback(() => {
    return markAllReadMutation.mutateAsync();
  }, [markAllReadMutation]);

  const getAlertsBySeverity = useCallback(
    (sev: AlertSeverity) => {
      return alerts.filter((alert) => alert.severity === sev);
    },
    [alerts]
  );

  const getUnreadCount = useMemo(() => {
    return alerts.filter((alert) => !alert.isRead).length;
  }, [alerts]);

  const getCriticalCount = useMemo(() => {
    return alerts.filter((alert) => alert.severity === 'critical').length;
  }, [alerts]);

  const sortedAlerts = useMemo(() => {
    const severityOrder: Record<AlertSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
      success: 3,
    };

    return [...alerts].sort((a, b) => {
      // First by severity
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;

      // Then by unread status
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;

      // Then by date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [alerts]);

  return {
    alerts: sortedAlerts,
    allAlerts,
    isLoading,
    error,
    refetch,
    dismiss,
    markAsRead,
    markAllAsRead,
    isDismissing: dismissMutation.isPending,
    isMarkingRead: markReadMutation.isPending,
    getAlertsBySeverity,
    unreadCount: getUnreadCount,
    criticalCount: getCriticalCount,
    hasAlerts: alerts.length > 0,
    hasCriticalAlerts: getCriticalCount > 0,
  };
}

// Hook for compliance deadline reminders
export function useComplianceReminders(daysAhead: number = 7) {
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading, error } = useQuery<ComplianceAlert[]>({
    queryKey: ['compliance-reminders', daysAhead],
    queryFn: async () => {
      const response = await fetch(
        `/api/compliance/reminders?daysAhead=${daysAhead}`
      );
      if (!response.ok) throw new Error('Failed to fetch reminders');
      return response.json();
    },
  });

  const snoozeReminder = useMutation({
    mutationFn: async ({
      alertId,
      snoozeDays,
    }: {
      alertId: string;
      snoozeDays: number;
    }) => {
      const response = await fetch(`/api/compliance/alerts/${alertId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snoozeDays }),
      });
      if (!response.ok) throw new Error('Failed to snooze reminder');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-reminders'] });
    },
  });

  return {
    reminders,
    isLoading,
    error,
    snooze: snoozeReminder.mutateAsync,
    isSnoozeing: snoozeReminder.isPending,
  };
}
