import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Calendar,
  Bell,
  Download,
  MessageSquare,
  User,
  AlertCircle,
  TrendingUp,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface ComplianceItem {
  id: number;
  serviceType: string;
  entityName: string;
  dueDate: string;
  status: string;
  priority: string;
  complianceType: string;
  healthScore: number;
  penaltyRisk: boolean;
  estimatedPenalty: number;
  serviceId: string;
  regulatoryInfo?: {
    formNumber: string;
    regulationCategory: string;
    description: string;
    dueDateInfo: string;
    penaltyInfo: string;
    requiredDocuments: string[];
    priorityLevel: string;
    penaltyRiskLevel: string;
  };
}

const ComplianceTracker = () => {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch compliance tracking data from authenticated API
  const { data: complianceItems = [], isLoading, error, refetch } = useQuery<ComplianceItem[]>({
    queryKey: ['/api/client/compliance-tracking'],
  });

  // Fetch compliance summary
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

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'in_progress':
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    }
  };

  const getRiskColor = (daysLeft: number) => {
    if (daysLeft < 0) return 'text-red-600';
    if (daysLeft <= 7) return 'text-orange-600';
    if (daysLeft <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const completedCount = complianceItems.filter(item => item.status === 'completed').length;
  const inProgressCount = complianceItems.filter(item =>
    item.status === 'in_progress' || item.status === 'processing'
  ).length;
  const pendingCount = complianceItems.filter(item => item.status === 'pending').length;
  const overdueCount = complianceItems.filter(item => {
    const daysLeft = getDaysUntilDue(item.dueDate);
    return daysLeft < 0 && item.status !== 'completed';
  }).length;

  const upcomingDeadlines = complianceItems
    .filter(item => item.status !== 'completed')
    .map(item => ({
      ...item,
      daysLeft: getDaysUntilDue(item.dueDate),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 10);

  const overallProgress = complianceItems.length > 0
    ? Math.round((completedCount / complianceItems.length) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Unable to Load Compliance Data
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please try again or contact support if the issue persists.
            </p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Compliance Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Monitor your compliance status and upcoming deadlines
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-8 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Overall Compliance Progress</h3>
            <span>{overallProgress}% Complete</span>
          </div>
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </Card>

        <div className="max-w-7xl mx-auto">
          {/* Dashboard Overview */}
          <div className="grid md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{summary?.completed || completedCount}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{summary?.overdue || overdueCount}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{summary?.averageHealthScore || 100}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Health Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {complianceItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Compliance Items Yet
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Your compliance items will appear here once you have active services.
                </p>
                <Button onClick={() => setLocation('/services')}>
                  Browse Services
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="detailed">Detailed View</TabsTrigger>
                <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid md:grid-cols-1 gap-6">
                  {complianceItems.map((item) => {
                    const daysLeft = getDaysUntilDue(item.dueDate);
                    const isOverdue = daysLeft < 0 && item.status !== 'completed';

                    return (
                      <Card key={item.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              {getStatusIcon(item.status)}
                              {item.serviceType}
                            </CardTitle>
                            <div className="flex gap-2">
                              <Badge className={getPriorityColor(item.priority)}>
                                {item.priority}
                              </Badge>
                              <Badge className={getStatusColor(item.status)}>
                                {item.status.replace('_', ' ')}
                              </Badge>
                              {isOverdue && (
                                <Badge className="bg-red-600 text-white">Overdue</Badge>
                              )}
                            </div>
                          </div>
                          <CardDescription>
                            {item.entityName} | {item.complianceType}
                            {item.regulatoryInfo?.formNumber && ` | Form: ${item.regulatoryInfo.formNumber}`}
                          </CardDescription>
                        </CardHeader>

                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <span>Health Score</span>
                              <span>{item.healthScore}%</span>
                            </div>
                            <Progress value={item.healthScore} />

                            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                              </div>
                              {item.status !== 'completed' && (
                                <div className={`flex items-center gap-2 ${getRiskColor(daysLeft)}`}>
                                  <Bell className="h-4 w-4" />
                                  <span>
                                    {daysLeft < 0
                                      ? `${Math.abs(daysLeft)} days overdue`
                                      : daysLeft === 0
                                      ? 'Due today'
                                      : `${daysLeft} days left`}
                                  </span>
                                </div>
                              )}
                              {item.penaltyRisk && item.estimatedPenalty > 0 && (
                                <div className="flex items-center gap-2 text-red-600">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>
                                    Penalty Risk: ₹{item.estimatedPenalty.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}
                              {item.regulatoryInfo?.description && (
                                <div className="col-span-2 text-xs text-gray-500">
                                  {item.regulatoryInfo.description}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation('/lifecycle/compliance')}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation('/support')}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Get Help
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Detailed View Tab */}
              <TabsContent value="detailed" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Services - Detailed Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Health</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Deadline</TableHead>
                          <TableHead>Penalty Risk</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {complianceItems.map((item) => {
                          const daysLeft = getDaysUntilDue(item.dueDate);
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.serviceType}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(item.status)}>
                                  {item.status.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={item.healthScore} className="w-16" />
                                  <span className="text-sm">{item.healthScore}%</span>
                                </div>
                              </TableCell>
                              <TableCell>{item.complianceType}</TableCell>
                              <TableCell>
                                <div className={getRiskColor(daysLeft)}>
                                  {new Date(item.dueDate).toLocaleDateString()}
                                  {item.status !== 'completed' && (
                                    <span className="text-xs ml-1">
                                      ({daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`})
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.penaltyRisk && item.estimatedPenalty > 0 ? (
                                  <span className="text-red-600 font-medium">
                                    ₹{item.estimatedPenalty.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="text-green-600">None</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Deadlines Tab */}
              <TabsContent value="deadlines" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Upcoming Deadlines
                    </CardTitle>
                    <CardDescription>
                      Monitor critical compliance deadlines to avoid penalties
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {upcomingDeadlines.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p>No upcoming deadlines. All compliances are on track!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingDeadlines.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium dark:text-white">{item.serviceType}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Due: {new Date(item.dueDate).toLocaleDateString()}
                              </p>
                              {item.regulatoryInfo?.penaltyInfo && (
                                <p className="text-xs text-red-600 mt-1">
                                  {item.regulatoryInfo.penaltyInfo}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`font-medium ${getRiskColor(item.daysLeft)}`}>
                                {item.daysLeft < 0
                                  ? `${Math.abs(item.daysLeft)} days overdue`
                                  : item.daysLeft === 0
                                  ? 'Due today!'
                                  : `${item.daysLeft} days left`}
                              </p>
                              <Badge className={getPriorityColor(item.priority)}>
                                {item.priority} priority
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Actions */}
          <Card className="max-w-md mx-auto mt-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your compliance efficiently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={() => setLocation('/lifecycle/compliance')} className="w-full">
                  View Full Compliance Detail
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation('/compliance-calendar')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Calendar
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setLocation('/support')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Get Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ComplianceTracker;
