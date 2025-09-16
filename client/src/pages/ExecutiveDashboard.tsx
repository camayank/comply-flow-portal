import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
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
  BarChart3,
  PieChart as PieChartIcon,
  Zap,
  Award,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Settings,
  Bell,
  Globe
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ExecutiveDashboardData {
  overview: {
    totalRevenue: number;
    totalClients: number;
    activeServices: number;
    completionRate: number;
    averageQualityScore: number;
    employeeUtilization: number;
    leadConversionRate: number;
    complianceScore: number;
  };
  revenue: {
    totalRevenue: number;
    monthlyRevenue: number;
    pendingAmount: number;
    transactionCount: number;
    averageTransactionValue: number;
  };
  operations: {
    activeServices: number;
    completedServices: number;
    totalServices: number;
    completionRate: number;
    averageProgress: number;
    slaCompliance: number;
  };
  clients: {
    totalClients: number;
    totalActiveClients: number;
    newClientsThisMonth: number;
    averageSatisfactionScore: string;
    clientRetentionRate: number;
  };
  quality: {
    averageQualityScore: string;
    approvalRate: number;
    rejectionRate: number;
    totalReviews: number;
  };
  hr: {
    totalEmployees: number;
    activeEmployees: number;
    utilization: string;
    averagePerformanceRating: string;
    employeeRetentionRate: number;
  };
  leads: {
    totalLeads: number;
    hotLeads: number;
    convertedLeads: number;
    conversionRate: number;
    stageDistribution: Record<string, number>;
  };
  compliance: {
    totalCompliances: number;
    completedCompliances: number;
    overdueCompliances: number;
    overallScore: string;
    complianceRate: number;
  };
  trends: {
    revenue: { trend: string; change: string; data: number[] };
    efficiency: { trend: string; change: string; data: number[] };
    quality: { trend: string; change: string; data: number[] };
    satisfaction: { trend: string; change: string; data: number[] };
  };
  alerts: Array<{
    type: string;
    title: string;
    message: string;
    count: number;
  }>;
  insights: Array<{
    type: string;
    title: string;
    insight: string;
    impact: string;
    action: string;
  }>;
}

interface RealTimeKPIs {
  timestamp: string;
  activeServices: number;
  ongoingPayments: { count: number; totalAmount: number };
  qualityReviews: number;
  clientInteractions: number;
  systemHealth: {
    status: string;
    uptime: string;
    responseTime: string;
    activeUsers: number;
  };
  alertsSummary: {
    critical: number;
    warning: number;
    info: number;
  };
  performanceIndicators: {
    servicesCompletedToday: number;
    averageCompletionTime: string;
    clientSatisfactionToday: number;
    teamUtilization: number;
  };
}

const ExecutiveDashboard = () => {
  const [dateRange, setDateRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  const [isRealTime, setIsRealTime] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { toast } = useToast();

  // Main dashboard data
  const { data: dashboardData, isLoading, isError, refetch } = useQuery<ExecutiveDashboardData>({
    queryKey: ['/api/analytics/executive-dashboard', dateRange],
    refetchInterval: isRealTime ? 30000 : false, // Refresh every 30 seconds if real-time is enabled
  });

  // Real-time KPIs
  const { data: realTimeData } = useQuery<RealTimeKPIs>({
    queryKey: ['/api/analytics/real-time-kpis'],
    refetchInterval: isRealTime ? 15000 : false, // Refresh every 15 seconds
  });

  useEffect(() => {
    if (isRealTime) {
      setLastRefresh(new Date());
    }
  }, [realTimeData, isRealTime]);

  const handleRefresh = async () => {
    await refetch();
    setLastRefresh(new Date());
    toast({
      title: 'Dashboard Refreshed',
      description: 'All metrics have been updated with the latest data.',
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

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600 dark:text-green-400';
      case 'down': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4" />;
      case 'down': return <TrendingDown className="h-4 w-4" />;
      default: return <ArrowUpRight className="h-4 w-4" />;
    }
  };

  const chartColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading executive dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Dashboard Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Failed to load dashboard data. Please try again.</p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Dashboard</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Unified business intelligence & real-time analytics
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant={isRealTime ? "default" : "secondary"} 
                  className="text-xs"
                  data-testid="badge-realtime"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {isRealTime ? 'Live' : 'Static'}
                </Badge>
                {realTimeData?.systemHealth && (
                  <Badge 
                    variant="outline" 
                    className="text-xs text-green-600 border-green-600"
                    data-testid="badge-system-health"
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    System Healthy
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32" data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRealTime(!isRealTime)}
                data-testid="button-toggle-realtime"
              >
                <Zap className="h-4 w-4 mr-2" />
                {isRealTime ? 'Disable' : 'Enable'} Live
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              <Button size="sm" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Critical Alerts */}
      {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
        <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-4">
            <Bell className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-800 dark:text-amber-200">Critical Alerts</h3>
              <div className="flex gap-4 mt-1">
                {dashboardData.alerts.map((alert, index) => (
                  <span key={index} className="text-sm text-amber-700 dark:text-amber-300">
                    {alert.title}: {alert.count} items
                  </span>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-amber-300 text-amber-700">
              View All
            </Button>
          </div>
        </div>
      )}

      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Eye className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="financial" data-testid="tab-financial">
              <DollarSign className="h-4 w-4 mr-2" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="operational" data-testid="tab-operational">
              <Activity className="h-4 w-4 mr-2" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="insights" data-testid="tab-insights">
              <Star className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white" data-testid="card-total-revenue">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Revenue</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(dashboardData?.overview.totalRevenue || 0)}
                      </p>
                      <div className="flex items-center mt-2 text-blue-100">
                        {getTrendIcon(dashboardData?.trends.revenue.trend || 'up')}
                        <span className="text-sm ml-1">{dashboardData?.trends.revenue.change}</span>
                      </div>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white" data-testid="card-total-clients">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Active Clients</p>
                      <p className="text-2xl font-bold">{dashboardData?.overview.totalClients || 0}</p>
                      <div className="flex items-center mt-2 text-green-100">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm ml-1">+{dashboardData?.clients.newClientsThisMonth} this month</span>
                      </div>
                    </div>
                    <Users className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white" data-testid="card-active-services">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Active Services</p>
                      <p className="text-2xl font-bold">{dashboardData?.overview.activeServices || 0}</p>
                      <div className="flex items-center mt-2 text-orange-100">
                        <Activity className="h-4 w-4" />
                        <span className="text-sm ml-1">{formatPercentage(dashboardData?.overview.completionRate || 0)} completion</span>
                      </div>
                    </div>
                    <Target className="h-8 w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white" data-testid="card-quality-score">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Quality Score</p>
                      <p className="text-2xl font-bold">{dashboardData?.overview.averageQualityScore || 0}/5</p>
                      <div className="flex items-center mt-2 text-purple-100">
                        {getTrendIcon(dashboardData?.trends.quality.trend || 'up')}
                        <span className="text-sm ml-1">{dashboardData?.trends.quality.change}</span>
                      </div>
                    </div>
                    <Star className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card data-testid="card-employee-utilization">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Employee Utilization</p>
                    <Badge variant="outline">{dashboardData?.hr.utilization}%</Badge>
                  </div>
                  <Progress value={parseFloat(dashboardData?.hr.utilization || '0')} className="mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dashboardData?.hr.activeEmployees}/{dashboardData?.hr.totalEmployees} employees active
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-lead-conversion">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Lead Conversion</p>
                    <Badge variant="outline">{formatPercentage(dashboardData?.overview.leadConversionRate || 0)}</Badge>
                  </div>
                  <Progress value={dashboardData?.overview.leadConversionRate || 0} className="mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dashboardData?.leads.convertedLeads}/{dashboardData?.leads.totalLeads} leads converted
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-compliance-score">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Compliance Score</p>
                    <Badge variant="outline">{dashboardData?.compliance.overallScore}/100</Badge>
                  </div>
                  <Progress value={parseFloat(dashboardData?.compliance.overallScore || '0')} className="mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dashboardData?.compliance.completedCompliances} completed, {dashboardData?.compliance.overdueCompliances} overdue
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-client-satisfaction">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Client Satisfaction</p>
                    <Badge variant="outline">{dashboardData?.clients.averageSatisfactionScore}/5</Badge>
                  </div>
                  <Progress value={(parseFloat(dashboardData?.clients.averageSatisfactionScore || '0') / 5) * 100} className="mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatPercentage(dashboardData?.clients.clientRetentionRate || 0)} retention rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Trends Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-revenue-trend">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dashboardData?.trends.revenue.data.map((value, index) => ({ 
                      month: `Month ${index + 1}`, 
                      revenue: value 
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card data-testid="card-efficiency-trend">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Efficiency Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboardData?.trends.efficiency.data.map((value, index) => ({ 
                      month: `Month ${index + 1}`, 
                      efficiency: value 
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`, 'Efficiency']} />
                      <Line type="monotone" dataKey="efficiency" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Real-time Activity Feed */}
            {realTimeData && (
              <Card data-testid="card-realtime-activity">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Real-time Activity
                    <Badge variant="secondary" className="ml-auto">Live</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Activity className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">Services Today</p>
                      <p className="text-xl font-semibold text-blue-600">{realTimeData.performanceIndicators.servicesCompletedToday}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Clock className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">Avg Completion</p>
                      <p className="text-xl font-semibold text-green-600">{realTimeData.performanceIndicators.averageCompletionTime}</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <Star className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">Satisfaction</p>
                      <p className="text-xl font-semibold text-orange-600">{realTimeData.performanceIndicators.clientSatisfactionToday}/5</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Users className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">Team Utilization</p>
                      <p className="text-xl font-semibold text-purple-600">{realTimeData.performanceIndicators.teamUtilization}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card data-testid="card-financial-overview">
                <CardHeader>
                  <CardTitle>Financial Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Monthly Revenue</span>
                    <span className="font-semibold">{formatCurrency(dashboardData?.revenue.monthlyRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Pending Amount</span>
                    <span className="font-semibold text-amber-600">{formatCurrency(dashboardData?.revenue.pendingAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Avg Transaction</span>
                    <span className="font-semibold">{formatCurrency(dashboardData?.revenue.averageTransactionValue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Transactions</span>
                    <span className="font-semibold">{dashboardData?.revenue.transactionCount || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-payment-status">
                <CardHeader>
                  <CardTitle>Payment Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {realTimeData?.ongoingPayments && (
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Ongoing Payments</p>
                        <p className="text-xl font-semibold text-blue-600">{realTimeData.ongoingPayments.count}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(realTimeData.ongoingPayments.totalAmount)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-revenue-growth">
                <CardHeader>
                  <CardTitle>Growth Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getTrendColor(dashboardData?.trends.revenue.trend || 'up')}`}>
                      {dashboardData?.trends.revenue.change}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Revenue Growth</p>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getTrendColor(dashboardData?.trends.efficiency.trend || 'up')}`}>
                      {dashboardData?.trends.efficiency.change}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Efficiency Improvement</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="operational" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-service-status">
                <CardHeader>
                  <CardTitle>Service Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Services</span>
                      <Badge>{dashboardData?.operations.activeServices}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completed Services</span>
                      <Badge variant="secondary">{dashboardData?.operations.completedServices}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completion Rate</span>
                      <Badge variant="outline">{formatPercentage(dashboardData?.operations.completionRate || 0)}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">SLA Compliance</span>
                      <Badge variant={dashboardData?.operations.slaCompliance && dashboardData.operations.slaCompliance > 90 ? "default" : "destructive"}>
                        {formatPercentage(dashboardData?.operations.slaCompliance || 0)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-quality-metrics">
                <CardHeader>
                  <CardTitle>Quality Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Score</span>
                      <Badge>{dashboardData?.quality.averageQualityScore}/5</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Approval Rate</span>
                      <Badge variant="secondary">{formatPercentage(dashboardData?.quality.approvalRate || 0)}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Reviews</span>
                      <Badge variant="outline">{dashboardData?.quality.totalReviews}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Rejection Rate</span>
                      <Badge variant="destructive">{formatPercentage(dashboardData?.quality.rejectionRate || 0)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-team-performance">
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{dashboardData?.hr.activeEmployees}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Active Employees</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{dashboardData?.hr.utilization}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Utilization</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{dashboardData?.hr.averagePerformanceRating}/5</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Avg Performance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-business-insights">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Business Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {dashboardData?.insights.map((insight, index) => (
                        <Alert key={index} className="border-l-4 border-l-blue-500">
                          <AlertDescription>
                            <div className="space-y-2">
                              <h4 className="font-medium">{insight.title}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{insight.insight}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic">{insight.action}</p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card data-testid="card-lead-analysis">
                <CardHeader>
                  <CardTitle>Lead Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardData?.leads.stageDistribution && (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={Object.entries(dashboardData.leads.stageDistribution).map(([key, value]) => ({
                            name: key.replace('_', ' ').toUpperCase(),
                            value: value
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label
                        >
                          {Object.entries(dashboardData.leads.stageDistribution).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;