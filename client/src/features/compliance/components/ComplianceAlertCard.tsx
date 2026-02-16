import { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  LucideIcon,
} from 'lucide-react';

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

interface SeverityConfig {
  icon: LucideIcon;
  className: string;
  borderClassName: string;
}

const severityConfigs: Record<AlertSeverity, SeverityConfig> = {
  critical: {
    icon: XCircle,
    className: 'text-red-600 dark:text-red-400',
    borderClassName: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-amber-600 dark:text-amber-400',
    borderClassName: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50',
  },
  info: {
    icon: Info,
    className: 'text-blue-600 dark:text-blue-400',
    borderClassName: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50',
  },
  success: {
    icon: CheckCircle,
    className: 'text-emerald-600 dark:text-emerald-400',
    borderClassName: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50',
  },
};

interface ComplianceAlertCardProps {
  severity: AlertSeverity;
  title: string;
  description?: string;
  dueDate?: Date | string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  children?: ReactNode;
}

export function ComplianceAlertCard({
  severity,
  title,
  description,
  dueDate,
  actionLabel,
  onAction,
  dismissible = false,
  onDismiss,
  children,
}: ComplianceAlertCardProps) {
  const config = severityConfigs[severity];
  const Icon = config.icon;

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Alert className={cn('relative', config.borderClassName)}>
      <Icon className={cn('h-5 w-5', config.className)} />
      <AlertTitle className={cn('font-semibold', config.className)}>
        {title}
      </AlertTitle>
      {(description || dueDate) && (
        <AlertDescription className="mt-2">
          {description && <p className="text-sm">{description}</p>}
          {dueDate && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              Due: {formatDate(dueDate)}
            </p>
          )}
        </AlertDescription>
      )}
      {children}
      {(actionLabel || dismissible) && (
        <div className="flex items-center gap-2 mt-3">
          {actionLabel && onAction && (
            <Button size="sm" variant="outline" onClick={onAction}>
              {actionLabel}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {dismissible && onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      )}
    </Alert>
  );
}

interface ComplianceAlertListProps {
  alerts: Array<{
    id: string;
    severity: AlertSeverity;
    title: string;
    description?: string;
    dueDate?: Date | string;
  }>;
  onAlertAction?: (id: string) => void;
  onAlertDismiss?: (id: string) => void;
  emptyMessage?: string;
}

export function ComplianceAlertList({
  alerts,
  onAlertAction,
  onAlertDismiss,
  emptyMessage = 'No alerts',
}: ComplianceAlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Sort by severity: critical > warning > info > success
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    success: 3,
  };

  const sortedAlerts = [...alerts].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return (
    <div className="space-y-3">
      {sortedAlerts.map((alert) => (
        <ComplianceAlertCard
          key={alert.id}
          severity={alert.severity}
          title={alert.title}
          description={alert.description}
          dueDate={alert.dueDate}
          actionLabel="View Details"
          onAction={() => onAlertAction?.(alert.id)}
          dismissible={!!onAlertDismiss}
          onDismiss={() => onAlertDismiss?.(alert.id)}
        />
      ))}
    </div>
  );
}
