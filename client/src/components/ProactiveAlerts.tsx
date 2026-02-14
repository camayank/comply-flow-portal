import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Bell,
  BellRing,
  ChevronRight,
  Clock,
  FileText,
  CreditCard,
  Shield,
  X,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

interface Alert {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  category: 'deadline' | 'document' | 'payment' | 'compliance' | 'system';
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  dueDate?: string;
  penalty?: number;
  priority: number;
  createdAt: string;
  isRead: boolean;
  metadata?: any;
}

interface AlertsData {
  alerts: Alert[];
  summary: {
    total: number;
    urgent: number;
    warning: number;
    info: number;
    totalPenaltyRisk: number;
  };
  lastUpdated: string;
}

interface ProactiveAlertsProps {
  variant?: 'full' | 'compact' | 'banner';
  maxAlerts?: number;
  showSummary?: boolean;
  className?: string;
}

const getAlertIcon = (type: string, category: string) => {
  if (type === 'urgent') return AlertTriangle;
  if (type === 'warning') return AlertCircle;
  if (category === 'document') return FileText;
  if (category === 'payment') return CreditCard;
  if (category === 'compliance') return Shield;
  return Info;
};

const getAlertColors = (type: string) => {
  switch (type) {
    case 'urgent':
      return {
        bg: 'bg-red-50 hover:bg-red-100',
        border: 'border-red-200',
        icon: 'text-red-600',
        badge: 'bg-red-100 text-red-700'
      };
    case 'warning':
      return {
        bg: 'bg-amber-50 hover:bg-amber-100',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        badge: 'bg-amber-100 text-amber-700'
      };
    case 'success':
      return {
        bg: 'bg-emerald-50 hover:bg-emerald-100',
        border: 'border-emerald-200',
        icon: 'text-emerald-600',
        badge: 'bg-emerald-100 text-emerald-700'
      };
    default:
      return {
        bg: 'bg-blue-50 hover:bg-blue-100',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-700'
      };
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else {
    return `Due in ${diffDays} days`;
  }
};

export function ProactiveAlerts({
  variant = 'full',
  maxAlerts = 5,
  showSummary = true,
  className
}: ProactiveAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch, isFetching } = useQuery<AlertsData>({
    queryKey: ['/api/v2/client/proactive-alerts'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  if (isLoading) {
    return <AlertsSkeleton variant={variant} />;
  }

  if (error || !data) {
    return null; // Silently fail for alerts - not critical
  }

  const visibleAlerts = data.alerts
    .filter(alert => !dismissedAlerts.has(alert.id))
    .slice(0, maxAlerts);

  const hasUrgent = data.summary.urgent > 0;

  // Banner variant - single most important alert
  if (variant === 'banner') {
    const topAlert = visibleAlerts[0];
    if (!topAlert) return null;

    const colors = getAlertColors(topAlert.type);
    const Icon = getAlertIcon(topAlert.type, topAlert.category);

    return (
      <div className={cn(
        "rounded-lg border-2 p-4 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300",
        colors.bg,
        colors.border,
        className
      )}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn("p-2 rounded-full", colors.badge)}>
            <Icon className={cn("h-5 w-5", colors.icon)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold truncate">{topAlert.title}</p>
              {topAlert.dueDate && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {formatRelativeTime(topAlert.dueDate)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{topAlert.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {topAlert.actionUrl && topAlert.actionLabel && (
            <Link href={topAlert.actionUrl}>
              <Button size="sm" variant={topAlert.type === 'urgent' ? 'destructive' : 'default'}>
                {topAlert.actionLabel}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => handleDismiss(topAlert.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Compact variant - notification bell with count
  if (variant === 'compact') {
    return (
      <div className={cn("relative", className)}>
        <Link href="/notifications">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative",
              hasUrgent && "text-red-600"
            )}
          >
            {hasUrgent ? (
              <BellRing className="h-5 w-5 animate-pulse" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {data.summary.total > 0 && (
              <span className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white",
                hasUrgent ? "bg-red-500" : "bg-blue-500"
              )}>
                {data.summary.total > 9 ? '9+' : data.summary.total}
              </span>
            )}
          </Button>
        </Link>
      </div>
    );
  }

  // Full variant - card with list of alerts
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasUrgent ? (
              <BellRing className="h-5 w-5 text-red-500 animate-pulse" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            <CardTitle className="text-lg">Alerts</CardTitle>
            {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
        {showSummary && data.summary.total > 0 && (
          <div className="flex gap-3 mt-2">
            {data.summary.urgent > 0 && (
              <Badge variant="destructive" className="text-xs">
                {data.summary.urgent} urgent
              </Badge>
            )}
            {data.summary.warning > 0 && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                {data.summary.warning} warnings
              </Badge>
            )}
            {data.summary.totalPenaltyRisk > 0 && (
              <Badge variant="outline" className="text-xs text-red-600">
                {formatCurrency(data.summary.totalPenaltyRisk)} at risk
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No alerts at this time</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {visibleAlerts.map((alert) => {
                const colors = getAlertColors(alert.type);
                const Icon = getAlertIcon(alert.type, alert.category);

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      colors.bg,
                      colors.border
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-1.5 rounded-full shrink-0", colors.badge)}>
                        <Icon className={cn("h-4 w-4", colors.icon)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{alert.title}</p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0"
                            onClick={() => handleDismiss(alert.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {alert.dueDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatRelativeTime(alert.dueDate)}
                              </span>
                            )}
                            {alert.penalty && alert.penalty > 0 && (
                              <span className="text-red-600">
                                {formatCurrency(alert.penalty)} penalty
                              </span>
                            )}
                          </div>
                          {alert.actionUrl && alert.actionLabel && (
                            <Link href={alert.actionUrl}>
                              <Button
                                size="sm"
                                variant={alert.type === 'urgent' ? 'destructive' : 'outline'}
                                className="h-7 text-xs"
                              >
                                {alert.actionLabel}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {data.alerts.length > maxAlerts && (
          <div className="mt-4 pt-3 border-t">
            <Link href="/notifications">
              <Button variant="ghost" className="w-full" size="sm">
                View all {data.summary.total} alerts
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertsSkeleton({ variant }: { variant: string }) {
  if (variant === 'banner') {
    return (
      <div className="rounded-lg border p-4 flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-48 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    );
  }

  if (variant === 'compact') {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-7 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProactiveAlerts;
