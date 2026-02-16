import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  PauseCircle,
  FileSearch,
  Send,
  Package,
  LucideIcon,
} from 'lucide-react';

export type WorkItemStatus =
  | 'pending'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'revision_required'
  | 'ready_for_delivery'
  | 'delivered'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

const statusConfigs: Record<WorkItemStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-200 dark:border-slate-700',
  },
  in_progress: {
    label: 'In Progress',
    icon: Loader2,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  review: {
    label: 'In Review',
    icon: FileSearch,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  revision_required: {
    label: 'Revision Required',
    icon: AlertTriangle,
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  ready_for_delivery: {
    label: 'Ready for Delivery',
    icon: Package,
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
  },
  delivered: {
    label: 'Delivered',
    icon: Send,
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-100 dark:bg-teal-900',
    borderColor: 'border-teal-200 dark:border-teal-800',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  on_hold: {
    label: 'On Hold',
    icon: PauseCircle,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-200 dark:border-slate-700',
  },
};

interface WorkItemStatusBadgeProps {
  status: WorkItemStatus | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function WorkItemStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: WorkItemStatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/-/g, '_') as WorkItemStatus;
  const config = statusConfigs[normalizedStatus] || statusConfigs.pending;
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
        config.bgColor,
        config.borderColor,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            iconSizes[size],
            normalizedStatus === 'in_progress' && 'animate-spin'
          )}
        />
      )}
      {config.label}
    </Badge>
  );
}

interface WorkItemStatusDotProps {
  status: WorkItemStatus | string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function WorkItemStatusDot({
  status,
  size = 'md',
  pulse = false,
}: WorkItemStatusDotProps) {
  const normalizedStatus = status.toLowerCase().replace(/-/g, '_') as WorkItemStatus;

  const dotColors: Record<WorkItemStatus, string> = {
    pending: 'bg-slate-400',
    in_progress: 'bg-blue-500',
    review: 'bg-purple-500',
    approved: 'bg-emerald-500',
    rejected: 'bg-red-500',
    revision_required: 'bg-amber-500',
    ready_for_delivery: 'bg-indigo-500',
    delivered: 'bg-teal-500',
    completed: 'bg-emerald-500',
    on_hold: 'bg-orange-500',
    cancelled: 'bg-slate-400',
  };

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const dotColor = dotColors[normalizedStatus] || dotColors.pending;

  return (
    <span className="relative inline-flex">
      <span className={cn('rounded-full', dotColor, sizeClasses[size])} />
      {pulse && (
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

// Export config for external use
export { statusConfigs as workItemStatusConfigs };
