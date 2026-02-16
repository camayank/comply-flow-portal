import { cn } from '@/lib/utils';
import {
  Rocket,
  Sprout,
  TrendingUp,
  Zap,
  Building2,
  Crown,
  Globe,
  Flag,
  CheckCircle,
  Circle,
  LucideIcon,
} from 'lucide-react';

export type LifecycleStage =
  | 'bootstrap'
  | 'seed'
  | 'early_growth'
  | 'growth'
  | 'scaling'
  | 'pre_ipo'
  | 'public'
  | 'exit_ready';

interface StageConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

const stageConfigs: Record<LifecycleStage, StageConfig> = {
  bootstrap: {
    label: 'Bootstrap',
    icon: Rocket,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-900',
    borderColor: 'border-slate-200 dark:border-slate-800',
    description: 'Initial setup and foundation',
  },
  seed: {
    label: 'Seed',
    icon: Sprout,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Early product development',
  },
  early_growth: {
    label: 'Early Growth',
    icon: TrendingUp,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    description: 'Market validation and traction',
  },
  growth: {
    label: 'Growth',
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    borderColor: 'border-purple-200 dark:border-purple-800',
    description: 'Rapid expansion phase',
  },
  scaling: {
    label: 'Scaling',
    icon: Building2,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900',
    borderColor: 'border-pink-200 dark:border-pink-800',
    description: 'Enterprise-level operations',
  },
  pre_ipo: {
    label: 'Pre-IPO',
    icon: Crown,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
    borderColor: 'border-orange-200 dark:border-orange-800',
    description: 'Preparing for public offering',
  },
  public: {
    label: 'Public',
    icon: Globe,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'Publicly traded company',
  },
  exit_ready: {
    label: 'Exit Ready',
    icon: Flag,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900',
    borderColor: 'border-teal-200 dark:border-teal-800',
    description: 'Ready for acquisition or exit',
  },
};

const stageOrder: LifecycleStage[] = [
  'bootstrap',
  'seed',
  'early_growth',
  'growth',
  'scaling',
  'pre_ipo',
  'public',
  'exit_ready',
];

interface LifecycleStageIndicatorProps {
  currentStage: LifecycleStage;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LifecycleStageIndicator({
  currentStage,
  showLabel = true,
  size = 'md',
  className,
}: LifecycleStageIndicatorProps) {
  const config = stageConfigs[currentStage];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          config.bgColor,
          sizeClasses[size]
        )}
      >
        <Icon className={cn(iconSizes[size], config.color)} />
      </div>
      {showLabel && (
        <span className={cn('font-medium', config.color, sizeClasses[size])}>
          {config.label}
        </span>
      )}
    </div>
  );
}

interface LifecycleStageProgressProps {
  currentStage: LifecycleStage;
  completedStages?: LifecycleStage[];
  showLabels?: boolean;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

export function LifecycleStageProgress({
  currentStage,
  completedStages = [],
  showLabels = false,
  variant = 'horizontal',
  className,
}: LifecycleStageProgressProps) {
  const currentIndex = stageOrder.indexOf(currentStage);

  return (
    <div
      className={cn(
        variant === 'horizontal'
          ? 'flex items-center gap-1'
          : 'flex flex-col gap-2',
        className
      )}
    >
      {stageOrder.map((stage, index) => {
        const config = stageConfigs[stage];
        const Icon = config.icon;
        const isCompleted = completedStages.includes(stage) || index < currentIndex;
        const isCurrent = stage === currentStage;
        const isFuture = index > currentIndex;

        return (
          <div
            key={stage}
            className={cn(
              'flex items-center',
              variant === 'horizontal' ? 'flex-col' : 'gap-3'
            )}
          >
            {/* Connector line (horizontal) */}
            {variant === 'horizontal' && index > 0 && (
              <div
                className={cn(
                  'h-0.5 w-8 -mt-4',
                  isCompleted || isCurrent ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}

            <div className="relative flex items-center">
              {/* Connector line (vertical) */}
              {variant === 'vertical' && index > 0 && (
                <div
                  className={cn(
                    'absolute -top-4 left-4 w-0.5 h-4',
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}

              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                  isCompleted && 'bg-primary border-primary',
                  isCurrent && cn(config.bgColor, config.borderColor),
                  isFuture && 'bg-muted border-muted-foreground/20'
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-primary-foreground" />
                ) : isCurrent ? (
                  <Icon className={cn('h-4 w-4', config.color)} />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40" />
                )}
              </div>

              {showLabels && (
                <div
                  className={cn(
                    'ml-3',
                    variant === 'horizontal' && 'absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap'
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isCompleted && 'text-primary',
                      isCurrent && config.color,
                      isFuture && 'text-muted-foreground'
                    )}
                  >
                    {config.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface LifecycleStageBadgeProps {
  stage: LifecycleStage;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function LifecycleStageBadge({
  stage,
  size = 'md',
  showIcon = true,
  className,
}: LifecycleStageBadgeProps) {
  const config = stageConfigs[stage];
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
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        config.bgColor,
        config.borderColor,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}

// Export stage utilities
export { stageConfigs, stageOrder };
