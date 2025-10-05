import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Menu,
  X,
  Home,
  Calendar,
  Filter,
  Search,
  Plus,
  Eye
} from 'lucide-react';

const MobileOperationsPanel = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Fetch operations dashboard data
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/ops/dashboard-stats'],
  });

  // Fetch service orders
  const { data: serviceOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/ops/service-orders'],
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-purple-600" />
              <div>
                <h1 className="font-bold text-lg">Operations</h1>
                <p className="text-xs text-gray-500">Team workflow management</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs px-3">
              <Search className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Search</span>
            </Button>
            <Button size="sm" variant="outline" className="text-xs px-3">
              <Filter className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Filter</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t px-4 py-3">
            <nav className="space-y-2">
              <button
                onClick={() => {setActiveTab('dashboard'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-purple-50 text-purple-600' : 'text-gray-600'}`}
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => {setActiveTab('orders'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'orders' ? 'bg-purple-50 text-purple-600' : 'text-gray-600'}`}
              >
                <FileText className="h-4 w-4" />
                Service Orders
              </button>
              <button
                onClick={() => {setActiveTab('tasks'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'tasks' ? 'bg-purple-50 text-purple-600' : 'text-gray-600'}`}
              >
                <CheckCircle className="h-4 w-4" />
                Task Management
              </button>
              <button
                onClick={() => {setActiveTab('team'); setMobileMenuOpen(false);}}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'team' ? 'bg-purple-50 text-purple-600' : 'text-gray-600'}`}
              >
                <Users className="h-4 w-4" />
                Team Performance
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r min-h-screen">
          <div className="p-6">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'orders' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FileText className="h-4 w-4" />
                Service Orders
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'tasks' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <CheckCircle className="h-4 w-4" />
                Task Management
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'team' ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Users className="h-4 w-4" />
                Team Performance
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Operations Dashboard</h2>
                <p className="text-sm lg:text-base text-gray-600">Real-time overview of team performance and service delivery</p>
              </div>

              {/* Stats Cards - Mobile Responsive */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <Target className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mb-2" />
                      <p className="text-xs lg:text-sm text-gray-600">Total Orders</p>
                      <p className="text-xl lg:text-2xl font-bold">
                        {statsLoading ? '...' : (dashboardStats as any)?.totalActiveOrders || 0}
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
                        {statsLoading ? '...' : (dashboardStats as any)?.pendingOrders || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <Settings className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mb-2" />
                      <p className="text-xs lg:text-sm text-gray-600">In Progress</p>
                      <p className="text-xl lg:text-2xl font-bold">
                        {statsLoading ? '...' : (dashboardStats as any)?.inProgressOrders || 0}
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
                        {statsLoading ? '...' : (dashboardStats as any)?.completedOrders || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Team Performance</CardTitle>
                    <CardDescription>Current productivity metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Delivery Rate</span>
                          <span>85%</span>
                        </div>
                        <Progress value={85} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Quality Score</span>
                          <span>92%</span>
                        </div>
                        <Progress value={92} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>SLA Compliance</span>
                          <span>97%</span>
                        </div>
                        <Progress value={97} className="w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <CardDescription>Latest team actions and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="text-sm">
                          <p className="font-medium">Service order #1 updated</p>
                          <p className="text-xs text-gray-600">2 minutes ago</p>
                        </div>
                        <Badge className="bg-blue-500 text-white text-xs">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="text-sm">
                          <p className="font-medium">Document approval pending</p>
                          <p className="text-xs text-gray-600">15 minutes ago</p>
                        </div>
                        <Badge className="bg-yellow-500 text-white text-xs">Pending</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="text-sm">
                          <p className="font-medium">New task assigned</p>
                          <p className="text-xs text-gray-600">1 hour ago</p>
                        </div>
                        <Badge className="bg-green-500 text-white text-xs">Assigned</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Service Orders</h2>
                  <p className="text-sm lg:text-base text-gray-600">Manage client service requests and workflows</p>
                </div>
                <Button size="sm" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-4 py-2">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Create Order</span>
                </Button>
              </div>

              <div className="space-y-4">
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading service orders...</p>
                  </div>
                ) : (serviceOrders as any[]).length > 0 ? (
                  (serviceOrders as any[]).map((order: any) => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                            <CardDescription>Service: {order.serviceId}</CardDescription>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={`${getStatusColor(order.status)} text-white text-xs`}>
                              {order.status}
                            </Badge>
                            <Badge className={`${getPriorityColor(order.priority)} text-white text-xs`}>
                              {order.priority}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Entity ID:</span>
                              <p className="font-semibold">#{order.businessEntityId}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Amount:</span>
                              <p className="font-semibold">₹{order.totalAmount?.toLocaleString()}</p>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Progress:</span>
                              <span className="font-medium">{order.progress || 0}%</span>
                            </div>
                            <Progress value={order.progress || 0} className="w-full" />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 text-xs px-2 py-2">
                              <Eye className="h-3 w-3 mr-1" />
                              <span>View Details</span>
                            </Button>
                            <Button size="sm" className="flex-1 text-xs px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white">
                              <Settings className="h-3 w-3 mr-1" />
                              <span>Update</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No service orders</h3>
                    <p className="text-sm text-gray-600">Orders will appear here once clients start requesting services</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold mb-2">Task Management</h2>
                  <p className="text-sm lg:text-base text-gray-600">Organize and track team tasks across all projects</p>
                </div>
                <Button size="sm" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Create Task</span>
                </Button>
              </div>

              {/* Kanban-style Task Board */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      To Do
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm">Review incorporation docs</h4>
                        <p className="text-xs text-gray-600 mt-1">Priority: High</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline" className="text-xs">GST</Badge>
                          <span className="text-xs text-gray-500">Due today</span>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm">Update client status</h4>
                        <p className="text-xs text-gray-600 mt-1">Priority: Medium</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline" className="text-xs">ROC</Badge>
                          <span className="text-xs text-gray-500">Due tomorrow</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      In Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-sm">Process annual filing</h4>
                        <p className="text-xs text-gray-600 mt-1">Priority: High</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline" className="text-xs">Annual</Badge>
                          <span className="text-xs text-gray-500">In progress</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      Completed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-sm">Submit TDS returns</h4>
                        <p className="text-xs text-gray-600 mt-1">Completed today</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline" className="text-xs">TDS</Badge>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Team Performance</h2>
                <p className="text-sm lg:text-base text-gray-600">Monitor team productivity and workload distribution</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Team Workload</CardTitle>
                    <CardDescription>Current assignment distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            A
                          </div>
                          <div>
                            <p className="font-medium text-sm">Alex Johnson</p>
                            <p className="text-xs text-gray-600">Operations Lead</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">5 tasks</p>
                          <p className="text-xs text-gray-600">75% capacity</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            S
                          </div>
                          <div>
                            <p className="font-medium text-sm">Sarah Chen</p>
                            <p className="text-xs text-gray-600">Compliance Specialist</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">3 tasks</p>
                          <p className="text-xs text-gray-600">50% capacity</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            M
                          </div>
                          <div>
                            <p className="font-medium text-sm">Mike Rodriguez</p>
                            <p className="text-xs text-gray-600">Document Reviewer</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">7 tasks</p>
                          <p className="text-xs text-gray-600">90% capacity</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Metrics</CardTitle>
                    <CardDescription>This week's team statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Tasks Completed</span>
                          <span>42/50</span>
                        </div>
                        <Progress value={84} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Average Response Time</span>
                          <span>2.3 hours</span>
                        </div>
                        <Progress value={78} className="w-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Client Satisfaction</span>
                          <span>4.8/5.0</span>
                        </div>
                        <Progress value={96} className="w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-4 gap-1 py-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'dashboard' ? 'text-purple-600' : 'text-gray-600'}`}
          >
            <BarChart3 className="h-5 w-5 mb-1" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'orders' ? 'text-purple-600' : 'text-gray-600'}`}
          >
            <FileText className="h-5 w-5 mb-1" />
            Orders
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'tasks' ? 'text-purple-600' : 'text-gray-600'}`}
          >
            <CheckCircle className="h-5 w-5 mb-1" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex flex-col items-center py-2 px-1 text-xs ${activeTab === 'team' ? 'text-purple-600' : 'text-gray-600'}`}
          >
            <Users className="h-5 w-5 mb-1" />
            Team
          </button>
        </div>
      </div>

      {/* Spacer for bottom navigation on mobile */}
      <div className="lg:hidden h-16"></div>
    </div>
  );
};

export default MobileOperationsPanel;