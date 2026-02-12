import apiClient from './api';

export interface RegisterAgentData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName?: string;
  pan?: string;
  gstin?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
}

export interface SubmitLeadData {
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  interestedServices?: string[];
  notes?: string;
}

export const agentService = {
  // Register as agent
  register: async (data: RegisterAgentData) => {
    const response = await apiClient.post('/agents/register', data);
    return response.data;
  },

  // Get agent dashboard
  getDashboard: async () => {
    const response = await apiClient.get('/agents/dashboard');
    return response.data;
  },

  // Get agent profile
  getProfile: async () => {
    const response = await apiClient.get('/agents/profile');
    return response.data;
  },

  // Update agent profile
  updateProfile: async (data: Partial<RegisterAgentData>) => {
    const response = await apiClient.put('/agents/profile', data);
    return response.data;
  },

  // Submit lead
  submitLead: async (data: SubmitLeadData) => {
    const response = await apiClient.post('/agents/leads', data);
    return response.data;
  },

  // Get agent leads
  getLeads: async (filters?: any) => {
    const response = await apiClient.get('/agents/leads', { params: filters });
    return response.data;
  },

  // Get commissions
  getCommissions: async (filters?: any) => {
    const response = await apiClient.get('/api/agent/commissions', { params: filters });
    return response.data;
  },

  // Get commission summary
  getCommissionSummary: async (period?: string) => {
    const response = await apiClient.get('/api/agent/commissions/summary', {
      params: { period },
    });
    return response.data;
  },

  // Get payouts
  getPayouts: async (filters?: any) => {
    const response = await apiClient.get('/agents/payouts', { params: filters });
    return response.data;
  },

  // Request payout
  requestPayout: async (amount: number) => {
    const response = await apiClient.post('/agents/payouts/request', { amount });
    return response.data;
  },

  // Get performance metrics
  getPerformanceMetrics: async (period?: string) => {
    const response = await apiClient.get('/agents/performance', { params: { period } });
    return response.data;
  },

  // Get referral link
  getReferralLink: async () => {
    const response = await apiClient.get('/agents/referral-link');
    return response.data;
  },
};
