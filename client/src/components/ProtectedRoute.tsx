import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { canAccessRoute, getRoleDashboardRoute } from '@/utils/roleBasedRouting';
import { useAuth as useSessionAuth } from '@/hooks/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * 🔓 DEV MODE: Route protection disabled
 */
export function ProtectedRoute({ children, requiredRole, redirectTo }: ProtectedRouteProps) {
  // 🔓 DEV MODE: Render children without any protection
  return <>{children}</>;

  /* ORIGINAL ROUTE PROTECTION - COMMENTED FOR DEV
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useSessionAuth();
  
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      sessionStorage.setItem('redirectAfterLogin', location);
      setLocation('/login');
      return;
    }

    const userRole = user.role;

    if (!canAccessRoute(userRole, location)) {
      const dashboardRoute = getRoleDashboardRoute(userRole);
      setLocation(dashboardRoute);
      return;
    }

    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowedRoles.includes(userRole)) {
        const dashboardRoute = redirectTo || getRoleDashboardRoute(userRole);
        setLocation(dashboardRoute);
      }
    }
  }, [isAuthenticated, isLoading, location, redirectTo, requiredRole, setLocation, user]);
  
  return <>{children}</>;
  */
}

/**
 * Hook to get current user data
 */
export function useCurrentUser() {
  const { user } = useSessionAuth();
  return user ?? null;
}

/**
 * Hook to check if user is authenticated
 */
export function useAuth() {
  const { user } = useSessionAuth();
  
  return {
    isAuthenticated: !!user,
    user: user ?? null,
    role: user?.role || null,
    isAdmin: user?.role === 'super_admin' || user?.role === 'admin',
    isOps: ['ops_executive', 'ops_exec', 'ops_lead', 'customer_service'].includes(user?.role ?? ''),
    isAgent: user?.role === 'agent',
    isClient: user?.role === 'client',
  };
}
