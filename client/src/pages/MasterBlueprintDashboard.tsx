import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  CheckCircle2,
  AlertTriangle, 
  PlayCircle, 
  Calendar,
  TrendingUp,
  Settings,
  Users,
  Database,
  Shield,
  Zap,
  GitBranch
} from "lucide-react";

interface ServiceTypeMetrics {
  onTime?: number;
  total?: number;
  complianceRate?: number;
}

interface SlaMetrics {
  serviceTypeBreakdown: Record<string, ServiceTypeMetrics>;
}

interface BlueprintStatus {
  currentPhase: string;
  overallProgress: number;
  phases: Record<string, PhaseStatus>;
  systemHealth: SystemHealth;
  monitoring: MonitoringStatus;
  nextActions: NextAction[];
  architecture: ArchitectureStatus;
}

interface PhaseStatus {
  name: string;
  status: "complete" | "in_progress" | "planned";
  progress: number;
  completedFeatures?: string[];
  inProgressFeatures?: string[];
  plannedFeatures?: string[];
}

interface SystemHealth {
  slaCompliance: number;
  activeServices: number;
  averageCompletionHours: number;
  slaBreaches: number;
  onTimeDeliveries: number;
}

interface MonitoringStatus {
  slaMonitoringActive: boolean;
  systemUptime: number;
  lastUpdate: Date;
  activeTimers: number;
}

interface NextAction {
  action: string;
  estimatedMinutes: number;
  priority: "high" | "medium" | "low";
  dependencies: string[];
}

interface ArchitectureStatus {
  databaseTables: number;
  apiEndpoints: number;
  stakeholderInterfaces: number;
  securityLayers: string;
  scalabilityStatus: string;
}

export default function MasterBlueprintDashboard() {
  const { data: blueprintStatus, isLoading } = useQuery<BlueprintStatus>({
    queryKey: ["/api/master-blueprint/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: slaMetrics } = useQuery<SlaMetrics>({
    queryKey: ["/api/sla/metrics"],
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading Master Blueprint Status...</p>
        </div>
      </div>
    );
  }

  if (!blueprintStatus) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Blueprint Status Unavailable</h3>
            <p className="text-muted-foreground">Unable to load master blueprint status</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case "complete": return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in_progress": return <PlayCircle className="h-5 w-5 text-blue-600" />;
      case "planned": return <Clock className="h-5 w-5 text-gray-400" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "planned": return "bg-gray-100 text-gray-600 border-gray-200";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">DigiComply Master Blueprint</h1>
        <p className="text-xl text-muted-foreground mb-4">{blueprintStatus.currentPhase}</p>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold">{blueprintStatus.overallProgress}%</span>
          </div>
          <Progress value={blueprintStatus.overallProgress} className="h-3" />
        </div>
      </div>

      <Tabs defaultValue="phases" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="phases">Phases</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="actions">Next Actions</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
        </TabsList>

        {/* Phase Status Tab */}
        <TabsContent value="phases" className="space-y-6">
          <div className="grid gap-6">
            {Object.entries(blueprintStatus.phases).map(([phaseKey, phase]) => (
              <Card key={phaseKey} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getPhaseIcon(phase.status)}
                      <div>
                        <CardTitle className="text-lg">{phase.name}</CardTitle>
                        <CardDescription>
                          <Badge className={getStatusColor(phase.status)} variant="outline">
                            {phase.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{phase.progress}%</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={phase.progress} className="h-2" />
                  
                  {phase.completedFeatures && phase.completedFeatures.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-green-700 mb-2 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Completed Features
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {phase.completedFeatures.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {phase.inProgressFeatures && phase.inProgressFeatures.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-blue-700 mb-2 flex items-center">
                        <PlayCircle className="h-4 w-4 mr-2" />
                        In Progress
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {phase.inProgressFeatures.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <PlayCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {phase.plannedFeatures && phase.plannedFeatures.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Planned Features
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {phase.plannedFeatures.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {blueprintStatus.systemHealth.slaCompliance.toFixed(1)}%
                </div>
                <Progress value={blueprintStatus.systemHealth.slaCompliance} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Services</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {blueprintStatus.systemHealth.activeServices}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Currently processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {blueprintStatus.systemHealth.averageCompletionHours.toFixed(1)}h
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Average turnaround
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {blueprintStatus.systemHealth.onTimeDeliveries}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  vs {blueprintStatus.systemHealth.slaBreaches} breaches
                </p>
              </CardContent>
            </Card>
          </div>

          {slaMetrics && slaMetrics.serviceTypeBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle>Service Type Performance</CardTitle>
                <CardDescription>SLA compliance by service category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(slaMetrics.serviceTypeBreakdown).map(([serviceType, metrics]) => {
                    const onTime = metrics.onTime ?? 0;
                    const total = metrics.total ?? 0;
                    const complianceRate = metrics.complianceRate ?? 0;

                    return (
                      <div key={serviceType} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium capitalize">{serviceType.replace('_', ' ')}</span>
                          <div className="text-sm text-muted-foreground">
                            {onTime}/{total} ({complianceRate.toFixed(1)}%)
                          </div>
                        </div>
                        <Progress value={complianceRate} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SLA Monitoring</CardTitle>
                <div className={`w-3 h-3 rounded-full ${blueprintStatus.monitoring.slaMonitoringActive ? 'bg-green-500' : 'bg-red-500'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {blueprintStatus.monitoring.slaMonitoringActive ? 'Active' : 'Inactive'}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Real-time SLA tracking
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {formatUptime(blueprintStatus.monitoring.systemUptime)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Continuous operation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Timers</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {blueprintStatus.monitoring.activeTimers}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Services being tracked
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Last updated: {new Date(blueprintStatus.monitoring.lastUpdate).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Enhanced SLA System</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Operational</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <GitBranch className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Workflow Validation</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Database className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Database Synchronization</span>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800">Healthy</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Next Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Immediate Next Actions</CardTitle>
              <CardDescription>Priority tasks for the next 60-180 minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {blueprintStatus.nextActions.map((action, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{action.action}</h4>
                      <Badge className={getPriorityColor(action.priority)} variant="outline">
                        {action.priority.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{action.estimatedMinutes} minutes</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>ETA: {new Date(Date.now() + action.estimatedMinutes * 60000).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {action.dependencies.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Dependencies:</p>
                        <div className="flex flex-wrap gap-2">
                          {action.dependencies.map((dep, depIndex) => (
                            <Badge key={depIndex} variant="secondary" className="text-xs">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Architecture Tab */}
        <TabsContent value="architecture" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Tables</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{blueprintStatus.architecture.databaseTables}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Comprehensive data model
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Endpoints</CardTitle>
                <GitBranch className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{blueprintStatus.architecture.apiEndpoints}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Including enhanced SLA & workflow APIs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stakeholder Interfaces</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{blueprintStatus.architecture.stakeholderInterfaces}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Complete ecosystem portals
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Architecture Overview</CardTitle>
              <CardDescription>Current platform architecture status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Security</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {blueprintStatus.architecture.securityLayers}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Scalability</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {blueprintStatus.architecture.scalabilityStatus}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Key Components</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>4-Stakeholder Portal Ecosystem</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Enhanced SLA Management Engine</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Workflow Dependency Validation</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Real-time Monitoring & Alerts</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <PlayCircle className="h-4 w-4 text-blue-600" />
                      <span>Government Portal Integration</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>Predictive Analytics Engine</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}