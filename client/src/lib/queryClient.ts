import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// Auth redirect handler for 401/403 errors
function handleAuthError(status: number) {
  if (status === 401 || status === 403) {
    // Clear any stale session data
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });

    // Redirect to login page
    const currentPath = window.location.pathname;
    const loginPath = '/login';

    // Avoid redirect loop if already on login page
    if (currentPath !== loginPath && !currentPath.startsWith('/login')) {
      // Store current path to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      window.location.href = loginPath;
    }

    return true; // Handled
  }
  return false; // Not handled
}

const DEFAULT_QUERY_FN = async ({ queryKey }: { queryKey: readonly unknown[] }) => {
  const url = queryKey[0] as string;
  const response = await fetch(url, {
    credentials: 'include', // Include cookies for session
  });

  if (!response.ok) {
    // Handle auth errors with redirect
    if (handleAuthError(response.status)) {
      throw new Error('Authentication required');
    }

    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(errorData.error || `Network error: ${response.status}`);
  }

  return response.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: DEFAULT_QUERY_FN,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 404 or auth errors
        if (error instanceof Error) {
          if (error.message.includes('404') || error.message.includes('Authentication required')) {
            return false;
          }
        }
        return failureCount < 3;
      },
    },
    mutations: {
      onError: (error: Error) => {
        // Don't show toast for auth errors (user is being redirected)
        if (!error.message.includes('Authentication required')) {
          toast({
            title: 'Error',
            description: error.message || 'An error occurred. Please try again.',
            variant: 'destructive',
          });
        }
      },
    },
  },
});

export const apiRequest = async (method: string, url: string, data?: any) => {
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
    },
    credentials: 'include', // Include cookies for session
    ...(data && { body: JSON.stringify(data) }),
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    // Handle auth errors with redirect
    if (handleAuthError(response.status)) {
      throw new Error('Authentication required');
    }

    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Utility functions for common API patterns
export const createServiceRequest = async (serviceIds: string[], userId?: number) => {
  return apiRequest('POST', '/api/service-requests', {
    serviceId: serviceIds.length === 1 ? serviceIds[0] : serviceIds,
    userId,
    status: 'initiated'
  });
};

export const uploadDocuments = async (serviceRequestId: number, documents: File[]) => {
  const documentData = await Promise.all(
    documents.map(async (file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      content: await file.text(), // In real implementation, this would be base64 or file upload
    }))
  );

  return apiRequest('POST', `/api/service-requests/${serviceRequestId}/documents`, { documents: documentData });
};

export const verifyPaymentAmount = async (serviceRequestId: number) => {
  return apiRequest('GET', `/api/payment/verify/${serviceRequestId}`);
};

export const processPayment = async (serviceRequestId: number, paymentMethod: string, amount: number) => {
  return apiRequest('POST', '/api/payments', {
    serviceRequestId,
    paymentMethod,
    amount,
  });
};

export const signDocuments = async (serviceRequestId: number, signature: string, documentHash: string) => {
  return apiRequest('POST', `/api/service-requests/${serviceRequestId}/sign`, {
    signature,
    documentHash,
  });
};