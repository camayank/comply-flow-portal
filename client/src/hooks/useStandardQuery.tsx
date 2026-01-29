/**
 * Standard Query Hook
 * Provides consistent data fetching patterns with built-in loading, error, and empty states
 * 
 * @example
 * const { data, render } = useStandardQuery({
 *   queryKey: ['tasks'],
 *   queryFn: () => fetch('/api/tasks').then(r => r.json()),
 *   emptyState: {
 *     title: 'No tasks found',
 *     description: 'Create your first task to get started',
 *   }
 * });
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface StandardQueryOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  queryKey: unknown[];
  queryFn: () => Promise<TData>;
  
  /**
   * Custom loading component (defaults to centered spinner)
   */
  loadingComponent?: ReactNode;
  
  /**
   * Custom error component (defaults to error alert with retry)
   */
  errorComponent?: (error: TError, retry: () => void) => ReactNode;
  
  /**
   * Empty state configuration (shown when data is empty array or null)
   */
  emptyState?: {
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
    icon?: React.ComponentType<{ className?: string }>;
  };
  
  /**
   * Function to check if data is empty (defaults to checking for empty array or null)
   */
  isEmpty?: (data: TData) => boolean;
}

interface StandardQueryResult<TData> {
  /**
   * The fetched data (only available when successful and not loading)
   */
  data: TData | undefined;
  
  /**
   * Loading state
   */
  isLoading: boolean;
  
  /**
   * Error state
   */
  isError: boolean;
  
  /**
   * Error object
   */
  error: Error | null;
  
  /**
   * Refetch function
   */
  refetch: () => void;
  
  /**
   * Render helper that automatically handles loading/error/empty states
   * Returns the render function result when data is ready
   */
  render: (renderFn: (data: TData) => ReactNode) => ReactNode;
}

/**
 * Default loading component
 */
function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center py-12" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Default error component
 */
function DefaultErrorComponent({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error loading data</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{error.message || 'An unexpected error occurred'}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={retry}
        >
          Try Again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Default empty check function
 */
function defaultIsEmpty<T>(data: T): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') return Object.keys(data).length === 0;
  return false;
}

/**
 * Standard query hook with consistent UX patterns
 */
export function useStandardQuery<TData = unknown, TError = Error>(
  options: StandardQueryOptions<TData, TError>
): StandardQueryResult<TData> {
  const {
    queryKey,
    queryFn,
    loadingComponent,
    errorComponent,
    emptyState,
    isEmpty = defaultIsEmpty,
    ...queryOptions
  } = options;

  const query = useQuery<TData, TError>({
    queryKey,
    queryFn,
    ...queryOptions,
  });

  const render = (renderFn: (data: TData) => ReactNode): ReactNode => {
    // Loading state
    if (query.isLoading) {
      return loadingComponent || <DefaultLoadingComponent />;
    }

    // Error state
    if (query.isError && query.error) {
      if (errorComponent) {
        return errorComponent(query.error, query.refetch);
      }
      return <DefaultErrorComponent error={query.error as Error} retry={query.refetch} />;
    }

    // Empty state
    if (query.data && isEmpty(query.data)) {
      if (emptyState) {
        return (
          <EmptyState
            icon={emptyState.icon}
            title={emptyState.title}
            description={emptyState.description}
            action={emptyState.action}
          />
        );
      }
    }

    // Data ready - render the content
    if (query.data) {
      return renderFn(query.data);
    }

    return null;
  };

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    render,
  };
}
