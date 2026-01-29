/**
 * Refactored Client Portal (Example)
 * Demonstrates consistent UX patterns for client-facing screens
 */

import { useState } from 'react';
import { Home, Building2, FileText, FolderOpen, Bell, Plus, Upload } from 'lucide-react';
import { MobileBottomNav, MobileNavItem } from '@/components/common/MobileBottomNav';
import { AppHeader } from '@/components/common/AppHeader';
import { PageSection } from '@/components/layouts/PageLayout';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { useStandardMutation } from '@/hooks/useStandardMutation';
import { get, post } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Types
interface ClientDashboard {
  companyName: string;
  complianceScore: number;
  entitiesCount: number;
  activeServices: number;
  pendingDocuments: number;
}

interface Entity {
  id: number;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  complianceStatus: 'compliant' | 'warning' | 'critical';
}

interface ServiceRequest {
  id: number;
  serviceName: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  dueDate: string;
  progress: number;
}

export default function ClientPortalRefactored() {
  const [activeTab, setActiveTab] = useState<'overview' | 'entities' | 'services' | 'documents'>('overview');

  // Mobile bottom navigation
  const navItems: MobileNavItem[] = [
    { label: 'Overview', href: '/client-portal', icon: Home },
    { label: 'Entities', href: '/client-portal/entities', icon: Building2 },
    { label: 'Services', href: '/client-portal/services', icon: FileText },
    { label: 'Documents', href: '/client-portal/documents', icon: FolderOpen },
  ];

  // Fetch dashboard data
  const dashboardQuery = useStandardQuery<ClientDashboard>({
    queryKey: ['client', 'dashboard'],
    queryFn: () => get<ClientDashboard>('/api/client/dashboard'),
  });

  // Fetch entities
  const entitiesQuery = useStandardQuery<Entity[]>({
    queryKey: ['client', 'entities'],
    queryFn: () => get<Entity[]>('/api/client/entities'),
    emptyState: {
      title: 'No entities yet',
      description: 'Add your first business entity to track compliance',
      icon: Building2,
      action: {
        label: 'Add Entity',
        onClick: () => console.log('Add entity'),
      },
    },
  });

  // Fetch service requests
  const servicesQuery = useStandardQuery<ServiceRequest[]>({
    queryKey: ['client', 'services'],
    queryFn: () => get<ServiceRequest[]>('/api/client/service-requests'),
    emptyState: {
      title: 'No active services',
      description: 'Request a service to get started with compliance management',
      icon: FileText,
      action: {
        label: 'Request Service',
        onClick: () => console.log('Request service'),
      },
    },
  });

  // Logout mutation
  const logoutMutation = useStandardMutation({
    mutationFn: () => post('/api/auth/logout'),
    successMessage: 'Logged out successfully',
    onSuccess: () => { window.location.href = '/login'; },
  });

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* App Header */}
      <AppHeader
        title="Client Portal"
        showSearch
        notificationCount={3}
        onNotificationsClick={() => console.log('Notifications')}
        user={{
          name: 'Acme Corp',
          email: 'contact@acme.com',
          role: 'Client',
        }}
        onLogout={() => logoutMutation.mutate(undefined)}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <PageSection title="Dashboard" description="Your compliance overview">
              {dashboardQuery.render((dashboard) => (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Compliance Score</p>
                          <p className="text-2xl font-bold text-green-600">{dashboard.complianceScore}%</p>
                          <Progress value={dashboard.complianceScore} className="mt-2" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <Building2 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Entities</p>
                          <p className="text-2xl font-bold">{dashboard.entitiesCount}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <FileText className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Active Services</p>
                          <p className="text-2xl font-bold">{dashboard.activeServices}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <FolderOpen className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Pending Docs</p>
                          <p className="text-2xl font-bold">{dashboard.pendingDocuments}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                      <Plus className="h-5 w-5" />
                      <span className="text-xs">Add Entity</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                      <FileText className="h-5 w-5" />
                      <span className="text-xs">Request Service</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                      <Upload className="h-5 w-5" />
                      <span className="text-xs">Upload Document</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                      <Bell className="h-5 w-5" />
                      <span className="text-xs">View Alerts</span>
                    </Button>
                  </div>
                </>
              ))}
            </PageSection>

            {/* Recent Activity */}
            <PageSection 
              title="Recent Activity" 
              description="Latest updates on your services"
            >
              {servicesQuery.render((services) => (
                <div className="space-y-3">
                  {services.slice(0, 3).map(service => (
                    <Card key={service.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{service.serviceName}</h3>
                          <Badge variant={getStatusColor(service.status)}>
                            {service.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <Progress value={service.progress} className="mb-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Created: {new Date(service.createdAt).toLocaleDateString()}</span>
                          <span>Due: {new Date(service.dueDate).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </PageSection>
          </div>
        )}

        {/* Entities Tab */}
        {activeTab === 'entities' && (
          <PageSection 
            title="My Entities" 
            description="Manage your business entities"
            actions={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Entity
              </Button>
            }
          >
            {entitiesQuery.render((entities) => (
              <div className="grid gap-4">
                {entities.map(entity => (
                  <Card key={entity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{entity.name}</h3>
                            <p className="text-sm text-muted-foreground">{entity.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getComplianceColor(entity.complianceStatus)}>
                            {entity.complianceStatus}
                          </Badge>
                          <Button variant="ghost" size="sm">View</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </PageSection>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <PageSection 
            title="Service Requests" 
            description="Track your compliance services"
            actions={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Request Service
              </Button>
            }
          >
            {servicesQuery.render((services) => (
              <div className="space-y-3">
                {services.map(service => (
                  <Card key={service.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{service.serviceName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(service.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(service.status)}>
                          {service.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{service.progress}%</span>
                        </div>
                        <Progress value={service.progress} />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </PageSection>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav items={navItems} />
    </div>
  );
}
