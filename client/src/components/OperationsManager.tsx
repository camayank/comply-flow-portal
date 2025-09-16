import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  FileText,
  MessageSquare,
  Settings,
  BarChart3,
  Timer,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Send,
  Bell,
  Flag,
  ArrowRight,
  Zap,
  Target,
  TrendingUp,
  Activity,
  Briefcase,
  ClipboardCheck,
  UserCheck,
  AlertCircle,
  CheckCheck,
  GripVertical
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';

// Types for Operations Manager
interface ServiceOrder {
  id: number;
  entity_id: number;
  service_type: string;
  status: 'created' | 'in_progress' | 'waiting_client' | 'waiting_government' | 'under_review' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: number;
  due_at?: string;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  entity?: {
    id: number;
    name: string;
    type: string;
  };
  assignedUser?: {
    id: number;
    email: string;
    role: string;
  };
  tasks?: Task[];
  documents?: Document[];
  slaTimer?: SlaTimer;
}

interface Task {
  id: number;
  service_order_id: number;
  step_key: string;
  name: string;
  description?: string;
  type: 'ops_task' | 'client_task' | 'qa_review' | 'automated';
  status: 'pending' | 'assigned' | 'in_progress' | 'waiting_client' | 'waiting_government' | 'qa_review' | 'completed' | 'rework_required';
  assignee_id?: number;
  due_at?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_hours?: number;
  actual_hours?: number;
  qa_required: boolean;
  dependencies?: string[];
  checklist?: ChecklistItem[];
  assignee?: {
    id: number;
    email: string;
    role: string;
  };
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: number;
}

interface SlaTimer {
  id: number;
  service_order_id: number;
  baseline_hours: number;
  started_at: string;
  paused_at?: string;
  total_paused_minutes: number;
  current_status: 'running' | 'paused' | 'completed' | 'breached';
  escalation_level?: 'warning' | 'critical' | 'breached';
  breach_notified: boolean;
}

interface TeamMember {
  id: number;
  email: string;
  role: string;
  active_tasks: number;
  completed_this_week: number;
  sla_compliance: number;
  avg_completion_time: number;
  workload_capacity: number;
}

export function OperationsManager() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Fetch service orders with detailed information
  const { data: serviceOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/service-orders', filterStatus, filterPriority, filterAssignee, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterPriority !== 'all') params.append('priority', filterPriority);
      if (filterAssignee !== 'all') params.append('assigned_to', filterAssignee);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/service-orders?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch service orders');
      return response.json();
    }
  });

  // Fetch dashboard statistics
  const { data: dashStats } = useQuery({
    queryKey: ['/api/ops/dashboard-stats'],
  });

  // Fetch team members and their workload
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['/api/ops/team-workload'],
  });

  // Fetch team analytics
  const { data: teamAnalytics } = useQuery({
    queryKey: ['/api/ops/team-analytics'],
  });

  // Auto-assignment suggestion mutation
  const suggestAssigneeMutation = useMutation({
    mutationFn: async ({ taskType, priority, estimatedHours }: { taskType?: string; priority?: string; estimatedHours?: number }) => {
      const params = new URLSearchParams();
      if (taskType) params.append('taskType', taskType);
      if (priority) params.append('priority', priority);
      if (estimatedHours) params.append('estimatedHours', estimatedHours.toString());
      
      const response = await fetch(`/api/ops/suggest-assignee?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to get assignment suggestion');
      return response.json();
    },
  });

  // Fetch active SLA timers
  const { data: slaTimers = [] } = useQuery({
    queryKey: ['/api/ops/sla-timers'],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Service Order Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ serviceOrderId, newStatus, notes }: { serviceOrderId: number; newStatus: string; notes?: string }) => {
      return apiRequest(`/api/service-orders/${serviceOrderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          to: newStatus, 
          from: selectedServiceOrder?.status,
          notes,
          timestamp: new Date().toISOString()
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ops/dashboard-stats'] });
      toast({
        title: 'Status Updated',
        description: 'Service order status has been updated successfully.',
      });
    },
  });

  // Task Assignment Mutation
  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, assigneeId, estimatedHours }: { taskId: number; assigneeId: number; estimatedHours?: number }) => {
      return apiRequest(`/api/tasks/${taskId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignee_id: assigneeId, estimated_hours: estimatedHours })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ops/team-workload'] });
      toast({
        title: 'Task Assigned',
        description: 'Task has been assigned successfully.',
      });
    },
  });

  // Task Status Update Mutation (for drag-drop)
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: number; newStatus: string }) => {
      return apiRequest(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-orders'] });
      toast({
        title: 'Task Updated',
        description: 'Task status has been updated successfully.',
      });
    },
  });

  // Drag and drop state
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // SLA Timer Control Mutation
  const slaControlMutation = useMutation({
    mutationFn: async ({ serviceOrderId, action, reason }: { serviceOrderId: number; action: 'pause' | 'resume'; reason: string }) => {
      return apiRequest(`/api/ops/sla-timers/${serviceOrderId}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ops/sla-timers'] });
      toast({
        title: `SLA Timer ${slaControlMutation.variables?.action === 'pause' ? 'Paused' : 'Resumed'}`,
        description: `SLA timer has been ${slaControlMutation.variables?.action === 'pause' ? 'paused' : 'resumed'} successfully.`,
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'waiting_client': return 'bg-yellow-500';
      case 'waiting_government': return 'bg-orange-500';
      case 'under_review': return 'bg-purple-500';
      case 'on_hold': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-red-400 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getSlaStatusColor = (timer: SlaTimer) => {
    if (timer.current_status === 'breached') return 'text-red-600 bg-red-50';
    if (timer.escalation_level === 'critical') return 'text-red-500 bg-red-50';
    if (timer.escalation_level === 'warning') return 'text-orange-500 bg-orange-50';
    if (timer.current_status === 'paused') return 'text-gray-500 bg-gray-50';
    return 'text-green-600 bg-green-50';
  };

  // Dashboard Overview Component
  const DashboardOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Operations Dashboard</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
              data-testid="input-search-orders"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting_client">Waiting Client</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32" data-testid="select-priority-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-active-orders">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="text-2xl font-bold">{dashStats?.totalActiveOrders || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-pending-orders">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-500">{dashStats?.pendingOrders || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-sla-risk">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Risk</p>
                <p className="text-2xl font-bold text-red-500">{slaTimers.filter(t => t.escalation_level === 'critical' || t.current_status === 'breached').length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-completed-orders">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-500">{dashStats?.completedOrders || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Service Orders</CardTitle>
          <CardDescription>Manage and track all service orders</CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="text-center py-8">Loading service orders...</div>
          ) : (
            <div className="space-y-4">
              {serviceOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No service orders found matching your filters.
                </div>
              ) : (
                serviceOrders.map((order: ServiceOrder) => (
                  <ServiceOrderCard 
                    key={order.id} 
                    order={order} 
                    onSelect={() => setSelectedServiceOrder(order)}
                    slaTimer={slaTimers.find(t => t.service_order_id === order.id)}
                  />
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Operations Manager</h1>
          <p className="text-gray-600">Complete service delivery management and workflow orchestration</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="kanban" data-testid="tab-kanban">Task Board</TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-team">Team</TabsTrigger>
            <TabsTrigger value="sla" data-testid="tab-sla">SLA Monitor</TabsTrigger>
            <TabsTrigger value="progress" data-testid="tab-progress">Progress</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            <TabsTrigger value="communications" data-testid="tab-communications">Communications</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="kanban" className="mt-6">
            <KanbanBoard 
              serviceOrders={serviceOrders} 
              onTaskSelect={setSelectedTask}
              onTaskStatusUpdate={(taskId, newStatus) => updateTaskStatusMutation.mutate({ taskId, newStatus })}
              activeTask={activeTask}
              setActiveTask={setActiveTask}
            />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <TeamManagement 
              teamMembers={teamMembers} 
              onAssignTask={assignTaskMutation.mutate}
              teamAnalytics={teamAnalytics}
            />
          </TabsContent>

          <TabsContent value="sla" className="mt-6">
            <SlaMonitoring 
              slaTimers={slaTimers} 
              serviceOrders={serviceOrders}
              onSlaControl={slaControlMutation.mutate}
            />
          </TabsContent>

          <TabsContent value="progress" className="mt-6">
            <ProgressTracking 
              serviceOrders={serviceOrders}
              slaTimers={slaTimers}
              teamMembers={teamMembers}
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <DocumentManagement serviceOrders={serviceOrders} />
          </TabsContent>

          <TabsContent value="communications" className="mt-6">
            <CommunicationsCenter serviceOrders={serviceOrders} />
          </TabsContent>
        </Tabs>

        {/* Service Order Detail Modal */}
        {selectedServiceOrder && (
          <ServiceOrderDetailModal
            order={selectedServiceOrder}
            isOpen={!!selectedServiceOrder}
            onClose={() => setSelectedServiceOrder(null)}
            onStatusUpdate={(newStatus, notes) => 
              updateStatusMutation.mutate({ 
                serviceOrderId: selectedServiceOrder.id, 
                newStatus, 
                notes 
              })
            }
          />
        )}

        {/* Task Detail Modal */}
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            isOpen={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            onAssign={(assigneeId, estimatedHours) =>
              assignTaskMutation.mutate({ 
                taskId: selectedTask.id, 
                assigneeId, 
                estimatedHours 
              })
            }
          />
        )}
      </div>
    </div>
  );
}

// Service Order Card Component
const ServiceOrderCard = ({ 
  order, 
  onSelect, 
  slaTimer 
}: { 
  order: ServiceOrder; 
  onSelect: () => void;
  slaTimer?: SlaTimer;
}) => (
  <Card 
    className="cursor-pointer hover:bg-accent transition-colors"
    onClick={onSelect}
    data-testid={`card-service-order-${order.id}`}
  >
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(order.status)}>
            {order.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <Badge className={getPriorityColor(order.priority)}>
            {order.priority.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date(order.created_at).toLocaleDateString()}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <p className="font-semibold">#{order.id}</p>
          <p className="text-sm text-muted-foreground">{order.service_type}</p>
          <p className="text-sm font-medium">{order.entity?.name}</p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Progress</p>
          <Progress value={order.progress_percentage} className="w-full mt-1" />
          <p className="text-xs text-muted-foreground mt-1">{order.progress_percentage}% complete</p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Assigned To</p>
          <div className="flex items-center gap-2 mt-1">
            {order.assignedUser ? (
              <>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {order.assignedUser.email.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{order.assignedUser.email}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Unassigned</span>
            )}
          </div>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">SLA Status</p>
          {slaTimer ? (
            <div className={`text-sm px-2 py-1 rounded-md ${getSlaStatusColor(slaTimer)}`}>
              {slaTimer.current_status === 'breached' ? '⚠️ BREACHED' :
               slaTimer.escalation_level === 'critical' ? '🔴 Critical' :
               slaTimer.escalation_level === 'warning' ? '🟡 Warning' :
               slaTimer.current_status === 'paused' ? '⏸️ Paused' : '✅ On Track'}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No timer</span>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Kanban Board Component with Drag & Drop
const KanbanBoard = ({ 
  serviceOrders, 
  onTaskSelect, 
  onTaskStatusUpdate,
  activeTask,
  setActiveTask
}: { 
  serviceOrders: ServiceOrder[]; 
  onTaskSelect: (task: Task) => void;
  onTaskStatusUpdate: (taskId: number, newStatus: string) => void;
  activeTask: Task | null;
  setActiveTask: (task: Task | null) => void;
}) => {
  const columns = [
    { id: 'pending', title: 'To Do', status: ['pending', 'assigned'] as const, statusValue: 'pending' },
    { id: 'in_progress', title: 'In Progress', status: ['in_progress'] as const, statusValue: 'in_progress' },
    { id: 'waiting', title: 'Waiting', status: ['waiting_client', 'waiting_government'] as const, statusValue: 'waiting_client' },
    { id: 'review', title: 'Review', status: ['qa_review', 'under_review'] as const, statusValue: 'qa_review' },
    { id: 'completed', title: 'Completed', status: ['completed'] as const, statusValue: 'completed' },
  ];

  // Extract all tasks from service orders
  const allTasks = serviceOrders.flatMap(order => 
    order.tasks?.map(task => ({ ...task, serviceOrder: order })) || []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = allTasks.find(t => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = active.id as number;
    const columnId = over.id as string;
    const column = columns.find(col => col.id === columnId);
    
    if (column) {
      onTaskStatusUpdate(taskId, column.statusValue);
    }

    setActiveTask(null);
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Task Board</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          {columns.map((column) => {
            const columnTasks = allTasks.filter(task => column.status.includes(task.status as any));
            
            return (
              <DroppableColumn
                key={column.id}
                column={column}
                tasks={columnTasks}
                onTaskSelect={onTaskSelect}
              />
            );
          })}
        </div>
      </div>
      
      <DragOverlay>
        {activeTask ? (
          <TaskKanbanCard
            task={activeTask}
            serviceOrder={activeTask.serviceOrder}
            onSelect={() => {}}
            isDragging={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// Droppable Column Component
const DroppableColumn = ({ 
  column, 
  tasks, 
  onTaskSelect 
}: {
  column: { id: string; title: string; status: readonly string[]; statusValue: string };
  tasks: Array<Task & { serviceOrder: ServiceOrder }>;
  onTaskSelect: (task: Task) => void;
}) => {
  const { setNodeRef, isOver } = useSortable({ 
    id: column.id,
    data: {
      type: 'column'
    }
  });

  return (
    <Card 
      ref={setNodeRef}
      className={`h-96 transition-colors ${
        isOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`} 
      data-testid={`kanban-column-${column.id}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
        <Badge variant="secondary" className="w-fit">
          {tasks.length}
        </Badge>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-80">
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tasks.map((task) => (
                <DraggableTaskCard
                  key={task.id}
                  task={task}
                  serviceOrder={task.serviceOrder}
                  onSelect={() => onTaskSelect(task)}
                />
              ))}
            </div>
          </SortableContext>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Draggable Task Card Component
const DraggableTaskCard = ({ 
  task, 
  serviceOrder, 
  onSelect 
}: { 
  task: Task & { serviceOrder: ServiceOrder }; 
  serviceOrder: ServiceOrder;
  onSelect: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group"
    >
      <TaskKanbanCard
        task={task}
        serviceOrder={serviceOrder}
        onSelect={onSelect}
        dragAttributes={attributes}
        dragListeners={listeners}
        isDragging={isDragging}
      />
    </div>
  );
};

// Task Kanban Card Component
const TaskKanbanCard = ({ 
  task, 
  serviceOrder, 
  onSelect,
  dragAttributes,
  dragListeners,
  isDragging = false
}: { 
  task: Task & { serviceOrder: ServiceOrder }; 
  serviceOrder: ServiceOrder;
  onSelect: () => void;
  dragAttributes?: any;
  dragListeners?: any;
  isDragging?: boolean;
}) => (
  <div
    className={`p-3 bg-background rounded-lg border transition-all duration-200 ${
      isDragging ? 'shadow-lg scale-105 rotate-2' : 'cursor-pointer hover:bg-accent hover:shadow-md'
    }`}
    onClick={onSelect}
    data-testid={`task-card-${task.id}`}
    {...dragAttributes}
  >
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        {dragListeners && (
          <div 
            {...dragListeners} 
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          >
            <GripVertical className="h-3 w-3 text-gray-400" />
          </div>
        )}
        <Badge className={getPriorityColor(task.priority)} size="sm">
          {task.priority.toUpperCase()}
        </Badge>
      </div>
      {task.due_at && new Date(task.due_at) < new Date() && (
        <Timer className="h-4 w-4 text-red-500" />
      )}
    </div>
    <h4 className="text-sm font-medium mb-1 line-clamp-2">{task.name}</h4>
    <p className="text-xs text-muted-foreground mb-2">#{serviceOrder.id} - {serviceOrder.entity?.name}</p>
    <div className="flex items-center justify-between text-xs">
      <span>{task.estimated_hours || 1}h est</span>
      <div className="flex items-center gap-1">
        {task.assignee && (
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-xs">
              {task.assignee.email.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  </div>
);

// Enhanced Team Management Component
const TeamManagement = ({ 
  teamMembers, 
  onAssignTask,
  teamAnalytics
}: { 
  teamMembers: TeamMember[];
  onAssignTask: (params: { taskId: number; assigneeId: number; estimatedHours?: number }) => void;
  teamAnalytics?: any;
}) => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showAutoAssign, setShowAutoAssign] = useState(false);
  const [autoAssignParams, setAutoAssignParams] = useState({
    taskType: '',
    priority: 'medium',
    estimatedHours: 2
  });
  const [suggestionResult, setSuggestionResult] = useState<any>(null);
  const { toast } = useToast();

  const handleAutoAssign = async () => {
    try {
      const response = await fetch(`/api/ops/suggest-assignee?${new URLSearchParams({
        taskType: autoAssignParams.taskType,
        priority: autoAssignParams.priority,
        estimatedHours: autoAssignParams.estimatedHours.toString()
      })}`);
      
      if (!response.ok) throw new Error('Failed to get suggestion');
      const result = await response.json();
      setSuggestionResult(result);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get assignment suggestion',
        variant: 'destructive'
      });
    }
  };

  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 70) return 'text-orange-600 bg-orange-50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getSlaColor = (compliance: number) => {
    if (compliance >= 95) return 'text-green-600';
    if (compliance >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Team Management</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAutoAssign(true)}
            data-testid="button-auto-assign"
          >
            <Target className="h-4 w-4 mr-2" />
            Auto-Assign Task
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        </div>
      </div>

      {/* Team Performance Summary */}
      {teamAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Completion Rate</p>
                  <p className="text-2xl font-bold text-green-600">{teamAnalytics.overview?.completion_rate || 0}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Completion Time</p>
                  <p className="text-2xl font-bold">{teamAnalytics.overview?.avg_completion_time || 0}h</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">SLA Compliance</p>
                  <p className="text-2xl font-bold text-green-600">{teamAnalytics.overview?.sla_compliance_rate || 0}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Tasks</p>
                  <p className="text-2xl font-bold">{teamAnalytics.overview?.total_tasks - teamAnalytics.overview?.completed_tasks || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member) => {
          const workloadPercentage = member.workload_capacity || 0;
          const overdueTasks = member.overdue_tasks || 0;
          
          return (
            <Card 
              key={member.id} 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setSelectedMember(member)}
              data-testid={`team-member-card-${member.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {member.email.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{member.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    {overdueTasks > 0 && (
                      <Badge variant="destructive" size="sm" className="mt-1">
                        {overdueTasks} overdue
                      </Badge>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                    getWorkloadColor(workloadPercentage)
                  }`}>
                    {workloadPercentage}%
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* Tasks Overview */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">Active</p>
                      <p className="font-semibold">{member.active_tasks}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">This Week</p>
                      <p className="font-semibold">{member.completed_this_week}</p>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SLA Compliance</span>
                      <span className={`font-medium ${getSlaColor(member.sla_compliance)}`}>
                        {member.sla_compliance}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Completion</span>
                      <span className="font-medium">{member.avg_completion_time}h</span>
                    </div>
                  </div>
                  
                  {/* Workload Indicator */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Workload Capacity</span>
                      <span className="text-muted-foreground">
                        {member.current_workload_hours || 0}/{member.max_capacity_hours || 40}h
                      </span>
                    </div>
                    <Progress 
                      value={workloadPercentage} 
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Auto-Assignment Modal */}
      <Dialog open={showAutoAssign} onOpenChange={setShowAutoAssign}>
        <DialogContent data-testid="modal-auto-assign">
          <DialogHeader>
            <DialogTitle>Smart Task Assignment</DialogTitle>
            <DialogDescription>
              Get AI-powered suggestions for optimal task assignment based on workload and performance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-type">Task Type (Optional)</Label>
              <Input
                id="task-type"
                placeholder="e.g., company-formation, compliance"
                value={autoAssignParams.taskType}
                onChange={(e) => setAutoAssignParams(prev => ({ ...prev, taskType: e.target.value }))}
                data-testid="input-task-type"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={autoAssignParams.priority} 
                  onValueChange={(value) => setAutoAssignParams(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger id="priority" data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="estimated-hours">Estimated Hours</Label>
                <Input
                  id="estimated-hours"
                  type="number"
                  min="1"
                  max="40"
                  value={autoAssignParams.estimatedHours}
                  onChange={(e) => setAutoAssignParams(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 2 }))}
                  data-testid="input-estimated-hours"
                />
              </div>
            </div>
            
            <Button onClick={handleAutoAssign} className="w-full" data-testid="button-get-suggestion">
              <Target className="h-4 w-4 mr-2" />
              Get Assignment Suggestion
            </Button>
            
            {/* Suggestion Result */}
            {suggestionResult && (
              <Card className="mt-4" data-testid="assignment-suggestion">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Recommended Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {suggestionResult.suggested_assignee ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <Avatar>
                          <AvatarFallback>
                            {suggestionResult.suggested_assignee.email.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{suggestionResult.suggested_assignee.email}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {suggestionResult.suggested_assignee.role}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          Score: {suggestionResult.suggested_assignee.score}%
                        </Badge>
                      </div>
                      
                      <div className="text-sm">
                        <p className="font-medium mb-1">Recommendation Reason:</p>
                        <p className="text-muted-foreground">{suggestionResult.reason}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Current Workload</p>
                          <p className="font-medium">{suggestionResult.suggested_assignee.workload_percentage}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Performance Score</p>
                          <p className="font-medium">{suggestionResult.suggested_assignee.performance_score}%</p>
                        </div>
                      </div>
                      
                      {suggestionResult.alternatives && suggestionResult.alternatives.length > 0 && (
                        <div>
                          <p className="font-medium text-sm mb-2">Alternative Options:</p>
                          <div className="space-y-1">
                            {suggestionResult.alternatives.map((alt: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs p-2 bg-gray-50 rounded">
                                <span>{alt.email}</span>
                                <span>Workload: {alt.workload_percentage}% | Performance: {alt.performance_score}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                      <p className="font-medium">{suggestionResult.reason}</p>
                      {suggestionResult.alternatives && (
                        <div className="mt-3">
                          <p className="text-sm text-muted-foreground mb-2">Consider these team members:</p>
                          <div className="space-y-1">
                            {suggestionResult.alternatives.map((alt: any, idx: number) => (
                              <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                                {alt.email} - {alt.workload_percentage}% workload
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Performance Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Workload Distribution</h4>
              <div className="space-y-3">
                {teamMembers.map(member => {
                  const workloadPercentage = member.workload_capacity || 0;
                  return (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {member.email.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm w-32 truncate">{member.email}</span>
                      <Progress 
                        value={workloadPercentage}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-12">{workloadPercentage}%</span>
                      <Badge 
                        variant={workloadPercentage >= 90 ? 'destructive' : workloadPercentage >= 70 ? 'secondary' : 'default'}
                        size="sm"
                      >
                        {member.current_workload_hours || 0}h
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">SLA Compliance Rates</h4>
              <div className="space-y-3">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {member.email.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm w-32 truncate">{member.email}</span>
                    <Progress 
                      value={member.sla_compliance} 
                      className="flex-1"
                    />
                    <span className={`text-xs font-medium w-12 ${getSlaColor(member.sla_compliance)}`}>
                      {member.sla_compliance}%
                    </span>
                    {member.overdue_tasks > 0 && (
                      <Badge variant="destructive" size="sm">
                        {member.overdue_tasks} overdue
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// SLA Monitoring Component
const SlaMonitoring = ({ 
  slaTimers, 
  serviceOrders,
  onSlaControl
}: { 
  slaTimers: SlaTimer[];
  serviceOrders: ServiceOrder[];
  onSlaControl: (params: { serviceOrderId: number; action: 'pause' | 'resume'; reason: string }) => void;
}) => {
  const [pauseReason, setPauseReason] = useState('');
  const [selectedTimer, setSelectedTimer] = useState<SlaTimer | null>(null);

  const criticalTimers = slaTimers.filter(t => t.escalation_level === 'critical' || t.current_status === 'breached');
  const warningTimers = slaTimers.filter(t => t.escalation_level === 'warning');
  const runningTimers = slaTimers.filter(t => t.current_status === 'running' && !t.escalation_level);
  const pausedTimers = slaTimers.filter(t => t.current_status === 'paused');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SLA Monitoring</h2>
        <div className="flex items-center gap-2">
          <Badge variant="destructive">{criticalTimers.length} Critical</Badge>
          <Badge variant="secondary">{warningTimers.length} Warning</Badge>
          <Badge variant="default">{pausedTimers.length} Paused</Badge>
        </div>
      </div>

      {/* SLA Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-sla-critical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical / Breached</p>
                <p className="text-2xl font-bold text-red-600">{criticalTimers.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-sla-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warning</p>
                <p className="text-2xl font-bold text-orange-500">{warningTimers.length}</p>
              </div>
              <Timer className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-sla-running">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Track</p>
                <p className="text-2xl font-bold text-green-600">{runningTimers.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-sla-paused">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paused</p>
                <p className="text-2xl font-bold text-gray-600">{pausedTimers.length}</p>
              </div>
              <PauseCircle className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time SLA Timers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Active SLA Timers ({slaTimers.length})
            <Badge variant="outline" className="ml-auto">
              Last updated: {new Date().toLocaleTimeString()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Real-time monitoring of service delivery deadlines with automatic escalations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {slaTimers.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">
                  No active SLA timers. All services are completed or not yet started.
                </p>
              </div>
            ) : (
              slaTimers.map((timer) => {
                const serviceOrder = serviceOrders.find(o => o.id === timer.service_order_id);
                
                return (
                  <Card 
                    key={timer.id} 
                    className={`${getSlaStatusColor(timer)} border-l-4`} 
                    data-testid={`sla-timer-${timer.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getSlaStatusIcon(timer)}
                          <div>
                            <h4 className="font-semibold">#{serviceOrder?.id} - {timer.service_type}</h4>
                            <p className="text-sm text-muted-foreground">{timer.entity_name}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {timer.current_status === 'paused' ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                  Resume
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Resume SLA Timer</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Please provide a reason for resuming the SLA timer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Textarea
                                  placeholder="Reason for resuming..."
                                  id="resume-reason"
                                />
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction>Resume Timer</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <PauseCircle className="h-4 w-4 mr-1" />
                                  Pause
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Pause SLA Timer</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Please provide a reason for pausing the SLA timer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Textarea
                                  placeholder="Reason for pausing..."
                                  id="pause-reason"
                                />
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction>Pause Timer</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          
                          {timer.current_status === 'breached' && (
                            <Badge variant="destructive" className="animate-pulse">
                              OVERDUE
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium capitalize">{timer.current_status.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Time Remaining</p>
                          <p className={`font-medium ${timer.minutes_remaining <= 0 ? 'text-red-600' : ''}`}>
                            {formatTimeRemaining(timer.minutes_remaining)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Paused Time</p>
                          <p className="font-medium">{Math.round(timer.total_paused_minutes / 60)}h {timer.total_paused_minutes % 60}m</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Baseline</p>
                          <p className="font-medium">{timer.baseline_hours}h</p>
                        </div>
                      </div>
                      
                      {timer.pause_reasons && timer.pause_reasons.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-muted-foreground mb-1">Recent Activity:</p>
                          <div className="text-xs space-y-1">
                            {timer.pause_reasons.slice(-2).map((reason, idx) => (
                              <p key={idx} className="text-muted-foreground">{reason}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// SLA Timer Card Component
const SlaTimerCard = ({ 
  timer, 
  serviceOrder, 
  timeRemaining,
  onPause,
  onResume
}: {
  timer: SlaTimer;
  serviceOrder?: ServiceOrder;
  timeRemaining: { hours: number; minutes: number; isOverdue: boolean };
  onPause: (reason: string) => void;
  onResume: (reason: string) => void;
}) => {
  const [pauseReason, setPauseReason] = useState('');
  const [resumeReason, setResumeReason] = useState('');
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  return (
    <Card className={`${getSlaStatusColor(timer)} border-l-4`} data-testid={`sla-timer-${timer.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold">#{serviceOrder?.id} - {serviceOrder?.service_type}</h4>
            <p className="text-sm text-muted-foreground">{serviceOrder?.entity?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {timer.current_status === 'paused' ? (
              <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Resume SLA Timer</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please provide a reason for resuming the SLA timer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Reason for resuming..."
                    value={resumeReason}
                    onChange={(e) => setResumeReason(e.target.value)}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => {
                        onResume(resumeReason);
                        setResumeReason('');
                        setShowResumeDialog(false);
                      }}
                      disabled={!resumeReason.trim()}
                    >
                      Resume Timer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <PauseCircle className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Pause SLA Timer</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please provide a reason for pausing the SLA timer (e.g., waiting for client response, government processing).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Textarea
                    placeholder="Reason for pausing..."
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => {
                        onPause(pauseReason);
                        setPauseReason('');
                        setShowPauseDialog(false);
                      }}
                      disabled={!pauseReason.trim()}
                    >
                      Pause Timer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{timer.current_status.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Time Remaining</p>
            <p className={`font-medium ${timeRemaining.isOverdue ? 'text-red-600' : ''}`}>
              {timeRemaining.isOverdue ? '-' : ''}{timeRemaining.hours}h {timeRemaining.minutes}m
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Paused Time</p>
            <p className="font-medium">{Math.round(timer.total_paused_minutes / 60)}h {timer.total_paused_minutes % 60}m</p>
          </div>
          <div>
            <p className="text-muted-foreground">Baseline</p>
            <p className="font-medium">{timer.baseline_hours}h</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Document Management Component
const DocumentManagement = ({ serviceOrders }: { serviceOrders: ServiceOrder[] }) => {
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Document Management</h2>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Orders List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Service Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {serviceOrders.map(order => (
                  <div
                    key={order.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedOrder?.id === order.id ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedOrder(order)}
                    data-testid={`document-order-${order.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">#{order.id}</p>
                      <Badge size="sm" className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{order.service_type}</p>
                    <p className="text-xs font-medium">{order.entity?.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <FileText className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">
                        {order.documents?.length || 0} documents
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Document List and Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedOrder ? `Documents for #${selectedOrder.id}` : 'Select a Service Order'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOrder ? (
              <div className="space-y-4">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag & drop files or click to upload
                  </p>
                  <Button variant="outline" size="sm">
                    Select Files
                  </Button>
                </div>

                {/* Documents List */}
                <div className="space-y-2">
                  {selectedOrder.documents?.map(doc => (
                    <DocumentCard key={doc.id} document={doc} />
                  )) || (
                    <p className="text-center text-muted-foreground py-8">
                      No documents uploaded yet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a service order to view and manage documents.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Document Card Component
const DocumentCard = ({ document }: { document: any }) => (
  <div className="flex items-center justify-between p-3 border rounded-lg" data-testid={`document-${document.id}`}>
    <div className="flex items-center gap-3">
      <FileText className="h-5 w-5 text-muted-foreground" />
      <div>
        <p className="font-medium text-sm">{document.original_filename}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{document.doctype}</span>
          <span>•</span>
          <span>{(document.file_size / 1024 / 1024).toFixed(2)} MB</span>
          <span>•</span>
          <Badge size="sm" variant={document.status === 'approved' ? 'default' : 'secondary'}>
            {document.status}
          </Badge>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost">
        <Eye className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost">
        <Download className="h-4 w-4" />
      </Button>
      {document.status === 'pending_review' && (
        <Button size="sm" variant="ghost">
          <CheckCheck className="h-4 w-4" />
        </Button>
      )}
    </div>
  </div>
);

// Communications Center Component
const CommunicationsCenter = ({ serviceOrders }: { serviceOrders: ServiceOrder[] }) => {
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'client' | 'internal'>('client');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Communications Center</h2>
        <Button>
          <Send className="h-4 w-4 mr-2" />
          Send Notification
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Orders List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Active Communications</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {serviceOrders.map(order => (
                  <div
                    key={order.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedOrder?.id === order.id ? 'bg-accent' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedOrder(order)}
                    data-testid={`comm-order-${order.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">#{order.id}</p>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span className="text-xs">{order.messages?.length || 0}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{order.service_type}</p>
                    <p className="text-xs font-medium">{order.entity?.name}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages Thread */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedOrder ? `Messages for #${selectedOrder.id}` : 'Select a Service Order'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOrder ? (
              <div className="space-y-4">
                {/* Messages List */}
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {selectedOrder.messages?.map(message => (
                      <MessageCard key={message.id} message={message} />
                    )) || (
                      <p className="text-center text-muted-foreground py-8">
                        No messages yet.
                      </p>
                    )}
                  </div>
                </ScrollArea>

                {/* New Message Form */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Label>Message Type:</Label>
                    <Select value={messageType} onValueChange={(value: 'client' | 'internal') => setMessageType(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={`Type your ${messageType} message...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                      data-testid="input-new-message"
                    />
                    <Button 
                      onClick={() => {
                        // Handle message send
                        setNewMessage('');
                      }}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a service order to view and send messages.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Message Card Component
const MessageCard = ({ message }: { message: any }) => (
  <div className="flex gap-3" data-testid={`message-${message.id}`}>
    <Avatar className="h-8 w-8">
      <AvatarFallback>
        {message.author?.email?.slice(0, 2).toUpperCase() || 'U'}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <p className="font-medium text-sm">{message.author?.email || 'Unknown'}</p>
        <Badge size="sm" variant={message.visibility === 'client' ? 'default' : 'secondary'}>
          {message.visibility}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(message.created_at).toLocaleDateString()}
        </span>
      </div>
      <p className="text-sm">{message.body}</p>
      {message.subject && (
        <p className="text-xs text-muted-foreground mt-1">Re: {message.subject}</p>
      )}
    </div>
  </div>
);

// Service Order Detail Modal
const ServiceOrderDetailModal = ({ 
  order, 
  isOpen, 
  onClose, 
  onStatusUpdate 
}: {
  order: ServiceOrder;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (newStatus: string, notes?: string) => void;
}) => {
  const [newStatus, setNewStatus] = useState(order.status);
  const [notes, setNotes] = useState('');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="modal-service-order-detail">
        <DialogHeader>
          <DialogTitle>Service Order #{order.id}</DialogTitle>
          <DialogDescription>
            {order.service_type} for {order.entity?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Current Status</Label>
              <Badge className={`${getStatusColor(order.status)} mt-1`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Priority</Label>
              <Badge className={`${getPriorityColor(order.priority)} mt-1`}>
                {order.priority.toUpperCase()}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Progress</Label>
              <div className="mt-1">
                <Progress value={order.progress_percentage} />
                <p className="text-xs text-muted-foreground mt-1">{order.progress_percentage}% complete</p>
              </div>
            </div>
          </div>

          {/* Status Update Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status-select">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger id="status-select" data-testid="select-new-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting_client">Waiting Client</SelectItem>
                    <SelectItem value="waiting_government">Waiting Government</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status-notes">Notes (Optional)</Label>
                <Textarea
                  id="status-notes"
                  placeholder="Add notes about this status change..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-testid="textarea-status-notes"
                />
              </div>
              <Button 
                onClick={() => {
                  onStatusUpdate(newStatus, notes);
                  onClose();
                }}
                disabled={newStatus === order.status}
                data-testid="button-update-status"
              >
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Tasks Overview */}
          {order.tasks && order.tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tasks ({order.tasks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {order.tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium text-sm">{task.name}</p>
                        <p className="text-xs text-muted-foreground">{task.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge size="sm" className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                        <Badge size="sm" className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Task Detail Modal
const TaskDetailModal = ({ 
  task, 
  isOpen, 
  onClose, 
  onAssign 
}: {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assigneeId: number, estimatedHours?: number) => void;
}) => {
  const [assigneeId, setAssigneeId] = useState<string>(task.assignee_id?.toString() || '');
  const [estimatedHours, setEstimatedHours] = useState(task.estimated_hours || 1);

  // Mock team members - in real implementation, fetch from API
  const teamMembers = [
    { id: 1, email: 'john@example.com', role: 'ops_exec' },
    { id: 2, email: 'jane@example.com', role: 'ops_lead' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-task-detail">
        <DialogHeader>
          <DialogTitle>{task.name}</DialogTitle>
          <DialogDescription>{task.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Badge className={`${getStatusColor(task.status)} mt-1`}>
                {task.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Priority</Label>
              <Badge className={`${getPriorityColor(task.priority)} mt-1`}>
                {task.priority.toUpperCase()}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Type</Label>
              <p className="text-sm mt-1 capitalize">{task.type.replace('_', ' ')}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">QA Required</Label>
              <p className="text-sm mt-1">{task.qa_required ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Assignment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Task Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="assignee-select">Assign To</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger id="assignee-select" data-testid="select-assignee">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.email} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estimated-hours">Estimated Hours</Label>
                <Input
                  id="estimated-hours"
                  type="number"
                  min="1"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 1)}
                  data-testid="input-estimated-hours"
                />
              </div>
              <Button 
                onClick={() => {
                  if (assigneeId) {
                    onAssign(parseInt(assigneeId), estimatedHours);
                  }
                  onClose();
                }}
                disabled={!assigneeId}
                data-testid="button-assign-task"
              >
                Assign Task
              </Button>
            </CardContent>
          </Card>

          {/* Checklist */}
          {task.checklist && task.checklist.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {task.checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={item.completed} 
                        readOnly 
                        className="rounded"
                      />
                      <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper Functions
const calculateTimeRemaining = (timer: SlaTimer) => {
  const now = new Date();
  const startedAt = new Date(timer.started_at);
  const elapsedMs = now.getTime() - startedAt.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
  const adjustedElapsedMinutes = elapsedMinutes - timer.total_paused_minutes;
  const baselineMinutes = timer.baseline_hours * 60;
  const remainingMinutes = baselineMinutes - adjustedElapsedMinutes;
  
  return {
    hours: Math.abs(Math.floor(remainingMinutes / 60)),
    minutes: Math.abs(remainingMinutes % 60),
    isOverdue: remainingMinutes < 0
  };
};

// Progress Tracking Component with Bottleneck Detection  
const ProgressTracking = ({ serviceOrders, slaTimers, teamMembers }: { 
  serviceOrders: ServiceOrder[]; 
  slaTimers: SlaTimer[]; 
  teamMembers: TeamMember[]; 
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  
  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    const total = serviceOrders.length;
    const completed = serviceOrders.filter(o => o.status === 'completed').length;
    const inProgress = serviceOrders.filter(o => ['in_progress', 'under_review'].includes(o.status)).length;
    const blocked = serviceOrders.filter(o => o.status === 'on_hold').length;
    const pending = serviceOrders.filter(o => o.status === 'created').length;
    const overdue = slaTimers.filter(t => t.current_status === 'breached').length;
    
    return { total, completed, inProgress, blocked, pending, overdue };
  }, [serviceOrders, slaTimers]);

  // Detect bottlenecks
  const bottlenecks = useMemo(() => {
    const issues = [];
    
    // Stagnant services (no updates for 5+ days)
    const stuckServices = serviceOrders.filter(order => {
      if (order.status === 'completed') return false;
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(order.updated_at || order.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate > 5;
    });
    
    if (stuckServices.length > 0) {
      issues.push({
        type: 'stagnant_services',
        severity: stuckServices.length > 5 ? 'high' : 'medium',
        count: stuckServices.length,
        description: `${stuckServices.length} services stuck for 5+ days`
      });
    }

    // Team overload  
    const overloaded = teamMembers.filter(m => (m.workload_capacity || 0) > 85);
    if (overloaded.length > 0) {
      issues.push({
        type: 'team_overload',
        severity: overloaded.some(m => (m.workload_capacity || 0) > 95) ? 'high' : 'medium',
        count: overloaded.length,
        description: `${overloaded.length} team members overloaded`
      });
    }

    // SLA breaches
    if (progressMetrics.overdue > 0) {
      issues.push({
        type: 'sla_breaches',
        severity: 'high',
        count: progressMetrics.overdue,
        description: `${progressMetrics.overdue} services breached SLA`
      });
    }

    return issues;
  }, [serviceOrders, teamMembers, progressMetrics]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Progress Tracking & Analytics</h2>
        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{progressMetrics.total}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{progressMetrics.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <Progress 
              value={progressMetrics.total > 0 ? (progressMetrics.completed / progressMetrics.total) * 100 : 0} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{progressMetrics.inProgress}</p>
              </div>
              <PlayCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold text-orange-500">{progressMetrics.blocked}</p>
              </div>
              <PauseCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-gray-600">{progressMetrics.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className={progressMetrics.overdue > 0 ? 'border-red-500' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className={`text-2xl font-bold ${progressMetrics.overdue > 0 ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>
                  {progressMetrics.overdue}
                </p>
              </div>
              {progressMetrics.overdue > 0 ? (
                <XCircle className="h-8 w-8 text-red-600 animate-pulse" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottleneck Analysis */}
      {bottlenecks.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Bottleneck Analysis ({bottlenecks.length} detected)
            </CardTitle>
            <CardDescription>Critical issues affecting service delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottlenecks.map((issue, idx) => (
                <Card key={idx} className={`border ${
                  issue.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {issue.severity === 'high' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                        )}
                        <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'}>
                          {issue.severity.toUpperCase()}
                        </Badge>
                        <span className="font-semibold">{issue.description}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{issue.count} items</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overall Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <TrendingUp className="h-12 w-12 mx-auto text-green-500 mb-2" />
              <p className="text-3xl font-bold text-green-600">
                {Math.round((progressMetrics.completed / Math.max(1, progressMetrics.total)) * 100)}%
              </p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
            
            <div className="space-y-2 text-sm">
              {progressMetrics.overdue === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Excellent SLA compliance - no overdue services
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  {progressMetrics.overdue} services overdue - needs attention
                </div>
              )}
              
              {bottlenecks.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  No critical bottlenecks detected
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  {bottlenecks.length} bottlenecks need attention
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Completed</span>
                <div className="flex items-center gap-2">
                  <Progress value={(progressMetrics.completed / Math.max(1, progressMetrics.total)) * 100} className="w-24 h-2" />
                  <span className="text-sm font-medium">{progressMetrics.completed}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">In Progress</span>
                <div className="flex items-center gap-2">
                  <Progress value={(progressMetrics.inProgress / Math.max(1, progressMetrics.total)) * 100} className="w-24 h-2" />
                  <span className="text-sm font-medium">{progressMetrics.inProgress}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending</span>
                <div className="flex items-center gap-2">
                  <Progress value={(progressMetrics.pending / Math.max(1, progressMetrics.total)) * 100} className="w-24 h-2" />
                  <span className="text-sm font-medium">{progressMetrics.pending}</span>
                </div>
              </div>
              
              {progressMetrics.blocked > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-orange-600">Blocked</span>
                  <div className="flex items-center gap-2">
                    <Progress value={(progressMetrics.blocked / Math.max(1, progressMetrics.total)) * 100} className="w-24 h-2" />
                    <span className="text-sm font-medium text-orange-600">{progressMetrics.blocked}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OperationsManager;