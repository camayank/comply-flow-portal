import apiClient from './api';

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'CLIENT' | 'SALES' | 'OPERATIONS' | 'ADMIN' | 'AGENT' | 'SUPER_ADMIN';
  password?: string;
}

export interface CreateServiceData {
  name: string;
  category: string;
  subCategory?: string;
  description: string;
  basePrice: number;
  timeline: string;
  requiredDocuments: string[];
  isActive?: boolean;
  tags?: string[];
}

export const adminService = {
  // Get admin dashboard
  getDashboard: async () => {
    const response = await apiClient.get('/admin/dashboard');
    return response.data;
  },

  // User Management
  getUsers: async (filters?: any) => {
    const response = await apiClient.get('/admin/users', { params: filters });
    return response.data;
  },

  createUser: async (data: CreateUserData) => {
    const response = await apiClient.post('/admin/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: Partial<CreateUserData>) => {
    const response = await apiClient.patch(`/admin/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  },

  // Service Management
  getServices: async (filters?: any) => {
    const response = await apiClient.get('/admin/services', { params: filters });
    return response.data;
  },

  createService: async (data: CreateServiceData) => {
    const response = await apiClient.post('/admin/services', data);
    return response.data;
  },

  updateService: async (id: string, data: Partial<CreateServiceData>) => {
    const response = await apiClient.patch(`/admin/services/${id}`, data);
    return response.data;
  },

  deleteService: async (id: string) => {
    const response = await apiClient.delete(`/admin/services/${id}`);
    return response.data;
  },

  // Agent Management
  getAgents: async (filters?: any) => {
    const response = await apiClient.get('/admin/agents', { params: filters });
    return response.data;
  },

  createAgent: async (data: any) => {
    const response = await apiClient.post('/admin/agents', data);
    return response.data;
  },

  updateAgent: async (id: string, data: any) => {
    const response = await apiClient.patch(`/admin/agents/${id}`, data);
    return response.data;
  },

  approveAgent: async (id: string) => {
    const response = await apiClient.post(`/admin/agents/${id}/approve`);
    return response.data;
  },

  rejectAgent: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/admin/agents/${id}/reject`, { reason });
    return response.data;
  },

  // Commission Management
  getCommissions: async (filters?: any) => {
    const response = await apiClient.get('/admin/commissions', { params: filters });
    return response.data;
  },

  approveCommission: async (id: string) => {
    const response = await apiClient.post(`/admin/commissions/${id}/approve`);
    return response.data;
  },

  bulkApproveCommissions: async (ids: string[]) => {
    const response = await apiClient.post('/admin/commissions/bulk-approve', { ids });
    return response.data;
  },

  // Reports
  getRevenueReport: async (startDate: string, endDate: string) => {
    const response = await apiClient.get('/admin/reports/revenue', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getClientReport: async (startDate: string, endDate: string) => {
    const response = await apiClient.get('/admin/reports/clients', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getServiceReport: async (startDate: string, endDate: string) => {
    const response = await apiClient.get('/admin/reports/services', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getPerformanceReport: async (startDate: string, endDate: string) => {
    const response = await apiClient.get('/admin/reports/performance', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // Settings
  getSettings: async () => {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  updateSettings: async (data: any) => {
    const response = await apiClient.put('/admin/settings', data);
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (filters?: any) => {
    const response = await apiClient.get('/admin/audit-logs', { params: filters });
    return response.data;
  },

  // Email Templates
  getEmailTemplates: async () => {
    const response = await apiClient.get('/admin/email-templates');
    return response.data;
  },

  updateEmailTemplate: async (id: string, data: any) => {
    const response = await apiClient.put(`/admin/email-templates/${id}`, data);
    return response.data;
  },
};
