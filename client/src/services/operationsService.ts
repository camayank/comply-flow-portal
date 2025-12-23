import apiClient from './api';

export interface CreateTaskData {
  title: string;
  description: string;
  serviceInstanceId?: string;
  assignedTo?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  metadata?: Record<string, any>;
}

export const operationsService = {
  // Get operations dashboard
  getDashboard: async () => {
    const response = await apiClient.get('/operations/dashboard');
    return response.data;
  },

  // Get tasks
  getTasks: async (filters?: any) => {
    const response = await apiClient.get('/operations/tasks', { params: filters });
    return response.data;
  },

  // Create task
  createTask: async (data: CreateTaskData) => {
    const response = await apiClient.post('/operations/tasks', data);
    return response.data;
  },

  // Get task by ID
  getTaskById: async (id: string) => {
    const response = await apiClient.get(`/operations/tasks/${id}`);
    return response.data;
  },

  // Update task
  updateTask: async (id: string, data: Partial<CreateTaskData>) => {
    const response = await apiClient.patch(`/operations/tasks/${id}`, data);
    return response.data;
  },

  // Start task
  startTask: async (id: string) => {
    const response = await apiClient.post(`/operations/tasks/${id}/start`);
    return response.data;
  },

  // Complete task
  completeTask: async (id: string, notes?: string) => {
    const response = await apiClient.post(`/operations/tasks/${id}/complete`, { notes });
    return response.data;
  },

  // Request documents for task
  requestDocuments: async (id: string, documents: string[]) => {
    const response = await apiClient.post(`/operations/tasks/${id}/request-documents`, {
      documents,
    });
    return response.data;
  },

  // Get government filings
  getGovernmentFilings: async (filters?: any) => {
    const response = await apiClient.get('/operations/government-filings', {
      params: filters,
    });
    return response.data;
  },

  // Update government filing
  updateGovernmentFiling: async (id: string, data: any) => {
    const response = await apiClient.patch(`/operations/government-filings/${id}`, data);
    return response.data;
  },

  // Get workflows
  getWorkflows: async (filters?: any) => {
    const response = await apiClient.get('/operations/workflows', { params: filters });
    return response.data;
  },

  // Get workflow by ID
  getWorkflowById: async (id: string) => {
    const response = await apiClient.get(`/operations/workflows/${id}`);
    return response.data;
  },

  // Get team members
  getTeamMembers: async () => {
    const response = await apiClient.get('/operations/team');
    return response.data;
  },

  // Get performance metrics
  getPerformanceMetrics: async (userId?: string, period?: string) => {
    const response = await apiClient.get('/operations/metrics', {
      params: { userId, period },
    });
    return response.data;
  },
};
