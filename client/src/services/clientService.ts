import apiClient from './api';

export const clientService = {
  // Get client dashboard data
  getDashboard: async () => {
    const response = await apiClient.get('/client/dashboard');
    return response.data;
  },

  // Get client profile
  getProfile: async () => {
    const response = await apiClient.get('/client/profile');
    return response.data;
  },

  // Update client profile
  updateProfile: async (data: any) => {
    const response = await apiClient.put('/client/profile', data);
    return response.data;
  },

  // Get client services
  getServices: async (filters?: any) => {
    const response = await apiClient.get('/client/services', { params: filters });
    return response.data;
  },

  // Get service by ID
  getServiceById: async (id: string) => {
    const response = await apiClient.get(`/client/services/${id}`);
    return response.data;
  },

  // Get client documents
  getDocuments: async (filters?: any) => {
    const response = await apiClient.get('/client/documents', { params: filters });
    return response.data;
  },

  // Upload document
  uploadDocument: async (serviceId: string, formData: FormData) => {
    const response = await apiClient.post(
      `/client/services/${serviceId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Delete document
  deleteDocument: async (documentId: string) => {
    const response = await apiClient.delete(`/client/documents/${documentId}`);
    return response.data;
  },

  // Get compliance calendar
  getComplianceCalendar: async (filters?: any) => {
    const response = await apiClient.get('/client/compliance-calendar', { params: filters });
    return response.data;
  },

  // Get payments
  getPayments: async (filters?: any) => {
    const response = await apiClient.get('/client/payments', { params: filters });
    return response.data;
  },

  // Get wallet balance
  getWalletBalance: async () => {
    const response = await apiClient.get('/wallet/balance');
    return response.data;
  },

  // Add funds to wallet
  addFundsToWallet: async (amount: number) => {
    const response = await apiClient.post('/wallet/add-funds', { amount });
    return response.data;
  },

  // Get invoices
  getInvoices: async (filters?: any) => {
    const response = await apiClient.get('/client/invoices', { params: filters });
    return response.data;
  },

  // Download invoice
  downloadInvoice: async (invoiceId: string) => {
    const response = await apiClient.get(`/client/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
