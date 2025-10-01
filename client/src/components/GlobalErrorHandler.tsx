import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export function GlobalErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      toast({
        title: 'Unexpected Error',
        description: 'An unexpected error occurred. Please refresh the page.',
        variant: 'destructive',
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      toast({
        title: 'Request Failed',
        description: event.reason?.message || 'A request failed. Please try again.',
        variant: 'destructive',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
