import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  Trophy,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Target,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { LifecycleStage } from './LifecycleStageIndicator';
import {
  stageConfigs,
  stageOrder,
  getNextStage,
  getStageProgress,
  formatCompanyAge,
  getDaysInStage,
} from '../config';

// ============================================================================
// Timeline Event Types
// ============================================================================

export type TimelineEventType =
  | 'stage_entered'
  | 'stage_completed'
  | 'milestone_achieved'
  | 'compliance_completed'
  | 'funding_raised'
  | 'achievement_unlocked'
  | 'document_submitted';

interface TimelineEventConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

const timelineEventConfig: Record<TimelineEventType, TimelineEventConfig> = {
  stage_entered: {
    label: 'Stage Started',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    icon: Circle,
  },
  stage_completed: {
    label: 'Stage Completed',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    icon: CheckCircle,
  },
  milestone_achieved: {
    label: 'Milestone',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
    icon: Target,
  },
  compliance_completed: {
    label: 'Compliance',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    icon: CheckCircle,
  },
  funding_raised: {
    label: 'Funding',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900',
    icon: Building2,
  },
  achievement_unlocked: {
    label: 'Achievement',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100 dark:bg-rose-900',
    icon: Trophy,
  },
  document_submitted: {
    label: 'Document',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-900',
    icon: CheckCircle,
  },
};

// ============================================================================
// Timeline Event
// ============================================================================

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: Date | string;
  stage?: LifecycleStage;
  impact?: number;
  metadata?: Record<string, unknown>;
}

interface TimelineEventItemProps {
  event: TimelineEvent;
  isLast?: boolean;
  className?: string;
}

export function TimelineEventItem({
  event,
  isLast = false,
  className,
}: TimelineEventItemProps) {
  const config = timelineEventConfig[event.type];
  const Icon = config.icon;
  const timestamp = new Date(event.timestamp);

  return (
    <div className={cn('relative flex gap-4', className)}>
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px bg-border" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'relative z-10 flex items-center justify-center w-10 h-10 rounded-full',
          config.bgColor
        )}
      >
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{event.title}</span>
              <Badge variant="outline" className="text-xs">
                {config.label}
              </Badge>
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {event.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{format(timestamp, 'MMM dd, yyyy')}</span>
              <span>•</span>
              <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
            </div>
          </div>

          {event.impact && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
              <Trophy className="h-3 w-3 mr-1" />
              +{event.impact}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Full Timeline
// ============================================================================

interface LifecycleFullTimelineProps {
  events: TimelineEvent[];
  maxItems?: number;
  onViewMore?: () => void;
  emptyMessage?: string;
  className?: string;
}

export function LifecycleFullTimeline({
  events,
  maxItems,
  onViewMore,
  emptyMessage = 'No timeline events',
  className,
}: LifecycleFullTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Sort by timestamp descending (newest first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const displayEvents = maxItems ? sortedEvents.slice(0, maxItems) : sortedEvents;

  return (
    <div className={className}>
      {displayEvents.map((event, index) => (
        <TimelineEventItem
          key={event.id}
          event={event}
          isLast={index === displayEvents.length - 1}
        />
      ))}

      {maxItems && events.length > maxItems && onViewMore && (
        <Button
          variant="outline"
          size="sm"
          onClick={onViewMore}
          className="w-full mt-4"
        >
          View {events.length - maxItems} More Events
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Stage Journey Card
// ============================================================================

interface StageJourneyStep {
  stage: LifecycleStage;
  enteredAt?: Date | string;
  exitedAt?: Date | string;
  achievements?: string[];
  current?: boolean;
}

interface StageJourneyCardProps {
  companyName: string;
  incorporationDate: Date | string;
  currentStage: LifecycleStage;
  stageHistory: StageJourneyStep[];
  onStageClick?: (stage: LifecycleStage) => void;
  className?: string;
}

export function StageJourneyCard({
  companyName,
  incorporationDate,
  currentStage,
  stageHistory,
  onStageClick,
  className,
}: StageJourneyCardProps) {
  const companyAge = formatCompanyAge(incorporationDate);
  const progress = getStageProgress(currentStage);
  const currentConfig = stageConfigs[currentStage];
  const CurrentIcon = currentConfig.icon;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{companyName}</h3>
            <p className="text-sm text-muted-foreground">
              Company Age: {companyAge}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', currentConfig.bgColor)}>
              <CurrentIcon className={cn('h-5 w-5', currentConfig.color)} />
            </div>
            <div>
              <p className="text-sm font-medium">{currentConfig.label}</p>
              <p className="text-xs text-muted-foreground">Current Stage</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Journey Progress</span>
            <span className="text-xs font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stage Timeline */}
        <div className="relative">
          {stageOrder.map((stage, index) => {
            const config = stageConfigs[stage];
            const Icon = config.icon;
            const historyItem = stageHistory.find((h) => h.stage === stage);
            const isCompleted = historyItem && !historyItem.current;
            const isCurrent = stage === currentStage;
            const isFuture = stageOrder.indexOf(stage) > stageOrder.indexOf(currentStage);

            return (
              <div
                key={stage}
                className={cn(
                  'flex items-start gap-3 pb-4 last:pb-0',
                  onStageClick && !isFuture && 'cursor-pointer hover:opacity-80'
                )}
                onClick={() => !isFuture && onStageClick?.(stage)}
              >
                {/* Line */}
                {index < stageOrder.length - 1 && (
                  <div
                    className={cn(
                      'absolute left-5 w-px h-8',
                      isCompleted ? 'bg-primary' : 'bg-border'
                    )}
                    style={{ top: `${index * 48 + 40}px` }}
                  />
                )}

                {/* Icon */}
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 z-10',
                    isCompleted && 'bg-primary border-primary',
                    isCurrent && cn(config.bgColor, config.borderColor),
                    isFuture && 'bg-muted border-muted-foreground/20'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        isCurrent ? config.color : 'text-muted-foreground/40'
                      )}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={cn(
                          'font-medium',
                          isCurrent && config.color,
                          isFuture && 'text-muted-foreground'
                        )}
                      >
                        {config.label}
                      </p>
                      {historyItem?.enteredAt && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(historyItem.enteredAt), 'MMM yyyy')}
                          {historyItem.exitedAt &&
                            ` - ${format(new Date(historyItem.exitedAt), 'MMM yyyy')}`}
                        </p>
                      )}
                      {isFuture && (
                        <p className="text-xs text-muted-foreground">
                          {config.typicalDuration}
                        </p>
                      )}
                    </div>
                    {historyItem?.achievements && historyItem.achievements.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Trophy className="h-3 w-3 mr-1" />
                        {historyItem.achievements.length}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Stage Transition Card
// ============================================================================

interface StageTransitionRequirement {
  id: string;
  label: string;
  completed: boolean;
  impact: number;
}

interface StageTransitionCardProps {
  currentStage: LifecycleStage;
  targetStage: LifecycleStage;
  readiness: number;
  requirements: StageTransitionRequirement[];
  daysInCurrentStage: number;
  onRequirementClick?: (id: string) => void;
  onAdvanceStage?: () => void;
  className?: string;
}

export function StageTransitionCard({
  currentStage,
  targetStage,
  readiness,
  requirements,
  daysInCurrentStage,
  onRequirementClick,
  onAdvanceStage,
  className,
}: StageTransitionCardProps) {
  const currentConfig = stageConfigs[currentStage];
  const targetConfig = stageConfigs[targetStage];
  const CurrentIcon = currentConfig.icon;
  const TargetIcon = targetConfig.icon;
  const completedCount = requirements.filter((r) => r.completed).length;
  const canAdvance = readiness >= 100;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Stage Transition</h3>
          <Badge variant="outline">
            {daysInCurrentStage} days in {currentConfig.shortLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stage Transition Visual */}
        <div className="flex items-center justify-center gap-4 mb-4 py-4">
          <div className="flex flex-col items-center">
            <div className={cn('p-3 rounded-full', currentConfig.bgColor)}>
              <CurrentIcon className={cn('h-6 w-6', currentConfig.color)} />
            </div>
            <span className="text-sm font-medium mt-2">{currentConfig.label}</span>
            <span className="text-xs text-muted-foreground">Current</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-12 h-0.5 bg-border" />
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="w-12 h-0.5 bg-border" />
          </div>

          <div className="flex flex-col items-center">
            <div className={cn('p-3 rounded-full', targetConfig.bgColor)}>
              <TargetIcon className={cn('h-6 w-6', targetConfig.color)} />
            </div>
            <span className="text-sm font-medium mt-2">{targetConfig.label}</span>
            <span className="text-xs text-muted-foreground">Target</span>
          </div>
        </div>

        {/* Readiness */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Transition Readiness</span>
            <span className="text-sm font-semibold">{readiness}%</span>
          </div>
          <Progress value={readiness} className="h-2" />
        </div>

        {/* Requirements */}
        <div className="space-y-2 mb-4">
          <p className="text-sm font-medium">
            Requirements ({completedCount}/{requirements.length})
          </p>
          {requirements.map((req) => (
            <div
              key={req.id}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg transition-colors',
                req.completed
                  ? 'bg-emerald-50 dark:bg-emerald-950'
                  : 'bg-muted/50',
                onRequirementClick && !req.completed && 'cursor-pointer hover:bg-muted'
              )}
              onClick={() => !req.completed && onRequirementClick?.(req.id)}
            >
              <div className="flex items-center gap-2">
                {req.completed ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    'text-sm',
                    req.completed && 'text-emerald-700 dark:text-emerald-400'
                  )}
                >
                  {req.label}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                +{req.impact}
              </Badge>
            </div>
          ))}
        </div>

        {/* Advance Button */}
        {onAdvanceStage && (
          <Button
            onClick={onAdvanceStage}
            disabled={!canAdvance}
            className="w-full"
          >
            {canAdvance ? (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Advance to {targetConfig.label}
              </>
            ) : (
              <>Complete Requirements to Advance</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Recent Activity Card
// ============================================================================

interface RecentActivityCardProps {
  events: TimelineEvent[];
  maxItems?: number;
  onViewAll?: () => void;
  className?: string;
}

export function RecentActivityCard({
  events,
  maxItems = 5,
  onViewAll,
  className,
}: RecentActivityCardProps) {
  const sortedEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxItems);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Recent Activity
          </h3>
          {events.length > maxItems && onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedEvents.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map((event) => {
              const config = timelineEventConfig[event.type];
              const Icon = config.icon;

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={cn('p-1.5 rounded-md', config.bgColor)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  {event.impact && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      +{event.impact}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
