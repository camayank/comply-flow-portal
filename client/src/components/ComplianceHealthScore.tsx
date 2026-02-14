import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

interface HealthScoreData {
  healthScore: number;
  healthGrade: string;
  overallStatus: 'GREEN' | 'AMBER' | 'RED';
  summaryText: string;
  statistics: {
    totalCompliances: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  domains: Array<{
    name: string;
    score: number;
    status: 'critical' | 'attention' | 'compliant';
  }>;
}

interface ComplianceHealthScoreProps {
  variant?: 'full' | 'compact' | 'minimal';
  showDomains?: boolean;
  className?: string;
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A': return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' };
    case 'B': return { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' };
    case 'C': return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' };
    case 'D': return { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' };
    case 'F': return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
    default: return { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-50' };
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-amber-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};

const getProgressColor = (score: number) => {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 75) return 'bg-blue-500';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
};

export function ComplianceHealthScore({
  variant = 'full',
  showDomains = true,
  className
}: ComplianceHealthScoreProps) {
  const { data, isLoading, error, refetch, isFetching } = useQuery<HealthScoreData>({
    queryKey: ['/api/v2/client/executive-summary'],
    refetchInterval: 60000,
    select: (response: any) => ({
      healthScore: response.healthScore,
      healthGrade: response.healthGrade,
      overallStatus: response.overallStatus,
      summaryText: response.summaryText,
      statistics: response.statistics,
      domains: response.domains?.slice(0, 4) || []
    })
  });

  if (isLoading) {
    return <HealthScoreSkeleton variant={variant} />;
  }

  if (error || !data) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Unable to load health score</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const gradeColors = getGradeColor(data.healthGrade);

  if (variant === 'minimal') {
    return (
      <Link href="/executive-summary">
        <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", className)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full", gradeColors.light)}>
                  <Shield className={cn("h-5 w-5", gradeColors.text)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                  <p className={cn("text-2xl font-bold", getScoreColor(data.healthScore))}>
                    {data.healthScore}
                  </p>
                </div>
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded-lg font-bold text-lg",
                gradeColors.light,
                gradeColors.text
              )}>
                {data.healthGrade}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className={cn("h-4 w-4", gradeColors.text)} />
                <span className="text-sm font-medium">Compliance Health</span>
                {isFetching && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-bold", getScoreColor(data.healthScore))}>
                  {data.healthScore}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
            <div className={cn(
              "px-3 py-1.5 rounded-lg font-bold text-xl border-2",
              gradeColors.light,
              gradeColors.text,
              `border-${gradeColors.text.replace('text-', '')}`
            )}>
              {data.healthGrade}
            </div>
          </div>

          <Progress
            value={data.healthScore}
            className="h-2 mb-3"
          />

          <div className="flex items-center justify-between text-xs">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {data.statistics.completed} done
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                {data.statistics.overdue} overdue
              </span>
            </div>
            <Link href="/executive-summary" className="text-primary flex items-center gap-1 hover:underline">
              Details <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className={cn("p-6", gradeColors.light)}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className={cn("h-5 w-5", gradeColors.text)} />
              <span className="font-medium">Compliance Health Score</span>
              {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-5xl font-bold", getScoreColor(data.healthScore))}>
                {data.healthScore}
              </span>
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              {data.summaryText}
            </p>
          </div>
          <div className={cn(
            "px-4 py-2 rounded-xl font-bold text-3xl border-2",
            gradeColors.light,
            gradeColors.text
          )}>
            {data.healthGrade}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Poor (0-39)</span>
            <span>Fair (40-59)</span>
            <span>Good (60-74)</span>
            <span>Great (75-89)</span>
            <span>Excellent (90+)</span>
          </div>
          <div className="h-3 bg-white/50 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-1000", getProgressColor(data.healthScore))}
              style={{ width: `${data.healthScore}%` }}
            />
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Statistics Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold">{data.statistics.totalCompliances}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{data.statistics.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{data.statistics.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{data.statistics.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
        </div>

        {/* Domain Breakdown */}
        {showDomains && data.domains.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">By Domain</h4>
            <div className="grid grid-cols-2 gap-3">
              {data.domains.map((domain) => (
                <div
                  key={domain.name}
                  className={cn(
                    "p-3 rounded-lg border",
                    domain.status === 'critical' ? "border-red-200 bg-red-50" :
                    domain.status === 'attention' ? "border-amber-200 bg-amber-50" :
                    "border-emerald-200 bg-emerald-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{domain.name}</span>
                    <span className={cn(
                      "text-sm font-bold",
                      domain.status === 'critical' ? "text-red-600" :
                      domain.status === 'attention' ? "text-amber-600" :
                      "text-emerald-600"
                    )}>
                      {domain.score}%
                    </span>
                  </div>
                  <Progress value={domain.score} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-6 flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Link href="/executive-summary">
            <Button size="sm">
              View Full Report
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthScoreSkeleton({ variant }: { variant: string }) {
  if (variant === 'minimal') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-8 w-12" />
              </div>
            </div>
            <Skeleton className="h-10 w-10" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12" />
          </div>
          <Skeleton className="h-2 w-full mb-3" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6 bg-slate-50">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-5 w-40 mb-3" />
            <Skeleton className="h-12 w-24 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-16 w-16" />
        </div>
        <Skeleton className="h-3 w-full mt-6" />
      </div>
      <CardContent className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ComplianceHealthScore;
