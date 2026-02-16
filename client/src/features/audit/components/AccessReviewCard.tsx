import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  UserCheck,
  UserX,
  UserCog,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Eye,
  ClipboardList,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Types
export type ReviewType = 'quarterly' | 'annual' | 'termination';
export type ReviewStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type ReviewDecision = 'approve' | 'revoke' | 'modify';

export interface AccessReviewData {
  id: number;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  reviewType: ReviewType;
  status: ReviewStatus;
  reviewerId?: number | null;
  reviewerName?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  summary?: string | null;
  createdAt: string;
  totalItems?: number;
  completedItems?: number;
}

export interface AccessReviewItemData {
  id: number;
  reviewId: number;
  userId: number;
  userName?: string | null;
  userEmail?: string | null;
  currentRole?: string | null;
  currentPermissions?: Record<string, unknown> | null;
  accessHistory?: Record<string, unknown> | null;
  decision?: ReviewDecision | null;
  newRole?: string | null;
  newPermissions?: Record<string, unknown> | null;
  comments?: string | null;
  reviewedAt?: string | null;
}

// Config
interface ReviewTypeConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: LucideIcon;
}

const reviewTypeConfig: Record<ReviewType, ReviewTypeConfig> = {
  quarterly: {
    label: 'Quarterly',
    description: 'Q4 periodic access review',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: Calendar,
  },
  annual: {
    label: 'Annual',
    description: 'Yearly comprehensive review',
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-400',
    icon: ClipboardList,
  },
  termination: {
    label: 'Termination',
    description: 'Access revocation review',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: UserX,
  },
};

interface ReviewStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: LucideIcon;
}

const reviewStatusConfig: Record<ReviewStatus, ReviewStatusConfig> = {
  pending: {
    label: 'Pending',
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-400',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    icon: Loader2,
  },
  completed: {
    label: 'Completed',
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle,
  },
  overdue: {
    label: 'Overdue',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: AlertTriangle,
  },
};

interface DecisionConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: LucideIcon;
}

const decisionConfig: Record<ReviewDecision, DecisionConfig> = {
  approve: {
    label: 'Approved',
    color: 'emerald',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    icon: UserCheck,
  },
  revoke: {
    label: 'Revoked',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: UserX,
  },
  modify: {
    label: 'Modified',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    icon: UserCog,
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    dateStyle: 'medium',
  });
}

// Review Type Badge
interface ReviewTypeBadgeProps {
  type: ReviewType;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ReviewTypeBadge({
  type,
  showIcon = true,
  size = 'md',
  className,
}: ReviewTypeBadgeProps) {
  const config = reviewTypeConfig[type];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        'border-transparent font-medium',
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
        className
      )}
    >
      {showIcon && <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4', 'mr-1')} />}
      {config.label}
    </Badge>
  );
}

// Review Status Badge
interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ReviewStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: ReviewStatusBadgeProps) {
  const config = reviewStatusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        'border-transparent font-medium',
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
          'mr-1',
          status === 'in_progress' && 'animate-spin'
        )} />
      )}
      {config.label}
    </Badge>
  );
}

// Decision Badge
interface DecisionBadgeProps {
  decision: ReviewDecision;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function DecisionBadge({
  decision,
  showIcon = true,
  size = 'md',
  className,
}: DecisionBadgeProps) {
  const config = decisionConfig[decision];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        'border-transparent font-medium',
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
        className
      )}
    >
      {showIcon && <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4', 'mr-1')} />}
      {config.label}
    </Badge>
  );
}

// Review Progress
interface ReviewProgressProps {
  totalItems: number;
  completedItems: number;
  className?: string;
}

export function ReviewProgress({ totalItems, completedItems, className }: ReviewProgressProps) {
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Review Progress</span>
        <span className="font-medium">
          {completedItems}/{totalItems} ({progress}%)
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

// Due Date Indicator
interface DueDateIndicatorProps {
  dueDate: string;
  className?: string;
}

export function DueDateIndicator({ dueDate, className }: DueDateIndicatorProps) {
  const now = new Date();
  const due = new Date(dueDate);
  const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntil < 0;
  const isUrgent = daysUntil >= 0 && daysUntil <= 3;

  return (
    <div className={cn(
      'flex items-center gap-1 text-sm',
      isOverdue && 'text-red-600 dark:text-red-400',
      isUrgent && !isOverdue && 'text-amber-600 dark:text-amber-400',
      !isOverdue && !isUrgent && 'text-muted-foreground',
      className
    )}>
      <Calendar className="h-4 w-4" />
      <span>
        {isOverdue
          ? `Overdue by ${Math.abs(daysUntil)} days`
          : isUrgent
          ? `Due in ${daysUntil} days`
          : `Due: ${formatDate(dueDate)}`}
      </span>
    </div>
  );
}

// Access Review Card
interface AccessReviewCardProps {
  review: AccessReviewData;
  onViewDetail?: () => void;
  onStartReview?: () => void;
  showProgress?: boolean;
  compact?: boolean;
  className?: string;
}

export function AccessReviewCard({
  review,
  onViewDetail,
  onStartReview,
  showProgress = true,
  compact = false,
  className,
}: AccessReviewCardProps) {
  const isCompleted = review.status === 'completed';
  const isPending = review.status === 'pending';
  const progress = review.totalItems && review.completedItems
    ? Math.round((review.completedItems / review.totalItems) * 100)
    : 0;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors',
          isCompleted && 'opacity-75',
          className
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ReviewTypeBadge type={review.reviewType} size="sm" />
            <ReviewStatusBadge status={review.status} size="sm" />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(review.reviewPeriodStart)} - {formatDate(review.reviewPeriodEnd)}
          </p>
          {review.totalItems !== undefined && (
            <p className="text-xs text-muted-foreground">
              {review.completedItems || 0}/{review.totalItems} items reviewed
            </p>
          )}
        </div>
        {review.dueDate && <DueDateIndicator dueDate={review.dueDate} />}
        {onViewDetail && (
          <Button size="sm" variant="ghost" onClick={onViewDetail}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(isCompleted && 'opacity-75', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ReviewTypeBadge type={review.reviewType} />
              <ReviewStatusBadge status={review.status} />
            </div>
            <CardTitle className="text-base">
              Access Review: {reviewTypeConfig[review.reviewType].label}
            </CardTitle>
          </div>
          {onViewDetail && (
            <Button size="sm" variant="outline" onClick={onViewDetail}>
              <Eye className="h-4 w-4 mr-1" />
              Details
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Review Period */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            Period: {formatDate(review.reviewPeriodStart)} - {formatDate(review.reviewPeriodEnd)}
          </span>
        </div>

        {/* Due Date */}
        {review.dueDate && !isCompleted && (
          <DueDateIndicator dueDate={review.dueDate} />
        )}

        {/* Progress */}
        {showProgress && review.totalItems !== undefined && (
          <ReviewProgress
            totalItems={review.totalItems}
            completedItems={review.completedItems || 0}
          />
        )}

        {/* Reviewer */}
        {review.reviewerName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Reviewer: {review.reviewerName}</span>
          </div>
        )}

        {/* Completed info */}
        {review.completedAt && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            <span>Completed: {formatDate(review.completedAt)}</span>
          </div>
        )}

        {/* Summary */}
        {review.summary && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm">{review.summary}</p>
          </div>
        )}

        {/* Actions */}
        {isPending && onStartReview && (
          <div className="pt-2 border-t">
            <Button size="sm" onClick={onStartReview}>
              <ClipboardList className="h-4 w-4 mr-1" />
              Start Review
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Review Item Card
interface AccessReviewItemCardProps {
  item: AccessReviewItemData;
  onDecide?: (decision: ReviewDecision) => void;
  readonly?: boolean;
  className?: string;
}

export function AccessReviewItemCard({
  item,
  onDecide,
  readonly = false,
  className,
}: AccessReviewItemCardProps) {
  const hasDecision = item.decision !== null && item.decision !== undefined;

  return (
    <Card className={cn(hasDecision && 'opacity-75', className)}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{item.userName || `User #${item.userId}`}</span>
              {item.decision && <DecisionBadge decision={item.decision} size="sm" />}
            </div>
            {item.userEmail && (
              <p className="text-sm text-muted-foreground">{item.userEmail}</p>
            )}
            {item.currentRole && (
              <p className="text-sm text-muted-foreground mt-1">
                Current Role: <Badge variant="outline">{item.currentRole}</Badge>
              </p>
            )}
            {item.newRole && item.decision === 'modify' && (
              <p className="text-sm text-muted-foreground mt-1">
                New Role: <Badge variant="outline" className="bg-amber-50">{item.newRole}</Badge>
              </p>
            )}
            {item.comments && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                "{item.comments}"
              </p>
            )}
          </div>

          {!readonly && !hasDecision && onDecide && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-600 hover:bg-emerald-50"
                onClick={() => onDecide('approve')}
              >
                <UserCheck className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-amber-600 hover:bg-amber-50"
                onClick={() => onDecide('modify')}
              >
                <UserCog className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:bg-red-50"
                onClick={() => onDecide('revoke')}
              >
                <UserX className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Access Review List
interface AccessReviewListProps {
  reviews: AccessReviewData[];
  onViewDetail?: (review: AccessReviewData) => void;
  compact?: boolean;
  className?: string;
}

export function AccessReviewList({
  reviews,
  onViewDetail,
  compact = true,
  className,
}: AccessReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No access reviews found</p>
      </div>
    );
  }

  // Sort by status priority
  const statusOrder: Record<ReviewStatus, number> = {
    overdue: 0,
    in_progress: 1,
    pending: 2,
    completed: 3,
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <div className={cn('space-y-2', className)}>
      {sortedReviews.map((review) => (
        <AccessReviewCard
          key={review.id}
          review={review}
          onViewDetail={onViewDetail ? () => onViewDetail(review) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}

// Export config
export { reviewTypeConfig, reviewStatusConfig, decisionConfig };
