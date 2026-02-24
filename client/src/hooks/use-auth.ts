/**
 * Authentication Hook
 *
 * Provides user authentication state and utilities.
 * Works with session-based auth from the backend.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

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
  const queryClient = useQueryClient();
  const isRedirecting = useRef(false);

  const { data: user, isLoading, error, refetch, isFetching } = useQuery<User | null>({
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
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  const isAuthenticated = !!user;

  const login = useCallback(async (username: string, password: string) => {
    // Use staff login endpoint (username/password authentication)
    const response = await fetch('/api/auth/staff/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }

    const data = await response.json();

    // Immediately set the user data in cache to prevent race conditions
    if (data.user) {
      queryClient.setQueryData(['auth', 'user'], data.user);
    }

    // Also refetch to ensure we have the complete user data
    await refetch();
    return data;
  }, [queryClient, refetch]);

  const logout = useCallback(async () => {
    if (isRedirecting.current) return;
    isRedirecting.current = true;

    // Get CSRF token from cookie (set during login)
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrfToken='))
      ?.split('=')[1];

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        credentials: 'include'
      });

      // Clear the auth cache immediately
      queryClient.setQueryData(['auth', 'user'], null);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    } finally {
      // Redirect to login page after logout
      window.location.href = '/login';
    }
  }, [queryClient]);

  return {
    user,
    isLoading: isLoading || isFetching,
    error,
    isAuthenticated,
    login,
    logout,
    refetch
  };
}
