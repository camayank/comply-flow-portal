import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Users,
  DollarSign,
  Trophy,
  Star,
  Zap
} from 'lucide-react';
import { Link } from 'wouter';

export default function AgentPerformance() {
  const [periodFilter, setPeriodFilter] = useState('this_month');

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['/api/agent/performance', { period: periodFilter }],
  });

  const { data: leaderboardData, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ['/api/agent/leaderboard', { period: periodFilter }],
  });

  const performance = (performanceData as any) || {
    currentRank: 5,
    totalAgents: 48,
    leadsGenerated: 18,
    leadsConverted: 5,
    conversionRate: 27.8,
    commissionEarned: 18200,
    performanceScore: 87,
    monthlyTarget: 30000,
    achievedTarget: 18200,
    targetProgress: 60.7,
    ranking: 'Silver Agent',
    badges: ['Top Performer', 'Quick Converter', '10+ Leads'],
  };

  const leaderboard = (leaderboardData as any)?.agents || [];

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    if (rank === 2) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    if (rank === 3) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/agent/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Performance Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track your performance and rankings
            </p>
          </div>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-period-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Performance Score Card */}
      <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Performance Score
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your overall performance rating
                </p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className={`text-5xl font-bold ${getPerformanceColor(performance.performanceScore)}`}>
                {performance.performanceScore}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Out of 100
              </p>
              <Badge variant="outline" className="mt-3">
                <Award className="h-4 w-4 mr-1" />
                {performance.ranking}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Current Rank</CardDescription>
            <CardTitle className="text-3xl">#{performance.currentRank}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span>Out of {performance.totalAgents} agents</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-3xl">{performance.conversionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-blue-600 font-medium">
                {performance.leadsConverted}/{performance.leadsGenerated} converted
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Commission Earned</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              ₹{performance.commissionEarned?.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <DollarSign className="h-4 w-4" />
              <span>This period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Target Progress</CardDescription>
            <CardTitle className="text-3xl">{performance.targetProgress}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-orange-600" />
              <span className="text-orange-600 font-medium">
                ₹{performance.achievedTarget?.toLocaleString('en-IN')} / ₹{performance.monthlyTarget?.toLocaleString('en-IN')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Achievement Badges</CardTitle>
          <CardDescription>Your earned achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {performance.badges.map((badge: string, index: number) => (
              <Badge
                key={index}
                variant="outline"
                className="text-sm py-2 px-4 bg-gradient-to-r from-primary/10 to-primary/5"
                data-testid={`badge-${index}`}
              >
                <Star className="h-4 w-4 mr-2 text-yellow-500" />
                {badge}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Detailed Analytics */}
      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="comparison" data-testid="tab-comparison">Peer Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Agent Leaderboard</CardTitle>
              <CardDescription>Top performing agents this period</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLeaderboard ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Leaderboard data not available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.slice(0, 10).map((agent: any, index: number) => (
                    <div
                      key={agent.id || index}
                      className={`p-4 rounded-lg border transition-colors ${
                        agent.isCurrentUser
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      data-testid={`leaderboard-item-${index}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge className={getRankBadgeColor(agent.rank)} variant="secondary">
                            #{agent.rank || index + 1}
                          </Badge>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {agent.name || `Agent ${index + 1}`}
                              {agent.isCurrentUser && (
                                <span className="ml-2 text-sm text-primary">(You)</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {agent.territory || 'Delhi NCR'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            ₹{agent.commissionEarned?.toLocaleString('en-IN') || '0'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {agent.leadsConverted || 0} conversions
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Your performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Performance Charts Coming Soon</p>
                <p className="text-sm">
                  Track your leads, conversions, and earnings with interactive charts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Peer Comparison</CardTitle>
              <CardDescription>Compare your performance with peers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Peer Comparison Coming Soon</p>
                <p className="text-sm">
                  See how you stack up against other agents in your territory
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
