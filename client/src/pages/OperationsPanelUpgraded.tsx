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
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  MessageSquare,
  FileText,
  ArrowRight,
  Filter,
  Search,
  Bell,
  Activity,
  BarChart3,
  BookOpen,
  Link,
  UserX,
  Archive,
  AlertTriangle,
  Timer,
  Target,
  TrendingUp,
  Zap,
  Users,
  Eye,
  CheckCheck,
  XCircle,
  RefreshCw,
  Send,
  AtSign,
  Paperclip,
  Download,
  Upload,
  Settings,
  Shield,
  Lock,
  Star,
  ThumbsUp,
  ThumbsDown,
  Package,
  ExternalLink,
  Home,
  PlayCircle,
  PauseCircle,
  Edit,
  Trash2,
  Plus,
  ChevronRight,
  Building2,
  ListChecks,
  Workflow,
  UserCheck,
  Database,
  PieChart
} from "lucide-react";

// Types for Operations Panel
interface OpsTask {
  id: number;
  serviceRequestId: number;
  taskName: string;
  description: string;
  status: "to_do" | "in_progress" | "waiting" | "completed" | "rework_required";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  assignedTo: number;
  estimatedHours: number;
  actualHours?: number;
  dependencies: number[];
  qaRequired: boolean;
  qaStatus: "pending" | "approved" | "rejected";
  reworkCount: number;
  clientName: string;
  serviceType: string;
  slaTimeRemaining: number; // hours
}

interface PerformanceData {
  tasksCompleted: number;
  slaCompliance: number;
  errorRate: number;
  avgCompletionTime: number;
  teamUtilization: number;
  todayTasks: number;
  overdueItems: number;
}

interface KnowledgeBaseItem {
  id: number;
  title: string;
  category: string;
  serviceType: string;
  content: string;
  quickLinks: string[];
  viewCount: number;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  currentTasks: number;
  completedToday: number;
  utilization: number;
  isOnline: boolean;
}

export default function OperationsPanelUpgraded() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTask, setSelectedTask] = useState<OpsTask | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [userRole] = useState("ops_executive");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for demonstration
  const mockTasks: OpsTask[] = [
    {
      id: 1,
      serviceRequestId: 101,
      taskName: "Company Incorporation - Document Verification",
      description: "Verify all incorporation documents and prepare MOA/AOA",
      status: "in_progress",
      priority: "high",
      dueDate: "2024-01-20",
      assignedTo: 1,
      estimatedHours: 4,
      actualHours: 2,
      dependencies: [],
      qaRequired: true,
      qaStatus: "pending",
      reworkCount: 0,
      clientName: "Tech Solutions Pvt Ltd",
      serviceType: "Company Incorporation",
      slaTimeRemaining: 12,
    },
    {
      id: 2,
      serviceRequestId: 102,
      taskName: "GST Registration - Portal Filing",
      description: "Complete GST registration on govt portal",
      status: "waiting",
      priority: "urgent",
      dueDate: "2024-01-18",
      assignedTo: 1,
      estimatedHours: 3,
      dependencies: [1],
      qaRequired: false,
      qaStatus: "pending",
      reworkCount: 1,
      clientName: "Digital Marketing Co",
      serviceType: "GST Registration",
      slaTimeRemaining: 8,
    },
    {
      id: 3,
      serviceRequestId: 103,
      taskName: "Annual Filing - ROC Submission",
      description: "Prepare and submit annual returns",
      status: "to_do",
      priority: "medium",
      dueDate: "2024-01-25",
      assignedTo: 2,
      estimatedHours: 6,
      dependencies: [],
      qaRequired: true,
      qaStatus: "pending",
      reworkCount: 0,
      clientName: "Startup Inc",
      serviceType: "Annual Filing",
      slaTimeRemaining: 32,
    }
  ];

  const mockPerformance: PerformanceData = {
    tasksCompleted: 27,
    slaCompliance: 94.2,
    errorRate: 5.8,
    avgCompletionTime: 3.2,
    teamUtilization: 87.5,
    todayTasks: 8,
    overdueItems: 3
  };

  const mockKnowledgeBase: KnowledgeBaseItem[] = [
    {
      id: 1,
      title: "Company Incorporation SOP",
      category: "sop",
      serviceType: "Company Incorporation",
      content: "Step-by-step process for company incorporation...",
      quickLinks: ["https://mca.gov.in", "https://incometaxindia.gov.in"],
      viewCount: 156,
    },
    {
      id: 2,
      title: "GST Registration Checklist",
      category: "template",
      serviceType: "GST Registration",
      content: "Required documents and verification process...",
      quickLinks: ["https://gstn.org.in"],
      viewCount: 89,
    },
  ];

  const mockTeamMembers: TeamMember[] = [
    {
      id: 1,
      name: "Rajesh Kumar",
      role: "Senior Operations Executive",
      currentTasks: 5,
      completedToday: 3,
      utilization: 85,
      isOnline: true
    },
    {
      id: 2,
      name: "Priya Singh",
      role: "Operations Executive",
      currentTasks: 3,
      completedToday: 2,
      utilization: 75,
      isOnline: true
    },
    {
      id: 3,
      name: "Amit Sharma",
      role: "Junior Operations Executive",
      currentTasks: 2,
      completedToday: 4,
      utilization: 90,
      isOnline: false
    }
  ];

  // Tab configuration for mobile and desktop
  const tabConfig = [
    { id: "overview", label: "Overview", icon: <Home className="h-4 w-4" /> },
    { id: "tasks", label: "My Tasks", icon: <ListChecks className="h-4 w-4" />, badge: mockTasks.filter(t => t.status === 'in_progress').length },
    { id: "workflows", label: "Workflows", icon: <Workflow className="h-4 w-4" /> },
    { id: "team", label: "Team", icon: <Users className="h-4 w-4" /> },
    { id: "knowledge", label: "Knowledge Base", icon: <BookOpen className="h-4 w-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  ];

  // Mobile navigation items
  const mobileNavItems = tabConfig.map(tab => ({
    id: tab.id,
    label: tab.label,
    icon: tab.icon,
    active: activeTab === tab.id,
    badge: tab.badge,
    onClick: () => setActiveTab(tab.id)
  }));

  // Filter options for dashboard
  const filterOptions = [
    { value: "all", label: "All Tasks" },
    { value: "my_tasks", label: "My Tasks" },
    { value: "high_priority", label: "High Priority" },
    { value: "due_today", label: "Due Today" },
    { value: "overdue", label: "Overdue" },
    { value: "qa_pending", label: "QA Pending" }
  ];

  const urgentTasks = mockTasks.filter(t => t.priority === 'urgent' || t.slaTimeRemaining < 12);

  // Operations Overview Dashboard
  const OperationsOverview = () => (
    <div className="space-y-6">
      {/* Urgent Alerts */}
      {urgentTasks.length > 0 && (
        <AlertCard
          type="warning"
          title={`Urgent Tasks (${urgentTasks.length})`}
          message="Multiple tasks require immediate attention due to SLA deadlines"
          actions={
            <>
              <Button size="sm" variant="outline" data-testid="button-view-urgent">
                View Tasks
              </Button>
              <Button size="sm" data-testid="button-assign-urgent">
                Reassign
              </Button>
            </>
          }
        />
      )}

      {/* Performance Metrics */}
      <DashboardGrid>
        <MetricCard
          title="Today's Tasks"
          value={mockPerformance.todayTasks}
          subtitle="Assigned for today"
          icon={<ListChecks className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Completed Today"
          value={mockPerformance.tasksCompleted}
          subtitle="Tasks finished"
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="green"
          trend={{ direction: "up", value: "+15% from yesterday" }}
        />
        <MetricCard
          title="SLA Compliance"
          value={`${mockPerformance.slaCompliance}%`}
          subtitle="On-time delivery rate"
          icon={<Target className="h-5 w-5" />}
          color={mockPerformance.slaCompliance > 90 ? "green" : "orange"}
          trend={{ direction: mockPerformance.slaCompliance > 90 ? "up" : "down", value: "94.2% this month" }}
        />
        <MetricCard
          title="Team Utilization"
          value={`${mockPerformance.teamUtilization}%`}
          subtitle="Current capacity usage"
          icon={<Users className="h-5 w-5" />}
          color={mockPerformance.teamUtilization > 85 ? "orange" : "green"}
        />
      </DashboardGrid>

      <DashboardGrid className="lg:grid-cols-2">
        <MetricCard
          title="Avg Completion Time"
          value={`${mockPerformance.avgCompletionTime}h`}
          subtitle="Per task average"
          icon={<Timer className="h-5 w-5" />}
          color="purple"
          trend={{ direction: "down", value: "-0.5h from last week" }}
        />
        <MetricCard
          title="Error Rate"
          value={`${mockPerformance.errorRate}%`}
          subtitle="Rework required"
          icon={<AlertCircle className="h-5 w-5" />}
          color={mockPerformance.errorRate > 10 ? "red" : "green"}
        />
      </DashboardGrid>

      {/* Active Tasks and Team Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-active-tasks">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Tasks Priority Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTasks.filter(t => t.status === 'in_progress' || t.status === 'waiting').slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
                        {task.taskName}
                      </h4>
                      {task.slaTimeRemaining < 12 && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 text-xs">
                          SLA Risk
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{task.clientName}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">Due: {task.dueDate}</span>
                      <span className="text-gray-500">SLA: {task.slaTimeRemaining}h left</span>
                    </div>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1">
                    <StatusBadge status={task.status} variant="compact" />
                    <Badge 
                      className={`text-xs ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <Button variant="outline" className="w-full" data-testid="button-view-all-tasks">
              View All Tasks
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-team-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTeamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                        member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{member.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{member.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.currentTasks} active
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {member.completedToday} completed today
                    </div>
                    <div className={`text-xs font-medium ${
                      member.utilization > 85 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {member.utilization}% utilization
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <Button variant="outline" className="w-full" data-testid="button-manage-team">
              Manage Team
              <Settings className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // My Tasks Tab
  const MyTasks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your assigned tasks and workflow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-bulk-update">
            <Edit className="h-4 w-4 mr-2" />
            Bulk Update
          </Button>
          <Button data-testid="button-request-help">
            <MessageSquare className="h-4 w-4 mr-2" />
            Request Help
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {mockTasks.map((task) => (
          <Card 
            key={task.id} 
            className={`hover:shadow-md transition-shadow cursor-pointer ${
              task.priority === 'urgent' ? 'border-l-4 border-l-red-500' :
              task.priority === 'high' ? 'border-l-4 border-l-orange-500' : ''
            }`}
            onClick={() => setSelectedTask(task)}
            data-testid={`card-task-${task.id}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{task.taskName}</h3>
                    <StatusBadge status={task.status} />
                    <Badge 
                      className={`text-xs ${
                        task.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {task.priority}
                    </Badge>
                    {task.slaTimeRemaining < 12 && (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 text-xs">
                        SLA Risk
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{task.description}</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Client</span>
                      <p className="font-medium">{task.clientName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Service</span>
                      <p className="font-medium">{task.serviceType}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Due Date</span>
                      <p className="font-medium">{task.dueDate}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">SLA Remaining</span>
                      <p className={`font-medium ${task.slaTimeRemaining < 12 ? 'text-red-600' : 'text-green-600'}`}>
                        {task.slaTimeRemaining}h
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Estimated: </span>
                      <span>{task.estimatedHours}h</span>
                    </div>
                    {task.actualHours && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Actual: </span>
                        <span>{task.actualHours}h</span>
                      </div>
                    )}
                    {task.qaRequired && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">QA Status: </span>
                        <StatusBadge status={task.qaStatus} variant="compact" />
                      </div>
                    )}
                    {task.reworkCount > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Rework: </span>
                        <span className="text-orange-600">{task.reworkCount}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  {task.status === 'to_do' && (
                    <Button size="sm" data-testid={`button-start-${task.id}`}>
                      <PlayCircle className="h-3 w-3 mr-1" />
                      Start
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button size="sm" variant="outline" data-testid={`button-pause-${task.id}`}>
                      <PauseCircle className="h-3 w-3 mr-1" />
                      Pause
                    </Button>
                  )}
                  {task.status === 'waiting' && (
                    <Button size="sm" data-testid={`button-resume-${task.id}`}>
                      <PlayCircle className="h-3 w-3 mr-1" />
                      Resume
                    </Button>
                  )}
                  <Button size="sm" variant="outline" data-testid={`button-details-${task.id}`}>
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Placeholder components for other tabs
  const Workflows = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Workflows</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Workflow management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const Team = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Team management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const KnowledgeBase = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Knowledge base interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  const Analytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Operations Analytics</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600 dark:text-gray-400">Analytics dashboard coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <MobileLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader
          title="Operations Panel"
          subtitle="Task management & workflows"
          leftIcon={<Activity className="h-6 w-6" />}
          notifications={urgentTasks.length}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          rightActions={
            <Button size="sm" variant="outline" className="text-xs px-3" data-testid="button-help-mobile">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Help</span>
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
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Operations</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Task Management</p>
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
                  <span className="flex-1">{tab.label}</span>
                  {tab.badge && tab.badge > 0 && (
                    <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-4">
                      {tab.badge}
                    </Badge>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <DashboardHeader
            title="Operations Dashboard"
            subtitle="Monitor team performance and manage tasks"
            notifications={urgentTasks.length}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" data-testid="button-notifications-desktop">
                  <Bell className="h-4 w-4 mr-2" />
                  Alerts
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
                <OperationsOverview />
              </TabsContent>

              <TabsContent value="tasks" className="space-y-6">
                <MyTasks />
              </TabsContent>

              <TabsContent value="workflows" className="space-y-6">
                <Workflows />
              </TabsContent>

              <TabsContent value="team" className="space-y-6">
                <Team />
              </TabsContent>

              <TabsContent value="knowledge" className="space-y-6">
                <KnowledgeBase />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <Analytics />
              </TabsContent>
            </DashboardTabs>
          </DashboardContent>
        </main>
      </div>
      
      {/* Mobile Content */}
      <div className="lg:hidden">
        <MobileContent>
          {activeTab === 'overview' && <OperationsOverview />}
          {activeTab === 'tasks' && <MyTasks />}
          {activeTab === 'workflows' && <Workflows />}
          {activeTab === 'team' && <Team />}
          {activeTab === 'knowledge' && <KnowledgeBase />}
          {activeTab === 'analytics' && <Analytics />}
        </MobileContent>
      </div>
    </MobileLayout>
  );
}