/**
 * Performance Metrics Dashboard
 *
 * Comprehensive ops performance tracking:
 * - Individual KPIs (SLA%, quality, throughput)
 * - Team benchmarking
 * - Trend analysis
 * - Leaderboards
 */

import { useState } from 'react';
import { DashboardLayout } from '@/layouts';
import { useAuth } from '@/hooks/use-auth';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { get } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  BarChart3,
  Users,
  Calendar,
  Minus,
} from 'lucide-react';

interface TeamMetrics {
  slaComplianceRate: number;
  slaTrend: number;
  avgCompletionTime: number;
  completionTimeTrend: number;
  throughput: number;
  throughputTrend: number;
  qualityScore: number;
  qualityTrend: number;
  totalCompleted: number;
  totalPending: number;
  atRiskCount: number;
  breachedCount: number;
}

interface IndividualMetrics {
  id: number;
  name: string;
  role: string;
  slaComplianceRate: number;
  avgCompletionTime: number;
  completedThisWeek: number;
  completedThisMonth: number;
  qualityScore: number;
  customerSatisfaction: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
}

interface PerformanceData {
  team: TeamMetrics;
  individuals: IndividualMetrics[];
  topPerformers: IndividualMetrics[];
  weeklyTrend: { week: string; sla: number; throughput: number; quality: number }[];
}

const navigation = [
  { label: 'Dashboard', href: '/operations' },
  { label: 'Work Queue', href: '/work-queue' },
  { label: 'Team Assignment', href: '/ops/team' },
  { label: 'Performance', href: '/ops/performance' },
];

export default function PerformanceMetricsDashboard() {
  const { user: authUser } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('week');

  const metricsQuery = useStandardQuery<PerformanceData>({
    queryKey: ['/api/ops/performance', period],
    queryFn: () => get<PerformanceData>(`/api/ops/performance?period=${period}`),
  });

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const getScoreColor = (score: number, target: number = 90) => {
    if (score >= target) return 'text-green-600';
    if (score >= target - 10) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500">🥇 #1</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400">🥈 #2</Badge>;
    if (rank === 3) return <Badge className="bg-amber-600">🥉 #3</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  return (
    <DashboardLayout
      title="Performance Metrics"
      navigation={navigation}
      user={{ name: authUser?.fullName || 'Manager', email: authUser?.email || '' }}
    >
      <div className="space-y-6 p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Performance Metrics</h2>
            <p className="text-gray-600">Track team and individual performance</p>
          </div>
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {metricsQuery.render((data) => (
          <>
            {/* Team KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    {getTrendIcon(data?.team?.slaTrend || 0)}
                  </div>
                  <p className="text-sm text-gray-600">SLA Compliance</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-bold ${getScoreColor(data?.team?.slaComplianceRate || 0)}`}>
                      {data?.team?.slaComplianceRate || 0}%
                    </p>
                    <span className={`text-sm ${getTrendColor(data?.team?.slaTrend || 0)}`}>
                      {data?.team?.slaTrend ? `${data.team.slaTrend > 0 ? '+' : ''}${data.team.slaTrend}%` : ''}
                    </span>
                  </div>
                  <Progress value={data?.team?.slaComplianceRate || 0} className="h-1 mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    {getTrendIcon(-(data?.team?.completionTimeTrend || 0))}
                  </div>
                  <p className="text-sm text-gray-600">Avg Completion Time</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{data?.team?.avgCompletionTime || 0}h</p>
                    <span className={`text-sm ${getTrendColor(-(data?.team?.completionTimeTrend || 0))}`}>
                      {data?.team?.completionTimeTrend ? `${data.team.completionTimeTrend > 0 ? '+' : ''}${data.team.completionTimeTrend}h` : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    {getTrendIcon(data?.team?.throughputTrend || 0)}
                  </div>
                  <p className="text-sm text-gray-600">Throughput</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{data?.team?.throughput || 0}</p>
                    <span className="text-sm text-gray-500">items/day</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Award className="h-5 w-5 text-yellow-600" />
                    {getTrendIcon(data?.team?.qualityTrend || 0)}
                  </div>
                  <p className="text-sm text-gray-600">Quality Score</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-bold ${getScoreColor(data?.team?.qualityScore || 0, 4)}`}>
                      {data?.team?.qualityScore || 0}/5
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-green-700">Completed</p>
                    <p className="text-2xl font-bold text-green-800">{data?.team?.totalCompleted || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-700">Pending</p>
                    <p className="text-2xl font-bold text-blue-800">{data?.team?.totalPending || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-orange-700">At Risk</p>
                    <p className="text-2xl font-bold text-orange-800">{data?.team?.atRiskCount || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-sm text-red-700">Breached</p>
                    <p className="text-2xl font-bold text-red-800">{data?.team?.breachedCount || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs: Leaderboard and Individual Performance */}
            <Tabs defaultValue="leaderboard">
              <TabsList>
                <TabsTrigger value="leaderboard">
                  <Award className="h-4 w-4 mr-2" />
                  Leaderboard
                </TabsTrigger>
                <TabsTrigger value="individual">
                  <Users className="h-4 w-4 mr-2" />
                  Individual Performance
                </TabsTrigger>
              </TabsList>

              <TabsContent value="leaderboard" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performers</CardTitle>
                    <CardDescription>Based on SLA compliance, quality, and throughput</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data?.topPerformers?.map((performer, index) => (
                        <div
                          key={performer.id}
                          className={`flex items-center gap-4 p-4 rounded-lg ${
                            index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                            index === 1 ? 'bg-gray-50 border border-gray-200' :
                            index === 2 ? 'bg-amber-50 border border-amber-200' : 'bg-white border'
                          }`}
                        >
                          <div className="text-2xl font-bold w-8">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>
                          <Avatar>
                            <AvatarFallback>
                              {performer.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">{performer.name}</p>
                            <p className="text-sm text-gray-500">{performer.role}</p>
                          </div>
                          <div className="grid grid-cols-4 gap-6 text-center">
                            <div>
                              <p className="text-xs text-gray-500">SLA</p>
                              <p className={`font-semibold ${getScoreColor(performer.slaComplianceRate)}`}>
                                {performer.slaComplianceRate}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Quality</p>
                              <p className="font-semibold">{performer.qualityScore}/5</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Completed</p>
                              <p className="font-semibold">{performer.completedThisWeek}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">CSAT</p>
                              <p className="font-semibold">{performer.customerSatisfaction}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="individual" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Individual Performance</CardTitle>
                    <CardDescription>Detailed metrics for each team member</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Team Member</TableHead>
                          <TableHead className="text-center">SLA %</TableHead>
                          <TableHead className="text-center">Avg Time</TableHead>
                          <TableHead className="text-center">This Week</TableHead>
                          <TableHead className="text-center">This Month</TableHead>
                          <TableHead className="text-center">Quality</TableHead>
                          <TableHead className="text-center">CSAT</TableHead>
                          <TableHead className="text-center">Trend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.individuals?.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>{getRankBadge(member.rank)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {member.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{member.name}</p>
                                  <p className="text-xs text-gray-500">{member.role}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={getScoreColor(member.slaComplianceRate)}>
                                {member.slaComplianceRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">{member.avgCompletionTime}h</TableCell>
                            <TableCell className="text-center">{member.completedThisWeek}</TableCell>
                            <TableCell className="text-center">{member.completedThisMonth}</TableCell>
                            <TableCell className="text-center">{member.qualityScore}/5</TableCell>
                            <TableCell className="text-center">{member.customerSatisfaction}%</TableCell>
                            <TableCell className="text-center">
                              {member.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500 mx-auto" />}
                              {member.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500 mx-auto" />}
                              {member.trend === 'stable' && <Minus className="h-4 w-4 text-gray-400 mx-auto" />}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ))}
      </div>
    </DashboardLayout>
  );
}
