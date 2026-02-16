import { cn } from '@/lib/utils';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Upload,
  Send,
  RefreshCw,
  XCircle,
  LucideIcon,
} from 'lucide-react';

export type TimelineEventType =
  | 'created'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'updated'
  | 'reminder'
  | 'document_uploaded'
  | 'pending'
  | 'completed'
  | 'expired';

interface EventConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const eventConfigs: Record<TimelineEventType, EventConfig> = {
  created: {
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
  },
  submitted: {
    icon: Send,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900',
  },
  approved: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900',
  },
  updated: {
    icon: RefreshCw,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
  },
  reminder: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
  },
  document_uploaded: {
    icon: Upload,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
  },
  pending: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900',
  },
  completed: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900',
  },
  expired: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900',
  },
};

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: Date | string;
  actor?: string;
  metadata?: Record<string, unknown>;
}

interface ComplianceTimelineProps {
  events: TimelineEvent[];
  maxItems?: number;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
}

export function ComplianceTimeline({
  events,
  maxItems,
  showLoadMore = false,
  onLoadMore,
}: ComplianceTimelineProps) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {displayEvents.map((event, index) => {
        const config = eventConfigs[event.type] || eventConfigs.updated;
        const Icon = config.icon;
        const isLast = index === displayEvents.length - 1;

        return (
          <div key={event.id} className="relative flex gap-4">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[17px] top-10 bottom-0 w-0.5 bg-border" />
            )}

            {/* Icon */}
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                config.bgColor
              )}
            >
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{event.title}</p>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(event.timestamp)}
                </time>
              </div>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {event.description}
                </p>
              )}
              {event.actor && (
                <p className="text-xs text-muted-foreground mt-1">
                  by {event.actor}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {showLoadMore && maxItems && events.length > maxItems && (
        <button
          onClick={onLoadMore}
          className="w-full text-center text-sm text-primary hover:underline py-2"
        >
          Show {events.length - maxItems} more events
        </button>
      )}
    </div>
  );
}
