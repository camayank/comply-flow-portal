import apiClient from './api';

export interface BookServiceData {
  serviceId: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string;
  metadata?: Record<string, any>;
}

export const serviceService = {
  // Get service catalog
  getCatalog: async (filters?: any) => {
    const response = await apiClient.get('/services/catalog', { params: filters });
    return response.data;
  },

  // Get service by ID
  getServiceById: async (id: string) => {
    const response = await apiClient.get(`/services/${id}`);
    return response.data;
  },

  // Book a service
  bookService: async (data: BookServiceData) => {
    const response = await apiClient.post('/services/book', data);
    return response.data;
  },

  // Get service categories
  getCategories: async () => {
    const response = await apiClient.get('/services/categories');
    return response.data;
  },

  // Search services
  searchServices: async (query: string, filters?: any) => {
    const response = await apiClient.get('/services/search', {
      params: { q: query, ...filters },
    });
    return response.data;
  },

  // Get popular services
  getPopularServices: async (limit = 10) => {
    const response = await apiClient.get('/services/popular', { params: { limit } });
    return response.data;
  },

  // Get recommended services
  getRecommendedServices: async () => {
    const response = await apiClient.get('/services/recommended');
    return response.data;
  },
};
