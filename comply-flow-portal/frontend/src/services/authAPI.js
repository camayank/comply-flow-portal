import api, { handleResponse } from './api';

// Authentication API functions
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return handleResponse(response);
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return handleResponse(response);
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return handleResponse(response);
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  const data = handleResponse(response);
  return data.data; // Return user data directly
};

export const changePassword = async (passwordData) => {
  const response = await api.post('/auth/change-password', passwordData);
  return handleResponse(response);
};

export const refreshToken = async () => {
  const response = await api.post('/auth/refresh');
  return handleResponse(response);
};

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return handleResponse(response);
};

export const resetPassword = async (token, newPassword) => {
  const response = await api.post('/auth/reset-password', {
    token,
    newPassword,
  });
  return handleResponse(response);
};