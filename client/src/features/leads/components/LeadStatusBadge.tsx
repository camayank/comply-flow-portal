import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  type LeadTemperature,
  type FollowUpStatus,
  type FollowUpActivity,
  leadTemperatureConfig,
  followUpStatusConfig,
  followUpActivityConfig,
  getFollowUpUrgency,
  getDaysUntilFollowUp,
} from '../config';
import {
  leadStageConfig,
  leadPriorityConfig,
  leadSourceConfig,
  type LeadStage,
  type LeadPriority,
  type LeadSource,
} from '@/features/sales/config';

// ============================================================================
// Lead Stage Badge
// ============================================================================

interface LeadStageBadgeProps {
  stage: string;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function LeadStageBadge({
  stage,
  showIcon = false,
  size = 'default',
  className,
}: LeadStageBadgeProps) {
  const config = leadStageConfig[stage as LeadStage];
  if (!config) {
    return <Badge variant="outline" className={className}>{stage}</Badge>;
  }

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge className={cn(config.bgColor, sizeClasses[size], className)}>
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Lead Priority Badge
// ============================================================================

interface LeadPriorityBadgeProps {
  priority: string;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function LeadPriorityBadge({
  priority,
  showIcon = false,
  size = 'default',
  className,
}: LeadPriorityBadgeProps) {
  const config = leadPriorityConfig[priority as LeadPriority];
  if (!config) {
    return <Badge variant="outline" className={className}>{priority}</Badge>;
  }

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge variant="outline" className={cn(config.bgColor, sizeClasses[size], className)}>
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Lead Source Badge
// ============================================================================

interface LeadSourceBadgeProps {
  source: string;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function LeadSourceBadge({
  source,
  showIcon = true,
  size = 'default',
  className,
}: LeadSourceBadgeProps) {
  const config = leadSourceConfig[source as LeadSource];
  if (!config) {
    return <Badge variant="outline" className={className}>{source}</Badge>;
  }

  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge variant="outline" className={cn(sizeClasses[size], className)}>
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Lead Temperature Badge
// ============================================================================

interface LeadTemperatureBadgeProps {
  temperature: LeadTemperature;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function LeadTemperatureBadge({
  temperature,
  showIcon = true,
  size = 'default',
  className,
}: LeadTemperatureBadgeProps) {
  const config = leadTemperatureConfig[temperature];
  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge className={cn(config.bgColor, sizeClasses[size], className)}>
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Follow-up Status Badge
// ============================================================================

interface FollowUpStatusBadgeProps {
  status: FollowUpStatus;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function FollowUpStatusBadge({
  status,
  showIcon = true,
  size = 'default',
  className,
}: FollowUpStatusBadgeProps) {
  const config = followUpStatusConfig[status];
  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge className={cn(config.bgColor, sizeClasses[size], className)}>
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Follow-up Activity Badge
// ============================================================================

interface FollowUpActivityBadgeProps {
  activity: FollowUpActivity;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function FollowUpActivityBadge({
  activity,
  showIcon = true,
  size = 'default',
  className,
}: FollowUpActivityBadgeProps) {
  const config = followUpActivityConfig[activity];
  const Icon = config.icon;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge className={cn(config.bgColor, sizeClasses[size], className)}>
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Follow-up Urgency Badge
// ============================================================================

interface FollowUpUrgencyBadgeProps {
  followUpDate: Date | string | null;
  showDays?: boolean;
  className?: string;
}

export function FollowUpUrgencyBadge({
  followUpDate,
  showDays = true,
  className,
}: FollowUpUrgencyBadgeProps) {
  const urgency = getFollowUpUrgency(followUpDate);
  const days = getDaysUntilFollowUp(followUpDate);

  if (!urgency || days === null) {
    return null;
  }

  const urgencyConfig = {
    overdue: {
      label: 'Overdue',
      bgColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    },
    today: {
      label: 'Due Today',
      bgColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    },
    soon: {
      label: 'Due Soon',
      bgColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    },
    upcoming: {
      label: 'Upcoming',
      bgColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    },
  };

  const config = urgencyConfig[urgency];
  const daysText = days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d`;

  return (
    <Badge className={cn(config.bgColor, className)}>
      {config.label}
      {showDays && <span className="ml-1 opacity-75">({daysText})</span>}
    </Badge>
  );
}

// ============================================================================
// Lead Score Display
// ============================================================================

interface LeadScoreDisplayProps {
  score: number;
  maxScore?: number;
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function LeadScoreDisplay({
  score,
  maxScore = 100,
  showLabel = true,
  size = 'default',
  className,
}: LeadScoreDisplayProps) {
  const percentage = Math.round((score / maxScore) * 100);

  const getColorClass = () => {
    if (percentage >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (percentage >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-slate-600 dark:text-slate-400';
  };

  const sizeClasses = {
    sm: 'text-sm',
    default: 'text-base',
    lg: 'text-lg font-semibold',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn(getColorClass(), sizeClasses[size])}>
        {score}
      </span>
      {showLabel && (
        <span className="text-muted-foreground text-xs">/ {maxScore}</span>
      )}
    </div>
  );
}

// ============================================================================
// Lead Stage Pipeline
// ============================================================================

interface LeadStagePipelineProps {
  currentStage: string;
  size?: 'sm' | 'default';
  className?: string;
}

export function LeadStagePipeline({
  currentStage,
  size = 'default',
  className,
}: LeadStagePipelineProps) {
  const stages: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won'];
  const currentIndex = stages.indexOf(currentStage as LeadStage);

  const sizeClasses = {
    sm: 'h-1.5',
    default: 'h-2',
  };

  return (
    <div className={cn('flex gap-1', className)}>
      {stages.map((stage, index) => {
        const config = leadStageConfig[stage];
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div
            key={stage}
            className={cn(
              'flex-1 rounded-full transition-colors',
              sizeClasses[size],
              isActive ? config.color : 'bg-slate-200 dark:bg-slate-700',
              isCurrent && 'ring-2 ring-offset-1 ring-offset-background'
            )}
            title={config.label}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// Conversion Probability
// ============================================================================

interface ConversionProbabilityProps {
  probability: number;
  showPercentage?: boolean;
  className?: string;
}

export function ConversionProbability({
  probability,
  showPercentage = true,
  className,
}: ConversionProbabilityProps) {
  const getColorClass = () => {
    if (probability >= 70) return 'bg-emerald-500';
    if (probability >= 40) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', getColorClass())}
          style={{ width: `${Math.min(probability, 100)}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-sm font-medium text-muted-foreground w-12 text-right">
          {probability}%
        </span>
      )}
    </div>
  );
}
