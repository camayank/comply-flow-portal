/**
 * Real-time Updates Hook
 * Connects to WebSocket for live compliance updates
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Event subscription/filtering
 * - Optimistic updates
 * - Connection state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface RealTimeEvent {
  type: string;
  payload: any;
  timestamp: string;
  sessionId?: string;
}

export interface UseRealTimeUpdatesOptions {
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  eventFilter?: (event: RealTimeEvent) => boolean;
}

const DEFAULT_OPTIONS: UseRealTimeUpdatesOptions = {
  enabled: true,
  autoReconnect: true,
  reconnectAttempts: 5,
  reconnectInterval: 3000,
};

// Query keys that should be invalidated on specific events
const EVENT_QUERY_MAP: Record<string, string[]> = {
  'compliance_update': ['/api/v2/client/status', '/api/v2/client/executive-summary', '/api/v2/client/proactive-alerts'],
  'document_update': ['/api/v2/client/executive-summary', '/api/v2/client/proactive-alerts'],
  'deadline_approaching': ['/api/v2/client/status', '/api/v2/client/proactive-alerts'],
  'action_completed': ['/api/v2/client/status', '/api/v2/client/executive-summary'],
  'periodic_sync': [], // Don't invalidate on periodic sync
  'sync_event': ['/api/v2/client/status'],
};

export function useRealTimeUpdates(options: UseRealTimeUpdatesOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const queryClient = useQueryClient();

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastEvent, setLastEvent] = useState<RealTimeEvent | null>(null);
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/sync`;
  }, []);

  const invalidateQueriesForEvent = useCallback((eventType: string) => {
    const queriesToInvalidate = EVENT_QUERY_MAP[eventType] || [];
    queriesToInvalidate.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    });
  }, [queryClient]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as RealTimeEvent;

      // Apply event filter if provided
      if (opts.eventFilter && !opts.eventFilter(data)) {
        return;
      }

      // Store session ID from initial sync
      if (data.type === 'initial_sync' && data.payload?.sessionId) {
        setSessionId(data.payload.sessionId);
      }

      // Update state
      setLastEvent(data);
      setEvents(prev => [...prev.slice(-49), data]); // Keep last 50 events

      // Invalidate relevant queries for automatic refresh
      invalidateQueriesForEvent(data.type);

      // Handle specific event types
      switch (data.type) {
        case 'compliance_update':
        case 'action_completed':
        case 'deadline_approaching':
          // These are high-priority events that should trigger immediate UI updates
          queryClient.invalidateQueries({ queryKey: ['/api/v2/client/status'] });
          break;

        case 'document_update':
          queryClient.invalidateQueries({ queryKey: ['/api/v2/client/executive-summary'] });
          break;
      }
    } catch (error) {
      console.error('WebSocket message parse error:', error);
    }
  }, [opts.eventFilter, invalidateQueriesForEvent, queryClient]);

  const connect = useCallback(() => {
    if (isUnmountedRef.current || !opts.enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState('connecting');

    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) {
          ws.close();
          return;
        }
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        opts.onConnect?.();
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        opts.onError?.(error);
      };

      ws.onclose = () => {
        if (isUnmountedRef.current) return;

        setConnectionState('disconnected');
        opts.onDisconnect?.();
        wsRef.current = null;

        // Auto-reconnect logic
        if (opts.autoReconnect && reconnectAttemptsRef.current < (opts.reconnectAttempts || 5)) {
          setConnectionState('reconnecting');
          const delay = Math.min(
            (opts.reconnectInterval || 3000) * Math.pow(2, reconnectAttemptsRef.current),
            30000 // Max 30 seconds
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionState('disconnected');
    }
  }, [opts, getWebSocketUrl, handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionState('disconnected');
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const requestSync = useCallback(() => {
    return send({ type: 'request_sync' });
  }, [send]);

  const updateState = useCallback((stateUpdate: Record<string, any>) => {
    return send({ type: 'state_update', payload: stateUpdate });
  }, [send]);

  // Connect on mount
  useEffect(() => {
    isUnmountedRef.current = false;

    if (opts.enabled) {
      connect();
    }

    return () => {
      isUnmountedRef.current = true;
      disconnect();
    };
  }, [opts.enabled]); // Only reconnect if enabled changes

  // Periodic ping to keep connection alive
  useEffect(() => {
    if (connectionState !== 'connected') return;

    const pingInterval = setInterval(() => {
      send({ type: 'ping' });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [connectionState, send]);

  return {
    // State
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting' || connectionState === 'reconnecting',
    sessionId,
    lastEvent,
    events,

    // Actions
    connect,
    disconnect,
    send,
    requestSync,
    updateState,

    // Utilities
    clearEvents: () => setEvents([]),
  };
}

// Convenience hook for compliance-specific updates
export function useComplianceRealTime() {
  const realTime = useRealTimeUpdates({
    eventFilter: (event) => {
      const complianceEvents = [
        'compliance_update',
        'deadline_approaching',
        'action_completed',
        'document_update',
        'periodic_sync',
        'initial_sync'
      ];
      return complianceEvents.includes(event.type);
    }
  });

  const complianceEvents = realTime.events.filter(e =>
    e.type === 'compliance_update' ||
    e.type === 'deadline_approaching' ||
    e.type === 'action_completed'
  );

  return {
    ...realTime,
    complianceEvents,
    hasUrgentUpdates: complianceEvents.some(e => e.type === 'deadline_approaching'),
  };
}

export default useRealTimeUpdates;
