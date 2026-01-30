/**
 * Mobile Client Portal (Refactored with UX Consistency)
 * Clean, maintainable version using standardized components and hooks
 */

import { useState } from 'react';
import { Link } from 'wouter';
import { 
  Building2, FileText, Upload, Home, Calendar, Gift, 
  CreditCard, ShoppingBag, DollarSign, Users, Plus,
  Eye, CheckCircle, Clock, AlertCircle, Edit, Wallet
} from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageSection } from '@/components/layouts/PageLayout';
import { useStandardQuery } from '@/hooks/useStandardQuery';
import { get } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EntityManagementDialog } from '@/components/EntityManagementDialog';

// Types
interface Entity {
  id: number;
  name: string;
  type: string;
  status: 'active' | 'inactive';
}

interface ServiceRequest {
  id: number;
  serviceName: string;
  status: 'initiated' | 'docs_uploaded' | 'in_progress' | 'completed';
  createdAt: string;
  dueDate: string;
  progress: number;
}

export default function MobileClientPortal() {
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entityDialogMode, setEntityDialogMode] = useState<'add' | 'edit'>('add');

  // Navigation configuration
  const navigation = [
    { label: 'Overview', href: '/client-portal', icon: Home },
    { label: 'Entities', href: '/client-portal/entities', icon: Building2 },
    { label: 'Services', href: '/client-portal/services', icon: FileText },
    { label: 'Documents', href: '/client-portal/documents', icon: Upload },
  ];

  // Fetch entities
  const entitiesQuery = useStandardQuery<Entity[]>({
    queryKey: ['client', 'entities'],
    queryFn: () => get<Entity[]>('/api/client/entities'),
    emptyState: {
      title: 'No business entities',
      description: 'Add your first business entity to start managing compliance',
      icon: Building2,
      action: {
        label: 'Add Entity',
        onClick: () => {
          setSelectedEntity(null);
          setEntityDialogMode('add');
          setEntityDialogOpen(true);
        },
      },
    },
  });

  // Fetch service requests
  const servicesQuery = useStandardQuery<ServiceRequest[]>({
    queryKey: ['client', 'service-requests'],
    queryFn: () => get<ServiceRequest[]>('/api/client/service-requests'),
    emptyState: {
      title: 'No active services',
      description: 'Request a compliance service to get started',
      icon: FileText,
      action: {
        label: 'Browse Services',
        onClick: () => window.location.href = '/services',
      },
    },
  });

  const handleAddEntity = () => {
    setSelectedEntity(null);
    setEntityDialogMode('add');
    setEntityDialogOpen(true);
  };

  const handleEditEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setEntityDialogMode('edit');
    setEntityDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'bg-green-500',
      in_progress: 'bg-blue-500',
      docs_uploaded: 'bg-yellow-500',
      initiated: 'bg-gray-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-400';
  };

  const getStatusText = (status: string) => {
    const texts = {
      completed: 'Completed',
      in_progress: 'In Progress',
      docs_uploaded: 'Docs Uploaded',
      initiated: 'Initiated',
    };
    return texts[status as keyof typeof texts] || status;
  };

  return (
    <DashboardLayout
      navigation={navigation}
      title="Client Portal"
      user={{
        name: 'Client User',
        email: 'client@company.com',
      }}
      notificationCount={3}
      onLogout={() => window.location.href = '/login'}
    >
      <div className="p-6 space-y-6">
        {/* Overview Stats */}
        <PageSection 
          title="Dashboard Overview" 
          description="Track your business services and compliance status"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Entities</p>
                    <p className="text-2xl font-bold">{entitiesQuery.data?.length || 0}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Services</p>
                    <p className="text-2xl font-bold">
                      {servicesQuery.data?.filter(s => s.status !== 'completed').length || 0}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Docs</p>
                    <p className="text-2xl font-bold">
                      {servicesQuery.data?.filter(s => s.status === 'initiated').length || 0}
                    </p>
                  </div>
                  <Upload className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">
                      {servicesQuery.data?.filter(s => s.status === 'completed').length || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </PageSection>

        {/* Quick Actions */}
        <PageSection title="Quick Actions">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={handleAddEntity}>
              <Plus className="h-5 w-5" />
              <span className="text-xs">Add Entity</span>
            </Button>
            <Link href="/services">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                <ShoppingBag className="h-5 w-5" />
                <span className="text-xs">Browse Services</span>
              </Button>
            </Link>
            <Link href="/compliance-calendar">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Compliance Calendar</span>
              </Button>
            </Link>
            <Link href="/wallet">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                <Wallet className="h-5 w-5" />
                <span className="text-xs">Wallet</span>
              </Button>
            </Link>
            <Link href="/referral-dashboard">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                <Gift className="h-5 w-5" />
                <span className="text-xs">Referrals</span>
              </Button>
            </Link>
          </div>
        </PageSection>

        {/* Business Entities */}
        <PageSection
          title="Business Entities"
          description="Manage your registered entities"
          actions={
            <Button onClick={handleAddEntity}>
              <Plus className="h-4 w-4 mr-2" />
              Add Entity
            </Button>
          }
        >
          {entitiesQuery.render((entities) => (
            <div className="grid gap-4">
              {(Array.isArray(entities) ? entities : []).map((entity) => (
                <Card key={entity.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{entity.name}</h3>
                          <p className="text-sm text-muted-foreground">{entity.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={entity.status === 'active' ? 'default' : 'secondary'}>
                          {entity.status}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditEntity(entity)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </PageSection>

        {/* Service Requests */}
        <PageSection
          title="Recent Service Requests"
          description="Track your compliance service orders"
        >
          {servicesQuery.render((services) => (
            <div className="space-y-3">
              {services.slice(0, 5).map((service) => (
                <Card key={service.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{service.serviceName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(service.dueDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(service.status)}>
                        {getStatusText(service.status)}
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
                      {service.status === 'initiated' && (
                        <Button size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Docs
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </PageSection>
      </div>

      {/* Entity Dialog */}
      <EntityManagementDialog
        open={entityDialogOpen}
        onOpenChange={setEntityDialogOpen}
        mode={entityDialogMode}
        entity={selectedEntity}
      />
    </DashboardLayout>
  );
}
