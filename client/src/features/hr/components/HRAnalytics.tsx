import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Clock, Star,
  Target, Award, AlertTriangle, CheckCircle, PieChart,
  Download, Filter, Calendar, Brain, Zap, Activity
} from 'lucide-react';

export default function HRAnalytics() {
  const [timeFilter, setTimeFilter] = useState('month');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Fetch analytics data
  const { data: analyticsData } = useQuery({
    queryKey: ['/api/hr/analytics/comprehensive', {
      timeframe: timeFilter,
      department: departmentFilter === 'all' ? undefined : departmentFilter
    }],
  });

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">HR Analytics Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive insights into team performance and operations</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-time-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-department-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="qc">QC</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export-analytics">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <HRMetricsOverview data={analyticsData} />

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance" data-testid="tab-performance-analytics">
            <Star className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="productivity" data-testid="tab-productivity-analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Productivity
          </TabsTrigger>
          <TabsTrigger value="engagement" data-testid="tab-engagement-analytics">
            <Activity className="h-4 w-4 mr-2" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="skills" data-testid="tab-skills-analytics">
            <Brain className="h-4 w-4 mr-2" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceAnalytics data={analyticsData} />
        </TabsContent>

        <TabsContent value="productivity" className="space-y-6">
          <ProductivityAnalytics data={analyticsData} />
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <EngagementAnalytics data={analyticsData} />
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <SkillsAnalytics data={analyticsData} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendsAnalytics data={analyticsData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// HR Metrics Overview Component
function HRMetricsOverview({ data }: { data: any }) {
  const metrics = [
    {
      title: 'Team Performance Score',
      value: data?.overview?.performanceScore || '4.2',
      unit: '/5',
      icon: Star,
      color: 'bg-yellow-500',
      trend: { value: '+0.3', positive: true },
      description: 'Average across all departments'
    },
    {
      title: 'Employee Satisfaction',
      value: data?.overview?.satisfactionScore || '87',
      unit: '%',
      icon: Activity,
      color: 'bg-green-500',
      trend: { value: '+5%', positive: true },
      description: 'Based on latest surveys'
    },
    {
      title: 'Training Completion',
      value: data?.overview?.trainingCompletion || '92',
      unit: '%',
      icon: Award,
      color: 'bg-blue-500',
      trend: { value: '+8%', positive: true },
      description: 'Programs completed on time'
    },
    {
      title: 'Attendance Rate',
      value: data?.overview?.attendanceRate || '94',
      unit: '%',
      icon: CheckCircle,
      color: 'bg-purple-500',
      trend: { value: '-1%', positive: false },
      description: 'Monthly average'
    },
    {
      title: 'Workload Balance',
      value: data?.overview?.workloadBalance || '78',
      unit: '%',
      icon: Users,
      color: 'bg-orange-500',
      trend: { value: '+3%', positive: true },
      description: 'Optimal capacity utilization'
    },
    {
      title: 'Skill Gap Index',
      value: data?.overview?.skillGapIndex || '23',
      unit: '%',
      icon: Brain,
      color: 'bg-red-500',
      trend: { value: '-7%', positive: true },
      description: 'Critical skills shortage'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {metric.title}
                </p>
                <div className="flex items-baseline space-x-1">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {metric.value}
                  </p>
                  <span className="text-lg text-gray-500">{metric.unit}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`flex items-center space-x-1 ${
                    metric.trend.positive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.trend.positive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span className="text-xs font-medium">{metric.trend.value}</span>
                  </div>
                  <span className="text-xs text-gray-500">vs last {timeFilter}</span>
                </div>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>
              <div className={`p-3 rounded-lg ${metric.color}`}>
                <metric.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Performance Analytics Component
function PerformanceAnalytics({ data }: { data: any }) {
  const departmentPerformance = [
    { dept: 'Operations', score: 4.3, employees: 25, improvement: '+0.4' },
    { dept: 'Sales', score: 4.1, employees: 15, improvement: '+0.2' },
    { dept: 'QC', score: 4.6, employees: 12, improvement: '+0.1' },
    { dept: 'Admin', score: 3.9, employees: 8, improvement: '-0.1' },
  ];

  const performanceDistribution = [
    { category: 'Exceptional (4.5+)', count: 15, percentage: 25 },
    { category: 'Good (3.5-4.4)', count: 30, percentage: 50 },
    { category: 'Average (2.5-3.4)', count: 12, percentage: 20 },
    { category: 'Needs Improvement (<2.5)', count: 3, percentage: 5 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Department Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departmentPerformance.map((dept) => (
              <div key={dept.dept} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{dept.dept}</span>
                    <span className="text-sm text-gray-500 ml-2">({dept.employees} employees)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{dept.score}/5</span>
                    <Badge variant={dept.improvement.startsWith('+') ? 'default' : 'destructive'}>
                      {dept.improvement}
                    </Badge>
                  </div>
                </div>
                <Progress value={(dept.score / 5) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceDistribution.map((item) => (
              <div key={item.category} className="flex items-center justify-between">
                <span className="text-sm">{item.category}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{item.count}</span>
                  <div className="w-16">
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                  <span className="text-sm text-gray-500">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Productivity Analytics Component
function ProductivityAnalytics({ data }: { data: any }) {
  const productivityMetrics = [
    { metric: 'Tasks Completed', value: '1,247', change: '+12%', color: 'text-green-600' },
    { metric: 'Average Task Time', value: '2.3h', change: '-8%', color: 'text-green-600' },
    { metric: 'Project Delivery', value: '94%', change: '+5%', color: 'text-green-600' },
    { metric: 'Overtime Hours', value: '156', change: '-15%', color: 'text-green-600' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Productivity Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {productivityMetrics.map((item) => (
              <div key={item.metric} className="text-center p-4 border rounded-lg">
                <p className="text-sm text-gray-600">{item.metric}</p>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className={`text-sm ${item.color}`}>{item.change}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'High Priority', value: 35, color: 'bg-red-500' },
              { name: 'Medium Priority', value: 45, color: 'bg-yellow-500' },
              { name: 'Low Priority', value: 20, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full`}
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Engagement Analytics Component
function EngagementAnalytics({ data }: { data: any }) {
  const engagementFactors = [
    { factor: 'Job Satisfaction', score: 4.2, benchmark: 4.0 },
    { factor: 'Work-Life Balance', score: 3.8, benchmark: 3.5 },
    { factor: 'Career Growth', score: 3.9, benchmark: 3.7 },
    { factor: 'Team Collaboration', score: 4.4, benchmark: 4.1 },
    { factor: 'Management Support', score: 4.1, benchmark: 3.8 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Engagement Factors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {engagementFactors.map((item) => (
              <div key={item.factor} className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">{item.factor}</span>
                  <span className="text-sm">
                    {item.score}/5
                    <span className="text-gray-500 ml-1">(vs {item.benchmark} benchmark)</span>
                  </span>
                </div>
                <div className="relative">
                  <Progress value={(item.score / 5) * 100} className="h-3" />
                  <div
                    className="absolute top-0 w-1 h-3 bg-gray-400"
                    style={{ left: `${(item.benchmark / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">87%</p>
              <p className="text-sm text-gray-600">Overall Satisfaction</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Positive Feedback</span>
                <Badge variant="default">156 responses</Badge>
              </div>
              <div className="flex justify-between">
                <span>Improvement Suggestions</span>
                <Badge variant="secondary">42 responses</Badge>
              </div>
              <div className="flex justify-between">
                <span>Survey Participation</span>
                <Badge variant="outline">91%</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Skills Analytics Component
function SkillsAnalytics({ data }: { data: any }) {
  const skillGaps = [
    { skill: 'Advanced Excel', gap: 45, priority: 'High' },
    { skill: 'Data Analysis', gap: 38, priority: 'High' },
    { skill: 'Project Management', gap: 28, priority: 'Medium' },
    { skill: 'Leadership', gap: 22, priority: 'Medium' },
    { skill: 'Communication', gap: 15, priority: 'Low' },
  ];

  const certifications = [
    { cert: 'Tax Planning Certification', holders: 12, expiring: 3 },
    { cert: 'Quality Management', holders: 8, expiring: 1 },
    { cert: 'Financial Analysis', holders: 15, expiring: 2 },
    { cert: 'Compliance Management', holders: 10, expiring: 0 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Critical Skill Gaps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {skillGaps.map((skill) => (
              <div key={skill.skill} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{skill.skill}</span>
                    <Badge variant={
                      skill.priority === 'High' ? 'destructive' :
                      skill.priority === 'Medium' ? 'default' : 'secondary'
                    }>
                      {skill.priority}
                    </Badge>
                  </div>
                  <Progress value={skill.gap} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">{skill.gap}% of team needs training</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certification Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {certifications.map((cert) => (
              <div key={cert.cert} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{cert.cert}</h4>
                  {cert.expiring > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {cert.expiring} expiring
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{cert.holders} certified employees</span>
                  <span>{Math.round((cert.holders / 60) * 100)}% of team</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Trends Analytics Component
function TrendsAnalytics({ data }: { data: any }) {
  const monthlyTrends = [
    { month: 'Jan', performance: 4.1, attendance: 92, training: 85 },
    { month: 'Feb', performance: 4.0, attendance: 91, training: 88 },
    { month: 'Mar', performance: 4.2, attendance: 94, training: 90 },
    { month: 'Apr', performance: 4.3, attendance: 93, training: 92 },
    { month: 'May', performance: 4.2, attendance: 95, training: 94 },
    { month: 'Jun', performance: 4.4, attendance: 94, training: 96 },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>6-Month Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-4 text-center text-sm font-medium text-gray-600">
              {monthlyTrends.map((month) => (
                <div key={month.month}>{month.month}</div>
              ))}
            </div>

            {/* Performance Trend */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">Performance Score</span>
              </div>
              <div className="grid grid-cols-6 gap-4">
                {monthlyTrends.map((month) => (
                  <div key={month.month} className="text-center">
                    <div className="text-lg font-bold text-blue-600">{month.performance}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Trend */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Attendance Rate (%)</span>
              </div>
              <div className="grid grid-cols-6 gap-4">
                {monthlyTrends.map((month) => (
                  <div key={month.month} className="text-center">
                    <div className="text-lg font-bold text-green-600">{month.attendance}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Training Trend */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium">Training Completion (%)</span>
              </div>
              <div className="grid grid-cols-6 gap-4">
                {monthlyTrends.map((month) => (
                  <div key={month.month} className="text-center">
                    <div className="text-lg font-bold text-purple-600">{month.training}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600 mt-1" />
              <p className="text-sm">Performance scores trending upward over 6 months</p>
            </div>
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-1" />
              <p className="text-sm">Attendance dip in February needs investigation</p>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
              <p className="text-sm">Training completion rates steadily improving</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Predictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">4.5</p>
              <p className="text-sm text-gray-600">Projected Q3 Performance</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">96%</p>
              <p className="text-sm text-gray-600">Target Attendance Rate</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-2 bg-blue-50 rounded text-sm">
              Focus on leadership development programs
            </div>
            <div className="p-2 bg-green-50 rounded text-sm">
              Implement flexible work arrangements
            </div>
            <div className="p-2 bg-purple-50 rounded text-sm">
              Expand technical skills training
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
