import axios from 'axios';
import toast from 'react-hot-toast';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for session management
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log errors
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
    });
    
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        if (response.data.success && response.data.data.accessToken) {
          const newToken = response.data.data.accessToken;
          localStorage.setItem('token', newToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
      
      // If refresh fails, redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
      toast.error('Session expired. Please log in again.');
      return Promise.reject(error);
    }
    
    // Handle other HTTP errors
    const errorMessage = error.response?.data?.error || error.message;
    
    // Don't show toast for certain errors (handled by components)
    const silentErrors = [
      'GET /api/auth/me', // User initialization check
      'GET /api/services', // Services list
    ];
    
    const requestIdentifier = `${error.config?.method?.toUpperCase()} ${error.config?.url}`;
    const shouldShowToast = !silentErrors.some(silent => requestIdentifier.includes(silent));
    
    if (shouldShowToast) {
      switch (error.response?.status) {
        case 403:
          toast.error('You do not have permission to perform this action');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        case 500:
          toast.error('Server error. Please try again.');
          break;
        default:
          if (errorMessage && error.response?.status >= 400) {
            toast.error(errorMessage);
          }
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to handle API responses
export const handleResponse = (response) => {
  return response.data;
};

// Helper function to handle file uploads
export const uploadFile = async (url, file, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };
  
  if (onProgress) {
    config.onUploadProgress = (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percentCompleted);
    };
  }
  
  const response = await api.post(url, formData, config);
  return handleResponse(response);
};

// Helper function to download files
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    });
    
    // Create blob URL and trigger download
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return { success: true };
  } catch (error) {
    console.error('File download error:', error);
    toast.error('Failed to download file');
    return { success: false, error: error.message };
  }
};

export default api;