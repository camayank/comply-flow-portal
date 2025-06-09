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
      href: '/compliance-dashboard', 
      label: 'Dashboard', 
      icon: BarChart3,
      description: 'Compliance health & insights',
      priority: 1
    },
    { 
      href: '/services', 
      label: 'Services', 
      icon: FileText,
      description: 'Browse & select services',
      priority: 2
    },
    { 
      href: '/workflows', 
      label: 'Workflows', 
      icon: Building2,
      description: 'Track service progress',
      priority: 3
    },
    { 
      href: '/smart-start', 
      label: 'Smart Start', 
      icon: Shield,
      description: 'Intelligent onboarding',
      priority: 4
    },
    { 
      href: '/admin', 
      label: 'Settings', 
      icon: Settings,
      description: 'Profile & preferences',
      priority: 5
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