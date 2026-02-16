import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  type LeadStage,
  type LeadPriority,
  type LeadSource,
  leadStageConfig,
  leadPriorityConfig,
  leadSourceConfig,
  pipelineStageOrder,
  formatCurrency,
  getLeadAgeInDays,
  isFollowUpOverdue,
} from '../config';
import { Calendar, Clock, AlertTriangle, TrendingUp, Phone, Mail, MapPin } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

// ============================================================================
// Lead Stage Badge
// ============================================================================

interface LeadStageBadgeProps {
  stage: LeadStage | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function LeadStageBadge({
  stage,
  size = 'md',
  showIcon = true,
  className,
}: LeadStageBadgeProps) {
  const config = leadStageConfig[stage as LeadStage] || leadStageConfig.new;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge
      className={cn(
        config.bgColor,
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1',
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Lead Priority Badge
// ============================================================================

interface LeadPriorityBadgeProps {
  priority: LeadPriority | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function LeadPriorityBadge({
  priority,
  size = 'md',
  showIcon = true,
  className,
}: LeadPriorityBadgeProps) {
  const config = leadPriorityConfig[priority as LeadPriority] || leadPriorityConfig.medium;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1',
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Lead Source Badge
// ============================================================================

interface LeadSourceBadgeProps {
  source: LeadSource | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function LeadSourceBadge({
  source,
  size = 'md',
  showIcon = true,
  className,
}: LeadSourceBadgeProps) {
  const config = leadSourceConfig[source as LeadSource] || leadSourceConfig.direct;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    slate: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        colorClasses[config.color] || colorClasses.slate,
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1',
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Pipeline Stage Progress
// ============================================================================

interface PipelineStageProgressProps {
  currentStage: LeadStage | string;
  className?: string;
}

export function PipelineStageProgress({ currentStage, className }: PipelineStageProgressProps) {
  const currentIndex = pipelineStageOrder.indexOf(currentStage as LeadStage);
  const activeStages = pipelineStageOrder.filter((s) => !leadStageConfig[s].isTerminal);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / activeStages.length) * 100 : 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Pipeline Progress</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <Progress value={Math.min(progress, 100)} className="h-2" />
      <div className="flex justify-between">
        {activeStages.map((stage, index) => {
          const config = leadStageConfig[stage];
          const isActive = index <= currentIndex;
          const isCurrent = stage === currentStage;
          return (
            <div
              key={stage}
              className={cn(
                'flex flex-col items-center gap-1',
                isCurrent ? 'text-foreground' : isActive ? 'text-muted-foreground' : 'text-muted-foreground/50'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  isCurrent ? config.color : isActive ? 'bg-muted-foreground' : 'bg-muted'
                )}
              />
              <span className="text-[10px] hidden sm:block">{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Lead Age Indicator
// ============================================================================

interface LeadAgeIndicatorProps {
  createdAt: Date | string;
  className?: string;
}

export function LeadAgeIndicator({ createdAt, className }: LeadAgeIndicatorProps) {
  const days = getLeadAgeInDays(createdAt);
  const isOld = days > 30;
  const isVeryOld = days > 60;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm',
        isVeryOld ? 'text-red-600' : isOld ? 'text-amber-600' : 'text-muted-foreground',
        className
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      <span>
        {days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`}
        {isVeryOld && <span className="ml-1 text-xs">(stale)</span>}
      </span>
    </div>
  );
}

// ============================================================================
// Follow-up Date Indicator
// ============================================================================

interface FollowUpIndicatorProps {
  date: Date | string | null;
  className?: string;
}

export function FollowUpIndicator({ date, className }: FollowUpIndicatorProps) {
  if (!date) return null;

  const isOverdue = isFollowUpOverdue(date);
  const dateObj = new Date(date);
  const isToday = new Date().toDateString() === dateObj.toDateString();

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm',
        isOverdue ? 'text-red-600' : isToday ? 'text-amber-600' : 'text-muted-foreground',
        className
      )}
    >
      {isOverdue ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Calendar className="h-3.5 w-3.5" />
      )}
      <span>
        {isOverdue
          ? `Overdue: ${format(dateObj, 'MMM d')}`
          : isToday
          ? 'Follow-up today'
          : format(dateObj, 'MMM d, yyyy')}
      </span>
    </div>
  );
}

// ============================================================================
// Deal Value Display
// ============================================================================

interface DealValueProps {
  value: number | string | null;
  currency?: string;
  showTrend?: boolean;
  trendValue?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DealValue({
  value,
  currency = 'INR',
  showTrend = false,
  trendValue,
  size = 'md',
  className,
}: DealValueProps) {
  const formattedValue = formatCurrency(value, currency);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn(sizeClasses[size], 'font-medium')}>{formattedValue}</span>
      {showTrend && trendValue !== undefined && trendValue !== 0 && (
        <span
          className={cn(
            'flex items-center gap-0.5 text-xs',
            trendValue > 0 ? 'text-emerald-600' : 'text-red-600'
          )}
        >
          <TrendingUp
            className={cn('h-3 w-3', trendValue < 0 && 'rotate-180')}
          />
          {Math.abs(trendValue)}%
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Lead Contact Info
// ============================================================================

interface LeadContactInfoProps {
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  compact?: boolean;
  className?: string;
}

export function LeadContactInfo({
  phone,
  email,
  location,
  compact = false,
  className,
}: LeadContactInfoProps) {
  if (!phone && !email && !location) return null;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 text-sm text-muted-foreground', className)}>
        {phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {phone}
          </span>
        )}
        {email && (
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {email}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1 text-sm text-muted-foreground', className)}>
      {phone && (
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5" />
          <span>{phone}</span>
        </div>
      )}
      {email && (
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          <span>{email}</span>
        </div>
      )}
      {location && (
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" />
          <span>{location}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Stage Transition Indicator
// ============================================================================

interface StageTransitionProps {
  fromStage: LeadStage | string;
  toStage: LeadStage | string;
  timestamp?: Date | string;
  className?: string;
}

export function StageTransition({
  fromStage,
  toStage,
  timestamp,
  className,
}: StageTransitionProps) {
  const fromConfig = leadStageConfig[fromStage as LeadStage];
  const toConfig = leadStageConfig[toStage as LeadStage];

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <LeadStageBadge stage={fromStage} size="sm" showIcon={false} />
      <span className="text-muted-foreground">→</span>
      <LeadStageBadge stage={toStage} size="sm" showIcon={false} />
      {timestamp && (
        <span className="text-xs text-muted-foreground ml-2">
          {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Lead Score Indicator
// ============================================================================

interface LeadScoreProps {
  score: number;
  maxScore?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LeadScore({
  score,
  maxScore = 100,
  showLabel = true,
  size = 'md',
  className,
}: LeadScoreProps) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  const isHot = percentage >= 75;
  const isWarm = percentage >= 50;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const color = isHot ? 'text-emerald-600 border-emerald-500' : isWarm ? 'text-amber-600 border-amber-500' : 'text-slate-600 border-slate-300';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full border-2 flex items-center justify-center font-semibold',
          sizeClasses[size],
          color
        )}
      >
        {score}
      </div>
      {showLabel && (
        <span className={cn('text-sm', isHot ? 'text-emerald-600' : isWarm ? 'text-amber-600' : 'text-muted-foreground')}>
          {isHot ? 'Hot' : isWarm ? 'Warm' : 'Cold'}
        </span>
      )}
    </div>
  );
}
