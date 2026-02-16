import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Calendar,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ProgressMetric {
  id: string;
  label: string;
  current: number;
  target: number;
  unit?: string;
  trend?: number;
  color?: 'emerald' | 'blue' | 'purple' | 'amber' | 'red';
}

interface LifecycleProgressTrackerProps {
  metrics: ProgressMetric[];
  title?: string;
  description?: string;
  className?: string;
}

function getColorClasses(color: string = 'blue') {
  const colors: Record<string, { bar: string; text: string; bg: string }> = {
    emerald: {
      bar: 'bg-emerald-500',
      text: 'text-emerald-600',
      bg: 'bg-emerald-100 dark:bg-emerald-900',
    },
    blue: {
      bar: 'bg-blue-500',
      text: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900',
    },
    purple: {
      bar: 'bg-purple-500',
      text: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900',
    },
    amber: {
      bar: 'bg-amber-500',
      text: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-900',
    },
    red: {
      bar: 'bg-red-500',
      text: 'text-red-600',
      bg: 'bg-red-100 dark:bg-red-900',
    },
  };
  return colors[color] || colors.blue;
}

export function LifecycleProgressTracker({
  metrics,
  title,
  description,
  className,
}: LifecycleProgressTrackerProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <div className="mb-4">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {metrics.map((metric) => {
          const percentage = Math.round((metric.current / metric.target) * 100);
          const colors = getColorClasses(metric.color);

          return (
            <div key={metric.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{metric.label}</span>
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-semibold', colors.text)}>
                    {metric.current}
                    {metric.unit && (
                      <span className="text-muted-foreground font-normal">
                        /{metric.target}
                        {metric.unit}
                      </span>
                    )}
                  </span>
                  {metric.trend !== undefined && metric.trend !== 0 && (
                    <span
                      className={cn(
                        'flex items-center text-xs',
                        metric.trend > 0 ? 'text-emerald-600' : 'text-red-600'
                      )}
                    >
                      {metric.trend > 0 ? (
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-0.5" />
                      )}
                      {Math.abs(metric.trend)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="relative">
                <Progress value={percentage} className="h-2" />
                <div
                  className={cn(
                    'absolute top-0 left-0 h-full rounded-full transition-all',
                    colors.bar
                  )}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TransitionReadinessProps {
  currentStage: string;
  nextStage: string;
  readinessScore: number;
  requirements: Array<{
    id: string;
    label: string;
    completed: boolean;
    impact?: number;
  }>;
  estimatedTime?: string;
  onViewDetails?: () => void;
  className?: string;
}

export function TransitionReadiness({
  currentStage,
  nextStage,
  readinessScore,
  requirements,
  estimatedTime,
  onViewDetails,
  className,
}: TransitionReadinessProps) {
  const completedCount = requirements.filter((r) => r.completed).length;
  const scoreColor =
    readinessScore >= 80
      ? 'emerald'
      : readinessScore >= 60
      ? 'amber'
      : readinessScore >= 40
      ? 'orange'
      : 'red';

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Stage Transition</h3>
          <p className="text-sm text-muted-foreground">
            {currentStage} → {nextStage}
          </p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              'text-3xl font-bold',
              scoreColor === 'emerald' && 'text-emerald-600',
              scoreColor === 'amber' && 'text-amber-600',
              scoreColor === 'orange' && 'text-orange-600',
              scoreColor === 'red' && 'text-red-600'
            )}
          >
            {readinessScore}%
          </span>
          <p className="text-xs text-muted-foreground">Readiness</p>
        </div>
      </div>

      <div className="relative">
        <Progress value={readinessScore} className="h-3" />
        <div
          className={cn(
            'absolute top-0 left-0 h-full rounded-full transition-all',
            scoreColor === 'emerald' && 'bg-emerald-500',
            scoreColor === 'amber' && 'bg-amber-500',
            scoreColor === 'orange' && 'bg-orange-500',
            scoreColor === 'red' && 'bg-red-500'
          )}
          style={{ width: `${readinessScore}%` }}
        />
      </div>

      {estimatedTime && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Estimated time to ready: {estimatedTime}
        </div>
      )}

      <div className="pt-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Requirements</span>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{requirements.length} completed
          </span>
        </div>

        <ul className="space-y-2">
          {requirements.slice(0, 5).map((req) => (
            <li
              key={req.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {req.completed ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span
                  className={cn(
                    req.completed && 'text-muted-foreground line-through'
                  )}
                >
                  {req.label}
                </span>
              </div>
              {req.impact && !req.completed && (
                <span className="text-xs text-emerald-600">+{req.impact}%</span>
              )}
            </li>
          ))}
          {requirements.length > 5 && (
            <li className="text-xs text-muted-foreground">
              +{requirements.length - 5} more requirements
            </li>
          )}
        </ul>
      </div>

      {onViewDetails && (
        <Button variant="outline" className="w-full" onClick={onViewDetails}>
          View Transition Details
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  );
}

interface FundingReadinessProps {
  score: number;
  breakdown: Record<string, number>;
  criticalGaps?: string[];
  recommendations?: string[];
  className?: string;
}

export function FundingReadiness({
  score,
  breakdown,
  criticalGaps = [],
  recommendations = [],
  className,
}: FundingReadinessProps) {
  const scoreColor =
    score >= 80
      ? 'text-emerald-600'
      : score >= 60
      ? 'text-amber-600'
      : score >= 40
      ? 'text-orange-600'
      : 'text-red-600';

  const breakdownColors: Record<string, string> = {
    compliance: 'emerald',
    documentation: 'blue',
    financial: 'purple',
    legal: 'amber',
    operational: 'pink',
  };

  return (
    <div className={cn('rounded-lg border bg-card p-6 space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Funding Readiness</h3>
          <p className="text-sm text-muted-foreground">
            Investor due diligence score
          </p>
        </div>
        <div className="text-right">
          <span className={cn('text-4xl font-bold', scoreColor)}>{score}</span>
          <span className="text-lg text-muted-foreground">/100</span>
        </div>
      </div>

      <LifecycleProgressTracker
        metrics={Object.entries(breakdown).map(([key, value]) => ({
          id: key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          current: value,
          target: 100,
          unit: '%',
          color: (breakdownColors[key] || 'blue') as ProgressMetric['color'],
        }))}
      />

      {criticalGaps.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-red-600 mb-2">
            Critical Gaps
          </h4>
          <ul className="space-y-1">
            {criticalGaps.map((gap, index) => (
              <li
                key={index}
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-emerald-600 mb-2">
            Recommendations
          </h4>
          <ul className="space-y-1">
            {recommendations.map((rec, index) => (
              <li
                key={index}
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <Target className="h-3 w-3 text-emerald-500 shrink-0" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
