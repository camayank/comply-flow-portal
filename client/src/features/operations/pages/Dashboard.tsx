import * as React from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Target,
  Calendar,
  Plus,
  ListTodo,
  FileSearch,
  PlayCircle,
  ClipboardCheck,
  Inbox,
  ArrowRight,
  Timer,
} from 'lucide-react';
import { DashboardLayout } from '@/layouts';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { useAuth } from '@/hooks/use-auth';
import { get } from '@/lib/api';
import {
  useMyTasks,
  useUnassignedTasks,
  useTaskStats,
  useUpdateTaskStatus,
  OrderTask,
} from '@/features/operations/hooks';

interface DashboardStats {
  totalActiveOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  atRiskOrders: number;
  breachedOrders: number;
  teamUtilization: number;
  opsTeamSize: number;
  unassignedOrders: number;
}

// Task status badge component
function TaskStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; label: string }> = {
    ready: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Ready' },
    in_progress: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'In Progress' },
    qc_pending: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'QC Pending' },
    qc_rejected: { color: 'bg-red-100 text-red-800 border-red-200', label: 'QC Rejected' },
    completed: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
    blocked: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Blocked' },
  };
  const config = configs[status] || configs.blocked;
  return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
}

// Task card component for displaying individual tasks
function TaskCard({
  task,
  onStart,
  isStarting,
}: {
  task: OrderTask;
  onStart?: () => void;
  isStarting?: boolean;
}) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() &&
    !['completed', 'skipped', 'cancelled'].includes(task.status);

  return (
    <div className={`p-3 border rounded-lg ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{task.name}</span>
            <TaskStatusBadge status={task.status} />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {task.serviceName && <span>{task.serviceName}</span>}
            {task.entityName && <span> - {task.entityName}</span>}
          </div>
          {task.dueDate && (
            <div className={`text-xs mt-1 flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
              <Timer className="h-3 w-3" />
              <span>
                {isOverdue ? 'Overdue: ' : 'Due: '}
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.status === 'ready' && onStart && (
            <Button size="sm" onClick={onStart} disabled={isStarting}>
              <PlayCircle className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
          {task.status === 'qc_rejected' && (
            <Badge variant="destructive" className="text-xs">Needs Revision</Badge>
          )}
          <Link href={`/ops/tasks/${task.taskId}`}>
            <Button size="sm" variant="outline">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

const MobileOperationsPanelRefactored = () => {
  const { user: authUser } = useAuth();

  // Use actual authenticated user data
  const user = {
    name: authUser?.fullName || authUser?.username || 'Operations User',
    email: authUser?.email || '',
  };

  // Fetch operations dashboard data
  const statsQuery = useStandardQuery<DashboardStats>({
    queryKey: ['/api/ops/dashboard-stats'],
    queryFn: () => get<{ data: DashboardStats }>('/api/ops/dashboard-stats').then(res => res.data),
  });

  // Fetch task data from new task API
  const myTasksQuery = useMyTasks();
  const unassignedTasksQuery = useUnassignedTasks();
  const taskStatsQuery = useTaskStats();
  const updateTaskStatus = useUpdateTaskStatus();

  // Handler to start a task
  const handleStartTask = (taskId: string | number) => {
    updateTaskStatus.mutate({
      taskId,
      status: 'in_progress',
      notes: 'Task started from dashboard',
    });
  };

  // Main navigation - routes to other Operations screens
  const navigation = [
    { label: 'Dashboard', href: '/operations', icon: BarChart3 },
    { label: 'Work Queue', href: '/work-queue', icon: ListTodo },
    { label: 'Document Review', href: '/ops/document-review', icon: FileSearch },
    { label: 'Escalations', href: '/escalations', icon: AlertTriangle },
    { label: 'Service Requests', href: '/ops/service-requests', icon: FileText },
    { label: 'Team Performance', href: '/operations/team', icon: Users },
  ];

  return (
    <DashboardLayout
      title="Operations"
      navigation={navigation}
      user={user}
      profileHref="/operations/profile"
      settingsHref="/operations/settings"
    >
      <div className="space-y-6 p-4 lg:p-6">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold mb-2">Operations Dashboard</h2>
          <p className="text-sm lg:text-base text-gray-600">Real-time overview of team performance and service delivery</p>
        </div>

        {/* Stats Cards - Mobile Responsive */}
        {statsQuery.render((data) => (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Target className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mb-2" />
                  <p className="text-xs lg:text-sm text-gray-600">Total Orders</p>
                  <p className="text-xl lg:text-2xl font-bold">
                    {data?.totalActiveOrders || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600 mb-2" />
                  <p className="text-xs lg:text-sm text-gray-600">Pending</p>
                  <p className="text-xl lg:text-2xl font-bold">
                    {data?.pendingOrders || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 mb-2" />
                  <p className="text-xs lg:text-sm text-gray-600">Completed</p>
                  <p className="text-xl lg:text-2xl font-bold">
                    {data?.completedOrders || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Users className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 mb-2" />
                  <p className="text-xs lg:text-sm text-gray-600">Team Utilization</p>
                  <p className="text-xl lg:text-2xl font-bold">
                    {data?.teamUtilization || 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm lg:text-base">Quick Actions</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
                <Plus className="h-5 w-5" />
                <span className="text-xs">New Order</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Schedule</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
                <Users className="h-5 w-5" />
                <span className="text-xs">Assign Task</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2">
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Task Stats Overview */}
        {taskStatsQuery.data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Inbox className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mb-2" />
                  <p className="text-xs lg:text-sm text-blue-600">Ready Tasks</p>
                  <p className="text-xl lg:text-2xl font-bold text-blue-800">
                    {taskStatsQuery.data.byStatus?.ready || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <PlayCircle className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-600 mb-2" />
                  <p className="text-xs lg:text-sm text-yellow-600">In Progress</p>
                  <p className="text-xl lg:text-2xl font-bold text-yellow-800">
                    {taskStatsQuery.data.byStatus?.in_progress || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <ClipboardCheck className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 mb-2" />
                  <p className="text-xs lg:text-sm text-purple-600">QC Pending</p>
                  <p className="text-xl lg:text-2xl font-bold text-purple-800">
                    {taskStatsQuery.data.byStatus?.qc_pending || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={`${taskStatsQuery.data.overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <AlertTriangle className={`h-6 w-6 lg:h-8 lg:w-8 ${taskStatsQuery.data.overdue > 0 ? 'text-red-600' : 'text-gray-400'} mb-2`} />
                  <p className={`text-xs lg:text-sm ${taskStatsQuery.data.overdue > 0 ? 'text-red-600' : 'text-gray-500'}`}>Overdue</p>
                  <p className={`text-xl lg:text-2xl font-bold ${taskStatsQuery.data.overdue > 0 ? 'text-red-800' : 'text-gray-600'}`}>
                    {taskStatsQuery.data.overdue || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* My Tasks Section */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                My Tasks
              </CardTitle>
              {myTasksQuery.data?.counts && (
                <div className="flex gap-2">
                  {myTasksQuery.data.counts.actionRequired > 0 && (
                    <Badge variant="destructive">{myTasksQuery.data.counts.actionRequired} Action Required</Badge>
                  )}
                  {myTasksQuery.data.counts.awaitingQc > 0 && (
                    <Badge variant="secondary">{myTasksQuery.data.counts.awaitingQc} Awaiting QC</Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {myTasksQuery.isLoading ? (
              <div className="py-8 text-center text-gray-500">Loading tasks...</div>
            ) : myTasksQuery.error ? (
              <div className="py-8 text-center text-red-500">Failed to load tasks</div>
            ) : !myTasksQuery.data?.tasks?.length ? (
              <div className="py-8 text-center text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No tasks assigned to you</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show tasks needing action first (ready + qc_rejected) */}
                {[
                  ...(myTasksQuery.data.byStatus?.ready || []),
                  ...(myTasksQuery.data.byStatus?.qcRejected || []),
                  ...(myTasksQuery.data.byStatus?.inProgress || []),
                ].slice(0, 5).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStart={() => handleStartTask(task.id)}
                    isStarting={updateTaskStatus.isPending}
                  />
                ))}
                {myTasksQuery.data.tasks.length > 5 && (
                  <Link href="/ops/tasks">
                    <Button variant="link" className="w-full">
                      View all {myTasksQuery.data.tasks.length} tasks
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unassigned Tasks Section (for supervisors/managers) */}
        {(authUser?.role === 'ops_manager' || authUser?.role === 'admin' || authUser?.role === 'super_admin') && (
          <Card className="border-purple-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-purple-600" />
                  Unassigned Tasks
                </CardTitle>
                {unassignedTasksQuery.data?.count ? (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {unassignedTasksQuery.data.count} tasks
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {unassignedTasksQuery.isLoading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : unassignedTasksQuery.error ? (
                <div className="py-8 text-center text-red-500">Failed to load unassigned tasks</div>
              ) : !unassignedTasksQuery.data?.tasks?.length ? (
                <div className="py-8 text-center text-gray-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>All tasks are assigned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unassignedTasksQuery.data.tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="p-3 border border-purple-100 rounded-lg bg-purple-50/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{task.name}</span>
                          <div className="text-xs text-gray-500 mt-1">
                            Role: {task.assignedRole?.replace(/_/g, ' ')}
                            {task.serviceName && ` - ${task.serviceName}`}
                          </div>
                        </div>
                        <Link href={`/ops/tasks/${task.taskId}`}>
                          <Button size="sm" variant="outline">
                            Assign
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                  {unassignedTasksQuery.data.count > 5 && (
                    <Link href="/ops/tasks?filter=unassigned">
                      <Button variant="link" className="w-full text-purple-600">
                        View all {unassignedTasksQuery.data.count} unassigned tasks
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SLA Status Overview */}
        {statsQuery.render((data) => {
          const total = (data?.totalActiveOrders || 0);
          const atRisk = (data?.atRiskOrders || 0);
          const breached = (data?.breachedOrders || 0);
          const onTrack = total - atRisk - breached;
          const slaRate = total > 0 ? Math.round((onTrack / total) * 100) : 100;
          const completionRate = (data?.completedOrders || 0) > 0 && total > 0
            ? Math.round(((data?.completedOrders || 0) / (total + (data?.completedOrders || 0))) * 100)
            : 0;

          return (
            <>
              {/* Alert for breached items */}
              {breached > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-semibold text-red-800">{breached} SLA Breached</p>
                        <p className="text-sm text-red-600">Immediate attention required</p>
                      </div>
                      <Button variant="destructive" size="sm" className="ml-auto" onClick={() => window.location.href = '/escalations'}>
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* At-risk alert */}
              {atRisk > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-semibold text-orange-800">{atRisk} At Risk</p>
                        <p className="text-sm text-orange-600">Due within 4 hours</p>
                      </div>
                      <Button variant="outline" size="sm" className="ml-auto border-orange-300" onClick={() => window.location.href = '/work-queue'}>
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Overview */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4 text-sm lg:text-base">Performance Metrics</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">SLA Compliance</span>
                        <span className={`font-semibold ${slaRate >= 90 ? 'text-green-600' : slaRate >= 70 ? 'text-orange-600' : 'text-red-600'}`}>
                          {slaRate}%
                        </span>
                      </div>
                      <Progress value={slaRate} className={`h-2 ${slaRate >= 90 ? '' : slaRate >= 70 ? '[&>div]:bg-orange-500' : '[&>div]:bg-red-500'}`} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Team Utilization</span>
                        <span className="font-semibold">{data?.teamUtilization || 0}%</span>
                      </div>
                      <Progress value={data?.teamUtilization || 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Completion Rate</span>
                        <span className="font-semibold">{completionRate}%</span>
                      </div>
                      <Progress value={completionRate} className="h-2" />
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-green-600">{onTrack}</p>
                      <p className="text-xs text-gray-500">On Track</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-600">{atRisk}</p>
                      <p className="text-xs text-gray-500">At Risk</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-600">{data?.unassignedOrders || 0}</p>
                      <p className="text-xs text-gray-500">Unassigned</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default MobileOperationsPanelRefactored;
