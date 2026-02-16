import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  Users,
  MapPin,
  Briefcase,
  Target,
  FileText,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns';
import {
  type FollowUpActivity,
  type FollowUpStatus,
  followUpActivityConfig,
  followUpStatusConfig,
  getFollowUpUrgency,
  getDaysUntilFollowUp,
} from '../config';
import { FollowUpStatusBadge, FollowUpActivityBadge } from './LeadStatusBadge';

// ============================================================================
// Follow-up Timeline Item
// ============================================================================

interface FollowUpTimelineItemProps {
  activity: FollowUpActivity;
  status: FollowUpStatus;
  scheduledAt: Date | string;
  completedAt?: Date | string | null;
  notes?: string | null;
  assignedTo?: string | null;
  outcome?: string | null;
  isLast?: boolean;
  className?: string;
}

export function FollowUpTimelineItem({
  activity,
  status,
  scheduledAt,
  completedAt,
  notes,
  assignedTo,
  outcome,
  isLast = false,
  className,
}: FollowUpTimelineItemProps) {
  const activityConfig = followUpActivityConfig[activity];
  const statusConfig = followUpStatusConfig[status];
  const Icon = activityConfig.icon;
  const StatusIcon = statusConfig.icon;
  const scheduled = new Date(scheduledAt);

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
          activityConfig.bgColor
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{activityConfig.label}</span>
              <FollowUpStatusBadge status={status} size="sm" />
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{format(scheduled, 'MMM dd, yyyy')}</span>
              <span>at</span>
              <Clock className="h-3 w-3" />
              <span>{format(scheduled, 'hh:mm a')}</span>
            </div>
          </div>
          {assignedTo && (
            <Badge variant="outline" className="text-xs">
              {assignedTo}
            </Badge>
          )}
        </div>

        {notes && (
          <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
            {notes}
          </p>
        )}

        {status === 'completed' && outcome && (
          <div className="mt-2 flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
            <span>{outcome}</span>
          </div>
        )}

        {completedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Completed: {format(new Date(completedAt), 'MMM dd, yyyy hh:mm a')}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Follow-up Reminder Card
// ============================================================================

interface FollowUpReminderCardProps {
  leadName: string;
  activity: FollowUpActivity;
  scheduledAt: Date | string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  onMarkComplete?: () => void;
  onReschedule?: () => void;
  onViewLead?: () => void;
  className?: string;
}

export function FollowUpReminderCard({
  leadName,
  activity,
  scheduledAt,
  phone,
  email,
  notes,
  onMarkComplete,
  onReschedule,
  onViewLead,
  className,
}: FollowUpReminderCardProps) {
  const activityConfig = followUpActivityConfig[activity];
  const Icon = activityConfig.icon;
  const urgency = getFollowUpUrgency(scheduledAt);
  const scheduled = new Date(scheduledAt);
  const isOverdue = urgency === 'overdue';
  const isDueToday = urgency === 'today';

  const urgencyStyles = {
    overdue: 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/50',
    today: 'border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/50',
    soon: 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/50',
    upcoming: '',
  };

  return (
    <Card className={cn('overflow-hidden', urgency && urgencyStyles[urgency], className)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', activityConfig.bgColor)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold">{leadName}</h4>
              <p className="text-sm text-muted-foreground">{activityConfig.label}</p>
            </div>
          </div>
          {(isOverdue || isDueToday) && (
            <Badge className={isOverdue ? 'bg-red-500' : 'bg-orange-500'}>
              {isOverdue ? 'Overdue' : 'Due Today'}
            </Badge>
          )}
        </div>

        {/* Scheduled Time */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {isToday(scheduled)
                ? 'Today'
                : isTomorrow(scheduled)
                ? 'Tomorrow'
                : format(scheduled, 'EEE, MMM dd')}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(scheduled, 'hh:mm a')}</span>
          </div>
        </div>

        {/* Contact Info */}
        {(phone || email) && (
          <div className="flex flex-wrap gap-3 mb-3">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Phone className="h-3 w-3" />
                {phone}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Mail className="h-3 w-3" />
                {email}
              </a>
            )}
          </div>
        )}

        {/* Notes */}
        {notes && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2 mb-3">
            {notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t">
          {onMarkComplete && (
            <Button size="sm" onClick={onMarkComplete}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
          {onReschedule && (
            <Button variant="outline" size="sm" onClick={onReschedule}>
              <Calendar className="h-4 w-4 mr-1" />
              Reschedule
            </Button>
          )}
          {onViewLead && (
            <Button variant="ghost" size="sm" onClick={onViewLead} className="ml-auto">
              View Lead
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Follow-up Summary
// ============================================================================

interface FollowUpSummaryStats {
  overdue: number;
  today: number;
  thisWeek: number;
  completed: number;
}

interface FollowUpSummaryProps {
  stats: FollowUpSummaryStats;
  onViewOverdue?: () => void;
  onViewToday?: () => void;
  onViewWeek?: () => void;
  className?: string;
}

export function FollowUpSummary({
  stats,
  onViewOverdue,
  onViewToday,
  onViewWeek,
  className,
}: FollowUpSummaryProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <h3 className="font-semibold">Follow-up Summary</h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Overdue */}
          <div
            className={cn(
              'p-3 rounded-lg cursor-pointer transition-colors',
              'bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50'
            )}
            onClick={onViewOverdue}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
              {stats.overdue}
            </p>
          </div>

          {/* Today */}
          <div
            className={cn(
              'p-3 rounded-lg cursor-pointer transition-colors',
              'bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900/50'
            )}
            onClick={onViewToday}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-600">Today</span>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              {stats.today}
            </p>
          </div>

          {/* This Week */}
          <div
            className={cn(
              'p-3 rounded-lg cursor-pointer transition-colors',
              'bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50'
            )}
            onClick={onViewWeek}
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600">This Week</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {stats.thisWeek}
            </p>
          </div>

          {/* Completed */}
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-emerald-600">Completed</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {stats.completed}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Follow-up Activity Selector
// ============================================================================

interface FollowUpActivitySelectorProps {
  selectedActivity?: FollowUpActivity;
  onSelect?: (activity: FollowUpActivity) => void;
  className?: string;
}

export function FollowUpActivitySelector({
  selectedActivity,
  onSelect,
  className,
}: FollowUpActivitySelectorProps) {
  const activities = Object.keys(followUpActivityConfig) as FollowUpActivity[];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-2', className)}>
      {activities.map(activity => {
        const config = followUpActivityConfig[activity];
        const Icon = config.icon;
        const isSelected = selectedActivity === activity;

        return (
          <div
            key={activity}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors border',
              isSelected
                ? 'border-primary bg-primary/10'
                : 'border-transparent bg-muted/50 hover:bg-muted'
            )}
            onClick={() => onSelect?.(activity)}
          >
            <div className={cn('p-2 rounded-lg', config.bgColor)}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-center">{config.label}</span>
            {config.defaultDurationMinutes > 0 && (
              <span className="text-xs text-muted-foreground">
                ~{config.defaultDurationMinutes}min
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Follow-up List Item
// ============================================================================

interface FollowUpListItemProps {
  id: number;
  leadName: string;
  activity: FollowUpActivity;
  status: FollowUpStatus;
  scheduledAt: Date | string;
  onSelect?: (id: number) => void;
  className?: string;
}

export function FollowUpListItem({
  id,
  leadName,
  activity,
  status,
  scheduledAt,
  onSelect,
  className,
}: FollowUpListItemProps) {
  const activityConfig = followUpActivityConfig[activity];
  const Icon = activityConfig.icon;
  const urgency = getFollowUpUrgency(scheduledAt);
  const scheduled = new Date(scheduledAt);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
        'hover:bg-muted/50',
        className
      )}
      onClick={() => onSelect?.(id)}
    >
      <div className={cn('p-2 rounded-lg', activityConfig.bgColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{leadName}</span>
          <FollowUpStatusBadge status={status} size="sm" showIcon={false} />
        </div>
        <p className="text-sm text-muted-foreground">
          {format(scheduled, 'MMM dd')} at {format(scheduled, 'hh:mm a')}
        </p>
      </div>
      {urgency === 'overdue' && (
        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
      )}
      {urgency === 'today' && (
        <Clock className="h-4 w-4 text-orange-500 flex-shrink-0" />
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
}

// ============================================================================
// Next Follow-up Indicator
// ============================================================================

interface NextFollowUpIndicatorProps {
  scheduledAt: Date | string | null;
  activity?: FollowUpActivity;
  compact?: boolean;
  className?: string;
}

export function NextFollowUpIndicator({
  scheduledAt,
  activity,
  compact = false,
  className,
}: NextFollowUpIndicatorProps) {
  if (!scheduledAt) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Calendar className="h-4 w-4" />
        <span className="text-sm">No follow-up scheduled</span>
      </div>
    );
  }

  const urgency = getFollowUpUrgency(scheduledAt);
  const days = getDaysUntilFollowUp(scheduledAt);
  const scheduled = new Date(scheduledAt);
  const activityConfig = activity ? followUpActivityConfig[activity] : null;

  const urgencyColors = {
    overdue: 'text-red-600 dark:text-red-400',
    today: 'text-orange-600 dark:text-orange-400',
    soon: 'text-amber-600 dark:text-amber-400',
    upcoming: 'text-blue-600 dark:text-blue-400',
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', urgency && urgencyColors[urgency], className)}>
        <Calendar className="h-3 w-3" />
        <span className="text-sm">
          {days !== null && days < 0
            ? `${Math.abs(days)}d overdue`
            : days === 0
            ? 'Today'
            : `${days}d`}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {activityConfig && (
        <div className={cn('p-1.5 rounded-md', activityConfig.bgColor)}>
          {(() => {
            const Icon = activityConfig.icon;
            return <Icon className="h-4 w-4" />;
          })()}
        </div>
      )}
      <div>
        <p className={cn('text-sm font-medium', urgency && urgencyColors[urgency])}>
          {isToday(scheduled)
            ? 'Today'
            : isTomorrow(scheduled)
            ? 'Tomorrow'
            : isPast(scheduled)
            ? `${formatDistanceToNow(scheduled)} ago`
            : `in ${formatDistanceToNow(scheduled)}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(scheduled, 'MMM dd, hh:mm a')}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Schedule Follow-up Button
// ============================================================================

interface ScheduleFollowUpButtonProps {
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ScheduleFollowUpButton({
  onClick,
  variant = 'outline',
  size = 'sm',
  className,
}: ScheduleFollowUpButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={className}
    >
      <Plus className="h-4 w-4 mr-1" />
      Schedule Follow-up
    </Button>
  );
}
