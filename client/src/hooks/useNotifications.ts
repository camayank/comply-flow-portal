/**
 * Notifications Hooks
 *
 * React Query hooks for notification management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================
// TYPES
// ============================================
export interface Notification {
  id: number;
  type: string;
  channel: string;
  status: string;
  subject: string | null;
  content: string | null;
  payload: Record<string, any> | null;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPreferences {
  id: number;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  inAppEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string;
  categories: {
    serviceUpdates: boolean;
    complianceReminders: boolean;
    paymentAlerts: boolean;
    marketing: boolean;
    systemAlerts: boolean;
  };
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly';
}

// ============================================
// API FUNCTIONS
// ============================================
async function fetchNotifications(params: { limit?: number; offset?: number; unreadOnly?: boolean }) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  if (params.unreadOnly) searchParams.set('unreadOnly', 'true');

  const response = await fetch(`/api/notifications?${searchParams}`, {
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
}

async function fetchUnreadCount() {
  const response = await fetch('/api/notifications/unread-count', {
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to fetch unread count');
  return response.json();
}

async function markAsRead(notificationId: number) {
  const response = await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to mark as read');
  return response.json();
}

async function markAllAsRead() {
  const response = await fetch('/api/notifications/mark-all-read', {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to mark all as read');
  return response.json();
}

async function archiveNotification(notificationId: number) {
  const response = await fetch(`/api/notifications/${notificationId}/archive`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to archive notification');
  return response.json();
}

async function fetchPreferences(): Promise<NotificationPreferences> {
  const response = await fetch('/api/notifications/preferences', {
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to fetch preferences');
  return response.json();
}

async function updatePreferences(prefs: Partial<NotificationPreferences>) {
  const response = await fetch('/api/notifications/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(prefs),
  });

  if (!response.ok) throw new Error('Failed to update preferences');
  return response.json();
}

async function registerPushToken(data: { token: string; platform: string; deviceId?: string; deviceName?: string }) {
  const response = await fetch('/api/notifications/push-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to register push token');
  return response.json();
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook for fetching notifications
 */
export function useNotifications(params: { limit?: number; offset?: number; unreadOnly?: boolean } = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => fetchNotifications(params),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook for unread notification count
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook for marking notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Hook for marking all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Hook for archiving notification
 */
export function useArchiveNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Hook for notification preferences
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchPreferences,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for updating notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

/**
 * Hook for registering push token
 */
export function useRegisterPushToken() {
  return useMutation({
    mutationFn: registerPushToken,
  });
}
