/**
 * Standardized Loading States
 * Consistent loading components for different UI contexts
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSpinnerProps {
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * Optional label (hidden visually, for screen readers)
   */
  label?: string;
  
  /**
   * Additional className
   */
  className?: string;
}

/**
 * Centered loading spinner (for full-page or section loading)
 */
export function LoadingSpinner({ 
  size = 'md', 
  label = 'Loading...',
  className 
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  
  return (
    <div 
      className={cn('flex items-center justify-center py-12', className)}
      role="status"
    >
      <Loader2 className={cn('animate-spin text-primary', sizes[size])} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Inline loading spinner (for buttons, inline content)
 */
export function InlineSpinner({ 
  size = 'sm',
  label = 'Loading...',
  className 
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6',
  };
  
  return (
    <>
      <Loader2 className={cn('animate-spin', sizes[size], className)} />
      <span className="sr-only">{label}</span>
    </>
  );
}

/**
 * Loading skeleton for card
 */
export function LoadingCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border p-6 space-y-4', className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="pt-2">
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Loading skeleton for table row
 */
export function LoadingTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Loading skeleton for list item
 */
export function LoadingListItem({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 p-4 border-b', className)}>
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

/**
 * Loading skeleton for dashboard stats
 */
export function LoadingStatsCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/**
 * Full page loading (covers entire page)
 */
export function LoadingPage({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Loading overlay (semi-transparent over content)
 */
export function LoadingOverlay({ 
  message,
  show = true 
}: { 
  message?: string;
  show?: boolean;
}) {
  if (!show) return null;
  
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-40">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
