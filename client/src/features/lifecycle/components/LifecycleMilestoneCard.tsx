import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Clock,
  Circle,
  ArrowRight,
  Calendar,
  Trophy,
  Target,
  Zap,
  LucideIcon,
} from 'lucide-react';

export type MilestoneStatus = 'completed' | 'in_progress' | 'upcoming' | 'blocked';

interface StatusConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}

const statusConfigs: Record<MilestoneStatus, StatusConfig> = {
  completed: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    label: 'Completed',
  },
  in_progress: {
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    label: 'In Progress',
  },
  upcoming: {
    icon: Clock,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 dark:bg-slate-950',
    borderColor: 'border-slate-200 dark:border-slate-800',
    label: 'Upcoming',
  },
  blocked: {
    icon: Circle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'Blocked',
  },
};

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  targetDate?: Date | string;
  completedDate?: Date | string;
  impact?: number;
  requirements?: string[];
  achievements?: string[];
}

interface LifecycleMilestoneCardProps {
  milestone: Milestone;
  onAction?: () => void;
  actionLabel?: string;
  showRequirements?: boolean;
  className?: string;
}

export function LifecycleMilestoneCard({
  milestone,
  onAction,
  actionLabel = 'View Details',
  showRequirements = true,
  className,
}: LifecycleMilestoneCardProps) {
  const config = statusConfigs[milestone.status];
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
    <div
      className={cn(
        'rounded-lg border-2 p-5 transition-all hover:shadow-md',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            milestone.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-white dark:bg-slate-800'
          )}
        >
          <Icon className={cn('h-5 w-5', config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-foreground truncate">
              {milestone.title}
            </h4>
            <span
              className={cn(
                'shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
                config.bgColor,
                config.color
              )}
            >
              {config.label}
            </span>
          </div>

          {milestone.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {milestone.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {milestone.targetDate && milestone.status !== 'completed' && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Target: {formatDate(milestone.targetDate)}
              </span>
            )}

            {milestone.completedDate && milestone.status === 'completed' && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle className="h-3.5 w-3.5" />
                Completed: {formatDate(milestone.completedDate)}
              </span>
            )}

            {milestone.impact && (
              <span className="flex items-center gap-1 text-amber-600">
                <Trophy className="h-3.5 w-3.5" />
                +{milestone.impact} points
              </span>
            )}
          </div>

          {showRequirements && milestone.requirements && milestone.requirements.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Requirements:
              </p>
              <ul className="space-y-1">
                {milestone.requirements.slice(0, 3).map((req, index) => (
                  <li
                    key={index}
                    className="text-xs text-muted-foreground flex items-center gap-2"
                  >
                    <Target className="h-3 w-3 shrink-0" />
                    {req}
                  </li>
                ))}
                {milestone.requirements.length > 3 && (
                  <li className="text-xs text-muted-foreground">
                    +{milestone.requirements.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {milestone.achievements && milestone.achievements.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs font-medium text-emerald-600 mb-2">
                Achievements:
              </p>
              <ul className="space-y-1">
                {milestone.achievements.map((achievement, index) => (
                  <li
                    key={index}
                    className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2"
                  >
                    <Trophy className="h-3 w-3 shrink-0" />
                    {achievement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onAction && (
            <div className="mt-4">
              <Button size="sm" variant="outline" onClick={onAction}>
                {actionLabel}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface LifecycleMilestoneListProps {
  milestones: Milestone[];
  onMilestoneAction?: (id: string) => void;
  showRequirements?: boolean;
  maxItems?: number;
  emptyMessage?: string;
}

export function LifecycleMilestoneList({
  milestones,
  onMilestoneAction,
  showRequirements = false,
  maxItems,
  emptyMessage = 'No milestones',
}: LifecycleMilestoneListProps) {
  if (milestones.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const displayMilestones = maxItems ? milestones.slice(0, maxItems) : milestones;

  // Sort: in_progress first, then upcoming, then completed
  const statusOrder: Record<MilestoneStatus, number> = {
    in_progress: 0,
    blocked: 1,
    upcoming: 2,
    completed: 3,
  };

  const sortedMilestones = [...displayMilestones].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status]
  );

  return (
    <div className="space-y-4">
      {sortedMilestones.map((milestone) => (
        <LifecycleMilestoneCard
          key={milestone.id}
          milestone={milestone}
          showRequirements={showRequirements}
          onAction={
            onMilestoneAction ? () => onMilestoneAction(milestone.id) : undefined
          }
        />
      ))}
    </div>
  );
}
