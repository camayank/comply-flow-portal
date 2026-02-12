import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DashboardNav from '@/components/DashboardNav';
import UnifiedComplianceDashboard, { UnifiedComplianceItem } from '@/components/UnifiedComplianceDashboard';
import TrustBar from '@/components/TrustBar';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  Bell,
  Target,
  Activity,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SkeletonCard, SkeletonDashboard } from '@/components/ui/skeleton-loader';

interface ComplianceItem {
  id: number;
  serviceType: string;
  entityName?: string | null;
  dueDate: string;
  status: string;
  priority: string;
  complianceType: string;
  healthScore: number;
  penaltyRisk: boolean;
  estimatedPenalty: number;
  serviceId: string;
  complianceRuleId?: number | null;
  lastCompleted?: string | null;
  regulatoryInfo?: {
    formNumber?: string;
    regulationCategory?: string;
    description?: string;
    dueDateInfo?: string;
    penaltyInfo?: string;
    requiredDocuments?: string[];
    priorityLevel?: string;
    penaltyRiskLevel?: string;
  } | null;
}

interface NormalizedComplianceItem extends ComplianceItem {
  serviceName: string;
  categoryName: string;
  daysUntilDue: number;
  statusEffective: string;
}

interface ClientAlert {
  id: number;
  severity: string;
  title: string;
  message: string;
  alertType: string;
  category?: string;
  complianceName?: string;
  deadline?: string | null;
  isAcknowledged: boolean;
  triggeredAt: string;
  status?: string;
}

const ComplianceTrackerDashboard = () => {
  const { toast } = useToast();
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Fetch compliance tracking data
  const { data: complianceItems = [], isLoading } = useQuery<ComplianceItem[]>({
    queryKey: ['/api/client/compliance-tracking'],
  });

  const { data: summary } = useQuery<{
    totalCompliance: number;
    overdue: number;
    dueThisWeek: number;
    upcoming: number;
    completed: number;
    averageHealthScore: number;
    highPriorityPending: number;
  }>({
    queryKey: ['/api/client/compliance-summary'],
  });

  const { data: alertsData } = useQuery<{
    alerts: ClientAlert[];
    summary: {
      total: number;
      critical: number;
      warning: number;
      info: number;
      acknowledged: number;
    };
  }>({
    queryKey: ['/api/client/compliance-alerts'],
  });

  // Mark compliance as completed mutation
  const markCompletedMutation = useMutation({
    mutationFn: (complianceId: number) => 
      apiRequest('POST', `/api/compliance-state/tracking/${complianceId}/complete`, {
        completionDate: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/compliance-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/compliance-summary'] });
      toast({
        title: "Compliance Updated",
        description: "Compliance item marked as completed successfully.",
      });
    },
  });

  // Request extension mutation
  const requestExtensionMutation = useMutation({
    mutationFn: ({ complianceId, requestedDate, reason }: { complianceId: number; requestedDate: string; reason: string }) =>
      apiRequest('POST', `/api/compliance-state/tracking/${complianceId}/extension`, { requestedDate, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/compliance-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/compliance-summary'] });
      toast({
        title: "Reminder Updated",
        description: "Extension request has been submitted.",
      });
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId: number) =>
      apiRequest('PATCH', `/api/client/compliance-alerts/${alertId}/acknowledge`, {
        notes: 'Acknowledged from compliance dashboard',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/compliance-alerts'] });
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been acknowledged.",
      });
    },
  });

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Attention';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-orange-100 text-orange-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      not_applicable: 'bg-gray-100 text-gray-800'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const categoryLabel = (value?: string | null) => {
    const key = String(value || '').toLowerCase();
    const map: Record<string, string> = {
      gst: 'GST',
      income_tax: 'Income Tax',
      tds: 'TDS',
      roc: 'ROC',
      companies_act: 'MCA',
      pf_esi: 'PF/ESI',
      labour_laws: 'Labour Law',
      professional_tax: 'Professional Tax',
      licenses: 'Licenses',
      statutory: 'Statutory',
    };
    return map[key] || (value ? value.replace(/_/g, ' ') : 'Other');
  };

  const normalizedItems = useMemo<NormalizedComplianceItem[]>(() => {
    const now = new Date();
    return complianceItems.map((item) => {
      const dueDate = item.dueDate ? new Date(item.dueDate) : now;
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const statusEffective = item.status === 'completed'
        ? 'completed'
        : daysUntilDue < 0
          ? 'overdue'
          : item.status || 'pending';

      const serviceName = item.serviceType || item.regulatoryInfo?.formNumber || item.serviceId || 'Compliance';
      const categoryName = categoryLabel(item.regulatoryInfo?.regulationCategory || item.complianceType);

      return {
        ...item,
        serviceName,
        categoryName,
        daysUntilDue,
        statusEffective,
      };
    });
  }, [complianceItems]);

  const filteredItems = normalizedItems.filter(item => {
    if (selectedPriority !== 'all' && item.priority !== selectedPriority) return false;
    if (selectedStatus !== 'all' && item.statusEffective !== selectedStatus) return false;
    return true;
  });

  const upcomingDeadlines = normalizedItems
    .filter(item => item.statusEffective !== 'completed' && item.daysUntilDue >= 0 && item.daysUntilDue <= 30)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  const totalCompliances = summary?.totalCompliance ?? normalizedItems.length;
  const completedCount = summary?.completed ?? normalizedItems.filter(item => item.statusEffective === 'completed').length;
  const overdueCount = summary?.overdue ?? normalizedItems.filter(item => item.statusEffective === 'overdue').length;
  const pendingCount = Math.max(0, totalCompliances - completedCount);
  const averageHealthScore = summary?.averageHealthScore ?? (
    normalizedItems.length > 0
      ? Math.round(normalizedItems.reduce((sum, item) => sum + (item.healthScore || 100), 0) / normalizedItems.length)
      : 100
  );
  const completedThisMonth = normalizedItems.filter(item => {
    if (!item.lastCompleted) return false;
    const date = new Date(item.lastCompleted);
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
  const penaltyRiskTotal = normalizedItems
    .filter(item => item.statusEffective !== 'completed')
    .reduce((sum, item) => sum + Number(item.estimatedPenalty || 0), 0);
  const penaltyAvoided = normalizedItems
    .filter(item => item.statusEffective === 'completed')
    .reduce((sum, item) => sum + Number(item.estimatedPenalty || 0), 0);

  const categoryStats = normalizedItems.reduce((acc: Record<string, { total: number; completed: number; overdue: number }>, item) => {
    const key = item.categoryName || 'Other';
    if (!acc[key]) acc[key] = { total: 0, completed: 0, overdue: 0 };
    acc[key].total += 1;
    if (item.statusEffective === 'completed') acc[key].completed += 1;
    if (item.statusEffective === 'overdue') acc[key].overdue += 1;
    return acc;
  }, {});

  const categoryHealth = Object.entries(categoryStats).map(([name, stats]) => ({
    name,
    count: stats.total,
    health: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 100,
    overdue: stats.overdue,
  }));

  const now = new Date();
  const dueThisMonth = normalizedItems.filter(item => {
    const date = new Date(item.dueDate);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
  const completedDueThisMonth = normalizedItems.filter(item => {
    if (item.statusEffective !== 'completed') return false;
    const date = new Date(item.dueDate);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
  const completionRateThisMonth = dueThisMonth > 0
    ? Math.round((completedDueThisMonth / dueThisMonth) * 100)
    : 100;

  const unifiedItems: UnifiedComplianceItem[] = normalizedItems.map((item) => ({
    id: item.id,
    name: item.serviceName,
    status: item.statusEffective,
    dueDate: item.dueDate,
    penaltyRisk: Number(item.estimatedPenalty || 0),
    priority: (item.priority as UnifiedComplianceItem['priority']) || 'medium',
    category: item.categoryName,
    description: item.regulatoryInfo?.description || item.complianceType,
  }));

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <SkeletonDashboard stats={4} />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <DashboardNav currentPath="/compliance-tracker" />
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Compliance Tracker Dashboard</h1>
        <p className="text-gray-600">
          Monitor your compliance health, track deadlines, and manage regulatory requirements.
        </p>
      </div>

      {/* Trust Bar */}
      <TrustBar />

      {/* Health Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Health Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-3xl font-bold ${getHealthScoreColor(averageHealthScore)}`}>
                    {averageHealthScore}%
                  </span>
                  <Badge variant="outline" className={getHealthScoreColor(averageHealthScore)}>
                    {getHealthScoreLabel(averageHealthScore)}
                  </Badge>
                </div>
                <Progress 
                  value={averageHealthScore} 
                  className="mt-2 h-2" 
                />
              </div>
              <Shield className={`h-8 w-8 ${getHealthScoreColor(averageHealthScore)}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                <p className="text-3xl font-bold">{pendingCount}</p>
                <p className="text-sm text-gray-500">
                  {overdueCount} overdue
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed This Month</p>
                <p className="text-3xl font-bold text-green-600">{completedThisMonth}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <p className="text-sm text-green-600">Completed filings this month</p>
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Penalty Risk</p>
                <p className="text-3xl font-bold text-red-600">₹{penaltyRiskTotal.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Estimated exposure</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deadlines Alert */}
      {upcomingDeadlines.length > 0 && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <Bell className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{upcomingDeadlines.length} compliance items</strong> are due within the next 30 days. 
            <Button variant="link" className="p-0 ml-2 text-orange-600 underline">
              View all upcoming deadlines
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="unified">Smart Compliance</TabsTrigger>
          <TabsTrigger value="pending">Pending Tasks</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts {alertsData?.summary?.total ? `(${alertsData.summary.total})` : ''}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Unified Smart Compliance Tab */}
        <TabsContent value="unified">
          <UnifiedComplianceDashboard items={unifiedItems} />
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Deadlines */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Deadlines (Next 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingDeadlines.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      {getPriorityIcon(item.priority)}
                      <div>
                        <h4 className="font-medium">{item.serviceName}</h4>
                        <p className="text-sm text-gray-600">{item.complianceType}</p>
                        <p className="text-xs text-gray-500">Due in {item.daysUntilDue} days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadge(item.statusEffective)}>
                        {item.statusEffective}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markCompletedMutation.mutate(item.id)}
                        disabled={markCompletedMutation.isPending}
                      >
                        Mark Complete
                      </Button>
                    </div>
                  </div>
                ))}
                {upcomingDeadlines.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No upcoming deadlines in the next 30 days!</p>
                    <p className="text-sm">Your compliance is up to date.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Health Score Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Health Score Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {categoryHealth.length === 0 && (
                    <p className="text-sm text-gray-500">No category data available yet.</p>
                  )}
                  {categoryHealth.map((category) => (
                    <div key={category.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{category.name}</span>
                        <span className="font-medium">{category.health}%</span>
                      </div>
                      <Progress value={category.health} className="h-2" />
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    <Target className="h-4 w-4 mr-2" />
                    View Detailed Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pending Tasks Tab */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Compliance Tasks</CardTitle>
              <div className="flex gap-4">
                <select 
                  value={selectedPriority} 
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="px-3 py-1 border rounded"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1 border rounded"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredItems.filter(item => item.statusEffective !== 'completed').map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getPriorityIcon(item.priority)}
                        <div className="flex-1">
                          <h3 className="font-medium">{item.serviceName}</h3>
                          <p className="text-sm text-gray-600">{item.complianceType}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                            <span>Health Score: {item.healthScore}%</span>
                            {item.penaltyRisk && item.estimatedPenalty && (
                              <span className="text-red-600">
                                Penalty Risk: ₹{item.estimatedPenalty.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadge(item.statusEffective)}>
                          {item.statusEffective}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const baseDate = item.dueDate ? new Date(item.dueDate) : new Date();
                            const requested = new Date(baseDate);
                            requested.setDate(requested.getDate() + 7);
                            requestExtensionMutation.mutate({
                              complianceId: item.id,
                              requestedDate: requested.toISOString(),
                              reason: 'Requested via compliance dashboard',
                            });
                          }}
                          disabled={requestExtensionMutation.isPending}
                        >
                          Request Extension
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => markCompletedMutation.mutate(item.id)}
                          disabled={markCompletedMutation.isPending}
                        >
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700">Critical</p>
                    <p className="text-2xl font-bold text-red-600">{alertsData?.summary?.critical || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700">Warnings</p>
                    <p className="text-2xl font-bold text-orange-600">{alertsData?.summary?.warning || 0}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700">Info</p>
                    <p className="text-2xl font-bold text-blue-600">{alertsData?.summary?.info || 0}</p>
                  </div>
                  <Bell className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>Actionable compliance alerts for your business</CardDescription>
            </CardHeader>
            <CardContent>
              {(alertsData?.alerts || []).length > 0 ? (
                <div className="space-y-3">
                  {(alertsData?.alerts || []).map((alert) => (
                    <div key={alert.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getAlertBadge(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            {alert.alertType && (
                              <Badge variant="outline">{alert.alertType}</Badge>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{alert.title}</p>
                            <p className="text-sm text-gray-600">{alert.message}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {alert.category && <span>{alert.category}</span>}
                            {alert.complianceName && <span>{alert.complianceName}</span>}
                            {alert.deadline && (
                              <span>Deadline: {new Date(alert.deadline).toLocaleDateString()}</span>
                            )}
                            <span>{new Date(alert.triggeredAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                            disabled={acknowledgeAlertMutation.isPending || alert.isAcknowledged}
                          >
                            {alert.isAcknowledged ? 'Acknowledged' : 'Acknowledge'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No active alerts.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Compliance Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredItems.filter(item => item.statusEffective === 'completed').map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <h3 className="font-medium">{item.serviceName}</h3>
                          <p className="text-sm text-gray-600">{item.complianceType}</p>
                          <p className="text-xs text-gray-500">
                            Completed: {item.lastCompleted ? new Date(item.lastCompleted).toLocaleDateString() : 'Recently'}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Completed</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Compliance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Completion Rate (This Month)</span>
                    <span className="font-bold text-green-600">{completionRateThisMonth}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Overdue Items</span>
                    <span className="font-bold text-red-600">{overdueCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Open Penalty Exposure</span>
                    <span className="font-bold text-orange-600">₹{penaltyRiskTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Penalty Avoided (Completed)</span>
                    <span className="font-bold text-green-600">₹{penaltyAvoided.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryHealth.length === 0 && (
                    <div className="text-sm text-gray-500">No category data available yet.</div>
                  )}
                  {categoryHealth.map((category) => (
                    <div key={category.name} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{category.name}</h4>
                        <p className="text-sm text-gray-600">{category.count} items</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${getHealthScoreColor(category.health)}`}>
                          {category.health}%
                        </p>
                        <p className="text-xs text-gray-500">Health Score</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceTrackerDashboard;
