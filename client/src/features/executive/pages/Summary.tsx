import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout, PageShell } from '@/layouts';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck,
  Download,
  Share2,
  Building2,
  TrendingUp,
  FileText,
  Calendar,
  AlertCircle,
  Home,
  BarChart3,
  Settings,
  Users,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Navigation configuration for v3 design system
const executiveNavigation = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/portal-v2", icon: Home },
      { label: "Executive Summary", href: "/executive-summary", icon: BarChart3 },
    ],
  },
  {
    title: "Compliance",
    items: [
      { label: "All Compliances", href: "/portal-v2/compliances", icon: Shield },
      { label: "Documents", href: "/portal-v2/documents", icon: FileText },
      { label: "Calendar", href: "/portal-v2/calendar", icon: Calendar },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Notifications", href: "/portal-v2/notifications", icon: Bell },
      { label: "Team", href: "/portal-v2/team", icon: Users },
      { label: "Settings", href: "/portal-v2/settings", icon: Settings },
    ],
  },
];

const executiveUser = {
  name: "Executive",
  email: "exec@digicomply.com",
};

interface ExecutiveSummaryData {
  generatedAt: string;
  healthScore: number;
  healthGrade: string;
  summaryText: string;
  companyInfo: {
    name: string;
    cin: string | null;
    gstin: string | null;
    pan: string | null;
    incorporationDate: string | null;
    registeredAddress: string | null;
  };
  overallStatus: 'GREEN' | 'AMBER' | 'RED';
  totalPenaltyExposure: number;
  domains: Array<{
    name: string;
    score: number;
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    status: 'critical' | 'attention' | 'compliant';
  }>;
  attentionItems: Array<{
    id: number;
    title: string;
    dueDate: string | null;
    priority: string;
    penalty: number;
    isOverdue: boolean;
  }>;
  recentCompletions: Array<{
    id: number;
    title: string;
    completedDate: string | null;
    category: string;
  }>;
  documentHealth: {
    score: number;
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    status: string;
  };
  statistics: {
    totalCompliances: number;
    completed: number;
    pending: number;
    overdue: number;
    upcomingThisMonth: number;
  };
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'B': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'C': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'D': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'F': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'GREEN':
    case 'compliant': return 'bg-emerald-500';
    case 'AMBER':
    case 'attention': return 'bg-amber-500';
    case 'RED':
    case 'critical': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export default function ExecutiveSummary() {
  const { data, isLoading, error, refetch } = useQuery<ExecutiveSummaryData>({
    queryKey: ['/api/v2/client/executive-summary'],
    refetchInterval: 60000, // Refresh every minute
  });

  const handleExportPDF = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data?.companyInfo.name} - Compliance Summary`,
          text: `Compliance Health Score: ${data?.healthScore}/100 (Grade ${data?.healthGrade})`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout navigation={executiveNavigation} user={executiveUser}>
        <PageShell
          title="Executive Summary"
          subtitle="Loading compliance overview..."
          breadcrumbs={[
            { label: "Client Portal", href: "/portal-v2" },
            { label: "Executive Summary" },
          ]}
        >
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout navigation={executiveNavigation} user={executiveUser}>
        <PageShell
          title="Executive Summary"
          subtitle="Compliance overview"
          breadcrumbs={[
            { label: "Client Portal", href: "/portal-v2" },
            { label: "Executive Summary" },
          ]}
        >
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Unable to Load Summary</h2>
                <p className="text-muted-foreground mb-4">
                  We couldn't fetch your compliance data. Please try again.
                </p>
                <Button onClick={() => refetch()}>Retry</Button>
              </CardContent>
            </Card>
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  const pageActions = (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={handleShare}>
        <Share2 className="h-4 w-4 mr-2" />
        Share
      </Button>
      <Button size="sm" onClick={handleExportPDF}>
        <Download className="h-4 w-4 mr-2" />
        Export PDF
      </Button>
    </div>
  );

  return (
    <DashboardLayout navigation={executiveNavigation} user={executiveUser}>
      <PageShell
        title={data.companyInfo.name}
        subtitle={`Compliance Executive Summary - Generated on ${formatDate(data.generatedAt)}`}
        breadcrumbs={[
          { label: "Client Portal", href: "/portal-v2" },
          { label: "Executive Summary" },
        ]}
        actions={pageActions}
        className="print:bg-white"
      >
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Health Score Hero */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Score Card */}
            <Card className="lg:col-span-2 overflow-hidden">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium mb-2">Compliance Health Score</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-6xl font-bold">{data.healthScore}</span>
                      <span className="text-2xl text-slate-400">/100</span>
                    </div>
                    <p className="text-slate-300 mt-4 max-w-md">{data.summaryText}</p>
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-lg border-2 font-bold text-2xl",
                    getGradeColor(data.healthGrade)
                  )}>
                    {data.healthGrade}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-8">
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Poor</span>
                    <span>Average</span>
                    <span>Good</span>
                    <span>Excellent</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        data.healthScore >= 75 ? "bg-emerald-500" :
                        data.healthScore >= 50 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${data.healthScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", getStatusColor(data.overallStatus), "bg-opacity-20")}>
                      <Shield className={cn("h-5 w-5",
                        data.overallStatus === 'GREEN' ? "text-emerald-600" :
                        data.overallStatus === 'AMBER' ? "text-amber-600" : "text-red-600"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold capitalize">{data.overallStatus.toLowerCase()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-50">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Penalty Exposure</p>
                      <p className="font-semibold">{formatCurrency(data.totalPenaltyExposure)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">This Month</p>
                      <p className="font-semibold">{data.statistics.upcomingThisMonth} due</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Company Info Bar */}
          <Card className="bg-slate-50">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-6 text-sm">
                {data.companyInfo.cin && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">CIN:</span>
                    <span className="font-mono">{data.companyInfo.cin}</span>
                  </div>
                )}
                {data.companyInfo.gstin && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">GSTIN:</span>
                    <span className="font-mono">{data.companyInfo.gstin}</span>
                  </div>
                )}
                {data.companyInfo.pan && (
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">PAN:</span>
                    <span className="font-mono">{data.companyInfo.pan}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Domain Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance by Domain
              </CardTitle>
              <CardDescription>
                Breakdown of compliance status across regulatory categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.domains.map((domain) => (
                  <div
                    key={domain.name}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-colors",
                      domain.status === 'critical' ? "border-red-200 bg-red-50" :
                      domain.status === 'attention' ? "border-amber-200 bg-amber-50" :
                      "border-emerald-200 bg-emerald-50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{domain.name}</h3>
                      <Badge variant={
                        domain.status === 'critical' ? 'destructive' :
                        domain.status === 'attention' ? 'secondary' : 'default'
                      }>
                        {domain.score}%
                      </Badge>
                    </div>
                    <Progress
                      value={domain.score}
                      className="h-2 mb-3"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {domain.completed} done
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500" />
                        {domain.pending} pending
                      </span>
                      {domain.overdue > 0 && (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          {domain.overdue} overdue
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attention Required */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Attention Required
                </CardTitle>
                <CardDescription>Items needing immediate action</CardDescription>
              </CardHeader>
              <CardContent>
                {data.attentionItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                    <p>No items require immediate attention</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.attentionItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3 rounded-lg border flex items-center justify-between",
                          item.isOverdue ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>{item.dueDate ? formatDate(item.dueDate) : 'No date'}</span>
                            {item.penalty > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-red-600">{formatCurrency(item.penalty)} penalty</span>
                              </>
                            )}
                          </div>
                        </div>
                        {item.isOverdue && (
                          <Badge variant="destructive" className="ml-2">Overdue</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Completions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Recent Completions
                </CardTitle>
                <CardDescription>Completed in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentCompletions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2" />
                    <p>No recent completions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.recentCompletions.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border bg-emerald-50 border-emerald-200 flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span>Completed {formatDate(item.completedDate)}</span>
                            <span>•</span>
                            <span>{item.category}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Document Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Health
              </CardTitle>
              <CardDescription>
                Status of uploaded compliance documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-3xl font-bold">{data.documentHealth.total}</p>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <p className="text-3xl font-bold text-emerald-600">{data.documentHealth.verified}</p>
                  <p className="text-sm text-muted-foreground">Verified</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-3xl font-bold text-amber-600">{data.documentHealth.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">{data.documentHealth.rejected}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{data.documentHealth.score}%</p>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Summary */}
          <Card className="bg-slate-900 text-white print:bg-slate-100 print:text-slate-900">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
                <div>
                  <p className="text-4xl font-bold">{data.statistics.totalCompliances}</p>
                  <p className="text-sm text-slate-400 print:text-slate-600">Total Items</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-emerald-400 print:text-emerald-600">{data.statistics.completed}</p>
                  <p className="text-sm text-slate-400 print:text-slate-600">Completed</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-amber-400 print:text-amber-600">{data.statistics.pending}</p>
                  <p className="text-sm text-slate-400 print:text-slate-600">Pending</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-red-400 print:text-red-600">{data.statistics.overdue}</p>
                  <p className="text-sm text-slate-400 print:text-slate-600">Overdue</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-blue-400 print:text-blue-600">{data.statistics.upcomingThisMonth}</p>
                  <p className="text-sm text-slate-400 print:text-slate-600">Due This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pb-8">
            <p>This report was generated by DigiComply for {data.companyInfo.name}</p>
            <p className="mt-1">For questions, contact your compliance team or support@digicomply.in</p>
          </div>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}
