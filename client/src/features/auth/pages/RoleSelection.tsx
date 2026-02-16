import { useEffect } from 'react';
import { MinimalLayout } from '@/layouts';
import { useLocation } from 'wouter';
import UserTypeSelector from '@/components/UserTypeSelector';
import { useAuth } from '@/hooks/use-auth';
import { getRoleDashboardRoute } from '@/utils/roleBasedRouting';

export default function RoleSelection() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated && user?.role) {
      setLocation(getRoleDashboardRoute(user.role));
    }
  }, [isAuthenticated, isLoading, setLocation, user]);

  return (
    <MinimalLayout>
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <UserTypeSelector />
      </div>
    </MinimalLayout>
  );
}
