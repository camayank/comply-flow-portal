import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout, PageShell } from '@/components/v3';
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Award,
  Plus,
  ArrowRight,
  MapPin,
  Calendar,
  Bell,
  FileText,
} from 'lucide-react';
import { Link } from 'wouter';
import { EmptyList } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/useAuth';
import { AGENT_NAVIGATION } from '@/config/agent-navigation';

export default function AgentDashboard() {
  const { user: authUser } = useAuth();

  // Use actual authenticated user data
  const agentUser = {
    name: authUser?.fullName || authUser?.username || 'Agent',
    email: authUser?.email || '',
  };

  const { data: agentStats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/agent/stats'],
  });

  const { data: recentLeads, isLoading: loadingLeads } = useQuery({
    queryKey: ['/api/agent/leads/recent'],
  });

  const { data: commissionData, isLoading: loadingCommissions } = useQuery({
    queryKey: ['/api/agent/commissions/summary'],
  });

  const { data: announcements, isLoading: loadingAnnouncements } = useQuery({
    queryKey: ['/api/agent/announcements'],
  });

  const isLoading = loadingStats || loadingLeads || loadingCommissions;

  const stats = (agentStats as any);
  const recentLeadsData = (recentLeads as any)?.leads || [];
  const announcementsData = (announcements as any)?.announcements || [];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'hot_lead': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warm_lead': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'cold_lead': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'contacted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'converted': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <DashboardLayout
      navigation={AGENT_NAVIGATION}
      user={agentUser}
    >
      <PageShell
        title="Agent Dashboard"
        subtitle="Track your leads, commissions, and performance"
        breadcrumbs={[
          { label: "Agent Portal", href: "/agent" },
          { label: "Dashboard" },
        ]}
        actions={
          <Link href="/pre-sales">
            <Button data-testid="button-add-lead">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </Link>
        }
      >
        {/* Agent Profile Card */}
        {loadingStats ? (
          <Skeleton className="h-24 w-full mb-6" />
        ) : stats ? (
          <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Agent Profile
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {stats.territory || 'Not assigned'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm py-1 px-3">
                    <Award className="h-4 w-4 mr-1" />
                    {stats.rank || 'Agent'}
                  </Badge>
                  {stats.performanceRating && (
                    <Badge variant="outline" className="text-sm py-1 px-3">
                      {stats.performanceRating} Rating
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {loadingStats ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </>
          ) : stats ? (
            <>
              {/* Total Leads */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardDescription>Total Leads</CardDescription>
                  <CardTitle className="text-3xl">{stats.totalLeads || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">
                      +{stats.thisMonthLeads || 0} this month
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Converted Leads */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardDescription>Converted Leads</CardDescription>
                  <CardTitle className="text-3xl">{stats.convertedLeads || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-600 font-medium">
                      {stats.conversionRate || 0}% conversion rate
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Total Commission */}
              <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                <CardHeader className="pb-3">
                  <CardDescription>Total Commission</CardDescription>
                  <CardTitle className="text-3xl text-green-700 dark:text-green-400">
                    Rs.{(stats.totalCommission || 0).toLocaleString('en-IN')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">Lifetime earnings</span>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Commission */}
              <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
                <CardHeader className="pb-3">
                  <CardDescription>Pending Payout</CardDescription>
                  <CardTitle className="text-3xl text-orange-700 dark:text-orange-400">
                    Rs.{(stats.pendingCommission || 0).toLocaleString('en-IN')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-600 font-medium">Next payout: 5th</span>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="col-span-4 text-center py-8 text-gray-500">
              <p>Unable to load stats. Please try again.</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/agent/leads">
            <Card className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Manage Leads
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Track and convert leads
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agent/commissions">
            <Card className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      View Commissions
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Track your earnings
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/agent/performance">
            <Card className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Performance
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Analytics & rankings
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Leads */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Leads</CardTitle>
                <Link href="/agent/leads">
                  <Button variant="ghost" size="sm" data-testid="button-view-all-leads">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <CardDescription>Your latest lead submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLeads ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentLeadsData.length === 0 ? (
                <EmptyList
                  title="No leads yet"
                  description="Start adding leads to track your pipeline and earn commissions"
                  actionLabel="Add Your First Lead"
                  onAction={() => window.location.href = '/pre-sales'}
                />
              ) : (
                <div className="space-y-3">
                  {recentLeadsData.slice(0, 5).map((lead: any) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      data-testid={`lead-item-${lead.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {lead.companyName || lead.contactName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {lead.serviceInterested || 'Multiple services'}
                        </p>
                      </div>
                      <Badge className={getStageColor(lead.leadStage)} variant="secondary">
                        {lead.leadStage?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Announcements</CardTitle>
                <Bell className="h-5 w-5 text-gray-400" />
              </div>
              <CardDescription>Latest updates from admin</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAnnouncements ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : announcementsData.length === 0 ? (
                <EmptyList
                  title="No announcements yet"
                  description="Company announcements and updates will appear here"
                />
              ) : (
                <div className="space-y-3">
                  {announcementsData.slice(0, 4).map((announcement: any) => (
                    <div
                      key={announcement.id}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      data-testid={`announcement-${announcement.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <FileText className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {announcement.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {announcement.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}
