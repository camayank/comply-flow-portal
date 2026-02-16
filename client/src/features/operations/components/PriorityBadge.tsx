import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  LucideIcon,
} from 'lucide-react';

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'none';

interface PriorityConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  sortOrder: number;
}

const priorityConfigs: Record<Priority, PriorityConfig> = {
  critical: {
    label: 'Critical',
    icon: Zap,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900',
    borderColor: 'border-red-200 dark:border-red-800',
    sortOrder: 0,
  },
  high: {
    label: 'High',
    icon: ArrowUp,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
    borderColor: 'border-orange-200 dark:border-orange-800',
    sortOrder: 1,
  },
  medium: {
    label: 'Medium',
    icon: Minus,
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    borderColor: 'border-amber-200 dark:border-amber-800',
    sortOrder: 2,
  },
  low: {
    label: 'Low',
    icon: ArrowDown,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    borderColor: 'border-blue-200 dark:border-blue-800',
    sortOrder: 3,
  },
  none: {
    label: 'None',
    icon: Minus,
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-200 dark:border-slate-700',
    sortOrder: 4,
  },
};

interface PriorityBadgeProps {
  priority: Priority | string;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'dot' | 'icon';
  className?: string;
}

export function PriorityBadge({
  priority,
  showIcon = true,
  showLabel = true,
  size = 'md',
  variant = 'badge',
  className,
}: PriorityBadgeProps) {
  const normalizedPriority = priority.toLowerCase() as Priority;
  const config = priorityConfigs[normalizedPriority] || priorityConfigs.none;
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

  if (variant === 'dot') {
    return <PriorityDot priority={normalizedPriority} size={size} />;
  }

  if (variant === 'icon') {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          config.bgColor,
          config.color,
          size === 'sm' && 'h-5 w-5',
          size === 'md' && 'h-6 w-6',
          size === 'lg' && 'h-8 w-8',
          className
        )}
        title={config.label}
      >
        <Icon className={iconSizes[size]} />
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium inline-flex items-center gap-1.5',
        config.bgColor,
        config.borderColor,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showLabel && config.label}
    </Badge>
  );
}

interface PriorityDotProps {
  priority: Priority | string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function PriorityDot({
  priority,
  size = 'md',
  pulse = false,
}: PriorityDotProps) {
  const normalizedPriority = priority.toLowerCase() as Priority;

  const dotColors: Record<Priority, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
    none: 'bg-slate-400',
  };

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const dotColor = dotColors[normalizedPriority] || dotColors.none;

  return (
    <span className="relative inline-flex">
      <span className={cn('rounded-full', dotColor, sizeClasses[size])} />
      {pulse && (normalizedPriority === 'critical' || normalizedPriority === 'high') && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            dotColor
          )}
        />
      )}
    </span>
  );
}

interface PrioritySelectOption {
  value: Priority;
  label: string;
  icon: LucideIcon;
}

export function getPriorityOptions(): PrioritySelectOption[] {
  return Object.entries(priorityConfigs)
    .filter(([key]) => key !== 'none')
    .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
    .map(([key, config]) => ({
      value: key as Priority,
      label: config.label,
      icon: config.icon,
    }));
}

// Export config for external use
export { priorityConfigs };
