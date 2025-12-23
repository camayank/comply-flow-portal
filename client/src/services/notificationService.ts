import apiClient from './api';

export const notificationService = {
  // Get notifications
  getNotifications: async (filters?: any) => {
    const response = await apiClient.get('/notifications', { params: filters });
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (id: string) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  },

  // Delete notification
  deleteNotification: async (id: string) => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },

  // Get notification preferences
  getPreferences: async () => {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  },

  // Update notification preferences
  updatePreferences: async (preferences: any) => {
    const response = await apiClient.put('/notifications/preferences', preferences);
    return response.data;
  },

  // Subscribe to push notifications
  subscribeToPush: async (subscription: any) => {
    const response = await apiClient.post('/notifications/push/subscribe', subscription);
    return response.data;
  },

  // Unsubscribe from push notifications
  unsubscribeFromPush: async () => {
    const response = await apiClient.post('/notifications/push/unsubscribe');
    return response.data;
  },
};
