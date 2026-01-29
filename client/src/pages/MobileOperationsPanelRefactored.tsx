import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Settings, 
  Users, 
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Target,
  Calendar,
  Plus,
  Eye
} from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { get } from '@/lib/api';

interface DashboardStats {
  totalActiveOrders: number;
  pendingOrders: number;
  completedOrders: number;
  teamUtilization: number;
}

interface ServiceOrder {
  id: number;
  clientName: string;
  serviceName: string;
  status: string;
  priority: string;
  assignedTo: string;
  dueDate: string;
  progress: number;
}

const MobileOperationsPanelRefactored = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Fetch operations dashboard data
  const statsQuery = useStandardQuery<DashboardStats>({
    queryKey: ['/api/ops/dashboard-stats'],
    queryFn: () => get<{ data: DashboardStats }>('/api/ops/dashboard-stats').then(res => res.data),
  });

  // Fetch service orders
  const ordersQuery = useStandardQuery<ServiceOrder[]>({
    queryKey: ['/api/ops/service-orders'],
    queryFn: () => get<{ data: ServiceOrder[] }>('/api/ops/service-orders').then(res => res.data),
    emptyState: {
      title: 'No service orders found',
      description: 'Service orders will appear here once clients submit requests.',
    },
  });

  const navigation = [
    { label: 'Dashboard', href: '#', icon: BarChart3, current: activeTab === 'dashboard', onClick: () => setActiveTab('dashboard') },
    { label: 'Service Orders', href: '#', icon: FileText, current: activeTab === 'orders', onClick: () => setActiveTab('orders') },
    { label: 'Task Management', href: '#', icon: CheckCircle, current: activeTab === 'tasks', onClick: () => setActiveTab('tasks') },
    { label: 'Team Performance', href: '#', icon: Users, current: activeTab === 'team', onClick: () => setActiveTab('team') },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'docs_uploaded': return 'bg-yellow-500';
      case 'initiated': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const dashboardStats = statsQuery.data;

  return (
    <DashboardLayout
      title="Operations"
      navigation={navigation}
    >
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
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

          {/* Performance Overview */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 text-sm lg:text-base">Today's Performance</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Order Completion</span>
                    <span className="font-semibold">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Team Productivity</span>
                    <span className="font-semibold">82%</span>
                  </div>
                  <Progress value={82} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Client Satisfaction</span>
                    <span className="font-semibold">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold mb-2">Service Orders</h2>
              <p className="text-sm lg:text-base text-gray-600">Manage and track all service requests</p>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>

          {/* Service Orders List */}
          {ordersQuery.render((orders) => (
            <div className="grid gap-4">
              {orders?.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm lg:text-base">{order.clientName}</h3>
                          <p className="text-xs lg:text-sm text-gray-600">{order.serviceName}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={`${getStatusColor(order.status)} text-white text-xs`}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={`${getPriorityColor(order.priority)} text-white text-xs`}>
                            {order.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col lg:flex-row lg:items-center gap-3 text-xs lg:text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{order.assignedTo}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Due: {new Date(order.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-semibold">{order.progress}%</span>
                        </div>
                        <Progress value={order.progress} className="h-2" />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1 text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs">
                          Update Status
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold mb-2">Task Management</h2>
            <p className="text-sm lg:text-base text-gray-600">Organize and prioritize team tasks</p>
          </div>

          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">Task management coming soon</p>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold mb-2">Team Performance</h2>
            <p className="text-sm lg:text-base text-gray-600">Monitor team productivity and efficiency</p>
          </div>

          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">Team performance metrics coming soon</p>
              <Button variant="outline">
                View Team Stats
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default MobileOperationsPanelRefactored;
