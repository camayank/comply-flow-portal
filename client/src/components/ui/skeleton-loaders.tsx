import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Standardized Skeleton Loading Components
interface SkeletonCardProps {
  className?: string;
  hasHeader?: boolean;
  hasActions?: boolean;
}

export function SkeletonCard({ className, hasHeader = true, hasActions = false }: SkeletonCardProps) {
  return (
    <Card className={cn("", className)} data-testid="skeleton-card">
      {hasHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            {hasActions && <Skeleton className="h-8 w-20" />}
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
      )}
      <CardContent className={hasHeader ? "" : "pt-6"}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

interface SkeletonMetricCardProps {
  className?: string;
}

export function SkeletonMetricCard({ className }: SkeletonMetricCardProps) {
  return (
    <Card className={cn("", className)} data-testid="skeleton-metric-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn("space-y-4", className)} data-testid="skeleton-table">
      {/* Table Header */}
      <div className="flex gap-4 pb-2">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonListProps {
  items?: number;
  className?: string;
  showAvatar?: boolean;
  showActions?: boolean;
}

export function SkeletonList({ items = 5, className, showAvatar = false, showActions = false }: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)} data-testid="skeleton-list">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3 flex-1">
            {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface SkeletonChartProps {
  type?: 'bar' | 'line' | 'pie' | 'area';
  className?: string;
}

export function SkeletonChart({ type = 'bar', className }: SkeletonChartProps) {
  return (
    <Card className={cn("", className)} data-testid="skeleton-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        {type === 'bar' && (
          <div className="flex items-end justify-between h-40 gap-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton 
                key={index} 
                className="w-full" 
                style={{ height: `${Math.random() * 80 + 20}%` }}
              />
            ))}
          </div>
        )}
        
        {type === 'line' && (
          <div className="h-40 relative">
            <Skeleton className="absolute inset-0 rounded-lg" />
            <div className="absolute inset-4 flex items-center justify-between">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-2 w-2 rounded-full" />
              ))}
            </div>
          </div>
        )}
        
        {type === 'pie' && (
          <div className="flex items-center justify-center h-40">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
        )}
        
        {type === 'area' && (
          <div className="h-40 relative">
            <Skeleton className="absolute inset-0 rounded-lg" />
          </div>
        )}
        
        {/* Legend */}
        <div className="flex gap-4 mt-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-sm" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SkeletonFormProps {
  fields?: number;
  className?: string;
  hasSubmitButton?: boolean;
}

export function SkeletonForm({ fields = 5, className, hasSubmitButton = true }: SkeletonFormProps) {
  return (
    <div className={cn("space-y-4", className)} data-testid="skeleton-form">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {hasSubmitButton && (
        <div className="flex gap-2 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      )}
    </div>
  );
}

interface SkeletonGridProps {
  items?: number;
  columns?: number;
  className?: string;
  cardType?: 'metric' | 'content' | 'image';
}

export function SkeletonGrid({ 
  items = 8, 
  columns = 4, 
  className,
  cardType = 'content' 
}: SkeletonGridProps) {
  const gridClass = columns === 2 ? "grid-cols-1 md:grid-cols-2" :
                    columns === 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
                    "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn(`grid ${gridClass} gap-6`, className)} data-testid="skeleton-grid">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index}>
          {cardType === 'metric' && <SkeletonMetricCard />}
          {cardType === 'content' && <SkeletonCard />}
          {cardType === 'image' && (
            <Card>
              <CardContent className="p-0">
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}

interface SkeletonNavigationProps {
  items?: number;
  className?: string;
  showIcons?: boolean;
}

export function SkeletonNavigation({ items = 6, className, showIcons = true }: SkeletonNavigationProps) {
  return (
    <nav className={cn("space-y-2", className)} data-testid="skeleton-navigation">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-2 p-2 rounded-lg">
          {showIcons && <Skeleton className="h-4 w-4" />}
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </nav>
  );
}

interface SkeletonHeaderProps {
  className?: string;
  showActions?: boolean;
  showBreadcrumb?: boolean;
}

export function SkeletonHeader({ className, showActions = true, showBreadcrumb = false }: SkeletonHeaderProps) {
  return (
    <div className={cn("border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950", className)} data-testid="skeleton-header">
      <div className="px-6 py-4">
        {showBreadcrumb && (
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-3 w-16" />
            <span className="text-gray-400">/</span>
            <Skeleton className="h-3 w-20" />
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-48 mb-1" />
            <Skeleton className="h-4 w-64" />
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SkeletonStatsProps {
  items?: number;
  className?: string;
}

export function SkeletonStats({ items = 4, className }: SkeletonStatsProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)} data-testid="skeleton-stats">
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonMetricCard key={index} />
      ))}
    </div>
  );
}

// Loading Screen Component
interface LoadingScreenProps {
  type?: 'dashboard' | 'table' | 'form' | 'chart' | 'minimal';
  className?: string;
}

export function LoadingScreen({ type = 'dashboard', className }: LoadingScreenProps) {
  return (
    <div className={cn("p-6 space-y-6", className)} data-testid="loading-screen">
      <SkeletonHeader />
      
      {type === 'dashboard' && (
        <>
          <SkeletonStats />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart type="bar" />
            <SkeletonChart type="line" />
          </div>
          <SkeletonGrid items={6} columns={3} />
        </>
      )}
      
      {type === 'table' && (
        <SkeletonTable rows={10} columns={5} />
      )}
      
      {type === 'form' && (
        <div className="max-w-2xl">
          <SkeletonForm fields={8} />
        </div>
      )}
      
      {type === 'chart' && (
        <SkeletonChart type="area" />
      )}
      
      {type === 'minimal' && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
    </div>
  );
}

// Loading States Hook for different data states
export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
}

interface LoadingWrapperProps {
  state: LoadingState;
  loadingComponent: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  children: React.ReactNode;
}

export function LoadingWrapper({ 
  state, 
  loadingComponent, 
  errorComponent, 
  emptyComponent, 
  children 
}: LoadingWrapperProps) {
  if (state.isLoading) return <>{loadingComponent}</>;
  if (state.isError) return errorComponent || <div>Error loading data</div>;
  if (state.isEmpty) return emptyComponent || <div>No data available</div>;
  return <>{children}</>;
}