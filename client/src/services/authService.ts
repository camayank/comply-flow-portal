import apiClient from './api';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName?: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface OTPVerifyData {
  email: string;
  otp: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  newPassword: string;
}

export const authService = {
  // Register new user
  register: async (data: RegisterData) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (data: OTPVerifyData) => {
    const response = await apiClient.post('/auth/verify-otp', data);
    return response.data;
  },

  // Resend OTP
  resendOTP: async (email: string) => {
    const response = await apiClient.post('/auth/resend-otp', { email });
    return response.data;
  },

  // Login
  login: async (data: LoginData) => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  // Refresh token
  refresh: async () => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // Update profile
  updateProfile: async (data: Partial<RegisterData>) => {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },

  // Complete profile
  completeProfile: async (data: any) => {
    const response = await apiClient.put('/auth/profile/complete', data);
    return response.data;
  },

  // Request password reset
  requestPasswordReset: async (email: string) => {
    const response = await apiClient.post('/auth/password/reset-request', { email });
    return response.data;
  },

  // Reset password
  resetPassword: async (data: ResetPasswordData) => {
    const response = await apiClient.post('/auth/password/reset', data);
    return response.data;
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await apiClient.post('/auth/password/change', {
      oldPassword,
      newPassword,
    });
    return response.data;
  },
};
