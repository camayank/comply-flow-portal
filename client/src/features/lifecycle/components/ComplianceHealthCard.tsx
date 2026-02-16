import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import {
  type ComplianceHealth,
  type ComplianceType,
  healthConfigs,
  complianceTypeConfig,
  getComplianceHealth,
} from '../config';

// ============================================================================
// Compliance Health Badge
// ============================================================================

interface ComplianceHealthBadgeProps {
  health: ComplianceHealth;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function ComplianceHealthBadge({
  health,
  showIcon = true,
  size = 'default',
  className,
}: ComplianceHealthBadgeProps) {
  const config = healthConfigs[health];
  const Icon = health === 'GREEN' ? CheckCircle : health === 'AMBER' ? Clock : AlertTriangle;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge
      className={cn(
        config.bgColor,
        config.borderColor,
        config.color,
        'border',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Compliance Score Gauge
// ============================================================================

interface ComplianceScoreGaugeProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ComplianceScoreGauge({
  score,
  maxScore = 100,
  size = 'default',
  showLabel = true,
  className,
}: ComplianceScoreGaugeProps) {
  const percentage = Math.round((score / maxScore) * 100);
  const health = getComplianceHealth(percentage);
  const config = healthConfigs[health];

  const sizeClasses = {
    sm: { ring: 'h-16 w-16', text: 'text-lg', label: 'text-xs' },
    default: { ring: 'h-24 w-24', text: 'text-2xl', label: 'text-sm' },
    lg: { ring: 'h-32 w-32', text: 'text-3xl', label: 'text-base' },
  };

  const strokeWidth = size === 'sm' ? 4 : size === 'lg' ? 8 : 6;
  const radius = size === 'sm' ? 28 : size === 'lg' ? 56 : 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const strokeColor = health === 'GREEN' ? '#10b981' : health === 'AMBER' ? '#f59e0b' : '#ef4444';

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className={cn('relative', sizeClasses[size].ring)}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', config.color, sizeClasses[size].text)}>
            {percentage}
          </span>
          {showLabel && (
            <span className={cn('text-muted-foreground', sizeClasses[size].label)}>
              Score
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compliance Type Badge
// ============================================================================

interface ComplianceTypeBadgeProps {
  type: ComplianceType;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function ComplianceTypeBadge({
  type,
  showIcon = true,
  size = 'default',
  className,
}: ComplianceTypeBadgeProps) {
  const config = complianceTypeConfig[type];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge
      variant="outline"
      className={cn(config.bgColor, config.color, sizeClasses[size], className)}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Compliance Summary Card
// ============================================================================

interface ComplianceSummary {
  score: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  completedItems: number;
  pendingItems: number;
  overdueItems: number;
}

interface ComplianceSummaryCardProps {
  summary: ComplianceSummary;
  onViewDetails?: () => void;
  className?: string;
}

export function ComplianceSummaryCard({
  summary,
  onViewDetails,
  className,
}: ComplianceSummaryCardProps) {
  const health = getComplianceHealth(summary.score);
  const config = healthConfigs[health];
  const TrendIcon = summary.trend === 'up' ? TrendingUp : summary.trend === 'down' ? TrendingDown : Minus;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Compliance Health
          </h3>
          <ComplianceHealthBadge health={health} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <ComplianceScoreGauge score={summary.score} size="default" />

          <div className="flex-1 space-y-3">
            {/* Trend */}
            <div className="flex items-center gap-2">
              <TrendIcon
                className={cn(
                  'h-4 w-4',
                  summary.trend === 'up' && 'text-emerald-600',
                  summary.trend === 'down' && 'text-red-600',
                  summary.trend === 'stable' && 'text-slate-600'
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium',
                  summary.trend === 'up' && 'text-emerald-600',
                  summary.trend === 'down' && 'text-red-600',
                  summary.trend === 'stable' && 'text-slate-600'
                )}
              >
                {summary.trend === 'up' && '+'}
                {summary.trend === 'down' && '-'}
                {summary.trendValue}% from last month
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {summary.completedItems}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  {summary.pendingItems}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950">
                <p className="text-lg font-bold text-red-700 dark:text-red-400">
                  {summary.overdueItems}
                </p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>
        </div>

        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="w-full mt-4"
          >
            View All Compliance Items
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Compliance Type Progress
// ============================================================================

interface ComplianceTypeProgress {
  type: ComplianceType;
  completed: number;
  total: number;
  score: number;
}

interface ComplianceTypeProgressCardProps {
  items: ComplianceTypeProgress[];
  onTypeClick?: (type: ComplianceType) => void;
  className?: string;
}

export function ComplianceTypeProgressCard({
  items,
  onTypeClick,
  className,
}: ComplianceTypeProgressCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <h3 className="font-semibold">Compliance by Category</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const config = complianceTypeConfig[item.type];
          const Icon = config.icon;
          const percentage = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
          const health = getComplianceHealth(item.score);

          return (
            <div
              key={item.type}
              className={cn(
                'p-3 rounded-lg transition-colors',
                onTypeClick && 'cursor-pointer hover:bg-muted/50'
              )}
              onClick={() => onTypeClick?.(item.type)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn('p-1.5 rounded-md', config.bgColor)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <span className="font-medium">{config.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {item.completed}/{item.total}
                  </span>
                  <ComplianceHealthBadge health={health} size="sm" showIcon={false} />
                </div>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Compliance Item Card
// ============================================================================

interface ComplianceItem {
  id: string;
  title: string;
  type: ComplianceType;
  status: 'completed' | 'pending' | 'overdue' | 'upcoming';
  dueDate?: Date | string;
  completedAt?: Date | string;
  impact?: number;
}

interface ComplianceItemCardProps {
  item: ComplianceItem;
  onAction?: () => void;
  actionLabel?: string;
  compact?: boolean;
  className?: string;
}

export function ComplianceItemCard({
  item,
  onAction,
  actionLabel = 'Start',
  compact = false,
  className,
}: ComplianceItemCardProps) {
  const typeConfig = complianceTypeConfig[item.type];
  const TypeIcon = typeConfig.icon;

  const statusConfig = {
    completed: {
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      label: 'Completed',
    },
    pending: {
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      label: 'Pending',
    },
    overdue: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950',
      label: 'Overdue',
    },
    upcoming: {
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      label: 'Upcoming',
    },
  };

  const status = statusConfig[item.status];
  const StatusIcon = status.icon;

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border',
          status.bgColor,
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-1.5 rounded-md', typeConfig.bgColor)}>
            <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
          </div>
          <div>
            <p className="font-medium text-sm">{item.title}</p>
            {item.dueDate && item.status !== 'completed' && (
              <p className="text-xs text-muted-foreground">
                Due: {formatDate(item.dueDate)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(status.bgColor, status.color, 'text-xs')}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
          {onAction && item.status !== 'completed' && (
            <Button size="sm" variant="ghost" onClick={onAction}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(status.bgColor, className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg', typeConfig.bgColor)}>
              <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
            </div>
            <div>
              <h4 className="font-semibold">{item.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <ComplianceTypeBadge type={item.type} size="sm" showIcon={false} />
                <Badge variant="outline" className={cn(status.bgColor, status.color, 'text-xs')}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
              {item.dueDate && item.status !== 'completed' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Due: {formatDate(item.dueDate)}
                </p>
              )}
              {item.completedAt && item.status === 'completed' && (
                <p className="text-sm text-emerald-600 mt-2">
                  Completed: {formatDate(item.completedAt)}
                </p>
              )}
              {item.impact && (
                <p className="text-sm text-amber-600 mt-1">
                  +{item.impact} compliance points
                </p>
              )}
            </div>
          </div>
          {onAction && item.status !== 'completed' && (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Compliance Items List
// ============================================================================

interface ComplianceItemsListProps {
  items: ComplianceItem[];
  onItemAction?: (id: string) => void;
  compact?: boolean;
  maxItems?: number;
  emptyMessage?: string;
  className?: string;
}

export function ComplianceItemsList({
  items,
  onItemAction,
  compact = true,
  maxItems,
  emptyMessage = 'No compliance items',
  className,
}: ComplianceItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Sort: overdue > pending > upcoming > completed
  const statusOrder = { overdue: 0, pending: 1, upcoming: 2, completed: 3 };
  const sortedItems = [...items].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status]
  );

  const displayItems = maxItems ? sortedItems.slice(0, maxItems) : sortedItems;

  return (
    <div className={cn('space-y-3', className)}>
      {displayItems.map((item) => (
        <ComplianceItemCard
          key={item.id}
          item={item}
          compact={compact}
          onAction={onItemAction ? () => onItemAction(item.id) : undefined}
        />
      ))}
      {maxItems && items.length > maxItems && (
        <p className="text-center text-sm text-muted-foreground">
          +{items.length - maxItems} more items
        </p>
      )}
    </div>
  );
}
