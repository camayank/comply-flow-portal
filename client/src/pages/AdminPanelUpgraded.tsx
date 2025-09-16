import { useState, useEffect } from "react";
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
  MobileContent,
  MobileCard
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
  Home,
  ChevronRight
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

interface SystemAlert {
  id: number;
  type: "sla_breach" | "system_error" | "performance" | "security";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: string;
  isResolved: boolean;
}

export default function AdminPanelUpgraded() {
  const [activeTab, setActiveTab] = useState("overview");
  const [adminRole] = useState("super_admin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data
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

  // Tab configuration for mobile and desktop
  const tabConfig = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "services", label: "Services", icon: <Settings className="h-4 w-4" /> },
    { id: "workflows", label: "Workflows", icon: <Workflow className="h-4 w-4" /> },
    { id: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { id: "analytics", label: "Analytics", icon: <Activity className="h-4 w-4" /> },
    { id: "system", label: "System", icon: <Database className="h-4 w-4" /> },
  ];

  // Mobile navigation items
  const mobileNavItems = tabConfig.map(tab => ({
    id: tab.id,
    label: tab.label,
    icon: tab.icon,
    active: activeTab === tab.id,
    onClick: () => setActiveTab(tab.id)
  }));

  // Filter options for dashboard
  const filterOptions = [
    { value: "all", label: "All Items" },
    { value: "critical", label: "Critical" },
    { value: "high", label: "High Priority" },
    { value: "active", label: "Active" },
    { value: "pending", label: "Pending" }
  ];

  // System Overview Dashboard
  const SystemOverview = () => (
    <div className="space-y-6">
      {/* System Alerts */}
      {mockAlerts.length > 0 && (
        <AlertCard
          type="error"
          title={`System Alerts (${mockAlerts.length})`}
          message="Multiple system issues require immediate attention"
          actions={
            <>
              <Button size="sm" variant="outline" data-testid="button-view-alerts">
                View All
              </Button>
              <Button size="sm" data-testid="button-resolve-alerts">
                Resolve
              </Button>
            </>
          }
        />
      )}
      
      {/* Metrics Grid */}
      <DashboardGrid>
        <MetricCard
          title="Total Services"
          value={mockMetrics.totalServices}
          subtitle="Services in catalogue"
          icon={<FileText className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Active Services"
          value={mockMetrics.activeServices}
          subtitle="Currently processing"
          icon={<Activity className="h-5 w-5" />}
          color="green"
          trend={{ direction: "up", value: "+12% from last month" }}
        />
        <MetricCard
          title="SLA Compliance"
          value={`${mockMetrics.slaCompliance}%`}
          subtitle="On-time delivery rate"
          icon={<Target className="h-5 w-5" />}
          color={mockMetrics.slaCompliance > 90 ? "green" : "orange"}
          trend={{ direction: mockMetrics.slaCompliance > 90 ? "up" : "down", value: "94.2% this month" }}
        />
        <MetricCard
          title="Team Utilization"
          value={`${mockMetrics.teamUtilization}%`}
          subtitle="Resource efficiency"
          icon={<Users className="h-5 w-5" />}
          color="purple"
        />
      </DashboardGrid>
      
      <DashboardGrid className="lg:grid-cols-2">
        <MetricCard
          title="Revenue This Month"
          value={`₹${(mockMetrics.revenueThisMonth / 100000).toFixed(1)}L`}
          subtitle="Monthly recurring revenue"
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
          trend={{ direction: "up", value: "+18% from last month" }}
        />
        <MetricCard
          title="Client Satisfaction"
          value={`${mockMetrics.clientSatisfaction}/5`}
          subtitle="Average rating"
          icon={<Star className="h-5 w-5" />}
          color="orange"
        />
      </DashboardGrid>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-recent-activity">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      alert.severity === 'critical' ? 'bg-red-500' :
                      alert.severity === 'high' ? 'bg-orange-500' :
                      'bg-yellow-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {alert.timestamp}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={alert.severity} variant="compact" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" data-testid="button-add-service">
                <Plus className="h-5 w-5" />
                <span className="text-sm">Add Service</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" data-testid="button-manage-users">
                <UserCheck className="h-5 w-5" />
                <span className="text-sm">Manage Users</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" data-testid="button-system-health">
                <Monitor className="h-5 w-5" />
                <span className="text-sm">System Health</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col gap-2" data-testid="button-reports">
                <PieChart className="h-5 w-5" />
                <span className="text-sm">Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Service Management Tab
  const ServiceManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Service Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage service catalog and configurations</p>
        </div>
        <Button data-testid="button-add-new-service">
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      <DashboardGrid className="lg:grid-cols-3">
        {mockServiceCatalogue.map((service) => (
          <Card key={service.id} className="hover:shadow-md transition-shadow" data-testid={`card-service-${service.serviceCode}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{service.serviceName}</CardTitle>
                <StatusBadge status={service.isActive ? "active" : "inactive"} />
              </div>
              <CardDescription>{service.serviceCode}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Category:</span>
                  <Badge variant="outline">{service.category}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">SLA:</span>
                  <span>{service.standardSLA} hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                  <span>₹{service.estimatedCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Complexity:</span>
                  <Badge 
                    className={
                      service.complexity === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                      service.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    }
                  >
                    {service.complexity}
                  </Badge>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" data-testid={`button-edit-${service.serviceCode}`}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" data-testid={`button-view-${service.serviceCode}`}>
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </DashboardGrid>
    </div>
  );

  // Placeholder components for other tabs
  const WorkflowBuilder = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Workflow Builder</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Workflow builder functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const UserManagement = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 dark:text-gray-400">User management functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const SystemAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Analytics</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Analytics dashboard coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const SystemHealth = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 dark:text-gray-400">System health monitoring coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <MobileLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader
          title="Admin Control"
          subtitle="Platform configuration"
          leftIcon={<Shield className="h-6 w-6" />}
          notifications={mockAlerts.length}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          rightActions={
            <Button size="sm" variant="outline" className="text-xs px-3" data-testid="button-settings-mobile">
              <Settings className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          }
        />
        
        <MobileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabConfig}
        />
        
        <MobileNavigationMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          items={mobileNavItems}
        />
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">System Control</p>
              </div>
            </div>
            
            <nav className="space-y-2">
              {tabConfig.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  data-testid={`nav-${tab.id}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <DashboardHeader
            title="System Dashboard"
            subtitle="Monitor and manage your platform"
            notifications={mockAlerts.length}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" data-testid="button-export-desktop">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" data-testid="button-settings-desktop">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            }
          />
          
          <DashboardContent>
            <DashboardTabs defaultValue={activeTab}>
              <TabsContent value="overview" className="space-y-6">
                <DashboardFilters
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  filterValue={filterBy}
                  onFilterChange={setFilterBy}
                  filterOptions={filterOptions}
                />
                <SystemOverview />
              </TabsContent>

              <TabsContent value="services" className="space-y-6">
                <ServiceManagement />
              </TabsContent>

              <TabsContent value="workflows" className="space-y-6">
                <WorkflowBuilder />
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <UserManagement />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <SystemAnalytics />
              </TabsContent>

              <TabsContent value="system" className="space-y-6">
                <SystemHealth />
              </TabsContent>
            </DashboardTabs>
          </DashboardContent>
        </main>
      </div>
      
      {/* Mobile Content */}
      <div className="lg:hidden">
        <MobileContent>
          {activeTab === 'overview' && <SystemOverview />}
          {activeTab === 'services' && <ServiceManagement />}
          {activeTab === 'workflows' && <WorkflowBuilder />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'analytics' && <SystemAnalytics />}
          {activeTab === 'system' && <SystemHealth />}
        </MobileContent>
      </div>
    </MobileLayout>
  );
}