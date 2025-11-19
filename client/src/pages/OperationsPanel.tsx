import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  HandMetal,
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
} from "lucide-react";
import { SkeletonCard, SkeletonDashboard } from '@/components/ui/skeleton-loader';

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

export default function OperationsPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedTask, setSelectedTask] = useState<OpsTask | null>(null);
  const [filterBy, setFilterBy] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole] = useState("ops_executive"); // Would come from auth context
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data for demonstration - would come from API
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
  ];

  const mockPerformance: PerformanceData = {
    tasksCompleted: 27,
    slaCompliance: 94.2,
    errorRate: 5.8,
    avgCompletionTime: 3.2,
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

  // Requirement 4: Ops Dashboard with filters
  const DashboardOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Operations Dashboard</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
              <SelectItem value="due_today">Due Today</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="qa_pending">QA Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Tasks</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold text-orange-500">3</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Risk</p>
                <p className="text-2xl font-bold text-red-500">2</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">QA Pending</p>
                <p className="text-2xl font-bold">4</p>
              </div>
              <CheckCheck className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Active Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTasks.map((task) => (
              <TaskCard key={task.id} task={task} onSelect={setSelectedTask} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Requirement 16: Kanban Board View
  const KanbanBoard = () => {
    const columns = [
      { id: "to_do", title: "To Do", status: "to_do" as const },
      { id: "in_progress", title: "In Progress", status: "in_progress" as const },
      { id: "waiting", title: "Waiting", status: "waiting" as const },
      { id: "completed", title: "Completed", status: "completed" as const },
    ];

    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Task Board</h2>
        <div className="grid grid-cols-4 gap-4">
          {columns.map((column) => (
            <Card key={column.id} className="h-96">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {mockTasks
                      .filter((task) => task.status === column.status)
                      .map((task) => (
                        <div
                          key={task.id}
                          className="p-3 bg-background rounded-lg border cursor-pointer hover:bg-accent"
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={getPriorityVariant(task.priority)}>
                              {task.priority}
                            </Badge>
                            {task.slaTimeRemaining < 24 && (
                              <Timer className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <h4 className="text-sm font-medium mb-1">{task.taskName}</h4>
                          <p className="text-xs text-muted-foreground mb-2">{task.clientName}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span>{task.estimatedHours}h</span>
                            <span className="text-muted-foreground">
                              {task.slaTimeRemaining}h left
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Requirement 23: Personal Productivity Metrics
  const PerformanceTracking = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Performance Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold">{mockPerformance.tasksCompleted}</p>
                <p className="text-xs text-green-500">+12% this week</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Compliance</p>
                <p className="text-2xl font-bold">{mockPerformance.slaCompliance}%</p>
                <Progress value={mockPerformance.slaCompliance} className="mt-2" />
              </div>
              <Timer className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">{mockPerformance.errorRate}%</p>
                <p className="text-xs text-red-500">Target: &lt;5%</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion</p>
                <p className="text-2xl font-bold">{mockPerformance.avgCompletionTime}h</p>
                <p className="text-xs text-blue-500">-0.5h this week</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Chart component would be integrated here
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Type Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["Company Incorporation", "GST Registration", "License Renewal"].map((service, index) => (
                <div key={service} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{service}</span>
                    <span>{3.2 + index * 0.5}h avg</span>
                  </div>
                  <Progress value={90 - index * 10} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Requirement 27: Ops Knowledge Base
  const KnowledgeBase = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Knowledge Base</h2>
        <div className="flex gap-2">
          <Input placeholder="Search SOPs, guides..." className="w-64" />
          <Select>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sop">SOPs</SelectItem>
              <SelectItem value="template">Templates</SelectItem>
              <SelectItem value="guide">Guides</SelectItem>
              <SelectItem value="reference">Reference</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockKnowledgeBase.map((item) => (
          <Card key={item.id} className="cursor-pointer hover:bg-accent">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{item.category}</Badge>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Eye className="h-3 w-3 mr-1" />
                  {item.viewCount}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.content}</p>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{item.serviceType}</Badge>
                <div className="flex items-center gap-1">
                  {item.quickLinks.length > 0 && (
                    <Link className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "MCA Portal", url: "https://mca.gov.in" },
              { name: "GSTN Portal", url: "https://gstn.org.in" },
              { name: "EPFO Portal", url: "https://epfo.gov.in" },
              { name: "Income Tax Portal", url: "https://incometaxindia.gov.in" },
            ].map((link) => (
              <Button key={link.name} variant="outline" className="justify-start" asChild>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <Link className="h-4 w-4 mr-2" />
                  {link.name}
                </a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Requirement 12: Internal Comments & 13: @Mentions
  const CollaborationPanel = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Team Collaboration</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Internal Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Internal Discussion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 mb-4">
              <div className="space-y-3">
                {[
                  {
                    author: "Priya Sharma",
                    content: "Need help with @rajesh on the GST filing process",
                    time: "2 hours ago",
                    mentions: ["rajesh"],
                  },
                  {
                    author: "Rajesh Kumar",
                    content: "I've uploaded the updated SOP document",
                    time: "4 hours ago",
                    mentions: [],
                  },
                ].map((comment, index) => (
                  <div key={index} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{comment.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">{comment.time}</span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Textarea
                  placeholder="Add internal comment... Use @username to mention"
                  className="pr-20"
                />
                <div className="absolute right-2 top-2 flex gap-1">
                  <Button size="sm" variant="ghost">
                    <AtSign className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button size="sm">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Sharing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Internal Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center mb-4">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag & drop files or click to upload
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Select Files
              </Button>
            </div>
            
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {[
                  { name: "GST_SOP_Updated.pdf", size: "2.3 MB", uploadedBy: "Priya" },
                  { name: "Client_Documents.zip", size: "15.8 MB", uploadedBy: "Rajesh" },
                ].map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.size} • by {file.uploadedBy}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Handover Mode - Requirement 15 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandMetal className="h-5 w-5" />
            Task Handover
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>Transfer Task/Service</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select task to transfer" />
                </SelectTrigger>
                <SelectContent>
                  {mockTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.taskName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Label>Transfer To</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priya">Priya Sharma</SelectItem>
                  <SelectItem value="rajesh">Rajesh Kumar</SelectItem>
                  <SelectItem value="amit">Amit Singh</SelectItem>
                </SelectContent>
              </Select>
              
              <Label>Handover Notes</Label>
              <Textarea placeholder="Context and important notes for the new assignee..." />
              
              <Button className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Initiate Handover
              </Button>
            </div>
            
            <div className="space-y-3">
              <Label>Pending Handovers</Label>
              <div className="space-y-2">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">GST Registration Task</span>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    From: Amit Singh → To: You
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                    <Button size="sm" variant="outline">
                      <XCircle className="h-3 w-3 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Helper function for priority badge variants
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive" as const;
      case "high": return "secondary" as const;
      case "medium": return "outline" as const;
      default: return "outline" as const;
    }
  };

  // Task Card Component
  const TaskCard = ({ task, onSelect }: { task: OpsTask; onSelect: (task: OpsTask) => void }) => (
    <div 
      className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
      onClick={() => onSelect(task)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-medium">{task.taskName}</h3>
          <p className="text-sm text-muted-foreground">{task.clientName} • {task.serviceType}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getPriorityVariant(task.priority)}>
            {task.priority}
          </Badge>
          {task.slaTimeRemaining < 24 && (
            <Badge variant="destructive" className="text-xs">
              <Timer className="h-3 w-3 mr-1" />
              {task.slaTimeRemaining}h
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {task.estimatedHours}h estimated
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          Due {new Date(task.dueDate).toLocaleDateString()}
        </span>
        {task.qaRequired && (
          <Badge variant="outline" className="text-xs">
            QA Required
          </Badge>
        )}
        {task.reworkCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            Rework: {task.reworkCount}
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold">DigiComply Operations</h1>
              <p className="text-sm text-muted-foreground">
                Centralized workflow management for compliance operations
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
                <Badge className="ml-2" variant="destructive">3</Badge>
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Avatar>
                <AvatarFallback>PS</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Board
            </TabsTrigger>
            <TabsTrigger value="qc" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Quality Control
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Collaboration
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Knowledge
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="kanban" className="mt-6">
            <KanbanBoard />
          </TabsContent>

          <TabsContent value="qc" className="mt-6">
            <QualityControlPanel />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <PerformanceTracking />
          </TabsContent>

          <TabsContent value="collaboration" className="mt-6">
            <CollaborationPanel />
          </TabsContent>

          <TabsContent value="knowledge" className="mt-6">
            <KnowledgeBase />
          </TabsContent>
        </Tabs>

        {/* Task Detail Modal - would be implemented as separate component */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedTask.taskName}</CardTitle>
                  <Button variant="ghost" onClick={() => setSelectedTask(null)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Task detail implementation would go here */}
                <p>Detailed task view with all 36 requirements implementation...</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// QC Panel Component integrated into Operations
function QualityControlPanel() {
  const { data: qcStats, isLoading } = useQuery({
    queryKey: ['qc-stats'],
    queryFn: async () => {
      const response = await fetch('/api/qc/dashboard?tab=overview');
      return response.json();
    }
  });

  const { data: pendingReviews } = useQuery({
    queryKey: ['qc-pending'],
    queryFn: async () => {
      const response = await fetch('/api/qc/queue?status=pending');
      return response.json();
    }
  });

  if (isLoading) {
    return <SkeletonDashboard stats={6} />;
  }

  return (
    <div className="space-y-6">
      {/* QC Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Pending Reviews</p>
                <p className="text-3xl font-bold text-orange-600">
                  {qcStats?.stats?.totalPending || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Avg Quality Score</p>
                <p className="text-3xl font-bold text-green-600">
                  {qcStats?.stats?.qualityScore || 0}%
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">SLA Compliance</p>
                <p className="text-3xl font-bold text-blue-600">
                  {qcStats?.stats?.slaCompliance || 0}%
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Completed Today</p>
                <p className="text-3xl font-bold text-purple-600">
                  {qcStats?.stats?.completedToday || 0}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              QC Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Access the full QC dashboard to review pending items, manage quality checklists, and track metrics.
            </p>
            <Button asChild className="w-full">
              <a href="/qc-dashboard" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open QC Dashboard
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              View detailed quality metrics, performance analytics, and trend analysis.
            </p>
            <Button asChild variant="outline" className="w-full">
              <a href="/quality-metrics" target="_blank" rel="noopener noreferrer">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Metrics
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Delivery Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Monitor service deliveries, client confirmations, and feedback collection.
            </p>
            <Button asChild variant="outline" className="w-full">
              <a href="/universal-ops" target="_blank" rel="noopener noreferrer">
                <Package className="h-4 w-4 mr-2" />
                Delivery Queue
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent QC Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent QC Activity
            </span>
            <Button size="sm" asChild>
              <a href="/qc-dashboard">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingReviews?.items?.slice(0, 5).map((review: any) => (
              <div key={review.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <FileText className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{review.clientName}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{review.serviceName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-800">
                    {review.priority}
                  </Badge>
                  <Button size="sm" asChild>
                    <a href={`/qc-dashboard`}>
                      <Eye className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )) || (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  All Caught Up!
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  No pending QC reviews at this time.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QC Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quality Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Quality Score Trend</span>
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">+3.2%</span>
                </div>
              </div>
              <Progress value={87} className="h-2" />
              <div className="flex items-center justify-between">
                <span className="text-sm">Review Time Efficiency</span>
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">+8.1%</span>
                </div>
              </div>
              <Progress value={92} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>QM</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">QC Manager</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm">95%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>SA</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">Senior Analyst</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm">89%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>QA</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">QC Analyst</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm">91%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}