import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';

export type ComplianceStatus =
  | 'compliant'
  | 'non_compliant'
  | 'pending'
  | 'expired'
  | 'at_risk'
  | 'exempt'
  | 'not_applicable'
  | 'in_progress';

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
  bgClassName: string;
}

const statusConfigs: Record<ComplianceStatus, StatusConfig> = {
  compliant: {
    label: 'Compliant',
    icon: CheckCircle,
    className: 'text-emerald-700 dark:text-emerald-400',
    bgClassName: 'bg-emerald-100 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
  },
  non_compliant: {
    label: 'Non-Compliant',
    icon: XCircle,
    className: 'text-red-700 dark:text-red-400',
    bgClassName: 'bg-red-100 dark:bg-red-950 border-red-200 dark:border-red-800',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'text-amber-700 dark:text-amber-400',
    bgClassName: 'bg-amber-100 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  },
  expired: {
    label: 'Expired',
    icon: AlertTriangle,
    className: 'text-red-700 dark:text-red-400',
    bgClassName: 'bg-red-100 dark:bg-red-950 border-red-200 dark:border-red-800',
  },
  at_risk: {
    label: 'At Risk',
    icon: AlertCircle,
    className: 'text-orange-700 dark:text-orange-400',
    bgClassName: 'bg-orange-100 dark:bg-orange-950 border-orange-200 dark:border-orange-800',
  },
  exempt: {
    label: 'Exempt',
    icon: Shield,
    className: 'text-slate-700 dark:text-slate-400',
    bgClassName: 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800',
  },
  not_applicable: {
    label: 'N/A',
    icon: Shield,
    className: 'text-slate-500 dark:text-slate-500',
    bgClassName: 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    className: 'text-blue-700 dark:text-blue-400',
    bgClassName: 'bg-blue-100 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  },
};

interface ComplianceStatusBadgeProps {
  status: ComplianceStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ComplianceStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: ComplianceStatusBadgeProps) {
  const config = statusConfigs[status] || statusConfigs.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium inline-flex items-center gap-1.5',
        config.bgClassName,
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

interface ComplianceStatusDotProps {
  status: ComplianceStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function ComplianceStatusDot({
  status,
  size = 'md',
  pulse = false,
}: ComplianceStatusDotProps) {
  const dotColors: Record<ComplianceStatus, string> = {
    compliant: 'bg-emerald-500',
    non_compliant: 'bg-red-500',
    pending: 'bg-amber-500',
    expired: 'bg-red-500',
    at_risk: 'bg-orange-500',
    exempt: 'bg-slate-400',
    not_applicable: 'bg-slate-300',
    in_progress: 'bg-blue-500',
  };

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  return (
    <span className="relative inline-flex">
      <span
        className={cn('rounded-full', dotColors[status], sizeClasses[size])}
      />
      {pulse && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            dotColors[status]
          )}
        />
      )}
    </span>
  );
}
