import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import * as authAPI from '../services/authAPI';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,

      // Actions
      initializeAuth: async () => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          try {
            set({ isLoading: true });
            const userData = await authAPI.getCurrentUser();
            set({
              user: userData,
              token: storedToken,
              isLoading: false,
              isInitialized: true,
            });
          } catch (error) {
            console.error('Auth initialization failed:', error);
            localStorage.removeItem('token');
            set({
              user: null,
              token: null,
              isLoading: false,
              isInitialized: true,
            });
          }
        } else {
          set({ isLoading: false, isInitialized: true });
        }
      },

      login: async (credentials) => {
        try {
          set({ isLoading: true });
          const response = await authAPI.login(credentials);
          
          if (response.success) {
            const { user, tokens } = response.data;
            
            // Store token
            localStorage.setItem('token', tokens.accessToken);
            
            set({
              user,
              token: tokens.accessToken,
              isLoading: false,
            });
            
            toast.success(`Welcome back, ${user.firstName}!`);
            return { success: true };
          } else {
            throw new Error(response.error || 'Login failed');
          }
        } catch (error) {
          console.error('Login error:', error);
          set({ isLoading: false });
          
          const errorMessage = error.response?.data?.error || error.message || 'Login failed';
          toast.error(errorMessage);
          
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        try {
          // Call logout API to invalidate session
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Always clear local state
          localStorage.removeItem('token');
          set({
            user: null,
            token: null,
          });
          toast.success('Logged out successfully');
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true });
          const response = await authAPI.register(userData);
          
          if (response.success) {
            set({ isLoading: false });
            toast.success('Registration successful! You can now log in.');
            return { success: true };
          } else {
            throw new Error(response.error || 'Registration failed');
          }
        } catch (error) {
          console.error('Registration error:', error);
          set({ isLoading: false });
          
          const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
          toast.error(errorMessage);
          
          return { success: false, error: errorMessage };
        }
      },

      changePassword: async (passwordData) => {
        try {
          set({ isLoading: true });
          const response = await authAPI.changePassword(passwordData);
          
          if (response.success) {
            set({ isLoading: false });
            toast.success('Password changed successfully');
            return { success: true };
          } else {
            throw new Error(response.error || 'Password change failed');
          }
        } catch (error) {
          console.error('Password change error:', error);
          set({ isLoading: false });
          
          const errorMessage = error.response?.data?.error || error.message || 'Password change failed';
          toast.error(errorMessage);
          
          return { success: false, error: errorMessage };
        }
      },

      refreshToken: async () => {
        try {
          const response = await authAPI.refreshToken();
          
          if (response.success && response.data.accessToken) {
            const newToken = response.data.accessToken;
            localStorage.setItem('token', newToken);
            set({ token: newToken });
            return { success: true };
          } else {
            throw new Error('Token refresh failed');
          }
        } catch (error) {
          console.error('Token refresh error:', error);
          // If refresh fails, logout user
          get().logout();
          return { success: false };
        }
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      // Utility functions
      hasRole: (role) => {
        const { user } = get();
        return user?.role === role;
      },

      hasAnyRole: (roles) => {
        const { user } = get();
        return roles.includes(user?.role);
      },

      canAccess: (requiredRoles) => {
        const { user } = get();
        if (!user) return false;
        
        if (Array.isArray(requiredRoles)) {
          return requiredRoles.includes(user.role);
        }
        
        return user.role === requiredRoles;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);