/**
 * Standard Mutation Hook
 * Provides consistent mutation patterns with automatic error handling and success feedback
 * 
 * @example
 * const createTask = useStandardMutation({
 *   mutationFn: (data) => apiRequest('/api/tasks', { method: 'POST', body: data }),
 *   successMessage: 'Task created successfully',
 *   onSuccess: () => queryClient.invalidateQueries(['tasks']),
 * });
 */

import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface StandardMutationOptions<TData = unknown, TVariables = unknown, TError = Error> 
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'onSuccess' | 'onError'> {
  
  /**
   * Success toast message (can be a string or function that returns a string based on the data)
   */
  successMessage?: string | ((data: TData) => string);
  
  /**
   * Error toast message (defaults to error.message)
   */
  errorMessage?: string | ((error: TError) => string);
  
  /**
   * Whether to show a success toast (defaults to true if successMessage is provided)
   */
  showSuccessToast?: boolean;
  
  /**
   * Whether to show an error toast (defaults to true)
   */
  showErrorToast?: boolean;
  
  /**
   * Query keys to invalidate on success
   */
  invalidateQueries?: unknown[][];
  
  /**
   * Callback on success (after toast and invalidation)
   */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  
  /**
   * Callback on error (after toast)
   */
  onError?: (error: TError, variables: TVariables) => void | Promise<void>;
}

/**
 * Standard mutation hook with consistent UX patterns
 */
export function useStandardMutation<TData = unknown, TVariables = unknown, TError = Error>(
  options: StandardMutationOptions<TData, TVariables, TError>
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    successMessage,
    errorMessage,
    showSuccessToast = !!successMessage,
    showErrorToast = true,
    invalidateQueries,
    onSuccess,
    onError,
    ...mutationOptions
  } = options;

  return useMutation<TData, TError, TVariables>({
    ...mutationOptions,
    onSuccess: async (data, variables, context) => {
      // Show success toast
      if (showSuccessToast && successMessage) {
        const message = typeof successMessage === 'function' 
          ? successMessage(data) 
          : successMessage;
        
        toast({
          title: 'Success',
          description: message,
          variant: 'default',
        });
      }
      
      // Invalidate queries
      if (invalidateQueries) {
        await Promise.all(
          invalidateQueries.map(queryKey => 
            queryClient.invalidateQueries({ queryKey })
          )
        );
      }
      
      // Call custom onSuccess
      if (onSuccess) {
        await onSuccess(data, variables);
      }
    },
    onError: async (error, variables, context) => {
      // Show error toast
      if (showErrorToast) {
        const message = errorMessage
          ? (typeof errorMessage === 'function' ? errorMessage(error) : errorMessage)
          : (error as Error).message || 'An error occurred';
        
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }
      
      // Call custom onError
      if (onError) {
        await onError(error, variables);
      }
    },
  });
}
