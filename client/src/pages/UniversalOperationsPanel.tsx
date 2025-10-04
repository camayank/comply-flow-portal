import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  CheckSquare,
  Clock,
  Users,
  Filter,
  Search,
  Eye,
  Edit3,
  MessageSquare,
  FileText,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Timer,
  TrendingUp,
  BarChart3,
  Activity,
  Target,
  UserCheck,
  Calendar,
  Zap,
  Flag,
  ArrowRight,
  Settings,
  Download,
  Upload,
  Star,
  AtSign,
  Paperclip,
  Send,
  Plus,
  Minus
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Task {
  id: number;
  service_order_id: number;
  step_key: string;
  name: string;
  description: string;
  type: "ops_task" | "client_task" | "qa_review" | "automated";
  status: string;
  assignee_id: number;
  due_at: string;
  checklist: any[];
  dependencies: string[];
  priority: "low" | "medium" | "high" | "urgent";
  estimated_hours: number;
  actual_hours?: number;
  qa_required: boolean;
  created_at: string;
  completed_at?: string;
  service_order: {
    id: number;
    service_type: string;
    entity: {
      name: string;
    };
  };
  assignee?: {
    id: number;
    email: string;
  };
}

interface ServiceOrder {
  id: number;
  service_type: string;
  status: string;
  progress_percentage: number;
  entity: {
    name: string;
  };
  tasks: Task[];
  due_at: string;
}

interface TeamMember {
  id: number;
  email: string;
  role: string;
  active_tasks: number;
  completed_today: number;
}

const UniversalOperationsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState("tasks");
  const [viewMode, setViewMode] = useState("kanban"); // kanban, list, calendar
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newComment, setNewComment] = useState("");
  const [checkedItems, setCheckedItems] = useState<{[key: string]: boolean}>({});
  
  const queryClient = useQueryClient();

  // Queries
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/ops/tasks", { filter: taskFilter, priority: priorityFilter, assignee: assigneeFilter, search: searchQuery }],
  });

  const { data: serviceOrders = [] } = useQuery<ServiceOrder[]>({
    queryKey: ["/api/ops/service-orders"],
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/ops/team-members"],
  });

  const { data: operationalMetrics } = useQuery({
    queryKey: ["/api/ops/metrics"],
  });

  const { data: slaMetrics } = useQuery({
    queryKey: ["/api/ops/sla-metrics"],
  });

  // Mutations
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status, notes }: { taskId: number; status: string; notes?: string }) => {
      const response = await fetch(`/api/ops/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!response.ok) throw new Error("Failed to update task status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ops/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ops/service-orders"] });
      toast({ title: "Task updated successfully" });
    },
  });

  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, assigneeId }: { taskId: number; assigneeId: number }) => {
      const response = await fetch(`/api/ops/tasks/${taskId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee_id: assigneeId }),
      });
      if (!response.ok) throw new Error("Failed to assign task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ops/tasks"] });
      toast({ title: "Task assigned successfully" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ taskId, comment }: { taskId: number; comment: string }) => {
      const response = await fetch(`/api/ops/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment, visibility: "internal" }),
      });
      if (!response.ok) throw new Error("Failed to add comment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ops/tasks"] });
      setNewComment("");
      toast({ title: "Comment added successfully" });
    },
  });

  // Helper functions
  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-gray-100 text-gray-800 border-gray-200",
      assigned: "bg-blue-100 text-blue-800 border-blue-200",
      in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
      waiting_client: "bg-orange-100 text-orange-800 border-orange-200",
      qa_review: "bg-purple-100 text-purple-800 border-purple-200",
      completed: "bg-green-100 text-green-800 border-green-200",
      rework_required: "bg-red-100 text-red-800 border-red-200"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "text-gray-600",
      medium: "text-blue-600",
      high: "text-orange-600",
      urgent: "text-red-600"
    };
    return colors[priority as keyof typeof colors] || "text-gray-600";
  };

  const getUrgencyColor = (dueDate: string) => {
    const hours = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60));
    if (hours < 0) return "text-red-600 font-semibold";
    if (hours <= 4) return "text-red-500";
    if (hours <= 24) return "text-orange-500";
    if (hours <= 48) return "text-yellow-500";
    return "text-green-500";
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = taskFilter === "all" || task.status === taskFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === "all" || task.assignee_id?.toString() === assigneeFilter;
    const matchesSearch = searchQuery === "" || 
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.service_order.service_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.service_order.entity.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesAssignee && matchesSearch;
  });

  const groupTasksByStatus = (tasks: Task[]) => {
    const groups = {
      pending: tasks.filter(t => t.status === "pending"),
      assigned: tasks.filter(t => t.status === "assigned"),
      in_progress: tasks.filter(t => t.status === "in_progress"),
      qa_review: tasks.filter(t => t.status === "qa_review"),
      waiting_client: tasks.filter(t => t.status === "waiting_client"),
      completed: tasks.filter(t => t.status === "completed")
    };
    return groups;
  };

  const kanbanGroups = groupTasksByStatus(filteredTasks);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Operations Workspace
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Manage tasks, workflows, and team performance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {(operationalMetrics as any)?.slaCompliance || 0}% SLA
              </Badge>
              <Badge variant="outline">
                {filteredTasks.filter(t => t.status === "in_progress").length} Active
              </Badge>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white dark:bg-gray-800 p-1">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              My Tasks
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Board
            </TabsTrigger>
            <TabsTrigger value="qa" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              QA Review
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="sla" className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              SLA Monitor
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            {/* Filters and Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <Select value={taskFilter} onValueChange={setTaskFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting_client">Waiting Client</SelectItem>
                      <SelectItem value="qa_review">QA Review</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant={viewMode === "kanban" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("kanban")}
                    >
                      Kanban
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                    >
                      List
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kanban View */}
            {viewMode === "kanban" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {Object.entries(kanbanGroups).map(([status, tasks]) => (
                  <Card key={status}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium capitalize flex items-center justify-between">
                        {status.replace(/_/g, ' ')}
                        <Badge variant="outline">{tasks.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <ScrollArea className="h-96">
                        <div className="space-y-3">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 bg-white dark:bg-gray-800 border rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => setSelectedTask(task)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2">
                                  {task.name}
                                </h4>
                                <Flag className={`w-3 h-3 ${getPriorityColor(task.priority)}`} />
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                                {task.service_order.entity.name} • {task.service_order.service_type.replace(/_/g, ' ')}
                              </p>
                              <div className="flex items-center justify-between text-xs">
                                <span className={`${getUrgencyColor(task.due_at)}`}>
                                  Due: {new Date(task.due_at).toLocaleDateString()}
                                </span>
                                {task.assignee && (
                                  <Badge variant="outline" className="text-xs">
                                    {task.assignee.email.split('@')[0]}
                                  </Badge>
                                )}
                              </div>
                              {task.checklist && task.checklist.length > 0 && (
                                <div className="mt-2 flex items-center text-xs text-gray-500">
                                  <CheckSquare className="w-3 h-3 mr-1" />
                                  {task.checklist.filter((item: any) => item.completed).length}/{task.checklist.length} checklist
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredTasks.map((task) => (
                      <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <Flag className={`w-4 h-4 ${getPriorityColor(task.priority)}`} />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {task.name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {task.service_order.entity.name} • {task.service_order.service_type.replace(/_/g, ' ')}
                              </p>
                            </div>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status.replace(/_/g, ' ')}
                            </Badge>
                            <span className={`text-sm ${getUrgencyColor(task.due_at)}`}>
                              {new Date(task.due_at).toLocaleDateString()}
                            </span>
                            {task.assignee && (
                              <Badge variant="outline">
                                {task.assignee.email.split('@')[0]}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedTask(task)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Select onValueChange={(status) => updateTaskStatusMutation.mutate({ taskId: task.id, status })}>
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Update" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="assigned">Assigned</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="qa_review">QA Review</SelectItem>
                                <SelectItem value="waiting_client">Waiting Client</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {teamMembers.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {member.email.split('@')[0]}
                        </h3>
                        <Badge variant="outline" className="mt-1">
                          {member.role}
                        </Badge>
                      </div>
                      <UserCheck className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Active Tasks:</span>
                        <span className="font-medium">{member.active_tasks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Completed Today:</span>
                        <span className="font-medium text-green-600">{member.completed_today}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Team Workload Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Team Workload Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">
                  Visual workload distribution chart would be implemented here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QA Tab */}
          <TabsContent value="qa" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>QA Review Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.filter(t => t.qa_required && t.status === "qa_review").map((task) => (
                    <div key={task.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {task.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {task.service_order.entity.name} • {task.service_order.service_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => updateTaskStatusMutation.mutate({ taskId: task.id, status: "completed" })}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateTaskStatusMutation.mutate({ taskId: task.id, status: "rework_required" })}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                      {task.checklist && task.checklist.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                          <h5 className="text-sm font-medium mb-2">QA Checklist:</h5>
                          <div className="space-y-1">
                            {task.checklist.map((item: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={checkedItems[`${task.id}-${index}`] || false}
                                  onChange={(e) => setCheckedItems({
                                    ...checkedItems,
                                    [`${task.id}-${index}`]: e.target.checked
                                  })}
                                />
                                <span>{item.name || item}</span>
                              </div>
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

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Tasks Completed Today
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(operationalMetrics as any)?.completedToday || 0}
                      </p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Average Handle Time
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(operationalMetrics as any)?.avgHandleTime || 0}h
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Rework Rate
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(operationalMetrics as any)?.reworkRate || 0}%
                      </p>
                    </div>
                    <RotateCcw className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Team Utilization
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {(operationalMetrics as any)?.teamUtilization || 0}%
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SLA Tab */}
          <TabsContent value="sla" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5" />
                  SLA Monitoring Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {(slaMetrics as any)?.compliance || 0}%
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">SLA Compliance</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {(slaMetrics as any)?.atRisk || 0}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">At Risk</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600 mb-2">
                      {(slaMetrics as any)?.breached || 0}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">Breached</p>
                  </div>
                </div>

                {/* SLA Alert Tasks */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Critical SLA Alerts</h4>
                  {tasks.filter(t => {
                    const hours = Math.ceil((new Date(t.due_at).getTime() - Date.now()) / (1000 * 60 * 60));
                    return hours <= 4 && hours > 0;
                  }).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">{task.name}</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {task.service_order.entity.name} • Due: {new Date(task.due_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <Badge variant="destructive">Critical</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTask.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Task Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Service Order</Label>
                  <p className="capitalize">
                    {selectedTask.service_order.service_type.replace(/_/g, ' ')} - {selectedTask.service_order.entity.name}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedTask.status)}>
                    {selectedTask.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <Label>Priority</Label>
                  <span className={`font-medium ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority.toUpperCase()}
                  </span>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <span className={getUrgencyColor(selectedTask.due_at)}>
                    {new Date(selectedTask.due_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <Label>Estimated Hours</Label>
                  <p>{selectedTask.estimated_hours}h</p>
                </div>
                <div>
                  <Label>QA Required</Label>
                  <p>{selectedTask.qa_required ? "Yes" : "No"}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <p className="mt-1 text-gray-700 dark:text-gray-300">
                  {selectedTask.description}
                </p>
              </div>

              {/* Checklist */}
              {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                <div>
                  <Label>Checklist</Label>
                  <div className="mt-2 space-y-2">
                    {selectedTask.checklist.map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checkedItems[`${selectedTask.id}-${index}`] || false}
                          onChange={(e) => setCheckedItems({
                            ...checkedItems,
                            [`${selectedTask.id}-${index}`]: e.target.checked
                          })}
                        />
                        <span className="text-sm">{item.name || item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment */}
              <div>
                <Label>Assign To</Label>
                <Select 
                  value={selectedTask.assignee_id?.toString() || ""} 
                  onValueChange={(value) => assignTaskMutation.mutate({ taskId: selectedTask.id, assigneeId: parseInt(value) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Update */}
              <div>
                <Label>Update Status</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant={selectedTask.status === "assigned" ? "default" : "outline"}
                    onClick={() => updateTaskStatusMutation.mutate({ taskId: selectedTask.id, status: "assigned" })}
                  >
                    Assigned
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTask.status === "in_progress" ? "default" : "outline"}
                    onClick={() => updateTaskStatusMutation.mutate({ taskId: selectedTask.id, status: "in_progress" })}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    In Progress
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTask.status === "waiting_client" ? "default" : "outline"}
                    onClick={() => updateTaskStatusMutation.mutate({ taskId: selectedTask.id, status: "waiting_client" })}
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Waiting Client
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTask.status === "qa_review" ? "default" : "outline"}
                    onClick={() => updateTaskStatusMutation.mutate({ taskId: selectedTask.id, status: "qa_review" })}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    QA Review
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTask.status === "completed" ? "default" : "outline"}
                    onClick={() => updateTaskStatusMutation.mutate({ taskId: selectedTask.id, status: "completed" })}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Completed
                  </Button>
                </div>
              </div>

              {/* Comments */}
              <div>
                <Label>Internal Notes</Label>
                <div className="mt-2 space-y-3">
                  <div className="flex gap-3">
                    <Textarea
                      placeholder="Add internal note..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button onClick={() => addCommentMutation.mutate({ taskId: selectedTask.id, comment: newComment })}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UniversalOperationsPanel;