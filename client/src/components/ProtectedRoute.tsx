import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { canAccessRoute, getRoleDashboardRoute } from '@/utils/roleBasedRouting';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * WordPress-style route protection based on user role
 * Redirects unauthorized users to their dashboard or login
 */
export function ProtectedRoute({ children, requiredRole, redirectTo }: ProtectedRouteProps) {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    
    if (!userStr) {
      // Not logged in - redirect to login
      setLocation('/login');
      return;
    }
    
    try {
      const user = JSON.parse(userStr);
      const userRole = user.role;
      
      // Check if user can access this route
      if (!canAccessRoute(userRole, location)) {
        // Redirect to user's dashboard
        const dashboardRoute = getRoleDashboardRoute(userRole);
        setLocation(dashboardRoute);
        return;
      }
      
      // Check specific role requirement if provided
      if (requiredRole) {
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!allowedRoles.includes(userRole)) {
          // User doesn't have required role
          const dashboardRoute = redirectTo || getRoleDashboardRoute(userRole);
          setLocation(dashboardRoute);
          return;
        }
      }
    } catch (error) {
      // Invalid user data - redirect to login
      localStorage.removeItem('user');
      setLocation('/login');
    }
  }, [location, requiredRole, redirectTo, setLocation]);
  
  return <>{children}</>;
}

/**
 * Hook to get current user data
 */
export function useCurrentUser() {
  const userStr = localStorage.getItem('user');
  
  if (!userStr) {
    return null;
  }
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Hook to check if user is authenticated
 */
export function useAuth() {
  const user = useCurrentUser();
  
  return {
    isAuthenticated: !!user,
    user,
    role: user?.role || null,
    isAdmin: user?.role === 'super_admin' || user?.role === 'admin',
    isOps: ['ops_executive', 'ops_exec', 'ops_lead', 'customer_service'].includes(user?.role),
    isAgent: user?.role === 'agent',
    isClient: user?.role === 'client',
  };
}
