import apiClient from './api';

export interface CreateLeadData {
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  source: 'WEBSITE' | 'REFERRAL' | 'AGENT' | 'DIRECT' | 'MARKETING';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CreateProposalData {
  leadId?: string;
  clientId?: string;
  title: string;
  description: string;
  services: Array<{
    serviceId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  validUntil: string;
  termsAndConditions?: string;
}

export const salesService = {
  // Get sales dashboard
  getDashboard: async () => {
    const response = await apiClient.get('/sales/dashboard');
    return response.data;
  },

  // Get pipeline
  getPipeline: async (filters?: any) => {
    const response = await apiClient.get('/sales/pipeline', { params: filters });
    return response.data;
  },

  // Get leads
  getLeads: async (filters?: any) => {
    const response = await apiClient.get('/sales/leads', { params: filters });
    return response.data;
  },

  // Create lead
  createLead: async (data: CreateLeadData) => {
    const response = await apiClient.post('/sales/leads', data);
    return response.data;
  },

  // Get lead by ID
  getLeadById: async (id: string) => {
    const response = await apiClient.get(`/sales/leads/${id}`);
    return response.data;
  },

  // Update lead
  updateLead: async (id: string, data: Partial<CreateLeadData>) => {
    const response = await apiClient.patch(`/sales/leads/${id}`, data);
    return response.data;
  },

  // Update lead stage
  updateLeadStage: async (id: string, stage: string) => {
    const response = await apiClient.patch(`/sales/leads/${id}/stage`, { stage });
    return response.data;
  },

  // Add lead activity
  addLeadActivity: async (leadId: string, activity: any) => {
    const response = await apiClient.post(`/sales/leads/${leadId}/activities`, activity);
    return response.data;
  },

  // Send email to lead
  sendEmailToLead: async (leadId: string, emailData: any) => {
    const response = await apiClient.post(`/sales/leads/${leadId}/send-email`, emailData);
    return response.data;
  },

  // Convert lead to client
  convertLead: async (leadId: string) => {
    const response = await apiClient.post(`/sales/leads/${leadId}/convert`);
    return response.data;
  },

  // Get proposals
  getProposals: async (filters?: any) => {
    const response = await apiClient.get('/sales/proposals', { params: filters });
    return response.data;
  },

  // Create proposal
  createProposal: async (data: CreateProposalData) => {
    const response = await apiClient.post('/sales/proposals', data);
    return response.data;
  },

  // Get proposal by ID
  getProposalById: async (id: string) => {
    const response = await apiClient.get(`/sales/proposals/${id}`);
    return response.data;
  },

  // Update proposal
  updateProposal: async (id: string, data: Partial<CreateProposalData>) => {
    const response = await apiClient.patch(`/sales/proposals/${id}`, data);
    return response.data;
  },

  // Send proposal
  sendProposal: async (id: string) => {
    const response = await apiClient.post(`/sales/proposals/${id}/send`);
    return response.data;
  },

  // Accept proposal
  acceptProposal: async (id: string) => {
    const response = await apiClient.post(`/sales/proposals/${id}/accept`);
    return response.data;
  },

  // Reject proposal
  rejectProposal: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/sales/proposals/${id}/reject`, { reason });
    return response.data;
  },
};
