import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Activity,
  DollarSign,
  HeadphonesIcon,
  Zap,
  FileCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Types
export type HealthTrend = 'up' | 'down' | 'stable';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface HealthScoreData {
  overall: number;
  engagement?: number | null;
  compliance?: number | null;
  payment?: number | null;
  support?: number | null;
  productUsage?: number | null;
  trend?: HealthTrend | null;
  riskLevel?: RiskLevel | null;
}

// Config
interface ScoreThreshold {
  min: number;
  max: number;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

const scoreThresholds: ScoreThreshold[] = [
  { min: 80, max: 100, label: 'Excellent', color: 'emerald', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-700 dark:text-emerald-400' },
  { min: 60, max: 79, label: 'Good', color: 'blue', bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-400' },
  { min: 40, max: 59, label: 'Fair', color: 'amber', bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-400' },
  { min: 20, max: 39, label: 'Poor', color: 'orange', bgColor: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-700 dark:text-orange-400' },
  { min: 0, max: 19, label: 'Critical', color: 'red', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400' },
];

const riskLevelConfig: Record<RiskLevel, { label: string; color: string; icon: LucideIcon }> = {
  low: { label: 'Low Risk', color: 'emerald', icon: CheckCircle },
  medium: { label: 'Medium Risk', color: 'amber', icon: AlertCircle },
  high: { label: 'High Risk', color: 'orange', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'red', icon: AlertTriangle },
};

const trendConfig: Record<HealthTrend, { label: string; icon: LucideIcon; color: string }> = {
  up: { label: 'Improving', icon: TrendingUp, color: 'text-emerald-600' },
  down: { label: 'Declining', icon: TrendingDown, color: 'text-red-600' },
  stable: { label: 'Stable', icon: Minus, color: 'text-slate-600' },
};

function getScoreThreshold(score: number): ScoreThreshold {
  return scoreThresholds.find(t => score >= t.min && score <= t.max) || scoreThresholds[scoreThresholds.length - 1];
}

// Health Score Badge Component
interface HealthScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HealthScoreBadge({
  score,
  showLabel = true,
  size = 'md',
  className,
}: HealthScoreBadgeProps) {
  const threshold = getScoreThreshold(score);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        threshold.bgColor,
        threshold.textColor,
        'border-transparent font-medium',
        sizeClasses[size],
        className
      )}
    >
      <Heart className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')} />
      {score}
      {showLabel && <span className="ml-1">({threshold.label})</span>}
    </Badge>
  );
}

// Health Score Gauge Component
interface HealthScoreGaugeProps {
  score: number;
  trend?: HealthTrend | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HealthScoreGauge({
  score,
  trend,
  size = 'md',
  className,
}: HealthScoreGaugeProps) {
  const threshold = getScoreThreshold(score);
  const TrendIcon = trend ? trendConfig[trend].icon : null;

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={cn('relative flex items-center justify-center', sizeClasses[size], className)}>
      <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-muted"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${score * 2.83} 283`}
          strokeLinecap="round"
          className={cn(
            threshold.color === 'emerald' && 'text-emerald-500',
            threshold.color === 'blue' && 'text-blue-500',
            threshold.color === 'amber' && 'text-amber-500',
            threshold.color === 'orange' && 'text-orange-500',
            threshold.color === 'red' && 'text-red-500'
          )}
        />
      </svg>
      <div className="text-center">
        <span className={cn('font-bold', textSizes[size])}>{score}</span>
        {TrendIcon && (
          <TrendIcon className={cn('h-4 w-4 mx-auto mt-1', trendConfig[trend!].color)} />
        )}
      </div>
    </div>
  );
}

// Risk Level Badge Component
interface RiskLevelBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskLevelBadge({ level, className }: RiskLevelBadgeProps) {
  const config = riskLevelConfig[level];
  const Icon = config.icon;

  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Badge
      variant="outline"
      className={cn('border-transparent', colorClasses[config.color as keyof typeof colorClasses], className)}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

// Score Metric Card
interface ScoreMetricProps {
  label: string;
  score: number | null | undefined;
  icon: LucideIcon;
  className?: string;
}

function ScoreMetric({ label, score, icon: Icon, className }: ScoreMetricProps) {
  if (score === null || score === undefined) return null;

  const threshold = getScoreThreshold(score);

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full',
              threshold.color === 'emerald' && 'bg-emerald-500',
              threshold.color === 'blue' && 'bg-blue-500',
              threshold.color === 'amber' && 'bg-amber-500',
              threshold.color === 'orange' && 'bg-orange-500',
              threshold.color === 'red' && 'bg-red-500'
            )}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={cn('text-sm font-medium w-8 text-right', threshold.textColor)}>
          {score}
        </span>
      </div>
    </div>
  );
}

// Full Health Score Card Component
interface HealthScoreCardProps {
  data: HealthScoreData;
  clientName?: string;
  showBreakdown?: boolean;
  compact?: boolean;
  className?: string;
}

export function HealthScoreCard({
  data,
  clientName,
  showBreakdown = true,
  compact = false,
  className,
}: HealthScoreCardProps) {
  const threshold = getScoreThreshold(data.overall);
  const TrendIcon = data.trend ? trendConfig[data.trend].icon : null;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-3 rounded-lg border bg-card', className)}>
        <HealthScoreGauge score={data.overall} trend={data.trend} size="sm" />
        <div className="flex-1 min-w-0">
          {clientName && (
            <p className="font-medium truncate">{clientName}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('text-sm font-medium', threshold.textColor)}>
              {threshold.label}
            </span>
            {data.riskLevel && <RiskLevelBadge level={data.riskLevel} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            {clientName ? `${clientName} Health` : 'Health Score'}
          </CardTitle>
          {data.riskLevel && <RiskLevelBadge level={data.riskLevel} />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <HealthScoreGauge score={data.overall} trend={data.trend} size="lg" />
          <div className="flex-1 space-y-1">
            <p className={cn('text-lg font-semibold', threshold.textColor)}>
              {threshold.label}
            </p>
            {TrendIcon && data.trend && (
              <p className={cn('text-sm flex items-center gap-1', trendConfig[data.trend].color)}>
                <TrendIcon className="h-4 w-4" />
                {trendConfig[data.trend].label}
              </p>
            )}
          </div>
        </div>

        {showBreakdown && (
          <div className="mt-6 space-y-3 pt-4 border-t">
            <ScoreMetric label="Engagement" score={data.engagement} icon={Activity} />
            <ScoreMetric label="Compliance" score={data.compliance} icon={FileCheck} />
            <ScoreMetric label="Payment" score={data.payment} icon={DollarSign} />
            <ScoreMetric label="Support" score={data.support} icon={HeadphonesIcon} />
            <ScoreMetric label="Product Usage" score={data.productUsage} icon={Zap} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Health Score List Component
interface HealthScoreListProps {
  scores: Array<HealthScoreData & { clientId: number; clientName: string }>;
  onSelect?: (clientId: number) => void;
  className?: string;
}

export function HealthScoreList({ scores, onSelect, className }: HealthScoreListProps) {
  if (scores.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Heart className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No health scores available</p>
      </div>
    );
  }

  const sortedScores = [...scores].sort((a, b) => a.overall - b.overall);

  return (
    <div className={cn('space-y-2', className)}>
      {sortedScores.map((score) => (
        <div
          key={score.clientId}
          className={cn(
            'cursor-pointer transition-colors',
            onSelect && 'hover:bg-muted/50'
          )}
          onClick={() => onSelect?.(score.clientId)}
        >
          <HealthScoreCard
            data={score}
            clientName={score.clientName}
            showBreakdown={false}
            compact
          />
        </div>
      ))}
    </div>
  );
}

// Export utilities
export { getScoreThreshold, scoreThresholds, riskLevelConfig, trendConfig };
