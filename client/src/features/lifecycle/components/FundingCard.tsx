import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Building2,
  CheckCircle,
  Clock,
  Target,
  ArrowRight,
  ChevronRight,
  Trophy,
  Sparkles,
} from 'lucide-react';
import {
  type FundingRound,
  type Achievement,
  type AchievementType,
  fundingRoundConfig,
  fundingRoundOrder,
  achievementTypeConfig,
  rarityConfig,
  formatCurrency,
} from '../config';

// ============================================================================
// Funding Round Badge
// ============================================================================

interface FundingRoundBadgeProps {
  round: FundingRound;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function FundingRoundBadge({
  round,
  showIcon = true,
  size = 'default',
  className,
}: FundingRoundBadgeProps) {
  const config = fundingRoundConfig[round];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge className={cn(config.bgColor, config.color, sizeClasses[size], className)}>
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Funding Progress Indicator
// ============================================================================

interface FundingProgressIndicatorProps {
  currentRound: FundingRound;
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

export function FundingProgressIndicator({
  currentRound,
  showLabels = false,
  compact = false,
  className,
}: FundingProgressIndicatorProps) {
  const currentIndex = fundingRoundOrder.indexOf(currentRound);

  if (compact) {
    const displayRounds = fundingRoundOrder.slice(0, 7); // Show up to Series A
    return (
      <div className={cn('flex gap-1', className)}>
        {displayRounds.map((round, index) => {
          const config = fundingRoundConfig[round];
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={round}
              className={cn(
                'flex-1 h-2 rounded-full transition-colors',
                isActive ? config.bgColor : 'bg-slate-200 dark:bg-slate-700',
                isCurrent && 'ring-2 ring-offset-1 ring-offset-background'
              )}
              title={config.label}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {fundingRoundOrder.map((round, index) => {
        const config = fundingRoundConfig[round];
        const Icon = config.icon;
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={round} className="flex items-center">
            {index > 0 && (
              <div
                className={cn(
                  'w-8 h-0.5',
                  isActive ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                )}
              />
            )}
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all',
                isActive && !isCurrent && 'bg-primary border-primary',
                isCurrent && cn(config.bgColor, 'border-primary'),
                isFuture && 'bg-muted border-muted-foreground/20'
              )}
              title={config.label}
            >
              {isActive && !isCurrent ? (
                <CheckCircle className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Icon
                  className={cn(
                    'h-4 w-4',
                    isCurrent ? config.color : 'text-muted-foreground/40'
                  )}
                />
              )}
            </div>
            {showLabels && isCurrent && (
              <span className="ml-2 text-sm font-medium">{config.shortLabel}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Funding Round Card
// ============================================================================

interface FundingRoundData {
  round: FundingRound;
  amount?: number;
  valuation?: number;
  date?: Date | string;
  investors?: string[];
  status: 'completed' | 'current' | 'target' | 'future';
}

interface FundingRoundCardProps {
  funding: FundingRoundData;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function FundingRoundCard({
  funding,
  onAction,
  actionLabel = 'View Details',
  className,
}: FundingRoundCardProps) {
  const config = fundingRoundConfig[funding.round];
  const Icon = config.icon;

  const statusConfig = {
    completed: {
      icon: CheckCircle,
      label: 'Completed',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    },
    current: {
      icon: TrendingUp,
      label: 'Current Round',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    target: {
      icon: Target,
      label: 'Target',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
    },
    future: {
      icon: Clock,
      label: 'Future',
      color: 'text-slate-600',
      bgColor: 'bg-slate-50 dark:bg-slate-950',
    },
  };

  const status = statusConfig[funding.status];
  const StatusIcon = status.icon;

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <Card className={cn(status.bgColor, className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn('p-3 rounded-lg', config.bgColor)}>
            <Icon className={cn('h-6 w-6', config.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{config.label}</h4>
              <Badge variant="outline" className={cn(status.bgColor, status.color, 'text-xs')}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-3">{config.description}</p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {funding.amount !== undefined && (
                <div>
                  <p className="text-muted-foreground">Amount Raised</p>
                  <p className="font-semibold text-emerald-600">
                    {formatCurrency(funding.amount)}
                  </p>
                </div>
              )}

              {funding.valuation !== undefined && (
                <div>
                  <p className="text-muted-foreground">Valuation</p>
                  <p className="font-semibold">{formatCurrency(funding.valuation)}</p>
                </div>
              )}

              {!funding.amount && funding.status === 'future' && (
                <div>
                  <p className="text-muted-foreground">Typical Range</p>
                  <p className="font-medium">{config.typicalRange}</p>
                </div>
              )}

              {funding.date && (
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(funding.date)}
                  </p>
                </div>
              )}
            </div>

            {funding.investors && funding.investors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Investors
                </p>
                <div className="flex flex-wrap gap-1">
                  {funding.investors.slice(0, 3).map((investor, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {investor}
                    </Badge>
                  ))}
                  {funding.investors.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{funding.investors.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {onAction && (
            <Button size="sm" variant="outline" onClick={onAction}>
              {actionLabel}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Funding Readiness Card
// ============================================================================

interface FundingReadinessProps {
  readiness: number;
  currentRound: FundingRound;
  targetRound: FundingRound;
  requirements: Array<{ id: string; label: string; completed: boolean }>;
  onViewDetails?: () => void;
  className?: string;
}

export function FundingReadinessCard({
  readiness,
  currentRound,
  targetRound,
  requirements,
  onViewDetails,
  className,
}: FundingReadinessProps) {
  const targetConfig = fundingRoundConfig[targetRound];
  const completedCount = requirements.filter((r) => r.completed).length;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Funding Readiness
          </h3>
          <FundingRoundBadge round={targetRound} size="sm" />
        </div>
      </CardHeader>
      <CardContent>
        {/* Readiness Score */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Ready for {targetConfig.label}
            </span>
            <span className="text-sm font-semibold">{readiness}%</span>
          </div>
          <Progress value={readiness} className="h-2" />
        </div>

        {/* Requirements */}
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-muted-foreground">
            Requirements ({completedCount}/{requirements.length})
          </p>
          {requirements.slice(0, 4).map((req) => (
            <div
              key={req.id}
              className={cn(
                'flex items-center gap-2 text-sm p-2 rounded-lg',
                req.completed
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : 'bg-muted/50'
              )}
            >
              {req.completed ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
          {requirements.length > 4 && (
            <p className="text-xs text-muted-foreground text-center">
              +{requirements.length - 4} more requirements
            </p>
          )}
        </div>

        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="w-full"
          >
            View All Requirements
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Achievement Badge Component
// ============================================================================

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'default' | 'lg';
  showDetails?: boolean;
  locked?: boolean;
  className?: string;
}

export function AchievementBadge({
  achievement,
  size = 'default',
  showDetails = false,
  locked = false,
  className,
}: AchievementBadgeProps) {
  const typeConfig = achievementTypeConfig[achievement.type];
  const rarity = rarityConfig[achievement.rarity];
  const Icon = achievement.icon;

  const sizeClasses = {
    sm: { container: 'w-12 h-12', icon: 'h-5 w-5' },
    default: { container: 'w-16 h-16', icon: 'h-7 w-7' },
    lg: { container: 'w-20 h-20', icon: 'h-9 w-9' },
  };

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center border-2 transition-all',
          sizeClasses[size].container,
          locked
            ? 'bg-muted/50 border-muted-foreground/20 grayscale'
            : cn(achievement.bgColor, rarity.bgColor)
        )}
      >
        <Icon
          className={cn(
            sizeClasses[size].icon,
            locked ? 'text-muted-foreground/40' : achievement.color
          )}
        />
        {!locked && achievement.rarity !== 'common' && (
          <Sparkles
            className={cn(
              'absolute -top-1 -right-1 h-4 w-4',
              rarity.color
            )}
          />
        )}
      </div>
      {showDetails && (
        <div className="mt-2 text-center">
          <p className="text-sm font-medium">{achievement.title}</p>
          <p className="text-xs text-muted-foreground">{rarity.label}</p>
          {achievement.unlockedAt && (
            <p className="text-xs text-muted-foreground">
              {new Date(achievement.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Achievement Card
// ============================================================================

interface AchievementCardProps {
  achievement: Achievement;
  locked?: boolean;
  onClaim?: () => void;
  className?: string;
}

export function AchievementCard({
  achievement,
  locked = false,
  onClaim,
  className,
}: AchievementCardProps) {
  const typeConfig = achievementTypeConfig[achievement.type];
  const rarity = rarityConfig[achievement.rarity];
  const Icon = achievement.icon;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all',
        locked ? 'opacity-60 grayscale' : 'hover:shadow-md',
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'p-3 rounded-lg border-2',
              locked
                ? 'bg-muted border-muted-foreground/20'
                : cn(achievement.bgColor, 'border-transparent')
            )}
          >
            <Icon
              className={cn(
                'h-6 w-6',
                locked ? 'text-muted-foreground/40' : achievement.color
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{achievement.title}</h4>
              <Badge variant="outline" className={cn(rarity.bgColor, rarity.color, 'text-xs')}>
                {rarity.label}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-2">
              {achievement.description}
            </p>

            <div className="flex items-center gap-3 text-sm">
              <span className={cn('flex items-center gap-1', typeConfig.color)}>
                <Trophy className="h-3 w-3" />
                {achievement.points} pts
              </span>
              <Badge variant="outline" className="text-xs">
                {typeConfig.label}
              </Badge>
              {achievement.unlockedAt && (
                <span className="text-xs text-muted-foreground">
                  Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {!locked && onClaim && !achievement.unlockedAt && (
            <Button size="sm" onClick={onClaim}>
              Claim
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Achievements Grid
// ============================================================================

interface AchievementsGridProps {
  achievements: Achievement[];
  lockedAchievements?: Achievement[];
  columns?: 2 | 3 | 4;
  showLocked?: boolean;
  onAchievementClick?: (id: string) => void;
  className?: string;
}

export function AchievementsGrid({
  achievements,
  lockedAchievements = [],
  columns = 3,
  showLocked = true,
  onAchievementClick,
  className,
}: AchievementsGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  const allAchievements = showLocked
    ? [...achievements, ...lockedAchievements]
    : achievements;

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {allAchievements.map((achievement) => {
        const isLocked = lockedAchievements.some((a) => a.id === achievement.id);
        return (
          <div
            key={achievement.id}
            className={cn(
              'cursor-pointer transition-transform hover:scale-105',
              onAchievementClick && 'hover:opacity-80'
            )}
            onClick={() => onAchievementClick?.(achievement.id)}
          >
            <AchievementBadge
              achievement={achievement}
              locked={isLocked}
              showDetails
            />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Achievement Summary
// ============================================================================

interface AchievementSummaryProps {
  totalPoints: number;
  unlockedCount: number;
  totalCount: number;
  recentAchievements?: Achievement[];
  onViewAll?: () => void;
  className?: string;
}

export function AchievementSummary({
  totalPoints,
  unlockedCount,
  totalCount,
  recentAchievements = [],
  onViewAll,
  className,
}: AchievementSummaryProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            Achievements
          </h3>
          <Badge variant="outline">
            {unlockedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900">
            <Trophy className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalPoints}</p>
            <p className="text-sm text-muted-foreground">Total Points</p>
          </div>
          <div className="ml-auto">
            <Progress
              value={(unlockedCount / totalCount) * 100}
              className="w-24 h-2"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {Math.round((unlockedCount / totalCount) * 100)}% complete
            </p>
          </div>
        </div>

        {recentAchievements.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Recent Achievements
            </p>
            <div className="flex gap-2">
              {recentAchievements.slice(0, 4).map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}

        {onViewAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
            className="w-full"
          >
            View All Achievements
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
