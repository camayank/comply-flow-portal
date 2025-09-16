import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  ArrowUp,
  ArrowDown,
  Eye,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Settings,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Tablet
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface MobileDashboardData {
  criticalMetrics: {
    todayRevenue: number;
    activeServices: number;
    pendingApprovals: number;
    urgentTasks: number;
  };
  todaysActivity: {
    servicesStarted: number;
    servicesCompleted: number;
    paymentsReceived: number;
    clientMeetings: number;
  };
  urgentAlerts: Array<{
    type: string;
    message: string;
    priority?: string;
  }>;
  quickStats: {
    weeklyRevenue: number;
    monthlyTarget: number;
    targetProgress: number;
    teamUtilization: number;
  };
  recentUpdates: Array<{
    type: string;
    message: string;
    time: string;
  }>;
  actionItems: Array<{
    priority: string;
    task: string;
    count: number;
  }>;
}

const MobileDashboard = () => {
  const [currentView, setCurrentView] = useState<'overview' | 'metrics' | 'alerts' | 'activity'>('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { toast } = useToast();

  // Mobile dashboard data
  const { data: mobileData, isLoading, refetch } = useQuery<MobileDashboardData>({
    queryKey: ['/api/analytics/mobile-dashboard'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    setLastRefresh(new Date());
  }, [mobileData]);

  const handleRefresh = async () => {
    await refetch();
    setLastRefresh(new Date());
    toast({
      title: 'Dashboard Updated',
      description: 'Latest data has been loaded.',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (time: string) => {
    return new Date().toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'sla': return <Clock className="h-4 w-4" />;
      case 'payment': return <DollarSign className="h-4 w-4" />;
      case 'quality': return <Star className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading mobile dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              data-testid="button-menu"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Mobile Command</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {formatTime(lastRefresh.toISOString())}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Live
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-4 gap-1 p-2">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={currentView === item.id ? "default" : "ghost"}
                    size="sm"
                    className="flex flex-col gap-1 h-auto py-3"
                    onClick={() => {
                      setCurrentView(item.id as any);
                      setIsMenuOpen(false);
                    }}
                    data-testid={`button-${item.id}`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <div className="p-4 space-y-4">
        {currentView === 'overview' && (
          <div className="space-y-4">
            {/* Critical Metrics Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white" data-testid="card-today-revenue">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-xs">Today's Revenue</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(mobileData?.criticalMetrics.todayRevenue || 0)}
                      </p>
                    </div>
                    <DollarSign className="h-6 w-6 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white" data-testid="card-active-services">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-xs">Active Services</p>
                      <p className="text-lg font-bold">{mobileData?.criticalMetrics.activeServices || 0}</p>
                    </div>
                    <Activity className="h-6 w-6 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white" data-testid="card-pending-approvals">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-xs">Pending Approvals</p>
                      <p className="text-lg font-bold">{mobileData?.criticalMetrics.pendingApprovals || 0}</p>
                    </div>
                    <CheckCircle className="h-6 w-6 text-orange-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white" data-testid="card-urgent-tasks">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-xs">Urgent Tasks</p>
                      <p className="text-lg font-bold">{mobileData?.criticalMetrics.urgentTasks || 0}</p>
                    </div>
                    <AlertTriangle className="h-6 w-6 text-red-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <Card data-testid="card-quick-stats">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Weekly Revenue</span>
                  <span className="font-semibold">{formatCurrency(mobileData?.quickStats.weeklyRevenue || 0)}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Monthly Target</span>
                    <span className="text-sm font-medium">{mobileData?.quickStats.targetProgress}%</span>
                  </div>
                  <Progress value={mobileData?.quickStats.targetProgress || 0} className="h-2" />
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Target: {formatCurrency(mobileData?.quickStats.monthlyTarget || 0)}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Team Utilization</span>
                  <span className="font-semibold">{mobileData?.quickStats.teamUtilization}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Today's Activity */}
            <Card data-testid="card-todays-activity">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Today's Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-green-600">{mobileData?.todaysActivity.servicesCompleted || 0}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Completed</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-blue-600">{mobileData?.todaysActivity.servicesStarted || 0}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Started</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-purple-600">{mobileData?.todaysActivity.paymentsReceived || 0}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Payments</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-orange-600">{mobileData?.todaysActivity.clientMeetings || 0}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Meetings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === 'metrics' && (
          <div className="space-y-4">
            {/* Mobile-optimized metrics charts */}
            <Card data-testid="card-revenue-chart">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={[
                    { name: 'Mon', value: 12000 },
                    { name: 'Tue', value: 15000 },
                    { name: 'Wed', value: 18000 },
                    { name: 'Thu', value: 14000 },
                    { name: 'Fri', value: 20000 },
                    { name: 'Sat', value: 16000 },
                    { name: 'Sun', value: 13000 }
                  ]}>
                    <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-performance-metrics">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Service Completion</span>
                    <span className="text-xs font-medium">94%</span>
                  </div>
                  <Progress value={94} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Quality Score</span>
                    <span className="text-xs font-medium">4.5/5</span>
                  </div>
                  <Progress value={90} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Client Satisfaction</span>
                    <span className="text-xs font-medium">4.3/5</span>
                  </div>
                  <Progress value={86} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === 'alerts' && (
          <div className="space-y-4">
            {/* Urgent Alerts */}
            {mobileData?.urgentAlerts && mobileData.urgentAlerts.length > 0 ? (
              <div className="space-y-3">
                {mobileData.urgentAlerts.map((alert, index) => (
                  <Alert key={index} className="border-l-4 border-l-red-500" data-testid={`alert-${index}`}>
                    <div className="flex items-start gap-2">
                      {getAlertIcon(alert.type)}
                      <AlertDescription className="flex-1">
                        <div className="text-sm font-medium text-red-800 dark:text-red-200">
                          {alert.message}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Type: {alert.type.toUpperCase()}
                        </div>
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}
              </div>
            ) : (
              <Card data-testid="card-no-alerts">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">All Clear!</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    No urgent alerts at this time.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Action Items */}
            <Card data-testid="card-action-items">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Action Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mobileData?.actionItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`} />
                      <span className="text-sm">{item.task}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {currentView === 'activity' && (
          <div className="space-y-4">
            {/* Recent Updates */}
            <Card data-testid="card-recent-updates">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {mobileData?.recentUpdates.map((update, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className={`p-1 rounded-full ${
                          update.type === 'service' ? 'bg-blue-100 text-blue-600' :
                          update.type === 'payment' ? 'bg-green-100 text-green-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {update.type === 'service' ? <Activity className="h-3 w-3" /> :
                           update.type === 'payment' ? <DollarSign className="h-3 w-3" /> :
                           <Star className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {update.message}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {update.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card data-testid="card-quick-actions">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="sm" className="h-12 flex flex-col gap-1" data-testid="button-view-services">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs">View Services</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-12 flex flex-col gap-1" data-testid="button-check-payments">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Check Payments</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-12 flex flex-col gap-1" data-testid="button-review-quality">
                    <Star className="h-4 w-4" />
                    <span className="text-xs">Quality Reviews</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-12 flex flex-col gap-1" data-testid="button-team-status">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Team Status</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bottom Navigation for Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2">
          <div className="grid grid-cols-4 gap-1">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? "default" : "ghost"}
                  size="sm"
                  className="flex flex-col gap-1 h-auto py-2"
                  onClick={() => setCurrentView(item.id as any)}
                  data-testid={`nav-${item.id}`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="text-xs">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Spacer for bottom navigation */}
        <div className="h-16" />
      </div>
    </div>
  );
};

export default MobileDashboard;