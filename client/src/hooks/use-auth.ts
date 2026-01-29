/**
 * Authentication Hook
 *
 * Provides user authentication state and utilities.
 * Works with session-based auth from the backend.
 */

import { useQuery } from '@tanstack/react-query';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  isActive: boolean;
}

export function useAuth() {
  // 🔓 DEV MODE: Return mock authenticated user
  const mockUser: User = {
    id: 1,
    username: 'dev-user',
    email: 'dev@test.com',
    fullName: 'Dev User',
    role: 'client',
    department: 'Development',
    isActive: true,
  };

  return {
    user: mockUser,
    isLoading: false,
    error: null,
    isAuthenticated: true,
    login: async () => ({ success: true }),
    logout: async () => {},
    refetch: async () => {},
  };

  /* ORIGINAL AUTH CODE - COMMENTED FOR DEV
  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });

        if (!response.ok) {
          if (response.status === 401) {
            return null; // Not authenticated
          }
          throw new Error('Failed to fetch user');
        }

        return await response.json();
      } catch (error) {
        console.error('Auth check failed:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isAuthenticated = !!user;

  const login = async (username: string, password: string) => {
    // Use staff login endpoint (username/password authentication)
    const response = await fetch('/api/auth/staff/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No CSRF header needed - this endpoint is excluded from CSRF check
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    await refetch();
    return data;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest', // CSRF protection for authenticated requests
      },
      credentials: 'include'
    });

    await refetch();
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    login,
    logout,
    refetch
  };
  */
}
