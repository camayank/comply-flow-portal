import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import AgentDashboard from './AgentDashboard';
import MobileClientPortal from './MobileClientPortalRefactored';
import MobileAdminPanel from './MobileAdminPanelRefactored';
import MobileOperationsPanel from './MobileOperationsPanelRefactored';
import CustomerServiceDashboard from './CustomerServiceDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

type UserType = 'client' | 'agent' | 'operations' | 'admin' | 'customer-service' | 'super-admin' | null;

export default function UnifiedDashboard() {
  const [, setLocation] = useLocation();
  const [userType, setUserType] = useState<UserType>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user type from URL parameter or localStorage
    const params = new URLSearchParams(window.location.search);
    const typeFromUrl = params.get('type') as UserType;
    const typeFromStorage = localStorage.getItem('userType') as UserType;
    
    const selectedType = typeFromUrl || typeFromStorage;
    
    if (selectedType) {
      setUserType(selectedType);
      localStorage.setItem('userType', selectedType);
    } else {
      // No user type set, redirect to role selection
      setLocation('/select-role');
    }
    
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Render dashboard based on user type
  const renderDashboard = () => {
    switch (userType) {
      case 'client':
        return <MobileClientPortal />;
      
      case 'agent':
        return <AgentDashboard />;
      
      case 'operations':
        return <MobileOperationsPanel />;
      
      case 'admin':
      case 'super-admin':
        return <MobileAdminPanel />;
      
      case 'customer-service':
        return <CustomerServiceDashboard />;
      
      default:
        return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <Card className="max-w-2xl mx-auto border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-6 w-6" />
                  Invalid User Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Unable to load dashboard. Please select your user type.
                </p>
                <Link to="/select-role">
                  <Button>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Select User Type
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return renderDashboard();
}
