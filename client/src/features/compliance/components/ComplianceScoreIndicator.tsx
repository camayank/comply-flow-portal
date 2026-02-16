import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComplianceScoreIndicatorProps {
  score: number;
  maxScore?: number;
  label?: string;
  showTrend?: boolean;
  trend?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'circular';
}

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return 'text-emerald-600';
  if (percentage >= 60) return 'text-amber-600';
  if (percentage >= 40) return 'text-orange-600';
  return 'text-red-600';
}

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-emerald-500';
  if (percentage >= 60) return 'bg-amber-500';
  if (percentage >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getRiskLevel(percentage: number): string {
  if (percentage >= 80) return 'Low Risk';
  if (percentage >= 60) return 'Medium Risk';
  if (percentage >= 40) return 'High Risk';
  return 'Critical Risk';
}

export function ComplianceScoreIndicator({
  score,
  maxScore = 100,
  label,
  showTrend = false,
  trend = 0,
  size = 'md',
  variant = 'default',
}: ComplianceScoreIndicatorProps) {
  const percentage = Math.round((score / maxScore) * 100);
  const scoreColor = getScoreColor(percentage);
  const riskLevel = getRiskLevel(percentage);

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  if (variant === 'circular') {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted/20"
            />
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={getProgressColor(percentage).replace('bg-', 'text-')}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: 'stroke-dashoffset 0.5s ease',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('font-bold', sizeClasses[size], scoreColor)}>
              {percentage}%
            </span>
          </div>
        </div>
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
        <span className={cn('text-xs font-medium', scoreColor)}>{riskLevel}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('font-bold', sizeClasses[size], scoreColor)}>
            {percentage}%
          </span>
          {showTrend && trend !== 0 && (
            <span
              className={cn(
                'flex items-center text-sm',
                trend > 0 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              {Math.abs(trend)}%
            </span>
          )}
          {showTrend && trend === 0 && (
            <span className="flex items-center text-sm text-muted-foreground">
              <Minus className="h-4 w-4 mr-1" />
              No change
            </span>
          )}
        </div>
        <span className={cn('text-xs font-medium', scoreColor)}>{riskLevel}</span>
      </div>
      {label && (
        <span className="text-sm text-muted-foreground block">{label}</span>
      )}
      <div className="relative">
        <Progress value={percentage} className="h-2" />
        <div
          className={cn('absolute top-0 left-0 h-full rounded-full transition-all', getProgressColor(percentage))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface ComplianceScoreCardProps {
  title: string;
  score: number;
  maxScore?: number;
  description?: string;
  trend?: number;
  items?: Array<{ label: string; value: number; max?: number }>;
}

export function ComplianceScoreCard({
  title,
  score,
  maxScore = 100,
  description,
  trend,
  items,
}: ComplianceScoreCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <ComplianceScoreIndicator
        score={score}
        maxScore={maxScore}
        showTrend={trend !== undefined}
        trend={trend}
      />
      {items && items.length > 0 && (
        <div className="space-y-2 pt-4 border-t">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">
                {item.value}/{item.max || 100}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
