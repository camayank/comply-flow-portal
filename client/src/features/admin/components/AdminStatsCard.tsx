import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
    positive?: boolean;
  };
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const variantStyles = {
  default: 'bg-card',
  success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20',
  danger: 'bg-red-50 border-red-200 dark:bg-red-950/20',
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20',
};

const iconVariantStyles = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50',
  danger: 'bg-red-100 text-red-600 dark:bg-red-900/50',
  info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50',
};

export function AdminStatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  variant = 'default',
}: AdminStatsCardProps) {
  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn('rounded-md p-2', iconVariantStyles[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {trend && (
              <span
                className={cn(
                  'font-medium',
                  trend.positive ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
            )}
            {description || trend?.label}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AdminStatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
}

export function AdminStatsGrid({ children, columns = 4 }: AdminStatsGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-3 lg:grid-cols-5',
  };

  return (
    <div className={cn('grid gap-4 grid-cols-1', gridCols[columns])}>
      {children}
    </div>
  );
}
