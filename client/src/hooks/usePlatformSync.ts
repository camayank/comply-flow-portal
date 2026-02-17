import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncClient } from '@/lib/syncClient';
import { apiRequest } from '@/lib/queryClient';

interface PlatformHealth {
  frontend: 'active' | 'idle';
  middleware: 'healthy' | 'degraded' | 'critical';
  backend: 'healthy' | 'loaded';
  overall: 'healthy' | 'degraded' | 'critical';
}

interface PlatformMetrics {
  uptime: number;
  memory: any;
  cpu: any;
  timestamp: Date;
  activeConnections: number;
  syncLatency: number;
  dataConsistency: number;
  performanceScore: number;
}

interface PlatformState {
  frontend: {
    activeUsers: number;
    cachedData: Record<string, any>;
    uiState: Record<string, any>;
    lastUpdate: Date;
  };
  middleware: {
    syncConnections: number;
    eventQueue: any[];
    processingLoad: number;
    healthStatus: 'healthy' | 'degraded' | 'critical';
  };
  backend: {
    serviceConfigs: any[];
    workflowInstances: any[];
    storageMetrics: any;
    systemLoad: number;
  };
}

export function usePlatformSync() {
  const queryClient = useQueryClient();
  const { client, getStatus } = useSyncClient();
  const [syncStatus, setSyncStatus] = useState('initializing');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Platform health monitoring
  const { data: platformHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['/api/platform/health'],
    refetchInterval: 10000, // Check health every 10 seconds
    enabled: true
  });

  // Platform metrics monitoring
  const { data: platformMetrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['/api/platform/metrics'],
    refetchInterval: 5000, // Update metrics every 5 seconds
    enabled: true
  });

  // Platform state monitoring
  const { data: platformState, refetch: refetchState } = useQuery({
    queryKey: ['/api/platform/state'],
    refetchInterval: 15000, // Update state every 15 seconds
    enabled: true
  });

  // Force platform synchronization
  const forcePlatformSync = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      await apiRequest('/api/platform/sync', { method: 'POST' });
      
      // Invalidate all queries to force refresh
      await queryClient.invalidateQueries();
      
      // Refresh platform data
      await Promise.all([
        refetchHealth(),
        refetchMetrics(),
        refetchState()
      ]);
      
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Platform sync failed:', error);
      setSyncStatus('error');
    }
  }, [queryClient, refetchHealth, refetchMetrics, refetchState]);

  // Auto-sync on critical health issues
  useEffect(() => {
    if (platformHealth?.overall === 'critical') {
      forcePlatformSync();
    }
  }, [platformHealth?.overall, forcePlatformSync]);

  // Listen for platform state updates from WebSocket
  useEffect(() => {
    const handlePlatformStateUpdate = (data: any) => {
      if (data.type === 'platform_state_update') {
        queryClient.setQueryData(['/api/platform/state'], data.payload.state);
        setLastSyncTime(new Date());
      }
    };

    const handleCacheInvalidation = (data: any) => {
      if (data.type === 'cache_invalidation') {
        const { serviceId, correctData } = data.payload;
        
        // Update specific service cache
        queryClient.setQueryData(
          ['/api/services', serviceId],
          (oldData: any) => ({ ...oldData, ...correctData })
        );
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['/api/admin/service-configurations'] });
      }
    };

    const handleCacheOptimization = (data: any) => {
      if (data.type === 'cache_optimization') {
        const { frequentlyAccessed, shouldPreload } = data.payload;
        
        // Preload frequently accessed data
        frequentlyAccessed.forEach((queryKey: string) => {
          queryClient.prefetchQuery({ queryKey: [`/api/${queryKey}`] });
        });
        
        // Preload suggested data
        shouldPreload.forEach((queryKey: string) => {
          queryClient.prefetchQuery({ queryKey: [`/api/admin/${queryKey}`] });
        });
      }
    };

    client.on('platform_state_update', handlePlatformStateUpdate);
    client.on('cache_invalidation', handleCacheInvalidation);
    client.on('cache_optimization', handleCacheOptimization);

    return () => {
      client.off('platform_state_update', handlePlatformStateUpdate);
      client.off('cache_invalidation', handleCacheInvalidation);
      client.off('cache_optimization', handleCacheOptimization);
    };
  }, [client, queryClient]);

  // Intelligent cache management based on platform state
  const optimizeCache = useCallback(() => {
    // Clear stale data based on platform metrics
    if (platformMetrics?.dataConsistency && platformMetrics.dataConsistency < 95) {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-configurations'] });
    }

    // Preload critical data if performance is good
    if (platformMetrics?.performanceScore && platformMetrics.performanceScore > 90) {
      queryClient.prefetchQuery({ queryKey: ['/api/admin/combo-triggers'] });
      queryClient.prefetchQuery({ queryKey: ['/api/admin/pricing-optimization'] });
    }
  }, [platformMetrics, queryClient]);

  // Auto-optimize cache based on platform metrics
  useEffect(() => {
    optimizeCache();
  }, [optimizeCache]);

  // Monitor connection status and sync accordingly
  useEffect(() => {
    const connectionStatus = getStatus();
    
    if (connectionStatus.isConnected) {
      setSyncStatus('connected');
    } else {
      setSyncStatus('disconnected');
    }
  }, [getStatus]);

  // Data consistency validation
  const validateDataConsistency = useCallback(async () => {
    try {
      // Get backend service configurations
      const backendServices = await apiRequest('/api/admin/service-configurations');
      
      // Get cached frontend services
      const frontendServices = queryClient.getQueryData(['/api/services']) as any[];
      
      // Compare and identify inconsistencies
      const inconsistencies = [];
      
      if (backendServices && frontendServices) {
        backendServices.forEach((backendService: any) => {
          const frontendService = frontendServices.find(fs => fs.serviceId === backendService.id);
          
          if (frontendService && frontendService.price !== backendService.basePrice) {
            inconsistencies.push({
              serviceId: backendService.id,
              field: 'price',
              backendValue: backendService.basePrice,
              frontendValue: frontendService.price
            });
          }
        });
      }
      
      // Auto-resolve inconsistencies
      if (inconsistencies.length > 0) {
        await forcePlatformSync();
      }
      
      return {
        isConsistent: inconsistencies.length === 0,
        inconsistencies
      };
    } catch (error) {
      console.error('Data consistency validation failed:', error);
      return { isConsistent: false, inconsistencies: [] };
    }
  }, [queryClient, forcePlatformSync]);

  // Performance monitoring
  const getPerformanceMetrics = useCallback(() => {
    return {
      syncLatency: platformMetrics?.syncLatency || 0,
      dataConsistency: platformMetrics?.dataConsistency || 0,
      performanceScore: platformMetrics?.performanceScore || 0,
      uptime: platformMetrics?.uptime || 0,
      lastSyncTime,
      syncStatus
    };
  }, [platformMetrics, lastSyncTime, syncStatus]);

  // Health status with detailed breakdown
  const getDetailedHealthStatus = useCallback(() => {
    const connectionStatus = getStatus();
    
    return {
      connection: {
        status: connectionStatus.isConnected ? 'connected' : 'disconnected',
        sessionId: connectionStatus.sessionId,
        reconnectAttempts: connectionStatus.reconnectAttempts
      },
      platform: platformHealth || { overall: 'unknown' },
      sync: {
        status: syncStatus,
        lastSyncTime,
        latency: platformMetrics?.syncLatency || 0
      },
      performance: {
        score: platformMetrics?.performanceScore || 0,
        dataConsistency: platformMetrics?.dataConsistency || 0,
        systemLoad: platformState?.backend?.systemLoad || 0
      }
    };
  }, [getStatus, platformHealth, syncStatus, lastSyncTime, platformMetrics, platformState]);

  return {
    // Health and status
    platformHealth: platformHealth as PlatformHealth,
    platformMetrics: platformMetrics as PlatformMetrics,
    platformState: platformState as PlatformState,
    syncStatus,
    lastSyncTime,
    
    // Actions
    forcePlatformSync,
    validateDataConsistency,
    optimizeCache,
    
    // Getters
    getPerformanceMetrics,
    getDetailedHealthStatus,
    
    // Helper flags
    isHealthy: platformHealth?.overall === 'healthy',
    isConnected: getStatus().isConnected,
    isSyncing: syncStatus === 'syncing',
    hasErrors: syncStatus === 'error' || platformHealth?.overall === 'critical'
  };
}

// Hook for component-level sync monitoring
export function useComponentSync(componentName: string) {
  const { forcePlatformSync, validateDataConsistency } = usePlatformSync();
  const queryClient = useQueryClient();

  const syncComponent = useCallback(async () => {
    // Invalidate component-specific queries
    if (componentName === 'AdminPanel') {
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    } else if (componentName === 'ServiceFlow') {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    } else if (componentName === 'WorkflowDashboard') {
      queryClient.invalidateQueries({ queryKey: ['/api/workflow'] });
    }
    
    // Validate data consistency for this component
    await validateDataConsistency();
  }, [componentName, queryClient, validateDataConsistency]);

  return {
    syncComponent,
    componentName
  };
}