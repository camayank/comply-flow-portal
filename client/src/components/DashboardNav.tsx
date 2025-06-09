import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Home, 
  Building2, 
  FileText, 
  CreditCard, 
  BarChart3, 
  Settings,
  User,
  Shield
} from 'lucide-react';

interface DashboardNavProps {
  currentPath?: string;
}

const DashboardNav = ({ currentPath }: DashboardNavProps) => {
  const navigationItems = [
    { 
      href: '/', 
      label: 'Home', 
      icon: Home,
      description: 'Return to homepage'
    },
    { 
      href: '/onboarding', 
      label: 'Start Here', 
      icon: Building2,
      description: 'Begin incorporation process'
    },
    { 
      href: '/service-selection', 
      label: 'Services', 
      icon: FileText,
      description: 'Browse compliance services'
    },
    { 
      href: '/compliance-tracker', 
      label: 'Dashboard', 
      icon: BarChart3,
      description: 'Track compliance status'
    },
    { 
      href: '/admin-panel', 
      label: 'Admin Panel', 
      icon: Settings,
      description: 'Administrative controls'
    }
  ];

  return (
    <Card className="mb-6 shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <Button 
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={`flex items-center gap-2 ${
                    isActive ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardNav;