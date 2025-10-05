import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Users,
  Shield,
  Briefcase,
  Settings,
  UserCog,
  ArrowRight,
  Building2
} from 'lucide-react';

interface UserType {
  id: string;
  label: string;
  description: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const userTypes: UserType[] = [
  {
    id: 'client',
    label: 'Client',
    description: 'Access your compliance dashboard and manage services',
    route: '/client-dashboard',
    icon: User,
    color: 'bg-blue-500'
  },
  {
    id: 'agent',
    label: 'Agent / Partner',
    description: 'Manage leads, track commissions, and view performance',
    route: '/agent/dashboard',
    icon: Briefcase,
    color: 'bg-green-500'
  },
  {
    id: 'operations',
    label: 'Operations Executive',
    description: 'Manage service delivery and task execution',
    route: '/ops-dashboard',
    icon: Settings,
    color: 'bg-orange-500'
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'System administration and configuration',
    route: '/admin',
    icon: Shield,
    color: 'bg-purple-500'
  },
  {
    id: 'customer-service',
    label: 'Customer Service',
    description: 'Handle client queries and support tickets',
    route: '/customer-service',
    icon: UserCog,
    color: 'bg-pink-500'
  },
  {
    id: 'super-admin',
    label: 'Super Admin',
    description: 'Full system access and management',
    route: '/super-admin',
    icon: Users,
    color: 'bg-red-500'
  }
];

export default function UserTypeSelector() {
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<string>('');

  const handleNavigate = () => {
    const userType = userTypes.find(type => type.id === selectedType);
    if (userType) {
      setLocation(userType.route);
    }
  };

  const selectedUserType = userTypes.find(type => type.id === selectedType);

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <Card className="border-2 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl md:text-3xl">Select Your Role</CardTitle>
          <CardDescription className="text-base">
            Choose your user type to access the appropriate dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full h-14 text-lg" data-testid="select-user-type">
                <SelectValue placeholder="Select your role..." />
              </SelectTrigger>
              <SelectContent>
                {userTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.id} value={type.id} data-testid={`option-${type.id}`}>
                      <div className="flex items-center gap-3 py-1">
                        <div className={`${type.color} p-2 rounded-md`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-gray-500">{type.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {selectedUserType && (
              <Card className="border border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`${selectedUserType.color} p-3 rounded-lg`}>
                      {selectedUserType.icon && <selectedUserType.icon className="h-6 w-6 text-white" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{selectedUserType.label}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedUserType.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Button
            onClick={handleNavigate}
            disabled={!selectedType}
            className="w-full h-12 text-lg"
            data-testid="button-continue"
          >
            Continue to Dashboard
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>

          <div className="pt-4 border-t">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <a href="/onboarding" className="text-primary hover:underline font-medium">
                Sign up here
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
