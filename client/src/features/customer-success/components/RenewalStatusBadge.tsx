import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingDown,
  Calendar,
  DollarSign,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Types
export type RenewalStatus =
  | 'upcoming'
  | 'in_progress'
  | 'at_risk'
  | 'renewed'
  | 'churned'
  | 'downgraded';

export type RenewalUrgency = 'overdue' | 'critical' | 'urgent' | 'soon' | 'normal';

// Config
interface RenewalStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: LucideIcon;
}

const renewalStatusConfig: Record<RenewalStatus, RenewalStatusConfig> = {
  upcoming: {
    label: 'Upcoming',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-300 dark:border-blue-700',
    icon: Calendar,
  },
  in_progress: {
    label: 'In Progress',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-300 dark:border-amber-700',
    icon: RefreshCw,
  },
  at_risk: {
    label: 'At Risk',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: AlertTriangle,
  },
  renewed: {
    label: 'Renewed',
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    icon: CheckCircle,
  },
  churned: {
    label: 'Churned',
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-400',
    borderColor: 'border-slate-300 dark:border-slate-600',
    icon: XCircle,
  },
  downgraded: {
    label: 'Downgraded',
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    borderColor: 'border-orange-300 dark:border-orange-700',
    icon: TrendingDown,
  },
};

interface UrgencyConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

const urgencyConfig: Record<RenewalUrgency, UrgencyConfig> = {
  overdue: {
    label: 'Overdue',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
  },
  critical: {
    label: 'Critical',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
  },
  urgent: {
    label: 'Urgent',
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
  },
  soon: {
    label: 'Soon',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
  },
  normal: {
    label: 'Normal',
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-400',
  },
};

function getUrgencyFromDays(daysUntilRenewal: number): RenewalUrgency {
  if (daysUntilRenewal < 0) return 'overdue';
  if (daysUntilRenewal <= 7) return 'critical';
  if (daysUntilRenewal <= 30) return 'urgent';
  if (daysUntilRenewal <= 90) return 'soon';
  return 'normal';
}

// Renewal Status Badge Component
interface RenewalStatusBadgeProps {
  status: RenewalStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RenewalStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: RenewalStatusBadgeProps) {
  const config = renewalStatusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
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
        config.bgColor,
        config.textColor,
        config.borderColor,
        'font-medium',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size], 'mr-1')} />}
      {config.label}
    </Badge>
  );
}

// Days Until Renewal Badge
interface DaysUntilBadgeProps {
  days: number;
  showLabel?: boolean;
  className?: string;
}

export function DaysUntilBadge({ days, showLabel = true, className }: DaysUntilBadgeProps) {
  const urgency = getUrgencyFromDays(days);
  const config = urgencyConfig[urgency];

  let displayText: string;
  if (days < 0) {
    displayText = `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
  } else if (days === 0) {
    displayText = 'Due today';
  } else if (days === 1) {
    displayText = '1 day';
  } else {
    displayText = `${days} days`;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        'border-transparent font-medium',
        className
      )}
    >
      <Clock className="h-3 w-3 mr-1" />
      {displayText}
    </Badge>
  );
}

// Renewal Probability Indicator
interface RenewalProbabilityProps {
  probability: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RenewalProbability({
  probability,
  showValue = true,
  size = 'md',
  className,
}: RenewalProbabilityProps) {
  const getColor = (prob: number) => {
    if (prob >= 70) return 'emerald';
    if (prob >= 40) return 'amber';
    return 'red';
  };

  const color = getColor(probability);

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const widthClasses = {
    sm: 'w-16',
    md: 'w-24',
    lg: 'w-32',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Target className={cn(
        size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
        'text-muted-foreground'
      )} />
      <div className={cn(
        'bg-muted rounded-full overflow-hidden',
        heightClasses[size],
        widthClasses[size]
      )}>
        <div
          className={cn(
            'h-full rounded-full transition-all',
            color === 'emerald' && 'bg-emerald-500',
            color === 'amber' && 'bg-amber-500',
            color === 'red' && 'bg-red-500'
          )}
          style={{ width: `${probability}%` }}
        />
      </div>
      {showValue && (
        <span className={cn(
          'font-medium',
          size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
          color === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
          color === 'amber' && 'text-amber-600 dark:text-amber-400',
          color === 'red' && 'text-red-600 dark:text-red-400'
        )}>
          {probability}%
        </span>
      )}
    </div>
  );
}

// Renewal Value Change Indicator
interface RenewalValueChangeProps {
  currentValue: number | null;
  renewalValue: number | null;
  currency?: string;
  className?: string;
}

export function RenewalValueChange({
  currentValue,
  renewalValue,
  currency = 'INR',
  className,
}: RenewalValueChangeProps) {
  if (currentValue === null || renewalValue === null) {
    return null;
  }

  const change = renewalValue - currentValue;
  const percentChange = currentValue > 0 ? Math.round((change / currentValue) * 100) : 0;
  const isPositive = change > 0;
  const isNegative = change < 0;

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">
        {formatValue(currentValue)} → {formatValue(renewalValue)}
      </span>
      {change !== 0 && (
        <Badge
          variant="outline"
          className={cn(
            'border-transparent text-xs',
            isPositive && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            isNegative && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}
        >
          {isPositive ? '+' : ''}{percentChange}%
        </Badge>
      )}
    </div>
  );
}

// Risk Factor Badge List
interface RiskFactorBadgesProps {
  factors: string[];
  max?: number;
  className?: string;
}

export function RiskFactorBadges({ factors, max = 3, className }: RiskFactorBadgesProps) {
  if (factors.length === 0) return null;

  const displayFactors = factors.slice(0, max);
  const remaining = factors.length - max;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {displayFactors.map((factor, index) => (
        <Badge
          key={index}
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-xs"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          {factor}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}

// Export config
export {
  renewalStatusConfig,
  urgencyConfig,
  getUrgencyFromDays,
};
