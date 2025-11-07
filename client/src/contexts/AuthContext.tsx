import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuthStore, User } from '@/store/authStore';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<void>;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated, isLoading, login: loginStore, logout: logoutStore, updateUser, setLoading } = useAuthStore();

  // Check if user is already logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = useAuthStore.getState().token;
      if (token) {
        try {
          setLoading(true);
          const response = await authService.getCurrentUser();
          loginStore(response.data.user, token);
        } catch (error) {
          console.error('Failed to fetch current user:', error);
          logoutStore();
        } finally {
          setLoading(false);
        }
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authService.login({ email, password });
      loginStore(response.data.user, response.data.token);
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      logoutStore();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      logoutStore(); // Logout anyway
    }
  };

  const register = async (data: any) => {
    try {
      setLoading(true);
      const response = await authService.register(data);
      toast.success('Registration successful! Please verify your email.');
      return response;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = (data: Partial<User>) => {
    updateUser(data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        register,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
