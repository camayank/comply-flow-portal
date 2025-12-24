/**
 * OPERATIONS SOCKET HOOK
 * File: client/src/hooks/useOperationsSocket.ts
 *
 * React hook for real-time operations panel updates
 * Handles task sync, SLA alerts, and team notifications
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { toast } from '@/hooks/use-toast';

// Types
interface TaskData {
  id: number;
  taskNumber: string;
  title: string;
  status: string;
  priority: string;
  progress: number;
  dueDate?: string;
  assigneeId?: number;
  assigneeName?: string;
  slaStatus?: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
}

interface SlaAlert {
  type: 'SLA_AT_RISK' | 'SLA_BREACHED' | 'SLA_RECOVERED';
  task: TaskData;
  timeRemaining?: number;
  message: string;
  timestamp: Date;
}

interface TaskAssignedPayload {
  task: TaskData;
  assignedBy: string;
  message: string;
}

interface UserPresence {
  userId: number;
  name: string;
  status: 'online' | 'away' | 'busy';
  lastActivity: Date;
}

interface UseOperationsSocketReturn {
  isConnected: boolean;
  connectionError: string | null;
  onlineUsers: UserPresence[];
  updateTask: (taskId: number, data: Partial<TaskData>) => Promise<TaskData>;
  assignTask: (taskId: number, assigneeId: number) => Promise<TaskData>;
  addComment: (taskId: number, comment: string) => Promise<void>;
  subscribeToTask: (taskId: number) => void;
  unsubscribeFromTask: (taskId: number) => void;
  setPresence: (status: 'online' | 'away' | 'busy') => void;
  refreshTasks: (filters?: Record<string, any>) => Promise<TaskData[]>;
}

// Singleton socket instance
let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Hook for real-time operations socket connection
 */
export function useOperationsSocket(): UseOperationsSocketReturn {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const subscribedTasks = useRef<Set<number>>(new Set());

  // Check if user has access to operations socket
  const hasAccess = user && ['ops_executive', 'admin', 'super_admin', 'customer_service'].includes(
    user.role?.toLowerCase() || ''
  );

  useEffect(() => {
    if (!hasAccess) {
      return;
    }

    // Get token from localStorage or auth context
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!token) {
      setConnectionError('No authentication token');
      return;
    }

    // Create socket connection if not exists
    if (!socket || socket.disconnected) {
      socket = io('/operations', {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        transports: ['websocket', 'polling']
      });

      // Connection handlers
      socket.on('connect', () => {
        console.log('✅ Operations socket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts = 0;

        // Resubscribe to previously subscribed tasks
        subscribedTasks.current.forEach(taskId => {
          socket?.emit('task:subscribe', taskId);
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Operations socket disconnected:', reason);
        setIsConnected(false);

        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          socket?.connect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        setConnectionError(error.message);
        reconnectAttempts++;

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          toast({
            title: 'Connection Lost',
            description: 'Unable to connect to real-time updates. Please refresh the page.',
            variant: 'destructive'
          });
        }
      });

      // Task event handlers
      socket.on('task:updated', (payload: { task: TaskData }) => {
        // Update task in cache
        queryClient.setQueryData(['tasks'], (old: TaskData[] | undefined) => {
          if (!old) return old;
          return old.map(t => t.id === payload.task.id ? { ...t, ...payload.task } : t);
        });

        // Also invalidate specific task query
        queryClient.invalidateQueries({ queryKey: ['task', payload.task.id] });
      });

      socket.on('task:assigned', (payload: TaskAssignedPayload) => {
        toast({
          title: 'New Task Assigned',
          description: payload.message
        });

        // Invalidate tasks list to show new assignment
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      });

      socket.on('task:reassigned', (payload: { task: TaskData; reassignedBy: string; newAssignee: string }) => {
        toast({
          title: 'Task Reassigned',
          description: `Task "${payload.task.title}" has been reassigned to ${payload.newAssignee}`
        });

        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      });

      socket.on('task:comment:added', (payload: { taskId: number; userName: string; comment: string }) => {
        // Invalidate task comments query
        queryClient.invalidateQueries({ queryKey: ['task-comments', payload.taskId] });
      });

      // SLA event handlers
      socket.on('sla:warning', (alert: SlaAlert) => {
        toast({
          title: '⚠️ SLA Warning',
          description: alert.message,
          variant: 'destructive'
        });

        // Update task SLA status in cache
        queryClient.setQueryData(['tasks'], (old: TaskData[] | undefined) => {
          if (!old) return old;
          return old.map(t => t.id === alert.task.id ? { ...t, slaStatus: 'AT_RISK' } : t);
        });
      });

      socket.on('sla:alert', (alert: SlaAlert) => {
        toast({
          title: '🚨 SLA BREACHED',
          description: alert.message,
          variant: 'destructive'
        });

        queryClient.setQueryData(['tasks'], (old: TaskData[] | undefined) => {
          if (!old) return old;
          return old.map(t => t.id === alert.task.id ? { ...t, slaStatus: 'BREACHED' } : t);
        });

        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      });

      // Presence handlers
      socket.on('user:online', (payload: { userId: number; name: string }) => {
        setOnlineUsers(prev => {
          if (prev.some(u => u.userId === payload.userId)) return prev;
          return [...prev, {
            userId: payload.userId,
            name: payload.name,
            status: 'online',
            lastActivity: new Date()
          }];
        });
      });

      socket.on('user:offline', (payload: { userId: number }) => {
        setOnlineUsers(prev => prev.filter(u => u.userId !== payload.userId));
      });

      socket.on('user:presence', (users: UserPresence[]) => {
        setOnlineUsers(users);
      });

      // System events
      socket.on('system:maintenance', (data: { message: string }) => {
        toast({
          title: 'System Maintenance',
          description: data.message
        });
      });

      socket.on('notification', (notification: { title: string; message: string; type: string }) => {
        toast({
          title: notification.title,
          description: notification.message
        });
      });
    }

    // Cleanup on unmount or auth change
    return () => {
      // Don't disconnect - maintain connection for other components
    };
  }, [hasAccess, queryClient]);

  // Update task
  const updateTask = useCallback((taskId: number, data: Partial<TaskData>): Promise<TaskData> => {
    return new Promise((resolve, reject) => {
      if (!socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('task:update', { taskId, ...data }, (result: { success: boolean; data?: TaskData; error?: string }) => {
        if (result.success && result.data) {
          resolve(result.data);
        } else {
          reject(new Error(result.error || 'Failed to update task'));
        }
      });
    });
  }, []);

  // Assign task
  const assignTask = useCallback((taskId: number, assigneeId: number): Promise<TaskData> => {
    return new Promise((resolve, reject) => {
      if (!socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('task:assign', { taskId, assigneeId }, (result: { success: boolean; data?: TaskData; error?: string }) => {
        if (result.success && result.data) {
          resolve(result.data);
        } else {
          reject(new Error(result.error || 'Failed to assign task'));
        }
      });
    });
  }, []);

  // Add comment
  const addComment = useCallback((taskId: number, comment: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('task:comment', { taskId, comment }, (result: { success: boolean; error?: string }) => {
        if (result.success) {
          resolve();
        } else {
          reject(new Error(result.error || 'Failed to add comment'));
        }
      });
    });
  }, []);

  // Subscribe to task updates
  const subscribeToTask = useCallback((taskId: number) => {
    if (socket?.connected) {
      socket.emit('task:subscribe', taskId);
      subscribedTasks.current.add(taskId);
    }
  }, []);

  // Unsubscribe from task
  const unsubscribeFromTask = useCallback((taskId: number) => {
    if (socket?.connected) {
      socket.emit('task:unsubscribe', taskId);
      subscribedTasks.current.delete(taskId);
    }
  }, []);

  // Set presence status
  const setPresence = useCallback((status: 'online' | 'away' | 'busy') => {
    if (socket?.connected) {
      socket.emit('presence:update', status);
    }
  }, []);

  // Refresh tasks
  const refreshTasks = useCallback((filters?: Record<string, any>): Promise<TaskData[]> => {
    return new Promise((resolve, reject) => {
      if (!socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('tasks:refresh', filters || {}, (result: { success: boolean; data?: TaskData[]; error?: string }) => {
        if (result.success && result.data) {
          // Update cache
          queryClient.setQueryData(['tasks'], result.data);
          resolve(result.data);
        } else {
          reject(new Error(result.error || 'Failed to refresh tasks'));
        }
      });
    });
  }, [queryClient]);

  return {
    isConnected,
    connectionError,
    onlineUsers,
    updateTask,
    assignTask,
    addComment,
    subscribeToTask,
    unsubscribeFromTask,
    setPresence,
    refreshTasks
  };
}

/**
 * Hook for client portal notifications socket
 */
export function useClientSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || user.role?.toLowerCase() !== 'client') {
      return;
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    const clientSocket = io('/client', {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5
    });

    clientSocket.on('connect', () => {
      setIsConnected(true);
    });

    clientSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    clientSocket.on('notification', (notification: { title: string; message: string; type: string; actionUrl?: string }) => {
      toast({
        title: notification.title,
        description: notification.message
      });

      // Invalidate relevant queries based on notification type
      if (notification.type === 'SERVICE_UPDATE') {
        queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      } else if (notification.type === 'PAYMENT_RECEIVED') {
        queryClient.invalidateQueries({ queryKey: ['payments'] });
      } else if (notification.type === 'COMPLIANCE_REMINDER') {
        queryClient.invalidateQueries({ queryKey: ['compliance'] });
      }
    });

    clientSocket.on('service:updated', (data: { serviceRequestId: number; status: string }) => {
      queryClient.invalidateQueries({ queryKey: ['service-request', data.serviceRequestId] });
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
    });

    return () => {
      clientSocket.disconnect();
    };
  }, [user, queryClient]);

  return { isConnected };
}

export default useOperationsSocket;
