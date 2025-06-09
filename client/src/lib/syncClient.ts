// Frontend Synchronization Client for Real-time Middleware Integration
import { queryClient } from './queryClient';

export interface SyncClientOptions {
  autoReconnect?: boolean;
  heartbeatInterval?: number;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface ClientMessage {
  type: 'state_update' | 'service_interaction' | 'workflow_action' | 'request_sync';
  payload: any;
}

export interface ServerMessage {
  type: 'initial_sync' | 'periodic_sync' | 'full_sync' | 'sync_event' | 'combo_suggestions';
  payload: any;
}

export class SyncClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private eventListeners: Map<string, Function[]> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  private options: Required<SyncClientOptions> = {
    autoReconnect: true,
    heartbeatInterval: 30000,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000
  };

  private clientState = {
    userId: null as number | null,
    activeServices: [] as string[],
    currentWorkflows: [] as string[],
    selectedCombos: [] as string[],
    preferences: {} as Record<string, any>
  };

  constructor(options: SyncClientOptions = {}) {
    this.options = { ...this.options, ...options };
    this.connect();
  }

  private connect() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/sync`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch (error) {
          console.error('Failed to parse server message:', error);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('disconnected');
        
        if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to connect to sync server:', error);
      if (this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private handleServerMessage(message: ServerMessage) {
    switch (message.type) {
      case 'initial_sync':
        this.sessionId = message.payload.sessionId;
        this.handleInitialSync(message.payload);
        break;
        
      case 'periodic_sync':
        this.handlePeriodicSync(message.payload);
        break;
        
      case 'full_sync':
        this.handleFullSync(message.payload);
        break;
        
      case 'sync_event':
        this.handleSyncEvent(message.payload);
        break;
        
      case 'combo_suggestions':
        this.handleComboSuggestions(message.payload);
        break;
    }
    
    this.emit('message', message);
  }

  private handleInitialSync(payload: any) {
    // Update React Query cache with initial data
    if (payload.availableServices) {
      queryClient.setQueryData(['/api/admin/service-configurations'], payload.availableServices);
    }
    
    if (payload.activeWorkflows) {
      queryClient.setQueryData(['/api/workflow-templates'], payload.activeWorkflows);
    }
    
    this.emit('initial_sync', payload);
  }

  private handlePeriodicSync(payload: any) {
    // Update specific query caches based on sync data
    if (payload.workflowUpdates) {
      payload.workflowUpdates.forEach((update: any) => {
        queryClient.setQueryData(
          ['/api/workflow-instances', update.workflowId, 'progress'],
          update.progress
        );
      });
    }
    
    if (payload.serviceUpdates) {
      payload.serviceUpdates.forEach((update: any) => {
        queryClient.setQueryData(
          ['/api/services', update.serviceId],
          (oldData: any) => ({ ...oldData, ...update })
        );
      });
    }
    
    this.emit('periodic_sync', payload);
  }

  private handleFullSync(payload: any) {
    // Comprehensive cache update
    if (payload.services) {
      queryClient.setQueryData(['/api/admin/service-configurations'], payload.services);
    }
    
    if (payload.workflows) {
      queryClient.setQueryData(['/api/workflow-templates'], payload.workflows);
    }
    
    if (payload.combos) {
      queryClient.setQueryData(['/api/admin/combo-triggers'], payload.combos);
    }
    
    if (payload.qualityMetrics) {
      queryClient.setQueryData(['/api/admin/quality-metrics'], payload.qualityMetrics);
    }
    
    // Invalidate all queries to force refresh
    queryClient.invalidateQueries();
    
    this.emit('full_sync', payload);
  }

  private handleSyncEvent(payload: any) {
    switch (payload.type) {
      case 'service_update':
        this.handleServiceUpdate(payload.payload);
        break;
        
      case 'workflow_progress':
        this.handleWorkflowProgress(payload.payload);
        break;
        
      case 'combo_trigger':
        this.handleComboTrigger(payload.payload);
        break;
        
      case 'quality_audit':
        this.handleQualityAudit(payload.payload);
        break;
        
      case 'pricing_change':
        this.handlePricingChange(payload.payload);
        break;
    }
    
    this.emit('sync_event', payload);
  }

  private handleServiceUpdate(payload: any) {
    // Invalidate service-related queries
    queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/service-configurations'] });
    
    this.emit('service_update', payload);
  }

  private handleWorkflowProgress(payload: any) {
    // Update workflow progress in cache
    queryClient.setQueryData(
      ['/api/workflow-instances', payload.workflowId, 'progress'],
      payload.progress
    );
    
    this.emit('workflow_progress', payload);
  }

  private handleComboTrigger(payload: any) {
    // Update combo suggestions
    queryClient.invalidateQueries({ queryKey: ['/api/admin/combo-triggers'] });
    
    this.emit('combo_trigger', payload);
  }

  private handleQualityAudit(payload: any) {
    // Update quality metrics
    queryClient.setQueryData(['/api/admin/quality-audit'], payload);
    
    this.emit('quality_audit', payload);
  }

  private handlePricingChange(payload: any) {
    // Update pricing data
    queryClient.invalidateQueries({ queryKey: ['/api/admin/pricing-optimization'] });
    
    // Update individual service prices
    payload.forEach((update: any) => {
      queryClient.setQueryData(
        ['/api/services', update.serviceId],
        (oldData: any) => ({ ...oldData, price: update.suggestedPrice })
      );
    });
    
    this.emit('pricing_change', payload);
  }

  private handleComboSuggestions(payload: any) {
    this.emit('combo_suggestions', payload);
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.send({
          type: 'request_sync',
          payload: { timestamp: new Date() }
        });
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Public API
  public send(message: ClientMessage) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    }
  }

  public updateState(stateUpdate: Partial<typeof this.clientState>) {
    this.clientState = { ...this.clientState, ...stateUpdate };
    
    this.send({
      type: 'state_update',
      payload: this.clientState
    });
  }

  public serviceInteraction(serviceId: string, action: 'select' | 'deselect' | 'configure', data?: any) {
    this.send({
      type: 'service_interaction',
      payload: { serviceId, action, data }
    });

    // Optimistically update local state
    if (action === 'select' && !this.clientState.activeServices.includes(serviceId)) {
      this.clientState.activeServices.push(serviceId);
    } else if (action === 'deselect') {
      this.clientState.activeServices = this.clientState.activeServices.filter(id => id !== serviceId);
    }
  }

  public workflowAction(workflowId: string, stepId: string, action: 'start' | 'complete' | 'pause' | 'skip') {
    this.send({
      type: 'workflow_action',
      payload: { workflowId, stepId, action }
    });

    // Optimistically update workflow state
    if (action === 'start' && !this.clientState.currentWorkflows.includes(workflowId)) {
      this.clientState.currentWorkflows.push(workflowId);
    }
  }

  public requestFullSync() {
    this.send({
      type: 'request_sync',
      payload: { type: 'full', timestamp: new Date() }
    });
  }

  public on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      sessionId: this.sessionId,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  public getClientState() {
    return { ...this.clientState };
  }

  public disconnect() {
    this.options.autoReconnect = false;
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Global sync client instance
export const syncClient = new SyncClient({
  autoReconnect: true,
  heartbeatInterval: 30000,
  maxReconnectAttempts: 5,
  reconnectDelay: 3000
});

// React hook for using sync client
export function useSyncClient() {
  return {
    client: syncClient,
    updateState: (state: any) => syncClient.updateState(state),
    serviceInteraction: (serviceId: string, action: any, data?: any) => 
      syncClient.serviceInteraction(serviceId, action, data),
    workflowAction: (workflowId: string, stepId: string, action: any) => 
      syncClient.workflowAction(workflowId, stepId, action),
    requestSync: () => syncClient.requestFullSync(),
    getStatus: () => syncClient.getConnectionStatus(),
    getState: () => syncClient.getClientState()
  };
}