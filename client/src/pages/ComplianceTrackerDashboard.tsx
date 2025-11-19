import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DashboardNav from '@/components/DashboardNav';
import UnifiedComplianceDashboard from '@/components/UnifiedComplianceDashboard';
import TrustBar from '@/components/TrustBar';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  TrendingDown,
  TrendingUp,
  Calendar,
  FileText,
  DollarSign,
  Bell,
  Target,
  Activity,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ComplianceTracking } from '@shared/schema';
import { SkeletonCard, SkeletonDashboard } from '@/components/ui/skeleton-loader';
import { EmptyList } from '@/components/ui/empty-state';

interface ComplianceHealthMetrics {
  overallScore: number;
  totalCompliances: number;
  pendingCount: number;
  overdueCount: number;
  completedThisMonth: number;
  upcomingDeadlines: number;
  penaltyRisk: number;
  estimatedSavings: number;
}

interface ComplianceItem extends ComplianceTracking {
  serviceName: string;
  categoryName: string;
  daysUntilDue: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const ComplianceTrackerDashboard = () => {
  const { toast } = useToast();
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Fetch compliance tracking data
  const { data: complianceItems = [], isLoading } = useQuery<ComplianceItem[]>({
    queryKey: ['/api/compliance-tracking'],
  });

  // Fetch health metrics
  const { data: healthMetrics } = useQuery<ComplianceHealthMetrics>({
    queryKey: ['/api/compliance-health-metrics'],
  });

  // Mark compliance as completed mutation
  const markCompletedMutation = useMutation({
    mutationFn: (complianceId: number) => 
      apiRequest('POST', `/api/compliance-tracking/${complianceId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance-health-metrics'] });
      toast({
        title: "Compliance Updated",
        description: "Compliance item marked as completed successfully.",
      });
    },
  });

  // Snooze compliance mutation
  const snoozeComplianceMutation = useMutation({
    mutationFn: ({ complianceId, days }: { complianceId: number; days: number }) =>
      apiRequest('POST', `/api/compliance-tracking/${complianceId}/snooze`, { days }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance-tracking'] });
      toast({
        title: "Reminder Updated",
        description: "Compliance reminder has been snoozed successfully.",
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

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      not_applicable: 'bg-gray-100 text-gray-800'
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const filteredItems = complianceItems.filter(item => {
    if (selectedPriority !== 'all' && item.priority !== selectedPriority) return false;
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
    return true;
  });

  const upcomingDeadlines = complianceItems
    .filter(item => item.daysUntilDue <= 30 && item.status === 'pending')
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

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
                  <span className={`text-3xl font-bold ${getHealthScoreColor(healthMetrics?.overallScore || 85)}`}>
                    {healthMetrics?.overallScore || 85}%
                  </span>
                  <Badge variant="outline" className={getHealthScoreColor(healthMetrics?.overallScore || 85)}>
                    {getHealthScoreLabel(healthMetrics?.overallScore || 85)}
                  </Badge>
                </div>
                <Progress 
                  value={healthMetrics?.overallScore || 85} 
                  className="mt-2 h-2" 
                />
              </div>
              <Shield className={`h-8 w-8 ${getHealthScoreColor(healthMetrics?.overallScore || 85)}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                <p className="text-3xl font-bold">{healthMetrics?.pendingCount || 12}</p>
                <p className="text-sm text-gray-500">
                  {healthMetrics?.overdueCount || 3} overdue
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
                <p className="text-3xl font-bold text-green-600">{healthMetrics?.completedThisMonth || 8}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <p className="text-sm text-green-600">+25% vs last month</p>
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
                <p className="text-3xl font-bold text-red-600">₹{(healthMetrics?.penaltyRisk || 25000).toLocaleString()}</p>
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="unified">Smart Compliance</TabsTrigger>
          <TabsTrigger value="pending">Pending Tasks</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Unified Smart Compliance Tab */}
        <TabsContent value="unified">
          <UnifiedComplianceDashboard />
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
                      <Badge className={getStatusBadge(item.status)}>
                        {item.status}
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
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>GST Compliance</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Income Tax</span>
                      <span className="font-medium">88%</span>
                    </div>
                    <Progress value={88} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>TDS Compliance</span>
                      <span className="font-medium">95%</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>ROC Filings</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>ESI/EPF</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
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
                {filteredItems.filter(item => item.status !== 'completed').map((item) => (
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
                        <Badge className={getStatusBadge(item.status)}>
                          {item.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => snoozeComplianceMutation.mutate({ complianceId: item.id, days: 7 })}
                          disabled={snoozeComplianceMutation.isPending}
                        >
                          Snooze 7d
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

        {/* Completed Tab */}
        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Compliance Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredItems.filter(item => item.status === 'completed').map((item) => (
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
                    <span className="font-bold text-green-600">87%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Average Response Time</span>
                    <span className="font-bold">2.3 days</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Cost Savings (YTD)</span>
                    <span className="font-bold text-green-600">₹{(healthMetrics?.estimatedSavings || 125000).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Penalty Avoided</span>
                    <span className="font-bold text-green-600">₹45,000</span>
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
                  {[
                    { name: 'GST Returns', count: 12, health: 92 },
                    { name: 'Income Tax', count: 8, health: 88 },
                    { name: 'TDS Returns', count: 15, health: 95 },
                    { name: 'ROC Filings', count: 5, health: 78 },
                    { name: 'Labour Law', count: 6, health: 85 }
                  ].map((category) => (
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