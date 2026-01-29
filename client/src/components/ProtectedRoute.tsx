import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { canAccessRoute, getRoleDashboardRoute } from '@/utils/roleBasedRouting';
import { useAuth as useSessionAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * PRODUCTION READY - Full route protection enabled
 *
 * Features:
 * - Authentication check (redirects to login if not authenticated)
 * - Role-based access control (checks if user can access route)
 * - Specific role requirements (optional)
 * - Loading state while checking auth
 */
export function ProtectedRoute({ children, requiredRole, redirectTo }: ProtectedRouteProps) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useSessionAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for auth check to complete
    if (isLoading) {
      return;
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
      sessionStorage.setItem('redirectAfterLogin', location);
      setLocation('/login');
      setIsChecking(false);
      return;
    }

    const userRole = user.role;

    // Check if user can access this route based on role
    if (!canAccessRoute(userRole, location)) {
      const dashboardRoute = getRoleDashboardRoute(userRole);
      console.warn(`Access denied to ${location} for role ${userRole}, redirecting to ${dashboardRoute}`);
      setLocation(dashboardRoute);
      setIsChecking(false);
      return;
    }

    // Check specific required role if provided
    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowedRoles.includes(userRole)) {
        const dashboardRoute = redirectTo || getRoleDashboardRoute(userRole);
        console.warn(`Role ${userRole} not in allowed roles [${allowedRoles.join(', ')}], redirecting`);
        setLocation(dashboardRoute);
        setIsChecking(false);
        return;
      }
    }

    // All checks passed
    setIsChecking(false);
  }, [isAuthenticated, isLoading, location, redirectTo, requiredRole, setLocation, user]);

  // Show loading state while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - don't render children
  if (!isAuthenticated || !user) {
    return null;
  }

  // All checks passed - render children
  return <>{children}</>;
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
