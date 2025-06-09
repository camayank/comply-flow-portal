import { QueryClient } from '@tanstack/react-query';

const DEFAULT_QUERY_FN = async ({ queryKey }: { queryKey: readonly unknown[] }) => {
  const url = queryKey[0] as string;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Network error: ${response.status}`);
  }
  
  return response.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: DEFAULT_QUERY_FN,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('404')) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

export const apiRequest = async (method: string, url: string, data?: any) => {
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...(data && { body: JSON.stringify(data) }),
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
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

  return apiRequest(`/api/service-requests/${serviceRequestId}/documents`, {
    method: 'POST',
    body: JSON.stringify({ documents: documentData }),
  });
};

export const verifyPaymentAmount = async (serviceRequestId: number) => {
  return apiRequest(`/api/payment/verify/${serviceRequestId}`);
};

export const processPayment = async (serviceRequestId: number, paymentMethod: string, amount: number) => {
  return apiRequest('/api/payments', {
    method: 'POST',
    body: JSON.stringify({
      serviceRequestId,
      paymentMethod,
      amount,
    }),
  });
};

export const signDocuments = async (serviceRequestId: number, signature: string, documentHash: string) => {
  return apiRequest(`/api/service-requests/${serviceRequestId}/sign`, {
    method: 'POST',
    body: JSON.stringify({
      signature,
      documentHash,
    }),
  });
};