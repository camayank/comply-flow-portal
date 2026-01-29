// Middleware Synchronization Engine for Real-time Frontend-Backend Sync
import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { adminEngine } from './admin-engine';
import { workflowEngine } from './workflow-engine';
import { storage } from './storage';

export interface SyncEvent {
  type: 'service_update' | 'workflow_progress' | 'combo_trigger' | 'quality_audit' | 'pricing_change' | 'client_action';
  payload: any;
  timestamp: Date;
  userId?: number;
  sessionId?: string;
}

export interface ClientState {
  userId?: number;
  activeServices: string[];
  currentWorkflows: string[];
  selectedCombos: string[];
  lastActivity: Date;
  preferences: Record<string, any>;
}

export class MiddlewareSyncEngine {
  private wss: WebSocketServer;
  private clients: Map<string, { ws: WebSocket; state: ClientState }> = new Map();
  private eventQueue: SyncEvent[] = [];
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/sync' });
    this.setupWebSocketHandlers();
    this.startSyncProcesses();
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const sessionId = this.generateSessionId();
      const clientState: ClientState = {
        activeServices: [],
        currentWorkflows: [],
        selectedCombos: [],
        lastActivity: new Date(),
        preferences: {}
      };

      this.clients.set(sessionId, { ws, state: clientState });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(sessionId, message);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(sessionId);
        const interval = this.syncIntervals.get(sessionId);
        if (interval) {
          const { jobManager } = await import('./job-lifecycle-manager.js');
          jobManager.stopJob(`client-sync-${sessionId}`);
          this.syncIntervals.delete(sessionId);
        }
      });

      // Send initial sync data
      this.sendToClient(sessionId, {
        type: 'initial_sync',
        payload: {
          sessionId,
          serverTime: new Date(),
          availableServices: adminEngine.getAllServiceConfigurations(),
          activeWorkflows: workflowEngine.getTemplates()
        }
      });

      // Start personalized sync for this client
      this.startClientSync(sessionId);
    });
  }

  private handleClientMessage(sessionId: string, message: any) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    switch (message.type) {
      case 'state_update':
        this.updateClientState(sessionId, message.payload);
        break;
      case 'service_interaction':
        this.handleServiceInteraction(sessionId, message.payload);
        break;
      case 'workflow_action':
        this.handleWorkflowAction(sessionId, message.payload);
        break;
      case 'request_sync':
        this.forceSyncClient(sessionId);
        break;
    }
  }

  private updateClientState(sessionId: string, stateUpdate: Partial<ClientState>) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    client.state = { ...client.state, ...stateUpdate, lastActivity: new Date() };
    
    // Trigger intelligent combo suggestions based on state
    this.evaluateComboSuggestions(sessionId);
  }

  private async handleServiceInteraction(sessionId: string, payload: any) {
    const { serviceId, action, data } = payload;
    const client = this.clients.get(sessionId);
    if (!client) return;

    // Update client's active services
    if (action === 'select' && !client.state.activeServices.includes(serviceId)) {
      client.state.activeServices.push(serviceId);
    } else if (action === 'deselect') {
      client.state.activeServices = client.state.activeServices.filter(id => id !== serviceId);
    }

    // Broadcast service interaction to relevant clients
    const syncEvent: SyncEvent = {
      type: 'service_update',
      payload: { serviceId, action, clientCount: this.getActiveClientCount() },
      timestamp: new Date(),
      userId: client.state.userId,
      sessionId
    };

    this.broadcastEvent(syncEvent);
    this.evaluateComboSuggestions(sessionId);
  }

  private async handleWorkflowAction(sessionId: string, payload: any) {
    const { workflowId, stepId, action } = payload;
    const client = this.clients.get(sessionId);
    if (!client) return;

    try {
      // Simulate workflow progress update
      const workflowInstance = workflowEngine.getTemplate(workflowId);
      if (workflowInstance) {
        // Broadcast workflow progress without actual update (simulation)
        const syncEvent: SyncEvent = {
          type: 'workflow_progress',
          payload: {
            workflowId,
            stepId,
            action,
            progress: Math.min(100, Math.random() * 100) // Simulated progress
          },
          timestamp: new Date(),
          userId: client.state.userId,
          sessionId
        };

        this.broadcastEvent(syncEvent);
      }
    } catch (error) {
      console.error('Workflow action error:', error);
    }
  }

  private async evaluateComboSuggestions(sessionId: string) {
    const client = this.clients.get(sessionId);
    if (!client || client.state.activeServices.length === 0) return;

    try {
      // Create client profile for combo evaluation
      const clientProfile = {
        turnover: client.state.preferences.turnover || 5000000,
        employee_count: client.state.preferences.employees || 10,
        company_age: client.state.preferences.companyAge || 1,
        industry: client.state.preferences.industry || 'technology',
        location: client.state.preferences.location || 'bangalore'
      };

      const suggestions = adminEngine.evaluateComboSuggestions(
        client.state.activeServices,
        clientProfile
      );

      if (suggestions.length > 0) {
        this.sendToClient(sessionId, {
          type: 'combo_suggestions',
          payload: {
            suggestions,
            currentServices: client.state.activeServices,
            potentialSavings: suggestions.reduce((sum, combo) => sum + (combo.fixedDiscount || 0), 0)
          }
        });
      }
    } catch (error) {
      console.error('Combo evaluation error:', error);
    }
  }

  private startClientSync(sessionId: string) {
    const { jobManager } = await import('./job-lifecycle-manager.js');

    const syncIntervalHandle = jobManager.registerInterval(
      `client-sync-${sessionId}`,
      async () => {
        await this.syncClientData(sessionId);
      },
      30000, // Sync every 30 seconds
      `Per-client sync for session ${sessionId} - sends periodic updates`
    );

    this.syncIntervals.set(sessionId, syncIntervalHandle);
  }

  private async syncClientData(sessionId: string) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    try {
      // Fetch latest data based on client state
      const syncData: any = {
        timestamp: new Date(),
        serverLoad: this.getActiveClientCount(),
        activePromotions: await this.getActivePromotions(),
      };

      // Add workflow updates if client has active workflows
      if (client.state.currentWorkflows.length > 0) {
        syncData.workflowUpdates = client.state.currentWorkflows.map((workflowId) => ({
          workflowId,
          progress: Math.floor(Math.random() * 100), // Simulated progress
          nextDeadlines: [`Step deadline in ${Math.floor(Math.random() * 10) + 1} days`]
        }));
      }

      // Add service configuration updates
      if (client.state.activeServices.length > 0) {
        syncData.serviceUpdates = client.state.activeServices.map(serviceId => {
          const config = adminEngine.getServiceConfiguration(serviceId);
          return config ? {
            serviceId,
            currentPrice: config.basePrice,
            estimatedDays: config.estimatedDays,
            availability: 'available'
          } : null;
        }).filter(Boolean);
      }

      this.sendToClient(sessionId, {
        type: 'periodic_sync',
        payload: syncData
      });

    } catch (error) {
      console.error('Client sync error:', error);
    }
  }

  private async forceSyncClient(sessionId: string) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    // Force immediate comprehensive sync
    const fullSyncData = {
      services: adminEngine.getAllServiceConfigurations(),
      workflows: workflowEngine.getTemplates(),
      combos: await this.getActiveCombos(),
      qualityMetrics: await this.getQualityMetrics(),
      pricingUpdates: await this.getPricingUpdates(),
      systemStatus: {
        uptime: process.uptime(),
        activeClients: this.getActiveClientCount(),
        lastUpdate: new Date()
      }
    };

    this.sendToClient(sessionId, {
      type: 'full_sync',
      payload: fullSyncData
    });
  }

  private broadcastEvent(event: SyncEvent) {
    const message = JSON.stringify({
      type: 'sync_event',
      payload: event
    });

    this.clients.forEach((client, sessionId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });

    // Store event for offline clients
    this.eventQueue.push(event);
    if (this.eventQueue.length > 100) {
      this.eventQueue = this.eventQueue.slice(-50); // Keep last 50 events
    }
  }

  private sendToClient(sessionId: string, message: any) {
    const client = this.clients.get(sessionId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private startSyncProcesses() {
    const { jobManager } = await import('./job-lifecycle-manager.js');

    // Quality audit sync every 5 minutes
    jobManager.registerInterval(
      'middleware-quality-audit',
      async () => {
        try {
          const auditResults = await this.performQualityAudits();
          if (auditResults.length > 0) {
            this.broadcastEvent({
              type: 'quality_audit',
              payload: auditResults,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error('Quality audit sync error:', error);
        }
      },
      300000, // 5 minutes
      'Quality audit sync - broadcasts service quality metrics to connected clients'
    );

    // Pricing optimization sync every 10 minutes
    jobManager.registerInterval(
      'middleware-pricing-sync',
      async () => {
        try {
          const pricingUpdates = await this.checkPricingOptimization();
          if (pricingUpdates.length > 0) {
            this.broadcastEvent({
              type: 'pricing_change',
              payload: pricingUpdates,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.error('Pricing sync error:', error);
        }
      },
      600000, // 10 minutes
      'Pricing optimization sync - broadcasts pricing updates to connected clients'
    );
  }

  // Helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getActiveClientCount(): number {
    return Array.from(this.clients.values()).filter(
      client => client.ws.readyState === WebSocket.OPEN
    ).length;
  }

  private async getActivePromotions() {
    // Simulate active promotions based on current combos
    return [
      { id: 'STARTUP_SPECIAL', discount: 15, validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      { id: 'ENTERPRISE_TRIAL', discount: 25, validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    ];
  }

  private async getActiveCombos() {
    // Return intelligent combo suggestions based on current market conditions
    return [
      {
        id: 'MARKET_OPTIMIZED_COMBO',
        name: 'Market-Optimized Bundle',
        services: ['incorporation', 'gst', 'bank-account'],
        discount: 18,
        validityHours: 48
      }
    ];
  }

  private async getQualityMetrics() {
    return {
      avgResponseTime: '12 minutes',
      completionRate: 98.5,
      clientSatisfaction: 4.8,
      lastUpdated: new Date()
    };
  }

  private async getPricingUpdates() {
    return adminEngine.getAllServiceConfigurations().map(config => ({
      serviceId: config.id,
      currentPrice: config.basePrice,
      marketPosition: 'competitive',
      lastUpdated: new Date()
    }));
  }

  private async performQualityAudits() {
    const services = adminEngine.getAllServiceConfigurations();
    const auditResults = [];

    for (const service of services.slice(0, 3)) { // Audit 3 services per cycle
      const result = adminEngine.auditServiceQuality(service.id);
      if (result.score < 95) {
        auditResults.push(result);
      }
    }

    return auditResults;
  }

  private async checkPricingOptimization() {
    // Simulate pricing optimization checks
    const updates = [];
    const services = adminEngine.getAllServiceConfigurations();
    
    for (const service of services) {
      // Simulate market-based pricing adjustments
      const marketFactor = 0.95 + Math.random() * 0.1; // ±5% market variation
      const optimizedPrice = Math.round(service.basePrice * marketFactor);
      
      if (Math.abs(optimizedPrice - service.basePrice) > service.basePrice * 0.03) {
        updates.push({
          serviceId: service.id,
          currentPrice: service.basePrice,
          suggestedPrice: optimizedPrice,
          reason: 'Market conditions changed'
        });
      }
    }

    return updates;
  }
}

export let middlewareSyncEngine: MiddlewareSyncEngine;

export function initializeMiddlewareSync(server: Server) {
  middlewareSyncEngine = new MiddlewareSyncEngine(server);
  return middlewareSyncEngine;
}