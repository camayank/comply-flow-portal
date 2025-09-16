import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Award,
  Target,
  Users,
  Calendar,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';

interface QualityMetrics {
  overview: {
    totalReviews: number;
    avgQualityScore: number;
    avgReviewTime: number;
    slaCompliance: number;
    defectRate: number;
    reworkRate: number;
    clientSatisfaction: number;
    firstPassSuccess: number;
  };
  trends: Array<{
    period: string;
    qualityScore: number;
    reviewTime: number;
    defectCount: number;
    clientSatisfaction: number;
    reviewVolume: number;
  }>;
  reviewerPerformance: Array<{
    reviewerId: number;
    reviewerName: string;
    totalReviews: number;
    avgQualityScore: number;
    avgReviewTime: number;
    efficiency: number;
    firstPassSuccess: number;
    slaCompliance: number;
  }>;
  serviceTypeBreakdown: Array<{
    serviceType: string;
    totalReviews: number;
    avgQualityScore: number;
    defectRate: number;
    clientSatisfaction: number;
  }>;
  issueAnalysis: Array<{
    category: string;
    count: number;
    impact: 'low' | 'medium' | 'high';
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
  clientFeedbackSummary: {
    avgOverallRating: number;
    avgServiceQuality: number;
    avgTimeliness: number;
    avgCommunication: number;
    avgDocumentation: number;
    npsScore: number;
    recommendationRate: number;
  };
}

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',
  secondary: '#8B5CF6'
};

const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.info, COLORS.secondary];

export default function QualityMetricsDashboard() {
  const [timeRange, setTimeRange] = useState('30d');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [reviewerFilter, setReviewerFilter] = useState('all');

  // Fetch quality metrics
  const { data: metrics, isLoading, refetch } = useQuery<QualityMetrics>({
    queryKey: ['quality-metrics', { timeRange, serviceFilter, reviewerFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeRange,
        serviceFilter,
        reviewerFilter
      });
      const response = await fetch(`/api/qc/metrics?${params.toString()}`);
      return response.json();
    }
  });

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 95) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 85) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (score >= 75) return { label: 'Satisfactory', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  const formatTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    const isPositive = change > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm">{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Quality Metrics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Monitor and analyze QC performance and quality trends
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => refetch()} data-testid="button-refresh-metrics">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" data-testid="button-export-metrics">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32" data-testid="select-time-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-40" data-testid="select-service-filter">
                  <SelectValue placeholder="Service Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="incorporation">Incorporation</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="tax">Tax Services</SelectItem>
                  <SelectItem value="legal">Legal Services</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reviewerFilter} onValueChange={setReviewerFilter}>
                <SelectTrigger className="w-32" data-testid="select-reviewer-filter">
                  <SelectValue placeholder="Reviewer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reviewers</SelectItem>
                  <SelectItem value="1">QC Manager</SelectItem>
                  <SelectItem value="2">Senior QC</SelectItem>
                  <SelectItem value="3">QC Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Avg Quality Score</p>
                  <p className={`text-3xl font-bold ${getPerformanceColor(metrics?.overview.avgQualityScore || 0)}`}>
                    {metrics?.overview.avgQualityScore || 0}%
                  </p>
                </div>
                <div className="text-right">
                  <Star className="h-8 w-8 text-yellow-500 mb-2" />
                  {formatTrend(metrics?.overview.avgQualityScore || 0, 85)}
                </div>
              </div>
              <Progress value={metrics?.overview.avgQualityScore || 0} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Avg Review Time</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {metrics?.overview.avgReviewTime || 0}m
                  </p>
                </div>
                <div className="text-right">
                  <Clock className="h-8 w-8 text-blue-500 mb-2" />
                  {formatTrend(30, metrics?.overview.avgReviewTime || 35)}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                Target: 30 minutes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">SLA Compliance</p>
                  <p className={`text-3xl font-bold ${getPerformanceColor(metrics?.overview.slaCompliance || 0)}`}>
                    {metrics?.overview.slaCompliance || 0}%
                  </p>
                </div>
                <div className="text-right">
                  <Target className="h-8 w-8 text-green-500 mb-2" />
                  {formatTrend(metrics?.overview.slaCompliance || 0, 92)}
                </div>
              </div>
              <Progress value={metrics?.overview.slaCompliance || 0} className="mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Client Satisfaction</p>
                  <p className={`text-3xl font-bold ${getPerformanceColor(metrics?.overview.clientSatisfaction || 0)}`}>
                    {(metrics?.overview.clientSatisfaction || 0).toFixed(1)}
                  </p>
                </div>
                <div className="text-right">
                  <Award className="h-8 w-8 text-purple-500 mb-2" />
                  {formatTrend(metrics?.overview.clientSatisfaction || 0, 4.2)}
                </div>
              </div>
              <div className="flex items-center mt-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600 dark:text-gray-300 ml-1">out of 5</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Reviews</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics?.overview.totalReviews || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">Defect Rate</p>
                <p className={`text-2xl font-bold ${(metrics?.overview.defectRate || 0) < 5 ? 'text-green-600' : 'text-red-600'}`}>
                  {(metrics?.overview.defectRate || 0).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">Rework Rate</p>
                <p className={`text-2xl font-bold ${(metrics?.overview.reworkRate || 0) < 10 ? 'text-green-600' : 'text-orange-600'}`}>
                  {(metrics?.overview.reworkRate || 0).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">First Pass Success</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(metrics?.overview.firstPassSuccess || 0)}`}>
                  {(metrics?.overview.firstPassSuccess || 0).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Team Performance</TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">Service Analysis</TabsTrigger>
            <TabsTrigger value="feedback" data-testid="tab-feedback">Client Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quality Score Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Quality Score Trend</CardTitle>
                  <CardDescription>Average quality scores over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={metrics?.trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="qualityScore" 
                        stroke={COLORS.primary} 
                        fill={COLORS.primary}
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Review Volume and Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Review Volume & Time</CardTitle>
                  <CardDescription>Review volume and average processing time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics?.trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="reviewVolume" fill={COLORS.primary} />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="reviewTime" 
                        stroke={COLORS.warning}
                        strokeWidth={3}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Defects and Client Satisfaction */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Defect Trend</CardTitle>
                  <CardDescription>Number of defects found over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics?.trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="defectCount" 
                        stroke={COLORS.danger} 
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client Satisfaction Trend</CardTitle>
                  <CardDescription>Average client satisfaction ratings</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={metrics?.trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="clientSatisfaction" 
                        stroke={COLORS.success} 
                        fill={COLORS.success}
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Reviewer Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>QC Team Performance</CardTitle>
                <CardDescription>Individual reviewer performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3">Reviewer</th>
                        <th className="text-center py-3">Reviews</th>
                        <th className="text-center py-3">Quality Score</th>
                        <th className="text-center py-3">Avg Time</th>
                        <th className="text-center py-3">Efficiency</th>
                        <th className="text-center py-3">First Pass</th>
                        <th className="text-center py-3">SLA</th>
                        <th className="text-center py-3">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics?.reviewerPerformance?.map((reviewer) => {
                        const performanceBadge = getPerformanceBadge(reviewer.efficiency);
                        return (
                          <tr key={reviewer.reviewerId} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-3 font-medium">{reviewer.reviewerName}</td>
                            <td className="text-center">{reviewer.totalReviews}</td>
                            <td className="text-center">
                              <span className={getPerformanceColor(reviewer.avgQualityScore)}>
                                {reviewer.avgQualityScore}%
                              </span>
                            </td>
                            <td className="text-center">{reviewer.avgReviewTime}m</td>
                            <td className="text-center">
                              <span className={getPerformanceColor(reviewer.efficiency)}>
                                {reviewer.efficiency}%
                              </span>
                            </td>
                            <td className="text-center">{reviewer.firstPassSuccess}%</td>
                            <td className="text-center">{reviewer.slaCompliance}%</td>
                            <td className="text-center">
                              <Badge className={performanceBadge.color}>
                                {performanceBadge.label}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Service Type Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Type Performance</CardTitle>
                  <CardDescription>Quality metrics by service category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics?.serviceTypeBreakdown?.map((service) => (
                      <div key={service.serviceType} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium capitalize">{service.serviceType}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {service.totalReviews} reviews
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">Quality:</span>
                            <span className={`ml-2 font-medium ${getPerformanceColor(service.avgQualityScore)}`}>
                              {service.avgQualityScore}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">Defects:</span>
                            <span className="ml-2 font-medium">{service.defectRate}%</span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-300">Satisfaction:</span>
                            <span className="ml-2 font-medium">{service.clientSatisfaction}/5</span>
                          </div>
                        </div>
                        <Progress value={service.avgQualityScore} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Issue Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Issue Analysis</CardTitle>
                  <CardDescription>Common issues and their trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics?.issueAnalysis?.map((issue) => (
                      <div key={issue.category} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{issue.category}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {issue.count} occurrences
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            className={
                              issue.impact === 'high' ? 'bg-red-100 text-red-800' :
                              issue.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }
                          >
                            {issue.impact} impact
                          </Badge>
                          <div className="flex items-center gap-1 mt-1">
                            {issue.trend === 'increasing' ? (
                              <TrendingUp className="h-4 w-4 text-red-500" />
                            ) : issue.trend === 'decreasing' ? (
                              <TrendingDown className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className="h-4 w-4 bg-gray-400 rounded-full"></div>
                            )}
                            <span className="text-xs text-gray-500 capitalize">{issue.trend}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client Feedback Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Client Feedback Summary</CardTitle>
                  <CardDescription>Average ratings across all dimensions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Overall Rating', value: metrics?.clientFeedbackSummary.avgOverallRating || 0 },
                    { label: 'Service Quality', value: metrics?.clientFeedbackSummary.avgServiceQuality || 0 },
                    { label: 'Timeliness', value: metrics?.clientFeedbackSummary.avgTimeliness || 0 },
                    { label: 'Communication', value: metrics?.clientFeedbackSummary.avgCommunication || 0 },
                    { label: 'Documentation', value: metrics?.clientFeedbackSummary.avgDocumentation || 0 }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={item.value * 20} className="w-24" />
                        <span className="text-sm font-semibold w-8">{item.value.toFixed(1)}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star}
                              className={`h-4 w-4 ${star <= item.value ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* NPS and Recommendation */}
              <Card>
                <CardHeader>
                  <CardTitle>Net Promoter Score</CardTitle>
                  <CardDescription>Client recommendation metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {metrics?.clientFeedbackSummary.npsScore || 0}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">NPS Score</p>
                    <Badge 
                      className={
                        (metrics?.clientFeedbackSummary.npsScore || 0) >= 50 ? 'bg-green-100 text-green-800' :
                        (metrics?.clientFeedbackSummary.npsScore || 0) >= 0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {(metrics?.clientFeedbackSummary.npsScore || 0) >= 50 ? 'Excellent' :
                       (metrics?.clientFeedbackSummary.npsScore || 0) >= 0 ? 'Good' : 'Needs Improvement'}
                    </Badge>
                  </div>
                  
                  <div className="text-center pt-4 border-t">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {(metrics?.clientFeedbackSummary.recommendationRate || 0).toFixed(1)}%
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">Would Recommend</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}