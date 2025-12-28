import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Building2,
  CheckCircle,
  Clock
} from 'lucide-react';

interface UserType {
  id: string;
  label: string;
  description: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  status: 'available' | 'coming-soon';
}

const userTypes: UserType[] = [
  {
    id: 'client',
    label: 'Client',
    description: 'Access your compliance dashboard and manage services',
    route: '/client-dashboard',
    icon: User,
    color: 'bg-blue-500',
    status: 'available'
  },
  {
    id: 'agent',
    label: 'Agent / Partner',
    description: 'Manage leads, track commissions, and view performance',
    route: '/agent/dashboard',
    icon: Briefcase,
    color: 'bg-green-500',
    status: 'available'
  },
  {
    id: 'operations',
    label: 'Operations Executive',
    description: 'Manage service delivery and task execution',
    route: '/ops-dashboard',
    icon: Settings,
    color: 'bg-orange-500',
    status: 'available'
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'System administration and configuration',
    route: '/admin',
    icon: Shield,
    color: 'bg-purple-500',
    status: 'available'
  },
  {
    id: 'customer-service',
    label: 'Customer Service',
    description: 'Handle client queries and support tickets',
    route: '/customer-service',
    icon: UserCog,
    color: 'bg-pink-500',
    status: 'available'
  },
  {
    id: 'super-admin',
    label: 'Super Admin',
    description: 'Full system access and management',
    route: '/super-admin',
    icon: Users,
    color: 'bg-red-500',
    status: 'available'
  }
];

export default function UserTypeSelector() {
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<string>('');

  const handleNavigate = () => {
    const userType = userTypes.find(type => type.id === selectedType);
    if (userType && userType.status === 'available') {
      sessionStorage.setItem('selectedRole', userType.id);
      setLocation(`/login?role=${userType.id}`);
    }
  };

  const selectedUserType = userTypes.find(type => type.id === selectedType);
  const availableTypes = userTypes.filter(type => type.status === 'available');
  const comingSoonTypes = userTypes.filter(type => type.status === 'coming-soon');

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
                {/* Available User Types */}
                {availableTypes.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                      Available Now
                    </div>
                    {availableTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.id} value={type.id} data-testid={`option-${type.id}`}>
                          <div className="flex items-center gap-3 py-1">
                            <div className={`${type.color} p-2 rounded-md`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{type.label}</span>
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              </div>
                              <span className="text-xs text-gray-500">{type.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </>
                )}

                {/* Coming Soon User Types */}
                {comingSoonTypes.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase mt-2">
                      Coming Soon
                    </div>
                    {comingSoonTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem 
                          key={type.id} 
                          value={type.id} 
                          disabled 
                          data-testid={`option-${type.id}`}
                        >
                          <div className="flex items-center gap-3 py-1 opacity-60">
                            <div className={`${type.color} p-2 rounded-md`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{type.label}</span>
                                <Clock className="h-3 w-3 text-orange-600" />
                              </div>
                              <span className="text-xs text-gray-500">{type.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </>
                )}
              </SelectContent>
            </Select>

            {selectedUserType && (
              <Card className={`border ${selectedUserType.status === 'available' ? 'border-primary/20 bg-primary/5' : 'border-orange-200 bg-orange-50 dark:bg-orange-950/20'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`${selectedUserType.color} p-3 rounded-lg`}>
                      {selectedUserType.icon && <selectedUserType.icon className="h-6 w-6 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{selectedUserType.label}</h3>
                        {selectedUserType.status === 'available' ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-orange-500 text-orange-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedUserType.description}
                      </p>
                      {selectedUserType.status === 'coming-soon' && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                          This dashboard is currently under development. Please check back soon!
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Button
            onClick={handleNavigate}
            disabled={!selectedType || selectedUserType?.status === 'coming-soon'}
            className="w-full h-12 text-lg"
            data-testid="button-continue"
          >
            {selectedUserType?.status === 'coming-soon' ? (
              <>
                <Clock className="h-5 w-5 mr-2" />
                Coming Soon
              </>
            ) : (
              <>
                Continue to Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>

          <div className="pt-4 border-t">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <a href="/onboarding" className="text-primary hover:underline font-medium">
                Sign up here
              </a>
            </p>
          </div>

          {/* Development Status */}
          <div className="pt-2 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              All {userTypes.length} dashboards are now available! 🎉
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
