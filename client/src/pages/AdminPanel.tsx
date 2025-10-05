import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  DashboardHeader,
  DashboardContent,
  DashboardGrid,
  DashboardTabs,
  MetricCard,
  AlertCard,
  StatusBadge,
  DashboardFilters
} from "@/components/ui/dashboard-layout";
import {
  MobileHeader,
  MobileNavigationMenu,
  MobileTabs,
  MobileLayout,
  MobileContent
} from "@/components/ui/mobile-navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Users,
  Settings,
  BarChart3,
  Workflow,
  Clock,
  AlertTriangle,
  Eye,
  Database,
  Globe,
  Zap,
  TrendingUp,
  FileText,
  CheckCircle2,
  XCircle,
  Activity,
  Filter,
  Search,
  Download,
  Upload,
  Edit,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  Bell,
  Lock,
  Unlock,
  Monitor,
  PieChart,
  LineChart,
  Target,
  Calendar,
  Timer,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Palette,
  Key,
  AlertCircle,
  HardDrive,
  Network,
  Cpu,
  MemoryStick,
  UserCheck,
  UserX,
  Building,
  MapPin,
  Phone,
  Mail,
  Hash,
  DollarSign,
  Percent,
  Star,
  Briefcase,
  Route,
  GitBranch,
  PlayCircle,
  PauseCircle,
  StopCircle,
  SkipForward,
  Repeat,
  Code,
  Layers,
  Link2,
  Boxes,
} from "lucide-react";

// Types for Admin Panel
interface AdminMetrics {
  totalServices: number;
  activeServices: number;
  slaCompliance: number;
  teamUtilization: number;
  revenueThisMonth: number;
  clientSatisfaction: number;
}

interface ServiceCatalogueItem {
  id: number;
  serviceCode: string;
  serviceName: string;
  category: string;
  standardSLA: number;
  estimatedCost: number;
  complexity: "low" | "medium" | "high";
  isActive: boolean;
  dependencies: string[];
}

interface WorkflowStep {
  id: string;
  name: string;
  type: "task" | "approval" | "client_action" | "integration";
  estimatedHours: number;
  dependencies: string[];
  assigneeRole: string;
  isParallel: boolean;
}

interface SystemAlert {
  id: number;
  type: "sla_breach" | "system_error" | "performance" | "security";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: string;
  isResolved: boolean;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [adminRole] = useState("super_admin"); // Would come from auth context
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for demonstration - would come from API
  const mockMetrics: AdminMetrics = {
    totalServices: 1247,
    activeServices: 184,
    slaCompliance: 94.2,
    teamUtilization: 87.5,
    revenueThisMonth: 2847600,
    clientSatisfaction: 4.8,
  };

  const mockServiceCatalogue: ServiceCatalogueItem[] = [
    {
      id: 1,
      serviceCode: "COMP_INC",
      serviceName: "Company Incorporation",
      category: "incorporation",
      standardSLA: 72,
      estimatedCost: 15999,
      complexity: "medium",
      isActive: true,
      dependencies: [],
    },
    {
      id: 2,
      serviceCode: "GST_REG",
      serviceName: "GST Registration",
      category: "tax",
      standardSLA: 48,
      estimatedCost: 8999,
      complexity: "low",
      isActive: true,
      dependencies: ["COMP_INC"],
    },
  ];

  const mockAlerts: SystemAlert[] = [
    {
      id: 1,
      type: "sla_breach",
      severity: "high",
      message: "5 services approaching SLA deadline in next 4 hours",
      timestamp: "2024-01-15 10:30",
      isResolved: false,
    },
    {
      id: 2,
      type: "performance",
      severity: "medium",
      message: "Team utilization above 90% - consider load balancing",
      timestamp: "2024-01-15 09:15",
      isResolved: false,
    },
  ];

  // Requirement 17: Live Service Dashboard
  const LiveServiceDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Overview</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Alerts */}
      {mockAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              System Alerts ({mockAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                      {alert.severity}
                    </Badge>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                    <Button size="sm" variant="ghost">
                      <CheckCircle2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Services</p>
                <p className="text-2xl font-bold">{mockMetrics.totalServices.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Now</p>
                <p className="text-2xl font-bold text-green-600">{mockMetrics.activeServices}</p>
              </div>
              <PlayCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Compliance</p>
                <p className="text-2xl font-bold">{mockMetrics.slaCompliance}%</p>
                <Progress value={mockMetrics.slaCompliance} className="mt-1" />
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Utilization</p>
                <p className="text-2xl font-bold">{mockMetrics.teamUtilization}%</p>
                <Progress value={mockMetrics.teamUtilization} className="mt-1" />
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue (Month)</p>
                <p className="text-2xl font-bold">₹{(mockMetrics.revenueThisMonth / 100000).toFixed(1)}L</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Client Rating</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {mockMetrics.clientSatisfaction}
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DigiComply Products - Quick Access */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">DigiComply AI Products</h3>
          <Badge variant="outline" className="text-green-600 border-green-600">3 Available</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/autocomply">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-background">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                  <Badge className="bg-green-500">Available</Badge>
                </div>
                <h4 className="text-lg font-semibold mb-2">AutoComply</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  AI-Powered Workflow Automation Builder
                </p>
                <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                  <span>Launch Product</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/taxtracker">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-green-200 bg-gradient-to-br from-green-50 to-white dark:from-green-900/10 dark:to-background">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <Badge className="bg-green-500">Available</Badge>
                </div>
                <h4 className="text-lg font-semibold mb-2">TaxTracker</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  AI-Driven Multi-Entity Filing Tracker
                </p>
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  <span>Launch Product</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/digiscore">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-background">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge className="bg-green-500">Available</Badge>
                </div>
                <h4 className="text-lg font-semibold mb-2">DigiScore</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Automated Compliance Health Score
                </p>
                <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                  <span>Launch Product</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Real-time Service Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Service Health Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "On Track", count: 156, percentage: 84.8, color: "text-green-500" },
                { name: "At Risk", count: 18, percentage: 9.8, color: "text-yellow-500" },
                { name: "Delayed", count: 10, percentage: 5.4, color: "text-red-500" },
              ].map((status) => (
                <div key={status.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-current ${status.color}`} />
                    <span className="font-medium">{status.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{status.count} services</span>
                    <span className={`text-sm font-medium ${status.color}`}>
                      {status.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Bottleneck Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { task: "Document Verification", count: 12, avgDelay: "2.3h" },
                { task: "Client Response", count: 8, avgDelay: "18.5h" },
                { task: "Government Portal Sync", count: 5, avgDelay: "4.2h" },
              ].map((bottleneck, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <p className="font-medium text-sm">{bottleneck.task}</p>
                    <p className="text-xs text-muted-foreground">
                      {bottleneck.count} instances
                    </p>
                  </div>
                  <Badge variant="outline">{bottleneck.avgDelay} avg delay</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Requirement 4: Service Catalogue Management
  const ServiceCatalogueManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Service Catalogue</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mockServiceCatalogue.map((service) => (
          <Card key={service.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{service.serviceCode}</Badge>
                  <div>
                    <h3 className="font-semibold">{service.serviceName}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {service.category} • {service.complexity} complexity
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={service.isActive} />
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Standard SLA</Label>
                  <p className="font-medium">{service.standardSLA} hours</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estimated Cost</Label>
                  <p className="font-medium">₹{service.estimatedCost.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dependencies</Label>
                  <p className="text-sm">
                    {service.dependencies.length > 0 ? service.dependencies.join(", ") : "None"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={service.isActive ? "default" : "secondary"}>
                    {service.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Requirement 8: No-Code Workflow Builder
  const WorkflowBuilder = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Workflow Builder</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <GitBranch className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Canvas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Company Incorporation Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted rounded-lg h-96 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Workflow className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Drag & Drop Workflow Builder</p>
                <p className="text-xs text-muted-foreground">
                  Visual workflow editor would be integrated here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Components */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Components</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {[
                  { icon: FileText, name: "Document Collection", type: "task" },
                  { icon: CheckCircle2, name: "Approval Node", type: "approval" },
                  { icon: Users, name: "Client Action", type: "client_action" },
                  { icon: Globe, name: "Government Portal", type: "integration" },
                  { icon: Bell, name: "Notification", type: "notification" },
                  { icon: Timer, name: "Delay/Wait", type: "delay" },
                  { icon: GitBranch, name: "Conditional Branch", type: "condition" },
                  { icon: Repeat, name: "Loop/Repeat", type: "loop" },
                ].map((component, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent"
                  >
                    <component.icon className="h-4 w-4" />
                    <span className="text-sm">{component.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {component.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Company Incorporation", steps: 8, avgTime: "72h", usage: 156 },
              { name: "GST Registration", steps: 5, avgTime: "48h", usage: 89 },
              { name: "License Renewal", steps: 6, avgTime: "36h", usage: 67 },
            ].map((template, index) => (
              <Card key={index} className="cursor-pointer hover:bg-accent">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{template.name}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Steps:</span>
                      <span>{template.steps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Time:</span>
                      <span>{template.avgTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Usage:</span>
                      <span>{template.usage} times</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <PlayCircle className="h-3 w-3 mr-1" />
                      Deploy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Requirement 26: Team Performance Metrics & 27: Service Analytics
  const AnalyticsReporting = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics & Reporting</h2>
        <div className="flex gap-2">
          <Select defaultValue="30days">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 Days</SelectItem>
              <SelectItem value="30days">30 Days</SelectItem>
              <SelectItem value="90days">90 Days</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg SLA Compliance</p>
                <p className="text-2xl font-bold">94.2%</p>
                <div className="flex items-center text-xs text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  +2.3% vs last month
                </div>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Turnaround</p>
                <p className="text-2xl font-bold">2.8d</p>
                <div className="flex items-center text-xs text-green-600">
                  <ArrowDown className="h-3 w-3" />
                  -4.2h vs last month
                </div>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">3.1%</p>
                <div className="flex items-center text-xs text-green-600">
                  <ArrowDown className="h-3 w-3" />
                  -0.8% vs last month
                </div>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Client Retention</p>
                <p className="text-2xl font-bold">96.7%</p>
                <div className="flex items-center text-xs text-green-600">
                  <ArrowUp className="h-3 w-3" />
                  +1.2% vs last month
                </div>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Service Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Company Incorporation", completed: 45, sla: 97.8, revenue: 719550 },
                { name: "GST Registration", completed: 32, sla: 93.2, revenue: 287680 },
                { name: "License Renewal", completed: 28, sla: 96.4, revenue: 224000 },
              ].map((service, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{service.name}</span>
                    <Badge variant="outline">{service.completed} completed</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">SLA: </span>
                      <span className="font-medium">{service.sla}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Revenue: </span>
                      <span className="font-medium">₹{service.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                  <Progress value={service.sla} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Priya Sharma", role: "Ops Lead", completed: 23, sla: 98.1, rating: 4.9 },
                { name: "Rajesh Kumar", role: "Ops Executive", completed: 19, sla: 94.7, rating: 4.6 },
                { name: "Amit Singh", role: "Ops Executive", completed: 17, sla: 92.3, rating: 4.4 },
              ].map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{member.completed}</span>
                      <span className="text-muted-foreground">tasks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{member.sla}% SLA</span>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="ml-1">{member.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Agent Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Mumbai West", agent: "Ravi Patel", leads: 45, converted: 23, commission: 67800 },
              { name: "Delhi NCR", agent: "Neha Gupta", leads: 38, converted: 19, commission: 54200 },
              { name: "Bangalore", agent: "Suresh Kumar", leads: 42, converted: 21, commission: 61500 },
            ].map((territory, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold">{territory.name}</h3>
                      <p className="text-sm text-muted-foreground">{territory.agent}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Leads Generated:</span>
                        <span className="font-medium">{territory.leads}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Converted:</span>
                        <span className="font-medium">{territory.converted}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Conversion Rate:</span>
                        <span className="font-medium">
                          {((territory.converted / territory.leads) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Commission:</span>
                        <span className="font-medium">₹{territory.commission.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Requirement 31: Integration Management & 32: Notification Rules
  const SystemConfiguration = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">System Configuration</h2>
      
      <Tabs defaultValue="integrations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                API Integrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "MCA Portal", status: "healthy", lastSync: "2 mins ago", endpoint: "https://mca.gov.in/api" },
                  { name: "GSTN Portal", status: "healthy", lastSync: "5 mins ago", endpoint: "https://gstn.org.in/api" },
                  { name: "EPFO Portal", status: "error", lastSync: "2 hours ago", endpoint: "https://epfo.gov.in/api" },
                  { name: "Razorpay", status: "healthy", lastSync: "1 min ago", endpoint: "https://api.razorpay.com" },
                ].map((integration, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        integration.status === "healthy" ? "bg-green-500" : 
                        integration.status === "error" ? "bg-red-500" : "bg-yellow-500"
                      }`} />
                      <div>
                        <h3 className="font-semibold">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground">{integration.endpoint}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Last sync: {integration.lastSync}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  {
                    name: "SLA Breach Warning",
                    description: "Alert when service approaches SLA deadline",
                    channels: ["email", "whatsapp", "in_app"],
                    recipients: ["ops_lead", "admin"],
                    isActive: true,
                  },
                  {
                    name: "Client Delay Alert",
                    description: "Notify when client hasn't responded for 24+ hours",
                    channels: ["email", "whatsapp"],
                    recipients: ["ops_executive", "client"],
                    isActive: true,
                  },
                  {
                    name: "Quality Issue",
                    description: "Alert on QA rejection or rework requirement",
                    channels: ["email", "in_app"],
                    recipients: ["ops_lead", "qa_reviewer"],
                    isActive: true,
                  },
                ].map((rule, index) => (
                  <div key={index} className="p-4 border rounded space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{rule.name}</h3>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                      <Switch checked={rule.isActive} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-medium">Channels</Label>
                        <div className="flex gap-1 mt-1">
                          {rule.channels.map((channel) => (
                            <Badge key={channel} variant="outline" className="text-xs">
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Recipients</Label>
                        <div className="flex gap-1 mt-1">
                          {rule.recipients.map((recipient) => (
                            <Badge key={recipient} variant="secondary" className="text-xs">
                              {recipient}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Company Name</Label>
                    <Input defaultValue="DigiComply Solutions Private Limited" />
                  </div>
                  <div>
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" defaultValue="#3b82f6" className="w-16 h-10" />
                      <Input defaultValue="#3b82f6" className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" defaultValue="#64748b" className="w-16 h-10" />
                      <Input defaultValue="#64748b" className="flex-1" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Logo Upload</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Upload company logo</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Choose File
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Email Signature</Label>
                    <Textarea 
                      placeholder="Email signature for automated communications..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Require 2FA for admin access</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div>
                    <Label>Session Timeout (minutes)</Label>
                    <Input type="number" defaultValue="60" />
                  </div>
                  <div>
                    <Label>IP Restrictions</Label>
                    <Textarea 
                      placeholder="Enter allowed IP addresses (one per line)..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Automatic Backups</Label>
                      <p className="text-sm text-muted-foreground">Daily database backups</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div>
                    <Label>Data Retention (days)</Label>
                    <Input type="number" defaultValue="2555" />
                  </div>
                  <div>
                    <Label>Encryption Level</Label>
                    <Select defaultValue="aes256">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aes128">AES-128</SelectItem>
                        <SelectItem value="aes256">AES-256</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  //  User Management Component
  const UserManagement = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: users = [], isLoading } = useQuery({
      queryKey: ['/api/admin/users'],
    });

    const { data: userStats } = useQuery({
      queryKey: ['/api/admin/users/stats/summary'],
    });

    const createUserMutation = useMutation({
      mutationFn: (userData: any) => apiRequest('/api/admin/users', 'POST', userData),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users/stats/summary'] });
        toast({ title: "Success", description: "User created successfully" });
        setShowCreateModal(false);
      },
      onError: (error: any) => {
        toast({ 
          title: "Error", 
          description: error.message || "Failed to create user",
          variant: "destructive" 
        });
      },
    });

    const updateUserMutation = useMutation({
      mutationFn: ({ id, ...userData }: any) => apiRequest(`/api/admin/users/${id}`, 'PATCH', userData),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        toast({ title: "Success", description: "User updated successfully" });
        setSelectedUser(null);
      },
      onError: (error: any) => {
        toast({ 
          title: "Error", 
          description: error.message || "Failed to update user",
          variant: "destructive" 
        });
      },
    });

    const deactivateUserMutation = useMutation({
      mutationFn: (userId: number) => apiRequest(`/api/admin/users/${userId}`, 'DELETE', {}),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        toast({ title: "Success", description: "User deactivated successfully" });
      },
      onError: (error: any) => {
        toast({ 
          title: "Error", 
          description: error.message || "Failed to deactivate user",
          variant: "destructive" 
        });
      },
    });

    const filteredUsers = users.filter((user: any) => {
      const matchesSearch = 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || user.role === filterRole;
      return matchesSearch && matchesRole;
    });

    const getRoleBadgeColor = (role: string) => {
      switch (role) {
        case 'super_admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        case 'admin': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
        case 'ops_executive': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case 'customer_service': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case 'agent': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
        case 'client': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getRoleDisplayName = (role: string) => {
      switch (role) {
        case 'super_admin': return 'Super Admin';
        case 'admin': return 'Admin';
        case 'ops_executive': return 'Ops Executive';
        case 'customer_service': return 'Customer Service';
        case 'agent': return 'Agent';
        case 'client': return 'Client';
        default: return role;
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">User Management</h2>
            <p className="text-sm text-muted-foreground">
              Create and manage user accounts across all roles
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-user">
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{userStats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{userStats.byRole?.super_admin || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{userStats.byRole?.admin || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ops Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{userStats.byRole?.ops_executive || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{userStats.byRole?.client || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Users</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-users"
                  />
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-48" data-testid="select-filter-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="ops_executive">Ops Executive</SelectItem>
                    <SelectItem value="customer_service">Customer Service</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`user-row-${user.id}`}>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {user.fullName?.split(' ').map((n: string) => n[0]).join('') || user.username?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold" data-testid={`text-username-${user.id}`}>{user.fullName || user.username}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                          {user.department && (
                            <Badge variant="outline">{user.department}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          <UserX className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                        data-testid={`button-edit-user-${user.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.isActive && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deactivateUserMutation.mutate(user.id)}
                          data-testid={`button-deactivate-user-${user.id}`}
                        >
                          <UserX className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found matching your criteria
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {showCreateModal && <CreateUserModal onClose={() => setShowCreateModal(false)} onCreate={createUserMutation.mutate} />}
        {selectedUser && <EditUserModal user={selectedUser} onClose={() => setSelectedUser(null)} onUpdate={updateUserMutation.mutate} />}
      </div>
    );
  };

  const CreateUserModal = ({ onClose, onCreate }: any) => {
    const [formData, setFormData] = useState({
      username: '',
      email: '',
      password: '',
      fullName: '',
      phone: '',
      role: 'client',
      department: '',
      isActive: true,
    });

    const handleSubmit = (e: any) => {
      e.preventDefault();
      onCreate(formData);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
            <CardDescription>Add a new user to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    data-testid="input-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    data-testid="input-fullname"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    data-testid="input-department"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="ops_executive">Ops Executive</SelectItem>
                    <SelectItem value="customer_service">Customer Service</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-active"
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-create">
                  Create User
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  };

  const EditUserModal = ({ user, onClose, onUpdate }: any) => {
    const [formData, setFormData] = useState({
      username: user.username || '',
      email: user.email || '',
      fullName: user.fullName || '',
      phone: user.phone || '',
      role: user.role || 'client',
      department: user.department || '',
      isActive: user.isActive !== false,
    });

    const handleSubmit = (e: any) => {
      e.preventDefault();
      onUpdate({ id: user.id, ...formData });
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Edit User</CardTitle>
            <CardDescription>Update user information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-fullName">Full Name</Label>
                  <Input
                    id="edit-fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="ops_executive">Ops Executive</SelectItem>
                      <SelectItem value="customer_service">Customer Service</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <Input
                    id="edit-department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update User
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Requirement 2: Role Management
  const RoleManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Role Management</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Super Admin", users: 2, permissions: 45, color: "bg-red-500" },
                { name: "Admin", users: 3, permissions: 32, color: "bg-orange-500" },
                { name: "Ops Lead", users: 5, permissions: 24, color: "bg-blue-500" },
                { name: "Ops Executive", users: 12, permissions: 18, color: "bg-green-500" },
                { name: "QA Reviewer", users: 4, permissions: 15, color: "bg-purple-500" },
                { name: "Agent", users: 28, permissions: 8, color: "bg-yellow-500" },
                { name: "Viewer", users: 7, permissions: 5, color: "bg-gray-500" },
              ].map((role, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${role.color}`} />
                    <div>
                      <h3 className="font-semibold">{role.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {role.users} users • {role.permissions} permissions
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Users className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permission Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { module: "Client Management", permissions: ["view", "edit", "delete"] },
                { module: "Service Operations", permissions: ["view", "assign", "complete"] },
                { module: "Team Management", permissions: ["view", "edit"] },
                { module: "System Configuration", permissions: ["view"] },
                { module: "Analytics & Reports", permissions: ["view", "export"] },
                { module: "Workflow Builder", permissions: ["view"] },
              ].map((module, index) => (
                <div key={index} className="space-y-2">
                  <Label className="font-medium">{module.module}</Label>
                  <div className="flex gap-2">
                    {module.permissions.map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold">DigiComply Admin Control</h1>
              <p className="text-sm text-muted-foreground">
                Central command center for service orchestration and system oversight
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Alerts
                <Badge className="ml-2" variant="destructive">
                  {mockAlerts.length}
                </Badge>
              </Button>
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </Button>
              <Avatar>
                <AvatarFallback>SA</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Workflows
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Config
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <LiveServiceDashboard />
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <ServiceCatalogueManagement />
          </TabsContent>

          <TabsContent value="workflows" className="mt-6">
            <WorkflowBuilder />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsReporting />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <SystemConfiguration />
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <RoleManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}