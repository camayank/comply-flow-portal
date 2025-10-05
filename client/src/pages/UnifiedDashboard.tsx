import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import AgentDashboard from './AgentDashboard';
import MobileClientPortal from './MobileClientPortal';
import MobileAdminPanel from './MobileAdminPanel';
import MobileOperationsPanel from './MobileOperationsPanel';
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
        // Coming soon - show placeholder
        return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-6 w-6" />
                  Customer Service Dashboard - Coming Soon
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  The Customer Service dashboard is currently under development and will be available soon.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  This dashboard will include:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                  <li>Client query management</li>
                  <li>Ticket tracking system</li>
                  <li>Response templates</li>
                  <li>Performance metrics</li>
                </ul>
                <Link to="/select-role">
                  <Button className="mt-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Role Selection
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        );
      
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
