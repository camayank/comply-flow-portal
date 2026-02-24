/**
 * Operations Task List View
 *
 * Full task list with:
 * - Filters (status, service type, due date, assigned to)
 * - Sorting (due date, priority, created)
 * - Task actions (start, complete, submit for QC)
 */

import { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { DashboardLayout } from '@/layouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  PlayCircle,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  ArrowUpDown,
  Filter,
  Inbox,
  Eye,
  Timer,
  User,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  useMyTasks,
  useUnassignedTasks,
  useTaskStats,
  useUpdateTaskStatus,
  OrderTask,
} from '@/features/operations/hooks';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';

// Task status badge component
function TaskStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; label: string; icon: typeof Clock }> = {
    ready: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Ready', icon: Inbox },
    in_progress: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'In Progress', icon: PlayCircle },
    qc_pending: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'QC Pending', icon: ClipboardCheck },
    qc_rejected: { color: 'bg-red-100 text-red-800 border-red-200', label: 'QC Rejected', icon: AlertTriangle },
    completed: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed', icon: CheckCircle },
    blocked: { color: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Blocked', icon: Clock },
  };
  const config = configs[status] || configs.blocked;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} inline-flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

type SortField = 'dueDate' | 'createdAt' | 'stepNumber' | 'name';
type SortOrder = 'asc' | 'desc';

export default function TasksView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // State for filters
  const [activeTab, setActiveTab] = useState<'my-tasks' | 'unassigned' | 'all'>('my-tasks');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Queries
  const myTasksQuery = useMyTasks();
  const unassignedTasksQuery = useUnassignedTasks();
  const taskStatsQuery = useTaskStats();
  const updateTaskStatus = useUpdateTaskStatus();

  // Determine if user can see unassigned tasks
  const canSeeUnassigned = user?.role === 'ops_manager' || user?.role === 'admin' ||
    user?.role === 'super_admin' || user?.role === 'ops_executive';

  // Get tasks based on active tab
  const baseTasks = useMemo(() => {
    if (activeTab === 'my-tasks') {
      return myTasksQuery.data?.tasks || [];
    } else if (activeTab === 'unassigned') {
      return unassignedTasksQuery.data?.tasks || [];
    }
    // 'all' - combine both
    return [
      ...(myTasksQuery.data?.tasks || []),
      ...(unassignedTasksQuery.data?.tasks || []),
    ];
  }, [activeTab, myTasksQuery.data, unassignedTasksQuery.data]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...baseTasks];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.taskId?.toLowerCase().includes(query) ||
        t.serviceName?.toLowerCase().includes(query) ||
        t.entityName?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'dueDate':
          aVal = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          bVal = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'stepNumber':
          aVal = a.stepNumber;
          bVal = b.stepNumber;
          break;
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return filtered;
  }, [baseTasks, statusFilter, searchQuery, sortField, sortOrder]);

  // Handle task actions
  const handleStartTask = (taskId: string | number) => {
    updateTaskStatus.mutate(
      { taskId, status: 'in_progress', notes: 'Task started' },
      {
        onSuccess: () => {
          toast({ title: 'Task started', description: 'You can now work on this task.' });
        },
        onError: (err) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleCompleteTask = (task: OrderTask) => {
    const newStatus = task.requiresQc ? 'qc_pending' : 'completed';
    updateTaskStatus.mutate(
      { taskId: task.id, status: newStatus, notes: task.requiresQc ? 'Submitted for QC review' : 'Task completed' },
      {
        onSuccess: () => {
          toast({
            title: task.requiresQc ? 'Submitted for QC' : 'Task completed',
            description: task.requiresQc ? 'Task sent for quality check.' : 'Task marked as complete.',
          });
        },
        onError: (err) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const isLoading = myTasksQuery.isLoading || unassignedTasksQuery.isLoading;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-gray-600">Manage and track your assigned tasks</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              myTasksQuery.refetch();
              unassignedTasksQuery.refetch();
              taskStatsQuery.refetch();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {taskStatsQuery.data && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className={statusFilter === 'ready' ? 'ring-2 ring-blue-500' : ''}>
              <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'ready' ? 'all' : 'ready')}>
                <div className="flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-gray-600">Ready</span>
                </div>
                <p className="text-2xl font-bold">{taskStatsQuery.data.byStatus?.ready || 0}</p>
              </CardContent>
            </Card>
            <Card className={statusFilter === 'in_progress' ? 'ring-2 ring-yellow-500' : ''}>
              <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}>
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-gray-600">In Progress</span>
                </div>
                <p className="text-2xl font-bold">{taskStatsQuery.data.byStatus?.in_progress || 0}</p>
              </CardContent>
            </Card>
            <Card className={statusFilter === 'qc_pending' ? 'ring-2 ring-purple-500' : ''}>
              <CardContent className="p-4 cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'qc_pending' ? 'all' : 'qc_pending')}>
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-purple-600" />
                  <span className="text-sm text-gray-600">QC Pending</span>
                </div>
                <p className="text-2xl font-bold">{taskStatsQuery.data.byStatus?.qc_pending || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-600">Unassigned</span>
                </div>
                <p className="text-2xl font-bold">{taskStatsQuery.data.unassigned || 0}</p>
              </CardContent>
            </Card>
            <Card className={taskStatsQuery.data.overdue > 0 ? 'bg-red-50 border-red-200' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-5 w-5 ${taskStatsQuery.data.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className={`text-sm ${taskStatsQuery.data.overdue > 0 ? 'text-red-600' : 'text-gray-600'}`}>Overdue</span>
                </div>
                <p className={`text-2xl font-bold ${taskStatsQuery.data.overdue > 0 ? 'text-red-700' : ''}`}>
                  {taskStatsQuery.data.overdue || 0}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList>
                  <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
                  {canSeeUnassigned && (
                    <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
                  )}
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="qc_pending">QC Pending</SelectItem>
                  <SelectItem value="qc_rejected">QC Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={`${sortField}:${sortOrder}`} onValueChange={(v) => {
                const [field, order] = v.split(':');
                setSortField(field as SortField);
                setSortOrder(order as SortOrder);
              }}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dueDate:asc">Due Date (Earliest)</SelectItem>
                  <SelectItem value="dueDate:desc">Due Date (Latest)</SelectItem>
                  <SelectItem value="createdAt:desc">Newest First</SelectItem>
                  <SelectItem value="createdAt:asc">Oldest First</SelectItem>
                  <SelectItem value="name:asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name:desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Task Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-gray-500">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin mb-2" />
                Loading tasks...
              </div>
            ) : filteredAndSortedTasks.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <CheckCircle className="h-10 w-10 mx-auto text-green-500 mb-2" />
                <p className="font-medium">No tasks found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedTasks.map((task) => {
                      const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), new Date()) &&
                        !['completed', 'skipped', 'cancelled'].includes(task.status);

                      return (
                        <TableRow key={task.id} className={isOverdue ? 'bg-red-50' : ''}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{task.name}</p>
                              <p className="text-xs text-gray-500">{task.taskId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TaskStatusBadge status={task.status} />
                          </TableCell>
                          <TableCell>
                            <div>
                              {task.serviceName && <p className="text-sm">{task.serviceName}</p>}
                              {task.entityName && <p className="text-xs text-gray-500">{task.entityName}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {task.dueDate ? (
                              <div className={isOverdue ? 'text-red-600' : ''}>
                                <p className="text-sm">{format(new Date(task.dueDate), 'MMM d, yyyy')}</p>
                                <p className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {task.assignedToName ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{task.assignedToName}</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-purple-600">Unassigned</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {task.status === 'ready' && task.assignedTo === user?.id && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStartTask(task.id)}
                                  disabled={updateTaskStatus.isPending}
                                >
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                  Start
                                </Button>
                              )}
                              {task.status === 'in_progress' && task.assignedTo === user?.id && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteTask(task)}
                                  disabled={updateTaskStatus.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  {task.requiresQc ? 'Submit QC' : 'Complete'}
                                </Button>
                              )}
                              {task.status === 'qc_rejected' && task.assignedTo === user?.id && (
                                <Badge variant="destructive" className="text-xs">Needs Revision</Badge>
                              )}
                              <Link href={`/ops/tasks/${task.taskId || task.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
