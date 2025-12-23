/**
 * Skeleton Loader Components
 * Provides consistent loading states across the platform
 */

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton component for custom loading states
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton bg-muted rounded skeleton-shimmer", className)}
      aria-label="Loading..."
      role="status"
    />
  );
}

/**
 * Skeleton for text content
 */
export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} />;
}

/**
 * Skeleton for titles/headings
 */
export function SkeletonTitle({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-6 w-3/4", className)} />;
}

/**
 * Skeleton for avatar/profile images
 */
export function SkeletonAvatar({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />;
}

/**
 * Skeleton for rectangular images
 */
export function SkeletonImage({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-48 w-full", className)} />;
}

/**
 * Skeleton for card components
 */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 space-y-4", className)}>
      <SkeletonTitle />
      <SkeletonText />
      <SkeletonText className="w-5/6" />
      <SkeletonText className="w-4/6" />
    </div>
  );
}

/**
 * Skeleton for table rows
 */
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 py-3 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonText key={i} className="flex-1" />
      ))}
    </div>
  );
}

/**
 * Skeleton for entire table
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-label="Loading table...">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </div>
  );
}

/**
 * Skeleton for list items
 */
export function SkeletonListItem({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center gap-3 py-3", className)}>
      <SkeletonAvatar className="h-8 w-8" />
      <div className="flex-1 space-y-2">
        <SkeletonText className="w-1/2" />
        <SkeletonText className="w-1/3 h-3" />
      </div>
    </div>
  );
}

/**
 * Skeleton for entire list
 */
export function SkeletonList({ items = 5, className }: { items?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-label="Loading list...">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for dashboard metrics/stats
 */
export function SkeletonStat({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 space-y-3", className)}>
      <SkeletonText className="w-1/3 h-3" />
      <Skeleton className="h-8 w-2/3" />
      <SkeletonText className="w-1/2 h-3" />
    </div>
  );
}

/**
 * Skeleton for dashboard grid
 */
export function SkeletonDashboard({
  stats = 4,
  className
}: {
  stats?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {Array.from({ length: stats }).map((_, i) => (
        <SkeletonStat key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for forms
 */
export function SkeletonForm({ fields = 3, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)} role="status" aria-label="Loading form...">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonText className="w-1/4 h-3" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Full page loading skeleton
 */
export function SkeletonPage({ className }: SkeletonProps) {
  return (
    <div className={cn("min-h-screen bg-background p-4 md:p-8 space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonTitle className="w-1/3" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats */}
      <SkeletonDashboard />

      {/* Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Table */}
      <SkeletonCard>
        <SkeletonTable />
      </SkeletonCard>
    </div>
  );
}
