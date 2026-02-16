import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Lightbulb,
  Sparkles,
  Zap,
  ArrowRight,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  RefreshCw,
  MessageSquare,
  FileText,
  ExternalLink,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Types
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationType =
  | 'upsell'
  | 'retention'
  | 'engagement'
  | 'compliance'
  | 'support'
  | 'onboarding'
  | 'renewal'
  | 'health';

export interface RecommendationData {
  id: number;
  type: RecommendationType;
  title: string;
  description: string;
  actionUrl?: string | null;
  priority: RecommendationPriority;
  confidence: number;
  isActive: boolean;
  dismissedAt?: string | null;
  actedAt?: string | null;
  outcome?: string | null;
  createdAt: string;
}

// Config
interface PriorityConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: LucideIcon;
}

const priorityConfig: Record<RecommendationPriority, PriorityConfig> = {
  critical: {
    label: 'Critical',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: Zap,
  },
  high: {
    label: 'High',
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    borderColor: 'border-orange-300 dark:border-orange-700',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-300 dark:border-amber-700',
    icon: Clock,
  },
  low: {
    label: 'Low',
    color: 'slate',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-400',
    borderColor: 'border-slate-300 dark:border-slate-600',
    icon: Clock,
  },
};

interface TypeConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

const typeConfig: Record<RecommendationType, TypeConfig> = {
  upsell: {
    label: 'Upsell',
    color: 'emerald',
    icon: TrendingUp,
  },
  retention: {
    label: 'Retention',
    color: 'blue',
    icon: Users,
  },
  engagement: {
    label: 'Engagement',
    color: 'purple',
    icon: MessageSquare,
  },
  compliance: {
    label: 'Compliance',
    color: 'amber',
    icon: FileText,
  },
  support: {
    label: 'Support',
    color: 'pink',
    icon: MessageSquare,
  },
  onboarding: {
    label: 'Onboarding',
    color: 'teal',
    icon: Users,
  },
  renewal: {
    label: 'Renewal',
    color: 'indigo',
    icon: RefreshCw,
  },
  health: {
    label: 'Health',
    color: 'rose',
    icon: TrendingUp,
  },
};

// Priority Badge
interface RecommendationPriorityBadgeProps {
  priority: RecommendationPriority;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function RecommendationPriorityBadge({
  priority,
  showIcon = true,
  size = 'md',
  className,
}: RecommendationPriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.textColor,
        config.borderColor,
        'font-medium',
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
        className
      )}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// Type Badge
interface RecommendationTypeBadgeProps {
  type: RecommendationType;
  className?: string;
}

export function RecommendationTypeBadge({ type, className }: RecommendationTypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  };

  return (
    <Badge
      variant="outline"
      className={cn('border-transparent', colorClasses[config.color], className)}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

// Confidence Indicator
interface ConfidenceIndicatorProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ConfidenceIndicator({
  confidence,
  showLabel = true,
  size = 'md',
  className,
}: ConfidenceIndicatorProps) {
  const getColor = (conf: number) => {
    if (conf >= 80) return 'emerald';
    if (conf >= 60) return 'blue';
    if (conf >= 40) return 'amber';
    return 'slate';
  };

  const color = getColor(confidence);

  const colorClasses: Record<string, { bar: string; text: string }> = {
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    blue: { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    slate: { bar: 'bg-slate-500', text: 'text-slate-600 dark:text-slate-400' },
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabel && (
        <span className={cn('text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
          Confidence:
        </span>
      )}
      <div className={cn(
        'bg-muted rounded-full overflow-hidden',
        size === 'sm' ? 'w-12 h-1.5' : 'w-16 h-2'
      )}>
        <div
          className={cn('h-full rounded-full', colorClasses[color].bar)}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className={cn(
        'font-medium',
        size === 'sm' ? 'text-xs' : 'text-sm',
        colorClasses[color].text
      )}>
        {confidence}%
      </span>
    </div>
  );
}

// Recommendation Card
interface RecommendationCardProps {
  recommendation: RecommendationData;
  onAct?: () => void;
  onDismiss?: () => void;
  onNavigate?: () => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export function RecommendationCard({
  recommendation,
  onAct,
  onDismiss,
  onNavigate,
  showActions = true,
  compact = false,
  className,
}: RecommendationCardProps) {
  const isActedUpon = !!recommendation.actedAt;
  const isDismissed = !!recommendation.dismissedAt;
  const isInactive = !recommendation.isActive || isActedUpon || isDismissed;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border bg-card',
          isInactive && 'opacity-60',
          className
        )}
      >
        <div className="p-2 rounded-lg bg-primary/10">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm truncate">{recommendation.title}</p>
            <RecommendationPriorityBadge priority={recommendation.priority} size="sm" showIcon={false} />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {recommendation.description}
          </p>
        </div>
        {showActions && !isInactive && (
          <Button size="sm" variant="ghost" onClick={onAct || onNavigate}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {isActedUpon && (
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
        )}
      </div>
    );
  }

  return (
    <Card className={cn(isInactive && 'opacity-60', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">{recommendation.title}</CardTitle>
              <div className="flex items-center gap-2">
                <RecommendationTypeBadge type={recommendation.type as RecommendationType} />
                <RecommendationPriorityBadge priority={recommendation.priority} size="sm" />
              </div>
            </div>
          </div>
          {isActedUpon && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
              <CheckCircle className="h-3 w-3 mr-1" />
              Acted
            </Badge>
          )}
          {isDismissed && (
            <Badge variant="secondary" className="shrink-0">
              Dismissed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{recommendation.description}</p>

        <ConfidenceIndicator confidence={recommendation.confidence} />

        {recommendation.outcome && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              <strong>Outcome:</strong> {recommendation.outcome}
            </p>
          </div>
        )}

        {showActions && !isInactive && (
          <div className="flex gap-2 pt-2 border-t">
            {recommendation.actionUrl ? (
              <Button size="sm" asChild onClick={onAct}>
                <a href={recommendation.actionUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Take Action
                </a>
              </Button>
            ) : onAct ? (
              <Button size="sm" onClick={onAct}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark as Done
              </Button>
            ) : null}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Recommendation List
interface RecommendationListProps {
  recommendations: RecommendationData[];
  onAct?: (id: number) => void;
  onDismiss?: (id: number) => void;
  showDismissed?: boolean;
  compact?: boolean;
  className?: string;
}

export function RecommendationList({
  recommendations,
  onAct,
  onDismiss,
  showDismissed = false,
  compact = false,
  className,
}: RecommendationListProps) {
  const filteredRecommendations = showDismissed
    ? recommendations
    : recommendations.filter((r) => !r.dismissedAt);

  if (filteredRecommendations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Lightbulb className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No recommendations available</p>
      </div>
    );
  }

  // Sort by priority and confidence
  const priorityOrder: Record<RecommendationPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const sortedRecommendations = [...filteredRecommendations].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });

  return (
    <div className={cn('space-y-3', className)}>
      {sortedRecommendations.map((recommendation) => (
        <RecommendationCard
          key={recommendation.id}
          recommendation={recommendation}
          onAct={onAct ? () => onAct(recommendation.id) : undefined}
          onDismiss={onDismiss ? () => onDismiss(recommendation.id) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}

// Export config
export { priorityConfig, typeConfig };
