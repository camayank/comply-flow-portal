import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  AlertCircle,
  Bell,
  BellRing,
  ArrowUpCircle,
  Flame,
  LucideIcon,
} from 'lucide-react';

export type EscalationLevel = 0 | 1 | 2 | 3 | 4 | 5;

interface EscalationConfig {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

const escalationConfigs: Record<EscalationLevel, EscalationConfig> = {
  0: {
    label: 'No Escalation',
    shortLabel: 'None',
    icon: Bell,
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-200 dark:border-slate-700',
    description: 'Normal processing, no escalation required',
  },
  1: {
    label: 'Level 1 - Attention',
    shortLabel: 'L1',
    icon: Bell,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Requires attention, assigned to team lead',
  },
  2: {
    label: 'Level 2 - Warning',
    shortLabel: 'L2',
    icon: BellRing,
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Warning level, manager notified',
  },
  3: {
    label: 'Level 3 - Urgent',
    shortLabel: 'L3',
    icon: AlertTriangle,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
    borderColor: 'border-orange-200 dark:border-orange-800',
    description: 'Urgent attention required, senior management involved',
  },
  4: {
    label: 'Level 4 - Critical',
    shortLabel: 'L4',
    icon: AlertCircle,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900',
    borderColor: 'border-red-200 dark:border-red-800',
    description: 'Critical escalation, executive attention',
  },
  5: {
    label: 'Level 5 - Emergency',
    shortLabel: 'L5',
    icon: Flame,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900',
    borderColor: 'border-red-200 dark:border-red-800',
    description: 'Emergency escalation, all hands required',
  },
};

interface EscalationIndicatorProps {
  level: EscalationLevel | number;
  showLabel?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'bar' | 'compact';
  className?: string;
}

export function EscalationIndicator({
  level,
  showLabel = true,
  showIcon = true,
  size = 'md',
  variant = 'badge',
  className,
}: EscalationIndicatorProps) {
  const normalizedLevel = Math.min(Math.max(0, level), 5) as EscalationLevel;
  const config = escalationConfigs[normalizedLevel];
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

  if (variant === 'bar') {
    return (
      <EscalationBar
        level={normalizedLevel}
        showLabel={showLabel}
        className={className}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded font-bold',
          config.bgColor,
          config.color,
          size === 'sm' && 'h-5 w-5 text-xs',
          size === 'md' && 'h-6 w-6 text-sm',
          size === 'lg' && 'h-8 w-8 text-base',
          className
        )}
        title={config.label}
      >
        {normalizedLevel}
      </span>
    );
  }

  if (normalizedLevel === 0) {
    return null; // Don't show badge for no escalation
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
        normalizedLevel >= 4 && 'animate-pulse',
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showLabel && config.shortLabel}
    </Badge>
  );
}

interface EscalationBarProps {
  level: EscalationLevel | number;
  showLabel?: boolean;
  maxLevel?: number;
  className?: string;
}

export function EscalationBar({
  level,
  showLabel = true,
  maxLevel = 5,
  className,
}: EscalationBarProps) {
  const normalizedLevel = Math.min(Math.max(0, level), maxLevel) as EscalationLevel;
  const config = escalationConfigs[normalizedLevel];

  const segments = Array.from({ length: maxLevel }, (_, i) => i + 1);

  const getSegmentColor = (segment: number) => {
    if (segment <= normalizedLevel) {
      if (segment >= 4) return 'bg-red-500';
      if (segment >= 3) return 'bg-orange-500';
      if (segment >= 2) return 'bg-amber-500';
      return 'bg-blue-500';
    }
    return 'bg-slate-200 dark:bg-slate-700';
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex gap-0.5">
        {segments.map((segment) => (
          <div
            key={segment}
            className={cn(
              'h-2 flex-1 rounded-sm transition-colors',
              getSegmentColor(segment)
            )}
          />
        ))}
      </div>
      {showLabel && normalizedLevel > 0 && (
        <p className={cn('text-xs font-medium', config.color)}>
          {config.label}
        </p>
      )}
    </div>
  );
}

interface EscalationTimelineProps {
  currentLevel: EscalationLevel | number;
  escalations: Array<{
    level: number;
    timestamp: string;
    reason?: string;
    escalatedBy?: string;
  }>;
  className?: string;
}

export function EscalationTimeline({
  currentLevel,
  escalations,
  className,
}: EscalationTimelineProps) {
  if (escalations.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No escalation history
      </div>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn('space-y-3', className)}>
      {escalations.map((escalation, index) => {
        const level = Math.min(Math.max(0, escalation.level), 5) as EscalationLevel;
        const config = escalationConfigs[level];
        const Icon = config.icon;
        const isLatest = index === escalations.length - 1;

        return (
          <div key={index} className="relative flex gap-3">
            {!isLatest && (
              <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
            )}
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                config.bgColor
              )}
            >
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <p className={cn('text-sm font-medium', config.color)}>
                  {config.label}
                </p>
                <time className="text-xs text-muted-foreground">
                  {formatDate(escalation.timestamp)}
                </time>
              </div>
              {escalation.reason && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {escalation.reason}
                </p>
              )}
              {escalation.escalatedBy && (
                <p className="text-xs text-muted-foreground mt-1">
                  by {escalation.escalatedBy}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Export config for external use
export { escalationConfigs };
