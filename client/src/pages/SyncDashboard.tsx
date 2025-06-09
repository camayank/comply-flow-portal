import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Users, 
  Zap, 
  TrendingUp, 
  Clock,
  Server,
  Database,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useSyncClient } from '@/lib/syncClient';
import { usePlatformSync } from '@/hooks/usePlatformSync';
import { useToast } from '@/hooks/use-toast';

interface SyncEvent {
  id: string;
  type: string;
  timestamp: Date;
  payload: any;
  source: string;
}

interface ConnectionMetrics {
  latency: number;
  packetsReceived: number;
  packetsSent: number;
  reconnections: number;
  uptime: number;
}

const SyncDashboard = () => {
  const { client, getStatus, getState, requestSync } = useSyncClient();
  const { 
    platformHealth, 
    platformMetrics, 
    platformState, 
    forcePlatformSync, 
    validateDataConsistency,
    getPerformanceMetrics,
    getDetailedHealthStatus,
    isHealthy,
    isConnected,
    isSyncing
  } = usePlatformSync();
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState(getStatus());
  const [clientState, setClientState] = useState(getState());
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    latency: 0,
    packetsReceived: 0,
    packetsSent: 0,
    reconnections: 0,
    uptime: 0
  });
  const [realTimeData, setRealTimeData] = useState({
    activeUsers: 0,
    serverLoad: 0,
    syncQuality: 0,
    dataFreshness: 0
  });

  useEffect(() => {
    // Connection status monitoring
    const statusInterval = setInterval(() => {
      setConnectionStatus(getStatus());
      setClientState(getState());
    }, 1000);

    // Metrics simulation
    const metricsInterval = setInterval(() => {
      setMetrics(prev => ({
        latency: Math.floor(Math.random() * 50) + 10,
        packetsReceived: prev.packetsReceived + Math.floor(Math.random() * 5) + 1,
        packetsSent: prev.packetsSent + Math.floor(Math.random() * 3) + 1,
        reconnections: prev.reconnections,
        uptime: prev.uptime + 1
      }));

      setRealTimeData({
        activeUsers: Math.floor(Math.random() * 50) + 10,
        serverLoad: Math.floor(Math.random() * 30) + 20,
        syncQuality: Math.floor(Math.random() * 20) + 80,
        dataFreshness: Math.floor(Math.random() * 10) + 90
      });
    }, 3000);

    // Event listeners
    const handleSyncEvent = (event: any) => {
      const newEvent: SyncEvent = {
        id: `evt-${Date.now()}`,
        type: event.type || 'unknown',
        timestamp: new Date(),
        payload: event.payload || event,
        source: 'server'
      };
      
      setSyncEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
      
      if (event.type === 'combo_suggestions') {
        toast({
          title: "New Combo Suggestions",
          description: `${event.payload?.suggestions?.length || 0} new suggestions available`,
        });
      }
    };

    const handleConnection = () => {
      setMetrics(prev => ({ ...prev, reconnections: prev.reconnections + 1 }));
      toast({
        title: "Connected",
        description: "Real-time sync established",
      });
    };

    const handleDisconnection = () => {
      toast({
        title: "Disconnected",
        description: "Attempting to reconnect...",
        variant: "destructive"
      });
    };

    client.on('sync_event', handleSyncEvent);
    client.on('combo_suggestions', handleSyncEvent);
    client.on('workflow_progress', handleSyncEvent);
    client.on('service_update', handleSyncEvent);
    client.on('connected', handleConnection);
    client.on('disconnected', handleDisconnection);

    return () => {
      clearInterval(statusInterval);
      clearInterval(metricsInterval);
      client.off('sync_event', handleSyncEvent);
      client.off('combo_suggestions', handleSyncEvent);
      client.off('workflow_progress', handleSyncEvent);
      client.off('service_update', handleSyncEvent);
      client.off('connected', handleConnection);
      client.off('disconnected', handleDisconnection);
    };
  }, [client, toast]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'service_update': return 'bg-blue-500';
      case 'workflow_progress': return 'bg-green-500';
      case 'combo_suggestions': return 'bg-purple-500';
      case 'pricing_change': return 'bg-orange-500';
      case 'quality_audit': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Synchronization Dashboard</h1>
        <p className="text-gray-600">Real-time monitoring of middleware-frontend integration</p>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium">Platform Health</p>
                <p className="text-xs text-gray-500">
                  {isHealthy ? 'All Systems Operational' : 'Issues Detected'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Latency</p>
                <p className="text-xs text-gray-500">{metrics.latency}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Active Users</p>
                <p className="text-xs text-gray-500">{realTimeData.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-4">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Server Load</p>
                <p className="text-xs text-gray-500">{realTimeData.serverLoad}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Live Events</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="state">State Management</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Real-time Performance
                </CardTitle>
                <CardDescription>Live system performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Sync Quality</span>
                    <span>{realTimeData.syncQuality}%</span>
                  </div>
                  <Progress value={realTimeData.syncQuality} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Data Freshness</span>
                    <span>{realTimeData.dataFreshness}%</span>
                  </div>
                  <Progress value={realTimeData.dataFreshness} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Server Load</span>
                    <span>{realTimeData.serverLoad}%</span>
                  </div>
                  <Progress value={realTimeData.serverLoad} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Connection Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Connection Details
                </CardTitle>
                <CardDescription>Current session information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Session ID:</span>
                  <Badge variant="outline" className="text-xs">
                    {connectionStatus.sessionId?.slice(-8) || 'N/A'}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Uptime:</span>
                  <span className="text-xs text-gray-500">{formatUptime(metrics.uptime)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Reconnections:</span>
                  <span className="text-xs text-gray-500">{metrics.reconnections}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Packets (↓/↑):</span>
                  <span className="text-xs text-gray-500">
                    {metrics.packetsReceived}/{metrics.packetsSent}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Active Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Active Services
                </CardTitle>
                <CardDescription>Currently selected services</CardDescription>
              </CardHeader>
              <CardContent>
                {clientState.activeServices.length > 0 ? (
                  <div className="space-y-2">
                    {clientState.activeServices.map((serviceId) => (
                      <div key={serviceId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{serviceId}</span>
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No active services</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sync Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Sync Controls
                </CardTitle>
                <CardDescription>Manual synchronization options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={forcePlatformSync} 
                  className="w-full"
                  disabled={!isConnected || isSyncing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Force Platform Sync'}
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    Clear Cache
                  </Button>
                  <Button variant="outline" size="sm">
                    Reset State
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Live Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Events Stream
                </span>
                <Badge variant="outline">{syncEvents.length} events</Badge>
              </CardTitle>
              <CardDescription>Real-time synchronization events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {syncEvents.length > 0 ? (
                  syncEvents.map((event) => (
                    <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-3 h-3 rounded-full mt-2 ${getEventTypeColor(event.type)}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium capitalize">
                            {event.type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {event.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {JSON.stringify(event.payload).slice(0, 100)}...
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No events captured yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Network Metrics</CardTitle>
                <CardDescription>Real-time network performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{metrics.latency}ms</div>
                    <div className="text-sm text-gray-600">Latency</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{metrics.packetsReceived}</div>
                    <div className="text-sm text-gray-600">Packets Received</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Packet Loss</span>
                    <span>0.1%</span>
                  </div>
                  <Progress value={0.1} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Quality Metrics</CardTitle>
                <CardDescription>Data synchronization health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{realTimeData.syncQuality}%</div>
                    <div className="text-sm text-gray-600">Sync Quality</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{realTimeData.dataFreshness}%</div>
                    <div className="text-sm text-gray-600">Data Freshness</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* State Management Tab */}
        <TabsContent value="state">
          <Card>
            <CardHeader>
              <CardTitle>Client State</CardTitle>
              <CardDescription>Current frontend state and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
                  {JSON.stringify(clientState, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SyncDashboard;