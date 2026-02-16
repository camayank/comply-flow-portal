import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  RotateCcw,
  Loader2,
  BookOpen,
  Users,
  Calendar,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Types
export type ExecutionStatus =
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface PlaybookStage {
  name: string;
  duration?: string;
  tasks?: string[];
  completed?: boolean;
}

export interface PlaybookExecutionData {
  id: number;
  playbookId: number;
  playbookName?: string;
  clientId: number;
  clientName?: string;
  currentStage: number;
  totalStages: number;
  status: ExecutionStatus;
  assignedTo?: number;
  assignedToName?: string;
  startedAt: string;
  completedAt?: string | null;
  pausedAt?: string | null;
  pauseReason?: string | null;
  stages?: PlaybookStage[];
}

// Config
interface ExecutionStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: LucideIcon;
}

const executionStatusConfig: Record<ExecutionStatus, ExecutionStatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-300 dark:border-slate-600',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-300 dark:border-blue-700',
    icon: Loader2,
  },
  paused: {
    label: 'Paused',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-300 dark:border-amber-700',
    icon: Pause,
  },
  completed: {
    label: 'Completed',
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
    borderColor: 'border-slate-300 dark:border-slate-600',
    icon: XCircle,
  },
  failed: {
    label: 'Failed',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: XCircle,
  },
};

// Execution Status Badge
interface ExecutionStatusBadgeProps {
  status: ExecutionStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ExecutionStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: ExecutionStatusBadgeProps) {
  const config = executionStatusConfig[status];
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
      {showIcon && (
        <Icon
          className={cn(
            iconSizes[size],
            'mr-1',
            status === 'in_progress' && 'animate-spin'
          )}
        />
      )}
      {config.label}
    </Badge>
  );
}

// Stage Progress Indicator
interface StageProgressProps {
  currentStage: number;
  totalStages: number;
  stages?: PlaybookStage[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export function StageProgress({
  currentStage,
  totalStages,
  stages,
  size = 'md',
  showLabels = false,
  className,
}: StageProgressProps) {
  const progress = totalStages > 0 ? Math.round((currentStage / totalStages) * 100) : 0;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Stage {currentStage} of {totalStages}
        </span>
        <span className="font-medium">{progress}%</span>
      </div>
      <div className={cn('bg-muted rounded-full overflow-hidden', heightClasses[size])}>
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showLabels && stages && stages.length > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          {stages.map((stage, index) => (
            <span
              key={index}
              className={cn(
                'truncate max-w-[100px]',
                index < currentStage && 'text-primary font-medium',
                index === currentStage && 'text-primary font-semibold'
              )}
            >
              {stage.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Stage Timeline
interface StageTimelineProps {
  stages: PlaybookStage[];
  currentStage: number;
  className?: string;
}

export function StageTimeline({ stages, currentStage, className }: StageTimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {stages.map((stage, index) => {
        const isCompleted = index < currentStage;
        const isCurrent = index === currentStage;
        const isPending = index > currentStage;

        return (
          <div key={index} className="flex gap-3">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  isCompleted && 'bg-emerald-500 text-white',
                  isCurrent && 'bg-primary text-primary-foreground',
                  isPending && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 h-8',
                    isCompleted ? 'bg-emerald-500' : 'bg-muted'
                  )}
                />
              )}
            </div>

            {/* Stage content */}
            <div className={cn('flex-1 pb-4', isPending && 'opacity-60')}>
              <p className={cn(
                'font-medium text-sm',
                isCurrent && 'text-primary'
              )}>
                {stage.name}
              </p>
              {stage.duration && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {stage.duration}
                </p>
              )}
              {stage.tasks && stage.tasks.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {stage.tasks.map((task, taskIndex) => (
                    <li
                      key={taskIndex}
                      className="text-xs text-muted-foreground flex items-start gap-1.5"
                    >
                      <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                      {task}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Playbook Execution Card
interface PlaybookExecutionCardProps {
  execution: PlaybookExecutionData;
  onAdvance?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
  showStages?: boolean;
  compact?: boolean;
  className?: string;
}

export function PlaybookExecutionCard({
  execution,
  onAdvance,
  onPause,
  onResume,
  onCancel,
  showActions = true,
  showStages = false,
  compact = false,
  className,
}: PlaybookExecutionCardProps) {
  const isInProgress = execution.status === 'in_progress';
  const isPaused = execution.status === 'paused';
  const isCompleted = execution.status === 'completed';
  const isCancelled = execution.status === 'cancelled';
  const isTerminal = isCompleted || isCancelled || execution.status === 'failed';

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-3 rounded-lg border bg-card', className)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <p className="font-medium truncate text-sm">
              {execution.playbookName || `Playbook #${execution.playbookId}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExecutionStatusBadge status={execution.status} size="sm" />
            <span className="text-xs text-muted-foreground">
              Stage {execution.currentStage}/{execution.totalStages}
            </span>
          </div>
        </div>
        {execution.clientName && (
          <Badge variant="outline" className="shrink-0">
            <Users className="h-3 w-3 mr-1" />
            {execution.clientName}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              {execution.playbookName || `Playbook #${execution.playbookId}`}
            </CardTitle>
            {execution.clientName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-4 w-4" />
                {execution.clientName}
              </p>
            )}
          </div>
          <ExecutionStatusBadge status={execution.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <StageProgress
          currentStage={execution.currentStage}
          totalStages={execution.totalStages}
          stages={execution.stages}
          size="md"
        />

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Started: {new Date(execution.startedAt).toLocaleDateString()}
          </span>
          {execution.assignedToName && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Assigned: {execution.assignedToName}
            </span>
          )}
          {execution.completedAt && (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Completed: {new Date(execution.completedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Pause reason */}
        {isPaused && execution.pauseReason && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Paused:</strong> {execution.pauseReason}
            </p>
          </div>
        )}

        {/* Stage timeline */}
        {showStages && execution.stages && execution.stages.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Stages</p>
            <StageTimeline stages={execution.stages} currentStage={execution.currentStage} />
          </div>
        )}

        {/* Actions */}
        {showActions && !isTerminal && (
          <div className="flex gap-2 pt-2 border-t">
            {isInProgress && onAdvance && execution.currentStage < execution.totalStages && (
              <Button size="sm" onClick={onAdvance}>
                <ChevronRight className="h-4 w-4 mr-1" />
                Advance Stage
              </Button>
            )}
            {isInProgress && onPause && (
              <Button size="sm" variant="outline" onClick={onPause}>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            {isPaused && onResume && (
              <Button size="sm" onClick={onResume}>
                <Play className="h-4 w-4 mr-1" />
                Resume
              </Button>
            )}
            {(isInProgress || isPaused) && onCancel && (
              <Button size="sm" variant="destructive" onClick={onCancel}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Execution List
interface PlaybookExecutionListProps {
  executions: PlaybookExecutionData[];
  onSelect?: (execution: PlaybookExecutionData) => void;
  compact?: boolean;
  className?: string;
}

export function PlaybookExecutionList({
  executions,
  onSelect,
  compact = true,
  className,
}: PlaybookExecutionListProps) {
  if (executions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No playbook executions found</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {executions.map((execution) => (
        <div
          key={execution.id}
          className={cn(onSelect && 'cursor-pointer')}
          onClick={() => onSelect?.(execution)}
        >
          <PlaybookExecutionCard
            execution={execution}
            compact={compact}
            showActions={false}
          />
        </div>
      ))}
    </div>
  );
}

// Export config
export { executionStatusConfig };
