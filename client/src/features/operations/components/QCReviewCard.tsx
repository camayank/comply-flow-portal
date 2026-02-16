import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileSearch,
  AlertTriangle,
  ArrowRight,
  User,
  Calendar,
  Star,
  LucideIcon,
} from 'lucide-react';

export type QCStatus =
  | 'pending'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'revision_required';

interface QCStatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

const qcStatusConfigs: Record<QCStatus, QCStatusConfig> = {
  pending: {
    label: 'Pending Review',
    icon: Clock,
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-200 dark:border-slate-700',
  },
  in_progress: {
    label: 'In Review',
    icon: FileSearch,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    borderColor: 'border-blue-200 dark:border-blue-800',
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
};

interface QCReviewCardProps {
  status: QCStatus | string;
  qualityScore?: number | null;
  reviewerName?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  comments?: string | null;
  rejectionReasons?: string[] | null;
  checklistProgress?: { completed: number; total: number };
  onStartReview?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export function QCReviewCard({
  status,
  qualityScore,
  reviewerName,
  startedAt,
  completedAt,
  comments,
  rejectionReasons,
  checklistProgress,
  onStartReview,
  onViewDetails,
  className,
}: QCReviewCardProps) {
  const normalizedStatus = status.toLowerCase().replace(/-/g, '_') as QCStatus;
  const config = qcStatusConfigs[normalizedStatus] || qcStatusConfigs.pending;
  const Icon = config.icon;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-4',
        config.borderColor,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge
          variant="outline"
          className={cn(
            'font-medium inline-flex items-center gap-1.5',
            config.bgColor,
            config.borderColor,
            config.color
          )}
        >
          <Icon className="h-4 w-4" />
          {config.label}
        </Badge>

        {qualityScore !== null && qualityScore !== undefined && (
          <div className="flex items-center gap-1">
            <Star className={cn('h-4 w-4', getScoreColor(qualityScore))} />
            <span className={cn('font-bold', getScoreColor(qualityScore))}>
              {qualityScore}
            </span>
            <span className="text-muted-foreground text-sm">/100</span>
          </div>
        )}
      </div>

      {/* Checklist Progress */}
      {checklistProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Checklist Progress</span>
            <span className="font-medium">
              {checklistProgress.completed}/{checklistProgress.total}
            </span>
          </div>
          <Progress
            value={(checklistProgress.completed / checklistProgress.total) * 100}
            className="h-2"
          />
        </div>
      )}

      {/* Reviewer Info */}
      {(reviewerName || startedAt || completedAt) && (
        <div className="space-y-2 text-sm">
          {reviewerName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Reviewer: {reviewerName}</span>
            </div>
          )}
          {startedAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Started: {formatDate(startedAt)}</span>
            </div>
          )}
          {completedAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>Completed: {formatDate(completedAt)}</span>
            </div>
          )}
        </div>
      )}

      {/* Comments */}
      {comments && (
        <div className="text-sm">
          <p className="text-muted-foreground mb-1">Comments:</p>
          <p className="text-foreground">{comments}</p>
        </div>
      )}

      {/* Rejection Reasons */}
      {rejectionReasons && rejectionReasons.length > 0 && (
        <div className="text-sm">
          <p className="text-red-600 font-medium mb-1">Rejection Reasons:</p>
          <ul className="list-disc list-inside space-y-1">
            {rejectionReasons.map((reason, index) => (
              <li key={index} className="text-red-600">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {(onStartReview || onViewDetails) && (
        <div className="flex gap-2 pt-2 border-t">
          {onStartReview && normalizedStatus === 'pending' && (
            <Button size="sm" onClick={onStartReview}>
              Start Review
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {onViewDetails && (
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              View Details
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface QCStatusBadgeProps {
  status: QCStatus | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function QCStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: QCStatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/-/g, '_') as QCStatus;
  const config = qcStatusConfigs[normalizedStatus] || qcStatusConfigs.pending;
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
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}

// Export config for external use
export { qcStatusConfigs };
