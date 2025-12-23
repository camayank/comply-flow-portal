import { useState, useCallback } from 'react';
import { handleApiError } from '@/services/api';
import { toast } from 'sonner';

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

export function useApi<T = any, P extends any[] = any[]>(
  apiFunction: (...args: P) => Promise<T>,
  options: UseApiOptions = {}
) {
  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Operation successful',
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: P) => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiFunction(...args);
        setData(result);

        if (showSuccessToast) {
          toast.success(successMessage);
        }

        return result;
      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(errorMessage);

        if (showErrorToast) {
          toast.error(errorMessage);
        }

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, showSuccessToast, showErrorToast, successMessage]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}
