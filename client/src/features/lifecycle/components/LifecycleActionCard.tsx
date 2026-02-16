import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Clock,
  Zap,
  AlertTriangle,
  Info,
  CheckCircle,
  Trophy,
  LucideIcon,
} from 'lucide-react';

export type ActionUrgency = 'critical' | 'high' | 'medium' | 'low';

interface UrgencyConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: LucideIcon;
}

const urgencyConfigs: Record<ActionUrgency, UrgencyConfig> = {
  critical: {
    label: 'Critical',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: AlertTriangle,
  },
  high: {
    label: 'High',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: Zap,
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: Clock,
  },
  low: {
    label: 'Low',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: Info,
  },
};

export interface LifecycleAction {
  id: string;
  title: string;
  description?: string;
  urgency: ActionUrgency;
  impact: number;
  estimatedTime?: string;
  category?: string;
  dueDate?: Date | string;
}

interface LifecycleActionCardProps {
  action: LifecycleAction;
  onStart?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function LifecycleActionCard({
  action,
  onStart,
  onDismiss,
  showDetails = true,
  className,
}: LifecycleActionCardProps) {
  const config = urgencyConfigs[action.urgency];
  const UrgencyIcon = config.icon;

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                config.bgColor,
                config.color
              )}
            >
              <UrgencyIcon className="h-3 w-3" />
              {config.label}
            </span>

            {action.estimatedTime && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-white dark:bg-slate-800 px-2 py-0.5 rounded">
                <Clock className="h-3 w-3" />
                {action.estimatedTime}
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-white dark:bg-slate-800 px-2 py-0.5 rounded">
              <Trophy className="h-3 w-3" />
              +{action.impact} points
            </span>

            {action.category && (
              <span className="text-xs text-muted-foreground bg-white dark:bg-slate-800 px-2 py-0.5 rounded">
                {action.category}
              </span>
            )}
          </div>

          <h4 className="font-semibold text-foreground mb-1">{action.title}</h4>

          {showDetails && action.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {action.description}
            </p>
          )}

          {action.dueDate && (
            <p className="text-xs text-muted-foreground">
              Due: {formatDate(action.dueDate)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {onStart && (
            <Button
              size="sm"
              variant={action.urgency === 'critical' ? 'destructive' : 'default'}
              onClick={onStart}
            >
              Start
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface LifecycleActionListProps {
  actions: LifecycleAction[];
  onActionStart?: (id: string) => void;
  onActionDismiss?: (id: string) => void;
  showImpactSummary?: boolean;
  maxItems?: number;
  emptyMessage?: string;
  className?: string;
}

export function LifecycleActionList({
  actions,
  onActionStart,
  onActionDismiss,
  showImpactSummary = true,
  maxItems,
  emptyMessage = 'No actions pending',
  className,
}: LifecycleActionListProps) {
  if (actions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Sort by urgency: critical > high > medium > low
  const urgencyOrder: Record<ActionUrgency, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const sortedActions = [...actions].sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  );

  const displayActions = maxItems ? sortedActions.slice(0, maxItems) : sortedActions;
  const totalImpact = actions.reduce((sum, a) => sum + a.impact, 0);

  return (
    <div className={cn('space-y-4', className)}>
      {displayActions.map((action) => (
        <LifecycleActionCard
          key={action.id}
          action={action}
          onStart={onActionStart ? () => onActionStart(action.id) : undefined}
          onDismiss={onActionDismiss ? () => onActionDismiss(action.id) : undefined}
        />
      ))}

      {showImpactSummary && actions.length > 0 && (
        <div className="pt-4 border-t flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Completing all actions will add{' '}
            <strong className="text-emerald-600">+{totalImpact} points</strong>{' '}
            to your score
          </p>
          {maxItems && actions.length > maxItems && (
            <span className="text-muted-foreground">
              +{actions.length - maxItems} more actions
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface QuickActionsGridProps {
  actions: LifecycleAction[];
  onActionStart?: (id: string) => void;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function QuickActionsGrid({
  actions,
  onActionStart,
  columns = 2,
  className,
}: QuickActionsGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {actions.map((action) => (
        <LifecycleActionCard
          key={action.id}
          action={action}
          onStart={onActionStart ? () => onActionStart(action.id) : undefined}
          showDetails={false}
        />
      ))}
    </div>
  );
}
