/**
 * Refactored Operations Dashboard (Example)
 * Demonstrates the new UX consistency architecture
 */

import { useState } from 'react';
import { Plus, BarChart3, FileText, CheckCircle, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageSection } from '@/components/layouts/PageLayout';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { get } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingStatsCard } from '@/components/common/LoadingStates';

// Types
interface DashboardStats {
  totalActiveOrders: number;
  pendingOrders: number;
  completedOrders: number;
  avgCompletionTime: number;
}

interface ServiceOrder {
  id: number;
  clientName: string;
  serviceType: string;
  status: 'initiated' | 'docs_uploaded' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  assignedTo: string;
}

export default function OperationsDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'tasks' | 'team'>('dashboard');

  // Navigation configuration
  const navigation = [
    { label: 'Dashboard', href: '/operations', icon: BarChart3 },
    { label: 'Service Orders', href: '/operations/orders', icon: FileText, badge: 12 },
    { label: 'Task Management', href: '/operations/tasks', icon: CheckCircle },
    { label: 'Team Performance', href: '/operations/team', icon: Users },
  ];

  // Fetch dashboard stats using standard query hook
  const dashboardStatsQuery = useStandardQuery<DashboardStats>({
    queryKey: ['operations', 'dashboard-stats'],
    queryFn: () => get<DashboardStats>('/api/ops/dashboard-stats'),
    emptyState: {
      title: 'No data available',
      description: 'Dashboard statistics will appear here once data is available.',
    },
  });

  // Fetch service orders
  const serviceOrdersQuery = useStandardQuery<ServiceOrder[]>({
    queryKey: ['operations', 'service-orders'],
    queryFn: () => get<ServiceOrder[]>('/api/ops/service-orders'),
    emptyState: {
      title: 'No service orders',
      description: 'Service orders will appear here once clients place orders.',
      action: {
        label: 'Create Order',
        onClick: () => console.log('Create order clicked'),
      },
    },
  });

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

  return (
    <DashboardLayout
      navigation={navigation}
      title="Operations"
      user={{
        name: 'Operations Manager',
        email: 'ops@digicomply.com',
      }}
      onLogout={() => window.location.href = '/login'}
      showSearch
    >
      <div className="p-6 space-y-6">
        {/* Dashboard Stats Section */}
        <PageSection
          title="Operations Overview"
          description="Real-time overview of team performance and service delivery"
        >
          {dashboardStatsQuery.render((stats) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{stats.totalActiveOrders}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold">{stats.completedOrders}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Completion</p>
                      <p className="text-2xl font-bold">{stats.avgCompletionTime}d</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </PageSection>

        {/* Service Orders Section */}
        <PageSection
          title="Recent Service Orders"
          description="Latest service orders requiring attention"
          actions={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          }
        >
          {serviceOrdersQuery.render((orders) => (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{order.clientName}</h3>
                          <Badge variant="outline" className="text-xs">
                            {order.serviceType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Assigned to: {order.assignedTo} • Due: {new Date(order.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(order.priority)}>
                          {order.priority}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </PageSection>
      </div>
    </DashboardLayout>
  );
}
