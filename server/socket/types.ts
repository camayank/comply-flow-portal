/**
 * SOCKET.IO TYPE DEFINITIONS
 * File: server/socket/types.ts
 *
 * Shared types for Socket.IO implementation
 */

import { Socket } from 'socket.io';

// ============ USER TYPES ============

export interface SocketUser {
  id: number;
  role: string;
  name: string;
  email?: string;
  teamId?: number;
  department?: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

// ============ TASK TYPES ============

export interface TaskUpdateData {
  taskId: number;
  status?: string;
  progress?: number;
  notes?: string;
  assigneeId?: number;
  priority?: string;
}

export interface TaskAssignmentData {
  taskId: number;
  assigneeId: number;
  notes?: string;
}

export interface TaskCommentData {
  taskId: number;
  comment: string;
  mentions?: number[]; // User IDs mentioned
}

export interface TaskData {
  id: number;
  taskNumber: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  progress: number;
  dueDate?: Date;
  assigneeId?: number;
  assigneeName?: string;
  clientName?: string;
  serviceName?: string;
  slaStatus?: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
}

// ============ SLA TYPES ============

export type SlaAlertType = 'SLA_AT_RISK' | 'SLA_BREACHED' | 'SLA_RECOVERED';

export interface SlaAlert {
  type: SlaAlertType;
  task: TaskData;
  timeRemaining?: number; // in minutes
  message: string;
  timestamp: Date;
}

// ============ NOTIFICATION TYPES ============

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'TASK_COMMENT'
  | 'SLA_WARNING'
  | 'SLA_BREACH'
  | 'SERVICE_UPDATE'
  | 'PAYMENT_RECEIVED'
  | 'DOCUMENT_UPLOADED'
  | 'COMPLIANCE_REMINDER'
  | 'SYSTEM_ALERT';

export interface SocketNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  timestamp: Date;
  actionUrl?: string;
}

// ============ PRESENCE TYPES ============

export interface UserPresence {
  userId: number;
  name: string;
  role: string;
  status: 'online' | 'away' | 'busy';
  lastActivity: Date;
  currentView?: string; // e.g., "task:123", "dashboard"
}

// ============ EVENT PAYLOADS ============

export interface TaskUpdatedPayload {
  task: TaskData;
  updatedBy: SocketUser;
  changes: Record<string, { old: any; new: any }>;
}

export interface TaskAssignedPayload {
  task: TaskData;
  assignedBy: string;
  message: string;
}

export interface TaskReassignedPayload {
  task: TaskData;
  reassignedBy: string;
  newAssignee: string;
  previousAssignee?: string;
}

export interface CommentAddedPayload {
  id: number;
  taskId: number;
  userId: number;
  userName: string;
  comment: string;
  createdAt: Date;
}

export interface UserOnlinePayload {
  userId: number;
  name: string;
  role: string;
  timestamp: Date;
}

export interface UserOfflinePayload {
  userId: number;
  name: string;
  timestamp: Date;
}

export interface TypingPayload {
  userId: number;
  name: string;
  taskId: number;
}

// ============ FILTER TYPES ============

export interface TaskFilters {
  status?: string[];
  priority?: string[];
  assigneeId?: number;
  clientId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  slaStatus?: string[];
}

// ============ CALLBACK TYPES ============

export interface SocketCallback<T = any> {
  (result: { success: boolean; data?: T; error?: string }): void;
}

// ============ ROOM TYPES ============

export type RoomType =
  | `user:${number}`
  | `role:${string}`
  | `team:${number}`
  | `task:${number}`
  | `service:${number}`
  | `client:${number}`
  | 'admin'
  | 'all-tasks';

// ============ SERVER TO CLIENT EVENTS ============

export interface ServerToClientEvents {
  // Task events
  'task:updated': (payload: TaskUpdatedPayload) => void;
  'task:assigned': (payload: TaskAssignedPayload) => void;
  'task:reassigned': (payload: TaskReassignedPayload) => void;
  'task:comment:added': (payload: CommentAddedPayload) => void;
  'task:typing': (payload: TypingPayload) => void;

  // SLA events
  'sla:warning': (alert: SlaAlert) => void;
  'sla:alert': (alert: SlaAlert) => void;
  'sla:recovered': (alert: SlaAlert) => void;

  // Presence events
  'user:online': (payload: UserOnlinePayload) => void;
  'user:offline': (payload: UserOfflinePayload) => void;
  'user:presence': (users: UserPresence[]) => void;

  // Notification events
  'notification': (notification: SocketNotification) => void;
  'notification:batch': (notifications: SocketNotification[]) => void;

  // System events
  'system:alert': (message: string) => void;
  'system:maintenance': (data: { message: string; scheduledAt: Date }) => void;
}

// ============ CLIENT TO SERVER EVENTS ============

export interface ClientToServerEvents {
  // Task subscriptions
  'task:subscribe': (taskId: number) => void;
  'task:unsubscribe': (taskId: number) => void;

  // Task operations
  'task:update': (data: TaskUpdateData, callback?: SocketCallback<TaskData>) => void;
  'task:assign': (data: TaskAssignmentData, callback?: SocketCallback<TaskData>) => void;
  'task:comment': (data: TaskCommentData, callback?: SocketCallback<CommentAddedPayload>) => void;
  'task:typing': (taskId: number) => void;

  // Data requests
  'tasks:refresh': (filters: TaskFilters, callback?: SocketCallback<TaskData[]>) => void;

  // Presence
  'presence:update': (status: 'online' | 'away' | 'busy') => void;
  'presence:view': (view: string) => void;

  // Notifications
  'notification:read': (notificationId: string) => void;
  'notification:readAll': () => void;

  // Heartbeat
  'ping': (callback?: (pong: string) => void) => void;
}

// ============ INTER-SERVER EVENTS ============

export interface InterServerEvents {
  'broadcast:task': (taskId: number, event: string, data: any) => void;
  'broadcast:user': (userId: number, event: string, data: any) => void;
  'broadcast:role': (role: string, event: string, data: any) => void;
}

// ============ SOCKET DATA ============

export interface SocketData {
  user: SocketUser;
  connectedAt: Date;
  lastActivity: Date;
}
