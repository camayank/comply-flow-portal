import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
} from 'lucide-react';
import { DashboardLayout } from '@/layouts';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { useAuth } from '@/hooks/use-auth';
import { get } from '@/lib/api';

interface DashboardStats {
  totalActiveOrders: number;
  pendingOrders: number;
  completedOrders: number;
  teamUtilization: number;
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
    </DashboardLayout>
  );
};

export default MobileOperationsPanelRefactored;
