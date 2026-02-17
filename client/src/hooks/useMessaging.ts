/**
 * Messaging Hooks
 *
 * React Query hooks for messaging system
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';

// ============================================
// TYPES
// ============================================
export interface MessageThread {
  id: number;
  subject: string | null;
  type: string;
  status: string;
  priority: string;
  lastMessageAt: string;
  messageCount: number;
  lastMessage: {
    id: number;
    content: string;
    senderId: number;
    senderName: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  participants: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
  }>;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
}

export interface Message {
  id: number;
  threadId: number;
  senderId: number;
  content: string;
  contentType: string;
  attachments: Array<{
    id: number;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  replyToId: number | null;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  sender: {
    id: number;
    fullName: string;
    email: string;
  };
}

export interface CreateThreadData {
  subject?: string;
  type?: string;
  participantIds: number[];
  initialMessage?: string;
  entityType?: string;
  entityId?: number;
}

export interface SendMessageData {
  content: string;
  attachments?: Array<{ name: string; url: string; type: string; size: number }>;
  replyToId?: number;
}

// ============================================
// API FUNCTIONS
// ============================================
async function fetchThreads(params: { status?: string; limit?: number; offset?: number }) {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const response = await fetch(`/api/messages/threads?${searchParams}`, {
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to fetch threads');
  return response.json();
}

async function fetchThread(threadId: number): Promise<MessageThread> {
  const response = await fetch(`/api/messages/threads/${threadId}`, {
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to fetch thread');
  return response.json();
}

async function createThread(data: CreateThreadData): Promise<{ id: number }> {
  const response = await fetch('/api/messages/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to create thread');
  return response.json();
}

async function fetchMessages(threadId: number, params: { limit?: number; before?: string }) {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.before) searchParams.set('before', params.before);

  const response = await fetch(`/api/messages/threads/${threadId}/messages?${searchParams}`, {
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to fetch messages');
  return response.json();
}

async function sendMessage(threadId: number, data: SendMessageData): Promise<Message> {
  const response = await fetch(`/api/messages/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to send message');
  return response.json();
}

async function editMessage(threadId: number, messageId: number, content: string): Promise<Message> {
  const response = await fetch(`/api/messages/threads/${threadId}/messages/${messageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ content }),
  });

  if (!response.ok) throw new Error('Failed to edit message');
  return response.json();
}

async function deleteMessage(threadId: number, messageId: number) {
  const response = await fetch(`/api/messages/threads/${threadId}/messages/${messageId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to delete message');
  return response.json();
}

async function archiveThread(threadId: number) {
  const response = await fetch(`/api/messages/threads/${threadId}/archive`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to archive thread');
  return response.json();
}

async function unarchiveThread(threadId: number) {
  const response = await fetch(`/api/messages/threads/${threadId}/unarchive`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to unarchive thread');
  return response.json();
}

async function muteThread(threadId: number, muted: boolean) {
  const response = await fetch(`/api/messages/threads/${threadId}/mute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ muted }),
  });

  if (!response.ok) throw new Error('Failed to mute thread');
  return response.json();
}

async function pinThread(threadId: number, pinned: boolean) {
  const response = await fetch(`/api/messages/threads/${threadId}/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ pinned }),
  });

  if (!response.ok) throw new Error('Failed to pin thread');
  return response.json();
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook for fetching message threads
 */
export function useMessageThreads(params: { status?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['message-threads', params],
    queryFn: () => fetchThreads(params),
    staleTime: 30000,
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook for fetching a single thread
 */
export function useMessageThread(threadId: number) {
  return useQuery({
    queryKey: ['message-thread', threadId],
    queryFn: () => fetchThread(threadId),
    enabled: !!threadId,
    staleTime: 30000,
  });
}

/**
 * Hook for creating a new thread
 */
export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });
}

/**
 * Hook for fetching messages with infinite scroll
 */
export function useMessages(threadId: number, limit: number = 50) {
  return useInfiniteQuery({
    queryKey: ['messages', threadId],
    queryFn: ({ pageParam }) => fetchMessages(threadId, { limit, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: Message[]) => {
      if (lastPage.length < limit) return undefined;
      return lastPage[0]?.createdAt;
    },
    enabled: !!threadId,
    staleTime: 10000,
  });
}

/**
 * Hook for sending a message
 */
export function useSendMessage(threadId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageData) => sendMessage(threadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', threadId] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });
}

/**
 * Hook for editing a message
 */
export function useEditMessage(threadId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: number; content: string }) =>
      editMessage(threadId, messageId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', threadId] });
    },
  });
}

/**
 * Hook for deleting a message
 */
export function useDeleteMessage(threadId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: number) => deleteMessage(threadId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', threadId] });
    },
  });
}

/**
 * Hook for archiving a thread
 */
export function useArchiveThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });
}

/**
 * Hook for unarchiving a thread
 */
export function useUnarchiveThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unarchiveThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });
}

/**
 * Hook for muting/unmuting a thread
 */
export function useMuteThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, muted }: { threadId: number; muted: boolean }) =>
      muteThread(threadId, muted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });
}

/**
 * Hook for pinning/unpinning a thread
 */
export function usePinThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ threadId, pinned }: { threadId: number; pinned: boolean }) =>
      pinThread(threadId, pinned),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });
}
