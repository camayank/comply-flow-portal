import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useAuthStore, User } from '@/store/authStore';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

interface RegistrationData {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  businessName?: string;
  entityType?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegistrationData) => Promise<void>;
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
          // Silent fail on token refresh - user will need to login again
          logoutStore();
        } finally {
          setLoading(false);
        }
      }
    };

    initAuth();
    // Zustand selectors are stable, but we include them for clarity
  }, [setLoading, loginStore, logoutStore]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authService.login({ email, password });
      loginStore(response.data.user, response.data.token);
      toast.success('Login successful!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Login failed';
      toast.error(errorMessage || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, loginStore]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      logoutStore();
      toast.success('Logged out successfully');
    } catch {
      // Logout locally even if API call fails
      logoutStore();
    }
  }, [logoutStore]);

  const register = useCallback(async (data: RegistrationData) => {
    try {
      setLoading(true);
      const response = await authService.register(data);
      toast.success('Registration successful! Please verify your email.');
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Registration failed';
      toast.error(errorMessage || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const updateProfile = useCallback((data: Partial<User>) => {
    updateUser(data);
  }, [updateUser]);

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
